import { Router, Request, Response } from 'express';
import { prisma } from './prisma.js';
import { TenantRequest } from './tenant.js';
import { Decimal } from '@prisma/client/runtime/library';

// Payroll calculation utilities
class PayrollCalculator {
  static calculateFederalTax(grossPay: number, filingStatus: string, exemptions: number): number {
    // Simplified federal tax calculation - in production, use actual tax tables
    const standardDeduction = filingStatus === 'married_filing_jointly' ? 25900 : 12950;
    const taxableIncome = Math.max(0, grossPay - standardDeduction - (exemptions * 4300));
    
    if (taxableIncome <= 0) return 0;
    
    // Simplified progressive tax calculation
    let tax = 0;
    if (taxableIncome <= 11000) {
      tax = taxableIncome * 0.10;
    } else if (taxableIncome <= 44725) {
      tax = 1100 + (taxableIncome - 11000) * 0.12;
    } else if (taxableIncome <= 95375) {
      tax = 5147 + (taxableIncome - 44725) * 0.22;
    } else if (taxableIncome <= 182050) {
      tax = 16290 + (taxableIncome - 95375) * 0.24;
    } else {
      tax = 37104 + (taxableIncome - 182050) * 0.32;
    }
    
    return Math.round(tax * 100) / 100;
  }

  static calculateSocialSecurity(grossPay: number, wageBase: number = 160200): number {
    const taxableWages = Math.min(grossPay, wageBase);
    return Math.round(taxableWages * 0.062 * 100) / 100;
  }

  static calculateMedicare(grossPay: number): number {
    const baseMedicare = grossPay * 0.0145;
    const additionalMedicare = grossPay > 200000 ? (grossPay - 200000) * 0.009 : 0;
    return Math.round((baseMedicare + additionalMedicare) * 100) / 100;
  }

  static calculateOvertimePay(regularHours: number, overtimeHours: number, hourlyRate: number, overtimeMultiplier: number = 1.5): number {
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
    return regularPay + overtimePay;
  }
}

