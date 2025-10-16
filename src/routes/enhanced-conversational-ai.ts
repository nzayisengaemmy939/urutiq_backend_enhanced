import { Router } from 'express';
import { enhancedConversationalAIService } from '../services/enhanced-conversational-ai';
import { prisma } from '../prisma';
import { TenantRequest } from '../tenant';
import { asyncHandler } from '../errors';

const router = Router();

// Main conversational AI endpoint
router.post('/chat', asyncHandler(async (req: TenantRequest, res: any) => {
  const { text, companyId, sessionId, userPreferences } = req.body;
  const { tenantId } = req;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Message text is required'
    });
  }

  if (!companyId) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    });
  }

  // Create conversation context
  const context = {
    userId: 'demo-user-id',
    companyId,
    tenantId: tenantId || 'demo-tenant-id',
    sessionId: sessionId || `session-${Date.now()}`,
    conversationHistory: [],
    userPreferences: {
      language: userPreferences?.language || 'en',
      currency: userPreferences?.currency || 'RWF',
      dateFormat: userPreferences?.dateFormat || 'YYYY-MM-DD',
      autoConfirm: userPreferences?.autoConfirm || false,
      confidenceThreshold: userPreferences?.confidenceThreshold || 70,
      preferredCategories: userPreferences?.preferredCategories || [],
      excludedCategories: userPreferences?.excludedCategories || [],
      notificationPreferences: {
        email: userPreferences?.notificationPreferences?.email || false,
        push: userPreferences?.notificationPreferences?.push || false,
        sms: userPreferences?.notificationPreferences?.sms || false
      }
    },
    learningContext: {
      frequentVendors: [],
      frequentCategories: [],
      commonAmounts: [],
      userPatterns: [],
      industryContext: 'general',
      complianceRequirements: []
    }
  };

  try {
    const response = await enhancedConversationalAIService.processNaturalLanguageInput(text, context);
    
    res.json({
      success: true,
      data: response,
      sessionId: context.sessionId
    });
  } catch (error) {
    console.error('Enhanced conversational AI error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Batch process multiple transactions
router.post('/batch-chat', asyncHandler(async (req: TenantRequest, res: any) => {
  const { texts, companyId, sessionId, userPreferences } = req.body;
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

  // Create conversation context
  const context = {
    userId: 'demo-user-id',
    companyId,
    tenantId: tenantId || 'demo-tenant-id',
    sessionId: sessionId || `session-${Date.now()}`,
    conversationHistory: [],
    userPreferences: {
      language: userPreferences?.language || 'en',
      currency: userPreferences?.currency || 'RWF',
      dateFormat: userPreferences?.dateFormat || 'YYYY-MM-DD',
      autoConfirm: userPreferences?.autoConfirm || false,
      confidenceThreshold: userPreferences?.confidenceThreshold || 70,
      preferredCategories: userPreferences?.preferredCategories || [],
      excludedCategories: userPreferences?.excludedCategories || [],
      notificationPreferences: {
        email: userPreferences?.notificationPreferences?.email || false,
        push: userPreferences?.notificationPreferences?.push || false,
        sms: userPreferences?.notificationPreferences?.sms || false
      }
    },
    learningContext: {
      frequentVendors: [],
      frequentCategories: [],
      commonAmounts: [],
      userPatterns: [],
      industryContext: 'general',
      complianceRequirements: []
    }
  };

  try {
    const responses = await enhancedConversationalAIService.batchProcessTransactions(texts, context);
    
    res.json({
      success: true,
      data: {
        responses,
        totalProcessed: texts.length,
        successful: responses.filter(r => r.confidence > 0).length,
        sessionId: context.sessionId
      }
    });
  } catch (error) {
    console.error('Enhanced conversational AI batch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Get conversation history
router.get('/history/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { limit = 50, sessionId } = req.query;

  try {
    const history = await enhancedConversationalAIService.getConversationHistory(
      'demo-user-id',
      companyId,
      Number(limit)
    );
    
    res.json({
      success: true,
      data: {
        history,
        total: history.length,
        sessionId: sessionId || null
      }
    });
  } catch (error) {
    console.error('Error getting conversation history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Update user preferences
router.put('/preferences', asyncHandler(async (req: TenantRequest, res: any) => {
  const { preferences } = req.body;

  if (!preferences) {
    return res.status(400).json({
      success: false,
      error: 'Preferences object is required'
    });
  }

  try {
    await enhancedConversationalAIService.updateUserPreferences(
      'demo-user-id',
      preferences
    );
    
    res.json({
      success: true,
      data: {
        message: 'User preferences updated successfully',
        updatedPreferences: preferences
      }
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Get learning insights
router.get('/insights/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;

  try {
    const insights = await enhancedConversationalAIService.getLearningInsights(
      'demo-user-id',
      companyId
    );
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error getting learning insights:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Get supported languages
router.get('/languages', asyncHandler(async (req: TenantRequest, res: any) => {
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' }
  ];

  res.json({
    success: true,
    data: languages
  });
}));

// Get conversation examples
router.get('/examples', asyncHandler(async (req: TenantRequest, res: any) => {
  const { language = 'en' } = req.query;

  const examples = {
    en: {
      categories: [
        {
          name: 'Expenses',
          examples: [
            'I paid 30,000 RWF for electricity bill',
            'Bought office supplies for 15,000 RWF',
            'Paid rent for office space 200,000 RWF',
            'Fuel payment at Total station 25,000 RWF',
            'Internet bill payment 50,000 RWF'
          ]
        },
        {
          name: 'Income',
          examples: [
            'Received payment from client ABC Corp 500,000 RWF',
            'Sale of products to customer XYZ 150,000 RWF',
            'Service income from consulting work 300,000 RWF',
            'Interest income from bank account 5,000 RWF'
          ]
        },
        {
          name: 'Complex Transactions',
          examples: [
            'Paid salary to John Doe 150,000 RWF via bank transfer',
            'Received advance payment from XYZ Company 1,000,000 RWF for project work',
            'Paid insurance premium to ABC Insurance 75,000 RWF for business coverage',
            'Bought computer equipment from Tech Store 500,000 RWF on credit'
          ]
        }
      ]
    },
    fr: {
      categories: [
        {
          name: 'Dépenses',
          examples: [
            'J\'ai payé 30,000 RWF pour la facture d\'électricité',
            'Acheté des fournitures de bureau pour 15,000 RWF',
            'Payé le loyer pour l\'espace de bureau 200,000 RWF',
            'Paiement de carburant à la station Total 25,000 RWF',
            'Paiement de facture Internet 50,000 RWF'
          ]
        },
        {
          name: 'Revenus',
          examples: [
            'Reçu le paiement du client ABC Corp 500,000 RWF',
            'Vente de produits au client XYZ 150,000 RWF',
            'Revenus de service du travail de conseil 300,000 RWF',
            'Revenus d\'intérêts du compte bancaire 5,000 RWF'
          ]
        }
      ]
    },
    rw: {
      categories: [
        {
          name: 'Ibiciro',
          examples: [
            'Nashyuye 30,000 RWF amashanyarazi',
            'Naguze ibikoresho by\'ibiro 15,000 RWF',
            'Nashyuye amashanyarazi y\'ibiro 200,000 RWF',
            'Nashyuye amavuta kuri Total 25,000 RWF',
            'Nashyuye amashanyarazi ya Internet 50,000 RWF'
          ]
        },
        {
          name: 'Amafaranga',
          examples: [
            'Nakiriye amafaranga kuri ABC Corp 500,000 RWF',
            'Kugurisha ibintu kuri XYZ 150,000 RWF',
            'Amafaranga ya serivisi 300,000 RWF',
            'Amafaranga ya banki 5,000 RWF'
          ]
        }
      ]
    }
  };

  res.json({
    success: true,
    data: examples[language as keyof typeof examples] || examples.en
  });
}));

// Get conversation statistics
router.get('/stats/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { tenantId } = req;
  const { period = '30' } = req.query; // days

  try {
    // Get recent transactions for statistics
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        tenantId,
        companyId,
        createdAt: {
          gte: new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000)
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
      }
    });

    // Calculate statistics
    const totalTransactions = recentTransactions.length;
    const totalAmount = recentTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const avgAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    const transactionTypes = recentTransactions.reduce((acc, t) => {
      acc[t.transactionType] = (acc[t.transactionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = recentTransactions.reduce((acc, t) => {
      const category = t.linkedJournalEntry?.lines[0]?.account?.name || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedCategories = Object.entries(topCategories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));

    // Get learning insights
    const insights = await enhancedConversationalAIService.getLearningInsights(
      'demo-user-id',
      companyId
    );

    res.json({
      success: true,
      data: {
        totalTransactions,
        totalAmount,
        avgAmount,
        transactionTypes,
        topCategories: sortedCategories,
        period: `Last ${period} days`,
        learningInsights: insights,
        confidenceDistribution: {
          high: recentTransactions.filter(t => t.linkedJournalEntry?.memo?.includes('high')).length,
          medium: recentTransactions.filter(t => t.linkedJournalEntry?.memo?.includes('medium')).length,
          low: recentTransactions.filter(t => t.linkedJournalEntry?.memo?.includes('low')).length
        }
      }
    });
  } catch (error) {
    console.error('Error getting conversation statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Test endpoint for enhanced conversational AI
router.post('/test', asyncHandler(async (req: TenantRequest, res: any) => {
  const { text, companyId } = req.body;
  const { tenantId } = req;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Message text is required'
    });
  }

  if (!companyId) {
    return res.status(400).json({
      success: false,
      error: 'Company ID is required'
    });
  }

  // Create test context
  const context = {
    userId: 'test-user-id',
    companyId,
    tenantId: tenantId || 'demo-tenant-id',
    sessionId: `test-session-${Date.now()}`,
    conversationHistory: [],
    userPreferences: {
      language: 'en',
      currency: 'RWF',
      dateFormat: 'YYYY-MM-DD',
      autoConfirm: false,
      confidenceThreshold: 70,
      preferredCategories: [],
      excludedCategories: [],
      notificationPreferences: {
        email: false,
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
    }
  };

  try {
    const response = await enhancedConversationalAIService.processNaturalLanguageInput(text, context);
    
    res.json({
      success: true,
      data: response,
      sessionId: context.sessionId
    });
  } catch (error) {
    console.error('Enhanced conversational AI test error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;
