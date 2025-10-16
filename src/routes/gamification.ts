import express from 'express';
import { GamificationService } from '../services/gamification-service.js';

const router = express.Router();
const gamificationService = new GamificationService();

// Achievement Management
router.post('/achievements/:companyId/:userId/initialize', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const achievements = await gamificationService.initializeUserAchievements(companyId, userId);
    res.json({ success: true, data: achievements });
  } catch (error) {
    console.error('Error initializing achievements:', error);
    res.status(500).json({ success: false, error: 'Failed to initialize achievements' });
  }
});

router.get('/achievements/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const achievements = await gamificationService.getUserAchievements(companyId, userId);
    res.json({ success: true, data: achievements });
  } catch (error) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ success: false, error: 'Failed to get achievements' });
  }
});

router.post('/achievements/:companyId/:userId/check', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const updatedAchievements = await gamificationService.checkAndUpdateAchievements(companyId, userId);
    res.json({ success: true, data: updatedAchievements });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ success: false, error: 'Failed to check achievements' });
  }
});

// User Progress Management
router.post('/progress/:companyId/:userId/initialize', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const progress = await gamificationService.initializeUserProgress(companyId, userId);
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error initializing progress:', error);
    res.status(500).json({ success: false, error: 'Failed to initialize progress' });
  }
});

router.get('/progress/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const progress = await gamificationService.getUserProgress(companyId, userId);
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({ success: false, error: 'Failed to get progress' });
  }
});

router.put('/progress/:companyId/:userId/update', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { points } = req.body;
    const progress = await gamificationService.updateUserProgress(companyId, userId, points);
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ success: false, error: 'Failed to update progress' });
  }
});

router.put('/progress/:companyId/:userId/streak', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const progress = await gamificationService.updateStreak(companyId, userId);
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error updating streak:', error);
    res.status(500).json({ success: false, error: 'Failed to update streak' });
  }
});

// Challenge Management
router.post('/challenges/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const challengeData = req.body;
    const challenge = await gamificationService.createChallenge({
      ...challengeData,
      companyId
    });
    res.json({ success: true, data: challenge });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ success: false, error: 'Failed to create challenge' });
  }
});

router.get('/challenges/:companyId/active', async (req, res) => {
  try {
    const { companyId } = req.params;
    const challenges = await gamificationService.getActiveChallenges(companyId);
    res.json({ success: true, data: challenges });
  } catch (error) {
    console.error('Error getting active challenges:', error);
    res.status(500).json({ success: false, error: 'Failed to get active challenges' });
  }
});

router.post('/challenges/:challengeId/join/:companyId/:userId', async (req, res) => {
  try {
    const { challengeId, companyId, userId } = req.params;
    const participant = await gamificationService.joinChallenge(challengeId, companyId, userId);
    res.json({ success: true, data: participant });
  } catch (error) {
    console.error('Error joining challenge:', error);
    res.status(500).json({ success: false, error: 'Failed to join challenge' });
  }
});

router.put('/challenges/:challengeId/progress/:userId', async (req, res) => {
  try {
    const { challengeId, userId } = req.params;
    const { currentValue } = req.body;
    const participant = await gamificationService.updateChallengeProgress(challengeId, userId, currentValue);
    res.json({ success: true, data: participant });
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    res.status(500).json({ success: false, error: 'Failed to update challenge progress' });
  }
});

// Leaderboard Management
router.post('/leaderboards/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const leaderboardData = req.body;
    const leaderboard = await gamificationService.createLeaderboard({
      ...leaderboardData,
      companyId
    });
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Error creating leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to create leaderboard' });
  }
});

router.put('/leaderboards/:leaderboardId/update/:companyId', async (req, res) => {
  try {
    const { leaderboardId, companyId } = req.params;
    const leaderboard = await gamificationService.updateLeaderboard(leaderboardId, companyId);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to update leaderboard' });
  }
});

router.get('/leaderboards/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const leaderboards = await gamificationService.getLeaderboards(companyId);
    res.json({ success: true, data: leaderboards });
  } catch (error) {
    console.error('Error getting leaderboards:', error);
    res.status(500).json({ success: false, error: 'Failed to get leaderboards' });
  }
});

// Gamification Stats
router.get('/stats/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const stats = await gamificationService.getGamificationStats(companyId, userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting gamification stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get gamification stats' });
  }
});

