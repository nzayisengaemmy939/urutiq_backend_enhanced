import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface FinancialStatementData {
  period: string
  companyId: string
  baseCurrency: string
  data: any
  metadata: {
    generatedAt: string
    periodStart: string
    periodEnd: string
    currency: string
  }
}

export interface BalanceSheetData {
  assets: {
    currentAssets: Array<{
      account: string
      accountId: string
      currentPeriod: number
      previousPeriod?: number
      change?: number
      changePercent?: number
    }>
    fixedAssets: Array<{
      account: string
      accountId: string
      currentPeriod: number
      previousPeriod?: number
      change?: number
      changePercent?: number
    }>
    totalAssets: number
  }
  liabilities: {
    currentLiabilities: Array<{
      account: string
      accountId: string
      currentPeriod: number
      previousPeriod?: number
      change?: number
      changePercent?: number
    }>
    longTermLiabilities: Array<{
      account: string
      accountId: string
      currentPeriod: number
      previousPeriod?: number
      change?: number
      changePercent?: number
    }>
    totalLiabilities: number
  }
  equity: {
    accounts: Array<{
      account: string
      accountId: string
      currentPeriod: number
      previousPeriod?: number
      change?: number
      changePercent?: number
    }>
    totalEquity: number
  }
  totalLiabilitiesAndEquity: number
}

export interface IncomeStatementData {
  revenue: Array<{
    account: string
    accountId: string
    currentPeriod: number
    previousPeriod?: number
    change?: number
    changePercent?: number
  }>
  totalRevenue: number
  costOfGoodsSold: Array<{
    account: string
    accountId: string
    currentPeriod: number
    previousPeriod?: number
    change?: number
    changePercent?: number
  }>
  totalCOGS: number
  grossProfit: number
  operatingExpenses: Array<{
    account: string
    accountId: string
    currentPeriod: number
    previousPeriod?: number
    change?: number
    changePercent?: number
  }>
  totalOperatingExpenses: number
  operatingIncome: number
  otherIncome: Array<{
    account: string
    accountId: string
    currentPeriod: number
    previousPeriod?: number
    change?: number
    changePercent?: number
  }>
  totalOtherIncome: number
  otherExpenses: Array<{
    account: string
    accountId: string
    currentPeriod: number
    previousPeriod?: number
    change?: number
    changePercent?: number
  }>
  totalOtherExpenses: number
  netIncome: number
}

export interface CashFlowData {
  operatingActivities: {
    netIncome: number
    adjustments: Array<{
      description: string
      amount: number
    }>
    changesInWorkingCapital: Array<{
      account: string
      accountId: string
      amount: number
    }>
    netCashFromOperations: number
  }
  investingActivities: Array<{
    description: string
    amount: number
  }>
  netCashFromInvesting: number
  financingActivities: Array<{
    description: string
    amount: number
  }>
  netCashFromFinancing: number
  netChangeInCash: number
  beginningCash: number
  endingCash: number
}

export class FinancialReportingService {
  async generateBalanceSheet(
    companyId: string,
    period: string,
    previousPeriod?: string
  ): Promise<BalanceSheetData> {
    const periodStart = new Date(period)
    const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)
    
    // Get chart of accounts
    const accounts = await prisma.account.findMany({
      where: { companyId },
      orderBy: { code: 'asc' }
    })
    // Get account balances for current period
    const currentBalances = await this.getAccountBalances(companyId, periodStart, periodEnd)
    
