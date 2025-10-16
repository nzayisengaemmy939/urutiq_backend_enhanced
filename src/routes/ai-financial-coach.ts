import express from 'express';
import { AIFinancialCoachService } from '../services/ai-financial-coach.js';
import { authMiddleware, requireRoles } from '../auth.js';
import { tenantMiddleware } from '../tenant.js';

const router = express.Router();
const coachService = new AIFinancialCoachService();

// Apply authentication and tenant middleware to all routes
router.use(authMiddleware(process.env.JWT_SECRET || 'dev-secret'));
router.use(requireRoles(['admin', 'accountant', 'auditor']));
router.use(tenantMiddleware());

// Financial Goals Management
router.post('/goals/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const goalData = req.body;
    
    const goal = await coachService.createFinancialGoal(companyId, userId, goalData);
    res.json({ success: true, data: goal });
  } catch (error) {
    console.error('Error creating financial goal:', error);
    res.status(500).json({ success: false, error: 'Failed to create financial goal' });
  }
});

router.get('/goals/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const goals = await coachService.getFinancialGoals(companyId, userId);
    res.json({ success: true, data: goals });
  } catch (error) {
    console.error('Error getting financial goals:', error);
    res.status(500).json({ success: false, error: 'Failed to get financial goals' });
  }
});

router.put('/goals/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    const updates = req.body;
    
    const goal = await coachService.updateFinancialGoal(goalId, updates);
    res.json({ success: true, data: goal });
  } catch (error) {
    console.error('Error updating financial goal:', error);
    res.status(500).json({ success: false, error: 'Failed to update financial goal' });
  }
});

router.delete('/goals/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    await coachService.deleteFinancialGoal(goalId);
    res.json({ success: true, message: 'Financial goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting financial goal:', error);
    res.status(500).json({ success: false, error: 'Failed to delete financial goal' });
  }
});

// Financial Advice Generation
router.post('/advice/:companyId/:userId/generate', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { context } = req.body;
    
    const advice = await coachService.generateFinancialAdvice(companyId, userId, context);
    res.json({ success: true, data: advice });
  } catch (error) {
    console.error('Error generating financial advice:', error);
    res.status(500).json({ success: false, error: 'Failed to generate financial advice' });
  }
});

router.get('/advice/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { type } = req.query;
    
    const advice = await coachService.getFinancialAdvice(
      companyId, 
      userId, 
      type as string
    );
    res.json({ success: true, data: advice });
  } catch (error) {
    console.error('Error getting financial advice:', error);
    res.status(500).json({ success: false, error: 'Failed to get financial advice' });
  }
});

// Educational Content Management
router.get('/content/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { category, difficulty, topic } = req.query;
    
    const content = await coachService.getEducationalContent(
      category as string,
      difficulty as string,
      topic as string
    );
    res.json({ success: true, data: content });
  } catch (error) {
    console.error('Error getting educational content:', error);
    res.status(500).json({ success: false, error: 'Failed to get educational content' });
  }
});

router.get('/content/:companyId/:userId/recommended', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    
    const content = await coachService.getRecommendedContent(companyId, userId);
    res.json({ success: true, data: content });
  } catch (error) {
    console.error('Error getting recommended content:', error);
    res.status(500).json({ success: false, error: 'Failed to get recommended content' });
  }
});

// Learning Progress Tracking
router.post('/progress/:companyId/:userId/:contentId', async (req, res) => {
  try {
    const { companyId, userId, contentId } = req.params;
    const { progress, timeSpent, quizScore } = req.body;
    
    const learningProgress = await coachService.updateLearningProgress(
      companyId,
      userId,
      contentId,
      progress,
      timeSpent,
      quizScore
    );
    res.json({ success: true, data: learningProgress });
  } catch (error) {
    console.error('Error updating learning progress:', error);
    res.status(500).json({ success: false, error: 'Failed to update learning progress' });
  }
});

router.get('/progress/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    
    const progress = await coachService.getLearningProgress(companyId, userId);
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error getting learning progress:', error);
    res.status(500).json({ success: false, error: 'Failed to get learning progress' });
  }
});

// Financial Scenario Modeling
router.post('/scenarios/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const scenarioData = req.body;
    
    const scenario = await coachService.createFinancialScenario(companyId, userId, scenarioData);
    res.json({ success: true, data: scenario });
  } catch (error) {
    console.error('Error creating financial scenario:', error);
    res.status(500).json({ success: false, error: 'Failed to create financial scenario' });
  }
});

router.get('/scenarios/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    
    const scenarios = await coachService.getFinancialScenarios(companyId, userId);
    res.json({ success: true, data: scenarios });
  } catch (error) {
    console.error('Error getting financial scenarios:', error);
    res.status(500).json({ success: false, error: 'Failed to get financial scenarios' });
  }
});

// Coach Sessions
router.post('/sessions/:companyId/:userId/start', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { topics } = req.body;
    
    const session = await coachService.startCoachSession(companyId, userId, topics);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error starting coach session:', error);
    res.status(500).json({ success: false, error: 'Failed to start coach session' });
  }
});

router.put('/sessions/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await coachService.endCoachSession(sessionId);
    res.json({ success: true, message: 'Coach session ended successfully' });
  } catch (error) {
    console.error('Error ending coach session:', error);
    res.status(500).json({ success: false, error: 'Failed to end coach session' });
  }
});

// Analytics and Insights
router.get('/analytics/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { periodDays } = req.query;
    
    const analytics = await coachService.getCoachAnalytics(
      companyId, 
      userId, 
      periodDays ? parseInt(periodDays as string) : 30
    );
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error getting coach analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to get coach analytics' });
  }
});

