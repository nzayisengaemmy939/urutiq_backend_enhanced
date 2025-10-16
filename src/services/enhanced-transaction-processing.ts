import { prisma } from '../prisma';
import { EnhancedConversationalAIService } from './enhanced-conversational-ai';

// Enhanced Transaction Processing Interfaces
export interface ReceiptData {
  id: string;
  imageUrl: string;
  extractedText: string;
  vendor?: string;
  amount?: number;
  date?: Date;
  items?: ReceiptItem[];
  confidence: number;
  metadata?: any;
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  isActive: boolean;
  metadata?: any;
}

export interface SmartInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: any;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  metadata?: any;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  accountId?: string;
}

export interface VendorMatch {
  vendorId: string;
  vendorName: string;
  confidence: number;
  reasoning: string;
  suggestedCategory?: string;
  paymentTerms?: string;
}

export interface CustomerMatch {
  customerId: string;
  customerName: string;
  confidence: number;
  reasoning: string;
  suggestedCategory?: string;
  creditLimit?: number;
}

export interface TransactionIntelligence {
  patternType: 'vendor' | 'amount' | 'category' | 'timing' | 'location';
  confidence: number;
  description: string;
  recommendations: string[];
  riskScore: number;
  metadata?: any;
}

// Enhanced Transaction Processing Service
export class EnhancedTransactionProcessingService {
  private conversationalAI: EnhancedConversationalAIService;

  constructor() {
    this.conversationalAI = new EnhancedConversationalAIService();
  }

  // OCR Receipt Processing
  async processReceipt(imageUrl: string, companyId: string): Promise<ReceiptData> {
    try {
      // Simulate OCR processing (in real implementation, this would use a service like Google Vision API)
      const extractedText = await this.simulateOCRProcessing(imageUrl);
      
      // Use AI to parse and categorize the receipt data
      const parsedData = await this.parseReceiptWithAI(extractedText, companyId);
      
      // Create receipt record
      const receipt = await prisma.fileAsset.create({
        data: {
          tenantId: 'demo-tenant-id',
          companyId,
          name: `receipt-${Date.now()}.jpg`,
          uploaderId: 'demo-user-id',
          mimeType: 'image/jpeg',
          sizeBytes: 1024,
          storageKey: `receipts/${Date.now()}.jpg`,
          categoryId: 'default-receipt-category'
        }
      });

      return {
        id: receipt.id,
        imageUrl,
        extractedText,
        vendor: parsedData.vendor,
        amount: parsedData.amount,
        date: parsedData.date,
        items: parsedData.items,
        confidence: parsedData.confidence,
        metadata: parsedData.metadata
      };
    } catch (error) {
      console.error('Receipt processing failed:', error);
      throw new Error('Failed to process receipt');
    }
  }

  // Simulate OCR processing
  private async simulateOCRProcessing(imageUrl: string): Promise<string> {
    // In real implementation, this would call an OCR service
    // For now, return mock extracted text
    const mockReceipts = [
      "STORE NAME: ABC Electronics\nDate: 2024-01-15\nItems:\n- Laptop $999.99\n- Mouse $29.99\nTotal: $1,029.98\nTax: $82.40\nGrand Total: $1,112.38",
      "RESTAURANT: Pizza Palace\nDate: 2024-01-14\nItems:\n- Large Pizza $18.99\n- Soda $2.99\nTotal: $21.98\nTip: $4.40\nGrand Total: $26.38",
      "OFFICE SUPPLIES: OfficeMax\nDate: 2024-01-13\nItems:\n- Paper $12.99\n- Pens $5.99\n- Stapler $15.99\nTotal: $34.97\nTax: $2.80\nGrand Total: $37.77"
    ];
    
    // Simulate different receipts based on image URL
    const index = imageUrl.length % mockReceipts.length;
    return mockReceipts[index];
  }

