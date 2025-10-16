import { PrismaClient } from '@prisma/client';
import { EnhancedConversationalAIService } from './enhanced-conversational-ai';

const prisma = new PrismaClient();

// Types for Gamification System
export interface Achievement {
  id: string;
  companyId: string;
  userId: string;
  achievementId: string;
  name: string;
  description: string;
  category: 'financial' | 'learning' | 'engagement' | 'milestone' | 'special';
  icon: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
  metadata?: any;
  createdAt: Date;
}

export interface AchievementTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'learning' | 'engagement' | 'milestone' | 'special';
  icon: string;
  points: number;
  maxProgress: number;
  conditions: AchievementCondition[];
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  metadata?: any;
}

export interface AchievementCondition {
  type: 'transaction_count' | 'goal_completion' | 'learning_progress' | 'streak_days' | 'amount_saved' | 'debt_reduced' | 'reports_generated' | 'voice_commands' | 'advice_followed';
  value: number;
  operator: 'equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal';
  timeframe?: number; // in days
}

export interface UserProgress {
  id: string;
  companyId: string;
  userId: string;
  totalPoints: number;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  achievementsUnlocked: number;
  totalAchievements: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Challenge {
  id: string;
  companyId: string;
  name: string;
  description: string;
  category: 'savings' | 'debt' | 'investment' | 'learning' | 'engagement' | 'custom';
  type: 'individual' | 'team' | 'company' | 'global';
  startDate: Date;
  endDate: Date;
  targetValue: number;
  targetType: 'amount' | 'count' | 'percentage' | 'streak';
  rewardPoints: number;
  rewardBadge?: string;
  participants: ChallengeParticipant[];
  status: 'upcoming' | 'active' | 'completed' | 'expired';
  metadata?: any;
  createdAt: Date;
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  companyId: string;
  currentValue: number;
  targetValue: number;
  progress: number;
  rank?: number;
  completed: boolean;
  completedAt?: Date;
  joinedAt: Date;
  metadata?: any;
}

export interface Leaderboard {
  id: string;
  companyId: string;
  name: string;
  description: string;
  type: 'points' | 'achievements' | 'streaks' | 'savings' | 'debt_reduction' | 'learning' | 'custom';
  timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all_time';
  participants: LeaderboardEntry[];
  lastUpdated: Date;
  metadata?: any;
}

export interface LeaderboardEntry {
  id: string;
  leaderboardId: string;
  userId: string;
  companyId: string;
  rank: number;
  value: number;
  displayName: string;
  avatar?: string;
  metadata?: any;
  lastUpdated: Date;
}

export interface GamificationStats {
  totalPoints: number;
  level: number;
  achievementsUnlocked: number;
  currentStreak: number;
  longestStreak: number;
  challengesCompleted: number;
  leaderboardRankings: Array<{ type: string; rank: number; value: number }>;
  recentAchievements: Achievement[];
  upcomingChallenges: Challenge[];
  nextMilestone: AchievementTemplate | null;
}

// Gamification Service
export class GamificationService {
  private conversationalAI: EnhancedConversationalAIService;

  constructor() {
    this.conversationalAI = new EnhancedConversationalAIService();
  }

  // Achievement Management
  async initializeUserAchievements(companyId: string, userId: string): Promise<Achievement[]> {
    try {
      // Get achievement templates
      const templates = await this.getAchievementTemplates();
      
      // Create achievements for user
      const achievements = await Promise.all(
        templates.map(template => 
          prisma.achievement.create({
            data: {
              companyId,
              userId,
              achievementId: template.id,
              name: template.name,
              description: template.description,
              category: template.category,
              icon: template.icon,
              points: template.points,
              unlocked: false,
              progress: 0,
              maxProgress: template.maxProgress,
              metadata: template.metadata || {}
            }
          })
        )
      );

      return achievements.map(achievement => this.mapAchievementFromDB(achievement));
    } catch (error) {
      console.error('Error initializing user achievements:', error);
      return [];
    }
  }

  async getUserAchievements(companyId: string, userId: string): Promise<Achievement[]> {
    const achievements = await prisma.achievement.findMany({
      where: { companyId, userId },
      orderBy: { createdAt: 'desc' }
    });

    return achievements.map(achievement => this.mapAchievementFromDB(achievement));
  }

