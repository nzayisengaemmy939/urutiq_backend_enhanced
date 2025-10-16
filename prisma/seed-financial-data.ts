import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedFinancialData({ tenantId, companyId, industry = 'general' }: { tenantId: string; companyId: string; industry?: 'general' | 'saas' | 'retail' | 'manufacturing' | 'services' }) {
  console.log('🌱 Seeding financial data for company:', companyId, 'industry:', industry)

  // Create Chart of Accounts
  const accounts = await createChartOfAccounts(tenantId, companyId)
  
  // (Optional) Additional transactions skipped; base journal entries already seeded elsewhere
  
  // Create sample budgets
  await createSampleBudgets(tenantId, companyId)
  
  // Create sample custom reports
  await createSampleCustomReports(tenantId, companyId)

  // Industry-specific seeding (uses journal entries / transactions models appropriately)
  await seedIndustrySpecificData(tenantId, companyId, accounts, industry)

  console.log('✅ Financial data seeded successfully')
}

async function createChartOfAccounts(tenantId: string, companyId: string) {
  // Get existing accounts from the main seed
  const existingAccounts = await prisma.account.findMany({
    where: {
      tenantId,
      companyId
    }
  })

  console.log(`📊 Found ${existingAccounts.length} existing accounts`)
  return existingAccounts
}

// Deprecated: use journal entries via seedIndustrySpecificData instead
async function createSampleTransactions(tenantId: string, companyId: string, accounts: any[]) {
  const accountMap = accounts.reduce((acc, account) => {
    acc[account.code] = account
    return acc
  }, {})

  // Generate additional transactions for the current year to supplement existing journal entries
  const currentYear = new Date().getFullYear()
  const transactions = []

  // Monthly revenue transactions (additional to existing journal entries)
  for (let month = 0; month < 12; month++) {
    const date = new Date(currentYear, month, 15)
    
    // Additional Sales Revenue
    if (accountMap['4001']) {
      transactions.push({
        tenantId,
        companyId,
        accountId: accountMap['4001'].id,
        date,
        description: `Additional Product Sales - ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        debit: 0,
        credit: Math.floor(Math.random() * 30000) + 20000, // $20k - $50k
        reference: `ADD-SALES-${currentYear}-${String(month + 1).padStart(2, '0')}`
      })
    }

    // Additional Service Revenue
    if (accountMap['4002']) {
      transactions.push({
        tenantId,
        companyId,
        accountId: accountMap['4002'].id,
        date,
        description: `Additional Service Revenue - ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        debit: 0,
        credit: Math.floor(Math.random() * 20000) + 15000, // $15k - $35k
        reference: `ADD-SRV-${currentYear}-${String(month + 1).padStart(2, '0')}`
      })
    }

    // Cost of Goods Sold
    if (accountMap['5016']) {
      transactions.push({
        tenantId,
        companyId,
        accountId: accountMap['5016'].id,
        date,
        description: `Additional COGS - ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        debit: Math.floor(Math.random() * 25000) + 30000, // $30k - $55k
        credit: 0,
        reference: `ADD-COGS-${currentYear}-${String(month + 1).padStart(2, '0')}`
      })
    }

    // Additional Operating Expenses
    const expenses = [
      { account: '5009', name: 'Marketing', amount: Math.floor(Math.random() * 3000) + 1000 },
      { account: '5010', name: 'Professional Services', amount: Math.floor(Math.random() * 2000) + 500 },
      { account: '5011', name: 'Maintenance', amount: Math.floor(Math.random() * 1500) + 500 },
      { account: '5012', name: 'Telecommunications', amount: Math.floor(Math.random() * 1000) + 300 },
      { account: '5013', name: 'Software Licenses', amount: Math.floor(Math.random() * 2000) + 800 },
      { account: '5014', name: 'Bank Charges', amount: Math.floor(Math.random() * 200) + 100 },
      { account: '5017', name: 'Freight', amount: Math.floor(Math.random() * 1500) + 500 },
      { account: '5018', name: 'Warranty', amount: Math.floor(Math.random() * 1000) + 200 },
      { account: '5019', name: 'Training', amount: Math.floor(Math.random() * 2000) + 500 },
      { account: '5020', name: 'Legal', amount: Math.floor(Math.random() * 3000) + 1000 }
    ]

    for (const expense of expenses) {
      if (accountMap[expense.account]) {
        transactions.push({
          tenantId,
          companyId,
          accountId: accountMap[expense.account].id,
          date,
          description: `Additional ${expense.name} - ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          debit: expense.amount,
          credit: 0,
          reference: `ADD-${expense.account}-${currentYear}-${String(month + 1).padStart(2, '0')}`
        })
      }
    }
  }

  // Create some asset and liability transactions
  const assetTransactions = [
    { account: '1001', description: 'Additional Cash Investment', debit: 0, credit: 100000 },
    { account: '1101', description: 'Additional Accounts Receivable', debit: 15000, credit: 0 },
    { account: '1203', description: 'Additional Finished Goods Inventory', debit: 50000, credit: 0 },
    { account: '1401', description: 'Additional Equipment Purchase', debit: 25000, credit: 0 },
    { account: '2001', description: 'Additional Accounts Payable', debit: 0, credit: 12000 },
    { account: '2301', description: 'Additional Long-term Loan', debit: 0, credit: 75000 }
  ]

  for (const transaction of assetTransactions) {
    if (accountMap[transaction.account]) {
      transactions.push({
        tenantId,
        companyId,
        accountId: accountMap[transaction.account].id,
        date: new Date(currentYear, 11, 31), // End of year
        description: transaction.description,
        debit: transaction.debit,
        credit: transaction.credit,
        reference: `ADD-BAL-${transaction.account}-${currentYear}`
      })
    }
  }

  // Insert all transactions
  if (transactions.length > 0) {
    await prisma.transaction.createMany({
      data: transactions
    })
  }

  console.log(`💰 Created ${transactions.length} additional sample transactions`)
}

