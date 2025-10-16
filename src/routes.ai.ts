import type { Router } from 'express';
import { prisma } from './prisma';
import { TenantRequest } from './tenant';
import { aiSchemas, validateBody } from './validate';
import { asyncHandler } from './errors';
import { authMiddleware } from './auth';
import type { Response } from 'express';
import { 
  detectAnomalies, 
  generateInsights, 
  generatePredictions, 
  generateRecommendations 
} from './ai';

export function mountAiRoutes(router: Router) {
  // Apply authentication middleware to all AI routes
  router.use(authMiddleware(process.env.JWT_SECRET || 'dev-secret'));
  
  // Anomalies
  router.get('/ai/anomalies', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.query.companyId || '');
    const status = (req.query.status as string) || undefined;
    const rows = await prisma.aiAnomalyLog.findMany({ 
      where: { tenantId: req.tenantId, companyId, status },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(rows);
  }));

  router.post('/ai/anomalies', validateBody(aiSchemas.anomalyCreate), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, transactionId, anomalyType, confidenceScore } = req.body as any;
    const created = await prisma.aiAnomalyLog.create({ 
      data: { tenantId: req.tenantId!, companyId, transactionId, anomalyType, confidenceScore } 
    });
    res.status(201).json(created);
  }));

  router.patch('/ai/anomalies/:id/status', validateBody(aiSchemas.anomalyUpdateStatus), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params; 
    const { status } = req.body as any;
    const updated = await prisma.aiAnomalyLog.update({ where: { id }, data: { status } });
    res.json(updated);
  }));

  // Auto-detect anomalies for a company
  router.post('/ai/anomalies/detect', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.body?.companyId || req.query.companyId || '');
    if (!companyId) return res.status(400).json({ error: 'company_required' });
    
    const anomalies = await detectAnomalies(req.tenantId!, companyId);
    res.json({ detected: anomalies.length, anomalies });
  }));

  // AI Forecast endpoint
  router.get('/ai/forecast', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.query.companyId || '');
    const period = String(req.query.period || '30d');
    const horizon = String(req.query.horizon || '3m');
    const category = String(req.query.category || '');
    const location = String(req.query.location || '');
    
    if (!companyId) return res.status(400).json({ error: 'company_required' });
    
    // Mock forecast data for now
    const forecasts = [
      {
        productId: 'prod-1',
        productName: 'Sample Product 1',
        sku: 'SKU-001',
        currentStock: 150,
        forecastedDemand: [
          {
            period: 'Next Month',
            predictedDemand: 120,
            confidence: 0.85,
            trend: 'stable',
            seasonality: 1.0
          },
          {
            period: 'Next Quarter',
            predictedDemand: 350,
            confidence: 0.78,
            trend: 'increasing',
            seasonality: 1.1
          }
        ],
        recommendations: {
          suggestedReorderQuantity: 200,
          suggestedReorderDate: '2024-02-15',
          riskLevel: 'medium',
          reasoning: 'Based on historical data and seasonal trends, recommend reordering 200 units by February 15th to maintain optimal stock levels.'
        }
      }
    ];
    
    res.json(forecasts);
  }));

  // Insights
  router.get('/ai/insights', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.query.companyId || '');
    const category = (req.query.category as string) || undefined;
    const priority = (req.query.priority as string) || undefined;
    
    const where: any = { tenantId: req.tenantId, companyId };
    if (category) where.category = category;
    if (priority) where.priority = priority;
    
    const rows = await prisma.aiInsight.findMany({ 
      where, 
      orderBy: { generatedAt: 'desc' },
      take: 100
    });
    res.json(rows);
  }));

  router.post('/ai/insights', validateBody(aiSchemas.insightCreate), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, category, insightText, priority } = req.body as any;
    const created = await prisma.aiInsight.create({ 
      data: { tenantId: req.tenantId!, companyId, category, insightText, priority: priority || 'medium' } 
    });
    res.status(201).json(created);
  }));

  // Auto-generate insights for a company
  router.post('/ai/insights/generate', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.body?.companyId || req.query.companyId || '');
    if (!companyId) return res.status(400).json({ error: 'company_required' });
    
    const insights = await generateInsights(req.tenantId!, companyId);
    res.json({ generated: insights.length, insights });
  }));

  // Predictions
  router.get('/ai/predictions', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.query.companyId || '');
    const type = (req.query.type as string) || undefined;
    const rows = await prisma.aiPrediction.findMany({ 
      where: { tenantId: req.tenantId, companyId, predictionType: type }, 
      orderBy: { predictionDate: 'asc' },
      take: 100
    });
    res.json(rows);
  }));

  router.post('/ai/predictions', validateBody(aiSchemas.predictionCreate), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, predictionType, predictedValue, predictionDate, confidenceLow, confidenceHigh } = req.body as any;
    const created = await prisma.aiPrediction.create({ 
      data: { 
        tenantId: req.tenantId!, 
        companyId, 
        predictionType, 
        predictedValue, 
        predictionDate: new Date(predictionDate), 
        confidenceLow, 
        confidenceHigh 
      } 
    });
    res.status(201).json(created);
  }));

  // Auto-generate predictions for a company
  router.post('/ai/predictions/generate', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.body?.companyId || req.query.companyId || '');
    const type = String(req.body?.type || req.query.type || 'revenue');
    if (!companyId) return res.status(400).json({ error: 'company_required' });
    
    const predictions = await generatePredictions(req.tenantId!, companyId, type);
    res.json({ generated: predictions.length, predictions });
  }));

  // Recommendations
  router.get('/ai/recommendations', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.query.companyId || '');
    const status = (req.query.status as string) || undefined;
    const type = (req.query.type as string) || undefined;
    
    const where: any = { tenantId: req.tenantId, companyId };
    if (status) where.status = status;
    if (type) where.recommendationType = type;
    
    const rows = await prisma.aiRecommendation.findMany({ 
      where, 
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(rows);
  }));

  router.post('/ai/recommendations', validateBody(aiSchemas.recommendationCreate), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, recommendationType, recommendationText } = req.body as any;
    const created = await prisma.aiRecommendation.create({ 
      data: { tenantId: req.tenantId!, companyId, recommendationType, recommendationText } 
    });
    res.status(201).json(created);
  }));

  router.patch('/ai/recommendations/:id/status', validateBody(aiSchemas.recommendationUpdateStatus), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params; 
    const { status } = req.body as any;
    const updated = await prisma.aiRecommendation.update({ where: { id }, data: { status } });
    res.json(updated);
  }));

  // Auto-generate recommendations for a company
  router.post('/ai/recommendations/generate', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.body?.companyId || req.query.companyId || '');
    if (!companyId) return res.status(400).json({ error: 'company_required' });
    
    const recommendations = await generateRecommendations(req.tenantId!, companyId);
    res.json({ generated: recommendations.length, recommendations });
  }));

  // Audit trail
  router.get('/ai/audit-trails', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.query.companyId || '');
    const userId = (req.query.userId as string) || undefined;
    
    const where: any = { tenantId: req.tenantId, companyId };
    if (userId) where.userId = userId;
    
    const rows = await prisma.aiAuditTrail.findMany({ 
      where, 
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json(rows);
  }));

  router.post('/ai/audit-trails', validateBody(aiSchemas.auditAppend), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, userId, action, aiValidationResult } = req.body as any;
    const created = await prisma.aiAuditTrail.create({ 
      data: { tenantId: req.tenantId!, companyId, userId, action, aiValidationResult } 
    });
    res.status(201).json(created);
  }));

  // User feedback endpoints
  router.post('/ai/feedback/anomaly/:id', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { verdict, userId } = req.body as any; // verdict: 'true_positive' | 'false_positive'
    const anomaly = await prisma.aiAnomalyLog.findUnique({ where: { id } });
    if (!anomaly) return res.status(404).json({ error: 'not_found' });

    const newStatus = verdict === 'true_positive' ? 'resolved' : (verdict === 'false_positive' ? 'false_positive' : anomaly.status);
    const updated = await prisma.aiAnomalyLog.update({ where: { id }, data: { status: newStatus } });
    await prisma.aiAuditTrail.create({ data: { tenantId: req.tenantId!, companyId: anomaly.companyId, userId: userId || null, action: `anomaly_feedback:${verdict}`, aiValidationResult: JSON.stringify({ anomalyId: id, verdict }) } });
    res.json(updated);
  }));

  router.post('/ai/feedback/insight/:id', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { action, userId } = req.body as any; // action: 'acknowledge' | 'dismiss'
    const insight = await prisma.aiInsight.findUnique({ where: { id } });
    if (!insight) return res.status(404).json({ error: 'not_found' });
    await prisma.aiAuditTrail.create({ data: { tenantId: req.tenantId!, companyId: insight.companyId, userId: userId || null, action: `insight_feedback:${action}`, aiValidationResult: JSON.stringify({ insightId: id, action }) } });
    res.json({ ok: true });
  }));

  // Generate all AI insights for a company
  router.post('/ai/generate/all', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.body?.companyId || req.query.companyId || '');
    if (!companyId) return res.status(400).json({ error: 'company_required' });
    
    const [anomalies, insights, predictions, recommendations] = await Promise.all([
      detectAnomalies(req.tenantId!, companyId),
      generateInsights(req.tenantId!, companyId),
      generatePredictions(req.tenantId!, companyId, 'revenue'),
      generateRecommendations(req.tenantId!, companyId)
    ]);
    
    res.json({
      anomalies: { detected: anomalies.length, data: anomalies },
      insights: { generated: insights.length, data: insights },
      predictions: { generated: predictions.length, data: predictions },
      recommendations: { generated: recommendations.length, data: recommendations }
    });
  }));

  // AI health check and statistics
  router.get('/ai/health', asyncHandler(async (req: TenantRequest, res: Response) => {
    const companyId = String(req.query.companyId || '');
    const where = companyId ? { tenantId: req.tenantId, companyId } : { tenantId: req.tenantId };
    
    const [anomalies, insights, predictions, recommendations, auditTrails] = await Promise.all([
      prisma.aiAnomalyLog.count({ where }),
      prisma.aiInsight.count({ where }),
      prisma.aiPrediction.count({ where }),
      prisma.aiRecommendation.count({ where }),
      prisma.aiAuditTrail.count({ where })
    ]);
    
    res.json({
      totalRecords: { anomalies, insights, predictions, recommendations, auditTrails },
      lastUpdated: new Date().toISOString(),
      status: 'healthy'
    });
  }));

  // Get AI insights for a company
  router.get('/insights', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    try {
      const insights = await prisma.aiInsight.findMany({
        where: { 
          tenantId: req.tenantId!, 
          companyId: companyId as string 
        },
        orderBy: { generatedAt: 'desc' },
        take: 20
      });
      
      res.json({
        success: true,
        data: insights,
        count: insights.length
      });
    } catch (error: any) {
      console.error('Error fetching AI insights:', error);
      res.status(500).json({ error: 'Failed to fetch AI insights' });
    }
  }));
}

