import express from 'express';
import { authMiddleware, requireRoles } from '../auth.js';
import { asyncHandler } from '../errors.js';
import { threeWayMatchService } from '../services/three-way-match.service.js';
const router = express.Router();
router.post('/three-way-match/:poId/receive', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { poId } = req.params;
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
    const userId = req.user?.sub || 'demo-user-1';
    const grn = await threeWayMatchService.receiveGoods(poId, lines, userId);
    res.status(201).json({ success: true, data: grn });
}));
router.post('/three-way-match/:poId/match/:billId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { poId, billId } = req.params;
    const result = await threeWayMatchService.matchBill(poId, billId);
    res.json({ success: true, data: result });
}));
// Approvals matrix and audit
router.get('/three-way-match/:companyId/approvals', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const items = await threeWayMatchService.getApprovalsMatrix(req.params.companyId);
    res.json(items);
}));
router.post('/three-way-match/:companyId/approvals', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin']), asyncHandler(async (req, res) => {
    const out = await threeWayMatchService.setApprovalsMatrix(req.params.companyId, req.body || {});
    res.json(out);
}));
router.post('/three-way-match/:poId/approve', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const userId = req.user?.sub || 'demo-user-1';
    const out = await threeWayMatchService.approveException(req.params.poId, userId, String(req.body?.reason || ''));
    res.json(out);
}));
router.post('/three-way-match/:poId/reject', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const userId = req.user?.sub || 'demo-user-1';
    const out = await threeWayMatchService.rejectException(req.params.poId, userId, String(req.body?.reason || ''));
    res.json(out);
}));
export default router;
