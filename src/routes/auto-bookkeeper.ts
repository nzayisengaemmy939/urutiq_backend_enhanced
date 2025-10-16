import * as express from 'express';
import { asyncHandler } from '../errors.js';
import type { TenantRequest } from '../tenant.js';
import { autoBookkeeperService } from '../services/auto-bookkeeper-service.js';
import { prisma } from '../prisma.js';

const router = express.Router();

// Get Auto-Bookkeeper configuration
router.get('/config/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { tenantId } = req;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const config = await autoBookkeeperService.getConfig(companyId);

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting auto-bookkeeper config:', error);
    res.status(500).json({ error: 'Failed to get auto-bookkeeper configuration' });
  }
}));

// Update Auto-Bookkeeper configuration
router.put('/config/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const updates = req.body;
  const { tenantId } = req;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const config = await autoBookkeeperService.updateConfig(companyId, updates);

    res.json({
      success: true,
      message: 'Auto-bookkeeper configuration updated successfully',
      data: config
    });
  } catch (error) {
    console.error('Error updating auto-bookkeeper config:', error);
    res.status(500).json({ error: 'Failed to update auto-bookkeeper configuration' });
  }
}));

// Initialize Auto-Bookkeeper
router.post('/initialize/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { tenantId } = req;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const config = await autoBookkeeperService.initializeAutoBookkeeper(companyId);

    res.json({
      success: true,
      message: 'Auto-bookkeeper initialized successfully',
      data: config
    });
  } catch (error) {
    console.error('Error initializing auto-bookkeeper:', error);
    res.status(500).json({ error: 'Failed to initialize auto-bookkeeper' });
  }
}));

// Categorize a single transaction
router.post('/categorize/:transactionId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { transactionId } = req.params;
  const { companyId, forceAuto } = req.body;
  const { tenantId } = req;

  if (!transactionId || !companyId) {
    return res.status(400).json({ error: 'Transaction ID and company ID are required' });
  }

  try {
    const categorization = await autoBookkeeperService.categorizeTransaction(
      transactionId,
      companyId,
      forceAuto || false
    );

    res.json({
      success: true,
      message: 'Transaction categorized successfully',
      data: categorization
    });
  } catch (error) {
    console.error('Error categorizing transaction:', error);
    res.status(500).json({ error: 'Failed to categorize transaction' });
  }
}));

// Generate journal entry for a transaction
router.post('/journal-entry/:transactionId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { transactionId } = req.params;
  const { companyId, forceAuto } = req.body;
  const { tenantId } = req;

  if (!transactionId || !companyId) {
    return res.status(400).json({ error: 'Transaction ID and company ID are required' });
  }

  try {
    const journalEntry = await autoBookkeeperService.generateJournalEntry(
      transactionId,
      companyId,
      forceAuto || false
    );

    res.json({
      success: true,
      message: 'Journal entry generated successfully',
      data: journalEntry
    });
  } catch (error) {
    console.error('Error generating journal entry:', error);
    res.status(500).json({ error: 'Failed to generate journal entry' });
  }
}));

// Reconcile a bank transaction
router.post('/reconcile/:bankTransactionId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { bankTransactionId } = req.params;
  const { companyId, forceAuto } = req.body;
  const { tenantId } = req;

  if (!bankTransactionId || !companyId) {
    return res.status(400).json({ error: 'Bank transaction ID and company ID are required' });
  }

  try {
    const reconciliation = await autoBookkeeperService.reconcileTransaction(
      bankTransactionId,
      companyId,
      forceAuto || false
    );

    res.json({
      success: true,
      message: 'Transaction reconciled successfully',
      data: reconciliation
    });
  } catch (error) {
    console.error('Error reconciling transaction:', error);
    res.status(500).json({ error: 'Failed to reconcile transaction' });
  }
}));

