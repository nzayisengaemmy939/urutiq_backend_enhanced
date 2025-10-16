import { Router } from 'express';
import { dataConsistencyService } from './services/data-consistency.service';
import { validateRequest, commonSchemas } from './middleware/validation.middleware';
import { z } from 'zod';
const router = Router();
// Schema for validation check parameters
const validationCheckSchema = z.object({
    checks: z.array(z.string()).optional(),
    fixIssues: z.boolean().default(false)
});
// GET /api/validation/health - Overall system health check
router.get('/health', async (req, res) => {
    try {
        const { overall, checks } = await dataConsistencyService.runAllChecks();
        res.json({
            success: true,
            data: {
                overall,
                checks: checks.map(check => ({
                    name: check.name,
                    isValid: check.result.isValid,
                    errorCount: check.result.errors.length,
                    warningCount: check.result.warnings.length,
                    suggestionCount: check.result.suggestions.length
                })),
                summary: {
                    totalChecks: checks.length,
                    passedChecks: checks.filter(c => c.result.isValid).length,
                    failedChecks: checks.filter(c => !c.result.isValid).length,
                    totalErrors: checks.reduce((sum, c) => sum + c.result.errors.length, 0),
                    totalWarnings: checks.reduce((sum, c) => sum + c.result.warnings.length, 0)
                }
            }
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            success: false,
            error: 'HEALTH_CHECK_FAILED',
            message: 'Failed to perform health check'
        });
    }
});
// GET /api/validation/checks - Get detailed validation results
router.get('/checks', validateRequest({
    query: commonSchemas.pagination
}), async (req, res) => {
    try {
        const { overall, checks } = await dataConsistencyService.runAllChecks();
        res.json({
            success: true,
            data: {
                overall,
                checks
            }
        });
    }
    catch (error) {
        console.error('Validation checks error:', error);
        res.status(500).json({
            success: false,
            error: 'VALIDATION_CHECKS_FAILED',
            message: 'Failed to perform validation checks'
        });
    }
});
// POST /api/validation/check - Run specific validation checks
router.post('/check', validateRequest({
    body: validationCheckSchema
}), async (req, res) => {
    try {
        const { checks: requestedChecks, fixIssues } = req.body;
        let results;
        if (requestedChecks && requestedChecks.length > 0) {
            // Run specific checks
            const allChecks = await dataConsistencyService.runAllChecks();
            results = {
                overall: allChecks.overall,
                checks: allChecks.checks.filter(check => requestedChecks.includes(check.name.toLowerCase().replace(/\s+/g, '_')))
            };
        }
        else {
            // Run all checks
            results = await dataConsistencyService.runAllChecks();
        }
        // Fix issues if requested
        if (fixIssues) {
            const fixResults = await dataConsistencyService.fixCommonIssues();
            results.fixResults = fixResults;
        }
        res.json({
            success: true,
            data: results
        });
    }
    catch (error) {
        console.error('Validation check error:', error);
        res.status(500).json({
            success: false,
            error: 'VALIDATION_CHECK_FAILED',
            message: 'Failed to perform validation check'
        });
    }
});
// GET /api/validation/account-types - Check account type consistency
router.get('/account-types', async (req, res) => {
    try {
        const result = await dataConsistencyService.validateAccountTypes();
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Account types validation error:', error);
        res.status(500).json({
            success: false,
            error: 'ACCOUNT_TYPES_VALIDATION_FAILED',
            message: 'Failed to validate account types'
        });
    }
});
// GET /api/validation/product-categories - Check product category consistency
router.get('/product-categories', async (req, res) => {
    try {
        const result = await dataConsistencyService.validateProductCategories();
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Product categories validation error:', error);
        res.status(500).json({
            success: false,
            error: 'PRODUCT_CATEGORIES_VALIDATION_FAILED',
            message: 'Failed to validate product categories'
        });
    }
});
// GET /api/validation/stock-consistency - Check stock consistency
router.get('/stock-consistency', async (req, res) => {
    try {
        const result = await dataConsistencyService.validateStockConsistency();
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Stock consistency validation error:', error);
        res.status(500).json({
            success: false,
            error: 'STOCK_CONSISTENCY_VALIDATION_FAILED',
            message: 'Failed to validate stock consistency'
        });
    }
});
// GET /api/validation/journal-balance - Check journal entry balance
router.get('/journal-balance', async (req, res) => {
    try {
        const result = await dataConsistencyService.validateJournalEntryBalance();
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Journal balance validation error:', error);
        res.status(500).json({
            success: false,
            error: 'JOURNAL_BALANCE_VALIDATION_FAILED',
            message: 'Failed to validate journal entry balance'
        });
    }
});
// GET /api/validation/expense-journal-integration - Check expense journal integration
router.get('/expense-journal-integration', async (req, res) => {
    try {
        const result = await dataConsistencyService.validateExpenseJournalIntegration();
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Expense journal integration validation error:', error);
        res.status(500).json({
            success: false,
            error: 'EXPENSE_JOURNAL_INTEGRATION_VALIDATION_FAILED',
            message: 'Failed to validate expense journal integration'
        });
    }
});
// GET /api/validation/orphaned-records - Check for orphaned records
router.get('/orphaned-records', async (req, res) => {
    try {
        const result = await dataConsistencyService.validateOrphanedRecords();
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Orphaned records validation error:', error);
        res.status(500).json({
            success: false,
            error: 'ORPHANED_RECORDS_VALIDATION_FAILED',
            message: 'Failed to validate orphaned records'
        });
    }
});
// POST /api/validation/fix-issues - Fix common data issues
router.post('/fix-issues', async (req, res) => {
    try {
        const result = await dataConsistencyService.fixCommonIssues();
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Fix issues error:', error);
        res.status(500).json({
            success: false,
            error: 'FIX_ISSUES_FAILED',
            message: 'Failed to fix common issues'
        });
    }
});
// GET /api/validation/status - Get validation status summary
router.get('/status', async (req, res) => {
    try {
        const { overall, checks } = await dataConsistencyService.runAllChecks();
        const status = {
            overall: overall.isValid ? 'HEALTHY' : 'ISSUES_FOUND',
            checks: checks.map(check => ({
                name: check.name,
                status: check.result.isValid ? 'PASS' : 'FAIL',
                errorCount: check.result.errors.length,
                warningCount: check.result.warnings.length
            })),
            summary: {
                totalChecks: checks.length,
                passedChecks: checks.filter(c => c.result.isValid).length,
                failedChecks: checks.filter(c => !c.result.isValid).length,
                totalErrors: checks.reduce((sum, c) => sum + c.result.errors.length, 0),
                totalWarnings: checks.reduce((sum, c) => sum + c.result.warnings.length, 0)
            }
        };
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        console.error('Validation status error:', error);
        res.status(500).json({
            success: false,
            error: 'VALIDATION_STATUS_FAILED',
            message: 'Failed to get validation status'
        });
    }
});
export default router;
