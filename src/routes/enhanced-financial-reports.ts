import { Router } from 'express';
import { enhancedFinancialReportingEngine } from '../services/enhanced-financial-reporting';
import { prisma } from '../prisma';
import { TenantRequest } from '../tenant';
import { asyncHandler } from '../errors';
import { authMiddleware } from '../auth';

const router = Router();

// Create properly configured auth middleware
const auth = authMiddleware(process.env.JWT_SECRET || "dev-secret");

// Test endpoint to check if routes are working
router.get('/test', asyncHandler(async (req: any, res: any) => {
  res.json({ message: 'Enhanced Financial Reports API is working', timestamp: new Date().toISOString() });
}));

// Enhanced Balance Sheet (temporarily without auth for testing)
router.get('/balance-sheet', asyncHandler(async (req: TenantRequest, res: any) => {
  
  const { companyId, asOfDate } = req.query;
  
  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  const date = asOfDate ? new Date(asOfDate as string) : new Date();
  
  try {
    const balanceSheet = await enhancedFinancialReportingEngine.generateBalanceSheet(
      companyId as string,
      date,
      req.tenantId
    );

    res.json({
      success: true,
      data: balanceSheet,
      message: 'Balance sheet generated successfully'
    });
  } catch (error) {
    console.error('Balance sheet generation error:', error);
    res.status(500).json({ error: 'Failed to generate balance sheet' });
  }
}));

// Enhanced Profit & Loss Statement
router.get('/profit-loss', auth, asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId, startDate, endDate } = req.query;
  
  if (!companyId || !startDate || !endDate) {
    return res.status(400).json({ error: 'Company ID, start date, and end date are required' });
  }

  const period = {
    startDate: new Date(startDate as string),
    endDate: new Date(endDate as string)
  };
  
  try {
    const profitAndLoss = await enhancedFinancialReportingEngine.generateProfitAndLoss(
      companyId as string,
      period,
      req.tenantId
    );

    res.json({
      success: true,
      data: profitAndLoss,
      message: 'Profit & Loss statement generated successfully'
    });
  } catch (error) {
    console.error('Profit & Loss generation error:', error);
    res.status(500).json({ error: 'Failed to generate Profit & Loss statement' });
  }
}));

// Enhanced Cash Flow Statement
router.get('/cash-flow', auth, asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId, startDate, endDate } = req.query;
  
  if (!companyId || !startDate || !endDate) {
    return res.status(400).json({ error: 'Company ID, start date, and end date are required' });
  }

  const period = {
    startDate: new Date(startDate as string),
    endDate: new Date(endDate as string)
  };
  
  try {
    const cashFlow = await enhancedFinancialReportingEngine.generateCashFlow(
      companyId as string,
      period,
      req.tenantId
    );

    res.json({
      success: true,
      data: cashFlow,
      message: 'Cash flow statement generated successfully'
    });
  } catch (error) {
    console.error('Cash flow generation error:', error);
    res.status(500).json({ error: 'Failed to generate cash flow statement' });
  }
}));

// Custom Report Builder
router.post('/custom-report', auth, asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId, type, items, filters, grouping } = req.body;
  
  if (!companyId || !type || !items) {
    return res.status(400).json({ error: 'Company ID, type, and items are required' });
  }

  const reportSpec = {
    type,
    companyId,
    items,
    filters,
    grouping
  };
  
  try {
    const customReport = await enhancedFinancialReportingEngine.generateCustomReport(reportSpec);

    res.json({
      success: true,
      data: customReport,
      message: 'Custom report generated successfully'
    });
  } catch (error) {
    console.error('Custom report generation error:', error);
    res.status(500).json({ error: 'Failed to generate custom report' });
  }
}));

// Generate Report (Unified endpoint) - temporarily without auth for testing
router.post('/generate', asyncHandler(async (req: TenantRequest, res: any) => {
  const { reportType, companyId, asOfDate, startDate, endDate } = req.body;
  
  if (!reportType || !companyId) {
    return res.status(400).json({ error: 'Report type and company ID are required' });
  }

  try {
    let reportData;
    
    switch (reportType) {
      case 'balance-sheet':
        if (!asOfDate) {
          return res.status(400).json({ error: 'As of date is required for balance sheet' });
        }
        reportData = await enhancedFinancialReportingEngine.generateBalanceSheet(
          companyId,
          new Date(asOfDate),
          req.tenantId
        );
        break;
        
      case 'profit-loss':
        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'Start date and end date are required for profit & loss' });
        }
        reportData = await enhancedFinancialReportingEngine.generateProfitAndLoss(
          companyId,
          {
            startDate: new Date(startDate),
            endDate: new Date(endDate)
          },
          req.tenantId
        );
        break;
        
      case 'cash-flow':
        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'Start date and end date are required for cash flow' });
        }
        reportData = await enhancedFinancialReportingEngine.generateCashFlow(
          companyId,
          {
            startDate: new Date(startDate),
            endDate: new Date(endDate)
          },
          req.tenantId
        );
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid report type. Must be balance-sheet, profit-loss, or cash-flow' });
    }

    res.json({
      success: true,
      data: reportData,
      message: `${reportType} report generated successfully`
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}));

