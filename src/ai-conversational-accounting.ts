import { prisma } from './prisma.js'
import { TenantRequest } from './tenant.js'
import { enqueueAiJob } from './queue.js'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    action?: 'create_invoice' | 'create_expense' | 'create_customer' | 'generate_report' | 'analyze_data' | 'answer_question'
    confidence?: number
    entities?: Array<{
      type: 'customer' | 'amount' | 'date' | 'item' | 'account' | 'category'
      value: string
      confidence: number
    }>
    suggestions?: Array<{
      text: string
      action: string
      confidence: number
    }>
  }
}

export interface ConversationContext {
  tenantId: string
  companyId: string
  userId: string
  sessionId: string
  recentTransactions: Array<{
    type: 'invoice' | 'expense' | 'payment' | 'customer'
    id: string
    amount?: number
    description: string
    date: Date
  }>
  financialSummary: {
    totalRevenue: number
    totalExpenses: number
    netIncome: number
    outstandingInvoices: number
    overdueInvoices: number
    cashFlow: number
  }
  userPreferences: {
    currency: string
    dateFormat: string
    language: string
    timezone: string
  }
}

export interface AIResponse {
  message: string
  action?: {
    type: 'create_invoice' | 'create_expense' | 'create_customer' | 'generate_report' | 'analyze_data'
    data: any
    confidence: number
  }
  suggestions: Array<{
    text: string
    action: string
    confidence: number
  }>
  followUpQuestions: string[]
  context: ConversationContext
}

