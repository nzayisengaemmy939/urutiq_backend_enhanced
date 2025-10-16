import { prisma } from '../prisma';
import { EnhancedConversationalAIService } from './enhanced-conversational-ai';
import { EnhancedTransactionProcessingService } from './enhanced-transaction-processing';
import { EnhancedJournalManagementService } from './enhanced-journal-management';
// Auto-Bookkeeper Service
export class AutoBookkeeperService {
    conversationalAI;
    transactionProcessing;
    journalManagement;
    constructor() {
        this.conversationalAI = new EnhancedConversationalAIService();
        this.transactionProcessing = new EnhancedTransactionProcessingService();
        this.journalManagement = new EnhancedJournalManagementService();
    }
    // Initialize Auto-Bookkeeper for a company
    async initializeAutoBookkeeper(companyId) {
        try {
            // TODO: Implement when Prisma client is regenerated
            // const existingConfig = await prisma.autoBookkeeperConfig.findFirst({
            //   where: { companyId }
            // });
            // if (existingConfig) {
            //   return this.mapConfigFromDB(existingConfig);
            // }
            // Create default configuration
            // const config = await prisma.autoBookkeeperConfig.create({
            //   data: {
            //     tenantId: 'demo-tenant-id',
            //     companyId,
            //     isEnabled: true,
            //     autoCategorization: true,
            //     autoJournalEntry: true,
            //     autoReconciliation: true,
            //     confidenceThreshold: 0.8,
            //     rules: JSON.stringify(this.getDefaultRules())
            //   }
            // });
            // return this.mapConfigFromDB(config);
            // Temporary default config
            return {
                id: 'temp-config-id',
                companyId,
                isEnabled: true,
                automationLevel: 'basic',
                autoCategorization: true,
                autoJournalEntry: true,
                autoReconciliation: true,
                learningEnabled: true,
                confidenceThreshold: 0.8,
                notificationPreferences: {
                    email: false,
                    push: false,
                    sms: false
                },
                rules: this.getDefaultRules(),
                metadata: {}
            };
        }
        catch (error) {
            console.error('Failed to initialize auto-bookkeeper:', error);
            throw new Error('Failed to initialize auto-bookkeeper');
        }
    }
    // Get Auto-Bookkeeper configuration
    async getConfig(companyId) {
        try {
            // TODO: Implement when Prisma client is regenerated
            // const config = await prisma.autoBookkeeperConfig.findFirst({
            //   where: { 
            //     tenantId: 'demo-tenant-id',
            //     companyId 
            //   }
            // });
            // if (!config) {
            //   return this.initializeAutoBookkeeper(companyId);
            // }
            // return this.mapConfigFromDB(config);
            return this.initializeAutoBookkeeper(companyId);
        }
        catch (error) {
            console.error('Failed to get auto-bookkeeper config:', error);
            throw new Error('Failed to get auto-bookkeeper configuration');
        }
    }
    // Update Auto-Bookkeeper configuration
    async updateConfig(companyId, updates) {
        try {
            // TODO: Implement when Prisma client is regenerated
            // const config = await prisma.autoBookkeeperConfig.update({
            //   where: { 
            //     tenantId_companyId: {
            //       tenantId: 'demo-tenant-id',
            //       companyId
            //     }
            //   },
            //   data: {
            //     isEnabled: updates.isEnabled,
            //     autoCategorization: updates.autoCategorization,
            //     autoJournalEntry: updates.autoJournalEntry,
            //     autoReconciliation: updates.autoReconciliation,
            //     confidenceThreshold: updates.confidenceThreshold,
            //     rules: updates.rules ? JSON.stringify(updates.rules) : undefined
            //   }
            // });
            // return this.mapConfigFromDB(config);
            // Temporary implementation
            const currentConfig = await this.getConfig(companyId);
            return { ...currentConfig, ...updates };
        }
        catch (error) {
            console.error('Failed to update auto-bookkeeper config:', error);
            throw new Error('Failed to update auto-bookkeeper configuration');
        }
    }
    // Intelligent Transaction Categorization
    async categorizeTransaction(transactionId, companyId, forceAuto = false) {
        try {
            const config = await this.getConfig(companyId);
            if (!config.autoCategorization && !forceAuto) {
                throw new Error('Auto-categorization is disabled');
            }
            // Get transaction details
            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId }
            });
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            // Use AI to suggest category
            const aiContext = {
                userId: 'demo-user-id',
                companyId,
                tenantId: 'demo-tenant-id',
                sessionId: `categorization-${Date.now()}`,
                conversationHistory: [],
                userPreferences: {
                    language: 'en',
                    currency: 'USD',
                    confidenceThreshold: config.confidenceThreshold,
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
            const prompt = `Categorize this transaction:

      Description: ${transaction.transactionType || 'No description'}
      Amount: ${transaction.amount}
      Type: ${transaction.transactionType || 'Unknown'}
      Date: ${transaction.transactionDate}

      Please suggest the most appropriate category and provide reasoning.
      Respond in this format:
      "Category: [category_name] | Confidence: [0-100] | Reasoning: [explanation]"`;
            const response = await this.conversationalAI.processNaturalLanguageInput(prompt, aiContext);
            const categorization = this.parseCategorizationResponse(response.message);
            // TODO: Implement when Prisma client is regenerated
            // Create categorization record
            // const categorizationRecord = await prisma.transactionCategorization.create({
            //   data: {
            //     tenantId: 'demo-tenant-id',
            //     companyId,
            //     transactionId,
            //     category: categorization.category,
            //     subcategory: categorization.subcategory || null,
            //     confidence: categorization.confidence,
            //     aiSuggestions: JSON.stringify(categorization.reasoning || []),
            //     userConfirmed: false
            //   }
            // });
            // Apply categorization if confidence is above threshold
            if (categorization.confidence >= config.confidenceThreshold) {
                await prisma.transaction.update({
                    where: { id: transactionId },
                    data: {
                        transactionType: categorization.category
                    }
                });
            }
            return {
                id: `temp-cat-${Date.now()}`,
                transactionId,
                suggestedCategory: categorization.category,
                confidence: categorization.confidence,
                reasoning: categorization.reasoning,
                appliedAt: new Date(),
                metadata: {
                    autoApplied: categorization.confidence >= config.confidenceThreshold,
                    threshold: config.confidenceThreshold
                }
            };
        }
        catch (error) {
            console.error('Failed to categorize transaction:', error);
            throw new Error('Failed to categorize transaction');
        }
    }
    // Automated Journal Entry Generation
    async generateJournalEntry(transactionId, companyId, forceAuto = false) {
        try {
            const config = await this.getConfig(companyId);
            if (!config.autoJournalEntry && !forceAuto) {
                throw new Error('Auto journal entry generation is disabled');
            }
            // Get transaction details
            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId }
            });
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            // TODO: Implement when Prisma client is regenerated
            // Get categorization
            // const categorization = await prisma.transactionCategorization.findFirst({
            //   where: { transactionId },
            //   orderBy: { createdAt: 'desc' }
            // });
            // Generate journal entry using AI
            const aiContext = {
                userId: 'demo-user-id',
                companyId,
                tenantId: 'demo-tenant-id',
                sessionId: `journal-generation-${Date.now()}`,
                conversationHistory: [],
                userPreferences: {
                    language: 'en',
                    currency: 'USD',
                    confidenceThreshold: config.confidenceThreshold,
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
            const prompt = `Generate a double-entry journal entry for this transaction:

      Description: ${transaction.transactionType || 'No description'}
      Amount: ${transaction.amount}
      Category: Unknown
      Type: ${transaction.transactionType || 'Unknown'}
      Date: ${transaction.transactionDate}

      Please create a proper double-entry journal entry with appropriate accounts.
      Respond in this format:
      "Debit: [account_name] | Credit: [account_name] | Amount: [amount] | Memo: [description]"`;
            const response = await this.conversationalAI.processNaturalLanguageInput(prompt, aiContext);
            const journalEntry = this.parseJournalEntryResponse(response.message);
            // Create journal entry using existing service
            const entry = await this.journalManagement.createJournalEntry({
                tenantId: 'demo-tenant-id',
                companyId,
                date: transaction.transactionDate,
                reference: `AUTO-${transactionId}`,
                description: `Auto-generated entry for ${transaction.transactionType}`,
                entries: [
                    {
                        accountId: journalEntry.debitAccount,
                        debit: journalEntry.amount,
                        credit: 0
                    },
                    {
                        accountId: journalEntry.creditAccount,
                        debit: 0,
                        credit: journalEntry.amount
                    }
                ],
                source: 'ai_generated',
                metadata: {
                    confidence: journalEntry.confidence || 0
                }
            });
            return entry;
        }
        catch (error) {
            console.error('Failed to generate journal entry:', error);
            throw new Error('Failed to generate journal entry');
        }
    }
    // Smart Reconciliation
    async reconcileTransaction(bankTransactionId, companyId, forceAuto = false) {
        try {
            const config = await this.getConfig(companyId);
            if (!config.autoReconciliation && !forceAuto) {
                throw new Error('Auto-reconciliation is disabled');
            }
            // Get bank transaction
            const bankTransaction = await prisma.bankTransaction.findUnique({
                where: { id: bankTransactionId }
            });
            if (!bankTransaction) {
                throw new Error('Bank transaction not found');
            }
            // Find matching transactions
            const matchingTransactions = await prisma.transaction.findMany({
                where: {
                    companyId,
                    transactionDate: {
                        gte: new Date(bankTransaction.transactionDate.getTime() - 7 * 24 * 60 * 60 * 1000),
                        lte: new Date(bankTransaction.transactionDate.getTime() + 7 * 24 * 60 * 60 * 1000)
                    },
                    amount: bankTransaction.amount
                }
            });
            let bestMatch = null;
            let matchType = 'manual';
            let confidence = 0;
            // Check for exact matches
            const exactMatches = matchingTransactions.filter(t => Math.abs(Number(t.amount) - Number(bankTransaction.amount)) < 0.01 &&
                t.transactionDate.getTime() === bankTransaction.transactionDate.getTime());
            if (exactMatches.length > 0) {
                bestMatch = exactMatches[0];
                matchType = 'exact';
                confidence = 1.0;
            }
            else if (matchingTransactions.length > 0) {
                // Use AI to find best match
                const aiContext = {
                    userId: 'demo-user-id',
                    companyId,
                    tenantId: 'demo-tenant-id',
                    sessionId: `reconciliation-${Date.now()}`,
                    conversationHistory: [],
                    userPreferences: {
                        language: 'en',
                        currency: 'USD',
                        confidenceThreshold: config.confidenceThreshold,
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
                const prompt = `Find the best matching transaction for this bank transaction:

        Bank Transaction:
        Description: ${bankTransaction.description || 'No description'}
        Amount: ${bankTransaction.amount}
        Date: ${bankTransaction.transactionDate}

        Candidate Transactions:
        ${matchingTransactions.map((t, i) => `${i + 1}. ${t.transactionType} | Amount: ${t.amount} | Date: ${t.transactionDate}`).join('\n')}

        Please select the best match and provide confidence.
        Respond in this format:
        "Match: [transaction_number] | Confidence: [0-100] | Reasoning: [explanation]"`;
                const response = await this.conversationalAI.processNaturalLanguageInput(prompt, aiContext);
                const match = this.parseReconciliationResponse(response.message);
                if (match.transactionIndex >= 0 && match.transactionIndex < matchingTransactions.length) {
                    bestMatch = matchingTransactions[match.transactionIndex];
                    matchType = 'ai_suggested';
                    confidence = match.confidence;
                }
            }
            // TODO: Implement when Prisma client is regenerated
            // Create reconciliation record
            // const reconciliation = await prisma.autoReconciliation.create({
            //   data: {
            //     tenantId: 'demo-tenant-id',
            //     companyId,
            //     bankTransactionId,
            //     internalTransactionId: bestMatch?.id || null,
            //     matchType,
            //     confidence,
            //     status: bestMatch ? 'confirmed' : 'pending'
            //   }
            // });
            return {
                id: `temp-recon-${Date.now()}`,
                bankTransactionId,
                matchedTransactionId: bestMatch?.id,
                matchType,
                confidence,
                reconciliationDate: new Date(),
                status: bestMatch ? 'matched' : 'unmatched',
                metadata: {
                    autoReconciled: bestMatch && confidence >= config.confidenceThreshold,
                    threshold: config.confidenceThreshold
                }
            };
        }
        catch (error) {
            console.error('Failed to reconcile transaction:', error);
            throw new Error('Failed to reconcile transaction');
        }
    }
    // Get Auto-Bookkeeper Statistics
    async getStats(companyId, periodDays = 30) {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
            // Get total transactions
            const totalTransactions = await prisma.transaction.count({
                where: {
                    companyId,
                    transactionDate: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
            // TODO: Implement when Prisma client is regenerated
            // Get auto-categorized transactions
            // const autoCategorized = await prisma.transactionCategorization.count({
            //   where: {
            //     tenantId: 'demo-tenant-id',
            //     companyId,
            //     createdAt: {
            //       gte: startDate,
            //       lte: endDate
            //     }
            //   }
            // });
            // Get auto-generated journal entries
            const autoJournalEntries = await prisma.journalEntry.count({
                where: {
                    companyId,
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    },
                    memo: {
                        contains: 'Auto-generated'
                    }
                }
            });
            // TODO: Implement when Prisma client is regenerated
            // Get auto-reconciled transactions
            // const autoReconciled = await prisma.autoReconciliation.count({
            //   where: {
            //     tenantId: 'demo-tenant-id',
            //     companyId,
            //     createdAt: {
            //       gte: startDate,
            //       lte: endDate
            //     },
            //     status: 'confirmed'
            //   }
            // });
            // Temporary values
            const autoCategorized = Math.floor(totalTransactions * 0.8);
            const autoReconciled = Math.floor(totalTransactions * 0.6);
            // Calculate accuracy (simplified - in real implementation, this would track user corrections)
            const accuracy = totalTransactions > 0 ?
                Math.min(0.95, (autoCategorized + autoJournalEntries + autoReconciled) / (totalTransactions * 3)) : 0.95;
            // Calculate time saved (estimated 2 minutes per automated task)
            const timeSaved = (autoCategorized + autoJournalEntries + autoReconciled) * 2;
            // Calculate automation rate
            const automationRate = totalTransactions > 0 ?
                (autoCategorized + autoJournalEntries + autoReconciled) / (totalTransactions * 3) : 0;
            // Calculate learning progress (simplified)
            const learningProgress = Math.min(1, autoCategorized / Math.max(1, totalTransactions));
            return {
                totalTransactions,
                autoCategorized,
                autoJournalEntries,
                autoReconciled,
                accuracy,
                timeSaved,
                automationRate,
                learningProgress
            };
        }
        catch (error) {
            console.error('Failed to get auto-bookkeeper stats:', error);
            throw new Error('Failed to get auto-bookkeeper statistics');
        }
    }
    // Get Auto-Bookkeeper Insights
    async getInsights(companyId) {
        try {
            const insights = [];
            // TODO: Implement when Prisma client is regenerated
            // Get recent categorization data
            // const recentCategorizations = await prisma.transactionCategorization.findMany({
            //   where: { 
            //     tenantId: 'demo-tenant-id',
            //     companyId 
            //   },
            //   orderBy: { createdAt: 'desc' },
            //   take: 100
            // });
            // Analyze categorization patterns
            // const categoryCounts = new Map<string, number>();
            // for (const cat of recentCategorizations) {
            //   categoryCounts.set(cat.category, (categoryCounts.get(cat.category) || 0) + 1);
            // }
            // Find most common categories
            // const topCategories = Array.from(categoryCounts.entries())
            //   .sort((a, b) => b[1] - a[1])
            //   .slice(0, 5);
            // if (topCategories.length > 0) {
            //   insights.push({
            //     id: `insight-${Date.now()}-1`,
            //     type: 'pattern',
            //     title: 'Most Common Transaction Categories',
            //     description: `Top categories: ${topCategories.map(([cat, count]) => `${cat} (${count})`).join(', ')}`,
            //     confidence: 0.9,
            //     impact: 'medium',
            //     recommendations: [
            //       'Consider setting up recurring transactions for common categories',
            //       'Review categorization rules for frequently used categories',
            //       'Optimize account structure based on usage patterns'
            //     ],
            //     metadata: { topCategories }
            //   });
            // }
            // Analyze confidence patterns
            // const lowConfidenceCategorizations = recentCategorizations.filter(cat => Number(cat.confidence) < 0.7);
            // if (lowConfidenceCategorizations.length > 0) {
            //   insights.push({
            //     id: `insight-${Date.now()}-2`,
            //     type: 'optimization',
            //     title: 'Low Confidence Categorizations Detected',
            //     description: `${lowConfidenceCategorizations.length} transactions had low confidence categorization`,
            //     confidence: 0.8,
            //     impact: 'high',
            //     recommendations: [
            //       'Review and correct low confidence categorizations',
            //       'Add more training data for uncertain categories',
            //       'Consider adjusting confidence thresholds'
            //     ],
            //     metadata: { lowConfidenceCount: lowConfidenceCategorizations.length }
            //   });
            // }
            // TODO: Implement when Prisma client is regenerated
            // Get reconciliation statistics
            // const reconciliationStats = await prisma.autoReconciliation.groupBy({
            //   by: ['status'],
            //   where: { companyId },
            //   _count: { status: true }
            // });
            // const unmatchedCount = reconciliationStats.find(s => s.status === 'unmatched')?._count.status || 0;
            // if (unmatchedCount > 0) {
            //   insights.push({
            //     id: `insight-${Date.now()}-3`,
            //     type: 'anomaly',
            //     title: 'Unmatched Bank Transactions',
            //     description: `${unmatchedCount} bank transactions could not be automatically reconciled`,
            //     confidence: 0.9,
            //     impact: 'high',
            //     recommendations: [
            //       'Review unmatched transactions for manual reconciliation',
            //       'Check for missing transaction records',
            //       'Verify bank feed synchronization'
            //     ],
            //     metadata: { unmatchedCount }
            //   });
            // }
            // Temporary default insights
            insights.push({
                id: `insight-${Date.now()}-1`,
                type: 'pattern',
                title: 'Auto-Bookkeeper Ready',
                description: 'Auto-bookkeeper is ready to process transactions',
                confidence: 0.9,
                impact: 'medium',
                recommendations: [
                    'Enable auto-categorization for new transactions',
                    'Set up reconciliation rules',
                    'Monitor automation performance'
                ],
                metadata: {}
            });
            return insights;
        }
        catch (error) {
            console.error('Failed to get auto-bookkeeper insights:', error);
            throw new Error('Failed to get auto-bookkeeper insights');
        }
    }
    // Process all pending transactions
    async processPendingTransactions(companyId) {
        try {
            const config = await this.getConfig(companyId);
            if (!config.isEnabled) {
                throw new Error('Auto-bookkeeper is disabled');
            }
            let categorized = 0;
            let journalEntries = 0;
            let reconciled = 0;
            let errors = 0;
            // Get uncategorized transactions
            const uncategorizedTransactions = await prisma.transaction.findMany({
                where: {
                    tenantId: 'demo-tenant-id',
                    companyId,
                    transactionType: ''
                },
                take: 50 // Process in batches
            });
            // Categorize transactions
            for (const transaction of uncategorizedTransactions) {
                try {
                    await this.categorizeTransaction(transaction.id, companyId, true);
                    categorized++;
                }
                catch (error) {
                    console.error(`Failed to categorize transaction ${transaction.id}:`, error);
                    errors++;
                }
            }
            // Generate journal entries for categorized transactions
            const categorizedTransactions = await prisma.transaction.findMany({
                where: {
                    tenantId: 'demo-tenant-id',
                    companyId,
                    transactionType: { not: '' }
                },
                take: 50
            });
            for (const transaction of categorizedTransactions) {
                try {
                    await this.generateJournalEntry(transaction.id, companyId, true);
                    journalEntries++;
                }
                catch (error) {
                    console.error(`Failed to generate journal entry for transaction ${transaction.id}:`, error);
                    errors++;
                }
            }
            // Reconcile bank transactions
            const unreconciledBankTransactions = await prisma.bankTransaction.findMany({
                where: {
                    tenantId: 'demo-tenant-id',
                    isReconciled: false
                },
                take: 50
            });
            for (const bankTransaction of unreconciledBankTransactions) {
                try {
                    await this.reconcileTransaction(bankTransaction.id, companyId, true);
                    reconciled++;
                }
                catch (error) {
                    console.error(`Failed to reconcile bank transaction ${bankTransaction.id}:`, error);
                    errors++;
                }
            }
            return {
                categorized,
                journalEntries,
                reconciled,
                errors
            };
        }
        catch (error) {
            console.error('Failed to process pending transactions:', error);
            throw new Error('Failed to process pending transactions');
        }
    }
    // Helper methods
    mapConfigFromDB(config) {
        return {
            id: config.id,
            companyId: config.companyId,
            isEnabled: config.isEnabled,
            automationLevel: config.automationLevel,
            autoCategorization: config.autoCategorization,
            autoJournalEntry: config.autoJournalEntry,
            autoReconciliation: config.autoReconciliation,
            learningEnabled: config.learningEnabled,
            confidenceThreshold: config.confidenceThreshold,
            notificationPreferences: JSON.parse(config.notificationPreferences || '{}'),
            rules: JSON.parse(config.rules || '[]'),
            metadata: config.metadata
        };
    }
    getDefaultRules() {
        return [
            {
                id: 'rule-001',
                name: 'High Confidence Auto-Apply',
                description: 'Automatically apply categorizations with high confidence',
                condition: 'confidence >= 0.9',
                action: 'auto_apply',
                priority: 1,
                isActive: true
            },
            {
                id: 'rule-002',
                name: 'Exact Amount Matching',
                description: 'Reconcile transactions with exact amount matches',
                condition: 'amount_difference < 0.01',
                action: 'auto_reconcile',
                priority: 2,
                isActive: true
            },
            {
                id: 'rule-003',
                name: 'Common Vendor Patterns',
                description: 'Apply common categorization patterns for known vendors',
                condition: 'vendor_in_common_list',
                action: 'auto_categorize',
                priority: 3,
                isActive: true
            }
        ];
    }
    parseCategorizationResponse(message) {
        const parts = message.split('|').map(p => p.trim());
        const result = {
            category: 'Uncategorized',
            confidence: 0.5,
            reasoning: 'Default categorization'
        };
        for (const part of parts) {
            if (part.startsWith('Category:')) {
                result.category = part.replace('Category:', '').trim();
            }
            else if (part.startsWith('Confidence:')) {
                const confStr = part.replace('Confidence:', '').trim();
                result.confidence = parseInt(confStr) / 100;
            }
            else if (part.startsWith('Reasoning:')) {
                result.reasoning = part.replace('Reasoning:', '').trim();
            }
        }
        return result;
    }
    parseJournalEntryResponse(message) {
        const parts = message.split('|').map(p => p.trim());
        const result = {
            debitAccount: 'cash-account-id',
            creditAccount: 'revenue-account-id',
            amount: 0,
            memo: 'Auto-generated entry',
            confidence: 0.8
        };
        for (const part of parts) {
            if (part.startsWith('Debit:')) {
                result.debitAccount = part.replace('Debit:', '').trim();
            }
            else if (part.startsWith('Credit:')) {
                result.creditAccount = part.replace('Credit:', '').trim();
            }
            else if (part.startsWith('Amount:')) {
                const amountStr = part.replace('Amount:', '').trim();
                result.amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
            }
            else if (part.startsWith('Memo:')) {
                result.memo = part.replace('Memo:', '').trim();
            }
        }
        return result;
    }
    parseReconciliationResponse(message) {
        const parts = message.split('|').map(p => p.trim());
        const result = {
            transactionIndex: -1,
            confidence: 0.5,
            reasoning: 'Default reconciliation'
        };
        for (const part of parts) {
            if (part.startsWith('Match:')) {
                const matchStr = part.replace('Match:', '').trim();
                result.transactionIndex = parseInt(matchStr) - 1; // Convert to 0-based index
            }
            else if (part.startsWith('Confidence:')) {
                const confStr = part.replace('Confidence:', '').trim();
                result.confidence = parseInt(confStr) / 100;
            }
            else if (part.startsWith('Reasoning:')) {
                result.reasoning = part.replace('Reasoning:', '').trim();
            }
        }
        return result;
    }
}
export const autoBookkeeperService = new AutoBookkeeperService();
