import { prisma } from '../prisma.js';
import { enhancedConversationalParser } from '../enhanced-conversational-parser.js';
import { conversationalParser } from '../conversational-parser.js';

// Enhanced interfaces for the conversational AI service
export interface ConversationContext {
  userId: string;
  companyId: string;
  tenantId: string;
  sessionId: string;
  conversationHistory: ConversationMessage[];
  userPreferences: UserPreferences;
  learningContext: LearningContext;
}

export interface ConversationMessage {
  id: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  content: string;
  parsedTransaction?: any;
  confidence?: number;
  metadata?: {
    intent?: string;
    entities?: Record<string, any>;
    sentiment?: 'positive' | 'negative' | 'neutral';
    language?: string;
  };
}

export interface UserPreferences {
  language: string;
  currency: string;
  dateFormat: string;
  autoConfirm: boolean;
  confidenceThreshold: number;
  preferredCategories: string[];
  excludedCategories: string[];
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

export interface LearningContext {
  frequentVendors: Array<{ name: string; count: number; lastUsed: Date }>;
  frequentCategories: Array<{ name: string; count: number; lastUsed: Date }>;
  commonAmounts: Array<{ amount: number; count: number; lastUsed: Date }>;
  userPatterns: Array<{ pattern: string; confidence: number; lastUsed: Date }>;
  industryContext: string;
  complianceRequirements: string[];
}

export interface EnhancedParsingResult {
  originalText: string;
  parsedTransaction: any;
  confidence: number;
  reasoning: string;
  suggestions: string[];
  validationErrors: string[];
  aiInsights: {
    suggestedTags: string[];
    riskFactors: string[];
    complianceNotes: string[];
    optimizationSuggestions: string[];
  };
  contextEnhancements: {
    vendorSuggestion?: string;
    categorySuggestion?: string;
    amountValidation?: string;
    dateCorrection?: string;
  };
  learningUpdates: {
    newVendor?: string;
    newCategory?: string;
    newPattern?: string;
  };
}

export interface ConversationResponse {
  message: string;
  parsedTransaction?: any;
  suggestions: string[];
  nextActions: string[];
  confidence: number;
  requiresConfirmation: boolean;
  learningApplied: boolean;
}

export class EnhancedConversationalAIService {
  private supportedLanguages = ['en', 'fr', 'rw', 'sw'];
  private defaultLanguage = 'en';
  private learningThreshold = 3; // Minimum occurrences to learn a pattern
  private isInitialized = false;

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      // Prevent multiple initializations
      if (this.isInitialized) {
        return;
      }
      this.isInitialized = true;
      
