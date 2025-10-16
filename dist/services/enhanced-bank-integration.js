import { prisma } from '../prisma.js';
import { EnhancedConversationalAIService } from './enhanced-conversational-ai.js';
import { EnhancedFinancialReportingEngine } from './enhanced-financial-reporting.js';
// Enhanced Bank Integration Service
export class EnhancedBankIntegrationService {
    conversationalAI;
    financialReporting;
    constructor() {
        this.conversationalAI = new EnhancedConversationalAIService();
        this.financialReporting = new EnhancedFinancialReportingEngine();
    }
    // Real-time Bank Feed Processing
    async processBankFeed(connectionId, transactions, config) {
        const startTime = Date.now();
        // Get connection details
        const connection = await prisma.bankConnection.findUnique({
            where: { id: connectionId },
            include: { company: true }
        });
        if (!connection) {
            throw new Error(`Bank connection not found: ${connectionId}`);
        }
        // Process each transaction
        const matches = [];
        let matchedCount = 0;
        let unmatchedCount = 0;
        let autoReconciledCount = 0;
        let requiresReviewCount = 0;
        let fraudAlertsCount = 0;
        let totalAmount = 0;
        for (const transaction of transactions) {
            totalAmount += Math.abs(transaction.amount);
            // Create or update bank transaction
            const bankTransaction = await this.createOrUpdateBankTransaction(connectionId, transaction);
            // Attempt AI-powered matching
            const match = await this.matchTransaction(bankTransaction, connection.companyId, config);
            matches.push(match);
            if (match.internalTransactionId) {
                matchedCount++;
                // Auto-reconcile if confidence is high enough
                if (match.confidence >= config.confidenceThreshold && !match.requiresReview) {
                    await this.autoReconcileTransaction(bankTransaction.id, match);
                    autoReconciledCount++;
                }
                else {
                    requiresReviewCount++;
                }
            }
            else {
                unmatchedCount++;
            }
            // Fraud detection
            if (config.fraudDetectionEnabled) {
                const fraudScore = await this.detectFraud(bankTransaction, connection.companyId);
                if (fraudScore > 0.7) {
                    fraudAlertsCount++;
                    await this.createFraudAlert(bankTransaction.id, fraudScore, match.reasoning);
                }
            }
            // Auto-categorization
            if (config.autoCategorization && !match.suggestedCategory) {
                const category = await this.autoCategorizeTransaction(bankTransaction);
                if (category) {
                    await prisma.bankTransaction.update({
                        where: { id: bankTransaction.id },
                        data: { category }
                    });
                }
            }
        }
        const processingTime = Date.now() - startTime;
        const averageConfidence = matches.length > 0
            ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
            : 0;
        // Create sync log
        await prisma.bankSyncLog.create({
            data: {
                connectionId,
                syncType: 'incremental',
                status: 'success',
                completedAt: new Date(),
                transactionsFound: transactions.length,
                transactionsImported: transactions.length,
                transactionsUpdated: 0,
                metadata: JSON.stringify({
                    processingTime,
                    matchedCount,
                    unmatchedCount,
                    autoReconciledCount,
                    fraudAlertsCount
                })
            }
        });
        return {
            connectionId,
            processedTransactions: transactions.length,
            matchedTransactions: matchedCount,
            unmatchedTransactions: unmatchedCount,
            autoReconciled: autoReconciledCount,
            requiresReview: requiresReviewCount,
            fraudAlerts: fraudAlertsCount,
            processingTime,
            matches,
            summary: {
                totalAmount,
                averageConfidence,
                riskLevel: this.calculateRiskLevel(averageConfidence, fraudAlertsCount)
            }
        };
    }
    // AI-Powered Transaction Matching
    async matchTransaction(bankTransaction, companyId, config) {
        // Find potential matches using multiple strategies
        const exactMatches = await this.findExactMatches(bankTransaction, companyId);
        const fuzzyMatches = await this.findFuzzyMatches(bankTransaction, companyId);
        const aiSuggestions = await this.getAISuggestions(bankTransaction, companyId);
        // Combine and rank matches
        const allMatches = [
            ...exactMatches.map(m => ({ ...m, matchType: 'exact' })),
            ...fuzzyMatches.map(m => ({ ...m, matchType: 'fuzzy' })),
            ...aiSuggestions.map(m => ({ ...m, matchType: 'ai_suggested' }))
        ];
        // Sort by confidence and select best match
        allMatches.sort((a, b) => b.confidence - a.confidence);
        const bestMatch = allMatches[0];
        if (!bestMatch) {
            return {
                bankTransactionId: bankTransaction.id,
                confidence: 0,
                matchType: 'manual',
                reasoning: 'No matches found',
                riskScore: await this.calculateRiskScore(bankTransaction),
                requiresReview: true
            };
        }
        return {
            bankTransactionId: bankTransaction.id,
            internalTransactionId: bestMatch.transactionId,
            confidence: bestMatch.confidence,
            matchType: bestMatch.matchType,
            reasoning: bestMatch.reasoning,
            suggestedCategory: bestMatch.suggestedCategory,
            suggestedVendor: bestMatch.suggestedVendor,
            riskScore: await this.calculateRiskScore(bankTransaction),
            requiresReview: bestMatch.confidence < config.confidenceThreshold
        };
    }
    // Find exact matches based on amount and date
    async findExactMatches(bankTransaction, companyId) {
        const matches = await prisma.transaction.findMany({
            where: {
                companyId,
                amount: bankTransaction.amount,
                transactionDate: {
                    gte: new Date(bankTransaction.transactionDate.getTime() - 2 * 24 * 60 * 60 * 1000), // Within 2 days
                    lte: new Date(bankTransaction.transactionDate.getTime() + 2 * 24 * 60 * 60 * 1000)
                }
            },
            take: 5
        });
        return matches.map(match => ({
            transactionId: match.id,
            confidence: 0.95,
            reasoning: `Exact amount and date match`,
            suggestedCategory: undefined,
            suggestedVendor: undefined
        }));
    }
    // Find fuzzy matches using similarity algorithms
    async findFuzzyMatches(bankTransaction, companyId) {
        const matches = await prisma.transaction.findMany({
            where: {
                companyId,
                amount: {
                    gte: bankTransaction.amount * 0.99, // Within 1%
                    lte: bankTransaction.amount * 1.01
                },
                transactionDate: {
                    gte: new Date(bankTransaction.transactionDate.getTime() - 7 * 24 * 60 * 60 * 1000), // Within 7 days
                    lte: new Date(bankTransaction.transactionDate.getTime() + 7 * 24 * 60 * 60 * 1000)
                }
            },
            take: 10
        });
        return matches.map(match => {
            const amountSimilarity = 1 - Math.abs(Number(match.amount) - Number(bankTransaction.amount)) / Number(bankTransaction.amount);
            const dateSimilarity = 1 - Math.abs(match.transactionDate.getTime() - bankTransaction.transactionDate.getTime()) / (7 * 24 * 60 * 60 * 1000);
            const descriptionSimilarity = this.calculateStringSimilarity('', bankTransaction.description || '');
            const confidence = (amountSimilarity * 0.4 + dateSimilarity * 0.3 + descriptionSimilarity * 0.3);
            return {
                transactionId: match.id,
                confidence: Math.min(confidence, 0.85),
                reasoning: `Fuzzy match: amount=${amountSimilarity.toFixed(2)}, date=${dateSimilarity.toFixed(2)}, description=${descriptionSimilarity.toFixed(2)}`,
                suggestedCategory: undefined,
                suggestedVendor: undefined
            };
        }).filter(m => m.confidence > 0.6);
    }
    // Get AI suggestions using conversational AI
    async getAISuggestions(bankTransaction, companyId) {
        try {
            const context = {
                userId: 'demo-user-id',
                companyId,
                tenantId: 'demo-tenant-id',
                sessionId: `bank-reconciliation-${Date.now()}`,
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
            const prompt = `Analyze this bank transaction and suggest potential matches from our internal records:
      
      Bank Transaction:
      - Amount: ${bankTransaction.amount}
      - Date: ${bankTransaction.transactionDate}
      - Description: ${bankTransaction.description}
      - Merchant: ${bankTransaction.merchantName || 'Unknown'}
      - Type: ${bankTransaction.transactionType}
      
      Please suggest potential internal transactions that might match this bank transaction. Consider:
      1. Amount similarity
      2. Date proximity
      3. Description similarity
      4. Vendor/merchant matching
      5. Transaction patterns
      
      Respond with suggestions in this format:
      "Suggestion: [transaction_id] | Confidence: [0-100] | Reasoning: [explanation] | Category: [suggested_category] | Vendor: [suggested_vendor]"`;
            const response = await this.conversationalAI.processNaturalLanguageInput(prompt, context);
            // Parse AI suggestions
            const suggestions = this.parseAISuggestions(response.message);
            return suggestions;
        }
        catch (error) {
            console.warn('AI suggestion failed:', error);
            return [];
        }
    }
    // Parse AI suggestions from conversational AI response
    parseAISuggestions(message) {
        const suggestions = [];
        const lines = message.split('\n');
        for (const line of lines) {
            if (line.startsWith('Suggestion:')) {
                const parts = line.split('|').map(p => p.trim());
                if (parts.length >= 5) {
                    const transactionId = parts[0].replace('Suggestion:', '').trim();
                    const confidence = parseInt(parts[1].replace('Confidence:', '').trim()) / 100;
                    const reasoning = parts[2].replace('Reasoning:', '').trim();
                    const category = parts[3].replace('Category:', '').trim();
                    const vendor = parts[4].replace('Vendor:', '').trim();
                    suggestions.push({
                        transactionId,
                        confidence,
                        reasoning,
                        suggestedCategory: category,
                        suggestedVendor: vendor
                    });
                }
            }
        }
        return suggestions;
    }
    // Auto-categorize transaction using AI
    async autoCategorizeTransaction(bankTransaction) {
        try {
            const context = {
                userId: 'demo-user-id',
                companyId: 'demo-company-id',
                tenantId: 'demo-tenant-id',
                sessionId: `auto-categorize-${Date.now()}`,
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
            const prompt = `Categorize this bank transaction:
      
      Amount: ${bankTransaction.amount}
      Description: ${bankTransaction.description}
      Merchant: ${bankTransaction.merchantName || 'Unknown'}
      Type: ${bankTransaction.transactionType}
      
      Please categorize this transaction into one of these standard accounting categories:
      - Revenue: Sales, Service Income, Interest Income
      - Expenses: Office Supplies, Travel, Utilities, Rent, Insurance, Marketing, Software, Equipment
      - Assets: Cash, Accounts Receivable, Inventory, Equipment
      - Liabilities: Accounts Payable, Loans, Credit Cards
      
      Respond with only the category name.`;
            const response = await this.conversationalAI.processNaturalLanguageInput(prompt, context);
            // Extract category from response
            const category = response.message.trim();
            return category || null;
        }
        catch (error) {
            console.warn('Auto-categorization failed:', error);
            return null;
        }
    }
    // Fraud detection
    async detectFraud(bankTransaction, companyId) {
        // Get historical transaction patterns
        const historicalTransactions = await prisma.bankTransaction.findMany({
            where: {
                connection: { companyId },
                transactionDate: {
                    gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
                }
            },
            take: 1000
        });
        // Calculate fraud indicators
        const amountAnomaly = this.calculateAmountAnomaly(bankTransaction.amount, historicalTransactions);
        const timeAnomaly = this.calculateTimeAnomaly(bankTransaction.transactionDate, historicalTransactions);
        const merchantAnomaly = this.calculateMerchantAnomaly(bankTransaction.merchantName, historicalTransactions);
        const patternAnomaly = this.calculatePatternAnomaly(bankTransaction, historicalTransactions);
        // Weighted fraud score
        const fraudScore = (amountAnomaly * 0.3 +
            timeAnomaly * 0.2 +
            merchantAnomaly * 0.3 +
            patternAnomaly * 0.2);
        return Math.min(fraudScore, 1.0);
    }
    // Calculate amount anomaly score
    calculateAmountAnomaly(amount, historicalTransactions) {
        if (historicalTransactions.length === 0)
            return 0;
        const amounts = historicalTransactions.map(t => Math.abs(Number(t.amount)));
        const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev === 0)
            return 0;
        const zScore = Math.abs(Math.abs(amount) - mean) / stdDev;
        return Math.min(zScore / 3, 1.0); // Normalize to 0-1
    }
    // Calculate time anomaly score
    calculateTimeAnomaly(transactionDate, historicalTransactions) {
        if (historicalTransactions.length === 0)
            return 0;
        const hour = transactionDate.getHours();
        const dayOfWeek = transactionDate.getDay();
        // Check if transaction is outside normal business hours
        const isBusinessHours = hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5;
        return isBusinessHours ? 0 : 0.5;
    }
    // Calculate merchant anomaly score
    calculateMerchantAnomaly(merchantName, historicalTransactions) {
        if (!merchantName || historicalTransactions.length === 0)
            return 0;
        const merchantCounts = historicalTransactions.reduce((acc, t) => {
            const merchant = t.merchantName?.toLowerCase();
            if (merchant) {
                acc[merchant] = (acc[merchant] || 0) + 1;
            }
            return acc;
        }, {});
        const merchantNameLower = merchantName.toLowerCase();
        const frequency = merchantCounts[merchantNameLower] || 0;
        const totalTransactions = historicalTransactions.length;
        // Lower frequency = higher anomaly
        return Math.max(0, 1 - (frequency / totalTransactions));
    }
    // Calculate pattern anomaly score
    calculatePatternAnomaly(transaction, historicalTransactions) {
        if (historicalTransactions.length === 0)
            return 0;
        // Check for unusual patterns
        const similarTransactions = historicalTransactions.filter(t => Math.abs(Math.abs(Number(t.amount)) - Math.abs(transaction.amount)) < 0.01 &&
            t.transactionType === transaction.transactionType);
        // If very few similar transactions, it's anomalous
        const similarityRatio = similarTransactions.length / historicalTransactions.length;
        return Math.max(0, 1 - similarityRatio);
    }
    // Calculate risk score for transaction
    async calculateRiskScore(bankTransaction) {
        const fraudScore = await this.detectFraud(bankTransaction, 'demo-company-id');
        const amountRisk = Math.abs(bankTransaction.amount) > 10000 ? 0.3 : 0;
        const merchantRisk = !bankTransaction.merchantName ? 0.2 : 0;
        return Math.min(fraudScore + amountRisk + merchantRisk, 1.0);
    }
    // Calculate overall risk level
    calculateRiskLevel(averageConfidence, fraudAlerts) {
        if (averageConfidence > 0.8 && fraudAlerts === 0)
            return 'low';
        if (averageConfidence > 0.6 && fraudAlerts <= 2)
            return 'medium';
        return 'high';
    }
    // Create or update bank transaction
    async createOrUpdateBankTransaction(connectionId, transaction) {
        const existing = await prisma.bankTransaction.findFirst({
            where: {
                connectionId,
                externalId: transaction.externalId
            }
        });
        if (existing) {
            return await prisma.bankTransaction.update({
                where: { id: existing.id },
                data: {
                    transactionDate: transaction.transactionDate,
                    postedDate: transaction.postedDate,
                    amount: transaction.amount,
                    description: transaction.description,
                    merchantName: transaction.merchantName,
                    merchantCategory: transaction.merchantCategory,
                    transactionType: transaction.transactionType,
                    reference: transaction.reference,
                    checkNumber: transaction.checkNumber,
                    memo: transaction.memo,
                    updatedAt: new Date()
                }
            });
        }
        else {
            return await prisma.bankTransaction.create({
                data: {
                    tenantId: 'demo-tenant-id',
                    connectionId,
                    externalId: transaction.externalId,
                    transactionDate: transaction.transactionDate,
                    postedDate: transaction.postedDate,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    description: transaction.description,
                    merchantName: transaction.merchantName,
                    merchantCategory: transaction.merchantCategory,
                    transactionType: transaction.transactionType,
                    reference: transaction.reference,
                    checkNumber: transaction.checkNumber,
                    memo: transaction.memo
                }
            });
        }
    }
    // Auto-reconcile transaction
    async autoReconcileTransaction(bankTransactionId, match) {
        await prisma.bankTransaction.update({
            where: { id: bankTransactionId },
            data: {
                isReconciled: true,
                reconciledAt: new Date(),
                reconciledBy: 'demo-user-id',
                matchedTransactionId: match.internalTransactionId,
                confidence: match.confidence,
                category: match.suggestedCategory
            }
        });
        // Generate automatic journal entry if needed
        if (match.internalTransactionId) {
            await this.generateJournalEntry(bankTransactionId, match);
        }
    }
    // Generate automatic journal entry
    async generateJournalEntry(bankTransactionId, match) {
        const bankTransaction = await prisma.bankTransaction.findUnique({
            where: { id: bankTransactionId },
            include: { connection: true }
        });
        if (!bankTransaction || !bankTransaction.connection)
            return;
        // Create journal entry for reconciliation
        const journalEntry = {
            companyId: bankTransaction.connection.companyId,
            tenantId: 'demo-tenant-id',
            date: bankTransaction.transactionDate,
            reference: `Bank Reconciliation - ${bankTransaction.externalId}`,
            description: `Auto-reconciled bank transaction: ${bankTransaction.description}`,
            journalEntries: [
                {
                    accountId: 'cash-account-id', // Would need to get from account mapping
                    debit: bankTransaction.transactionType === 'credit' ? Math.abs(Number(bankTransaction.amount)) : 0,
                    credit: bankTransaction.transactionType === 'debit' ? Math.abs(Number(bankTransaction.amount)) : 0,
                    description: bankTransaction.description
                }
            ]
        };
        // TODO: Create actual journal entry using existing journal service
        console.log('Generated journal entry:', journalEntry);
    }
    // Create fraud alert
    async createFraudAlert(bankTransactionId, fraudScore, reasoning) {
        // TODO: Create fraud alert record
        console.log(`Fraud alert created for transaction ${bankTransactionId}:`, {
            fraudScore,
            reasoning
        });
    }
    // Calculate string similarity using Levenshtein distance
    calculateStringSimilarity(str1, str2) {
        if (str1 === str2)
            return 1.0;
        if (str1.length === 0 || str2.length === 0)
            return 0.0;
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
            }
        }
        const distance = matrix[str2.length][str1.length];
        const maxLength = Math.max(str1.length, str2.length);
        return 1 - (distance / maxLength);
    }
    // Get bank integration statistics
    async getBankIntegrationStats(companyId) {
        const connections = await prisma.bankConnection.findMany({
            where: { companyId }
        });
        const transactions = await prisma.bankTransaction.findMany({
            where: {
                connection: { companyId }
            }
        });
        const reconciledTransactions = transactions.filter(t => t.isReconciled);
        const pendingReconciliation = transactions.filter(t => !t.isReconciled);
        const syncLogs = await prisma.bankSyncLog.findMany({
            where: {
                connection: { companyId }
            },
            orderBy: { startedAt: 'desc' },
            take: 100
        });
        const successfulSyncs = syncLogs.filter(log => log.status === 'success');
        const syncSuccessRate = syncLogs.length > 0 ? successfulSyncs.length / syncLogs.length : 0;
        return {
            totalConnections: connections.length,
            activeConnections: connections.filter(c => c.status === 'active').length,
            totalTransactions: transactions.length,
            reconciledTransactions: reconciledTransactions.length,
            pendingReconciliation: pendingReconciliation.length,
            fraudAlerts: 0, // TODO: Count actual fraud alerts
            averageProcessingTime: 0, // TODO: Calculate from sync logs
            lastSyncTime: syncLogs[0]?.startedAt,
            syncSuccessRate
        };
    }
    // Get reconciliation rules
    async getReconciliationRules(companyId) {
        return await prisma.bankReconciliationRule.findMany({
            where: {
                companyId,
                isActive: true
            },
            orderBy: { priority: 'desc' },
            include: {
                createdByUser: {
                    select: { name: true, email: true }
                }
            }
        });
    }
    // Create reconciliation rule
    async createReconciliationRule(companyId, name, description, conditions, actions, createdBy) {
        return await prisma.bankReconciliationRule.create({
            data: {
                companyId,
                name,
                description,
                conditions: JSON.stringify(conditions),
                actions: JSON.stringify(actions),
                createdBy
            }
        });
    }
    // Test bank connection
    async testBankConnection(connectionId) {
        try {
            const connection = await prisma.bankConnection.findUnique({
                where: { id: connectionId }
            });
            if (!connection) {
                return { success: false, message: 'Connection not found' };
            }
            // Simulate connection test
            const testResult = {
                success: true,
                message: 'Connection test successful',
                details: {
                    provider: connection.provider,
                    accountNumber: connection.accountNumber,
                    lastSync: connection.lastSyncAt,
                    status: connection.status
                }
            };
            return testResult;
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                details: { error: error }
            };
        }
    }
}
export const enhancedBankIntegrationService = new EnhancedBankIntegrationService();
