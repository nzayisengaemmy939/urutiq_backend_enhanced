import { prisma } from './prisma.js'
import { TenantRequest } from './tenant.js'
import { enqueueAiJob } from './queue.js'

export interface NLPInvoiceRequest {
  text: string
  companyId: string
  customerId?: string
  context?: {
    previousInvoices?: Array<{
      customerName: string
      items: string[]
      amounts: number[]
    }>
    customerHistory?: Array<{
      customerName: string
      commonItems: string[]
      averageAmount: number
    }>
  }
}

export interface ParsedInvoiceData {
  customer: {
    name: string
    email?: string
    phone?: string
    address?: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    lineTotal: number
    category?: string
  }>
  dates: {
    issueDate: Date
    dueDate: Date
  }
  amounts: {
    subtotal: number
    taxRate: number
    taxAmount: number
    totalAmount: number
  }
  metadata: {
    confidence: number
    extractedEntities: string[]
    suggestedTerms: string
    suggestedNotes: string
  }
  rawAnalysis: {
    intent: string
    entities: Array<{
      type: 'customer' | 'item' | 'amount' | 'date' | 'quantity'
      value: string
      confidence: number
    }>
    relationships: Array<{
      from: string
      to: string
      relationship: string
    }>
  }
}

export interface InvoiceCreationResult {
  success: boolean
  invoice?: any
  parsedData: ParsedInvoiceData
  suggestions: Array<{
    type: 'customer' | 'item' | 'amount' | 'date'
    suggestion: string
    confidence: number
    reason: string
  }>
  warnings: Array<{
    type: 'missing_data' | 'ambiguous_data' | 'validation_error'
    message: string
    field: string
    suggestion: string
  }>
  message: string
}

export class InvoiceNLPService {
  /**
   * Parse natural language text to extract invoice data
   */
  static async parseInvoiceText(
    tenantId: string,
    request: NLPInvoiceRequest
  ): Promise<ParsedInvoiceData> {
    try {
      // Queue AI job for natural language processing
      const jobId = await enqueueAiJob({
        type: 'parse_invoice_text',
        data: {
          tenantId,
          text: request.text,
          companyId: request.companyId,
          customerId: request.customerId,
          context: request.context,
          timestamp: new Date().toISOString()
        }
      })

      // For now, simulate AI processing
      // In production, this would call OpenAI GPT-4 or similar
      const result = await this.simulateNLPProcessing(request.text, request.context)

      // Store the processing result
      await prisma.documentProcessingResult.create({
        data: {
          tenantId,
          jobId,
          documentType: 'invoice_nlp',
          fileName: 'natural_language_input',
          mimeType: 'text/plain',
          result: JSON.stringify(result),
          confidence: result.metadata.confidence,
          status: 'completed',
          processedAt: new Date()
        }
      })

      return result
    } catch (error) {
      console.error('Error parsing invoice text:', error)
      throw error
    }
  }

  /**
   * Create invoice from parsed natural language data
   */
  static async createInvoiceFromNLP(
    tenantId: string,
    companyId: string,
    parsedData: ParsedInvoiceData,
    options?: {
      customerId?: string
      autoCreateCustomer?: boolean
      validateData?: boolean
    }
  ): Promise<InvoiceCreationResult> {
    try {
      const warnings: InvoiceCreationResult['warnings'] = []
      const suggestions: InvoiceCreationResult['suggestions'] = []

      // Validate parsed data
      if (options?.validateData) {
        const validation = await this.validateParsedData(parsedData)
        warnings.push(...validation.warnings)
        suggestions.push(...validation.suggestions)
      }

      // Find or create customer
      let customerId = options?.customerId
      if (!customerId) {
        const customer = await this.findOrCreateCustomer(
          tenantId,
          companyId,
          parsedData.customer,
          options?.autoCreateCustomer || false
        )
        
        if (!customer) {
          return {
            success: false,
            parsedData,
            suggestions,
            warnings: [...warnings, {
              type: 'missing_data',
              message: 'Customer not found and auto-creation disabled',
              field: 'customer',
              suggestion: 'Enable auto-creation or specify existing customer'
            }],
            message: 'Customer not found'
          }
        }
        
        customerId = customer.id
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(tenantId)

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          tenantId,
          companyId,
          customerId,
          invoiceNumber,
          issueDate: parsedData.dates.issueDate.toISOString(),
          dueDate: parsedData.dates.dueDate.toISOString(),
          status: 'draft',
          subtotal: parsedData.amounts.subtotal,
          taxTotal: parsedData.amounts.taxAmount,
          totalAmount: parsedData.amounts.totalAmount,
          balanceDue: parsedData.amounts.totalAmount,
          currency: 'USD', // Default currency
          notes: parsedData.metadata.suggestedNotes,
          terms: parsedData.metadata.suggestedTerms,
          metadata: {
            nlpConfidence: parsedData.metadata.confidence,
            sourceType: 'natural_language',
            extractedEntities: parsedData.metadata.extractedEntities,
            rawAnalysis: parsedData.rawAnalysis
          }
        }
      })

