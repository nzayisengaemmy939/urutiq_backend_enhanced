import express from 'express';
import { authMiddleware, requireRoles } from '../auth.js';
import type { TenantRequest } from '../tenant.js';
import { asyncHandler } from '../errors.js';
import { bankRulesService } from '../services/bank-rules.service.js';
import { prisma } from '../prisma.js';

const router = express.Router();

router.get('/bank-rules/:companyId',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId } = req.params;
    const rules = await bankRulesService.listRules(companyId);
    res.json({ success: true, data: rules });
  })
);

router.put('/bank-rules/:companyId/:id',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId, id } = req.params;
    const rule = await bankRulesService.upsertRule({ ...req.body, id, companyId });
    res.json({ success: true, data: rule });
  })
);

router.post('/bank-rules/:companyId',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId } = req.params;
    const rule = await bankRulesService.upsertRule({ ...req.body, id: req.body.id || `rule_${Date.now()}`, companyId });
    res.json({ success: true, data: rule });
  })
);

router.post('/bank-rules/:companyId/seed',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId } = req.params;
    const seeds = bankRulesService.getSeedRules(companyId);
    for (const r of seeds) { try { await bankRulesService.upsertRule(r as any); } catch {} }
    res.json({ success: true, data: seeds });
  })
);

router.delete('/bank-rules/:companyId/:id',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { id } = req.params;
    const result = await bankRulesService.deleteRule(id);
    res.json({ success: true, data: result });
  })
);

router.post('/bank-rules/:companyId/evaluate',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId } = req.params;
    const transactions = Array.isArray(req.body?.transactions) ? req.body.transactions : [];
    const result = await bankRulesService.runRules(companyId, transactions);
    res.json({ success: true, data: result });
  })
);

router.post('/bank-rules/:companyId/transfers/confirm',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId } = req.params;
    const pairs = Array.isArray(req.body?.pairs) ? req.body.pairs : [];
    const created: any[] = [];
    for (const p of pairs) {
      const amount = Math.abs(Number(p.amount || 0));
      if (!amount || !p.fromAccountId || !p.toAccountId) continue;
      const date = p.date ? new Date(p.date) : new Date();
      const memo = p.memo || 'Matched bank transfer';
      const entry = await prisma.$transaction(async (tx) => {
        const je = await tx.journalEntry.create({ data: { tenantId: req.tenantId!, companyId, date, memo, reference: 'BANK-XFER' } });
        await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: je.id, accountId: p.toAccountId, debit: amount, credit: 0, memo } });
        await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: je.id, accountId: p.fromAccountId, debit: 0, credit: amount, memo } });
        return je;
      });
      created.push(entry);
    }
    res.json({ success: true, createdCount: created.length, entries: created });
  })
);

export default router;