  // Parse receipt with AI
  private async parseReceiptWithAI(extractedText: string, companyId: string): Promise<any> {
    const aiContext = {
      userId: 'demo-user-id',
      companyId,
      tenantId: 'demo-tenant-id',
      sessionId: `receipt-parsing-${Date.now()}`,
      conversationHistory: [],
      userPreferences: {
        language: 'en',
        currency: 'USD',
        confidenceThreshold: 0.7,
        autoConfirm: false,
        dateFormat: 'MM/DD/YYYY',
        preferredCategories: [],
        excludedCategories: [],
        notificationPreferences: {
          email: false,
          push: false,
          sms: false
        }
      },
      learningContext: {
        frequentVendors: [],
        frequentCategories: [],
        commonAmounts: [],
        userPatterns: [],
        industryContext: 'general',
        complianceRequirements: []
      }
    };

    const prompt = `Parse this receipt text and extract structured data:
    
    Receipt Text:
    ${extractedText}
    
    Please extract:
    1. Vendor/Store name
    2. Date
    3. Total amount
    4. Individual items with quantities and prices
    5. Tax amount
    6. Category suggestions
    
    Respond in this format:
    "Vendor: [name] | Date: [date] | Total: [amount] | Tax: [tax] | Items: [item1:qty:price,item2:qty:price] | Category: [suggested_category] | Confidence: [0-100]"`;

    const response = await this.conversationalAI.processNaturalLanguageInput(prompt, aiContext);
    
    return this.parseReceiptResponse(response.message);
  }

  // Parse AI receipt response
  private parseReceiptResponse(message: string): any {
    const parts = message.split('|').map(p => p.trim());
    const result: any = {
      vendor: '',
      date: new Date(),
      amount: 0,
      tax: 0,
      items: [],
      category: '',
      confidence: 0.8
    };

    for (const part of parts) {
      if (part.startsWith('Vendor:')) {
        result.vendor = part.replace('Vendor:', '').trim();
      } else if (part.startsWith('Date:')) {
        const dateStr = part.replace('Date:', '').trim();
        result.date = new Date(dateStr);
      } else if (part.startsWith('Total:')) {
        const amountStr = part.replace('Total:', '').trim();
        result.amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
      } else if (part.startsWith('Tax:')) {
        const taxStr = part.replace('Tax:', '').trim();
        result.tax = parseFloat(taxStr.replace(/[^0-9.]/g, ''));
      } else if (part.startsWith('Items:')) {
        const itemsStr = part.replace('Items:', '').trim();
        result.items = this.parseReceiptItems(itemsStr);
      } else if (part.startsWith('Category:')) {
        result.category = part.replace('Category:', '').trim();
      } else if (part.startsWith('Confidence:')) {
        const confStr = part.replace('Confidence:', '').trim();
        result.confidence = parseInt(confStr) / 100;
      }
    }

    return result;
  }

  // Parse receipt items
  private parseReceiptItems(itemsStr: string): ReceiptItem[] {
    const items: ReceiptItem[] = [];
    const itemParts = itemsStr.split(',');
    
    for (const itemPart of itemParts) {
      const [description, qtyStr, priceStr] = itemPart.split(':');
      if (description && qtyStr && priceStr) {
        items.push({
          description: description.trim(),
          quantity: parseInt(qtyStr.trim()) || 1,
          unitPrice: parseFloat(priceStr.trim()) || 0,
          totalPrice: (parseInt(qtyStr.trim()) || 1) * (parseFloat(priceStr.trim()) || 0)
        });
      }
    }
    
    return items;
  }

