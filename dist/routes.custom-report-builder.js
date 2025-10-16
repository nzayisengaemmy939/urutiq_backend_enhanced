import { Router } from 'express';
import { CustomReportBuilderService } from './services/custom-report-builder.service';
import { authMiddleware, requireRoles } from './auth';
import { asyncHandler, ApiError } from './errors';
import { z } from 'zod';
import { prisma } from './prisma';
const router = Router();
// Validation schemas
const createTemplateSchema = z.object({
    companyId: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    category: z.string().min(1),
    isPublic: z.boolean().default(false),
    layout: z.object({
        sections: z.array(z.object({
            id: z.string(),
            type: z.enum(['header', 'data', 'summary', 'chart', 'text', 'image']),
            title: z.string().optional(),
            position: z.object({
                x: z.number(),
                y: z.number(),
                width: z.number(),
                height: z.number()
            }),
            dataFields: z.array(z.object({
                id: z.string(),
                name: z.string(),
                type: z.enum(['account', 'calculation', 'text', 'date', 'number', 'currency']),
                source: z.string(),
                formula: z.string().optional(),
                format: z.object({
                    type: z.enum(['currency', 'percentage', 'number', 'date', 'text']),
                    currency: z.string().optional(),
                    decimalPlaces: z.number().optional(),
                    thousandSeparator: z.boolean().optional(),
                    dateFormat: z.string().optional()
                }).optional(),
                aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max']).optional(),
                grouping: z.string().optional()
            })),
            styling: z.object({
                backgroundColor: z.string().optional(),
                textColor: z.string().optional(),
                fontSize: z.number().optional(),
                fontWeight: z.enum(['normal', 'bold']).optional(),
                textAlign: z.enum(['left', 'center', 'right']).optional(),
                padding: z.object({
                    top: z.number(),
                    right: z.number(),
                    bottom: z.number(),
                    left: z.number()
                }).optional()
            }),
            conditions: z.array(z.object({
                field: z.string(),
                operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than']),
                value: z.any(),
                action: z.enum(['show', 'hide', 'highlight']),
                styling: z.object({
                    backgroundColor: z.string().optional(),
                    textColor: z.string().optional(),
                    fontSize: z.number().optional(),
                    fontWeight: z.enum(['normal', 'bold']).optional(),
                    textAlign: z.enum(['left', 'center', 'right']).optional()
                }).optional()
            })).optional()
        })),
        pageSize: z.enum(['A4', 'Letter', 'Legal']),
        orientation: z.enum(['portrait', 'landscape']),
        margins: z.object({
            top: z.number(),
            right: z.number(),
            bottom: z.number(),
            left: z.number()
        }),
        header: z.object({
            enabled: z.boolean(),
            content: z.string(),
            height: z.number(),
            styling: z.object({
                backgroundColor: z.string().optional(),
                textColor: z.string().optional(),
                fontSize: z.number().optional(),
                fontWeight: z.enum(['normal', 'bold']).optional(),
                textAlign: z.enum(['left', 'center', 'right']).optional()
            })
        }),
        footer: z.object({
            enabled: z.boolean(),
            content: z.string(),
            height: z.number(),
            styling: z.object({
                backgroundColor: z.string().optional(),
                textColor: z.string().optional(),
                fontSize: z.number().optional(),
                fontWeight: z.enum(['normal', 'bold']).optional(),
                textAlign: z.enum(['left', 'center', 'right']).optional()
            })
        })
    }),
    dataSource: z.object({
        type: z.enum(['accounts', 'transactions', 'journal_entries', 'custom_query']),
        query: z.string().optional(),
        parameters: z.record(z.any()).optional(),
        dateRange: z.object({
            startDate: z.string().datetime(),
            endDate: z.string().datetime(),
            comparisonPeriod: z.enum(['previous', 'year_ago', 'custom']).optional(),
            customStartDate: z.string().datetime().optional(),
            customEndDate: z.string().datetime().optional()
        })
    }),
    filters: z.array(z.object({
        id: z.string(),
        field: z.string(),
        operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'between', 'in', 'not_in']),
        value: z.any(),
        valueType: z.enum(['string', 'number', 'date', 'boolean', 'array'])
    })),
    calculations: z.array(z.object({
        id: z.string(),
        name: z.string(),
        formula: z.string(),
        resultType: z.enum(['number', 'currency', 'percentage', 'text']),
        dependencies: z.array(z.string())
    })),
    formatting: z.object({
        font: z.object({
            family: z.string(),
            size: z.number(),
            color: z.string(),
            weight: z.enum(['normal', 'bold', 'italic'])
        }),
        colors: z.object({
            primary: z.string(),
            secondary: z.string(),
            accent: z.string(),
            background: z.string()
        }),
        borders: z.object({
            enabled: z.boolean(),
            style: z.enum(['solid', 'dashed', 'dotted']),
            width: z.number(),
            color: z.string()
        })
    })
});
const updateTemplateSchema = createTemplateSchema.partial();
// Create report template
router.post('/reports/templates', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const templateData = createTemplateSchema.parse(req.body);
    // Convert date strings to Date objects
    const processedTemplate = {
        ...templateData,
        dataSource: {
            ...templateData.dataSource,
            dateRange: {
                ...templateData.dataSource.dateRange,
                startDate: new Date(templateData.dataSource.dateRange.startDate),
                endDate: new Date(templateData.dataSource.dateRange.endDate),
                customStartDate: templateData.dataSource.dateRange.customStartDate ?
                    new Date(templateData.dataSource.dateRange.customStartDate) : undefined,
                customEndDate: templateData.dataSource.dateRange.customEndDate ?
                    new Date(templateData.dataSource.dateRange.customEndDate) : undefined
            }
        },
        createdBy: req.user.id
    };
    const template = await CustomReportBuilderService.createReportTemplate(req.tenantId, templateData.companyId, processedTemplate);
    res.json({
        success: true,
        data: template,
        message: 'Report template created successfully'
    });
}));
// Get report templates
router.get('/reports/templates', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant', 'viewer']), asyncHandler(async (req, res) => {
    const { companyId, category, isPublic } = req.query;
    const templates = await CustomReportBuilderService.getReportTemplates(req.tenantId, companyId, category, isPublic === 'true' ? true : isPublic === 'false' ? false : undefined);
    res.json({
        success: true,
        data: templates
    });
}));
// Get specific report template
router.get('/reports/templates/:templateId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant', 'viewer']), asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const templates = await CustomReportBuilderService.getReportTemplates(req.tenantId);
    const template = templates.find(t => t.id === templateId);
    if (!template) {
        throw new ApiError(404, 'TEMPLATE_NOT_FOUND', 'Report template not found');
    }
    res.json({
        success: true,
        data: template
    });
}));
// Update report template
router.put('/reports/templates/:templateId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const updates = updateTemplateSchema.parse(req.body);
    // Convert date strings to Date objects if present
    if (updates.dataSource?.dateRange) {
        updates.dataSource.dateRange.startDate = new Date(updates.dataSource.dateRange.startDate);
        updates.dataSource.dateRange.endDate = new Date(updates.dataSource.dateRange.endDate);
        if (updates.dataSource.dateRange.customStartDate) {
            updates.dataSource.dateRange.customStartDate = new Date(updates.dataSource.dateRange.customStartDate);
        }
        if (updates.dataSource.dateRange.customEndDate) {
            updates.dataSource.dateRange.customEndDate = new Date(updates.dataSource.dateRange.customEndDate);
        }
    }
    const template = await CustomReportBuilderService.updateReportTemplate(req.tenantId, templateId, updates);
    res.json({
        success: true,
        data: template,
        message: 'Report template updated successfully'
    });
}));
// Delete report template
router.delete('/reports/templates/:templateId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin']), asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    // Check if template exists and user has permission
    const templates = await CustomReportBuilderService.getReportTemplates(req.tenantId);
    const template = templates.find(t => t.id === templateId);
    if (!template) {
        throw new ApiError(404, 'TEMPLATE_NOT_FOUND', 'Report template not found');
    }
    // Delete from database
    await prisma.reportTemplate.delete({
        where: { id: templateId, tenantId: req.tenantId }
    });
    res.json({
        success: true,
        message: 'Report template deleted successfully'
    });
}));
// Execute report template
router.post('/reports/templates/:templateId/execute', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant', 'viewer']), asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const { parameters } = req.body;
    const result = await CustomReportBuilderService.executeReportTemplate(req.tenantId, templateId, parameters);
    res.json({
        success: true,
        data: result,
        message: 'Report executed successfully'
    });
}));
// Get available data fields
router.get('/reports/data-fields', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, dataSourceType } = req.query;
    if (!companyId || !dataSourceType) {
        throw new ApiError(400, 'MISSING_PARAMETERS', 'companyId and dataSourceType are required');
    }
    const fields = await CustomReportBuilderService.getAvailableDataFields(req.tenantId, companyId, dataSourceType);
    res.json({
        success: true,
        data: fields
    });
}));
// Get predefined templates
router.get('/reports/templates/predefined', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant', 'viewer']), asyncHandler(async (req, res) => {
    const templates = CustomReportBuilderService.getPredefinedTemplates();
    res.json({
        success: true,
        data: templates
    });
}));
// Schedule report execution
router.post('/reports/schedules', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin']), asyncHandler(async (req, res) => {
    const scheduleSchema = z.object({
        templateId: z.string().min(1),
        name: z.string().min(1),
        frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
        cronExpression: z.string().min(1),
        recipients: z.array(z.string().email()),
        isActive: z.boolean().default(true),
        nextRun: z.string().datetime()
    });
    const scheduleData = scheduleSchema.parse(req.body);
    const schedule = await CustomReportBuilderService.scheduleReport(req.tenantId, scheduleData.templateId, {
        ...scheduleData,
        nextRun: new Date(scheduleData.nextRun),
        lastRun: undefined
    });
    res.json({
        success: true,
        data: schedule,
        message: 'Report schedule created successfully'
    });
}));
// Get report schedules
router.get('/reports/schedules', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { templateId, isActive } = req.query;
    const whereClause = { tenantId: req.tenantId };
    if (templateId) {
        whereClause.templateId = templateId;
    }
    if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
    }
    const schedules = await prisma.reportSchedule.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            templateId: true,
            name: true,
            frequency: true,
            cronExpression: true,
            recipients: true,
            isActive: true,
            lastRun: true,
            nextRun: true,
            createdAt: true
        }
    });
    const processedSchedules = schedules.map(schedule => ({
        ...schedule,
        recipients: JSON.parse(schedule.recipients || '[]')
    }));
    res.json({
        success: true,
        data: processedSchedules
    });
}));
// Update report schedule
router.put('/reports/schedules/:scheduleId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin']), asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const updateSchema = z.object({
        name: z.string().min(1).optional(),
        frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
        cronExpression: z.string().min(1).optional(),
        recipients: z.array(z.string().email()).optional(),
        isActive: z.boolean().optional(),
        nextRun: z.string().datetime().optional()
    });
    const updates = updateSchema.parse(req.body);
    const updateData = {};
    if (updates.name)
        updateData.name = updates.name;
    if (updates.frequency)
        updateData.frequency = updates.frequency;
    if (updates.cronExpression)
        updateData.cronExpression = updates.cronExpression;
    if (updates.recipients)
        updateData.recipients = JSON.stringify(updates.recipients);
    if (updates.isActive !== undefined)
        updateData.isActive = updates.isActive;
    if (updates.nextRun)
        updateData.nextRun = new Date(updates.nextRun);
    await prisma.reportSchedule.update({
        where: { id: scheduleId, tenantId: req.tenantId },
        data: updateData
    });
    res.json({
        success: true,
        message: 'Report schedule updated successfully'
    });
}));
// Delete report schedule
router.delete('/reports/schedules/:scheduleId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin']), asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    await prisma.reportSchedule.delete({
        where: { id: scheduleId, tenantId: req.tenantId }
    });
    res.json({
        success: true,
        message: 'Report schedule deleted successfully'
    });
}));
// Get report execution history
router.get('/custom-reports/executions', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { templateId, status, limit = 50 } = req.query;
    const whereClause = { tenantId: req.tenantId };
    if (templateId) {
        whereClause.templateId = templateId;
    }
    if (status) {
        whereClause.status = status;
    }
    const executions = await prisma.reportExecution.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        select: {
            id: true,
            templateId: true,
            status: true,
            generatedAt: true,
            executionTime: true,
            error: true,
            createdAt: true
        }
    });
    res.json({
        success: true,
        data: executions
    });
}));
// Get specific report execution result
router.get('/custom-reports/executions/:executionId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant', 'viewer']), asyncHandler(async (req, res) => {
    const { executionId } = req.params;
    const execution = await prisma.reportExecution.findUnique({
        where: { id: executionId, tenantId: req.tenantId }
    });
    if (!execution) {
        throw new ApiError(404, 'EXECUTION_NOT_FOUND', 'Report execution not found');
    }
    res.json({
        success: true,
        data: {
            ...execution,
            data: execution.data ? JSON.parse(execution.data) : null
        }
    });
}));
export default router;
