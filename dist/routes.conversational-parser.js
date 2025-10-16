import { prisma } from './prisma';
import { asyncHandler } from './errors';
import { conversationalParser } from './conversational-parser';
export function mountConversationalParserRoutes(router) {
    // Test endpoint (no auth required)
    router.post('/parser/test', asyncHandler(async (req, res) => {
        const { text, companyId } = req.body;
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Transaction text is required'
            });
        }
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }
        // Use a default tenant ID for testing
        const tenantId = 'test-tenant';
        try {
            const parsed = await conversationalParser.parseNaturalLanguage(text, tenantId, companyId);
            res.json({
                success: true,
                data: parsed
            });
        }
        catch (error) {
            console.error('Parser error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }));
    // Parse a single natural language transaction
    router.post('/parser/parse', asyncHandler(async (req, res) => {
        const { text, companyId } = req.body;
        const { tenantId } = req;
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Transaction text is required'
            });
        }
        // Find the company to use
        let targetCompanyId = companyId;
        let company = null;
        if (companyId) {
            // Try to find the specified company
            company = await prisma.company.findFirst({ where: { id: companyId, tenantId } });
        }
        if (!company) {
            // If no company specified or not found, use the first available company
            company = await prisma.company.findFirst({
                where: { tenantId },
                orderBy: { createdAt: 'asc' }
            });
            if (company) {
                targetCompanyId = company.id;
                console.log(`Using fallback company for parsing: ${company.name} (${company.id})`);
            }
            else {
                // Create a default company if none exists
                if (process.env.NODE_ENV !== 'production') {
                    company = await prisma.company.create({
                        data: {
                            tenantId: tenantId,
                            id: 'default-company',
                            name: 'Default Company',
                            country: 'US',
                            currency: 'USD'
                        }
                    });
                    targetCompanyId = company.id;
                    console.log(`Created default company for parsing: ${company.name} (${company.id})`);
                }
                else {
                    return res.status(400).json({
                        success: false,
                        error: 'no_company_available',
                        message: 'No company found for tenant. Please create a company first.'
                    });
                }
            }
        }
        const parsed = await conversationalParser.parseNaturalLanguage(text, tenantId, targetCompanyId);
        res.json({
            success: true,
            data: parsed,
            usedCompanyId: targetCompanyId,
            companyName: company?.name
        });
    }));
    // Parse and create journal entry
    router.post('/parser/create-entry', asyncHandler(async (req, res) => {
        const { text, companyId, autoCreate = false } = req.body;
        const { tenantId } = req;
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Transaction text is required'
            });
        }
        // Find the company to use
        let targetCompanyId = companyId;
        let company = null;
        if (companyId) {
            // Try to find the specified company
            company = await prisma.company.findFirst({ where: { id: companyId, tenantId } });
        }
        if (!company) {
            // If no company specified or not found, use the first available company
            company = await prisma.company.findFirst({
                where: { tenantId },
                orderBy: { createdAt: 'asc' }
            });
            if (company) {
                targetCompanyId = company.id;
                console.log(`Using fallback company: ${company.name} (${company.id})`);
            }
            else {
                // Create a default company if none exists
                if (process.env.NODE_ENV !== 'production') {
                    company = await prisma.company.create({
                        data: {
                            tenantId: tenantId,
                            id: 'default-company',
                            name: 'Default Company',
                            country: 'US',
                            currency: 'USD'
                        }
                    });
                    targetCompanyId = company.id;
                    console.log(`Created default company: ${company.name} (${company.id})`);
                }
                else {
                    return res.status(400).json({
                        success: false,
                        error: 'no_company_available',
                        message: 'No company found for tenant. Please create a company first.'
                    });
                }
            }
        }
        // Parse the transaction
        const parsed = await conversationalParser.parseNaturalLanguage(text, tenantId, targetCompanyId);
        if (parsed.validationErrors.length > 0) {
            return res.json({
                success: false,
                error: 'Validation errors found',
                data: parsed
            });
        }
        let journalEntry = null;
        let transaction = null;
        if (autoCreate && parsed.confidence >= 70) {
            try {
                const result = await conversationalParser.createJournalEntry(parsed.parsedTransaction, tenantId, targetCompanyId);
                journalEntry = result.journalEntry;
                transaction = result.transaction;
            }
            catch (error) {
                console.error('Failed to create journal entry:', error);
                return res.status(400).json({
                    success: false,
                    error: error?.message || 'Failed to create journal entry',
                    data: parsed
                });
            }
        }
        res.json({
            success: true,
            data: {
                parsed,
                journalEntry,
                transaction,
                autoCreated: autoCreate && parsed.confidence >= 70,
                usedCompanyId: targetCompanyId,
                companyName: company?.name
            }
        });
    }));
    // Batch parse multiple transactions
    router.post('/parser/batch-parse', asyncHandler(async (req, res) => {
        const { texts, companyId } = req.body;
        const { tenantId } = req;
        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Texts array is required and must not be empty'
            });
        }
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }
        const results = await conversationalParser.batchParse(texts, tenantId, companyId);
        res.json({
            success: true,
            data: results
        });
    }));
    // Get suggestions for improving transaction descriptions
    router.post('/parser/suggestions', asyncHandler(async (req, res) => {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Transaction text is required'
            });
        }
        const suggestions = await conversationalParser.suggestImprovements(text);
        res.json({
            success: true,
            data: {
                text,
                suggestions
            }
        });
    }));
    // Get parsing examples and templates
    router.get('/parser/examples', asyncHandler(async (req, res) => {
        const examples = [
            {
                category: 'Expenses',
                examples: [
                    'I paid electricity bill 30,000 RWF',
                    'Bought office supplies for 15,000 RWF',
                    'Paid rent for office space 200,000 RWF',
                    'Fuel payment at Total station 25,000 RWF',
                    'Internet bill payment 50,000 RWF'
                ]
            },
            {
                category: 'Income',
                examples: [
                    'Received payment from client ABC Corp 500,000 RWF',
                    'Sale of products to customer XYZ 150,000 RWF',
                    'Service income from consulting work 300,000 RWF',
                    'Interest income from bank account 5,000 RWF'
                ]
            },
            {
                category: 'Transfers',
                examples: [
                    'Transferred 100,000 RWF from bank to cash',
                    'Deposited 50,000 RWF into business account',
                    'Withdrew 25,000 RWF from ATM'
                ]
            },
            {
                category: 'Complex Transactions',
                examples: [
                    'Paid salary to John Doe 150,000 RWF via bank transfer',
                    'Received advance payment from XYZ Company 1,000,000 RWF for project work',
                    'Paid insurance premium to ABC Insurance 75,000 RWF for business coverage',
                    'Bought computer equipment from Tech Store 500,000 RWF on credit'
                ]
            }
        ];
        res.json({
            success: true,
            data: examples
        });
    }));
    // Get parsing statistics
    router.get('/parser/stats/:companyId', asyncHandler(async (req, res) => {
        const { companyId } = req.params;
        const { tenantId } = req;
        // Get recent parsed transactions
        const recentTransactions = await prisma.transaction.findMany({
            where: {
                tenantId,
                companyId,
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
            },
            include: {
                linkedJournalEntry: {
                    include: {
                        lines: {
                            include: {
                                account: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 100
        });
        // Calculate statistics
        const totalTransactions = recentTransactions.length;
        const totalAmount = recentTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const avgAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
        const transactionTypes = recentTransactions.reduce((acc, t) => {
            acc[t.transactionType] = (acc[t.transactionType] || 0) + 1;
            return acc;
        }, {});
        const topCategories = recentTransactions.reduce((acc, t) => {
            const category = t.linkedJournalEntry?.lines[0]?.account?.name || 'Unknown';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
        // Sort categories by frequency
        const sortedCategories = Object.entries(topCategories)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([category, count]) => ({ category, count }));
        res.json({
            success: true,
            data: {
                totalTransactions,
                totalAmount,
                avgAmount,
                transactionTypes,
                topCategories: sortedCategories,
                period: 'Last 30 days'
            }
        });
    }));
    // Validate transaction text before parsing
    router.post('/parser/validate', asyncHandler(async (req, res) => {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Transaction text is required'
            });
        }
        const suggestions = await conversationalParser.suggestImprovements(text);
        const isValid = suggestions.length === 0;
        res.json({
            success: true,
            data: {
                text,
                isValid,
                suggestions,
                wordCount: text.split(' ').length,
                hasAmount: /\d+(?:,\d{3})*(?:\.\d{2})?/.test(text),
                hasCurrency: /RWF|USD|EUR|GBP/i.test(text),
                hasAction: /paid|received|bought|sold|transferred/i.test(text)
            }
        });
    }));
    // Get parsing history
    router.get('/parser/history/:companyId', asyncHandler(async (req, res) => {
        const { companyId } = req.params;
        const { tenantId } = req;
        const { limit = 50, offset = 0 } = req.query;
        const transactions = await prisma.transaction.findMany({
            where: {
                tenantId,
                companyId
            },
            include: {
                linkedJournalEntry: {
                    include: {
                        lines: {
                            include: {
                                account: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: Number(limit),
            skip: Number(offset)
        });
        const total = await prisma.transaction.count({
            where: {
                tenantId,
                companyId
            }
        });
        res.json({
            success: true,
            data: {
                transactions,
                total,
                limit: Number(limit),
                offset: Number(offset)
            }
        });
    }));
    // Export parsing results
    router.post('/parser/export', asyncHandler(async (req, res) => {
        const { texts, companyId, format = 'json' } = req.body;
        const { tenantId } = req;
        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Texts array is required and must not be empty'
            });
        }
        const results = await conversationalParser.batchParse(texts, tenantId, companyId);
        if (format === 'csv') {
            // Generate CSV format
            const csvHeaders = 'Original Text,Amount,Currency,Transaction Type,Category,Confidence,Validation Errors\n';
            const csvRows = results.map(result => {
                const errors = result.validationErrors.join('; ');
                return `"${result.originalText}","${result.parsedTransaction.amount}","${result.parsedTransaction.currency}","${result.parsedTransaction.transactionType}","${result.parsedTransaction.category}","${result.confidence}","${errors}"`;
            }).join('\n');
            const csv = csvHeaders + csvRows;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="parsed-transactions-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csv);
        }
        else {
            // JSON format
            res.json({
                success: true,
                data: {
                    exportedAt: new Date().toISOString(),
                    totalTransactions: results.length,
                    results
                }
            });
        }
    }));
    // Get parsing configuration
    router.get('/parser/config', asyncHandler(async (req, res) => {
        const config = {
            supportedCurrencies: ['RWF', 'USD', 'EUR', 'GBP'],
            supportedTransactionTypes: ['expense', 'income', 'transfer', 'payment', 'receipt'],
            defaultCurrency: 'RWF',
            confidenceThresholds: {
                low: 50,
                medium: 70,
                high: 90
            },
            maxTextLength: 500,
            minTextLength: 5,
            supportedLanguages: ['en', 'fr', 'rw'],
            autoCreateThreshold: 70
        };
        res.json({
            success: true,
            data: config
        });
    }));
}
