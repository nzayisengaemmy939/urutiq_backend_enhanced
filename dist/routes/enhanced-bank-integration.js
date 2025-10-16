import * as express from 'express';
import { enhancedBankIntegrationService } from '../services/enhanced-bank-integration';
import { prisma } from '../prisma';
const router = express.Router();
// Helper function for async error handling
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
// POST /enhanced-bank-integration/process-feed - Process real-time bank feed
router.post('/process-feed', asyncHandler(async (req, res) => {
    const { connectionId, transactions, config } = req.body;
    const { tenantId } = req;
    if (!connectionId || !transactions || !Array.isArray(transactions)) {
        return res.status(400).json({ error: 'Invalid request: connectionId and transactions array required' });
    }
    try {
        // Validate connection belongs to tenant
        const connection = await prisma.bankConnection.findFirst({
            where: {
                id: connectionId,
                company: { tenantId: tenantId || 'demo-tenant-id' }
            }
        });
        if (!connection) {
            return res.status(404).json({ error: 'Bank connection not found' });
        }
        // Process bank feed with AI-powered reconciliation
        const result = await enhancedBankIntegrationService.processBankFeed(connectionId, transactions, config || {
            autoReconciliation: true,
            confidenceThreshold: 0.8,
            fraudDetectionEnabled: true,
            autoCategorization: true,
            realTimeSync: true,
            syncFrequency: 'daily',
            notificationSettings: {
                email: false,
                slack: false
            }
        });
        res.json({
            success: true,
            message: 'Bank feed processed successfully',
            result
        });
    }
    catch (error) {
        console.error('Error processing bank feed:', error);
        res.status(500).json({ error: 'Failed to process bank feed' });
    }
}));
// POST /enhanced-bank-integration/reconcile - Run AI-powered reconciliation
router.post('/reconcile', asyncHandler(async (req, res) => {
    const { connectionId, dateRange, config } = req.body;
    const { tenantId } = req;
    if (!connectionId) {
        return res.status(400).json({ error: 'Connection ID is required' });
    }
    try {
        // Validate connection belongs to tenant
        const connection = await prisma.bankConnection.findFirst({
            where: {
                id: connectionId,
                company: { tenantId: tenantId || 'demo-tenant-id' }
            }
        });
        if (!connection) {
            return res.status(404).json({ error: 'Bank connection not found' });
        }
        // Get unreconciled transactions
        const where = {
            connectionId,
            isReconciled: false
        };
        if (dateRange) {
            where.transactionDate = {
                gte: new Date(dateRange.startDate),
                lte: new Date(dateRange.endDate)
            };
        }
        const transactions = await prisma.bankTransaction.findMany({
            where,
            include: { connection: true }
        });
        // Convert to BankFeedTransaction format for processing
        const bankTransactions = transactions.map(t => ({
            id: t.id,
            externalId: t.externalId || t.id,
            transactionDate: t.transactionDate,
            postedDate: t.postedDate || undefined,
            amount: Number(t.amount),
            currency: t.currency,
            description: t.description || '',
            merchantName: t.merchantName || undefined,
            merchantCategory: t.merchantCategory || undefined,
            transactionType: t.transactionType,
            reference: t.reference || undefined,
            checkNumber: t.checkNumber || undefined,
            memo: t.memo || undefined
        }));
        // Process reconciliation
        const result = await enhancedBankIntegrationService.processBankFeed(connectionId, bankTransactions, config || {
            autoReconciliation: true,
            confidenceThreshold: 0.8,
            fraudDetectionEnabled: true,
            autoCategorization: true,
            realTimeSync: false,
            syncFrequency: 'daily',
            notificationSettings: {
                email: false,
                slack: false
            }
        });
        res.json({
            success: true,
            message: 'Reconciliation completed successfully',
            result
        });
    }
    catch (error) {
        console.error('Error running reconciliation:', error);
        res.status(500).json({ error: 'Failed to run reconciliation' });
    }
}));
// GET /enhanced-bank-integration/stats/:companyId - Get bank integration statistics
router.get('/stats/:companyId', asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { tenantId } = req;
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }
    try {
        // Validate company belongs to tenant
        const company = await prisma.company.findFirst({
            where: {
                id: companyId,
                tenantId: tenantId || 'demo-tenant-id'
            }
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const stats = await enhancedBankIntegrationService.getBankIntegrationStats(companyId);
        res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        console.error('Error getting bank integration stats:', error);
        res.status(500).json({ error: 'Failed to get bank integration statistics' });
    }
}));
// GET /enhanced-bank-integration/rules/:companyId - Get reconciliation rules
router.get('/rules/:companyId', asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { tenantId } = req;
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }
    try {
        // Validate company belongs to tenant
        const company = await prisma.company.findFirst({
            where: {
                id: companyId,
                tenantId: tenantId || 'demo-tenant-id'
            }
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const rules = await enhancedBankIntegrationService.getReconciliationRules(companyId);
        res.json({
            success: true,
            rules
        });
    }
    catch (error) {
        console.error('Error getting reconciliation rules:', error);
        res.status(500).json({ error: 'Failed to get reconciliation rules' });
    }
}));
// POST /enhanced-bank-integration/rules - Create reconciliation rule
router.post('/rules', asyncHandler(async (req, res) => {
    const { companyId, name, description, conditions, actions } = req.body;
    const { tenantId } = req;
    if (!companyId || !name || !conditions || !actions) {
        return res.status(400).json({ error: 'Company ID, name, conditions, and actions are required' });
    }
    try {
        // Validate company belongs to tenant
        const company = await prisma.company.findFirst({
            where: {
                id: companyId,
                tenantId: tenantId || 'demo-tenant-id'
            }
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const rule = await enhancedBankIntegrationService.createReconciliationRule(companyId, name, description, conditions, actions, 'demo-user-id' // TODO: Get from authenticated user
        );
        res.json({
            success: true,
            message: 'Reconciliation rule created successfully',
            rule
        });
    }
    catch (error) {
        console.error('Error creating reconciliation rule:', error);
        res.status(500).json({ error: 'Failed to create reconciliation rule' });
    }
}));
// POST /enhanced-bank-integration/test-connection/:connectionId - Test bank connection
router.post('/test-connection/:connectionId', asyncHandler(async (req, res) => {
    const { connectionId } = req.params;
    const { tenantId } = req;
    if (!connectionId) {
        return res.status(400).json({ error: 'Connection ID is required' });
    }
    try {
        // Validate connection belongs to tenant
        const connection = await prisma.bankConnection.findFirst({
            where: {
                id: connectionId,
                company: { tenantId: tenantId || 'demo-tenant-id' }
            }
        });
        if (!connection) {
            return res.status(404).json({ error: 'Bank connection not found' });
        }
        const testResult = await enhancedBankIntegrationService.testBankConnection(connectionId);
        res.json({
            success: true,
            testResult
        });
    }
    catch (error) {
        console.error('Error testing bank connection:', error);
        res.status(500).json({ error: 'Failed to test bank connection' });
    }
}));
// GET /enhanced-bank-integration/transactions/:connectionId - Get transactions with AI insights
router.get('/transactions/:connectionId', asyncHandler(async (req, res) => {
    const { connectionId } = req.params;
    const { page = 1, limit = 20, isReconciled, transactionType, startDate, endDate, search } = req.query;
    const { tenantId } = req;
    if (!connectionId) {
        return res.status(400).json({ error: 'Connection ID is required' });
    }
    try {
        // Validate connection belongs to tenant
        const connection = await prisma.bankConnection.findFirst({
            where: {
                id: connectionId,
                company: { tenantId: tenantId || 'demo-tenant-id' }
            }
        });
        if (!connection) {
            return res.status(404).json({ error: 'Bank connection not found' });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            connectionId
        };
        if (isReconciled !== undefined)
            where.isReconciled = isReconciled === 'true';
        if (transactionType)
            where.transactionType = transactionType;
        if (startDate || endDate) {
            where.transactionDate = {};
            if (startDate)
                where.transactionDate.gte = new Date(startDate);
            if (endDate)
                where.transactionDate.lte = new Date(endDate);
        }
        if (search) {
            where.OR = [
                { description: { contains: search } },
                { merchantName: { contains: search } },
                { reference: { contains: search } }
            ];
        }
        const [transactions, total] = await Promise.all([
            prisma.bankTransaction.findMany({
                where,
                include: {
                    connection: true,
                    reconciledByUser: {
                        select: { name: true, email: true }
                    },
                    matchedTransaction: {
                        select: { id: true, amount: true, transactionDate: true }
                    }
                },
                orderBy: { transactionDate: 'desc' },
                skip,
                take: Number(limit)
            }),
            prisma.bankTransaction.count({ where })
        ]);
        // Add AI insights to transactions
        const transactionsWithInsights = await Promise.all(transactions.map(async (transaction) => {
            const riskScore = await enhancedBankIntegrationService['calculateRiskScore'](transaction);
            const fraudScore = await enhancedBankIntegrationService['detectFraud'](transaction, connection.companyId);
            return {
                ...transaction,
                aiInsights: {
                    riskScore,
                    fraudScore,
                    confidence: Number(transaction.confidence),
                    requiresReview: Number(transaction.confidence) < 0.8,
                    suggestedCategory: transaction.category,
                    suggestedVendor: transaction.merchantName
                }
            };
        }));
        res.json({
            success: true,
            transactions: transactionsWithInsights,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error getting transactions with AI insights:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
}));
// POST /enhanced-bank-integration/auto-categorize/:transactionId - Auto-categorize transaction
router.post('/auto-categorize/:transactionId', asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const { tenantId } = req;
    if (!transactionId) {
        return res.status(400).json({ error: 'Transaction ID is required' });
    }
    try {
        // Validate transaction belongs to tenant
        const transaction = await prisma.bankTransaction.findFirst({
            where: {
                id: transactionId,
                connection: {
                    company: { tenantId: tenantId || 'demo-tenant-id' }
                }
            }
        });
        if (!transaction) {
            return res.status(404).json({ error: 'Bank transaction not found' });
        }
        const category = await enhancedBankIntegrationService['autoCategorizeTransaction'](transaction);
        if (category) {
            await prisma.bankTransaction.update({
                where: { id: transactionId },
                data: { category }
            });
            res.json({
                success: true,
                message: 'Transaction auto-categorized successfully',
                category
            });
        }
        else {
            res.json({
                success: false,
                message: 'Could not auto-categorize transaction'
            });
        }
    }
    catch (error) {
        console.error('Error auto-categorizing transaction:', error);
        res.status(500).json({ error: 'Failed to auto-categorize transaction' });
    }
}));
// POST /enhanced-bank-integration/fraud-analysis/:transactionId - Analyze transaction for fraud
router.post('/fraud-analysis/:transactionId', asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const { tenantId } = req;
    if (!transactionId) {
        return res.status(400).json({ error: 'Transaction ID is required' });
    }
    try {
        // Validate transaction belongs to tenant
        const transaction = await prisma.bankTransaction.findFirst({
            where: {
                id: transactionId,
                connection: {
                    company: { tenantId: tenantId || 'demo-tenant-id' }
                }
            },
            include: { connection: true }
        });
        if (!transaction) {
            return res.status(404).json({ error: 'Bank transaction not found' });
        }
        const fraudScore = await enhancedBankIntegrationService['detectFraud'](transaction, transaction.connection?.companyId || 'demo-company-id');
        const riskScore = await enhancedBankIntegrationService['calculateRiskScore'](transaction);
        const analysis = {
            fraudScore,
            riskScore,
            riskLevel: enhancedBankIntegrationService['calculateRiskLevel'](0.8, fraudScore > 0.7 ? 1 : 0),
            indicators: {
                amountAnomaly: enhancedBankIntegrationService['calculateAmountAnomaly'](Number(transaction.amount), []),
                timeAnomaly: enhancedBankIntegrationService['calculateTimeAnomaly'](transaction.transactionDate, []),
                merchantAnomaly: enhancedBankIntegrationService['calculateMerchantAnomaly'](transaction.merchantName || '', []),
                patternAnomaly: enhancedBankIntegrationService['calculatePatternAnomaly'](transaction, [])
            },
            recommendations: fraudScore > 0.7 ? [
                'Review transaction manually',
                'Check for duplicate transactions',
                'Verify merchant authenticity',
                'Consider blocking similar transactions'
            ] : [
                'Transaction appears normal',
                'Continue with standard processing'
            ]
        };
        res.json({
            success: true,
            analysis
        });
    }
    catch (error) {
        console.error('Error analyzing fraud:', error);
        res.status(500).json({ error: 'Failed to analyze fraud' });
    }
}));
// GET /enhanced-bank-integration/connections/:companyId - Get bank connections with status
router.get('/connections/:companyId', asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { tenantId } = req;
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }
    try {
        // Validate company belongs to tenant
        const company = await prisma.company.findFirst({
            where: {
                id: companyId,
                tenantId: tenantId || 'demo-tenant-id'
            }
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const connections = await prisma.bankConnection.findMany({
            where: { companyId },
            include: {
                _count: {
                    select: {
                        bankTransactions: true,
                        syncLogs: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Add connection health status
        const connectionsWithHealth = await Promise.all(connections.map(async (connection) => {
            const testResult = await enhancedBankIntegrationService.testBankConnection(connection.id);
            const lastSync = connection.lastSyncAt;
            const daysSinceLastSync = lastSync ? Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24)) : null;
            let healthStatus = 'unknown';
            if (testResult.success) {
                if (daysSinceLastSync === null || daysSinceLastSync <= 1) {
                    healthStatus = 'excellent';
                }
                else if (daysSinceLastSync <= 7) {
                    healthStatus = 'good';
                }
                else if (daysSinceLastSync <= 30) {
                    healthStatus = 'warning';
                }
                else {
                    healthStatus = 'critical';
                }
            }
            else {
                healthStatus = 'error';
            }
            return {
                ...connection,
                healthStatus,
                daysSinceLastSync,
                testResult
            };
        }));
        res.json({
            success: true,
            connections: connectionsWithHealth
        });
    }
    catch (error) {
        console.error('Error getting bank connections:', error);
        res.status(500).json({ error: 'Failed to get bank connections' });
    }
}));
// POST /enhanced-bank-integration/sync/:connectionId - Trigger manual sync
router.post('/sync/:connectionId', asyncHandler(async (req, res) => {
    const { connectionId } = req.params;
    const { syncType = 'incremental' } = req.body;
    const { tenantId } = req;
    if (!connectionId) {
        return res.status(400).json({ error: 'Connection ID is required' });
    }
    try {
        // Validate connection belongs to tenant
        const connection = await prisma.bankConnection.findFirst({
            where: {
                id: connectionId,
                company: { tenantId: tenantId || 'demo-tenant-id' }
            }
        });
        if (!connection) {
            return res.status(404).json({ error: 'Bank connection not found' });
        }
        // Create sync log
        const syncLog = await prisma.bankSyncLog.create({
            data: {
                connectionId,
                syncType,
                status: 'running'
            }
        });
        // Simulate sync process (in real implementation, this would call the actual bank API)
        const mockTransactions = [
            {
                id: `mock-${Date.now()}-1`,
                externalId: `ext-${Date.now()}-1`,
                transactionDate: new Date(),
                amount: 1250.50,
                currency: 'USD',
                description: 'Office Supplies Purchase',
                merchantName: 'Office Depot',
                merchantCategory: 'Office Supplies',
                transactionType: 'debit',
                reference: `REF-${Date.now()}`
            },
            {
                id: `mock-${Date.now()}-2`,
                externalId: `ext-${Date.now()}-2`,
                transactionDate: new Date(),
                amount: 2500.00,
                currency: 'USD',
                description: 'Client Payment',
                merchantName: 'Client Corp',
                merchantCategory: 'Payment',
                transactionType: 'credit',
                reference: `PAY-${Date.now()}`
            }
        ];
        // Process the mock transactions
        const result = await enhancedBankIntegrationService.processBankFeed(connectionId, mockTransactions, {
            autoReconciliation: true,
            confidenceThreshold: 0.8,
            fraudDetectionEnabled: true,
            autoCategorization: true,
            realTimeSync: false,
            syncFrequency: 'daily',
            notificationSettings: {
                email: false,
                slack: false
            }
        });
        // Update sync log
        await prisma.bankSyncLog.update({
            where: { id: syncLog.id },
            data: {
                status: 'success',
                completedAt: new Date(),
                transactionsFound: mockTransactions.length,
                transactionsImported: result.processedTransactions,
                transactionsUpdated: 0,
                metadata: JSON.stringify(result)
            }
        });
        // Update connection last sync time
        await prisma.bankConnection.update({
            where: { id: connectionId },
            data: {
                lastSyncAt: new Date(),
                nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next sync in 24 hours
            }
        });
        res.json({
            success: true,
            message: 'Sync completed successfully',
            syncLogId: syncLog.id,
            result
        });
    }
    catch (error) {
        console.error('Error syncing bank connection:', error);
        res.status(500).json({ error: 'Failed to sync bank connection' });
    }
}));
export default router;
