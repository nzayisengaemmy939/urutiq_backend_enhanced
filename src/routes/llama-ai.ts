import * as express from 'express';
import { asyncHandler } from '../errors';
import type { TenantRequest } from '../tenant';
import { authMiddleware, requireRoles } from '../auth';
import { llamaEnhancedConversationalAI, LlamaConversationContext } from '../services/llama-enhanced-conversational-ai';
import { llamaDocumentProcessor } from '../services/llama-document-processor';
import { llamaPredictiveAnalytics } from '../services/llama-predictive-analytics';
import { llamaComplianceAudit } from '../services/llama-compliance-audit';
import { prisma } from '../prisma';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'llama-ai',
    timestamp: new Date().toISOString(),
    models: {
      conversational: 'llama3.1:8b',
      advanced: 'llama3.1:70b',
      vision: 'llava:7b'
    }
  });
});

// Enhanced Conversational AI
router.post('/conversational/chat',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { message, companyId, sessionId, mode } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!message || !companyId) {
      return res.status(400).json({ error: 'Message and company ID are required' });
    }

    try {
      // Build enhanced context
      const startedAt = Date.now();
      const context = await buildLlamaConversationContext(companyId, tenantId, userId || 'demo-user-1', sessionId);
      const response = await llamaEnhancedConversationalAI.processNaturalLanguageInput(message, context, { mode: mode || 'fast' });
      const latencyMs = Date.now() - startedAt;

      res.json({
        success: true,
        data: { ...response, latencyMs },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in conversational AI:', error);
      res.status(500).json({ error: 'Failed to process conversational request' });
    }
  })
);

// Document Processing with Llama
router.post('/documents/process-receipt',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { imageUrl, companyId } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!imageUrl || !companyId) {
      return res.status(400).json({ error: 'Image URL and company ID are required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaDocumentProcessor.processReceiptImage(imageUrl, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing receipt:', error);
      res.status(500).json({ error: 'Failed to process receipt' });
    }
  })
);

// Document image upload (base64 or data URL)
router.post('/documents/process-upload',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { imageBase64, companyId } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!imageBase64 || !companyId) {
      return res.status(400).json({ error: 'Base64 image and company ID are required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaDocumentProcessor.processReceiptImage(imageBase64, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing uploaded document:', error);
      res.status(500).json({ error: 'Failed to process uploaded document' });
    }
  })
);

router.post('/documents/process-invoice',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { documentContent, companyId } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!documentContent || !companyId) {
      return res.status(400).json({ error: 'Document content and company ID are required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaDocumentProcessor.processInvoiceDocument(documentContent, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing invoice:', error);
      res.status(500).json({ error: 'Failed to process invoice' });
    }
  })
);

router.post('/documents/process-contract',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { documentContent, companyId } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!documentContent || !companyId) {
      return res.status(400).json({ error: 'Document content and company ID are required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaDocumentProcessor.processContractDocument(documentContent, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing contract:', error);
      res.status(500).json({ error: 'Failed to process contract' });
    }
  })
);

// Predictive Analytics with Llama
router.post('/analytics/cash-flow-forecast',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId, months = 12 } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaPredictiveAnalytics.generateCashFlowForecast(companyId, months, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating cash flow forecast:', error);
      res.status(500).json({ error: 'Failed to generate cash flow forecast' });
    }
  })
);

router.post('/analytics/revenue-forecast',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId, months = 12 } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaPredictiveAnalytics.generateRevenueForecast(companyId, months, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating revenue forecast:', error);
      res.status(500).json({ error: 'Failed to generate revenue forecast' });
    }
  })
);

router.post('/analytics/expense-forecast',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId, months = 12 } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaPredictiveAnalytics.generateExpenseForecast(companyId, months, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating expense forecast:', error);
      res.status(500).json({ error: 'Failed to generate expense forecast' });
    }
  })
);

router.post('/analytics/comprehensive-forecast',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId, months = 12 } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaPredictiveAnalytics.generateComprehensiveBusinessForecast(companyId, months, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating comprehensive forecast:', error);
      res.status(500).json({ error: 'Failed to generate comprehensive forecast' });
    }
  })
);

// Financial Analysis
router.post('/analysis/financial-trends',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaEnhancedConversationalAI.analyzeFinancialTrends(context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error analyzing financial trends:', error);
      res.status(500).json({ error: 'Failed to analyze financial trends' });
    }
  })
);

router.post('/analysis/financial-insights',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaEnhancedConversationalAI.generateFinancialInsights(context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating financial insights:', error?.message || error);
      res.status(500).json({ error: 'Failed to generate financial insights' });
    }
  })
);