  async checkAndUpdateAchievements(companyId: string, userId: string): Promise<Achievement[]> {
    try {
      const achievements = await this.getUserAchievements(companyId, userId);
      const userData = await this.getUserFinancialData(companyId, userId);
      const updatedAchievements: Achievement[] = [];

      for (const achievement of achievements) {
        if (!achievement.unlocked) {
          const progress = await this.calculateAchievementProgress(achievement, userData);
          const shouldUnlock = progress >= achievement.maxProgress;

          if (shouldUnlock) {
            const updatedAchievement = await prisma.achievement.update({
              where: { id: achievement.id },
              data: {
                unlocked: true,
                unlockedAt: new Date(),
                progress: achievement.maxProgress
              }
            });

            updatedAchievements.push(this.mapAchievementFromDB(updatedAchievement));
            
            // Update user progress
            await this.updateUserProgress(companyId, userId, achievement.points);
          } else if (progress !== achievement.progress) {
            const updatedAchievement = await prisma.achievement.update({
              where: { id: achievement.id },
              data: { progress }
            });

            updatedAchievements.push(this.mapAchievementFromDB(updatedAchievement));
          }
        }
      }

      return updatedAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  // User Progress Management
  async initializeUserProgress(companyId: string, userId: string): Promise<UserProgress> {
    const progress = await prisma.userProgress.upsert({
      where: { companyId_userId: { companyId, userId } },
      update: {},
      create: {
        companyId,
        userId,
        totalPoints: 0,
        level: 1,
        experience: 0,
        experienceToNextLevel: 100,
        achievementsUnlocked: 0,
        totalAchievements: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date(),
        metadata: {}
      }
    });

    return this.mapUserProgressFromDB(progress);
  }

  async getUserProgress(companyId: string, userId: string): Promise<UserProgress> {
    const progress = await prisma.userProgress.findUnique({
      where: { companyId_userId: { companyId, userId } }
    });

    if (!progress) {
      return this.initializeUserProgress(companyId, userId);
    }

    return this.mapUserProgressFromDB(progress);
  }

  async updateUserProgress(companyId: string, userId: string, points: number): Promise<UserProgress> {
    const currentProgress = await this.getUserProgress(companyId, userId);
    
    const newExperience = currentProgress.experience + points;
    const newLevel = this.calculateLevel(newExperience);
    const experienceToNextLevel = this.calculateExperienceToNextLevel(newLevel);
    
    const achievements = await this.getUserAchievements(companyId, userId);
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    const progress = await prisma.userProgress.update({
      where: { companyId_userId: { companyId, userId } },
      data: {
        totalPoints: currentProgress.totalPoints + points,
        level: newLevel,
        experience: newExperience,
        experienceToNextLevel,
        achievementsUnlocked: unlockedCount,
        totalAchievements: achievements.length,
        lastActivityDate: new Date(),
        updatedAt: new Date()
      }
    });

    return this.mapUserProgressFromDB(progress);
  }

  async updateStreak(companyId: string, userId: string): Promise<UserProgress> {
    const progress = await this.getUserProgress(companyId, userId);
    const today = new Date();
    const lastActivity = new Date(progress.lastActivityDate);
    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak = progress.currentStreak;
    if (daysDiff === 1) {
      newStreak += 1;
    } else if (daysDiff > 1) {
      newStreak = 1;
    }

    const longestStreak = Math.max(progress.longestStreak, newStreak);

    const updatedProgress = await prisma.userProgress.update({
      where: { companyId_userId: { companyId, userId } },
      data: {
        currentStreak: newStreak,
        longestStreak,
        lastActivityDate: today,
        updatedAt: today
      }
    });

    return this.mapUserProgressFromDB(updatedProgress);
  }

  // Challenge Management
  async createChallenge(challengeData: Omit<Challenge, 'id' | 'participants' | 'createdAt'>): Promise<Challenge> {
    const challenge = await prisma.challenge.create({
      data: {
        companyId: challengeData.companyId,
        name: challengeData.name,
        description: challengeData.description,
        category: challengeData.category,
        type: challengeData.type,
        startDate: challengeData.startDate,
        endDate: challengeData.endDate,
        targetValue: challengeData.targetValue,
        targetType: challengeData.targetType,
        rewardPoints: challengeData.rewardPoints,
        rewardBadge: challengeData.rewardBadge,
        status: challengeData.status,
        metadata: challengeData.metadata || {}
      }
    });

    return this.mapChallengeFromDB(challenge);
  }

  async getActiveChallenges(companyId: string): Promise<Challenge[]> {
    const challenges = await prisma.challenge.findMany({
      where: { 
        companyId,
        status: 'active',
        endDate: { gte: new Date() }
      },
      include: { participants: true },
      orderBy: { endDate: 'asc' }
    });

    return challenges.map(challenge => this.mapChallengeFromDB(challenge));
  }

  async joinChallenge(challengeId: string, companyId: string, userId: string): Promise<ChallengeParticipant> {
    const participant = await prisma.challengeParticipant.create({
      data: {
        challengeId,
        userId,
        companyId,
        currentValue: 0,
        targetValue: 0, // Will be set from challenge
        progress: 0,
        completed: false,
        joinedAt: new Date(),
        metadata: {}
      }
    });

    return this.mapChallengeParticipantFromDB(participant);
  }

  async updateChallengeProgress(
    challengeId: string, 
    userId: string, 
    currentValue: number
  ): Promise<ChallengeParticipant> {
    const participant = await prisma.challengeParticipant.findFirst({
      where: { challengeId, userId }
    });

    if (!participant) {
      throw new Error('User not participating in this challenge');
    }

    const progress = Math.min((currentValue / participant.targetValue) * 100, 100);
    const completed = currentValue >= participant.targetValue;

    const updatedParticipant = await prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: {
        currentValue,
        progress,
        completed,
        completedAt: completed ? new Date() : null
      }
    });

    return this.mapChallengeParticipantFromDB(updatedParticipant);
  }

