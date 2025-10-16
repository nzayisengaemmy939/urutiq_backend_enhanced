import type { Router } from 'express';
import { prisma } from './prisma';
import { periodCloseService } from './services/period-close.service';
import { TenantRequest } from './tenant';
import { validateBody } from './validate';
import { z } from 'zod';

const transactionCreateSchema = z.object({
  transactionType: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  transactionDate: z.string(),
  status: z.string().default('pending'),
  companyId: z.string().optional(),
  linkedJournalEntryId: z.string().optional()
});

export function mountTransactionRoutes(router: Router) {
  router.get('/transactions', async (req: TenantRequest, res) => {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)));
    const type = (req.query.transactionType as string) || undefined;
    const status = (req.query.status as string) || undefined;
    const where: any = { tenantId: req.tenantId, transactionType: type, status };
    Object.keys(where).forEach((k) => where[k] === undefined && delete where[k]);
    const [total, rows] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({ where, orderBy: { transactionDate: 'desc' }, skip: (page - 1) * pageSize, take: pageSize })
    ]);
    res.json({ data: rows, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  });

  router.post('/transactions', validateBody(transactionCreateSchema), async (req: TenantRequest, res) => {
    const { transactionType, amount, currency, transactionDate, status, companyId, linkedJournalEntryId } = req.body as any;

    // Determine company id from body or header
    const resolvedCompanyId = companyId || (req.headers['x-company-id'] as string) || ''
    const period = new Date(transactionDate)
    const periodKey = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`

    // Check period status and block if locked/closed
    try {
      const statusNow = await periodCloseService.getStatus(resolvedCompanyId, periodKey)
      if (statusNow === 'locked' || statusNow === 'closed') {
        return res.status(400).json({
          error: {
            code: 'period_locked',
            message: `Cannot post transaction into ${periodKey} because period is ${statusNow}`,
            details: { period: periodKey, status: statusNow }
          }
        })
      }
    } catch (e: any) {
      // If status cannot be determined, proceed as open
    }

    const created = await prisma.transaction.create({
      data: { tenantId: req.tenantId!, transactionType, amount, currency, transactionDate: new Date(transactionDate), status, companyId: resolvedCompanyId, linkedJournalEntryId }
    });
    res.status(201).json(created);
  });

  // Admin-only override to post prior-period adjustment without unlocking
  router.post('/transactions/override', validateBody(transactionCreateSchema.extend({
    overrideClosedPeriod: z.boolean().optional(),
    justification: z.string().min(10, 'Provide justification for override')
  })), async (req: TenantRequest, res) => {
    const { transactionType, amount, currency, transactionDate, status, companyId, linkedJournalEntryId, overrideClosedPeriod, justification } = req.body as any;

    // Basic role gate: require admin/accountant via middleware in route mount (assumed present globally)
    const resolvedCompanyId = companyId || (req.headers['x-company-id'] as string) || ''
    const dt = new Date(transactionDate)
    const periodKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`

    // Only allow if explicitly flagged
    if (!overrideClosedPeriod) {
      return res.status(400).json({ error: { code: 'override_flag_missing', message: 'Set overrideClosedPeriod: true to use this endpoint' } })
    }

    // Record an adjustment run for audit
    try {
      await periodCloseService.recordRun(resolvedCompanyId, periodKey, 'adjustment', {
        adjustmentType: 'prior_period_override',
        transactionType,
        amount,
        currency,
        justification,
        postedBy: req.user?.sub || 'demo-user-1',
        at: new Date().toISOString(),
        status: 'posted'
      })
    } catch {}

    const created = await prisma.transaction.create({
      data: {
        tenantId: req.tenantId!,
        transactionType,
        amount,
        currency,
        transactionDate: dt,
        status,
        companyId: resolvedCompanyId,
        linkedJournalEntryId
      }
    })
    res.status(201).json({
      success: true,
      data: created,
      override: { period: periodKey, justification }
    })
  })
}