// Document Query
router.post('/documents/query',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'viewer']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { documentContent, query, companyId } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!documentContent || !query || !companyId) {
      return res.status(400).json({ error: 'Document content, query, and company ID are required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaEnhancedConversationalAI.processDocumentQuery(documentContent, query, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing document query:', error);
      res.status(500).json({ error: 'Failed to process document query' });
    }
  })
);

// Compliance & Audit Analysis
router.post('/compliance/analyze',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaComplianceAudit.analyzeCompliance(companyId, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error analyzing compliance:', error);
      res.status(500).json({ error: 'Failed to analyze compliance' });
    }
  })
);

router.post('/compliance/audit-transaction',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { transactionId, companyId } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!transactionId || !companyId) {
      return res.status(400).json({ error: 'Transaction ID and company ID are required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const result = await llamaComplianceAudit.auditTransaction(transactionId, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error auditing transaction:', error);
      res.status(500).json({ error: 'Failed to audit transaction' });
    }
  })
);

router.post('/compliance/generate-report',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId, startDate, endDate } = req.body;
    const { tenantId } = req;
    const userId = req.user?.sub || 'demo-user-1';

    if (!companyId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Company ID, start date, and end date are required' });
    }

    try {
      const context = await buildLlamaConversationContext(companyId, tenantId, userId);
      const period = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
      
      const result = await llamaComplianceAudit.generateComplianceReport(companyId, period, context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ error: 'Failed to generate compliance report' });
    }
  })
);

