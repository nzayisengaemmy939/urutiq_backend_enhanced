import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class BankIntegrationService {
    /**
     * Create accounting journal entries for bank transactions
     */
    static async createJournalEntriesForBankTransaction(tenantId, companyId, bankTransactionId) {
        const bankTransaction = await prisma.bankTransaction.findFirst({
            where: { id: bankTransactionId, tenantId },
            include: { bankAccount: true }
        });
        if (!bankTransaction || !bankTransaction.bankAccount) {
            throw new Error('Bank transaction or account not found');
        }
        // Get account mappings
        const cashAccount = await this.getAccountByPurpose(tenantId, companyId, 'CASH');
        const arAccount = await this.getAccountByPurpose(tenantId, companyId, 'AR');
        const apAccount = await this.getAccountByPurpose(tenantId, companyId, 'AP');
        const revenueAccount = await this.getAccountByPurpose(tenantId, companyId, 'REVENUE');
        const expenseAccount = await this.getAccountByPurpose(tenantId, companyId, 'EXPENSE');
        if (!cashAccount) {
            throw new Error('Cash account mapping not found');
        }
        const result = await prisma.$transaction(async (tx) => {
            // Create journal entry
            const journalEntry = await tx.journalEntry.create({
                data: {
                    tenantId,
                    companyId,
                    date: bankTransaction.transactionDate,
                    memo: `Bank Transaction: ${bankTransaction.description || 'Transaction'}`,
                    reference: bankTransaction.reference || bankTransaction.id,
                    status: 'POSTED'
                }
            });
            // Create journal lines based on transaction type
            if (bankTransaction.transactionType === 'credit') {
                // Money coming in - debit cash, credit appropriate account
                await tx.journalLine.create({
                    data: {
                        tenantId,
                        entryId: journalEntry.id,
                        accountId: cashAccount.id,
                        debit: bankTransaction.amount,
                        credit: 0,
                        memo: 'Cash received'
                    }
                });
                // Determine the credit account based on transaction context
                let creditAccount = arAccount || revenueAccount;
                if (!creditAccount) {
                    throw new Error('No appropriate credit account found');
                }
                await tx.journalLine.create({
                    data: {
                        tenantId,
                        entryId: journalEntry.id,
                        accountId: creditAccount.id,
                        debit: 0,
                        credit: bankTransaction.amount,
                        memo: 'Revenue/AR'
                    }
                });
            }
            else if (bankTransaction.transactionType === 'debit') {
                // Money going out - credit cash, debit appropriate account
                await tx.journalLine.create({
                    data: {
                        tenantId,
                        entryId: journalEntry.id,
                        accountId: cashAccount.id,
                        debit: 0,
                        credit: bankTransaction.amount,
                        memo: 'Cash paid'
                    }
                });
                // Determine the debit account based on transaction context
                let debitAccount = apAccount || expenseAccount;
                if (!debitAccount) {
                    throw new Error('No appropriate debit account found');
                }
                await tx.journalLine.create({
                    data: {
                        tenantId,
                        entryId: journalEntry.id,
                        accountId: debitAccount.id,
                        debit: bankTransaction.amount,
                        credit: 0,
                        memo: 'Expense/AP'
                    }
                });
            }
            return journalEntry;
        });
        return result;
    }
    /**
     * Get account by purpose (CASH, AR, AP, etc.)
     */
    static async getAccountByPurpose(tenantId, companyId, purpose) {
        const mapping = await prisma.accountMapping.findFirst({
            where: { tenantId, companyId, purpose },
            include: { account: true }
        });
        return mapping?.account || null;
    }
    /**
     * Process bank feed data and create transactions
     */
    static async processBankFeedData(tenantId, companyId, bankAccountId, feedData) {
        const results = [];
        for (const transactionData of feedData) {
            try {
                // Check if transaction already exists
                const existingTransaction = await prisma.bankTransaction.findFirst({
                    where: {
                        tenantId,
                        bankAccountId,
                        externalId: transactionData.externalId
                    }
                });
                if (existingTransaction) {
                    // Update existing transaction
                    const updatedTransaction = await prisma.bankTransaction.update({
                        where: { id: existingTransaction.id },
                        data: {
                            amount: transactionData.amount,
                            description: transactionData.description,
                            merchantName: transactionData.merchantName,
                            merchantCategory: transactionData.merchantCategory,
                            transactionType: transactionData.transactionType,
                            status: transactionData.status || 'unreconciled',
                            updatedAt: new Date()
                        }
                    });
                    results.push({ action: 'updated', transaction: updatedTransaction });
                }
                else {
                    // Create new transaction
                    const newTransaction = await prisma.bankTransaction.create({
                        data: {
                            tenantId,
                            bankAccountId,
                            externalId: transactionData.externalId,
                            transactionDate: new Date(transactionData.transactionDate),
                            postedDate: transactionData.postedDate ? new Date(transactionData.postedDate) : null,
                            amount: transactionData.amount,
                            currency: transactionData.currency || 'USD',
                            description: transactionData.description,
                            merchantName: transactionData.merchantName,
                            merchantCategory: transactionData.merchantCategory,
                            transactionType: transactionData.transactionType,
                            reference: transactionData.reference,
                            status: transactionData.status || 'unreconciled',
                            location: transactionData.location,
                            authorizationCode: transactionData.authorizationCode
                        }
                    });
                    results.push({ action: 'created', transaction: newTransaction });
                }
            }
            catch (error) {
                console.error('Error processing bank feed transaction:', error);
                results.push({ action: 'error', error: error instanceof Error ? error.message : 'Unknown error', data: transactionData });
            }
        }
        return results;
    }
    /**
     * Generate cash flow forecast based on bank data
     */
    static async generateCashFlowForecast(tenantId, companyId, bankAccountId, days = 30) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
        // Get historical transactions
        const transactions = await prisma.bankTransaction.findMany({
            where: {
                tenantId,
                bankAccountId,
                transactionDate: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: { transactionDate: 'asc' }
        });
        // Get current balance
        const bankAccount = await prisma.bankAccount.findFirst({
            where: { id: bankAccountId, tenantId }
        });
        if (!bankAccount) {
            throw new Error('Bank account not found');
        }
        // Analyze transaction patterns
        const dailyAverages = this.calculateDailyAverages(transactions);
        const recurringPatterns = this.identifyRecurringPatterns(transactions);
        // Generate forecast
        const forecast = [];
        let currentBalance = Number(bankAccount.balance);
        for (let i = 1; i <= days; i++) {
            const forecastDate = new Date(endDate.getTime() + (i * 24 * 60 * 60 * 1000));
            const dayOfWeek = forecastDate.getDay();
            // Apply daily averages
            const expectedChange = dailyAverages[dayOfWeek] || 0;
            currentBalance += expectedChange;
            // Apply recurring patterns
            const recurringChange = this.getRecurringChangeForDate(recurringPatterns, forecastDate);
            currentBalance += recurringChange;
            forecast.push({
                date: forecastDate,
                projectedBalance: currentBalance,
                expectedChange: expectedChange + recurringChange,
                confidence: this.calculateConfidence(transactions.length, i)
            });
        }
        return {
            currentBalance: Number(bankAccount.balance),
            forecast,
            analysis: {
                dailyAverages,
                recurringPatterns: recurringPatterns.length,
                transactionCount: transactions.length,
                averageDailyChange: transactions.reduce((sum, t) => sum + Number(t.amount), 0) / days
            }
        };
    }
    static calculateDailyAverages(transactions) {
        const dailyTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const dailyCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        transactions.forEach(transaction => {
            const dayOfWeek = new Date(transaction.transactionDate).getDay();
            dailyTotals[dayOfWeek] += Number(transaction.amount);
            dailyCounts[dayOfWeek] += 1;
        });
        const averages = {};
        for (let day = 0; day < 7; day++) {
            averages[day] = dailyCounts[day] > 0 ? dailyTotals[day] / dailyCounts[day] : 0;
        }
        return averages;
    }
    static identifyRecurringPatterns(transactions) {
        // Simple pattern identification - look for transactions with similar amounts and descriptions
        const patterns = [];
        const grouped = {};
        transactions.forEach(transaction => {
            const key = `${transaction.description}_${Math.abs(Number(transaction.amount))}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(transaction);
        });
        Object.values(grouped).forEach((group) => {
            if (group.length >= 2) {
                patterns.push({
                    description: group[0].description,
                    amount: group[0].amount,
                    frequency: group.length,
                    lastOccurrence: Math.max(...group.map(t => new Date(t.transactionDate).getTime()))
                });
            }
        });
        return patterns;
    }
    static getRecurringChangeForDate(patterns, date) {
        let change = 0;
        patterns.forEach(pattern => {
            // Simple logic: if it's been about 30 days since last occurrence, expect it again
            const daysSinceLast = (date.getTime() - pattern.lastOccurrence) / (24 * 60 * 60 * 1000);
            if (daysSinceLast >= 25 && daysSinceLast <= 35) {
                change += Number(pattern.amount);
            }
        });
        return change;
    }
    static calculateConfidence(transactionCount, forecastDay) {
        // Confidence decreases as we forecast further into the future
        const baseConfidence = Math.min(transactionCount / 30, 1); // More transactions = higher confidence
        const timeDecay = Math.max(0, 1 - (forecastDay / 30)); // Confidence decreases over time
        return Math.round((baseConfidence * timeDecay) * 100) / 100;
    }
}
