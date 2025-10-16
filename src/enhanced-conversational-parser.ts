import { prisma } from './prisma';
import { aiConfigurationService } from './ai-config.js';
import { config } from './config.js';

// Enhanced interfaces for the conversational parser
export interface ParsedTransaction {
  description: string;
  amount: number;
  currency: string;
  date: Date;
  transactionType: 'purchase' | 'expense' | 'income' | 'transfer' | 'payment' | 'receipt' | 'adjustment' | 'reversal';
  category: string;
  confidence: number;
  journalEntries: JournalEntry[];
  metadata: {
    vendor?: string;
    customer?: string;
    account?: string;
    reference?: string;
    notes?: string;
    tags?: string[];
    riskScore?: number;
    complianceFlags?: string[];
  };
  validation: {
    isBalanced: boolean;
    hasValidAccounts: boolean;
    followsAccountingRules: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface JournalEntry {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
  category: string;
  tags?: string[];
}

export interface ParsedPrompt {
  originalText: string;
  parsedTransaction: ParsedTransaction;
  confidence: number;
  reasoning: string;
  suggestions: string[];
  validationErrors: string[];
  aiInsights: {
    suggestedTags: string[];
    riskFactors: string[];
    complianceNotes: string[];
    optimizationSuggestions: string[];
  };
}

// Enhanced accounting patterns with industry-specific keywords
const ENHANCED_ACCOUNTING_PATTERNS = {
  // Transaction types with context
  purchase: {
    keywords: ['purchased', 'bought', 'acquired', 'procured', 'ordered', 'from'],
    context: ['from', 'at', 'through', 'via', 'cost of', 'each', 'per unit']
  },
  expense: {
    keywords: ['paid', 'spent', 'expense', 'cost', 'bill', 'payment', 'charged', 'debited'],
    context: ['to', 'for', 'via', 'through']
  },
  income: {
    keywords: ['received', 'earned', 'income', 'revenue', 'sale', 'payment received', 'incoming', 'credited', 'deposited'],
    context: ['from', 'by', 'via', 'through']
  },
  transfer: {
    keywords: ['transferred', 'moved', 'sent', 'deposited', 'withdrew', 'transfer', 'shifted', 'converted'],
    context: ['from', 'to', 'between', 'into']
  },
  payment: {
    keywords: ['paid', 'payment', 'settled', 'cleared', 'disbursed', 'remitted'],
    context: ['to', 'for', 'against', 'on']
  },
  receipt: {
    keywords: ['received', 'got', 'incoming', 'receipt', 'collected', 'gathered'],
    context: ['from', 'by', 'via']
  },
  adjustment: {
    keywords: ['adjustment', 'correction', 'reversal', 'amendment', 'modification'],
    context: ['for', 'to', 'of', 'in']
  },

  // Industry-specific categories
  industries: {
    retail: ['sales', 'inventory', 'merchandise', 'retail', 'store', 'shop', 'product'],
    manufacturing: ['production', 'manufacturing', 'factory', 'machinery', 'raw materials', 'work in progress'],
    services: ['consulting', 'professional', 'service', 'maintenance', 'support', 'training'],
    technology: ['software', 'hardware', 'licensing', 'subscription', 'development', 'hosting'],
    healthcare: ['medical', 'healthcare', 'pharmaceutical', 'treatment', 'diagnostic', 'therapeutic'],
    construction: ['construction', 'building', 'contracting', 'materials', 'equipment', 'labor'],
    hospitality: ['hotel', 'restaurant', 'catering', 'accommodation', 'food', 'beverage'],
    transportation: ['transport', 'logistics', 'shipping', 'delivery', 'freight', 'warehouse']
  },

  // Enhanced category detection
  categories: {
    utilities: {
      keywords: ['electricity', 'water', 'gas', 'power', 'utility', 'energy', 'electric', 'hydro', 'sewer'],
      subcategories: ['electric', 'water', 'gas', 'internet', 'phone', 'waste']
    },
    rent: {
      keywords: ['rent', 'lease', 'accommodation', 'housing', 'premises', 'space', 'office'],
      subcategories: ['office rent', 'warehouse rent', 'equipment lease', 'vehicle lease']
    },
    supplies: {
      keywords: ['supplies', 'stationery', 'office', 'materials', 'equipment', 'tools', 'consumables'],
      subcategories: ['office supplies', 'cleaning supplies', 'maintenance supplies', 'raw materials']
    },
    services: {
      keywords: ['service', 'consulting', 'professional', 'maintenance', 'support', 'training'],
      subcategories: ['legal services', 'accounting services', 'IT services', 'cleaning services']
    },
    transportation: {
      keywords: ['fuel', 'gas', 'transport', 'travel', 'vehicle', 'mileage', 'parking'],
      subcategories: ['fuel', 'parking', 'tolls', 'public transport', 'vehicle maintenance']
    },
    communication: {
      keywords: ['phone', 'internet', 'telecom', 'communication', 'mobile', 'broadband', 'data'],
      subcategories: ['phone', 'internet', 'mobile', 'software licenses', 'cloud services']
    },
    insurance: {
      keywords: ['insurance', 'premium', 'coverage', 'policy', 'protection', 'liability'],
      subcategories: ['business insurance', 'vehicle insurance', 'health insurance', 'property insurance']
    },
    taxes: {
      keywords: ['tax', 'vat', 'gst', 'government', 'fees', 'duty', 'levy', 'assessment'],
      subcategories: ['income tax', 'sales tax', 'property tax', 'payroll tax', 'import duty']
    },
    salary: {
      keywords: ['salary', 'wage', 'payroll', 'employee', 'compensation', 'benefits', 'bonus'],
      subcategories: ['wages', 'salaries', 'benefits', 'bonuses', 'commissions', 'overtime']
    },
    sales: {
      keywords: ['sale', 'revenue', 'income', 'product', 'service sold', 'invoice', 'billing'],
      subcategories: ['product sales', 'service revenue', 'commission income', 'interest income']
    },
    loan: {
      keywords: ['loan', 'credit', 'borrowed', 'debt', 'mortgage', 'financing', 'advance'],
      subcategories: ['bank loan', 'credit card', 'mortgage', 'line of credit', 'vendor credit']
    },
    investment: {
      keywords: ['investment', 'stock', 'shares', 'portfolio', 'securities', 'bonds', 'equity'],
      subcategories: ['stocks', 'bonds', 'mutual funds', 'real estate', 'cryptocurrency']
    }
  },

  // Time patterns with more granular detection
  time: {
    past: {
      keywords: ['yesterday', 'last week', 'last month', 'previous', 'past', 'ago'],
      patterns: [
        /(\d+)\s+(day|week|month|year)s?\s+ago/i,
        /last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
        /(\d{1,2})-(\d{1,2})-(\d{4})/i
      ]
    },
    future: {
      keywords: ['tomorrow', 'next week', 'next month', 'upcoming', 'future', 'due'],
      patterns: [
        /(\d+)\s+(day|week|month|year)s?\s+from\s+now/i,
        /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        /due\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i
      ]
    },
    recurring: {
      keywords: ['monthly', 'weekly', 'daily', 'recurring', 'subscription', 'periodic'],
      patterns: [
        /every\s+(day|week|month|year)/i,
        /(\d+)\s+times\s+(per|a)\s+(day|week|month|year)/i
      ]
    }
  },

  // Enhanced amount patterns
  amounts: {
    numbers: /\d+(?:,\d{3})*(?:\.\d{2})?/g,
    currency: {
      symbols: ['$', '€', '£', '¥', '₹', '₦', '₩', '₪', '₨', '₱', '₭', '₮', '₯', '₰', '₲', '₳', '₴', '₵', '₶', '₷', '₸', '₺', '₻', '₼', '₽', '₾', '₿'],
      codes: ['RWF', 'USD', 'EUR', 'GBP', 'JPY', 'INR', 'NGN', 'KRW', 'ILS', 'PKR', 'PHP', 'LAK', 'MNT', 'THB', 'PYG', 'ARS', 'UAH', 'GHS', 'VND', 'BGN', 'TRY', 'AZN', 'BYN', 'RUB', 'GEL', 'BTC']
    },
    percentages: /\d+(?:\.\d+)?%/g,
    ranges: /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*-\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g
  },

  // Risk indicators
  risk: {
    high: ['large', 'significant', 'major', 'substantial', 'considerable', 'unusual', 'suspicious'],
    medium: ['moderate', 'medium', 'average', 'normal', 'regular'],
    low: ['small', 'minor', 'minimal', 'nominal', 'trivial']
  },

  // Compliance keywords
  compliance: {
    tax: ['tax', 'vat', 'gst', 'withholding', 'deduction', 'exemption'],
    audit: ['audit', 'review', 'inspection', 'examination', 'verification'],
    regulatory: ['compliance', 'regulation', 'standard', 'requirement', 'mandatory'],
    fraud: ['fraud', 'suspicious', 'unusual', 'anomaly', 'irregular', 'questionable']
  }
};

// Enhanced chart of accounts with industry-specific mappings
const ENHANCED_ACCOUNTS = {
  // Standard accounts
  standard: {
    // Assets
    'Cash': { type: 'ASSET', code: '1000', name: 'Cash', subcategory: 'current' },
    'Bank Account': { type: 'ASSET', code: '1010', name: 'Bank Account', subcategory: 'current' },
    'Accounts Receivable': { type: 'ASSET', code: '1100', name: 'Accounts Receivable', subcategory: 'current' },
    'Inventory': { type: 'ASSET', code: '1200', name: 'Inventory', subcategory: 'current' },
    'Equipment': { type: 'ASSET', code: '1300', name: 'Equipment', subcategory: 'fixed' },
    'Prepaid Expenses': { type: 'ASSET', code: '1400', name: 'Prepaid Expenses', subcategory: 'current' },
    'Accumulated Depreciation': { type: 'ASSET', code: '1500', name: 'Accumulated Depreciation', subcategory: 'contra' },

    // Liabilities
    'Accounts Payable': { type: 'LIABILITY', code: '2000', name: 'Accounts Payable', subcategory: 'current' },
    'Loans': { type: 'LIABILITY', code: '2100', name: 'Loans', subcategory: 'long-term' },
    'Credit Cards': { type: 'LIABILITY', code: '2200', name: 'Credit Cards', subcategory: 'current' },
    'Accrued Expenses': { type: 'LIABILITY', code: '2300', name: 'Accrued Expenses', subcategory: 'current' },
    'Deferred Revenue': { type: 'LIABILITY', code: '2400', name: 'Deferred Revenue', subcategory: 'current' },

    // Equity
    'Owner Equity': { type: 'EQUITY', code: '3000', name: 'Owner Equity', subcategory: 'capital' },
    'Retained Earnings': { type: 'EQUITY', code: '3100', name: 'Retained Earnings', subcategory: 'earnings' },
    'Common Stock': { type: 'EQUITY', code: '3200', name: 'Common Stock', subcategory: 'capital' },

    // Revenue
    'Sales Revenue': { type: 'REVENUE', code: '4000', name: 'Sales Revenue', subcategory: 'operating' },
    'Service Income': { type: 'REVENUE', code: '4100', name: 'Service Income', subcategory: 'operating' },
    'Interest Income': { type: 'REVENUE', code: '4200', name: 'Interest Income', subcategory: 'non-operating' },
    'Other Income': { type: 'REVENUE', code: '4300', name: 'Other Income', subcategory: 'non-operating' },

    // Expenses
    'Office Supplies': { type: 'EXPENSE', code: '5000', name: 'Office Supplies', subcategory: 'operating' },
    'Rent Expense': { type: 'EXPENSE', code: '5010', name: 'Rent Expense', subcategory: 'operating' },
    'Utilities': { type: 'EXPENSE', code: '5020', name: 'Utilities', subcategory: 'operating' },
    'Telephone': { type: 'EXPENSE', code: '5030', name: 'Telephone', subcategory: 'operating' },
    'Insurance': { type: 'EXPENSE', code: '5040', name: 'Insurance', subcategory: 'operating' },
    'Salaries': { type: 'EXPENSE', code: '5050', name: 'Salaries', subcategory: 'operating' },
    'Travel': { type: 'EXPENSE', code: '5060', name: 'Travel', subcategory: 'operating' },
    'Marketing': { type: 'EXPENSE', code: '5070', name: 'Marketing', subcategory: 'operating' },
    'Professional Services': { type: 'EXPENSE', code: '5080', name: 'Professional Services', subcategory: 'operating' },
    'Equipment Maintenance': { type: 'EXPENSE', code: '5090', name: 'Equipment Maintenance', subcategory: 'operating' },
    'Depreciation': { type: 'EXPENSE', code: '5100', name: 'Depreciation', subcategory: 'operating' },
    'Interest Expense': { type: 'EXPENSE', code: '5110', name: 'Interest Expense', subcategory: 'non-operating' }
  },

  // Industry-specific accounts
  industries: {
    retail: {
      'Cost of Goods Sold': { type: 'EXPENSE', code: '5200', name: 'Cost of Goods Sold', subcategory: 'operating' },
      'Merchandise Inventory': { type: 'ASSET', code: '1210', name: 'Merchandise Inventory', subcategory: 'current' },
      'Sales Returns': { type: 'REVENUE', code: '4400', name: 'Sales Returns', subcategory: 'operating' }
    },
    manufacturing: {
      'Raw Materials': { type: 'ASSET', code: '1220', name: 'Raw Materials', subcategory: 'current' },
      'Work in Progress': { type: 'ASSET', code: '1230', name: 'Work in Progress', subcategory: 'current' },
      'Finished Goods': { type: 'ASSET', code: '1240', name: 'Finished Goods', subcategory: 'current' },
      'Manufacturing Overhead': { type: 'EXPENSE', code: '5210', name: 'Manufacturing Overhead', subcategory: 'operating' }
    },
    services: {
      'Professional Fees': { type: 'REVENUE', code: '4500', name: 'Professional Fees', subcategory: 'operating' },
      'Consulting Revenue': { type: 'REVENUE', code: '4600', name: 'Consulting Revenue', subcategory: 'operating' }
    },
    technology: {
      'Software Licenses': { type: 'ASSET', code: '1310', name: 'Software Licenses', subcategory: 'fixed' },
      'Development Costs': { type: 'EXPENSE', code: '5220', name: 'Development Costs', subcategory: 'operating' },
      'Hosting Fees': { type: 'EXPENSE', code: '5230', name: 'Hosting Fees', subcategory: 'operating' }
    }
  }
};

export class EnhancedConversationalParser {
  private aiProviders: string[] = ['ollama', 'openai', 'anthropic'];
  private currentProvider: string = 'ollama';
  private confidenceThreshold: number = 0.7;
  private maxRetries: number = 3;

  constructor() {
    this.initializeAIConfiguration();
  }

  private async initializeAIConfiguration() {
    try {
      // For now, use default configuration
      this.currentProvider = 'ollama';
      this.confidenceThreshold = 0.7;
    } catch (error) {
      console.warn('Using default AI configuration:', error);
    }
  }

  private async callAI(prompt: string, systemPrompt?: string): Promise<string> {
    let lastError: Error | null = null;

    for (const provider of this.aiProviders) {
      try {
        switch (provider) {
          case 'ollama':
            return await this.callOllama(prompt, systemPrompt);
          case 'openai':
            return await this.callOpenAI(prompt, systemPrompt);
          case 'anthropic':
            return await this.callAnthropic(prompt, systemPrompt);
          default:
            continue;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`AI provider ${provider} failed:`, error);
        continue;
      }
    }

    // All AI providers failed, use enhanced fallback
    console.warn('All AI providers failed, using enhanced fallback parsing');
    return this.enhancedFallbackParse(prompt);
  }

  private async callOllama(prompt: string, systemPrompt?: string): Promise<string> {
    // First check if Ollama is available
    try {
      const healthCheck = await fetch(`${config.ai.ollamaBaseUrl}/api/tags`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });
      if (!healthCheck.ok) {
        throw new Error(`Ollama not available: ${healthCheck.status}`);
      }
    } catch (error) {
      throw new Error(`Ollama service unavailable: ${error instanceof Error ? error.message : 'Connection failed'}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // Increased to 45 seconds

    try {
      const response = await fetch(`${config.ai.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'gemma2:2b',
          prompt: prompt,
          system: systemPrompt || this.getEnhancedSystemPrompt(),
          stream: false,
          options: {
            temperature: 0.1,
            top_p: 0.9,
            num_predict: 2048,
          }
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response.trim();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async callOpenAI(prompt: string, systemPrompt?: string): Promise<string> {
    // Implementation for OpenAI API
    throw new Error('OpenAI implementation not yet available');
  }

  private async callAnthropic(prompt: string, systemPrompt?: string): Promise<string> {
    // Implementation for Anthropic API
    throw new Error('Anthropic implementation not yet available');
  }

  private getEnhancedSystemPrompt(): string {
    return `You are an expert accounting AI assistant with deep knowledge of:
- Double-entry bookkeeping principles
- GAAP and IFRS standards
- Industry-specific accounting practices
- Tax compliance requirements
- Risk assessment and fraud detection

Your task is to parse natural language into structured accounting entries with high accuracy.

IMPORTANT INSTRUCTIONS:
1. Extract EXACT dates mentioned, not today's date
2. Identify vendors, customers, and reference numbers
3. Provide CLEAN descriptions without AI prompts
4. Use specific, industry-appropriate categories
5. Ensure proper double-entry bookkeeping
6. Assess risk levels and compliance requirements
7. Suggest relevant tags and insights

Available account types and categories:
${JSON.stringify(ENHANCED_ACCOUNTS.standard, null, 2)}

Respond with a JSON object containing:
{
  "description": "Clean transaction description",
  "amount": number,
  "currency": "RWF",
  "transactionType": "expense|income|transfer|payment|receipt|adjustment",
  "category": "Specific account category",
  "confidence": number (0-100),
  "reasoning": "Detailed parsing logic",
  "journalEntries": [
    {
      "accountName": "Account name",
      "debit": number,
      "credit": number,
      "description": "Entry description",
      "category": "EXPENSE|REVENUE|ASSET|LIABILITY|EQUITY"
    }
  ],
  "metadata": {
    "vendor": "Vendor name if mentioned",
    "customer": "Customer name if mentioned",
    "reference": "Reference number if mentioned",
    "notes": "Additional notes",
    "tags": ["relevant", "tags"],
    "riskScore": number (0-100),
    "complianceFlags": ["tax", "audit", "regulatory"]
  },
  "validation": {
    "isBalanced": boolean,
    "hasValidAccounts": boolean,
    "followsAccountingRules": boolean,
    "riskLevel": "low|medium|high"
  }
}`;
  }

  private enhancedFallbackParse(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Enhanced amount extraction for purchase transactions
    let amount = 0;
    
    // Look for quantity × unit price pattern (e.g., "200 phones at 2,000 each")
    const quantityPriceMatch = text.match(/(\d+)\s+\w+.*?(?:at|cost of|each|per)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (quantityPriceMatch) {
      const quantity = parseInt(quantityPriceMatch[1]);
      const unitPrice = parseFloat(quantityPriceMatch[2].replace(/,/g, ''));
      amount = quantity * unitPrice;
      console.log(`💰 Calculated amount: ${quantity} × ${unitPrice} = ${amount}`);
    } else {
      // Fallback to simple amount extraction
      const amountMatch = text.match(ENHANCED_ACCOUNTING_PATTERNS.amounts.numbers);
      amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;
      console.log(`💰 Simple amount extraction: ${amount}`);
    }
    
    // Enhanced date extraction
    const extractedDate = this.extractDate(text);
    
    // Enhanced vendor/customer extraction
    const vendor = this.extractVendor(text);
    const customer = this.extractCustomer(text);
    
    // Enhanced transaction type detection
    const transactionType = this.detectTransactionType(text);
    console.log(`🔍 Transaction type detected: "${transactionType}" for text: "${text}"`);
    
    // Enhanced category detection with industry context
    const category = this.detectCategory(text);
    
    // Risk assessment
    const riskScore = this.assessRisk(text, amount);
    const riskLevel = riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low';
    
    // Compliance flags
    const complianceFlags = this.detectComplianceFlags(text);
    
    // Enhanced journal entries
    const journalEntries = this.createEnhancedJournalEntries(transactionType, category, amount, text);
    
    // Validation
    const validation = this.validateTransaction(journalEntries, amount, riskScore);

    return JSON.stringify({
      description: text,
      amount: amount,
      currency: 'RWF',
      transactionType: transactionType,
      category: category,
      confidence: 85, // Higher confidence for enhanced parsing
      reasoning: 'Enhanced rule-based parsing with industry context and risk assessment',
      date: extractedDate.toISOString(),
      journalEntries: journalEntries,
      metadata: {
        vendor: vendor || undefined,
        customer: customer || undefined,
        reference: this.extractReference(text),
        notes: undefined,
        tags: this.generateTags(text, category),
        riskScore: riskScore,
        complianceFlags: complianceFlags
      },
      validation: validation
    });
  }

  private extractDate(text: string): Date {
    // Enhanced date extraction with multiple patterns
    const patterns = [
      /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
      /(\d{1,2})-(\d{1,2})-(\d{4})/i,
      /(\d{4})-(\d{1,2})-(\d{1,2})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return new Date(match[0]);
      }
    }

    // Check for relative dates
    if (text.includes('yesterday')) {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date;
    }
    if (text.includes('last week')) {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date;
    }
    if (text.includes('last month')) {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return date;
    }

    return new Date();
  }

  private extractVendor(text: string): string | null {
    const vendorPatterns = [
      /(?:paid|bought|purchased|charged)\s+(?:to|from|by)\s+([a-zA-Z\s&]+?)(?:\s+\d|$)/i,
      /(?:bill|invoice|receipt)\s+(?:from|by)\s+([a-zA-Z\s&]+?)(?:\s+\d|$)/i,
      /([a-zA-Z\s&]+?)\s+(?:company|corp|inc|ltd|llc|plc)(?:\s+\d|$)/i
    ];

    for (const pattern of vendorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractCustomer(text: string): string | null {
    const customerPatterns = [
      /(?:received|earned|income|payment)\s+(?:from|by)\s+([a-zA-Z\s&]+?)(?:\s+\d|$)/i,
      /(?:sale|invoice|billing)\s+(?:to|for)\s+([a-zA-Z\s&]+?)(?:\s+\d|$)/i
    ];

    for (const pattern of customerPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractReference(text: string): string | null {
    const referencePatterns = [
      /(?:invoice|bill|receipt|ref|reference)\s*(?:#|no|number)?\s*([A-Z0-9-]+)/i,
      /(?:order|po|purchase\s+order)\s*(?:#|no|number)?\s*([A-Z0-9-]+)/i,
      /(?:check|cheque)\s*(?:#|no|number)?\s*([A-Z0-9-]+)/i
    ];

    for (const pattern of referencePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private detectTransactionType(text: string): ParsedTransaction['transactionType'] {
    const lowerText = text.toLowerCase();

    // Check for purchase indicators FIRST (most specific)
    if (ENHANCED_ACCOUNTING_PATTERNS.purchase.keywords.some(keyword => lowerText.includes(keyword))) {
      return 'purchase';
    }

    // Check for income indicators
    if (ENHANCED_ACCOUNTING_PATTERNS.income.keywords.some(keyword => lowerText.includes(keyword))) {
      return 'income';
    }

    // Check for transfer indicators
    if (ENHANCED_ACCOUNTING_PATTERNS.transfer.keywords.some(keyword => lowerText.includes(keyword))) {
      return 'transfer';
    }

    // Check for payment indicators
    if (ENHANCED_ACCOUNTING_PATTERNS.payment.keywords.some(keyword => lowerText.includes(keyword))) {
      return 'payment';
    }

    // Check for receipt indicators
    if (ENHANCED_ACCOUNTING_PATTERNS.receipt.keywords.some(keyword => lowerText.includes(keyword))) {
      return 'receipt';
    }

    // Check for adjustment indicators
    if (ENHANCED_ACCOUNTING_PATTERNS.adjustment.keywords.some(keyword => lowerText.includes(keyword))) {
      return 'adjustment';
    }

    // Default to expense
    return 'expense';
  }

  private detectCategory(text: string): string {
    const lowerText = text.toLowerCase();

    // Enhanced category detection with industry context
    for (const [categoryName, categoryData] of Object.entries(ENHANCED_ACCOUNTING_PATTERNS.categories)) {
      if (categoryData.keywords.some(keyword => lowerText.includes(keyword))) {
        // Check for subcategories
        if (categoryData.subcategories) {
          for (const [subcategoryName, subcategoryKeywords] of Object.entries(categoryData.subcategories)) {
            if (Array.isArray(subcategoryKeywords) && subcategoryKeywords.some(keyword => lowerText.includes(keyword))) {
              return `${categoryName} - ${subcategoryName}`;
            }
          }
        }
        return categoryName;
      }
    }

    return 'Miscellaneous';
  }

  private assessRisk(text: string, amount: number): number {
    let riskScore = 0;
    const lowerText = text.toLowerCase();

    // Amount-based risk
    if (amount > 1000000) riskScore += 30; // Large amounts
    if (amount > 100000) riskScore += 20;
    if (amount > 10000) riskScore += 10;

    // Text-based risk indicators
    if (ENHANCED_ACCOUNTING_PATTERNS.risk.high.some(keyword => lowerText.includes(keyword))) {
      riskScore += 25;
    }
    if (ENHANCED_ACCOUNTING_PATTERNS.risk.medium.some(keyword => lowerText.includes(keyword))) {
      riskScore += 15;
    }

    // Compliance risk
    if (ENHANCED_ACCOUNTING_PATTERNS.compliance.fraud.some(keyword => lowerText.includes(keyword))) {
      riskScore += 40;
    }

    // Unusual patterns
    if (text.includes('cash') && amount > 50000) riskScore += 20; // Large cash transactions
    if (text.includes('anonymous') || text.includes('unknown')) riskScore += 30;

    return Math.min(100, riskScore);
  }

  private detectComplianceFlags(text: string): string[] {
    const flags: string[] = [];
    const lowerText = text.toLowerCase();

    if (ENHANCED_ACCOUNTING_PATTERNS.compliance.tax.some(keyword => lowerText.includes(keyword))) {
      flags.push('tax');
    }
    if (ENHANCED_ACCOUNTING_PATTERNS.compliance.audit.some(keyword => lowerText.includes(keyword))) {
      flags.push('audit');
    }
    if (ENHANCED_ACCOUNTING_PATTERNS.compliance.regulatory.some(keyword => lowerText.includes(keyword))) {
      flags.push('regulatory');
    }
    if (ENHANCED_ACCOUNTING_PATTERNS.compliance.fraud.some(keyword => lowerText.includes(keyword))) {
      flags.push('fraud');
    }

    return flags;
  }

  private generateTags(text: string, category: string): string[] {
    const tags: string[] = [];
    const lowerText = text.toLowerCase();

    // Add category-based tags
    tags.push(category.toLowerCase());

    // Add industry-specific tags
    for (const [industry, keywords] of Object.entries(ENHANCED_ACCOUNTING_PATTERNS.industries)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        tags.push(industry);
      }
    }

    // Add transaction type tags
    if (lowerText.includes('recurring') || lowerText.includes('subscription')) {
      tags.push('recurring');
    }
    if (lowerText.includes('urgent') || lowerText.includes('emergency')) {
      tags.push('urgent');
    }

    return tags;
  }

  private detectPaymentAccount(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    // Bank/Electronic payment indicators
    if (lowerDesc.includes('bank') || lowerDesc.includes('x-bank') || lowerDesc.includes('transfer')) {
      return 'Bank Account';
    }
    
    // Mobile money indicators
    if (lowerDesc.includes('mobile money') || lowerDesc.includes('momo') || lowerDesc.includes('airtel money')) {
      return 'Mobile Money';
    }
    
    // Credit card indicators
    if (lowerDesc.includes('card') || lowerDesc.includes('visa') || lowerDesc.includes('mastercard')) {
      return 'Credit Card';
    }
    
    // Default to cash
    return 'Cash';
  }

  private createEnhancedJournalEntries(
    transactionType: string, 
    category: string, 
    amount: number, 
    description: string
  ): JournalEntry[] {
    const entries: JournalEntry[] = [];

    switch (transactionType) {
      case 'purchase':
        entries.push({
          accountId: '',
          accountName: 'Inventory',
          debit: amount,
          credit: 0,
          description: description,
          category: 'ASSET'
        });
        entries.push({
          accountId: '',
          accountName: this.detectPaymentAccount(description),
          debit: 0,
          credit: amount,
          description: 'Payment for purchase',
          category: 'ASSET'
        });
        break;

      case 'expense':
        entries.push({
          accountId: '',
          accountName: category,
          debit: amount,
          credit: 0,
          description: description,
          category: 'EXPENSE'
        });
        entries.push({
          accountId: '',
          accountName: 'Cash/Bank',
          debit: 0,
          credit: amount,
          description: 'Cash/Bank payment',
          category: 'ASSET'
        });
        break;

      case 'income':
        entries.push({
          accountId: '',
          accountName: 'Cash/Bank',
          debit: amount,
          credit: 0,
          description: description,
          category: 'ASSET'
        });
        entries.push({
          accountId: '',
          accountName: category,
          debit: 0,
          credit: amount,
          description: 'Revenue recognized',
          category: 'REVENUE'
        });
        break;

      case 'transfer':
        entries.push({
          accountId: '',
          accountName: 'Bank Account',
          debit: amount,
          credit: 0,
          description: description,
          category: 'ASSET'
        });
        entries.push({
          accountId: '',
          accountName: 'Cash',
          debit: 0,
          credit: amount,
          description: 'Transfer out',
          category: 'ASSET'
        });
        break;

      default:
        // Default fallback
        entries.push({
          accountId: '',
          accountName: 'Cash/Bank',
          debit: amount,
          credit: 0,
          description: description,
          category: 'ASSET'
        });
        entries.push({
          accountId: '',
          accountName: category,
          debit: 0,
          credit: amount,
          description: description,
          category: 'EXPENSE'
        });
    }

    return entries;
  }

  private validateTransaction(entries: JournalEntry[], amount: number, riskScore: number): ParsedTransaction['validation'] {
    const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredits = entries.reduce((sum, entry) => sum + entry.credit, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
    const hasValidAccounts = entries.every(entry => entry.accountName && entry.accountName.length > 0);
    const followsAccountingRules = entries.length >= 2 && isBalanced;

    return {
      isBalanced,
      hasValidAccounts,
      followsAccountingRules,
      riskLevel: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low'
    };
  }

  // Public methods
  async parseNaturalLanguage(
    text: string,
    tenantId: string,
    companyId: string
  ): Promise<ParsedPrompt> {
    const systemPrompt = this.getEnhancedSystemPrompt();
    const prompt = `Parse this natural language transaction into accounting entries:\n\n"${text}"\n\nRespond with only the JSON object.`;

    try {
      // TEMPORARY: Skip AI and use enhanced fallback directly
      console.log('🚀 Using enhanced fallback parsing (AI providers disabled for reliability)');
      const fallbackResponse = this.enhancedFallbackParse(text);
      const parsed = JSON.parse(fallbackResponse);

      // Enhanced normalization and validation
      const normalized = this.normalizeParsedTransaction(parsed, text);
      const validationErrors = this.validateParsedTransaction(normalized);
      const aiInsights = this.generateAIInsights(normalized, text);

      return {
        originalText: text,
        parsedTransaction: normalized,
        confidence: normalized.confidence || 0,
        reasoning: parsed.reasoning || 'Enhanced AI parsing with validation',
        suggestions: this.generateSuggestions(normalized),
        validationErrors,
        aiInsights
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.createErrorResponse(text, 'Failed to parse AI response');
    }
  }

  private normalizeParsedTransaction(parsed: any, originalText: string): ParsedTransaction {
    return {
      description: parsed.description || originalText,
      amount: Number(parsed.amount || 0),
      currency: parsed.currency || 'RWF',
      date: new Date(parsed.date || new Date().toISOString()),
      transactionType: (parsed.transactionType || 'expense') as ParsedTransaction['transactionType'],
      category: parsed.category || 'Miscellaneous',
      confidence: Number(parsed.confidence || 0),
      journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [],
      metadata: {
        vendor: parsed.metadata?.vendor,
        customer: parsed.metadata?.customer,
        account: parsed.metadata?.account,
        reference: parsed.metadata?.reference,
        notes: parsed.metadata?.notes,
        tags: parsed.metadata?.tags || [],
        riskScore: parsed.metadata?.riskScore || 0,
        complianceFlags: parsed.metadata?.complianceFlags || []
      },
      validation: parsed.validation || {
        isBalanced: false,
        hasValidAccounts: false,
        followsAccountingRules: false,
        riskLevel: 'low'
      }
    };
  }

  private validateParsedTransaction(parsed: ParsedTransaction): string[] {
    const errors: string[] = [];

    if (!parsed.amount || parsed.amount <= 0) {
      errors.push('Invalid or missing amount');
    }

    if (!parsed.transactionType) {
      errors.push('Missing transaction type');
    }

    if (!parsed.category) {
      errors.push('Missing category');
    }

    if (!parsed.journalEntries || !Array.isArray(parsed.journalEntries)) {
      errors.push('Missing or invalid journal entries');
    }

    // Enhanced validation
    if (parsed.journalEntries && Array.isArray(parsed.journalEntries)) {
      const totalDebits = parsed.journalEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
      const totalCredits = parsed.journalEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        errors.push('Journal entries do not balance');
      }

      if (parsed.journalEntries.length < 2) {
        errors.push('Transaction must have at least 2 journal entries');
      }
    }

    // Risk validation
    if (parsed.metadata?.riskScore > 80) {
      errors.push('High-risk transaction requires review');
    }

    return errors;
  }

  private generateAIInsights(parsed: ParsedTransaction, originalText: string): ParsedPrompt['aiInsights'] {
    const insights = {
      suggestedTags: parsed.metadata?.tags || [],
      riskFactors: [] as string[],
      complianceNotes: [] as string[],
      optimizationSuggestions: [] as string[]
    };

    // Risk factors
    if (parsed.metadata?.riskScore > 70) {
      insights.riskFactors.push('High-risk transaction detected');
    }
    if (parsed.amount > 100000) {
      insights.riskFactors.push('Large amount transaction');
    }

    // Compliance notes
    if (parsed.metadata?.complianceFlags.includes('tax')) {
      insights.complianceNotes.push('Tax-related transaction - ensure proper documentation');
    }
    if (parsed.metadata?.complianceFlags.includes('audit')) {
      insights.complianceNotes.push('Audit-related transaction - maintain detailed records');
    }

    // Optimization suggestions
    if (parsed.confidence < 80) {
      insights.optimizationSuggestions.push('Consider adding more context for better categorization');
    }
    if (!parsed.metadata?.vendor && parsed.transactionType === 'expense') {
      insights.optimizationSuggestions.push('Add vendor information for better tracking');
    }

    return insights;
  }

  private generateSuggestions(parsed: ParsedTransaction): string[] {
    const suggestions: string[] = [];

    if (parsed.confidence < 80) {
      suggestions.push('Consider reviewing the category assignment');
    }

    if (!parsed.metadata?.vendor && parsed.transactionType === 'expense') {
      suggestions.push('Add vendor information for better tracking');
    }

    if (!parsed.metadata?.reference) {
      suggestions.push('Add reference number for audit trail');
    }

    if (parsed.amount > 10000) {
      suggestions.push('Large transaction - consider adding approval workflow');
    }

    if (parsed.metadata?.riskScore > 70) {
      suggestions.push('High-risk transaction - requires additional review');
    }

    return suggestions;
  }

  private createErrorResponse(text: string, error: string): ParsedPrompt {
    return {
      originalText: text,
      parsedTransaction: {
        description: text,
        amount: 0,
        currency: 'RWF',
        date: new Date(),
        transactionType: 'expense',
        category: 'Miscellaneous',
        confidence: 0,
        journalEntries: [],
        metadata: {
          vendor: undefined,
          customer: undefined,
          account: undefined,
          reference: undefined,
          notes: undefined,
          tags: [],
          riskScore: 0,
          complianceFlags: []
        },
        validation: {
          isBalanced: false,
          hasValidAccounts: false,
          followsAccountingRules: false,
          riskLevel: 'low'
        }
      },
      confidence: 0,
      reasoning: error,
      suggestions: ['Try rephrasing the transaction description'],
      validationErrors: [error],
      aiInsights: {
        suggestedTags: [],
        riskFactors: [],
        complianceNotes: [],
        optimizationSuggestions: []
      }
    };
  }

  // Additional utility methods
  async batchParse(
    texts: string[],
    tenantId: string,
    companyId: string
  ): Promise<ParsedPrompt[]> {
    const results: ParsedPrompt[] = [];
    
    for (const text of texts) {
      try {
        const parsed = await this.parseNaturalLanguage(text, tenantId, companyId);
        results.push(parsed);
      } catch (error) {
        console.error(`Failed to parse: ${text}`, error);
        results.push(this.createErrorResponse(text, 'Parsing failed'));
      }
    }

    return results;
  }

  async suggestImprovements(text: string): Promise<string[]> {
    const suggestions: string[] = [];

    if (!text.match(ENHANCED_ACCOUNTING_PATTERNS.amounts.numbers)) {
      suggestions.push('Include the amount in your description');
    }

    if (!ENHANCED_ACCOUNTING_PATTERNS.amounts.currency.codes.some(currency => text.toUpperCase().includes(currency))) {
      suggestions.push('Specify the currency (e.g., RWF, USD)');
    }

    if (text.length < 10) {
      suggestions.push('Provide more details about the transaction');
    }

    const hasActionWords = ENHANCED_ACCOUNTING_PATTERNS.expense.keywords.some(word => text.includes(word)) ||
                          ENHANCED_ACCOUNTING_PATTERNS.income.keywords.some(word => text.includes(word));
    
    if (!hasActionWords) {
      suggestions.push('Use action words like "paid", "received", "bought", or "sold"');
    }

    return suggestions;
  }
}

export const enhancedConversationalParser = new EnhancedConversationalParser();