  // Smart Invoice Generation
  async generateSmartInvoice(
    customerId: string,
    items: InvoiceItem[],
    companyId: string,
    templateId?: string
  ): Promise<SmartInvoice> {
    try {
      // Get customer information
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxRate = 0.08; // Mock tax rate - would come from configuration
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(companyId);

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: 'demo-tenant-id',
          companyId,
          customerId,
          invoiceNumber,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          subtotal,
          taxAmount,
          totalAmount: total,
          status: 'draft',
          createdBy: 'demo-user-id'
        }
      });

      // Create invoice items
      for (const item of items) {
        await prisma.invoiceLine.create({
          data: {
            tenantId: 'demo-tenant-id',
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.totalPrice,
            // accountId: item.accountId || 'revenue-account-id' // Field not available in model
          }
        });
      }

      return {
        id: invoice.id,
        invoiceNumber,
        customerId,
        customer,
        items,
        subtotal,
        taxAmount,
        total,
        dueDate: invoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'draft',
        metadata: {
          templateId,
          generatedAt: new Date(),
          aiAssisted: true
        }
      };
    } catch (error) {
      console.error('Smart invoice generation failed:', error);
      throw new Error('Failed to generate invoice');
    }
  }

  // Generate unique invoice number
  private async generateInvoiceNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
      where: {
        companyId,
        issueDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      }
    });
    
    return `INV-${year}-${(count + 1).toString().padStart(4, '0')}`;
  }

  // Vendor/Customer Management
  async findVendorMatch(
    vendorName: string,
    companyId: string,
    context?: any
  ): Promise<VendorMatch[]> {
    try {
      // Search existing vendors
      const existingVendors = await prisma.vendor.findMany({
        where: {
          companyId,
          name: {
            contains: vendorName
          }
        }
      });

      // Use AI to suggest matches and categories
      const aiContext = {
        userId: 'demo-user-id',
        companyId,
        tenantId: 'demo-tenant-id',
        sessionId: `vendor-matching-${Date.now()}`,
        conversationHistory: [],
        userPreferences: {
          language: 'en',
          currency: 'USD',
          confidenceThreshold: 0.7,
          autoConfirm: false,
          dateFormat: 'MM/DD/YYYY',
          preferredCategories: [],
          excludedCategories: [],
          notificationPreferences: {
            email: false,
            push: false,
            sms: false
          }
        },
        learningContext: {
          frequentVendors: existingVendors.map(v => ({
            name: v.name,
            count: 1,
            lastUsed: new Date()
          })),
          frequentCategories: [],
          commonAmounts: [],
          userPatterns: [],
          industryContext: 'general',
          complianceRequirements: []
        }
      };

      const prompt = `Suggest vendor matches and categories for: ${vendorName}
      
      Existing vendors: ${existingVendors.map(v => v.name).join(', ')}
      ${context?.amount ? `Transaction amount: $${context.amount}` : ''}
      ${context?.category ? `Category: ${context.category}` : ''}
      
      Please suggest:
      1. Best matches from existing vendors
      2. Suggested category for new vendor
      3. Payment terms recommendation
      
      Respond in this format:
      "Vendor: [name] | Confidence: [0-100] | Category: [category] | PaymentTerms: [terms] | Reasoning: [explanation]"`;

      const response = await this.conversationalAI.processNaturalLanguageInput(prompt, aiContext);
      
      return this.parseVendorMatches(response.message, existingVendors);
    } catch (error) {
      console.warn('AI vendor matching failed:', error);
      return this.getDefaultVendorMatches(vendorName, companyId);
    }
  }

  // Parse AI vendor matches
  private parseVendorMatches(message: string, existingVendors: any[]): VendorMatch[] {
    const matches: VendorMatch[] = [];
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (line.includes('Vendor:') && line.includes('Confidence:')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 5) {
          const vendorName = parts[0].replace('Vendor:', '').trim();
          const confidence = parseInt(parts[1].replace('Confidence:', '').trim()) / 100;
          const category = parts[2].replace('Category:', '').trim();
          const paymentTerms = parts[3].replace('PaymentTerms:', '').trim();
          const reasoning = parts[4].replace('Reasoning:', '').trim();
          
          // Find existing vendor or create new one
          const existingVendor = existingVendors.find(v => 
            v.name.toLowerCase().includes(vendorName.toLowerCase())
          );
          
          matches.push({
            vendorId: existingVendor?.id || 'new-vendor',
            vendorName: existingVendor?.name || vendorName,
            confidence,
            reasoning,
            suggestedCategory: category,
            paymentTerms
          });
        }
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  // Get default vendor matches
  private async getDefaultVendorMatches(vendorName: string, companyId: string): Promise<VendorMatch[]> {
    const existingVendors = await prisma.vendor.findMany({
      where: {
        companyId,
        name: {
          contains: vendorName
        }
      }
    });

    return existingVendors.map(vendor => ({
      vendorId: vendor.id,
      vendorName: vendor.name,
      confidence: 0.8,
      reasoning: 'Exact name match found',
      suggestedCategory: 'General',
      paymentTerms: 'Net 30'
    }));
  }

  // Customer matching (similar to vendor matching)
  async findCustomerMatch(
    customerName: string,
    companyId: string,
    context?: any
  ): Promise<CustomerMatch[]> {
    try {
      const existingCustomers = await prisma.customer.findMany({
        where: {
          companyId,
          name: {
            contains: customerName
          }
        }
      });

      const aiContext = {
        userId: 'demo-user-id',
        companyId,
        tenantId: 'demo-tenant-id',
        sessionId: `customer-matching-${Date.now()}`,
        conversationHistory: [],
        userPreferences: {
          language: 'en',
          currency: 'USD',
          confidenceThreshold: 0.7,
          autoConfirm: false,
          dateFormat: 'MM/DD/YYYY',
          preferredCategories: [],
          excludedCategories: [],
          notificationPreferences: {
            email: false,
            push: false,
            sms: false
          }
        },
        learningContext: {
          frequentVendors: [],
          frequentCategories: [],
          commonAmounts: [],
          userPatterns: [],
          industryContext: 'general',
          complianceRequirements: []
        }
      };

      const prompt = `Suggest customer matches for: ${customerName}
      
      Existing customers: ${existingCustomers.map(c => c.name).join(', ')}
      ${context?.amount ? `Transaction amount: $${context.amount}` : ''}
      
      Please suggest:
      1. Best matches from existing customers
      2. Suggested category for new customer
      3. Credit limit recommendation
      
      Respond in this format:
      "Customer: [name] | Confidence: [0-100] | Category: [category] | CreditLimit: [amount] | Reasoning: [explanation]"`;

      const response = await this.conversationalAI.processNaturalLanguageInput(prompt, aiContext);
      
      return this.parseCustomerMatches(response.message, existingCustomers);
    } catch (error) {
      console.warn('AI customer matching failed:', error);
      return this.getDefaultCustomerMatches(customerName, companyId);
    }
  }

  // Parse AI customer matches
  private parseCustomerMatches(message: string, existingCustomers: any[]): CustomerMatch[] {
    const matches: CustomerMatch[] = [];
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (line.includes('Customer:') && line.includes('Confidence:')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 5) {
          const customerName = parts[0].replace('Customer:', '').trim();
          const confidence = parseInt(parts[1].replace('Confidence:', '').trim()) / 100;
          const category = parts[2].replace('Category:', '').trim();
          const creditLimit = parseFloat(parts[3].replace('CreditLimit:', '').trim()) || 0;
          const reasoning = parts[4].replace('Reasoning:', '').trim();
          
          const existingCustomer = existingCustomers.find(c => 
            c.name.toLowerCase().includes(customerName.toLowerCase())
          );
          
          matches.push({
            customerId: existingCustomer?.id || 'new-customer',
            customerName: existingCustomer?.name || customerName,
            confidence,
            reasoning,
            suggestedCategory: category,
            creditLimit
          });
        }
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  // Get default customer matches
  private async getDefaultCustomerMatches(customerName: string, companyId: string): Promise<CustomerMatch[]> {
    const existingCustomers = await prisma.customer.findMany({
      where: {
        companyId,
        name: {
          contains: customerName
        }
      }
    });

    return existingCustomers.map(customer => ({
      customerId: customer.id,
      customerName: customer.name,
      confidence: 0.8,
      reasoning: 'Exact name match found',
      suggestedCategory: 'General',
      creditLimit: 10000
    }));
  }

  // Transaction Intelligence
  async analyzeTransactionPatterns(
    companyId: string,
    periodDays: number = 90
  ): Promise<TransactionIntelligence[]> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
      
      // Get transactions for the period
      const transactions = await prisma.transaction.findMany({
        where: {
          companyId,
          transactionDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          company: true
        }
      });

      const patterns: TransactionIntelligence[] = [];

      // Analyze vendor patterns
      const vendorPatterns = this.analyzeVendorPatterns(transactions);
      patterns.push(...vendorPatterns);

      // Analyze amount patterns
      const amountPatterns = this.analyzeAmountPatterns(transactions);
      patterns.push(...amountPatterns);

      // Analyze timing patterns
      const timingPatterns = this.analyzeTimingPatterns(transactions);
      patterns.push(...timingPatterns);

      return patterns;
    } catch (error) {
      console.error('Transaction pattern analysis failed:', error);
      return [];
    }
  }

  // Analyze vendor patterns
  private analyzeVendorPatterns(transactions: any[]): TransactionIntelligence[] {
    const patterns: TransactionIntelligence[] = [];
    const vendorCounts = new Map<string, number>();
    const vendorAmounts = new Map<string, number>();

    // Count vendor frequency and amounts
    for (const transaction of transactions) {
      const vendor = transaction.transactionType || 'Unknown';
      vendorCounts.set(vendor, (vendorCounts.get(vendor) || 0) + 1);
      vendorAmounts.set(vendor, (vendorAmounts.get(vendor) || 0) + Number(transaction.amount));
    }

    // Find frequent vendors
    for (const [vendor, count] of vendorCounts) {
      if (count >= 3) { // At least 3 transactions
        const totalAmount = vendorAmounts.get(vendor) || 0;
        const avgAmount = totalAmount / count;
        
        patterns.push({
          patternType: 'vendor',
          confidence: Math.min(count / 10, 1), // Higher confidence for more transactions
          description: `Frequent vendor: ${vendor} (${count} transactions, avg $${avgAmount.toFixed(2)})`,
          recommendations: [
            `Consider setting up recurring payments for ${vendor}`,
            `Negotiate better terms with ${vendor} due to high volume`,
            `Review pricing with ${vendor}`
          ],
          riskScore: avgAmount > 1000 ? 0.3 : 0.1,
          metadata: {
            vendor,
            transactionCount: count,
            totalAmount,
            averageAmount: avgAmount
          }
        });
      }
    }

    return patterns;
  }

  // Analyze amount patterns
  private analyzeAmountPatterns(transactions: any[]): TransactionIntelligence[] {
    const patterns: TransactionIntelligence[] = [];
    const amounts = transactions.map(t => Number(t.amount)).sort((a, b) => a - b);
    
    if (amounts.length === 0) return patterns;

    const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const medianAmount = amounts[Math.floor(amounts.length / 2)];
    const maxAmount = amounts[amounts.length - 1];

    // Detect unusual amounts
    const unusualAmounts = amounts.filter(amount => amount > avgAmount * 3);
    if (unusualAmounts.length > 0) {
      patterns.push({
        patternType: 'amount',
        confidence: 0.8,
        description: `Found ${unusualAmounts.length} unusually large transactions (${unusualAmounts.length} > ${(avgAmount * 3).toFixed(2)})`,
        recommendations: [
          'Review large transactions for accuracy',
          'Consider breaking down large purchases',
          'Monitor for potential fraud'
        ],
        riskScore: 0.6,
        metadata: {
          unusualAmounts,
          averageAmount: avgAmount,
          maxAmount
        }
      });
    }

    // Detect consistent amounts
    const amountGroups = new Map<number, number>();
    for (const amount of amounts) {
      const rounded = Math.round(amount / 10) * 10; // Round to nearest 10
      amountGroups.set(rounded, (amountGroups.get(rounded) || 0) + 1);
    }

    for (const [amount, count] of amountGroups) {
      if (count >= 3) {
        patterns.push({
          patternType: 'amount',
          confidence: 0.7,
          description: `Consistent amount pattern: $${amount} appears ${count} times`,
          recommendations: [
            `Consider setting up recurring payment for $${amount}`,
            'Review if this is a subscription or recurring expense',
            'Optimize payment timing for this amount'
          ],
          riskScore: 0.2,
          metadata: {
            consistentAmount: amount,
            frequency: count
          }
        });
      }
    }

    return patterns;
  }

  // Analyze timing patterns
  private analyzeTimingPatterns(transactions: any[]): TransactionIntelligence[] {
    const patterns: TransactionIntelligence[] = [];
    
    // Group by day of week
    const dayCounts = new Map<number, number>();
    for (const transaction of transactions) {
      const day = new Date(transaction.transactionDate).getDay();
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }

    // Find busiest days
    const busiestDay = Array.from(dayCounts.entries()).reduce((a, b) => 
      dayCounts.get(a[0])! > dayCounts.get(b[0])! ? a : b
    );

    if (busiestDay[1] >= 3) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      patterns.push({
        patternType: 'timing',
        confidence: 0.6,
        description: `Busiest transaction day: ${dayNames[busiestDay[0]]} (${busiestDay[1]} transactions)`,
        recommendations: [
          `Schedule important transactions for ${dayNames[busiestDay[0]]}`,
          'Consider batch processing for other days',
          'Plan cash flow around busiest days'
        ],
        riskScore: 0.1,
        metadata: {
          busiestDay: dayNames[busiestDay[0]],
          transactionCount: busiestDay[1]
        }
      });
    }

    return patterns;
  }

  // Get transaction statistics
  async getTransactionStats(companyId: string, periodDays: number = 30): Promise<any> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    const transactions = await prisma.transaction.findMany({
      where: {
        companyId,
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const avgAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    // Group by type
    const typeStats = new Map<string, { count: number; total: number }>();
    for (const transaction of transactions) {
      const type = transaction.transactionType || 'Unknown';
      const current = typeStats.get(type) || { count: 0, total: 0 };
      current.count++;
      current.total += Number(transaction.amount);
      typeStats.set(type, current);
    }

    return {
      period: { start: startDate, end: endDate },
      totalTransactions,
      totalAmount,
      averageAmount: avgAmount,
      byType: Object.fromEntries(typeStats),
      patterns: await this.analyzeTransactionPatterns(companyId, periodDays)
    };
  }
}

export const enhancedTransactionProcessingService = new EnhancedTransactionProcessingService();
