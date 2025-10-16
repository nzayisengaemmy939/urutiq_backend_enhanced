import express from 'express';
import { authMiddleware, requireRoles } from '../auth';
import { tenantMiddleware } from '../tenant';
import { asyncHandler } from '../errors';
import { revenueRecognitionService } from '../services/revenue-recognition.service';
const router = express.Router();
router.get('/revenue-recognition/:companyId/schedules', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const items = await revenueRecognitionService.listSchedules(req.tenantId, companyId);
    res.json({ items });
}));
router.post('/revenue-recognition/:companyId/schedules', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { name, contractId, amount, currency, method, startDate, endDate } = req.body || {};
    // Prevent overlapping schedules for same contract (if provided)
    const existing = await revenueRecognitionService.listSchedules(req.tenantId, companyId);
    const sStart = new Date(startDate);
    const sEnd = new Date(endDate);
    const overlaps = existing.some((s) => {
        if (contractId && s.contractId && s.contractId !== contractId)
            return false;
        const a = new Date(s.startDate), b = new Date(s.endDate);
        return Math.max(a.getTime(), sStart.getTime()) <= Math.min(b.getTime(), sEnd.getTime());
    });
    if (overlaps) {
        return res.status(409).json({ error: 'overlapping_schedule', message: 'An overlapping schedule exists for this contract.' });
    }
    const created = await revenueRecognitionService.createSchedule(req.tenantId, companyId, { name, contractId, amount, currency, method, startDate, endDate });
    res.status(201).json(created);
}));
router.post('/revenue-recognition/:companyId/run', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { periodStart, periodEnd } = req.body || {};
    const postings = revenueRecognitionService.runRecognition(req.tenantId, companyId, periodStart, periodEnd);
    res.json({ postings });
}));
router.post('/revenue-recognition/:companyId/post', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { periodStart, periodEnd, accounts, postings } = req.body || {};
    const result = await revenueRecognitionService.postRecognitionJournal(req.tenantId, companyId, periodStart, periodEnd, postings || [], accounts);
    res.json(result);
}));
router.post('/revenue-recognition/:companyId/schedules/:id/accruals', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    const { companyId, id } = req.params;
    const { periodStart, periodEnd } = req.body || {};
    const schedules = await revenueRecognitionService.listSchedules(req.tenantId, companyId);
    const schedule = schedules.find((s) => s.id === id);
    if (!schedule)
        return res.status(404).json({ error: 'not_found' });
    const postings = revenueRecognitionService.computeAccrualsForSchedule(schedule, periodStart, periodEnd);
    res.json({ postings, schedule });
}));
router.delete('/revenue-recognition/:companyId/schedules/:id', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    const { companyId, id } = req.params;
    const out = await revenueRecognitionService.deleteSchedule(req.tenantId, companyId, id);
    res.json(out);
}));
export default router;
