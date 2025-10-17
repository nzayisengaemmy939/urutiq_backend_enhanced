import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * SENIOR ACCOUNTING: Comprehensive Account Code Management System
 * 
 * This system ensures:
 * 1. Consistent account code usage across all modules
 * 2. Proper account type assignments
 * 3. Validation of account mappings
 * 4. Audit trail for account changes
 * 5. Automated account verification
 */

export interface AccountCodeMapping {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  category: string;
  description: string;
  isSystemAccount: boolean;
  usage: string[];
}

export interface AccountValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class SeniorAccountCodeManager {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * SENIOR ACCOUNTING: Standard Account Code Mappings
   * Based on GAAP and industry best practices
   */
  private readonly STANDARD_ACCOUNT_MAPPINGS: AccountCodeMapping[] = [
    // ASSETS (1000-1999)
    { code: '1000', name: 'Cash', type: 'ASSET', category: 'Current Assets', description: 'Cash and cash equivalents', isSystemAccount: true, usage: ['payment', 'receipt', 'offset'] },
    { code: '1001', name: 'Petty Cash', type: 'ASSET', category: 'Current Assets', description: 'Small cash fund for minor expenses', isSystemAccount: true, usage: ['payment'] },
    { code: '1002', name: 'Bank Account', type: 'ASSET', category: 'Current Assets', description: 'Primary business bank account', isSystemAccount: true, usage: ['payment', 'receipt'] },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET', category: 'Current Assets', description: 'Money owed by customers', isSystemAccount: true, usage: ['sales', 'invoice'] },
    { code: '1200', name: 'Inventory', type: 'ASSET', category: 'Current Assets', description: 'Products held for sale', isSystemAccount: true, usage: ['inventory', 'cogs'] },
    { code: '1300', name: 'Prepaid Expenses', type: 'ASSET', category: 'Current Assets', description: 'Expenses paid in advance', isSystemAccount: false, usage: ['expense'] },
    { code: '1500', name: 'Equipment', type: 'ASSET', category: 'Fixed Assets', description: 'Business equipment and machinery', isSystemAccount: false, usage: ['expense', 'depreciation'] },
    { code: '1600', name: 'Accumulated Depreciation', type: 'ASSET', category: 'Fixed Assets', description: 'Depreciation accumulated on fixed assets', isSystemAccount: false, usage: ['depreciation'] },

    // LIABILITIES (2000-2999)
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', category: 'Current Liabilities', description: 'Money owed to suppliers', isSystemAccount: true, usage: ['purchase', 'expense', 'offset'] },
    { code: '2001', name: 'Credit Card Payable', type: 'LIABILITY', category: 'Current Liabilities', description: 'Credit card balances', isSystemAccount: true, usage: ['payment', 'expense'] },
    { code: '2100', name: 'Accrued Expenses', type: 'LIABILITY', category: 'Current Liabilities', description: 'Expenses incurred but not yet paid', isSystemAccount: true, usage: ['expense', 'accrual'] },
    { code: '2200', name: 'Accrued Salaries', type: 'LIABILITY', category: 'Current Liabilities', description: 'Salaries earned but not yet paid', isSystemAccount: false, usage: ['payroll'] },
    { code: '2300', name: 'Taxes Payable', type: 'LIABILITY', category: 'Current Liabilities', description: 'Taxes owed to government', isSystemAccount: true, usage: ['tax', 'sales_tax', 'vat'] },
    { code: '2400', name: 'Sales Tax Payable', type: 'LIABILITY', category: 'Current Liabilities', description: 'Sales tax collected from customers', isSystemAccount: true, usage: ['sales_tax', 'tax'] },
    { code: '2500', name: 'Income Tax Payable', type: 'LIABILITY', category: 'Current Liabilities', description: 'Income tax owed to government', isSystemAccount: false, usage: ['income_tax', 'tax'] },

    // EQUITY (3000-3999)
    { code: '3000', name: 'Owner\'s Equity', type: 'EQUITY', category: 'Equity', description: 'Owner\'s investment in business', isSystemAccount: true, usage: ['equity', 'investment'] },
    { code: '3100', name: 'Retained Earnings', type: 'EQUITY', category: 'Equity', description: 'Accumulated business profits', isSystemAccount: true, usage: ['profit', 'loss'] },
    { code: '3200', name: 'Common Stock', type: 'EQUITY', category: 'Equity', description: 'Common stock issued', isSystemAccount: false, usage: ['equity'] },

    // REVENUE (4000-4999)
    { code: '4000', name: 'Sales Revenue', type: 'REVENUE', category: 'Operating Revenue', description: 'Revenue from product sales', isSystemAccount: true, usage: ['sales', 'revenue'] },
    { code: '4001', name: 'Service Revenue', type: 'REVENUE', category: 'Operating Revenue', description: 'Revenue from services', isSystemAccount: true, usage: ['service', 'revenue'] },
    { code: '4100', name: 'Interest Income', type: 'REVENUE', category: 'Other Revenue', description: 'Interest earned on investments', isSystemAccount: false, usage: ['interest'] },
    { code: '4200', name: 'Other Income', type: 'REVENUE', category: 'Other Revenue', description: 'Miscellaneous income', isSystemAccount: false, usage: ['other'] },

    // EXPENSES (5000-6999)
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', category: 'Cost of Sales', description: 'Direct costs of products sold', isSystemAccount: true, usage: ['cogs', 'inventory', 'sales'] },
    { code: '5001', name: 'Sales Discounts', type: 'EXPENSE', category: 'Cost of Sales', description: 'Discounts given to customers', isSystemAccount: true, usage: ['sales', 'discount'] },
    { code: '5002', name: 'Sales Returns', type: 'EXPENSE', category: 'Cost of Sales', description: 'Returns from customers', isSystemAccount: true, usage: ['sales', 'return'] },
    
    // Operating Expenses (6000-6999)
    { code: '6200', name: 'Office Supplies', type: 'EXPENSE', category: 'Operating Expenses', description: 'Office supplies and materials', isSystemAccount: true, usage: ['office', 'supplies', 'soap', 'cleaning'] },
    { code: '6300', name: 'Rent Expense', type: 'EXPENSE', category: 'Operating Expenses', description: 'Rent and lease payments', isSystemAccount: true, usage: ['rent', 'lease', 'facility'] },
    { code: '6400', name: 'Utilities Expense', type: 'EXPENSE', category: 'Operating Expenses', description: 'Electricity, water, gas, internet', isSystemAccount: true, usage: ['utilities', 'electricity', 'water', 'gas', 'internet', 'phone'] },
    { code: '6500', name: 'Insurance Expense', type: 'EXPENSE', category: 'Operating Expenses', description: 'Business insurance premiums', isSystemAccount: true, usage: ['insurance', 'liability', 'property'] },
    { code: '6600', name: 'Marketing Expense', type: 'EXPENSE', category: 'Operating Expenses', description: 'Marketing and advertising costs', isSystemAccount: true, usage: ['marketing', 'advertising', 'promotion', 'social_media'] },
    { code: '6700', name: 'Travel Expense', type: 'EXPENSE', category: 'Operating Expenses', description: 'Business travel costs', isSystemAccount: true, usage: ['travel', 'transportation', 'mileage', 'hotel', 'taxi', 'uber', 'bus'] },
    { code: '6800', name: 'Meals & Entertainment', type: 'EXPENSE', category: 'Operating Expenses', description: 'Business meals and entertainment', isSystemAccount: true, usage: ['meals', 'entertainment', 'client', 'business_lunch', 'lunch', 'dinner', 'food', 'restaurant'] },
    { code: '6900', name: 'Professional Services', type: 'EXPENSE', category: 'Operating Expenses', description: 'Legal, accounting, consulting fees', isSystemAccount: true, usage: ['legal', 'attorney', 'lawyer', 'consultation', 'consultant', 'expert', 'advisor'] },
    { code: '6910', name: 'Accounting Fees', type: 'EXPENSE', category: 'Operating Expenses', description: 'Accounting and bookkeeping services', isSystemAccount: true, usage: ['accounting', 'audit', 'bookkeeping', 'tax'] },
    { code: '6920', name: 'Technology Expense', type: 'EXPENSE', category: 'Operating Expenses', description: 'Software, IT, computer costs', isSystemAccount: true, usage: ['software', 'technology', 'IT', 'computer', 'laptop', 'license'] },
    { code: '7000', name: 'Maintenance Expense', type: 'EXPENSE', category: 'Operating Expenses', description: 'Equipment and facility maintenance', isSystemAccount: true, usage: ['maintenance', 'repair', 'equipment'] },
    { code: '7100', name: 'Training Expense', type: 'EXPENSE', category: 'Operating Expenses', description: 'Employee training and education', isSystemAccount: true, usage: ['training', 'education', 'course', 'seminar'] },
    { code: '7200', name: 'Bank Fees', type: 'EXPENSE', category: 'Operating Expenses', description: 'Banking and finance charges', isSystemAccount: true, usage: ['bank', 'fees', 'interest', 'finance'] },
    { code: '7300', name: 'Tax Expense', type: 'EXPENSE', category: 'Operating Expenses', description: 'Business tax expenses', isSystemAccount: true, usage: ['tax', 'vat', 'sales_tax', 'income_tax', 'withholding'] },
    { code: '6999', name: 'Other Expenses', type: 'EXPENSE', category: 'Operating Expenses', description: 'Miscellaneous business expenses', isSystemAccount: true, usage: ['other', 'miscellaneous', 'general'] },
  ];

