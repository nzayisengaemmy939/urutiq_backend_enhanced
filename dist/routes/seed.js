import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { seedBudgetManagementData } from '../seed/budget-management-seed.js';
const router = express.Router();
// Seed budget management data
router.post('/budget-management/:companyId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const result = await seedBudgetManagementData(companyId);
        res.json({
            success: true,
            message: 'Budget management data seeded successfully',
            data: {
                dimensions: result.dimensions.length,
                scenarios: result.scenarios.length,
                periods: result.periods.length,
                accounts: result.accounts.length,
                budgets: result.budgets.length,
                lineItems: result.lineItems.length,
                forecasts: result.forecasts.length
            }
        });
    }
    catch (error) {
        console.error('Error seeding budget management data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to seed budget management data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
export default router;
