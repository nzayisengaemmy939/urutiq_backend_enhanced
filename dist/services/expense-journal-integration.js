import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class ExpenseJournalIntegration {
    prisma;
    constructor() {
        this.prisma = prisma;
    }
    /**
     * Main integration method - handles all expense to journal entry operations
     */
    async integrateExpenseWithJournal(options) {
        const { tenantId, companyId, expenseId, action, userId } = options;
        try {
            // Get the expense with all related data
            const expense = await this.prisma.expense.findUnique({
                where: { id: expenseId },
                include: {
                    category: true,
                    account: true,
                    vendor: true
                }
            });
            if (!expense) {
                throw new Error(`Expense with ID ${expenseId} not found`);
            }
            // Handle different actions
            switch (action) {
                case 'create':
                    return await this.createExpenseJournalEntry(expense, tenantId, companyId, userId);
                case 'update':
                    return await this.updateExpenseJournalEntry(expense, tenantId, companyId, userId);
                case 'approve':
                    return await this.approveExpenseJournalEntry(expense, tenantId, companyId, userId);
                case 'reject':
                    return await this.rejectExpenseJournalEntry(expense, tenantId, companyId, userId);
                case 'delete':
                    return await this.deleteExpenseJournalEntry(expense, tenantId, companyId, userId);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        }
        catch (error) {
            console.error('Error in expense-journal integration:', error);
            throw error;
        }
    }
    /**
     * Create journal entry for new expense
     */
    async createExpenseJournalEntry(expense, tenantId, companyId, userId) {
        // Only create journal entries for non-draft expenses
        if (expense.status === 'draft') {
            console.log(`Expense ${expense.id} is in draft status, skipping journal entry creation`);
            return null;
        }
        const journalEntryData = await this.buildJournalEntryData(expense, tenantId, companyId, 'create');
        if (!journalEntryData) {
            console.log(`No journal entry data generated for expense ${expense.id}`);
            return null;
        }
        // Create the journal entry
        const journalEntry = await this.prisma.journalEntry.create({
            data: {
                tenantId,
                companyId,
                date: journalEntryData.date,
                memo: journalEntryData.memo,
                reference: journalEntryData.reference,
                entryTypeId: journalEntryData.entryTypeId,
                status: 'DRAFT',
                createdById: userId,
                lines: {
                    create: journalEntryData.lines.map(line => ({
                        tenantId,
                        accountId: line.accountId,
                        debit: line.debit,
                        credit: line.credit,
                        memo: line.memo,
                        department: line.department,
                        project: line.project
                    }))
                }
            },
            include: {
                lines: {
                    include: {
                        account: true
                    }
                },
                entryType: true
            }
        });
        // Auto-post the journal entry if expense is approved
        if (expense.status === 'approved') {
            await this.postJournalEntry(journalEntry.id, tenantId, companyId, userId);
        }
        console.log(`Created journal entry ${journalEntry.id} for expense ${expense.id}`);
        return journalEntry;
    }
    /**
     * Update journal entry for expense changes
     */
    async updateExpenseJournalEntry(expense, tenantId, companyId, userId) {
        // Find existing journal entry for this expense
        const existingEntry = await this.prisma.journalEntry.findFirst({
            where: {
                tenantId,
                companyId,
                reference: {
                    contains: `-${expense.id.substring(0, 8).toUpperCase()}`
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
        if (!existingEntry) {
            console.log(`No existing journal entry found for expense ${expense.id}, creating new one`);
            return await this.createExpenseJournalEntry(expense, tenantId, companyId, userId);
        }
        // Only update if the entry is still in DRAFT status
        if (existingEntry.status !== 'DRAFT') {
            console.log(`Journal entry ${existingEntry.id} is already posted, creating reversal and new entry`);
            return await this.createReversalAndNewEntry(expense, existingEntry, tenantId, companyId, userId);
        }
        // Update the existing journal entry
        const journalEntryData = await this.buildJournalEntryData(expense, tenantId, companyId, 'update');
        if (!journalEntryData) {
            console.log(`No journal entry data generated for expense ${expense.id}`);
            return null;
        }
        // Delete existing lines and create new ones
        await this.prisma.journalLine.deleteMany({
            where: { entryId: existingEntry.id }
        });
        const updatedEntry = await this.prisma.journalEntry.update({
            where: { id: existingEntry.id },
            data: {
                date: journalEntryData.date,
                memo: journalEntryData.memo,
                reference: journalEntryData.reference,
                entryTypeId: journalEntryData.entryTypeId,
                lines: {
                    create: journalEntryData.lines.map(line => ({
                        tenantId,
                        accountId: line.accountId,
                        debit: line.debit,
                        credit: line.credit,
                        memo: line.memo,
                        department: line.department,
                        project: line.project
                    }))
                }
            },
            include: {
                lines: {
                    include: {
                        account: true
                    }
                },
                entryType: true
            }
        });
        console.log(`Updated journal entry ${updatedEntry.id} for expense ${expense.id}`);
        return updatedEntry;
    }
    /**
     * Approve expense and post journal entry
     */
    async approveExpenseJournalEntry(expense, tenantId, companyId, userId) {
        // Find existing journal entry
        const existingEntry = await this.prisma.journalEntry.findFirst({
            where: {
                tenantId,
                companyId,
                reference: {
                    contains: `-${expense.id.substring(0, 8).toUpperCase()}`
                }
            }
        });
        if (!existingEntry) {
            console.log(`No journal entry found for expense ${expense.id}, creating new one`);
            return await this.createExpenseJournalEntry(expense, tenantId, companyId, userId);
        }
        // Post the journal entry
        await this.postJournalEntry(existingEntry.id, tenantId, companyId, userId);
        console.log(`Approved and posted journal entry ${existingEntry.id} for expense ${expense.id}`);
        return existingEntry;
    }
    /**
     * Reject expense and reverse journal entry if posted
     */
    async rejectExpenseJournalEntry(expense, tenantId, companyId, userId) {
        const existingEntry = await this.prisma.journalEntry.findFirst({
            where: {
                tenantId,
                companyId,
                reference: {
                    contains: `-${expense.id.substring(0, 8).toUpperCase()}`
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
        if (!existingEntry) {
            console.log(`No journal entry found for expense ${expense.id}`);
            return null;
        }
        if (existingEntry.status === 'POSTED') {
            // Create reversal entry
            await this.createReversalEntry(existingEntry, tenantId, companyId, userId);
        }
        else {
            // Just delete the draft entry
            await this.prisma.journalEntry.delete({
                where: { id: existingEntry.id }
            });
        }
        console.log(`Rejected expense ${expense.id} and handled journal entry ${existingEntry.id}`);
        return existingEntry;
    }
    /**
     * Delete expense and reverse journal entry
     */
    async deleteExpenseJournalEntry(expense, tenantId, companyId, userId) {
        const existingEntry = await this.prisma.journalEntry.findFirst({
            where: {
                tenantId,
                companyId,
                reference: {
                    contains: `-${expense.id.substring(0, 8).toUpperCase()}`
                }
            }
        });
        if (!existingEntry) {
            console.log(`No journal entry found for expense ${expense.id}`);
            return null;
        }
        if (existingEntry.status === 'POSTED') {
            // Create reversal entry
            await this.createReversalEntry(existingEntry, tenantId, companyId, userId);
        }
        else {
            // Just delete the draft entry
            await this.prisma.journalEntry.delete({
                where: { id: existingEntry.id }
            });
        }
        console.log(`Deleted expense ${expense.id} and handled journal entry ${existingEntry.id}`);
        return existingEntry;
    }
    /**
     * Generate comprehensive journal entry reference
     */
    generateExpenseReference(expense) {
        const expenseDate = new Date(expense.expenseDate);
        const dateStr = expenseDate.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format
        const amountStr = expense.amount.toFixed(2).replace('.', '').padStart(8, '0'); // 8-digit amount
        const categoryCode = expense.category?.code || 'MISC';
        const vendorCode = expense.vendor?.name?.substring(0, 3).toUpperCase() || 'UNK';
        const expenseIdShort = expense.id.substring(0, 8).toUpperCase();
        return `EXP-${dateStr}-${amountStr}-${categoryCode}-${vendorCode}-${expenseIdShort}`;
    }
    /**
     * Build journal entry data from expense
     */
    async buildJournalEntryData(expense, tenantId, companyId, action) {
        if (!expense.accountId) {
            console.log(`Expense ${expense.id} has no GL account, skipping journal entry`);
            return null;
        }
        // Get the expense account
        const expenseAccount = await this.prisma.account.findUnique({
            where: { id: expense.accountId }
        });
        if (!expenseAccount) {
            console.log(`Expense account ${expense.accountId} not found`);
            return null;
        }
        // Get or create expense journal entry type
        const entryType = await this.getOrCreateExpenseEntryType(tenantId, companyId);
        // Determine the offset account based on payment method
        const offsetAccount = await this.getOffsetAccount(expense, tenantId, companyId);
        if (!offsetAccount) {
            console.log(`Could not determine offset account for expense ${expense.id}`);
            return null;
        }
        // Build journal entry lines
        const lines = await this.buildJournalLines(expense, expenseAccount, offsetAccount, tenantId, companyId);
        return {
            date: expense.expenseDate,
            memo: `Expense: ${expense.description}`,
            reference: this.generateExpenseReference(expense),
            entryTypeId: entryType.id,
            lines,
            department: expense.department,
            project: expense.project,
            requiresApproval: false
        };
    }
    /**
     * Build journal entry lines for expense
     */
    async buildJournalLines(expense, expenseAccount, offsetAccount, tenantId, companyId) {
        const lines = [];
        // Expense line (debit)
        lines.push({
            accountId: expenseAccount.id,
            debit: expense.totalAmount,
            credit: 0,
            memo: expense.description,
            department: expense.department,
            project: expense.project
        });
        // Tax line (debit) if applicable
        if (expense.taxAmount && expense.taxAmount > 0) {
            // Find tax payable account
            const taxAccount = await this.findTaxAccount(expense, tenantId, companyId);
            if (taxAccount) {
                lines.push({
                    accountId: taxAccount.id,
                    debit: expense.taxAmount,
                    credit: 0,
                    memo: `Tax for ${expense.description}`,
                    department: expense.department,
                    project: expense.project
                });
            }
        }
        // Offset line (credit) - Cash, Accounts Payable, etc.
        const offsetAmount = expense.totalAmount + (expense.taxAmount || 0);
        lines.push({
            accountId: offsetAccount.id,
            debit: 0,
            credit: offsetAmount,
            memo: `Payment for ${expense.description}`,
            department: expense.department,
            project: expense.project
        });
        return lines;
    }
    /**
     * Get or create expense journal entry type
     */
    async getOrCreateExpenseEntryType(tenantId, companyId) {
        let entryType = await this.prisma.journalEntryType.findFirst({
            where: {
                tenantId,
                companyId,
                category: 'EXPENSE'
            }
        });
        if (!entryType) {
            entryType = await this.prisma.journalEntryType.create({
                data: {
                    tenantId,
                    companyId,
                    category: 'EXPENSE',
                    name: 'Expense Entry',
                    description: 'Journal entries for expense transactions',
                    isActive: true,
                    requiresApproval: false,
                    maxAmount: null
                }
            });
        }
        return entryType;
    }
    /**
     * Get offset account based on payment method
     */
    async getOffsetAccount(expense, tenantId, companyId) {
        const paymentMethod = expense.paymentMethod?.toLowerCase();
        console.log(`🔍 Finding offset account for expense ${expense.id}, payment method: ${paymentMethod}`);
        // First try to find by specific account codes
        let account = null;
        switch (paymentMethod) {
            case 'cash':
                account = await this.findAccountByCode(tenantId, companyId, '1001'); // Cash
                if (!account) {
                    // Fallback: find any cash account
                    account = await this.findAccountByType(tenantId, companyId, 'ASSET', 'cash');
                }
                break;
            case 'check':
            case 'bank_transfer':
                account = await this.findAccountByCode(tenantId, companyId, '1002'); // Bank Account
                if (!account) {
                    // Fallback: find any bank account
                    account = await this.findAccountByType(tenantId, companyId, 'ASSET', 'bank');
                }
                break;
            case 'credit_card':
                account = await this.findAccountByCode(tenantId, companyId, '2001'); // Credit Card Payable
                if (!account) {
                    // Fallback: find any credit card account
                    account = await this.findAccountByType(tenantId, companyId, 'LIABILITY', 'credit');
                }
                break;
            default:
                // Default to Accounts Payable
                account = await this.findAccountByCode(tenantId, companyId, '2000');
                if (!account) {
                    // Fallback: find any accounts payable
                    account = await this.findAccountByType(tenantId, companyId, 'LIABILITY', 'payable');
                }
                break;
        }
        // If still no account found, try to find any liability account as fallback
        if (!account) {
            account = await this.findAnyLiabilityAccount(tenantId, companyId);
        }
        // If still no account found, try to find any asset account as fallback
        if (!account) {
            console.log(`🔍 No account found by type, trying any asset account...`);
            account = await this.findAnyAssetAccount(tenantId, companyId);
        }
        if (account) {
            console.log(`✅ Found offset account: ${account.name} (${account.code})`);
        }
        else {
            console.log(`❌ No offset account found for expense ${expense.id}`);
        }
        return account;
    }
    /**
     * Find account by code
     */
    async findAccountByCode(tenantId, companyId, code) {
        return await this.prisma.account.findFirst({
            where: {
                tenantId,
                companyId,
                code
            }
        });
    }
    /**
     * Find account by type and name pattern
     */
    async findAccountByType(tenantId, companyId, typeCode, namePattern) {
        // First get the account type
        const accountType = await this.prisma.accountType.findFirst({
            where: {
                tenantId,
                companyId,
                code: typeCode
            }
        });
        if (!accountType) {
            return null;
        }
        // Find account by type and name pattern
        return await this.prisma.account.findFirst({
            where: {
                tenantId,
                companyId,
                typeId: accountType.id,
                name: {
                    contains: namePattern
                }
            }
        });
    }
    /**
     * Find any liability account as fallback
     */
    async findAnyLiabilityAccount(tenantId, companyId) {
        const liabilityType = await this.prisma.accountType.findFirst({
            where: {
                tenantId,
                companyId,
                code: 'LIABILITY'
            }
        });
        if (!liabilityType) {
            return null;
        }
        return await this.prisma.account.findFirst({
            where: {
                tenantId,
                companyId,
                typeId: liabilityType.id
            }
        });
    }
    /**
     * Find any asset account as fallback
     */
    async findAnyAssetAccount(tenantId, companyId) {
        const assetType = await this.prisma.accountType.findFirst({
            where: {
                tenantId,
                companyId,
                code: 'ASSET'
            }
        });
        if (!assetType) {
            return null;
        }
        return await this.prisma.account.findFirst({
            where: {
                tenantId,
                companyId,
                typeId: assetType.id
            }
        });
    }
    /**
     * Find tax account for expense
     */
    async findTaxAccount(expense, tenantId, companyId) {
        // SENIOR ACCOUNTING: Use correct tax account (Taxes Payable - 2300)
        const taxAccount = await this.findAccountByCode(tenantId, companyId, '2300');
        if (taxAccount) {
            console.log(`✅ Found correct tax account: ${taxAccount.name} (${taxAccount.code})`);
            return taxAccount;
        }
        // Fallback: try to find any tax-related account
        const fallbackTaxAccount = await this.prisma.account.findFirst({
            where: {
                tenantId,
                companyId,
                name: {
                    contains: 'Tax'
                }
            }
        });
        if (fallbackTaxAccount) {
            console.log(`✅ Found fallback tax account: ${fallbackTaxAccount.name} (${fallbackTaxAccount.code})`);
            return fallbackTaxAccount;
        }
        // If no tax account found, return null (tax line will be skipped)
        console.log(`⚠️ No tax account found for expense ${expense.id}, skipping tax line`);
        return null;
    }
    /**
     * Post journal entry
     */
    async postJournalEntry(entryId, tenantId, companyId, userId) {
        // First, try to find a valid user ID if none provided
        let validUserId = userId;
        if (!validUserId) {
            const systemUser = await this.prisma.appUser.findFirst({
                where: {
                    tenantId,
                    email: 'admin@urutiq.app' // Use the admin user we created
                }
            });
            validUserId = systemUser?.id || 'system';
        }
        // Update the journal entry status
        await this.prisma.journalEntry.update({
            where: { id: entryId },
            data: {
                status: 'POSTED'
            }
        });
        // Only create audit trail if we have a valid user ID
        if (validUserId && validUserId !== 'system') {
            try {
                await this.prisma.journalEntryAudit.create({
                    data: {
                        tenantId,
                        entryId,
                        userId: validUserId,
                        action: 'POSTED',
                        comments: 'Entry posted from expense integration'
                    }
                });
            }
            catch (auditError) {
                console.log('Warning: Could not create audit trail entry:', auditError);
                // Don't fail the journal entry posting if audit trail creation fails
            }
        }
    }
    /**
     * Create reversal entry
     */
    async createReversalEntry(originalEntry, tenantId, companyId, userId) {
        if (!originalEntry.lines || !Array.isArray(originalEntry.lines)) {
            console.log(`No lines found for journal entry ${originalEntry.id}, cannot create reversal`);
            return null;
        }
        const reversalLines = originalEntry.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.credit, // Swap debit and credit
            credit: line.debit,
            memo: `Reversal: ${line.memo}`,
            department: line.department,
            project: line.project
        }));
        const reversalEntry = await this.prisma.journalEntry.create({
            data: {
                tenantId,
                companyId: originalEntry.companyId,
                date: new Date(),
                memo: `Reversal: ${originalEntry.memo}`,
                reference: `REV-${originalEntry.reference}`,
                entryTypeId: originalEntry.entryTypeId,
                status: 'POSTED',
                createdById: userId,
                lines: {
                    create: reversalLines.map((line) => ({
                        tenantId,
                        accountId: line.accountId,
                        debit: line.debit,
                        credit: line.credit,
                        memo: line.memo,
                        department: line.department,
                        project: line.project
                    }))
                }
            }
        });
        // Mark original entry as reversed
        await this.prisma.journalEntry.update({
            where: { id: originalEntry.id },
            data: { status: 'REVERSED' }
        });
        return reversalEntry;
    }
    /**
     * Create reversal and new entry for updates
     */
    async createReversalAndNewEntry(expense, existingEntry, tenantId, companyId, userId) {
        // Create reversal
        await this.createReversalEntry(existingEntry, tenantId, companyId, userId);
        // Create new entry
        return await this.createExpenseJournalEntry(expense, tenantId, companyId, userId);
    }
}
// Export singleton instance
export const expenseJournalIntegration = new ExpenseJournalIntegration();
