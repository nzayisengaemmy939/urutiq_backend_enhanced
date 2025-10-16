import type { Router, Request, Response } from 'express'
import { asyncHandler } from './errors'
import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

export function mountReconciliationRoutes(router: Router) {
  // List rules
  router.get('/reconciliation/rules', asyncHandler(async (req: Request, res: Response) => {
    const companyId = String(req.query?.companyId || req.header('x-company-id') || '')
    const rules = await prisma.bankReconciliationRule.findMany({
      where: { ...(companyId ? { companyId } : {}) },
      orderBy: [{ isActive: 'desc' }, { priority: 'desc' }]
    })
    res.json(Array.isArray(rules) ? rules : [])
  }))

  // Create rule
  router.post('/reconciliation/rules', asyncHandler(async (req: Request, res: Response) => {
    const data = req.body || {}
    const rule = await prisma.bankReconciliationRule.create({
      data: {
        companyId: String(data.companyId || req.header('x-company-id') || ''),
        name: String(data.name || 'Rule'),
        description: data.description ? String(data.description) : null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        priority: Number(data.priority ?? 0),
        conditions: String(data.conditions || '{}'),
        actions: String(data.actions || '{}'),
        createdBy: String(data.createdBy || 'system')
      }
    })
    res.status(201).json(rule)
  }))

  // Update rule
  router.put('/reconciliation/rules/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id)
    const data = req.body || {}
    const rule = await prisma.bankReconciliationRule.update({
      where: { id },
      data: {
        name: data.name !== undefined ? String(data.name) : undefined,
        description: data.description !== undefined ? String(data.description) : undefined,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
        priority: data.priority !== undefined ? Number(data.priority) : undefined,
        conditions: data.conditions !== undefined ? String(data.conditions) : undefined,
        actions: data.actions !== undefined ? String(data.actions) : undefined,
      }
    })
    res.json(rule)
  }))

  // Delete rule
  router.delete('/reconciliation/rules/:id', asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id)
    await prisma.bankReconciliationRule.delete({ where: { id } })
    res.json({ ok: true })
  }))

  // Reconciliation status (aggregated)
  router.get('/reconciliation/status', asyncHandler(async (req: Request, res: Response) => {
    const companyId = String(req.query?.companyId || '')
    const bankAccountId = String(req.query?.bankAccountId || '')
    const startDate = req.query?.startDate ? new Date(String(req.query.startDate)) : undefined
    const endDate = req.query?.endDate ? new Date(String(req.query.endDate)) : undefined

    const whereBase: Prisma.BankTransactionWhereInput = {}
    if (bankAccountId) whereBase.bankAccountId = bankAccountId
    // Apply date range if present; try both transactionDate and date fields
    if (startDate || endDate) {
      whereBase.transactionDate = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      } as any
    }

    // If companyId provided, constrain through bankAccount relation when available
    if (companyId) {
      whereBase.bankAccount = { ...(whereBase.bankAccount as any), companyId }
    }

    const [total, matched] = await Promise.all([
      prisma.bankTransaction.count({ where: whereBase }),
      prisma.bankTransaction.count({
        where: {
          ...whereBase,
          OR: [
            { isReconciled: true as any },
            { status: 'reconciled' as any },
            { reconciledAt: { not: null } as any },
          ],
        },
      }),
    ])

    res.json({
      matchedCount: matched,
      unmatchedBankCount: Math.max(0, total - matched),
      unmatchedLedgerCount: 0,
      total,
    })
  }))

  // Match a bank transaction to a ledger transaction (minimal update)
  router.post('/reconciliation/match', asyncHandler(async (req: Request, res: Response) => {
    const { bankTxnId } = (req.body || {})
    if (!bankTxnId) {
      return res.status(400).json({ error: 'bankTxnId_required' })
    }
    const updated = await prisma.bankTransaction.update({
      where: { id: String(bankTxnId) },
      data: { isReconciled: true as any, reconciledAt: new Date() as any },
    })
    res.json({ success: true, bankTransaction: { id: updated.id, isReconciled: (updated as any).isReconciled, reconciledAt: (updated as any).reconciledAt } })
  }))

  // Unmatch a bank transaction (minimal update)
  router.post('/reconciliation/unmatch', asyncHandler(async (req: Request, res: Response) => {
    const { matchId, bankTxnId } = (req.body || {})
    const id = String(bankTxnId || matchId || '')
    if (!id) {
      return res.status(400).json({ error: 'bankTxnId_required' })
    }
    const updated = await prisma.bankTransaction.update({
      where: { id },
      data: { isReconciled: false as any, reconciledAt: null as any },
    })
    res.json({ success: true, bankTransaction: { id: updated.id, isReconciled: (updated as any).isReconciled, reconciledAt: (updated as any).reconciledAt } })
  }))
}


