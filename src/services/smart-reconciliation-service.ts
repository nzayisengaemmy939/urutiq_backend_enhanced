import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ReconciliationRule {
  id: string
  name: string
  description: string
  conditions: {
    field: string
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'amountRange' | 'dateRange'
    value: any
  }[]
  actions: {
    type: 'auto_reconcile' | 'suggest_match' | 'categorize' | 'tag'
    value: any
  }[]
  priority: number
  isActive: boolean
}

export interface ReconciliationMatch {
  bankTransactionId: string
  paymentId?: string
  invoiceId?: string
  billId?: string
  confidence: number
  reason: string
  ruleId?: string
}

export class SmartReconciliationService {
  
  // Pre-defined reconciliation rules
  private static readonly DEFAULT_RULES: Omit<ReconciliationRule, 'id'>[] = [
    {
      name: 'Exact Amount Match',
      description: 'Match transactions with exact amount and date within 1 day',
      conditions: [
        { field: 'amount', operator: 'equals', value: null }, // Will be set dynamically
        { field: 'date', operator: 'dateRange', value: 1 } // Within 1 day
      ],
      actions: [
        { type: 'suggest_match', value: 'payment' },
        { type: 'auto_reconcile', value: true }
      ],
      priority: 100,
      isActive: true
    },
    {
      name: 'Payment Reference Match',
      description: 'Match transactions with payment reference numbers',
      conditions: [
        { field: 'reference', operator: 'contains', value: 'PAY-' },
        { field: 'reference', operator: 'contains', value: 'INV-' },
        { field: 'reference', operator: 'contains', value: 'BILL-' }
      ],
      actions: [
        { type: 'suggest_match', value: 'payment' },
        { type: 'auto_reconcile', value: true }
      ],
      priority: 90,
      isActive: true
    },
    {
      name: 'Recurring Transactions',
      description: 'Match recurring transactions by amount and merchant',
      conditions: [
        { field: 'merchantName', operator: 'equals', value: null },
        { field: 'amount', operator: 'amountRange', value: { tolerance: 0.01 } }
      ],
      actions: [
        { type: 'suggest_match', value: 'recurring' },
        { type: 'categorize', value: 'recurring' }
      ],
      priority: 80,
      isActive: true
    },
    {
      name: 'Bank Fees',
      description: 'Auto-categorize bank fees and charges',
      conditions: [
        { field: 'description', operator: 'contains', value: 'fee' },
        { field: 'description', operator: 'contains', value: 'charge' },
        { field: 'description', operator: 'contains', value: 'service' }
      ],
      actions: [
        { type: 'categorize', value: 'Bank Fees' },
        { type: 'auto_reconcile', value: true }
      ],
      priority: 95,
      isActive: true
    },
    {
      name: 'Interest Income',
      description: 'Auto-categorize interest payments',
      conditions: [
        { field: 'description', operator: 'contains', value: 'interest' },
        { field: 'description', operator: 'contains', value: 'dividend' }
      ],
      actions: [
        { type: 'categorize', value: 'Interest Income' },
        { type: 'auto_reconcile', value: true }
      ],
      priority: 95,
      isActive: true
    }
  ]

  /**
   * Find potential matches for a bank transaction
   */
  static async findMatches(
    tenantId: string,
    companyId: string,
    bankTransactionId: string
  ): Promise<ReconciliationMatch[]> {
    
    const bankTransaction = await prisma.bankTransaction.findFirst({
      where: { id: bankTransactionId, tenantId }
    })

    if (!bankTransaction) {
      throw new Error('Bank transaction not found')
    }

    const matches: ReconciliationMatch[] = []

    // Rule 1: Exact amount match with payments
    const exactAmountMatches = await this.findExactAmountMatches(
      tenantId,
      companyId,
      bankTransaction
    )
    matches.push(...exactAmountMatches)

    // Rule 2: Reference number matches
    const referenceMatches = await this.findReferenceMatches(
      tenantId,
      companyId,
      bankTransaction
    )
    matches.push(...referenceMatches)

    // Rule 3: Recurring transaction matches
    const recurringMatches = await this.findRecurringMatches(
      tenantId,
      companyId,
      bankTransaction
    )
    matches.push(...recurringMatches)

    // Sort by confidence and remove duplicates
    return this.deduplicateMatches(matches)
  }