async function createSampleBudgets(tenantId: string, companyId: string) {
  const currentYear = new Date().getFullYear()
  const budgets = []

  // Annual budgets for different categories
  const budgetCategories = [
    { name: 'Sales Revenue', amount: 1500000, startMonth: 0, endMonth: 11 },
    { name: 'Service Revenue', amount: 800000, startMonth: 0, endMonth: 11 },
    { name: 'Cost of Goods Sold', amount: 900000, startMonth: 0, endMonth: 11 },
    { name: 'Salaries and Wages', amount: 600000, startMonth: 0, endMonth: 11 },
    { name: 'Rent Expense', amount: 96000, startMonth: 0, endMonth: 11 },
    { name: 'Utilities', amount: 36000, startMonth: 0, endMonth: 11 },
    { name: 'Marketing and Advertising', amount: 84000, startMonth: 0, endMonth: 11 },
    { name: 'Professional Services', amount: 24000, startMonth: 0, endMonth: 11 },
    { name: 'Insurance', amount: 24000, startMonth: 0, endMonth: 11 },
    { name: 'Office Supplies', amount: 6000, startMonth: 0, endMonth: 11 }
  ]

  for (const budget of budgetCategories) {
    const startDate = new Date(currentYear, budget.startMonth, 1)
    const endDate = new Date(currentYear, budget.endMonth, 31)

    // Find or create expense category
    let category = await prisma.expenseCategory.findFirst({
      where: {
        tenantId,
        companyId,
        name: budget.name
      }
    })

    if (!category) {
      category = await prisma.expenseCategory.create({
        data: {
          tenantId,
          companyId,
          name: budget.name,
          description: `Budget category for ${budget.name}`,
          isActive: true
        }
      })
    }

    budgets.push({
      tenantId,
      companyId,
      categoryId: category.id,
      name: `${budget.name} Budget ${currentYear}`,
      amount: budget.amount,
      startDate,
      endDate,
      period: 'annual'
    })
  }

  // Create some quarterly budgets
  const quarterlyBudgets = [
    { name: 'Q1 Marketing Campaign', amount: 25000, quarter: 0 },
    { name: 'Q2 Equipment Purchase', amount: 50000, quarter: 1 },
    { name: 'Q3 Training Program', amount: 15000, quarter: 2 },
    { name: 'Q4 Year-end Bonus', amount: 30000, quarter: 3 }
  ]

  for (const budget of quarterlyBudgets) {
    const startDate = new Date(currentYear, budget.quarter * 3, 1)
    const endDate = new Date(currentYear, budget.quarter * 3 + 2, 31)

    let category = await prisma.expenseCategory.findFirst({
      where: {
        tenantId,
        companyId,
        name: 'Special Projects'
      }
    })

    if (!category) {
      category = await prisma.expenseCategory.create({
        data: {
          tenantId,
          companyId,
          name: 'Special Projects',
          description: 'Special project budgets',
          isActive: true
        }
      })
    }

    budgets.push({
      tenantId,
      companyId,
      categoryId: category.id,
      name: budget.name,
      amount: budget.amount,
      startDate,
      endDate,
      period: 'quarterly'
    })
  }

  await prisma.budget.createMany({
    data: budgets
  })

  console.log(`📋 Created ${budgets.length} sample budgets`)
}

