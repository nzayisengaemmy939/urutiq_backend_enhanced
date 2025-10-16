import { prisma } from './prisma.js';

export interface AccuracyMetrics {
  totalTransactions: number;
  successfulParses: number;
  failedParses: number;
  averageConfidence: number;
  accuracyRate: number;
  commonErrors: string[];
  improvementSuggestions: string[];
}

export interface LearningData {
  originalText: string;
  parsedResult: any;
  userFeedback: {
    isCorrect: boolean;
    corrections?: any;
    confidence: number;
    comments?: string;
  };
  timestamp: Date;
  tenantId: string;
  companyId: string;
}

export interface PatternAnalysis {
  pattern: string;
  frequency: number;
  successRate: number;
  suggestedImprovements: string[];
  category: string;
}

export class AIAccuracyService {
  private learningCache: Map<string, LearningData[]> = new Map();
  private patternCache: Map<string, PatternAnalysis> = new Map();
  private accuracyThreshold: number = 0.85;

  constructor() {
    this.initializeLearning();
  }

  private async initializeLearning() {
    try {
      // Load existing learning data from database
      const existingData = await prisma.aiLearningData.findMany({
        take: 1000, // Limit to prevent memory issues
        orderBy: { createdAt: 'desc' }
      });

      // Group by tenant for efficient caching
      for (const data of existingData) {
        const key = `${data.tenantId}-${data.companyId}`;
        if (!this.learningCache.has(key)) {
          this.learningCache.set(key, []);
        }
        this.learningCache.get(key)!.push({
          originalText: data.originalText,
          parsedResult: JSON.parse(data.parsedResult),
          userFeedback: JSON.parse(data.userFeedback),
          timestamp: data.createdAt,
          tenantId: data.tenantId,
          companyId: data.companyId
        });
      }

      // Analyze patterns
      await this.analyzePatterns();
    } catch (error) {
      console.warn('Failed to initialize learning data:', error);
    }
  }

  async recordLearningData(data: LearningData): Promise<void> {
    try {
      // Store in database
      await prisma.aiLearningData.create({
        data: {
          tenantId: data.tenantId,
          companyId: data.companyId,
          originalText: data.originalText,
          parsedResult: JSON.stringify(data.parsedResult),
          userFeedback: JSON.stringify(data.userFeedback),
          confidence: data.userFeedback.confidence,
          isCorrect: data.userFeedback.isCorrect,
          createdAt: data.timestamp
        }
      });

      // Update cache
      const key = `${data.tenantId}-${data.companyId}`;
      if (!this.learningCache.has(key)) {
        this.learningCache.set(key, []);
      }
      this.learningCache.get(key)!.unshift(data); // Add to beginning

      // Keep cache size manageable
      const cache = this.learningCache.get(key)!;
      if (cache.length > 1000) {
        cache.splice(1000); // Remove oldest entries
      }

      // Trigger pattern analysis
      await this.analyzePatterns();
    } catch (error) {
      console.error('Failed to record learning data:', error);
    }
  }

  async getAccuracyMetrics(tenantId: string, companyId: string): Promise<AccuracyMetrics> {
    try {
      const data = await prisma.aiLearningData.findMany({
        where: { tenantId, companyId },
        orderBy: { createdAt: 'desc' },
        take: 1000
      });

      const totalTransactions = data.length;
      const successfulParses = data.filter(d => d.isCorrect).length;
      const failedParses = totalTransactions - successfulParses;
      const averageConfidence = data.reduce((sum, d) => sum + d.confidence, 0) / totalTransactions;
      const accuracyRate = totalTransactions > 0 ? successfulParses / totalTransactions : 0;

      // Analyze common errors
      const errorPatterns = new Map<string, number>();
      for (const item of data.filter(d => !d.isCorrect)) {
        const feedback = JSON.parse(item.userFeedback);
        if (feedback.comments) {
          const errorKey = this.extractErrorKey(feedback.comments);
          errorPatterns.set(errorKey, (errorPatterns.get(errorKey) || 0) + 1);
        }
      }

      const commonErrors = Array.from(errorPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([error, count]) => `${error} (${count} times)`);

      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(data);

      return {
        totalTransactions,
        successfulParses,
        failedParses,
        averageConfidence,
        accuracyRate,
        commonErrors,
        improvementSuggestions
      };
    } catch (error) {
      console.error('Failed to get accuracy metrics:', error);
      return {
        totalTransactions: 0,
        successfulParses: 0,
        failedParses: 0,
        averageConfidence: 0,
        accuracyRate: 0,
        commonErrors: [],
        improvementSuggestions: []
      };
    }
  }

