import type { Router } from 'express';
import { prisma } from './prisma';
import { TenantRequest } from './tenant';
import { asyncHandler } from './errors';
import type { Response } from 'express';
import { enhancedAIService } from './ai-enhanced';
import { config } from './config';

export function mountEnhancedAIRoutes(router: Router) {
  // 1. Transaction Categorization (AI Bookkeeping)
  router.post('/ai/categorize/transaction', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, description, amount, transactionType } = req.body;
    
    if (!companyId || !description || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const categorization = await enhancedAIService.categorizeTransaction(
      req.tenantId!,
      companyId,
      description,
      parseFloat(amount),
      transactionType || 'expense'
    );

    res.json({
      success: true,
      categorization,
      message: 'Transaction categorized successfully'
    });
  }));

  // Batch transaction categorization
  router.post('/ai/categorize/batch', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, transactions } = req.body;
    
    if (!companyId || !transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const categorizations = [];
    
    for (const transaction of transactions) {
      const categorization = await enhancedAIService.categorizeTransaction(
        req.tenantId!,
        companyId,
        transaction.description,
        parseFloat(transaction.amount),
        transaction.transactionType || 'expense'
      );
      categorization.transactionId = transaction.id;
      categorizations.push(categorization);
    }

    res.json({
      success: true,
      categorizations,
      processed: categorizations.length,
      message: 'Batch categorization completed'
    });
  }));

  // 2. Enhanced Anomaly Detection
  router.post('/ai/anomalies/enhanced', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, transactions } = req.body;
    
    if (!companyId || !transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const anomalies = await enhancedAIService.detectAnomaliesEnhanced(
      req.tenantId!,
      companyId,
      transactions
    );

    res.json({
      success: true,
      anomalies,
      detected: anomalies.length,
      message: 'Anomaly detection completed'
    });
  }));

  // 3. Natural Language Reports
  router.post('/ai/reports/natural-language', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, query, dateRange } = req.body;
    
    if (!companyId || !query) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const report = await enhancedAIService.generateNaturalLanguageReport({
      query,
      companyId,
      dateRange: dateRange ? {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      } : undefined
    });

    res.json({
      success: true,
      report,
      message: 'Natural language report generated'
    });
  }));

  // Predefined report templates
  router.get('/ai/reports/templates', asyncHandler(async (req: TenantRequest, res: Response) => {
    const templates = [
      {
        id: 'cash-flow',
        name: 'Cash Flow Report',
        description: 'Show me a cash flow report for [period]',
        examples: [
          'Show me a cash flow report for August 2025',
          'What is my cash flow for Q2 2025?',
          'Generate cash flow analysis for this month'
        ]
      },
      {
        id: 'revenue-analysis',
        name: 'Revenue Analysis',
        description: 'Show me revenue trends for [period]',
        examples: [
          'Show me revenue trends for the last 6 months',
          'What is my revenue breakdown by customer?',
          'Compare revenue between Q1 and Q2 2025'
        ]
      },
      {
        id: 'expense-breakdown',
        name: 'Expense Breakdown',
        description: 'Show me expense breakdown for [period]',
        examples: [
          'Show me expense breakdown for this quarter',
          'What are my top 10 expenses this month?',
          'Compare expenses between departments'
        ]
      },
      {
        id: 'anomaly-report',
        name: 'Anomaly Report',
        description: 'Show me unusual transactions for [period]',
        examples: [
          'Show me unusual transactions for this month',
          'Find transactions over $1000',
          'Identify potential duplicate payments'
        ]
      }
    ];

    res.json({
      success: true,
      templates,
      message: 'Report templates retrieved'
    });
  }));

  // 4. Smart Insights & Forecasting
  router.post('/ai/insights/smart', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, historicalData } = req.body;
    
    if (!companyId || !historicalData || !Array.isArray(historicalData)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const insights = await enhancedAIService.generateSmartInsights(
      req.tenantId!,
      companyId,
      historicalData
    );

    res.json({
      success: true,
      insights,
      generated: insights.length,
      message: 'Smart insights generated'
    });
  }));

  // Cash flow forecasting
  router.post('/ai/forecast/cash-flow', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, historicalData, periods = 3 } = req.body;
    
    if (!companyId || !historicalData || !Array.isArray(historicalData)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get historical cash flow data from database if not provided
    let cashFlowData = historicalData;
    if (!cashFlowData || cashFlowData.length === 0) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const transactions = await prisma.transaction.findMany({
        where: { 
          tenantId: req.tenantId!, 
          companyId,
          transactionDate: { gte: oneYearAgo }
        },
        orderBy: { transactionDate: 'asc' }
      });

      // Calculate monthly cash flow
      const monthlyCashFlow = new Map<string, number>();
      transactions.forEach(t => {
        const month = t.transactionDate.toISOString().slice(0, 7);
        const amount = Number(t.amount);
        const current = monthlyCashFlow.get(month) || 0;
        
        if (t.transactionType === 'invoice' || t.transactionType === 'income') {
          monthlyCashFlow.set(month, current + amount);
        } else if (t.transactionType === 'bill' || t.transactionType === 'expense') {
          monthlyCashFlow.set(month, current - amount);
        }
      });

      cashFlowData = Array.from(monthlyCashFlow.entries()).map(([date, cashFlow]) => ({
        date,
        cashFlow
      }));
    }

    const insights = await enhancedAIService.generateSmartInsights(
      req.tenantId!,
      companyId,
      cashFlowData
    );

    // Extract cash flow predictions from insights
    const cashFlowInsights = insights.filter(insight => insight.type === 'cash_flow');

    res.json({
      success: true,
      forecast: {
        historicalData: cashFlowData,
        predictions: cashFlowInsights,
        periods,
        generatedAt: new Date()
      },
      message: 'Cash flow forecast generated'
    });
  }));

  // 5. AI Assistant for Accountants
  router.post('/ai/assistant/query', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, query, context } = req.body;
    
    if (!companyId || !query) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await enhancedAIService.processAIAssistantQuery(
      req.tenantId!,
      companyId,
      query,
      context
    );

    res.json({
      success: true,
      result,
      message: 'AI assistant query processed'
    });
  }));

  // AI Assistant conversation history
  router.get('/ai/assistant/history', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.query.companyId || '');
    const limit = parseInt(req.query.limit as string) || 50;
    
    const where: any = { tenantId: req.tenantId };
    if (companyId) where.companyId = companyId;

    const history = await prisma.aiAuditTrail.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        aiValidationResult: true,
        timestamp: true,
        userId: true
      }
    });

    res.json({
      success: true,
      history,
      count: history.length,
      message: 'AI assistant history retrieved'
    });
  }));

  // 6. Batch Processing
  router.post('/ai/process/batch', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, transactions } = req.body;
    
    if (!companyId || !transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await enhancedAIService.processBatchTransactions(
      req.tenantId!,
      companyId,
      transactions
    );

    res.json({
      success: true,
      result,
      processed: {
        categorizations: result.categorizations.length,
        anomalies: result.anomalies.length,
        insights: result.insights.length
      },
      message: 'Batch processing completed'
    });
  }));

  // 7. AI Health Check
  router.get('/ai/health/enhanced', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.query.companyId || '');
    
    try {
      // Test Ollama connection
      const testResponse = await enhancedAIService['callOllama']('Test connection');
      const ollamaStatus = testResponse ? 'connected' : 'disconnected';
      
      // Get AI statistics
      const where = companyId ? { tenantId: req.tenantId, companyId } : { tenantId: req.tenantId };
      
      const [anomalies, insights, predictions, recommendations, auditTrails] = await Promise.all([
        prisma.aiAnomalyLog.count({ where }),
        prisma.aiInsight.count({ where }),
        prisma.aiPrediction.count({ where }),
        prisma.aiRecommendation.count({ where }),
        prisma.aiAuditTrail.count({ where })
      ]);

      res.json({
        success: true,
        status: 'healthy',
        ollama: {
          status: ollamaStatus,
          model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
          baseUrl: config.ai.ollamaBaseUrl
        },
        statistics: {
          anomalies,
          insights,
          predictions,
          recommendations,
          auditTrails
        },
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString()
      });
    }
  }));

  // 8. AI Learning Feedback
  router.post('/ai/feedback/learning', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, insightId, feedback, userId } = req.body;
    
    if (!companyId || !insightId || !feedback) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Log the feedback for AI learning
    await prisma.aiAuditTrail.create({
      data: {
        tenantId: req.tenantId!,
        companyId,
        userId: userId || null,
        action: 'ai_learning_feedback',
        aiValidationResult: JSON.stringify({
          insightId,
          feedback,
          timestamp: new Date()
        })
      }
    });

    res.json({
      success: true,
      message: 'AI learning feedback recorded'
    });
  }));

  // 9. AI Configuration
  router.get('/ai/config', asyncHandler(async (req: TenantRequest, res: Response) => {
    const aiConfig = {
      ollama: {
        baseUrl: config.ai.ollamaBaseUrl,
        model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
        temperature: 0.3,
        maxTokens: 2048
      },
      features: {
        transactionCategorization: true,
        anomalyDetection: true,
        naturalLanguageReports: true,
        smartInsights: true,
        aiAssistant: true,
        batchProcessing: true
      },
      thresholds: {
        anomalyConfidence: 0.7,
        categorizationConfidence: 0.6,
        insightConfidence: 0.8
      }
    };

    res.json({
      success: true,
      config: aiConfig,
      message: 'AI configuration retrieved'
    });
  }));

  // 10. AI Model Management
  router.post('/ai/models/switch', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { model } = req.body;
    
    if (!model) {
      return res.status(400).json({ error: 'Model name required' });
    }

    // Update environment variable (in production, this would be stored in database)
    process.env.OLLAMA_MODEL = model;

    res.json({
      success: true,
      model,
      message: `Switched to model: ${model}`
    });
  }));
}
