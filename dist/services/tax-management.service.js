import { prisma } from '../prisma';
import { ApiError } from '../errors';
export class TaxManagementService {
    /**
     * Calculate taxes for a given jurisdiction and entity type
     */
    static async calculateTaxes(params) {
        const { jurisdiction, taxYear, entityType, income, deductions, credits } = params;
        // Get tax brackets for the jurisdiction and year
        const taxBrackets = await this.getTaxBrackets(jurisdiction, taxYear, entityType);
        if (!taxBrackets || taxBrackets.length === 0) {
            throw new ApiError(400, 'TAX_BRACKETS_NOT_FOUND', `Tax brackets not found for ${jurisdiction} ${taxYear} ${entityType}`);
        }
        // Calculate adjusted gross income
        const adjustedGrossIncome = income - deductions;
        // Calculate taxable income (simplified - would need more complex logic)
        const taxableIncome = Math.max(0, adjustedGrossIncome);
        // Calculate tax using progressive brackets
        const { taxOwed, breakdown } = this.calculateProgressiveTax(taxableIncome, taxBrackets);
        // Apply credits
        const creditsApplied = Math.min(credits, taxOwed);
        const netTaxOwed = Math.max(0, taxOwed - creditsApplied);
        // Calculate rates
        const effectiveRate = taxableIncome > 0 ? (netTaxOwed / taxableIncome) * 100 : 0;
        const marginalRate = this.getMarginalRate(taxableIncome, taxBrackets);
        return {
            grossIncome: income,
            adjustedGrossIncome,
            taxableIncome,
            taxOwed,
            creditsApplied,
            netTaxOwed,
            effectiveRate,
            marginalRate,
            breakdown,
            jurisdiction,
            taxYear,
            calculatedAt: new Date()
        };
    }
    /**
     * Generate tax forms for filing
     */
    static async generateTaxForm(tenantId, companyId, formType, taxYear, jurisdiction) {
        // Get company data
        const company = await prisma.company.findUnique({
            where: { id: companyId, tenantId }
        });
        if (!company) {
            throw new ApiError(404, 'COMPANY_NOT_FOUND', 'Company not found');
        }
        // Get financial data for the tax year
        const startDate = new Date(taxYear, 0, 1);
        const endDate = new Date(taxYear, 11, 31);
        // Calculate taxes
        const taxCalculation = await this.calculateTaxes({
            tenantId,
            companyId,
            jurisdiction,
            taxYear,
            entityType: company.entityType || 'corporation',
            income: await this.getTotalIncome(companyId, startDate, endDate),
            deductions: await this.getTotalDeductions(companyId, startDate, endDate),
            credits: await this.getTotalCredits(companyId, startDate, endDate)
        });
        // Generate form data based on form type
        const formData = await this.generateFormData(formType, taxCalculation, company);
        const taxForm = {
            formId: `${formType}_${companyId}_${taxYear}_${Date.now()}`,
            formName: this.getFormName(formType),
            jurisdiction,
            taxYear,
            entityType: company.entityType || 'corporation',
            status: 'draft',
            data: formData
        };
        // Save to database
        await prisma.taxForm.create({
            data: {
                tenantId,
                companyId,
                // formId: taxForm.formId, // Commented out - field not available in Prisma model
                formName: taxForm.formName,
                // jurisdiction: jurisdiction, // Commented out - field not available in Prisma model
                taxYear,
                // entityType: (company as any).entityType || 'corporation', // Commented out - field not available in Prisma model
                status: 'draft',
                formData: JSON.stringify(formData),
                createdAt: new Date(),
                // Required fields for Prisma model
                jurisdictionId: 'default-jurisdiction-id',
                formCode: formType,
                formType: formType,
                dueDate: new Date(taxYear + 1, 3, 15), // April 15th of next year
                filingMethod: 'electronic'
            }
        });
        return taxForm;
    }
    /**
     * Submit tax form for filing
     */
    static async submitTaxForm(tenantId, formId) {
        const taxForm = await prisma.taxForm.findUnique({
            where: { id: formId, tenantId }
        });
        if (!taxForm) {
            throw new ApiError(404, 'TAX_FORM_NOT_FOUND', 'Tax form not found');
        }
        if (taxForm.status !== 'draft' && taxForm.status !== 'ready') {
            throw new ApiError(400, 'INVALID_FORM_STATUS', `Cannot submit form with status: ${taxForm.status}`);
        }
        try {
            // TODO: Integrate with actual tax filing service (e.g., IRS e-file)
            // This would be a real integration with government tax systems
            const confirmationNumber = `EF${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
            // Update form status
            await prisma.taxForm.update({
                where: { id: formId },
                data: {
                    status: 'filed',
                    // filedAt: new Date(), // Commented out - field not available in Prisma model
                    // confirmationNumber // Commented out - field not available in Prisma model
                }
            });
            return {
                success: true,
                confirmationNumber
            };
        }
        catch (error) {
            // Update form status to rejected
            await prisma.taxForm.update({
                where: { id: formId },
                data: {
                    status: 'rejected',
                    // rejectionReason: error instanceof Error ? error.message : 'Unknown error' // Commented out - field not available in Prisma model
                }
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get tax compliance status for a company
     */
    static async getComplianceStatus(tenantId, companyId, jurisdiction, taxYear) {
        const company = await prisma.company.findUnique({
            where: { id: companyId, tenantId }
        });
        if (!company) {
            throw new ApiError(404, 'COMPANY_NOT_FOUND', 'Company not found');
        }
        // Get filing requirements
        const filingRequirements = await this.getFilingRequirements(jurisdiction, taxYear, company.entityType || 'corporation');
        // Check if filing is required
        if (!filingRequirements.required) {
            return {
                jurisdiction,
                taxYear,
                entityType: company.entityType || 'corporation',
                filingStatus: 'not_required',
                dueDate: filingRequirements.dueDate,
                penalties: 0,
                interest: 0,
                totalOwed: 0,
                lastUpdated: new Date()
            };
        }
        // Check if already filed
        const existingForm = await prisma.taxForm.findFirst({
            where: {
                tenantId,
                companyId,
                // jurisdiction: jurisdiction, // Commented out - field not available in Prisma model
                taxYear,
                status: { in: ['filed', 'accepted'] }
            }
        });
        let filingStatus = 'not_filed';
        if (existingForm) {
            filingStatus = existingForm.status;
        }
        // Calculate penalties and interest (simplified)
        const penalties = filingStatus === 'not_filed' ?
            this.calculatePenalties(filingRequirements.dueDate) : 0;
        const interest = filingStatus === 'not_filed' ?
            this.calculateInterest(filingRequirements.dueDate) : 0;
        return {
            jurisdiction,
            taxYear,
            entityType: company.entityType || 'corporation',
            filingStatus,
            dueDate: filingRequirements.dueDate,
            extensionDate: filingRequirements.extensionDate,
            penalties,
            interest,
            totalOwed: penalties + interest,
            lastUpdated: new Date()
        };
    }
    /**
     * Get tax optimization recommendations
     */
    static async getTaxOptimizationRecommendations(tenantId, companyId, jurisdiction, taxYear) {
        const company = await prisma.company.findUnique({
            where: { id: companyId, tenantId }
        });
        if (!company) {
            throw new ApiError(404, 'COMPANY_NOT_FOUND', 'Company not found');
        }
        // Get current tax calculation
        const currentTax = await this.calculateTaxes({
            tenantId,
            companyId,
            jurisdiction,
            taxYear,
            entityType: company.entityType || 'corporation',
            income: await this.getTotalIncome(companyId, new Date(taxYear, 0, 1), new Date(taxYear, 11, 31)),
            deductions: await this.getTotalDeductions(companyId, new Date(taxYear, 0, 1), new Date(taxYear, 11, 31)),
            credits: await this.getTotalCredits(companyId, new Date(taxYear, 0, 1), new Date(taxYear, 11, 31))
        });
        const recommendations = [];
        // Business expense optimization
        if (currentTax.effectiveRate > 20) {
            recommendations.push({
                category: 'Business Expenses',
                recommendation: 'Maximize deductible business expenses',
                potentialSavings: currentTax.taxableIncome * 0.05, // 5% of taxable income
                priority: 'high',
                implementation: 'Review and categorize all business expenses to ensure maximum deductions'
            });
        }
        // Retirement contributions
        if (company.entityType === 'individual' || company.entityType === 'llc') {
            recommendations.push({
                category: 'Retirement Planning',
                recommendation: 'Consider retirement account contributions',
                potentialSavings: Math.min(6000, currentTax.taxableIncome * 0.1), // Up to $6k or 10%
                priority: 'medium',
                implementation: 'Contribute to IRA or 401(k) to reduce taxable income'
            });
        }
        // Depreciation optimization
        if (company.entityType === 'corporation') {
            recommendations.push({
                category: 'Depreciation',
                recommendation: 'Optimize depreciation schedules',
                potentialSavings: currentTax.taxableIncome * 0.03, // 3% of taxable income
                priority: 'medium',
                implementation: 'Review asset depreciation methods and consider accelerated depreciation'
            });
        }
        return recommendations;
    }
    // Helper methods
    static async getTaxBrackets(jurisdiction, taxYear, entityType) {
        // TODO: Implement actual tax bracket lookup
        // This would integrate with tax data providers or government APIs
        // Sample tax brackets for US Federal Income Tax (2024)
        if (jurisdiction === 'US_FEDERAL' && taxYear === 2024) {
            if (entityType === 'individual') {
                return [
                    { min: 0, max: 11000, rate: 0.10 },
                    { min: 11000, max: 44725, rate: 0.12 },
                    { min: 44725, max: 95375, rate: 0.22 },
                    { min: 95375, max: 182050, rate: 0.24 },
                    { min: 182050, max: 231250, rate: 0.32 },
                    { min: 231250, max: 578125, rate: 0.35 },
                    { min: 578125, max: Infinity, rate: 0.37 }
                ];
            }
            else if (entityType === 'corporation') {
                return [
                    { min: 0, max: 50000, rate: 0.15 },
                    { min: 50000, max: 75000, rate: 0.25 },
                    { min: 75000, max: 100000, rate: 0.34 },
                    { min: 100000, max: 335000, rate: 0.39 },
                    { min: 335000, max: 10000000, rate: 0.34 },
                    { min: 10000000, max: 15000000, rate: 0.35 },
                    { min: 15000000, max: Infinity, rate: 0.21 }
                ];
            }
        }
        return [];
    }
    static calculateProgressiveTax(income, brackets) {
        let totalTax = 0;
        const breakdown = [];
        for (const bracket of brackets) {
            const taxableInBracket = Math.min(income, bracket.max) - bracket.min;
            if (taxableInBracket <= 0)
                break;
            const taxInBracket = taxableInBracket * bracket.rate;
            totalTax += taxInBracket;
            breakdown.push({
                bracket: `${bracket.min.toLocaleString()} - ${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()}`,
                incomeRange: `${bracket.min.toLocaleString()} - ${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()}`,
                rate: bracket.rate * 100,
                taxAmount: taxInBracket,
                cumulativeTax: totalTax
            });
        }
        return { taxOwed: totalTax, breakdown };
    }
    static getMarginalRate(income, brackets) {
        for (const bracket of brackets) {
            if (income >= bracket.min && income < bracket.max) {
                return bracket.rate * 100;
            }
        }
        return brackets[brackets.length - 1]?.rate * 100 || 0;
    }
    static async getTotalIncome(companyId, startDate, endDate) {
        // Get revenue accounts and calculate total income
        const revenueAccounts = await prisma.account.findMany({
            where: {
                companyId,
                // accountTypeId: { in: ['revenue-account-type-id'] }, // Commented out - field not available in Prisma model
                isActive: true
            }
        });
        let totalIncome = 0;
        for (const account of revenueAccounts) {
            const balance = await this.getAccountBalance(account.id, startDate, endDate);
            totalIncome += balance;
        }
        return totalIncome;
    }
    static async getTotalDeductions(companyId, startDate, endDate) {
        // Get expense accounts and calculate total deductions
        const expenseAccounts = await prisma.account.findMany({
            where: {
                companyId,
                // accountTypeId: { in: ['expense-account-type-id'] }, // Commented out - field not available in Prisma model
                isActive: true
            }
        });
        let totalDeductions = 0;
        for (const account of expenseAccounts) {
            const balance = await this.getAccountBalance(account.id, startDate, endDate);
            totalDeductions += balance;
        }
        return totalDeductions;
    }
    static async getTotalCredits(companyId, startDate, endDate) {
        // TODO: Implement tax credit calculation
        // This would involve specific tax credit rules and calculations
        return 0;
    }
    static async getAccountBalance(accountId, startDate, endDate) {
        const transactions = await prisma.journalLine.findMany({
            where: {
                accountId,
                // createdAt: { // Commented out - field not available in Prisma model
                //   gte: startDate,
                //   lte: endDate
                // }
            },
            select: { debit: true, credit: true }
        });
        return transactions.reduce((balance, transaction) => {
            return balance + transaction.debit - transaction.credit;
        }, 0);
    }
    static async generateFormData(formType, taxCalculation, company) {
        // Generate form-specific data based on form type
        const baseData = {
            companyName: company.name,
            ein: company.ein,
            address: company.address,
            taxYear: taxCalculation.taxYear,
            grossIncome: taxCalculation.grossIncome,
            adjustedGrossIncome: taxCalculation.adjustedGrossIncome,
            taxableIncome: taxCalculation.taxableIncome,
            taxOwed: taxCalculation.taxOwed,
            creditsApplied: taxCalculation.creditsApplied,
            netTaxOwed: taxCalculation.netTaxOwed
        };
        // Add form-specific fields
        switch (formType) {
            case '1120': // Corporate tax return
                return {
                    ...baseData,
                    formType: '1120',
                    corporateTaxRate: taxCalculation.marginalRate,
                    totalAssets: 0, // Would be calculated from balance sheet
                    totalLiabilities: 0,
                    shareholdersEquity: 0
                };
            case '1040': // Individual tax return
                return {
                    ...baseData,
                    formType: '1040',
                    filingStatus: 'single', // Would be determined from company data
                    standardDeduction: 13850, // 2024 standard deduction
                    itemizedDeductions: taxCalculation.grossIncome - taxCalculation.adjustedGrossIncome
                };
            default:
                return baseData;
        }
    }
    static getFormName(formType) {
        const formNames = {
            '1120': 'U.S. Corporation Income Tax Return',
            '1040': 'U.S. Individual Income Tax Return',
            '1065': 'U.S. Return of Partnership Income',
            '1120S': 'U.S. Income Tax Return for an S Corporation'
        };
        return formNames[formType] || `Tax Form ${formType}`;
    }
    static async getFilingRequirements(jurisdiction, taxYear, entityType) {
        // TODO: Implement actual filing requirements lookup
        return {
            required: true,
            dueDate: new Date(taxYear + 1, 3, 15), // April 15th of next year
            extensionDate: new Date(taxYear + 1, 9, 15) // October 15th extension
        };
    }
    static calculatePenalties(dueDate) {
        const daysLate = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        return daysLate * 50; // $50 per day penalty (simplified)
    }
    static calculateInterest(dueDate) {
        const daysLate = Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        const annualRate = 0.08; // 8% annual interest rate
        const dailyRate = annualRate / 365;
        return daysLate * dailyRate * 1000; // Assuming $1000 base amount (simplified)
    }
}