  private extractErrorKey(comment: string): string {
    const lowerComment = comment.toLowerCase();
    
    if (lowerComment.includes('category') || lowerComment.includes('classification')) {
      return 'Category Classification Error';
    }
    if (lowerComment.includes('amount') || lowerComment.includes('value')) {
      return 'Amount Parsing Error';
    }
    if (lowerComment.includes('date') || lowerComment.includes('time')) {
      return 'Date Parsing Error';
    }
    if (lowerComment.includes('vendor') || lowerComment.includes('supplier')) {
      return 'Vendor Extraction Error';
    }
    if (lowerComment.includes('balance') || lowerComment.includes('double-entry')) {
      return 'Double-Entry Bookkeeping Error';
    }
    
    return 'General Parsing Error';
  }

  private generateImprovementSuggestions(data: any[]): string[] {
    const suggestions: string[] = [];
    const recentData = data.slice(0, 100); // Last 100 transactions

    // Analyze confidence distribution
    const lowConfidenceCount = recentData.filter(d => d.confidence < 0.7).length;
    if (lowConfidenceCount > recentData.length * 0.3) {
      suggestions.push('Consider improving pattern recognition for low-confidence transactions');
    }

    // Analyze error patterns
    const categoryErrors = recentData.filter(d => !d.isCorrect && 
      JSON.parse(d.userFeedback).comments?.toLowerCase().includes('category')).length;
    if (categoryErrors > recentData.length * 0.2) {
      suggestions.push('Enhance category detection algorithms');
    }

    // Analyze amount errors
    const amountErrors = recentData.filter(d => !d.isCorrect && 
      JSON.parse(d.userFeedback).comments?.toLowerCase().includes('amount')).length;
    if (amountErrors > recentData.length * 0.15) {
      suggestions.push('Improve amount extraction and validation');
    }

    // Analyze vendor extraction
    const vendorErrors = recentData.filter(d => !d.isCorrect && 
      JSON.parse(d.userFeedback).comments?.toLowerCase().includes('vendor')).length;
    if (vendorErrors > recentData.length * 0.1) {
      suggestions.push('Enhance vendor/customer name extraction');
    }

    return suggestions;
  }

  async analyzePatterns(): Promise<PatternAnalysis[]> {
    try {
      const allData = await prisma.aiLearningData.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5000 // Analyze last 5000 transactions
      });

      const patterns = new Map<string, PatternAnalysis>();

      for (const data of allData) {
        const text = data.originalText.toLowerCase();
        
        // Extract common patterns
        const extractedPatterns = this.extractPatterns(text);
        
        for (const pattern of extractedPatterns) {
          if (!patterns.has(pattern)) {
            patterns.set(pattern, {
              pattern,
              frequency: 0,
              successRate: 0,
              suggestedImprovements: [],
              category: this.categorizePattern(pattern)
            });
          }

          const patternData = patterns.get(pattern)!;
          patternData.frequency++;
          
          if (data.isCorrect) {
            patternData.successRate = (patternData.successRate * (patternData.frequency - 1) + 1) / patternData.frequency;
          } else {
            patternData.successRate = (patternData.successRate * (patternData.frequency - 1)) / patternData.frequency;
          }
        }
      }

      // Generate improvements for low-success patterns
      for (const [pattern, analysis] of patterns) {
        if (analysis.frequency > 5 && analysis.successRate < 0.8) {
          analysis.suggestedImprovements = this.generatePatternImprovements(pattern, analysis);
        }
      }

      // Update cache
      this.patternCache.clear();
      for (const [pattern, analysis] of patterns) {
        this.patternCache.set(pattern, analysis);
      }

