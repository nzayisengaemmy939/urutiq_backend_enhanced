import express from 'express';
import { authMiddleware, requireRoles } from '../auth';
import { tenantMiddleware } from '../tenant';
import { asyncHandler } from '../errors';
import { fixedAssetsService } from '../services/fixed-assets.service';
const router = express.Router();
router.get('/fixed-assets/:companyId/categories', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    res.json({ items: await fixedAssetsService.listCategories(req.params.companyId) });
}));
router.post('/fixed-assets/:companyId/categories', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    const { name, usefulLifeMonths, method, salvageRate, accounts } = req.body || {};
    const cat = await fixedAssetsService.upsertCategory({ id: req.body?.id || `cat_${Date.now()}`, tenantId: req.tenantId, companyId: req.params.companyId, name, usefulLifeMonths, method, salvageRate, accounts });
    res.status(201).json(cat);
}));
router.get('/fixed-assets/:companyId/assets', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    res.json({ items: await fixedAssetsService.listAssets(req.params.companyId) });
}));
router.post('/fixed-assets/:companyId/assets', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    const id = req.body?.id || `asset_${Date.now()}`;
    const asset = await fixedAssetsService.upsertAsset({ id, tenantId: req.tenantId, companyId: req.params.companyId, name: req.body.name, categoryId: req.body.categoryId, cost: req.body.cost, currency: req.body.currency || 'USD', acquisitionDate: req.body.acquisitionDate, startDepreciation: req.body.startDepreciation || req.body.acquisitionDate, salvageValue: req.body.salvageValue, notes: req.body.notes });
    res.status(201).json(asset);
}));
router.delete('/fixed-assets/:companyId/assets/:id', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    res.json(await fixedAssetsService.deleteAsset(req.params.id));
}));
router.get('/fixed-assets/:companyId/depreciation/preview', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    const asOf = String(req.query.asOf || new Date().toISOString().slice(0, 10));
    const out = await fixedAssetsService.previewCompanyDepreciation(req.params.companyId, asOf);
    res.json(out);
}));
router.post('/fixed-assets/:companyId/depreciation/post', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    const asOf = String(req.body?.asOf || new Date().toISOString().slice(0, 10));
    const out = await fixedAssetsService.postCompanyDepreciationJournal(req.tenantId, req.params.companyId, asOf);
    res.json(out);
}));
router.post('/fixed-assets/:companyId/assets/:id/dispose', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware(), requireRoles(['accountant', 'admin']), asyncHandler(async (req, res) => {
    const { id, companyId } = { id: req.params.id, companyId: req.params.companyId };
    const { date, proceeds, proceedsAccountId } = req.body || {};
    const out = await fixedAssetsService.disposeAssetJournal(req.tenantId, companyId, id, String(date || new Date().toISOString().slice(0, 10)), Number(proceeds || 0), proceedsAccountId);
    res.json(out);
}));
export default router;
