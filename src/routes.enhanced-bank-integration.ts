import { Router } from 'express';
import { EnhancedBankIntegrationService, BankConnection, CashFlowForecast } from './services/enhanced-bank-integration.service';
import { authMiddleware, requireRoles } from './auth.js';
import { asyncHandler, ApiError } from './errors';
import { TenantRequest } from './tenant';
import { z } from 'zod';
import { prisma } from './prisma';

const router = Router();

// Validation schemas
const connectBankSchema = z.object({
  companyId: z.string().min(1),
  bankId: z.string().min(1),
  accountType: z.enum(['checking', 'savings', 'credit', 'investment', 'loan']),
  accountNumber: z.string().min(1),
  routingNumber: z.string().optional(),
  accountName: z.string().min(1),
  currency: z.string().default('USD'),
  credentials: z.record(z.any())
});

const syncBankSchema = z.object({
  bankConnectionId: z.string().min(1),
  forceSync: z.boolean().default(false)
});

const forecastSchema = z.object({
  companyId: z.string().min(1),
  forecastPeriod: z.enum(['7d', '14d', '30d', '60d', '90d']).default('30d')
});

// Connect to bank account
router.post('/banking/connect',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const bankData = connectBankSchema.parse(req.body);

    const bankConnection = await EnhancedBankIntegrationService.connectBankAccount(
      req.tenantId!,
      bankData.companyId,
      bankData
    );

    res.json({
      success: true,
      data: bankConnection,
      message: 'Bank account connected successfully'
    });
  })
);

// Get bank connections
router.get('/banking/connections',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;

    const connections = await EnhancedBankIntegrationService.getBankConnections(
      req.tenantId!,
      companyId as string
    );

    res.json({
      success: true,
      data: connections
    });
  })
);

// Sync bank transactions
router.post('/banking/sync',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { bankConnectionId, forceSync } = syncBankSchema.parse(req.body);

    const syncResult = await EnhancedBankIntegrationService.syncBankTransactions(
      bankConnectionId,
      forceSync
    );

    res.json({
      success: syncResult.success,
      data: syncResult,
      message: syncResult.success ? 'Bank sync completed successfully' : 'Bank sync failed'
    });
  })
);

// Generate cash flow forecast
router.post('/banking/forecast',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, forecastPeriod } = forecastSchema.parse(req.body);

    const forecast = await EnhancedBankIntegrationService.generateCashFlowForecast(
      req.tenantId!,
      companyId,
      forecastPeriod
    );

    res.json({
      success: true,
      data: forecast,
      message: 'Cash flow forecast generated successfully'
    });
  })
);

// Get available bank providers
router.get('/banking/providers',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { country } = req.query;

    const providers = await EnhancedBankIntegrationService.getBankProviders(
      country as string
    );

    res.json({
      success: true,
      data: providers
    });
  })
);

// Get bank transactions
router.get('/banking/transactions',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { 
      bankConnectionId, 
      startDate, 
      endDate, 
      status, 
      isReconciled,
      limit = 100,
      offset = 0
    } = req.query;

    const whereClause: any = { tenantId: req.tenantId! };
    
    if (bankConnectionId) {
      whereClause.bankConnectionId = bankConnectionId;
    }
    if (startDate) {
      whereClause.date = { ...whereClause.date, gte: new Date(startDate as string) };
    }
    if (endDate) {
      whereClause.date = { ...whereClause.date, lte: new Date(endDate as string) };
    }
    if (status) {
      whereClause.status = status;
    }
    if (isReconciled !== undefined) {
      whereClause.isReconciled = isReconciled === 'true';
    }

    const transactions = await prisma.bankTransaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        bankConnectionId: true,
        externalId: true,
        date: true,
        amount: true,
        currency: true,
        description: true,
        merchantName: true,
        category: true,
        subcategory: true,
        accountBalance: true,
        transactionType: true,
        status: true,
        isReconciled: true,
        reconciledAt: true,
        matchedPaymentId: true,
        tags: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const processedTransactions = transactions.map(tx => ({
      ...tx,
      tags: JSON.parse(tx.tags || '[]'),
      metadata: JSON.parse(tx.metadata || '{}')
    }));

    res.json({
      success: true,
      data: processedTransactions,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: await prisma.bankTransaction.count({ where: whereClause })
      }
    });
  })
);