  // Leaderboard Management
  async createLeaderboard(leaderboardData: Omit<Leaderboard, 'id' | 'participants' | 'lastUpdated'>): Promise<Leaderboard> {
    const leaderboard = await prisma.leaderboard.create({
      data: {
        companyId: leaderboardData.companyId,
        name: leaderboardData.name,
        description: leaderboardData.description,
        type: leaderboardData.type,
        timeframe: leaderboardData.timeframe,
        lastUpdated: new Date(),
        metadata: leaderboardData.metadata || {}
      }
    });

    return this.mapLeaderboardFromDB(leaderboard);
  }

  async updateLeaderboard(leaderboardId: string, companyId: string): Promise<Leaderboard> {
    const leaderboard = await prisma.leaderboard.findUnique({
      where: { id: leaderboardId }
    });

    if (!leaderboard) {
      throw new Error('Leaderboard not found');
    }

    // Get all users in the company
    const users = await prisma.appUser.findMany({
      where: { companyId }
    });

    // Calculate values based on leaderboard type
    const entries = await Promise.all(
      users.map(async (user) => {
        const value = await this.calculateLeaderboardValue(leaderboard.type, companyId, user.id);
        return {
          leaderboardId,
          userId: user.id,
          companyId,
          value,
          displayName: user.name || user.email,
          rank: 0 // Will be calculated
        };
      })
    );

    // Sort by value and assign ranks
    entries.sort((a, b) => b.value - a.value);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Update or create leaderboard entries
    await Promise.all(
      entries.map(entry =>
        prisma.leaderboardEntry.upsert({
          where: { 
            leaderboardId_userId: { 
              leaderboardId, 
              userId: entry.userId 
            } 
          },
          update: {
            rank: entry.rank,
            value: entry.value,
            lastUpdated: new Date()
          },
          create: {
            leaderboardId: entry.leaderboardId,
            userId: entry.userId,
            companyId: entry.companyId,
            rank: entry.rank,
            value: entry.value,
            displayName: entry.displayName,
            lastUpdated: new Date(),
            metadata: {}
          }
        })
      )
    );

    // Update leaderboard last updated time
    const updatedLeaderboard = await prisma.leaderboard.update({
      where: { id: leaderboardId },
      data: { lastUpdated: new Date() },
      include: { participants: true }
    });

    return this.mapLeaderboardFromDB(updatedLeaderboard);
  }

  async getLeaderboards(companyId: string): Promise<Leaderboard[]> {
    const leaderboards = await prisma.leaderboard.findMany({
      where: { companyId },
      include: { participants: true },
      orderBy: { lastUpdated: 'desc' }
    });

    return leaderboards.map(leaderboard => this.mapLeaderboardFromDB(leaderboard));
  }

