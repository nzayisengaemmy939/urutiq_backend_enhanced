import { prisma } from './prisma';
import { config } from './config.js';
// Common accounting patterns and keywords
const ACCOUNTING_PATTERNS = {
    // Transaction types
    expense: ['paid', 'spent', 'bought', 'purchased', 'expense', 'cost', 'bill', 'payment'],
    income: ['received', 'earned', 'income', 'revenue', 'sale', 'payment received', 'incoming'],
    transfer: ['transferred', 'moved', 'sent', 'deposited', 'withdrew', 'transfer'],
    payment: ['paid', 'payment', 'settled', 'cleared'],
    receipt: ['received', 'got', 'incoming', 'receipt'],
    // Common categories
    utilities: ['electricity', 'water', 'gas', 'power', 'utility', 'energy'],
    rent: ['rent', 'lease', 'accommodation', 'housing'],
    supplies: ['supplies', 'stationery', 'office', 'materials', 'equipment'],
    services: ['service', 'consulting', 'professional', 'maintenance'],
    transportation: ['fuel', 'gas', 'transport', 'travel', 'vehicle'],
    communication: ['phone', 'internet', 'telecom', 'communication', 'mobile'],
    insurance: ['insurance', 'premium', 'coverage'],
    taxes: ['tax', 'vat', 'gst', 'government', 'fees'],
    salary: ['salary', 'wage', 'payroll', 'employee'],
    sales: ['sale', 'revenue', 'income', 'product', 'service sold'],
    loan: ['loan', 'credit', 'borrowed', 'debt'],
    investment: ['investment', 'stock', 'shares', 'portfolio'],
    // Time indicators
    past: ['yesterday', 'last week', 'last month', 'previous', 'past'],
    future: ['tomorrow', 'next week', 'next month', 'upcoming', 'future'],
    recurring: ['monthly', 'weekly', 'daily', 'recurring', 'subscription'],
    // Amount patterns
    currency: ['RWF', 'USD', 'EUR', 'GBP', 'dollars', 'euros', 'pounds', 'francs'],
    numbers: /\d+(?:,\d{3})*(?:\.\d{2})?/g,
};
// Default chart of accounts mapping
const DEFAULT_ACCOUNTS = {
    // Assets
    'Cash': { type: 'ASSET', code: '1000', name: 'Cash' },
    'Bank Account': { type: 'ASSET', code: '1010', name: 'Bank Account' },
    'Accounts Receivable': { type: 'ASSET', code: '1100', name: 'Accounts Receivable' },
    'Inventory': { type: 'ASSET', code: '1200', name: 'Inventory' },
    'Equipment': { type: 'ASSET', code: '1300', name: 'Equipment' },
    // Liabilities
    'Accounts Payable': { type: 'LIABILITY', code: '2000', name: 'Accounts Payable' },
    'Loans': { type: 'LIABILITY', code: '2100', name: 'Loans' },
    'Credit Cards': { type: 'LIABILITY', code: '2200', name: 'Credit Cards' },
    // Equity
    'Owner Equity': { type: 'EQUITY', code: '3000', name: 'Owner Equity' },
    'Retained Earnings': { type: 'EQUITY', code: '3100', name: 'Retained Earnings' },
    // Revenue
    'Sales Revenue': { type: 'REVENUE', code: '4000', name: 'Sales Revenue' },
    'Service Income': { type: 'REVENUE', code: '4100', name: 'Service Income' },
    'Interest Income': { type: 'REVENUE', code: '4200', name: 'Interest Income' },
    // Expenses
    'Office Supplies': { type: 'EXPENSE', code: '5000', name: 'Office Supplies' },
    'Rent Expense': { type: 'EXPENSE', code: '5010', name: 'Rent Expense' },
    'Utilities': { type: 'EXPENSE', code: '5020', name: 'Utilities' },
    'Telephone': { type: 'EXPENSE', code: '5030', name: 'Telephone' },
    'Insurance': { type: 'EXPENSE', code: '5040', name: 'Insurance' },
    'Salaries': { type: 'EXPENSE', code: '5050', name: 'Salaries' },
    'Travel': { type: 'EXPENSE', code: '5060', name: 'Travel' },
    'Marketing': { type: 'EXPENSE', code: '5070', name: 'Marketing' },
    'Professional Services': { type: 'EXPENSE', code: '5080', name: 'Professional Services' },
    'Equipment Maintenance': { type: 'EXPENSE', code: '5090', name: 'Equipment Maintenance' },
};
export class ConversationalPromptParser {
    async callOllama(prompt, systemPrompt) {
        try {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            const response = await fetch(`${config.ai.ollamaBaseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama3.1:8b',
                    prompt: prompt,
                    system: systemPrompt || 'You are an expert accounting AI assistant. Parse natural language into structured accounting entries.',
                    stream: false,
                    options: {
                        temperature: 0.1,
                        top_p: 0.9,
                        max_tokens: 2048,
                    }
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return data.response.trim();
        }
        catch (error) {
            console.error('Ollama API error:', error);
            return this.fallbackParse(prompt);
        }
    }
    fallbackParse(text) {
        // Enhanced rule-based parsing when AI is unavailable
        const lowerText = text.toLowerCase();
        const amountMatch = text.match(ACCOUNTING_PATTERNS.numbers);
        const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 0;
        // Extract date from text
        const dateMatch = text.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i);
        const extractedDate = dateMatch ? new Date(dateMatch[0]) : new Date();
        // Extract vendor information
        const vendorKeywords = ['water', 'electricity', 'gas', 'internet', 'phone', 'rent', 'insurance'];
        const vendor = vendorKeywords.find(keyword => lowerText.includes(keyword));
        let transactionType = 'expense';
        let category = 'Miscellaneous';
        // Enhanced category detection
        if (ACCOUNTING_PATTERNS.income.some(word => lowerText.includes(word))) {
            transactionType = 'income';
            category = 'Sales Revenue';
        }
        else if (/water|electricity|gas|power|utility|energy/.test(lowerText)) {
            category = 'Utilities';
        }
        else if (/rent|lease|accommodation|housing/.test(lowerText)) {
            category = 'Rent Expense';
        }
        else if (/supplies|stationery|office|materials|equipment/.test(lowerText)) {
            category = 'Office Supplies';
        }
        else if (/fuel|gas|transport|travel|vehicle/.test(lowerText)) {
            category = 'Transportation';
        }
        else if (/phone|internet|telecom|communication|mobile/.test(lowerText)) {
            category = 'Communication';
        }
        else if (/insurance|premium|coverage/.test(lowerText)) {
            category = 'Insurance';
        }
        else if (/salary|wage|payroll|employee/.test(lowerText)) {
            category = 'Salaries';
        }
        else if (/consult|professional|service|maintenance/.test(lowerText)) {
            category = 'Professional Services';
        }
        // Create basic journal entries for double-entry bookkeeping
        const journalEntries = [];
        if (transactionType === 'expense') {
            // For expenses: Dr Expense, Cr Cash/Bank
            journalEntries.push({
                accountName: category,
                debit: amount,
                credit: 0,
                description: text,
                category: 'EXPENSE'
            });
            journalEntries.push({
                accountName: 'Cash/Bank',
                debit: 0,
                credit: amount,
                description: 'Cash/Bank payment',
                category: 'ASSET'
            });
        }
        else if (transactionType === 'income') {
            // For income: Dr Cash/Bank, Cr Revenue
            journalEntries.push({
                accountName: 'Cash/Bank',
                debit: amount,
                credit: 0,
                description: text,
                category: 'ASSET'
            });
            journalEntries.push({
                accountName: category,
                debit: 0,
                credit: amount,
                description: 'Revenue recognized',
                category: 'REVENUE'
            });
        }
        return JSON.stringify({
            description: text,
            amount: amount,
            currency: 'RWF',
            transactionType: transactionType,
            category: category,
            confidence: 75, // Higher confidence for improved rule-based parsing
            reasoning: 'Enhanced rule-based parsing with improved categorization',
            date: extractedDate.toISOString(),
            journalEntries: journalEntries, // Include journal entries for proper double-entry
            metadata: {
                vendor: vendor || undefined,
                reference: undefined,
                notes: undefined
            }
        });
    }
    async parseNaturalLanguage(text, tenantId, companyId) {
        const systemPrompt = `You are an expert accounting AI assistant. Parse natural language into structured accounting entries.

Available account types:
- Assets: Cash, Bank Account, Accounts Receivable, Inventory, Equipment
- Liabilities: Accounts Payable, Loans, Credit Cards
- Equity: Owner Equity, Retained Earnings
- Revenue: Sales Revenue, Service Income, Interest Income
- Expenses: Office Supplies, Rent Expense, Utilities, Telephone, Insurance, Salaries, Travel, Marketing, Professional Services, Equipment Maintenance

IMPORTANT INSTRUCTIONS:
1. Extract the EXACT date mentioned in the text, not today's date
2. Identify the vendor/supplier from the transaction description
3. Provide a CLEAN description without AI prompts or technical details
4. Use specific expense categories (e.g., "Utilities" for water/electricity, not "Miscellaneous")
5. Extract any reference numbers or invoice numbers mentioned

Parse the input and respond with a JSON object containing:
{
  "description": "Transaction description",
  "amount": number,
  "currency": "RWF",
  "transactionType": "expense|income|transfer|payment|receipt",
  "category": "Account category name",
  "confidence": number (0-100),
  "reasoning": "Explanation of parsing logic",
  "journalEntries": [
    {
      "accountName": "Account name",
      "debit": number,
      "credit": number,
      "description": "Entry description"
    }
  ],
  "metadata": {
    "vendor": "Vendor name if mentioned",
    "customer": "Customer name if mentioned",
    "reference": "Reference number if mentioned",
    "notes": "Additional notes"
  }
}

Parse this natural language transaction into accounting entries:

"${text}"

Respond with only the JSON object.`;
        const prompt = `Parse this natural language transaction into accounting entries:

"${text}"

Respond with only the JSON object.`;
        const response = await this.callOllama(prompt, systemPrompt);
        try {
            const parsed = JSON.parse(response);
            // Normalize and apply accounting rules to ensure balanced double-entry
            const normalized = {
                description: parsed.description || text,
                amount: Number(parsed.amount || 0),
                currency: parsed.currency || 'RWF',
                date: new Date(parsed.date || new Date().toISOString()),
                transactionType: (parsed.transactionType || 'expense'),
                category: parsed.category || 'Miscellaneous',
                confidence: Number(parsed.confidence || 0),
                journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [],
                metadata: parsed.metadata || {}
            };
            try {
                this.applyAccountingRules(text, normalized);
            }
            catch (error) {
                console.error('Error applying accounting rules:', error);
                // Fallback to basic journal entries if accounting rules fail
                if (!normalized.journalEntries || normalized.journalEntries.length === 0) {
                    // Create balanced double-entry journal entries
                    if (normalized.transactionType === 'expense') {
                        normalized.journalEntries = [
                            {
                                accountId: '',
                                accountName: normalized.category,
                                debit: normalized.amount,
                                credit: 0,
                                description: normalized.description,
                                category: 'EXPENSE'
                            },
                            {
                                accountId: '',
                                accountName: 'Cash/Bank',
                                debit: 0,
                                credit: normalized.amount,
                                description: 'Cash/Bank payment',
                                category: 'ASSET'
                            }
                        ];
                    }
                    else if (normalized.transactionType === 'income') {
                        normalized.journalEntries = [
                            {
                                accountId: '',
                                accountName: 'Cash/Bank',
                                debit: normalized.amount,
                                credit: 0,
                                description: normalized.description,
                                category: 'ASSET'
                            },
                            {
                                accountId: '',
                                accountName: normalized.category,
                                debit: 0,
                                credit: normalized.amount,
                                description: 'Revenue recognized',
                                category: 'REVENUE'
                            }
                        ];
                    }
                    else {
                        // Default fallback for other transaction types
                        normalized.journalEntries = [
                            {
                                accountId: '',
                                accountName: 'Cash/Bank',
                                debit: normalized.amount,
                                credit: 0,
                                description: normalized.description,
                                category: 'ASSET'
                            },
                            {
                                accountId: '',
                                accountName: normalized.category,
                                debit: 0,
                                credit: normalized.amount,
                                description: normalized.description,
                                category: 'EXPENSE'
                            }
                        ];
                    }
                }
            }
            const validationErrors = this.validateParsedTransaction(normalized);
            return {
                originalText: text,
                parsedTransaction: normalized,
                confidence: normalized.confidence || 0,
                reasoning: parsed.reasoning || 'AI parsing with enforced accounting rules',
                suggestions: this.generateSuggestions(normalized),
                validationErrors
            };
        }
        catch (error) {
            console.error('Failed to parse AI response:', error);
            return this.createErrorResponse(text, 'Failed to parse AI response');
        }
    }
    // Enforce accounting rules and generate balanced double-entry lines
    applyAccountingRules(originalText, txn) {
        const amount = Math.abs(Number(txn.amount || 0));
        const desc = txn.description || originalText;
        const isAdvance = /advance|deposit|prepayment|customer advance|unearned/i.test(originalText);
        const mentionsCash = /cash|bank|transfer|mpesa|wire|deposit|paid|received/i.test(originalText);
        const mentionsCreditSale = /on credit|credit sale|invoice|billed/i.test(originalText);
        const mentionsCreditPurchase = /on credit|credit purchase|bill|vendor bill/i.test(originalText);
        const lines = [];
        // If AI provided lines, keep them but validate balance; otherwise synthesize
        if (!txn.journalEntries || txn.journalEntries.length === 0) {
            if (txn.transactionType === 'income') {
                if (isAdvance) {
                    // Customer advance: Dr Cash, Cr Unearned Revenue
                    lines.push({ accountId: '', accountName: 'Cash/Bank', debit: amount, credit: 0, description: desc, category: 'ASSET' });
                    lines.push({ accountId: '', accountName: 'Unearned Revenue (Customer Advances)', debit: 0, credit: amount, description: 'Advance recorded as liability', category: 'LIABILITY' });
                    txn.category = 'Liability';
                }
                else if (mentionsCreditSale) {
                    // Sale on credit: Dr AR, Cr Revenue
                    lines.push({ accountId: '', accountName: 'Accounts Receivable', debit: amount, credit: 0, description: desc, category: 'ASSET' });
                    lines.push({ accountId: '', accountName: 'Sales Revenue', debit: 0, credit: amount, description: 'Revenue recognized', category: 'REVENUE' });
                    txn.category = 'Revenue';
                }
                else {
                    // Cash receipt: Dr Cash, Cr Revenue
                    lines.push({ accountId: '', accountName: 'Cash/Bank', debit: amount, credit: 0, description: desc, category: 'ASSET' });
                    lines.push({ accountId: '', accountName: 'Sales Revenue', debit: 0, credit: amount, description: 'Revenue recognized', category: 'REVENUE' });
                    txn.category = 'Revenue';
                }
            }
            else if (txn.transactionType === 'expense') {
                const expenseAccount = this.inferExpenseAccount(originalText) || 'Miscellaneous Expense';
                if (mentionsCreditPurchase) {
                    // Purchase on credit: Dr Expense/Inventory, Cr AP
                    lines.push({ accountId: '', accountName: expenseAccount, debit: amount, credit: 0, description: desc, category: 'EXPENSE' });
                    lines.push({ accountId: '', accountName: 'Accounts Payable', debit: 0, credit: amount, description: 'To recognize liability', category: 'LIABILITY' });
                    txn.category = 'Expense';
                }
                else if (mentionsCash || true) {
                    // Cash purchase: Dr Expense, Cr Cash
                    lines.push({ accountId: '', accountName: expenseAccount, debit: amount, credit: 0, description: desc, category: 'EXPENSE' });
                    lines.push({ accountId: '', accountName: 'Cash/Bank', debit: 0, credit: amount, description: 'Cash/Bank payment', category: 'ASSET' });
                    txn.category = 'Expense';
                }
            }
            else if (txn.transactionType === 'transfer') {
                // Simple bank-to-bank transfer: Dr target, Cr source — default generic
                lines.push({ accountId: '', accountName: 'Bank Account', debit: amount, credit: 0, description: desc, category: 'ASSET' });
                lines.push({ accountId: '', accountName: 'Cash', debit: 0, credit: amount, description: 'Transfer out', category: 'ASSET' });
            }
            else if (txn.transactionType === 'payment') {
                // Payment to vendor: Dr AP or Expense, Cr Cash
                lines.push({ accountId: '', accountName: 'Accounts Payable', debit: amount, credit: 0, description: desc, category: 'LIABILITY' });
                lines.push({ accountId: '', accountName: 'Cash/Bank', debit: 0, credit: amount, description: 'Vendor payment', category: 'ASSET' });
            }
            else if (txn.transactionType === 'receipt') {
                // Receipt from customer: Dr Cash, Cr AR
                lines.push({ accountId: '', accountName: 'Cash/Bank', debit: amount, credit: 0, description: desc, category: 'ASSET' });
                lines.push({ accountId: '', accountName: 'Accounts Receivable', debit: 0, credit: amount, description: 'Customer receipt', category: 'ASSET' });
            }
            txn.journalEntries = lines;
        }
        // Ensure balance; if off by rounding, adjust last line
        const totalDebits = txn.journalEntries.reduce((s, l) => s + Number(l.debit || 0), 0);
        const totalCredits = txn.journalEntries.reduce((s, l) => s + Number(l.credit || 0), 0);
        const diff = Math.round((totalDebits - totalCredits) * 100) / 100;
        if (diff !== 0 && txn.journalEntries.length >= 1) {
            const last = txn.journalEntries[txn.journalEntries.length - 1];
            if (diff > 0) {
                last.credit = Number((Number(last.credit || 0) + diff).toFixed(2));
            }
            else {
                last.debit = Number((Number(last.debit || 0) + Math.abs(diff)).toFixed(2));
            }
        }
    }
    inferExpenseAccount(text) {
        const t = text.toLowerCase();
        if (/fuel|gas|petrol|diesel/.test(t))
            return 'Fuel Expense';
        if (/rent|lease/.test(t))
            return 'Rent Expense';
        if (/internet|phone|telecom/.test(t))
            return 'Utilities';
        if (/office|stationery|supplies/.test(t))
            return 'Office Supplies';
        if (/insurance/.test(t))
            return 'Insurance';
        if (/travel|transport/.test(t))
            return 'Travel';
        if (/consult|professional|service/.test(t))
            return 'Professional Services';
        return null;
    }
    validateParsedTransaction(parsed) {
        const errors = [];
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
        // Validate journal entries balance
        if (parsed.journalEntries && Array.isArray(parsed.journalEntries)) {
            const totalDebits = parsed.journalEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
            const totalCredits = parsed.journalEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
            if (Math.abs(totalDebits - totalCredits) > 0.01) {
                errors.push('Journal entries do not balance');
            }
        }
        return errors;
    }
    generateSuggestions(parsed) {
        const suggestions = [];
        if (parsed.confidence < 70) {
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
        return suggestions;
    }
    createErrorResponse(text, error) {
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
                metadata: {}
            },
            confidence: 0,
            reasoning: error,
            suggestions: ['Try rephrasing the transaction description'],
            validationErrors: [error]
        };
    }
    async createJournalEntry(parsedTransaction, tenantId, companyId) {
        try {
            // Validate company exists for this tenant to avoid FK violations
            const company = await prisma.company.findFirst({ where: { id: companyId, tenantId } });
            if (!company) {
                throw new Error('Company not found for tenant');
            }
            // Get or create accounts
            const accounts = await this.getOrCreateAccounts(tenantId, companyId, parsedTransaction);
            // Create journal entry
            const journalEntry = await prisma.journalEntry.create({
                data: {
                    tenantId,
                    companyId: company.id,
                    date: parsedTransaction.date,
                    memo: parsedTransaction.description,
                    reference: parsedTransaction.metadata.reference,
                    status: 'POSTED',
                    lines: {
                        create: parsedTransaction.journalEntries.map(entry => ({
                            tenantId,
                            accountId: entry.accountId,
                            debit: entry.debit,
                            credit: entry.credit,
                            memo: entry.description
                        }))
                    }
                },
                include: {
                    lines: {
                        include: {
                            account: true
                        }
                    }
                }
            });
            // Create transaction record
            const transaction = await prisma.transaction.create({
                data: {
                    tenantId,
                    companyId: company.id,
                    transactionType: parsedTransaction.transactionType,
                    amount: parsedTransaction.amount,
                    currency: parsedTransaction.currency,
                    transactionDate: parsedTransaction.date,
                    status: 'POSTED',
                    linkedJournalEntryId: journalEntry.id
                }
            });
            return {
                journalEntry,
                transaction,
                success: true
            };
        }
        catch (error) {
            console.error('Failed to create journal entry:', error);
            throw new Error('Failed to create journal entry');
        }
    }
    async getOrCreateAccounts(tenantId, companyId, parsedTransaction) {
        const accountMap = new Map();
        // Get account types for this tenant, preferring company-specific but allowing tenant-global (companyId = null)
        const accountTypes = await prisma.accountType.findMany({
            where: {
                tenantId,
                OR: [
                    { companyId },
                    { companyId: null }
                ]
            }
        });
        // Build a map of code -> id, preferring company-specific over global
        const typeMap = new Map();
        for (const type of accountTypes) {
            if (type.companyId === null && !typeMap.has(type.code)) {
                typeMap.set(type.code, type.id);
            }
            else if (type.companyId === companyId) {
                typeMap.set(type.code, type.id);
            }
        }
        for (const entry of parsedTransaction.journalEntries) {
            const accountName = entry.accountName;
            // Check if account exists
            let account = await prisma.account.findFirst({
                where: {
                    tenantId,
                    companyId,
                    name: accountName
                }
            });
            if (!account) {
                // Create new account
                const accountType = this.getAccountType(accountName);
                const typeId = typeMap.get(accountType);
                if (!typeId) {
                    // Only associate to company if it exists to avoid FK violations
                    const existingCompany = await prisma.company.findFirst({ where: { id: companyId, tenantId } });
                    const createdType = await prisma.accountType.create({
                        data: {
                            tenantId,
                            companyId: existingCompany ? companyId : null,
                            code: accountType,
                            name: accountType.charAt(0) + accountType.slice(1).toLowerCase()
                        }
                    });
                    // Update the cache map so subsequent lookups work in this call
                    typeMap.set(accountType, createdType.id);
                }
                let resolvedTypeId = typeMap.get(accountType);
                if (!resolvedTypeId) {
                    // Final safeguard: reload to resolve the type id; if still missing, abort
                    const fallbackType = await prisma.accountType.findFirst({
                        where: {
                            tenantId,
                            code: accountType,
                            OR: [
                                { companyId },
                                { companyId: null }
                            ]
                        }
                    });
                    if (!fallbackType) {
                        throw new Error(`Unable to resolve account type id for ${accountType}`);
                    }
                    resolvedTypeId = fallbackType.id;
                    typeMap.set(accountType, resolvedTypeId);
                }
                account = await prisma.account.create({
                    data: {
                        tenantId,
                        companyId: companyId,
                        code: this.generateAccountCode(accountType),
                        name: accountName,
                        typeId: resolvedTypeId,
                        isActive: true
                    }
                });
            }
            accountMap.set(accountName, account.id);
            entry.accountId = account.id;
        }
        return accountMap;
    }
    getAccountType(accountName) {
        const lowerName = accountName.toLowerCase();
        // Explicit liability overrides
        if (lowerName.includes('unearned') || lowerName.includes('customer deposit') || lowerName.includes('deposit')) {
            return 'LIABILITY';
        }
        if (lowerName.includes('cash') || lowerName.includes('bank') || lowerName.includes('receivable')) {
            return 'ASSET';
        }
        else if (lowerName.includes('payable') || lowerName.includes('loan') || lowerName.includes('credit')) {
            return 'LIABILITY';
        }
        else if (lowerName.includes('equity') || lowerName.includes('earnings')) {
            return 'EQUITY';
        }
        else if (lowerName.includes('revenue') || lowerName.includes('income') || lowerName.includes('sale')) {
            return 'REVENUE';
        }
        else {
            return 'EXPENSE';
        }
    }
    generateAccountCode(accountType) {
        const baseCodes = {
            'ASSET': '1000',
            'LIABILITY': '2000',
            'EQUITY': '3000',
            'REVENUE': '4000',
            'EXPENSE': '5000'
        };
        const baseCode = baseCodes[accountType] || '5000';
        const randomSuffix = Math.floor(Math.random() * 999);
        return `${baseCode}${randomSuffix.toString().padStart(3, '0')}`;
    }
    async suggestImprovements(text) {
        const suggestions = [];
        if (!text.match(ACCOUNTING_PATTERNS.numbers)) {
            suggestions.push('Include the amount in your description');
        }
        if (!ACCOUNTING_PATTERNS.currency.some(currency => text.toUpperCase().includes(currency))) {
            suggestions.push('Specify the currency (e.g., RWF, USD)');
        }
        if (text.length < 10) {
            suggestions.push('Provide more details about the transaction');
        }
        if (!text.includes('paid') && !text.includes('received') && !text.includes('bought') && !text.includes('sold')) {
            suggestions.push('Use action words like "paid", "received", "bought", or "sold"');
        }
        return suggestions;
    }
    async batchParse(texts, tenantId, companyId) {
        const results = [];
        for (const text of texts) {
            try {
                const parsed = await this.parseNaturalLanguage(text, tenantId, companyId);
                results.push(parsed);
            }
            catch (error) {
                console.error(`Failed to parse: ${text}`, error);
                results.push(this.createErrorResponse(text, 'Parsing failed'));
            }
        }
        return results;
    }
}
export const conversationalParser = new ConversationalPromptParser();
