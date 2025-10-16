import express from 'express';
import { z } from 'zod';
import { taxCalculationService } from '../services/tax-calculation.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
const router = express.Router();
// Validation schemas
const taxCalculationSchema = z.object({
    jurisdictionId: z.string(),
    taxableAmount: z.number().min(0),
    exemptions: z.array(z.string()).optional().default([]),
    period: z.string().regex(/^\d{4}-\d{2}$/).optional()
});
const multiJurisdictionSchema = z.object({
    calculations: z.array(z.object({
        jurisdictionId: z.string(),
        taxableAmount: z.number().min(0),
        exemptions: z.array(z.string()).optional().default([])
    })),
    period: z.string().regex(/^\d{4}-\d{2}$/).optional()
});
const taxFormSchema = z.object({
    formId: z.string(),
    period: z.string(),
    data: z.record(z.string(), z.any()).optional().default({})
});
const taxReturnSchema = z.object({
    formId: z.string(),
    period: z.string(),
    data: z.record(z.string(), z.any()).optional().default({})
});
const auth = authMiddleware(process.env.JWT_SECRET || 'dev-secret');
const tenant = tenantMiddleware();
// Tax Jurisdictions
router.get('/tax-calculation/:companyId/jurisdictions', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { taxType } = req.query;
        const jurisdictions = await taxCalculationService.getJurisdictions(companyId, taxType);
        res.json({
            success: true,
            data: jurisdictions
        });
    }
    catch (error) {
        console.error('Error fetching tax jurisdictions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tax jurisdictions',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/tax-calculation/:companyId/jurisdictions', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const jurisdictionData = req.body;
        const jurisdiction = await taxCalculationService.createJurisdiction(companyId, jurisdictionData);
        res.status(201).json({
            success: true,
            data: jurisdiction
        });
    }
    catch (error) {
        console.error('Error creating tax jurisdiction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create tax jurisdiction',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Seed demo jurisdictions for a company (idempotent demo behavior)
router.post('/tax-calculation/:companyId/jurisdictions/seed', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        // For demo purposes, just return the current demo jurisdictions set
        const jurisdictions = await taxCalculationService.getJurisdictions(companyId);
        res.status(201).json({ success: true, data: jurisdictions, message: 'Demo jurisdictions ready' });
    }
    catch (error) {
        console.error('Error seeding tax jurisdictions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to seed tax jurisdictions',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Tax Calculations
router.post('/tax-calculation/:companyId/calculate', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { jurisdictionId, taxableAmount, exemptions, period } = taxCalculationSchema.parse(req.body);
        const calculation = await taxCalculationService.calculateTax(companyId, jurisdictionId, taxableAmount, exemptions, period);
        res.json({
            success: true,
            data: calculation
        });
    }
    catch (error) {
        console.error('Error calculating tax:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate tax',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/tax-calculation/:companyId/calculate-multi', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { calculations, period } = multiJurisdictionSchema.parse(req.body);
        const results = await taxCalculationService.calculateMultiJurisdictionTax(companyId, calculations, period);
        res.json({
            success: true,
            data: results
        });
    }
    catch (error) {
        console.error('Error calculating multi-jurisdiction tax:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate multi-jurisdiction tax',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Tax Forms
router.get('/tax-calculation/:companyId/forms', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { taxType, jurisdiction } = req.query;
        const forms = await taxCalculationService.getTaxForms(companyId, taxType, jurisdiction);
        res.json({
            success: true,
            data: forms
        });
    }
    catch (error) {
        console.error('Error fetching tax forms:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tax forms',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/tax-calculation/:companyId/forms/generate', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { formId, period, data } = taxFormSchema.parse(req.body);
        const form = await taxCalculationService.generateTaxForm(companyId, formId, period, data);
        res.json({
            success: true,
            data: form
        });
    }
    catch (error) {
        console.error('Error generating tax form:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate tax form',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Seed demo tax forms
router.post('/tax-calculation/:companyId/forms/seed', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const forms = await taxCalculationService.getTaxForms(companyId);
        res.status(201).json({ success: true, data: forms, message: 'Demo tax forms ready' });
    }
    catch (error) {
        console.error('Error seeding tax forms:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to seed tax forms',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Tax Returns
router.get('/tax-calculation/:companyId/returns', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status } = req.query;
        const returns = await taxCalculationService.getTaxReturns(companyId, status);
        res.json({
            success: true,
            data: returns
        });
    }
    catch (error) {
        console.error('Error fetching tax returns:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tax returns',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/tax-calculation/:companyId/returns', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { formId, period, data } = taxReturnSchema.parse(req.body);
        const taxReturn = await taxCalculationService.createTaxReturn(companyId, formId, period, data);
        res.status(201).json({
            success: true,
            data: taxReturn
        });
    }
    catch (error) {
        console.error('Error creating tax return:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create tax return',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Seed demo tax returns
router.post('/tax-calculation/:companyId/returns/seed', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const returns = await taxCalculationService.getTaxReturns(companyId);
        res.status(201).json({ success: true, data: returns, message: 'Demo tax returns ready' });
    }
    catch (error) {
        console.error('Error seeding tax returns:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to seed tax returns',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/tax-calculation/returns/:id', auth, tenant, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const taxReturn = await taxCalculationService.updateTaxReturn(id, updateData);
        res.json({
            success: true,
            data: taxReturn
        });
    }
    catch (error) {
        console.error('Error updating tax return:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update tax return',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/tax-calculation/returns/:id/file', auth, tenant, async (req, res) => {
    try {
        const { id } = req.params;
        const taxReturn = await taxCalculationService.fileTaxReturn(id);
        res.json({
            success: true,
            data: taxReturn,
            message: 'Tax return filed successfully'
        });
    }
    catch (error) {
        console.error('Error filing tax return:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to file tax return',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Tax Calendar
router.get('/tax-calculation/:companyId/calendar', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { year } = req.query;
        const calendar = await taxCalculationService.getTaxCalendar(companyId, year ? parseInt(year) : undefined);
        res.json({
            success: true,
            data: calendar
        });
    }
    catch (error) {
        console.error('Error fetching tax calendar:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tax calendar',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Tax Optimization Suggestions
router.get('/tax-calculation/:companyId/optimization', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { period } = req.query;
        // In a real implementation, this would analyze company data and provide optimization suggestions
        const suggestions = [
            {
                category: 'DEDUCTIONS',
                title: 'Maximize Business Deductions',
                description: 'Consider accelerating deductible expenses before year-end',
                potentialSavings: 5000,
                priority: 'HIGH'
            },
            {
                category: 'DEPRECIATION',
                title: 'Section 179 Deduction',
                description: 'Consider taking advantage of Section 179 for equipment purchases',
                potentialSavings: 15000,
                priority: 'MEDIUM'
            },
            {
                category: 'RETIREMENT',
                title: 'Retirement Plan Contributions',
                description: 'Maximize retirement plan contributions to reduce taxable income',
                potentialSavings: 8000,
                priority: 'HIGH'
            }
        ];
        res.json({
            success: true,
            data: suggestions
        });
    }
    catch (error) {
        console.error('Error fetching tax optimization suggestions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tax optimization suggestions',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Seed minimal ledger (real DB data) for a company and period
router.post('/tax-calculation/:companyId/seed-ledger', auth, tenant, async (req, res) => {
    try {
        const { companyId } = req.params;
        const tenantId = req.tenantId || 'tenant_demo';
        const { year, month } = req.body || {};
        const result = await taxCalculationService.seedMinimalLedger(tenantId, companyId, year && month ? { year: Number(year), month: Number(month) } : undefined);
        res.status(201).json({ success: true, data: result, message: 'Ledger seeded' });
    }
    catch (error) {
        console.error('Error seeding ledger:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to seed ledger',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
export default router;
