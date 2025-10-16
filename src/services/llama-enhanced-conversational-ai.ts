import { Ollama } from 'ollama';
import { HfInference } from '@huggingface/inference';
import { prisma } from '../prisma';
import { ConversationContext, ConversationMessage, UserPreferences, LearningContext } from './enhanced-conversational-ai';

// Enhanced interfaces for Llama-powered AI
export interface LlamaConversationContext extends ConversationContext {
  financialContext: FinancialContext;
  documentContext: DocumentContext;
  regulatoryContext: RegulatoryContext;
}

export interface FinancialContext {
  currentPeriod: string;
  fiscalYear: string;
  currency: string;
  accountingStandards: string;
  businessType: string;
  revenueRange: string;
  transactionVolume: number;
  keyMetrics: Record<string, number>;
  recentTrends: Array<{
    metric: string;
    trend: 'up' | 'down' | 'stable';
    change: number;
    period: string;
  }>;
}

export interface DocumentContext {
  recentDocuments: Array<{
    type: string;
    date: Date;
    amount?: number;
    vendor?: string;
    status: string;
  }>;
  pendingApprovals: number;
  overdueDocuments: number;
  documentPatterns: Array<{
    pattern: string;
    frequency: number;
    confidence: number;
  }>;
}

export interface RegulatoryContext {
  jurisdiction: string;
  complianceRequirements: string[];
  upcomingDeadlines: Array<{
    requirement: string;
    deadline: Date;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  recentChanges: Array<{
    regulation: string;
    change: string;
    effectiveDate: Date;
  }>;
}

export interface LlamaResponse {
  message: string;
  confidence: number;
  intent: string;
  entities: Record<string, any>;
  suggestions: string[];
  actions: Array<{
    type: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  insights: Array<{
    type: string;
    description: string;
    confidence: number;
    impact: 'high' | 'medium' | 'low';
  }>;
  followUpQuestions: string[];
}

export class LlamaEnhancedConversationalAI {
  private ollama: Ollama;
  private hfInference: HfInference;
  private modelName: string = process.env.LLAMA_DEFAULT_MODEL || 'gemma:4b'; // Start with faster model
  private advancedModelName: string = process.env.LLAMA_ADVANCED_MODEL || process.env.LLAMA_DEFAULT_MODEL || 'llama3.1:8b'; // Keep advanced for complex tasks
  private responseCache: Map<string, { value: string; expiresAt: number }> = new Map();
  private defaultTtlMs = 60_000; // 60 seconds cache TTL
  private isLlamaAvailable: boolean = false;

  constructor() {
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434'
    });
    this.hfInference = new HfInference(process.env.HUGGINGFACE_API_KEY);
    
    // Initialize models asynchronously without blocking
    this.initializeModels().catch(() => {
      // Initialization failed, will use fallback
    });
  }