export function mountPayrollRoutes(router: Router) {
  // Employee Management Routes
  
  // Get all employees
  router.get('/employees', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { page = 1, limit = 50, search, department, status } = req.query;
      
      const where: any = {
        tenantId: req.tenantId!,
        companyId,
        isActive: true
      };
      
      if (search) {
        where.OR = [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { employeeNumber: { contains: search as string, mode: 'insensitive' } }
        ];
      }
      
      if (department) {
        where.department = department;
      }
      
      if (status) {
        where.employmentStatus = status;
      }
      
      const employees = await prisma.employee.findMany({
        where,
        include: {
          manager: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true }
          },
          _count: {
            select: { subordinates: true }
          }
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { lastName: 'asc' }
      });
      
      const total = await prisma.employee.count({ where });
      
      res.json({
        employees,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  });

  // Get single employee
  router.get('/employees/:id', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { id } = req.params;
      
      const employee = await prisma.employee.findFirst({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        include: {
          manager: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true }
          },
          subordinates: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true, position: true }
          },
          payrollRecords: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { payrollPeriod: true }
          },
          timeEntries: {
            take: 10,
            orderBy: { date: 'desc' }
          },
          leaveRequests: {
            take: 5,
            orderBy: { requestedAt: 'desc' }
          }
        }
      });
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json(employee);
    } catch (error) {
      console.error('Error fetching employee:', error);
      res.status(500).json({ error: 'Failed to fetch employee' });
    }
  });

  // Create employee
  router.post('/employees', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const employeeData = req.body;
      
      // Generate employee number if not provided
      if (!employeeData.employeeNumber) {
        const lastEmployee = await prisma.employee.findFirst({
          where: { tenantId: req.tenantId!, companyId },
          orderBy: { employeeNumber: 'desc' }
        });
        
        const lastNumber = lastEmployee?.employeeNumber ? parseInt(lastEmployee.employeeNumber) : 0;
        employeeData.employeeNumber = String(lastNumber + 1).padStart(4, '0');
      }
      
      const employee = await prisma.employee.create({
        data: {
          ...employeeData,
          tenantId: req.tenantId!,
          companyId,
          payRate: new Decimal(employeeData.payRate || 0),
          overtimeRate: employeeData.overtimeRate ? new Decimal(employeeData.overtimeRate) : null,
          overtimeThreshold: employeeData.overtimeThreshold ? new Decimal(employeeData.overtimeThreshold) : null,
          additionalWithholding: new Decimal(employeeData.additionalWithholding || 0),
          retirement401kRate: employeeData.retirement401kRate ? new Decimal(employeeData.retirement401kRate) : null
        }
      });
      
      res.status(201).json(employee);
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  });

  // Update employee
  router.put('/employees/:id', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { id } = req.params;
      const updateData = req.body;
      
      // Convert decimal fields
      if (updateData.payRate !== undefined) {
        updateData.payRate = new Decimal(updateData.payRate);
      }
      if (updateData.overtimeRate !== undefined) {
        updateData.overtimeRate = updateData.overtimeRate ? new Decimal(updateData.overtimeRate) : null;
      }
      if (updateData.overtimeThreshold !== undefined) {
        updateData.overtimeThreshold = updateData.overtimeThreshold ? new Decimal(updateData.overtimeThreshold) : null;
      }
      if (updateData.additionalWithholding !== undefined) {
        updateData.additionalWithholding = new Decimal(updateData.additionalWithholding);
      }
      if (updateData.retirement401kRate !== undefined) {
        updateData.retirement401kRate = updateData.retirement401kRate ? new Decimal(updateData.retirement401kRate) : null;
      }
      
      const employee = await prisma.employee.update({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        data: updateData
      });
      
      res.json(employee);
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  });

  // Delete employee (soft delete)
  router.delete('/employees/:id', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { id } = req.params;
      
      const employee = await prisma.employee.update({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        data: {
          isActive: false,
          employmentStatus: 'terminated',
          terminationDate: new Date()
        }
      });
      
      res.json({ message: 'Employee deactivated successfully' });
    } catch (error) {
      console.error('Error deactivating employee:', error);
      res.status(500).json({ error: 'Failed to deactivate employee' });
    }
  });

  // Payroll Period Management
  
  // Get payroll periods
  router.get('/payroll-periods', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { page = 1, limit = 20, status, year } = req.query;
      
      const where: any = {
        tenantId: req.tenantId!,
        companyId
      };
      
      if (status) {
        where.status = status;
      }
      
      if (year) {
        where.startDate = {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${Number(year) + 1}-01-01`)
        };
      }
      
      const periods = await prisma.payrollPeriod.findMany({
        where,
        include: {
          _count: {
            select: { payrollRecords: true }
          }
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { startDate: 'desc' }
      });
      
      const total = await prisma.payrollPeriod.count({ where });
      
      res.json({
        periods,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
      res.status(500).json({ error: 'Failed to fetch payroll periods' });
    }
  });

  // Create payroll period
  router.post('/payroll-periods', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { startDate, endDate, payDate } = req.body;
      
      const periodName = `${startDate} to ${endDate}`;
      
      const period = await prisma.payrollPeriod.create({
        data: {
          tenantId: req.tenantId!,
          companyId,
          periodName,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          payDate: new Date(payDate)
        }
      });
      
      res.status(201).json(period);
    } catch (error) {
      console.error('Error creating payroll period:', error);
      res.status(500).json({ error: 'Failed to create payroll period' });
    }
  });

  // Process Payroll
  
  // Process payroll for a period
  router.post('/payroll-periods/:id/process', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { id } = req.params;
      
      // Get the payroll period
      const period = await prisma.payrollPeriod.findFirst({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        }
      });
      
      if (!period) {
        return res.status(404).json({ error: 'Payroll period not found' });
      }
      
      // Get all active employees
      const employees = await prisma.employee.findMany({
        where: {
          tenantId: req.tenantId!,
          companyId,
          isActive: true,
          employmentStatus: 'active'
        }
      });
      
      const payrollRecords = [];
      
      for (const employee of employees) {
        // Calculate hours (simplified - in production, get from time entries)
        const regularHours = 80; // Default 80 hours for biweekly
        const overtimeHours = 0;
        
        // Calculate pay
        let grossPay = 0;
        if (employee.payRateType === 'hourly') {
          grossPay = PayrollCalculator.calculateOvertimePay(
            regularHours,
            overtimeHours,
            Number(employee.payRate),
            Number(employee.overtimeRate || 1.5)
          );
        } else {
          // Salary - divide by pay periods
          const payPeriodsPerYear = employee.payFrequency === 'weekly' ? 52 :
                                   employee.payFrequency === 'biweekly' ? 26 :
                                   employee.payFrequency === 'semimonthly' ? 24 : 12;
          grossPay = Number(employee.payRate) / payPeriodsPerYear;
        }
        
        // Calculate taxes
        const federalTax = PayrollCalculator.calculateFederalTax(
          grossPay,
          employee.taxFilingStatus || 'single',
          employee.federalExemptions
        );
        
        const socialSecurity = PayrollCalculator.calculateSocialSecurity(grossPay);
        const medicare = PayrollCalculator.calculateMedicare(grossPay);
        
        // Calculate deductions (simplified)
        const healthInsurance = employee.healthInsurance ? 200 : 0;
        const dentalInsurance = employee.dentalInsurance ? 50 : 0;
        const retirement401k = employee.retirement401k && employee.retirement401kRate ? 
                              grossPay * Number(employee.retirement401kRate) / 100 : 0;
        
        const totalDeductions = healthInsurance + dentalInsurance + retirement401k;
        const totalTaxes = federalTax + socialSecurity + medicare;
        const netPay = grossPay - totalTaxes - totalDeductions;
        
        // Create payroll record
        const payrollRecord = await prisma.payrollRecord.create({
          data: {
            tenantId: req.tenantId!,
            companyId,
            employeeId: employee.id,
            payrollPeriodId: period.id,
            regularHours: new Decimal(regularHours),
            overtimeHours: new Decimal(overtimeHours),
            regularPay: new Decimal(grossPay),
            grossPay: new Decimal(grossPay),
            federalTax: new Decimal(federalTax),
            socialSecurity: new Decimal(socialSecurity),
            medicare: new Decimal(medicare),
            healthInsurance: new Decimal(healthInsurance),
            dentalInsurance: new Decimal(dentalInsurance),
            retirement401k: new Decimal(retirement401k),
            totalDeductions: new Decimal(totalDeductions),
            totalTaxes: new Decimal(totalTaxes),
            netPay: new Decimal(netPay),
            status: 'draft'
          }
        });
        
        payrollRecords.push(payrollRecord);
      }
      
      // Update period totals
      const totalGrossPay = payrollRecords.reduce((sum, record) => sum + Number(record.grossPay), 0);
      const totalNetPay = payrollRecords.reduce((sum, record) => sum + Number(record.netPay), 0);
      const totalTaxes = payrollRecords.reduce((sum, record) => sum + Number(record.totalTaxes), 0);
      const totalDeductions = payrollRecords.reduce((sum, record) => sum + Number(record.totalDeductions), 0);
      
      await prisma.payrollPeriod.update({
        where: { id: period.id },
        data: {
          status: 'processing',
          totalGrossPay: new Decimal(totalGrossPay),
          totalNetPay: new Decimal(totalNetPay),
          totalTaxes: new Decimal(totalTaxes),
          totalDeductions: new Decimal(totalDeductions),
          employeeCount: payrollRecords.length
        }
      });
      
      res.json({
        message: 'Payroll processed successfully',
        periodId: period.id,
        recordsCreated: payrollRecords.length,
        totalGrossPay,
        totalNetPay,
        totalTaxes,
        totalDeductions
      });
    } catch (error) {
      console.error('Error processing payroll:', error);
      res.status(500).json({ error: 'Failed to process payroll' });
    }
  });

  // Get payroll records for a period
  router.get('/payroll-periods/:id/records', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { id } = req.params;
      
      const records = await prisma.payrollRecord.findMany({
        where: {
          tenantId: req.tenantId!,
          companyId,
          payrollPeriodId: id
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              department: true,
              position: true
            }
          }
        },
        orderBy: { employee: { lastName: 'asc' } }
      });
      
      res.json(records);
    } catch (error) {
      console.error('Error fetching payroll records:', error);
      res.status(500).json({ error: 'Failed to fetch payroll records' });
    }
  });

  // Time Tracking Routes
  
  // Get time entries for employee
  router.get('/employees/:id/time-entries', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { id } = req.params;
      const { startDate, endDate, page = 1, limit = 50 } = req.query;
      
      const where: any = {
        tenantId: req.tenantId!,
        companyId,
        employeeId: id
      };
      
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }
      
      const timeEntries = await prisma.timeEntry.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { date: 'desc' }
      });
      
      const total = await prisma.timeEntry.count({ where });
      
      res.json({
        timeEntries,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching time entries:', error);
      res.status(500).json({ error: 'Failed to fetch time entries' });
    }
  });

  // Create time entry
  router.post('/time-entries', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const timeEntryData = req.body;
      
      // Calculate total hours
      let totalHours = 0;
      let regularHours = 0;
      let overtimeHours = 0;
      
      if (timeEntryData.clockIn && timeEntryData.clockOut) {
        const clockIn = new Date(timeEntryData.clockIn);
        const clockOut = new Date(timeEntryData.clockOut);
        const breakDuration = timeEntryData.breakStart && timeEntryData.breakEnd ? 
          (new Date(timeEntryData.breakEnd).getTime() - new Date(timeEntryData.breakStart).getTime()) / (1000 * 60 * 60) : 0;
        
        totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) - breakDuration;
        
        // Determine regular vs overtime hours
        const overtimeThreshold = 8; // Default 8 hours
        if (totalHours > overtimeThreshold) {
          regularHours = overtimeThreshold;
          overtimeHours = totalHours - overtimeThreshold;
        } else {
          regularHours = totalHours;
        }
      }
      
      const timeEntry = await prisma.timeEntry.create({
        data: {
          ...timeEntryData,
          tenantId: req.tenantId!,
          companyId,
          totalHours: new Decimal(totalHours),
          regularHours: new Decimal(regularHours),
          overtimeHours: new Decimal(overtimeHours),
          date: new Date(timeEntryData.date),
          clockIn: timeEntryData.clockIn ? new Date(timeEntryData.clockIn) : null,
          clockOut: timeEntryData.clockOut ? new Date(timeEntryData.clockOut) : null,
          breakStart: timeEntryData.breakStart ? new Date(timeEntryData.breakStart) : null,
          breakEnd: timeEntryData.breakEnd ? new Date(timeEntryData.breakEnd) : null
        }
      });
      
      res.status(201).json(timeEntry);
    } catch (error) {
      console.error('Error creating time entry:', error);
      res.status(500).json({ error: 'Failed to create time entry' });
    }
  });

  // Payroll Reports
  
  // Generate payroll summary report
  router.get('/reports/payroll-summary', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { startDate, endDate, department } = req.query;
      
      const where: any = {
        tenantId: req.tenantId!,
        companyId
      };
      
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }
      
      const records = await prisma.payrollRecord.findMany({
        where,
        include: {
          employee: {
            select: {
              department: true,
              position: true
            }
          }
        }
      });
      
      // Filter by department if specified
      const filteredRecords = department ? 
        records.filter(record => record.employee.department === department) : 
        records;
      
      const summary = {
        totalEmployees: filteredRecords.length,
        totalGrossPay: filteredRecords.reduce((sum, record) => sum + Number(record.grossPay), 0),
        totalNetPay: filteredRecords.reduce((sum, record) => sum + Number(record.netPay), 0),
        totalTaxes: filteredRecords.reduce((sum, record) => sum + Number(record.totalTaxes), 0),
        totalDeductions: filteredRecords.reduce((sum, record) => sum + Number(record.totalDeductions), 0),
        averageGrossPay: filteredRecords.length > 0 ? 
          filteredRecords.reduce((sum, record) => sum + Number(record.grossPay), 0) / filteredRecords.length : 0,
        departmentBreakdown: {}
      };
      
      // Calculate department breakdown
      filteredRecords.forEach(record => {
        const dept = record.employee.department || 'Unassigned';
        if (!summary.departmentBreakdown[dept]) {
          summary.departmentBreakdown[dept] = {
            employeeCount: 0,
            totalGrossPay: 0,
            totalNetPay: 0
          };
        }
        summary.departmentBreakdown[dept].employeeCount++;
        summary.departmentBreakdown[dept].totalGrossPay += Number(record.grossPay);
        summary.departmentBreakdown[dept].totalNetPay += Number(record.netPay);
      });
      
      res.json(summary);
    } catch (error) {
      console.error('Error generating payroll summary:', error);
      res.status(500).json({ error: 'Failed to generate payroll summary' });
    }
  });

  // Get payroll dashboard data
  router.get('/dashboard', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      // Get employee counts
      const totalEmployees = await prisma.employee.count({
        where: {
          tenantId: req.tenantId!,
          companyId,
          isActive: true
        }
      });
      
      const activeEmployees = await prisma.employee.count({
        where: {
          tenantId: req.tenantId!,
          companyId,
          isActive: true,
          employmentStatus: 'active'
        }
      });
      
      // Get recent payroll data
      const recentPeriods = await prisma.payrollPeriod.findMany({
        where: {
          tenantId: req.tenantId!,
          companyId
        },
        orderBy: { startDate: 'desc' },
        take: 6,
        include: {
          _count: {
            select: { payrollRecords: true }
          }
        }
      });
      
      // Get pending leave requests
      const pendingLeaveRequests = await prisma.leaveRequest.count({
        where: {
          tenantId: req.tenantId!,
          companyId,
          status: 'pending'
        }
      });
      
      // Get recent time entries
      const recentTimeEntries = await prisma.timeEntry.findMany({
        where: {
          tenantId: req.tenantId!,
          companyId,
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              employeeNumber: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 10
      });
      
      res.json({
        totalEmployees,
        activeEmployees,
        recentPeriods,
        pendingLeaveRequests,
        recentTimeEntries
      });
    } catch (error) {
      console.error('Error fetching payroll dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch payroll dashboard data' });
    }
  });
}