async function createSampleCustomReports(tenantId: string, companyId: string) {
  const anyUser = await prisma.appUser.findFirst({ where: { tenantId }, select: { id: true } })
  if (!anyUser) {
    console.log('⚠️ No user found to own custom reports; skipping custom report seeding')
    return
  }
  const customReports = [
    {
      name: 'Monthly P&L Summary',
      description: 'Monthly profit and loss summary with key metrics',
      templateId: 'profit-loss',
      filters: JSON.stringify({
        period: 'monthly',
        includeSubaccounts: true,
        showPercentages: true
      }),
      columns: JSON.stringify([
        { field: 'account', label: 'Account', type: 'text' },
        { field: 'amount', label: 'Amount', type: 'currency' },
        { field: 'percentage', label: '% of Revenue', type: 'percentage' }
      ]),
      grouping: JSON.stringify(['accountType']),
      sorting: JSON.stringify([{ field: 'amount', direction: 'desc' }]),
      isPublic: true
    },
    {
      name: 'Vendor Spend Analysis',
      description: 'Analysis of spending by vendor with trends',
      templateId: 'budget-variance',
      filters: JSON.stringify({
        dateRange: 'ytd',
        vendorType: 'all',
        minAmount: 1000
      }),
      columns: JSON.stringify([
        { field: 'vendor', label: 'Vendor', type: 'text' },
        { field: 'totalSpend', label: 'Total Spend', type: 'currency' },
        { field: 'transactionCount', label: 'Transactions', type: 'number' },
        { field: 'avgTransaction', label: 'Avg Transaction', type: 'currency' }
      ]),
      grouping: JSON.stringify(['vendor']),
      sorting: JSON.stringify([{ field: 'totalSpend', direction: 'desc' }]),
      isPublic: false
    },
    {
      name: 'Cash Flow Forecast',
      description: '12-month cash flow projection based on historical data',
      templateId: 'cash-flow',
      filters: JSON.stringify({
        forecastMonths: 12,
        includeSeasonality: true,
        confidenceLevel: 0.8
      }),
      columns: JSON.stringify([
        { field: 'month', label: 'Month', type: 'date' },
        { field: 'inflows', label: 'Cash Inflows', type: 'currency' },
        { field: 'outflows', label: 'Cash Outflows', type: 'currency' },
        { field: 'netFlow', label: 'Net Flow', type: 'currency' },
        { field: 'cumulative', label: 'Cumulative', type: 'currency' }
      ]),
      grouping: JSON.stringify(['month']),
      sorting: JSON.stringify([{ field: 'month', direction: 'asc' }]),
      isPublic: true
    }
  ]

  for (const report of customReports) {
    await prisma.customReport.create({
      data: {
        tenantId,
        companyId,
        createdBy: anyUser.id,
        ...report
      }
    })
  }

  console.log(`📊 Created ${customReports.length} sample custom reports`)
}

export default seedFinancialData

