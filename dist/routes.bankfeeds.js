import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { bankConnectionCreate, bankConnectionUpdate, bankTransactionCreate, bankTransactionUpdate, bankReconciliationRuleCreate, bankSyncRequest, bankReconciliationRequest, bankConnectionQuery, bankTransactionQuery } from './validate.js';
const router = Router();
const prisma = new PrismaClient();
// Helper function to encrypt credentials (in production, use proper encryption)
function encryptCredentials(credentials) {
    // This is a simplified implementation - in production, use proper encryption
    return JSON.stringify(credentials);
}
// Helper function to decrypt credentials
function decryptCredentials(encryptedCredentials) {
    // This is a simplified implementation - in production, use proper decryption
    return JSON.parse(encryptedCredentials);
}
// Helper function to simulate bank API sync
async function syncBankTransactions(connectionId, syncType) {
    const connection = await prisma.bankConnection.findUnique({
        where: { id: connectionId }
    });
    if (!connection) {
        throw new Error('Bank connection not found');
    }
    // Simulate API call to bank
    const mockTransactions = [
        {
            externalId: `txn_${Date.now()}_1`,
            transactionDate: new Date(),
            postedDate: new Date(),
            amount: 1250.50,
            description: 'Office Supplies Purchase',
            merchantName: 'Office Depot',
            merchantCategory: 'Office Supplies',
            transactionType: 'debit',
            reference: 'REF123456'
        },
        {
            externalId: `txn_${Date.now()}_2`,
            transactionDate: new Date(),
            postedDate: new Date(),
            amount: 5000.00,
            description: 'Client Payment Received',
            merchantName: 'Client Corp',
            merchantCategory: 'Payment',
            transactionType: 'credit',
            reference: 'INV789012'
        }
    ];
    return mockTransactions;
}
// Helper function for AI-powered transaction matching
async function matchTransaction(bankTransaction, companyId) {
    // Find potential matches in internal transactions
    const potentialMatches = await prisma.transaction.findMany({
        where: {
            companyId: companyId,
            amount: bankTransaction.amount,
            transactionDate: {
                gte: new Date(bankTransaction.transactionDate.getTime() - 7 * 24 * 60 * 60 * 1000), // Within 7 days
                lte: new Date(bankTransaction.transactionDate.getTime() + 7 * 24 * 60 * 60 * 1000)
            }
        },
        take: 5
    });
    if (potentialMatches.length === 0) {
        return { matchedTransactionId: null, confidence: 0 };
    }
    // Simple matching logic - in production, use more sophisticated AI
    const bestMatch = potentialMatches[0];
    const confidence = 0.85; // Simulated confidence score
    return {
        matchedTransactionId: bestMatch.id,
        confidence: confidence
    };
}
// GET /bank-feeds/connections - List bank connections
router.get('/connections', async (req, res) => {
    try {
        const { companyId } = req;
        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const query = bankConnectionQuery.parse(req.query);
        const skip = (query.page - 1) * query.limit;
        const where = {
            companyId: companyId
        };
        if (query.status)
            where.status = query.status;
        if (query.bankName)
            where.bankName = { contains: query.bankName };
        if (query.accountType)
            where.accountType = query.accountType;
        const [connections, total] = await Promise.all([
            prisma.bankConnection.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            bankTransactions: true,
                            syncLogs: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: query.limit
            }),
            prisma.bankConnection.count({ where })
        ]);
        res.json({
            connections,
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                pages: Math.ceil(total / query.limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching bank connections:', error);
        res.status(500).json({ error: 'Failed to fetch bank connections' });
    }
});
// POST /bank-feeds/connections - Create bank connection
router.post('/connections', async (req, res) => {
    try {
        const { companyId } = req;
        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const data = bankConnectionCreate.parse(req.body);
        const connection = await prisma.bankConnection.create({
            data: {
                ...data,
                companyId,
                credentials: data.credentials ? encryptCredentials(data.credentials) : null,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null
            }
        });
        res.status(201).json(connection);
    }
    catch (error) {
        console.error('Error creating bank connection:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create bank connection' });
    }
});
// GET /bank-feeds/connections/:id - Get bank connection
router.get('/connections/:id', async (req, res) => {
    try {
        const { companyId } = req;
        const { id } = req.params;
        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const connection = await prisma.bankConnection.findFirst({
            where: {
                id,
                companyId
            },
            include: {
                _count: {
                    select: {
                        bankTransactions: true,
                        syncLogs: true
                    }
                }
            }
        });
        if (!connection) {
            return res.status(404).json({ error: 'Bank connection not found' });
        }
        res.json(connection);
    }
    catch (error) {
        console.error('Error fetching bank connection:', error);
        res.status(500).json({ error: 'Failed to fetch bank connection' });
    }
});
// PUT /bank-feeds/connections/:id - Update bank connection
router.put('/connections/:id', async (req, res) => {
    try {
        const { companyId } = req;
        const { id } = req.params;
        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const data = bankConnectionUpdate.parse(req.body);
        const connection = await prisma.bankConnection.updateMany({
            where: {
                id,
                companyId
            },
            data: {
                ...data,
                credentials: data.credentials ? encryptCredentials(data.credentials) : undefined,
                metadata: data.metadata ? JSON.stringify(data.metadata) : undefined
            }
        });
        if (connection.count === 0) {
            return res.status(404).json({ error: 'Bank connection not found' });
        }
        res.json({ message: 'Bank connection updated successfully' });
    }
    catch (error) {
        console.error('Error updating bank connection:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to update bank connection' });
    }
});
// DELETE /bank-feeds/connections/:id - Delete bank connection
router.delete('/connections/:id', async (req, res) => {
    try {
        const { companyId } = req;
        const { id } = req.params;
        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const connection = await prisma.bankConnection.deleteMany({
            where: {
                id,
                companyId
            }
        });
        if (connection.count === 0) {
            return res.status(404).json({ error: 'Bank connection not found' });
        }
        res.json({ message: 'Bank connection deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting bank connection:', error);
        res.status(500).json({ error: 'Failed to delete bank connection' });
    }
});
// POST /bank-feeds/connections/:id/sync - Sync bank transactions
router.post('/connections/:id/sync', async (req, res) => {
    try {
        const { companyId } = req;
        const { id } = req.params;
        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const data = bankSyncRequest.parse(req.body);
        // Create sync log
        const syncLog = await prisma.bankSyncLog.create({
            data: {
                connectionId: id,
                syncType: data.syncType,
                status: 'running'
            }
        });
        try {
            // Sync transactions from bank
            const transactions = await syncBankTransactions(id, data.syncType);
            let imported = 0;
            let updated = 0;
            for (const transaction of transactions) {
                const existing = await prisma.bankTransaction.findFirst({
                    where: {
                        connectionId: id,
                        externalId: transaction.externalId
                    }
                });
                if (existing) {
                    // Update existing transaction
                    await prisma.bankTransaction.update({
                        where: { id: existing.id },
                        data: {
                            ...transaction,
                            updatedAt: new Date()
                        }
                    });
                    updated++;
                }
                else {
                    // Create new transaction
                    await prisma.bankTransaction.create({
                        data: {
                            ...transaction,
                            connectionId: id
                        }
                    });
                    imported++;
                }
            }
            // Update sync log
            await prisma.bankSyncLog.update({
                where: { id: syncLog.id },
                data: {
                    status: 'success',
                    completedAt: new Date(),
                    transactionsFound: transactions.length,
                    transactionsImported: imported,
                    transactionsUpdated: updated
                }
            });
            // Update connection last sync time
            await prisma.bankConnection.update({
                where: { id },
                data: {
                    lastSyncAt: new Date(),
                    nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next sync in 24 hours
                }
            });
            res.json({
                syncId: syncLog.id,
                status: 'success',
                imported,
                updated,
                total: transactions.length
            });
        }
        catch (error) {
            // Update sync log with error
            await prisma.bankSyncLog.update({
                where: { id: syncLog.id },
                data: {
                    status: 'error',
                    completedAt: new Date(),
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                }
            });
            throw error;
        }
    }
    catch (error) {
        console.error('Error syncing bank transactions:', error);
        res.status(500).json({ error: 'Failed to sync bank transactions' });
    }
});
// GET /bank-feeds/transactions - List bank transactions
router.get('/transactions', async (req, res) => {
    try {
        const { companyId } = req;
        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const query = bankTransactionQuery.parse(req.query);
        const skip = (query.page - 1) * query.limit;
        const where = {
            connection: {
                companyId: companyId
            }
        };
        if (query.connectionId)
            where.connectionId = query.connectionId;
        if (query.isReconciled !== undefined)
            where.isReconciled = query.isReconciled;
        if (query.transactionType)
            where.transactionType = query.transactionType;
        if (query.category)
            where.category = query.category;
        if (query.startDate || query.endDate) {
            where.transactionDate = {};
            if (query.startDate)
                where.transactionDate.gte = new Date(query.startDate);
            if (query.endDate)
                where.transactionDate.lte = new Date(query.endDate);
        }
        if (query.search) {
            where.OR = [
                { description: { contains: query.search } },
                { merchantName: { contains: query.search } },
                { reference: { contains: query.search } }
            ];
        }
        const [transactions, total] = await Promise.all([
            prisma.bankTransaction.findMany({
                where,
                include: {
                    connection: {
                        select: {
                            id: true,
                            bankName: true,
                            accountNumber: true
                        }
                    },
                    reconciledByUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    matchedTransaction: {
                        select: {
                            id: true,
                            amount: true,
                            transactionDate: true
                        }
                    }
                },
                orderBy: { transactionDate: 'desc' },
                skip,
                take: query.limit
            }),
            prisma.bankTransaction.count({ where })
        ]);
        res.json({
            transactions,
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                pages: Math.ceil(total / query.limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching bank transactions:', error);
        res.status(500).json({ error: 'Failed to fetch bank transactions' });
    }
});
// POST /bank-feeds/transactions - Create bank transaction
router.post('/transactions', async (req, res) => {
    try {
        const { companyId } = req;
        const { connectionId } = req.body;
        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const data = bankTransactionCreate.parse(req.body);
        // Verify connection belongs to company
        const connection = await prisma.bankConnection.findFirst({
            where: {
                id: connectionId,
                companyId
            }
        });
        if (!connection) {
            return res.status(404).json({ error: 'Bank connection not found' });
        }
        const transaction = await prisma.bankTransaction.create({
            data: {
                ...data,
                connectionId
            }
        });
        res.status(201).json(transaction);
    }
    catch (error) {
        console.error('Error creating bank transaction:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create bank transaction' });
    }
});
// PUT /bank-feeds/transactions/:id - Update bank transaction
router.put('/transactions/:id', async (req, res) => {
    try {
        const { companyId } = req;
        const { id } = req.params;
        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const data = bankTransactionUpdate.parse(req.body);
        const transaction = await prisma.bankTransaction.updateMany({
            where: {
                id,
                connection: {
                    companyId
                }
            },
            data: {
                ...data,
                reconciledAt: data.isReconciled ? new Date() : undefined
            }
        });
        if (transaction.count === 0) {
            return res.status(404).json({ error: 'Bank transaction not found' });
        }
        res.json({ message: 'Bank transaction updated successfully' });
    }
    catch (error) {
        console.error('Error updating bank transaction:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to update bank transaction' });
    }
});
// POST /bank-feeds/reconcile - Run reconciliation
router.post('/reconcile', async (req, res) => {
    try {
        const { companyId, userId } = req;
        if (!companyId || !userId) {
            return res.status(400).json({ error: 'Company ID and User ID are required' });
        }
        const data = bankReconciliationRequest.parse(req.body);
        // Create reconciliation job
        const job = await prisma.bankReconciliationJob.create({
            data: {
                companyId,
                connectionId: data.connectionId,
                jobType: 'manual',
                status: 'running'
            }
        });
        try {
            // Get unreconciled transactions
            const where = {
                connection: {
                    companyId
                },
                isReconciled: false
            };
            if (data.connectionId) {
                where.connectionId = data.connectionId;
            }
            if (data.dateRange) {
                where.transactionDate = {
                    gte: new Date(data.dateRange.startDate),
                    lte: new Date(data.dateRange.endDate)
                };
            }
            const transactions = await prisma.bankTransaction.findMany({
                where,
                include: {
                    connection: true
                }
            });
            let matched = 0;
            let unmatched = 0;
            for (const transaction of transactions) {
                if (data.autoMatch) {
                    // Try to auto-match with internal transactions
                    const match = await matchTransaction(transaction, companyId);
                    if (match.matchedTransactionId && match.confidence > 0.8) {
                        await prisma.bankTransaction.update({
                            where: { id: transaction.id },
                            data: {
                                isReconciled: true,
                                reconciledAt: new Date(),
                                reconciledBy: userId,
                                matchedTransactionId: match.matchedTransactionId,
                                confidence: match.confidence
                            }
                        });
                        matched++;
                    }
                    else {
                        unmatched++;
                    }
                }
                else {
                    unmatched++;
                }
            }
            // Update job status
            await prisma.bankReconciliationJob.update({
                where: { id: job.id },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                    transactionsProcessed: transactions.length,
                    transactionsMatched: matched,
                    transactionsUnmatched: unmatched
                }
            });
            res.json({
                jobId: job.id,
                status: 'completed',
                processed: transactions.length,
                matched,
                unmatched
            });
        }
        catch (error) {
            // Update job status with error
            await prisma.bankReconciliationJob.update({
                where: { id: job.id },
                data: {
                    status: 'failed',
                    completedAt: new Date(),
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                }
            });
            throw error;
        }
    }
    catch (error) {
        console.error('Error running reconciliation:', error);
        res.status(500).json({ error: 'Failed to run reconciliation' });
    }
});
// GET /bank-feeds/reconciliation-rules - List reconciliation rules
router.get('/reconciliation-rules', async (req, res) => {
    try {
        const { companyId } = req;
        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const [rules, total] = await Promise.all([
            prisma.bankReconciliationRule.findMany({
                where: { companyId },
                include: {
                    createdByUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { priority: 'desc' },
                skip,
                take: Number(limit)
            }),
            prisma.bankReconciliationRule.count({
                where: { companyId }
            })
        ]);
        res.json({
            rules,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching reconciliation rules:', error);
        res.status(500).json({ error: 'Failed to fetch reconciliation rules' });
    }
});
// POST /bank-feeds/reconciliation-rules - Create reconciliation rule
router.post('/reconciliation-rules', async (req, res) => {
    try {
        const { companyId, userId } = req;
        if (!companyId || !userId) {
            return res.status(400).json({ error: 'Company ID and User ID are required' });
        }
        const data = bankReconciliationRuleCreate.parse(req.body);
        const rule = await prisma.bankReconciliationRule.create({
            data: {
                ...data,
                companyId,
                createdBy: userId,
                conditions: JSON.stringify(data.conditions),
                actions: JSON.stringify(data.actions)
            },
            include: {
                createdByUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        res.status(201).json(rule);
    }
    catch (error) {
        console.error('Error creating reconciliation rule:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to create reconciliation rule' });
    }
});
// GET /bank-feeds/sync-logs - Get sync logs
router.get('/sync-logs', async (req, res) => {
    try {
        const { companyId } = req;
        const { connectionId, page = 1, limit = 20 } = req.query;
        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            connection: {
                companyId
            }
        };
        if (connectionId) {
            where.connectionId = connectionId;
        }
        const [logs, total] = await Promise.all([
            prisma.bankSyncLog.findMany({
                where,
                include: {
                    connection: {
                        select: {
                            id: true,
                            bankName: true,
                            accountNumber: true
                        }
                    }
                },
                orderBy: { startedAt: 'desc' },
                skip,
                take: Number(limit)
            }),
            prisma.bankSyncLog.count({ where })
        ]);
        res.json({
            logs,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching sync logs:', error);
        res.status(500).json({ error: 'Failed to fetch sync logs' });
    }
});
export default router;
