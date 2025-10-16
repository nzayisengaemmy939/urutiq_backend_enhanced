import { prisma } from './prisma.js'
import { TenantRequest } from './tenant.js'
import { enqueueAiJob } from './queue.js'

export interface InvoiceOCRResult {
  vendorName: string
  invoiceNumber: string
  date: Date
  totalAmount: number
  currency: string
  lineItems: Array<{
    description: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
  taxAmount: number
  confidence: number
  rawData: any
}

export interface ExpenseMatchingResult {
  matchedExpenses: Array<{
    expenseId: string
    matchConfidence: number
    suggestedAllocation: number
    reason: string
  }>
  unmatchedExpenses: Array<{
    expenseId: string
    reason: string
    suggestedAction: string
  }>
}

export class InvoiceOCRService {
  /**
   * Process uploaded invoice image/document
   */
  static async processInvoiceDocument(
    tenantId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<InvoiceOCRResult> {
    try {
      // Queue AI job for document processing
      const jobId = await enqueueAiJob({
        type: 'process_invoice_document',
        data: {
          tenantId,
          fileBuffer: fileBuffer.toString('base64'),
          fileName,
          mimeType,
          timestamp: new Date().toISOString()
        }
      })

      // For now, simulate AI processing
      // In production, this would call OpenAI Vision API or similar
      const result = await this.simulateInvoiceProcessing(fileBuffer, fileName)

      // Store the processing result
      await prisma.documentProcessingResult.create({
        data: {
          tenantId,
          jobId,
          documentType: 'invoice',
          fileName,
          mimeType,
          result: JSON.stringify(result),
          confidence: result.confidence,
          status: 'completed',
          processedAt: new Date()
        }
      })

      return result
    } catch (error) {
      console.error('Error processing invoice document:', error)
      throw error
    }
  }

  /**
   * Create invoice from OCR result
   */
  static async createInvoiceFromOCR(
    tenantId: string,
    companyId: string,
    customerId: string,
    ocrResult: InvoiceOCRResult,
    additionalData?: {
      dueDate?: Date
      notes?: string
      terms?: string
    }
  ): Promise<any> {
    try {
      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(tenantId)

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          tenantId,
          companyId,
          customerId,
          invoiceNumber,
          issueDate: ocrResult.date.toISOString(),
          dueDate: additionalData?.dueDate?.toISOString() || this.calculateDueDate(ocrResult.date),
          status: 'draft',
          subtotal: ocrResult.totalAmount - ocrResult.taxAmount,
          taxTotal: ocrResult.taxAmount,
          totalAmount: ocrResult.totalAmount,
          balanceDue: ocrResult.totalAmount,
          currency: ocrResult.currency,
          notes: additionalData?.notes || `Generated from OCR processing of ${ocrResult.vendorName} invoice`,
          terms: additionalData?.terms || 'Payment due within 30 days',
          metadata: {
            ocrConfidence: ocrResult.confidence,
            sourceDocument: 'ocr_processed',
            vendorName: ocrResult.vendorName
          }
        }
      })

      // Create invoice lines
      for (const lineItem of ocrResult.lineItems) {
        await prisma.invoiceLine.create({
          data: {
            tenantId,
            invoiceId: invoice.id,
            description: lineItem.description,
            quantity: lineItem.quantity,
            unitPrice: lineItem.unitPrice,
            lineTotal: lineItem.lineTotal,
            taxRate: ocrResult.taxAmount > 0 ? (ocrResult.taxAmount / (ocrResult.totalAmount - ocrResult.taxAmount)) * 100 : 0
          }
        })
      }

      // Log activity
      await prisma.invoiceActivity.create({
        data: {
          tenantId,
          invoiceId: invoice.id,
          activityType: 'invoice_created_from_ocr',
          description: `Invoice created from OCR processing of ${ocrResult.vendorName} document`,
          metadata: { 
            ocrConfidence: ocrResult.confidence,
            vendorName: ocrResult.vendorName,
            originalDocument: fileName
          }
        }
      })

