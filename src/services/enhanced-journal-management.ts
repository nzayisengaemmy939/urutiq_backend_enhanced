import { prisma } from '../prisma.js';
import { EnhancedConversationalAIService } from './enhanced-conversational-ai.js';
import { Decimal } from '@prisma/client/runtime/library';

// Enhanced Journal Management Interfaces
export interface JournalEntryRequest {
  companyId: string | null;
  tenantId: string;
  date: Date;
  reference: string;
  description: string;
  entries: JournalLine[];
  source: 'manual' | 'ai_generated' | 'bank_reconciliation' | 'invoice' | 'receipt';
  metadata?: {
    confidence?: number;
    aiSuggestions?: string[];
    validationWarnings?: string[];
    complianceNotes?: string[];
    voidReason?: string;
    originalEntryId?: string;
    voidedBy?: string;
    transactionType?: string;
  };
}

export interface JournalLine {
  id?: string;
  accountId: string;
  debit: Decimal;
  credit: Decimal;
  description?: string;
  reference?: string;
  metadata?: {
    category?: string;
    vendor?: string;
    customer?: string;
    project?: string;
    department?: string;
    voidReason?: string;
    originalEntryId?: string;
    voidedBy?: string;
    transactionType?: string;
  };
}

export interface JournalEntry {
  id: string;
  companyId: string | null;
  tenantId: string;
  date: Date;
  reference: string | null;
  memo?: string | null;
  status: string;
  lines: JournalLine[];
  metadata?: any;
  createdAt: Date;
  createdById?: string | null;
}

export interface ChartOfAccounts {
  id: string;
  name: string;
  code: string;
  typeId: string;
  parentId?: string;
  children?: ChartOfAccounts[];
  isActive: boolean;
  metadata?: {
    industry?: string;
    compliance?: string[];
    suggestedCategories?: string[];
  };
}

export interface LedgerEntry {
  id: string;
  accountId: string;
  journalEntryId: string;
  date: Date;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  reference: string;
  metadata?: any;
}

export interface JournalValidationResult {
  isValid: boolean;
  isBalanced: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  complianceIssues: string[];
}

export interface AccountSuggestion {
  accountId: string;
  accountName: string;
  accountCode: string;
  confidence: number;
  reasoning: string;
  suggestedCategory?: string;
}

export interface LedgerBalance {
  accountId: string;
  accountName: string;
  accountCode: string;
  openingBalance: number;
  currentBalance: number;
  periodDebit: number;
  periodCredit: number;
  lastTransactionDate?: Date;
}

// Enhanced Journal Management Service
export class EnhancedJournalManagementService {
  private conversationalAI: EnhancedConversationalAIService;

  constructor() {
    this.conversationalAI = new EnhancedConversationalAIService();
  }

