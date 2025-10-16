import { asyncHandler } from './errors';
import { prisma } from './prisma';
import { getQueueCounts } from './queue';
export function mountAdminRoutes(router) {
    router.get('/admin/queues', asyncHandler(async (req, res) => {
        const counts = await getQueueCounts();
        res.json(counts);
    }));
    // Company settings (simple key/value per company)
    router.get('/company-settings', asyncHandler(async (req, res) => {
        const companyId = String(req.query.companyId || '');
        if (!companyId)
            return res.status(400).json({ error: 'companyId_required' });
        const settings = await prisma.companySetting.findMany({ where: { tenantId: req.tenantId, companyId } });
        res.json({ items: settings });
    }));
    router.post('/company-settings', asyncHandler(async (req, res) => {
        const { companyId, key, value } = req.body;
        if (!companyId || !key)
            return res.status(400).json({ error: 'invalid_request' });
        const up = await prisma.companySetting.upsert({
            where: { tenantId_companyId_key: { tenantId: req.tenantId, companyId, key } },
            update: { value },
            create: { tenantId: req.tenantId, companyId, key, value }
        });
        res.status(201).json(up);
    }));
}