// Export Report
router.post('/export', auth, asyncHandler(async (req: TenantRequest, res: any) => {
  const { report, format } = req.body;
  
  if (!report || !format) {
    return res.status(400).json({ error: 'Report data and format are required' });
  }

  if (!['pdf', 'excel', 'csv'].includes(format)) {
    return res.status(400).json({ error: 'Format must be pdf, excel, or csv' });
  }
  
  try {
    const buffer = await enhancedFinancialReportingEngine.exportReport(report, format);
    
    const contentTypeMap = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv'
    };
    const contentType = contentTypeMap[format as keyof typeof contentTypeMap];

    const filename = `report-${Date.now()}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Report export error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
}));

// Financial Ratios Analysis
router.get('/ratios', auth, asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId, asOfDate } = req.query;
  
  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  const date = asOfDate ? new Date(asOfDate as string) : new Date();
  
  try {
    const balanceSheet = await enhancedFinancialReportingEngine.generateBalanceSheet(
      companyId as string,
      date,
      req.tenantId
    );

    // Get P&L for the current year to calculate profitability ratios
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);
    
    const profitAndLoss = await enhancedFinancialReportingEngine.generateProfitAndLoss(
      companyId as string,
      { startDate: yearStart, endDate: yearEnd },
      req.tenantId
    );

    // Calculate additional ratios
    const enhancedRatios = {
      ...balanceSheet.ratios,
      returnOnAssets: balanceSheet.totalAssets > 0 ? (profitAndLoss.netIncome / balanceSheet.totalAssets) * 100 : 0,
      returnOnEquity: balanceSheet.totalEquity > 0 ? (profitAndLoss.netIncome / balanceSheet.totalEquity) * 100 : 0,
      assetTurnover: balanceSheet.totalAssets > 0 ? profitAndLoss.revenue.totalRevenue / balanceSheet.totalAssets : 0,
      grossProfitMargin: profitAndLoss.revenue.totalRevenue > 0 ? (profitAndLoss.grossProfit / profitAndLoss.revenue.totalRevenue) * 100 : 0,
      operatingMargin: profitAndLoss.revenue.totalRevenue > 0 ? (profitAndLoss.operatingIncome / profitAndLoss.revenue.totalRevenue) * 100 : 0,
      netProfitMargin: profitAndLoss.revenue.totalRevenue > 0 ? (profitAndLoss.netIncome / profitAndLoss.revenue.totalRevenue) * 100 : 0
    };

    res.json({
      success: true,
      data: {
        ratios: enhancedRatios,
        asOfDate: date,
        companyId
      },
      message: 'Financial ratios calculated successfully'
    });
  } catch (error) {
    console.error('Financial ratios calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate financial ratios' });
  }
}));

// Comparative Analysis
router.get('/comparative', auth, asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId, reportType, currentPeriod, previousPeriod } = req.query;
  
  if (!companyId || !reportType || !currentPeriod || !previousPeriod) {
    return res.status(400).json({ error: 'Company ID, report type, current period, and previous period are required' });
  }

  try {
    let currentReport, previousReport;

    if (reportType === 'balance-sheet') {
      const currentDate = new Date(currentPeriod as string);
      const previousDate = new Date(previousPeriod as string);
      
      currentReport = await enhancedFinancialReportingEngine.generateBalanceSheet(
        companyId as string,
        currentDate,
        req.tenantId
      );
      
      previousReport = await enhancedFinancialReportingEngine.generateBalanceSheet(
        companyId as string,
        previousDate,
        req.tenantId
      );
    } else if (reportType === 'profit-loss') {
      const currentDates = JSON.parse(currentPeriod as string);
      const previousDates = JSON.parse(previousPeriod as string);
      
      currentReport = await enhancedFinancialReportingEngine.generateProfitAndLoss(
        companyId as string,
        { startDate: new Date(currentDates.startDate), endDate: new Date(currentDates.endDate) },
        req.tenantId
      );
      
      previousReport = await enhancedFinancialReportingEngine.generateProfitAndLoss(
        companyId as string,
        { startDate: new Date(previousDates.startDate), endDate: new Date(previousDates.endDate) },
        req.tenantId
      );
    }

    // Calculate changes and percentages
    const comparativeAnalysis = calculateComparativeAnalysis(currentReport, previousReport, reportType as string);

    res.json({
      success: true,
      data: {
        currentPeriod: currentReport,
        previousPeriod: previousReport,
        analysis: comparativeAnalysis
      },
      message: 'Comparative analysis generated successfully'
    });
  } catch (error) {
    console.error('Comparative analysis error:', error);
    res.status(500).json({ error: 'Failed to generate comparative analysis' });
  }
}));

// Report Templates (temporarily without auth for testing)
router.get('/templates', asyncHandler(async (req: TenantRequest, res: any) => {
  try {
    const templates = [
      {
        id: 'standard-balance-sheet',
        name: 'Standard Balance Sheet',
        type: 'balance_sheet',
        description: 'Standard balance sheet with assets, liabilities, and equity',
        items: [
          { id: 'assets', name: 'Assets', type: 'account', order: 1 },
          { id: 'liabilities', name: 'Liabilities', type: 'account', order: 2 },
          { id: 'equity', name: 'Equity', type: 'account', order: 3 }
        ]
      },
      {
        id: 'detailed-profit-loss',
        name: 'Detailed Profit & Loss',
        type: 'income_statement',
        description: 'Detailed profit and loss statement with revenue and expense breakdown',
        items: [
          { id: 'revenue', name: 'Revenue', type: 'account', order: 1 },
          { id: 'cogs', name: 'Cost of Goods Sold', type: 'account', order: 2 },
          { id: 'expenses', name: 'Operating Expenses', type: 'account', order: 3 }
        ]
      },
      {
        id: 'cash-flow-analysis',
        name: 'Cash Flow Analysis',
        type: 'cash_flow',
        description: 'Comprehensive cash flow statement',
        items: [
          { id: 'operating', name: 'Operating Activities', type: 'account', order: 1 },
          { id: 'investing', name: 'Investing Activities', type: 'account', order: 2 },
          { id: 'financing', name: 'Financing Activities', type: 'account', order: 3 }
        ]
      }
    ];

    res.json({
      success: true,
      data: templates,
      message: 'Report templates retrieved successfully'
    });
  } catch (error) {
    console.error('Template retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve report templates' });
  }
}));

// Save Custom Report
router.post('/save-report', auth, asyncHandler(async (req: TenantRequest, res: any) => {
  const { name, type, items, filters, grouping, isTemplate, isPublic } = req.body;
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = 'demo-user-id'; // TODO: Get from authentication
  
  if (!name || !type || !items) {
    return res.status(400).json({ error: 'Name, type, and items are required' });
  }

  try {
    const savedReport = await prisma.financialReport.create({
      data: {
        name,
        type,
        description: req.body.description || '',
        companyId: req.body.companyId || 'demo-company-id',
        createdBy: userId,
        isTemplate: isTemplate || false,
        isPublic: isPublic || false,
        metadata: JSON.stringify({ filters, grouping })
      }
    });

    // Save report items
    const reportItems = items.map((item: any, index: number) => ({
      reportId: savedReport.id,
      name: item.name,
      type: item.type,
      order: item.order || index + 1,
      configuration: item.configuration ? JSON.stringify(item.configuration) : null,
      formula: item.formula || null,
      accountIds: item.accountIds ? item.accountIds.join(',') : null
    }));

    await prisma.reportItem.createMany({
      data: reportItems
    });

    res.json({
      success: true,
      data: savedReport,
      message: 'Report saved successfully'
    });
  } catch (error) {
    console.error('Report save error:', error);
    res.status(500).json({ error: 'Failed to save report' });
  }
}));

// Get Saved Reports
router.get('/saved-reports', auth, asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.query;
  const tenantId = req.headers['x-tenant-id'] as string;
  
  try {
    const reports = await prisma.financialReport.findMany({
      where: {
        companyId: companyId as string || 'demo-company-id',
        isTemplate: false
      },
      include: {
        reportItems: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: reports,
      message: 'Saved reports retrieved successfully'
    });
  } catch (error) {
    console.error('Saved reports retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve saved reports' });
  }
}));

// Helper function for comparative analysis
function calculateComparativeAnalysis(current: any, previous: any, reportType: string) {
  const analysis: any = {};

  if (reportType === 'balance-sheet') {
    analysis.totalAssets = {
      current: current.totalAssets,
      previous: previous.totalAssets,
      change: current.totalAssets - previous.totalAssets,
      changePercent: previous.totalAssets > 0 ? ((current.totalAssets - previous.totalAssets) / previous.totalAssets) * 100 : 0
    };

    analysis.totalLiabilities = {
      current: current.totalLiabilities,
      previous: previous.totalLiabilities,
      change: current.totalLiabilities - previous.totalLiabilities,
      changePercent: previous.totalLiabilities > 0 ? ((current.totalLiabilities - previous.totalLiabilities) / previous.totalLiabilities) * 100 : 0
    };

    analysis.totalEquity = {
      current: current.totalEquity,
      previous: previous.totalEquity,
      change: current.totalEquity - previous.totalEquity,
      changePercent: previous.totalEquity > 0 ? ((current.totalEquity - previous.totalEquity) / previous.totalEquity) * 100 : 0
    };
  } else if (reportType === 'profit-loss') {
    analysis.totalRevenue = {
      current: current.revenue.totalRevenue,
      previous: previous.revenue.totalRevenue,
      change: current.revenue.totalRevenue - previous.revenue.totalRevenue,
      changePercent: previous.revenue.totalRevenue > 0 ? ((current.revenue.totalRevenue - previous.revenue.totalRevenue) / previous.revenue.totalRevenue) * 100 : 0
    };

    analysis.netIncome = {
      current: current.netIncome,
      previous: previous.netIncome,
      change: current.netIncome - previous.netIncome,
      changePercent: previous.netIncome > 0 ? ((current.netIncome - previous.netIncome) / previous.netIncome) * 100 : 0
    };
  }

  return analysis;
}

export default router;