    // Get account balances for previous period if provided
    let previousBalances: Record<string, number> = {}
    if (previousPeriod) {
      const prevStart = new Date(previousPeriod)
      const prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0)
      previousBalances = await this.getAccountBalances(companyId, prevStart, prevEnd)
    }

    // Categorize accounts
    const assetAccounts = accounts.filter(acc => acc.accountType === 'ASSET')
    const liabilityAccounts = accounts.filter(acc => acc.accountType === 'LIABILITY')
    const equityAccounts = accounts.filter(acc => acc.accountType === 'EQUITY')

    // Build current assets (typically accounts 1000-1999)
    const currentAssets = assetAccounts
      .filter(acc => acc.code.startsWith('1') && acc.code < '1500')
      .map(acc => {
        const current = currentBalances[acc.id] || 0
        const previous = previousBalances[acc.id] || 0
        return {
          account: acc.name,
          accountId: acc.id,
          currentPeriod: current,
          previousPeriod: previousPeriod ? previous : undefined,
          change: previousPeriod ? current - previous : undefined,
          changePercent: previousPeriod && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : undefined
        }
      })

    // Build fixed assets (typically accounts 1500-1999)
    const fixedAssets = assetAccounts
      .filter(acc => acc.code.startsWith('1') && acc.code >= '1500')
      .map(acc => {
        const current = currentBalances[acc.id] || 0
        const previous = previousBalances[acc.id] || 0
        return {
          account: acc.name,
          accountId: acc.id,
          currentPeriod: current,
          previousPeriod: previousPeriod ? previous : undefined,
          change: previousPeriod ? current - previous : undefined,
          changePercent: previousPeriod && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : undefined
        }
      })

    // Build current liabilities (typically accounts 2000-2999)
    const currentLiabilities = liabilityAccounts
      .filter(acc => acc.code.startsWith('2') && acc.code < '2500')
      .map(acc => {
        const current = currentBalances[acc.id] || 0
        const previous = previousBalances[acc.id] || 0
        return {
          account: acc.name,
          accountId: acc.id,
          currentPeriod: current,
          previousPeriod: previousPeriod ? previous : undefined,
          change: previousPeriod ? current - previous : undefined,
          changePercent: previousPeriod && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : undefined
        }
      })

    // Build long-term liabilities (typically accounts 2500-2999)
    const longTermLiabilities = liabilityAccounts
      .filter(acc => acc.code.startsWith('2') && acc.code >= '2500')
      .map(acc => {
        const current = currentBalances[acc.id] || 0
        const previous = previousBalances[acc.id] || 0
        return {
          account: acc.name,
          accountId: acc.id,
          currentPeriod: current,
          previousPeriod: previousPeriod ? previous : undefined,
          change: previousPeriod ? current - previous : undefined,
          changePercent: previousPeriod && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : undefined
        }
      })

    // Build equity accounts (typically accounts 3000-3999)
    const equityAccountsData = equityAccounts.map(acc => {
      const current = currentBalances[acc.id] || 0
      const previous = previousBalances[acc.id] || 0
      return {
        account: acc.name,
        accountId: acc.id,
        currentPeriod: current,
        previousPeriod: previousPeriod ? previous : undefined,
        change: previousPeriod ? current - previous : undefined,
        changePercent: previousPeriod && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : undefined
      }
    })

    // Calculate totals
    const totalCurrentAssets = currentAssets.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const totalFixedAssets = fixedAssets.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const totalAssets = totalCurrentAssets + totalFixedAssets

    const totalCurrentLiabilities = currentLiabilities.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const totalLongTermLiabilities = longTermLiabilities.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities

    const totalEquity = equityAccountsData.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity

    return {
      assets: {
        currentAssets,
        fixedAssets,
        totalAssets
      },
      liabilities: {
        currentLiabilities,
        longTermLiabilities,
        totalLiabilities
      },
      equity: {
        accounts: equityAccountsData,
        totalEquity
      },
      totalLiabilitiesAndEquity
    }
  }

  async generateIncomeStatement(
    companyId: string,
    period: string,
    previousPeriod?: string
  ): Promise<IncomeStatementData> {
    const periodStart = new Date(period)
    const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)
    
    // Get chart of accounts
    const accounts = await prisma.account.findMany({
      where: { companyId },
      orderBy: { code: 'asc' }
    })

    // Get account balances for current period
    const currentBalances = await this.getAccountBalances(companyId, periodStart, periodEnd)
    
    // Get account balances for previous period if provided
    let previousBalances: Record<string, number> = {}
    if (previousPeriod) {
      const prevStart = new Date(previousPeriod)
      const prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0)
      previousBalances = await this.getAccountBalances(companyId, prevStart, prevEnd)
    }

    // Revenue accounts (typically 4000-4999)
    const revenueAccounts = accounts.filter(acc => acc.accountType === 'REVENUE')
    const revenue = revenueAccounts.map(acc => {
      const current = currentBalances[acc.id] || 0
      const previous = previousBalances[acc.id] || 0
      return {
        account: acc.name,
        accountId: acc.id,
        currentPeriod: current,
        previousPeriod: previousPeriod ? previous : undefined,
        change: previousPeriod ? current - previous : undefined,
        changePercent: previousPeriod && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : undefined
      }
    })

    // COGS accounts (typically 5000-5999)
    const cogsAccounts = accounts.filter(acc => acc.accountType === 'COST_OF_GOODS_SOLD')
    const costOfGoodsSold = cogsAccounts.map(acc => {
      const current = currentBalances[acc.id] || 0
      const previous = previousBalances[acc.id] || 0
      return {
        account: acc.name,
        accountId: acc.id,
        currentPeriod: current,
        previousPeriod: previousPeriod ? previous : undefined,
        change: previousPeriod ? current - previous : undefined,
        changePercent: previousPeriod && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : undefined
      }
    })

    // Operating expense accounts (typically 6000-6999)
    const operatingExpenseAccounts = accounts.filter(acc => acc.accountType === 'EXPENSE')
    const operatingExpenses = operatingExpenseAccounts.map(acc => {
      const current = currentBalances[acc.id] || 0
      const previous = previousBalances[acc.id] || 0
      return {
        account: acc.name,
        accountId: acc.id,
        currentPeriod: current,
        previousPeriod: previousPeriod ? previous : undefined,
        change: previousPeriod ? current - previous : undefined,
        changePercent: previousPeriod && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : undefined
      }
    })

    // Other income accounts (typically 7000-7999)
    const otherIncomeAccounts = accounts.filter(acc => acc.accountType === 'OTHER_INCOME')
    const otherIncome = otherIncomeAccounts.map(acc => {
      const current = currentBalances[acc.id] || 0
      const previous = previousBalances[acc.id] || 0
      return {
        account: acc.name,
        accountId: acc.id,
        currentPeriod: current,
        previousPeriod: previousPeriod ? previous : undefined,
        change: previousPeriod ? current - previous : undefined,
        changePercent: previousPeriod && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : undefined
      }
    })

    // Other expense accounts (typically 8000-8999)
    const otherExpenseAccounts = accounts.filter(acc => acc.accountType === 'OTHER_EXPENSE')
    const otherExpenses = otherExpenseAccounts.map(acc => {
      const current = currentBalances[acc.id] || 0
      const previous = previousBalances[acc.id] || 0
      return {
        account: acc.name,
        accountId: acc.id,
        currentPeriod: current,
        previousPeriod: previousPeriod ? previous : undefined,
        change: previousPeriod ? current - previous : undefined,
        changePercent: previousPeriod && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : undefined
      }
    })

    // Calculate totals
    const totalRevenue = revenue.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const totalCOGS = costOfGoodsSold.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const grossProfit = totalRevenue - totalCOGS
    const totalOperatingExpenses = operatingExpenses.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const operatingIncome = grossProfit - totalOperatingExpenses
    const totalOtherIncome = otherIncome.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const totalOtherExpenses = otherExpenses.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const netIncome = operatingIncome + totalOtherIncome - totalOtherExpenses

    return {
      revenue,
      totalRevenue,
      costOfGoodsSold,
      totalCOGS,
      grossProfit,
      operatingExpenses,
      totalOperatingExpenses,
      operatingIncome,
      otherIncome,
      totalOtherIncome,
      otherExpenses,
      totalOtherExpenses,
      netIncome
    }
  }

  async generateCashFlowStatement(
    companyId: string,
    period: string,
    previousPeriod?: string
  ): Promise<CashFlowData> {
    const periodStart = new Date(period)
    const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)
    
    // Get account balances for current period
    const currentBalances = await this.getAccountBalances(companyId, periodStart, periodEnd)
    
    // Get account balances for previous period
    const prevStart = previousPeriod ? new Date(previousPeriod) : new Date(periodStart.getFullYear() - 1, periodStart.getMonth(), 1)
    const prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0)
    const previousBalances = await this.getAccountBalances(companyId, prevStart, prevEnd)

    // Get accounts
    const accounts = await prisma.account.findMany({
      where: { companyId }
    })

    // Calculate net income (from income statement)
    const incomeStatement = await this.generateIncomeStatement(companyId, period, previousPeriod)
    const netIncome = incomeStatement.netIncome

    // Operating activities adjustments (simplified)
    const adjustments = [
      { description: 'Depreciation and Amortization', amount: 0 }, // Would need to calculate from fixed assets
      { description: 'Changes in Working Capital', amount: 0 } // Would need to calculate from balance sheet changes
    ]

    // Calculate working capital changes
    const cashAccount = accounts.find(acc => acc.name.toLowerCase().includes('cash'))
    const accountsReceivable = accounts.find(acc => acc.name.toLowerCase().includes('receivable'))
    const inventory = accounts.find(acc => acc.name.toLowerCase().includes('inventory'))
    const accountsPayable = accounts.find(acc => acc.name.toLowerCase().includes('payable'))

    const changesInWorkingCapital = []
    if (accountsReceivable) {
      const current = currentBalances[accountsReceivable.id] || 0
      const previous = previousBalances[accountsReceivable.id] || 0
      changesInWorkingCapital.push({
        account: accountsReceivable.name,
        accountId: accountsReceivable.id,
        amount: current - previous
      })
    }
    if (inventory) {
      const current = currentBalances[inventory.id] || 0
      const previous = previousBalances[inventory.id] || 0
      changesInWorkingCapital.push({
        account: inventory.name,
        accountId: inventory.id,
        amount: current - previous
      })
    }
    if (accountsPayable) {
      const current = currentBalances[accountsPayable.id] || 0
      const previous = previousBalances[accountsPayable.id] || 0
      changesInWorkingCapital.push({
        account: accountsPayable.name,
        accountId: accountsPayable.id,
        amount: current - previous
      })
    }

    const netCashFromOperations = netIncome + adjustments.reduce((sum, adj) => sum + adj.amount, 0) + 
      changesInWorkingCapital.reduce((sum, change) => sum + change.amount, 0)

    // Investing activities (simplified - would need to analyze fixed asset transactions)
    const investingActivities = [
      { description: 'Purchase of Fixed Assets', amount: 0 },
      { description: 'Sale of Fixed Assets', amount: 0 }
    ]
    const netCashFromInvesting = investingActivities.reduce((sum, activity) => sum + activity.amount, 0)

    // Financing activities (simplified - would need to analyze equity and debt transactions)
    const financingActivities = [
      { description: 'Borrowings', amount: 0 },
      { description: 'Repayment of Debt', amount: 0 },
      { description: 'Owner Contributions', amount: 0 },
      { description: 'Owner Distributions', amount: 0 }
    ]
    const netCashFromFinancing = financingActivities.reduce((sum, activity) => sum + activity.amount, 0)

    const netChangeInCash = netCashFromOperations + netCashFromInvesting + netCashFromFinancing

    // Get beginning and ending cash
    const beginningCash = cashAccount ? (previousBalances[cashAccount.id] || 0) : 0
    const endingCash = cashAccount ? (currentBalances[cashAccount.id] || 0) : 0

    return {
      operatingActivities: {
        netIncome,
        adjustments,
        changesInWorkingCapital,
        netCashFromOperations
      },
      investingActivities,
      netCashFromInvesting,
      financingActivities,
      netCashFromFinancing,
      netChangeInCash,
      beginningCash,
      endingCash
    }
  }

  private async getAccountBalances(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, number>> {
    // Get all journal entries for the period
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        companyId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        lines: true
      }
    })

    // Calculate account balances
    const balances: Record<string, number> = {}
    
    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        if (!balances[line.accountId]) {
          balances[line.accountId] = 0
        }
        
        // Debit increases asset and expense accounts, credit increases liability, equity, and revenue accounts
        const account = await prisma.account.findUnique({
          where: { id: line.accountId }
        })
        
        if (account) {
          const accType = account.accountType || ''
          
          const debit = typeof (line.debit as any)?.toNumber === 'function'
            ? (line.debit as any).toNumber()
            : typeof line.debit === 'object' && line.debit !== null && 'toString' in (line.debit as any)
              ? parseFloat((line.debit as any).toString())
              : (line.debit as unknown as number)

          const credit = typeof (line.credit as any)?.toNumber === 'function'
            ? (line.credit as any).toNumber()
            : typeof line.credit === 'object' && line.credit !== null && 'toString' in (line.credit as any)
              ? parseFloat((line.credit as any).toString())
              : (line.credit as unknown as number)

          if (['ASSET', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'OTHER_EXPENSE'].includes(accType)) {
            balances[line.accountId] = (balances[line.accountId] || 0) + debit - credit
          } else {
            balances[line.accountId] = (balances[line.accountId] || 0) + credit - debit
          }
        }
      }
    }

    return balances
  }

  async getFinancialRatios(companyId: string, period: string): Promise<any> {
    const balanceSheet = await this.generateBalanceSheet(companyId, period)
    const incomeStatement = await this.generateIncomeStatement(companyId, period)

    // Liquidity ratios
    const currentAssets = balanceSheet.assets.currentAssets.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const currentLiabilities = balanceSheet.liabilities.currentLiabilities.reduce((sum, acc) => sum + acc.currentPeriod, 0)
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0

    // Profitability ratios
    const totalAssets = balanceSheet.assets.totalAssets
    const netIncome = incomeStatement.netIncome
    const returnOnAssets = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0
    const returnOnEquity = balanceSheet.equity.totalEquity > 0 ? (netIncome / balanceSheet.equity.totalEquity) * 100 : 0

    // Leverage ratios
    const totalDebt = balanceSheet.liabilities.totalLiabilities
    const debtToEquity = balanceSheet.equity.totalEquity > 0 ? totalDebt / balanceSheet.equity.totalEquity : 0

    return {
      liquidity: {
        currentRatio: Number(currentRatio.toFixed(2)),
        quickRatio: 0 // Would need to calculate with liquid assets only
      },
      profitability: {
        returnOnAssets: Number(returnOnAssets.toFixed(2)),
        returnOnEquity: Number(returnOnEquity.toFixed(2)),
        grossProfitMargin: incomeStatement.totalRevenue > 0 ? Number(((incomeStatement.grossProfit / incomeStatement.totalRevenue) * 100).toFixed(2)) : 0,
        netProfitMargin: incomeStatement.totalRevenue > 0 ? Number(((netIncome / incomeStatement.totalRevenue) * 100).toFixed(2)) : 0
      },
      leverage: {
        debtToEquity: Number(debtToEquity.toFixed(2)),
        debtToAssets: totalAssets > 0 ? Number(((totalDebt / totalAssets) * 100).toFixed(2)) : 0
      }
    }
  }
}

export const financialReportingService = new FinancialReportingService()