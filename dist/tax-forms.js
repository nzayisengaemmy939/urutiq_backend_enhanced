import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
const prisma = new PrismaClient();
// Tax form templates and structures
export const TaxFormTemplates = {
    // US Federal Forms
    'US-1040': {
        name: 'Individual Income Tax Return',
        type: 'annual',
        fields: [
            { name: 'filing_status', type: 'select', required: true },
            { name: 'total_income', type: 'number', required: true },
            { name: 'adjusted_gross_income', type: 'number', required: true },
            { name: 'standard_deduction', type: 'number', required: true },
            { name: 'taxable_income', type: 'number', required: true },
            { name: 'tax_owed', type: 'number', required: true },
            { name: 'withholding', type: 'number', required: true },
            { name: 'refund_or_owe', type: 'number', required: true },
        ],
    },
    'US-1120': {
        name: 'Corporation Income Tax Return',
        type: 'annual',
        fields: [
            { name: 'gross_receipts', type: 'number', required: true },
            { name: 'total_income', type: 'number', required: true },
            { name: 'total_deductions', type: 'number', required: true },
            { name: 'taxable_income', type: 'number', required: true },
            { name: 'tax_liability', type: 'number', required: true },
            { name: 'payments', type: 'number', required: true },
            { name: 'balance_due', type: 'number', required: true },
        ],
    },
    'US-941': {
        name: 'Quarterly Federal Tax Return',
        type: 'quarterly',
        fields: [
            { name: 'employees_count', type: 'number', required: true },
            { name: 'wages_tips', type: 'number', required: true },
            { name: 'federal_income_tax', type: 'number', required: true },
            { name: 'social_security_wages', type: 'number', required: true },
            { name: 'social_security_tax', type: 'number', required: true },
            { name: 'medicare_wages', type: 'number', required: true },
            { name: 'medicare_tax', type: 'number', required: true },
            { name: 'total_tax', type: 'number', required: true },
        ],
    },
    // Canadian Forms
    'CA-T2': {
        name: 'Corporation Income Tax Return',
        type: 'annual',
        fields: [
            { name: 'gross_revenue', type: 'number', required: true },
            { name: 'net_income', type: 'number', required: true },
            { name: 'taxable_income', type: 'number', required: true },
            { name: 'federal_tax', type: 'number', required: true },
            { name: 'provincial_tax', type: 'number', required: true },
        ],
    },
    // UK Forms
    'UK-CT600': {
        name: 'Corporation Tax Return',
        type: 'annual',
        fields: [
            { name: 'turnover', type: 'number', required: true },
            { name: 'total_profits', type: 'number', required: true },
            { name: 'tax_payable', type: 'number', required: true },
        ],
    },
    'UK-VAT100': {
        name: 'VAT Return',
        type: 'quarterly',
        fields: [
            { name: 'vat_due_on_sales', type: 'number', required: true },
            { name: 'vat_due_on_acquisitions', type: 'number', required: true },
            { name: 'total_vat_due', type: 'number', required: true },
            { name: 'vat_reclaimed', type: 'number', required: true },
            { name: 'net_vat_due', type: 'number', required: true },
            { name: 'total_value_sales', type: 'number', required: true },
            { name: 'total_value_purchases', type: 'number', required: true },
        ],
    },
};
// Validation schemas
export const CreateTaxFormSchema = z.object({
    jurisdictionId: z.string(),
    formCode: z.string(),
    taxYear: z.number().min(2000).max(3000),
    dueDate: z.string().datetime(),
    extendedDueDate: z.string().datetime().optional(),
    formData: z.record(z.string(), z.any()),
    filingMethod: z.enum(['electronic', 'paper']).default('electronic'),
});
export const UpdateTaxFormSchema = z.object({
    formData: z.record(z.string(), z.any()).optional(),
    status: z.enum(['draft', 'submitted', 'accepted', 'rejected']).optional(),
    dueDate: z.string().datetime().optional(),
    extendedDueDate: z.string().datetime().optional(),
});
// Tax Form Generation Service
export class TaxFormService {
    static async create(tenantId, companyId, data) {
        const validatedData = CreateTaxFormSchema.parse(data);
        // Get form template
        const template = TaxFormTemplates[validatedData.formCode];
        if (!template) {
            throw new Error(`Tax form template not found for code: ${validatedData.formCode}`);
        }
        // Validate jurisdiction using raw query
        const jurisdiction = await prisma.$queryRaw `
      SELECT * FROM TaxJurisdiction 
      WHERE id = ${validatedData.jurisdictionId} 
      AND tenantId = ${tenantId} 
      AND companyId = ${companyId}
      LIMIT 1
    `;
        if (jurisdiction.length === 0) {
            throw new Error('Tax jurisdiction not found');
        }
        // Create tax form using raw query
        const formId = Math.random().toString(36).substring(2, 15);
        await prisma.$executeRaw `
      INSERT INTO TaxForm (
        id, tenantId, companyId, jurisdictionId, formCode, formName, 
        formType, taxYear, dueDate, extendedDueDate, status, filingMethod, 
        formData, createdAt, updatedAt
      ) VALUES (
        ${formId}, ${tenantId}, ${companyId}, ${validatedData.jurisdictionId},
        ${validatedData.formCode}, ${template.name}, ${template.type},
        ${validatedData.taxYear}, ${new Date(validatedData.dueDate)},
        ${validatedData.extendedDueDate ? new Date(validatedData.extendedDueDate) : null},
        ${'draft'}, ${validatedData.filingMethod}, ${JSON.stringify(validatedData.formData)},
        ${new Date()}, ${new Date()}
      )
    `;
        // Return the created form with jurisdiction
        const createdForms = await prisma.$queryRaw `
      SELECT tf.*, tj.name as jurisdiction_name, tj.code as jurisdiction_code,
             tj.country as jurisdiction_country, tj.level as jurisdiction_level
      FROM TaxForm tf
      JOIN TaxJurisdiction tj ON tf.jurisdictionId = tj.id
      WHERE tf.id = ${formId}
    `;
        return createdForms[0];
    }
    static async getAll(tenantId, companyId, filters = {}) {
        let whereClause = `WHERE tf.tenantId = '${tenantId}' AND tf.companyId = '${companyId}'`;
        if (filters.taxYear) {
            whereClause += ` AND tf.taxYear = ${filters.taxYear}`;
        }
        if (filters.status) {
            whereClause += ` AND tf.status = '${filters.status}'`;
        }
        if (filters.formType) {
            whereClause += ` AND tf.formType = '${filters.formType}'`;
        }
        if (filters.jurisdictionId) {
            whereClause += ` AND tf.jurisdictionId = '${filters.jurisdictionId}'`;
        }
        const forms = await prisma.$queryRaw `
      SELECT tf.*, 
             tj.name as jurisdiction_name,
             tj.code as jurisdiction_code,
             tj.country as jurisdiction_country,
             tj.level as jurisdiction_level
      FROM TaxForm tf
      JOIN TaxJurisdiction tj ON tf.jurisdictionId = tj.id
      ${whereClause}
      ORDER BY tf.taxYear DESC, tf.dueDate ASC
    `;
        return forms;
    }
    static async getById(id, tenantId, companyId) {
        const forms = await prisma.$queryRaw `
      SELECT tf.*, 
             tj.name as jurisdiction_name,
             tj.code as jurisdiction_code,
             tj.country as jurisdiction_country,
             tj.level as jurisdiction_level
      FROM TaxForm tf
      JOIN TaxJurisdiction tj ON tf.jurisdictionId = tj.id
      WHERE tf.id = ${id} AND tf.tenantId = ${tenantId} AND tf.companyId = ${companyId}
      LIMIT 1
    `;
        return forms.length > 0 ? forms[0] : null;
    }
    static async update(id, tenantId, companyId, data) {
        const validatedData = UpdateTaxFormSchema.parse(data);
        let setClause = 'SET updatedAt = CURRENT_TIMESTAMP';
        if (validatedData.formData !== undefined) {
            setClause += `, formData = '${JSON.stringify(validatedData.formData)}'`;
        }
        if (validatedData.status !== undefined) {
            setClause += `, status = '${validatedData.status}'`;
        }
        if (validatedData.dueDate !== undefined) {
            setClause += `, dueDate = '${new Date(validatedData.dueDate).toISOString()}'`;
        }
        if (validatedData.extendedDueDate !== undefined) {
            setClause += `, extendedDueDate = '${new Date(validatedData.extendedDueDate).toISOString()}'`;
        }
        await prisma.$executeRaw `
      UPDATE TaxForm 
      ${setClause}
      WHERE id = ${id} AND tenantId = ${tenantId} AND companyId = ${companyId}
    `;
        return await this.getById(id, tenantId, companyId);
    }
    static async generateForm(tenantId, companyId, formCode, taxYear, jurisdictionId) {
        // Get company financial data for the tax year
        const company = await prisma.company.findFirst({
            where: { id: companyId, tenantId },
        });
        if (!company) {
            throw new Error('Company not found');
        }
        // Calculate tax year period
        const yearStart = new Date(taxYear, 0, 1);
        const yearEnd = new Date(taxYear, 11, 31);
        // Get financial data
        const [revenues, expenses, assets, liabilities] = await Promise.all([
            this.getRevenueData(tenantId, companyId, yearStart, yearEnd),
            this.getExpenseData(tenantId, companyId, yearStart, yearEnd),
            this.getAssetData(tenantId, companyId, yearEnd),
            this.getLiabilityData(tenantId, companyId, yearEnd),
        ]);
        // Generate form data based on template
        const template = TaxFormTemplates[formCode];
        if (!template) {
            throw new Error(`Tax form template not found for code: ${formCode}`);
        }
        const formData = await this.generateFormData(formCode, {
            company,
            revenues,
            expenses,
            assets,
            liabilities,
            taxYear,
        });
        return {
            template,
            formData,
            summary: {
                totalRevenue: revenues.total,
                totalExpenses: expenses.total,
                netIncome: revenues.total - expenses.total,
                totalAssets: assets.total,
                totalLiabilities: liabilities.total,
            },
        };
    }
    static async getRevenueData(tenantId, companyId, startDate, endDate) {
        // Get revenue account types first
        const revenueAccountTypes = await prisma.accountType.findMany({
            where: {
                tenantId,
                companyId,
                code: 'REVENUE',
            },
        });
        if (revenueAccountTypes.length === 0) {
            return { accounts: [], total: 0 };
        }
        const revenueAccounts = await prisma.account.findMany({
            where: {
                tenantId,
                companyId,
                typeId: {
                    in: revenueAccountTypes.map(type => type.id),
                },
            },
            include: {
                journalLines: {
                    where: {
                        entry: {
                            date: {
                                gte: startDate,
                                lte: endDate,
                            },
                        },
                    },
                },
            },
        });
        const total = revenueAccounts.reduce((sum, account) => {
            const accountTotal = account.journalLines.reduce((lineSum, line) => {
                return lineSum + (Number(line.credit) - Number(line.debit));
            }, 0);
            return sum + accountTotal;
        }, 0);
        return { accounts: revenueAccounts, total };
    }
    static async getExpenseData(tenantId, companyId, startDate, endDate) {
        // Get expense account types first
        const expenseAccountTypes = await prisma.accountType.findMany({
            where: {
                tenantId,
                companyId,
                code: 'EXPENSE',
            },
        });
        if (expenseAccountTypes.length === 0) {
            return { accounts: [], total: 0 };
        }
        const expenseAccounts = await prisma.account.findMany({
            where: {
                tenantId,
                companyId,
                typeId: {
                    in: expenseAccountTypes.map(type => type.id),
                },
            },
            include: {
                journalLines: {
                    where: {
                        entry: {
                            date: {
                                gte: startDate,
                                lte: endDate,
                            },
                        },
                    },
                },
            },
        });
        const total = expenseAccounts.reduce((sum, account) => {
            const accountTotal = account.journalLines.reduce((lineSum, line) => {
                return lineSum + (Number(line.debit) - Number(line.credit));
            }, 0);
            return sum + accountTotal;
        }, 0);
        return { accounts: expenseAccounts, total };
    }
    static async getAssetData(tenantId, companyId, asOfDate) {
        // Get asset account types first
        const assetAccountTypes = await prisma.accountType.findMany({
            where: {
                tenantId,
                companyId,
                code: 'ASSET',
            },
        });
        if (assetAccountTypes.length === 0) {
            return { accounts: [], total: 0 };
        }
        const assetAccounts = await prisma.account.findMany({
            where: {
                tenantId,
                companyId,
                typeId: {
                    in: assetAccountTypes.map(type => type.id),
                },
            },
            include: {
                journalLines: {
                    where: {
                        entry: {
                            date: {
                                lte: asOfDate,
                            },
                        },
                    },
                },
            },
        });
        const total = assetAccounts.reduce((sum, account) => {
            const accountTotal = account.journalLines.reduce((lineSum, line) => {
                return lineSum + (Number(line.debit) - Number(line.credit));
            }, 0);
            return sum + accountTotal;
        }, 0);
        return { accounts: assetAccounts, total };
    }
    static async getLiabilityData(tenantId, companyId, asOfDate) {
        // Get liability and equity account types
        const liabilityAccountTypes = await prisma.accountType.findMany({
            where: {
                tenantId,
                companyId,
                code: {
                    in: ['LIABILITY', 'EQUITY'],
                },
            },
        });
        if (liabilityAccountTypes.length === 0) {
            return { accounts: [], total: 0 };
        }
        const liabilityAccounts = await prisma.account.findMany({
            where: {
                tenantId,
                companyId,
                typeId: {
                    in: liabilityAccountTypes.map(type => type.id),
                },
            },
            include: {
                journalLines: {
                    where: {
                        entry: {
                            date: {
                                lte: asOfDate,
                            },
                        },
                    },
                },
            },
        });
        const total = liabilityAccounts.reduce((sum, account) => {
            const accountTotal = account.journalLines.reduce((lineSum, line) => {
                return lineSum + (Number(line.credit) - Number(line.debit));
            }, 0);
            return sum + accountTotal;
        }, 0);
        return { accounts: liabilityAccounts, total };
    }
    static async generateFormData(formCode, data) {
        const { company, revenues, expenses, assets, liabilities, taxYear } = data;
        const netIncome = revenues.total - expenses.total;
        switch (formCode) {
            case 'US-1120': // Corporation Income Tax Return
                return {
                    gross_receipts: revenues.total,
                    total_income: revenues.total,
                    total_deductions: expenses.total,
                    taxable_income: Math.max(0, netIncome),
                    tax_liability: await this.calculateCorporateTax(netIncome, 'US'),
                    payments: 0, // To be filled manually or from payment records
                    balance_due: 0, // Calculated after payments
                };
            case 'CA-T2': // Canadian Corporation Tax
                return {
                    gross_revenue: revenues.total,
                    net_income: netIncome,
                    taxable_income: Math.max(0, netIncome),
                    federal_tax: await this.calculateCorporateTax(netIncome, 'CA'),
                    provincial_tax: 0, // Province-specific calculation needed
                };
            case 'UK-CT600': // UK Corporation Tax
                return {
                    turnover: revenues.total,
                    total_profits: Math.max(0, netIncome),
                    tax_payable: await this.calculateCorporateTax(netIncome, 'UK'),
                };
            case 'UK-VAT100': // UK VAT Return
                const vatData = await this.calculateVATData(company.id, taxYear);
                return vatData;
            default:
                return {};
        }
    }
    static async calculateCorporateTax(income, country) {
        // Simplified tax calculation - should use actual tax rates and brackets
        const taxRates = {
            'US': 0.21, // Federal corporate tax rate
            'CA': 0.15, // Federal rate (provinces add their own)
            'UK': 0.19, // Corporation tax rate
        };
        const rate = taxRates[country] || 0.21;
        return Math.max(0, income * rate);
    }
    static async calculateVATData(companyId, taxYear) {
        // This would integrate with VAT-specific calculations
        // For now, return placeholder data
        return {
            vat_due_on_sales: 0,
            vat_due_on_acquisitions: 0,
            total_vat_due: 0,
            vat_reclaimed: 0,
            net_vat_due: 0,
            total_value_sales: 0,
            total_value_purchases: 0,
        };
    }
    static async submitForm(id, tenantId, companyId) {
        const forms = await prisma.$queryRaw `
      SELECT * FROM TaxForm 
      WHERE id = ${id} AND tenantId = ${tenantId} AND companyId = ${companyId}
      LIMIT 1
    `;
        if (forms.length === 0) {
            throw new Error('Tax form not found');
        }
        const form = forms[0];
        if (form.status !== 'draft') {
            throw new Error('Only draft forms can be submitted');
        }
        // Validate form data
        const template = TaxFormTemplates[form.formCode];
        const validationErrors = this.validateFormData(form.formData, template);
        if (validationErrors.length > 0) {
            throw new Error(`Form validation failed: ${validationErrors.join(', ')}`);
        }
        // Create submission record
        const submissionId = Math.random().toString(36).substring(2, 15);
        await prisma.$executeRaw `
      INSERT INTO TaxSubmission (
        id, tenantId, companyId, formId, status, submittedAt, createdAt, updatedAt
      ) VALUES (
        ${submissionId}, ${tenantId}, ${companyId}, ${id}, ${'pending'}, 
        ${new Date()}, ${new Date()}, ${new Date()}
      )
    `;
        // Update form status
        await prisma.$executeRaw `
      UPDATE TaxForm 
      SET status = ${'submitted'}, submittedAt = ${new Date()}, updatedAt = ${new Date()}
      WHERE id = ${id}
    `;
        // In a real implementation, this would integrate with tax authority APIs
        // For now, simulate the submission process
        setTimeout(async () => {
            await this.processSubmission(submissionId);
        }, 5000);
        const submissions = await prisma.$queryRaw `
      SELECT * FROM TaxSubmission WHERE id = ${submissionId}
    `;
        return submissions[0];
    }
    static validateFormData(formData, template) {
        const errors = [];
        for (const field of template.fields) {
            if (field.required && (!formData[field.name] && formData[field.name] !== 0)) {
                errors.push(`${field.name} is required`);
            }
            if (field.type === 'number' && formData[field.name] && isNaN(Number(formData[field.name]))) {
                errors.push(`${field.name} must be a number`);
            }
        }
        return errors;
    }
    static async processSubmission(submissionId) {
        // Simulate processing time and result
        const success = Math.random() > 0.1; // 90% success rate
        const status = success ? 'accepted' : 'rejected';
        const acknowledgment = success ? `ACK${Date.now()}` : null;
        const response = success
            ? JSON.stringify({ message: 'Form accepted successfully' })
            : JSON.stringify({ message: 'Form rejected due to validation errors' });
        const errors = success ? null : JSON.stringify(['Invalid data in field: total_income']);
        await prisma.$executeRaw `
      UPDATE TaxSubmission 
      SET status = ${status}, 
          acknowledgment = ${acknowledgment},
          response = ${response},
          errors = ${errors},
          updatedAt = ${new Date()}
      WHERE id = ${submissionId}
    `;
        // Update form status
        const submissions = await prisma.$queryRaw `
      SELECT * FROM TaxSubmission WHERE id = ${submissionId}
    `;
        if (submissions.length > 0) {
            await prisma.$executeRaw `
        UPDATE TaxForm 
        SET status = ${status}, updatedAt = ${new Date()}
        WHERE id = ${submissions[0].formId}
      `;
        }
    }
    static async getSubmissionStatus(formId, tenantId, companyId) {
        return await prisma.$queryRaw `
      SELECT * FROM TaxSubmission
      WHERE formId = ${formId} AND tenantId = ${tenantId} AND companyId = ${companyId}
      ORDER BY submittedAt DESC
    `;
    }
    static async getAvailableTemplates() {
        return Object.entries(TaxFormTemplates).map(([code, template]) => ({
            code,
            name: template.name,
            type: template.type,
            fields: template.fields,
        }));
    }
}