// Process all pending transactions
router.post('/process-pending/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { tenantId } = req;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const results = await autoBookkeeperService.processPendingTransactions(companyId);

    res.json({
      success: true,
      message: 'Pending transactions processed successfully',
      data: results
    });
  } catch (error) {
    console.error('Error processing pending transactions:', error);
    res.status(500).json({ error: 'Failed to process pending transactions' });
  }
}));

// Get Auto-Bookkeeper statistics
router.get('/stats/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { periodDays } = req.query;
  const { tenantId } = req;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const stats = await autoBookkeeperService.getStats(
      companyId,
      periodDays ? parseInt(periodDays as string) : 30
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting auto-bookkeeper stats:', error);
    res.status(500).json({ error: 'Failed to get auto-bookkeeper statistics' });
  }
}));

// Get Auto-Bookkeeper insights
router.get('/insights/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { tenantId } = req;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const insights = await autoBookkeeperService.getInsights(companyId);

    res.json({
      success: true,
      data: insights,
      count: insights.length
    });
  } catch (error) {
    console.error('Error getting auto-bookkeeper insights:', error);
    res.status(500).json({ error: 'Failed to get auto-bookkeeper insights' });
  }
}));

// Get recent categorizations
router.get('/categorizations/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { startDate, endDate, limit } = req.query;
  const { tenantId } = req;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const where: any = { companyId };
    
    if (startDate && endDate) {
      where.appliedAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const categorizations = await prisma.transactionCategorization.findMany({
      where,
      take: limit ? parseInt(limit as string) : 50,
      orderBy: { createdAt: 'desc' },
      include: {
        // transaction: true // TODO: Add when relation is available
      }
    });

    res.json({
      success: true,
      data: categorizations,
      count: categorizations.length
    });
  } catch (error) {
    console.error('Error getting categorizations:', error);
    res.status(500).json({ error: 'Failed to get categorizations' });
  }
}));

// Get recent reconciliations
router.get('/reconciliations/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { startDate, endDate, status, limit } = req.query;
  const { tenantId } = req;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const where: any = { companyId };
    
    if (startDate && endDate) {
      where.reconciliationDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    if (status) {
      where.status = status;
    }

    const reconciliations = await prisma.autoReconciliation.findMany({
      where,
      take: limit ? parseInt(limit as string) : 50,
      orderBy: { createdAt: 'desc' },
      include: {
        // bankTransaction: true // TODO: Add when relation is available,
        matchedTransaction: true
      }
    });

    res.json({
      success: true,
      data: reconciliations,
      count: reconciliations.length
    });
  } catch (error) {
    console.error('Error getting reconciliations:', error);
    res.status(500).json({ error: 'Failed to get reconciliations' });
  }
}));

// Get automation rules
router.get('/rules/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { tenantId } = req;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const config = await autoBookkeeperService.getConfig(companyId);

    res.json({
      success: true,
      data: config.rules,
      count: config.rules.length
    });
  } catch (error) {
    console.error('Error getting automation rules:', error);
    res.status(500).json({ error: 'Failed to get automation rules' });
  }
}));

// Add automation rule
router.post('/rules/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { rule } = req.body;
  const { tenantId } = req;

  if (!companyId || !rule) {
    return res.status(400).json({ error: 'Company ID and rule are required' });
  }

  try {
    const config = await autoBookkeeperService.getConfig(companyId);
    const updatedRules = [...config.rules, { ...rule, id: `rule-${Date.now()}` }];
    
    const updatedConfig = await autoBookkeeperService.updateConfig(companyId, {
      rules: updatedRules
    });

    res.json({
      success: true,
      message: 'Automation rule added successfully',
      data: updatedConfig.rules
    });
  } catch (error) {
    console.error('Error adding automation rule:', error);
    res.status(500).json({ error: 'Failed to add automation rule' });
  }
}));

