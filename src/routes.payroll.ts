import { Router, Request, Response } from 'express';
import { prisma } from './prisma.js';
import { TenantRequest } from './tenant.js';
import { Decimal } from '@prisma/client/runtime/library';
import PDFDocument from 'pdfkit';
import { addCompanyLogoToPDF, getCompanyForPDF } from '../utils/pdf-logo-helper.js';

// Enhanced Payroll calculation utilities
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

  static calculateStateTax(grossPay: number, state: string): number {
    // Simplified state tax calculation - in production, use actual state tax tables
    const stateTaxRates: { [key: string]: number } = {
      'CA': 0.05, 'NY': 0.04, 'TX': 0.00, 'FL': 0.00, 'IL': 0.0375,
      'PA': 0.0307, 'OH': 0.025, 'GA': 0.05, 'NC': 0.05, 'MI': 0.0425
    };
    
    const rate = stateTaxRates[state] || 0.03; // Default 3% for other states
    return Math.round(grossPay * rate * 100) / 100;
  }

  static calculateLocalTax(grossPay: number, city: string): number {
    // Simplified local tax calculation
    const localTaxRates: { [key: string]: number } = {
      'New York': 0.03, 'Los Angeles': 0.01, 'Chicago': 0.015, 'Houston': 0.00,
      'Philadelphia': 0.02, 'Phoenix': 0.00, 'San Antonio': 0.00, 'San Diego': 0.01
    };
    
    const rate = localTaxRates[city] || 0.01; // Default 1% for other cities
    return Math.round(grossPay * rate * 100) / 100;
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

  static calculateUnemploymentTax(grossPay: number, wageBase: number = 7000): number {
    const taxableWages = Math.min(grossPay, wageBase);
    return Math.round(taxableWages * 0.006 * 100) / 100; // FUTA rate
  }

  static calculateWorkersCompTax(grossPay: number, rate: number = 0.01): number {
    return Math.round(grossPay * rate * 100) / 100;
  }

  static calculateSalaryPay(basicSalary: number, payFrequency: string, payPeriodsPerYear?: number): number {
    // Calculate salary per pay period based on frequency
    let periodsPerYear = payPeriodsPerYear;
    
    if (!periodsPerYear) {
      switch (payFrequency.toLowerCase()) {
        case 'weekly':
          periodsPerYear = 52;
          break;
        case 'biweekly':
          periodsPerYear = 26;
          break;
        case 'semimonthly':
          periodsPerYear = 24;
          break;
        case 'monthly':
          periodsPerYear = 12;
          break;
        default:
          periodsPerYear = 26; // Default to biweekly
      }
    }
    
    return Math.round((basicSalary / periodsPerYear) * 100) / 100;
  }

  static calculateSalaryOvertime(salaryPay: number, overtimeHours: number, standardHours: number = 40): number {
    // For salary employees, overtime is typically calculated as:
    // (Salary / Standard Hours) * Overtime Hours * 1.5
    const hourlyRate = salaryPay / standardHours;
    return Math.round(overtimeHours * hourlyRate * 1.5 * 100) / 100;
  }


  static calculateShiftDifferentialPay(hours: number, hourlyRate: number, differentialRate: number): number {
    return Math.round(hours * hourlyRate * differentialRate * 100) / 100;
  }

  static calculateHazardPay(hours: number, hourlyRate: number, hazardRate: number): number {
    return Math.round(hours * hourlyRate * hazardRate * 100) / 100;
  }

  static calculateOnCallPay(hours: number, hourlyRate: number, onCallRate: number): number {
    return Math.round(hours * hourlyRate * onCallRate * 100) / 100;
  }

  static calculateTravelPay(hours: number, hourlyRate: number, travelRate: number): number {
    return Math.round(hours * hourlyRate * travelRate * 100) / 100;
  }

  static calculatePieceRatePay(quantity: number, pieceRate: number): number {
    return Math.round(quantity * pieceRate * 100) / 100;
  }

  static calculateCommissionPay(salesAmount: number, commissionRate: number, threshold: number = 0): number {
    const eligibleSales = Math.max(0, salesAmount - threshold);
    return Math.round(eligibleSales * commissionRate * 100) / 100;
  }

  static calculateBonusPay(baseAmount: number, bonusRate: number): number {
    return Math.round(baseAmount * bonusRate * 100) / 100;
  }

  static calculatePreTaxDeductions(grossPay: number, deductions: any[]): number {
    let totalPreTaxDeductions = 0;
    
    deductions.forEach(deduction => {
      if (deduction.isPreTax) {
        if (deduction.percentage) {
          totalPreTaxDeductions += grossPay * Number(deduction.percentage) / 100;
        } else {
          totalPreTaxDeductions += Number(deduction.amount);
        }
      }
    });
    
    return Math.round(totalPreTaxDeductions * 100) / 100;
  }

  static calculatePostTaxDeductions(netPay: number, deductions: any[]): number {
    let totalPostTaxDeductions = 0;
    
    deductions.forEach(deduction => {
      if (!deduction.isPreTax) {
        if (deduction.percentage) {
          totalPostTaxDeductions += netPay * Number(deduction.percentage) / 100;
        } else {
          totalPostTaxDeductions += Number(deduction.amount);
        }
      }
    });
    
    return Math.round(totalPostTaxDeductions * 100) / 100;
  }

  static calculateProRatedSalary(basicSalary: number, payFrequency: string, startDate: Date, endDate: Date, effectiveDate: Date): number {
    // Calculate pro-rated salary for partial periods due to salary changes
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysAtNewSalary = Math.max(0, Math.ceil((endDate.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysAtOldSalary = totalDays - daysAtNewSalary;
    
    // Get periods per year for the pay frequency
    let periodsPerYear = 26; // Default to biweekly
    switch (payFrequency.toLowerCase()) {
      case 'weekly': periodsPerYear = 52; break;
      case 'biweekly': periodsPerYear = 26; break;
      case 'semimonthly': periodsPerYear = 24; break;
      case 'monthly': periodsPerYear = 12; break;
    }
    
    const dailyRate = basicSalary / (365 / periodsPerYear * periodsPerYear);
    return Math.round((daysAtNewSalary * dailyRate) * 100) / 100;
  }

  static calculateSalaryWithHistory(employeeId: string, payrollStartDate: Date, payrollEndDate: Date, basicSalary: number, payFrequency: string): { regularPay: number; salaryHistory: any[] } {
    // This would typically query the database for salary history
    // For now, return the basic calculation
    const regularPay = this.calculateSalaryPay(basicSalary, payFrequency);
    return {
      regularPay,
      salaryHistory: [] // Would contain salary change history
    };
  }

  static calculateSalarySummary(grossPay: number, employee: any, benefits: any[] = [], deductions: any[] = []): {
    grossPay: number;
    totalBenefits: number;
    totalDeductions: number;
    netSalary: number;
    breakdown: {
      benefits: Array<{name: string, amount: number, type: string}>;
      deductions: Array<{name: string, amount: number, type: string}>;
      taxes: Array<{name: string, amount: number, type: string}>;
    };
  } {
    const breakdown = {
      benefits: [] as Array<{name: string, amount: number, type: string}>,
      deductions: [] as Array<{name: string, amount: number, type: string}>,
      taxes: [] as Array<{name: string, amount: number, type: string}>
    };

    // Calculate taxes (PAYE, Social Security, etc.)
    const federalTax = this.calculateFederalTax(grossPay, employee.taxFilingStatus || 'single', employee.federalExemptions || 0);
    const socialSecurityTax = this.calculateSocialSecurity(grossPay);
    const medicareTax = this.calculateMedicare(grossPay);
    const stateTax = this.calculateStateTax(grossPay, employee.state || 'CA');
    const localTax = this.calculateLocalTax(grossPay, employee.city || 'San Francisco');

    // Add taxes to breakdown
    breakdown.taxes.push(
      { name: 'Federal Income Tax (PAYE)', amount: federalTax, type: 'tax' },
      { name: 'Social Security Contribution', amount: socialSecurityTax, type: 'tax' },
      { name: 'Medicare Tax', amount: medicareTax, type: 'tax' },
      { name: 'State Tax', amount: stateTax, type: 'tax' },
      { name: 'Local Tax', amount: localTax, type: 'tax' }
    );

    const totalTaxes = federalTax + socialSecurityTax + medicareTax + stateTax + localTax;

    // Calculate benefits
    let totalBenefits = 0;
    benefits.forEach(benefit => {
      const amount = benefit.employeeContribution || 0;
      totalBenefits += amount;
      breakdown.benefits.push({
        name: benefit.description || benefit.benefitType,
        amount: amount,
        type: 'benefit'
      });
    });

    // Add employee benefits from employee record
    if (employee.healthInsurance) {
      const healthAmount = grossPay * 0.05; // 5% of gross pay
      totalBenefits += healthAmount;
      breakdown.benefits.push({
        name: 'Health Insurance',
        amount: healthAmount,
        type: 'benefit'
      });
    }

    if (employee.dentalInsurance) {
      const dentalAmount = grossPay * 0.02; // 2% of gross pay
      totalBenefits += dentalAmount;
      breakdown.benefits.push({
        name: 'Dental Insurance',
        amount: dentalAmount,
        type: 'benefit'
      });
    }

    if (employee.retirement401k) {
      const retirementRate = employee.retirement401kRate ? Number(employee.retirement401kRate) / 100 : 0.06; // Convert percentage to decimal
      const retirementAmount = grossPay * retirementRate;
      totalBenefits += retirementAmount;
      breakdown.benefits.push({
        name: '401(k) Retirement',
        amount: retirementAmount,
        type: 'benefit'
      });
    }

    // Calculate deductions (excluding taxes)
    let totalDeductions = 0;
    deductions.forEach(deduction => {
      if (!deduction.isPreTax) { // Only post-tax deductions
        const amount = deduction.percentage ? grossPay * deduction.percentage / 100 : deduction.amount;
        totalDeductions += amount;
        breakdown.deductions.push({
          name: deduction.description || deduction.deductionCategory,
          amount: amount,
          type: 'deduction'
        });
      }
    });

    // Add other common deductions
    if (employee.lifeInsurance) {
      const lifeAmount = grossPay * 0.01; // 1% of gross pay
      totalDeductions += lifeAmount;
      breakdown.deductions.push({
        name: 'Life Insurance',
        amount: lifeAmount,
        type: 'deduction'
      });
    }

    // Calculate net salary
    const netSalary = grossPay - totalTaxes - totalDeductions;

    return {
      grossPay: Math.round(grossPay * 100) / 100,
      totalBenefits: Math.round(totalBenefits * 100) / 100,
      totalDeductions: Math.round((totalTaxes + totalDeductions) * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      breakdown
    };
  }
}

export function mountPayrollRoutes(router: Router) {
  // Employee Management Routes
  
  // Get all employees
  router.get('/payroll/employees', async (req: TenantRequest, res: Response) => {
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
  router.get('/payroll/employees/:id', async (req: TenantRequest, res: Response) => {
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
  router.post('/payroll/employees', async (req: TenantRequest, res: Response) => {
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
        
        // Extract numeric part from employee number (e.g., "EMP-00001" -> 1)
        let lastNumber = 0;
        if (lastEmployee?.employeeNumber) {
          const numericPart = lastEmployee.employeeNumber.replace(/\D/g, ''); // Remove non-digits
          lastNumber = parseInt(numericPart) || 0;
        }
        
        // Generate employee number with retry logic for uniqueness
        let employeeNumber = `EMP-${String(lastNumber + 1).padStart(5, '0')}`;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          const existingEmployee = await prisma.employee.findFirst({
            where: { 
              tenantId: req.tenantId!, 
              companyId,
              employeeNumber 
            }
          });
          
          if (!existingEmployee) {
            break; // Employee number is unique
          }
          
          // If duplicate, try next number
          lastNumber++;
          employeeNumber = `EMP-${String(lastNumber + 1).padStart(5, '0')}`;
          attempts++;
        }
        
        // If still not unique after max attempts, use timestamp
        if (attempts >= maxAttempts) {
          employeeNumber = `EMP-${Date.now().toString().slice(-6)}`;
        }
        
        employeeData.employeeNumber = employeeNumber;
      }
      
      const employee = await prisma.employee.create({
        data: {
          ...employeeData,
          tenantId: req.tenantId!,
          companyId,
          payRate: new Decimal(employeeData.payRate || 0),
          basicSalary: employeeData.basicSalary ? new Decimal(employeeData.basicSalary) : null,
          overtimeRate: employeeData.overtimeRate ? new Decimal(employeeData.overtimeRate) : null,
          overtimeThreshold: employeeData.overtimeThreshold ? new Decimal(employeeData.overtimeThreshold) : null,
          additionalWithholding: new Decimal(employeeData.additionalWithholding || 0),
          retirement401kRate: employeeData.retirement401kRate ? new Decimal(employeeData.retirement401kRate) : null,
          // Convert empty date strings to null for Prisma
          salaryEffectiveDate: employeeData.salaryEffectiveDate && employeeData.salaryEffectiveDate.trim() !== '' ? employeeData.salaryEffectiveDate : null,
          dateOfBirth: employeeData.dateOfBirth && employeeData.dateOfBirth.trim() !== '' ? employeeData.dateOfBirth : null,
          hireDate: employeeData.hireDate && employeeData.hireDate.trim() !== '' ? employeeData.hireDate : null
        }
      });
      
      res.status(201).json(employee);
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  });

  // Update employee
  router.put('/payroll/employees/:id', async (req: TenantRequest, res: Response) => {
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
      if (updateData.basicSalary !== undefined) {
        updateData.basicSalary = updateData.basicSalary ? new Decimal(updateData.basicSalary) : null;
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
      
      // Convert empty date strings to null for Prisma
      if (updateData.salaryEffectiveDate !== undefined) {
        updateData.salaryEffectiveDate = updateData.salaryEffectiveDate && updateData.salaryEffectiveDate.trim() !== '' ? updateData.salaryEffectiveDate : null;
      }
      if (updateData.dateOfBirth !== undefined) {
        updateData.dateOfBirth = updateData.dateOfBirth && updateData.dateOfBirth.trim() !== '' ? updateData.dateOfBirth : null;
      }
      if (updateData.hireDate !== undefined) {
        updateData.hireDate = updateData.hireDate && updateData.hireDate.trim() !== '' ? updateData.hireDate : null;
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
  router.delete('/payroll/employees/:id', async (req: TenantRequest, res: Response) => {
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
  router.get('/payroll/payroll-periods', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { page = 1, limit = 20, status, year, startDate, endDate } = req.query;
      
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
      
      // Add date range filtering
      if (startDate && endDate) {
        where.startDate = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      } else if (startDate) {
        where.startDate = {
          gte: new Date(startDate as string)
        };
      } else if (endDate) {
        where.startDate = {
          lte: new Date(endDate as string)
        };
      }
      
      const periods = await prisma.payrollPeriod.findMany({
        where,
        include: {
          _count: {
            select: { payrollRecords: true }
          },
          payrollRecords: {
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  department: true
                }
              }
            }
          }
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { startDate: 'desc' }
      });
      
      const total = await prisma.payrollPeriod.count({ where });
      
      res.json({
        payrollPeriods: periods,
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
  router.post('/payroll/payroll-periods', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { startDate, endDate, payDate } = req.body;
      
      // Format dates for human-readable period name
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const periodName = `${startDateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })} - ${endDateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
      
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
      
      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        const target = error.meta?.target || [];
        if (target.includes('startDate') && target.includes('endDate')) {
          return res.status(400).json({ 
            error: 'duplicate_period', 
            message: 'A payroll period with the same start and end dates already exists for this company.' 
          });
        }
        return res.status(400).json({ 
          error: 'duplicate_entry', 
          message: 'A payroll period with these details already exists.' 
        });
      }
      
      res.status(500).json({ error: 'Failed to create payroll period' });
    }
  });

  // Update payroll period
  router.put('/payroll/payroll-periods/:id', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      const { startDate, endDate, payDate } = req.body;
      
      // Format dates for human-readable period name
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const periodName = `${startDateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })} - ${endDateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
      
      const period = await prisma.payrollPeriod.update({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        data: {
          periodName,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          payDate: new Date(payDate)
        }
      });
      
      res.json(period);
    } catch (error) {
      console.error('Error updating payroll period:', error);
      res.status(500).json({ error: 'Failed to update payroll period' });
    }
  });

  // Delete payroll period
  router.delete('/payroll/payroll-periods/:id', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      
      // First, delete all related payroll records
      await prisma.payrollRecord.deleteMany({
        where: {
          payrollPeriodId: id,
          tenantId: req.tenantId!,
          companyId
        }
      });
      
      // Then delete the payroll period
      await prisma.payrollPeriod.delete({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        }
      });
      
      res.json({ message: 'Payroll period deleted successfully' });
    } catch (error) {
      console.error('Error deleting payroll period:', error);
      res.status(500).json({ error: 'Failed to delete payroll period' });
    }
  });

  // Submit payroll for approval
  router.post('/payroll/payroll-periods/:id/submit-approval', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      
      const period = await prisma.payrollPeriod.update({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        data: {
          status: 'pending_approval'
        }
      });
      
      res.json(period);
    } catch (error) {
      console.error('Error submitting payroll for approval:', error);
      res.status(500).json({ error: 'Failed to submit payroll for approval' });
    }
  });

  // Approve payroll
  router.post('/payroll/payroll-periods/:id/approve', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      
      const period = await prisma.payrollPeriod.update({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        data: {
          status: 'approved'
        }
      });
      
      res.json(period);
    } catch (error) {
      console.error('Error approving payroll:', error);
      res.status(500).json({ error: 'Failed to approve payroll' });
    }
  });

  // Reject payroll
  router.post('/payroll/payroll-periods/:id/reject', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      const { reason } = req.body;
      
      const period = await prisma.payrollPeriod.update({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        data: {
          status: 'rejected'
        }
      });
      
      res.json(period);
    } catch (error) {
      console.error('Error rejecting payroll:', error);
      res.status(500).json({ error: 'Failed to reject payroll' });
    }
  });

  // Export payroll period
  router.get('/payroll/payroll-periods/:id/export', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      const { format = 'pdf' } = req.query;
      
      // Get the payroll period with related data and company info
      const period = await prisma.payrollPeriod.findUnique({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        include: {
          payrollRecords: {
            include: {
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                  department: true,
                  position: true
                }
              }
            }
          }
        }
      });

      // Get company information
      const company = await prisma.company.findUnique({
        where: {
          id: companyId,
          tenantId: req.tenantId!
        }
      });
      
      if (!period) {
        return res.status(404).json({ error: 'Payroll period not found' });
      }
      
      if (format === 'pdf') {
        // Generate a professional PDF using PDFDocument
        const pdfBuffer = await generateProfessionalPayrollPDF(period, company);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="payroll-${period.periodName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`);
        res.send(pdfBuffer);
      } else {
        // For other formats, return JSON for now
        res.json({
          message: 'Export functionality will be implemented soon',
          period: period,
          format: format
        });
      }
    } catch (error) {
      console.error('Error exporting payroll period:', error);
      res.status(500).json({ error: 'Failed to export payroll period' });
    }
  });

  // Professional Payroll PDF Generator
  async function generateProfessionalPayrollPDF(period: any, company: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', reject);

        // Colors matching the application theme
        const primaryColor = '#009688'; // Teal
        const secondaryColor = '#1565c0'; // Blue
        const textColor = '#374151'; // Gray
        const lightGray = '#f9fafb'; // Light background
        const successColor = '#10b981'; // Green for approved status

        // Add company logo (top left)
        if (company?.logoUrl) {
          await addCompanyLogoToPDF(doc, company, 50, 50, 60, 60);
        }

        // Company info (left side) - Use actual company data
        const companyName = company?.name || 'Your Company';
        const companyAddress = company?.address || '123 Business St';
        const companyCity = company?.city || 'City';
        const companyState = company?.state || 'State';
        const companyPostalCode = company?.postalCode || '12345';
        const companyEmail = company?.email || 'hr@company.com';
        const companyPhone = company?.phone || '+1-555-0123';

        // Adjust Y position based on whether logo was added
        const companyInfoY = company?.logoUrl ? 120 : 50;

        // Top row: Company name, Payroll Report, and Status Badge with proper spacing
        doc.fontSize(20)
           .fillColor(primaryColor)
           .text(companyName, 50, companyInfoY); // Company name on the left
        
        // Payroll Report with padding from company name
        doc.fontSize(20)
           .fillColor(primaryColor)
           .text('PAYROLL REPORT', 300, companyInfoY); // Moved right for padding (was 250)
        
        // Status badge under PAYROLL REPORT (no text, just colored badge)
        const statusColor = period.status === 'approved' ? successColor : 
                           period.status === 'pending_approval' ? '#f59e0b' : 
                           period.status === 'draft' ? '#6b7280' : textColor;
        
        doc.fillColor(statusColor)
           .rect(300, companyInfoY + 25, 80, 25) // Status badge under PAYROLL REPORT (moved right)
           .fill();
        
        // No text in status badge - just the colored rectangle

        // Company details below the main row
        doc.fontSize(10)
           .fillColor(textColor)
           .text(companyAddress, 50, companyInfoY + 50) // Moved down to avoid status badge
           .text(`${companyCity}, ${companyState} ${companyPostalCode}`, 50, companyInfoY + 65)
           .text(`Email: ${companyEmail}`, 50, companyInfoY + 80)
           .text(`Phone: ${companyPhone}`, 50, companyInfoY + 95);

        // Period information below company details
        doc.fontSize(14)
           .fillColor(textColor)
           .text(period.periodName, 50, companyInfoY + 120); // Period date below company info

        // Line separator
        doc.fillColor(textColor)
           .moveTo(50, companyInfoY + 150) // Moved down to accommodate status badge
           .lineTo(545, companyInfoY + 150)
           .stroke();

        // Period details section
        doc.fontSize(12)
           .fillColor(textColor)
           .text('PAYROLL PERIOD DETAILS', 50, 220); // Moved down
        
        const detailsY = 250; // Moved down
        
        // Period dates
        doc.fontSize(10)
           .text('Period:', 50, detailsY)
           .text(period.periodName, 120, detailsY);
        
        doc.text('Status:', 50, detailsY + 15)
           .text(period.status.charAt(0).toUpperCase() + period.status.slice(1), 120, detailsY + 15);
        
        doc.text('Pay Date:', 50, detailsY + 30)
           .text(new Date(period.payDate).toLocaleDateString(), 120, detailsY + 30);
        
        doc.text('Created:', 50, detailsY + 45)
           .text(new Date(period.createdAt).toLocaleDateString(), 120, detailsY + 45);

        // Financial summary (right side) - Moved further right to avoid collision
        doc.fontSize(12)
           .text('FINANCIAL SUMMARY', 320, 220); // Moved down to match period details
        
        const summaryY = 250; // Moved down
        
        doc.fontSize(10)
           .text('Total Employees:', 320, summaryY) // Aligned with title
           .text((period.payrollRecords?.length || 0).toString(), 420, summaryY); // Use actual payroll records count
        
        doc.text('Total Gross Pay:', 320, summaryY + 15) // Aligned with title
           .text(`$${Number(period.totalGrossPay || 0).toFixed(2)}`, 420, summaryY + 15);
        
        doc.text('Total Net Pay:', 320, summaryY + 30) // Aligned with title
           .text(`$${Number(period.totalNetPay || 0).toFixed(2)}`, 420, summaryY + 30);
        
        doc.text('Total Taxes:', 320, summaryY + 45) // Aligned with title
           .text(`$${Number(period.totalTaxes || 0).toFixed(2)}`, 420, summaryY + 45);
        
        doc.text('Total Deductions:', 320, summaryY + 60) // Aligned with title
           .text(`$${Number(period.totalDeductions || 0).toFixed(2)}`, 420, summaryY + 60);

        // Employee details section
        const employeeY = summaryY + 100;
        
        doc.fontSize(12)
           .fillColor(textColor)
           .text('EMPLOYEE DETAILS', 50, employeeY);

        // Table header
        const tableY = employeeY + 30;
        doc.fillColor(lightGray)
           .rect(50, tableY, 495, 20)
           .fill();
        
        doc.fillColor(textColor)
           .fontSize(9)
           .text('Employee Name', 60, tableY + 6)
           .text('Department', 200, tableY + 6)
           .text('Gross Pay', 350, tableY + 6)
           .text('Net Pay', 450, tableY + 6);

        // Employee rows
        let currentY = tableY + 25;
        const employees = period.payrollRecords || [];
        
        for (let i = 0; i < Math.min(employees.length, 15); i++) {
          const record = employees[i];
          const employee = record.employee;
          
          // Alternate row background
          if (i % 2 === 1) {
            doc.fillColor(lightGray)
               .rect(50, currentY, 495, 18)
               .fill();
          }
          
          doc.fillColor(textColor)
             .fontSize(8)
             .text(`${employee.firstName} ${employee.lastName}`, 60, currentY + 4)
             .text(employee.department || 'N/A', 200, currentY + 4)
             .text(`$${Number(record.grossPay || 0).toFixed(2)}`, 350, currentY + 4)
             .text(`$${Number(record.netPay || 0).toFixed(2)}`, 450, currentY + 4);
          
          currentY += 18;
          
          if (currentY > 650) break; // Prevent overflow
        }

        // Footer
        const footerY = 750;
        doc.fillColor(textColor)
           .fontSize(8)
           .text('Generated on ' + new Date().toLocaleDateString(), 50, footerY)
           .text('Page 1 of 1', 450, footerY, { align: 'right' });

        // Finalize the PDF
        doc.end();
        
      } catch (error) {
        console.error('Error generating professional payroll PDF:', error);
        reject(error);
      }
    });
  }

  // Process Payroll
  
  // Process payroll for a period
  router.post('/payroll/payroll-periods/:id/process', async (req: TenantRequest, res: Response) => {
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
      
      // Clear existing payroll records for this period
      await prisma.payrollRecord.deleteMany({
        where: {
          payrollPeriodId: period.id,
          tenantId: req.tenantId!,
          companyId
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
          grossPay = (regularHours * Number(employee.payRate)) + 
            (overtimeHours * Number(employee.payRate) * Number(employee.overtimeRate || 1.5));
        } else if (employee.payRateType === 'salary') {
          // Salary - divide by pay periods
          const payPeriodsPerYear = employee.payFrequency === 'weekly' ? 52 :
                                   employee.payFrequency === 'biweekly' ? 26 :
                                   employee.payFrequency === 'semimonthly' ? 24 : 12;
          grossPay = Number(employee.basicSalary || 0) / payPeriodsPerYear;
        } else if (employee.payRateType === 'commission') {
          // Commission - use payRate as commission amount
          grossPay = Number(employee.payRate || 0);
        } else if (employee.payRateType === 'piece_rate') {
          // Piece rate - use payRate as piece rate amount
          grossPay = Number(employee.payRate || 0);
        } else {
          // Default to hourly calculation
          grossPay = (regularHours * Number(employee.payRate || 0)) + 
            (overtimeHours * Number(employee.payRate || 0) * Number(employee.overtimeRate || 1.5));
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
          status: 'pending_approval',
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

  // Time Tracking Routes
  
  // Get payroll records for a specific period
  router.get('/payroll/payroll-periods/:id/records', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { id } = req.params;
      
      const payrollRecords = await prisma.payrollRecord.findMany({
        where: {
          payrollPeriodId: id,
          tenantId: req.tenantId!,
          companyId
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
        orderBy: {
          employee: {
            firstName: 'asc'
          }
        }
      });
      
      // Transform data for frontend
      const transformedRecords = payrollRecords.map(record => {
        // Calculate total benefits from individual benefit fields
        const totalBenefits = Number(record.healthInsurance || 0) + 
                             Number(record.dentalInsurance || 0) + 
                             Number(record.visionInsurance || 0) + 
                             Number(record.lifeInsurance || 0) + 
                             Number(record.retirement401k || 0) + 
                             Number(record.flexibleSpendingAccount || 0) + 
                             Number(record.healthSavingsAccount || 0) + 
                             Number(record.stockOptions || 0) + 
                             Number(record.tuitionReimbursement || 0) + 
                             Number(record.companyCar || 0) + 
                             Number(record.parkingAllowance || 0) + 
                             Number(record.mealAllowance || 0) + 
                             Number(record.uniformAllowance || 0);
        
        const transformedRecord = {
          id: record.id,
          employeeName: `${record.employee.firstName} ${record.employee.lastName}`,
          employeeNumber: record.employee.employeeNumber,
          department: record.employee.department || 'Not specified',
          position: record.employee.position || 'Not specified',
          grossPay: Number(record.grossPay),
          netPay: Number(record.netPay),
          taxes: Number(record.totalTaxes || 0),
          deductions: Number(record.totalDeductions || 0),
          benefits: totalBenefits
        };
        
        return transformedRecord;
      });
      
      res.json(transformedRecords);
    } catch (error) {
      console.error('Error fetching payroll records:', error);
      res.status(500).json({ error: 'Failed to fetch payroll records' });
    }
  });

  // Get time entries for employee
  router.get('/payroll/employees/:id/time-entries', async (req: TenantRequest, res: Response) => {
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
  router.post('/payroll/time-entries', async (req: TenantRequest, res: Response) => {
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
      res.status(500).json({ 
        error: 'Failed to create time entry',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
    }
  });

  // Update time entry
  router.put('/payroll/time-entries/:id', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
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
      
      const timeEntry = await prisma.timeEntry.update({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        data: {
          ...timeEntryData,
          totalHours: new Decimal(totalHours),
          regularHours: new Decimal(regularHours),
          overtimeHours: new Decimal(overtimeHours),
          date: timeEntryData.date ? new Date(timeEntryData.date) : undefined,
          clockIn: timeEntryData.clockIn ? new Date(timeEntryData.clockIn) : undefined,
          clockOut: timeEntryData.clockOut ? new Date(timeEntryData.clockOut) : undefined,
          breakStart: timeEntryData.breakStart ? new Date(timeEntryData.breakStart) : undefined,
          breakEnd: timeEntryData.breakEnd ? new Date(timeEntryData.breakEnd) : undefined
        }
      });
      
      res.json(timeEntry);
    } catch (error) {
      console.error('Error updating time entry:', error);
      res.status(500).json({ error: 'Failed to update time entry' });
    }
  });

  // Delete time entry
  router.delete('/payroll/time-entries/:id', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      
      await prisma.timeEntry.delete({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        }
      });
      
      res.json({ message: 'Time entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting time entry:', error);
      res.status(500).json({ error: 'Failed to delete time entry' });
    }
  });

  // Get single time entry
  router.get('/payroll/time-entries/:id', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      
      const timeEntry = await prisma.timeEntry.findUnique({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              department: true
            }
          }
        }
      });
      
      if (!timeEntry) {
        return res.status(404).json({ error: 'Time entry not found' });
      }
      
      res.json(timeEntry);
    } catch (error) {
      console.error('Error fetching time entry:', error);
      res.status(500).json({ error: 'Failed to fetch time entry' });
    }
  });

  // Get all time entries (with filters)
  router.get('/payroll/time-entries', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { 
        startDate, 
        endDate, 
        employeeId, 
        status, 
        page = 1, 
        limit = 50 
      } = req.query;
      
      const where: any = {
        tenantId: req.tenantId!,
        companyId
      };
      
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }
      
      if (employeeId) {
        where.employeeId = employeeId;
      }
      
      if (status) {
        where.status = status;
      }
      
      const timeEntries = await prisma.timeEntry.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { date: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              department: true
            }
          }
        }
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

  // Approve time entry
  router.put('/payroll/time-entries/:id/approve', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      const { approvedBy } = req.body;
      
      const timeEntry = await prisma.timeEntry.update({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        data: {
          status: 'approved',
          approvedBy,
          approvedAt: new Date()
        }
      });
      
      res.json(timeEntry);
    } catch (error) {
      console.error('Error approving time entry:', error);
      res.status(500).json({ error: 'Failed to approve time entry' });
    }
  });

  // Reject time entry
  router.put('/payroll/time-entries/:id/reject', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      const { rejectedBy, rejectionReason } = req.body;
      
      const timeEntry = await prisma.timeEntry.update({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        data: {
          status: 'rejected',
          rejectedBy,
          rejectionReason,
          rejectedAt: new Date()
        }
      });
      
      res.json(timeEntry);
    } catch (error) {
      console.error('Error rejecting time entry:', error);
      res.status(500).json({ error: 'Failed to reject time entry' });
    }
  });

  // Payroll Reports
  
  // Generate payroll summary report
  router.get('/payroll/reports/payroll-summary', async (req: TenantRequest, res: Response) => {
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
  router.get('/payroll/dashboard', async (req: TenantRequest, res: Response) => {
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

  // Bonus Management Routes
  
  // Get bonuses for employee
  router.get('/payroll/employees/:id/payroll/bonuses', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { id } = req.params;
      const { status, bonusType, page = 1, limit = 50 } = req.query;
      
      const where: any = {
        tenantId: req.tenantId!,
        companyId,
        employeeId: id
      };
      
      if (status) {
        where.status = status;
      }
      
      if (bonusType) {
        where.bonusType = bonusType;
      }
      
      const bonuses = await prisma.bonus.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { effectiveDate: 'desc' }
      });
      
      const total = await prisma.bonus.count({ where });
      
      res.json({
        bonuses,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching bonuses:', error);
      res.status(500).json({ error: 'Failed to fetch bonuses' });
    }
  });

  // Create bonus
  router.post('/payroll/bonuses', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const bonusData = req.body;
      
      const bonus = await prisma.bonus.create({
        data: {
          ...bonusData,
          tenantId: req.tenantId!,
          companyId,
          amount: new Decimal(bonusData.amount),
          percentage: bonusData.percentage ? new Decimal(bonusData.percentage) : null,
          effectiveDate: new Date(bonusData.effectiveDate),
          endDate: bonusData.endDate ? new Date(bonusData.endDate) : null
        }
      });
      
      res.status(201).json(bonus);
    } catch (error) {
      console.error('Error creating bonus:', error);
      res.status(500).json({ error: 'Failed to create bonus' });
    }
  });

  // Approve bonus
  router.put('/payroll/bonuses/:id/approve', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { id } = req.params;
      
      const bonus = await prisma.bonus.update({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: req.user?.id || 'system'
        }
      });
      
      res.json(bonus);
    } catch (error) {
      console.error('Error approving bonus:', error);
      res.status(500).json({ error: 'Failed to approve bonus' });
    }
  });

  // Deduction Types Management Routes
  
  // Get deduction types
  router.get('/payroll/deduction-types', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { category, page = 1, limit = 50 } = req.query;
      
      const where: any = {
        tenantId: req.tenantId!,
        companyId,
        isActive: true
      };
      
      if (category) {
        where.category = category;
      }
      
      const deductionTypes = await prisma.deductionType.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { name: 'asc' }
      });
      
      const total = await prisma.deductionType.count({ where });
      
      res.json({
        deductionTypes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching deduction types:', error);
      res.status(500).json({ error: 'Failed to fetch deduction types' });
    }
  });

  // Create deduction type
  router.post('/payroll/deduction-types', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const deductionTypeData = req.body;
      
      const deductionType = await prisma.deductionType.create({
        data: {
          ...deductionTypeData,
          tenantId: req.tenantId!,
          companyId,
          annualLimit: deductionTypeData.annualLimit ? new Decimal(deductionTypeData.annualLimit) : null,
          monthlyLimit: deductionTypeData.monthlyLimit ? new Decimal(deductionTypeData.monthlyLimit) : null,
          percentage: deductionTypeData.percentage ? new Decimal(deductionTypeData.percentage) : null
        }
      });
      
      res.status(201).json(deductionType);
    } catch (error) {
      console.error('Error creating deduction type:', error);
      res.status(500).json({ error: 'Failed to create deduction type' });
    }
  });

  // Compliance Management Routes
  
  // Get compliance items
  router.get('/payroll/compliance', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { status, complianceType, page = 1, limit = 50 } = req.query;
      
      const where: any = {
        tenantId: req.tenantId!,
        companyId,
        isActive: true
      };
      
      if (status) {
        where.status = status;
      }
      
      if (complianceType) {
        where.complianceType = complianceType;
      }
      
      const complianceItems = await prisma.payrollCompliance.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { dueDate: 'asc' }
      });
      
      const total = await prisma.payrollCompliance.count({ where });
      
      res.json({
        complianceItems,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching compliance items:', error);
      res.status(500).json({ error: 'Failed to fetch compliance items' });
    }
  });

  // Create compliance item
  router.post('/payroll/compliance', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const complianceData = req.body;
      
      const complianceItem = await prisma.payrollCompliance.create({
        data: {
          ...complianceData,
          tenantId: req.tenantId!,
          companyId,
          dueDate: complianceData.dueDate ? new Date(complianceData.dueDate) : null,
          completedAt: complianceData.completedAt ? new Date(complianceData.completedAt) : null
        }
      });
      
      res.status(201).json(complianceItem);
    } catch (error) {
      console.error('Error creating compliance item:', error);
      res.status(500).json({ error: 'Failed to create compliance item' });
    }
  });

  // Mark compliance as completed
  router.put('/payroll/compliance/:id/complete', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      const { id } = req.params;
      const { notes } = req.body;
      
      const complianceItem = await prisma.payrollCompliance.update({
        where: {
          id,
          tenantId: req.tenantId!,
          companyId
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
          notes: notes || null
        }
      });
      
      res.json(complianceItem);
    } catch (error) {
      console.error('Error completing compliance item:', error);
      res.status(500).json({ error: 'Failed to complete compliance item' });
    }
  });

  // Salary History Management Routes
  
  // Get salary history for an employee
  router.get('/payroll/employees/:id/salary-history', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      
      const salaryHistory = await prisma.salaryHistory.findMany({
        where: {
          tenantId: req.tenantId!,
          companyId,
          employeeId: id
        },
        orderBy: { effectiveDate: 'desc' }
      });
      
      res.json(salaryHistory);
    } catch (error) {
      console.error('Error fetching salary history:', error);
      res.status(500).json({ error: 'Failed to fetch salary history' });
    }
  });

  // Create salary change
  router.post('/payroll/employees/:id/salary-change', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      const { 
        basicSalary, 
        salaryCurrency = 'USD', 
        payFrequency, 
        effectiveDate, 
        changeType, 
        changeReason, 
        changeAmount, 
        changePercentage, 
        notes 
      } = req.body;
      
      // Get current salary
      const currentSalary = await prisma.salaryHistory.findFirst({
        where: {
          tenantId: req.tenantId!,
          companyId,
          employeeId: id,
          status: 'active'
        },
        orderBy: { effectiveDate: 'desc' }
      });
      
      // End current salary period
      if (currentSalary) {
        await prisma.salaryHistory.update({
          where: { id: currentSalary.id },
          data: { 
            endDate: new Date(effectiveDate),
            status: 'inactive'
          }
        });
      }
      
      // Create new salary record
      const newSalaryRecord = await prisma.salaryHistory.create({
        data: {
          tenantId: req.tenantId!,
          companyId,
          employeeId: id,
          basicSalary: Number(basicSalary),
          salaryCurrency,
          payFrequency,
          effectiveDate: new Date(effectiveDate),
          changeType,
          changeReason,
          changeAmount: changeAmount ? Number(changeAmount) : null,
          changePercentage: changePercentage ? Number(changePercentage) : null,
          status: 'active',
          notes
        }
      });
      
      // Update employee's current salary
      await prisma.employee.update({
        where: { id },
        data: {
          basicSalary: Number(basicSalary),
          salaryCurrency,
          salaryEffectiveDate: new Date(effectiveDate)
        }
      });
      
      res.json({
        message: 'Salary change created successfully',
        salaryRecord: newSalaryRecord
      });
    } catch (error) {
      console.error('Error creating salary change:', error);
      res.status(500).json({ error: 'Failed to create salary change' });
    }
  });

  // Get effective salary for a specific date
  router.get('/payroll/employees/:id/effective-salary', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      const { effectiveDate } = req.query;
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      const targetDate = effectiveDate ? new Date(effectiveDate as string) : new Date();
      
      const salaryRecord = await prisma.salaryHistory.findFirst({
        where: {
          tenantId: req.tenantId!,
          companyId,
          employeeId: id,
          effectiveDate: { lte: targetDate },
          OR: [
            { endDate: null },
            { endDate: { gte: targetDate } }
          ],
          status: 'active'
        },
        orderBy: { effectiveDate: 'desc' }
      });
      
      if (!salaryRecord) {
        return res.status(404).json({ error: 'No salary record found for the specified date' });
      }
      
      res.json(salaryRecord);
    } catch (error) {
      console.error('Error fetching effective salary:', error);
      res.status(500).json({ error: 'Failed to fetch effective salary' });
    }
  });

  // Get comprehensive salary summary for an employee
  router.get('/payroll/employees/:id/salary-summary', async (req: TenantRequest, res: Response) => {
    try {
      const companyId = req.header('x-company-id') || String(req.query.companyId || '');
      const { effectiveDate } = req.query;
      
      if (!companyId) {
        return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
      }
      
      const { id } = req.params;
      const targetDate = effectiveDate ? new Date(effectiveDate as string) : new Date();
      
      // Get employee with current salary
      const employee = await prisma.employee.findFirst({
        where: {
          tenantId: req.tenantId!,
          companyId,
          id
        }
      });

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Get effective salary for the date
      const salaryRecord = await prisma.salaryHistory.findFirst({
        where: {
          tenantId: req.tenantId!,
          companyId,
          employeeId: id,
          effectiveDate: { lte: targetDate },
          OR: [
            { endDate: null },
            { endDate: { gte: targetDate } }
          ],
          status: 'active'
        },
        orderBy: { effectiveDate: 'desc' }
      });

      const currentSalary = salaryRecord ? Number(salaryRecord.basicSalary) : (employee.basicSalary ? Number(employee.basicSalary) : Number(employee.payRate));
      const payFrequency = salaryRecord ? salaryRecord.payFrequency : employee.payFrequency;

      // Calculate gross pay per period
      const grossPay = PayrollCalculator.calculateSalaryPay(currentSalary, payFrequency);

      // Get employee benefits and deductions
      const benefits = await prisma.payrollBenefit.findMany({
        where: {
          tenantId: req.tenantId!,
          companyId,
          employeeId: id,
          effectiveDate: { lte: targetDate },
          OR: [
            { endDate: null },
            { endDate: { gte: targetDate } }
          ]
        }
      });

      const deductions = await prisma.payrollDeduction.findMany({
        where: {
          tenantId: req.tenantId!,
          companyId,
          employeeId: id,
          effectiveDate: { lte: targetDate },
          OR: [
            { endDate: null },
            { endDate: { gte: targetDate } }
          ]
        }
      });

      // Calculate comprehensive salary summary
      const salarySummary = PayrollCalculator.calculateSalarySummary(grossPay, employee, benefits, deductions);

      res.json({
        employee: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          employeeNumber: employee.employeeNumber,
          department: employee.department,
          position: employee.position
        },
        salary: {
          annualSalary: currentSalary,
          payFrequency: payFrequency,
          grossPayPerPeriod: grossPay,
          effectiveDate: salaryRecord?.effectiveDate || employee.salaryEffectiveDate
        },
        summary: salarySummary,
        breakdown: salarySummary.breakdown
      });
    } catch (error) {
      console.error('Error fetching salary summary:', error);
      res.status(500).json({ error: 'Failed to fetch salary summary' });
    }
  });

  // Enhanced Payroll Processing with all new features
  router.post('/payroll/payroll-periods/:id/process-enhanced', async (req: TenantRequest, res: Response) => {
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
      
      // Get all active employees with enhanced data
      const employees = await prisma.employee.findMany({
        where: {
          tenantId: req.tenantId!,
          companyId,
          isActive: true,
          employmentStatus: 'active'
        },
        include: {
          bonuses: {
            where: {
              status: 'approved',
              effectiveDate: { lte: period.endDate },
              OR: [
                { endDate: null },
                { endDate: { gte: period.startDate } }
              ]
            }
          },
          payrollDeductions: {
            where: {
              isActive: true,
              effectiveDate: { lte: period.endDate },
              OR: [
                { endDate: null },
                { endDate: { gte: period.startDate } }
              ]
            },
            include: {
              deductionType: true
            }
          }
        }
      });
      
      const payrollRecords = [];
      
      for (const employee of employees) {
        // Calculate hours (simplified - in production, get from time entries)
        const regularHours = 80; // Default 80 hours for biweekly
        const overtimeHours = 0;
        const shiftDifferentialHours = 0;
        const hazardPayHours = 0;
        const onCallHours = 0;
        const travelHours = 0;
        
        // Calculate base pay
        let grossPay = 0;
        let regularPay = 0;
        let overtimePay = 0;
        let shiftDifferentialPay = 0;
        let hazardPay = 0;
        let onCallPay = 0;
        let travelPay = 0;
        let pieceRatePay = 0;
        
        if (employee.payRateType === 'hourly') {
          regularPay = regularHours * Number(employee.payRate);
          overtimePay = overtimeHours * Number(employee.payRate) * Number(employee.overtimeRate || 1.5);
          
          if (employee.shiftDifferentialRate) {
            shiftDifferentialPay = PayrollCalculator.calculateShiftDifferentialPay(
              shiftDifferentialHours, Number(employee.payRate), Number(employee.shiftDifferentialRate)
            );
          }
          
          if (employee.hazardPayRate) {
            hazardPay = PayrollCalculator.calculateHazardPay(
              hazardPayHours, Number(employee.payRate), Number(employee.hazardPayRate)
            );
          }
          
          if (employee.onCallPayRate) {
            onCallPay = PayrollCalculator.calculateOnCallPay(
              onCallHours, Number(employee.payRate), Number(employee.onCallPayRate)
            );
          }
          
          if (employee.travelPayRate) {
            travelPay = PayrollCalculator.calculateTravelPay(
              travelHours, Number(employee.payRate), Number(employee.travelPayRate)
            );
          }
          
          grossPay = regularPay + overtimePay + shiftDifferentialPay + hazardPay + onCallPay + travelPay;
        } else if (employee.payRateType === 'salary') {
          // Enhanced salary processing with history support
          let effectiveSalary = employee.basicSalary ? Number(employee.basicSalary) : Number(employee.payRate);
          let salaryHistory = [];
          
          // Check for salary changes during the payroll period
          const salaryChanges = await prisma.salaryHistory.findMany({
            where: {
              tenantId: req.tenantId!,
              companyId,
              employeeId: employee.id,
              effectiveDate: { lte: period.endDate },
              OR: [
                { endDate: null },
                { endDate: { gte: period.startDate } }
              ],
              status: 'active'
            },
            orderBy: { effectiveDate: 'asc' }
          });
          
          if (salaryChanges.length > 0) {
            // Handle multiple salary changes during the period
            let totalPay = 0;
            
            for (let i = 0; i < salaryChanges.length; i++) {
              const salaryChange = salaryChanges[i];
              const nextChange = salaryChanges[i + 1];
              
              // Determine the effective period for this salary
              const salaryStartDate = new Date(Math.max(salaryChange.effectiveDate.getTime(), period.startDate.getTime()));
              const salaryEndDate = nextChange 
                ? new Date(Math.min(nextChange.effectiveDate.getTime(), period.endDate.getTime()))
                : period.endDate;
              
              // Calculate pro-rated salary for this period
              const proRatedSalary = PayrollCalculator.calculateProRatedSalary(
                Number(salaryChange.basicSalary),
                salaryChange.payFrequency,
                salaryStartDate,
                salaryEndDate,
                salaryChange.effectiveDate
              );
              
              totalPay += proRatedSalary;
              salaryHistory.push({
                salaryChange,
                periodStart: salaryStartDate,
                periodEnd: salaryEndDate,
                proRatedAmount: proRatedSalary
              });
            }
            
            regularPay = totalPay;
          } else {
            // No salary changes, use standard calculation
            regularPay = PayrollCalculator.calculateSalaryPay(effectiveSalary, employee.payFrequency);
          }
          
          // Calculate overtime for salary employees (if applicable)
          if (overtimeHours > 0) {
            overtimePay = PayrollCalculator.calculateSalaryOvertime(regularPay, overtimeHours);
          }
          
          // Calculate additional pay types for salary employees
          if (employee.shiftDifferentialRate) {
            const hourlyRate = regularPay / 40; // Assume 40 hours per pay period
            shiftDifferentialPay = PayrollCalculator.calculateShiftDifferentialPay(
              shiftDifferentialHours, hourlyRate, Number(employee.shiftDifferentialRate)
            );
          }
          
          if (employee.hazardPayRate) {
            const hourlyRate = regularPay / 40;
            hazardPay = PayrollCalculator.calculateHazardPay(
              hazardPayHours, hourlyRate, Number(employee.hazardPayRate)
            );
          }
          
          if (employee.onCallPayRate) {
            const hourlyRate = regularPay / 40;
            onCallPay = PayrollCalculator.calculateOnCallPay(
              onCallHours, hourlyRate, Number(employee.onCallPayRate)
            );
          }
          
          if (employee.travelPayRate) {
            const hourlyRate = regularPay / 40;
            travelPay = PayrollCalculator.calculateTravelPay(
              travelHours, hourlyRate, Number(employee.travelPayRate)
            );
          }
          
          grossPay = regularPay + overtimePay + shiftDifferentialPay + hazardPay + onCallPay + travelPay;
        } else if (employee.payRateType === 'commission') {
          // Commission-based pay
          regularPay = 0; // Base salary for commission employees
          grossPay = regularPay;
        } else if (employee.payRateType === 'piece_rate') {
          // Piece rate pay
          const quantity = 0; // In production, get actual quantity
          pieceRatePay = PayrollCalculator.calculatePieceRatePay(quantity, Number(employee.pieceRate || 0));
          grossPay = pieceRatePay;
        }
        
        // Calculate bonuses
        let bonusAmount = 0;
        employee.bonuses.forEach(bonus => {
          if (bonus.percentage) {
            bonusAmount += PayrollCalculator.calculateBonusPay(grossPay, Number(bonus.percentage));
          } else {
            bonusAmount += Number(bonus.amount);
          }
        });
        
        // Calculate commission (simplified)
        let commissionAmount = 0;
        if (employee.commissionRate && employee.payRateType === 'commission') {
          // In production, get actual sales data
          const salesAmount = 0; // Placeholder
          commissionAmount = PayrollCalculator.calculateCommissionPay(
            salesAmount, Number(employee.commissionRate), Number(employee.commissionThreshold || 0)
          );
        }
        
        grossPay += bonusAmount + commissionAmount;
        
        // Calculate pre-tax deductions
        const preTaxDeductions = PayrollCalculator.calculatePreTaxDeductions(grossPay, employee.payrollDeductions);
        const taxableIncome = grossPay - preTaxDeductions;
        
        // Calculate taxes
        const federalTax = PayrollCalculator.calculateFederalTax(
          taxableIncome,
          employee.taxFilingStatus || 'single',
          employee.federalExemptions
        );
        
        const stateTax = PayrollCalculator.calculateStateTax(taxableIncome, employee.state || 'CA');
        const localTax = PayrollCalculator.calculateLocalTax(taxableIncome, employee.city || '');
        const socialSecurity = PayrollCalculator.calculateSocialSecurity(taxableIncome);
        const medicare = PayrollCalculator.calculateMedicare(taxableIncome);
        const unemploymentTax = PayrollCalculator.calculateUnemploymentTax(taxableIncome);
        const workersCompTax = PayrollCalculator.calculateWorkersCompTax(taxableIncome);
        
        // Calculate post-tax deductions
        const postTaxDeductions = PayrollCalculator.calculatePostTaxDeductions(taxableIncome, employee.payrollDeductions);
        
        // Calculate benefits (simplified)
        const healthInsurance = employee.healthInsurance ? 200 : 0;
        const dentalInsurance = employee.dentalInsurance ? 50 : 0;
        const visionInsurance = employee.visionInsurance ? 25 : 0;
        const lifeInsurance = employee.lifeInsurance ? 30 : 0;
        const retirement401k = employee.retirement401k && employee.retirement401kRate ? 
                              taxableIncome * Number(employee.retirement401kRate) / 100 : 0;
        
        const totalDeductions = preTaxDeductions + postTaxDeductions + healthInsurance + dentalInsurance + 
                               visionInsurance + lifeInsurance + retirement401k;
        const totalTaxes = federalTax + stateTax + localTax + socialSecurity + medicare + unemploymentTax + workersCompTax;
        const netPay = grossPay - totalTaxes - totalDeductions;
        
        // Create enhanced payroll record
        const payrollRecord = await prisma.payrollRecord.create({
          data: {
            tenantId: req.tenantId!,
            companyId,
            employeeId: employee.id,
            payrollPeriodId: period.id,
            regularHours: new Decimal(regularHours),
            overtimeHours: new Decimal(overtimeHours),
            shiftDifferentialHours: new Decimal(shiftDifferentialHours),
            hazardPayHours: new Decimal(hazardPayHours),
            onCallHours: new Decimal(onCallHours),
            travelHours: new Decimal(travelHours),
            regularPay: new Decimal(regularPay),
            overtimePay: new Decimal(overtimePay),
            shiftDifferentialPay: new Decimal(shiftDifferentialPay),
            hazardPay: new Decimal(hazardPay),
            onCallPay: new Decimal(onCallPay),
            travelPay: new Decimal(travelPay),
            pieceRatePay: new Decimal(pieceRatePay),
            bonusAmount: new Decimal(bonusAmount),
            commissionAmount: new Decimal(commissionAmount),
            grossPay: new Decimal(grossPay),
            federalTax: new Decimal(federalTax),
            stateTax: new Decimal(stateTax),
            localTax: new Decimal(localTax),
            socialSecurity: new Decimal(socialSecurity),
            medicare: new Decimal(medicare),
            unemploymentTax: new Decimal(unemploymentTax),
            workersCompTax: new Decimal(workersCompTax),
            healthInsurance: new Decimal(healthInsurance),
            dentalInsurance: new Decimal(dentalInsurance),
            visionInsurance: new Decimal(visionInsurance),
            lifeInsurance: new Decimal(lifeInsurance),
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
          status: 'pending_approval',
          totalGrossPay: new Decimal(totalGrossPay),
          totalNetPay: new Decimal(totalNetPay),
          totalTaxes: new Decimal(totalTaxes),
          totalDeductions: new Decimal(totalDeductions),
          employeeCount: payrollRecords.length
        }
      });
      
      res.json({
        message: 'Enhanced payroll processed successfully',
        periodId: period.id,
        recordsCreated: payrollRecords.length,
        totalGrossPay,
        totalNetPay,
        totalTaxes,
        totalDeductions
      });
    } catch (error) {
      console.error('Error processing enhanced payroll:', error);
      res.status(500).json({ error: 'Failed to process enhanced payroll' });
    }
  });
}