// Reconcile bank transaction
router.post('/banking/transactions/:transactionId/reconcile',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { transactionId } = req.params;
    const { paymentId, notes } = req.body;

    const transaction = await prisma.bankTransaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      throw new ApiError(404, 'TRANSACTION_NOT_FOUND', 'Bank transaction not found');
    }

    await prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        isReconciled: true,
        reconciledAt: new Date(),
        matchedPaymentId: paymentId,
        metadata: JSON.stringify({
          ...JSON.parse(transaction.metadata || '{}'),
          reconciliationNotes: notes
        }),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Transaction reconciled successfully'
    });
  })
);

// Get cash flow forecasts
router.get('/banking/forecasts',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, forecastPeriod, limit = 10 } = req.query;

    const whereClause: any = { tenantId: req.tenantId! };
    
    if (companyId) {
      whereClause.companyId = companyId;
    }
    if (forecastPeriod) {
      whereClause.forecastPeriod = forecastPeriod;
    }

    const forecasts = await prisma.cashFlowForecast.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      select: {
        id: true,
        tenantId: true,
        companyId: true,
        forecastDate: true,
        forecastPeriod: true,
        confidence: true,
        totalInflows: true,
        totalOutflows: true,
        netCashFlow: true,
        endingBalance: true,
        dailyProjections: true,
        riskFactors: true,
        recommendations: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const processedForecasts = forecasts.map(forecast => ({
      ...forecast,
      dailyProjections: JSON.parse(forecast.dailyProjections || '[]'),
      riskFactors: JSON.parse(forecast.riskFactors || '[]'),
      recommendations: JSON.parse(forecast.recommendations || '[]')
    }));

    res.json({
      success: true,
      data: processedForecasts
    });
  })
);

// Get specific cash flow forecast
router.get('/banking/forecasts/:forecastId',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { forecastId } = req.params;

    const forecast = await prisma.cashFlowForecast.findUnique({
      where: { id: forecastId, tenantId: req.tenantId! }
    });

    if (!forecast) {
      throw new ApiError(404, 'FORECAST_NOT_FOUND', 'Cash flow forecast not found');
    }

    const processedForecast = {
      ...forecast,
      dailyProjections: JSON.parse(forecast.dailyProjections || '[]'),
      riskFactors: JSON.parse(forecast.riskFactors || '[]'),
      recommendations: JSON.parse(forecast.recommendations || '[]')
    };

    res.json({
      success: true,
      data: processedForecast
    });
  })
);

// Update bank connection
router.put('/banking/connections/:connectionId',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { connectionId } = req.params;
    const updateSchema = z.object({
      accountName: z.string().min(1).optional(),
      syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly']).optional(),
      isActive: z.boolean().optional()
    });

    const updates = updateSchema.parse(req.body);

    const connection = await prisma.bankConnection.findUnique({
      where: { id: connectionId, tenantId: req.tenantId! }
    });

    if (!connection) {
      throw new ApiError(404, 'CONNECTION_NOT_FOUND', 'Bank connection not found');
    }

    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Bank connection updated successfully'
    });
  })
);

// Disconnect bank account
router.delete('/banking/connections/:connectionId',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { connectionId } = req.params;

    const connection = await prisma.bankConnection.findUnique({
      where: { id: connectionId, tenantId: req.tenantId! }
    });

    if (!connection) {
      throw new ApiError(404, 'CONNECTION_NOT_FOUND', 'Bank connection not found');
    }

    // Deactivate instead of delete to preserve transaction history
    await prisma.bankConnection.update({
      where: { id: connectionId },
      data: {
        isActive: false,
        status: 'disconnected',
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Bank account disconnected successfully'
    });
  })
);