      return Array.from(patterns.values());
    } catch (error) {
      console.error('Failed to analyze patterns:', error);
      return [];
    }
  }

  private extractPatterns(text: string): string[] {
    const patterns: string[] = [];

    // Amount patterns
    const amountMatches = text.match(/\d+(?:,\d{3})*(?:\.\d{2})?/g);
    if (amountMatches) {
      patterns.push(`amount_${amountMatches[0].length}_digits`);
    }

    // Currency patterns
    const currencyMatches = text.match(/(RWF|USD|EUR|GBP|JPY|INR)/gi);
    if (currencyMatches) {
      patterns.push(`currency_${currencyMatches[0].toLowerCase()}`);
    }

    // Date patterns
    const dateMatches = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})|(\d{1,2})-(\d{1,2})-(\d{4})/g);
    if (dateMatches) {
      patterns.push('date_formatted');
    }

    // Action word patterns
    const actionWords = ['paid', 'received', 'bought', 'sold', 'transferred', 'deposited', 'withdrew'];
    for (const word of actionWords) {
      if (text.includes(word)) {
        patterns.push(`action_${word}`);
      }
    }

    // Category patterns
    const categoryWords = ['utilities', 'rent', 'supplies', 'services', 'transportation', 'insurance', 'taxes'];
    for (const word of categoryWords) {
      if (text.includes(word)) {
        patterns.push(`category_${word}`);
      }
    }

    // Length patterns
    if (text.length < 20) {
      patterns.push('text_short');
    } else if (text.length < 50) {
      patterns.push('text_medium');
    } else {
      patterns.push('text_long');
    }

    return patterns;
  }

  private categorizePattern(pattern: string): string {
    if (pattern.startsWith('amount_')) return 'amount';
    if (pattern.startsWith('currency_')) return 'currency';
    if (pattern.startsWith('date_')) return 'date';
    if (pattern.startsWith('action_')) return 'action';
    if (pattern.startsWith('category_')) return 'category';
    if (pattern.startsWith('text_')) return 'text';
    return 'other';
  }

  private generatePatternImprovements(pattern: string, analysis: PatternAnalysis): string[] {
    const improvements: string[] = [];

    if (pattern.startsWith('amount_')) {
      if (analysis.successRate < 0.7) {
        improvements.push('Enhance amount extraction regex patterns');
        improvements.push('Add validation for amount ranges');
      }
    }

    if (pattern.startsWith('action_')) {
      if (analysis.successRate < 0.8) {
        improvements.push('Expand action word vocabulary');
        improvements.push('Add context-aware action detection');
      }
    }

    if (pattern.startsWith('category_')) {
      if (analysis.successRate < 0.75) {
        improvements.push('Improve category classification algorithms');
        improvements.push('Add industry-specific category mappings');
      }
    }

    if (pattern.startsWith('text_short')) {
      if (analysis.successRate < 0.6) {
        improvements.push('Enhance parsing for short descriptions');
        improvements.push('Add more context extraction for brief inputs');
      }
    }

    return improvements;
  }

  async getPatternSuggestions(text: string): Promise<string[]> {
    try {
      const patterns = this.extractPatterns(text.toLowerCase());
      const suggestions: string[] = [];

      for (const pattern of patterns) {
        const analysis = this.patternCache.get(pattern);
        if (analysis && analysis.frequency > 10 && analysis.successRate < 0.8) {
          suggestions.push(...analysis.suggestedImprovements);
        }
      }

      return [...new Set(suggestions)]; // Remove duplicates
    } catch (error) {
      console.error('Failed to get pattern suggestions:', error);
      return [];
    }
  }

  async getLearningRecommendations(tenantId: string, companyId: string): Promise<string[]> {
    try {
      const metrics = await this.getAccuracyMetrics(tenantId, companyId);
      const recommendations: string[] = [];

      if (metrics.accuracyRate < 0.9) {
        recommendations.push('Consider reviewing and correcting recent transactions to improve AI learning');
      }

      if (metrics.averageConfidence < 0.8) {
        recommendations.push('AI confidence is low - consider providing more detailed transaction descriptions');
      }

      if (metrics.commonErrors.length > 0) {
        recommendations.push(`Focus on improving: ${metrics.commonErrors[0]}`);
      }

      if (metrics.totalTransactions < 50) {
        recommendations.push('More transaction data needed for optimal AI learning');
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to get learning recommendations:', error);
      return [];
    }
  }

  async exportLearningData(tenantId: string, companyId: string): Promise<any[]> {
    try {
      const data = await prisma.aiLearningData.findMany({
        where: { tenantId, companyId },
        orderBy: { createdAt: 'desc' }
      });

      return data.map(item => ({
        id: item.id,
        originalText: item.originalText,
        parsedResult: JSON.parse(item.parsedResult),
        userFeedback: JSON.parse(item.userFeedback),
        confidence: item.confidence,
        isCorrect: item.isCorrect,
        createdAt: item.createdAt
      }));
    } catch (error) {
      console.error('Failed to export learning data:', error);
      return [];
    }
  }

  async clearLearningData(tenantId: string, companyId: string): Promise<void> {
    try {
      await prisma.aiLearningData.deleteMany({
        where: { tenantId, companyId }
      });

      // Clear cache
      const key = `${tenantId}-${companyId}`;
      this.learningCache.delete(key);
    } catch (error) {
      console.error('Failed to clear learning data:', error);
    }
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<any> {
    try {
      const totalRecords = await prisma.aiLearningData.count();
      const recentRecords = await prisma.aiLearningData.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });

      const averageConfidence = await prisma.aiLearningData.aggregate({
        _avg: { confidence: true }
      });

      const successRate = await prisma.aiLearningData.aggregate({
        _count: { id: true },
        where: { isCorrect: true }
      });

      return {
        totalRecords,
        recentRecords,
        averageConfidence: averageConfidence._avg.confidence || 0,
        successRate: totalRecords > 0 ? successRate._count.id / totalRecords : 0,
        cacheSize: this.learningCache.size,
        patternCacheSize: this.patternCache.size
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {};
    }
  }
}

export const aiAccuracyService = new AIAccuracyService();