      return invoice
    } catch (error) {
      console.error('Error creating invoice from OCR:', error)
      throw error
    }
  }

  /**
   * Match expenses to invoice
   */
  static async matchExpensesToInvoice(
    tenantId: string,
    invoiceId: string
  ): Promise<ExpenseMatchingResult> {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { customer: true, company: true }
      })

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // Get recent expenses for the same customer/company
      const expenses = await prisma.expense.findMany({
        where: {
          tenantId,
          customerId: invoice.customerId,
          status: 'pending' // Only match unmatched expenses
        },
        include: {
          category: true,
          vendor: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to recent expenses
      })

      const matchedExpenses: ExpenseMatchingResult['matchedExpenses'] = []
      const unmatchedExpenses: ExpenseMatchingResult['unmatchedExpenses'] = []

      for (const expense of expenses) {
        const matchResult = await this.calculateExpenseMatch(invoice, expense)
        
        if (matchResult.confidence > 0.7) {
          matchedExpenses.push({
            expenseId: expense.id,
            matchConfidence: matchResult.confidence,
            suggestedAllocation: matchResult.suggestedAllocation,
            reason: matchResult.reason
          })
        } else {
          unmatchedExpenses.push({
            expenseId: expense.id,
            reason: matchResult.reason,
            suggestedAction: matchResult.suggestedAction
          })
        }
      }

      return { matchedExpenses, unmatchedExpenses }
    } catch (error) {
      console.error('Error matching expenses to invoice:', error)
      throw error
    }
  }

  /**
   * Apply expense matches to invoice
   */
  static async applyExpenseMatches(
    tenantId: string,
    invoiceId: string,
    matches: Array<{
      expenseId: string
      allocation: number
    }>
  ): Promise<void> {
    try {
      for (const match of matches) {
        // Update expense to link to invoice
        await prisma.expense.update({
          where: { id: match.expenseId },
          data: {
            invoiceId,
            status: 'matched',
            allocatedAmount: match.allocation
          }
        })

        // Create expense line item on invoice
        const expense = await prisma.expense.findFirst({
          where: { id: match.expenseId }
        })

        if (expense) {
          await prisma.invoiceLine.create({
            data: {
              tenantId,
              invoiceId,
              description: `Expense: ${expense.description}`,
              quantity: 1,
              unitPrice: match.allocation,
              lineTotal: match.allocation,
              taxRate: 0,
              expenseId: match.expenseId
            }
          })
        }
      }

      // Recalculate invoice totals
      await this.recalculateInvoiceTotals(invoiceId)
    } catch (error) {
      console.error('Error applying expense matches:', error)
      throw error
    }
  }

  /**
   * Simulate AI invoice processing (replace with real AI)
   */
  private static async simulateInvoiceProcessing(
    fileBuffer: Buffer,
    fileName: string
  ): Promise<InvoiceOCRResult> {
    // This is a simulation - in production, use OpenAI Vision API or similar
    const mockData = {
      vendorName: 'Sample Vendor Inc.',
      invoiceNumber: `INV-${Date.now()}`,
      date: new Date(),
      totalAmount: 1250.00,
      currency: 'USD',
      lineItems: [
        {
          description: 'Professional Services',
          quantity: 10,
          unitPrice: 100.00,
          lineTotal: 1000.00
        },
        {
          description: 'Software License',
          quantity: 1,
          unitPrice: 200.00,
          lineTotal: 200.00
        }
      ],
      taxAmount: 50.00,
      confidence: 0.85,
      rawData: { fileName, processedAt: new Date().toISOString() }
    }

    return mockData
  }

  /**
   * Calculate expense match confidence
   */
  private static async calculateExpenseMatch(invoice: any, expense: any): Promise<{
    confidence: number
    suggestedAllocation: number
    reason: string
    suggestedAction: string
  }> {
    let confidence = 0
    let reason = ''
    let suggestedAction = ''

    // Check date proximity (within 30 days)
    const dateDiff = Math.abs(new Date(invoice.issueDate).getTime() - new Date(expense.createdAt).getTime())
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24)
    
    if (daysDiff <= 30) {
      confidence += 0.3
      reason += 'Date proximity match. '
    }

    // Check amount similarity (within 20%)
    const amountDiff = Math.abs(invoice.totalAmount - expense.amount) / invoice.totalAmount
    if (amountDiff <= 0.2) {
      confidence += 0.4
      reason += 'Amount similarity match. '
    }

    // Check vendor/customer match
    if (expense.vendor?.name && invoice.customer?.name) {
      const vendorMatch = expense.vendor.name.toLowerCase().includes(invoice.customer.name.toLowerCase()) ||
                         invoice.customer.name.toLowerCase().includes(expense.vendor.name.toLowerCase())
      if (vendorMatch) {
        confidence += 0.3
        reason += 'Vendor/customer name match. '
      }
    }

    if (confidence > 0.7) {
      suggestedAction = 'Match this expense to the invoice'
    } else if (confidence > 0.4) {
      suggestedAction = 'Review manually - possible match'
    } else {
      suggestedAction = 'No match - keep separate'
    }

    return {
      confidence,
      suggestedAllocation: Math.min(expense.amount, invoice.totalAmount),
      reason: reason || 'No matching criteria found',
      suggestedAction
    }
  }

  /**
   * Generate invoice number
   */
  private static async generateInvoiceNumber(tenantId: string): Promise<string> {
    const count = await prisma.invoice.count({
      where: { tenantId }
    })
    
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const number = String(count + 1).padStart(4, '0')
    
    return `INV-${year}${month}-${number}`
  }

  /**
   * Calculate due date
   */
  private static calculateDueDate(issueDate: Date): string {
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + 30) // 30 days default
    return dueDate.toISOString()
  }

  /**
   * Recalculate invoice totals
   */
  private static async recalculateInvoiceTotals(invoiceId: string): Promise<void> {
    const lines = await prisma.invoiceLine.findMany({
      where: { invoiceId }
    })

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal.toNumber(), 0)
    const taxTotal = lines.reduce((sum, line) => sum + (line.lineTotal.toNumber() * line.taxRate / 100), 0)
    const totalAmount = subtotal + taxTotal

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal,
        taxTotal,
        totalAmount,
        balanceDue: totalAmount
      }
    })
  }
}
