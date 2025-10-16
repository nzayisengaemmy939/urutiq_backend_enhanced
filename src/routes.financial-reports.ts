import { Router } from 'express';
import { FinancialReportingService, FinancialReportParams } from './services/financial-reporting.service';
import { authMiddleware, requireRoles } from './auth';
import { asyncHandler, ApiError } from './errors';
import { TenantRequest } from './tenant';
import { z } from 'zod';
import { prisma } from './prisma';

const router = Router();

// Validation schemas
const financialReportSchema = z.object({
  companyId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  currency: z.string().optional().default('USD'),
  includeComparisons: z.boolean().optional().default(false),
  comparisonPeriod: z.enum(['previous', 'year_ago', 'custom']).optional(),
  customStartDate: z.string().datetime().optional(),
  customEndDate: z.string().datetime().optional()
});

// Generate Balance Sheet
router.get('/reports/balance-sheet',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res) => {
    const params = financialReportSchema.parse({
      ...req.query,
      companyId: req.query.companyId || req.user?.companyId
    });

    const reportParams: FinancialReportParams = {
      tenantId: req.tenantId!,
      companyId: params.companyId,
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      currency: params.currency,
      includeComparisons: params.includeComparisons,
      comparisonPeriod: params.comparisonPeriod,
      customStartDate: params.customStartDate ? new Date(params.customStartDate) : undefined,
      customEndDate: params.customEndDate ? new Date(params.customEndDate) : undefined
    };

    const result = await FinancialReportingService.generateReportWithComparison(
      FinancialReportingService.generateBalanceSheet,
      reportParams
    );

  res.json({
      success: true,
      data: result,
      generatedAt: new Date().toISOString(),
      reportType: 'balance_sheet'
    });
  })
);

// Generate Income Statement (P&L)
router.get('/reports/income-statement',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res) => {
    const params = financialReportSchema.parse({
      ...req.query,
      companyId: req.query.companyId || req.user?.companyId
    });

    const reportParams: FinancialReportParams = {
      tenantId: req.tenantId!,
      companyId: params.companyId,
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      currency: params.currency,
      includeComparisons: params.includeComparisons,
      comparisonPeriod: params.comparisonPeriod,
      customStartDate: params.customStartDate ? new Date(params.customStartDate) : undefined,
      customEndDate: params.customEndDate ? new Date(params.customEndDate) : undefined
    };

    const result = await FinancialReportingService.generateReportWithComparison(
      FinancialReportingService.generateIncomeStatement,
      reportParams
    );

  res.json({
      success: true,
      data: result,
      generatedAt: new Date().toISOString(),
      reportType: 'income_statement'
    });
  })
);

// Generate Cash Flow Statement
router.get('/reports/cash-flow',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res) => {
    const params = financialReportSchema.parse({
      ...req.query,
      companyId: req.query.companyId || req.user?.companyId
    });

    const reportParams: FinancialReportParams = {
      tenantId: req.tenantId!,
      companyId: params.companyId,
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      currency: params.currency,
      includeComparisons: params.includeComparisons,
      comparisonPeriod: params.comparisonPeriod,
      customStartDate: params.customStartDate ? new Date(params.customStartDate) : undefined,
      customEndDate: params.customEndDate ? new Date(params.customEndDate) : undefined
    };

    const result = await FinancialReportingService.generateReportWithComparison(
      FinancialReportingService.generateCashFlowStatement,
      reportParams
    );

  res.json({
      success: true,
      data: result,
      generatedAt: new Date().toISOString(),
      reportType: 'cash_flow'
    });
  })
);

// Generate comprehensive financial report (all three statements)
router.get('/reports/comprehensive',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const params = financialReportSchema.parse({
      ...req.query,
      companyId: req.query.companyId || req.user?.companyId
    });

    const reportParams: FinancialReportParams = {
      tenantId: req.tenantId!,
      companyId: params.companyId,
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      currency: params.currency,
      includeComparisons: params.includeComparisons,
      comparisonPeriod: params.comparisonPeriod,
      customStartDate: params.customStartDate ? new Date(params.customStartDate) : undefined,
      customEndDate: params.customEndDate ? new Date(params.customEndDate) : undefined
    };

    const [balanceSheet, incomeStatement, cashFlow] = await Promise.all([
      FinancialReportingService.generateReportWithComparison(
        FinancialReportingService.generateBalanceSheet,
        reportParams
      ),
      FinancialReportingService.generateReportWithComparison(
        FinancialReportingService.generateIncomeStatement,
        reportParams
      ),
      FinancialReportingService.generateReportWithComparison(
        FinancialReportingService.generateCashFlowStatement,
        reportParams
      )
    ]);

  res.json({
      success: true,
      data: {
        balanceSheet,
        incomeStatement,
        cashFlow,
        summary: {
          totalAssets: balanceSheet.current.totalAssets,
          totalLiabilities: balanceSheet.current.totalLiabilities,
          totalEquity: balanceSheet.current.totalEquity,
          netIncome: incomeStatement.current.netIncome,
          netCashFlow: cashFlow.current.netCashFlow,
          reportPeriod: {
            startDate: reportParams.startDate,
            endDate: reportParams.endDate
          },
          currency: reportParams.currency
        }
      },
      generatedAt: new Date().toISOString(),
      reportType: 'comprehensive'
    });
  })
);