// Get bank account balance
router.get('/banking/balance',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;

    const connections = await EnhancedBankIntegrationService.getBankConnections(
      req.tenantId!,
      companyId as string
    );

    // Get latest balance from each connection
    const balances = await Promise.all(
      connections.map(async (connection) => {
        const latestTransaction = await prisma.bankTransaction.findFirst({
          where: { bankConnectionId: connection.id },
          orderBy: { date: 'desc' },
          select: { accountBalance: true, currency: true }
        });

        return {
          connectionId: connection.id,
          bankName: connection.bankName,
          accountName: connection.accountName,
          accountType: connection.accountType,
          balance: latestTransaction?.accountBalance || 0,
          currency: latestTransaction?.currency || connection.currency,
          lastUpdated: connection.lastSyncAt
        };
      })
    );

    const totalBalance = balances.reduce((sum, balance) => sum + balance.balance, 0);

    res.json({
      success: true,
      data: {
        accounts: balances,
        totalBalance,
        currency: balances[0]?.currency || 'USD',
        lastUpdated: Math.max(...balances.map(b => b.lastUpdated?.getTime() || 0))
      }
    });
  })
);

// Get transaction categories
router.get('/banking/categories',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, startDate, endDate } = req.query;

    const whereClause: any = { tenantId: req.tenantId! };
    
    if (companyId) {
      whereClause.companyId = companyId;
    }
    if (startDate) {
      whereClause.date = { ...whereClause.date, gte: new Date(startDate as string) };
    }
    if (endDate) {
      whereClause.date = { ...whereClause.date, lte: new Date(endDate as string) };
    }

    const categories = await prisma.bankTransaction.groupBy({
      by: ['category'],
      where: whereClause,
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } }
    });

    const processedCategories = categories.map(cat => ({
      category: cat.category || 'Uncategorized',
      totalAmount: Math.abs(cat._sum.amount || 0),
      transactionCount: cat._count.id,
      averageAmount: Math.abs(cat._sum.amount || 0) / cat._count.id
    }));

    res.json({
      success: true,
      data: processedCategories
    });
  })
);

// Auto-categorize transactions
router.post('/banking/transactions/categorize',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { bankConnectionId, startDate, endDate } = req.body;

    const whereClause: any = { tenantId: req.tenantId! };
    
    if (bankConnectionId) {
      whereClause.bankConnectionId = bankConnectionId;
    }
    if (startDate) {
      whereClause.date = { ...whereClause.date, gte: new Date(startDate) };
    }
    if (endDate) {
      whereClause.date = { ...whereClause.date, lte: new Date(endDate) };
    }

    const uncategorizedTransactions = await prisma.bankTransaction.findMany({
      where: {
        ...whereClause,
        category: null
      }
    });

    let categorizedCount = 0;

    for (const transaction of uncategorizedTransactions) {
      // Simple categorization logic based on description keywords
      const description = transaction.description.toLowerCase();
      let category = 'Other';

      if (description.includes('coffee') || description.includes('restaurant') || description.includes('food')) {
        category = 'Food & Dining';
      } else if (description.includes('gas') || description.includes('fuel')) {
        category = 'Transportation';
      } else if (description.includes('grocery') || description.includes('supermarket')) {
        category = 'Groceries';
      } else if (description.includes('salary') || description.includes('payroll')) {
        category = 'Income';
      } else if (description.includes('rent') || description.includes('mortgage')) {
        category = 'Housing';
      } else if (description.includes('insurance')) {
        category = 'Insurance';
      } else if (description.includes('utility') || description.includes('electric') || description.includes('water')) {
        category = 'Utilities';
      }

      await prisma.bankTransaction.update({
        where: { id: transaction.id },
        data: { category }
      });

      categorizedCount++;
    }

    res.json({
      success: true,
      data: {
        categorizedCount,
        totalUncategorized: uncategorizedTransactions.length
      },
      message: `Successfully categorized ${categorizedCount} transactions`
    });
  })
);

export default router;