  // Gamification Stats
  async getGamificationStats(companyId: string, userId: string): Promise<GamificationStats> {
    const progress = await this.getUserProgress(companyId, userId);
    const achievements = await this.getUserAchievements(companyId, userId);
    const recentAchievements = achievements
      .filter(a => a.unlocked)
      .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
      .slice(0, 5);

    const activeChallenges = await this.getActiveChallenges(companyId);
    const upcomingChallenges = activeChallenges.filter(c => new Date(c.startDate) > new Date());

    const leaderboards = await this.getLeaderboards(companyId);
    const leaderboardRankings = await Promise.all(
      leaderboards.map(async (leaderboard) => {
        const entry = leaderboard.participants.find(p => p.userId === userId);
        return {
          type: leaderboard.type,
          rank: entry?.rank || 0,
          value: entry?.value || 0
        };
      })
    );

    const nextMilestone = await this.getNextMilestone(companyId, userId);

    return {
      totalPoints: progress.totalPoints,
      level: progress.level,
      achievementsUnlocked: progress.achievementsUnlocked,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      challengesCompleted: 0, // TODO: Calculate from challenge participants
      leaderboardRankings,
      recentAchievements,
      upcomingChallenges,
      nextMilestone
    };
  }

  // Private helper methods
  private async getAchievementTemplates(): Promise<AchievementTemplate[]> {
    return [
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
      }
    ];
  }

  private async getUserFinancialData(companyId: string, userId: string): Promise<any> {
    const transactions = await prisma.transaction.findMany({
      where: { companyId, createdById: userId }
    });

    const goals = await prisma.financialGoal.findMany({
      where: { companyId, userId }
    });

    const voiceCommands = await prisma.voiceCommand.findMany({
      where: { companyId, userId }
    });

    const learningProgress = await prisma.learningProgress.findMany({
      where: { companyId, userId }
    });

    return {
      transactions,
      goals,
      voiceCommands,
      learningProgress,
      totalTransactions: transactions.length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      totalVoiceCommands: voiceCommands.length,
      completedLearningModules: learningProgress.filter(p => p.status === 'completed').length
    };
  }

  private async calculateAchievementProgress(achievement: Achievement, userData: any): Promise<number> {
    const template = (await this.getAchievementTemplates()).find(t => t.id === achievement.achievementId);
    if (!template) return 0;

    const condition = template.conditions[0];
    if (!condition) return 0;

    let value = 0;
    switch (condition.type) {
      case 'transaction_count':
        value = userData.totalTransactions;
        break;
      case 'goal_completion':
        value = userData.completedGoals;
        break;
      case 'learning_progress':
        value = userData.completedLearningModules;
        break;
      case 'voice_commands':
        value = userData.totalVoiceCommands;
        break;
      case 'streak_days':
        // TODO: Calculate from user progress
        value = 0;
        break;
      case 'amount_saved':
        // TODO: Calculate from goals
        value = 0;
        break;
      case 'debt_reduced':
        // TODO: Calculate from transactions
        value = 0;
        break;
      case 'reports_generated':
        // TODO: Calculate from reports
        value = 0;
        break;
      case 'advice_followed':
        // TODO: Calculate from advice
        value = 0;
        break;
    }

    return Math.min(value, achievement.maxProgress);
  }

  private calculateLevel(experience: number): number {
    return Math.floor(experience / 100) + 1;
  }

  private calculateExperienceToNextLevel(level: number): number {
    return level * 100;
  }

  private async calculateLeaderboardValue(type: string, companyId: string, userId: string): Promise<number> {
    switch (type) {
      case 'points':
        const progress = await this.getUserProgress(companyId, userId);
        return progress.totalPoints;
      case 'achievements':
        const achievements = await this.getUserAchievements(companyId, userId);
        return achievements.filter(a => a.unlocked).length;
      case 'streaks':
        const userProgress = await this.getUserProgress(companyId, userId);
        return userProgress.longestStreak;
      case 'savings':
        // TODO: Calculate total savings
        return 0;
      case 'debt_reduction':
        // TODO: Calculate debt reduction
        return 0;
      case 'learning':
        const learningProgress = await prisma.learningProgress.findMany({
          where: { companyId, userId }
        });
        return learningProgress.filter(p => p.status === 'completed').length;
      default:
        return 0;
    }
  }

