import { asyncHandler } from './errors.js';
import { prisma } from './prisma.js';
export function mountCardRoutes(router) {
    // Bulk import card transactions
    router.post('/card-transactions/import', asyncHandler(async (req, res) => {
        const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
        const companyId = String(req.header('x-company-id') || req.body?.companyId || 'seed-company-1');
        const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
        let created = 0;
        for (const r of rows) {
            const dateStr = String(r.date || '').slice(0, 10);
            const amt = Number(r.amount || 0);
            // Try to auto-match to an existing expense with same date and amount
            const expense = await prisma.expense.findFirst({
                where: {
                    companyId,
                    expenseDate: new Date(dateStr || new Date().toISOString().slice(0, 10)),
                    totalAmount: amt
                },
                select: { id: true }
            });
            const tx = await prisma.cardTransaction.create({
                data: {
                    tenantId,
                    companyId,
                    date: new Date(dateStr || new Date().toISOString().slice(0, 10)),
                    amount: amt,
                    description: String(r.description || ''),
                    merchant: r.merchant,
                    source: r.source,
                    status: expense ? 'matched' : 'unmatched',
                    matchedExpenseId: expense?.id
                }
            });
            if (!expense) {
                const isPolicyViolation = Number(tx.amount) > 1000;
                await prisma.cardException.create({
                    data: { tenantId, companyId, transactionId: tx.id, reason: isPolicyViolation ? 'policy_violation' : 'unmatched' }
                });
            }
            created++;
        }
        res.json({ ok: true, created });
    }));
    // List exceptions
    router.get('/card-exceptions', asyncHandler(async (req, res) => {
        const tenantId = String(req.header('x-tenant-id') || 'tenant_demo');
        const companyId = String(req.header('x-company-id') || '');
        const reason = String(req.query?.reason || '');
        const exceptions = await prisma.cardException.findMany({
            where: {
                tenantId,
                ...(companyId ? { companyId } : {}),
                ...(reason ? { reason } : {})
            },
            include: { transaction: true },
            orderBy: { createdAt: 'desc' }
        });
        const data = exceptions.map(ex => ({
            id: ex.id,
            transactionId: ex.transactionId,
            companyId: ex.companyId,
            date: ex.transaction?.date?.toISOString()?.slice(0, 10),
            description: ex.transaction?.description,
            amount: ex.transaction?.amount,
            reason: ex.reason
        }));
        res.json({ exceptions: data });
    }));
    // Resolve by creating expense (mock)
    router.post('/card-exceptions/:id/resolve-create', asyncHandler(async (req, res) => {
        const id = String(req.params.id);
        const receiptDataUrl = req.body?.receiptDataUrl;
        const ex = await prisma.cardException.findUnique({ where: { id }, include: { transaction: true } });
        if (!ex)
            return res.status(404).json({ error: 'not_found' });
        const tx = await prisma.cardTransaction.update({ where: { id: ex.transactionId }, data: { status: 'matched', matchedExpenseId: 'expense_' + ex.transactionId } });
        await prisma.cardException.delete({ where: { id } });
        res.json({ ok: true, expenseId: tx.matchedExpenseId, receiptAttached: !!receiptDataUrl });
    }));
    // Resolve by match to an existing expense
    router.post('/card-exceptions/:id/resolve-match', asyncHandler(async (req, res) => {
        const id = String(req.params.id);
        const expenseId = String(req.body?.expenseId || '');
        const ex = await prisma.cardException.findUnique({ where: { id } });
        if (!ex)
            return res.status(404).json({ error: 'not_found' });
        await prisma.cardTransaction.update({ where: { id: ex.transactionId }, data: { status: 'matched', matchedExpenseId: expenseId } });
        await prisma.cardException.delete({ where: { id } });
        res.json({ ok: true });
    }));
    // Dismiss
    router.delete('/card-exceptions/:id', asyncHandler(async (req, res) => {
        const id = String(req.params.id);
        try {
            await prisma.cardException.delete({ where: { id } });
            res.json({ ok: true });
        }
        catch {
            res.status(404).json({ error: 'not_found' });
        }
    }));
}
