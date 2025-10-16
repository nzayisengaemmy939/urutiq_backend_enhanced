import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface TransactionCategorization {
  category: string
  confidence: number
  subcategory?: string
  tags: string[]
  suggestedAccount?: string
}

export class AICategorizationService {
  
  // Pre-defined category patterns for different transaction types
  private static readonly CATEGORY_PATTERNS = {
    'Office & Administrative': {
      keywords: ['office', 'supplies', 'stationery', 'paper', 'ink', 'printer', 'desk', 'chair', 'computer', 'software', 'subscription', 'saas'],
      merchants: ['office depot', 'staples', 'amazon', 'microsoft', 'adobe', 'google', 'slack', 'zoom'],
      confidence: 0.9
    },
    'Travel & Transportation': {
      keywords: ['flight', 'hotel', 'taxi', 'uber', 'lyft', 'gas', 'fuel', 'parking', 'toll', 'rental', 'car', 'airline'],
      merchants: ['uber', 'lyft', 'delta', 'american airlines', 'united', 'marriott', 'hilton', 'expedia'],
      confidence: 0.95
    },
    'Marketing & Advertising': {
      keywords: ['marketing', 'advertising', 'facebook', 'google ads', 'instagram', 'linkedin', 'twitter', 'promotion', 'campaign'],
      merchants: ['facebook', 'google', 'linkedin', 'twitter', 'instagram', 'mailchimp', 'hubspot'],
      confidence: 0.9
    },
    'Professional Services': {
      keywords: ['legal', 'accounting', 'consulting', 'lawyer', 'attorney', 'cpa', 'audit', 'professional', 'service'],
      merchants: ['law firm', 'accounting firm', 'consulting', 'legal services'],
      confidence: 0.85
    },
    'Utilities': {
      keywords: ['electric', 'gas', 'water', 'internet', 'phone', 'cable', 'utility', 'power', 'electricity'],
      merchants: ['comcast', 'verizon', 'at&t', 'electric company', 'gas company', 'water company'],
      confidence: 0.95
    },
    'Insurance': {
      keywords: ['insurance', 'premium', 'coverage', 'policy', 'liability', 'health', 'auto', 'business'],
      merchants: ['insurance company', 'state farm', 'allstate', 'geico', 'progressive'],
      confidence: 0.9
    },
    'Rent & Real Estate': {
      keywords: ['rent', 'lease', 'property', 'real estate', 'office space', 'warehouse', 'building'],
      merchants: ['property management', 'real estate', 'landlord', 'leasing company'],
      confidence: 0.9
    },
    'Equipment & Technology': {
      keywords: ['equipment', 'hardware', 'server', 'laptop', 'monitor', 'keyboard', 'mouse', 'technology', 'it'],
      merchants: ['dell', 'hp', 'lenovo', 'apple', 'best buy', 'newegg', 'amazon'],
      confidence: 0.85
    },
    'Food & Entertainment': {
      keywords: ['restaurant', 'food', 'lunch', 'dinner', 'coffee', 'catering', 'entertainment', 'client', 'meeting'],
      merchants: ['starbucks', 'mcdonalds', 'subway', 'pizza', 'restaurant', 'cafe'],
      confidence: 0.8
    },
    'Revenue & Sales': {
      keywords: ['payment', 'invoice', 'sale', 'revenue', 'income', 'client', 'customer', 'deposit'],
      merchants: ['customer', 'client', 'payment', 'invoice'],
      confidence: 0.9
    }
  }

