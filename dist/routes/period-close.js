import express from 'express';
import { authMiddleware, requireRoles } from '../auth';
import { asyncHandler } from '../errors';
import { periodCloseService } from '../services/period-close.service';
const router = express.Router();
router.get('/period-close/:companyId/periods', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const periods = await periodCloseService.listPeriods(companyId);
    res.json({ success: true, data: periods });
}));
router.post('/period-close/:companyId/:period/lock', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const userId = req.user?.sub || 'demo-user-1'; // Fallback to demo user
    const result = await periodCloseService.lockPeriod(companyId, period, userId);
    res.json({ success: true, data: result });
}));
router.post('/period-close/:companyId/:period/unlock', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const userId = req.user?.sub || 'demo-user-1'; // Fallback to demo user
    const result = await periodCloseService.unlockPeriod(companyId, period, userId);
    res.json({ success: true, data: result });
}));
router.post('/period-close/:companyId/:period/complete', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const userId = req.user?.sub || 'demo-user-1'; // Fallback to demo user
    const result = await periodCloseService.completeClose(companyId, period, userId);
    res.json({ success: true, data: result });
}));
// Prior-Period Adjustment: post an adjustment for a closed period into the next open period
router.post('/period-close/:companyId/:period/adjustments/prior-period', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const { amount, description, transactionType, currency } = req.body || {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
    }
    const out = await periodCloseService.postPriorPeriodAdjustment(req.tenantId, companyId, period, {
        amount: Number(amount),
        description,
        transactionType,
        currency
    });
    res.json(out);
}));
router.get('/period-close/:companyId/:period/checklist', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const items = await periodCloseService.getChecklist(companyId, period);
    res.json({ success: true, data: items });
}));
router.put('/period-close/:companyId/:period/checklist/:itemId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period, itemId } = req.params;
    const updated = await periodCloseService.updateChecklistItem(companyId, period, itemId, req.body || {});
    res.json({ success: true, data: updated });
}));
router.post('/period-close/:companyId/:period/run/recurring', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const result = await periodCloseService.runRecurringJournals(companyId, period);
    res.json({ success: true, data: result });
}));
router.post('/period-close/:companyId/:period/run/allocations', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const result = await periodCloseService.runAllocations(companyId, period);
    res.json({ success: true, data: result });
}));
router.post('/period-close/:companyId/:period/run/fx-reval', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const baseCurrency = (req.body && req.body.baseCurrency) || 'USD';
    const result = await periodCloseService.runFxRevaluation(companyId, period, baseCurrency);
    res.json({ success: true, data: result });
}));
router.get('/period-close/:companyId/:period/runs', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const type = String(req.query.type || '') || undefined;
    const items = await periodCloseService.listRuns(companyId, period, type);
    res.json({ success: true, data: items });
}));
// Additional routes needed by the frontend
router.get('/period-close/:companyId/:period/fx-preview', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const baseCurrency = req.query.baseCurrency || 'USD';
    const result = await periodCloseService.previewFxRevaluation(companyId, period, baseCurrency);
    res.json({ success: true, data: result });
}));
router.get('/period-close/:companyId/:period/fx-history', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const result = await periodCloseService.getFxRevaluationHistory(companyId, period);
    res.json({ success: true, data: result });
}));
router.post('/period-close/:companyId/:period/rollback', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const { runId } = req.body || {};
    const out = await periodCloseService.rollbackRun(companyId, period, runId);
    res.json({ success: true, data: out });
}));
router.post('/period-close/:companyId/:period/fx-reval/preview', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const baseCurrency = (req.body && req.body.baseCurrency) || 'USD';
    const result = await periodCloseService.previewFxRevaluation(companyId, period, baseCurrency);
    res.json({ success: true, data: result });
}));
router.post('/period-close/:companyId/:period/fx-reval/post', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const baseCurrency = (req.body && req.body.baseCurrency) || 'USD';
    const entries = req.body?.entries;
    const result = await periodCloseService.postFxRevaluation(companyId, period, baseCurrency, entries);
    res.json({ success: true, data: result });
}));
router.get('/period-close/:companyId/:period/fx-reval/history', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const result = await periodCloseService.getFxRevaluationHistory(companyId, period);
    res.json({ success: true, data: result });
}));
router.post('/period-close/:companyId/:period/fx-reval/post-journal', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, period } = req.params;
    const baseCurrency = (req.body && req.body.baseCurrency) || 'USD';
    const entries = req.body?.entries || [];
    const accounts = req.body?.accounts || {};
    const result = await periodCloseService.postFxRevaluationJournal(req.tenantId, companyId, period, baseCurrency, entries, accounts);
    res.json({ success: true, data: result });
}));
export default router;