// Helper function to build Llama conversation context
async function buildLlamaConversationContext(
  companyId: string, 
  tenantId: string, 
  userId: string, 
  sessionId?: string
): Promise<LlamaConversationContext> {
  try {
    // Get company information (fail-soft)
    let company: any = null;
    try {
      company = await prisma.company.findUnique({ where: { id: companyId } });
    } catch (e) {
      console.warn('Company lookup failed, using defaults:', e);
    }

    // Get recent transactions for financial context (fail-soft)
    let recentTransactions: any[] = [];
    
    // Calculate date range - Use broader range to capture more data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Also get last 30 days for more comprehensive data
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      // Get transactions from last 30 days first
      recentTransactions = await prisma.transaction.findMany({
        where: { 
          companyId,
          transactionDate: {
            gte: last30Days,
            lte: now
          }
        },
        orderBy: { transactionDate: 'desc' },
        take: 50,
      });
      
      // If no recent transactions, get any transactions
      if (recentTransactions.length === 0) {
        recentTransactions = await prisma.transaction.findMany({
          where: { companyId },
          orderBy: { transactionDate: 'desc' },
          take: 20,
        });
      }
    } catch (e) {
      console.warn('Transaction lookup failed, using empty list:', e);
    }

    // Get recent documents (fail-soft)
    let recentDocuments: any[] = [];
    try {
      recentDocuments = await prisma.fileAsset.findMany({
        where: { companyId },
        orderBy: { uploadedAt: 'desc' },
        take: 50,
      });
    } catch (e) {
      console.warn('File assets lookup failed, using empty list:', e);
    }

    // Get journal entries to include in financial calculations (fail-soft)
    let journalEntries: any[] = [];
    try {
      // CASE-INSENSITIVE status filtering - handle all possible status variations
      journalEntries = await prisma.journalEntry.findMany({
        where: { 
          companyId,
          // Case-insensitive status check for posted entries
          status: {
            in: ['posted', 'POSTED', 'Posted', 'APPROVED', 'approved', 'Approved']
          },
          // Use broader date range to capture more data
          date: {
            gte: last30Days,
            lte: now
          }
        },
        include: {
          lines: {
            include: {
              account: {
                include: {
                  type: true
                }
              }
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 100,
      });
    } catch (e) {
      console.warn('Journal entries lookup failed, using empty list:', e);
    }

    // COMPREHENSIVE FINANCIAL CALCULATION - Include ALL data sources
    // This matches the senior-level approach used in dashboard calculations
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    try {
      // STEP 1: Get revenue from invoices (primary revenue source) - BROADER DATE RANGE
      const invoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          companyId,
          issueDate: {
            gte: last30Days,
            lte: now
          }
        },
        select: { totalAmount: true, status: true, issueDate: true, invoiceNumber: true }
      });
      
      const invoiceRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
      totalRevenue += invoiceRevenue;
      
      // STEP 2: Get expenses from expense table - BROADER DATE RANGE
      const expenses = await prisma.expense.findMany({
        where: {
          tenantId,
          companyId,
          expenseDate: {
            gte: last30Days,
            lte: now
          }
        },
        select: { amount: true, expenseDate: true, description: true }
      });
      
      const directExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      totalExpenses += directExpenses;
      
      // STEP 3: Add revenue/expenses from journal entries (posted only)
      for (const entry of journalEntries) {
        for (const line of entry.lines) {
          const accountCode = line.account?.code || '';
          const debit = Number(line.debit) || 0;
          const credit = Number(line.credit) || 0;
          
          // Revenue accounts (4000-4999): credits increase revenue
          if (accountCode.startsWith('4')) {
            totalRevenue += credit;
            totalRevenue -= debit; // Debits decrease revenue
          }
          
          // Expense accounts (5000-9999): debits increase expenses
          if (accountCode.match(/^[5-9]/)) {
            totalExpenses += debit;
            totalExpenses -= credit; // Credits decrease expenses
          }
        }
      }
      
      // STEP 4: Add transaction data as fallback/additional source
      const transactionRevenue = recentTransactions
        .filter(t => t.transactionType === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const transactionExpenses = recentTransactions
        .filter(t => t.transactionType === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      totalRevenue += transactionRevenue;
      totalExpenses += transactionExpenses;
      
      
    } catch (financialCalcError) {
      // Fallback to transaction-only calculation
      totalRevenue = recentTransactions
        .filter(t => t.transactionType === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      totalExpenses = recentTransactions
        .filter(t => t.transactionType === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    }

    const averageTransactionAmount = recentTransactions.length > 0 
      ? recentTransactions.reduce((sum, t) => sum + Number(t.amount), 0) / recentTransactions.length
      : 0;

    // Calculate total transaction volume (transactions + journal entries)
    const totalTransactionVolume = recentTransactions.length + journalEntries.length;

    // Build financial context with detailed transaction data
    const financialContext = {
      currentPeriod: new Date().toISOString().slice(0, 7), // YYYY-MM
      fiscalYear: new Date().getFullYear().toString(),
      currency: company?.currency || 'USD',
      accountingStandards: 'GAAP',
      businessType: company?.businessType || 'General',
      revenueRange: totalRevenue > 1000000 ? '1M+' : totalRevenue > 100000 ? '100K-1M' : '<100K',
      transactionVolume: totalTransactionVolume,
      keyMetrics: {
        totalRevenue,
        totalExpenses,
        averageTransactionAmount,
        profitMargin: totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue : 0
      },
      recentTrends: [], // Would be calculated from historical data
      // Add detailed transaction data for AI analysis
      transactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.transactionType,
        amount: Number(t.amount),
        currency: t.currency,
        date: t.transactionDate,
        status: t.status
      })),
      expenseTransactions: recentTransactions
        .filter(t => t.transactionType === 'expense')
        .map(t => ({
          id: t.id,
          amount: Number(t.amount),
          currency: t.currency,
          date: t.transactionDate,
          status: t.status
        })),
      revenueTransactions: recentTransactions
        .filter(t => t.transactionType === 'income')
        .map(t => ({
          id: t.id,
          amount: Number(t.amount),
          currency: t.currency,
          date: t.transactionDate,
          status: t.status
        }))
    };

    // Build document context
    const documentContext = {
      recentDocuments: recentDocuments.map(doc => ({
        type: doc.category || 'document',
        date: doc.createdAt,
        amount: doc.metadata ? JSON.parse(doc.metadata).amount : undefined,
        vendor: doc.metadata ? JSON.parse(doc.metadata).vendor : undefined,
        status: 'processed'
      })),
      pendingApprovals: 0, // Would be calculated from actual data
      overdueDocuments: 0, // Would be calculated from actual data
      documentPatterns: [] // Would be analyzed from document data
    };

    // Build regulatory context
    const regulatoryContext = {
      jurisdiction: company?.country || 'US',
      complianceRequirements: ['Tax Filing', 'Financial Reporting'],
      upcomingDeadlines: [], // Would be calculated from compliance calendar
      recentChanges: [] // Would be fetched from regulatory updates
    };

    return {
      userId,
      companyId,
      tenantId,
      sessionId: sessionId || `session_${Date.now()}`,
      conversationHistory: [],
      userPreferences: {
        language: 'en',
        currency: company?.currency || 'USD',
        dateFormat: 'MM/DD/YYYY',
        autoConfirm: false,
        confidenceThreshold: 0.8,
        preferredCategories: [],
        excludedCategories: [],
        notificationPreferences: {
          email: true,
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
        },
      financialContext,
      documentContext,
      regulatoryContext
    };
  } catch (error) {
    console.error('Error building Llama conversation context:', error);
    throw error;
  }
}

export default router;
