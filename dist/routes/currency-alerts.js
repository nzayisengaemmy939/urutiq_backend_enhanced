import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { asyncHandler } from '../errors.js';
import { CurrencyService } from '../services/currency-service.js';
const prisma = new PrismaClient();
const router = Router();
// Apply middleware
router.use(tenantMiddleware());
router.use(authMiddleware(process.env.JWT_SECRET || 'dev-secret'));
// GET /api/currency-alerts - Get all currency alerts for a company
router.get('/', asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) {
        return res.status(400).json({ error: 'companyId is required' });
    }
    const alerts = await prisma.currencyAlert.findMany({
        where: {
            tenantId: req.tenantId,
            companyId: companyId,
            isActive: true
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json({
        success: true,
        alerts: alerts.map(alert => ({
            id: alert.id,
            fromCurrency: alert.fromCurrency,
            toCurrency: alert.toCurrency,
            targetRate: alert.targetRate,
            condition: alert.condition,
            isActive: alert.isActive,
            createdAt: alert.createdAt,
            triggeredAt: alert.triggeredAt
        }))
    });
}));
// POST /api/currency-alerts - Create a new currency alert
router.post('/', asyncHandler(async (req, res) => {
    const { companyId, fromCurrency, toCurrency, targetRate, condition } = req.body;
    if (!companyId || !fromCurrency || !toCurrency || !targetRate || !condition) {
        return res.status(400).json({
            error: 'companyId, fromCurrency, toCurrency, targetRate, and condition are required'
        });
    }
    if (!CurrencyService.isCurrencySupported(fromCurrency) || !CurrencyService.isCurrencySupported(toCurrency)) {
        return res.status(400).json({
            error: 'Unsupported currency'
        });
    }
    if (condition !== 'above' && condition !== 'below') {
        return res.status(400).json({
            error: 'Condition must be "above" or "below"'
        });
    }
    // Get current rate to check if alert should be triggered immediately
    const currentRate = await CurrencyService.getExchangeRate(fromCurrency, toCurrency);
    const isTriggered = condition === 'above'
        ? currentRate.rate > targetRate
        : currentRate.rate < targetRate;
    const alert = await prisma.currencyAlert.create({
        data: {
            tenantId: req.tenantId,
            companyId,
            fromCurrency: fromCurrency.toUpperCase(),
            toCurrency: toCurrency.toUpperCase(),
            targetRate,
            condition,
            isActive: true,
            triggeredAt: isTriggered ? new Date() : null
        }
    });
    res.status(201).json({
        success: true,
        alert: {
            id: alert.id,
            fromCurrency: alert.fromCurrency,
            toCurrency: alert.toCurrency,
            targetRate: alert.targetRate,
            condition: alert.condition,
            isActive: alert.isActive,
            createdAt: alert.createdAt,
            triggeredAt: alert.triggeredAt,
            isTriggered
        }
    });
}));
// PUT /api/currency-alerts/:id - Update a currency alert
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetRate, condition, isActive } = req.body;
    const existingAlert = await prisma.currencyAlert.findFirst({
        where: {
            id,
            tenantId: req.tenantId
        }
    });
    if (!existingAlert) {
        return res.status(404).json({ error: 'Alert not found' });
    }
    const updateData = {};
    if (targetRate !== undefined)
        updateData.targetRate = targetRate;
    if (condition !== undefined)
        updateData.condition = condition;
    if (isActive !== undefined)
        updateData.isActive = isActive;
    // If target rate or condition changed, check if alert should be triggered
    if (targetRate !== undefined || condition !== undefined) {
        const currentRate = await CurrencyService.getExchangeRate(existingAlert.fromCurrency, existingAlert.toCurrency);
        const newCondition = condition || existingAlert.condition;
        const newTargetRate = targetRate || existingAlert.targetRate;
        const isTriggered = newCondition === 'above'
            ? currentRate.rate > newTargetRate
            : currentRate.rate < newTargetRate;
        updateData.triggeredAt = isTriggered ? new Date() : null;
    }
    const updatedAlert = await prisma.currencyAlert.update({
        where: { id },
        data: updateData
    });
    res.json({
        success: true,
        alert: {
            id: updatedAlert.id,
            fromCurrency: updatedAlert.fromCurrency,
            toCurrency: updatedAlert.toCurrency,
            targetRate: updatedAlert.targetRate,
            condition: updatedAlert.condition,
            isActive: updatedAlert.isActive,
            createdAt: updatedAlert.createdAt,
            triggeredAt: updatedAlert.triggeredAt
        }
    });
}));
// DELETE /api/currency-alerts/:id - Delete a currency alert
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existingAlert = await prisma.currencyAlert.findFirst({
        where: {
            id,
            tenantId: req.tenantId
        }
    });
    if (!existingAlert) {
        return res.status(404).json({ error: 'Alert not found' });
    }
    await prisma.currencyAlert.delete({
        where: { id }
    });
    res.json({ success: true, message: 'Alert deleted successfully' });
}));
// POST /api/currency-alerts/check - Check all alerts for triggers
router.post('/check', asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) {
        return res.status(400).json({ error: 'companyId is required' });
    }
    const alerts = await prisma.currencyAlert.findMany({
        where: {
            tenantId: req.tenantId,
            companyId: companyId,
            isActive: true
        }
    });
    const triggeredAlerts = [];
    const errors = [];
    for (const alert of alerts) {
        try {
            const currentRate = await CurrencyService.getExchangeRate(alert.fromCurrency, alert.toCurrency);
            const isTriggered = alert.condition === 'above'
                ? currentRate.rate > alert.targetRate
                : currentRate.rate < alert.targetRate;
            if (isTriggered && !alert.triggeredAt) {
                await prisma.currencyAlert.update({
                    where: { id: alert.id },
                    data: { triggeredAt: new Date() }
                });
                triggeredAlerts.push({
                    id: alert.id,
                    fromCurrency: alert.fromCurrency,
                    toCurrency: alert.toCurrency,
                    targetRate: alert.targetRate,
                    currentRate: currentRate.rate,
                    condition: alert.condition,
                    triggeredAt: new Date()
                });
            }
        }
        catch (error) {
            errors.push(`Failed to check alert ${alert.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    res.json({
        success: true,
        triggeredAlerts,
        errors,
        checked: alerts.length
    });
}));
// GET /api/currency-alerts/stats - Get alert statistics
router.get('/stats', asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) {
        return res.status(400).json({ error: 'companyId is required' });
    }
    const totalAlerts = await prisma.currencyAlert.count({
        where: {
            tenantId: req.tenantId,
            companyId: companyId
        }
    });
    const activeAlerts = await prisma.currencyAlert.count({
        where: {
            tenantId: req.tenantId,
            companyId: companyId,
            isActive: true
        }
    });
    const triggeredAlerts = await prisma.currencyAlert.count({
        where: {
            tenantId: req.tenantId,
            companyId: companyId,
            triggeredAt: { not: null }
        }
    });
    res.json({
        success: true,
        stats: {
            total: totalAlerts,
            active: activeAlerts,
            triggered: triggeredAlerts,
            pending: activeAlerts - triggeredAlerts
        }
    });
}));
export default router;