  // Subcategory mappings for more detailed categorization
  private static readonly SUBCATEGORY_MAPPINGS = {
    'Office & Administrative': ['Office Supplies', 'Software Subscriptions', 'Internet & Phone', 'Postage & Shipping'],
    'Travel & Transportation': ['Air Travel', 'Ground Transportation', 'Accommodation', 'Meals & Entertainment'],
    'Marketing & Advertising': ['Digital Advertising', 'Social Media', 'Content Creation', 'Events & Trade Shows'],
    'Professional Services': ['Legal Services', 'Accounting Services', 'Consulting', 'Other Professional'],
    'Utilities': ['Electricity', 'Gas', 'Water', 'Internet & Phone'],
    'Insurance': ['General Liability', 'Professional Liability', 'Health Insurance', 'Property Insurance'],
    'Rent & Real Estate': ['Office Rent', 'Warehouse Rent', 'Equipment Lease', 'Property Management'],
    'Equipment & Technology': ['Computer Hardware', 'Software Licenses', 'IT Services', 'Office Equipment'],
    'Food & Entertainment': ['Client Meals', 'Employee Meals', 'Office Snacks', 'Entertainment'],
    'Revenue & Sales': ['Product Sales', 'Service Revenue', 'Consulting Revenue', 'Other Income']
  }

  /**
   * Categorize a bank transaction using AI-powered pattern matching
   */
  static async categorizeTransaction(
    tenantId: string,
    companyId: string,
    transaction: {
      description: string
      merchantName?: string
      amount: number
      transactionType: 'credit' | 'debit'
    }
  ): Promise<TransactionCategorization> {
    
    const { description, merchantName, amount, transactionType } = transaction
    
    // For revenue transactions, always categorize as revenue
    if (transactionType === 'credit' && amount > 0) {
      return {
        category: 'Revenue & Sales',
        confidence: 0.95,
        subcategory: 'Service Revenue',
        tags: ['revenue', 'income', 'sales'],
        suggestedAccount: 'REVENUE'
      }
    }

    // Combine description and merchant name for analysis
    const searchText = `${description || ''} ${merchantName || ''}`.toLowerCase()
    
    let bestMatch = {
      category: 'Uncategorized',
      confidence: 0.1,
      subcategory: 'Other',
      tags: ['uncategorized'],
      suggestedAccount: 'EXPENSE'
    }

    // Analyze against each category pattern
    for (const [categoryName, pattern] of Object.entries(this.CATEGORY_PATTERNS)) {
      let matchScore = 0
      let matchedKeywords = 0
      let matchedMerchants = 0

      // Check keyword matches
      for (const keyword of pattern.keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          matchScore += 0.3
          matchedKeywords++
        }
      }

      // Check merchant matches
      for (const merchant of pattern.merchants) {
        if (searchText.includes(merchant.toLowerCase())) {
          matchScore += 0.5
          matchedMerchants++
        }
      }

      // Calculate confidence based on matches
      const confidence = Math.min(0.95, pattern.confidence * (matchScore + 0.1))
      
      if (confidence > bestMatch.confidence) {
        // Determine subcategory
        const subcategories = (this.SUBCATEGORY_MAPPINGS as any)[categoryName] || ['Other']
        let subcategory = subcategories[0] // Default to first subcategory
        
        // Try to match specific subcategory based on keywords
        for (const subcat of subcategories) {
          if (searchText.includes(subcat.toLowerCase().split(' ')[0])) {
            subcategory = subcat
            break
          }
        }

        // Generate tags
        const tags = this.generateTags(categoryName, subcategory, matchedKeywords, matchedMerchants)

        // Suggest account mapping
        const suggestedAccount = this.suggestAccountMapping(categoryName, subcategory)

        bestMatch = {
          category: categoryName,
          confidence,
          subcategory,
          tags,
          suggestedAccount
        }
      }
    }

