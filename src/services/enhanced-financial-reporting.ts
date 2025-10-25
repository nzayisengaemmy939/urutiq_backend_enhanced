import { prisma } from '../prisma.js';
import { Decimal } from '@prisma/client/runtime/library';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { addCompanyLogoToPDF, getCompanyForPDF } from '../utils/pdf-logo-helper.js';

// Enhanced Financial Reporting Engine
export interface FinancialReportingEngine {
  generateBalanceSheet(companyId: string, date: Date): Promise<BalanceSheet>;
  generateProfitAndLoss(companyId: string, period: DateRange): Promise<ProfitAndLoss>;
  generateCashFlow(companyId: string, period: DateRange): Promise<CashFlowStatement>;
  generateCustomReport(specification: ReportSpec): Promise<CustomReport>;
  exportReport(report: any, format: 'pdf' | 'excel' | 'csv'): Promise<Buffer>;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface BalanceSheet {
  assets: AssetSection;
  liabilities: LiabilitySection;
  equity: EquitySection;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  date: Date;
  previousPeriod?: BalanceSheet;
  changes: BalanceSheetChanges;
  ratios: FinancialRatios;
}

export interface AssetSection {
  currentAssets: AccountBalance[];
  fixedAssets: AccountBalance[];
  otherAssets: AccountBalance[];
  totalCurrentAssets: number;
  totalFixedAssets: number;
  totalOtherAssets: number;
}

export interface LiabilitySection {
  currentLiabilities: AccountBalance[];
  longTermLiabilities: AccountBalance[];
  totalCurrentLiabilities: number;
  totalLongTermLiabilities: number;
}

export interface EquitySection {
  contributedCapital: AccountBalance[];
  retainedEarnings: AccountBalance[];
  otherEquity: AccountBalance[];
  totalContributedCapital: number;
  totalRetainedEarnings: number;
  totalOtherEquity: number;
}

export interface AccountBalance {
  accountId: string;
  accountName: string;
  accountNumber: string;
  balance: number;
  previousBalance?: number;
  change?: number;
  changePercent?: number;
}

export interface BalanceSheetChanges {
  assetsChange: number;
  liabilitiesChange: number;
  equityChange: number;
  workingCapitalChange: number;
}

export interface ProfitAndLoss {
  revenue: RevenueSection;
  costOfGoodsSold: COGSSection;
  grossProfit: number;
  operatingExpenses: ExpenseSection;
  operatingIncome: number;
  otherIncome: OtherIncomeSection;
  otherExpenses: OtherExpenseSection;
  netIncome: number;
  period: DateRange;
  previousPeriod?: ProfitAndLoss;
  changes: PnLChanges;
  margins: ProfitMargins;
}

export interface RevenueSection {
  salesRevenue: AccountBalance[];
  serviceRevenue: AccountBalance[];
  otherRevenue: AccountBalance[];
  totalRevenue: number;
}

export interface COGSSection {
  directMaterials: AccountBalance[];
  directLabor: AccountBalance[];
  overhead: AccountBalance[];
  totalCOGS: number;
}

export interface ExpenseSection {
  sellingExpenses: AccountBalance[];
  administrativeExpenses: AccountBalance[];
  researchExpenses: AccountBalance[];
  totalOperatingExpenses: number;
}

export interface OtherIncomeSection {
  interestIncome: AccountBalance[];
  investmentIncome: AccountBalance[];
  otherIncome: AccountBalance[];
  totalOtherIncome: number;
}

export interface OtherExpenseSection {
  interestExpense: AccountBalance[];
  taxes: AccountBalance[];
  otherExpenses: AccountBalance[];
  totalOtherExpenses: number;
}

export interface PnLChanges {
  revenueChange: number;
  expenseChange: number;
  netIncomeChange: number;
  grossProfitChange: number;
}

export interface ProfitMargins {
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

export interface CashFlowStatement {
  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
  period: DateRange;
  previousPeriod?: CashFlowStatement;
  changes: CashFlowChanges;
}

export interface CashFlowSection {
  inflows: CashFlowItem[];
  outflows: CashFlowItem[];
  netCashFlow: number;
}

export interface CashFlowItem {
  description: string;
  amount: number;
  category: string;
}

export interface CashFlowChanges {
  operatingChange: number;
  investingChange: number;
  financingChange: number;
  netCashChange: number;
}

export interface FinancialRatios {
  currentRatio: number;
  quickRatio: number;
  debtToEquityRatio: number;
  returnOnAssets: number;
  returnOnEquity: number;
  assetTurnover: number;
  equityMultiplier: number;
}

export interface ReportSpec {
  type: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'custom';
  companyId: string;
  date?: Date;
  period?: DateRange;
  items: ReportItem[];
  filters?: ReportFilters;
  grouping?: ReportGrouping;
}

export interface ReportItem {
  id: string;
  name: string;
  type: 'account' | 'calculation' | 'text' | 'chart';
  formula?: string;
  accountIds?: string[];
  order: number;
  configuration?: any;
}

export interface ReportFilters {
  dateRange?: DateRange;
  accountTypes?: string[];
  departments?: string[];
  locations?: string[];
  customFilters?: Record<string, any>;
}

export interface ReportGrouping {
  byAccountType: boolean;
  byDepartment: boolean;
  byLocation: boolean;
  byPeriod: boolean;
  customGrouping?: Record<string, any>;
}

export interface CustomReport {
  id: string;
  name: string;
  type: string;
  data: any;
  summary: ReportSummary;
  metadata: ReportMetadata;
}

export interface ReportSummary {
  totals: Record<string, number>;
  counts: Record<string, number>;
  averages: Record<string, number>;
  changes: Record<string, number>;
}

export interface ReportMetadata {
  generatedAt: Date;
  period: DateRange;
  filters: ReportFilters;
  grouping: ReportGrouping;
  currency: string;
}

export class EnhancedFinancialReportingEngine {
  async generateBalanceSheet(companyId: string, date: Date, tenantId?: string): Promise<BalanceSheet> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for financial reporting');
    }
    const actualTenantId = tenantId;

    // Get all accounts for the company with their types
    const accounts = await prisma.account.findMany({
      where: {
        tenantId: actualTenantId,
        companyId,
      },
      include: {
        type: true
      },
      orderBy: { code: 'asc' }
    });

    // Calculate balances as of the specified date
    const accountBalances = await this.calculateAccountBalances(accounts, date, actualTenantId, companyId);

    // Group accounts by type
    const assets = this.groupAssets(accountBalances);
    const liabilities = this.groupLiabilities(accountBalances);
    const equity = this.groupEquity(accountBalances);

    // Calculate totals
    const totalAssets = assets.currentAssets.reduce((sum, a) => sum + a.balance, 0) +
                       assets.fixedAssets.reduce((sum, a) => sum + a.balance, 0) +
                       assets.otherAssets.reduce((sum, a) => sum + a.balance, 0);

    const totalLiabilities = liabilities.currentLiabilities.reduce((sum, l) => sum + l.balance, 0) +
                             liabilities.longTermLiabilities.reduce((sum, l) => sum + l.balance, 0);

    const totalEquity = equity.contributedCapital.reduce((sum, e) => sum + e.balance, 0) +
                       equity.retainedEarnings.reduce((sum, e) => sum + e.balance, 0) +
                       equity.otherEquity.reduce((sum, e) => sum + e.balance, 0);

    // Get previous period for comparison
    const previousDate = new Date(date);
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousBalances = await this.calculateAccountBalances(accounts, previousDate, actualTenantId, companyId);

    // Calculate changes
    const changes = this.calculateBalanceSheetChanges(accountBalances, previousBalances);

    // Calculate financial ratios
    const ratios = this.calculateFinancialRatios(assets, liabilities, equity);

    return {
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      date,
      changes,
      ratios
    };
  }