// Export report to PDF/Excel
router.post('/reports/export',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const exportSchema = z.object({
      reportType: z.enum(['balance_sheet', 'income_statement', 'cash_flow', 'comprehensive']),
      format: z.enum(['pdf', 'excel', 'csv']),
      reportParams: financialReportSchema,
      templateId: z.string().optional(),
      includeCharts: z.boolean().optional().default(true)
    });

    const { reportType, format, reportParams, templateId, includeCharts } = exportSchema.parse(req.body);

    const params: FinancialReportParams = {
      tenantId: req.tenantId!,
      companyId: reportParams.companyId,
      startDate: new Date(reportParams.startDate),
      endDate: new Date(reportParams.endDate),
      currency: reportParams.currency,
      includeComparisons: reportParams.includeComparisons,
      comparisonPeriod: reportParams.comparisonPeriod,
      customStartDate: reportParams.customStartDate ? new Date(reportParams.customStartDate) : undefined,
      customEndDate: reportParams.customEndDate ? new Date(reportParams.customEndDate) : undefined
    };

    // Generate the report data
    let reportData: any;
    switch (reportType) {
      case 'balance_sheet':
        reportData = await FinancialReportingService.generateReportWithComparison(
          FinancialReportingService.generateBalanceSheet,
          params
        );
        break;
      case 'income_statement':
        reportData = await FinancialReportingService.generateReportWithComparison(
          FinancialReportingService.generateIncomeStatement,
          params
        );
        break;
      case 'cash_flow':
        reportData = await FinancialReportingService.generateReportWithComparison(
          FinancialReportingService.generateCashFlowStatement,
          params
        );
        break;
      case 'comprehensive':
        const [balanceSheet, incomeStatement, cashFlow] = await Promise.all([
          FinancialReportingService.generateReportWithComparison(
            FinancialReportingService.generateBalanceSheet,
            params
          ),
          FinancialReportingService.generateReportWithComparison(
            FinancialReportingService.generateIncomeStatement,
            params
          ),
          FinancialReportingService.generateReportWithComparison(
            FinancialReportingService.generateCashFlowStatement,
            params
          )
        ]);
        reportData = { balanceSheet, incomeStatement, cashFlow };
        break;
    }

    // TODO: Implement actual export functionality
    // This would integrate with libraries like PDFKit, ExcelJS, etc.

  res.json({
      success: true,
      message: 'Export functionality will be implemented in the next phase',
      data: {
        reportType,
        format,
        reportData,
        exportUrl: null, // Would be the download URL
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });
  })
);

// Get available report templates
router.get('/reports/templates',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
  const templates = [
    {
        id: 'standard_balance_sheet',
        name: 'Standard Balance Sheet',
        description: 'Traditional balance sheet format',
        reportType: 'balance_sheet',
        category: 'financial_statements'
      },
      {
        id: 'detailed_income_statement',
        name: 'Detailed Income Statement',
        description: 'Comprehensive P&L with all line items',
        reportType: 'income_statement',
        category: 'financial_statements'
      },
      {
        id: 'cash_flow_direct',
        name: 'Direct Method Cash Flow',
        description: 'Cash flow using direct method',
        reportType: 'cash_flow',
        category: 'financial_statements'
      },
      {
        id: 'management_dashboard',
        name: 'Management Dashboard',
        description: 'Executive summary with key metrics',
        reportType: 'comprehensive',
        category: 'management_reports'
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  })
);

// Schedule recurring reports
router.post('/reports/schedule',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin']),
  asyncHandler(async (req: TenantRequest, res) => {
    const scheduleSchema = z.object({
      reportType: z.enum(['balance_sheet', 'income_statement', 'cash_flow', 'comprehensive']),
      frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
      recipients: z.array(z.string().email()),
      reportParams: financialReportSchema,
      templateId: z.string().optional(),
      isActive: z.boolean().default(true)
    });

    const scheduleData = scheduleSchema.parse(req.body);

    // TODO: Implement report scheduling functionality
    // This would integrate with a job queue system like BullMQ

  res.json({
      success: true,
      message: 'Report scheduling will be implemented in the next phase',
      data: {
        id: `schedule_${Date.now()}`,
        ...scheduleData,
        createdAt: new Date().toISOString(),
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      }
    });
  })
);

export default router;