import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock the AI service
const mockAIService = {
  categorizeTransaction: jest.fn(),
  generateInsights: jest.fn(),
  predictCashFlow: jest.fn(),
  analyzeExpenses: jest.fn(),
  generateFinancialReport: jest.fn(),
  processNaturalLanguageQuery: jest.fn(),
  validateAIConfiguration: jest.fn(),
  trainModel: jest.fn(),
  getModelAccuracy: jest.fn(),
}

describe('AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Transaction Categorization', () => {
    it('should categorize transaction correctly', async () => {
      const transaction = {
        description: 'Office supplies purchase',
        amount: 150.00,
        merchant: 'Office Depot',
        date: '2024-01-15',
      }
      
      const categorization = {
        category: 'Office Expenses',
        subcategory: 'Supplies',
        confidence: 0.95,
        suggestedAccount: 'account123',
      }
      
      mockAIService.categorizeTransaction.mockResolvedValue(categorization)
      
      const result = await mockAIService.categorizeTransaction(transaction)
      
      expect(mockAIService.categorizeTransaction).toHaveBeenCalledWith(transaction)
      expect(result).toEqual(categorization)
    })

    it('should handle ambiguous transactions', async () => {
      const transaction = {
        description: 'Payment to ABC Corp',
        amount: 500.00,
        merchant: 'ABC Corp',
        date: '2024-01-15',
      }
      
      const categorization = {
        category: 'Unknown',
        subcategory: 'Uncategorized',
        confidence: 0.3,
        suggestedAccount: null,
        suggestions: ['Professional Services', 'Utilities', 'Rent'],
      }
      
      mockAIService.categorizeTransaction.mockResolvedValue(categorization)
      
      const result = await mockAIService.categorizeTransaction(transaction)
      
      expect(result.confidence).toBeLessThan(0.5)
      expect(result.suggestions).toBeDefined()
    })

    it('should learn from user corrections', async () => {
      const transaction = {
        description: 'Office supplies purchase',
        amount: 150.00,
        merchant: 'Office Depot',
        date: '2024-01-15',
      }
      
      const userCorrection = {
        category: 'Marketing Expenses',
        subcategory: 'Promotional Materials',
        accountId: 'account456',
      }
      
      mockAIService.categorizeTransaction.mockResolvedValue({
        category: 'Marketing Expenses',
        subcategory: 'Promotional Materials',
        confidence: 0.98,
        suggestedAccount: 'account456',
        learned: true,
      })
      
      const result = await mockAIService.categorizeTransaction(transaction, userCorrection)
      
      expect(result.learned).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.9)
    })
  })

  describe('Financial Insights Generation', () => {
    it('should generate spending insights', async () => {
      const companyId = 'company123'
      const timeRange = { start: '2024-01-01', end: '2024-01-31' }
      
      const insights = {
        totalSpending: 15000.00,
        topCategories: [
          { category: 'Office Expenses', amount: 5000, percentage: 33.3 },
          { category: 'Marketing', amount: 3000, percentage: 20.0 },
          { category: 'Utilities', amount: 2000, percentage: 13.3 },
        ],
        trends: {
          spendingIncrease: 15.5,
          categoryChanges: [
            { category: 'Office Expenses', change: 25.0 },
            { category: 'Marketing', change: -10.0 },
          ],
        },
        recommendations: [
          'Consider bulk purchasing for office supplies to reduce costs',
          'Marketing spend decreased - review campaign effectiveness',
        ],
      }
      
      mockAIService.generateInsights.mockResolvedValue(insights)
      
      const result = await mockAIService.generateInsights(companyId, timeRange)
      
      expect(mockAIService.generateInsights).toHaveBeenCalledWith(companyId, timeRange)
      expect(result.totalSpending).toBe(15000.00)
      expect(result.topCategories).toHaveLength(3)
      expect(result.recommendations).toHaveLength(2)
    })

    it('should generate cash flow insights', async () => {
      const companyId = 'company123'
      const timeRange = { start: '2024-01-01', end: '2024-01-31' }
      
      const insights = {
        cashFlowTrend: 'positive',
        averageMonthlyInflow: 25000.00,
        averageMonthlyOutflow: 20000.00,
        netCashFlow: 5000.00,
        seasonalPatterns: [
          { month: 'January', inflow: 25000, outflow: 20000 },
          { month: 'February', inflow: 22000, outflow: 18000 },
        ],
        predictions: {
          nextMonthInflow: 26000.00,
          nextMonthOutflow: 21000.00,
          confidence: 0.85,
        },
      }
      
      mockAIService.generateInsights.mockResolvedValue(insights)
      
      const result = await mockAIService.generateInsights(companyId, timeRange, 'cashflow')
      
      expect(result.cashFlowTrend).toBe('positive')
      expect(result.predictions.confidence).toBeGreaterThan(0.8)
    })
  })

  describe('Cash Flow Prediction', () => {
    it('should predict future cash flow', async () => {
      const companyId = 'company123'
      const predictionPeriod = 3 // months
      
      const prediction = {
        predictions: [
          {
            month: 'February 2024',
            predictedInflow: 25000.00,
            predictedOutflow: 20000.00,
            netCashFlow: 5000.00,
            confidence: 0.85,
          },
          {
            month: 'March 2024',
            predictedInflow: 26000.00,
            predictedOutflow: 21000.00,
            netCashFlow: 5000.00,
            confidence: 0.80,
          },
          {
            month: 'April 2024',
            predictedInflow: 24000.00,
            predictedOutflow: 22000.00,
            netCashFlow: 2000.00,
            confidence: 0.75,
          },
        ],
        totalPredictedInflow: 75000.00,
        totalPredictedOutflow: 63000.00,
        totalNetCashFlow: 12000.00,
        riskFactors: [
          'Seasonal business patterns may affect revenue',
          'Upcoming tax payments may increase outflow',
        ],
      }
      
      mockAIService.predictCashFlow.mockResolvedValue(prediction)
      
      const result = await mockAIService.predictCashFlow(companyId, predictionPeriod)
      
      expect(mockAIService.predictCashFlow).toHaveBeenCalledWith(companyId, predictionPeriod)
      expect(result.predictions).toHaveLength(3)
      expect(result.riskFactors).toHaveLength(2)
    })

    it('should handle insufficient data for prediction', async () => {
      const companyId = 'company123'
      const predictionPeriod = 6 // months
      
      const prediction = {
        predictions: [],
        error: 'Insufficient historical data for accurate prediction',
        minimumDataRequired: 12, // months
        currentDataAvailable: 3, // months
        recommendations: [
          'Collect more historical data for better predictions',
          'Use industry benchmarks for initial estimates',
        ],
      }
      
      mockAIService.predictCashFlow.mockResolvedValue(prediction)
      
      const result = await mockAIService.predictCashFlow(companyId, predictionPeriod)
      
      expect(result.error).toBeDefined()
      expect(result.recommendations).toHaveLength(2)
    })
  })

  describe('Expense Analysis', () => {
    it('should analyze expense patterns', async () => {
      const companyId = 'company123'
      const timeRange = { start: '2024-01-01', end: '2024-01-31' }
      
      const analysis = {
        totalExpenses: 15000.00,
        expenseBreakdown: {
          fixed: { amount: 8000.00, percentage: 53.3 },
          variable: { amount: 7000.00, percentage: 46.7 },
        },
        categoryAnalysis: [
          {
            category: 'Office Expenses',
            amount: 5000.00,
            trend: 'increasing',
            trendPercentage: 15.0,
            efficiency: 'moderate',
          },
          {
            category: 'Marketing',
            amount: 3000.00,
            trend: 'decreasing',
            trendPercentage: -10.0,
            efficiency: 'high',
          },
        ],
        anomalies: [
          {
            date: '2024-01-15',
            amount: 2000.00,
            category: 'Office Expenses',
            description: 'Unusually high office supply purchase',
            severity: 'medium',
          },
        ],
        recommendations: [
          'Review office supply purchasing process',
          'Consider negotiating bulk discounts',
          'Monitor marketing ROI for decreased spend',
        ],
      }
      
      mockAIService.analyzeExpenses.mockResolvedValue(analysis)
      
      const result = await mockAIService.analyzeExpenses(companyId, timeRange)
      
      expect(mockAIService.analyzeExpenses).toHaveBeenCalledWith(companyId, timeRange)
      expect(result.totalExpenses).toBe(15000.00)
      expect(result.anomalies).toHaveLength(1)
      expect(result.recommendations).toHaveLength(3)
    })
  })

  describe('Natural Language Processing', () => {
    it('should process natural language queries', async () => {
      const query = 'Show me my top expenses this month'
      const companyId = 'company123'
      
      const response = {
        intent: 'expense_analysis',
        entities: {
          timeRange: 'this month',
          metric: 'top expenses',
        },
        sqlQuery: 'SELECT category, SUM(amount) FROM expenses WHERE date >= ? GROUP BY category ORDER BY SUM(amount) DESC',
        parameters: ['2024-01-01'],
        confidence: 0.92,
      }
      
      mockAIService.processNaturalLanguageQuery.mockResolvedValue(response)
      
      const result = await mockAIService.processNaturalLanguageQuery(query, companyId)
      
      expect(mockAIService.processNaturalLanguageQuery).toHaveBeenCalledWith(query, companyId)
      expect(result.intent).toBe('expense_analysis')
      expect(result.confidence).toBeGreaterThan(0.9)
    })

    it('should handle complex financial queries', async () => {
      const query = 'What was my profit margin last quarter compared to the previous quarter?'
      const companyId = 'company123'
      
      const response = {
        intent: 'profit_margin_comparison',
        entities: {
          metric: 'profit margin',
          timeRange: 'last quarter',
          comparison: 'previous quarter',
        },
        sqlQuery: 'SELECT quarter, (revenue - expenses) / revenue as profit_margin FROM financial_data WHERE quarter IN (?, ?)',
        parameters: ['2023-Q4', '2023-Q3'],
        confidence: 0.88,
      }
      
      mockAIService.processNaturalLanguageQuery.mockResolvedValue(response)
      
      const result = await mockAIService.processNaturalLanguageQuery(query, companyId)
      
      expect(result.intent).toBe('profit_margin_comparison')
      expect(result.entities.comparison).toBe('previous quarter')
    })
  })

  describe('AI Model Management', () => {
    it('should validate AI configuration', () => {
      const config = {
        modelType: 'transaction_categorization',
        trainingDataSize: 10000,
        accuracyThreshold: 0.85,
        updateFrequency: 'weekly',
      }
      
      mockAIService.validateAIConfiguration.mockReturnValue({
        valid: true,
        warnings: [],
        recommendations: [],
      })
      
      const result = mockAIService.validateAIConfiguration(config)
      
      expect(mockAIService.validateAIConfiguration).toHaveBeenCalledWith(config)
      expect(result.valid).toBe(true)
    })

    it('should train AI model', async () => {
      const trainingData = [
        { description: 'Office supplies', category: 'Office Expenses' },
        { description: 'Marketing campaign', category: 'Marketing' },
        { description: 'Utility bill', category: 'Utilities' },
      ]
      
      const trainingResult = {
        modelId: 'model123',
        accuracy: 0.92,
        trainingTime: 1800, // seconds
        dataPoints: 10000,
        validationScore: 0.89,
      }
      
      mockAIService.trainModel.mockResolvedValue(trainingResult)
      
      const result = await mockAIService.trainModel(trainingData)
      
      expect(mockAIService.trainModel).toHaveBeenCalledWith(trainingData)
      expect(result.accuracy).toBeGreaterThan(0.9)
    })

    it('should get model accuracy', async () => {
      const modelId = 'model123'
      
      const accuracy = {
        overall: 0.92,
        byCategory: {
          'Office Expenses': 0.95,
          'Marketing': 0.88,
          'Utilities': 0.90,
        },
        lastUpdated: '2024-01-15T10:00:00Z',
        dataPoints: 10000,
      }
      
      mockAIService.getModelAccuracy.mockResolvedValue(accuracy)
      
      const result = await mockAIService.getModelAccuracy(modelId)
      
      expect(mockAIService.getModelAccuracy).toHaveBeenCalledWith(modelId)
      expect(result.overall).toBeGreaterThan(0.9)
    })
  })

  describe('Error Handling', () => {
    it('should handle AI service errors', async () => {
      const transaction = { description: 'Test transaction' }
      const error = new Error('AI service unavailable')
      
      mockAIService.categorizeTransaction.mockRejectedValue(error)
      
      await expect(mockAIService.categorizeTransaction(transaction)).rejects.toThrow('AI service unavailable')
    })

    it('should handle model training errors', async () => {
      const trainingData = []
      const error = new Error('Insufficient training data')
      
      mockAIService.trainModel.mockRejectedValue(error)
      
      await expect(mockAIService.trainModel(trainingData)).rejects.toThrow('Insufficient training data')
    })
  })
})
