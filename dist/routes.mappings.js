import { prisma } from './prisma.js';
import { mappingSchemas, validateBody } from './validate.js';
export function mountMappingRoutes(router) {
    router.get('/account-mappings', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const rows = await prisma.accountMapping.findMany({ where: { tenantId: req.tenantId, companyId } });
        res.json(rows);
    });
    router.post('/account-mappings', validateBody(mappingSchemas.mappingUpsert), async (req, res) => {
        const { companyId, purpose, accountId } = req.body;
        const up = await prisma.accountMapping.upsert({
            where: { tenantId_companyId_purpose: { tenantId: req.tenantId, companyId, purpose } },
            update: { accountId },
            create: { tenantId: req.tenantId, companyId, purpose, accountId }
        });
        res.status(201).json(up);
    });
    // Checklist of required purposes and which are missing
    router.get('/account-mappings/checklist', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const required = ['AR', 'AP', 'CASH', 'INVENTORY', 'REVENUE', 'COGS', 'FX_GAIN', 'FX_LOSS'];
        const rows = await prisma.accountMapping.findMany({ where: { tenantId: req.tenantId, companyId } });
        const present = rows.map(r => r.purpose);
        const missing = required.filter(p => !present.includes(p));
        res.json({ companyId, required, present, missing });
    });
}
