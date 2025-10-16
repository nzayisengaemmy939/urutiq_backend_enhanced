import { Router } from 'express';
import { oauth2Routes, oauth2Middleware, OAUTH_SCOPES } from './auth/oauth2.js';
import { ApiKeyService } from './services/api-key.service.js';
import { PerformanceMonitoringService } from './services/performance-monitoring.service.js';
import { prisma } from './prisma.js';
import { authMiddleware, requireRoles } from './auth.js';
import { asyncHandler, ApiError } from './errors.js';
import { TenantRequest } from './tenant.js';
import { z } from 'zod';

const router = Router();

// OAuth 2.1 Routes
router.get('/oauth2/authorize', oauth2Routes.authorize);
router.post('/oauth2/token', oauth2Routes.token);
router.post('/oauth2/revoke', oauth2Routes.revoke);

// OAuth 2.1 Client Management
const createClientSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  redirectUris: z.array(z.string().url()),
  scopes: z.array(z.string())
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  redirectUris: z.array(z.string().url()).optional(),
  scopes: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});

// Create OAuth client
router.post('/oauth2/clients', 
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { name, description, redirectUris, scopes } = createClientSchema.parse(req.body);
    
    // Generate client credentials
    const clientId = `uruti_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = crypto.randomBytes(32).toString('hex');
    
    // Validate scopes
    const validScopes = Object.values(OAUTH_SCOPES);
    const invalidScopes = scopes.filter(s => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      throw new ApiError(400, 'INVALID_SCOPES', `Invalid scopes: ${invalidScopes.join(', ')}`);
    }
    
    const client = await prisma.oAuthClient.create({
      data: {
        tenantId: req.tenantId!,
        clientId,
        clientSecret,
        name,
        description,
        redirectUris: JSON.stringify(redirectUris),
        scopes: JSON.stringify(scopes)
      }
    });
    
    res.status(201).json({
      id: client.id,
      clientId: client.clientId,
      clientSecret: client.clientSecret, // Only returned on creation
      name: client.name,
      description: client.description,
      redirectUris: JSON.parse(client.redirectUris || '[]'),
      scopes: JSON.parse(client.scopes || '[]'),
      isActive: client.isActive,
      createdAt: client.createdAt
    });
  })
);

// Get OAuth clients
router.get('/oauth2/clients',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin']),
  asyncHandler(async (req: TenantRequest, res) => {
    const clients = await prisma.oAuthClient.findMany({
      where: { tenantId: req.tenantId },
      select: {
        id: true,
        clientId: true,
        name: true,
        description: true,
        redirectUris: true,
        scopes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(clients);
  })
);

// Update OAuth client
router.put('/oauth2/clients/:id',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const updates = updateClientSchema.parse(req.body);
    
    // Validate scopes if provided
    if (updates.scopes) {
      const validScopes = Object.values(OAUTH_SCOPES);
      const invalidScopes = updates.scopes.filter(s => !validScopes.includes(s));
      if (invalidScopes.length > 0) {
        throw new ApiError(400, 'INVALID_SCOPES', `Invalid scopes: ${invalidScopes.join(', ')}`);
      }
      updates.scopes = JSON.stringify(updates.scopes);
    }
    
    const client = await prisma.oAuthClient.update({
      where: { id, tenantId: req.tenantId! },
      data: updates
    });
    
    res.json({
      id: client.id,
      clientId: client.clientId,
      name: client.name,
      description: client.description,
      redirectUris: JSON.parse(client.redirectUris || '[]'),
      scopes: JSON.parse(client.scopes || '[]'),
      isActive: client.isActive,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    });
  })
);

// Delete OAuth client
router.delete('/oauth2/clients/:id',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    await prisma.oAuthClient.delete({
      where: { id, tenantId: req.tenantId! }
    });
    
    res.status(204).end();
  })
);

// API Key Management Routes
const createApiKeySchema = z.object({
  companyId: z.string(),
  name: z.string().min(1),
  permissions: z.array(z.string()),
  expiresAt: z.string().datetime().optional()
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional()
});

// Create API key
router.post('/api-keys',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, name, permissions, expiresAt } = createApiKeySchema.parse(req.body);
    
    const apiKey = await ApiKeyService.createApiKey({
      tenantId: req.tenantId!,
      companyId,
      name,
      permissions,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdById: req.user!.id
    });
    
    res.status(201).json(apiKey);
  })
);

// Get API keys
router.get('/api-keys',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, page = 1, limit = 50 } = req.query;
    
    if (!companyId) {
      throw new ApiError(400, 'COMPANY_ID_REQUIRED', 'Company ID is required');
    }
    
    const result = await ApiKeyService.getApiKeys(
      req.tenantId!,
      companyId as string,
      parseInt(page as string),
      parseInt(limit as string)
    );
    
    res.json(result);
  })
);

// Update API key
router.put('/api-keys/:id',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const updates = updateApiKeySchema.parse(req.body);
    
    const apiKey = await ApiKeyService.updateApiKey(id, req.tenantId!, {
      ...updates,
      expiresAt: updates.expiresAt ? new Date(updates.expiresAt) : undefined
    });
    
    res.json(apiKey);
  })
);

// Delete API key
router.delete('/api-keys/:id',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    await ApiKeyService.deleteApiKey(id, req.tenantId!);
    
    res.status(204).end();
  })
);

// Get API key permissions
router.get('/api-keys/permissions',
  asyncHandler(async (req: TenantRequest, res) => {
    const permissions = ApiKeyService.getValidPermissions();
    const permissionGroups = ApiKeyService.getPermissionGroups();
    
    res.json({
      permissions,
      permissionGroups
    });
  })
);

// Performance Monitoring Routes
// Get API usage analytics
router.get('/analytics/api-usage',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { 
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      endDate = new Date().toISOString(),
      companyId 
    } = req.query;
    
    const analytics = await PerformanceMonitoringService.getApiUsageAnalytics(
      req.tenantId!,
      new Date(startDate as string),
      new Date(endDate as string),
      companyId as string
    );
    
    res.json(analytics);
  })
);

// Get performance metrics
router.get('/analytics/performance',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { 
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      companyId 
    } = req.query;
    
    const metrics = await PerformanceMonitoringService.getPerformanceMetrics(
      req.tenantId!,
      new Date(startDate as string),
      new Date(endDate as string),
      companyId as string
    );
    
    res.json(metrics);
  })
);

// Get custom metrics
router.get('/analytics/metrics/:metricName',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { metricName } = req.params;
    const { 
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;
    
    const metrics = await PerformanceMonitoringService.getCustomMetrics(
      req.tenantId!,
      metricName,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    res.json(metrics);
  })
);

// Record custom metric
router.post('/analytics/metrics',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin']),
  asyncHandler(async (req: TenantRequest, res) => {
    const { metricName, metricValue, metricUnit, tags } = req.body;
    
    await PerformanceMonitoringService.recordMetric(
      req.tenantId!,
      metricName,
      metricValue,
      metricUnit,
      tags
    );
    
    res.status(201).json({ success: true });
  })
);

// OAuth 2.1 Scopes endpoint
router.get('/oauth2/scopes',
  asyncHandler(async (req: TenantRequest, res) => {
    res.json({
      scopes: OAUTH_SCOPES,
      description: {
        [OAUTH_SCOPES.READ_ACCOUNTS]: 'Read access to chart of accounts',
        [OAUTH_SCOPES.WRITE_ACCOUNTS]: 'Write access to chart of accounts',
        [OAUTH_SCOPES.READ_TRANSACTIONS]: 'Read access to transactions and journal entries',
        [OAUTH_SCOPES.WRITE_TRANSACTIONS]: 'Write access to transactions and journal entries',
        [OAUTH_SCOPES.READ_REPORTS]: 'Read access to financial reports',
        [OAUTH_SCOPES.WRITE_REPORTS]: 'Write access to financial reports',
        [OAUTH_SCOPES.READ_AI_INSIGHTS]: 'Read access to AI insights and analytics',
        [OAUTH_SCOPES.WRITE_AI_INSIGHTS]: 'Write access to AI insights and analytics',
        [OAUTH_SCOPES.READ_BANKING]: 'Read access to banking data',
        [OAUTH_SCOPES.WRITE_BANKING]: 'Write access to banking data',
        [OAUTH_SCOPES.READ_INVENTORY]: 'Read access to inventory data',
        [OAUTH_SCOPES.WRITE_INVENTORY]: 'Write access to inventory data',
        [OAUTH_SCOPES.ADMIN]: 'Administrative access to all resources',
        [OAUTH_SCOPES.ALL]: 'Access to all resources'
      }
    });
  })
);

export default router;