  /**
   * Find exact amount matches within date range
   */
  private static async findExactAmountMatches(
    tenantId: string,
    companyId: string,
    bankTransaction: any
  ): Promise<ReconciliationMatch[]> {
    
    const transactionDate = new Date(bankTransaction.transactionDate)
    const oneDayBefore = new Date(transactionDate.getTime() - 24 * 60 * 60 * 1000)
    const oneDayAfter = new Date(transactionDate.getTime() + 24 * 60 * 60 * 1000)

    // Find payments with exact amount
    const payments = await prisma.payment.findMany({
      where: {
        tenantId,
        companyId,
        amount: bankTransaction.amount,
        paymentDate: {
          gte: oneDayBefore,
          lte: oneDayAfter
        },
        bankTransactionId: null // Not already reconciled
      },
      include: {
        transaction: true
      }
    })

    return payments.map(payment => ({
      bankTransactionId: bankTransaction.id,
      paymentId: payment.id,
      confidence: 0.95,
      reason: `Exact amount match: $${Math.abs(Number(bankTransaction.amount))} on ${transactionDate.toLocaleDateString()}`,
      ruleId: 'exact_amount_match'
    }))
  }

  /**
   * Find reference number matches
   */
  private static async findReferenceMatches(
    tenantId: string,
    companyId: string,
    bankTransaction: any
  ): Promise<ReconciliationMatch[]> {
    
    if (!bankTransaction.reference) return []

    const matches: ReconciliationMatch[] = []

    // Check for payment references
    if (bankTransaction.reference.includes('PAY-') || bankTransaction.reference.includes('INV-')) {
      const payments = await prisma.payment.findMany({
        where: {
          tenantId,
          companyId,
          reference: bankTransaction.reference,
          bankTransactionId: null
        }
      })

      matches.push(...payments.map(payment => ({
        bankTransactionId: bankTransaction.id,
        paymentId: payment.id,
        confidence: 0.98,
        reason: `Reference match: ${bankTransaction.reference}`,
        ruleId: 'reference_match'
      })))
    }

    return matches
  }

  /**
   * Find recurring transaction matches
   */
  private static async findRecurringMatches(
    tenantId: string,
    companyId: string,
    bankTransaction: any
  ): Promise<ReconciliationMatch[]> {
    
    if (!bankTransaction.merchantName) return []

    // Find similar transactions in the last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    
    const similarTransactions = await prisma.bankTransaction.findMany({
      where: {
        tenantId,
        bankAccount: { companyId },
        merchantName: bankTransaction.merchantName,
        transactionDate: { gte: ninetyDaysAgo },
        id: { not: bankTransaction.id },
        status: 'reconciled'
      }
    })

    // Check for similar amounts (within $1 tolerance)
    const amountTolerance = 1.00
    const matchingTransactions = similarTransactions.filter(t => 
      Math.abs(Number(t.amount) - Number(bankTransaction.amount)) <= amountTolerance
    )

    if (matchingTransactions.length >= 2) {
      return [{
        bankTransactionId: bankTransaction.id,
        confidence: 0.85,
        reason: `Recurring transaction: ${bankTransaction.merchantName} (${matchingTransactions.length} similar transactions)`,
        ruleId: 'recurring_match'
      }]
    }

    return []
  }

