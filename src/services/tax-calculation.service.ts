import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export interface TaxJurisdiction {
  id: string
  name: string
  country: string
  state?: string
  city?: string
  taxType: 'INCOME' | 'SALES' | 'PAYROLL' | 'PROPERTY' | 'EXCISE'
  rate: number
  minimumThreshold: number
  maximumThreshold?: number
  exemptions: string[]
  effectiveDate: string
  endDate?: string
}

export interface TaxCalculation {
  jurisdiction: string
  taxType: string
  taxableAmount: number
  taxRate: number
  calculatedTax: number
  exemptions: number
  netTax: number
  effectiveRate: number
}

export interface TaxForm {
  formId: string
  formName: string
  jurisdiction: string
  taxType: string
  period: string
  dueDate: string
  status: 'DRAFT' | 'READY' | 'FILED' | 'ACCEPTED' | 'REJECTED'
  fields: TaxFormField[]
  calculatedAmounts: Record<string, number>
  generatedAt: string
}

export interface TaxFormField {
  fieldId: string
  fieldName: string
  fieldType: 'TEXT' | 'NUMBER' | 'CURRENCY' | 'DATE' | 'SELECT' | 'CALCULATED'
  value?: string | number
  required: boolean
  calculated: boolean
  formula?: string
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface TaxReturn {
  id: string
  companyId: string
  formId: string
  period: string
  status: 'DRAFT' | 'READY' | 'FILED' | 'ACCEPTED' | 'REJECTED'
  data: Record<string, any>
  calculatedTax: number
  paidAmount: number
  balance: number
  dueDate: string
  filedDate?: string
  acceptedDate?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export class TaxCalculationService {
  // Tax Jurisdiction Management
  async getJurisdictions(companyId: string, taxType?: string): Promise<TaxJurisdiction[]> {
    // In a real implementation, this would fetch from a tax jurisdiction database
    // For now, return a combined set that aligns with frontend demo IDs and existing examples
    const jurisdictions: TaxJurisdiction[] = [
      // Frontend demo IDs (INCOME focus)
      {
        id: 'us-federal',
        name: 'US Federal',
        country: 'United States',
        taxType: 'INCOME',
        rate: 0.21,
        minimumThreshold: 0,
        exemptions: [],
        effectiveDate: '2024-01-01'
      },
      {
        id: 'us-california',
        name: 'California State',
        country: 'United States',
        state: 'CA',
        taxType: 'INCOME',
        rate: 0.0884,
        minimumThreshold: 0,
        exemptions: [],
        effectiveDate: '2024-01-01'
      },
      {
        id: 'us-ny',
        name: 'New York State',
        country: 'United States',
        state: 'NY',
        taxType: 'INCOME',
        rate: 0.08,
        minimumThreshold: 0,
        exemptions: [],
        effectiveDate: '2024-01-01'
      },
      {
        id: 'uk-corporate',
        name: 'UK Corporation Tax',
        country: 'United Kingdom',
        taxType: 'INCOME',
        rate: 0.25,
        minimumThreshold: 0,
        exemptions: [],
        effectiveDate: '2024-01-01'
      },
      {
        id: 'canada-federal',
        name: 'Canada Federal',
        country: 'Canada',
        taxType: 'INCOME',
        rate: 0.15,
        minimumThreshold: 0,
        exemptions: [],
        effectiveDate: '2024-01-01'
      },

      // Existing examples kept for completeness
      {
        id: 'us-federal-income',
        name: 'US Federal Income Tax',
        country: 'US',
        taxType: 'INCOME',
        rate: 0.21, // Corporate tax rate
        minimumThreshold: 0,
        exemptions: ['charitable_contributions', 'depreciation'],
        effectiveDate: '2024-01-01'
      },
      {
        id: 'us-federal-payroll',
        name: 'US Federal Payroll Tax',
        country: 'US',
        taxType: 'PAYROLL',
        rate: 0.062, // Social Security
        minimumThreshold: 0,
        maximumThreshold: 160200, // 2024 wage base
        exemptions: [],
        effectiveDate: '2024-01-01'
      },
      {
        id: 'us-ca-sales',
        name: 'California Sales Tax',
        country: 'US',
        state: 'CA',
        taxType: 'SALES',
        rate: 0.0725, // 7.25% base rate
        minimumThreshold: 0,
        exemptions: ['food', 'prescription_drugs', 'medical_devices'],
        effectiveDate: '2024-01-01'
      },
      {
        id: 'us-ny-sales',
        name: 'New York Sales Tax',
        country: 'US',
        state: 'NY',
        taxType: 'SALES',
        rate: 0.08, // 8% base rate
        minimumThreshold: 0,
        exemptions: ['food', 'prescription_drugs', 'clothing_under_110'],
        effectiveDate: '2024-01-01'
      },
      {
        id: 'us-texas-sales',
        name: 'Texas Sales Tax',
        country: 'US',
        state: 'TX',
        taxType: 'SALES',
        rate: 0.0625, // 6.25% base rate
        minimumThreshold: 0,
        exemptions: ['food', 'prescription_drugs', 'medical_devices'],
        effectiveDate: '2024-01-01'
      }
    ]

    return taxType ? jurisdictions.filter(j => j.taxType === taxType) : jurisdictions
  }

  // Seed minimal real ledger data into the database for a company
  async seedMinimalLedger(tenantId: string, companyId: string, period?: { year: number; month: number }) {
    const year = period?.year ?? new Date().getFullYear()
    const month = period?.month ?? new Date().getMonth() + 1 // 1-12

    // Ensure company exists (no-op if already there)
    try {
      await prisma.company.upsert({
        where: { id: companyId },
        update: {},
        create: {
          id: companyId,
          tenantId,
          name: `Company ${companyId}`,
          country: 'US',
          currency: 'USD'
        } as any
      })
    } catch {}

    // Ensure account types
    const ensureType = async (code: string, name: string) => {
      const type = await prisma.accountType.upsert({
        where: { tenantId_companyId_code: { tenantId, companyId, code } },
        update: { name },
        create: { tenantId, companyId, code, name }
      })
      return type
    }

    const assetType = await ensureType('ASSET', 'Asset')
    const revenueType = await ensureType('REVENUE', 'Revenue')
    const expenseType = await ensureType('EXPENSE', 'Expense')

    // Ensure accounts
    const ensureAccount = async (code: string, name: string, typeId: string) => {
      const acc = await prisma.account.upsert({
        where: { tenantId_companyId_code: { tenantId, companyId, code } },
        update: { name, typeId },
        create: { tenantId, companyId, code, name, typeId }
      })
      return acc
    }

    const cash = await ensureAccount('1000', 'Cash', assetType.id)
    const sales = await ensureAccount('4000', 'Sales Revenue', revenueType.id)
    const opex = await ensureAccount('5000', 'Operating Expenses', expenseType.id)

    // Create a balanced journal entry for the month
    const entryDate = new Date(Date.UTC(year, month - 1, 15))
    const entry = await prisma.journalEntry.create({
      data: {
        tenantId,
        companyId,
        date: entryDate,
        memo: 'Seeded monthly activity',
        status: 'POSTED',
        lines: {
          create: [
            { tenantId, accountId: cash.id, debit: new Prisma.Decimal(8000), credit: new Prisma.Decimal(0) } as any,
            { tenantId, accountId: opex.id, debit: new Prisma.Decimal(2000), credit: new Prisma.Decimal(0) } as any,
            { tenantId, accountId: sales.id, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(10000) } as any,
          ]
        }
      }
    } as any)

    return { entryId: (entry as any).id, accounts: { cash: cash.id, sales: sales.id, opex: opex.id } }
  }
  async createJurisdiction(companyId: string, jurisdiction: Omit<TaxJurisdiction, 'id'>): Promise<TaxJurisdiction> {
    // In a real implementation, this would save to database
    const newJurisdiction: TaxJurisdiction = {
      id: `custom-${Date.now()}`,
      ...jurisdiction
    }
    return newJurisdiction
  }

  // Tax Calculation
  async calculateTax(
    companyId: string,
    jurisdictionId: string,
    taxableAmount: number,
    exemptions: string[] = [],
    period: string = new Date().toISOString().slice(0, 7)
  ): Promise<TaxCalculation> {
    const jurisdictions = await this.getJurisdictions(companyId)
    const jurisdiction = jurisdictions.find(j => j.id === jurisdictionId)
    
    if (!jurisdiction) {
      throw new Error(`Jurisdiction ${jurisdictionId} not found`)
    }

    // Check if amount is within thresholds
    if (taxableAmount < jurisdiction.minimumThreshold) {
      return {
        jurisdiction: jurisdiction.name,
        taxType: jurisdiction.taxType,
        taxableAmount,
        taxRate: 0,
        calculatedTax: 0,
        exemptions: 0,
        netTax: 0,
        effectiveRate: 0
      }
    }

    if (jurisdiction.maximumThreshold && taxableAmount > jurisdiction.maximumThreshold) {
      taxableAmount = jurisdiction.maximumThreshold
    }

    // Calculate base tax
    const calculatedTax = taxableAmount * jurisdiction.rate

    // Apply exemptions
    let exemptionAmount = 0
    for (const exemption of exemptions) {
      if (jurisdiction.exemptions.includes(exemption)) {
        // In a real implementation, this would calculate actual exemption amounts
        exemptionAmount += taxableAmount * 0.1 // 10% exemption for demo
      }
    }

    const netTax = Math.max(0, calculatedTax - exemptionAmount)
    const effectiveRate = taxableAmount > 0 ? (netTax / taxableAmount) : 0

    return {
      jurisdiction: jurisdiction.name,
      taxType: jurisdiction.taxType,
      taxableAmount,
      taxRate: jurisdiction.rate,
      calculatedTax,
      exemptions: exemptionAmount,
      netTax,
      effectiveRate
    }
  }

  // Multi-jurisdiction tax calculation
  async calculateMultiJurisdictionTax(
    companyId: string,
    calculations: Array<{
      jurisdictionId: string
      taxableAmount: number
      exemptions: string[]
    }>,
    period: string = new Date().toISOString().slice(0, 7)
  ): Promise<TaxCalculation[]> {
    const results = await Promise.all(
      calculations.map(calc => 
        this.calculateTax(companyId, calc.jurisdictionId, calc.taxableAmount, calc.exemptions, period)
      )
    )
    return results
  }

  // Tax Form Generation
  async getTaxForms(companyId: string, taxType?: string, jurisdiction?: string): Promise<TaxForm[]> {
    // In a real implementation, this would fetch from a tax form database
    const forms: TaxForm[] = [
      {
        formId: 'us-1120',
        formName: 'Form 1120 - U.S. Corporation Income Tax Return',
        jurisdiction: 'US',
        taxType: 'INCOME',
        period: '2024',
        dueDate: '2025-03-15',
        status: 'DRAFT',
        fields: [
          {
            fieldId: 'company_name',
            fieldName: 'Company Name',
            fieldType: 'TEXT',
            required: true,
            calculated: false
          },
          {
            fieldId: 'ein',
            fieldName: 'Employer Identification Number',
            fieldType: 'TEXT',
            required: true,
            calculated: false,
            validation: { pattern: '^\\d{2}-\\d{7}$' }
          },
          {
            fieldId: 'gross_receipts',
            fieldName: 'Gross Receipts',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'SUM(revenue_accounts)'
          },
          {
            fieldId: 'total_income',
            fieldName: 'Total Income',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'gross_receipts - cost_of_goods_sold'
          },
          {
            fieldId: 'deductions',
            fieldName: 'Total Deductions',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'SUM(expense_accounts)'
          },
          {
            fieldId: 'taxable_income',
            fieldName: 'Taxable Income',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'total_income - deductions'
          },
          {
            fieldId: 'tax_owed',
            fieldName: 'Tax Owed',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'taxable_income * 0.21'
          }
        ],
        calculatedAmounts: {},
        generatedAt: new Date().toISOString()
      },
      {
        formId: 'us-941',
        formName: 'Form 941 - Employer\'s Quarterly Federal Tax Return',
        jurisdiction: 'US',
        taxType: 'PAYROLL',
        period: '2024-Q1',
        dueDate: '2024-04-30',
        status: 'DRAFT',
        fields: [
          {
            fieldId: 'quarter',
            fieldName: 'Quarter',
            fieldType: 'SELECT',
            required: true,
            calculated: false,
            options: ['Q1', 'Q2', 'Q3', 'Q4']
          },
          {
            fieldId: 'wages',
            fieldName: 'Wages, Tips, and Other Compensation',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'SUM(payroll_wages)'
          },
          {
            fieldId: 'federal_income_tax_withheld',
            fieldName: 'Federal Income Tax Withheld',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'wages * federal_withholding_rate'
          },
          {
            fieldId: 'social_security_wages',
            fieldName: 'Social Security Wages',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'MIN(wages, 160200)'
          },
          {
            fieldId: 'social_security_tax',
            fieldName: 'Social Security Tax',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'social_security_wages * 0.124'
          },
          {
            fieldId: 'medicare_wages',
            fieldName: 'Medicare Wages',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'wages'
          },
          {
            fieldId: 'medicare_tax',
            fieldName: 'Medicare Tax',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'medicare_wages * 0.029'
          }
        ],
        calculatedAmounts: {},
        generatedAt: new Date().toISOString()
      },
      {
        formId: 'ca-sales-tax-return',
        formName: 'California Sales and Use Tax Return',
        jurisdiction: 'CA',
        taxType: 'SALES',
        period: '2024-Q1',
        dueDate: '2024-04-30',
        status: 'DRAFT',
        fields: [
          {
            fieldId: 'gross_sales',
            fieldName: 'Gross Sales',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'SUM(sales_revenue)'
          },
          {
            fieldId: 'exempt_sales',
            fieldName: 'Exempt Sales',
            fieldType: 'CURRENCY',
            required: false,
            calculated: true,
            formula: 'SUM(exempt_sales)'
          },
          {
            fieldId: 'taxable_sales',
            fieldName: 'Taxable Sales',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'gross_sales - exempt_sales'
          },
          {
            fieldId: 'tax_rate',
            fieldName: 'Tax Rate',
            fieldType: 'NUMBER',
            required: true,
            calculated: false,
            value: 7.25
          },
          {
            fieldId: 'tax_due',
            fieldName: 'Tax Due',
            fieldType: 'CURRENCY',
            required: true,
            calculated: true,
            formula: 'taxable_sales * (tax_rate / 100)'
          }
        ],
        calculatedAmounts: {},
        generatedAt: new Date().toISOString()
      }
    ]

    let filteredForms = forms
    if (taxType) {
      filteredForms = filteredForms.filter(f => f.taxType === taxType)
    }
    if (jurisdiction) {
      filteredForms = filteredForms.filter(f => f.jurisdiction === jurisdiction)
    }

    return filteredForms
  }

  // Generate tax form with calculated values
  async generateTaxForm(
    companyId: string,
    formId: string,
    period: string,
    data: Record<string, any> = {}
  ): Promise<TaxForm> {
    const forms = await this.getTaxForms(companyId)
    const form = forms.find(f => f.formId === formId)
    
    if (!form) {
      throw new Error(`Tax form ${formId} not found`)
    }

    // Calculate form field values based on company data
    const calculatedAmounts: Record<string, number> = {}
    
    for (const field of form.fields) {
      if (field.calculated && field.formula) {
        try {
          calculatedAmounts[field.fieldId] = await this.calculateFormField(
            companyId,
            field.formula,
            period,
            data
          )
        } catch (error) {
          console.error(`Error calculating field ${field.fieldId}:`, error)
          calculatedAmounts[field.fieldId] = 0
        }
      }
    }

    return {
      ...form,
      period,
      calculatedAmounts,
      generatedAt: new Date().toISOString()
    }
  }

  // Calculate individual form field values
  private async calculateFormField(
    companyId: string,
    formula: string,
    period: string,
    data: Record<string, any>
  ): Promise<number> {
    // Simple formula evaluation - in a real implementation, this would be more sophisticated
    const periodStart = new Date(period + '-01')
    const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)
    
    // Get account balances for the period
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        companyId,
        date: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      include: {
        lines: true
      }
    })