// Update automation rule
router.put('/rules/:companyId/:ruleId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId, ruleId } = req.params;
  const { rule } = req.body;
  const { tenantId } = req;

  if (!companyId || !ruleId || !rule) {
    return res.status(400).json({ error: 'Company ID, rule ID, and rule are required' });
  }

  try {
    const config = await autoBookkeeperService.getConfig(companyId);
    const updatedRules = config.rules.map(r => 
      r.id === ruleId ? { ...r, ...rule } : r
    );
    
    const updatedConfig = await autoBookkeeperService.updateConfig(companyId, {
      rules: updatedRules
    });

    res.json({
      success: true,
      message: 'Automation rule updated successfully',
      data: updatedConfig.rules
    });
  } catch (error) {
    console.error('Error updating automation rule:', error);
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
}));

// Delete automation rule
router.delete('/rules/:companyId/:ruleId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId, ruleId } = req.params;
  const { tenantId } = req;

  if (!companyId || !ruleId) {
    return res.status(400).json({ error: 'Company ID and rule ID are required' });
  }

  try {
    const config = await autoBookkeeperService.getConfig(companyId);
    const updatedRules = config.rules.filter(r => r.id !== ruleId);
    
    const updatedConfig = await autoBookkeeperService.updateConfig(companyId, {
      rules: updatedRules
    });

    res.json({
      success: true,
      message: 'Automation rule deleted successfully',
      data: updatedConfig.rules
    });
  } catch (error) {
    console.error('Error deleting automation rule:', error);
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
}));

// Get automation performance metrics
router.get('/performance/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { periodDays } = req.query;
  const { tenantId } = req;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (periodDays ? parseInt(periodDays as string) : 30) * 24 * 60 * 60 * 1000);

    // Get performance metrics
    const totalTransactions = await prisma.transaction.count({
      where: {
        companyId,
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const autoCategorized = await prisma.transactionCategorization.count({
      where: {
        companyId,
        // appliedAt: { // TODO: Add when field is available
        //   gte: startDate,
        //   lte: endDate
        // }
      }
    });

    const autoReconciled = await prisma.autoReconciliation.count({
      where: {
        companyId,
        // reconciliationDate: { // TODO: Add when field is available
        //   gte: startDate,
        //   lte: endDate
        // },
        status: 'matched'
      }
    });

    const accuracy = totalTransactions > 0 ? 
      Math.min(0.95, (autoCategorized + autoReconciled) / (totalTransactions * 2)) : 0.95;

    const timeSaved = (autoCategorized + autoReconciled) * 2; // 2 minutes per task
    const automationRate = totalTransactions > 0 ? 
      (autoCategorized + autoReconciled) / (totalTransactions * 2) : 0;

    res.json({
      success: true,
      data: {
        period: { start: startDate, end: endDate },
        totalTransactions,
        autoCategorized,
        autoReconciled,
        accuracy,
        timeSaved,
        automationRate,
        efficiency: {
          transactionsPerHour: totalTransactions / ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)),
          timeSavedPerDay: timeSaved / ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        }
      }
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
}));

// Get automation dashboard data
router.get('/dashboard/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { tenantId } = req;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    // Get stats
    const stats = await autoBookkeeperService.getStats(companyId, 30);
    
    // Get insights
    const insights = await autoBookkeeperService.getInsights(companyId);
    
    // Get recent activity
    const recentCategorizations = await prisma.transactionCategorization.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        // transaction: true // TODO: Add when relation is available
      }
    });

    const recentReconciliations = await prisma.autoReconciliation.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        // bankTransaction: true // TODO: Add when relation is available,
        matchedTransaction: true
      }
    });

    // Get pending items
    const pendingCategorizations = await prisma.transaction.count({
      where: {
        companyId,
        // category: null // TODO: Add when field is available
      }
    });

    const pendingReconciliations = await prisma.bankTransaction.count({
      where: {
        // companyId, // TODO: Add when field is available
        reconciled: false
      }
    });

    res.json({
      success: true,
      data: {
        stats,
        insights,
        recentActivity: {
          categorizations: recentCategorizations,
          reconciliations: recentReconciliations
        },
        pendingItems: {
          categorizations: pendingCategorizations,
          reconciliations: pendingReconciliations
        }
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
}));

export default router;