  // Create AI-powered journal entry
  async createJournalEntry(request: JournalEntryRequest): Promise<JournalEntry> {
    // Validate the request
    const validation = await this.validateJournalEntry(request);
    if (!validation.isValid) {
      throw new Error(`Journal entry validation failed: ${validation.errors.join(', ')}`);
    }

    // Ensure double-entry bookkeeping
    const balancedEntries = await this.ensureDoubleEntry(request.entries);

    // Create the journal entry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        companyId: request.companyId,
        tenantId: request.tenantId,
        date: request.date,
        memo: request.description,
        reference: request.reference,
        status: 'DRAFT',
        createdById: 'demo-user-id'
      }
    });

    // Create journal lines
    for (const entry of balancedEntries) {
      await prisma.journalLine.create({
        data: {
          tenantId: request.tenantId,
          entryId: journalEntry.id,
          accountId: entry.accountId,
          debit: entry.debit,
          credit: entry.credit,
          memo: entry.description
        }
      });
    }

    // 📦 Update inventory for purchase transactions
    if (request.description && this.isPurchaseTransaction(request.description)) {
      await this.updateInventoryFromJournalEntry(
        request.description,
        balancedEntries.reduce((sum, entry) => sum + entry.debit.toNumber(), 0),
        request.companyId,
        request.tenantId || 'tenant_demo'
      );
    }

    // Note: Ledger balance updates would be implemented when LedgerEntry model is added to schema

    return {
      id: journalEntry.id,
      tenantId: journalEntry.tenantId,
      companyId: journalEntry.companyId,
      date: journalEntry.date,
      memo: journalEntry.memo,
      reference: journalEntry.reference,
      status: journalEntry.status,
      lines: balancedEntries,
      metadata: request.metadata,
      createdAt: journalEntry.createdAt,
      createdById: journalEntry.createdById
    };
  }

  // 🎯 Create journal entry from user-selected account suggestions
  private async createJournalEntryFromSelectedSuggestions(
    description: string,
    amount: number,
    companyId: string,
    selectedSuggestions: any[],
    context?: any,
    tenantId: string = 'tenant_demo'
  ): Promise<JournalEntryRequest> {
    
    try {
      // DIRECTLY use the user's selected accounts - no AI override!
      const entries: JournalLine[] = [];
      const selectedAccountNames = selectedSuggestions.map(s => s.accountName).join(', ');
      
      
      if (selectedSuggestions.length >= 2) {
        // User selected multiple accounts - create balanced entry
        
        // Determine transaction nature to decide debit/credit logic
        const isExpensePaid = description.toLowerCase().includes('paid') || 
                            description.toLowerCase().includes('expense') ||
                            description.toLowerCase().includes('cost') ||
                            description.toLowerCase().includes('purchase');
        
        const isRevenue = description.toLowerCase().includes('received') ||
                         description.toLowerCase().includes('income') ||
                         description.toLowerCase().includes('revenue') ||
                         description.toLowerCase().includes('sale');
        
        // Look for cash/bank accounts vs expense/revenue accounts
        const cashAccounts = selectedSuggestions.filter(s => 
          s.accountName.toLowerCase().includes('cash') ||
          s.accountName.toLowerCase().includes('bank') ||
          s.accountName.toLowerCase().includes('checking') ||
          s.accountName.toLowerCase().includes('savings')
        );
        
        const operatingAccounts = selectedSuggestions.filter(s => 
          !s.accountName.toLowerCase().includes('cash') &&
          !s.accountName.toLowerCase().includes('bank') &&
          !s.accountName.toLowerCase().includes('checking') &&
          !s.accountName.toLowerCase().includes('savings')
        );
        
        if (isExpensePaid && cashAccounts.length > 0 && operatingAccounts.length > 0) {
          // Expense payment: Debit expense account, Credit cash account
          const expenseAccount = operatingAccounts[0];
          const cashAccount = cashAccounts[0];
          
          const expenseAccountId = await this.getAccountIdFromName(expenseAccount.accountName, companyId, tenantId);
          const cashAccountId = await this.getAccountIdFromName(cashAccount.accountName, companyId, tenantId);
          
          entries.push({
            accountId: expenseAccountId,
            debit: new Decimal(amount),
            credit: new Decimal(0),
            description: `${description} - ${expenseAccount.accountName}`
          });
          
          entries.push({
            accountId: cashAccountId,
            debit: new Decimal(0),
            credit: new Decimal(amount),
            description: `${description} - ${cashAccount.accountName}`
          });
          
        } else if (isRevenue && cashAccounts.length > 0 && operatingAccounts.length > 0) {
          // Revenue receipt: Debit cash account, Credit revenue account
          const revenueAccount = operatingAccounts[0];
          const cashAccount = cashAccounts[0];
          
          const revenueAccountId = await this.getAccountIdFromName(revenueAccount.accountName, companyId, tenantId);
          const cashAccountId = await this.getAccountIdFromName(cashAccount.accountName, companyId, tenantId);
          
          entries.push({
            accountId: cashAccountId,
            debit: new Decimal(amount),
            credit: new Decimal(0),
            description: `${description} - ${cashAccount.accountName}`
          });
          
          entries.push({
            accountId: revenueAccountId,
            debit: new Decimal(0),
            credit: new Decimal(amount),
            description: `${description} - ${revenueAccount.accountName}`
          });
          
        } else {
          // General case: Use first account as debit, second as credit
          const debitAccount = selectedSuggestions[0];
          const creditAccount = selectedSuggestions[1];
          
          const debitAccountId = await this.getAccountIdFromName(debitAccount.accountName, companyId, tenantId);
          const creditAccountId = await this.getAccountIdFromName(creditAccount.accountName, companyId, tenantId);
          
          entries.push({
            accountId: debitAccountId,
            debit: new Decimal(amount),
            credit: new Decimal(0),
            description: `${description} - ${debitAccount.accountName}`
          });
          
          entries.push({
            accountId: creditAccountId,
            debit: new Decimal(0),
            credit: new Decimal(amount),
            description: `${description} - ${creditAccount.accountName}`
          });
        }
        
      } else if (selectedSuggestions.length === 1) {
        // User selected one account - determine contra account intelligently
        const selectedAccount = selectedSuggestions[0];
        const selectedAccountId = await this.getAccountIdFromName(selectedAccount.accountName, companyId, tenantId);
        
        // Determine contra account based on selected account type and transaction
        const isCashAccount = selectedAccount.accountName.toLowerCase().includes('cash') ||
                            selectedAccount.accountName.toLowerCase().includes('bank');
        
        const isExpenseAccount = selectedAccount.accountName.toLowerCase().includes('expense') ||
                               selectedAccount.accountName.toLowerCase().includes('cost');
        
        const isRevenueAccount = selectedAccount.accountName.toLowerCase().includes('revenue') ||
                               selectedAccount.accountName.toLowerCase().includes('income') ||
                               selectedAccount.accountName.toLowerCase().includes('sales');
        
        if (isExpenseAccount) {
          // User selected expense account - contra is cash (credit)
          const cashAccountId = await this.getAccountIdFromName('Cash', companyId, tenantId);
          
          entries.push({
            accountId: selectedAccountId,
            debit: new Decimal(amount),
            credit: new Decimal(0),
            description: `${description} - ${selectedAccount.accountName} (User Selected)`
          });
          
          entries.push({
            accountId: cashAccountId,
            debit: new Decimal(0),
            credit: new Decimal(amount),
            description: `${description} - Cash`
          });
          
        } else if (isRevenueAccount) {
          // User selected revenue account - contra is cash (debit)
          const cashAccountId = await this.getAccountIdFromName('Cash', companyId, tenantId);
          
          entries.push({
            accountId: cashAccountId,
            debit: new Decimal(amount),
            credit: new Decimal(0),
            description: `${description} - Cash`
          });
          
          entries.push({
            accountId: selectedAccountId,
            debit: new Decimal(0),
            credit: new Decimal(amount),
            description: `${description} - ${selectedAccount.accountName} (User Selected)`
          });
          
        } else if (isCashAccount) {
          // User selected cash account - determine if it's debit or credit based on transaction
          const isExpensePaid = description.toLowerCase().includes('paid') || 
                              description.toLowerCase().includes('expense');
          
          if (isExpensePaid) {
            // Cash is being credited (going out)
            const expenseAccountId = await this.getAccountIdFromName('General Expense', companyId, tenantId);
            
            entries.push({
              accountId: expenseAccountId,
              debit: new Decimal(amount),
              credit: new Decimal(0),
              description: `${description} - General Expense`
            });
            
            entries.push({
              accountId: selectedAccountId,
              debit: new Decimal(0),
              credit: new Decimal(amount),
              description: `${description} - ${selectedAccount.accountName} (User Selected)`
            });
          } else {
            // Cash is being debited (coming in)
            const revenueAccountId = await this.getAccountIdFromName('General Revenue', companyId, tenantId);
            
            entries.push({
              accountId: selectedAccountId,
              debit: new Decimal(amount),
              credit: new Decimal(0),
              description: `${description} - ${selectedAccount.accountName} (User Selected)`
            });
            
            entries.push({
              accountId: revenueAccountId,
              debit: new Decimal(0),
              credit: new Decimal(amount),
              description: `${description} - General Revenue`
            });
          }
        } else {
          // Default: treat as expense account
          const cashAccountId = await this.getAccountIdFromName('Cash', companyId, tenantId);
          
          entries.push({
            accountId: selectedAccountId,
            debit: new Decimal(amount),
            credit: new Decimal(0),
            description: `${description} - ${selectedAccount.accountName} (User Selected)`
          });
          
          entries.push({
            accountId: cashAccountId,
            debit: new Decimal(0),
            credit: new Decimal(amount),
            description: `${description} - Cash`
          });
        }
      } else {
        throw new Error('At least one account suggestion must be selected');
      }
      
      
      return {
        companyId,
        tenantId: tenantId,
        date: new Date(),
        reference: `UserSelected-${Date.now()}`,
        description,
        entries: entries,
        source: 'user_selected',
        metadata: {
          confidence: 0.98, // Very high confidence - user chose the accounts
          aiModel: 'user-selected-accounts',
          processingLevel: 'user-guided',
          selectedSuggestions: selectedSuggestions.map(s => s.accountName),
          userSelectionCount: selectedSuggestions.length,
          validationPassed: true,
          reasoning: `Direct use of user's selected accounts: ${selectedAccountNames}`,
          userSelectedAccountIds: selectedSuggestions.map(s => s.accountId),
        }
      };
      
    } catch (error) {
      console.error('Error in createJournalEntryFromSelectedSuggestions:', error);
      throw error;
    }
  }


  // 🧠 Senior AI: Validate transaction description quality
  private isValidTransactionDescription(description: string): boolean {
    if (!description || description.trim().length < 3) return false;
    
    // Check for meaningless patterns
    const meaninglessPatterns = [
      /^[a-z]+$/i,                    // Just letters like "nnn", "abc", "test"
      /^[0-9]+$/,                     // Just numbers like "123", "999"
      /^(.)\1{2,}$/,                  // Repeated characters like "aaa", "xxx"
      /^(test|abc|nnn|zzz|xxx)$/i,    // Common meaningless test strings
    ];
    
    for (const pattern of meaninglessPatterns) {
      if (pattern.test(description.trim())) {
        return false;
      }
    }
    
    // Should contain at least one meaningful word
    const meaningfulWords = [
      'paid', 'received', 'purchase', 'sale', 'rent', 'salary', 'expense', 'income',
      'revenue', 'cost', 'fee', 'service', 'product', 'invoice', 'bill', 'payment',
      'cash', 'check', 'transfer', 'deposit', 'withdrawal', 'refund', 'discount'
    ];
    
    const lowerDesc = description.toLowerCase();
    return meaningfulWords.some(word => lowerDesc.includes(word));
  }

  // 🧠 Senior AI-powered journal entry generation
  async generateJournalEntry(
    description: string,
    amount: number,
    companyId: string,
    context?: {
      category?: string;
      vendor?: string;
      customer?: string;
      transactionType?: 'sale' | 'purchase' | 'expense' | 'payment' | 'receipt';
      processingLevel?: string;
      autoExtractedAmount?: boolean;
      validationPassed?: boolean;
      selectedAccountSuggestions?: any[];
      useSelectedSuggestions?: boolean;
    },
    tenantId: string = 'tenant_demo'
  ): Promise<JournalEntryRequest> {
    try {
      
      // Check if user selected specific account suggestions
      if (context?.useSelectedSuggestions && context?.selectedAccountSuggestions?.length > 0) {
        return await this.createJournalEntryFromSelectedSuggestions(
          description, 
          amount, 
          companyId, 
          context.selectedAccountSuggestions,
          context,
          tenantId
        );
      }
      
      // Validate transaction description quality
      if (!this.isValidTransactionDescription(description)) {
        throw new Error('Please provide a meaningful transaction description like "Paid rent" or "Received payment".');
      }

      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please provide a valid positive amount.');
      }

      // Detect currency from description or context
      const currencyMatch = description.match(/(?:RWF|USD|EUR|GBP|\$|€|£)/i);
      const detectedCurrency = currencyMatch ? currencyMatch[0].toUpperCase() : 'USD';
      const currencySymbol = detectedCurrency === 'RWF' ? 'RWF' : 
                            detectedCurrency === 'EUR' ? '€' : 
                            detectedCurrency === 'GBP' ? '£' : '$';

      const aiContext = {
        userId: 'demo-user-id',
        companyId,
        tenantId: 'demo-tenant-id',
        sessionId: `journal-generation-${Date.now()}`,
        conversationHistory: [],
        userPreferences: {
          language: 'en',
          currency: detectedCurrency,
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

      // 🚀 DIRECT ENHANCED FALLBACK - Skip AI complexity and use reliable parsing
      
      // Create journal entries directly from enhanced parsing logic
      const entries = await this.createEnhancedJournalEntries(description, amount, companyId, tenantId);
      
      return {
        companyId,
        tenantId: tenantId,
        date: new Date(),
        reference: `SeniorAI-${Date.now()}`,
        description,
        entries: entries,
        source: 'ai_generated',
        metadata: {
          confidence: 0.95, // High confidence for enhanced fallback
          processingLevel: context?.processingLevel || 'enhanced_fallback',
          autoExtractedAmount: context?.autoExtractedAmount || false,
          validationPassed: context?.validationPassed || true,
          validationWarnings: [],
          complianceNotes: [],
          reasoning: 'Enhanced fallback parsing with smart transaction detection'
        }
      };
    } catch (error) {
      // 🧠 Senior AI: Enhanced error handling
      if (error instanceof Error && error.message && (error.message.includes('meaningless') || error.message.includes('invalid'))) {
        throw error; // Re-throw validation errors to frontend
      }
      
      // Fallback to basic journal entry with real account IDs
      return await this.createBasicJournalEntry(description, amount, companyId, context, tenantId);
    }
  }

  // 🚀 Create enhanced journal entries using smart parsing logic
  private async createEnhancedJournalEntries(
    description: string,
    amount: number,
    companyId: string,
    tenantId: string
  ): Promise<JournalLine[]> {
    const lowerDesc = description.toLowerCase();
    
    // Enhanced amount calculation for purchase transactions
    let finalAmount = amount;
    
    // Look for quantity × unit price pattern (e.g., "200 phones at 2,000 each")
    const quantityPriceMatch = description.match(/(\d+)\s+\w+.*?(?:at|cost of|each|per)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (quantityPriceMatch) {
      const quantity = parseInt(quantityPriceMatch[1]);
      const unitPrice = parseFloat(quantityPriceMatch[2].replace(/,/g, ''));
      finalAmount = quantity * unitPrice;
    }
    
    // Detect transaction type
    let transactionType = 'expense'; // default
    if (lowerDesc.includes('purchased') || lowerDesc.includes('bought') || lowerDesc.includes('acquired')) {
      transactionType = 'purchase';
    } else if (lowerDesc.includes('sold') || lowerDesc.includes('sale') || lowerDesc.includes('revenue')) {
      transactionType = 'income';
    }
    
    // Detect payment method
    let paymentAccount = 'Cash';
    if (lowerDesc.includes('bank') || lowerDesc.includes('x-bank')) {
      paymentAccount = 'Bank Account';
    } else if (lowerDesc.includes('mobile money') || lowerDesc.includes('momo')) {
      paymentAccount = 'Mobile Money';
    } else if (lowerDesc.includes('card') || lowerDesc.includes('credit')) {
      paymentAccount = 'Credit Card';
    }
    
    const entries: JournalLine[] = [];
    
    // Create journal entries based on transaction type
    if (transactionType === 'purchase') {
      // Purchase: Dr. Payment Account, Cr. Inventory
      const inventoryAccountId = await this.getAccountIdFromName('Inventory', companyId, tenantId);
      const paymentAccountId = await this.getAccountIdFromName(paymentAccount, companyId, tenantId);
      
      entries.push({
        accountId: paymentAccountId,
        debit: new Decimal(finalAmount),
        credit: new Decimal(0),
        description: `Payment for: ${description}`
      });
      
      entries.push({
        accountId: inventoryAccountId,
        debit: new Decimal(0),
        credit: new Decimal(finalAmount),
        description: `Inventory purchase: ${description}`
      });
    } else if (transactionType === 'income') {
      // Sale: Dr. Payment Account, Cr. Revenue
      const paymentAccountId = await this.getAccountIdFromName(paymentAccount, companyId, tenantId);
      const revenueAccountId = await this.getAccountIdFromName('Revenue', companyId, tenantId);
      
      entries.push({
        accountId: paymentAccountId,
        debit: new Decimal(finalAmount),
        credit: new Decimal(0),
        description: `Payment received: ${description}`
      });
      
      entries.push({
        accountId: revenueAccountId,
        debit: new Decimal(0),
        credit: new Decimal(finalAmount),
        description: `Revenue from: ${description}`
      });
    } else {
      // Default expense: Dr. Expense, Cr. Payment Account
      const expenseAccountId = await this.getAccountIdFromName('Expenses', companyId, tenantId);
      const paymentAccountId = await this.getAccountIdFromName(paymentAccount, companyId, tenantId);
      
      entries.push({
        accountId: expenseAccountId,
        debit: new Decimal(finalAmount),
        credit: new Decimal(0),
        description: `Expense: ${description}`
      });
      
      entries.push({
        accountId: paymentAccountId,
        debit: new Decimal(0),
        credit: new Decimal(finalAmount),
        description: `Payment for: ${description}`
      });
    }
    
    return entries;
  }

  // Parse AI-generated journal entry
  private async parseAIJournalEntry(
    message: string, 
    totalAmount: number, 
    companyId: string, 
    tenantId: string = 'tenant_demo'
  ): Promise<JournalLine[]> {
    const entries: JournalLine[] = [];
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (line.includes('Account:') && line.includes('Debit:') && line.includes('Credit:')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 4) {
          const accountName = parts[0].replace('Account:', '').trim();
          const debitStr = parts[1].replace('Debit:', '').trim();
          const creditStr = parts[2].replace('Credit:', '').trim();
          const description = parts[3].replace('Description:', '').trim();
          
          const debit = new Decimal(parseFloat(debitStr) || 0);
          const credit = new Decimal(parseFloat(creditStr) || 0);
          
          try {
            // Get account ID from database lookup
            const accountId = await this.getAccountIdFromName(accountName, companyId, tenantId);
          
            entries.push({
              accountId,
              debit,
              credit,
              description
            });
          } catch (error) {
            console.warn(`Could not find account for "${accountName}":`, error);
          }
        }
      }
    }
    
    // If no valid entries found, create a smart entry based on transaction analysis
    if (entries.length === 0) {
      try {
        const transactionType = this.analyzeTransactionType(message);
        
        if (transactionType === 'purchase') {
          // Purchase transaction: Dr. Inventory/Assets, Cr. Cash/Bank
          const inventoryAccountId = await this.getAccountIdFromName('inventory', companyId, tenantId);
          const paymentMethod = this.detectPaymentMethod(message);
          const paymentAccountId = await this.getAccountIdFromName(paymentMethod, companyId, tenantId);
          
          entries.push({
            accountId: inventoryAccountId,
            debit: new Decimal(totalAmount),
            credit: new Decimal(0),
            description: 'Inventory purchased'
          });
          entries.push({
            accountId: paymentAccountId,
            debit: new Decimal(0),
            credit: new Decimal(totalAmount),
            description: `Payment via ${paymentMethod}`
          });
        } else if (transactionType === 'sale') {
          // Sale transaction: Dr. Cash/Bank, Cr. Revenue
          const paymentMethod = this.detectPaymentMethod(message);
          const paymentAccountId = await this.getAccountIdFromName(paymentMethod, companyId, tenantId);
          const revenueAccountId = await this.getAccountIdFromName('revenue', companyId, tenantId);
          
          entries.push({
            accountId: paymentAccountId,
            debit: new Decimal(totalAmount),
            credit: new Decimal(0),
            description: `Payment received via ${paymentMethod}`
          });
          entries.push({
            accountId: revenueAccountId,
            debit: new Decimal(0),
            credit: new Decimal(totalAmount),
            description: 'Revenue recognition'
          });
        } else {
          // Default to expense transaction
          const expenseAccountId = await this.getAccountIdFromName('expense', companyId, tenantId);
          const cashAccountId = await this.getAccountIdFromName('cash', companyId, tenantId);
          
          entries.push({
            accountId: expenseAccountId,
            debit: new Decimal(totalAmount),
            credit: new Decimal(0),
            description: 'Expense incurred'
          });
          entries.push({
            accountId: cashAccountId,
            debit: new Decimal(0),
            credit: new Decimal(totalAmount),
            description: 'Cash paid'
          });
        }
      } catch (error) {
        console.error('Failed to create smart entries with real accounts:', error);
        throw new Error('Could not find appropriate accounts for journal entry');
      }
    }
    
    return entries;
  }

  // Analyze transaction type from description
  private analyzeTransactionType(description: string): 'purchase' | 'sale' | 'expense' {
    const lowerDesc = description.toLowerCase();
    
    // Purchase indicators
    const purchaseKeywords = ['purchased', 'bought', 'acquire', 'procure', 'buy', 'purchase', 'from'];
    const isPurchase = purchaseKeywords.some(keyword => lowerDesc.includes(keyword));
    
    // Sale indicators  
    const saleKeywords = ['sold', 'sale', 'revenue', 'income', 'received from customer', 'payment from'];
    const isSale = saleKeywords.some(keyword => lowerDesc.includes(keyword));
    
    if (isPurchase) return 'purchase';
    if (isSale) return 'sale';
    return 'expense'; // Default
  }

  // Detect payment method from description
  private detectPaymentMethod(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    // Bank/Electronic payment indicators
    if (lowerDesc.includes('bank') || lowerDesc.includes('x-bank') || lowerDesc.includes('transfer')) {
      return 'bank';
    }
    
    // Mobile money indicators
    if (lowerDesc.includes('mobile money') || lowerDesc.includes('momo') || lowerDesc.includes('airtel money')) {
      return 'mobile money';
    }
    
    // Credit card indicators
    if (lowerDesc.includes('card') || lowerDesc.includes('visa') || lowerDesc.includes('mastercard')) {
      return 'credit card';
    }
    
    // Default to cash
    return 'cash';
  }

  // Create basic journal entry as fallback
  private async createBasicJournalEntry(
    description: string,
    amount: number,
    companyId: string,
    context?: any,
    tenantId: string = 'tenant_demo'
  ): Promise<JournalEntryRequest> {
    try {
      const entries: JournalLine[] = [];
    
    const lowerDesc = description.toLowerCase();
    const isPurchase = context?.transactionType === 'purchase' || 
                      lowerDesc.includes('purchased') || 
                      lowerDesc.includes('bought');
    const isCreditPurchase = lowerDesc.includes('credit') || 
                           lowerDesc.includes('payable');

    // Handle Inventory Purchase
    if (isPurchase) {
      // 1. Parse product info from description
      const productInfo = this.extractProductInfoFromDescription(description);
      const quantity = productInfo?.quantity || 1;
      const unitCost = productInfo?.unitCost || (amount / quantity);
      const totalAmount = quantity * unitCost;

      // 2. Get or create inventory account
      let inventoryAccountId;
      try {
        inventoryAccountId = await this.getAccountIdFromName('inventory', companyId, tenantId);
      } catch {
        // Create inventory account if it doesn't exist
        const newAccount = await prisma.account.create({
          data: {
            name: 'Inventory',
            code: '1200',
            type: 'ASSET',
            companyId,
            tenantId,
            isActive: true
          }
        });
        inventoryAccountId = newAccount.id;
      }

      // 3. Extract vendor from description if not provided in context
      const vendor = context?.vendor || (() => {
        const vendorMatch = description.match(/(?:from|purchased from|bought from)\s+([^,.]*?)(?:,|\.|$)/i);
        return vendorMatch ? vendorMatch[1].trim() : 'Unknown Vendor';
      })();

      // 4. Handle different payment methods
      const paymentMethod = this.detectPaymentMethod(description);
      const isBankPayment = paymentMethod === 'bank' || description.toLowerCase().includes('bank');

      if (isCreditPurchase || description.toLowerCase().includes('credit')) {
        // Credit Purchase (on account)
        const payableAccountId = await this.getAccountIdFromName('accounts payable', companyId, tenantId);
        
        // Debit Accounts Payable
        entries.push({
          accountId: payableAccountId,
          debit: new Decimal(totalAmount),
          credit: new Decimal(0),
          description: `Purchase on credit from ${vendor}`,
          metadata: { 
            quantity,
            unitCost,
            vendor,
            reference: `PUR-CR-${Date.now()}`,
            transactionType: 'purchase_credit'
          }
        });
        
        // Credit Inventory
        entries.push({
          accountId: inventoryAccountId,
          debit: new Decimal(0),
          credit: new Decimal(totalAmount),
          description: `Inventory credit: ${quantity} x ${productInfo?.name || 'items'}`,
          metadata: { 
            quantity,
            unitCost,
            vendor,
            reference: `INV-CR-${Date.now()}`,
            transactionType: 'inventory_credit'
          }
        });
      } else {
        // Bank or Cash Purchase
        const paymentAccount = isBankPayment 
          ? await this.getAccountIdFromName('bank', companyId, tenantId)
          : await this.getAccountIdFromName('cash', companyId, tenantId);
        
        const paymentMethodName = isBankPayment ? 'bank transfer' : 'cash';
        
        // Debit Bank/Cash (decrease asset)
        entries.push({
          accountId: paymentAccount,
          debit: new Decimal(totalAmount),
          credit: new Decimal(0),
          description: `Payment to ${vendor} via ${paymentMethodName}`,
          metadata: { 
            quantity,
            unitCost,
            vendor,
            reference: `PMT-${isBankPayment ? 'BANK' : 'CASH'}-${Date.now()}`,
            paymentMethod: paymentMethodName,
            transactionType: 'payment_out'
          }
        });
        
        // Credit Inventory
        entries.push({
          accountId: inventoryAccountId,
          debit: new Decimal(0),
          credit: new Decimal(totalAmount),
          description: `Inventory credit: ${quantity} x ${productInfo?.name || 'items'} @ ${unitCost} ${context?.currency || 'RWF'}`,
          metadata: { 
            quantity,
            unitCost,
            vendor,
            reference: `INV-${isBankPayment ? 'BANK' : 'CASH'}-${Date.now()}`,
            paymentMethod: paymentMethodName,
            transactionType: 'inventory_credit'
          }
        });
      }

      // 3. Update or create product in inventory
      if (productInfo) {
        await prisma.product.upsert({
          where: {
            tenantId_companyId_name: {
              tenantId,
              companyId,
              name: productInfo.name
            }
          },
          update: {
            stockQuantity: { increment: quantity },
            costPrice: unitCost,
            lastPurchaseDate: new Date()
          },
          create: {
            tenantId,
            companyId,
            name: productInfo.name,
            sku: `SKU-${productInfo.name.toUpperCase().replace(/\s+/g, '-')}`,
            description: `Auto-created from purchase: ${description}`,
            stockQuantity: quantity,
            costPrice: unitCost,
            unitPrice: unitCost * 1.5, // 50% markup by default
            type: 'INVENTORY',
            status: 'ACTIVE',
            category: context?.category || 'Uncategorized',
            unit: productInfo.unit || 'pcs'
          }
        });
      }

      return {
        companyId,
        tenantId,
        date: new Date(),
        reference: `PUR-${Date.now()}`,
        description,
        entries,
        source: 'manual',
        metadata: {
          transactionType: 'purchase',
          hasInventoryImpact: true
        }
      };
    } 
    // Handle Sales
    else if (context?.transactionType === 'sale' || context?.transactionType === 'receipt') {
      // 1. Parse product info from description
      const productInfo = this.extractProductInfoFromDescription(description);
      const quantity = productInfo?.quantity || 1;
      const unitPrice = productInfo?.unitPrice || (amount / quantity);
      
      // 2. Get or create necessary accounts
      const cashAccountId = await this.getAccountIdFromName('cash', companyId, tenantId);
      const revenueAccountId = await this.getAccountIdFromName('revenue', companyId, tenantId);
      const cogsAccountId = await this.getAccountIdFromName('cost of goods sold', companyId, tenantId);
      const inventoryAccountId = await this.getAccountIdFromName('inventory', companyId, tenantId);
      
      // 3. Get product to calculate COGS
      if (productInfo) {
        const product = await prisma.product.findFirst({
          where: {
            tenantId,
            companyId,
            name: productInfo.name
          }
        });
        
        if (product) {
          const cogsAmount = (product.costPrice?.toNumber() || 0) * quantity;
          
          // Debit Cash (or Accounts Receivable for credit sales)
          entries.push({
            accountId: cashAccountId,
            debit: new Decimal(amount),
            credit: new Decimal(0),
            description: `Sale of ${productInfo.name}`,
            metadata: { 
              quantity,
              unitPrice,
              customer: context?.customer 
            }
          });
          
          // Credit Revenue
          entries.push({
            accountId: revenueAccountId,
            debit: new Decimal(0),
            credit: new Decimal(amount),
            description: `Revenue from sale of ${productInfo.name}`,
            metadata: { 
              quantity,
              unitPrice 
            }
          });
          
          // Debit COGS
          entries.push({
            accountId: cogsAccountId,
            debit: new Decimal(cogsAmount),
            credit: new Decimal(0),
            description: `COGS for ${productInfo.name}`,
            metadata: { 
              quantity,
              unitCost: product.costPrice 
            }
          });
          
          // Credit Inventory
          entries.push({
            accountId: inventoryAccountId,
            debit: new Decimal(0),
            credit: new Decimal(cogsAmount),
            description: `Reduction of ${productInfo.name} inventory`,
            metadata: { 
              quantity,
              unitCost: product.costPrice 
            }
          });
          
          // Update product inventory
          await prisma.product.update({
            where: { id: product.id },
            data: {
              stockQuantity: { decrement: quantity },
              lastSoldDate: new Date()
            }
          });
          
          return {
            companyId,
            tenantId,
            date: new Date(),
            reference: `SALE-${Date.now()}`,
            description,
            entries,
            source: 'manual',
            metadata: {
              transactionType: 'sale',
              hasInventoryImpact: true
            }
          };
        }
      }
      
      // Fallback to simple revenue entry if product not found
      entries.push({
        accountId: cashAccountId,
        debit: new Decimal(amount),
        credit: new Decimal(0),
        description: 'Cash received'
      });
      entries.push({
        accountId: revenueAccountId,
        debit: new Decimal(0),
        credit: new Decimal(amount),
        description: 'Revenue recognition'
      });
    } else {
        // Default transaction - try to be smart about account selection
        const cashAccountId = await this.getAccountIdFromName('cash', companyId, tenantId);
        let otherAccountId;
        
        // Try to infer account type from description
        if (description.toLowerCase().includes('sales') || description.toLowerCase().includes('revenue')) {
          otherAccountId = await this.getAccountIdFromName('revenue', companyId, tenantId);
        } else if (description.toLowerCase().includes('expense') || description.toLowerCase().includes('cost')) {
          otherAccountId = await this.getAccountIdFromName('expense', companyId, tenantId);
        } else {
          // Get any other account that's not cash
          const accounts = await prisma.account.findMany({
            where: { tenantId, companyId },
            orderBy: { code: 'asc' },
            take: 2
          });
          otherAccountId = accounts.find(acc => acc.id !== cashAccountId)?.id || accounts[0]?.id;
        }
        
        if (!otherAccountId) {
          throw new Error('Could not determine appropriate accounts for transaction');
        }
        
      entries.push({
          accountId: cashAccountId,
        debit: new Decimal(amount),
        credit: new Decimal(0),
        description: 'Cash transaction'
      });
      entries.push({
          accountId: otherAccountId,
        debit: new Decimal(0),
        credit: new Decimal(amount),
          description: 'Balancing entry'
      });
    }
    
    return {
      companyId,
        tenantId,
      date: new Date(),
        reference: `AI-Entry-${Date.now()}`,
      description,
        entries: entries,
        source: 'ai_generated'
      };
    } catch (error) {
      throw new Error('Failed to create journal entry with valid accounts');
    }
  }

  // Get account ID from database based on account type and name
  private async getAccountIdFromName(accountName: string, companyId: string, tenantId: string = 'tenant_demo'): Promise<string> {
    try {
    const lowerName = accountName.toLowerCase();
      
      // Try to find exact or partial match in database (SQLite compatible)
      const account = await prisma.account.findFirst({
        where: {
          tenantId,
          companyId,
          OR: [
            { name: { contains: accountName } },
            { code: { contains: accountName } },
            { name: { contains: lowerName } }
          ]
        }
      });
      
      if (account) {
        return account.id;
      }
      
      // Fallback to finding by account type/code pattern
      let accountCode = '';
      let accountTypeName = '';
      
      if (lowerName.includes('inventory') || lowerName.includes('stock')) {
        accountCode = '1200'; // Inventory asset account (matches your seed data)
        accountTypeName = 'Inventory';
      } else if (lowerName.includes('bank')) {
        accountCode = '13000'; // Main Bank Account (matches your actual data)
        accountTypeName = 'Main Bank Account';
      } else if (lowerName.includes('cash')) {
        accountCode = '1110'; // Cash and Cash Equivalents (matches your actual data)
        accountTypeName = 'Cash and Cash Equivalents';
      } else if (lowerName.includes('revenue') || lowerName.includes('sales')) {
        accountCode = '4000'; // Revenue account
        accountTypeName = 'Revenue';
      } else if (lowerName.includes('expense')) {
        accountCode = '5000'; // Expense account
        accountTypeName = 'Expenses';
      } else if (lowerName.includes('receivable')) {
        accountCode = '1100'; // Accounts Receivable (matches your seed data)
        accountTypeName = 'Accounts Receivable';
      } else if (lowerName.includes('payable')) {
        accountCode = '2000'; // Accounts Payable
        accountTypeName = 'Accounts Payable';
      }
      
      if (accountCode) {
        const codeAccount = await prisma.account.findFirst({
          where: {
            tenantId,
            companyId,
            code: { startsWith: accountCode.substring(0, 1) } // Match first digit
          },
          orderBy: { code: 'asc' }
        });
        
        if (codeAccount) {
          return codeAccount.id;
        }
        
        // If no account found, create the missing account
        if (accountTypeName && accountCode) {
          
          // Get or create account type
          let accountType = await prisma.accountType.findFirst({
            where: { name: this.getAccountTypeCategory(accountCode) }
          });
          
          if (!accountType) {
            accountType = await prisma.accountType.create({
              data: {
                name: this.getAccountTypeCategory(accountCode),
                category: this.getAccountTypeCategory(accountCode)
              }
            });
          }
          
          // Create the missing account
          const newAccount = await prisma.account.create({
            data: {
              tenantId,
              companyId,
              name: accountTypeName,
              code: accountCode,
              typeId: accountType.id,
              isActive: true
            }
          });
          
          return newAccount.id;
        }
      }
      
      // Final fallback - get any account from the company
      const fallbackAccount = await prisma.account.findFirst({
        where: { tenantId, companyId },
        orderBy: { code: 'asc' }
      });
      
      if (fallbackAccount) {
        return fallbackAccount.id;
      }
      
      throw new Error(`No accounts found for company ${companyId}`);
    } catch (error) {
      console.error('Error getting account ID:', error);
      throw new Error(`Failed to find account for "${accountName}"`);
    }
  }

  // 📦 Update inventory when posting purchase journal entries
  private async updateInventoryFromJournalEntry(
    description: string,
    amount: number,
    companyId: string,
    tenantId: string = 'tenant_demo'
  ): Promise<void> {
    try {
      // Parse inventory details from description
      const inventoryInfo = this.parseInventoryFromDescription(description);
      
      if (!inventoryInfo) {
        return;
      }

      const { productName, quantity, unitPrice } = inventoryInfo;
      
      // Find or create product
      let product = await prisma.product.findFirst({
        where: {
          tenantId,
          companyId,
          OR: [
            { name: { contains: productName } },
            { sku: { contains: productName } }
          ]
        }
      });

      if (!product) {
        // Create new product
        product = await prisma.product.create({
          data: {
            tenantId,
            companyId,
            name: productName,
            sku: `SKU-${productName.replace(/\s+/g, '-').toUpperCase()}`,
            description: `Auto-created from journal entry: ${description}`,
            unitPrice: unitPrice,
            costPrice: unitPrice,
            stockQuantity: 0,
            type: 'PRODUCT',
            status: 'ACTIVE'
          }
        });
      }

      // Update stock quantity
      const newStockQuantity = (typeof product.stockQuantity === 'object' ? Number(product.stockQuantity) : Number(product.stockQuantity)) + quantity;
      await prisma.product.update({
        where: { id: product.id },
        data: { 
          stockQuantity: newStockQuantity,
          costPrice: unitPrice // Update cost price with latest purchase price
        }
      });

      // Create inventory movement record
      await prisma.inventoryMovement.create({
        data: {
          tenantId,
          productId: product.id,
          movementType: 'PURCHASE',
          quantity: quantity,
          unitCost: unitPrice,
          movementDate: new Date(),
          reference: `Journal Entry - ${description}`,
          reason: 'Purchase transaction from journal entry'
        }
      });

    } catch (error) {
      console.error('📦 ❌ Error updating inventory:', error);
      // Don't throw error - inventory update shouldn't break journal entry
    }
  }

  // Check if transaction is a purchase transaction
  private isPurchaseTransaction(description: string): boolean {
    const lowerDesc = description.toLowerCase();
    return lowerDesc.includes('purchased') || 
           lowerDesc.includes('bought') || 
           lowerDesc.includes('acquired') || 
           lowerDesc.includes('inventory') ||
           lowerDesc.includes('purchase');
  }

  // Parse inventory information from description
  private parseInventoryFromDescription(description: string): {
    productName: string;
    quantity: number;
    unitPrice: number;
  } | null {
    const lowerDesc = description.toLowerCase();
    
    // Pattern: "200 phones purchased from Mellise at 2,000 RWF each"
    const quantityMatch = lowerDesc.match(/(\d+)\s+([a-zA-Z]+)/);
    const priceMatch = lowerDesc.match(/(\d+(?:,\d+)*)\s*rwf/);
    
    if (quantityMatch && priceMatch) {
      const quantity = parseInt(quantityMatch[1]);
      const productName = quantityMatch[2];
      const unitPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
      
      return {
        productName: productName.charAt(0).toUpperCase() + productName.slice(1), // Capitalize
        quantity,
        unitPrice
      };
    }
    
    return null;
  }

  // Get account type category based on account code
  private getAccountTypeCategory(accountCode: string): string {
    const firstDigit = accountCode.charAt(0);
    switch (firstDigit) {
      case '1': return 'ASSET';
      case '2': return 'LIABILITY';
      case '3': return 'EQUITY';
      case '4': return 'REVENUE';
      case '5':
      case '6':
      case '7':
      case '8':
      case '9': return 'EXPENSE';
      default: return 'ASSET';
    }
  }

  // Ensure double-entry bookkeeping
  private async ensureDoubleEntry(entries: JournalLine[]): Promise<JournalLine[]> {
    if (!entries || entries.length === 0) {
      throw new Error('No entries provided for double-entry validation');
    }
    
    const totalDebit = entries.reduce((sum, entry) => sum + (entry.debit?.toNumber() || 0), 0);
    const totalCredit = entries.reduce((sum, entry) => sum + (entry.credit?.toNumber() || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) < 0.01) {
      return entries; // Already balanced
    }
    
    // Auto-balance by adjusting the largest entry
    const adjustedEntries = [...entries];
    const difference = totalDebit - totalCredit;
    
    if (difference > 0) {
      // Need more credit
      const largestEntry = adjustedEntries.reduce((largest, entry) => 
        entry.credit.toNumber() > largest.credit.toNumber() ? entry : largest
      );
      const index = adjustedEntries.findIndex(entry => entry.id === largestEntry.id);
      adjustedEntries[index].credit = new Decimal(adjustedEntries[index].credit.toNumber() + difference);
    } else {
      // Need more debit
      const largestEntry = adjustedEntries.reduce((largest, entry) => 
        entry.debit.toNumber() > largest.debit.toNumber() ? entry : largest
      );
      const index = adjustedEntries.findIndex(entry => entry.id === largestEntry.id);
      adjustedEntries[index].debit = new Decimal(adjustedEntries[index].debit.toNumber() + Math.abs(difference));
    }
    
    return adjustedEntries;
  }

  // Validate journal entry
  async validateJournalEntry(request: JournalEntryRequest): Promise<JournalValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const complianceIssues: string[] = [];
    
    // Check if entries are provided
    if (!request.entries || request.entries.length === 0) {
      errors.push('Journal entry must have at least one entry');
      return { isValid: false, errors };
    }
    
    // Check double-entry balance
    const totalDebit = request.entries.reduce((sum, entry) => sum + (entry.debit?.toNumber() || 0), 0);
    const totalCredit = request.entries.reduce((sum, entry) => sum + (entry.credit?.toNumber() || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    
    if (!isBalanced) {
      errors.push(`Journal entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
    }
    
    // Validate accounts exist
    for (const entry of request.entries) {
      const account = await prisma.account.findUnique({
        where: { id: entry.accountId }
      });
      
      if (!account) {
        errors.push(`Account ${entry.accountId} does not exist`);
      } else if (!account.isActive) {
        warnings.push(`Account ${account.name} is inactive`);
      }
    }
    
    // Check for unusual amounts
    for (const entry of request.entries) {
      if ((entry.debit?.toNumber() || 0) > 1000000 || (entry.credit?.toNumber() || 0) > 1000000) {
        warnings.push(`Large amount detected: ${Math.max(entry.debit?.toNumber() || 0, entry.credit?.toNumber() || 0)}`);
      }
    }
    
    // Compliance checks
    if (request.date < new Date('2020-01-01')) {
      complianceIssues.push('Transaction date is too old for current compliance requirements');
    }
    
    return {
      isValid: errors.length === 0,
      isBalanced,
      errors,
      warnings,
      suggestions,
      complianceIssues
    };
  }

  // Get account suggestions for transaction
  async getAccountSuggestions(
    description: string,
    amount: number,
    companyId: string,
    context?: any
  ): Promise<AccountSuggestion[]> {
    
    try {
      const aiContext = {
        userId: 'demo-user-id',
        companyId,
        tenantId: 'demo-tenant-id',
        sessionId: `account-suggestions-${Date.now()}`,
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

      const prompt = `Suggest appropriate accounts for this transaction:
      
      Description: ${description}
      Amount: ${amount}
      ${context?.category ? `Category: ${context.category}` : ''}
      ${context?.vendor ? `Vendor: ${context.vendor}` : ''}
      
      Please suggest 3-5 most appropriate accounts with confidence scores.
      Respond in this format:
      "Account: [account_name] | Code: [account_code] | Confidence: [0-100] | Reasoning: [explanation] | Category: [suggested_category]"`;

      const response = await this.conversationalAI.processNaturalLanguageInput(prompt, aiContext);
      
      return await this.parseAccountSuggestions(response.message, companyId);
    } catch (error) {
      console.warn('AI account suggestions failed:', error);
      const fallbackSuggestions = await this.getDefaultAccountSuggestions(description, amount, companyId);
      return fallbackSuggestions;
    }
  }

  // Parse AI account suggestions
  private async parseAccountSuggestions(message: string, companyId: string, tenantId: string = 'tenant_demo'): Promise<AccountSuggestion[]> {
    const suggestions: AccountSuggestion[] = [];
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (line.includes('Account:') && line.includes('Confidence:')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 5) {
          const accountName = parts[0].replace('Account:', '').trim();
          const accountCode = parts[1].replace('Code:', '').trim();
          const confidence = parseInt(parts[2].replace('Confidence:', '').trim()) / 100;
          const reasoning = parts[3].replace('Reasoning:', '').trim();
          const category = parts[4].replace('Category:', '').trim();
          
          try {
            const accountId = await this.getAccountIdFromName(accountName, companyId, tenantId);
          suggestions.push({
              accountId,
            accountName,
            accountCode,
            confidence,
            reasoning,
            suggestedCategory: category
          });
          } catch (error) {
            console.warn(`Could not find account for "${accountName}":`, error);
          }
        }
      }
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  // Get default account suggestions using real accounts from database
  async getDefaultAccountSuggestions(description: string, amount: number, companyId: string, tenantId: string = 'tenant_demo'): Promise<AccountSuggestion[]> {
    const suggestions: AccountSuggestion[] = [];
    const lowerDesc = description.toLowerCase();
    
    try {
      // Get actual accounts from the database
      const accounts = await prisma.account.findMany({
        where: { tenantId, companyId },
        include: { type: true },
        orderBy: { code: 'asc' }
      });
      

      // 🎯 Enhanced purchase transaction detection
      if (lowerDesc.includes('purchased') || lowerDesc.includes('bought') || lowerDesc.includes('acquired') || lowerDesc.includes('inventory')) {
        // Purchase transaction: Dr. Inventory, Cr. Bank/Cash
        const inventoryAccount = accounts.find(acc => 
          acc.code === '1200' || 
          acc.name?.toLowerCase().includes('inventory')
        );
        
        const bankAccount = accounts.find(acc => 
          acc.code === '13000' || 
          acc.name?.toLowerCase().includes('main bank') ||
          acc.name?.toLowerCase().includes('bank account')
        );
        
        if (inventoryAccount) {
          suggestions.push({
            accountId: inventoryAccount.id,
            accountName: inventoryAccount.name,
            accountCode: inventoryAccount.code || '',
            confidence: 0.95,
            reasoning: 'Purchase transaction - inventory asset account'
          });
        }
        
        if (bankAccount) {
          suggestions.push({
            accountId: bankAccount.id,
            accountName: bankAccount.name,
            accountCode: bankAccount.code || '',
            confidence: 0.90,
            reasoning: 'Purchase transaction - payment from bank account'
          });
        }
        
      } else if (lowerDesc.includes('sale') || lowerDesc.includes('revenue') || lowerDesc.includes('income') || lowerDesc.includes('payment from customer')) {
        // Find revenue accounts
        const revenueAccounts = accounts.filter(acc => 
          acc.type?.code === 'REVENUE' || 
          acc.code?.startsWith('4') ||
          acc.name?.toLowerCase().includes('revenue') ||
          acc.name?.toLowerCase().includes('sales')
        );
        
        revenueAccounts.slice(0, 2).forEach((acc, index) => {
          suggestions.push({
            accountId: acc.id,
            accountName: acc.name,
            accountCode: acc.code || '',
            confidence: 0.9 - (index * 0.1),
            reasoning: 'Transaction appears to be revenue/income',
          suggestedCategory: 'Revenue'
          });
        });
        
      } else if (lowerDesc.includes('expense') || lowerDesc.includes('cost') || lowerDesc.includes('purchase') || lowerDesc.includes('paid')) {
        // Find expense accounts
        const expenseAccounts = accounts.filter(acc => 
          acc.type?.code === 'EXPENSE' || 
          acc.code?.startsWith('5') ||
          acc.name?.toLowerCase().includes('expense') ||
          acc.name?.toLowerCase().includes('cost')
        );
        
        expenseAccounts.slice(0, 2).forEach((acc, index) => {
          suggestions.push({
            accountId: acc.id,
            accountName: acc.name,
            accountCode: acc.code || '',
            confidence: 0.8 - (index * 0.1),
          reasoning: 'Transaction appears to be an expense',
          suggestedCategory: 'Expense'
          });
        });
      }
      
      // Always suggest cash account as it's commonly used
      const cashAccount = accounts.find(acc => 
        acc.name?.toLowerCase().includes('cash') || 
        acc.code?.startsWith('1')
      );
      if (cashAccount) {
        suggestions.push({
          accountId: cashAccount.id,
          accountName: cashAccount.name,
          accountCode: cashAccount.code || '',
          confidence: 0.95,
          reasoning: 'Cash account - commonly used for payments',
          suggestedCategory: 'Asset'
        });
      }
      
      // If no specific suggestions, add general accounts
      if (suggestions.length === 0) {
        const commonAccounts = accounts.filter(acc => 
          acc.name?.toLowerCase().includes('receivable') ||
          acc.name?.toLowerCase().includes('payable') ||
          acc.type?.code === 'ASSET'
        );
        
        commonAccounts.slice(0, 3).forEach((acc, index) => {
          suggestions.push({
            accountId: acc.id,
            accountName: acc.name,
            accountCode: acc.code || '',
            confidence: 0.6 - (index * 0.1),
            reasoning: 'General account suggestion',
            suggestedCategory: acc.type?.name || 'Unknown'
          });
        });
      }
      
      const finalSuggestions = suggestions.sort((a, b) => b.confidence - a.confidence);
      
      return finalSuggestions;
      
    } catch (error) {
      console.error('Error getting default account suggestions:', error);
      return [];
    }
  }

  // Update ledger balances
  // Note: This method requires LedgerEntry model to be added to schema
  private async updateLedgerBalances(journalEntryId: string): Promise<void> {
    // Implementation would go here when LedgerEntry model is available
  }

  // Get account balance
  // Note: This would calculate balance from journal lines since Account model doesn't have balance field
  private async getAccountBalance(accountId: string): Promise<number> {
    // Implementation would calculate balance from journal lines
    // For now, return 0 as placeholder
    return 0;
  }

  // Get ledger balances for period
  async getLedgerBalances(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<LedgerBalance[]> {
    
    // Get all journal entries for the period
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        companyId,
        date: {
          gte: startDate,
          lte: endDate
        },
        status: 'POSTED' // Only include posted entries for accurate ledger balances
      },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    });


    // Calculate balances by account
    const balanceMap = new Map<string, {
      accountId: string;
      accountName: string;
      accountCode: string;
      periodDebit: number;
      periodCredit: number;
      currentBalance: number;
      openingBalance: number;
    }>();

    // Process all journal lines
    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        const accountId = line.accountId;
        const account = line.account;
        
        if (!balanceMap.has(accountId)) {
          balanceMap.set(accountId, {
            accountId,
            accountName: account.name,
            accountCode: account.code,
            periodDebit: 0,
            periodCredit: 0,
            currentBalance: 0,
            openingBalance: 0 // For now, assume no opening balance
          });
        }

        const balance = balanceMap.get(accountId)!;
        const debitAmount = line.debit.toNumber() || 0;
        const creditAmount = line.credit.toNumber() || 0;

        balance.periodDebit += debitAmount;
        balance.periodCredit += creditAmount;
        
        // Calculate current balance based on account type
        // For now, use simple debit-credit calculation since we don't have account type info
        // In a real system, you'd fetch account types and apply proper accounting rules
        balance.currentBalance += debitAmount - creditAmount;
      }
    }

    // Convert map to array and return
    const balances = Array.from(balanceMap.values());
    return balances;
  }

  // Post journal entry
  async postJournalEntry(journalEntryId: string, postedBy: string): Promise<JournalEntry> {
    const journalEntry = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { lines: true }
    });
    
    if (!journalEntry) {
      throw new Error('Journal entry not found');
    }
    
    if (journalEntry.status !== 'DRAFT') {
      throw new Error('Journal entry is not in draft status');
    }
    
    // Validate before posting
    const validation = await this.validateJournalEntry({
      companyId: journalEntry.companyId,
      tenantId: journalEntry.tenantId,
      date: journalEntry.date,
      reference: journalEntry.reference,
      description: journalEntry.memo || '',
      entries: journalEntry.lines.map(line => ({
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        description: line.memo || ''
      })),
      source: 'manual'
    });
    
    if (!validation.isValid) {
      throw new Error(`Cannot post journal entry: ${validation.errors.join(', ')}`);
    }
    
    // Update journal entry status
    const updatedEntry = await prisma.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        status: 'POSTED'
      },
      include: { lines: true }
    });
    
    // 📦 Auto-create inventory records for inventory purchases
    await this.processInventoryFromJournalEntry(updatedEntry);
    
    return {
      ...updatedEntry,
      lines: updatedEntry.lines,
      metadata: {}
    };
  }

  // Void journal entry
  async voidJournalEntry(journalEntryId: string, voidedBy: string, reason: string): Promise<JournalEntry> {
    const journalEntry = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: { lines: true }
    });
    
    if (!journalEntry) {
      throw new Error('Journal entry not found');
    }
    
    if (journalEntry.status === 'VOIDED') {
      throw new Error('Journal entry is already voided');
    }
    
    // Create reversing entries
    const reversingEntries = journalEntry.lines.map(line => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
      description: `Reversal: ${line.memo || ''}`,
      reference: `VOID-${journalEntry.reference || ''}`,
      metadata: { 
        category: 'void',
        vendor: 'system',
        customer: 'void',
        project: 'void',
        department: 'void'
      }
    }));
    
    // Create void entry
    const voidEntry = await this.createJournalEntry({
      companyId: journalEntry.companyId,
      tenantId: journalEntry.tenantId,
      date: new Date(),
      reference: `VOID-${journalEntry.reference}`,
      description: `Void: ${journalEntry.memo || ''} - ${reason}`,
      entries: reversingEntries,
      source: 'manual',
      metadata: {
        voidReason: reason,
        originalEntryId: journalEntryId,
        voidedBy
      }
    });
    
    // Update original entry status
    const updatedEntry = await prisma.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        status: 'VOIDED',
        memo: `${journalEntry.memo || ''} - VOIDED: ${reason}`
      },
      include: { lines: true }
    });
    
    return {
      ...updatedEntry,
      lines: updatedEntry.lines,
      metadata: {}
    };
  }

  // Get journal entry with details
  async getJournalEntry(journalEntryId: string): Promise<JournalEntry | null> {
    const journalEntry = await prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    });
    
    if (!journalEntry) return null;
    
    return {
      ...journalEntry,
      lines: journalEntry.lines,
      metadata: {}
    };
  }

  // Get journal entries for period
  async getJournalEntries(
    companyId: string,
    startDate: Date,
    endDate: Date,
    status?: 'draft' | 'posted' | 'voided'
  ): Promise<JournalEntry[]> {
    const where: any = {
      companyId,
      date: {
        gte: startDate,
        lte: endDate
      }
    };
    
    if (status) {
      where.status = status;
    }
    
    const journalEntries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    return journalEntries.map(entry => ({
      ...entry,
      lines: entry.lines,
      metadata: {}
    }));
  }

  // Detect anomalies in journal entries
  async detectAnomalies(companyId: string, periodDays: number = 30): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    const journalEntries = await this.getJournalEntries(companyId, startDate, endDate, 'posted');
    
    const anomalies: any[] = [];
    
    // Check for unusual amounts
    for (const entry of journalEntries) {
      // Calculate totals from lines since totalDebit/totalCredit don't exist in schema
      const entryTotalDebit = entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const entryTotalCredit = entry.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      
      if (entryTotalDebit > 1000000 || entryTotalCredit > 1000000) {
        anomalies.push({
          type: 'large_amount',
          journalEntryId: entry.id,
          description: `Unusually large amount: ${Math.max(entryTotalDebit, entryTotalCredit)}`,
          severity: 'high'
        });
      }
    }
    
    // Check for unbalanced entries (shouldn't happen for posted entries)
    const unbalancedEntries = journalEntries.filter(entry => {
      const totalDebit = entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const totalCredit = entry.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      return Math.abs(totalDebit - totalCredit) > 0.01; // Allow for small rounding differences
    });
    if (unbalancedEntries.length > 0) {
      anomalies.push({
        type: 'unbalanced_entries',
        count: unbalancedEntries.length,
        description: 'Found unbalanced journal entries',
        severity: 'critical',
        entries: unbalancedEntries.map(e => e.id)
      });
    }
    
    // Check for duplicate entries
    const duplicateGroups = this.findDuplicateEntries(journalEntries);
    for (const group of duplicateGroups) {
      anomalies.push({
        type: 'duplicate_entries',
        entries: group.map(e => e.id),
        description: `Found ${group.length} duplicate entries`,
        severity: 'medium'
      });
    }
    
    return anomalies;
  }

  // Find duplicate journal entries
  private findDuplicateEntries(journalEntries: JournalEntry[]): JournalEntry[][] {
    const duplicates: JournalEntry[][] = [];
    const seen = new Map<string, JournalEntry[]>();
    
    for (const entry of journalEntries) {
      const entryTotalDebit = entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const entryTotalCredit = entry.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      const key = `${entry.reference}-${entryTotalDebit}-${entryTotalCredit}-${entry.date.toISOString().split('T')[0]}`;
      
      if (seen.has(key)) {
        seen.get(key)!.push(entry);
      } else {
        seen.set(key, [entry]);
      }
    }
    
    for (const group of seen.values()) {
      if (group.length > 1) {
        duplicates.push(group);
      }
    }
    
    return duplicates;
  }

  // 📦 Process inventory from journal entry when posted
  private async processInventoryFromJournalEntry(journalEntry: any): Promise<void> {
    try {
      // Look for inventory-related accounts in the journal lines
      for (const line of journalEntry.lines) {
        const account = await prisma.account.findUnique({
          where: { id: line.accountId }
        });

        // Check if this is an inventory account (debit = purchase)
        if (account && this.isInventoryAccount(account.name) && line.debit > 0) {
          await this.createInventoryFromJournalLine(journalEntry, line, account);
        }
      }
    } catch (error) {
      console.error('Error processing inventory from journal entry:', error);
      // Don't throw error - inventory creation is supplementary
    }
  }

  // Check if account is inventory-related
  private isInventoryAccount(accountName: string): boolean {
    const inventoryKeywords = ['inventory', 'stock', 'goods', 'merchandise', 'products'];
    const lowerName = accountName.toLowerCase();
    return inventoryKeywords.some(keyword => lowerName.includes(keyword));
  }

  // Create inventory record from journal line
  private async createInventoryFromJournalLine(journalEntry: any, line: any, account: any): Promise<void> {
    try {
      // Extract product info from journal description
      const productInfo = this.extractProductInfoFromDescription(journalEntry.memo || '');
      
      // Create inventory item
      const inventoryItem = await prisma.product.create({
        data: {
          companyId: journalEntry.companyId,
          tenantId: journalEntry.tenantId,
          name: productInfo.name,
          sku: productInfo.sku || `AUTO-${Date.now()}`,
          description: journalEntry.memo,
          costPrice: productInfo.unitCost || (line.debit.toNumber() / (productInfo.quantity || 1)),
          unitPrice: productInfo.sellingPrice || (line.debit.toNumber() * 1.3), // 30% markup default
          stockQuantity: productInfo.quantity || 1,
          type: 'PRODUCT',
          status: 'ACTIVE'
        }
      });
    } catch (error) {
      console.error('Error creating inventory from journal line:', error);
    }
  }

  // Extract product information from journal description
  private extractProductInfoFromDescription(description: string): {
    name: string;
    quantity: number;
    unitCost: number;
    sku?: string;
    category?: string;
    unit?: string;
    sellingPrice?: number;
    reorderLevel?: number;
    location?: string;
  } {
    const lowerDesc = description.toLowerCase();
    
    // Extract quantity (look for numbers followed by units)
    const quantityMatch = description.match(/(\d+)\s*(phones?|units?|pieces?|pcs|items?)/i);
    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
    
    // Extract unit cost (look for cost/price per unit)
    const costMatch = description.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:rwf|francs?|each|per)/i);
    const unitCost = costMatch ? parseFloat(costMatch[1].replace(/,/g, '')) : 0;
    
    // Extract product name (look for product type)
    let productName = 'Unknown Product';
    if (lowerDesc.includes('phone')) productName = 'Mobile Phone';
    else if (lowerDesc.includes('laptop')) productName = 'Laptop';
    else if (lowerDesc.includes('computer')) productName = 'Computer';
    else if (lowerDesc.includes('tablet')) productName = 'Tablet';
    else {
      // Try to extract from "purchased [product] from"
      const productMatch = description.match(/purchased\s+(.+?)\s+from/i);
      if (productMatch) productName = productMatch[1];
    }
    
    // Extract vendor/supplier for category
    const vendorMatch = description.match(/from\s+([A-Za-z]+)/i);
    const category = vendorMatch ? `${vendorMatch[1]} Products` : 'General';
    
    return {
      name: productName,
      quantity,
      unitCost,
      category,
      unit: quantityMatch ? quantityMatch[2].toLowerCase() : 'pcs',
      sellingPrice: unitCost * 1.3, // 30% markup
      reorderLevel: Math.max(10, Math.floor(quantity * 0.2)), // 20% of purchase quantity
      location: 'Main Warehouse'
    };
  }
}

export const enhancedJournalManagementService = new EnhancedJournalManagementService();
