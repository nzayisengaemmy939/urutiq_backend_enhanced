import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface FinancialInsight {
  id: string
  type: 'trend' | 'anomaly' | 'recommendation' | 'forecast'
  category: 'revenue' | 'expenses' | 'cash_flow' | 'profitability' | 'efficiency'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  data: any
  actionable: boolean
  createdAt: Date
}

export interface IndustryBenchmark {
  industry: string
  metric: string
  value: number
  percentile: number
  comparison: 'above' | 'below' | 'average'
}

export interface CashFlowForecast {
  period: string
  projectedInflow: number
  projectedOutflow: number
  netCashFlow: number
  confidence: number
  factors: string[]
}

export interface ExpenseAnalysis {
  category: string
  amount: number
  percentage: number
  trend: 'increasing' | 'decreasing' | 'stable'
  benchmark: number
  recommendation?: string
}

export interface RevenueAnalysis {
  period: string
  revenue: number
  growth: number
  customerCount: number
  averageOrderValue: number
  churnRate?: number
}

export class AdvancedAnalyticsService {
  
  /**
   * Generate industry-specific financial insights
   */
  static async generateFinancialInsights(
    tenantId: string,
    companyId: string,
    industry?: string
  ): Promise<FinancialInsight[]> {
    
    const insights: FinancialInsight[] = []
    
    // Get company data
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId }
    })
    
    const detectedIndustry = industry || company?.industry || 'general'
    
    // Analyze bank transactions
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        tenantId,
        bankAccount: { companyId }
      },
      include: { bankAccount: true }
    })
    
    // Analyze invoices
    const invoices = await prisma.invoice.findMany({
      where: { tenantId, companyId }
    })
    
    // Generate insights based on industry
    insights.push(...await this.generateIndustrySpecificInsights(
      detectedIndustry,
      transactions,
      invoices
    ))
    
    // Generate cash flow insights
    insights.push(...await this.generateCashFlowInsights(transactions))
    
    // Generate expense insights
    insights.push(...await this.generateExpenseInsights(transactions, detectedIndustry))
    
    // Generate revenue insights
    insights.push(...await this.generateRevenueInsights(invoices, transactions))
    
    // Generate anomaly detection
    insights.push(...await this.generateAnomalyInsights(transactions))
    
    return insights.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Generate industry-specific insights
   */
  private static async generateIndustrySpecificInsights(
    industry: string,
    transactions: any[],
    invoices: any[]
  ): Promise<FinancialInsight[]> {
    
    const insights: FinancialInsight[] = []
    
    switch (industry.toLowerCase()) {
      case 'retail':
        insights.push(...this.generateRetailInsights(transactions, invoices))
        break
      case 'saas':
      case 'software':
        insights.push(...this.generateSaaSInsights(transactions, invoices))
        break
      case 'consulting':
        insights.push(...this.generateConsultingInsights(transactions, invoices))
        break
      case 'manufacturing':
        insights.push(...this.generateManufacturingInsights(transactions, invoices))
        break
      case 'healthcare':
        insights.push(...this.generateHealthcareInsights(transactions, invoices))
        break
      default:
        insights.push(...this.generateGeneralInsights(transactions, invoices))
    }
    
    return insights
  }

  /**
   * Generate retail-specific insights
   */
  private static generateRetailInsights(transactions: any[], invoices: any[]): FinancialInsight[] {
    const insights: FinancialInsight[] = []
    
    // Analyze seasonal patterns
    const monthlyRevenue = this.calculateMonthlyRevenue(transactions)
    const seasonalPattern = this.detectSeasonalPattern(monthlyRevenue)
    
    if (seasonalPattern) {
      insights.push({
        id: `retail_seasonal_${Date.now()}`,
        type: 'trend',
        category: 'revenue',
        title: 'Seasonal Revenue Pattern Detected',
        description: `Your business shows ${seasonalPattern.season} revenue patterns with ${seasonalPattern.variance}% variance between peak and low months.`,
        impact: 'medium',
        confidence: 0.85,
        data: seasonalPattern,
        actionable: true,
        createdAt: new Date()
      })
    }
    
    // Inventory turnover analysis
    const inventoryExpenses = transactions.filter(t => 
      t.category?.toLowerCase().includes('inventory') || 
      t.description?.toLowerCase().includes('inventory')
    )
    
    if (inventoryExpenses.length > 0) {
      const avgInventoryCost = inventoryExpenses.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) / inventoryExpenses.length
      
      insights.push({
        id: `retail_inventory_${Date.now()}`,
        type: 'recommendation',
        category: 'efficiency',
        title: 'Inventory Management Optimization',
        description: `Average inventory cost is $${avgInventoryCost.toFixed(2)}. Consider implementing just-in-time inventory to reduce carrying costs.`,
        impact: 'high',
        confidence: 0.75,
        data: { avgInventoryCost, expenseCount: inventoryExpenses.length },
        actionable: true,
        createdAt: new Date()
      })
    }
    
    return insights
  }

  /**
   * Generate SaaS-specific insights
   */
  private static generateSaaSInsights(transactions: any[], invoices: any[]): FinancialInsight[] {
    const insights: FinancialInsight[] = []
    
    // MRR (Monthly Recurring Revenue) analysis
    const recurringRevenue = transactions.filter(t => 
      t.description?.toLowerCase().includes('subscription') ||
      t.description?.toLowerCase().includes('recurring')
    )
    
    if (recurringRevenue.length > 0) {
      const mrr = recurringRevenue.reduce((sum, t) => sum + Number(t.amount), 0)
      const mrrGrowth = this.calculateGrowthRate(recurringRevenue)
      
      insights.push({
        id: `saas_mrr_${Date.now()}`,
        type: 'trend',
        category: 'revenue',
        title: 'Monthly Recurring Revenue Analysis',
        description: `Current MRR is $${mrr.toFixed(2)} with ${mrrGrowth > 0 ? '+' : ''}${mrrGrowth.toFixed(1)}% growth rate.`,
        impact: 'high',
        confidence: 0.90,
        data: { mrr, growthRate: mrrGrowth },
        actionable: true,
        createdAt: new Date()
      })
    }
    
    // Customer acquisition cost analysis
    const marketingExpenses = transactions.filter(t => 
      t.category?.toLowerCase().includes('marketing') ||
      t.description?.toLowerCase().includes('advertising')
    )
    
    if (marketingExpenses.length > 0 && invoices.length > 0) {
      const totalMarketingSpend = marketingExpenses.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
      const cac = totalMarketingSpend / invoices.length
      
      insights.push({
        id: `saas_cac_${Date.now()}`,
        type: 'recommendation',
        category: 'efficiency',
        title: 'Customer Acquisition Cost Analysis',
        description: `Your CAC is $${cac.toFixed(2)} per customer. Industry benchmark is $50-200. ${cac > 200 ? 'Consider optimizing marketing channels.' : 'Good CAC efficiency!'}`,
        impact: 'high',
        confidence: 0.80,
        data: { cac, marketingSpend: totalMarketingSpend, customerCount: invoices.length },
        actionable: true,
        createdAt: new Date()
      })
    }
    
    return insights
  }

  /**
   * Generate consulting-specific insights
   */
  private static generateConsultingInsights(transactions: any[], invoices: any[]): FinancialInsight[] {
    const insights: FinancialInsight[] = []
    
    // Utilization rate analysis
    const projectRevenue = transactions.filter(t => 
      t.description?.toLowerCase().includes('project') ||
      t.description?.toLowerCase().includes('consulting')
    )
    
    if (projectRevenue.length > 0) {
      const avgProjectValue = projectRevenue.reduce((sum, t) => sum + Number(t.amount), 0) / projectRevenue.length
      
      insights.push({
        id: `consulting_utilization_${Date.now()}`,
        type: 'recommendation',
        category: 'efficiency',
        title: 'Project Value Optimization',
        description: `Average project value is $${avgProjectValue.toFixed(2)}. Consider value-based pricing to increase project margins.`,
        impact: 'medium',
        confidence: 0.75,
        data: { avgProjectValue, projectCount: projectRevenue.length },
        actionable: true,
        createdAt: new Date()
      })
    }
    
    return insights
  }

  /**
   * Generate manufacturing-specific insights
   */
  private static generateManufacturingInsights(transactions: any[], invoices: any[]): FinancialInsight[] {
    const insights: FinancialInsight[] = []
    
    // Cost of goods sold analysis
    const materialCosts = transactions.filter(t => 
      t.category?.toLowerCase().includes('materials') ||
      t.description?.toLowerCase().includes('raw materials')
    )
    
    if (materialCosts.length > 0) {
      const totalMaterialCosts = materialCosts.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
      const cogsRatio = this.calculateCOGSRatio(totalMaterialCosts, transactions)
      
      insights.push({
        id: `manufacturing_cogs_${Date.now()}`,
        type: 'trend',
        category: 'expenses',
        title: 'Cost of Goods Sold Analysis',
        description: `COGS ratio is ${cogsRatio.toFixed(1)}%. Industry benchmark is 60-80%. ${cogsRatio > 80 ? 'Consider supplier negotiations.' : 'Good cost control!'}`,
        impact: 'high',
        confidence: 0.85,
        data: { cogsRatio, materialCosts: totalMaterialCosts },
        actionable: true,
        createdAt: new Date()
      })
    }
    
    return insights
  }

  /**
   * Generate healthcare-specific insights
   */
  private static generateHealthcareInsights(transactions: any[], invoices: any[]): FinancialInsight[] {
    const insights: FinancialInsight[] = []
    
    // Revenue cycle management
    const insurancePayments = transactions.filter(t => 
      t.description?.toLowerCase().includes('insurance') ||
      t.description?.toLowerCase().includes('medicare')
    )
    
    if (insurancePayments.length > 0) {
      const avgPaymentTime = this.calculateAveragePaymentTime(insurancePayments)
      
      insights.push({
        id: `healthcare_rcm_${Date.now()}`,
        type: 'recommendation',
        category: 'cash_flow',
        title: 'Revenue Cycle Management',
        description: `Average insurance payment time is ${avgPaymentTime} days. Consider automated billing to reduce delays.`,
        impact: 'high',
        confidence: 0.80,
        data: { avgPaymentTime, paymentCount: insurancePayments.length },
        actionable: true,
        createdAt: new Date()
      })
    }
    
    return insights
  }

  /**
   * Generate general business insights
   */
  private static generateGeneralInsights(transactions: any[], invoices: any[]): FinancialInsight[] {
    const insights: FinancialInsight[] = []
    
    // Cash flow trend
    const monthlyCashFlow = this.calculateMonthlyCashFlow(transactions)
    const cashFlowTrend = this.analyzeTrend(monthlyCashFlow)
    
    if (cashFlowTrend) {
      insights.push({
        id: `general_cashflow_${Date.now()}`,
        type: 'trend',
        category: 'cash_flow',
        title: 'Cash Flow Trend Analysis',
        description: `Cash flow is ${cashFlowTrend.direction} by ${cashFlowTrend.percentage.toFixed(1)}% over the last 3 months.`,
        impact: 'high',
        confidence: 0.85,
        data: cashFlowTrend,
        actionable: true,
        createdAt: new Date()
      })
    }
    
    return insights
  }

  /**
   * Generate cash flow insights
   */
  private static async generateCashFlowInsights(transactions: any[]): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = []
    
    // Cash runway analysis
    const currentBalance = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
    const monthlyBurnRate = this.calculateMonthlyBurnRate(transactions)
    
    if (monthlyBurnRate > 0) {
      const runwayMonths = Math.abs(currentBalance) / monthlyBurnRate
      
      insights.push({
        id: `cashflow_runway_${Date.now()}`,
        type: 'forecast',
        category: 'cash_flow',
        title: 'Cash Runway Analysis',
        description: `At current burn rate, you have ${runwayMonths.toFixed(1)} months of runway remaining.`,
        impact: runwayMonths < 6 ? 'high' : runwayMonths < 12 ? 'medium' : 'low',
        confidence: 0.80,
        data: { runwayMonths, monthlyBurnRate, currentBalance },
        actionable: true,
        createdAt: new Date()
      })
    }
    
    return insights
  }

  /**
   * Generate expense insights
   */
  private static async generateExpenseInsights(transactions: any[], industry: string): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = []
    
    // Expense categorization and benchmarking
    const expenseCategories = this.categorizeExpenses(transactions)
    const industryBenchmarks = this.getIndustryBenchmarks(industry)
    
    for (const [category, amount] of Object.entries(expenseCategories)) {
      const benchmark = industryBenchmarks[category]
      if (benchmark) {
        const percentage = (amount / this.getTotalRevenue(transactions)) * 100
        const variance = ((percentage - benchmark) / benchmark) * 100
        
        if (Math.abs(variance) > 20) {
          insights.push({
            id: `expense_${category}_${Date.now()}`,
            type: 'anomaly',
            category: 'expenses',
            title: `${category.charAt(0).toUpperCase() + category.slice(1)} Expense Variance`,
            description: `Your ${category} expenses are ${variance > 0 ? 'above' : 'below'} industry benchmark by ${Math.abs(variance).toFixed(1)}%.`,
            impact: Math.abs(variance) > 50 ? 'high' : 'medium',
            confidence: 0.75,
            data: { category, amount, percentage, benchmark, variance },
            actionable: true,
            createdAt: new Date()
          })
        }
      }
    }
    
    return insights
  }

  /**
   * Generate revenue insights
   */
  private static async generateRevenueInsights(invoices: any[], transactions: any[]): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = []
    
    // Revenue growth analysis
    const monthlyRevenue = this.calculateMonthlyRevenue(transactions)
    const revenueGrowth = this.calculateGrowthRate(monthlyRevenue)
    
    if (revenueGrowth !== 0) {
      insights.push({
        id: `revenue_growth_${Date.now()}`,
        type: 'trend',
        category: 'revenue',
        title: 'Revenue Growth Analysis',
        description: `Revenue is ${revenueGrowth > 0 ? 'growing' : 'declining'} at ${Math.abs(revenueGrowth).toFixed(1)}% monthly rate.`,
        impact: Math.abs(revenueGrowth) > 10 ? 'high' : 'medium',
        confidence: 0.85,
        data: { revenueGrowth, monthlyRevenue },
        actionable: true,
        createdAt: new Date()
      })
    }
    
    return insights
  }

  /**
   * Generate anomaly detection insights
   */
  private static async generateAnomalyInsights(transactions: any[]): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = []
    
    // Detect unusual transactions
    const anomalies = this.detectAnomalies(transactions)
    
    for (const anomaly of anomalies) {
      insights.push({
        id: `anomaly_${anomaly.id}_${Date.now()}`,
        type: 'anomaly',
        category: 'cash_flow',
        title: 'Unusual Transaction Detected',
        description: `Transaction of $${Math.abs(anomaly.amount).toFixed(2)} on ${anomaly.date} is ${anomaly.deviation}% ${anomaly.direction} normal range.`,
        impact: anomaly.deviation > 200 ? 'high' : 'medium',
        confidence: anomaly.confidence,
        data: anomaly,
        actionable: true,
        createdAt: new Date()
      })
    }
    
    return insights
  }

  /**
   * Helper methods
   */
  private static calculateMonthlyRevenue(transactions: any[]): number[] {
    // Group transactions by month and calculate revenue
    const monthlyRevenue: { [key: string]: number } = {}
    
    transactions.forEach(transaction => {
      if (Number(transaction.amount) > 0) { // Only positive amounts (revenue)
        const date = new Date(transaction.transactionDate)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(transaction.amount)
      }
    })
    
    // Convert to array and sort by month
    return Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, amount]) => amount)
  }

  private static detectSeasonalPattern(monthlyRevenue: number[]): any {
    if (monthlyRevenue.length < 6) return null // Need at least 6 months of data
    
    // Calculate variance between months
    const avgRevenue = monthlyRevenue.reduce((sum, rev) => sum + rev, 0) / monthlyRevenue.length
    const maxRevenue = Math.max(...monthlyRevenue)
    const minRevenue = Math.min(...monthlyRevenue)
    const variance = ((maxRevenue - minRevenue) / avgRevenue) * 100
    
    // Determine season based on peak month
    const peakIndex = monthlyRevenue.indexOf(maxRevenue)
    const seasons = ['winter', 'spring', 'summer', 'fall']
    const season = seasons[Math.floor(peakIndex / 3)] || 'summer'
    
    return {
      season,
      variance: Math.round(variance),
      peakMonth: peakIndex + 1,
      avgRevenue: Math.round(avgRevenue)
    }
  }

  private static calculateGrowthRate(data: number[]): number {
    if (data.length < 2) return 0
    const first = data[0]
    const last = data[data.length - 1]
    return ((last - first) / first) * 100
  }

  private static calculateMonthlyBurnRate(transactions: any[]): number {
    const expenses = transactions.filter(t => Number(t.amount) < 0)
    return expenses.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) / 12
  }

  private static calculateMonthlyCashFlow(transactions: any[]): number[] {
    // Group transactions by month and calculate net cash flow
    const monthlyCashFlow: { [key: string]: number } = {}
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.transactionDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyCashFlow[monthKey] = (monthlyCashFlow[monthKey] || 0) + Number(transaction.amount)
    })
    
    // Convert to array and sort by month
    return Object.entries(monthlyCashFlow)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, amount]) => amount)
  }

  private static analyzeTrend(data: number[]): any {
    const growth = this.calculateGrowthRate(data)
    return {
      direction: growth > 0 ? 'increasing' : 'decreasing',
      percentage: Math.abs(growth)
    }
  }

  private static categorizeExpenses(transactions: any[]): Record<string, number> {
    const categories: Record<string, number> = {}
    transactions.forEach(t => {
      if (Number(t.amount) < 0) {
        const category = t.category || 'uncategorized'
        categories[category] = (categories[category] || 0) + Math.abs(Number(t.amount))
      }
    })
    return categories
  }

  private static getIndustryBenchmarks(industry: string): Record<string, number> {
    const benchmarks: Record<string, Record<string, number>> = {
      retail: { marketing: 3, operations: 15, inventory: 25 },
      saas: { marketing: 20, operations: 10, rnd: 15 },
      consulting: { marketing: 5, operations: 20, professional: 30 },
      manufacturing: { materials: 40, labor: 25, overhead: 15 },
      healthcare: { marketing: 2, operations: 25, professional: 35 }
    }
    return benchmarks[industry.toLowerCase()] || benchmarks.retail
  }

  private static getTotalRevenue(transactions: any[]): number {
    return transactions
      .filter(t => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0)
  }

  private static detectAnomalies(transactions: any[]): any[] {
    if (transactions.length < 10) return [] // Need sufficient data for anomaly detection
    
    const anomalies: any[] = []
    
    // Calculate mean and standard deviation for transaction amounts
    const amounts = transactions.map(t => Math.abs(Number(t.amount)))
    const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length
    const stdDev = Math.sqrt(variance)
    
    // Detect transactions that are more than 2 standard deviations from the mean
    transactions.forEach((transaction, index) => {
      const amount = Math.abs(Number(transaction.amount))
      const zScore = Math.abs((amount - mean) / stdDev)
      
      if (zScore > 2) { // More than 2 standard deviations
        anomalies.push({
          id: transaction.id || `anomaly_${index}`,
          amount: Number(transaction.amount),
          date: transaction.transactionDate,
          description: transaction.description,
          deviation: Math.round(zScore * 100),
          direction: amount > mean ? 'above' : 'below',
          confidence: Math.min(0.95, zScore / 3), // Cap confidence at 95%
          zScore: Math.round(zScore * 100) / 100
        })
      }
    })
    
    return anomalies.sort((a, b) => b.zScore - a.zScore) // Sort by most anomalous first
  }

  private static calculateCOGSRatio(materialCosts: number, transactions: any[]): number {
    const totalRevenue = this.getTotalRevenue(transactions)
    return (materialCosts / totalRevenue) * 100
  }

  private static calculateAveragePaymentTime(payments: any[]): number {
    if (payments.length === 0) return 0
    
    // Calculate average days between transaction date and posted date
    const paymentTimes = payments
      .filter(p => p.transactionDate && p.postedDate)
      .map(p => {
        const transactionDate = new Date(p.transactionDate)
        const postedDate = new Date(p.postedDate)
        return Math.ceil((postedDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24))
      })
      .filter(days => days >= 0) // Only positive values
    
    if (paymentTimes.length === 0) return 0
    
    return Math.round(paymentTimes.reduce((sum, days) => sum + days, 0) / paymentTimes.length)
  }

  /**
   * Get industry benchmarks
   */
  static async getIndustryBenchmarks(industry: string): Promise<IndustryBenchmark[]> {
    const benchmarks: IndustryBenchmark[] = [
      {
        industry,
        metric: 'Revenue Growth',
        value: 15,
        percentile: 75,
        comparison: 'above'
      },
      {
        industry,
        metric: 'Profit Margin',
        value: 12,
        percentile: 60,
        comparison: 'average'
      },
      {
        industry,
        metric: 'Operating Expenses',
        value: 65,
        percentile: 40,
        comparison: 'below'
      }
    ]
    
    return benchmarks
  }

  /**
   * Generate cash flow forecast
   */
  static async generateCashFlowForecast(
    tenantId: string,
    companyId: string,
    months: number = 6
  ): Promise<CashFlowForecast[]> {
    
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        tenantId,
        bankAccount: { companyId }
      }
    })
    
    const forecast: CashFlowForecast[] = []
    
    for (let i = 1; i <= months; i++) {
      const projectedInflow = this.projectInflow(transactions, i)
      const projectedOutflow = this.projectOutflow(transactions, i)
      const netCashFlow = projectedInflow - projectedOutflow
      
      forecast.push({
        period: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
        projectedInflow,
        projectedOutflow,
        netCashFlow,
        confidence: Math.max(0.5, 1 - (i * 0.1)),
        factors: this.getForecastFactors(transactions, i)
      })
    }
    
    return forecast
  }

  private static projectInflow(transactions: any[], monthOffset: number): number {
    const inflows = transactions.filter(t => Number(t.amount) > 0)
    if (inflows.length === 0) return 0
    
    const avgInflow = inflows.reduce((sum, t) => sum + Number(t.amount), 0) / inflows.length
    
    // Calculate actual growth rate from historical data
    const monthlyInflows = this.calculateMonthlyRevenue(transactions)
    const growthRate = monthlyInflows.length > 1 ? this.calculateGrowthRate(monthlyInflows) / 100 : 0.05
    
    // Apply realistic growth projection with diminishing returns
    const projectedGrowth = Math.max(0, growthRate * Math.pow(0.8, monthOffset)) // Diminishing growth
    return avgInflow * (1 + projectedGrowth)
  }

  private static projectOutflow(transactions: any[], monthOffset: number): number {
    const outflows = transactions.filter(t => Number(t.amount) < 0)
    if (outflows.length === 0) return 0
    
    const avgOutflow = outflows.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0) / outflows.length
    
    // Calculate actual growth rate from historical expense data
    const monthlyOutflows = this.calculateMonthlyCashFlow(transactions).map(flow => Math.abs(Math.min(0, flow)))
    const expenseGrowthRate = monthlyOutflows.length > 1 ? this.calculateGrowthRate(monthlyOutflows) / 100 : 0.03
    
    // Apply realistic expense growth projection
    const projectedGrowth = Math.max(0, expenseGrowthRate * Math.pow(0.9, monthOffset)) // Slower growth than revenue
    return avgOutflow * (1 + projectedGrowth)
  }

  private static getForecastFactors(transactions: any[], monthOffset: number): string[] {
    const factors = ['Historical transaction patterns']
    
    // Add seasonal factors if we have enough data
    const monthlyRevenue = this.calculateMonthlyRevenue(transactions)
    if (monthlyRevenue.length >= 6) {
      factors.push('Seasonal business trends')
    }
    
    // Add growth factors based on actual data
    const growthRate = monthlyRevenue.length > 1 ? this.calculateGrowthRate(monthlyRevenue) : 0
    if (Math.abs(growthRate) > 5) {
      factors.push(`${growthRate > 0 ? 'Positive' : 'Negative'} growth momentum`)
    }
    
    // Add industry-specific factors
    factors.push('Market growth projections')
    
    // Add confidence factors
    if (monthOffset <= 3) {
      factors.push('High confidence short-term projections')
    } else {
      factors.push('Diminishing confidence for long-term projections')
    }
    
    return factors
  }
}