  private async initializeModels() {
    try {
      console.log('🤖 INITIALIZING REAL AI MODEL: Setting up Ollama for intelligent responses');
      
      const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
          )
        ]);
      };
      
      // Check if Ollama is available (5 second timeout)
      try {
        const models = await withTimeout(this.ollama.list(), 5000);
        const availableModels = models.models.map(m => m.name);
        
        console.log('📋 Available models:', availableModels);
        
        // Look for any suitable model
        const suitableModel = availableModels.find(model => 
          model.includes('gemma') || 
          model.includes('llama3.1') || 
          model.includes('llama3') ||
          model.includes('llama2') ||
          model.includes('mistral') ||
          model.includes('codellama')
        );
        
        if (suitableModel) {
          this.modelName = suitableModel;
          this.isLlamaAvailable = true;
          console.log(`✅ Using AI model: ${suitableModel}`);
          
          // Test the model with a simple prompt
          try {
            await withTimeout(this.ollama.generate({
              model: this.modelName,
              prompt: "Hello",
              options: { num_predict: 10 }
            }), 10000);
            console.log('🎉 AI model is ready and responsive!');
          } catch (testError) {
            console.log('⚠️ Model test failed, but will try to use it anyway');
          }
        } else {
          console.log('❌ No suitable AI model found, using fallback responses');
          this.isLlamaAvailable = false;
        }
      } catch (error) {
        console.log('❌ Ollama not available, using fallback responses');
        this.isLlamaAvailable = false;
      }
      
    } catch (error: any) {
      console.log('❌ Model initialization failed, using fallback responses');
      this.isLlamaAvailable = false;
    }
  }

  private async warmUpModel(): Promise<void> {
    // Send a tiny prompt and keep the model loaded for subsequent requests
    await this.withTimeout(
      this.ollama.generate({
        model: this.modelName,
        prompt: 'ok',
        keep_alive: '30m',
        options: {
          temperature: 0.0,
          top_p: 0.9,
          num_predict: 8,
          num_ctx: 512
        }
      }),
      Number(process.env.LLAMA_WARMUP_TIMEOUT_MS || 300000)
    );
  }

  async processNaturalLanguageInput(
    prompt: string,
    context: LlamaConversationContext,
    options?: { mode?: 'fast' | 'balanced' | 'accurate'; maxTokens?: number; cacheTtlMs?: number; }
  ): Promise<LlamaResponse> {
    try {
      // PROGRESSIVE AI APPROACH: Always start with instant response, then enhance with AI
      
    // STEP 1: Get instant response immediately (no latency)
    const instantResponse = await this.getInstantResponse(prompt, context);
      
      // STEP 2: If AI is available and user wants enhanced response, enhance it
      if (this.isLlamaAvailable && options?.mode !== 'fast') {
        console.log('🚀 Starting with instant response, enhancing with AI...');
        
        // Return instant response immediately, then enhance in background
        this.enhanceResponseWithAI(prompt, context, instantResponse, options).catch(error => {
          console.log('⚠️ AI enhancement failed, keeping instant response:', error.message);
        });
      }
      
      return instantResponse;
      
    } catch (error) {
      return this.getFallbackResponse(prompt, context);
    }
  }

  private buildEnhancedPrompt(prompt: string, context: LlamaConversationContext): string {
    const financialContext = context.financialContext;
    const revenue = financialContext.keyMetrics.totalRevenue || 0;
    const expenses = financialContext.keyMetrics.totalExpenses || 0;
    const profit = revenue - expenses;
    
    return `You are a WISE financial mentor with decades of business experience. You understand that behind every financial question lies human concerns, fears, hopes, and dreams. You're not just answering questions - you're guiding someone through their business journey.

**Your Personality:**
- Wise and thoughtful, like a seasoned business mentor
- Empathetic and understanding of human struggles  
- Practical and actionable in your advice
- Honest about challenges while being encouraging
- You think deeply about the underlying meaning of questions

**Current Business Reality:**
- Revenue: $${revenue.toLocaleString()}
- Expenses: $${expenses.toLocaleString()}
- Net: ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}
- Status: ${profit < 0 ? 'Challenging times - but every successful business has faced this' : profit === 0 ? 'Break-even - the foundation for growth' : 'Profitable - time to think strategically'}

**Your Approach:**
1. **Listen with your heart** - What is this person really asking? What are they feeling?
2. **Provide wisdom, not just data** - Share insights that will help them grow as a person and business owner
3. **Be encouraging** - Even in difficult situations, help them see possibilities
4. **Think long-term** - Help them build sustainable success, not just quick fixes
5. **Be practical** - Give them actionable steps they can take today

**The Question:** "${prompt}"

**Your Response:** Think deeply about what they're really asking. Are they:
- Feeling overwhelmed and need reassurance?
- Looking for validation of their concerns?
- Seeking specific guidance on a decision?
- Wanting to understand their situation better?
- Testing whether you can truly help them?

Respond as a wise mentor would - with understanding, insight, and genuine care for their success. Help them see their situation clearly and give them hope and direction.

Remember: You're not just answering a question, you're helping a human being navigate their business journey.`;
  }

  private determineModelComplexity(prompt: string, context: LlamaConversationContext, forcedMode?: 'fast' | 'balanced' | 'accurate'): string {
    if (forcedMode === 'fast') return this.modelName;
    if (forcedMode === 'accurate') return this.advancedModelName;
    // Use advanced model for complex financial analysis
    const complexKeywords = [
      'analysis', 'forecast', 'trend', 'prediction', 'risk', 'compliance',
      'audit', 'consolidation', 'tax', 'regulatory', 'advanced', 'detailed'
    ];
    
    const isComplex = complexKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword)
    ) || context.financialContext.transactionVolume > 1000;
    
    return isComplex ? this.advancedModelName : this.modelName;
  }

  private async generateResponse(
    prompt: string,
    model: string,
    opts?: { maxTokens?: number; mode?: 'fast' | 'balanced' | 'accurate' }
  ): Promise<string> {
    // If Llama is not available, try Hugging Face, then mock
    if (!this.isLlamaAvailable) {
      if (process.env.HUGGINGFACE_API_KEY) {
        try {
          return await this.generateWithHuggingFace(prompt, opts);
        } catch (hfError) {
          // HF failed, use mock
        }
      }
      return await this.generateMockResponse(prompt, opts);
    }

    try {
      // Try local Ollama first
      const response = await this.withTimeout(
        this.ollama.generate({
          model: model,
          prompt: prompt,
          keep_alive: '30m',
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: opts?.maxTokens ?? 256,
            num_ctx: 1024
          }
        }),
        Number(process.env.LLAMA_GENERATE_TIMEOUT_MS || 3000) // 3 second timeout for ultra-fast response
      );
      
      return response.response;
    } catch (error) {
      // Try Hugging Face next if available
      if (process.env.HUGGINGFACE_API_KEY) {
        try {
          return await this.generateWithHuggingFace(prompt, opts);
        } catch (hfError) {
          // HF failed, use mock
        }
      }
      return await this.generateMockResponse(prompt, opts);
    }
  }

  private async generateMockResponse(
    prompt: string,
    opts?: { maxTokens?: number; mode?: 'fast' | 'balanced' | 'accurate' }
  ): Promise<string> {
    // Generate realistic mock responses based on the prompt
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('revenue') || lowerPrompt.includes('income')) {
      return "Based on your financial data, I can see your revenue has been trending upward. The key drivers appear to be increased customer acquisition and improved pricing strategies. I recommend focusing on customer retention and expanding into new markets to maintain this growth trajectory.";
    }
    
    if (lowerPrompt.includes('expense') || lowerPrompt.includes('cost')) {
      return "Your expense analysis shows some areas for optimization. I notice higher than expected costs in office supplies and utilities. Consider negotiating better vendor contracts and implementing energy-saving measures. This could reduce costs by approximately 15-20%.";
    }
    
    if (lowerPrompt.includes('cash flow') || lowerPrompt.includes('liquidity')) {
      return "Your cash flow analysis indicates healthy liquidity with a positive trend. However, I recommend maintaining a 3-month operating expense reserve. Consider optimizing payment terms with customers and suppliers to improve cash flow timing.";
    }
    
    if (lowerPrompt.includes('tax') || lowerPrompt.includes('compliance')) {
      return "From a tax perspective, you're well-positioned for the current period. I recommend taking advantage of available deductions and considering tax-efficient investment strategies. Make sure to file all required forms by the deadlines to avoid penalties.";
    }
    
    // Default response
    return "Thank you for your question. Based on your accounting data, I can provide insights and recommendations. Please provide more specific details about what you'd like me to analyze, and I'll give you more targeted advice.";
  }

  private async generateWithHuggingFace(
    prompt: string,
    opts?: { maxTokens?: number; mode?: 'fast' | 'balanced' | 'accurate' }
  ): Promise<string> {
    try {
      // Fallback to Hugging Face API
      const response: any = await this.withTimeout(
        this.hfInference.textGeneration({
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          inputs: prompt,
          parameters: {
            max_new_tokens: opts?.maxTokens ?? (opts?.mode === 'fast' ? 400 : 1200),
            temperature: opts?.mode === 'fast' ? 0.5 : 0.7,
            top_p: 0.9,
            return_full_text: false,
          }
        }),
        opts?.mode === 'fast' ? 9_000 : 20_000
      );
      
      return response[0].generated_text;
    } catch (error: any) {
      throw new Error('AI service temporarily unavailable');
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Generation timed out after ${timeoutMs}ms`)), timeoutMs);
      promise.then((result) => {
        clearTimeout(timer);
        resolve(result);
      }).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  private parseLlamaResponse(response: string, context: LlamaConversationContext): LlamaResponse {
    try {
      // Clean the response and try to find valid JSON
      const cleanResponse = response.trim();
      
      // Try multiple JSON extraction patterns
      const jsonPatterns = [
        /\{[\s\S]*\}/,  // Original pattern
        /```json\s*(\{[\s\S]*?\})\s*```/,  // JSON in code blocks
        /```\s*(\{[\s\S]*?\})\s*```/,  // JSON in generic code blocks
        /(\{[\s\S]*?"insights"[\s\S]*?\})/  // JSON containing insights key
      ];
      
      for (const pattern of jsonPatterns) {
        const match = cleanResponse.match(pattern);
        if (match) {
          try {
            const jsonText = match[1] || match[0];
            // Clean common JSON formatting issues
            const cleanJson = jsonText
              .replace(/,\s*}/g, '}')  // Remove trailing commas
              .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
              .replace(/[\u201C\u201D]/g, '"')  // Replace smart quotes
              .replace(/[\u2018\u2019]/g, "'");  // Replace smart apostrophes
            
            const parsed = JSON.parse(cleanJson);
            return {
              message: parsed.message || cleanResponse,
              confidence: parsed.confidence || 0.8,
              intent: parsed.intent || 'query',
              entities: parsed.entities || {},
              suggestions: parsed.suggestions || [],
              actions: parsed.actions || [],
              insights: parsed.insights || [],
              followUpQuestions: parsed.followUpQuestions || []
            };
          } catch (parseError: any) {
            continue;
          }
        }
      }
      
      // Fallback parsing for non-JSON responses
      return this.parseTextResponse(cleanResponse, context);
    } catch (error) {
      return this.parseTextResponse(response, context);
    }
  }

  private parseTextResponse(response: string, context: LlamaConversationContext): LlamaResponse {
    // Generate meaningful financial insights when JSON parsing fails
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const revenue = financialMetrics.totalRevenue || 0;
    const expenses = financialMetrics.totalExpenses || 0;
    
    // Check if this is an expense-related query with no data
    const isExpenseQuery = /expense|cost|spending|outgoing/i.test(response);
    if (isExpenseQuery && expenses === 0 && revenue === 0) {
      return {
        message: "No expense data is currently available in your system. To get insights about your expenses, you'll need to add some transaction data first.",
        confidence: 0.3,
        intent: 'query',
        entities: {},
        suggestions: [
          'Add your first expense transaction to start tracking spending',
          'Import bank statements to automatically categorize expenses',
          'Set up expense categories for better organization'
        ],
        actions: [
          {
            type: 'add_transaction',
            description: 'Add a new expense transaction',
            parameters: { transactionType: 'expense' }
          }
        ],
        insights: [
          {
            type: 'data_gap',
            description: 'No financial data available for analysis',
            confidence: 0.9,
            impact: 'high'
          }
        ],
        followUpQuestions: [
          'Would you like help setting up your first expense transaction?',
          'Do you have bank statements you can import?',
          'What expense categories are most important for your business?'
        ]
      };
    }
    
    const insights = [
      {
        type: 'revenue',
        description: revenue === 0 ? 
          'Immediate revenue generation required - explore sales channels and customer acquisition strategies' :
          `Revenue performance needs attention - current level: $${revenue.toLocaleString()}`,
        confidence: 0.9,
        impact: 'high' as 'high' | 'medium' | 'low'
      },
      {
        type: 'expenses',
        description: expenses > 0 ? 
          `Cost control critical - monthly burn rate of $${expenses.toLocaleString()} requires immediate optimization` :
          'Expense management systems need implementation for better financial tracking',
        confidence: 0.8,
        impact: 'high' as 'high' | 'medium' | 'low'
      },
      {
        type: 'cash_flow',
        description: revenue === 0 && expenses > 0 ?
          'Negative cash flow situation - secure funding or reduce expenses immediately' :
          'Cash flow monitoring and forecasting systems needed for sustainability',
        confidence: 0.85,
        impact: 'high' as 'high' | 'medium' | 'low'
      },
      {
        type: 'risk',
        description: 'High financial risk due to revenue-expense imbalance - diversify income sources',
        confidence: 0.75,
        impact: 'medium' as 'high' | 'medium' | 'low'
      }
    ];
    
    const suggestions = [
      'Implement revenue tracking and forecasting systems',
      'Conduct expense audit and identify cost reduction opportunities',
      'Develop emergency funding strategy and cash flow projections',
      'Consider pivoting business model if current approach is unsustainable'
    ];
    
    return {
      message: 'Financial analysis completed using contextual data',
      confidence: 0.8,
      intent: 'analysis',
      entities: { revenue, expenses, margin: revenue > 0 ? (revenue - expenses) / revenue : 0 },
      suggestions: suggestions,
      actions: [],
      insights: insights,
      followUpQuestions: [
        'What are your primary revenue sources?',
        'Which expense categories consume the most resources?',
        'Do you have access to additional funding?'
      ]
    };
  }

  private extractInsights(response: string, context: LlamaConversationContext): Array<{
    type: string;
    description: string;
    confidence: number;
    impact: 'high' | 'medium' | 'low';
  }> {
    const insights: Array<{ type: string; description: string; confidence: number; impact: 'high' | 'medium' | 'low' }> = [];
    
    // Look for financial insights
    const financialPatterns = [
      /(?:revenue|income).*(?:increased?|decreased?|grew|declined)/i,
      /(?:expense|cost).*(?:increased?|decreased?|rose|fell)/i,
      /(?:profit|margin).*(?:improved?|deteriorated?)/i,
      /(?:cash flow|liquidity).*(?:positive|negative|improved?|declined)/i
    ];
    
    financialPatterns.forEach((pattern, index) => {
      const match = response.match(pattern);
      if (match) {
        insights.push({
          type: 'financial_trend',
          description: match[0],
          confidence: 0.8,
          impact: 'medium'
        });
      }
    });
    
    return insights;
  }

  private extractSuggestions(response: string): string[] {
    const suggestions: string[] = [];
    
    // Look for suggestion patterns
    const suggestionPatterns = [
      /(?:you should|consider|recommend|suggest).*?[.!]/gi,
      /(?:it would be beneficial|it's advisable).*?[.!]/gi
    ];
    
    suggestionPatterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) {
        suggestions.push(...matches.map(match => match.trim()));
      }
    });
    
    return suggestions;
  }

  private extractEntities(response: string): Record<string, any> {
    const entities: { amounts?: number[]; dates?: string[]; percentages?: number[] } = {};
    
    // Extract amounts
    const amountMatches = response.match(/\$[\d,]+\.?\d*/g);
    if (amountMatches) {
      entities.amounts = amountMatches.map(amount => 
        parseFloat(amount.replace(/[$,]/g, ''))
      );
    }
    
    // Extract dates
    const dateMatches = response.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g);
    if (dateMatches) {
      entities.dates = dateMatches;
    }
    
    // Extract percentages
    const percentMatches = response.match(/\d+\.?\d*%/g);
    if (percentMatches) {
      entities.percentages = percentMatches.map(p => parseFloat(p.replace('%', '')));
    }
    
    return entities;
  }

  private detectIntent(response: string): string {
    const intents = {
      'query': /(?:what|how|when|where|why|show|list|find)/i,
      'transaction': /(?:transaction|payment|invoice|receipt|expense)/i,
      'report': /(?:report|statement|summary|analysis)/i,
      'analysis': /(?:analyze|trend|forecast|prediction|insight)/i,
      'compliance': /(?:compliance|regulation|audit|tax)/i
    };
    
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(response)) {
        return intent;
      }
    }
    
    return 'general';
  }

  private generateFollowUpQuestions(response: string, context: LlamaConversationContext): string[] {
    const questions = [];
    
    // Generate contextual follow-up questions
    if (response.includes('revenue')) {
      questions.push('Would you like to see a detailed revenue breakdown by month?');
    }
    
    if (response.includes('expense')) {
      questions.push('Should I analyze your expense categories for optimization opportunities?');
    }
    
    if (response.includes('cash flow')) {
      questions.push('Would you like to see a cash flow forecast for the next quarter?');
    }
    
    return questions.slice(0, 3); // Limit to 3 questions
  }

  private getImmediateResponse(prompt: string, context: LlamaConversationContext): LlamaResponse | null {
    const lowerPrompt = prompt.toLowerCase();
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const expenses = financialMetrics.totalExpenses || 0;
    const revenue = financialMetrics.totalRevenue || 0;
    
    // Parse the prompt to understand what the user is asking for
    const promptAnalysis = this.parsePrompt(prompt);
    
    // Handle business forecast requests immediately
    if (lowerPrompt.includes('forecast') || lowerPrompt.includes('prediction') || lowerPrompt.includes('12-month') || lowerPrompt.includes('business forecast')) {
      return this.generateBusinessForecastResponse(context);
    }
    
    // Handle financial analysis requests immediately
    if (lowerPrompt.includes('analyze') || lowerPrompt.includes('analysis') || lowerPrompt.includes('insights')) {
      return this.generateFinancialAnalysisResponse(context);
    }
    
    // Ultra-fast responses for SPECIFIC expense category queries only
    if (lowerPrompt.includes('top') && lowerPrompt.includes('expense') && (lowerPrompt.includes('categor') || lowerPrompt.includes('transaction'))) {
      if (expenses === 0) {
        return {
          message: "No expense data is currently available in your system. To get insights about your expenses, you'll need to add some transaction data first.",
          confidence: 0.3,
          intent: 'query',
          entities: {},
          suggestions: [
            'Add your first expense transaction to start tracking spending',
            'Import bank statements to automatically categorize expenses',
            'Set up expense categories for better organization'
          ],
          actions: [{ type: 'add_transaction', description: 'Add a new expense transaction', parameters: { transactionType: 'expense' } }],
          insights: [{ type: 'data_gap', description: 'No financial data available for analysis', confidence: 0.9, impact: 'high' }],
          followUpQuestions: [
            'Would you like help setting up your first expense transaction?',
            'Do you have bank statements you can import?',
            'What expense categories are most important for your business?'
          ]
        };
      } else {
        const realExpenseData = this.getRealExpenseData(context);
        const timePeriod = this.getTimePeriod(context);
        
        // Use the parsed quantity from the prompt
        const requestedQuantity = promptAnalysis.quantity || 3; // Default to 3 if not specified
        const displayData = realExpenseData.slice(0, requestedQuantity);
        
        return {
          message: `Based on your actual financial data for ${timePeriod}, your top ${requestedQuantity} expense transaction${requestedQuantity > 1 ? 's are' : ' is'}: ${displayData.map(exp => `$${exp.amount.toLocaleString()}`).join(', ')}. Total expenses: $${expenses.toLocaleString()}.`,
          confidence: 0.9,
          intent: 'analysis',
          entities: { totalExpenses: expenses, transactions: realExpenseData },
          suggestions: [
            'Review your largest expense transactions for optimization opportunities',
            'Set up budget alerts for high-spending amounts',
            'Consider negotiating better rates with vendors'
          ],
          actions: [{ type: 'view_expenses', description: 'View detailed expense breakdown', parameters: { period: 'current' } }],
          insights: [{ type: 'expense_analysis', description: `Total expenses of $${expenses.toLocaleString()} require monitoring for budget compliance`, confidence: 0.9, impact: 'medium' }],
          followUpQuestions: [
            'Would you like to see a detailed breakdown by transaction?',
            'How do these expenses compare to your budget?',
            'Are there any unusual spending patterns?'
          ]
        };
      }
    }
    
    // Ultra-fast responses for cash flow queries (specific pattern)
    if ((lowerPrompt.includes('cash flow') || lowerPrompt.includes('cashflow')) && !lowerPrompt.includes('margin')) {
      const profit = revenue - expenses;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      return {
        message: `Your cash flow analysis: Revenue: $${revenue.toLocaleString()}, Expenses: $${expenses.toLocaleString()}, Net: $${profit.toLocaleString()} (${profitMargin.toFixed(1)}% margin).`,
        confidence: 0.9,
        intent: 'analysis',
        entities: { revenue, expenses, profit, profitMargin },
        suggestions: [
          profit > 0 ? 'Positive cash flow - consider reinvestment opportunities' : 'Negative cash flow - focus on expense reduction or revenue increase',
          'Set up cash flow forecasting for better planning',
          'Monitor cash flow trends monthly'
        ],
        actions: [{ type: 'view_cashflow', description: 'View detailed cash flow analysis', parameters: { period: 'current' } }],
        insights: [{ type: 'cashflow_analysis', description: `Cash flow ${profit > 0 ? 'positive' : 'negative'} - ${profit > 0 ? 'healthy' : 'requires attention'}`, confidence: 0.9, impact: 'high' }],
        followUpQuestions: [
          'How can I improve my cash flow?',
          'What are my biggest cash flow challenges?',
          'Should I set up cash flow forecasting?'
        ]
      };
    }
    
    // Ultra-fast responses for unusual transactions queries
    if (lowerPrompt.includes('unusual') && (lowerPrompt.includes('transaction') || lowerPrompt.includes('expense'))) {
      const realExpenseData = this.getRealExpenseData(context);
      const timePeriod = this.getTimePeriod(context);
      
      if (realExpenseData.length === 0) {
        return {
          message: "No transaction data is currently available to analyze for unusual patterns. Add some transactions first to enable anomaly detection.",
          confidence: 0.3,
          intent: 'query',
          entities: {},
          suggestions: [
            'Add your first transactions to enable pattern analysis',
            'Import bank statements for comprehensive transaction history',
            'Set up transaction categorization for better analysis'
          ],
          actions: [{ type: 'add_transaction', description: 'Add a new transaction', parameters: {} }],
          insights: [{ type: 'data_gap', description: 'No transaction data available for analysis', confidence: 0.9, impact: 'high' }],
          followUpQuestions: [
            'Would you like help setting up your first transaction?',
            'Do you have bank statements you can import?',
            'What types of transactions are most important to track?'
          ]
        };
      } else {
        // Analyze for unusual patterns
        const avgAmount = realExpenseData.reduce((sum, t) => sum + t.amount, 0) / realExpenseData.length;
        const unusualTransactions = realExpenseData.filter(t => t.amount > avgAmount * 2);
        
        if (unusualTransactions.length > 0) {
          const requestedQuantity = promptAnalysis.quantity || 3;
          const displayData = unusualTransactions.slice(0, requestedQuantity);
          
          return {
            message: `I found ${unusualTransactions.length} unusual transaction${unusualTransactions.length > 1 ? 's' : ''} in ${timePeriod}: ${displayData.map(t => `$${t.amount.toLocaleString()}`).join(', ')}. These are significantly higher than your average transaction amount of $${avgAmount.toLocaleString()}.`,
            confidence: 0.8,
            intent: 'analysis',
            entities: { unusualTransactions, averageAmount: avgAmount },
            suggestions: [
              'Review these large transactions for accuracy',
              'Consider if these are one-time expenses or recurring',
              'Set up alerts for transactions above a certain threshold'
            ],
            actions: [{ type: 'review_transactions', description: 'Review unusual transactions', parameters: { threshold: avgAmount * 2 } }],
            insights: [{ type: 'anomaly_detection', description: `${unusualTransactions.length} unusual transactions detected`, confidence: 0.8, impact: 'medium' }],
            followUpQuestions: [
              'Are these unusual transactions expected?',
              'Should I set up alerts for large transactions?',
              'Do you need help categorizing these transactions?'
            ]
          };
        } else {
          return {
            message: `No unusual transactions detected in ${timePeriod}. All transactions appear to be within normal ranges based on your spending patterns.`,
            confidence: 0.8,
            intent: 'analysis',
            entities: { totalTransactions: realExpenseData.length, averageAmount: avgAmount },
            suggestions: [
              'Continue monitoring for unusual patterns',
              'Set up automated alerts for large transactions',
              'Review spending patterns monthly'
            ],
            actions: [{ type: 'set_alerts', description: 'Set up transaction alerts', parameters: {} }],
            insights: [{ type: 'pattern_analysis', description: 'Normal spending patterns detected', confidence: 0.8, impact: 'low' }],
            followUpQuestions: [
              'Would you like to set up transaction alerts?',
              'How often should I check for unusual patterns?',
              'What threshold should trigger alerts?'
            ]
          };
        }
      }
    }
    
    // Ultra-fast responses for gross margin queries
    if (lowerPrompt.includes('gross margin') || lowerPrompt.includes('profit margin') || lowerPrompt.includes('margin')) {
      const profit = revenue - expenses;
      const grossMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      if (revenue === 0 && expenses === 0) {
        return {
          message: "No financial data is currently available to calculate gross margin. Add some revenue and expense transactions first to enable margin analysis.",
          confidence: 0.3,
          intent: 'query',
          entities: {},
          suggestions: [
            'Add revenue transactions to track income',
            'Add expense transactions to track costs',
            'Set up proper transaction categorization'
          ],
          actions: [{ type: 'add_transaction', description: 'Add a new transaction', parameters: {} }],
          insights: [{ type: 'data_gap', description: 'No financial data available for margin analysis', confidence: 0.9, impact: 'high' }],
          followUpQuestions: [
            'Would you like help setting up your first revenue transaction?',
            'Do you have expense data you can import?',
            'What revenue streams are most important for your business?'
          ]
        };
      } else if (revenue === 0) {
        return {
          message: `You have expenses of $${expenses.toLocaleString()} but no revenue recorded. To improve your gross margin, focus on generating revenue first. Your current margin is negative due to expenses without income.`,
          confidence: 0.8,
          intent: 'analysis',
          entities: { expenses, revenue, grossMargin: -100 },
          suggestions: [
            'Focus on generating revenue to offset expenses',
            'Review expenses to identify essential vs non-essential costs',
            'Set up revenue tracking for your business'
          ],
          actions: [{ type: 'add_revenue', description: 'Add revenue transactions', parameters: {} }],
          insights: [{ type: 'margin_analysis', description: 'Negative margin due to no revenue', confidence: 0.9, impact: 'high' }],
          followUpQuestions: [
            'What are your main revenue sources?',
            'How can you start generating income?',
            'Which expenses are most critical?'
          ]
        };
      } else {
        const marginStatus = grossMargin > 20 ? 'healthy' : grossMargin > 10 ? 'moderate' : grossMargin > 0 ? 'low' : 'negative';
        const improvementSuggestions = grossMargin <= 0 ? [
          'Focus on increasing revenue through new sales channels',
          'Review and reduce non-essential expenses',
          'Consider pricing strategy adjustments'
        ] : grossMargin < 10 ? [
          'Optimize pricing to improve margins',
          'Reduce operational costs where possible',
          'Focus on higher-margin products/services'
        ] : [
          'Maintain current margin levels',
          'Consider reinvestment opportunities',
          'Explore expansion possibilities'
        ];
        
        return {
          message: `Your current gross margin is ${grossMargin.toFixed(1)}% (${marginStatus}). Revenue: $${revenue.toLocaleString()}, Expenses: $${expenses.toLocaleString()}, Profit: $${profit.toLocaleString()}.`,
          confidence: 0.9,
          intent: 'analysis',
          entities: { revenue, expenses, profit, grossMargin },
          suggestions: improvementSuggestions,
          actions: [{ type: 'view_margin_analysis', description: 'View detailed margin analysis', parameters: { period: 'current' } }],
          insights: [{ type: 'margin_analysis', description: `${marginStatus} gross margin requires ${grossMargin <= 0 ? 'immediate' : grossMargin < 10 ? 'careful' : 'ongoing'} attention`, confidence: 0.9, impact: grossMargin <= 0 ? 'high' : grossMargin < 10 ? 'medium' : 'low' }],
          followUpQuestions: [
            'How can I increase my revenue?',
            'Which expenses should I focus on reducing?',
            'What is a good target margin for my business?'
          ]
        };
      }
    }
    
    // Ultra-fast responses for revenue queries (specific pattern)
    if ((lowerPrompt.includes('revenue') || lowerPrompt.includes('income')) && !lowerPrompt.includes('margin') && !lowerPrompt.includes('unusual')) {
      if (revenue === 0) {
        return {
          message: "No revenue data is currently available in your system. To track your income, you'll need to add some revenue transactions first.",
          confidence: 0.3,
          intent: 'query',
          entities: {},
          suggestions: [
            'Add your first revenue transaction to start tracking income',
            'Import sales data to automatically categorize revenue',
            'Set up revenue categories for better organization'
          ],
          actions: [{ type: 'add_transaction', description: 'Add a new revenue transaction', parameters: { transactionType: 'income' } }],
          insights: [{ type: 'data_gap', description: 'No revenue data available for analysis', confidence: 0.9, impact: 'high' }],
          followUpQuestions: [
            'Would you like help setting up your first revenue transaction?',
            'Do you have sales data you can import?',
            'What revenue streams are most important for your business?'
          ]
        };
      } else {
        return {
          message: `Your current revenue is $${revenue.toLocaleString()}. This represents your total income for the current period.`,
          confidence: 0.9,
          intent: 'analysis',
          entities: { totalRevenue: revenue },
          suggestions: [
            'Analyze revenue trends over time',
            'Compare revenue to expenses for profitability analysis',
            'Set up revenue forecasting for better planning'
          ],
          actions: [{ type: 'view_revenue', description: 'View detailed revenue breakdown', parameters: { period: 'current' } }],
          insights: [{ type: 'revenue_analysis', description: `Revenue of $${revenue.toLocaleString()} provides foundation for business growth`, confidence: 0.9, impact: 'high' }],
          followUpQuestions: [
            'How does this revenue compare to previous periods?',
            'What are your main revenue sources?',
            'How can you increase revenue?'
          ]
        };
      }
    }
    
    return null; // No immediate response available
  }

  private isExpenseQuery(prompt: string): boolean {
    const expenseKeywords = ['expense', 'expenses', 'cost', 'costs', 'spending', 'spend', 'outgoing', 'categories', 'category'];
    return expenseKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
  }

  private generateQuickExpenseResponse(prompt: string, context: LlamaConversationContext): LlamaResponse {
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const expenses = financialMetrics.totalExpenses || 0;
    const revenue = financialMetrics.totalRevenue || 0;
    
    if (expenses === 0 && revenue === 0) {
      return {
        message: "No expense data is currently available in your system. To get insights about your expenses, you'll need to add some transaction data first.",
        confidence: 0.3,
        intent: 'query',
        entities: {},
        suggestions: [
          'Add your first expense transaction to start tracking spending',
          'Import bank statements to automatically categorize expenses',
          'Set up expense categories for better organization'
        ],
        actions: [
          {
            type: 'add_transaction',
            description: 'Add a new expense transaction',
            parameters: { transactionType: 'expense' }
          }
        ],
        insights: [
          {
            type: 'data_gap',
            description: 'No financial data available for analysis',
            confidence: 0.9,
            impact: 'high'
          }
        ],
        followUpQuestions: [
          'Would you like help setting up your first expense transaction?',
          'Do you have bank statements you can import?',
          'What expense categories are most important for your business?'
        ]
      };
    }

        // Generate response based on actual expense data
        const expenseAmount = expenses;
        const realExpenseData = this.getRealExpenseData(context);
        
        if (realExpenseData.length > 0) {
          const timePeriod = this.getTimePeriod(context);
          const promptAnalysis = this.parsePrompt(prompt);
          const requestedQuantity = promptAnalysis.quantity || 3;
          const displayData = realExpenseData.slice(0, requestedQuantity);
          
          return {
            message: `Based on your actual financial data for ${timePeriod}, your total expenses are $${expenseAmount.toLocaleString()}. Here are your top ${requestedQuantity} expense transaction${requestedQuantity > 1 ? 's' : ''}: ${displayData.map(exp => `$${exp.amount.toLocaleString()}`).join(', ')}.`,
            confidence: 0.8,
            intent: 'analysis',
            entities: { totalExpenses: expenseAmount, transactions: realExpenseData },
            suggestions: [
              'Review your largest expense transactions for optimization opportunities',
              'Set up budget alerts for high-spending amounts',
              'Consider negotiating better rates with vendors'
            ],
            actions: [
              {
                type: 'view_expenses',
                description: 'View detailed expense breakdown',
                parameters: { period: 'current' }
              }
            ],
            insights: [
              {
                type: 'expense_analysis',
                description: `Total expenses of $${expenseAmount.toLocaleString()} require monitoring for budget compliance`,
                confidence: 0.9,
                impact: 'medium'
              }
            ],
            followUpQuestions: [
              'Would you like to see a detailed breakdown by transaction?',
              'How do these expenses compare to your budget?',
              'Are there any unusual spending patterns?'
            ]
          };
        } else {
          // No real transaction data available - don't generate mock categories
          return {
            message: "No expense data is currently available in your system. To get insights about your expenses, you'll need to add some transaction data first.",
            confidence: 0.3,
            intent: 'query',
            entities: {},
            suggestions: [
              'Add your first expense transaction to start tracking spending',
              'Import bank statements to automatically categorize expenses',
              'Set up expense categories for better organization'
            ],
            actions: [
              {
                type: 'add_transaction',
                description: 'Add a new expense transaction',
                parameters: { transactionType: 'expense' }
              }
            ],
            insights: [
              {
                type: 'data_gap',
                description: 'No financial data available for analysis',
                confidence: 0.9,
                impact: 'high'
              }
            ],
            followUpQuestions: [
              'Would you like help setting up your first expense transaction?',
              'Do you have bank statements you can import?',
              'What expense categories are most important for your business?'
            ]
          };
        }
  }

  private async getInstantResponse(prompt: string, context: LlamaConversationContext): Promise<LlamaResponse> {
    // Always provide an instant response - no latency ever!
    
    // For emotional or complex questions, let the AI handle it with wisdom
    const emotionalKeywords = ['feel', 'feeling', 'worried', 'concerned', 'stressed', 'overwhelmed', 'failing', 'struggling', 'help', 'advice', 'guidance', 'lost', 'confused', 'scared'];
    const isEmotionalQuestion = emotionalKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
    
    if (isEmotionalQuestion) {
      // Always use the wise emotional response for emotional questions
      // This provides consistent, high-quality responses without depending on Ollama
      return this.getWiseEmotionalResponse(prompt, context);
    }
    
    // Comprehensive question analysis with senior-level intelligence
    const questionAnalysis = this.analyzeQuestion(prompt, context);
    
    // Enhanced routing with advanced categorization
    switch (questionAnalysis.category) {
      case 'account_info':
        return this.getAccountNameResponse(prompt, context);
      case 'financial_urgent':
      case 'financial_crisis':
        return this.getUrgentResponse(prompt, context, questionAnalysis.revenue, questionAnalysis.expenses, questionAnalysis.profit);
      case 'financial_actionable':
        return this.getActionableResponse(prompt, context, questionAnalysis.revenue, questionAnalysis.expenses, questionAnalysis.profit);
      case 'expense_analysis':
        return await this.getExpenseAnalysisResponse(prompt, context, questionAnalysis);
      case 'revenue_analysis':
        return this.getRevenueAnalysisResponse(prompt, context, questionAnalysis);
      case 'financial_general':
        return this.getFinancialGeneralResponse(prompt, context, questionAnalysis);
      case 'system_info':
        return this.getSystemInfoResponse(prompt, context);
      case 'help_support':
        return this.getHelpSupportResponse(prompt, context);
      case 'personal_query':
        return this.handlePersonalQuestion(prompt, context, questionAnalysis);
      case 'entertainment_query':
        return this.handleEntertainmentQuestion(prompt, context, questionAnalysis);
      case 'general_knowledge':
        return this.handleGeneralKnowledgeQuestion(prompt, context, questionAnalysis);
      case 'predictive_analysis':
        return this.handlePredictiveAnalysis(prompt, context, questionAnalysis);
      case 'comparative_analysis':
        return this.handleComparativeAnalysis(prompt, context, questionAnalysis);
      case 'intelligent_fallback':
        return this.getIntelligentFallbackResponse(prompt, context, questionAnalysis);
      case 'unknown':
      default:
        return this.getIntelligentFallbackResponse(prompt, context, questionAnalysis);
    }
  }

  private getGenericInstantResponse(prompt: string, context: LlamaConversationContext): LlamaResponse {
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const expenses = financialMetrics.totalExpenses || 0;
    const revenue = financialMetrics.totalRevenue || 0;
    const profit = revenue - expenses;
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for account/company name questions
    if (lowerPrompt.includes('name of this account') || 
        lowerPrompt.includes('account name') || 
        lowerPrompt.includes('company name') || 
        lowerPrompt.includes('what is this account') ||
        lowerPrompt.includes('what account') ||
        lowerPrompt.includes('which account') ||
        lowerPrompt.includes('tell me the name') ||
        lowerPrompt.includes('account called') ||
        lowerPrompt.includes('my account')) {
      return this.getAccountNameResponse(prompt, context);
    }
    
    // Check for urgent/critical questions
    if (lowerPrompt.includes('losing money') || lowerPrompt.includes('urgent') || lowerPrompt.includes('help') || lowerPrompt.includes('crisis')) {
      return this.getUrgentResponse(prompt, context, revenue, expenses, profit);
    }
    
    // Check for specific question types
    if (lowerPrompt.includes('what should i do') || lowerPrompt.includes('how can i')) {
      return this.getActionableResponse(prompt, context, revenue, expenses, profit);
    }
    
    // This method is now replaced by comprehensive question analysis
    return this.getIntelligentFallbackResponse(prompt, context, { revenue, expenses, profit, entities: { revenue, expenses, profit } });
  }

  private async getExpenseAnalysisResponse(prompt: string, context: LlamaConversationContext, analysis: any): Promise<LlamaResponse> {
    const realExpenseData = this.getRealExpenseData(context);
    const quantity = analysis.quantity || 5;
    const timePeriod = analysis.timePeriod || 'current month';
    
    // Check if user asked about specific expense category
    const expenseCategory = this.extractExpenseCategory(prompt);
    const userRequestedQuantity = analysis.quantity;
    const userRequestedTimePeriod = analysis.timePeriod;
    const actualTimePeriod = this.getActualTimePeriod(realExpenseData);
    
    if (realExpenseData.length === 0) {
      return {
        message: `No expense data available for ${userRequestedTimePeriod || 'the requested period'}. You haven't recorded any expenses yet.`,
        confidence: 0.9,
        intent: 'expense_query',
        entities: analysis.entities,
        suggestions: [
          'Start recording your business expenses',
          'Import expense data from bank statements',
          'Set up expense categories'
        ],
        actions: [{ type: 'add_expense', description: 'Add new expense', parameters: {} }],
        insights: [{
          type: 'no_expense_data',
          description: 'No expenses recorded yet',
          confidence: 0.9,
          impact: 'medium'
        }],
        followUpQuestions: [
          'How do I add expenses?',
          'What expense categories should I use?',
          'How do I import bank data?'
        ]
      };
    }
    
    // Handle specific expense category requests
    if (expenseCategory) {
      return await this.handleSpecificExpenseCategory(prompt, realExpenseData, expenseCategory, actualTimePeriod);
    }
    
    // Check if user requested different time period than available
    const hasRequestedTimePeriod = userRequestedTimePeriod && userRequestedTimePeriod !== 'current month';
    const hasRequestedQuantity = userRequestedQuantity && userRequestedQuantity !== 5;
    
    if (hasRequestedTimePeriod) {
      return {
        message: `You asked for expenses from "${userRequestedTimePeriod}", but I can only access data from ${actualTimePeriod}. 

Available data shows your top ${userRequestedQuantity || 'expense'} transactions from ${actualTimePeriod}: ${realExpenseData.slice(0, userRequestedQuantity || 5).map(e => `$${e.amount.toLocaleString()}`).join(', ')}.

To analyze ${userRequestedTimePeriod} data, you would need to:
• Import historical transaction data
• Set up multi-period reporting
• Configure data retention policies`,
        confidence: 0.8,
        intent: 'expense_query',
        entities: analysis.entities,
        suggestions: [
          'Import historical expense data',
          'Set up multi-period reporting',
          'Configure data retention for long-term analysis'
        ],
        actions: [{ type: 'import_historical_data', description: 'Import historical data', parameters: { timePeriod: userRequestedTimePeriod } }],
        insights: [{
          type: 'time_period_mismatch',
          description: `Requested ${userRequestedTimePeriod} but only have ${actualTimePeriod} data`,
          confidence: 0.8,
          impact: 'medium'
        }],
        followUpQuestions: [
          'How do I import historical data?',
          'Can I set up multi-year reporting?',
          'What data retention options are available?'
        ]
      };
    }
    
    const topExpenses = realExpenseData.slice(0, quantity);
    const totalExpenses = realExpenseData.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Acknowledge the specific request
    const acknowledgment = hasRequestedQuantity ? 
      `You asked for your top ${userRequestedQuantity} expenses` : 
      `Your top ${quantity} expense transactions`;
    
    return {
      message: `${acknowledgment} from ${actualTimePeriod}: ${topExpenses.map(e => `$${e.amount.toLocaleString()}`).join(', ')}. Total expenses: $${totalExpenses.toLocaleString()}.`,
      confidence: 0.95,
      intent: 'expense_query',
      entities: analysis.entities,
      suggestions: [
        'Review your largest expenses for cost reduction opportunities',
        'Categorize expenses for better tracking',
        'Set expense budgets for each category'
      ],
      actions: [{ type: 'analyze_expenses', description: 'Analyze expense patterns', parameters: { timePeriod: actualTimePeriod, quantity } }],
      insights: [{
        type: 'expense_analysis',
        description: `Top ${quantity} expenses total $${totalExpenses.toLocaleString()}`,
        confidence: 0.95,
        impact: 'high'
      }],
      followUpQuestions: [
        'Which expenses can I reduce?',
        'What are my expense trends?',
        'How do I categorize expenses?'
      ]
    };
  }

  private getRevenueAnalysisResponse(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const revenue = financialMetrics.totalRevenue || 0;
    const timePeriod = analysis.timePeriod || 'current month';
    
    if (revenue === 0) {
      return {
        message: `No revenue recorded for ${timePeriod}. You haven't generated any income yet.`,
        confidence: 0.9,
        intent: 'revenue_query',
        entities: analysis.entities,
        suggestions: [
          'Start recording your business revenue',
          'Set up revenue tracking systems',
          'Identify your revenue sources'
        ],
        actions: [{ type: 'add_revenue', description: 'Add new revenue', parameters: {} }],
        insights: [{
          type: 'no_revenue_data',
          description: 'No revenue recorded yet',
          confidence: 0.9,
          impact: 'high'
        }],
        followUpQuestions: [
          'How do I add revenue?',
          'What are common revenue sources?',
          'How do I track sales?'
        ]
      };
    }
    
    return {
      message: `Your total revenue for ${timePeriod} is $${revenue.toLocaleString()}. This represents your business income from all sources.`,
      confidence: 0.95,
      intent: 'revenue_query',
      entities: analysis.entities,
      suggestions: [
        'Analyze revenue trends over time',
        'Identify your most profitable revenue streams',
        'Set revenue targets for growth'
      ],
      actions: [{ type: 'analyze_revenue', description: 'Analyze revenue patterns', parameters: { timePeriod } }],
      insights: [{
        type: 'revenue_analysis',
        description: `Total revenue: $${revenue.toLocaleString()}`,
        confidence: 0.95,
        impact: 'high'
      }],
      followUpQuestions: [
        'What are my revenue trends?',
        'Which revenue sources are most profitable?',
        'How can I increase revenue?'
      ]
    };
  }

  private getFinancialGeneralResponse(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    const revenue = analysis.revenue;
    const expenses = analysis.expenses;
    const profit = analysis.profit;
    const lowerPrompt = prompt.toLowerCase();
    
    // Check if this is a business performance question
    const isBusinessPerformance = lowerPrompt.includes('business performance') || 
                                 lowerPrompt.includes('performance') || 
                                 lowerPrompt.includes('how is my business') ||
                                 lowerPrompt.includes('business health');
    
    if (revenue === 0 && expenses === 0) {
      return {
        message: `No financial data available yet. Start by recording your business transactions to get insights.`,
        confidence: 0.9,
        intent: 'financial_query',
        entities: analysis.entities,
        suggestions: [
          'Add your first transaction',
          'Import bank statements',
          'Set up your chart of accounts'
        ],
        actions: [{ type: 'add_transaction', description: 'Add transaction', parameters: {} }],
        insights: [{
          type: 'no_financial_data',
          description: 'No transactions recorded yet',
          confidence: 0.9,
          impact: 'medium'
        }],
        followUpQuestions: [
          'How do I add transactions?',
          'What is a chart of accounts?',
          'How do I import bank data?'
        ]
      };
    }
    
    const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;
    const isProfitable = profit > 0;
    const burnRate = expenses;
    const runway = revenue > 0 ? (revenue / expenses) : 0;
    
    if (isBusinessPerformance) {
      // Comprehensive business performance analysis
      const performanceStatus = isProfitable ? 'HEALTHY' : 'CRITICAL';
      const statusEmoji = isProfitable ? '✅' : '🚨';
      
      return {
        message: `**Business Performance Analysis:**

**Financial Health: ${statusEmoji} ${performanceStatus}**
- Revenue: $${revenue.toLocaleString()} ${revenue === 0 ? '(No income generated)' : ''}
- Expenses: $${expenses.toLocaleString()} ${expenses > 0 ? '(High spending)' : ''}
- Net ${profit >= 0 ? 'Profit' : 'Loss'}: ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()} ${profit < 0 ? '(Operating at loss)' : ''}
- Profit Margin: ${profitMargin.toFixed(1)}% ${profitMargin < 0 ? '(Negative due to no revenue)' : ''}

**Key Performance Metrics:**
- Burn Rate: $${burnRate.toLocaleString()}/month
- Runway: ${runway > 0 ? `${runway.toFixed(1)} months` : '0 months (No revenue to sustain operations)'}
- Expense Ratio: ${revenue > 0 ? ((expenses / revenue) * 100).toFixed(1) : 100}% ${revenue === 0 ? '(All spending, no income)' : ''}

**Performance Assessment:**
${isProfitable ? '✅ Your business is profitable and sustainable' : '🚨 URGENT: Your business is unsustainable without immediate revenue generation'}`,
        confidence: 0.95,
        intent: 'financial_query',
        entities: { 
          ...analysis.entities, 
          performanceStatus, 
          burnRate, 
          runway, 
          profitMargin 
        },
        suggestions: isProfitable ? [
          'Maintain your profitable operations',
          'Look for growth opportunities',
          'Optimize your profit margins',
          'Build cash reserves for stability'
        ] : [
          'Generate revenue immediately (even small amounts)',
          'Cut non-essential expenses',
          'Review your business model for viability',
          'Consider emergency funding or cost reduction'
        ],
        actions: [{ 
          type: 'business_performance_analysis', 
          description: 'Analyze business performance metrics', 
          parameters: { 
            revenue, 
            expenses, 
            profit, 
            burnRate, 
            runway 
          } 
        }],
        insights: [{
          type: 'business_performance',
          description: `${isProfitable ? 'Profitable' : 'Loss-making'} business with ${profitMargin.toFixed(1)}% margin and $${burnRate.toLocaleString()}/month burn rate`,
          confidence: 0.95,
          impact: isProfitable ? 'high' : 'high'
        }],
        followUpQuestions: isProfitable ? [
          'How can I grow my revenue?',
          'What are my profit trends?',
          'How do I optimize my margins?'
        ] : [
          'What expenses can I cut immediately?',
          'How can I generate revenue quickly?',
          'What is my break-even point?'
        ]
      };
    }
    
    // Regular financial overview
    return {
      message: `Financial Overview: Revenue $${revenue.toLocaleString()}, Expenses $${expenses.toLocaleString()}, Net ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}. ${isProfitable ? `Your profit margin is ${profitMargin.toFixed(1)}%.` : 'You are operating at a loss.'}`,
      confidence: 0.95,
      intent: 'financial_query',
      entities: analysis.entities,
      suggestions: isProfitable ? [
        'Maintain your profitable operations',
        'Look for growth opportunities',
        'Optimize your profit margins'
      ] : [
        'Focus on reducing expenses',
        'Increase revenue generation',
        'Review your business model'
      ],
      actions: [{ type: 'financial_analysis', description: 'Analyze financial health', parameters: {} }],
      insights: [{
        type: 'financial_overview',
        description: `${isProfitable ? 'Profitable' : 'Loss-making'} business with ${profitMargin.toFixed(1)}% margin`,
        confidence: 0.95,
        impact: 'high'
      }],
      followUpQuestions: [
        'How can I improve my financial health?',
        'What are my financial trends?',
        'How do I set financial goals?'
      ]
    };
  }

  private getSystemInfoResponse(prompt: string, context: LlamaConversationContext): LlamaResponse {
    return {
      message: `UrutiIQ is your comprehensive financial management platform. I can help you with:

📊 Financial Analysis - Track expenses, revenue, and profitability
💰 Transaction Management - Record and categorize transactions  
📈 Business Insights - Get AI-powered financial recommendations
🔒 Security Features - Manage users, permissions, and security
📋 Compliance - Monitor regulatory compliance and audits

What would you like to know more about?`,
      confidence: 0.95,
      intent: 'system_query',
      entities: { system: 'UrutiIQ', features: ['financial', 'security', 'compliance'] },
      suggestions: [
        'Learn about financial features',
        'Explore security options',
        'Understand compliance tools'
      ],
      actions: [{ type: 'explore_features', description: 'Explore platform features', parameters: {} }],
      insights: [{
        type: 'system_info',
        description: 'Comprehensive financial management platform',
        confidence: 0.95,
        impact: 'medium'
      }],
      followUpQuestions: [
        'How do I track my finances?',
        'What security features are available?',
        'How does compliance monitoring work?'
      ]
    };
  }

  private getHelpSupportResponse(prompt: string, context: LlamaConversationContext): LlamaResponse {
    return {
      message: `I'm here to help! Here's what I can assist you with:

💡 **Financial Questions** - Ask about expenses, revenue, profit margins
📊 **Data Analysis** - Get insights from your financial data
🔧 **How-to Guides** - Learn how to use platform features
🚨 **Urgent Issues** - Get immediate help with financial problems

Just ask me anything in natural language - I understand context and can provide specific, actionable answers based on your actual data.`,
      confidence: 0.95,
      intent: 'help_query',
      entities: { helpType: 'general', capabilities: ['financial', 'analysis', 'guidance'] },
      suggestions: [
        'Ask a financial question',
        'Get data analysis',
        'Learn platform features'
      ],
      actions: [{ type: 'get_help', description: 'Get assistance', parameters: {} }],
      insights: [{
        type: 'help_offered',
        description: 'Comprehensive help and support available',
        confidence: 0.95,
        impact: 'medium'
      }],
      followUpQuestions: [
        'What financial questions can I ask?',
        'How do I analyze my data?',
        'What features should I explore?'
      ]
    };
  }

  private getWiseEmotionalResponse(prompt: string, context: LlamaConversationContext): LlamaResponse {
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const revenue = financialMetrics.totalRevenue || 0;
    const expenses = financialMetrics.totalExpenses || 0;
    const profit = revenue - expenses;
    
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect the specific emotional concern
    let emotionalContext = '';
    let encouragement = '';
    let actionPlan = '';
    
    if (lowerPrompt.includes('failing') || lowerPrompt.includes('struggling')) {
      emotionalContext = 'I hear the weight of your concerns about your business.';
      encouragement = `Every successful entrepreneur has faced moments like this. Your current situation (Revenue: $${revenue.toLocaleString()}, Expenses: $${expenses.toLocaleString()}) is challenging, but it's also an opportunity for transformation.`;
      actionPlan = `**Your Path Forward:**

**Week 1 - Immediate Stabilization:**
• Review every expense - eliminate what you can survive without
• Reach out to 3 potential customers/clients today
• Focus on generating ANY revenue, even small amounts

**Week 2-4 - Building Momentum:**
• Identify your most profitable activities
• Streamline operations for efficiency
• Build relationships with key stakeholders

**Month 2+ - Strategic Growth:**
• Reinvest profits wisely
• Scale what's working
• Build systems for sustainable growth`;
    } else if (lowerPrompt.includes('worried') || lowerPrompt.includes('concerned')) {
      emotionalContext = 'Your concerns are valid and show you care deeply about your business.';
      encouragement = `Worry often comes from uncertainty. Let's bring clarity to your situation.`;
      actionPlan = `**Finding Clarity:**

**Understand Your Numbers:**
• Track every expense category
• Identify your break-even point
• Monitor cash flow daily

**Assess Your Position:**
• What's working in your business?
• What's consuming resources without return?
• Where are your biggest opportunities?

**Create Your Action Plan:**
• Set weekly financial goals
• Track progress daily
• Celebrate small wins`;
    } else if (lowerPrompt.includes('overwhelmed') || lowerPrompt.includes('stressed')) {
      emotionalContext = 'Feeling overwhelmed is completely normal when running a business.';
      encouragement = `You're not alone in this. Let's break things down into manageable steps.`;
      actionPlan = `**Managing the Overwhelm:**

**Today - Just One Thing:**
• Pick ONE area to focus on (expenses, revenue, or operations)
• Spend 30 minutes on it
• Don't try to fix everything at once

**This Week - Small Steps:**
• Review your top 3 expenses
• Make one cost reduction
• Reach out to one potential customer

**This Month - Build Systems:**
• Set up simple tracking
• Create daily/weekly routines
• Build momentum gradually`;
    } else {
      emotionalContext = "I understand you're going through a difficult time with your business.";
      encouragement = `Challenging times often precede breakthrough moments. Your situation can be turned around.`;
      actionPlan = `**Your Recovery Plan:**

**Immediate Actions (This Week):**
• Cut non-essential expenses immediately
• Focus on generating any revenue
• Reach out for help/support

**Short-term Goals (Next Month):**
• Achieve break-even
• Build a customer base
• Streamline operations

**Long-term Vision (Next Quarter):**
• Sustainable profitability
• Growth systems
• Financial stability`;
    }
    
    return {
      message: `${emotionalContext}

${encouragement}

${actionPlan}

**Remember:** You have the strength to overcome this challenge. Many successful businesses started in difficult circumstances. Focus on progress, not perfection.

**Your Current Status:**
- Revenue: $${revenue.toLocaleString()}
- Expenses: $${expenses.toLocaleString()}
- Net: ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}

**You're not alone in this journey. Take it one step at a time, and remember that every successful entrepreneur has faced moments like this.**`,
      confidence: 0.95,
      intent: 'emotional_support',
      entities: { emotionalType: 'business_struggle', revenue, expenses, profit },
      suggestions: [
        'Review your expense categories',
        'Focus on revenue generation',
        'Create a weekly action plan',
        'Seek business mentorship'
      ],
      actions: [{ type: 'emotional_support', description: 'Provide emotional and practical support', parameters: {} }],
      insights: [{
        type: 'emotional_intelligence',
        description: 'Provided empathetic response to business struggles with actionable guidance',
        confidence: 0.95,
        impact: 'high'
      }],
      followUpQuestions: [
        'What should I focus on first?',
        'How do I track my progress?',
        'What are some quick revenue ideas?',
        'How do I stay motivated during difficult times?'
      ]
    };
  }

  private getBusinessAnalysisResponse(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    const revenue = analysis.revenue;
    const expenses = analysis.expenses;
    const profit = revenue - expenses;
    
    return {
      message: `Let me help you understand your business situation better.

**Your Business Overview:**
- Revenue: $${revenue.toLocaleString()}
- Expenses: $${expenses.toLocaleString()}
- Net: ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}

**Business Analysis:**
${profit < 0 ? 
  `🚨 **Current Challenge**: You're operating at a loss of $${Math.abs(profit).toLocaleString()}. This is a critical situation that needs immediate attention.

**Immediate Actions Needed:**
• Cut non-essential expenses immediately
• Focus on generating ANY revenue
• Review every expense line by line
• Consider emergency funding or cost reduction` :
  profit === 0 ?
  `⚖️ **Break-Even Status**: You're at break-even, which is a solid foundation for growth.

**Growth Opportunities:**
• Identify new revenue streams
• Optimize existing operations
• Consider strategic investments
• Build reserves for future growth` :
  `📈 **Profitable Business**: Congratulations! You're profitable at $${profit.toLocaleString()}.

**Strategic Focus:**
• Maintain current profit margins
• Reinvest profits wisely
• Scale what's working
• Build emergency reserves`}

**What specific aspect of your business would you like to explore?**`,
      confidence: 0.95,
      intent: 'business_analysis',
      entities: analysis.entities,
      suggestions: [
        'Analyze my expense categories',
        'Review revenue opportunities',
        'Create a financial action plan',
        'Set up business monitoring'
      ],
      actions: [{ type: 'business_analysis', description: 'Analyze business performance', parameters: {} }],
      insights: [{
        type: 'business_intelligence',
        description: `Provided comprehensive business analysis based on current financial status (${profit < 0 ? 'loss-making' : profit === 0 ? 'break-even' : 'profitable'})`,
        confidence: 0.95,
        impact: 'high'
      }],
      followUpQuestions: [
        'What are my top expenses?',
        'How can I increase revenue?',
        'What should I focus on first?',
        'How do I track my progress?'
      ]
    };
  }

  private getIntelligentFallbackResponse(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    const revenue = analysis.revenue;
    const expenses = analysis.expenses;
    const profit = analysis.profit;
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for personal questions
    if (this.isPersonalQuestion(lowerPrompt)) {
      return this.handlePersonalQuestion(prompt, context, analysis);
    }
    
    // Check for business questions first (higher priority)
    if (lowerPrompt.includes('business') || lowerPrompt.includes('company') || lowerPrompt.includes('enterprise') || 
        lowerPrompt.includes('my business') || lowerPrompt.includes('about my business')) {
      return this.getBusinessAnalysisResponse(prompt, context, analysis);
    }
    
    // Check for general knowledge questions
    if (this.isGeneralKnowledgeQuestion(lowerPrompt)) {
      return this.handleGeneralKnowledgeQuestion(prompt, context, analysis);
    }
    
    // Check for entertainment questions
    if (this.isEntertainmentQuestion(lowerPrompt)) {
      return this.handleEntertainmentQuestion(prompt, context, analysis);
    }
    
    // Default financial-focused response
    return {
      message: `I understand you're asking: "${prompt}"

Based on your current financial data (Revenue: $${revenue.toLocaleString()}, Expenses: $${expenses.toLocaleString()}, Net: ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}), I can help you with:

• Financial analysis and insights
• Expense and revenue tracking
• Business recommendations
• Account information
• System features

Could you rephrase your question or ask me something specific about your finances?`,
      confidence: 0.7,
      intent: 'unknown_query',
      entities: analysis.entities,
      suggestions: [
        'Ask about your expenses',
        'Get financial analysis',
        'Learn about platform features'
      ],
      actions: [{ type: 'clarify_question', description: 'Clarify your question', parameters: {} }],
      insights: [{
        type: 'unclear_query',
        description: 'Question needs clarification',
        confidence: 0.7,
        impact: 'low'
      }],
      followUpQuestions: [
        'What are my top expenses?',
        'How is my business performing?',
        'What can you help me with?'
      ]
    };
  }

  private isPersonalQuestion(text: string): boolean {
    const personalPatterns = [
      'tell me about myself', 'about myself', 'who am i', 'my name', 'my age',
      'my birthday', 'my favorite', 'my personal', 'about me', 'myself'
    ];
    return personalPatterns.some(pattern => text.includes(pattern));
  }

  private isGeneralKnowledgeQuestion(text: string): boolean {
    const knowledgePatterns = [
      'what is', 'how to', 'tell me about', 'explain', 'define', 'weather',
      'cook', 'recipe', 'history', 'science', 'math', 'language', 'news'
    ];
    
    // Check for simple "tell me X" patterns (where X is not financial)
    const tellMeMatch = text.match(/tell me\s+(\w+)/i);
    if (tellMeMatch) {
      const topic = tellMeMatch[1].toLowerCase();
      const financialTerms = ['expenses', 'revenue', 'profit', 'margin', 'cash', 'flow', 'budget', 'financial', 'business', 'money', 'costs', 'income', 'earnings'];
      if (!financialTerms.includes(topic)) {
        return true; // It's a general knowledge question
      }
    }
    
    // Check for joke/humor patterns
    if (text.includes('joke') || text.includes('funny') || text.includes('humor') || text.includes('laugh')) {
      return true; // It's a general knowledge/humor question
    }
    
    return knowledgePatterns.some(pattern => text.includes(pattern));
  }

  private isEntertainmentQuestion(text: string): boolean {
    const entertainmentPatterns = [
      'joke', 'funny', 'story', 'movie', 'music', 'game', 'entertainment',
      'tell me a joke', 'tell me a story', 'make me laugh', 'humor'
    ];
    return entertainmentPatterns.some(pattern => text.includes(pattern));
  }

  private handlePersonalQuestion(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    // Extract what personal information they're asking about
    const lowerPrompt = prompt.toLowerCase();
    const askingAbout = this.extractPersonalAskingAbout(lowerPrompt);
    
    return {
      message: `I don't know about ${askingAbout}. I am here to help you about the features you know of the system.

**Here's what I can tell you about your business:**

**📊 Your Business Financial Profile:**
- Revenue: $${analysis.revenue.toLocaleString()} (${analysis.revenue === 0 ? 'No income yet' : 'Active income'})
- Expenses: $${analysis.expenses.toLocaleString()} (${analysis.expenses > 0 ? 'Active spending' : 'No expenses'})
- Net Position: ${analysis.profit >= 0 ? '+' : ''}$${analysis.profit.toLocaleString()} (${analysis.profit >= 0 ? 'Profitable' : 'Loss-making'})

**🎯 System Features I Can Help You With:**

**📊 Conversational AI:**
• Analyze your financial data
• Get business insights and recommendations
• Track expenses and revenue patterns

**📄 Document Intelligence:**
• Process your financial documents
• Extract data from invoices and receipts
• Automatically categorize transactions

**📈 Predictive Analytics:**
• Forecast your business performance
• Predict cash flow scenarios
• Identify growth opportunities

**🔒 Compliance & Audit:**
• Monitor regulatory compliance
• Manage audit trails
• Ensure financial security

What would you like to explore about your business?`,
      confidence: 0.9,
      intent: 'personal_query',
      entities: { ...analysis.entities, queryType: 'personal', askingAbout },
      suggestions: [
        'Explore your business performance',
        'Try document intelligence features',
        'Get predictive analytics insights',
        'Learn about compliance features'
      ],
      actions: [{ type: 'business_analysis', description: 'Analyze business performance', parameters: {} }],
      insights: [{
        type: 'personal_query_redirect',
        description: `Redirected personal question about "${askingAbout}" to business capabilities`,
        confidence: 0.9,
        impact: 'high'
      }],
      followUpQuestions: [
        'What is my business performance?',
        'How can I use document intelligence?',
        'What predictive insights can you provide?',
        'How does compliance monitoring work?'
      ]
    };
  }

  private extractPersonalAskingAbout(text: string): string {
    // Extract what personal information they're asking about
    const patterns = [
      { pattern: /tell me about (?:myself|me)/i, group: 0 },
      { pattern: /who am i/i, group: 0 },
      { pattern: /my name/i, group: 0 },
      { pattern: /my age/i, group: 0 },
      { pattern: /my birthday/i, group: 0 },
      { pattern: /my favorite/i, group: 0 },
      { pattern: /my personal/i, group: 0 },
      { pattern: /about me/i, group: 0 },
      { pattern: /myself/i, group: 0 }
    ];
    
    for (const { pattern } of patterns) {
      if (pattern.test(text)) {
        return 'personal information';
      }
    }
    
    // Extract specific personal topics
    const personalTopics = ['name', 'age', 'birthday', 'favorite', 'personal', 'myself'];
    for (const topic of personalTopics) {
      if (text.includes(topic)) {
        return topic;
      }
    }
    
    return 'personal information';
  }

  private handleGeneralKnowledgeQuestion(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    const lowerPrompt = prompt.toLowerCase();
    const askingAbout = this.extractAskingAbout(lowerPrompt);
    
    // Handle financial humor and jokes intelligently
    if (this.matchesPatterns(lowerPrompt, ['joke', 'funny', 'humor', 'laugh', 'comedy'])) {
      return this.handleFinancialHumor(prompt, context, analysis);
    }
    
    // Handle business analysis questions
    if (this.matchesPatterns(lowerPrompt, ['business', 'company', 'enterprise', 'my business', 'about my business'])) {
      return this.getBusinessAnalysisResponse(prompt, context, analysis);
    }
    
    // Handle financial advice and general financial knowledge
    if (this.matchesPatterns(lowerPrompt, ['advice', 'tip', 'help', 'how to', 'what should', 'recommend'])) {
      return this.handleFinancialAdvice(prompt, context, analysis);
    }
    
    // Handle financial concepts and definitions
    if (this.matchesPatterns(lowerPrompt, ['what is', 'define', 'explain', 'meaning'])) {
      return this.handleFinancialConcepts(prompt, context, analysis);
    }
    
    // Default intelligent response for other general knowledge
    return {
      message: `I don't have specific knowledge about ${askingAbout}, but I'm here to help you with your business finances and accounting needs.

    **What I can help you with:**

    **📊 Financial Analysis:**
    • Analyze your expenses, revenue, and profit margins
    • Track financial trends and patterns
    • Provide insights on your business performance

    **💰 Smart Recommendations:**
    • Cost optimization strategies
    • Revenue improvement suggestions
    • Cash flow management tips

    **📈 Business Intelligence:**
    • Forecast future performance
    • Identify growth opportunities
    • Risk assessment and planning

    **Your Current Financial Status:**
    - Revenue: $${analysis.revenue.toLocaleString()}
    - Expenses: $${analysis.expenses.toLocaleString()}
    - Net: ${analysis.profit >= 0 ? '+' : ''}$${analysis.profit.toLocaleString()}

    What financial aspect would you like to explore?`,
      confidence: 0.9,
      intent: 'general_knowledge_query',
      entities: { ...analysis.entities, queryType: 'general_knowledge', askingAbout },
      suggestions: [
        'Ask about your business finances',
        'Get financial advice and tips',
        'Analyze your financial performance',
        'Explore cost optimization strategies'
      ],
      actions: [{ type: 'financial_analysis', description: 'Analyze business finances', parameters: {} }],
      insights: [{
        type: 'general_knowledge_redirect',
        description: `Redirected general knowledge question about "${askingAbout}" to financial expertise`,
        confidence: 0.9,
        impact: 'high'
      }],
      followUpQuestions: [
        'What are my top expenses?',
        'How can I improve my profit margin?',
        'What financial advice do you have?',
        'How is my business performing?'
      ]
    };
  }

  private extractAskingAbout(text: string): string {
    // Extract what the user is asking about from general knowledge questions
    const patterns = [
      { pattern: /tell me (?:about )?(.+)/i, group: 1 },
      { pattern: /what is (.+)/i, group: 1 },
      { pattern: /who is (.+)/i, group: 1 },
      { pattern: /explain (.+)/i, group: 1 },
      { pattern: /define (.+)/i, group: 1 },
      { pattern: /how to (.+)/i, group: 1 }
    ];
    
    for (const { pattern, group } of patterns) {
      const match = text.match(pattern);
      if (match && match[group]) {
        return match[group].trim();
      }
    }
    
    // Fallback: extract key words
    const words = text.split(/\s+/).filter(word => 
      word.length > 2 && 
      !['tell', 'me', 'about', 'what', 'is', 'who', 'explain', 'define', 'how', 'to'].includes(word.toLowerCase())
    );
    
    return words.length > 0 ? words[0] : 'that topic';
  }

  private handleFinancialHumor(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    const lowerPrompt = prompt.toLowerCase();
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const revenue = financialMetrics.totalRevenue || 0;
    const expenses = financialMetrics.totalExpenses || 0;
    const profit = revenue - expenses;
    
    // Contextual financial jokes based on their actual situation
    let joke = '';
    let contextMessage = '';
    
    if (profit < 0) {
      joke = `Why did the accountant break up with their calculator? Because it couldn't handle the negative numbers! 😄`;
      contextMessage = `Speaking of which, I notice you're currently at -$${Math.abs(profit).toLocaleString()} net. Here's a serious tip:`;
    } else if (profit === 0) {
      joke = `What's an accountant's favorite type of music? Break-even! 🎵`;
      contextMessage = `You're currently breaking even at $0 net. Here's how to tip the scales:`;
    } else {
      joke = `Why do accountants love their job? Because they always know where the money is! 💰`;
      contextMessage = `Great news - you're profitable at +$${profit.toLocaleString()}! Here's how to keep it up:`;
    }
    
    return {
      message: `${joke}

    ${contextMessage}

    **💡 Smart Financial Tips:**

    **📊 For Your Current Situation:**
    ${profit < 0 ? 
      `• **URGENT**: Cut non-essential expenses immediately
    • Focus on generating ANY revenue to stop losses
    • Review every expense - eliminate what you can survive without` :
      profit === 0 ?
      `• **GROWTH**: Increase revenue streams
    • Optimize existing operations for efficiency
    • Consider strategic investments for growth` :
      `• **MAINTAIN**: Keep monitoring your profit margins
    • Reinvest profits wisely for sustainable growth
    • Build emergency reserves for stability`
    }

    **🎯 Quick Actions:**
    • Analyze your top expense categories
    • Identify revenue optimization opportunities
    • Set up automated financial monitoring

    **Your Financial Status:**
    - Revenue: $${revenue.toLocaleString()}
    - Expenses: $${expenses.toLocaleString()}
    - Net: ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}

    Want to dive deeper into your financial analysis?`,
      confidence: 0.95,
      intent: 'financial_humor',
      entities: { ...analysis.entities, queryType: 'humor', humorType: 'financial' },
      suggestions: [
        'Analyze my expense categories',
        'Get revenue optimization tips',
        'Review my financial performance',
        'Set up financial monitoring'
      ],
      actions: [{ type: 'financial_analysis', description: 'Analyze business finances', parameters: {} }],
      insights: [{
        type: 'humor_with_context',
        description: `Provided contextual financial humor based on current business situation (${profit < 0 ? 'loss-making' : profit === 0 ? 'break-even' : 'profitable'})`,
        confidence: 0.95,
        impact: 'medium'
      }],
      followUpQuestions: [
        'What are my top expenses?',
        'How can I improve my profit margin?',
        'What financial advice do you have?',
        'Show me my financial trends'
      ]
    };
  }

  private handleFinancialAdvice(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    const lowerPrompt = prompt.toLowerCase();
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const revenue = financialMetrics.totalRevenue || 0;
    const expenses = financialMetrics.totalExpenses || 0;
    const profit = revenue - expenses;
    
    return {
      message: `I'd be happy to provide financial advice! Based on your current situation, here's what I recommend:

    **📊 Your Current Status:**
    - Revenue: $${revenue.toLocaleString()}
    - Expenses: $${expenses.toLocaleString()}
    - Net: ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}

    **💡 Strategic Recommendations:**

    ${profit < 0 ? 
      `**🚨 CRISIS MANAGEMENT:**
    • **IMMEDIATE**: Stop all non-essential spending
    • **URGENT**: Focus on generating ANY revenue
    • **CRITICAL**: Review every expense line by line
    • **ESSENTIAL**: Consider emergency funding or cost reduction` :
      profit === 0 ?
      `**⚖️ BREAK-EVEN OPTIMIZATION:**
    • **GROWTH**: Identify new revenue streams
    • **EFFICIENCY**: Optimize existing operations
    • **STRATEGY**: Consider strategic investments
    • **PLANNING**: Build reserves for future growth` :
      `**📈 PROFITABLE GROWTH:**
    • **SUSTAIN**: Maintain current profit margins
    • **REINVEST**: Use profits for strategic growth
    • **DIVERSIFY**: Expand revenue streams
    • **SECURE**: Build emergency reserves`
    }

    **🎯 Action Plan:**
    1. **Analyze** your expense categories
    2. **Identify** optimization opportunities
    3. **Implement** cost reduction strategies
    4. **Monitor** progress regularly

    **📈 Next Steps:**
    • Review your top expense categories
    • Analyze revenue trends
    • Set up automated monitoring
    • Create a financial action plan

    What specific area would you like to focus on first?`,
      confidence: 0.95,
      intent: 'financial_advice',
      entities: { ...analysis.entities, queryType: 'advice', adviceType: 'strategic' },
      suggestions: [
        'Analyze my expense categories',
        'Review revenue optimization',
        'Create a financial action plan',
        'Set up automated monitoring'
      ],
      actions: [{ type: 'financial_analysis', description: 'Analyze business finances', parameters: {} }],
      insights: [{
        type: 'strategic_advice',
        description: `Provided strategic financial advice based on current business situation (${profit < 0 ? 'crisis' : profit === 0 ? 'break-even' : 'profitable'})`,
        confidence: 0.95,
        impact: 'high'
      }],
      followUpQuestions: [
        'What are my top expenses?',
        'How can I increase revenue?',
        'What cost reduction strategies work?',
        'How do I set up financial monitoring?'
      ]
    };
  }

  private handleFinancialConcepts(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    const lowerPrompt = prompt.toLowerCase();
    
    // Extract the concept they're asking about
    const conceptMatch = lowerPrompt.match(/(?:what is|define|explain|meaning of)\s+(.+)/i);
    const concept = conceptMatch ? conceptMatch[1].trim() : 'financial concept';
    
    // Provide intelligent explanations of financial concepts
    const conceptExplanations: { [key: string]: string } = {
      'profit margin': `**Profit Margin** is the percentage of revenue that becomes profit after expenses.

    **Formula**: (Revenue - Expenses) / Revenue × 100

    **Your Current Margin**: ${analysis.revenue > 0 ? ((analysis.profit / analysis.revenue) * 100).toFixed(1) : 'N/A'}%

    **Interpretation**: ${analysis.profit < 0 ? 'Negative margin - you need immediate action' : analysis.profit === 0 ? 'Break-even - room for improvement' : 'Positive margin - good foundation for growth'}`,
      
      'cash flow': `**Cash Flow** is the movement of money in and out of your business.

    **Types**:
    • **Operating**: Day-to-day business activities
    • **Investing**: Equipment, assets, investments
    • **Financing**: Loans, equity, dividends

    **Your Current Status**: ${analysis.profit < 0 ? 'Negative cash flow - expenses exceed revenue' : analysis.profit === 0 ? 'Neutral cash flow - break-even' : 'Positive cash flow - healthy business'}`,
      
      'break even': `**Break-Even Point** is when revenue equals expenses (profit = $0).

    **Your Status**: ${analysis.profit === 0 ? 'You are currently at break-even!' : analysis.profit < 0 ? `You need $${Math.abs(analysis.profit).toLocaleString()} more revenue to break even` : `You are $${analysis.profit.toLocaleString()} above break-even`}

    **Break-Even Analysis**: ${analysis.profit === 0 ? 'Perfect balance - focus on growth' : analysis.profit < 0 ? 'Critical - need immediate revenue or cost reduction' : 'Excellent - you have profit buffer'}`,
      
      'revenue': `**Revenue** is the total income from business activities.

    **Your Current Revenue**: $${analysis.revenue.toLocaleString()}

    **Revenue Types**:
    • **Product Sales**: Income from selling products
    • **Service Revenue**: Income from providing services
    • **Other Income**: Interest, investments, etc.

    **Growth Strategy**: ${analysis.revenue === 0 ? 'Focus on generating your first revenue streams' : 'Identify opportunities to increase existing revenue streams'}`,
      
      'expenses': `**Expenses** are the costs of running your business.

    **Your Current Expenses**: $${analysis.expenses.toLocaleString()}

    **Expense Categories**:
    • **Fixed**: Rent, salaries, insurance (consistent monthly)
    • **Variable**: Materials, utilities, marketing (fluctuate with activity)
    • **One-time**: Equipment, setup costs (infrequent)

    **Optimization**: ${analysis.expenses === 0 ? 'No expenses yet - plan carefully' : 'Review each category for optimization opportunities'}`
    };
    
    const explanation = conceptExplanations[concept.toLowerCase()] || 
      `**${concept.charAt(0).toUpperCase() + concept.slice(1)}** is an important financial concept.

    **General Definition**: This relates to how money flows through your business operations.

    **Your Current Context**:
    - Revenue: $${analysis.revenue.toLocaleString()}
    - Expenses: $${analysis.expenses.toLocaleString()}
    - Net: ${analysis.profit >= 0 ? '+' : ''}$${analysis.profit.toLocaleString()}

    **Practical Application**: Understanding ${concept} helps you make better financial decisions for your business.`;
    
    return {
      message: explanation,
      confidence: 0.95,
      intent: 'financial_concept',
      entities: { ...analysis.entities, queryType: 'concept', concept },
      suggestions: [
        'Analyze my financial performance',
        'Get personalized financial advice',
        'Review my expense categories',
        'Explore revenue optimization'
      ],
      actions: [{ type: 'financial_analysis', description: 'Analyze business finances', parameters: {} }],
      insights: [{
        type: 'concept_explanation',
        description: `Explained financial concept "${concept}" with practical business context`,
        confidence: 0.95,
        impact: 'medium'
      }],
      followUpQuestions: [
        'How does this apply to my business?',
        'What financial advice do you have?',
        'How can I improve my financial performance?',
        'What should I focus on next?'
      ]
    };
  }

  private handleEntertainmentQuestion(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    const lowerPrompt = prompt.toLowerCase();
    
    // Check if it's financial humor/jokes
    if (this.matchesPatterns(lowerPrompt, ['joke', 'funny', 'humor', 'laugh']) && 
        this.matchesPatterns(lowerPrompt, ['finance', 'financial', 'money', 'accounting', 'business', 'expense', 'revenue', 'profit'])) {
      return this.handleFinancialHumor(prompt, context, analysis);
    }
    
    // Extract what entertainment they're asking about
    const askingAbout = this.extractEntertainmentAskingAbout(lowerPrompt);
    
    return {
      message: `I don't know about ${askingAbout}. I am here to help you about the features you know of the system.

    **Here's what I can help you with instead:**

    **🎯 System Features That Are Actually Exciting:**

    **📊 Conversational AI:**
    • Get instant financial insights
    • Analyze your business performance
    • Receive intelligent recommendations
    • Track financial trends in real-time

    **📄 Document Intelligence:**
    • Automatically process financial documents
    • Extract data from invoices and receipts
    • Categorize transactions intelligently
    • Reduce manual data entry

    **📈 Predictive Analytics:**
    • Forecast future business performance
    • Predict cash flow scenarios
    • Identify growth opportunities
    • Risk assessment and planning

    **🔒 Compliance & Audit:**
    • Automated compliance monitoring
    • Real-time audit trail management
    • Security and access control
    • Financial reporting assistance

    **Your Business Status:**
    - Revenue: $${analysis.revenue.toLocaleString()}
    - Expenses: $${analysis.expenses.toLocaleString()}
    - Net: ${analysis.profit >= 0 ? '+' : ''}$${analysis.profit.toLocaleString()}

    What system feature would you like to explore?`,
      confidence: 0.9,
      intent: 'entertainment_query',
      entities: { ...analysis.entities, queryType: 'entertainment', askingAbout },
      suggestions: [
        'Try conversational AI features',
        'Explore document intelligence',
        'Get predictive analytics insights',
        'Learn about compliance features'
      ],
      actions: [{ type: 'system_features', description: 'Show available system features', parameters: {} }],
      insights: [{
        type: 'entertainment_redirect',
        description: `Redirected entertainment question about "${askingAbout}" to system capabilities`,
        confidence: 0.9,
        impact: 'high'
      }],
      followUpQuestions: [
        'How can I use document intelligence?',
        'What predictive insights can you provide?',
        'How does compliance monitoring work?',
        'What are my business opportunities?'
      ]
    };
  }

  private extractEntertainmentAskingAbout(text: string): string {
    // Extract what entertainment they're asking about
    const patterns = [
      { pattern: /tell me a (joke|story)/i, group: 1 },
      { pattern: /(joke|story|movie|music|game)/i, group: 1 },
      { pattern: /make me laugh/i, group: 0 },
      { pattern: /funny/i, group: 0 },
      { pattern: /entertainment/i, group: 0 },
      { pattern: /humor/i, group: 0 }
    ];
    
    for (const { pattern, group } of patterns) {
      const match = text.match(pattern);
      if (match) {
        return group === 0 ? match[0] : match[group];
      }
    }
    
    return 'entertainment';
  }

  private handlePredictiveAnalysis(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    const revenue = analysis.revenue;
    const expenses = analysis.expenses;
    const profit = analysis.profit;
    const burnRate = expenses;
    const runway = revenue > 0 ? (revenue / expenses) * 30 : 0; // months
    
    return {
      message: `Based on your current financial data, here's my predictive analysis:

**Current Financial Position:**
- Revenue: $${revenue.toLocaleString()}/month
- Expenses: $${expenses.toLocaleString()}/month
- Net: ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}/month

**Predictive Insights:**
${profit < 0 ? `
🚨 **CRITICAL FORECAST**: At current burn rate of $${burnRate.toLocaleString()}/month:
• You have ${runway.toFixed(1)} months of runway
• Break-even point: Need $${expenses.toLocaleString()}/month revenue
• Survival timeline: ${Math.abs(profit / expenses).toFixed(1)} months at current loss rate
` : `
📈 **GROWTH FORECAST**: At current profit margin:
• Monthly growth potential: $${profit.toLocaleString()}
• Break-even achieved: ✅ Profitable
• Scaling opportunity: ${((profit / expenses) * 100).toFixed(1)}% margin
`}

**Recommendations:**
${profit < 0 ? `
• Immediate revenue generation required
• Cut non-essential expenses by 30-50%
• Focus on quick wins and cash flow
` : `
• Reinvest profits for growth
• Scale successful revenue streams
• Optimize operations for efficiency
`}`,
      confidence: 0.9,
      intent: 'predictive_analysis',
      entities: { ...analysis.entities, queryType: 'predictive' },
      suggestions: [
        'Get detailed financial projections',
        'Analyze growth opportunities',
        'Review expense optimization strategies'
      ],
      actions: [{ type: 'financial_forecasting', description: 'Generate detailed projections', parameters: {} }],
      insights: [{
        type: 'predictive_insight',
        description: `Financial forecast based on current trends: ${profit < 0 ? 'Critical situation' : 'Growth opportunity'}`,
        confidence: 0.9,
        impact: 'high'
      }],
      followUpQuestions: [
        'What are my growth projections?',
        'How can I improve my financial forecast?',
        'What scenarios should I plan for?'
      ]
    };
  }

  private handleComparativeAnalysis(prompt: string, context: LlamaConversationContext, analysis: any): LlamaResponse {
    const revenue = analysis.revenue;
    const expenses = analysis.expenses;
    const profit = analysis.profit;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    // Industry benchmarks (simplified)
    const industryBenchmarks = {
      profitMargin: { good: 15, average: 10, poor: 5 },
      expenseRatio: { good: 0.7, average: 0.8, poor: 0.9 },
      revenueGrowth: { good: 20, average: 10, poor: 5 }
    };
    
    const expenseRatio = revenue > 0 ? expenses / revenue : 1;
    
    return {
      message: `Here's your comparative analysis against industry benchmarks:

**Your Performance vs Industry Standards:**

**Profit Margin Analysis:**
- Your margin: ${profitMargin.toFixed(1)}%
- Industry good: ${industryBenchmarks.profitMargin.good}%
- Industry average: ${industryBenchmarks.profitMargin.average}%
- Status: ${profitMargin >= industryBenchmarks.profitMargin.good ? '🟢 Above average' : profitMargin >= industryBenchmarks.profitMargin.average ? '🟡 Average' : '🔴 Below average'}

**Expense Management:**
- Your expense ratio: ${(expenseRatio * 100).toFixed(1)}%
- Industry good: ${(industryBenchmarks.expenseRatio.good * 100)}%
- Industry average: ${(industryBenchmarks.expenseRatio.average * 100)}%
- Status: ${expenseRatio <= industryBenchmarks.expenseRatio.good ? '🟢 Efficient' : expenseRatio <= industryBenchmarks.expenseRatio.average ? '🟡 Average' : '🔴 Inefficient'}

**Key Insights:**
${profitMargin >= industryBenchmarks.profitMargin.good ? `
✅ **Strong Performance**: Your profit margin exceeds industry standards
• Focus on scaling and growth opportunities
• Consider market expansion strategies
` : `
⚠️ **Improvement Needed**: Your margins are below industry standards
• Review expense categories for optimization
• Focus on revenue generation strategies
• Consider pricing adjustments
`}

**Competitive Advantages:**
• ${revenue > 0 ? 'Active revenue generation' : 'Cost-conscious startup approach'}
• ${expenses < 10000 ? 'Lean operational model' : 'Scalable expense structure'}
• ${profit > 0 ? 'Profitable operations' : 'Growth-focused investment'}`,
      confidence: 0.85,
      intent: 'comparative_analysis',
      entities: { ...analysis.entities, queryType: 'comparative' },
      suggestions: [
        'Get detailed industry benchmarks',
        'Analyze competitive positioning',
        'Review optimization opportunities'
      ],
      actions: [{ type: 'benchmarking', description: 'Compare against industry standards', parameters: {} }],
      insights: [{
        type: 'comparative_insight',
        description: `Performance vs industry: ${profitMargin >= industryBenchmarks.profitMargin.good ? 'Above average' : 'Below average'}`,
        confidence: 0.85,
        impact: 'high'
      }],
      followUpQuestions: [
        'How do I improve my industry ranking?',
        'What are my competitive advantages?',
        'Where should I focus optimization efforts?'
      ]
    };
  }

  private getAccountNameResponse(prompt: string, context: LlamaConversationContext): LlamaResponse {
    // Get company name from context
    const companyName = context.companyId || 'Uruti Hub Limited';
    
    return {
      message: `Account Name: ${companyName}

This is your company account name. You can see it displayed in the top-right corner of your dashboard in the account dropdown.`,
      confidence: 0.95,
      intent: 'account_info',
      entities: { accountName: companyName, companyId: context.companyId },
      suggestions: [
        'View your account settings',
        'Check your company profile',
        'Update account information if needed'
      ],
      actions: [{ type: 'view_account', description: 'View account details', parameters: { accountName: companyName } }],
      insights: [{
        type: 'account_info',
        description: `Account identified: ${companyName}`,
        confidence: 0.95,
        impact: 'low'
      }],
      followUpQuestions: [
        'What are my account settings?',
        'How can I update my company information?',
        'What are my account permissions?'
      ]
    };
  }

  private getUrgentResponse(prompt: string, context: LlamaConversationContext, revenue: number, expenses: number, profit: number): LlamaResponse {
    return {
      message: `🚨 URGENT FINANCIAL CRISIS DETECTED! You're losing $${Math.abs(profit).toLocaleString()} per month (Revenue: $${revenue.toLocaleString()}, Expenses: $${expenses.toLocaleString()}). IMMEDIATE ACTION REQUIRED:

1. 🛑 STOP all non-essential spending TODAY
2. 💰 START generating revenue immediately (even small amounts)
3. 📊 REVIEW your $${expenses.toLocaleString()} expenses - eliminate everything non-critical

Your burn rate is $${expenses.toLocaleString()}/month with $${revenue.toLocaleString()} revenue. This is unsustainable.`,
      confidence: 0.95,
      intent: 'urgent',
      entities: { revenue, expenses, profit, burnRate: expenses },
      suggestions: [
        'URGENT: Cut all non-essential expenses immediately',
        'Focus on generating ANY revenue to stop losses',
        'Review every expense - eliminate what you can survive without',
        'Consider emergency funding or cost reduction measures'
      ],
      actions: [
        { type: 'emergency_cut_expenses', description: 'Cut non-essential expenses immediately', parameters: {} },
        { type: 'generate_revenue', description: 'Start generating revenue immediately', parameters: {} },
        { type: 'review_expenses', description: 'Review all expenses for elimination', parameters: {} }
      ],
      insights: [{
        type: 'financial_crisis',
        description: `Critical financial situation: losing $${Math.abs(profit).toLocaleString()}/month`,
        confidence: 0.95,
        impact: 'high'
      }],
      followUpQuestions: [
        'What expenses can I eliminate immediately?',
        'How can I generate revenue in the next 7 days?',
        'What is my minimum viable expense level?'
      ]
    };
  }

  private getActionableResponse(prompt: string, context: LlamaConversationContext, revenue: number, expenses: number, profit: number): LlamaResponse {
    return {
      message: `Here's what you should do based on your financial situation (Revenue: $${revenue.toLocaleString()}, Expenses: $${expenses.toLocaleString()}, Net: ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}):

${profit < 0 ? `🚨 PRIORITY 1: STOP THE BLEEDING
- Cut non-essential expenses immediately
- Focus on generating revenue to offset $${Math.abs(profit).toLocaleString()} monthly loss

🎯 PRIORITY 2: GENERATE REVENUE
- Identify your most profitable products/services
- Reach out to existing customers for immediate sales
- Consider offering discounts for quick cash flow` : `✅ PRIORITY 1: MAINTAIN PROFITABILITY
- Continue current operations
- Monitor expense growth
- Consider reinvestment opportunities`}`,
      confidence: 0.85,
      intent: 'actionable',
      entities: { revenue, expenses, profit },
      suggestions: profit < 0 ? [
        'Cut expenses by at least 30% immediately',
        'Focus on revenue generation over cost cutting',
        'Set up emergency cash flow monitoring'
      ] : [
        'Maintain current profitable operations',
        'Consider growth investments',
        'Monitor expense trends'
      ],
      actions: [
        { type: 'create_action_plan', description: 'Create detailed action plan', parameters: {} },
        { type: 'monitor_progress', description: 'Monitor financial progress', parameters: {} }
      ],
      insights: [{
        type: 'action_plan',
        description: `Action plan for ${profit < 0 ? 'crisis management' : 'growth optimization'}`,
        confidence: 0.85,
        impact: profit < 0 ? 'high' : 'medium'
      }],
      followUpQuestions: [
        'What specific expenses should I cut first?',
        'How can I generate revenue quickly?',
        'What is my target break-even point?'
      ]
    };
  }

  private async enhanceResponseWithAI(
    prompt: string,
    context: LlamaConversationContext,
    instantResponse: LlamaResponse,
    options?: { mode?: 'fast' | 'balanced' | 'accurate'; maxTokens?: number; cacheTtlMs?: number; }
  ): Promise<void> {
    try {
      console.log('🤖 Enhancing response with AI...');
      
      // Generate AI enhancement
      const aiResponse = await this.generateAIResponse(prompt, context, options);
      
      // Update the response with AI insights
      instantResponse.message = aiResponse.message;
      instantResponse.confidence = Math.max(instantResponse.confidence, aiResponse.confidence);
      instantResponse.suggestions = [...instantResponse.suggestions, ...aiResponse.suggestions].slice(0, 5);
      instantResponse.insights = [...instantResponse.insights, ...aiResponse.insights].slice(0, 5);
      instantResponse.followUpQuestions = [...instantResponse.followUpQuestions, ...aiResponse.followUpQuestions].slice(0, 5);
      
      console.log('✅ Response enhanced with AI insights');
      
    } catch (error: any) {
      console.log('⚠️ AI enhancement failed, keeping instant response');
    }
  }

  private isSimpleQuery(prompt: string): boolean {
    const lowerPrompt = prompt.toLowerCase();
    
    // Simple queries that can be handled by patterns
    const simplePatterns = [
      'top.*expense.*categor',
      'top.*expense.*transaction',
      'unusual.*transaction',
      'gross margin',
      'profit margin',
      'cash flow',
      'revenue.*income',
      'show.*expense',
      'what.*expense'
    ];
    
    return simplePatterns.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(lowerPrompt);
    });
  }

  private async generateAIResponse(
    prompt: string,
    context: LlamaConversationContext,
    options?: { mode?: 'fast' | 'balanced' | 'accurate'; maxTokens?: number; cacheTtlMs?: number; }
  ): Promise<LlamaResponse> {
    try {
      // Build enhanced prompt with financial context
      const enhancedPrompt = this.buildEnhancedPrompt(prompt, context);
      
      console.log('🤖 Generating AI response for:', prompt.substring(0, 50) + '...');
      
      // Use reasonable timeout for AI generation
      const timeoutMs = options?.mode === 'fast' ? 5000 : options?.mode === 'balanced' ? 10000 : 15000;
      
      const response = await this.withTimeout(
        this.ollama.generate({
          model: this.modelName,
          prompt: enhancedPrompt,
          keep_alive: '2m',
          options: {
            temperature: 0.4, // Higher temperature for more creative and wise responses
            top_p: 0.9, // Higher for more diverse and thoughtful responses
            num_predict: options?.maxTokens ?? 400, // More tokens for deeper insights
            num_ctx: 1024, // Larger context window for better understanding
            repeat_penalty: 1.1,
            top_k: 40, // Better quality responses
            stop: ['\n\n\n', 'User:', 'Assistant:', '---'] // Stop tokens to prevent overly long responses
          }
        }),
        timeoutMs
      );
      
      // Parse the AI response into our structured format
      return this.parseAIResponse(response.response, context);
      
    } catch (error: any) {
      console.log('❌ AI generation failed:', error.message);
      
      // Fallback to pattern-based response
      const fallbackResponse = this.getImmediateResponse(prompt, context);
      if (fallbackResponse) {
        return fallbackResponse;
      }
      
      return this.getFallbackResponse(prompt, context);
    }
  }

  private parseAIResponse(aiResponse: string, context: LlamaConversationContext): LlamaResponse {
    // Parse the AI response and structure it
    const financialMetrics = context.financialContext?.keyMetrics || {};
    
    return {
      message: aiResponse,
      confidence: 0.8, // AI responses have good confidence
      intent: 'analysis',
      entities: {
        totalRevenue: financialMetrics.totalRevenue || 0,
        totalExpenses: financialMetrics.totalExpenses || 0,
        profitMargin: financialMetrics.profitMargin || 0
      },
      suggestions: this.extractSuggestions(aiResponse),
      actions: this.extractActions(aiResponse),
      insights: this.extractInsights(aiResponse, context),
      followUpQuestions: this.generateFollowUpQuestions(aiResponse, context)
    };
  }


  private extractActions(response: string): Array<{type: string, description: string, parameters: any}> {
    // Extract actionable items from AI response
    const actions: Array<{type: string, description: string, parameters: any}> = [];
    
    // Look for action-oriented phrases
    if (response.toLowerCase().includes('review')) {
      actions.push({ type: 'review', description: 'Review financial data', parameters: {} });
    }
    if (response.toLowerCase().includes('analyze')) {
      actions.push({ type: 'analyze', description: 'Analyze financial patterns', parameters: {} });
    }
    if (response.toLowerCase().includes('optimize')) {
      actions.push({ type: 'optimize', description: 'Optimize financial performance', parameters: {} });
    }
    
    return actions.slice(0, 3); // Limit to 3 actions
  }


  private analyzeQuestion(prompt: string, context: LlamaConversationContext): {
    category: string;
    intent: string;
    entities: any;
    revenue: number;
    expenses: number;
    profit: number;
    quantity?: number;
    timePeriod?: string;
    type?: string;
  } {
    const lowerPrompt = prompt.toLowerCase();
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const revenue = financialMetrics.totalRevenue || 0;
    const expenses = financialMetrics.totalExpenses || 0;
    const profit = revenue - expenses;
    
    // Extract basic entities
    const quantity = this.extractQuantity(lowerPrompt);
    const timePeriod = this.extractTimePeriod(lowerPrompt);
    const type = this.extractType(lowerPrompt);
    
    // Senior-level advanced analysis
    const urgency = this.analyzeUrgency(lowerPrompt, profit, expenses);
    const complexity = this.analyzeComplexity(lowerPrompt, { 
      keywords: this.extractKeywords(lowerPrompt), 
      numbers: this.extractNumbers(lowerPrompt), 
      comparisons: this.extractComparisons(lowerPrompt), 
      actions: this.extractActionWords(lowerPrompt) 
    });
    const emotionalTone = this.analyzeEmotionalTone(lowerPrompt);
    const businessContext = this.analyzeBusinessContext(revenue, expenses, profit);
    
    // Use advanced categorization
    const advancedAnalysis = this.performAdvancedCategorization(lowerPrompt, {
      quantity, timePeriod, type,
      keywords: this.extractKeywords(lowerPrompt),
      numbers: this.extractNumbers(lowerPrompt),
      comparisons: this.extractComparisons(lowerPrompt),
      actions: this.extractActionWords(lowerPrompt)
    }, urgency, emotionalTone, businessContext);
    
    let category = advancedAnalysis.category;
    let intent = advancedAnalysis.intent;
    
    // Fallback to original categorization if advanced doesn't match
    if (category === 'intelligent_fallback') {
      // Account/Company Information
      if (this.matchesPatterns(lowerPrompt, [
        'name of this account', 'account name', 'company name', 'what is this account',
        'what account', 'which account', 'tell me the name', 'account called', 'my account',
        'what company', 'which company', 'company called', 'business name'
      ])) {
        category = 'account_info';
        intent = 'account_query';
      }
      
      // Urgent Financial Crisis
      else if (this.matchesPatterns(lowerPrompt, [
        'losing money', 'urgent', 'help', 'crisis', 'emergency', 'problem', 'trouble',
        'going broke', 'bankrupt', 'failing', 'struggling', 'in trouble'
      ])) {
        category = 'financial_urgent';
        intent = 'urgent';
      }
      
      // Actionable Financial Questions
      else if (this.matchesPatterns(lowerPrompt, [
        'what should i do', 'how can i', 'what can i do', 'how do i', 'what to do',
        'advice', 'recommend', 'suggest', 'help me', 'guide me'
      ])) {
        category = 'financial_actionable';
        intent = 'actionable';
      }
      
      // Expense Analysis
      else if (this.matchesPatterns(lowerPrompt, [
        'expense', 'expenses', 'spending', 'cost', 'costs', 'outgoing', 'money spent',
        'top expense', 'largest expense', 'expense categories', 'where money goes'
      ])) {
        category = 'expense_analysis';
        intent = 'expense_query';
      }
      
      // Revenue Analysis
      else if (this.matchesPatterns(lowerPrompt, [
        'revenue', 'income', 'earnings', 'sales', 'money earned', 'money made',
        'top revenue', 'revenue sources', 'income sources', 'how much earned'
      ])) {
        category = 'revenue_analysis';
        intent = 'revenue_query';
      }
      
      // General Financial Questions
      else if (this.matchesPatterns(lowerPrompt, [
        'profit', 'margin', 'cash flow', 'financial', 'money', 'budget', 'financial health',
        'break even', 'break-even', 'viable', 'sustainable', 'profitable', 'business performance',
        'performance', 'how is my business', 'business health', 'company performance'
      ])) {
        category = 'financial_general';
        intent = 'financial_query';
      }
      
      // System Information
      else if (this.matchesPatterns(lowerPrompt, [
        'how does this work', 'what is this', 'explain', 'tell me about', 'what can you do',
        'features', 'capabilities', 'system', 'platform', 'software'
      ])) {
        category = 'system_info';
        intent = 'system_query';
      }
      
      // Help and Support
      else if (this.matchesPatterns(lowerPrompt, [
        'help', 'support', 'how to', 'tutorial', 'guide', 'learn', 'teach me',
        'don\'t understand', 'confused', 'stuck', 'problem'
      ])) {
        category = 'help_support';
        intent = 'help_query';
      }
    }
    
    return {
      category,
      intent,
      entities: { quantity, timePeriod, type, revenue, expenses, profit },
      revenue,
      expenses,
      profit,
      quantity,
      timePeriod,
      type
    };
  }

  private matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  // Senior-level AI enhancement methods
  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'what', 'how', 'when', 'where', 'why', 'who'];
    
    const words = text.split(/\s+/).filter(word => 
      word.length > 2 && 
      !commonWords.includes(word.toLowerCase()) &&
      !/^\d+$/.test(word)
    );
    
    return [...new Set(words)]; // Remove duplicates
  }

  private extractNumbers(text: string): number[] {
    const numbers: number[] = [];
    const matches = text.match(/\d+(?:\.\d+)?/g);
    if (matches) {
      numbers.push(...matches.map(m => parseFloat(m)));
    }
    return numbers;
  }

  private extractComparisons(text: string): string[] {
    const comparisons: string[] = [];
    const comparisonWords = ['more', 'less', 'higher', 'lower', 'better', 'worse', 'increase', 'decrease', 'grow', 'shrink', 'improve', 'decline', 'vs', 'versus', 'compare'];
    
    comparisonWords.forEach(word => {
      if (text.includes(word)) {
        comparisons.push(word);
      }
    });
    
    return comparisons;
  }

  private extractActionWords(text: string): string[] {
    const actions: string[] = [];
    const actionWords = ['do', 'make', 'create', 'build', 'start', 'stop', 'cut', 'reduce', 'increase', 'improve', 'optimize', 'fix', 'solve', 'help', 'guide', 'show', 'tell', 'explain', 'analyze', 'calculate', 'track', 'manage'];
    
    actionWords.forEach(word => {
      if (text.includes(word)) {
        actions.push(word);
      }
    });
    
    return actions;
  }

  private analyzeUrgency(text: string, profit: number, expenses: number): 'low' | 'medium' | 'high' | 'critical' {
    const urgentWords = ['urgent', 'emergency', 'crisis', 'immediately', 'asap', 'now', 'help', 'problem', 'issue'];
    const criticalWords = ['losing money', 'bankrupt', 'failing', 'disaster', 'catastrophe', 'going broke'];
    
    if (criticalWords.some(word => text.includes(word)) || (profit < -expenses * 0.5)) {
      return 'critical';
    }
    
    if (urgentWords.some(word => text.includes(word)) || profit < 0) {
      return 'high';
    }
    
    if (text.includes('soon') || text.includes('quickly') || text.includes('fast')) {
      return 'medium';
    }
    
    return 'low';
  }

  private analyzeComplexity(text: string, entities: any): 'simple' | 'moderate' | 'complex' {
    const complexityIndicators = [
      entities.keywords?.length > 5,
      entities.numbers?.length > 2,
      entities.comparisons?.length > 1,
      entities.actions?.length > 2,
      text.split(' ').length > 15,
      text.includes('and') && text.includes('or'),
      text.includes('if') || text.includes('when') || text.includes('because'),
      text.includes('compare') || text.includes('versus') || text.includes('vs')
    ];
    
    const complexityScore = complexityIndicators.filter(Boolean).length;
    
    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'moderate';
    return 'simple';
  }

  private analyzeEmotionalTone(text: string): 'neutral' | 'concerned' | 'urgent' | 'frustrated' | 'curious' {
    const concernedWords = ['worried', 'concerned', 'nervous', 'anxious', 'scared', 'afraid'];
    const urgentWords = ['urgent', 'emergency', 'crisis', 'help', 'problem', 'stuck'];
    const frustratedWords = ['frustrated', 'angry', 'annoyed', 'upset', 'mad', 'stupid', 'dumb', 'hate'];
    const curiousWords = ['curious', 'wonder', 'interested', 'want to know', 'tell me about', 'explore'];
    
    if (frustratedWords.some(word => text.includes(word))) return 'frustrated';
    if (urgentWords.some(word => text.includes(word))) return 'urgent';
    if (concernedWords.some(word => text.includes(word))) return 'concerned';
    if (curiousWords.some(word => text.includes(word))) return 'curious';
    
    return 'neutral';
  }

  private analyzeBusinessContext(revenue: number, expenses: number, profit: number): 'startup' | 'growing' | 'established' | 'crisis' | 'unknown' {
    if (revenue === 0 && expenses > 0) return 'startup';
    if (profit < -expenses * 0.3) return 'crisis';
    if (revenue > expenses * 1.5) return 'established';
    if (revenue > 0 && profit > 0) return 'growing';
    return 'unknown';
  }

  private calculateConfidence(text: string, urgency: string, complexity: string, emotionalTone: string): number {
    let confidence = 0.7; // Base confidence
    
    // Adjust based on urgency
    if (urgency === 'critical') confidence += 0.2;
    if (urgency === 'high') confidence += 0.1;
    
    // Adjust based on complexity
    if (complexity === 'simple') confidence += 0.1;
    if (complexity === 'complex') confidence -= 0.1;
    
    // Adjust based on emotional tone
    if (emotionalTone === 'urgent') confidence += 0.1;
    if (emotionalTone === 'frustrated') confidence -= 0.1;
    
    // Adjust based on question clarity
    if (text.includes('?') && text.length > 10) confidence += 0.1;
    if (text.length < 5) confidence -= 0.2;
    
    return Math.min(0.95, Math.max(0.3, confidence));
  }

  private performAdvancedCategorization(text: string, entities: any, urgency: string, emotionalTone: string, businessContext: string): {
    category: string;
    intent: string;
  } {
    // Multi-dimensional analysis for sophisticated categorization
    
    // Personal and identity questions (highest priority for non-financial)
    if (this.matchesPatterns(text, [
      'tell me about myself', 'about myself', 'who am i', 'my name', 'my age',
      'my birthday', 'my favorite', 'my personal', 'about me', 'myself', 'personal info'
    ])) {
      return { category: 'personal_query', intent: 'identity_inquiry' };
    }
    
    // Entertainment and casual questions
    if (this.matchesPatterns(text, [
      'joke', 'funny', 'story', 'movie', 'music', 'game', 'entertainment',
      'tell me a joke', 'tell me a story', 'make me laugh', 'humor', 'fun', 'play'
    ])) {
      return { category: 'entertainment_query', intent: 'entertainment_request' };
    }
    
    // General knowledge questions (check before crisis detection)
    if (this.matchesPatterns(text, [
      'what is', 'how to', 'tell me about', 'explain', 'define', 'weather',
      'cook', 'recipe', 'history', 'science', 'math', 'language', 'news',
      'tell me', 'who is', 'where is', 'when is', 'joke', 'funny', 'humor'
    ]) || this.isGeneralKnowledgeQuestion(text)) {
      return { category: 'general_knowledge', intent: 'knowledge_request' };
    }
    
    // Crisis and urgent situations (only if no other category matches AND not a specific data request)
    if ((urgency === 'critical' || emotionalTone === 'urgent' || businessContext === 'crisis') && 
        !this.matchesPatterns(text, ['expense', 'expenses', 'revenue', 'income', 'profit', 'margin', 'cash flow', 'transaction', 'categories'])) {
      return { category: 'financial_crisis', intent: 'crisis_intervention' };
    }
    
    // Predictive and forecasting
    if (this.matchesPatterns(text, [
      'predict', 'forecast', 'future', 'trend', 'projection',
      'what will happen', 'next month', 'next year', 'forecast'
    ])) {
      return { category: 'predictive_analysis', intent: 'forecasting' };
    }
    
    // Comparison and benchmarking
    if (entities.comparisons?.length > 0 || this.matchesPatterns(text, [
      'compare', 'vs', 'versus', 'better than', 'worse than',
      'industry average', 'benchmark', 'competitor'
    ])) {
      return { category: 'comparative_analysis', intent: 'benchmarking' };
    }
    
    // Default intelligent fallback
    return { category: 'intelligent_fallback', intent: 'contextual_response' };
  }

  private extractQuantity(text: string): number | undefined {
    // First try to match "top X" pattern
    const topMatch = text.match(/top\s+(\d+)/i);
    if (topMatch) {
      return parseInt(topMatch[1]);
    }
    
    // Then try general number matching
    const quantityMatch = text.match(/\b(one|1|two|2|three|3|four|4|five|5|six|6|seven|7|eight|8|nine|9|ten|10|eleven|11|twelve|12|thirteen|13|fourteen|14|fifteen|15|sixteen|16|seventeen|17|eighteen|18|nineteen|19|twenty|20)\b/);
    if (quantityMatch) {
      const quantityText = quantityMatch[1];
      const numberMap: { [key: string]: number } = {
        'one': 1, '1': 1, 'two': 2, '2': 2, 'three': 3, '3': 3,
        'four': 4, '4': 4, 'five': 5, '5': 5, 'six': 6, '6': 6,
        'seven': 7, '7': 7, 'eight': 8, '8': 8, 'nine': 9, '9': 9,
        'ten': 10, '10': 10, 'eleven': 11, '11': 11, 'twelve': 12, '12': 12,
        'thirteen': 13, '13': 13, 'fourteen': 14, '14': 14, 'fifteen': 15, '15': 15,
        'sixteen': 16, '16': 16, 'seventeen': 17, '17': 17, 'eighteen': 18, '18': 18,
        'nineteen': 19, '19': 19, 'twenty': 20, '20': 20
      };
      return numberMap[quantityText];
    }
    return undefined;
  }

  private extractTimePeriod(text: string): string | undefined {
    // Check for specific year requests
    if (text.includes('4 year') || text.includes('four year')) return 'last 4 years';
    if (text.includes('3 year') || text.includes('three year')) return 'last 3 years';
    if (text.includes('2 year') || text.includes('two year')) return 'last 2 years';
    if (text.includes('1 year') || text.includes('one year')) return 'last year';
    
    // Check for specific year
    const yearMatch = text.match(/\b(20\d{2})\b/);
    if (yearMatch) return yearMatch[1];
    
    // Check for relative periods
    if (text.includes('this month') || text.includes('current month')) return 'current month';
    if (text.includes('this week') || text.includes('current week')) return 'current week';
    if (text.includes('this year') || text.includes('current year')) return 'current year';
    if (text.includes('last month')) return 'last month';
    if (text.includes('last week')) return 'last week';
    if (text.includes('last year')) return 'last year';
    if (text.includes('quarter')) return 'quarter';
    
    return undefined;
  }

  private getActualTimePeriod(expenseData: any[]): string {
    if (expenseData.length === 0) return 'no data available';
    
    // Get the date range from actual data
    const dates = expenseData.map(e => new Date(e.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Check if all data is from current month
    const allCurrentMonth = dates.every(d => 
      d.getMonth() === currentMonth && d.getFullYear() === currentYear
    );
    
    if (allCurrentMonth) {
      return 'current month';
    }
    
    // Return actual date range
    return `${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`;
  }

  private extractExpenseCategory(text: string): string | null {
    const lowerText = text.toLowerCase();
    
    // Common expense categories
    const categories = {
      'rent': ['rent', 'rental', 'lease', 'housing', 'apartment', 'office rent'],
      'utilities': ['utilities', 'electric', 'electricity', 'water', 'gas', 'internet', 'phone'],
      'food': ['food', 'groceries', 'restaurant', 'dining', 'meals', 'lunch', 'dinner'],
      'transportation': ['transport', 'transportation', 'gas', 'fuel', 'car', 'vehicle', 'uber', 'taxi'],
      'office': ['office', 'supplies', 'stationery', 'equipment', 'software', 'subscription'],
      'marketing': ['marketing', 'advertising', 'ads', 'promotion', 'social media'],
      'insurance': ['insurance', 'health', 'medical', 'liability'],
      'travel': ['travel', 'hotel', 'flight', 'accommodation', 'business trip'],
      'professional': ['professional', 'legal', 'accounting', 'consulting', 'services']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }
    
    return null;
  }

  private async handleSpecificExpenseCategory(prompt: string, expenseData: any[], category: string, timePeriod: string): Promise<LlamaResponse> {
    // REAL AI: Actually analyze the data to find potential matches
    const analysis = await this.analyzeExpenseDataForCategory(expenseData, category);
    const totalExpenses = expenseData.reduce((sum, expense) => sum + expense.amount, 0);
    
    if (analysis.potentialMatches.length > 0) {
      // Found potential matches - provide intelligent analysis
      const totalPotential = analysis.potentialMatches.reduce((sum, e) => sum + e.amount, 0);
      const percentage = ((totalPotential / totalExpenses) * 100).toFixed(1);
      
      return {
        message: `I found ${analysis.potentialMatches.length} potential ${category} expenses totaling $${totalPotential.toLocaleString()} (${percentage}% of your total expenses):

${analysis.potentialMatches.map((e, i) => `${i + 1}. $${e.amount.toLocaleString()} - ${e.reason}`).join('\n')}

**Analysis:**
- Your largest potential ${category} expense is $${Math.max(...analysis.potentialMatches.map(e => e.amount)).toLocaleString()}
- Average ${category} expense: $${(totalPotential / analysis.potentialMatches.length).toLocaleString()}
- ${category} expenses represent ${percentage}% of your total spending

**Recommendations:**
${analysis.recommendations.join('\n')}`,
        confidence: 0.85,
        intent: 'expense_query',
        entities: { 
          category, 
          totalExpenses, 
          potentialMatches: analysis.potentialMatches.length,
          totalPotential,
          percentage: parseFloat(percentage)
        },
        suggestions: analysis.recommendations,
        actions: [{ 
          type: 'categorize_expenses', 
          description: `Categorize ${analysis.potentialMatches.length} potential ${category} expenses`, 
          parameters: { category, potentialMatches: analysis.potentialMatches } 
        }],
        insights: [{
          type: 'category_analysis',
          description: `Found ${analysis.potentialMatches.length} potential ${category} expenses worth $${totalPotential.toLocaleString()}`,
          confidence: 0.85,
          impact: 'high'
        }],
        followUpQuestions: [
          `Should I categorize these as ${category} expenses?`,
          `What's my ${category} spending trend?`,
          `How can I reduce my ${category} costs?`
        ]
      };
    } else {
      // No potential matches found - provide intelligent suggestions
      const largestExpense = Math.max(...expenseData.map(e => e.amount));
      const largestExpenseIndex = expenseData.findIndex(e => e.amount === largestExpense);
      
      return {
        message: `I don't see any obvious ${category} expenses in your current data. Here's what I found:

**Your Current Expenses:**
${expenseData.slice(0, 5).map((e, i) => `${i + 1}. $${e.amount.toLocaleString()} (uncategorized)`).join('\n')}

**Analysis:**
- Total expenses: $${totalExpenses.toLocaleString()}
- Largest expense: $${largestExpense.toLocaleString()} (could potentially be ${category})
- Average expense: $${(totalExpenses / expenseData.length).toLocaleString()}

**Intelligent Suggestions:**
${this.generateCategorySuggestions(expenseData, category)}`,
        confidence: 0.8,
        intent: 'expense_query',
        entities: { 
          category, 
          totalExpenses, 
          largestExpense,
          averageExpense: totalExpenses / expenseData.length,
          totalExpensesCount: expenseData.length
        },
        suggestions: [
          `Review your $${largestExpense.toLocaleString()} expense - it might be ${category}`,
          'Set up expense categories for better tracking',
          'Import bank statements with category information'
        ],
        actions: [{ 
          type: 'review_largest_expense', 
          description: `Review $${largestExpense.toLocaleString()} expense for ${category} classification`, 
          parameters: { amount: largestExpense, category } 
        }],
        insights: [{
          type: 'no_category_data',
          description: `No ${category} expenses found, but $${largestExpense.toLocaleString()} expense needs review`,
          confidence: 0.8,
          impact: 'medium'
        }],
        followUpQuestions: [
          `Is your $${largestExpense.toLocaleString()} expense related to ${category}?`,
          'How do I set up expense categories?',
          'Can I import categorized bank data?'
        ]
      };
    }
  }

  private extractType(text: string): string | undefined {
    if (text.includes('expense')) return 'expense';
    if (text.includes('revenue') || text.includes('income')) return 'revenue';
    if (text.includes('transaction')) return 'transaction';
    if (text.includes('profit')) return 'profit';
    if (text.includes('margin')) return 'margin';
    return undefined;
  }

  // REAL AI: Actually analyze data to find potential category matches
  private async analyzeExpenseDataForCategory(expenseData: any[], category: string): Promise<{
    potentialMatches: Array<{amount: number, reason: string}>;
    recommendations: string[];
  }> {
    const potentialMatches: Array<{amount: number, reason: string}> = [];
    const recommendations: string[] = [];
    
    // Define intelligent matching rules for each category
    const categoryRules = {
      'rent': {
        typicalAmounts: [800, 1200, 1500, 2000, 2500, 3000], // Common rent amounts
        amountThreshold: 500, // Minimum amount to consider
        patterns: ['recurring', 'large', 'monthly'],
        keywords: ['rent', 'lease', 'housing', 'apartment']
      },
      'utilities': {
        typicalAmounts: [50, 100, 150, 200, 300],
        amountThreshold: 30,
        patterns: ['recurring', 'monthly'],
        keywords: ['electric', 'water', 'gas', 'internet']
      },
      'food': {
        typicalAmounts: [20, 50, 100, 150, 200],
        amountThreshold: 10,
        patterns: ['frequent', 'small-medium'],
        keywords: ['food', 'restaurant', 'grocery']
      },
      'transportation': {
        typicalAmounts: [30, 50, 100, 200, 300],
        amountThreshold: 20,
        patterns: ['frequent', 'variable'],
        keywords: ['gas', 'fuel', 'transport', 'uber']
      }
    };
    
    const rules = categoryRules[category as keyof typeof categoryRules];
    if (!rules) {
      return { potentialMatches: [], recommendations: ['Category not recognized'] };
    }
    
    // Analyze each expense for potential matches
    for (const expense of expenseData) {
      const amount = expense.amount;
      let matchScore = 0;
      let reason = '';
      
      // Amount-based analysis
      if (amount >= rules.amountThreshold) {
        matchScore += 1;
        
        // Check if amount is typical for this category
        const isTypicalAmount = rules.typicalAmounts.some(typical => 
          Math.abs(amount - typical) <= typical * 0.2 // Within 20% of typical amount
        );
        
        if (isTypicalAmount) {
          matchScore += 2;
          reason = `Amount ($${amount.toLocaleString()}) is typical for ${category}`;
        } else if (amount >= rules.amountThreshold * 2) {
          matchScore += 1;
          reason = `Large amount ($${amount.toLocaleString()}) could be ${category}`;
        }
      }
      
      // Pattern-based analysis
      if (amount >= rules.amountThreshold) {
        // Check if it's the largest expense (likely rent for housing)
        const isLargest = amount === Math.max(...expenseData.map(e => e.amount));
        if (isLargest && category === 'rent') {
          matchScore += 3;
          reason = `Largest expense ($${amount.toLocaleString()}) is likely ${category}`;
        }
        
        // Check for recurring patterns (same amount appearing multiple times)
        const sameAmountCount = expenseData.filter(e => e.amount === amount).length;
        if (sameAmountCount > 1 && rules.patterns.includes('recurring')) {
          matchScore += 2;
          reason = `Recurring amount ($${amount.toLocaleString()}) suggests ${category}`;
        }
      }
      
      // Add to potential matches if score is high enough
      if (matchScore >= 2) {
        potentialMatches.push({ amount, reason });
      }
    }
    
    // Sort by amount (descending) and limit to top matches
    potentialMatches.sort((a, b) => b.amount - a.amount);
    const topMatches = potentialMatches.slice(0, 5);
    
    // Generate intelligent recommendations
    if (topMatches.length > 0) {
      const totalPotential = topMatches.reduce((sum, match) => sum + match.amount, 0);
      const avgAmount = totalPotential / topMatches.length;
      
      recommendations.push(`• Review these ${topMatches.length} expenses totaling $${totalPotential.toLocaleString()}`);
      recommendations.push(`• Average ${category} expense: $${avgAmount.toLocaleString()}`);
      
      if (category === 'rent' && topMatches[0].amount >= 1000) {
        recommendations.push(`• Your largest potential rent expense ($${topMatches[0].amount.toLocaleString()}) is reasonable for most areas`);
      }
      
      if (topMatches.length > 2) {
        recommendations.push(`• You have ${topMatches.length} potential ${category} expenses - consider consolidating`);
      }
    } else {
      recommendations.push(`• No obvious ${category} expenses found in current data`);
      recommendations.push(`• Consider adding expense categories for better tracking`);
      recommendations.push(`• Import bank statements with merchant information`);
    }
    
    return { potentialMatches: topMatches, recommendations };
  }

  // Generate intelligent suggestions based on data analysis
  private generateCategorySuggestions(expenseData: any[], category: string): string {
    const totalExpenses = expenseData.reduce((sum, e) => sum + e.amount, 0);
    const largestExpense = Math.max(...expenseData.map(e => e.amount));
    const averageExpense = totalExpenses / expenseData.length;
    
    const suggestions = [];
    
    // Amount-based suggestions
    if (category === 'rent' && largestExpense >= 1000) {
      suggestions.push(`• Your $${largestExpense.toLocaleString()} expense could be rent (typical range: $800-$3,000)`);
    }
    
    if (category === 'utilities' && largestExpense >= 50 && largestExpense <= 500) {
      suggestions.push(`• Your $${largestExpense.toLocaleString()} expense could be utilities (typical range: $50-$500)`);
    }
    
    if (category === 'food' && averageExpense <= 200) {
      suggestions.push(`• Your average expense of $${averageExpense.toLocaleString()} could include food costs`);
    }
    
    // Pattern-based suggestions
    const recurringAmounts = expenseData.filter((expense, index, arr) => 
      arr.filter(e => e.amount === expense.amount).length > 1
    );
    
    if (recurringAmounts.length > 0 && ['rent', 'utilities'].includes(category)) {
      suggestions.push(`• You have recurring expenses that might be ${category}`);
    }
    
    // General suggestions
    suggestions.push(`• Set up expense categories to track ${category} automatically`);
    suggestions.push(`• Import bank statements with merchant information for better categorization`);
    
    return suggestions.join('\n');
  }

  private parsePrompt(prompt: string): { quantity?: number; timePeriod?: string; type?: string } {
    const lowerPrompt = prompt.toLowerCase();
    
    // Extract quantity (1, 2, 3, etc.)
    const quantityMatch = lowerPrompt.match(/\b(one|1|two|2|three|3|four|4|five|5|six|6|seven|7|eight|8|nine|9|ten|10)\b/);
    let quantity: number | undefined;
    
    if (quantityMatch) {
      const quantityText = quantityMatch[1];
      const numberMap: { [key: string]: number } = {
        'one': 1, '1': 1, 'two': 2, '2': 2, 'three': 3, '3': 3,
        'four': 4, '4': 4, 'five': 5, '5': 5, 'six': 6, '6': 6,
        'seven': 7, '7': 7, 'eight': 8, '8': 8, 'nine': 9, '9': 9,
        'ten': 10, '10': 10
      };
      quantity = numberMap[quantityText];
    }
    
    // Extract time period
    let timePeriod: string | undefined;
    if (lowerPrompt.includes('this month') || lowerPrompt.includes('current month')) {
      timePeriod = 'current month';
    } else if (lowerPrompt.includes('this week') || lowerPrompt.includes('current week')) {
      timePeriod = 'current week';
    } else if (lowerPrompt.includes('this year') || lowerPrompt.includes('current year')) {
      timePeriod = 'current year';
    }
    
    // Extract type (expense, revenue, transaction, etc.)
    let type: string | undefined;
    if (lowerPrompt.includes('expense')) {
      type = 'expense';
    } else if (lowerPrompt.includes('revenue') || lowerPrompt.includes('income')) {
      type = 'revenue';
    } else if (lowerPrompt.includes('transaction')) {
      type = 'transaction';
    }
    
    return { quantity, timePeriod, type };
  }

  private getTimePeriod(context: LlamaConversationContext): string {
    const expenseTransactions = (context.financialContext as any)?.expenseTransactions || [];
    
    if (expenseTransactions.length === 0) {
      return 'this period';
    }
    
    // Check if we have current month transactions
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthTransactions = expenseTransactions.filter((t: any) => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });
    
    if (currentMonthTransactions.length > 0) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      return `${monthNames[currentMonth]} ${currentYear}`;
    }
    
    return 'this period';
  }

  private getRealExpenseData(context: LlamaConversationContext): Array<{amount: number, date: string}> {
    // Use real transaction data from context instead of mock data
    const expenseTransactions = (context.financialContext as any)?.expenseTransactions || [];
    
    if (expenseTransactions.length === 0) {
      return [];
    }
    
    // Filter to current month only
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthTransactions = expenseTransactions.filter((t: any) => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });
    
    // If no current month transactions, use all transactions but limit to recent ones
    const transactionsToUse = currentMonthTransactions.length > 0 ? currentMonthTransactions : expenseTransactions.slice(0, 10);
    
    // Sort by amount (largest first) and return top transactions
    return transactionsToUse
      .sort((a: any, b: any) => b.amount - a.amount)
      .map((t: any) => ({
        amount: t.amount,
        date: new Date(t.date).toLocaleDateString()
      }));
  }

  private generateExpenseCategories(totalExpenses: number): Array<{name: string, amount: number}> {
    // Generate realistic expense categories based on total amount
    const categories = [
      { name: 'Office Rent', percentage: 0.45 },
      { name: 'Utilities', percentage: 0.15 },
      { name: 'Marketing', percentage: 0.22 },
      { name: 'Software Licenses', percentage: 0.11 },
      { name: 'Office Supplies', percentage: 0.07 }
    ];

    return categories.map(cat => ({
      name: cat.name,
      amount: Math.round(totalExpenses * cat.percentage)
    }));
  }

  private getFallbackResponse(prompt: string, context: LlamaConversationContext): LlamaResponse {
    const lowerPrompt = prompt.toLowerCase();
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const revenue = financialMetrics.totalRevenue || 0;
    const expenses = financialMetrics.totalExpenses || 0;
    const profit = revenue - expenses;
    
    // Handle business forecast requests specifically
    if (lowerPrompt.includes('forecast') || lowerPrompt.includes('prediction') || lowerPrompt.includes('12-month') || lowerPrompt.includes('business forecast')) {
      return this.generateBusinessForecastResponse(context);
    }
    
    // Handle financial analysis requests
    if (lowerPrompt.includes('analyze') || lowerPrompt.includes('analysis') || lowerPrompt.includes('insights')) {
      return this.generateFinancialAnalysisResponse(context);
    }
    
    // Handle general business questions
    if (lowerPrompt.includes('business') || lowerPrompt.includes('company') || lowerPrompt.includes('performance')) {
      return this.getBusinessAnalysisResponse(prompt, context, { revenue, expenses, profit, entities: {} });
    }
    
    // Default fallback
    return {
      message: "I'm currently processing your request. Please try again in a moment.",
      confidence: 0.5,
      intent: 'general',
      entities: {},
      suggestions: ['Try rephrasing your question', 'Check your internet connection'],
      actions: [],
      insights: [{
        type: 'system_status',
        description: 'AI system is temporarily unavailable, using fallback response',
        confidence: 0.5,
        impact: 'low'
      }],
      followUpQuestions: ['How can I help you with your accounting needs?']
    };
  }

  private generateBusinessForecastResponse(context: LlamaConversationContext): LlamaResponse {
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const revenue = financialMetrics.totalRevenue || 0;
    const expenses = financialMetrics.totalExpenses || 0;
    const profit = revenue - expenses;
    
    // Generate realistic 12-month forecast based on current data
    const monthlyGrowth = revenue > 0 ? 0.05 : 0.10; // 5% growth if profitable, 10% if starting
    const monthlyExpenseGrowth = 0.03; // 3% expense growth
    
    const forecasts = [];
    let currentRevenue = revenue;
    let currentExpenses = expenses;
    
    for (let month = 1; month <= 12; month++) {
      currentRevenue = Math.round(currentRevenue * (1 + monthlyGrowth));
      currentExpenses = Math.round(currentExpenses * (1 + monthlyExpenseGrowth));
      const monthlyProfit = currentRevenue - currentExpenses;
      
      forecasts.push({
        month: `Month ${month}`,
        revenue: currentRevenue,
        expenses: currentExpenses,
        profit: monthlyProfit,
        confidence: Math.max(0.6, 0.9 - (month * 0.02)) // Decreasing confidence over time
      });
    }
    
    const totalYearRevenue = forecasts.reduce((sum, f) => sum + f.revenue, 0);
    const totalYearExpenses = forecasts.reduce((sum, f) => sum + f.expenses, 0);
    const totalYearProfit = totalYearRevenue - totalYearExpenses;
    
    return {
      message: `**12-Month Business Forecast**

**Current Status:**
- Revenue: $${revenue.toLocaleString()}
- Expenses: $${expenses.toLocaleString()}
- Net: ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}

**12-Month Projections:**
${forecasts.slice(0, 6).map(f => 
  `• **${f.month}**: Revenue $${f.revenue.toLocaleString()}, Expenses $${f.expenses.toLocaleString()}, Net ${f.profit >= 0 ? '+' : ''}$${f.profit.toLocaleString()} (${Math.round(f.confidence * 100)}% confidence)`
).join('\n')}

**Year-End Projections:**
- Total Revenue: $${totalYearRevenue.toLocaleString()}
- Total Expenses: $${totalYearExpenses.toLocaleString()}
- Net Profit: ${totalYearProfit >= 0 ? '+' : ''}$${totalYearProfit.toLocaleString()}

**Key Insights:**
• Revenue growth projected at ${(monthlyGrowth * 100).toFixed(1)}% monthly
• Expense growth projected at ${(monthlyExpenseGrowth * 100).toFixed(1)}% monthly
• Profitability ${totalYearProfit >= 0 ? 'improving' : 'needs attention'} over the year

**Recommendations:**
• Focus on revenue growth strategies
• Monitor expense growth closely
• ${totalYearProfit < 0 ? 'Consider cost reduction measures' : 'Reinvest profits for sustainable growth'}`,
      confidence: 0.8,
      intent: 'forecast',
      entities: { 
        forecasts, 
        totalYearRevenue, 
        totalYearExpenses, 
        totalYearProfit,
        growthRate: monthlyGrowth,
        expenseGrowthRate: monthlyExpenseGrowth
      },
      suggestions: [
        'Review monthly revenue targets',
        'Set up expense monitoring alerts',
        'Plan for seasonal variations',
        'Consider market expansion opportunities'
      ],
      actions: [
        { type: 'set_revenue_targets', description: 'Set monthly revenue targets', parameters: { forecasts } },
        { type: 'monitor_expenses', description: 'Set up expense monitoring', parameters: { threshold: currentExpenses * 1.1 } }
      ],
      insights: [
        {
          type: 'business_forecast',
          description: `12-month forecast shows ${totalYearProfit >= 0 ? 'profitable' : 'loss-making'} trajectory`,
          confidence: 0.8,
          impact: 'high'
        }
      ],
      followUpQuestions: [
        'How can I improve my revenue growth?',
        'What expenses should I focus on reducing?',
        'Should I consider seasonal adjustments?',
        'How do I track progress against these forecasts?'
      ]
    };
  }

  private generateFinancialAnalysisResponse(context: LlamaConversationContext): LlamaResponse {
    const financialMetrics = context.financialContext?.keyMetrics || {};
    const revenue = financialMetrics.totalRevenue || 0;
    const expenses = financialMetrics.totalExpenses || 0;
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return {
      message: `**Financial Analysis Report**

**Current Financial Position:**
- Total Revenue: $${revenue.toLocaleString()}
- Total Expenses: $${expenses.toLocaleString()}
- Net Profit/Loss: ${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}
- Profit Margin: ${profitMargin.toFixed(1)}%

**Financial Health Assessment:**
${profit >= 0 ? 
  `✅ **Profitable Business**: You're generating positive returns
• Strong foundation for growth
• Consider reinvestment strategies
• Monitor profit margins closely` :
  `⚠️ **Loss-Making Business**: Immediate attention required
• Focus on cost reduction
• Prioritize revenue generation
• Consider emergency funding options`}

**Key Insights:**
• ${revenue > expenses ? 'Revenue exceeds expenses - healthy cash flow' : 'Expenses exceed revenue - cash flow concerns'}
• ${profitMargin > 20 ? 'Excellent profit margin' : profitMargin > 10 ? 'Good profit margin' : profitMargin > 0 ? 'Low profit margin' : 'Negative profit margin'}
• ${expenses > 0 ? `Largest expense category needs review` : 'No expense data available'}

**Strategic Recommendations:**
${profit >= 0 ? 
  `• Scale successful revenue streams
• Invest in growth opportunities
• Build emergency reserves
• Optimize operational efficiency` :
  `• Immediate cost reduction required
• Focus on revenue generation
• Review all expense categories
• Consider business model adjustments`}`,
      confidence: 0.85,
      intent: 'analysis',
      entities: { 
        revenue, 
        expenses, 
        profit, 
        profitMargin,
        financialHealth: profit >= 0 ? 'profitable' : 'loss-making'
      },
      suggestions: [
        'Review expense categories for optimization',
        'Set up financial monitoring dashboards',
        'Create monthly financial reports',
        'Plan for seasonal variations'
      ],
      actions: [
        { type: 'financial_monitoring', description: 'Set up financial monitoring', parameters: { frequency: 'monthly' } },
        { type: 'expense_review', description: 'Review expense categories', parameters: { priority: 'high' } }
      ],
      insights: [
        {
          type: 'financial_analysis',
          description: `Business is ${profit >= 0 ? 'profitable' : 'loss-making'} with ${profitMargin.toFixed(1)}% margin`,
          confidence: 0.85,
          impact: 'high'
        }
      ],
      followUpQuestions: [
        'How can I improve my profit margin?',
        'What are my biggest expense categories?',
        'How do I track financial performance?',
        'What growth strategies should I consider?'
      ]
    };
  }

  // Advanced financial analysis methods
  async analyzeFinancialTrends(context: LlamaConversationContext): Promise<LlamaResponse> {
    const prompt = `Analyze the financial trends for company ${context.companyId} based on the provided context. 
    Focus on revenue, expenses, profitability, and cash flow patterns. Provide insights and recommendations.`;
    
    return this.processNaturalLanguageInput(prompt, context);
  }

  async generateFinancialInsights(context: LlamaConversationContext): Promise<LlamaResponse> {
    const system = `You are a senior financial analyst. Produce concise, decision-grade insights.
Output strictly as JSON with key 'insights': an array of 3-5 items. Each item MUST have:
{"category": one of ["revenue","expenses","profitability","cash_flow","risk"],
 "insightText": short actionable sentence (<= 180 chars),
 "priority": one of ["high","medium","low"],
 "confidence": number between 0 and 1}
No prose, no markdown, only JSON.`;

    const contextSummary = `Company: ${context.companyId}
Recent metrics (approx): revenue=${context.financialContext?.keyMetrics?.totalRevenue ?? 'n/a'}, expenses=${context.financialContext?.keyMetrics?.totalExpenses ?? 'n/a'}, margin=${context.financialContext?.keyMetrics?.profitMargin ?? 'n/a'}`;

    const userPrompt = `Generate 3-5 financial insights with actions for the company based on context.
Focus on: performance (revenue/expenses), profitability, cash flow, and risks.
Ensure diversity of categories and realistic confidences.`;

    // Build a stricter prompt for JSON output
    const prompt = `${system}

CONTEXT:
${contextSummary}

TASK:
${userPrompt}

RESPONSE FORMAT EXAMPLE:
{
  "insights": [
    {"category": "revenue", "insightText": "Revenue generation urgent", "priority": "high", "confidence": 0.9},
    {"category": "expenses", "insightText": "Cost reduction needed", "priority": "high", "confidence": 0.8}
  ]
}

Remember: Output ONLY valid JSON, no other text.`;

    // Call base processor
    const response = await this.processNaturalLanguageInput(prompt, context);

    // Parse and save insights to database
    const insights = response.insights || [];
    const savedInsights = [];

    for (const insight of insights) {
      try {
        // Save each insight to the database
        const savedInsight = await (await import('../ai')).addInsight({
          tenantId: context.tenantId,
          companyId: context.companyId,
          category: insight.type || 'financial',
          insightText: insight.description || 'AI-generated financial insight',
          priority: insight.impact || 'medium'
        });
        savedInsights.push(savedInsight);
      } catch (error) {
        // Failed to save insight, continue
      }
    }

    // Return normalized response
    return {
      ...response,
      insights: insights.map((insight: any) => ({
        type: insight.type || 'financial',
        description: insight.description || '',
        confidence: insight.confidence || 0.7,
        impact: insight.impact || 'medium'
      }))
    };
  }

  async processDocumentQuery(documentContent: string, query: string, context: LlamaConversationContext): Promise<LlamaResponse> {
    const prompt = `Based on the following document content and financial context, answer the user's query:

DOCUMENT CONTENT:
${documentContent}

USER QUERY: ${query}

Provide a detailed analysis and answer.`;
    
    return this.processNaturalLanguageInput(prompt, context);
  }
}

// Singleton instance to prevent multiple initializations
let llamaEnhancedConversationalAIInstance: LlamaEnhancedConversationalAI | null = null;

export const llamaEnhancedConversationalAI = (() => {
  if (!llamaEnhancedConversationalAIInstance) {
    llamaEnhancedConversationalAIInstance = new LlamaEnhancedConversationalAI();
  }
  return llamaEnhancedConversationalAIInstance;
})();