    return bestMatch
  }

  /**
   * Generate relevant tags for the transaction
   */
  private static generateTags(
    category: string, 
    subcategory: string, 
    keywordMatches: number, 
    merchantMatches: number
  ): string[] {
    const tags = [category.toLowerCase().replace(/[^a-z0-9]/g, '-')]
    
    if (subcategory && subcategory !== 'Other') {
      tags.push(subcategory.toLowerCase().replace(/[^a-z0-9]/g, '-'))
    }
    
    if (keywordMatches > 0) {
      tags.push('keyword-matched')
    }
    
    if (merchantMatches > 0) {
      tags.push('merchant-matched')
    }
    
    return tags
  }

  /**
   * Suggest account mapping based on category
   */
  private static suggestAccountMapping(category: string, subcategory: string): string {
    const accountMappings = {
      'Office & Administrative': 'OFFICE_EXPENSE',
      'Travel & Transportation': 'TRAVEL_EXPENSE',
      'Marketing & Advertising': 'MARKETING_EXPENSE',
      'Professional Services': 'PROFESSIONAL_SERVICES',
      'Utilities': 'UTILITIES',
      'Insurance': 'INSURANCE',
      'Rent & Real Estate': 'RENT_EXPENSE',
      'Equipment & Technology': 'EQUIPMENT_EXPENSE',
      'Food & Entertainment': 'MEALS_ENTERTAINMENT',
      'Revenue & Sales': 'REVENUE'
    }
    
    return (accountMappings as any)[category] || 'EXPENSE'
  }

  /**
   * Auto-categorize multiple transactions
   */
  static async autoCategorizeTransactions(
    tenantId: string,
    companyId: string,
    transactionIds: string[]
  ): Promise<{ success: number; failed: number; results: any[] }> {
    
    const results = []
    let success = 0
    let failed = 0

    for (const transactionId of transactionIds) {
      try {
        const transaction = await prisma.bankTransaction.findFirst({
          where: { id: transactionId, tenantId }
        })

        if (!transaction) {
          failed++
          continue
        }

        const categorization = await this.categorizeTransaction(tenantId, companyId, {
          description: transaction.description || '',
          merchantName: transaction.merchantName || '',
          amount: Number(transaction.amount),
          transactionType: transaction.transactionType as 'credit' | 'debit'
        })

        // Update transaction with categorization
        const updatedTransaction = await prisma.bankTransaction.update({
          where: { id: transactionId },
          data: {
            category: categorization.category,
            tags: categorization.tags.join(','),
            confidence: categorization.confidence
          }
        })

        results.push({
          transactionId,
          categorization,
          updated: true
        })

        success++
      } catch (error) {
        console.error(`Error categorizing transaction ${transactionId}:`, error)
        failed++
        results.push({
          transactionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          updated: false
        })
      }
    }

    return { success, failed, results }
  }

  /**
   * Learn from user corrections to improve categorization
   */
  static async learnFromCorrection(
    tenantId: string,
    companyId: string,
    transactionId: string,
    userCategory: string,
    userSubcategory?: string
  ): Promise<void> {
    
    try {
      const transaction = await prisma.bankTransaction.findFirst({
        where: { id: transactionId, tenantId }
      })

      if (!transaction) return

      // Store the correction for future learning
      await prisma.bankTransaction.update({
        where: { id: transactionId },
        data: {
          category: userCategory,
          tags: `${userCategory.toLowerCase()},user-corrected`,
          confidence: 1.0 // User corrections have 100% confidence
        }
      })

      // TODO: Implement machine learning model training with user corrections
      // This would involve storing correction patterns and updating the AI model
      
    } catch (error) {
      console.error('Error learning from correction:', error)
    }
  }

  /**
   * Get categorization statistics for a company
   */
  static async getCategorizationStats(
    tenantId: string,
    companyId: string
  ): Promise<{
    totalTransactions: number
    categorizedTransactions: number
    uncategorizedTransactions: number
    categoryBreakdown: Record<string, number>
    averageConfidence: number
  }> {
    
    const transactions = await prisma.bankTransaction.findMany({
      where: { tenantId, bankAccount: { companyId } }
    })

    const totalTransactions = transactions.length
    const categorizedTransactions = transactions.filter(t => t.category && t.category !== 'Uncategorized').length
    const uncategorizedTransactions = totalTransactions - categorizedTransactions

    const categoryBreakdown = transactions.reduce((acc, t) => {
      const category = t.category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const averageConfidence = transactions.reduce((sum, t) => sum + Number(t.confidence || 0), 0) / totalTransactions

    return {
      totalTransactions,
      categorizedTransactions,
      uncategorizedTransactions,
      categoryBreakdown,
      averageConfidence
    }
  }
}