// Achievement Templates
router.get('/achievement-templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'first_transaction',
        name: 'First Steps',
        description: 'Record your first transaction',
        category: 'financial',
        icon: '🎯',
        points: 10,
        maxProgress: 1,
        conditions: [{ type: 'transaction_count', value: 1, operator: 'greater_equal' }],
        rarity: 'common'
      },
      {
        id: 'goal_setter',
        name: 'Goal Setter',
        description: 'Create your first financial goal',
        category: 'financial',
        icon: '🎯',
        points: 25,
        maxProgress: 1,
        conditions: [{ type: 'goal_completion', value: 1, operator: 'greater_equal' }],
        rarity: 'common'
      },
      {
        id: 'savings_master',
        name: 'Savings Master',
        description: 'Save $1,000 in total',
        category: 'financial',
        icon: '💰',
        points: 100,
        maxProgress: 1000,
        conditions: [{ type: 'amount_saved', value: 1000, operator: 'greater_equal' }],
        rarity: 'rare'
      },
      {
        id: 'debt_free',
        name: 'Debt Free',
        description: 'Pay off $5,000 in debt',
        category: 'financial',
        icon: '🎉',
        points: 200,
        maxProgress: 5000,
        conditions: [{ type: 'debt_reduced', value: 5000, operator: 'greater_equal' }],
        rarity: 'epic'
      },
      {
        id: 'learning_champion',
        name: 'Learning Champion',
        description: 'Complete 10 educational modules',
        category: 'learning',
        icon: '📚',
        points: 150,
        maxProgress: 10,
        conditions: [{ type: 'learning_progress', value: 10, operator: 'greater_equal' }],
        rarity: 'rare'
      },
      {
        id: 'voice_commander',
        name: 'Voice Commander',
        description: 'Use 50 voice commands',
        category: 'engagement',
        icon: '🎤',
        points: 75,
        maxProgress: 50,
        conditions: [{ type: 'voice_commands', value: 50, operator: 'greater_equal' }],
        rarity: 'rare'
      },
      {
        id: 'streak_master',
        name: 'Streak Master',
        description: 'Maintain a 30-day activity streak',
        category: 'engagement',
        icon: '🔥',
        points: 300,
        maxProgress: 30,
        conditions: [{ type: 'streak_days', value: 30, operator: 'greater_equal' }],
        rarity: 'legendary'
      },
      {
        id: 'budget_pro',
        name: 'Budget Pro',
        description: 'Create and stick to a budget for 7 days',
        category: 'financial',
        icon: '📊',
        points: 50,
        maxProgress: 7,
        conditions: [{ type: 'streak_days', value: 7, operator: 'greater_equal' }],
        rarity: 'common'
      },
      {
        id: 'investment_starter',
        name: 'Investment Starter',
        description: 'Make your first investment',
        category: 'financial',
        icon: '📈',
        points: 150,
        maxProgress: 1,
        conditions: [{ type: 'transaction_count', value: 1, operator: 'greater_equal' }],
        rarity: 'rare'
      },
      {
        id: 'report_master',
        name: 'Report Master',
        description: 'Generate 5 financial reports',
        category: 'financial',
        icon: '📋',
        points: 100,
        maxProgress: 5,
        conditions: [{ type: 'reports_generated', value: 5, operator: 'greater_equal' }],
        rarity: 'rare'
      }
    ];

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error getting achievement templates:', error);
    res.status(500).json({ success: false, error: 'Failed to get achievement templates' });
  }
});

// Challenge Templates
router.get('/challenge-templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'savings_challenge',
        name: '30-Day Savings Challenge',
        description: 'Save $500 in 30 days',
        category: 'savings',
        type: 'individual',
        targetValue: 500,
        targetType: 'amount',
        rewardPoints: 200,
        rewardBadge: 'savings_champion',
        duration: 30
      },
      {
        id: 'debt_reduction',
        name: 'Debt Reduction Sprint',
        description: 'Pay off $1,000 in debt in 60 days',
        category: 'debt',
        type: 'individual',
        targetValue: 1000,
        targetType: 'amount',
        rewardPoints: 300,
        rewardBadge: 'debt_free_warrior',
        duration: 60
      },
      {
        id: 'learning_marathon',
        name: 'Learning Marathon',
        description: 'Complete 5 educational modules in 2 weeks',
        category: 'learning',
        type: 'individual',
        targetValue: 5,
        targetType: 'count',
        rewardPoints: 150,
        rewardBadge: 'knowledge_seeker',
        duration: 14
      },
      {
        id: 'team_savings',
        name: 'Team Savings Challenge',
        description: 'Collectively save $10,000 as a team',
        category: 'savings',
        type: 'team',
        targetValue: 10000,
        targetType: 'amount',
        rewardPoints: 500,
        rewardBadge: 'team_player',
        duration: 90
      },
      {
        id: 'consistency_king',
        name: 'Consistency King',
        description: 'Log transactions for 21 consecutive days',
        category: 'engagement',
        type: 'individual',
        targetValue: 21,
        targetType: 'streak',
        rewardPoints: 100,
        rewardBadge: 'consistency_king',
        duration: 21
      }
    ];

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error getting challenge templates:', error);
    res.status(500).json({ success: false, error: 'Failed to get challenge templates' });
  }
});