    // Calculate account totals
    const accountTotals: Record<string, number> = {}
    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        if (!accountTotals[line.accountId]) {
          accountTotals[line.accountId] = 0
        }
        accountTotals[line.accountId] += Number(line.credit) - Number(line.debit)
      }
    }

    // Simple formula evaluation
    let result = formula
    
    // Replace common patterns
    if (formula.includes('SUM(revenue_accounts)')) {
      try {
        const revenueAccounts = await (prisma as any).account.findMany({
          where: { companyId, type: 'REVENUE' }
        })
        const revenueTotal = (revenueAccounts as Array<{ id: string }>).reduce((sum: number, acc: { id: string }) => {
          return sum + (accountTotals[acc.id] || 0)
        }, 0)
        result = result.replace('SUM(revenue_accounts)', String(revenueTotal))
      } catch (e) {
        result = result.replace('SUM(revenue_accounts)', '0')
      }
    }
    
    if (formula.includes('SUM(expense_accounts)')) {
      try {
        const expenseAccounts = await (prisma as any).account.findMany({
          where: { companyId, type: 'EXPENSE' }
        })
        const expenseTotal = (expenseAccounts as Array<{ id: string }>).reduce((sum: number, acc: { id: string }) => {
          return sum + (accountTotals[acc.id] || 0)
        }, 0)
        result = result.replace('SUM(expense_accounts)', String(expenseTotal))
      } catch (e) {
        result = result.replace('SUM(expense_accounts)', '0')
      }
    }

    // Evaluate simple arithmetic
    try {
      return eval(result) || 0
    } catch {
      return 0
    }
  }

  // Tax Return Management
  async createTaxReturn(
    companyId: string,
    formId: string,
    period: string,
    data: Record<string, any>
  ): Promise<TaxReturn> {
    const form = await this.generateTaxForm(companyId, formId, period, data)
    
    const taxReturn: TaxReturn = {
      id: `tax-return-${Date.now()}`,
      companyId,
      formId,
      period,
      status: 'DRAFT',
      data,
      calculatedTax: form.calculatedAmounts.tax_owed || form.calculatedAmounts.tax_due || 0,
      paidAmount: 0,
      balance: form.calculatedAmounts.tax_owed || form.calculatedAmounts.tax_due || 0,
      dueDate: form.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // In a real implementation, this would save to database
    return taxReturn
  }

  async getTaxReturns(companyId: string, status?: string): Promise<TaxReturn[]> {
    // Demo returns for development
    const demoReturns: TaxReturn[] = [
      { id: 'return-2024-1', companyId, formId: 'form-1120', period: '2024', status: 'DRAFT', data: {}, calculatedTax: 15000, paidAmount: 0, balance: 15000, dueDate: '2025-03-15', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'return-2024-2', companyId, formId: 'form-941', period: 'Q4-2024', status: 'FILED', data: {}, calculatedTax: 2500, paidAmount: 2500, balance: 0, dueDate: '2025-01-31', filedDate: '2025-01-15', createdAt: '2024-01-01', updatedAt: '2025-01-15' },
      { id: 'return-2023-1', companyId, formId: 'form-1120', period: '2023', status: 'ACCEPTED', data: {}, calculatedTax: 12000, paidAmount: 12000, balance: 0, dueDate: '2024-03-15', filedDate: '2024-03-10', acceptedDate: '2024-03-20', createdAt: '2023-01-01', updatedAt: '2024-03-20' },
    ]
    return status ? demoReturns.filter(r => r.status === status) : demoReturns
  }

  async updateTaxReturn(
    id: string,
    data: Partial<TaxReturn>
  ): Promise<TaxReturn> {
    // In a real implementation, this would update database
    throw new Error('Not implemented')
  }

  async fileTaxReturn(id: string): Promise<TaxReturn> {
    // In a real implementation, this would submit to tax authority
    throw new Error('Not implemented')
  }

  // Tax Calendar
  async getTaxCalendar(companyId: string, year: number = new Date().getFullYear()): Promise<Array<{
    date: string
    form: string
    description: string
    status: 'UPCOMING' | 'DUE' | 'OVERDUE' | 'FILED'
  }>> {
    const calendar = [
      {
        date: `${year}-01-31`,
        form: 'Form 941',
        description: 'Q4 Payroll Tax Return Due',
        status: 'UPCOMING' as const
      },
      {
        date: `${year}-03-15`,
        form: 'Form 1120',
        description: 'Corporate Income Tax Return Due',
        status: 'UPCOMING' as const
      },
      {
        date: `${year}-04-30`,
        form: 'Form 941',
        description: 'Q1 Payroll Tax Return Due',
        status: 'UPCOMING' as const
      },
      {
        date: `${year}-07-31`,
        form: 'Form 941',
        description: 'Q2 Payroll Tax Return Due',
        status: 'UPCOMING' as const
      },
      {
        date: `${year}-10-31`,
        form: 'Form 941',
        description: 'Q3 Payroll Tax Return Due',
        status: 'UPCOMING' as const
      }
    ]

    return calendar
  }
}

export const taxCalculationService = new TaxCalculationService()
