import express from 'express';
import { z } from 'zod';
import { financialReportingService } from '../services/financial-reporting.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
const router = express.Router();
// Validation schemas
const periodSchema = z.object({
    period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
    previousPeriod: z.string().regex(/^\d{4}-\d{2}$/, 'Previous period must be in YYYY-MM format').optional()
});
// Balance Sheet
router.get('/financial-reporting/:companyId/balance-sheet', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { period, previousPeriod } = periodSchema.parse(req.query);
        const balanceSheet = await financialReportingService.generateBalanceSheet(companyId, period, previousPeriod);
        res.json({
            success: true,
            data: balanceSheet,
            metadata: {
                period,
                previousPeriod,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error generating balance sheet:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate balance sheet',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Income Statement
router.get('/financial-reporting/:companyId/income-statement', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { period, previousPeriod } = periodSchema.parse(req.query);
        const incomeStatement = await financialReportingService.generateIncomeStatement(companyId, period, previousPeriod);
        res.json({
            success: true,
            data: incomeStatement,
            metadata: {
                period,
                previousPeriod,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error generating income statement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate income statement',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Cash Flow Statement
router.get('/financial-reporting/:companyId/cash-flow', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { period, previousPeriod } = periodSchema.parse(req.query);
        const cashFlow = await financialReportingService.generateCashFlowStatement(companyId, period, previousPeriod);
        res.json({
            success: true,
            data: cashFlow,
            metadata: {
                period,
                previousPeriod,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error generating cash flow statement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate cash flow statement',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Financial Ratios
router.get('/financial-reporting/:companyId/ratios', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { period } = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }).parse(req.query);
        const ratios = await financialReportingService.getFinancialRatios(companyId, period);
        res.json({
            success: true,
            data: ratios,
            metadata: {
                period,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error generating financial ratios:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate financial ratios',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Combined Financial Statements
router.get('/financial-reporting/:companyId/statements', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { period, previousPeriod } = periodSchema.parse(req.query);
        const [balanceSheet, incomeStatement, cashFlow, ratios] = await Promise.all([
            financialReportingService.generateBalanceSheet(companyId, period, previousPeriod),
            financialReportingService.generateIncomeStatement(companyId, period, previousPeriod),
            financialReportingService.generateCashFlowStatement(companyId, period, previousPeriod),
            financialReportingService.getFinancialRatios(companyId, period)
        ]);
        res.json({
            success: true,
            data: {
                balanceSheet,
                incomeStatement,
                cashFlow,
                ratios
            },
            metadata: {
                period,
                previousPeriod,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Error generating combined financial statements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate financial statements',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Export financial statements to PDF/Excel (placeholder)
router.post('/financial-reporting/:companyId/export', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { format, statements, period, previousPeriod } = z.object({
            format: z.enum(['pdf', 'excel']),
            statements: z.array(z.enum(['balance-sheet', 'income-statement', 'cash-flow', 'ratios'])),
            period: z.string().regex(/^\d{4}-\d{2}$/),
            previousPeriod: z.string().regex(/^\d{4}-\d{2}$/).optional()
        }).parse(req.body);
        // TODO: Implement actual export functionality
        // This would integrate with libraries like puppeteer for PDF or exceljs for Excel
        res.json({
            success: true,
            message: `Export to ${format.toUpperCase()} initiated`,
            data: {
                format,
                statements,
                period,
                previousPeriod,
                downloadUrl: `/api/financial-reporting/${companyId}/download/export-${Date.now()}.${format}`
            }
        });
    }
    catch (error) {
        console.error('Error exporting financial statements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export financial statements',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
export default router;