export class ConversationalAccountingService {
  /**
   * Process user message and generate AI response
   */
  static async processMessage(
    tenantId: string,
    companyId: string,
    userId: string,
    message: string,
    sessionId: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<AIResponse> {
    try {
      // Get conversation context
      const context = await this.getConversationContext(tenantId, companyId, userId, sessionId)
      
      // Prepare context for AI
      const aiContext = this.prepareAIContext(context, conversationHistory, message)
      
      // Call Ollama AI model
      const aiResponse = await this.callOllamaAI(aiContext, message)
      
      // Parse AI response and determine actions
      const parsedResponse = await this.parseAIResponse(aiResponse, context)
      
      // Store conversation
      await this.storeConversation(tenantId, sessionId, userId, message, parsedResponse.message)
      
      return parsedResponse
    } catch (error) {
      console.error('Error processing conversational message:', error)
      throw error
    }
  }

  /**
   * Execute AI-suggested action
   */
  static async executeAction(
    tenantId: string,
    action: {
      type: 'create_invoice' | 'create_expense' | 'create_customer' | 'generate_report' | 'analyze_data'
      data: any
    }
  ): Promise<{
    success: boolean
    result?: any
    message: string
  }> {
    try {
      switch (action.type) {
        case 'create_invoice':
          return await this.createInvoiceFromConversation(tenantId, action.data)
        case 'create_expense':
          return await this.createExpenseFromConversation(tenantId, action.data)
        case 'create_customer':
          return await this.createCustomerFromConversation(tenantId, action.data)
        case 'generate_report':
          return await this.generateReportFromConversation(tenantId, action.data)
        case 'analyze_data':
          return await this.analyzeDataFromConversation(tenantId, action.data)
        default:
          return { success: false, message: 'Unknown action type' }
      }
    } catch (error) {
      console.error('Error executing action:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Failed to execute action' }
    }
  }

  /**
   * Get conversation history
   */
  static async getConversationHistory(
    tenantId: string,
    sessionId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    try {
      // TODO: Replace with actual Prisma model when available
      const messages = [] as any[]; // Temporary mock data

      return messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined
      }))
    } catch (error) {
      console.error('Error getting conversation history:', error)
      return []
    }
  }

  /**
   * Get conversation context
   */
  private static async getConversationContext(
    tenantId: string,
    companyId: string,
    userId: string,
    sessionId: string
  ): Promise<ConversationContext> {
    try {
      // Get recent transactions
      const recentTransactions = await this.getRecentTransactions(tenantId, companyId)
      
      // Get financial summary
      const financialSummary = await this.getFinancialSummary(tenantId, companyId)
      
      // Get user preferences
      const userPreferences = await this.getUserPreferences(tenantId, userId)
      
      return {
        tenantId,
        companyId,
        userId,
        sessionId,
        recentTransactions,
        financialSummary,
        userPreferences
      }
    } catch (error) {
      console.error('Error getting conversation context:', error)
      throw error
    }
  }

  /**
   * Prepare context for AI
   */
  private static prepareAIContext(
    context: ConversationContext,
    conversationHistory: ChatMessage[],
    currentMessage: string
  ): string {
    const contextString = `
You are an AI accounting assistant for UrutiIQ. You help users manage their finances through natural conversation.

COMPANY CONTEXT:
- Company ID: ${context.companyId}
- Currency: ${context.userPreferences.currency}
- Date Format: ${context.userPreferences.dateFormat}
- Language: ${context.userPreferences.language}

FINANCIAL SUMMARY:
- Total Revenue: ${context.financialSummary.totalRevenue}
- Total Expenses: ${context.financialSummary.totalExpenses}
- Net Income: ${context.financialSummary.netIncome}
- Outstanding Invoices: ${context.financialSummary.outstandingInvoices}
- Overdue Invoices: ${context.financialSummary.overdueInvoices}
- Cash Flow: ${context.financialSummary.cashFlow}

RECENT TRANSACTIONS:
${context.recentTransactions.map(t => `- ${t.type}: ${t.description} (${t.amount || 'N/A'}) on ${t.date.toISOString().split('T')[0]}`).join('\n')}

CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CURRENT MESSAGE: ${currentMessage}

INSTRUCTIONS:
1. Respond naturally and helpfully
2. Suggest relevant actions when appropriate
3. Ask clarifying questions when needed
4. Provide financial insights and recommendations
5. Be conversational and friendly
6. Use the financial data to provide context-aware responses

RESPONSE FORMAT:
- Provide a natural response
- Suggest actions if appropriate (create_invoice, create_expense, create_customer, generate_report, analyze_data)
- Include follow-up questions
- Be helpful and informative
`

    return contextString
  }

  /**
   * Call Ollama AI model
   */
  private static async callOllamaAI(context: string, message: string): Promise<string> {
    try {
      // This would typically call Ollama API
      // For now, we'll simulate the response
      const response = await this.simulateOllamaResponse(context, message)
      return response
    } catch (error) {
      console.error('Error calling Ollama AI:', error)
      throw error
    }
  }

  /**
   * Parse AI response and determine actions
   */
  private static async parseAIResponse(
    aiResponse: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    try {
      // Parse the AI response to extract actions and suggestions
      const parsed = this.parseResponseText(aiResponse)
      
      return {
        message: parsed.message,
        action: parsed.action,
        suggestions: parsed.suggestions,
        followUpQuestions: parsed.followUpQuestions,
        context
      }
    } catch (error) {
      console.error('Error parsing AI response:', error)
      return {
        message: aiResponse,
        suggestions: [],
        followUpQuestions: [],
        context
      }
    }
  }

  /**
   * Store conversation message
   */
  private static async storeConversation(
    tenantId: string,
    sessionId: string,
    userId: string,
    userMessage: string,
    aiResponse: string
  ): Promise<void> {
    try {
      // TODO: Replace with actual Prisma model when available
      // Store user message
      console.log('Storing user message:', { tenantId, sessionId, userId, userMessage });
      
      // Store AI response
      console.log('Storing AI response:', { tenantId, sessionId, userId, aiResponse });
    } catch (error) {
      console.error('Error storing conversation:', error)
    }
  }

  /**
   * Get recent transactions
   */
  private static async getRecentTransactions(
    tenantId: string,
    companyId: string
  ): Promise<ConversationContext['recentTransactions']> {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { tenantId, companyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { customer: true }
      })

      const expenses = await prisma.expense.findMany({
        where: { tenantId, companyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { category: true }
      })

      const transactions = [
        ...invoices.map(inv => ({
          type: 'invoice' as const,
          id: inv.id,
          amount: Number(inv.totalAmount),
          description: `Invoice ${inv.invoiceNumber} for ${inv.customer?.name || 'Unknown'}`,
          date: inv.createdAt
        })),
        ...expenses.map(exp => ({
          type: 'expense' as const,
          id: exp.id,
          amount: exp.amount,
          description: `${exp.category?.name || 'Expense'}: ${exp.description}`,
          date: exp.createdAt
        }))
      ]

      return transactions.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20)
    } catch (error) {
      console.error('Error getting recent transactions:', error)
      return []
    }
  }

  /**
   * Get financial summary
   */
  private static async getFinancialSummary(
    tenantId: string,
    companyId: string
  ): Promise<ConversationContext['financialSummary']> {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { tenantId, companyId }
      })

      const expenses = await prisma.expense.findMany({
        where: { tenantId, companyId }
      })

      const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0)
      const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
      const netIncome = totalRevenue - totalExpenses
      const outstandingInvoices = invoices.filter(inv => inv.status === 'sent').length
      const overdueInvoices = invoices.filter(inv => 
        inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date()
      ).length

      return {
        totalRevenue,
        totalExpenses,
        netIncome,
        outstandingInvoices,
        overdueInvoices,
        cashFlow: netIncome
      }
    } catch (error) {
      console.error('Error getting financial summary:', error)
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        outstandingInvoices: 0,
        overdueInvoices: 0,
        cashFlow: 0
      }
    }
  }

  /**
   * Get user preferences
   */
  private static async getUserPreferences(
    tenantId: string,
    userId: string
  ): Promise<ConversationContext['userPreferences']> {
    try {
      const user = await prisma.appUser.findFirst({
        where: { id: userId, tenantId }
      })

      return {
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        language: 'en',
        timezone: 'UTC'
      }
    } catch (error) {
      console.error('Error getting user preferences:', error)
      return {
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        language: 'en',
        timezone: 'UTC'
      }
    }
  }

  /**
   * Simulate Ollama response (replace with real Ollama API call)
   */
  private static async simulateOllamaResponse(context: string, message: string): Promise<string> {
    // This is a simulation - in production, call Ollama API
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('invoice') || lowerMessage.includes('bill')) {
      return `I can help you create an invoice! I see you want to bill someone. Let me gather some details:

1. Who is the customer?
2. What are you billing for?
3. What's the amount?

I can create the invoice for you once I have these details. Would you like me to help you create it?`
    }
    
    if (lowerMessage.includes('expense') || lowerMessage.includes('spend')) {
      return `I can help you record an expense! Let me know:

1. What did you spend money on?
2. How much was it?
3. What category should it go under?

I'll record it for you right away!`
    }
    
    if (lowerMessage.includes('report') || lowerMessage.includes('summary')) {
      return `I can generate a financial report for you! Based on your current data:

- Total Revenue: $${context.match(/Total Revenue: (\d+)/)?.[1] || '0'}
- Total Expenses: $${context.match(/Total Expenses: (\d+)/)?.[1] || '0'}
- Net Income: $${context.match(/Net Income: (\d+)/)?.[1] || '0'}

Would you like me to create a detailed report or answer any specific questions about your finances?`
    }
    
    if (lowerMessage.includes('customer') || lowerMessage.includes('client')) {
      return `I can help you add a new customer! Tell me:

1. Customer name
2. Email address
3. Phone number (optional)
4. Address (optional)

I'll add them to your customer list right away!`
    }
    
    return `Hi! I'm your AI accounting assistant. I can help you with:

- Creating invoices and bills
- Recording expenses
- Managing customers
- Generating reports
- Answering financial questions

What would you like to do today? Just tell me in your own words!`
  }

  /**
   * Parse response text to extract actions and suggestions
   */
  private static parseResponseText(response: string): {
    message: string
    action?: any
    suggestions: any[]
    followUpQuestions: string[]
  } {
    // Simple parsing - in production, use more sophisticated NLP
    const suggestions: any[] = []
    const followUpQuestions: string[] = []
    
    if (response.includes('create an invoice')) {
      suggestions.push({
        text: 'Create Invoice',
        action: 'create_invoice',
        confidence: 0.8
      })
    }
    
    if (response.includes('record an expense')) {
      suggestions.push({
        text: 'Record Expense',
        action: 'create_expense',
        confidence: 0.8
      })
    }
    
    if (response.includes('add a new customer')) {
      suggestions.push({
        text: 'Add Customer',
        action: 'create_customer',
        confidence: 0.8
      })
    }
    
    return {
      message: response,
      suggestions,
      followUpQuestions
    }
  }

  /**
   * Create invoice from conversation
   */
  private static async createInvoiceFromConversation(
    tenantId: string,
    data: any
  ): Promise<{ success: boolean; result?: any; message: string }> {
    try {
      // This would typically parse the conversation data and create an invoice
      // For now, return a success message
      return {
        success: true,
        message: 'Invoice creation initiated from conversation'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create invoice'
      }
    }
  }

  /**
   * Create expense from conversation
   */
  private static async createExpenseFromConversation(
    tenantId: string,
    data: any
  ): Promise<{ success: boolean; result?: any; message: string }> {
    try {
      // This would typically parse the conversation data and create an expense
      return {
        success: true,
        message: 'Expense creation initiated from conversation'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create expense'
      }
    }
  }

  /**
   * Create customer from conversation
   */
  private static async createCustomerFromConversation(
    tenantId: string,
    data: any
  ): Promise<{ success: boolean; result?: any; message: string }> {
    try {
      // This would typically parse the conversation data and create a customer
      return {
        success: true,
        message: 'Customer creation initiated from conversation'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create customer'
      }
    }
  }

  /**
   * Generate report from conversation
   */
  private static async generateReportFromConversation(
    tenantId: string,
    data: any
  ): Promise<{ success: boolean; result?: any; message: string }> {
    try {
      // This would typically generate a report based on conversation context
      return {
        success: true,
        message: 'Report generation initiated from conversation'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate report'
      }
    }
  }

  /**
   * Analyze data from conversation
   */
  private static async analyzeDataFromConversation(
    tenantId: string,
    data: any
  ): Promise<{ success: boolean; result?: any; message: string }> {
    try {
      // This would typically analyze financial data based on conversation context
      return {
        success: true,
        message: 'Data analysis initiated from conversation'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to analyze data'
      }
    }
  }
}