// Leaderboard Templates
router.get('/leaderboard-templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'points_leaderboard',
        name: 'Points Leaderboard',
        description: 'Ranking based on total points earned',
        type: 'points',
        timeframe: 'all_time'
      },
      {
        id: 'achievements_leaderboard',
        name: 'Achievements Leaderboard',
        description: 'Ranking based on number of achievements unlocked',
        type: 'achievements',
        timeframe: 'all_time'
      },
      {
        id: 'streaks_leaderboard',
        name: 'Streaks Leaderboard',
        description: 'Ranking based on longest activity streaks',
        type: 'streaks',
        timeframe: 'all_time'
      },
      {
        id: 'savings_leaderboard',
        name: 'Savings Leaderboard',
        description: 'Ranking based on total savings',
        type: 'savings',
        timeframe: 'monthly'
      },
      {
        id: 'debt_reduction_leaderboard',
        name: 'Debt Reduction Leaderboard',
        description: 'Ranking based on debt reduction',
        type: 'debt_reduction',
        timeframe: 'monthly'
      },
      {
        id: 'learning_leaderboard',
        name: 'Learning Leaderboard',
        description: 'Ranking based on completed educational modules',
        type: 'learning',
        timeframe: 'monthly'
      }
    ];

    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error getting leaderboard templates:', error);
    res.status(500).json({ success: false, error: 'Failed to get leaderboard templates' });
  }
});

// Quick Actions
router.post('/quick-actions/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { action, data } = req.body;
    
    let result;
    
    switch (action) {
      case 'check_achievements':
        result = await gamificationService.checkAndUpdateAchievements(companyId, userId);
        break;
      case 'update_streak':
        result = await gamificationService.updateStreak(companyId, userId);
        break;
      case 'get_stats':
        result = await gamificationService.getGamificationStats(companyId, userId);
        break;
      case 'join_challenge':
        result = await gamificationService.joinChallenge(data.challengeId, companyId, userId);
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

// Activity Tracking
router.post('/activity/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    const { activityType, points = 0 } = req.body;
    
    // Update streak
    await gamificationService.updateStreak(companyId, userId);
    
    // Add points if provided
    let progress;
    if (points > 0) {
      progress = await gamificationService.updateUserProgress(companyId, userId, points);
    } else {
      progress = await gamificationService.getUserProgress(companyId, userId);
    }
    
    // Check achievements
    const achievements = await gamificationService.checkAndUpdateAchievements(companyId, userId);
    
    res.json({ 
      success: true, 
      data: { 
        progress, 
        achievements,
        activityType 
      } 
    });
  } catch (error) {
    console.error('Error tracking activity:', error);
    res.status(500).json({ success: false, error: 'Failed to track activity' });
  }
});

// User Rankings
router.get('/rankings/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    
    // Get all leaderboards
    const leaderboards = await gamificationService.getLeaderboards(companyId);
    
    // Get user's rankings
    const rankings = await Promise.all(
      leaderboards.map(async (leaderboard) => {
        const entry = leaderboard.participants.find(p => p.userId === userId);
        return {
          leaderboardId: leaderboard.id,
          leaderboardName: leaderboard.name,
          leaderboardType: leaderboard.type,
          rank: entry?.rank || 0,
          value: entry?.value || 0,
          totalParticipants: leaderboard.participants.length
        };
      })
    );
    
    res.json({ success: true, data: rankings });
  } catch (error) {
    console.error('Error getting user rankings:', error);
    res.status(500).json({ success: false, error: 'Failed to get user rankings' });
  }
});

// Progress Summary
router.get('/progress-summary/:companyId/:userId', async (req, res) => {
  try {
    const { companyId, userId } = req.params;
    
    const progress = await gamificationService.getUserProgress(companyId, userId);
    const achievements = await gamificationService.getUserAchievements(companyId, userId);
    const stats = await gamificationService.getGamificationStats(companyId, userId);
    
    const summary = {
      level: progress.level,
      totalPoints: progress.totalPoints,
      experience: progress.experience,
      experienceToNextLevel: progress.experienceToNextLevel,
      achievementsUnlocked: progress.achievementsUnlocked,
      totalAchievements: progress.totalAchievements,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      recentAchievements: stats.recentAchievements,
      nextMilestone: stats.nextMilestone,
      leaderboardRankings: stats.leaderboardRankings,
      upcomingChallenges: stats.upcomingChallenges
    };
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error getting progress summary:', error);
    res.status(500).json({ success: false, error: 'Failed to get progress summary' });
  }
});

export default router;