  /**
   * Remove duplicate matches and sort by confidence
   */
  private static deduplicateMatches(matches: ReconciliationMatch[]): ReconciliationMatch[] {
    const seen = new Set<string>()
    const uniqueMatches = matches.filter(match => {
      const key = `${match.bankTransactionId}-${match.paymentId || 'none'}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return uniqueMatches.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Auto-reconcile transactions based on rules
   */
  static async autoReconcile(
    tenantId: string,
    companyId: string,
    bankTransactionId: string
  ): Promise<{ success: boolean; match?: ReconciliationMatch; error?: string }> {
    
    try {
      const matches = await this.findMatches(tenantId, companyId, bankTransactionId)
      
      if (matches.length === 0) {
        return { success: false, error: 'No matches found' }
      }

      const bestMatch = matches[0]
      
      if (bestMatch.confidence < 0.8) {
        return { success: false, error: 'Confidence too low for auto-reconciliation' }
      }

      // Perform the reconciliation
      if (bestMatch.paymentId) {
        await prisma.$transaction(async (tx) => {
          // Update bank transaction
          await tx.bankTransaction.update({
            where: { id: bankTransactionId },
            data: {
              status: 'reconciled',
              reconciledAt: new Date(),
              reconciledBy: 'system'
            }
          })

          // Update payment with bank transaction link
          await tx.payment.update({
            where: { id: bestMatch.paymentId },
            data: {
              bankTransactionId: bankTransactionId
            }
          })
        })
      } else {
        // Auto-categorize without payment match
        await prisma.bankTransaction.update({
          where: { id: bankTransactionId },
          data: {
            status: 'reconciled',
            reconciledAt: new Date(),
            reconciledBy: 'system'
          }
        })
      }

      return { success: true, match: bestMatch }
    } catch (error) {
      console.error('Error in auto-reconciliation:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Run auto-reconciliation for all unreconciled transactions
   */
  static async runAutoReconciliation(
    tenantId: string,
    companyId: string,
    bankAccountId?: string
  ): Promise<{
    processed: number
    reconciled: number
    failed: number
    results: Array<{ transactionId: string; success: boolean; match?: ReconciliationMatch; error?: string }>
  }> {
    
    const whereClause: any = {
      tenantId,
      bankAccount: { companyId },
      status: 'unreconciled'
    }

    if (bankAccountId) {
      whereClause.bankAccountId = bankAccountId
    }

    const unreconciledTransactions = await prisma.bankTransaction.findMany({
      where: whereClause,
      take: 50 // Process in batches
    })

    const results = []
    let reconciled = 0
    let failed = 0

    for (const transaction of unreconciledTransactions) {
      const result = await this.autoReconcile(tenantId, companyId, transaction.id)
      
      results.push({
        transactionId: transaction.id,
        success: result.success,
        match: result.match,
        error: result.error
      })

      if (result.success) {
        reconciled++
      } else {
        failed++
      }
    }

    return {
      processed: unreconciledTransactions.length,
      reconciled,
      failed,
      results
    }
  }

  /**
   * Get reconciliation statistics
   */
  static async getReconciliationStats(
    tenantId: string,
    companyId: string
  ): Promise<{
    totalTransactions: number
    reconciledTransactions: number
    unreconciledTransactions: number
    pendingTransactions: number
    autoReconciledCount: number
    reconciliationRate: number
  }> {
    
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        tenantId,
        bankAccount: { companyId }
      }
    })

    const totalTransactions = transactions.length
    const reconciledTransactions = transactions.filter(t => t.status === 'reconciled').length
    const unreconciledTransactions = transactions.filter(t => t.status === 'unreconciled').length
    const pendingTransactions = transactions.filter(t => t.status === 'pending').length
    const autoReconciledCount = transactions.filter(t => t.reconciledBy === 'system').length
    const reconciliationRate = totalTransactions > 0 ? (reconciledTransactions / totalTransactions) * 100 : 0

    return {
      totalTransactions,
      reconciledTransactions,
      unreconciledTransactions,
      pendingTransactions,
      autoReconciledCount,
      reconciliationRate
    }
  }
}