      // Create invoice lines
      for (const item of parsedData.items) {
        await prisma.invoiceLine.create({
          data: {
            tenantId,
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            taxRate: parsedData.amounts.taxRate
          }
        })
      }

      // Log activity
      await prisma.invoiceActivity.create({
        data: {
          tenantId,
          invoiceId: invoice.id,
          activityType: 'invoice_created_from_nlp',
          description: `Invoice created from natural language: "${parsedData.rawAnalysis.intent}"`,
          metadata: { 
            nlpConfidence: parsedData.metadata.confidence,
            customerName: parsedData.customer.name,
            itemCount: parsedData.items.length,
            totalAmount: parsedData.amounts.totalAmount
          }
        }
      })

      return {
        success: true,
        invoice,
        parsedData,
        suggestions,
        warnings,
        message: 'Invoice created successfully from natural language input'
      }
    } catch (error) {
      console.error('Error creating invoice from NLP:', error)
      throw error
    }
  }

  /**
   * Get invoice creation suggestions based on context
   */
  static async getInvoiceSuggestions(
    tenantId: string,
    companyId: string,
    partialText: string
  ): Promise<Array<{
    suggestion: string
    confidence: number
    type: 'customer' | 'item' | 'amount' | 'template'
    context: string
  }>> {
    try {
      // Get recent invoices for context
      const recentInvoices = await prisma.invoice.findMany({
        where: { tenantId, companyId },
        include: {
          customer: true,
          lines: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })

      // Get common customers
      const customers = await prisma.customer.findMany({
        where: { tenantId, companyId },
        orderBy: { createdAt: 'desc' },
        take: 20
      })

      // Generate suggestions based on context
      const suggestions = []

      // Customer suggestions
      for (const customer of customers) {
        if (partialText.toLowerCase().includes(customer.name.toLowerCase()) || 
            customer.name.toLowerCase().includes(partialText.toLowerCase())) {
          suggestions.push({
            suggestion: `Create invoice for ${customer.name}`,
            confidence: 0.9,
            type: 'customer' as const,
            context: `Recent customer: ${customer.name}`
          })
        }
      }

      // Item suggestions from recent invoices
      const commonItems = new Map<string, number>()
      for (const invoice of recentInvoices) {
        for (const line of invoice.lines) {
          const count = commonItems.get(line.description) || 0
          commonItems.set(line.description, count + 1)
        }
      }

      for (const [item, count] of commonItems) {
        if (count >= 2) { // Only suggest items used multiple times
          suggestions.push({
            suggestion: `Add "${item}" to invoice`,
            confidence: 0.7,
            type: 'item' as const,
            context: `Used in ${count} recent invoices`
          })
        }
      }

      // Template suggestions
      if (partialText.length < 10) {
        suggestions.push({
          suggestion: 'Create invoice for consulting services - 10 hours at $150/hour',
          confidence: 0.6,
          type: 'template' as const,
          context: 'Common invoice template'
        })
        
        suggestions.push({
          suggestion: 'Bill customer for software development - 5 days at $200/day',
          confidence: 0.6,
          type: 'template' as const,
          context: 'Common invoice template'
        })
      }

      return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
    } catch (error) {
      console.error('Error getting invoice suggestions:', error)
      return []
    }
  }

  /**
   * Simulate NLP processing (replace with real AI)
   */
  private static async simulateNLPProcessing(
    text: string,
    context?: NLPInvoiceRequest['context']
  ): Promise<ParsedInvoiceData> {
    // This is a simulation - in production, use OpenAI GPT-4 or similar
    const lowerText = text.toLowerCase()

    // Extract customer name (simple pattern matching)
    const customerMatch = text.match(/(?:for|to|bill)\s+([A-Za-z\s]+?)(?:\s|$|,|\.)/i)
    const customerName = customerMatch ? customerMatch[1].trim() : 'Unknown Customer'

    // Extract amounts (simple pattern matching)
    const amountMatches = text.match(/\$?(\d+(?:\.\d{2})?)/g)
    const amounts = amountMatches ? amountMatches.map(m => parseFloat(m.replace('$', ''))) : [0]

    // Extract quantities
    const quantityMatches = text.match(/(\d+)\s*(?:hours?|days?|units?|items?)/gi)
    const quantities = quantityMatches ? quantityMatches.map(m => parseInt(m)) : [1]

    // Extract items/services
    const itemMatches = text.match(/(?:for|including|services?|work|development|consulting|design|support)\s+([^,\.]+)/gi)
    const items = itemMatches ? itemMatches.map(m => m.replace(/^(?:for|including|services?|work|development|consulting|design|support)\s+/i, '').trim()) : ['Services']

    // Calculate totals
    const subtotal = amounts.reduce((sum, amount) => sum + amount, 0)
    const taxRate = 8.5 // Default tax rate
    const taxAmount = subtotal * (taxRate / 100)
    const totalAmount = subtotal + taxAmount

    // Create line items
    const lineItems = items.map((item, index) => ({
      description: item,
      quantity: quantities[index] || 1,
      unitPrice: amounts[index] || subtotal / items.length,
      lineTotal: (quantities[index] || 1) * (amounts[index] || subtotal / items.length),
      category: 'Services'
    }))

    return {
      customer: {
        name: customerName,
        email: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: '+1-555-0123',
        address: '123 Main St, City, State 12345'
      },
      items: lineItems,
      dates: {
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      amounts: {
        subtotal,
        taxRate,
        taxAmount,
        totalAmount
      },
      metadata: {
        confidence: 0.75,
        extractedEntities: [customerName, ...items],
        suggestedTerms: 'Payment due within 30 days',
        suggestedNotes: `Invoice created from natural language: "${text}"`
      },
      rawAnalysis: {
        intent: 'create_invoice',
        entities: [
          { type: 'customer', value: customerName, confidence: 0.8 },
          ...items.map(item => ({ type: 'item' as const, value: item, confidence: 0.7 })),
          ...amounts.map(amount => ({ type: 'amount' as const, value: amount.toString(), confidence: 0.9 }))
        ],
        relationships: [
          { from: customerName, to: 'invoice', relationship: 'customer_of' },
          ...items.map(item => ({ from: item, to: 'invoice', relationship: 'item_in' }))
        ]
      }
    }
  }

  /**
   * Validate parsed data
   */
  private static async validateParsedData(parsedData: ParsedInvoiceData): Promise<{
    warnings: InvoiceCreationResult['warnings']
    suggestions: InvoiceCreationResult['suggestions']
  }> {
    const warnings: InvoiceCreationResult['warnings'] = []
    const suggestions: InvoiceCreationResult['suggestions'] = []

    // Check customer data
    if (!parsedData.customer.name || parsedData.customer.name === 'Unknown Customer') {
      warnings.push({
        type: 'missing_data',
        message: 'Customer name not clearly identified',
        field: 'customer',
        suggestion: 'Please specify the customer name clearly'
      })
    }

    // Check amounts
    if (parsedData.amounts.totalAmount <= 0) {
      warnings.push({
        type: 'validation_error',
        message: 'Total amount is zero or negative',
        field: 'amount',
        suggestion: 'Please specify valid amounts'
      })
    }

    // Check items
    if (parsedData.items.length === 0) {
      warnings.push({
        type: 'missing_data',
        message: 'No items or services specified',
        field: 'items',
        suggestion: 'Please specify what you are billing for'
      })
    }

    // Check confidence
    if (parsedData.metadata.confidence < 0.5) {
      warnings.push({
        type: 'ambiguous_data',
        message: 'Low confidence in parsed data',
        field: 'general',
        suggestion: 'Please review and confirm the parsed information'
      })
    }

    return { warnings, suggestions }
  }

  /**
   * Find or create customer
   */
  private static async findOrCreateCustomer(
    tenantId: string,
    companyId: string,
    customerData: ParsedInvoiceData['customer'],
    autoCreate: boolean
  ): Promise<any> {
    // First, try to find existing customer
    let customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        companyId,
        name: { contains: customerData.name }
      }
    })

    if (customer) {
      return customer
    }

    // If not found and auto-create is enabled, create new customer
    if (autoCreate) {
      customer = await prisma.customer.create({
        data: {
          tenantId,
          companyId,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          status: 'active',
          metadata: {
            createdFrom: 'nlp_invoice_creation',
            nlpConfidence: 0.8
          }
        }
      })
    }

    return customer
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
}