  private async getNextMilestone(companyId: string, userId: string): Promise<AchievementTemplate | null> {
    const achievements = await this.getUserAchievements(companyId, userId);
    const unlockedAchievements = achievements.filter(a => a.unlocked).map(a => a.achievementId);
    const templates = await this.getAchievementTemplates();
    
    const nextAchievement = templates.find(t => !unlockedAchievements.includes(t.id));
    return nextAchievement || null;
  }

  private mapAchievementFromDB(dbAchievement: any): Achievement {
    return {
      id: dbAchievement.id,
      companyId: dbAchievement.companyId,
      userId: dbAchievement.userId,
      achievementId: dbAchievement.achievementId,
      name: dbAchievement.name,
      description: dbAchievement.description,
      category: dbAchievement.category,
      icon: dbAchievement.icon,
      points: dbAchievement.points,
      unlocked: dbAchievement.unlocked,
      unlockedAt: dbAchievement.unlockedAt,
      progress: dbAchievement.progress,
      maxProgress: dbAchievement.maxProgress,
      metadata: dbAchievement.metadata,
      createdAt: dbAchievement.createdAt
    };
  }

  private mapUserProgressFromDB(dbProgress: any): UserProgress {
    return {
      id: dbProgress.id,
      companyId: dbProgress.companyId,
      userId: dbProgress.userId,
      totalPoints: dbProgress.totalPoints,
      level: dbProgress.level,
      experience: dbProgress.experience,
      experienceToNextLevel: dbProgress.experienceToNextLevel,
      achievementsUnlocked: dbProgress.achievementsUnlocked,
      totalAchievements: dbProgress.totalAchievements,
      currentStreak: dbProgress.currentStreak,
      longestStreak: dbProgress.longestStreak,
      lastActivityDate: dbProgress.lastActivityDate,
      metadata: dbProgress.metadata,
      createdAt: dbProgress.createdAt,
      updatedAt: dbProgress.updatedAt
    };
  }

  private mapChallengeFromDB(dbChallenge: any): Challenge {
    return {
      id: dbChallenge.id,
      companyId: dbChallenge.companyId,
      name: dbChallenge.name,
      description: dbChallenge.description,
      category: dbChallenge.category,
      type: dbChallenge.type,
      startDate: dbChallenge.startDate,
      endDate: dbChallenge.endDate,
      targetValue: dbChallenge.targetValue,
      targetType: dbChallenge.targetType,
      rewardPoints: dbChallenge.rewardPoints,
      rewardBadge: dbChallenge.rewardBadge,
      participants: dbChallenge.participants?.map(this.mapChallengeParticipantFromDB) || [],
      status: dbChallenge.status,
      metadata: dbChallenge.metadata,
      createdAt: dbChallenge.createdAt
    };
  }

  private mapChallengeParticipantFromDB(dbParticipant: any): ChallengeParticipant {
    return {
      id: dbParticipant.id,
      challengeId: dbParticipant.challengeId,
      userId: dbParticipant.userId,
      companyId: dbParticipant.companyId,
      currentValue: dbParticipant.currentValue,
      targetValue: dbParticipant.targetValue,
      progress: dbParticipant.progress,
      rank: dbParticipant.rank,
      completed: dbParticipant.completed,
      completedAt: dbParticipant.completedAt,
      joinedAt: dbParticipant.joinedAt,
      metadata: dbParticipant.metadata
    };
  }

  private mapLeaderboardFromDB(dbLeaderboard: any): Leaderboard {
    return {
      id: dbLeaderboard.id,
      companyId: dbLeaderboard.companyId,
      name: dbLeaderboard.name,
      description: dbLeaderboard.description,
      type: dbLeaderboard.type,
      timeframe: dbLeaderboard.timeframe,
      participants: dbLeaderboard.participants?.map(this.mapLeaderboardEntryFromDB) || [],
      lastUpdated: dbLeaderboard.lastUpdated,
      metadata: dbLeaderboard.metadata
    };
  }

  private mapLeaderboardEntryFromDB(dbEntry: any): LeaderboardEntry {
    return {
      id: dbEntry.id,
      leaderboardId: dbEntry.leaderboardId,
      userId: dbEntry.userId,
      companyId: dbEntry.companyId,
      rank: dbEntry.rank,
      value: dbEntry.value,
      displayName: dbEntry.displayName,
      avatar: dbEntry.avatar,
      metadata: dbEntry.metadata,
      lastUpdated: dbEntry.lastUpdated
    };
  }
}
