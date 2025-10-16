import { prisma } from '../prisma.js';
import { enhancedConversationalParser } from '../enhanced-conversational-parser.js';
export class EnhancedConversationalAIService {
    supportedLanguages = ['en', 'fr', 'rw', 'sw'];
    defaultLanguage = 'en';
    learningThreshold = 3; // Minimum occurrences to learn a pattern
    isInitialized = false;
    constructor() {
        this.initializeService();
    }
    async initializeService() {
        try {
            // Prevent multiple initializations
            if (this.isInitialized) {
                return;
            }
            this.isInitialized = true;
            // Initialize any required configurations
            console.log('Enhanced Conversational AI Service initialized');
        }
        catch (error) {
            console.error('Failed to initialize Enhanced Conversational AI Service:', error);
        }
    }
    /**
     * Main method to process natural language input with enhanced context awareness
     */
    async processNaturalLanguageInput(text, context) {
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
        }
        catch (error) {
            console.error('Error processing natural language input:', error);
            return this.createErrorResponse(text, error);
        }
    }
    /**
     * Parse transaction with enhanced context awareness
     */
    async parseWithContext(text, context) {
        // Use enhanced parser for better accuracy
        const baseResult = await enhancedConversationalParser.parseNaturalLanguage(text, context.tenantId, context.companyId);
        // Enhance with context-aware improvements
        const enhancedResult = await this.applyContextEnhancements(baseResult, context);
        return enhancedResult;
    }
    /**
     * Apply context enhancements to parsing results
     */
    async applyContextEnhancements(result, context) {
        const enhancements = {
            vendorSuggestion: undefined,
            categorySuggestion: undefined,
            amountValidation: undefined,
            dateCorrection: undefined
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
    async enhanceContextWithLearning(context) {
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
        }
        catch (error) {
            console.error('Error enhancing context with learning:', error);
            return context;
        }
    }
    /**
     * Extract learning patterns from recent transactions
     */
    extractLearningPatterns(transactions, context) {
        const vendors = new Map();
        const categories = new Map();
        const amounts = new Map();
        const patterns = new Map();
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
    async applyLearning(result, context) {
        const updates = [];
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
    generateContextualSuggestions(result, context) {
        const suggestions = [];
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
    determineNextActions(result, context) {
        const actions = [];
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
    generateResponseMessage(result, context) {
        const language = context.userPreferences.language || this.defaultLanguage;
        if (result.confidence >= 90) {
            return this.getLocalizedMessage('high_confidence_success', language, {
                amount: result.parsedTransaction.amount,
                category: result.parsedTransaction.category,
                vendor: result.parsedTransaction.metadata?.vendor || 'N/A'
            });
        }
        else if (result.confidence >= 70) {
            return this.getLocalizedMessage('medium_confidence_success', language, {
                amount: result.parsedTransaction.amount,
                category: result.parsedTransaction.category
            });
        }
        else {
            return this.getLocalizedMessage('low_confidence_help', language, {
                suggestions: result.suggestions.slice(0, 2).join(', ')
            });
        }
    }
    /**
     * Detect language from text
     */
    detectLanguage(text) {
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
    async translateIfNeeded(text, fromLanguage, toLanguage) {
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
    suggestVendorFromContext(text, learningContext) {
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
    suggestCategoryFromContext(text, learningContext) {
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
    validateAmount(amount, learningContext) {
        const commonAmount = learningContext.commonAmounts.find(a => Math.abs(a.amount - amount) < 1000);
        if (commonAmount) {
            return `Amount ${amount} is similar to frequently used amount ${commonAmount.amount}`;
        }
        return null;
    }
    /**
     * Validate and correct date
     */
    validateAndCorrectDate(date, context) {
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
    extractVendorFromMemo(memo) {
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
    extractPattern(text) {
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
    detectIndustryContext(transactions) {
        const categories = transactions.map(t => t.linkedJournalEntry?.lines[0]?.account?.name).filter(Boolean);
        const categoryCounts = categories.reduce((acc, cat) => {
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});
        // Simple industry detection
        if (categoryCounts['Inventory'] > 10)
            return 'retail';
        if (categoryCounts['Raw Materials'] > 5)
            return 'manufacturing';
        if (categoryCounts['Professional Services'] > 10)
            return 'services';
        return 'general';
    }
    /**
     * Detect compliance requirements
     */
    detectComplianceRequirements(transactions) {
        const requirements = [];
        const hasTaxTransactions = transactions.some(t => t.linkedJournalEntry?.memo?.toLowerCase().includes('tax'));
        if (hasTaxTransactions)
            requirements.push('tax_compliance');
        const hasLargeTransactions = transactions.some(t => t.amount > 1000000);
        if (hasLargeTransactions)
            requirements.push('large_transaction_reporting');
        return requirements;
    }
    /**
     * Get localized message
     */
    getLocalizedMessage(key, language, params) {
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
        return messages[language]?.[key] ||
            messages.en[key] ||
            'Message not found';
    }
    /**
     * Create error response
     */
    createErrorResponse(text, error) {
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
    async batchProcessTransactions(texts, context) {
        const results = [];
        for (const text of texts) {
            try {
                const result = await this.processNaturalLanguageInput(text, context);
                results.push(result);
            }
            catch (error) {
                console.error(`Failed to process: ${text}`, error);
                results.push(this.createErrorResponse(text, error));
            }
        }
        return results;
    }
    /**
     * Get conversation history
     */
    async getConversationHistory(userId, companyId, limit = 50) {
        try {
            // TODO: Implement conversation history storage and retrieval
            return [];
        }
        catch (error) {
            console.error('Error getting conversation history:', error);
            return [];
        }
    }
    /**
     * Update user preferences
     */
    async updateUserPreferences(userId, preferences) {
        try {
            // TODO: Implement user preferences storage
            console.log('Updating user preferences:', preferences);
        }
        catch (error) {
            console.error('Error updating user preferences:', error);
        }
    }
    /**
     * Get learning insights
     */
    async getLearningInsights(userId, companyId) {
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
        }
        catch (error) {
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
let enhancedConversationalAIServiceInstance = null;
export const enhancedConversationalAIService = (() => {
    if (!enhancedConversationalAIServiceInstance) {
        enhancedConversationalAIServiceInstance = new EnhancedConversationalAIService();
    }
    return enhancedConversationalAIServiceInstance;
})();