  async generateProfitAndLoss(companyId: string, period: DateRange, tenantId?: string): Promise<ProfitAndLoss> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for financial reporting');
    }
    const actualTenantId = tenantId;

    // Get all accounts for the company
    const accounts = await prisma.account.findMany({
      where: {
        tenantId: actualTenantId,
        companyId,
      },
      orderBy: { code: 'asc' }
    });

    // Calculate period balances using COMPREHENSIVE approach (invoices + expenses + journal entries)
    const revenueBalances = await this.calculateComprehensivePeriodBalances(
      accounts.filter(a => a.code.startsWith('4')), // Revenue accounts
      period,
      actualTenantId,
      companyId
    );

    const cogsBalances = await this.calculateComprehensivePeriodBalances(
      accounts.filter(a => a.code.startsWith('5')), // COGS accounts
      period,
      actualTenantId,
      companyId
    );

    const expenseBalances = await this.calculateComprehensivePeriodBalances(
      accounts.filter(a => a.code.startsWith('6')), // Expense accounts
      period,
      actualTenantId,
      companyId
    );

    // Group by categories
    const revenue = this.groupRevenue(revenueBalances);
    const costOfGoodsSold = this.groupCOGS(cogsBalances);
    const operatingExpenses = this.groupOperatingExpenses(expenseBalances);

    // Calculate totals
    const totalRevenue = revenue.salesRevenue.reduce((sum, r) => sum + r.balance, 0) +
                        revenue.serviceRevenue.reduce((sum, r) => sum + r.balance, 0) +
                        revenue.otherRevenue.reduce((sum, r) => sum + r.balance, 0);

    const totalCOGS = costOfGoodsSold.directMaterials.reduce((sum, c) => sum + c.balance, 0) +
                     costOfGoodsSold.directLabor.reduce((sum, c) => sum + c.balance, 0) +
                     costOfGoodsSold.overhead.reduce((sum, c) => sum + c.balance, 0);

    const totalOperatingExpenses = operatingExpenses.sellingExpenses.reduce((sum, e) => sum + e.balance, 0) +
                                  operatingExpenses.administrativeExpenses.reduce((sum, e) => sum + e.balance, 0) +
                                  operatingExpenses.researchExpenses.reduce((sum, e) => sum + e.balance, 0);

    // Calculate profits
    const grossProfit = totalRevenue - totalCOGS;
    const operatingIncome = grossProfit - totalOperatingExpenses;
    const netIncome = operatingIncome; // Simplified - would include other income/expenses

    // Calculate margins
    const margins = {
      grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      operatingMargin: totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0,
      netMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
    };

    return {
      revenue,
      costOfGoodsSold,
      grossProfit,
      operatingExpenses,
      operatingIncome,
      otherIncome: { interestIncome: [], investmentIncome: [], otherIncome: [], totalOtherIncome: 0 },
      otherExpenses: { interestExpense: [], taxes: [], otherExpenses: [], totalOtherExpenses: 0 },
      netIncome,
      period,
      changes: { revenueChange: 0, expenseChange: 0, netIncomeChange: 0, grossProfitChange: 0 },
      margins,
      // Add totals object for UI compatibility
      totals: {
        totalRevenue,
        totalCOGS,
        totalOperatingExpenses,
        grossProfit,
        operatingIncome,
        netIncome,
        revenue: totalRevenue, // UI looks for this specifically
        expenses: totalCOGS + totalOperatingExpenses
      }
    };
  }

  async generateCashFlow(companyId: string, period: DateRange, tenantId?: string): Promise<CashFlowStatement> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for financial reporting');
    }
    const actualTenantId = tenantId;

    // Get cash and bank accounts
    const cashAccounts = await prisma.account.findMany({
      where: {
        tenantId: actualTenantId,
        companyId,
        code: { startsWith: '1' }, // Asset accounts
        name: { contains: 'Cash' }
      }
    });

    // Calculate cash flows from operating activities
    const operatingFlows = await this.calculateOperatingCashFlows(companyId, period, actualTenantId);

    // Calculate cash flows from investing activities
    const investingFlows = await this.calculateInvestingCashFlows(companyId, period, actualTenantId);

    // Calculate cash flows from financing activities
    const financingFlows = await this.calculateFinancingCashFlows(companyId, period, actualTenantId);

    // Calculate net cash flow
    const netCashFlow = operatingFlows.netCashFlow + investingFlows.netCashFlow + financingFlows.netCashFlow;

    // Get beginning and ending cash balances
    const beginningCash = await this.getCashBalance(cashAccounts, period.startDate, actualTenantId, companyId);
    const endingCash = await this.getCashBalance(cashAccounts, period.endDate, actualTenantId, companyId);

    return {
      operatingActivities: operatingFlows,
      investingActivities: investingFlows,
      financingActivities: financingFlows,
      netCashFlow,
      beginningCash,
      endingCash,
      period,
      changes: {
        operatingChange: 0,
        investingChange: 0,
        financingChange: 0,
        netCashChange: netCashFlow
      },
      // Add totals object for UI compatibility
      totals: {
        netCashFlow,
        operatingCashFlow: operatingFlows.netCashFlow,
        investingCashFlow: investingFlows.netCashFlow,
        financingCashFlow: financingFlows.netCashFlow,
        beginningCash,
        endingCash,
        net: netCashFlow // UI looks for this specifically
      }
    };
  }

  async generateCustomReport(specification: ReportSpec, tenantId?: string): Promise<CustomReport> {
    const { type, companyId, items, filters, grouping } = specification;
    if (!tenantId) {
      throw new Error('Tenant ID is required for financial reporting');
    }
    const actualTenantId = tenantId;

    // Get accounts based on specification
    const accounts = await prisma.account.findMany({
      where: {
        tenantId: actualTenantId,
        companyId,
        ...(filters?.accountTypes && { accountType: { in: filters.accountTypes } })
      }
    });
    // Process each report item
    const processedItems = await Promise.all(
      items.map(async (item) => {
        switch (item.type) {
          case 'account':
            return await this.processAccountItem(item, accounts, filters, actualTenantId, companyId);
          case 'calculation':
            return await this.processCalculationItem(item, accounts, filters, actualTenantId, companyId);
          case 'text':
            return { ...item, value: item.name };
          case 'chart':
            return await this.processChartItem(item, accounts, filters, actualTenantId, companyId);
          default:
            return item;
        }
      })
    );

    // Apply grouping if specified
    const groupedData = grouping ? this.applyGrouping(processedItems, grouping) : processedItems;

    // Calculate summary
    const summary = this.calculateReportSummary(groupedData);

    return {
      id: `report-${Date.now()}`,
      name: `Custom ${type} Report`,
      type,
      data: groupedData,
      summary,
      metadata: {
        generatedAt: new Date(),
        period: filters?.dateRange || { startDate: new Date(), endDate: new Date() },
        filters: filters || {},
        grouping: grouping || { byAccountType: false, byDepartment: false, byLocation: false, byPeriod: false },
        currency: 'USD'
      }
    };
  }

  async exportReport(report: any, format: 'pdf' | 'excel' | 'csv'): Promise<Buffer> {
    switch (format) {
      case 'pdf':
        return this.generatePDFReport(report);
      case 'excel':
        return this.generateExcelReport(report);
      case 'csv':
        return this.generateCSVReport(report);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Helper methods
  private async calculateAccountBalances(accounts: any[], date: Date, tenantId: string, companyId: string): Promise<AccountBalance[]> {
    const balances: AccountBalance[] = [];

    for (const account of accounts) {
      // Calculate balance from journal lines up to the specified date
      const journalLines = await prisma.journalLine.findMany({
        where: {
          tenantId,
          accountId: account.id,
          entry: {
            date: { lte: date },
            status: 'POSTED' // Only include posted entries for accurate financial reporting
          }
        },
        include: {
          entry: true
        }
      });

      // Calculate balance: debit - credit (for asset accounts) or credit - debit (for liability/equity accounts)
      const debitTotal = journalLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const creditTotal = journalLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      
      // Determine if this is a debit or credit account based on account type
      const isDebitAccount = account.type?.code === 'ASSET' || account.type?.code === 'EXPENSE';
      const balance = isDebitAccount ? debitTotal - creditTotal : creditTotal - debitTotal;

      balances.push({
        accountId: account.id,
        accountName: account.name,
        accountNumber: account.code,
        balance
      });
    }

    return balances;
  }

  private async calculatePeriodBalances(accounts: any[], period: DateRange, tenantId: string, companyId: string): Promise<AccountBalance[]> {
    const balances: AccountBalance[] = [];

    for (const account of accounts) {
      const transactions = await prisma.transaction.findMany({
        where: {
          tenantId,
          companyId,
          transactionDate: { gte: period.startDate, lte: period.endDate }
        }
      });

      const balance = transactions.reduce((sum, t) => {
        return sum + Number(t.amount || 0);
      }, 0);

      balances.push({
        accountId: account.id,
        accountName: account.name,
        accountNumber: account.code,
        balance
      });
    }

    return balances;
  }

  // COMPREHENSIVE calculation method that includes invoices, expenses, and journal entries
  private async calculateComprehensivePeriodBalances(accounts: any[], period: DateRange, tenantId: string, companyId: string): Promise<AccountBalance[]> {
    const balances: AccountBalance[] = [];

    for (const account of accounts) {
      let balance = 0;
      
      // STEP 1: Get balance from journal entries (primary source)
      const journalLines = await prisma.journalLine.findMany({
        where: {
          tenantId,
          accountId: account.id,
          entry: {
            date: { gte: period.startDate, lte: period.endDate },
            status: { in: ['POSTED', 'posted', 'Posted', 'APPROVED', 'approved', 'Approved'] }
          }
        },
        include: {
          entry: true
        }
      });

      // Calculate balance from journal entries
      const debitTotal = journalLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const creditTotal = journalLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      
      // Revenue accounts (4xxx): credits increase balance
      if (account.code.startsWith('4')) {
        balance = creditTotal - debitTotal;
      }
      // Expense accounts (5xxx, 6xxx): debits increase balance  
      else if (account.code.startsWith('5') || account.code.startsWith('6')) {
        balance = debitTotal - creditTotal;
      }
      // Default: follow normal debit/credit rules
      else {
        const isDebitAccount = account.type?.code === 'ASSET' || account.type?.code === 'EXPENSE';
        balance = isDebitAccount ? debitTotal - creditTotal : creditTotal - debitTotal;
      }

      // STEP 2: Add invoice revenue for revenue accounts (4xxx)
      if (account.code.startsWith('4')) {
        try {
          const invoices = await prisma.invoice.findMany({
            where: {
              tenantId,
              companyId,
              issueDate: { gte: period.startDate, lte: period.endDate }
            },
            select: { totalAmount: true }
          });
          
          const invoiceRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
          balance += invoiceRevenue;
        } catch (e) {
          // Ignore invoice errors, use journal data only
        }
      }

      // STEP 3: Add direct expenses for expense accounts (5xxx, 6xxx)
      if (account.code.startsWith('5') || account.code.startsWith('6')) {
        try {
          const expenses = await prisma.expense.findMany({
            where: {
              tenantId,
              companyId,
              expenseDate: { gte: period.startDate, lte: period.endDate }
            },
            select: { amount: true }
          });
          
          const directExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
          balance += directExpenses;
        } catch (e) {
          // Ignore expense errors, use journal data only
        }
      }

      balances.push({
        accountId: account.id,
        accountName: account.name,
        accountNumber: account.code,
        balance
      });
    }

    return balances;
  }

  private groupAssets(balances: AccountBalance[]): AssetSection {
    const currentAssets = balances.filter(b => b.accountNumber.startsWith('11') || b.accountNumber.startsWith('12'));
    const fixedAssets = balances.filter(b => 
      b.accountNumber.startsWith('13') || 
      b.accountNumber.startsWith('14') ||
      b.accountNumber.startsWith('FA-') // Include our fixed asset accounts
    );
    const otherAssets = balances.filter(b => b.accountNumber.startsWith('15') || b.accountNumber.startsWith('19'));

    return {
      currentAssets,
      fixedAssets,
      otherAssets,
      totalCurrentAssets: currentAssets.reduce((sum, a) => sum + a.balance, 0),
      totalFixedAssets: fixedAssets.reduce((sum, a) => sum + a.balance, 0),
      totalOtherAssets: otherAssets.reduce((sum, a) => sum + a.balance, 0)
    };
  }

  private groupLiabilities(balances: AccountBalance[]): LiabilitySection {
    const currentLiabilities = balances.filter(b => b.accountNumber.startsWith('21'));
    const longTermLiabilities = balances.filter(b => b.accountNumber.startsWith('22'));

    return {
      currentLiabilities,
      longTermLiabilities,
      totalCurrentLiabilities: currentLiabilities.reduce((sum, l) => sum + l.balance, 0),
      totalLongTermLiabilities: longTermLiabilities.reduce((sum, l) => sum + l.balance, 0)
    };
  }

  private groupEquity(balances: AccountBalance[]): EquitySection {
    const contributedCapital = balances.filter(b => 
      b.accountNumber.startsWith('30') || b.accountNumber.startsWith('31')
    );
    const retainedEarnings = balances.filter(b => 
      b.accountNumber.startsWith('32') || b.accountNumber.startsWith('39')
    );
    const otherEquity = balances.filter(b => 
      b.accountNumber.startsWith('33') || b.accountNumber.startsWith('34') ||
      b.accountNumber.startsWith('35') || b.accountNumber.startsWith('36') ||
      b.accountNumber.startsWith('37') || b.accountNumber.startsWith('38')
    );

    return {
      contributedCapital,
      retainedEarnings,
      otherEquity,
      totalContributedCapital: contributedCapital.reduce((sum, e) => sum + e.balance, 0),
      totalRetainedEarnings: retainedEarnings.reduce((sum, e) => sum + e.balance, 0),
      totalOtherEquity: otherEquity.reduce((sum, e) => sum + e.balance, 0)
    };
  }

  private groupRevenue(balances: AccountBalance[]): RevenueSection {
    const salesRevenue = balances.filter(b => b.accountNumber.startsWith('41'));
    const serviceRevenue = balances.filter(b => b.accountNumber.startsWith('42'));
    const otherRevenue = balances.filter(b => b.accountNumber.startsWith('49'));

    return {
      salesRevenue,
      serviceRevenue,
      otherRevenue,
      totalRevenue: balances.reduce((sum, r) => sum + r.balance, 0)
    };
  }

  private groupCOGS(balances: AccountBalance[]): COGSSection {
    const directMaterials = balances.filter(b => b.accountNumber.startsWith('51'));
    const directLabor = balances.filter(b => b.accountNumber.startsWith('52'));
    const overhead = balances.filter(b => b.accountNumber.startsWith('53'));

    return {
      directMaterials,
      directLabor,
      overhead,
      totalCOGS: balances.reduce((sum, c) => sum + c.balance, 0)
    };
  }

  private groupOperatingExpenses(balances: AccountBalance[]): ExpenseSection {
    const sellingExpenses = balances.filter(b => b.accountNumber.startsWith('61'));
    const administrativeExpenses = balances.filter(b => b.accountNumber.startsWith('62'));
    const researchExpenses = balances.filter(b => b.accountNumber.startsWith('63'));

    return {
      sellingExpenses,
      administrativeExpenses,
      researchExpenses,
      totalOperatingExpenses: balances.reduce((sum, e) => sum + e.balance, 0)
    };
  }

  private calculateBalanceSheetChanges(current: AccountBalance[], previous: AccountBalance[]): BalanceSheetChanges {
    const currentAssets = current.filter(b => b.accountNumber.startsWith('1')).reduce((sum, a) => sum + a.balance, 0);
    const previousAssets = previous.filter(b => b.accountNumber.startsWith('1')).reduce((sum, a) => sum + a.balance, 0);
    const currentLiabilities = current.filter(b => b.accountNumber.startsWith('2')).reduce((sum, l) => sum + l.balance, 0);
    const previousLiabilities = previous.filter(b => b.accountNumber.startsWith('2')).reduce((sum, l) => sum + l.balance, 0);
    const currentEquity = current.filter(b => b.accountNumber.startsWith('3')).reduce((sum, e) => sum + e.balance, 0);
    const previousEquity = previous.filter(b => b.accountNumber.startsWith('3')).reduce((sum, e) => sum + e.balance, 0);

    return {
      assetsChange: currentAssets - previousAssets,
      liabilitiesChange: currentLiabilities - previousLiabilities,
      equityChange: currentEquity - previousEquity,
      workingCapitalChange: (currentAssets - currentLiabilities) - (previousAssets - previousLiabilities)
    };
  }

  private calculateFinancialRatios(assets: AssetSection, liabilities: LiabilitySection, equity: EquitySection): FinancialRatios {
    const currentAssets = assets.totalCurrentAssets;
    const currentLiabilities = liabilities.totalCurrentLiabilities;
    const totalAssets = assets.totalCurrentAssets + assets.totalFixedAssets + assets.totalOtherAssets;
    const totalLiabilities = liabilities.totalCurrentLiabilities + liabilities.totalLongTermLiabilities;
    const totalEquity = equity.totalContributedCapital + equity.totalRetainedEarnings + equity.totalOtherEquity;

    return {
      currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
      quickRatio: currentLiabilities > 0 ? (currentAssets - assets.fixedAssets.reduce((sum, a) => sum + a.balance, 0)) / currentLiabilities : 0,
      debtToEquityRatio: totalEquity > 0 ? totalLiabilities / totalEquity : 0,
      returnOnAssets: totalAssets > 0 ? 0 : 0, // Would need net income
      returnOnEquity: totalEquity > 0 ? 0 : 0, // Would need net income
      assetTurnover: totalAssets > 0 ? 0 : 0, // Would need revenue
      equityMultiplier: totalEquity > 0 ? totalAssets / totalEquity : 0
    };
  }

  private async calculateOperatingCashFlows(companyId: string, period: DateRange, tenantId: string): Promise<CashFlowSection> {
    // Get cash account
    const cashAccount = await prisma.account.findFirst({
      where: {
        tenantId,
        companyId,
        code: '1000' // Cash account
      }
    });

    if (!cashAccount) {
      return {
        inflows: [{ description: 'Cash from operations', amount: 0, category: 'operating' }],
        outflows: [{ description: 'Cash used in operations', amount: 0, category: 'operating' }],
        netCashFlow: 0
      };
    }

    // Get journal lines for cash account in the period
    const cashFlows = await prisma.journalLine.findMany({
      where: {
        tenantId,
        accountId: cashAccount.id,
        entry: {
          date: {
            gte: period.startDate,
            lte: period.endDate
          },
          status: 'POSTED' // Only include posted entries for accurate financial reporting
        }
      },
      include: {
        entry: true
      }
    });

    // Categorize cash flows
    let operatingInflows = 0;
    let operatingOutflows = 0;

    for (const flow of cashFlows) {
      // Credit to cash = inflow, Debit to cash = outflow
      const amount = Number(flow.credit || 0) - Number(flow.debit || 0);
      
      // Categorize based on the other side of the journal entry
      const otherLines = await prisma.journalLine.findMany({
        where: {
          entryId: flow.entryId,
          accountId: { not: cashAccount.id }
        },
        include: {
          account: {
            include: {
              type: true
            }
          }
        }
      });

      for (const otherLine of otherLines) {
        const accountType = otherLine.account.type?.code;
        
        if (accountType === 'REVENUE' && amount > 0) {
          operatingInflows += amount;
        } else if (accountType === 'EXPENSE' && amount < 0) {
          operatingOutflows += Math.abs(amount);
        }
      }
    }

    const netCashFlow = operatingInflows - operatingOutflows;

    return {
      inflows: operatingInflows > 0 ? [{ description: 'Cash from operations', amount: operatingInflows, category: 'operating' }] : [],
      outflows: operatingOutflows > 0 ? [{ description: 'Cash used in operations', amount: operatingOutflows, category: 'operating' }] : [],
      netCashFlow
    };
  }

  private async calculateInvestingCashFlows(companyId: string, period: DateRange, tenantId: string): Promise<CashFlowSection> {
    // Get cash account
    const cashAccount = await prisma.account.findFirst({
      where: {
        tenantId,
        companyId,
        code: '1000' // Cash account
      }
    });

    if (!cashAccount) {
      return {
        inflows: [{ description: 'Cash from investments', amount: 0, category: 'investing' }],
        outflows: [{ description: 'Cash used in investments', amount: 0, category: 'investing' }],
        netCashFlow: 0
      };
    }

    // Get journal lines for cash account in the period
    const cashFlows = await prisma.journalLine.findMany({
      where: {
        tenantId,
        accountId: cashAccount.id,
        entry: {
          date: {
            gte: period.startDate,
            lte: period.endDate
          },
          status: 'POSTED' // Only include posted entries for accurate financial reporting
        }
      },
      include: {
        entry: true
      }
    });

    // Categorize cash flows for investing activities (equipment, fixed assets)
    let investingInflows = 0;
    let investingOutflows = 0;

    for (const flow of cashFlows) {
      const amount = Number(flow.credit || 0) - Number(flow.debit || 0);
      
      // Check if this is related to equipment or fixed assets
      const otherLines = await prisma.journalLine.findMany({
        where: {
          entryId: flow.entryId,
          accountId: { not: cashAccount.id }
        },
        include: {
          account: {
            include: {
              type: true
            }
          }
        }
      });

      for (const otherLine of otherLines) {
        const accountCode = otherLine.account.code;
        
        // Equipment purchases/sales (codes 1500-1599)
        if (accountCode.startsWith('15')) {
          if (amount < 0) { // Cash outflow for equipment purchase
            investingOutflows += Math.abs(amount);
          } else { // Cash inflow from equipment sale
            investingInflows += amount;
          }
        }
      }
    }

    const netCashFlow = investingInflows - investingOutflows;

    return {
      inflows: investingInflows > 0 ? [{ description: 'Cash from investments', amount: investingInflows, category: 'investing' }] : [],
      outflows: investingOutflows > 0 ? [{ description: 'Cash used in investments', amount: investingOutflows, category: 'investing' }] : [],
      netCashFlow
    };
  }

  private async calculateFinancingCashFlows(companyId: string, period: DateRange, tenantId: string): Promise<CashFlowSection> {
    // Get cash account
    const cashAccount = await prisma.account.findFirst({
      where: {
        tenantId,
        companyId,
        code: '1000' // Cash account
      }
    });

    if (!cashAccount) {
      return {
        inflows: [{ description: 'Cash from financing', amount: 0, category: 'financing' }],
        outflows: [{ description: 'Cash used in financing', amount: 0, category: 'financing' }],
        netCashFlow: 0
      };
    }

    // Get journal lines for cash account in the period
    const cashFlows = await prisma.journalLine.findMany({
      where: {
        tenantId,
        accountId: cashAccount.id,
        entry: {
          date: {
            gte: period.startDate,
            lte: period.endDate
          },
          status: 'POSTED' // Only include posted entries for accurate financial reporting
        }
      },
      include: {
        entry: true
      }
    });

    // Categorize cash flows for financing activities (equity, debt)
    let financingInflows = 0;
    let financingOutflows = 0;

    for (const flow of cashFlows) {
      const amount = Number(flow.credit || 0) - Number(flow.debit || 0);
      
      // Check if this is related to financing
      const otherLines = await prisma.journalLine.findMany({
        where: {
          entryId: flow.entryId,
          accountId: { not: cashAccount.id }
        },
        include: {
          account: {
            include: {
              type: true
            }
          }
        }
      });

      for (const otherLine of otherLines) {
        const accountCode = otherLine.account.code;
        const accountType = otherLine.account.type?.code;
        
        // Equity transactions (codes 3000-3999) or debt transactions (codes 2200-2399)
        if ((accountCode.startsWith('30') && accountType === 'EQUITY') || 
            (accountCode.startsWith('22') || accountCode.startsWith('23'))) {
          if (amount > 0) { // Cash inflow from financing
            financingInflows += amount;
          } else { // Cash outflow for financing (loan payments, dividends)
            financingOutflows += Math.abs(amount);
          }
        }
      }
    }

    const netCashFlow = financingInflows - financingOutflows;

    return {
      inflows: financingInflows > 0 ? [{ description: 'Cash from financing', amount: financingInflows, category: 'financing' }] : [],
      outflows: financingOutflows > 0 ? [{ description: 'Cash used in financing', amount: financingOutflows, category: 'financing' }] : [],
      netCashFlow
    };
  }

  private async getCashBalance(cashAccounts: any[], date: Date, tenantId: string, companyId: string): Promise<number> {
    let totalCash = 0;

    for (const account of cashAccounts) {
      // Calculate balance from journal lines up to the specified date
      const journalLines = await prisma.journalLine.findMany({
        where: {
          tenantId,
          accountId: account.id,
        entry: {
          date: { lte: date },
          status: 'POSTED' // Only include posted entries for accurate financial reporting
        }
        }
      });

      // Calculate balance: debit - credit (cash is an asset account)
      const debitTotal = journalLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const creditTotal = journalLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      const balance = debitTotal - creditTotal;

      totalCash += balance;
    }

    return totalCash;
  }

  private async processAccountItem(item: ReportItem, accounts: any[], filters: ReportFilters | undefined, tenantId: string, companyId: string): Promise<any> {
    const accountIds = item.accountIds ? item.accountIds : [];
    const relevantAccounts = accounts.filter(a => accountIds.includes(a.id));
    
    if (filters?.dateRange) {
      const balances = await this.calculatePeriodBalances(relevantAccounts, filters.dateRange, tenantId, companyId);
      return { ...item, value: balances.reduce((sum, b) => sum + b.balance, 0), details: balances };
    } else {
      return { ...item, value: 0, details: [] };
    }
  }

  private async processCalculationItem(item: ReportItem, accounts: any[], filters: ReportFilters | undefined, tenantId: string, companyId: string): Promise<any> {
    // Simplified calculation processing - would implement formula parsing
    return { ...item, value: 0, details: [] };
  }

  private async processChartItem(item: ReportItem, accounts: any[], filters: ReportFilters | undefined, tenantId: string, companyId: string): Promise<any> {
    // Simplified chart processing - would generate chart data
    return { ...item, value: 'chart_data', details: [] };
  }

  private applyGrouping(items: any[], grouping: ReportGrouping): any[] {
    // Simplified grouping - would implement actual grouping logic
    return items;
  }

  private calculateReportSummary(data: any[]): ReportSummary {
    return {
      totals: {},
      counts: {},
      averages: {},
      changes: {}
    };
  }

  private async generatePDFReport(report: any, companyId?: string): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add company logo if companyId is provided
        if (companyId) {
          const company = await getCompanyForPDF('tenant_demo', companyId); // Using default tenant for now
          if (company?.logoUrl) {
            await addCompanyLogoToPDF(doc, company, 50, 50, 60, 60);
          }
        }

        // Adjust Y position based on whether logo was added
        const titleY = companyId ? 120 : 50;

        // Add title
        doc.fontSize(20).text('Financial Report', 50, titleY);
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, 50, titleY + 30);

        // Add report content based on type
        if (report.totalAssets !== undefined) {
          // Balance Sheet - Detailed version
          doc.fontSize(16).text('Balance Sheet', 50, titleY + 60);
          doc.fontSize(10).text(`As of: ${report.date ? new Date(report.date).toLocaleDateString() : new Date().toLocaleDateString()}`, 50, titleY + 80);
          doc.fontSize(12);
          
          let yPosition = titleY + 110;
          
          // Assets Section
          if (report.assets) {
            doc.fontSize(14).text('ASSETS', 50, yPosition);
            yPosition += 20;
            
            // Current Assets
            if (report.assets.currentAssets && report.assets.currentAssets.length > 0) {
              doc.fontSize(12).text('Current Assets', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.assets.currentAssets.forEach((asset: any) => {
                doc.text(`${asset.accountNumber} - ${asset.accountName}`, 90, yPosition);
                doc.text(`$${asset.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              
              doc.fontSize(11).text('Total Current Assets', 90, yPosition);
              doc.fontSize(11).text(`$${report.assets.totalCurrentAssets?.toLocaleString() || '0'}`, 450, yPosition);
              yPosition += 20;
            }
            
            // Fixed Assets
            if (report.assets.fixedAssets && report.assets.fixedAssets.length > 0) {
              doc.fontSize(12).text('Fixed Assets', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.assets.fixedAssets.forEach((asset: any) => {
                doc.text(`${asset.accountNumber} - ${asset.accountName}`, 90, yPosition);
                doc.text(`$${asset.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              
              doc.fontSize(11).text('Total Fixed Assets', 90, yPosition);
              doc.fontSize(11).text(`$${report.assets.totalFixedAssets?.toLocaleString() || '0'}`, 450, yPosition);
              yPosition += 20;
            }
            
            // Other Assets
            if (report.assets.otherAssets && report.assets.otherAssets.length > 0) {
              doc.fontSize(12).text('Other Assets', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.assets.otherAssets.forEach((asset: any) => {
                doc.text(`${asset.accountNumber} - ${asset.accountName}`, 90, yPosition);
                doc.text(`$${asset.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              
              doc.fontSize(11).text('Total Other Assets', 90, yPosition);
              doc.fontSize(11).text(`$${report.assets.totalOtherAssets?.toLocaleString() || '0'}`, 450, yPosition);
              yPosition += 20;
            }
            
            // Total Assets
            doc.fontSize(14).text('TOTAL ASSETS', 70, yPosition);
            doc.fontSize(14).text(`$${report.totalAssets?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 30;
          }

          // Liabilities Section
          if (report.liabilities) {
            doc.fontSize(14).text('LIABILITIES', 50, yPosition);
            yPosition += 20;
            
            // Current Liabilities
            if (report.liabilities.currentLiabilities && report.liabilities.currentLiabilities.length > 0) {
              doc.fontSize(12).text('Current Liabilities', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.liabilities.currentLiabilities.forEach((liability: any) => {
                doc.text(`${liability.accountNumber} - ${liability.accountName}`, 90, yPosition);
                doc.text(`$${liability.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              
              doc.fontSize(11).text('Total Current Liabilities', 90, yPosition);
              doc.fontSize(11).text(`$${report.liabilities.totalCurrentLiabilities?.toLocaleString() || '0'}`, 450, yPosition);
              yPosition += 20;
            }
            
            // Long-term Liabilities
            if (report.liabilities.longTermLiabilities && report.liabilities.longTermLiabilities.length > 0) {
              doc.fontSize(12).text('Long-term Liabilities', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.liabilities.longTermLiabilities.forEach((liability: any) => {
                doc.text(`${liability.accountNumber} - ${liability.accountName}`, 90, yPosition);
                doc.text(`$${liability.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              
              doc.fontSize(11).text('Total Long-term Liabilities', 90, yPosition);
              doc.fontSize(11).text(`$${report.liabilities.totalLongTermLiabilities?.toLocaleString() || '0'}`, 450, yPosition);
              yPosition += 20;
            }
            
            // Total Liabilities
            doc.fontSize(14).text('TOTAL LIABILITIES', 70, yPosition);
            doc.fontSize(14).text(`$${report.totalLiabilities?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 30;
          }

          // Equity Section
          if (report.equity) {
            doc.fontSize(14).text('EQUITY', 50, yPosition);
            yPosition += 20;
            
            // Contributed Capital
            if (report.equity.contributedCapital && report.equity.contributedCapital.length > 0) {
              doc.fontSize(12).text('Contributed Capital', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.equity.contributedCapital.forEach((equity: any) => {
                doc.text(`${equity.accountNumber} - ${equity.accountName}`, 90, yPosition);
                doc.text(`$${equity.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              
              doc.fontSize(11).text('Total Contributed Capital', 90, yPosition);
              doc.fontSize(11).text(`$${report.equity.totalContributedCapital?.toLocaleString() || '0'}`, 450, yPosition);
              yPosition += 20;
            }
            
            // Retained Earnings
            if (report.equity.retainedEarnings && report.equity.retainedEarnings.length > 0) {
              doc.fontSize(12).text('Retained Earnings', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.equity.retainedEarnings.forEach((equity: any) => {
                doc.text(`${equity.accountNumber} - ${equity.accountName}`, 90, yPosition);
                doc.text(`$${equity.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              
              doc.fontSize(11).text('Total Retained Earnings', 90, yPosition);
              doc.fontSize(11).text(`$${report.equity.totalRetainedEarnings?.toLocaleString() || '0'}`, 450, yPosition);
              yPosition += 20;
            }
            
            // Other Equity
            if (report.equity.otherEquity && report.equity.otherEquity.length > 0) {
              doc.fontSize(12).text('Other Equity', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.equity.otherEquity.forEach((equity: any) => {
                doc.text(`${equity.accountNumber} - ${equity.accountName}`, 90, yPosition);
                doc.text(`$${equity.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              
              doc.fontSize(11).text('Total Other Equity', 90, yPosition);
              doc.fontSize(11).text(`$${report.equity.totalOtherEquity?.toLocaleString() || '0'}`, 450, yPosition);
              yPosition += 20;
            }
            
            // Total Equity
            doc.fontSize(14).text('TOTAL EQUITY', 70, yPosition);
            doc.fontSize(14).text(`$${report.totalEquity?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 30;
          }
          
          // Financial Ratios (if available)
          if (report.ratios) {
            doc.fontSize(14).text('FINANCIAL RATIOS', 50, yPosition);
            yPosition += 20;
            doc.fontSize(10);
            
            Object.entries(report.ratios).forEach(([key, value]: [string, any]) => {
              const ratioName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              doc.text(`${ratioName}:`, 70, yPosition);
              doc.text(`${value?.toFixed(2) || '0'}`, 450, yPosition);
              yPosition += 12;
            });
            yPosition += 20;
          }
          
          // Changes Summary (if available)
          if (report.changes) {
            doc.fontSize(14).text('CHANGES SUMMARY', 50, yPosition);
            yPosition += 20;
            doc.fontSize(10);
            
            Object.entries(report.changes).forEach(([key, value]: [string, any]) => {
              const changeName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              doc.text(`${changeName}:`, 70, yPosition);
              doc.text(`$${value?.toLocaleString() || '0'}`, 450, yPosition);
              yPosition += 12;
            });
          }
        } else if (report.totalRevenue !== undefined) {
          // Profit & Loss - Detailed version
          doc.fontSize(16).text('Profit & Loss Statement', 50, 120);
          doc.fontSize(10).text(`Period: ${report.period?.startDate ? new Date(report.period.startDate).toLocaleDateString() : 'N/A'} to ${report.period?.endDate ? new Date(report.period.endDate).toLocaleDateString() : 'N/A'}`, 50, 140);
          doc.fontSize(12);
          
          let yPosition = 170;
          
          // Revenue Section
          if (report.revenue) {
            doc.fontSize(14).text('REVENUE', 50, yPosition);
            yPosition += 20;
            
            // Sales Revenue
            if (report.revenue.salesRevenue && report.revenue.salesRevenue.length > 0) {
              doc.fontSize(12).text('Sales Revenue', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.revenue.salesRevenue.forEach((item: any) => {
                doc.text(`${item.accountNumber} - ${item.accountName}`, 90, yPosition);
                doc.text(`$${item.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              yPosition += 5;
            }
            
            // Service Revenue
            if (report.revenue.serviceRevenue && report.revenue.serviceRevenue.length > 0) {
              doc.fontSize(12).text('Service Revenue', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.revenue.serviceRevenue.forEach((item: any) => {
                doc.text(`${item.accountNumber} - ${item.accountName}`, 90, yPosition);
                doc.text(`$${item.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              yPosition += 5;
            }
            
            // Other Revenue
            if (report.revenue.otherRevenue && report.revenue.otherRevenue.length > 0) {
              doc.fontSize(12).text('Other Revenue', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.revenue.otherRevenue.forEach((item: any) => {
                doc.text(`${item.accountNumber} - ${item.accountName}`, 90, yPosition);
                doc.text(`$${item.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              yPosition += 5;
            }
            
            // Total Revenue
            doc.fontSize(14).text('TOTAL REVENUE', 70, yPosition);
            doc.fontSize(14).text(`$${report.totalRevenue?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 30;
          }
          
          // Cost of Goods Sold
          if (report.costOfGoodsSold) {
            doc.fontSize(14).text('COST OF GOODS SOLD', 50, yPosition);
            yPosition += 20;
            
            // Direct Materials
            if (report.costOfGoodsSold.directMaterials && report.costOfGoodsSold.directMaterials.length > 0) {
              doc.fontSize(12).text('Direct Materials', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.costOfGoodsSold.directMaterials.forEach((item: any) => {
                doc.text(`${item.accountNumber} - ${item.accountName}`, 90, yPosition);
                doc.text(`$${item.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              yPosition += 5;
            }
            
            // Direct Labor
            if (report.costOfGoodsSold.directLabor && report.costOfGoodsSold.directLabor.length > 0) {
              doc.fontSize(12).text('Direct Labor', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.costOfGoodsSold.directLabor.forEach((item: any) => {
                doc.text(`${item.accountNumber} - ${item.accountName}`, 90, yPosition);
                doc.text(`$${item.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              yPosition += 5;
            }
            
            // Overhead
            if (report.costOfGoodsSold.overhead && report.costOfGoodsSold.overhead.length > 0) {
              doc.fontSize(12).text('Overhead', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.costOfGoodsSold.overhead.forEach((item: any) => {
                doc.text(`${item.accountNumber} - ${item.accountName}`, 90, yPosition);
                doc.text(`$${item.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              yPosition += 5;
            }
            
            // Total COGS
            doc.fontSize(14).text('TOTAL COST OF GOODS SOLD', 70, yPosition);
            doc.fontSize(14).text(`$${report.costOfGoodsSold.totalCOGS?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 20;
            
            // Gross Profit
            doc.fontSize(14).text('GROSS PROFIT', 70, yPosition);
            doc.fontSize(14).text(`$${report.grossProfit?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 30;
          }
          
          // Operating Expenses
          if (report.operatingExpenses) {
            doc.fontSize(14).text('OPERATING EXPENSES', 50, yPosition);
            yPosition += 20;
            
            // Selling Expenses
            if (report.operatingExpenses.sellingExpenses && report.operatingExpenses.sellingExpenses.length > 0) {
              doc.fontSize(12).text('Selling Expenses', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.operatingExpenses.sellingExpenses.forEach((item: any) => {
                doc.text(`${item.accountNumber} - ${item.accountName}`, 90, yPosition);
                doc.text(`$${item.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              yPosition += 5;
            }
            
            // Administrative Expenses
            if (report.operatingExpenses.administrativeExpenses && report.operatingExpenses.administrativeExpenses.length > 0) {
              doc.fontSize(12).text('Administrative Expenses', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.operatingExpenses.administrativeExpenses.forEach((item: any) => {
                doc.text(`${item.accountNumber} - ${item.accountName}`, 90, yPosition);
                doc.text(`$${item.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              yPosition += 5;
            }
            
            // Research Expenses
            if (report.operatingExpenses.researchExpenses && report.operatingExpenses.researchExpenses.length > 0) {
              doc.fontSize(12).text('Research Expenses', 70, yPosition);
              yPosition += 15;
              doc.fontSize(10);
              
              report.operatingExpenses.researchExpenses.forEach((item: any) => {
                doc.text(`${item.accountNumber} - ${item.accountName}`, 90, yPosition);
                doc.text(`$${item.balance?.toLocaleString() || '0'}`, 450, yPosition);
                yPosition += 12;
              });
              yPosition += 5;
            }
            
            // Total Operating Expenses
            doc.fontSize(14).text('TOTAL OPERATING EXPENSES', 70, yPosition);
            doc.fontSize(14).text(`$${report.operatingExpenses.totalOperatingExpenses?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 20;
            
            // Operating Income
            doc.fontSize(14).text('OPERATING INCOME', 70, yPosition);
            doc.fontSize(14).text(`$${report.operatingIncome?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 30;
          }
          
          // Other Income
          if (report.otherIncome && report.otherIncome.totalOtherIncome > 0) {
            doc.fontSize(14).text('OTHER INCOME', 50, yPosition);
            yPosition += 20;
            doc.fontSize(12).text('Total Other Income', 70, yPosition);
            doc.fontSize(12).text(`$${report.otherIncome.totalOtherIncome?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 30;
          }
          
          // Other Expenses
          if (report.otherExpenses && report.otherExpenses.totalOtherExpenses > 0) {
            doc.fontSize(14).text('OTHER EXPENSES', 50, yPosition);
            yPosition += 20;
            doc.fontSize(12).text('Total Other Expenses', 70, yPosition);
            doc.fontSize(12).text(`$${report.otherExpenses.totalOtherExpenses?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 30;
          }
          
          // Net Income
          doc.fontSize(16).text('NET INCOME', 70, yPosition);
          doc.fontSize(16).text(`$${report.netIncome?.toLocaleString() || '0'}`, 450, yPosition);
          yPosition += 30;
          
          // Margins (if available)
          if (report.margins) {
            doc.fontSize(14).text('MARGINS', 50, yPosition);
            yPosition += 20;
            doc.fontSize(10);
            
            Object.entries(report.margins).forEach(([key, value]: [string, any]) => {
              const marginName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              doc.text(`${marginName}:`, 70, yPosition);
              doc.text(`${value?.toFixed(2) || '0'}%`, 450, yPosition);
              yPosition += 12;
            });
            yPosition += 20;
          }
          
          // Changes (if available)
          if (report.changes) {
            doc.fontSize(14).text('PERIOD CHANGES', 50, yPosition);
            yPosition += 20;
            doc.fontSize(10);
            
            Object.entries(report.changes).forEach(([key, value]: [string, any]) => {
              const changeName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              doc.text(`${changeName}:`, 70, yPosition);
              doc.text(`${value?.toFixed(2) || '0'}%`, 450, yPosition);
              yPosition += 12;
            });
          }
        } else if (report.operatingActivities !== undefined) {
          // Cash Flow - Detailed version
          doc.fontSize(16).text('Cash Flow Statement', 50, 120);
          doc.fontSize(10).text(`Period: ${report.period?.startDate ? new Date(report.period.startDate).toLocaleDateString() : 'N/A'} to ${report.period?.endDate ? new Date(report.period.endDate).toLocaleDateString() : 'N/A'}`, 50, 140);
          doc.fontSize(12);
          
          let yPosition = 170;
          
          // Operating Activities
          if (report.operatingActivities) {
            doc.fontSize(14).text('OPERATING ACTIVITIES', 50, yPosition);
            yPosition += 20;
            doc.fontSize(12).text('Total Operating Activities', 70, yPosition);
            doc.fontSize(12).text(`$${report.operatingActivities.total?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 30;
          }
          
          // Investing Activities
          if (report.investingActivities) {
            doc.fontSize(14).text('INVESTING ACTIVITIES', 50, yPosition);
            yPosition += 20;
            doc.fontSize(12).text('Total Investing Activities', 70, yPosition);
            doc.fontSize(12).text(`$${report.investingActivities.total?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 30;
          }
          
          // Financing Activities
          if (report.financingActivities) {
            doc.fontSize(14).text('FINANCING ACTIVITIES', 50, yPosition);
            yPosition += 20;
            doc.fontSize(12).text('Total Financing Activities', 70, yPosition);
            doc.fontSize(12).text(`$${report.financingActivities.total?.toLocaleString() || '0'}`, 450, yPosition);
            yPosition += 30;
          }
          
          // Net Cash Flow
          doc.fontSize(16).text('NET CASH FLOW', 70, yPosition);
          doc.fontSize(16).text(`$${report.netCashFlow?.toLocaleString() || '0'}`, 450, yPosition);
        } else {
          // Generic report
          doc.fontSize(16).text('Financial Report', 50, 120);
          doc.fontSize(12).text(JSON.stringify(report, null, 2), 50, 150);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async generateExcelReport(report: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Financial Report');

    // Add title
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'Financial Report';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.getCell('A2').value = `Generated: ${new Date().toLocaleDateString()}`;
    worksheet.getCell('A2').font = { size: 10, italic: true };

    let currentRow = 4;

    // Add report content based on type
    if (report.totalAssets !== undefined) {
      // Balance Sheet - Detailed version
      worksheet.getCell(`A${currentRow}`).value = 'Balance Sheet';
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
      currentRow++;

      worksheet.getCell(`A${currentRow}`).value = `As of: ${report.date ? new Date(report.date).toLocaleDateString() : new Date().toLocaleDateString()}`;
      worksheet.getCell(`A${currentRow}`).font = { size: 10, italic: true };
      currentRow += 2;

      // Assets Section
      if (report.assets) {
        worksheet.getCell(`A${currentRow}`).value = 'ASSETS';
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;

        // Current Assets
        if (report.assets.currentAssets && report.assets.currentAssets.length > 0) {
          worksheet.getCell(`A${currentRow}`).value = 'Current Assets';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          currentRow++;

          report.assets.currentAssets.forEach((asset: any) => {
            worksheet.getCell(`A${currentRow}`).value = `${asset.accountNumber} - ${asset.accountName}`;
            worksheet.getCell(`B${currentRow}`).value = asset.balance || 0;
            currentRow++;
          });

          worksheet.getCell(`A${currentRow}`).value = 'Total Current Assets';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          worksheet.getCell(`B${currentRow}`).value = report.assets.totalCurrentAssets || 0;
          worksheet.getCell(`B${currentRow}`).font = { bold: true };
          currentRow += 2;
        }

        // Fixed Assets
        if (report.assets.fixedAssets && report.assets.fixedAssets.length > 0) {
          worksheet.getCell(`A${currentRow}`).value = 'Fixed Assets';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          currentRow++;

          report.assets.fixedAssets.forEach((asset: any) => {
            worksheet.getCell(`A${currentRow}`).value = `${asset.accountNumber} - ${asset.accountName}`;
            worksheet.getCell(`B${currentRow}`).value = asset.balance || 0;
            currentRow++;
          });

          worksheet.getCell(`A${currentRow}`).value = 'Total Fixed Assets';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          worksheet.getCell(`B${currentRow}`).value = report.assets.totalFixedAssets || 0;
          worksheet.getCell(`B${currentRow}`).font = { bold: true };
          currentRow += 2;
        }

        // Other Assets
        if (report.assets.otherAssets && report.assets.otherAssets.length > 0) {
          worksheet.getCell(`A${currentRow}`).value = 'Other Assets';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          currentRow++;

          report.assets.otherAssets.forEach((asset: any) => {
            worksheet.getCell(`A${currentRow}`).value = `${asset.accountNumber} - ${asset.accountName}`;
            worksheet.getCell(`B${currentRow}`).value = asset.balance || 0;
            currentRow++;
          });

          worksheet.getCell(`A${currentRow}`).value = 'Total Other Assets';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          worksheet.getCell(`B${currentRow}`).value = report.assets.totalOtherAssets || 0;
          worksheet.getCell(`B${currentRow}`).font = { bold: true };
          currentRow += 2;
        }

        // Total Assets
        worksheet.getCell(`A${currentRow}`).value = 'TOTAL ASSETS';
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        worksheet.getCell(`B${currentRow}`).value = report.totalAssets || 0;
        worksheet.getCell(`B${currentRow}`).font = { bold: true };
        currentRow += 3;
      }

      // Liabilities Section
      if (report.liabilities) {
        worksheet.getCell(`A${currentRow}`).value = 'LIABILITIES';
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;

        // Current Liabilities
        if (report.liabilities.currentLiabilities && report.liabilities.currentLiabilities.length > 0) {
          worksheet.getCell(`A${currentRow}`).value = 'Current Liabilities';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          currentRow++;

          report.liabilities.currentLiabilities.forEach((liability: any) => {
            worksheet.getCell(`A${currentRow}`).value = `${liability.accountNumber} - ${liability.accountName}`;
            worksheet.getCell(`B${currentRow}`).value = liability.balance || 0;
            currentRow++;
          });

          worksheet.getCell(`A${currentRow}`).value = 'Total Current Liabilities';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          worksheet.getCell(`B${currentRow}`).value = report.liabilities.totalCurrentLiabilities || 0;
          worksheet.getCell(`B${currentRow}`).font = { bold: true };
          currentRow += 2;
        }

        // Long-term Liabilities
        if (report.liabilities.longTermLiabilities && report.liabilities.longTermLiabilities.length > 0) {
          worksheet.getCell(`A${currentRow}`).value = 'Long-term Liabilities';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          currentRow++;

          report.liabilities.longTermLiabilities.forEach((liability: any) => {
            worksheet.getCell(`A${currentRow}`).value = `${liability.accountNumber} - ${liability.accountName}`;
            worksheet.getCell(`B${currentRow}`).value = liability.balance || 0;
            currentRow++;
          });

          worksheet.getCell(`A${currentRow}`).value = 'Total Long-term Liabilities';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          worksheet.getCell(`B${currentRow}`).value = report.liabilities.totalLongTermLiabilities || 0;
          worksheet.getCell(`B${currentRow}`).font = { bold: true };
          currentRow += 2;
        }

        // Total Liabilities
        worksheet.getCell(`A${currentRow}`).value = 'TOTAL LIABILITIES';
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        worksheet.getCell(`B${currentRow}`).value = report.totalLiabilities || 0;
        worksheet.getCell(`B${currentRow}`).font = { bold: true };
        currentRow += 3;
      }

      // Equity Section
      if (report.equity) {
        worksheet.getCell(`A${currentRow}`).value = 'EQUITY';
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;

        // Contributed Capital
        if (report.equity.contributedCapital && report.equity.contributedCapital.length > 0) {
          worksheet.getCell(`A${currentRow}`).value = 'Contributed Capital';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          currentRow++;

          report.equity.contributedCapital.forEach((equity: any) => {
            worksheet.getCell(`A${currentRow}`).value = `${equity.accountNumber} - ${equity.accountName}`;
            worksheet.getCell(`B${currentRow}`).value = equity.balance || 0;
            currentRow++;
          });

          worksheet.getCell(`A${currentRow}`).value = 'Total Contributed Capital';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          worksheet.getCell(`B${currentRow}`).value = report.equity.totalContributedCapital || 0;
          worksheet.getCell(`B${currentRow}`).font = { bold: true };
          currentRow += 2;
        }

        // Retained Earnings
        if (report.equity.retainedEarnings && report.equity.retainedEarnings.length > 0) {
          worksheet.getCell(`A${currentRow}`).value = 'Retained Earnings';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          currentRow++;

          report.equity.retainedEarnings.forEach((equity: any) => {
            worksheet.getCell(`A${currentRow}`).value = `${equity.accountNumber} - ${equity.accountName}`;
            worksheet.getCell(`B${currentRow}`).value = equity.balance || 0;
            currentRow++;
          });

          worksheet.getCell(`A${currentRow}`).value = 'Total Retained Earnings';
          worksheet.getCell(`A${currentRow}`).font = { bold: true };
          worksheet.getCell(`B${currentRow}`).value = report.equity.totalRetainedEarnings || 0;
          worksheet.getCell(`B${currentRow}`).font = { bold: true };
          currentRow += 2;
        }

        // Total Equity
        worksheet.getCell(`A${currentRow}`).value = 'TOTAL EQUITY';
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        worksheet.getCell(`B${currentRow}`).value = report.totalEquity || 0;
        worksheet.getCell(`B${currentRow}`).font = { bold: true };
        currentRow += 2;
      }

      // Financial Ratios (if available)
      if (report.ratios) {
        worksheet.getCell(`A${currentRow}`).value = 'FINANCIAL RATIOS';
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;

        Object.entries(report.ratios).forEach(([key, value]: [string, any]) => {
          const ratioName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          worksheet.getCell(`A${currentRow}`).value = ratioName;
          worksheet.getCell(`B${currentRow}`).value = value?.toFixed(2) || 0;
          currentRow++;
        });
        currentRow += 2;
      }

      // Changes Summary (if available)
      if (report.changes) {
        worksheet.getCell(`A${currentRow}`).value = 'CHANGES SUMMARY';
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;

        Object.entries(report.changes).forEach(([key, value]: [string, any]) => {
          const changeName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          worksheet.getCell(`A${currentRow}`).value = changeName;
          worksheet.getCell(`B${currentRow}`).value = value?.toLocaleString() || 0;
          currentRow++;
        });
      }
    } else if (report.totalRevenue !== undefined) {
      // Profit & Loss
      worksheet.getCell(`A${currentRow}`).value = 'Profit & Loss Statement';
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
      currentRow += 2;

      worksheet.getCell(`A${currentRow}`).value = 'Total Revenue';
      worksheet.getCell(`B${currentRow}`).value = report.totalRevenue || 0;
      currentRow++;

      worksheet.getCell(`A${currentRow}`).value = 'Gross Profit';
      worksheet.getCell(`B${currentRow}`).value = report.grossProfit || 0;
      currentRow++;

      worksheet.getCell(`A${currentRow}`).value = 'Operating Income';
      worksheet.getCell(`B${currentRow}`).value = report.operatingIncome || 0;
      currentRow++;

      worksheet.getCell(`A${currentRow}`).value = 'Net Income';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).value = report.netIncome || 0;
      worksheet.getCell(`B${currentRow}`).font = { bold: true };
    } else if (report.operatingActivities !== undefined) {
      // Cash Flow
      worksheet.getCell(`A${currentRow}`).value = 'Cash Flow Statement';
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
      currentRow += 2;

      worksheet.getCell(`A${currentRow}`).value = 'Operating Activities';
      worksheet.getCell(`B${currentRow}`).value = report.operatingActivities?.total || 0;
      currentRow++;

      worksheet.getCell(`A${currentRow}`).value = 'Investing Activities';
      worksheet.getCell(`B${currentRow}`).value = report.investingActivities?.total || 0;
      currentRow++;

      worksheet.getCell(`A${currentRow}`).value = 'Financing Activities';
      worksheet.getCell(`B${currentRow}`).value = report.financingActivities?.total || 0;
      currentRow++;

      worksheet.getCell(`A${currentRow}`).value = 'Net Cash Flow';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`B${currentRow}`).value = report.netCashFlow || 0;
      worksheet.getCell(`B${currentRow}`).font = { bold: true };
    } else {
      // Generic report
      worksheet.getCell(`A${currentRow}`).value = 'Financial Report';
      worksheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
      currentRow += 2;

      worksheet.getCell(`A${currentRow}`).value = JSON.stringify(report, null, 2);
    }

    // Format columns
    worksheet.columns = [
      { width: 30 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];

    // Format currency columns
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async generateCSVReport(report: any): Promise<Buffer> {
    let csvContent = 'Report Type,Item,Value\n';
    
    // Add report content based on type
    if (report.totalAssets !== undefined) {
      // Balance Sheet - Detailed version
      csvContent += `Balance Sheet,Report Date,${report.date ? new Date(report.date).toLocaleDateString() : new Date().toLocaleDateString()}\n`;
      
      // Assets Section
      if (report.assets) {
        csvContent += `Balance Sheet,ASSETS SECTION,\n`;
        
        // Current Assets
        if (report.assets.currentAssets && report.assets.currentAssets.length > 0) {
          csvContent += `Balance Sheet,Current Assets,\n`;
          report.assets.currentAssets.forEach((asset: any) => {
            csvContent += `Balance Sheet,${asset.accountNumber} - ${asset.accountName},${asset.balance || 0}\n`;
          });
          csvContent += `Balance Sheet,Total Current Assets,${report.assets.totalCurrentAssets || 0}\n`;
        }
        
        // Fixed Assets
        if (report.assets.fixedAssets && report.assets.fixedAssets.length > 0) {
          csvContent += `Balance Sheet,Fixed Assets,\n`;
          report.assets.fixedAssets.forEach((asset: any) => {
            csvContent += `Balance Sheet,${asset.accountNumber} - ${asset.accountName},${asset.balance || 0}\n`;
          });
          csvContent += `Balance Sheet,Total Fixed Assets,${report.assets.totalFixedAssets || 0}\n`;
        }
        
        // Other Assets
        if (report.assets.otherAssets && report.assets.otherAssets.length > 0) {
          csvContent += `Balance Sheet,Other Assets,\n`;
          report.assets.otherAssets.forEach((asset: any) => {
            csvContent += `Balance Sheet,${asset.accountNumber} - ${asset.accountName},${asset.balance || 0}\n`;
          });
          csvContent += `Balance Sheet,Total Other Assets,${report.assets.totalOtherAssets || 0}\n`;
        }
        
        csvContent += `Balance Sheet,TOTAL ASSETS,${report.totalAssets || 0}\n`;
      }
      
      // Liabilities Section
      if (report.liabilities) {
        csvContent += `Balance Sheet,LIABILITIES SECTION,\n`;
        
        // Current Liabilities
        if (report.liabilities.currentLiabilities && report.liabilities.currentLiabilities.length > 0) {
          csvContent += `Balance Sheet,Current Liabilities,\n`;
          report.liabilities.currentLiabilities.forEach((liability: any) => {
            csvContent += `Balance Sheet,${liability.accountNumber} - ${liability.accountName},${liability.balance || 0}\n`;
          });
          csvContent += `Balance Sheet,Total Current Liabilities,${report.liabilities.totalCurrentLiabilities || 0}\n`;
        }
        
        // Long-term Liabilities
        if (report.liabilities.longTermLiabilities && report.liabilities.longTermLiabilities.length > 0) {
          csvContent += `Balance Sheet,Long-term Liabilities,\n`;
          report.liabilities.longTermLiabilities.forEach((liability: any) => {
            csvContent += `Balance Sheet,${liability.accountNumber} - ${liability.accountName},${liability.balance || 0}\n`;
          });
          csvContent += `Balance Sheet,Total Long-term Liabilities,${report.liabilities.totalLongTermLiabilities || 0}\n`;
        }
        
        csvContent += `Balance Sheet,TOTAL LIABILITIES,${report.totalLiabilities || 0}\n`;
      }
      
      // Equity Section
      if (report.equity) {
        csvContent += `Balance Sheet,EQUITY SECTION,\n`;
        
        // Contributed Capital
        if (report.equity.contributedCapital && report.equity.contributedCapital.length > 0) {
          csvContent += `Balance Sheet,Contributed Capital,\n`;
          report.equity.contributedCapital.forEach((equity: any) => {
            csvContent += `Balance Sheet,${equity.accountNumber} - ${equity.accountName},${equity.balance || 0}\n`;
          });
          csvContent += `Balance Sheet,Total Contributed Capital,${report.equity.totalContributedCapital || 0}\n`;
        }
        
        // Retained Earnings
        if (report.equity.retainedEarnings && report.equity.retainedEarnings.length > 0) {
          csvContent += `Balance Sheet,Retained Earnings,\n`;
          report.equity.retainedEarnings.forEach((equity: any) => {
            csvContent += `Balance Sheet,${equity.accountNumber} - ${equity.accountName},${equity.balance || 0}\n`;
          });
          csvContent += `Balance Sheet,Total Retained Earnings,${report.equity.totalRetainedEarnings || 0}\n`;
        }
        
        csvContent += `Balance Sheet,TOTAL EQUITY,${report.totalEquity || 0}\n`;
      }
      
      // Financial Ratios
      if (report.ratios) {
        csvContent += `Balance Sheet,FINANCIAL RATIOS,\n`;
        Object.entries(report.ratios).forEach(([key, value]: [string, any]) => {
          const ratioName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          csvContent += `Balance Sheet,${ratioName},${value?.toFixed(2) || '0'}\n`;
        });
      }
      
      // Changes Summary
      if (report.changes) {
        csvContent += `Balance Sheet,CHANGES SUMMARY,\n`;
        Object.entries(report.changes).forEach(([key, value]: [string, any]) => {
          const changeName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          csvContent += `Balance Sheet,${changeName},${value?.toLocaleString() || '0'}\n`;
        });
      }
    } else if (report.totalRevenue !== undefined) {
      // Profit & Loss
      csvContent += `Profit & Loss,Total Revenue,${report.totalRevenue || 0}\n`;
      csvContent += `Profit & Loss,Gross Profit,${report.grossProfit || 0}\n`;
      csvContent += `Profit & Loss,Operating Income,${report.operatingIncome || 0}\n`;
      csvContent += `Profit & Loss,Net Income,${report.netIncome || 0}\n`;
    } else if (report.operatingActivities !== undefined) {
      // Cash Flow
      csvContent += `Cash Flow,Operating Activities,${report.operatingActivities?.total || 0}\n`;
      csvContent += `Cash Flow,Investing Activities,${report.investingActivities?.total || 0}\n`;
      csvContent += `Cash Flow,Financing Activities,${report.financingActivities?.total || 0}\n`;
      csvContent += `Cash Flow,Net Cash Flow,${report.netCashFlow || 0}\n`;
    } else {
      // Generic report - convert to key-value pairs
      const flattenObject = (obj: any, prefix = ''): string[] => {
        const result: string[] = [];
        for (const key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            result.push(...flattenObject(obj[key], `${prefix}${key}.`));
          } else {
            result.push(`Financial Report,${prefix}${key},${obj[key]}`);
          }
        }
        return result;
      };
      
      csvContent += flattenObject(report).join('\n');
    }
    
    return Buffer.from(csvContent, 'utf-8');
  }
}

// Export singleton instance
export const enhancedFinancialReportingEngine = new EnhancedFinancialReportingEngine();