      // Initialize any required configurations
      console.log('Enhanced Conversational AI Service initialized');
    } catch (error) {
      console.error('Failed to initialize Enhanced Conversational AI Service:', error);
    }
  }

  /**
   * Main method to process natural language input with enhanced context awareness
   */
  async processNaturalLanguageInput(
    text: string,
    context: ConversationContext
  ): Promise<ConversationResponse> {
    try {
      // Step 1: Detect language and translate if necessary
      const detectedLanguage = this.detectLanguage(text);
      const translatedText = await this.translateIfNeeded(text, detectedLanguage, context.userPreferences.language);

      // Step 2: Enhance context with learning data
      const enhancedContext = await this.enhanceContextWithLearning(context);

      // Step 3: Parse with enhanced parser
      const parsingResult = await this.parseWithContext(translatedText, enhancedContext);

      // Step 4: Apply learning and generate suggestions
      const learningUpdates = await this.applyLearning(parsingResult, enhancedContext);
      const suggestions = this.generateContextualSuggestions(parsingResult, enhancedContext);

      // Step 5: Determine next actions
      const nextActions = this.determineNextActions(parsingResult, enhancedContext);

      // Step 6: Generate response message
      const responseMessage = this.generateResponseMessage(parsingResult, enhancedContext);

      return {
        message: responseMessage,
        parsedTransaction: parsingResult.parsedTransaction,
        suggestions,
        nextActions,
        confidence: parsingResult.confidence,
        requiresConfirmation: parsingResult.confidence < context.userPreferences.confidenceThreshold,
        learningApplied: learningUpdates.length > 0
      };
    } catch (error) {
      console.error('Error processing natural language input:', error);
      return this.createErrorResponse(text, error as Error);
    }
  }

  /**
   * Parse transaction with enhanced context awareness
   */
  private async parseWithContext(
    text: string,
    context: ConversationContext
  ): Promise<EnhancedParsingResult> {
    // Use enhanced parser for better accuracy
    const baseResult = await enhancedConversationalParser.parseNaturalLanguage(
      text,
      context.tenantId,
      context.companyId
    );

    // Enhance with context-aware improvements
    const enhancedResult = await this.applyContextEnhancements(baseResult, context);

    return enhancedResult;
  }

  /**
   * Apply context enhancements to parsing results
   */
  private async applyContextEnhancements(
    result: any,
    context: ConversationContext
  ): Promise<EnhancedParsingResult> {
    const enhancements = {
      vendorSuggestion: undefined as string | undefined,
      categorySuggestion: undefined as string | undefined,
      amountValidation: undefined as string | undefined,
      dateCorrection: undefined as string | undefined
    };

    // Vendor suggestion based on learning
    if (!result.parsedTransaction.metadata?.vendor) {
      const suggestedVendor = this.suggestVendorFromContext(result.originalText, context.learningContext);
      if (suggestedVendor) {
        enhancements.vendorSuggestion = suggestedVendor;
        result.parsedTransaction.metadata.vendor = suggestedVendor;
      }
    }

    // Category suggestion based on learning
    if (result.confidence < 80) {
      const suggestedCategory = this.suggestCategoryFromContext(result.originalText, context.learningContext);
      if (suggestedCategory && suggestedCategory !== result.parsedTransaction.category) {
        enhancements.categorySuggestion = suggestedCategory;
      }
    }

    // Amount validation
    const amountValidation = this.validateAmount(result.parsedTransaction.amount, context.learningContext);
    if (amountValidation) {
      enhancements.amountValidation = amountValidation;
    }

    // Date correction
    const dateCorrection = this.validateAndCorrectDate(result.parsedTransaction.date, context);
    if (dateCorrection) {
      enhancements.dateCorrection = dateCorrection;
    }

    return {
      ...result,
      contextEnhancements: enhancements
    };
  }

  /**
   * Enhance context with learning data from database
   */
  private async enhanceContextWithLearning(context: ConversationContext): Promise<ConversationContext> {
    try {
      // Get recent transactions for learning
      const recentTransactions = await prisma.transaction.findMany({
        where: {
          tenantId: context.tenantId,
          companyId: context.companyId,
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
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
        },
        take: 1000
      });

      // Extract learning patterns
      const learningContext = this.extractLearningPatterns(recentTransactions, context);

      return {
        ...context,
        learningContext
      };
    } catch (error) {
      console.error('Error enhancing context with learning:', error);
      return context;
    }
  }

  /**
   * Extract learning patterns from recent transactions
   */
  private extractLearningPatterns(transactions: any[], context: ConversationContext): LearningContext {
    const vendors = new Map<string, { count: number; lastUsed: Date }>();
    const categories = new Map<string, { count: number; lastUsed: Date }>();
    const amounts = new Map<number, { count: number; lastUsed: Date }>();
    const patterns = new Map<string, { confidence: number; lastUsed: Date }>();

    transactions.forEach(transaction => {
      // Extract vendor information
      if (transaction.linkedJournalEntry?.memo) {
        const vendor = this.extractVendorFromMemo(transaction.linkedJournalEntry.memo);
        if (vendor) {
          const existing = vendors.get(vendor) || { count: 0, lastUsed: new Date(0) };
          vendors.set(vendor, {
            count: existing.count + 1,
            lastUsed: new Date(Math.max(existing.lastUsed.getTime(), transaction.createdAt.getTime()))
          });
        }
      }

      // Extract category information
      const category = transaction.linkedJournalEntry?.lines[0]?.account?.name;
      if (category) {
        const existing = categories.get(category) || { count: 0, lastUsed: new Date(0) };
        categories.set(category, {
          count: existing.count + 1,
          lastUsed: new Date(Math.max(existing.lastUsed.getTime(), transaction.createdAt.getTime()))
        });
      }

      // Extract amount patterns
      const amount = Math.round(transaction.amount / 1000) * 1000; // Round to nearest 1000
      const existing = amounts.get(amount) || { count: 0, lastUsed: new Date(0) };
      amounts.set(amount, {
        count: existing.count + 1,
        lastUsed: new Date(Math.max(existing.lastUsed.getTime(), transaction.createdAt.getTime()))
      });
    });

    return {
      frequentVendors: Array.from(vendors.entries())
        .filter(([, data]) => data.count >= this.learningThreshold)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      frequentCategories: Array.from(categories.entries())
        .filter(([, data]) => data.count >= this.learningThreshold)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      commonAmounts: Array.from(amounts.entries())
        .filter(([, data]) => data.count >= this.learningThreshold)
        .map(([amount, data]) => ({ amount, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      userPatterns: Array.from(patterns.entries())
        .map(([pattern, data]) => ({ pattern, ...data }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10),
      industryContext: this.detectIndustryContext(transactions),
      complianceRequirements: this.detectComplianceRequirements(transactions)
    };
  }

  /**
   * Apply learning to improve future parsing
   */
  private async applyLearning(
    result: EnhancedParsingResult,
    context: ConversationContext
  ): Promise<string[]> {
    const updates: string[] = [];

    // Learn new vendor
    if (result.parsedTransaction.metadata?.vendor) {
      const vendor = result.parsedTransaction.metadata.vendor;
      const existingVendor = context.learningContext.frequentVendors.find(v => v.name === vendor);
      if (!existingVendor) {
        updates.push(`Learned new vendor: ${vendor}`);
      }
    }

    // Learn new category
    const category = result.parsedTransaction.category;
    const existingCategory = context.learningContext.frequentCategories.find(c => c.name === category);
    if (!existingCategory) {
      updates.push(`Learned new category: ${category}`);
    }

    // Learn new pattern
    const pattern = this.extractPattern(result.originalText);
    if (pattern) {
      updates.push(`Learned new pattern: ${pattern}`);
    }

    return updates;
  }

  /**
   * Generate contextual suggestions based on user history and preferences
   */
  private generateContextualSuggestions(
    result: EnhancedParsingResult,
    context: ConversationContext
  ): string[] {
    const suggestions: string[] = [];

    // Low confidence suggestions
    if (result.confidence < 70) {
      suggestions.push('Consider adding more context for better categorization');
    }

    // Vendor suggestions
    if (!result.parsedTransaction.metadata?.vendor) {
      const suggestedVendor = this.suggestVendorFromContext(result.originalText, context.learningContext);
      if (suggestedVendor) {
        suggestions.push(`Did you mean vendor: ${suggestedVendor}?`);
      }
    }

    // Category suggestions
    if (result.confidence < 80) {
      const suggestedCategory = this.suggestCategoryFromContext(result.originalText, context.learningContext);
      if (suggestedCategory && suggestedCategory !== result.parsedTransaction.category) {
        suggestions.push(`Consider using category: ${suggestedCategory}`);
      }
    }

    // Amount suggestions
    if (result.parsedTransaction.amount > 100000) {
      suggestions.push('Large transaction - consider adding approval workflow');
    }

    // Compliance suggestions
    if (result.parsedTransaction.metadata?.complianceFlags?.includes('tax')) {
      suggestions.push('Tax-related transaction - ensure proper documentation');
    }

    return suggestions;
  }

  /**
   * Determine next actions based on parsing results
   */
  private determineNextActions(
    result: EnhancedParsingResult,
    context: ConversationContext
  ): string[] {
    const actions: string[] = [];

    if (result.confidence >= context.userPreferences.confidenceThreshold) {
      actions.push('auto_create_journal_entry');
    }

    if (result.validationErrors.length > 0) {
      actions.push('request_correction');
    }

    if (result.parsedTransaction.metadata?.riskScore > 70) {
      actions.push('flag_for_review');
    }

    if (result.contextEnhancements.vendorSuggestion) {
      actions.push('confirm_vendor');
    }

    if (result.contextEnhancements.categorySuggestion) {
      actions.push('confirm_category');
    }

    return actions;
  }

  /**
   * Generate human-readable response message
   */
  private generateResponseMessage(
    result: EnhancedParsingResult,
    context: ConversationContext
  ): string {
    const language = context.userPreferences.language || this.defaultLanguage;
    
    if (result.confidence >= 90) {
      return this.getLocalizedMessage('high_confidence_success', language, {
        amount: result.parsedTransaction.amount,
        category: result.parsedTransaction.category,
        vendor: result.parsedTransaction.metadata?.vendor || 'N/A'
      });
    } else if (result.confidence >= 70) {
      return this.getLocalizedMessage('medium_confidence_success', language, {
        amount: result.parsedTransaction.amount,
        category: result.parsedTransaction.category
      });
    } else {
      return this.getLocalizedMessage('low_confidence_help', language, {
        suggestions: result.suggestions.slice(0, 2).join(', ')
      });
    }
  }

  /**
   * Detect language from text
   */
  private detectLanguage(text: string): string {
    // Simple language detection based on common words
    const lowerText = text.toLowerCase();
    
    if (/^(bonjour|salut|merci|oui|non)/.test(lowerText)) {
      return 'fr';
    }
    if (/^(murakoze|amahoro|yego|oya)/.test(lowerText)) {
      return 'rw';
    }
    if (/^(jambo|asante|ndiyo|hapana)/.test(lowerText)) {
      return 'sw';
    }
    
    return 'en';
  }

  /**
   * Translate text if needed
   */
  private async translateIfNeeded(
    text: string,
    fromLanguage: string,
    toLanguage: string
  ): Promise<string> {
    if (fromLanguage === toLanguage) {
      return text;
    }

    // For now, return original text
    // TODO: Implement actual translation service
    return text;
  }

  /**
   * Suggest vendor from context
   */
  private suggestVendorFromContext(text: string, learningContext: LearningContext): string | null {
    const lowerText = text.toLowerCase();
    
    for (const vendor of learningContext.frequentVendors) {
      if (lowerText.includes(vendor.name.toLowerCase())) {
        return vendor.name;
      }
    }
    
    return null;
  }

  /**
   * Suggest category from context
   */
  private suggestCategoryFromContext(text: string, learningContext: LearningContext): string | null {
    const lowerText = text.toLowerCase();
    
    for (const category of learningContext.frequentCategories) {
      if (lowerText.includes(category.name.toLowerCase())) {
        return category.name;
      }
    }
    
    return null;
  }

  /**
   * Validate amount against common patterns
   */
  private validateAmount(amount: number, learningContext: LearningContext): string | null {
    const commonAmount = learningContext.commonAmounts.find(a => 
      Math.abs(a.amount - amount) < 1000
    );
    
    if (commonAmount) {
      return `Amount ${amount} is similar to frequently used amount ${commonAmount.amount}`;
    }
    
    return null;
  }

  /**
   * Validate and correct date
   */
  private validateAndCorrectDate(date: Date, context: ConversationContext): string | null {
    const now = new Date();
    const diffDays = Math.abs((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) {
      return 'Date seems to be in the past. Did you mean a recent date?';
    }
    
    return null;
  }

  /**
   * Extract vendor from memo
   */
  private extractVendorFromMemo(memo: string): string | null {
    // Simple vendor extraction logic
    const vendorPatterns = [
      /(?:paid|bought|purchased)\s+(?:to|from|by)\s+([a-zA-Z\s&]+?)(?:\s+\d|$)/i,
      /(?:bill|invoice|receipt)\s+(?:from|by)\s+([a-zA-Z\s&]+?)(?:\s+\d|$)/i
    ];
    
    for (const pattern of vendorPatterns) {
      const match = memo.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Extract pattern from text
   */
  private extractPattern(text: string): string | null {
    // Extract common patterns for learning
    const patterns = [
      /paid\s+\d+\s+for\s+[a-zA-Z\s]+/i,
      /received\s+\d+\s+from\s+[a-zA-Z\s]+/i,
      /bought\s+[a-zA-Z\s]+\s+for\s+\d+/i
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return pattern.source;
      }
    }
    
    return null;
  }

  /**
   * Detect industry context from transactions
   */
  private detectIndustryContext(transactions: any[]): string {
    const categories = transactions.map(t => 
      t.linkedJournalEntry?.lines[0]?.account?.name
    ).filter(Boolean);
    
    const categoryCounts = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Simple industry detection
    if (categoryCounts['Inventory'] > 10) return 'retail';
    if (categoryCounts['Raw Materials'] > 5) return 'manufacturing';
    if (categoryCounts['Professional Services'] > 10) return 'services';
    
    return 'general';
  }

  /**
   * Detect compliance requirements
   */
  private detectComplianceRequirements(transactions: any[]): string[] {
    const requirements: string[] = [];
    
    const hasTaxTransactions = transactions.some(t => 
      t.linkedJournalEntry?.memo?.toLowerCase().includes('tax')
    );
    if (hasTaxTransactions) requirements.push('tax_compliance');
    
    const hasLargeTransactions = transactions.some(t => t.amount > 1000000);
    if (hasLargeTransactions) requirements.push('large_transaction_reporting');
    
    return requirements;
  }

  /**
   * Get localized message
   */
  private getLocalizedMessage(key: string, language: string, params: Record<string, any>): string {
    const messages = {
      en: {
        high_confidence_success: `Successfully parsed transaction: ${params.amount} ${params.category} from ${params.vendor}`,
        medium_confidence_success: `Parsed transaction: ${params.amount} ${params.category}. Please review for accuracy.`,
        low_confidence_help: `I'm not sure about this transaction. Suggestions: ${params.suggestions}`
      },
      fr: {
        high_confidence_success: `Transaction analysée avec succès: ${params.amount} ${params.category} de ${params.vendor}`,
        medium_confidence_success: `Transaction analysée: ${params.amount} ${params.category}. Veuillez vérifier l'exactitude.`,
        low_confidence_help: `Je ne suis pas sûr de cette transaction. Suggestions: ${params.suggestions}`
      },
      rw: {
        high_confidence_success: `Ibikorwa byagenze neza: ${params.amount} ${params.category} kuri ${params.vendor}`,
        medium_confidence_success: `Ibikorwa byagenze: ${params.amount} ${params.category}. Reba ko ari ukuri.`,
        low_confidence_help: `Sinzi neza ibi bikorwa. Inama: ${params.suggestions}`
      }
    };
    
    return messages[language as keyof typeof messages]?.[key as keyof typeof messages.en] || 
           messages.en[key as keyof typeof messages.en] || 
           'Message not found';
  }

  /**
   * Create error response
   */
  private createErrorResponse(text: string, error: Error): ConversationResponse {
    return {
      message: `Sorry, I couldn't process that transaction. Error: ${error.message}`,
      suggestions: ['Try rephrasing your description', 'Include the amount and vendor name'],
      nextActions: ['request_correction'],
      confidence: 0,
      requiresConfirmation: true,
      learningApplied: false
    };
  }

  /**
   * Batch process multiple transactions with context
   */
  async batchProcessTransactions(
    texts: string[],
    context: ConversationContext
  ): Promise<ConversationResponse[]> {
    const results: ConversationResponse[] = [];
    
    for (const text of texts) {
      try {
        const result = await this.processNaturalLanguageInput(text, context);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process: ${text}`, error);
        results.push(this.createErrorResponse(text, error as Error));
      }
    }
    
    return results;
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    userId: string,
    companyId: string,
    limit: number = 50
  ): Promise<ConversationMessage[]> {
    try {
      // TODO: Implement conversation history storage and retrieval
      return [];
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    try {
      // TODO: Implement user preferences storage
      console.log('Updating user preferences:', preferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
    }
  }

  /**
   * Get learning insights
   */
  async getLearningInsights(
    userId: string,
    companyId: string
  ): Promise<LearningContext> {
    try {
      // TODO: Implement learning insights retrieval
      return {
        frequentVendors: [],
        frequentCategories: [],
        commonAmounts: [],
        userPatterns: [],
        industryContext: 'general',
        complianceRequirements: []
      };
    } catch (error) {
      console.error('Error getting learning insights:', error);
      return {
        frequentVendors: [],
        frequentCategories: [],
        commonAmounts: [],
        userPatterns: [],
        industryContext: 'general',
        complianceRequirements: []
      };
    }
  }
}

// Singleton instance to prevent multiple initializations
let enhancedConversationalAIServiceInstance: EnhancedConversationalAIService | null = null;

export const enhancedConversationalAIService = (() => {
  if (!enhancedConversationalAIServiceInstance) {
    enhancedConversationalAIServiceInstance = new EnhancedConversationalAIService();
  }
  return enhancedConversationalAIServiceInstance;
})();