  /**
   * Validate account code usage
   */
  async validateAccountUsage(accountCode: string, usageContext: string, tenantId: string, companyId: string): Promise<AccountValidationResult> {
    const result: AccountValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Find the account mapping
      const mapping = this.STANDARD_ACCOUNT_MAPPINGS.find(m => m.code === accountCode);
      if (!mapping) {
        result.isValid = false;
        result.errors.push(`Account code ${accountCode} is not in standard mapping`);
        return result;
      }

      // Check if usage is appropriate
      if (!mapping.usage.includes(usageContext)) {
        result.warnings.push(`Account ${mapping.name} (${accountCode}) may not be appropriate for ${usageContext}`);
        
        // Suggest better alternatives
        const alternatives = this.STANDARD_ACCOUNT_MAPPINGS.filter(m => 
          m.usage.includes(usageContext) && m.type === mapping.type
        );
        
        if (alternatives.length > 0) {
          result.suggestions.push(`Consider using: ${alternatives.map(a => `${a.name} (${a.code})`).join(', ')}`);
        }
      }

      // Check if account exists in database
      const account = await this.prisma.account.findFirst({
        where: {
          tenantId,
          companyId,
          code: accountCode
        },
        include: { type: true }
      });

      if (!account) {
        result.isValid = false;
        result.errors.push(`Account ${mapping.name} (${accountCode}) does not exist in database`);
      } else if (account.type?.code !== mapping.type) {
        result.warnings.push(`Account type mismatch: Database has ${account.type?.code}, Standard expects ${mapping.type}`);
      }

      return result;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error.message}`);
      return result;
    }
  }

  /**
   * Get recommended account for specific usage
   */
  async getRecommendedAccount(usageContext: string, tenantId: string, companyId: string): Promise<any> {
    try {
      // Find accounts that match the usage context
      const matchingMappings = this.STANDARD_ACCOUNT_MAPPINGS.filter(m => 
        m.usage.includes(usageContext)
      );

      if (matchingMappings.length === 0) {
        return null;
      }

      // Try to find the account in the database
      for (const mapping of matchingMappings) {
        const account = await this.prisma.account.findFirst({
          where: {
            tenantId,
            companyId,
            code: mapping.code,
            isActive: true
          },
          include: { type: true }
        });

        if (account) {
          return account;
        }
      }

      return null;

    } catch (error) {
      console.error('Error getting recommended account:', error);
      return null;
    }
  }

  /**
   * Audit all accounts against standard mappings
   */
  async auditAccountCodes(tenantId: string, companyId: string): Promise<any[]> {
    try {
      const accounts = await this.prisma.account.findMany({
        where: {
          tenantId,
          companyId
        },
        include: { type: true }
      });

      const auditResults = [];

      for (const account of accounts) {
        const mapping = this.STANDARD_ACCOUNT_MAPPINGS.find(m => m.code === account.code);
        
        const auditResult = {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          databaseType: account.type?.code,
          standardType: mapping?.type,
          standardName: mapping?.name,
          issues: [] as string[],
          recommendations: [] as string[]
        };

        if (!mapping) {
          auditResult.issues.push('Account code not in standard mapping');
          auditResult.recommendations.push('Consider using standard account code');
        } else {
          if (mapping.name !== account.name) {
            auditResult.issues.push(`Name mismatch: Database "${account.name}" vs Standard "${mapping.name}"`);
          }
          
          if (mapping.type !== account.type?.code) {
            auditResult.issues.push(`Type mismatch: Database "${account.type?.code}" vs Standard "${mapping.type}"`);
          }
        }

        auditResults.push(auditResult);
      }

      return auditResults;

    } catch (error) {
      console.error('Error auditing account codes:', error);
      return [];
    }
  }

  /**
   * Create missing standard accounts
   */
  async createMissingStandardAccounts(tenantId: string, companyId: string): Promise<{ created: number; errors: string[] }> {
    const result = { created: 0, errors: [] };

    try {
      for (const mapping of this.STANDARD_ACCOUNT_MAPPINGS) {
        // Check if account already exists
        const existingAccount = await this.prisma.account.findFirst({
          where: {
            tenantId,
            companyId,
            code: mapping.code
          }
        });

        if (!existingAccount) {
          try {
            // Find or create account type
            let accountType = await this.prisma.accountType.findFirst({
              where: {
                tenantId,
                companyId,
                code: mapping.type
              }
            });

            if (!accountType) {
              accountType = await this.prisma.accountType.create({
                data: {
                  tenantId,
                  companyId,
                  code: mapping.type,
                  name: mapping.type,
                  description: `${mapping.type} accounts`
                }
              });
            }

            // Create the account
            await this.prisma.account.create({
              data: {
                tenantId,
                companyId,
                code: mapping.code,
                name: mapping.name,
                description: mapping.description,
                typeId: accountType.id,
                isActive: true,
                isSystemAccount: mapping.isSystemAccount
              }
            });

            result.created++;
            console.log(`✅ Created standard account: ${mapping.name} (${mapping.code})`);

          } catch (error) {
            result.errors.push(`Failed to create ${mapping.name} (${mapping.code}): ${error.message}`);
          }
        }
      }

      return result;

    } catch (error) {
      result.errors.push(`General error: ${error.message}`);
      return result;
    }
  }

  /**
   * Get account usage context from description/keywords
   */
  getUsageContext(description: string, keywords?: string[]): string {
    const desc = description.toLowerCase();
    const allKeywords = [...(keywords || []), desc];
    
    // Check each usage context
    for (const mapping of this.STANDARD_ACCOUNT_MAPPINGS) {
      for (const usage of mapping.usage) {
        if (allKeywords.some(keyword => keyword.includes(usage))) {
          return usage;
        }
      }
    }

    return 'other';
  }
}

// Export singleton instance
export const seniorAccountCodeManager = new SeniorAccountCodeManager();
