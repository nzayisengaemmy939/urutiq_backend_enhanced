import express from 'express';
import { z } from 'zod';
import { budgetManagementService } from '../services/budget-management.service.js';
import { authMiddleware } from '../middleware/auth.js';
const router = express.Router();
// Validation schemas
const dimensionSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['DEPARTMENT', 'PROJECT', 'COST_CENTER', 'PRODUCT_LINE', 'GEOGRAPHY', 'CUSTOM']),
    isActive: z.boolean().default(true)
});
const scenarioSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(['BASE', 'OPTIMISTIC', 'PESSIMISTIC', 'SCENARIO']),
    isActive: z.boolean().default(true),
    isDefault: z.boolean().default(false)
});
const periodSchema = z.object({
    name: z.string().min(1),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodType: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
    isClosed: z.boolean().default(false),
    isCurrent: z.boolean().default(false)
});
const budgetSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    scenarioId: z.string().min(1),
    periodId: z.string().min(1),
    status: z.enum(['DRAFT', 'APPROVED', 'ACTIVE', 'CLOSED']).default('DRAFT'),
    createdBy: z.string().min(1),
    totalPlanned: z.number().default(0),
    totalActual: z.number().default(0),
    totalVariance: z.number().default(0),
    totalVariancePercent: z.number().default(0)
});
const rollingForecastSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    basePeriod: z.string().regex(/^\d{4}-\d{2}$/),
    forecastPeriods: z.number().min(1).max(60),
    frequency: z.enum(['MONTHLY', 'QUARTERLY']),
    isActive: z.boolean().default(true),
    lastUpdated: z.string().optional()
});
const budgetLineItemSchema = z.object({
    accountId: z.string().min(1),
    dimensionId: z.string().min(1),
    periodId: z.string().min(1),
    plannedAmount: z.number(),
    actualAmount: z.number().default(0),
    notes: z.string().optional()
});
// Dimension Management
router.get('/:companyId/dimensions', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const dimensions = await budgetManagementService.getDimensions(companyId);
        res.json({
            success: true,
            data: dimensions
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dimensions',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:companyId/dimensions', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const dimensionData = dimensionSchema.parse(req.body);
        const dimension = await budgetManagementService.createDimension(companyId, dimensionData);
        res.status(201).json({
            success: true,
            data: dimension
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create dimension',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/:companyId/dimensions/:dimensionId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId, dimensionId } = req.params;
        const dimensionData = dimensionSchema.parse(req.body);
        const dimension = await budgetManagementService.updateDimension(dimensionId, dimensionData);
        res.json({
            success: true,
            data: dimension
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update dimension',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/:companyId/dimensions/:dimensionId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId, dimensionId } = req.params;
        await budgetManagementService.deleteDimension(dimensionId);
        res.json({
            success: true,
            message: 'Dimension deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete dimension',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Scenario Management
router.get('/:companyId/scenarios', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const scenarios = await budgetManagementService.getScenarios(companyId);
        res.json({
            success: true,
            data: scenarios
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch scenarios',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:companyId/scenarios', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const scenarioData = scenarioSchema.parse(req.body);
        const scenario = await budgetManagementService.createScenario(companyId, scenarioData);
        res.status(201).json({
            success: true,
            data: scenario
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create scenario',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Period Management
router.get('/:companyId/periods', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { year } = req.query;
        const periods = await budgetManagementService.getPeriods(companyId, year ? parseInt(year) : undefined);
        res.json({
            success: true,
            data: periods
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch periods',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:companyId/periods', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const periodData = periodSchema.parse(req.body);
        const period = await budgetManagementService.createPeriod(companyId, periodData);
        res.status(201).json({
            success: true,
            data: period
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create period',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Budget Account Management
router.get('/:companyId/accounts', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const accounts = await budgetManagementService.getBudgetAccounts(companyId);
        res.json({
            success: true,
            data: accounts
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch budget accounts',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Budget Management
router.get('/:companyId/budgets', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, periodId } = req.query;
        const budgets = await budgetManagementService.getBudgets(companyId, status, periodId);
        res.json({
            success: true,
            data: budgets
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch budgets',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:companyId/budgets', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const budgetData = budgetSchema.parse(req.body);
        const budget = await budgetManagementService.createBudget(companyId, {
            ...budgetData,
            companyId
        });
        res.status(201).json({
            success: true,
            data: budget
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create budget',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:companyId/budgets/:budgetId/line-items', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { budgetId } = req.params;
        const lineItems = await budgetManagementService.getBudgetLineItems(budgetId);
        res.json({
            success: true,
            data: lineItems
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch budget line items',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:companyId/budgets/:budgetId/line-items', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { budgetId } = req.params;
        const lineItemData = budgetLineItemSchema.parse(req.body);
        // In a real implementation, this would create the line item
        const lineItem = {
            id: `line-${Date.now()}`,
            budgetId,
            ...lineItemData,
            variance: lineItemData.plannedAmount - lineItemData.actualAmount,
            variancePercent: lineItemData.actualAmount > 0
                ? ((lineItemData.plannedAmount - lineItemData.actualAmount) / lineItemData.actualAmount) * 100
                : 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        res.status(201).json({
            success: true,
            data: lineItem
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create budget line item',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Rolling Forecast Management
router.get('/:companyId/rolling-forecasts', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const forecasts = await budgetManagementService.getRollingForecasts(companyId);
        res.json({
            success: true,
            data: forecasts
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch rolling forecasts',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:companyId/rolling-forecasts', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const forecastData = rollingForecastSchema.parse(req.body);
        const forecast = await budgetManagementService.createRollingForecast(companyId, {
            ...forecastData,
            companyId,
            lastUpdated: forecastData.lastUpdated || new Date().toISOString()
        });
        res.status(201).json({
            success: true,
            data: forecast
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to create rolling forecast',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:companyId/rolling-forecasts/:forecastId/generate', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId, forecastId } = req.params;
        const forecastData = await budgetManagementService.generateForecast(companyId, forecastId);
        res.json({
            success: true,
            data: forecastData
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to generate forecast',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/:companyId/rolling-forecasts/:forecastId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId, forecastId } = req.params;
        const forecastData = rollingForecastSchema.parse(req.body);
        const forecast = await budgetManagementService.updateRollingForecast(forecastId, {
            ...forecastData,
            companyId,
            lastUpdated: new Date().toISOString()
        });
        res.json({
            success: true,
            data: forecast
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update rolling forecast',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/:companyId/rolling-forecasts/:forecastId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId, forecastId } = req.params;
        await budgetManagementService.deleteRollingForecast(forecastId);
        res.json({
            success: true,
            message: 'Rolling forecast deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete rolling forecast',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Variance Analysis
router.get('/:companyId/budgets/:budgetId/variances', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId, budgetId } = req.params;
        const variances = await budgetManagementService.getBudgetVariances(companyId, budgetId);
        res.json({
            success: true,
            data: variances
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch budget variances',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Budget Reports
router.get('/:companyId/reports', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { reportType, period, dimensions } = req.query;
        const report = await budgetManagementService.generateBudgetReport(companyId, reportType, period, dimensions ? dimensions.split(',') : undefined);
        res.json({
            success: true,
            data: report
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to generate budget report',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Budget Approval Workflow
router.post('/:companyId/budgets/:budgetId/approve', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { budgetId } = req.params;
        const { approvedBy } = req.body;
        const budget = await budgetManagementService.approveBudget(budgetId, approvedBy);
        res.json({
            success: true,
            data: budget,
            message: 'Budget approved successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to approve budget',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:companyId/budgets/:budgetId/activate', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { budgetId } = req.params;
        const budget = await budgetManagementService.activateBudget(budgetId);
        res.json({
            success: true,
            data: budget,
            message: 'Budget activated successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to activate budget',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Budget Copy and Templates
router.post('/:companyId/budgets/:budgetId/copy', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { budgetId } = req.params;
        const { newName, newPeriodId } = req.body;
        const budget = await budgetManagementService.copyBudget(budgetId, newName, newPeriodId);
        res.json({
            success: true,
            data: budget,
            message: 'Budget copied successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to copy budget',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Budget Performance Metrics
router.get('/:companyId/performance-metrics', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { period } = req.query;
        const metrics = await budgetManagementService.getBudgetPerformanceMetrics(companyId, period);
        res.json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch performance metrics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
export default router;
