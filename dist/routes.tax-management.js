import { Router } from 'express';
import { TaxManagementService } from './services/tax-management.service.js';
import { authMiddleware, requireRoles } from './auth.js';
import { asyncHandler, ApiError } from './errors.js';
import { z } from 'zod';
const router = Router();
// Validation schemas
const taxCalculationSchema = z.object({
    companyId: z.string().min(1),
    jurisdiction: z.string().min(1),
    taxYear: z.number().int().min(2020).max(2030),
    entityType: z.enum(['individual', 'corporation', 'partnership', 'llc']),
    income: z.number().min(0),
    deductions: z.number().min(0).default(0),
    credits: z.number().min(0).default(0),
    additionalData: z.record(z.any()).optional()
});
const taxFormSchema = z.object({
    companyId: z.string().min(1),
    formType: z.string().min(1),
    taxYear: z.number().int().min(2020).max(2030),
    jurisdiction: z.string().min(1)
});
// Calculate taxes
router.post('/tax/calculate', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const params = taxCalculationSchema.parse(req.body);
    const calculationParams = {
        tenantId: req.tenantId,
        companyId: params.companyId,
        jurisdiction: params.jurisdiction,
        taxYear: params.taxYear,
        entityType: params.entityType,
        income: params.income,
        deductions: params.deductions,
        credits: params.credits,
        additionalData: params.additionalData
    };
    const result = await TaxManagementService.calculateTaxes(calculationParams);
    res.json({
        success: true,
        data: result,
        calculatedAt: new Date().toISOString()
    });
}));
// Generate tax form
router.post('/tax/forms/generate', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const params = taxFormSchema.parse(req.body);
    const taxForm = await TaxManagementService.generateTaxForm(req.tenantId, params.companyId, params.formType, params.taxYear, params.jurisdiction);
    res.json({
        success: true,
        data: taxForm,
        generatedAt: new Date().toISOString()
    });
}));
// Submit tax form
router.post('/tax/forms/:formId/submit', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin']), asyncHandler(async (req, res) => {
    const { formId } = req.params;
    const result = await TaxManagementService.submitTaxForm(req.tenantId, formId);
    res.json({
        success: result.success,
        data: {
            formId,
            confirmationNumber: result.confirmationNumber,
            error: result.error
        },
        submittedAt: new Date().toISOString()
    });
}));
// Get tax compliance status
router.get('/tax/compliance', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, jurisdiction, taxYear } = req.query;
    if (!companyId || !jurisdiction || !taxYear) {
        throw new ApiError(400, 'MISSING_PARAMETERS', 'companyId, jurisdiction, and taxYear are required');
    }
    const complianceStatus = await TaxManagementService.getComplianceStatus(req.tenantId, companyId, jurisdiction, parseInt(taxYear));
    res.json({
        success: true,
        data: complianceStatus
    });
}));
// Get tax optimization recommendations
router.get('/tax/optimization', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, jurisdiction, taxYear } = req.query;
    if (!companyId || !jurisdiction || !taxYear) {
        throw new ApiError(400, 'MISSING_PARAMETERS', 'companyId, jurisdiction, and taxYear are required');
    }
    const recommendations = await TaxManagementService.getTaxOptimizationRecommendations(req.tenantId, companyId, jurisdiction, parseInt(taxYear));
    res.json({
        success: true,
        data: recommendations
    });
}));
// Get available tax forms
router.get('/tax/forms/available', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { jurisdiction, entityType } = req.query;
    // TODO: Implement dynamic form availability based on jurisdiction and entity type
    const availableForms = [
        {
            formType: '1120',
            formName: 'U.S. Corporation Income Tax Return',
            jurisdiction: 'US_FEDERAL',
            entityType: 'corporation',
            description: 'Annual income tax return for C corporations',
            dueDate: 'March 15',
            extensionDate: 'September 15'
        },
        {
            formType: '1040',
            formName: 'U.S. Individual Income Tax Return',
            jurisdiction: 'US_FEDERAL',
            entityType: 'individual',
            description: 'Annual income tax return for individuals',
            dueDate: 'April 15',
            extensionDate: 'October 15'
        },
        {
            formType: '1065',
            formName: 'U.S. Return of Partnership Income',
            jurisdiction: 'US_FEDERAL',
            entityType: 'partnership',
            description: 'Annual information return for partnerships',
            dueDate: 'March 15',
            extensionDate: 'September 15'
        },
        {
            formType: '1120S',
            formName: 'U.S. Income Tax Return for an S Corporation',
            jurisdiction: 'US_FEDERAL',
            entityType: 'corporation',
            description: 'Annual income tax return for S corporations',
            dueDate: 'March 15',
            extensionDate: 'September 15'
        }
    ];
    // Filter by jurisdiction and entity type if provided
    let filteredForms = availableForms;
    if (jurisdiction) {
        filteredForms = filteredForms.filter(form => form.jurisdiction === jurisdiction);
    }
    if (entityType) {
        filteredForms = filteredForms.filter(form => form.entityType === entityType);
    }
    res.json({
        success: true,
        data: filteredForms
    });
}));
// Get tax brackets for a jurisdiction
router.get('/tax/brackets', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { jurisdiction, taxYear, entityType } = req.query;
    if (!jurisdiction || !taxYear || !entityType) {
        throw new ApiError(400, 'MISSING_PARAMETERS', 'jurisdiction, taxYear, and entityType are required');
    }
    // TODO: Implement actual tax bracket lookup
    // This would integrate with tax data providers
    const sampleBrackets = [
        {
            min: 0,
            max: 11000,
            rate: 0.10,
            ratePercentage: 10
        },
        {
            min: 11000,
            max: 44725,
            rate: 0.12,
            ratePercentage: 12
        },
        {
            min: 44725,
            max: 95375,
            rate: 0.22,
            ratePercentage: 22
        },
        {
            min: 95375,
            max: 182050,
            rate: 0.24,
            ratePercentage: 24
        },
        {
            min: 182050,
            max: 231250,
            rate: 0.32,
            ratePercentage: 32
        },
        {
            min: 231250,
            max: 578125,
            rate: 0.35,
            ratePercentage: 35
        },
        {
            min: 578125,
            max: null,
            rate: 0.37,
            ratePercentage: 37
        }
    ];
    res.json({
        success: true,
        data: {
            jurisdiction,
            taxYear: parseInt(taxYear),
            entityType,
            brackets: sampleBrackets,
            lastUpdated: new Date().toISOString()
        }
    });
}));
// Get tax calendar for a company
router.get('/tax/calendar', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, year } = req.query;
    if (!companyId || !year) {
        throw new ApiError(400, 'MISSING_PARAMETERS', 'companyId and year are required');
    }
    // TODO: Implement dynamic tax calendar generation
    const taxYear = parseInt(year);
    const calendar = [
        {
            date: new Date(taxYear, 0, 31), // January 31
            event: 'W-2 Forms Due',
            description: 'Employers must provide W-2 forms to employees',
            type: 'deadline',
            priority: 'high'
        },
        {
            date: new Date(taxYear, 2, 15), // March 15
            event: 'Corporate Tax Returns Due',
            description: 'C corporations and partnerships must file tax returns',
            type: 'deadline',
            priority: 'high'
        },
        {
            date: new Date(taxYear, 3, 15), // April 15
            event: 'Individual Tax Returns Due',
            description: 'Individual taxpayers must file tax returns',
            type: 'deadline',
            priority: 'high'
        },
        {
            date: new Date(taxYear, 5, 15), // June 15
            event: 'Quarterly Estimated Tax Due',
            description: 'Second quarter estimated tax payments due',
            type: 'payment',
            priority: 'medium'
        },
        {
            date: new Date(taxYear, 8, 15), // September 15
            event: 'Quarterly Estimated Tax Due',
            description: 'Third quarter estimated tax payments due',
            type: 'payment',
            priority: 'medium'
        },
        {
            date: new Date(taxYear, 11, 15), // December 15
            event: 'Quarterly Estimated Tax Due',
            description: 'Fourth quarter estimated tax payments due',
            type: 'payment',
            priority: 'medium'
        }
    ];
    res.json({
        success: true,
        data: {
            companyId,
            year: taxYear,
            calendar,
            generatedAt: new Date().toISOString()
        }
    });
}));
// Get tax forms for a company
router.get('/tax/forms', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, taxYear, status } = req.query;
    const whereClause = {
        tenantId: req.tenantId
    };
    if (companyId) {
        whereClause.companyId = companyId;
    }
    if (taxYear) {
        whereClause.taxYear = parseInt(taxYear);
    }
    if (status) {
        whereClause.status = status;
    }
    const taxForms = await prisma.taxForm.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            formId: true,
            formName: true,
            jurisdiction: true,
            taxYear: true,
            entityType: true,
            status: true,
            filedAt: true,
            acceptedAt: true,
            rejectionReason: true,
            createdAt: true,
            updatedAt: true
        }
    });
    res.json({
        success: true,
        data: taxForms
    });
}));
// Get specific tax form
router.get('/tax/forms/:formId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { formId } = req.params;
    const taxForm = await prisma.taxForm.findUnique({
        where: { formId, tenantId: req.tenantId }
    });
    if (!taxForm) {
        throw new ApiError(404, 'TAX_FORM_NOT_FOUND', 'Tax form not found');
    }
    res.json({
        success: true,
        data: {
            ...taxForm,
            formData: JSON.parse(taxForm.formData || '{}')
        }
    });
}));
export default router;
