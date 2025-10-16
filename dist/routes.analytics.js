import { authMiddleware, requireRoles } from './auth.js';
import { asyncHandler } from './errors.js';
export function mountAnalyticsRoutes(router) {
    // All analytics endpoints require authenticated accountant/admin
    router.use(authMiddleware(process.env.JWT_SECRET || 'dev-secret'));
    router.use(requireRoles(['admin', 'accountant', 'auditor']));
    // GET /api/analytics/kpis
    router.get('/kpis', asyncHandler(async (req, res) => {
        const period = String(req.query.period || 'last_12_months');
        const currency = String(req.query.currency || 'USD');
        // Placeholder KPI values; replace with real aggregates from your DB
        const totalSpend = 125000.25;
        const monthOverMonth = 0.083; // +8.3%
        const pendingApprovals = 7;
        // Import stats are returned by /api/import-shipments/stats; mirror key here if needed
        const importLandedCost = 48250.75;
        res.json({ totalSpend, monthOverMonth, pendingApprovals, importLandedCost, period, currency });
    }));
    // GET /api/analytics/spend-trend
    router.get('/spend-trend', asyncHandler(async (req, res) => {
        const period = String(req.query.period || 'last_12_months');
        // Create a simple synthetic 12-month trend
        const now = new Date();
        const points = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const total = 8000 + (i % 6) * 1200 + (i % 3) * 500;
            points.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, total });
        }
        res.json({ points, period });
    }));
    // GET /api/analytics/category-breakdown
    router.get('/category-breakdown', asyncHandler(async (req, res) => {
        const period = String(req.query.period || 'last_12_months');
        const items = [
            { name: 'COGS', value: 42000 },
            { name: 'Freight', value: 9600 },
            { name: 'Customs & Duties', value: 12800 },
            { name: 'Office', value: 5400 },
            { name: 'Misc', value: 3200 },
        ];
        res.json({ items, period });
    }));
    // GET /api/analytics/vendor-spend
    router.get('/vendor-spend', asyncHandler(async (req, res) => {
        const period = String(req.query.period || 'last_12_months');
        const currency = String(req.query.currency || 'USD');
        const items = [
            { name: 'Acme Imports', value: 26500 },
            { name: 'Global Logistics', value: 18400 },
            { name: 'BlueOcean Shipping', value: 15400 },
            { name: 'OfficeMax', value: 7200 },
            { name: 'Mega Supplies', value: 6100 },
        ];
        res.json({ items, period, currency });
    }));
    // GET /api/analytics/budget-vs-actual
    router.get('/budget-vs-actual', asyncHandler(async (req, res) => {
        const period = String(req.query.period || 'last_12_months');
        const currency = String(req.query.currency || 'USD');
        const items = [
            { name: 'COGS', budget: 40000, actual: 42250 },
            { name: 'Freight', budget: 10000, actual: 9600 },
            { name: 'Customs', budget: 12000, actual: 12800 },
            { name: 'Office', budget: 6000, actual: 5400 },
        ];
        res.json({ items, period, currency });
    }));
}