// Goal Templates
router.get('/goal-templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'emergency_fund',
        name: 'Emergency Fund',
        description: 'Build a safety net for unexpected expenses',
        category: 'savings',
        defaultTargetAmount: 10000,
        defaultTimeframe: 12, // months
        tips: [
          'Aim for 3-6 months of living expenses',
          'Keep in a high-yield savings account',
          'Only use for true emergencies'
        ]
      },
      {
        id: 'debt_payoff',
        name: 'Debt Payoff',
        description: 'Eliminate high-interest debt',
        category: 'debt',
        defaultTargetAmount: 5000,
        defaultTimeframe: 24,
        tips: [
          'Focus on highest interest rate first',
          'Consider debt consolidation',
          'Avoid taking on new debt'
        ]
      },
      {
        id: 'retirement_savings',
        name: 'Retirement Savings',
        description: 'Secure your financial future',
        category: 'investment',
        defaultTargetAmount: 500000,
        defaultTimeframe: 360,
        tips: [
          'Start early to benefit from compound interest',
          'Contribute to employer-sponsored plans',
          'Diversify your investments'
        ]
      },
      {
        id: 'home_down_payment',
        name: 'Home Down Payment',
        description: 'Save for your dream home',
        category: 'savings',
        defaultTargetAmount: 50000,
        defaultTimeframe: 60,
        tips: [
          'Aim for 20% down payment',
          'Consider first-time homebuyer programs',
          'Factor in closing costs'
        ]
      },
      {
        id: 'business_investment',
        name: 'Business Investment',
        description: 'Grow your business or start a new venture',
        category: 'investment',
        defaultTargetAmount: 25000,
        defaultTimeframe: 36,
        tips: [
          'Research market opportunities',
          'Create a detailed business plan',
          'Consider consulting with experts'
        ]
      }
    ];

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error getting goal templates:', error);
    res.status(500).json({ success: false, error: 'Failed to get goal templates' });
  }
});

// Advice Categories
router.get('/advice-categories', async (req, res) => {
  try {
    const categories = [
      {
        id: 'savings',
        name: 'Savings & Emergency Fund',
        description: 'Build and maintain your savings',
        icon: 'piggy-bank',
        color: 'green'
      },
      {
        id: 'investment',
        name: 'Investment & Wealth Building',
        description: 'Grow your wealth through investments',
        icon: 'trending-up',
        color: 'blue'
      },
      {
        id: 'budget',
        name: 'Budgeting & Spending',
        description: 'Manage your expenses and cash flow',
        icon: 'calculator',
        color: 'purple'
      },
      {
        id: 'debt',
        name: 'Debt Management',
        description: 'Reduce and eliminate debt',
        icon: 'credit-card',
        color: 'red'
      },
      {
        id: 'tax',
        name: 'Tax Optimization',
        description: 'Minimize tax burden legally',
        icon: 'file-text',
        color: 'orange'
      },
      {
        id: 'general',
        name: 'General Financial Planning',
        description: 'Overall financial health and planning',
        icon: 'target',
        color: 'teal'
      }
    ];

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error getting advice categories:', error);
    res.status(500).json({ success: false, error: 'Failed to get advice categories' });
  }
});

// Content Categories
router.get('/content-categories', async (req, res) => {
  try {
    const categories = [
      {
        id: 'basics',
        name: 'Financial Basics',
        description: 'Fundamental financial concepts',
        topics: ['accounting', 'budgeting', 'savings'],
        difficulty: 'beginner'
      },
      {
        id: 'intermediate',
        name: 'Intermediate Finance',
        description: 'Advanced financial strategies',
        topics: ['investments', 'taxes', 'debt'],
        difficulty: 'intermediate'
      },
      {
        id: 'advanced',
        name: 'Advanced Finance',
        description: 'Complex financial planning',
        topics: ['estate_planning', 'business_finance', 'retirement'],
        difficulty: 'advanced'
      }
    ];

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error getting content categories:', error);
    res.status(500).json({ success: false, error: 'Failed to get content categories' });
  }
});

// Progress Summary
router.get('/progress-summary/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    
    // Get various progress metrics
    const goals = await coachService.getFinancialGoals(companyId, userId);
    const progress = await coachService.getLearningProgress(companyId, userId);
    const advice = await coachService.getFinancialAdvice(companyId, userId);
    
    const summary = {
      goals: {
        total: goals.length,
        active: goals.filter(g => g.status === 'active').length,
        completed: goals.filter(g => g.status === 'completed').length,
        averageProgress: goals.length > 0 
          ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
          : 0
      },
      learning: {
        totalContent: progress.length,
        completedContent: progress.filter(p => p.status === 'completed').length,
        averageProgress: progress.length > 0
          ? progress.reduce((sum, p) => sum + p.progress, 0) / progress.length
          : 0,
        totalTimeSpent: progress.reduce((sum, p) => sum + p.timeSpent, 0)
      },
      advice: {
        total: advice.length,
        actionable: advice.filter(a => a.actionable).length,
        highPriority: advice.filter(a => a.priority === 'high').length
      }
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error getting progress summary:', error);
    res.status(500).json({ success: false, error: 'Failed to get progress summary' });
  }
});

// Quick Actions
router.post('/quick-actions/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { action, data } = req.body;
    
    let result;
    
    switch (action) {
      case 'generate_advice':
        result = await coachService.generateFinancialAdvice(companyId, userId, data.context);
        break;
      case 'create_goal':
        result = await coachService.createFinancialGoal(companyId, userId, data);
        break;
      case 'start_session':
        result = await coachService.startCoachSession(companyId, userId, data.topics);
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error executing quick action:', error);
    res.status(500).json({ success: false, error: 'Failed to execute quick action' });
  }
});

export default router;