// --- Industry specific data ---
async function seedIndustrySpecificData(
  tenantId: string,
  companyId: string,
  accounts: any[],
  industry: 'general' | 'saas' | 'retail' | 'manufacturing' | 'services'
) {
  const byCode: Record<string, any> = {}
  for (const a of accounts) byCode[a.code] = a

  const now = new Date()
  const year = now.getFullYear()

  if (industry === 'saas') {
    // SaaS: recurring revenue, churn credits, hosting costs, R&D
    const monthly = (m: number) => new Date(year, m, 15)
    const pushTxn = async (code: string, date: Date, debit: number, credit: number, description: string) => {
      if (!byCode[code]) return
      await prisma.transaction.create({
        data: {
          tenantId,
          companyId,
          accountId: byCode[code].id,
          date,
          description,
          debit,
          credit,
          reference: `SAAS-${date.toISOString().slice(0,10)}-${code}`
        }
      })
    }
    for (let m = 0; m < 12; m++) {
      const date = monthly(m)
      await prisma.journalEntry.create({ data: {
        tenantId, companyId, date, memo: 'SaaS monthly ops', status: 'POSTED',
        lines: {
          create: [
            { tenantId, accountId: byCode['1001']?.id, debit: 90000, credit: 0, memo: 'Cash receipt' },
            { tenantId, accountId: byCode['4002']?.id, debit: 0, credit: 90000, memo: 'Subscription revenue' },
            { tenantId, accountId: byCode['5013']?.id, debit: 12000, credit: 0, memo: 'Cloud hosting' },
            { tenantId, accountId: byCode['5001']?.id, debit: 60000, credit: 0, memo: 'R&D Salaries' },
          ].filter(l => !!l.accountId)
        }
      } })
    }
  } else if (industry === 'retail') {
    // Retail: inventory purchases, POS sales, freight, shrinkage
    const monthly = (m: number) => new Date(year, m, 20)
    const pushTxn = async (code: string, date: Date, debit: number, credit: number, description: string) => {
      if (!byCode[code]) return
      await prisma.transaction.create({
        data: {
          tenantId,
          companyId,
          accountId: byCode[code].id,
          date,
          description,
          debit,
          credit,
          reference: `RTL-${date.toISOString().slice(0,10)}-${code}`
        }
      })
    }
    for (let m = 0; m < 12; m++) {
      const date = monthly(m)
      await prisma.journalEntry.create({ data: {
        tenantId, companyId, date, memo: 'Retail month close', status: 'POSTED',
        lines: {
          create: [
            { tenantId, accountId: byCode['1001']?.id, debit: 120000, credit: 0, memo: 'POS cash' },
            { tenantId, accountId: byCode['4001']?.id, debit: 0, credit: 120000, memo: 'Sales revenue' },
            { tenantId, accountId: byCode['5016']?.id, debit: 70000, credit: 0, memo: 'COGS' },
            { tenantId, accountId: byCode['1203']?.id, debit: 0, credit: 70000, memo: 'Inventory out' },
          ].filter(l => !!l.accountId)
        }
      } })
    }
  } else if (industry === 'manufacturing') {
    // Manufacturing: materials, labor, overhead to COGS
    const monthly = (m: number) => new Date(year, m, 18)
    const pushTxn = async (code: string, date: Date, debit: number, credit: number, description: string) => {
      if (!byCode[code]) return
      await prisma.transaction.create({
        data: {
          tenantId,
          companyId,
          accountId: byCode[code].id,
          date,
          description,
          debit,
          credit,
          reference: `MFG-${date.toISOString().slice(0,10)}-${code}`
        }
      })
    }
    for (let m = 0; m < 12; m++) {
      const date = monthly(m)
      await prisma.journalEntry.create({ data: {
        tenantId, companyId, date, memo: 'Manufacturing month close', status: 'POSTED',
        lines: {
          create: [
            { tenantId, accountId: byCode['1001']?.id, debit: 110000, credit: 0, memo: 'AR/Cash' },
            { tenantId, accountId: byCode['4001']?.id, debit: 0, credit: 110000, memo: 'Sales' },
            { tenantId, accountId: byCode['5016']?.id, debit: 50000, credit: 0, memo: 'COGS' },
            { tenantId, accountId: byCode['5001']?.id, debit: 30000, credit: 0, memo: 'Direct labor' },
            { tenantId, accountId: byCode['5300']?.id, debit: 12000, credit: 0, memo: 'Overhead' },
          ].filter(l => !!l.accountId)
        }
      } })
    }
  } else if (industry === 'services') {
    // Professional services: billable hours, WIP-like pattern, AR
    const mid = (m: number) => new Date(year, m, 12)
    const pushTxn = async (code: string, date: Date, debit: number, credit: number, description: string) => {
      if (!byCode[code]) return
      await prisma.transaction.create({
        data: {
          tenantId,
          companyId,
          accountId: byCode[code].id,
          date,
          description,
          debit,
          credit,
          reference: `SRV-${date.toISOString().slice(0,10)}-${code}`
        }
      })
    }
    for (let m = 0; m < 12; m++) {
      const date = mid(m)
      await prisma.journalEntry.create({ data: {
        tenantId, companyId, date, memo: 'Services month billing', status: 'POSTED',
        lines: {
          create: [
            { tenantId, accountId: byCode['1001']?.id, debit: 60000, credit: 0, memo: 'Cash' },
            { tenantId, accountId: byCode['4002']?.id, debit: 0, credit: 60000, memo: 'Service revenue' },
            { tenantId, accountId: byCode['5001']?.id, debit: 35000, credit: 0, memo: 'Salaries' },
            { tenantId, accountId: byCode['5010']?.id, debit: 5000, credit: 0, memo: 'Subcontractors' },
          ].filter(l => !!l.accountId)
        }
      } })
    }
  }
}
