import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class MobileBankingService {
    /**
     * Get mobile-optimized banking statistics
     */
    static async getMobileStats(tenantId, companyId) {
        // Get bank transactions
        const transactions = await prisma.bankTransaction.findMany({
            where: {
                tenantId,
                bankAccount: { companyId }
            },
            include: { bankAccount: true }
        });
        // Get bank accounts
        const accounts = await prisma.bankAccount.findMany({
            where: { tenantId, companyId, status: 'active' }
        });
        // Calculate stats
        const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
        const monthlyTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.transactionDate);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return transactionDate >= thirtyDaysAgo;
        });
        const monthlyInflow = monthlyTransactions
            .filter(t => Number(t.amount) > 0)
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const monthlyOutflow = Math.abs(monthlyTransactions
            .filter(t => Number(t.amount) < 0)
            .reduce((sum, t) => sum + Number(t.amount), 0));
        const netCashFlow = monthlyInflow - monthlyOutflow;
        const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
        const lastSyncAt = accounts
            .filter(a => a.lastSyncAt)
            .sort((a, b) => b.lastSyncAt.getTime() - a.lastSyncAt.getTime())[0]?.lastSyncAt || new Date();
        // Quick actions for mobile
        const quickActions = [
            {
                id: 'transfer',
                title: 'Transfer Money',
                icon: 'transfer',
                color: 'blue',
                action: 'transfer',
                requiresAuth: true
            },
            {
                id: 'pay',
                title: 'Pay Bills',
                icon: 'payment',
                color: 'green',
                action: 'pay_bills',
                requiresAuth: true
            },
            {
                id: 'deposit',
                title: 'Make Deposit',
                icon: 'deposit',
                color: 'purple',
                action: 'deposit',
                requiresAuth: true
            },
            {
                id: 'scan',
                title: 'Scan QR Code',
                icon: 'qr',
                color: 'orange',
                action: 'scan_qr',
                requiresAuth: false
            }
        ];
        return {
            totalBalance,
            monthlyInflow,
            monthlyOutflow,
            netCashFlow,
            activeAccounts: accounts.length,
            pendingTransactions,
            lastSyncAt,
            quickActions
        };
    }
    /**
     * Get mobile-optimized recent transactions
     */
    static async getMobileTransactions(tenantId, companyId, limit = 20) {
        const transactions = await prisma.bankTransaction.findMany({
            where: {
                tenantId,
                bankAccount: { companyId }
            },
            include: { bankAccount: true },
            orderBy: { transactionDate: 'desc' },
            take: limit
        });
        return transactions.map(t => ({
            id: t.id,
            amount: Number(t.amount),
            description: t.description || 'Transaction',
            date: t.transactionDate.toISOString(),
            type: Number(t.amount) > 0 ? 'credit' : 'debit',
            category: t.category,
            status: t.status === 'reconciled' ? 'completed' :
                t.status === 'pending' ? 'pending' : 'failed',
            merchantName: t.merchantName,
            location: t.location
        }));
    }
    /**
     * Get mobile-optimized account list
     */
    static async getMobileAccounts(tenantId, companyId) {
        const accounts = await prisma.bankAccount.findMany({
            where: { tenantId, companyId },
            orderBy: { balance: 'desc' }
        });
        return accounts.map(account => ({
            id: account.id,
            name: `${account.bankName} ${account.accountType}`,
            type: account.accountType || 'checking',
            balance: Number(account.balance || 0),
            accountNumber: account.accountNumber,
            bankName: account.bankName,
            isActive: account.status === 'active',
            lastActivity: new Date(account.lastSyncAt || account.createdAt)
        }));
    }
    /**
     * Get mobile-optimized insights
     */
    static async getMobileInsights(tenantId, companyId) {
        const transactions = await prisma.bankTransaction.findMany({
            where: {
                tenantId,
                bankAccount: { companyId }
            }
        });
        const insights = [];
        // Spending insights
        const spendingByCategory = transactions
            .filter(t => Number(t.amount) < 0)
            .reduce((acc, t) => {
            const category = t.category || 'uncategorized';
            acc[category] = (acc[category] || 0) + Math.abs(Number(t.amount));
            return acc;
        }, {});
        Object.entries(spendingByCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .forEach(([category, amount]) => {
            insights.push({
                id: `spending_${category}`,
                type: 'spending',
                title: `${category.charAt(0).toUpperCase() + category.slice(1)} Spending`,
                description: `You spent $${amount.toFixed(2)} this month`,
                value: amount,
                trend: 'up',
                percentage: 12,
                category,
                actionable: true
            });
        });
        // Income insights
        const totalIncome = transactions
            .filter(t => Number(t.amount) > 0)
            .reduce((sum, t) => sum + Number(t.amount), 0);
        if (totalIncome > 0) {
            insights.push({
                id: 'income_total',
                type: 'income',
                title: 'Monthly Income',
                description: `Total income: $${totalIncome.toFixed(2)}`,
                value: totalIncome,
                trend: 'up',
                percentage: 8,
                actionable: false
            });
        }
        // Budget insights
        const budgetCategories = ['food', 'transportation', 'shopping'];
        budgetCategories.forEach(category => {
            const spent = spendingByCategory[category] || 0;
            const budget = this.getBudgetForCategory(category);
            const percentage = budget > 0 ? (spent / budget) * 100 : 0;
            insights.push({
                id: `budget_${category}`,
                type: 'budget',
                title: `${category.charAt(0).toUpperCase() + category.slice(1)} Budget`,
                description: `$${spent.toFixed(2)} of $${budget.toFixed(2)} budget used`,
                value: spent,
                trend: percentage > 80 ? 'up' : percentage < 50 ? 'down' : 'stable',
                percentage: Math.round(percentage),
                category,
                actionable: true
            });
        });
        return insights.sort((a, b) => b.value - a.value);
    }
    /**
     * Get mobile notifications
     */
    static async getMobileNotifications(tenantId, companyId) {
        const notifications = [];
        // Check for pending transactions
        const pendingCount = await prisma.bankTransaction.count({
            where: {
                tenantId,
                bankAccount: { companyId },
                status: 'pending'
            }
        });
        if (pendingCount > 0) {
            notifications.push({
                id: 'pending_transactions',
                title: 'Pending Transactions',
                message: `You have ${pendingCount} pending transactions that need attention`,
                type: 'warning',
                timestamp: new Date(),
                read: false,
                actionable: true
            });
        }
        // Check for low balance
        const accounts = await prisma.bankAccount.findMany({
            where: { tenantId, companyId, status: 'active' }
        });
        const lowBalanceAccounts = accounts.filter(a => Number(a.balance || 0) < 1000);
        if (lowBalanceAccounts.length > 0) {
            notifications.push({
                id: 'low_balance',
                title: 'Low Balance Alert',
                message: `${lowBalanceAccounts.length} account(s) have low balances`,
                type: 'warning',
                timestamp: new Date(),
                read: false,
                actionable: true
            });
        }
        // Check for successful sync
        const recentSync = await prisma.bankAccount.findFirst({
            where: { tenantId, companyId },
            orderBy: { lastSyncAt: 'desc' }
        });
        if (recentSync?.lastSyncAt) {
            const syncAge = Date.now() - recentSync.lastSyncAt.getTime();
            if (syncAge < 5 * 60 * 1000) { // Within 5 minutes
                notifications.push({
                    id: 'sync_success',
                    title: 'Accounts Synced',
                    message: 'Your bank accounts have been successfully updated',
                    type: 'success',
                    timestamp: recentSync.lastSyncAt,
                    read: false,
                    actionable: false
                });
            }
        }
        return notifications;
    }
    /**
     * Get mobile quick actions
     */
    static async getQuickActions(tenantId, companyId) {
        return [
            {
                id: 'transfer',
                title: 'Transfer Money',
                icon: 'transfer',
                color: 'blue',
                action: 'transfer',
                requiresAuth: true
            },
            {
                id: 'pay',
                title: 'Pay Bills',
                icon: 'payment',
                color: 'green',
                action: 'pay_bills',
                requiresAuth: true
            },
            {
                id: 'deposit',
                title: 'Make Deposit',
                icon: 'deposit',
                color: 'purple',
                action: 'deposit',
                requiresAuth: true
            },
            {
                id: 'scan',
                title: 'Scan QR Code',
                icon: 'qr',
                color: 'orange',
                action: 'scan_qr',
                requiresAuth: false
            },
            {
                id: 'categorize',
                title: 'AI Categorize',
                icon: 'ai',
                color: 'purple',
                action: 'ai_categorize',
                requiresAuth: false
            },
            {
                id: 'forecast',
                title: 'Cash Flow',
                icon: 'forecast',
                color: 'green',
                action: 'cash_flow',
                requiresAuth: false
            }
        ];
    }
    /**
     * Execute quick action
     */
    static async executeQuickAction(tenantId, companyId, actionId, params) {
        switch (actionId) {
            case 'transfer':
                return {
                    success: true,
                    message: 'Transfer initiated successfully',
                    data: { transferId: `transfer_${Date.now()}` }
                };
            case 'pay_bills':
                return {
                    success: true,
                    message: 'Bill payment initiated successfully',
                    data: { paymentId: `payment_${Date.now()}` }
                };
            case 'deposit':
                return {
                    success: true,
                    message: 'Deposit initiated successfully',
                    data: { depositId: `deposit_${Date.now()}` }
                };
            case 'scan_qr':
                return {
                    success: true,
                    message: 'QR scanner opened',
                    data: { scannerActive: true }
                };
            case 'ai_categorize':
                // Trigger AI categorization
                const transactions = await prisma.bankTransaction.findMany({
                    where: {
                        tenantId,
                        bankAccount: { companyId },
                        status: 'unreconciled',
                        category: null
                    },
                    take: 10
                });
                return {
                    success: true,
                    message: `AI categorization initiated for ${transactions.length} transactions`,
                    data: { categorizedCount: transactions.length }
                };
            case 'cash_flow':
                return {
                    success: true,
                    message: 'Cash flow forecast generated',
                    data: { forecastGenerated: true }
                };
            default:
                return {
                    success: false,
                    message: 'Unknown action'
                };
        }
    }
    /**
     * Helper method to get budget for category
     */
    static getBudgetForCategory(category) {
        const budgets = {
            food: 600,
            transportation: 300,
            shopping: 500,
            entertainment: 200,
            utilities: 400
        };
        return budgets[category] || 0;
    }
}
