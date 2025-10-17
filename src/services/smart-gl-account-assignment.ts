import { PrismaClient } from '@prisma/client';
import { seniorAccountCodeManager } from './senior-account-code-manager.js';

const prisma = new PrismaClient();

export interface GLAccountAssignmentOptions {
  tenantId: string;
  companyId: string;
  expenseId: string;
  expenseCategoryId?: string;
  expenseDescription?: string;
  expenseAmount?: number;
}

export class SmartGLAccountAssignment {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * SENIOR ACCOUNTING: Enhanced account assignment using standardized account codes
   */
  async assignOptimalGLAccount(options: GLAccountAssignmentOptions): Promise<string | null> {
    const { tenantId, companyId, expenseId, expenseCategoryId, expenseDescription, expenseAmount } = options;

    try {
      console.log(`🔧 Senior Accounting: Assigning GL account for expense ${expenseId}`);

      // SENIOR STRATEGY 1: Use standardized account code manager
      const usageContext = seniorAccountCodeManager.getUsageContext(expenseDescription || '');
      const recommendedAccount = await seniorAccountCodeManager.getRecommendedAccount(usageContext, tenantId, companyId);
      
      if (recommendedAccount) {
        // Validate the assignment
        const validation = await seniorAccountCodeManager.validateAccountUsage(
          recommendedAccount.code, 
          usageContext, 
          tenantId, 
          companyId
        );

        if (validation.isValid) {
          console.log(`✅ Senior Accounting: Assigned validated GL account: ${recommendedAccount.name} (${recommendedAccount.code})`);
          if (validation.warnings.length > 0) {
            console.log(`⚠️ Warnings: ${validation.warnings.join(', ')}`);
          }
          return recommendedAccount.id;
        } else {
          console.log(`❌ Account validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // SENIOR STRATEGY 2: Category-based assignment (fallback)
      if (expenseCategoryId) {
        const categoryBasedAccount = await this.getAccountByCategory(tenantId, companyId, expenseCategoryId);
        if (categoryBasedAccount) {
          console.log(`✅ Assigned GL account by category: ${categoryBasedAccount.name}`);
          return categoryBasedAccount.id;
        }
      }

      // SENIOR STRATEGY 3: Description-based assignment (intelligent matching)
      if (expenseDescription) {
        const descriptionBasedAccount = await this.getAccountByDescription(tenantId, companyId, expenseDescription);
        if (descriptionBasedAccount) {
          console.log(`✅ Assigned GL account by description: ${descriptionBasedAccount.name}`);
          return descriptionBasedAccount.id;
        }
      }

      // SENIOR STRATEGY 4: Amount-based assignment (for large expenses)
      if (expenseAmount && expenseAmount > 10000) {
        const amountBasedAccount = await this.getAccountByAmount(tenantId, companyId, expenseAmount);
        if (amountBasedAccount) {
          console.log(`✅ Assigned GL account by amount: ${amountBasedAccount.name}`);
          return amountBasedAccount.id;
        }
      }

      // SENIOR STRATEGY 5: Default expense account (last resort)
      const defaultAccount = await this.getDefaultExpenseAccount(tenantId, companyId);
      if (defaultAccount) {
        console.log(`✅ Assigned default GL account: ${defaultAccount.name}`);
        return defaultAccount.id;
      }

      console.warn(`❌ Senior Accounting: No suitable GL account found for expense ${expenseId}`);
      return null;

    } catch (error) {
      console.error('Error in senior GL account assignment:', error);
      return null;
    }
  }

  /**
   * Category-based assignment: Map expense categories to specific GL accounts
   */
  private async getAccountByCategory(tenantId: string, companyId: string, categoryId: string): Promise<any> {
    // Get the expense category
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: categoryId },
      select: { name: true, description: true }
    });

    if (!category) return null;

    // Smart mapping based on category name and description
    const categoryMappings = [
      // Office & Administrative
      { keywords: ['office', 'supplies', 'stationery', 'paper', 'pens'], accountCode: '6200' },
      { keywords: ['rent', 'lease', 'facility'], accountCode: '6300' },
      { keywords: ['utilities', 'electricity', 'water', 'gas', 'internet'], accountCode: '6400' },
      { keywords: ['insurance', 'liability', 'property'], accountCode: '6500' },
      
      // Marketing & Sales
      { keywords: ['marketing', 'advertising', 'promotion', 'social media'], accountCode: '6600' },
      { keywords: ['travel', 'transportation', 'mileage', 'hotel'], accountCode: '6700' },
      { keywords: ['meals', 'entertainment', 'client', 'business lunch'], accountCode: '6800' },
      
      // Professional Services
      { keywords: ['legal', 'attorney', 'lawyer', 'consultation'], accountCode: '6900' },
      { keywords: ['accounting', 'audit', 'bookkeeping', 'tax'], accountCode: '6910' },
      { keywords: ['software', 'technology', 'IT', 'computer'], accountCode: '6920' },
      
      // Operations
      { keywords: ['maintenance', 'repair', 'equipment'], accountCode: '7000' },
      { keywords: ['training', 'education', 'course', 'seminar'], accountCode: '7100' },
      { keywords: ['bank', 'fees', 'interest', 'finance'], accountCode: '7200' },
      
      // Tax-related expenses
      { keywords: ['tax', 'vat', 'sales tax', 'income tax', 'withholding'], accountCode: '7300' },
      
      // Cost of Goods Sold
      { keywords: ['inventory', 'materials', 'raw materials', 'supplies'], accountCode: '5000' },
      { keywords: ['shipping', 'freight', 'delivery', 'logistics'], accountCode: '5010' },
    ];

    // Find matching account based on category
    for (const mapping of categoryMappings) {
      if (mapping.keywords.some(keyword => 
        category.name.toLowerCase().includes(keyword) ||
        (category.description && category.description.toLowerCase().includes(keyword))
      )) {
        const account = await this.prisma.account.findFirst({
          where: {
            tenantId,
            companyId,
            code: mapping.accountCode,
            isActive: true
          }
        });
        if (account) return account;
      }
    }

    return null;
  }

  /**
   * Description-based assignment: Intelligent keyword matching
   */
  private async getAccountByDescription(tenantId: string, companyId: string, description: string): Promise<any> {
    const desc = description.toLowerCase();

    // Direct keyword matching with account codes
    const keywordMappings = [
      { keywords: ['soap', 'cleaning', 'detergent', 'sanitizer'], accountCode: '6200' }, // Office Supplies
      { keywords: ['fuel', 'gas', 'petrol', 'diesel'], accountCode: '6700' }, // Travel
      { keywords: ['phone', 'mobile', 'telephone', 'communication'], accountCode: '6400' }, // Utilities
      { keywords: ['lunch', 'dinner', 'meal', 'food', 'restaurant'], accountCode: '6800' }, // Meals
      { keywords: ['hotel', 'accommodation', 'lodging'], accountCode: '6700' }, // Travel
      { keywords: ['taxi', 'uber', 'transport', 'bus'], accountCode: '6700' }, // Travel
      { keywords: ['printer', 'ink', 'toner', 'paper'], accountCode: '6200' }, // Office Supplies
      { keywords: ['computer', 'laptop', 'software', 'license'], accountCode: '6920' }, // Technology
      { keywords: ['consultant', 'expert', 'advisor'], accountCode: '6900' }, // Professional Services
      { keywords: ['tax', 'vat', 'sales tax', 'income tax', 'withholding'], accountCode: '7300' }, // Tax Expenses
    ];

    for (const mapping of keywordMappings) {
      if (mapping.keywords.some(keyword => desc.includes(keyword))) {
        const account = await this.prisma.account.findFirst({
          where: {
            tenantId,
            companyId,
            code: mapping.accountCode,
            isActive: true
          }
        });
        if (account) return account;
      }
    }

    return null;
  }

  /**
   * Amount-based assignment: Different accounts for different expense sizes
   */
  private async getAccountByAmount(tenantId: string, companyId: string, amount: number): Promise<any> {
    // Large expenses might be equipment or major purchases
    if (amount > 50000) {
      return await this.prisma.account.findFirst({
        where: {
          tenantId,
          companyId,
          code: '1500', // Equipment
          isActive: true
        }
      });
    }

    // Medium expenses might be professional services
    if (amount > 20000) {
      return await this.prisma.account.findFirst({
        where: {
          tenantId,
          companyId,
          code: '6900', // Professional Services
          isActive: true
        }
      });
    }

    return null;
  }

  /**
   * Default expense account fallback
   */
  private async getDefaultExpenseAccount(tenantId: string, companyId: string): Promise<any> {
    // Try to find a general expense account
    const generalExpense = await this.prisma.account.findFirst({
      where: {
        tenantId,
        companyId,
        type: {
          code: 'EXPENSE'
        },
        isActive: true,
        OR: [
          { name: { contains: 'General', mode: 'insensitive' } },
          { name: { contains: 'Other', mode: 'insensitive' } },
          { name: { contains: 'Miscellaneous', mode: 'insensitive' } },
          { code: '6999' } // Other Expenses
        ]
      }
    });

    if (generalExpense) return generalExpense;

    // Last resort: any active expense account
    return await this.prisma.account.findFirst({
      where: {
        tenantId,
        companyId,
        type: {
          code: 'EXPENSE'
        },
        isActive: true
      }
    });
  }

  /**
   * Update expense with assigned GL account
   */
  async updateExpenseWithGLAccount(expenseId: string, accountId: string): Promise<boolean> {
    try {
      await this.prisma.expense.update({
        where: { id: expenseId },
        data: { accountId }
      });
      console.log(`✅ Updated expense ${expenseId} with GL account ${accountId}`);
      return true;
    } catch (error) {
      console.error('Error updating expense with GL account:', error);
      return false;
    }
  }
}

// Export singleton instance
export const smartGLAccountAssignment = new SmartGLAccountAssignment();
