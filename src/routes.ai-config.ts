import type { Router } from 'express';
import { prisma } from './prisma';
import { TenantRequest } from './tenant';
import { asyncHandler } from './errors';
import type { Response } from 'express';
import { 
  aiConfigurationService, 
  DEFAULT_INDUSTRY_CONFIGS,
  DEFAULT_AI_CONFIG,
  DEFAULT_BEHAVIOR_CONFIG,
  type AIPromptConfig,
  type AIBehaviorConfig,
  type AICategoryConfig
} from './ai-config.js';

export function mountAIConfigRoutes(router: Router) {
  // Get all available industry configurations
  router.get('/ai/config/industries', asyncHandler(async (req: TenantRequest, res: Response) => {
    const industries = DEFAULT_INDUSTRY_CONFIGS.map(config => ({
      name: config.name,
      code: config.code,
      description: config.description,
      defaultCategories: config.defaultCategories.length
    }));

    res.json({
      success: true,
      data: industries
    });
  }));

  // Get current AI configuration for a company
  router.get('/ai/config/:companyId', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.params;
    const { tenantId } = req;

    const [prompts, behavior, categories] = await Promise.all([
      aiConfigurationService.getCustomizedPrompts(tenantId, companyId),
      aiConfigurationService.getCustomizedBehavior(tenantId, companyId),
      aiConfigurationService.getCustomizedCategories(tenantId, companyId)
    ]);

    res.json({
      success: true,
      data: {
        prompts,
        behavior,
        categories
      }
    });
  }));

  // Update AI prompts configuration
  router.put('/ai/config/:companyId/prompts', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.params;
    const { tenantId } = req;
    const prompts: Partial<AIPromptConfig> = req.body;

    await aiConfigurationService.updatePromptConfiguration(tenantId, companyId, prompts);

    res.json({
      success: true,
      message: 'AI prompts configuration updated successfully'
    });
  }));

  // Update AI behavior configuration
  router.put('/ai/config/:companyId/behavior', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.params;
    const { tenantId } = req;
    const behavior: Partial<AIBehaviorConfig> = req.body;

    await aiConfigurationService.updateBehaviorConfiguration(tenantId, companyId, behavior);

    res.json({
      success: true,
      message: 'AI behavior configuration updated successfully'
    });
  }));

  // Update AI categories configuration
  router.put('/ai/config/:companyId/categories', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.params;
    const { tenantId } = req;
    const categories: Partial<AICategoryConfig> = req.body;

    await aiConfigurationService.updateCategoryConfiguration(tenantId, companyId, categories);

    res.json({
      success: true,
      message: 'AI categories configuration updated successfully'
    });
  }));

  // Apply industry-specific configuration
  router.post('/ai/config/:companyId/industry/:industryCode', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId, industryCode } = req.params;
    const { tenantId } = req;

    await aiConfigurationService.applyIndustryConfiguration(tenantId, companyId, industryCode);

    res.json({
      success: true,
      message: `Industry configuration for ${industryCode} applied successfully`
    });
  }));

  // Reset to default configuration
  router.post('/ai/config/:companyId/reset', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.params;
    const { tenantId } = req;
    const { configType } = req.body; // 'prompts', 'behavior', 'categories', or 'all'

    if (configType === 'all' || configType === 'prompts') {
      await aiConfigurationService.updatePromptConfiguration(tenantId, companyId, DEFAULT_AI_CONFIG);
    }

    if (configType === 'all' || configType === 'behavior') {
      await aiConfigurationService.updateBehaviorConfiguration(tenantId, companyId, DEFAULT_BEHAVIOR_CONFIG);
    }

    if (configType === 'all' || configType === 'categories') {
      await aiConfigurationService.updateCategoryConfiguration(tenantId, companyId, {
        expenseCategories: [],
        revenueCategories: [],
        assetCategories: [],
        liabilityCategories: [],
        industrySpecific: []
      });
    }

    res.json({
      success: true,
      message: `Configuration reset to defaults for ${configType}`
    });
  }));

  // Get default configurations
  router.get('/ai/config/defaults', asyncHandler(async (req: TenantRequest, res: Response) => {
    res.json({
      success: true,
      data: {
        prompts: DEFAULT_AI_CONFIG,
        behavior: DEFAULT_BEHAVIOR_CONFIG,
        industries: DEFAULT_INDUSTRY_CONFIGS
      }
    });
  }));

  // Test AI configuration with sample data
  router.post('/ai/config/:companyId/test', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.params;
    const { tenantId } = req;
    const { testType, sampleData } = req.body;

    const prompts = await aiConfigurationService.getCustomizedPrompts(tenantId, companyId);
    const behavior = await aiConfigurationService.getCustomizedBehavior(tenantId, companyId);

    let testResult;
    switch (testType) {
      case 'categorization':
        testResult = {
          prompt: prompts.transactionCategorization.userPromptTemplate
            .replace('{description}', sampleData.description || 'Sample transaction')
            .replace('{amount}', sampleData.amount || '100')
            .replace('{transactionType}', sampleData.transactionType || 'expense'),
          systemPrompt: prompts.transactionCategorization.systemPrompt,
          confidenceThreshold: behavior.confidenceThresholds.categorization
        };
        break;
      case 'anomaly':
        testResult = {
          prompt: prompts.anomalyDetection.duplicateAnalysisPrompt
            .replace('{transactions}', sampleData.transactions || 'Sample transaction data'),
          systemPrompt: prompts.anomalyDetection.systemPrompt,
          confidenceThreshold: behavior.confidenceThresholds.anomalyDetection
        };
        break;
      case 'reports':
        testResult = {
          prompt: prompts.naturalLanguageReports.sqlGenerationPrompt
            .replace('{query}', sampleData.query || 'Show me cash flow for this month'),
          systemPrompt: prompts.naturalLanguageReports.systemPrompt
        };
        break;
      default:
        throw new Error(`Unknown test type: ${testType}`);
    }

    res.json({
      success: true,
      data: testResult
    });
  }));

  // Get AI configuration history
  router.get('/ai/config/:companyId/history', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.params;
    const { tenantId } = req;

    const configs = await prisma.aIConfig.findMany({
      where: {
        tenantId,
        companyId,
        isActive: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: configs.map(config => ({
        id: config.id,
        configType: config.configType,
        updatedAt: config.updatedAt,
        isActive: config.isActive
      }))
    });
  }));

  // Export AI configuration
  router.get('/ai/config/:companyId/export', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.params;
    const { tenantId } = req;

    const [prompts, behavior, categories] = await Promise.all([
      aiConfigurationService.getCustomizedPrompts(tenantId, companyId),
      aiConfigurationService.getCustomizedBehavior(tenantId, companyId),
      aiConfigurationService.getCustomizedCategories(tenantId, companyId)
    ]);

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      companyId,
      tenantId,
      configuration: {
        prompts,
        behavior,
        categories
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ai-config-${companyId}-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  }));

  // Import AI configuration
  router.post('/ai/config/:companyId/import', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.params;
    const { tenantId } = req;
    const { configuration, overwrite = false } = req.body;

    if (configuration.prompts) {
      await aiConfigurationService.updatePromptConfiguration(tenantId, companyId, configuration.prompts);
    }

    if (configuration.behavior) {
      await aiConfigurationService.updateBehaviorConfiguration(tenantId, companyId, configuration.behavior);
    }

    if (configuration.categories) {
      await aiConfigurationService.updateCategoryConfiguration(tenantId, companyId, configuration.categories);
    }

    res.json({
      success: true,
      message: 'AI configuration imported successfully'
    });
  }));

  // Get AI configuration statistics
  router.get('/ai/config/:companyId/stats', asyncHandler(async (req: TenantRequest, res: Response) => {
    const { companyId } = req.params;
    const { tenantId } = req;

    const categories = await aiConfigurationService.getCustomizedCategories(tenantId, companyId);
    const behavior = await aiConfigurationService.getCustomizedBehavior(tenantId, companyId);

    const stats = {
      totalCategories: 
        categories.expenseCategories.length +
        categories.revenueCategories.length +
        categories.assetCategories.length +
        categories.liabilityCategories.length +
        categories.industrySpecific.flatMap(ic => ic.categories).length,
      activeCategories: 
        categories.expenseCategories.filter(c => c.isActive).length +
        categories.revenueCategories.filter(c => c.isActive).length +
        categories.assetCategories.filter(c => c.isActive).length +
        categories.liabilityCategories.filter(c => c.isActive).length +
        categories.industrySpecific.flatMap(ic => ic.categories).filter(c => c.isActive).length,
      industryConfigs: categories.industrySpecific.length,
      confidenceThresholds: behavior.confidenceThresholds,
      autoActions: behavior.autoActions,
      learningEnabled: behavior.learningSettings.enableFeedbackLearning
    };

    res.json({
      success: true,
      data: stats
    });
  }));
}
