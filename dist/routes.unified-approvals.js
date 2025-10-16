import { prisma } from './prisma';
import { validateBody } from './validate';
import { z } from 'zod';
import { UnifiedApprovalEngine } from './services/unified-approval-engine.service';
// ==================== VALIDATION SCHEMAS ====================
const approvalSchemas = {
    // Workflow creation
    workflowCreate: z.object({
        name: z.string().min(1, 'Workflow name is required'),
        description: z.string().optional(),
        entityType: z.enum(['journal_entry', 'invoice', 'purchase_order', 'expense', 'bill', 'document', 'recurring_invoice']),
        entitySubType: z.string().optional(),
        isActive: z.boolean().default(true),
        companyId: z.string().min(1, 'Company ID is required'),
        steps: z.array(z.object({
            id: z.string(),
            name: z.string(),
            approverType: z.enum(['user', 'role', 'department', 'amount_based']),
            approverId: z.string().optional(),
            role: z.string().optional(),
            department: z.string().optional(),
            amountThreshold: z.number().optional(),
            isRequired: z.boolean().default(true),
            order: z.number().int().min(1),
            escalationHours: z.number().optional(),
            autoApprove: z.boolean().default(false),
            conditions: z.array(z.object({
                field: z.string(),
                operator: z.enum(['equals', 'greater_than', 'less_than', 'contains', 'in']),
                value: z.any(),
                logicalOperator: z.enum(['AND', 'OR']).optional()
            })).optional()
        })),
        conditions: z.array(z.object({
            field: z.string(),
            operator: z.enum(['equals', 'greater_than', 'less_than', 'contains', 'in']),
            value: z.any(),
            logicalOperator: z.enum(['AND', 'OR']).optional()
        })).default([]),
        autoApproval: z.boolean().default(false),
        escalationRules: z.array(z.object({
            stepId: z.string(),
            escalationHours: z.number(),
            escalateTo: z.enum(['manager', 'director', 'ceo', 'specific_user']),
            escalateToUserId: z.string().optional(),
            notificationChannels: z.array(z.enum(['email', 'sms', 'slack', 'teams']))
        })).default([]),
        priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
    }),
    // Approval request creation
    approvalRequestCreate: z.object({
        entityType: z.enum(['journal_entry', 'invoice', 'purchase_order', 'expense', 'bill', 'document', 'recurring_invoice']),
        entityId: z.string().min(1, 'Entity ID is required'),
        entitySubType: z.string().optional(),
        metadata: z.record(z.any()).optional(),
        companyId: z.string().min(1, 'Company ID is required')
    }),
    // Approval action
    approvalAction: z.object({
        action: z.enum(['approve', 'reject', 'escalate']),
        comments: z.string().optional(),
        escalationReason: z.string().optional()
    }),
    // Workflow update
    workflowUpdate: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        steps: z.array(z.object({
            id: z.string(),
            name: z.string(),
            approverType: z.enum(['user', 'role', 'department', 'amount_based']),
            approverId: z.string().optional(),
            role: z.string().optional(),
            department: z.string().optional(),
            amountThreshold: z.number().optional(),
            isRequired: z.boolean().default(true),
            order: z.number().int().min(1),
            escalationHours: z.number().optional(),
            autoApprove: z.boolean().default(false),
            conditions: z.array(z.object({
                field: z.string(),
                operator: z.enum(['equals', 'greater_than', 'less_than', 'contains', 'in']),
                value: z.any(),
                logicalOperator: z.enum(['AND', 'OR']).optional()
            })).optional()
        })).optional(),
        conditions: z.array(z.object({
            field: z.string(),
            operator: z.enum(['equals', 'greater_than', 'less_than', 'contains', 'in']),
            value: z.any(),
            logicalOperator: z.enum(['AND', 'OR']).optional()
        })).optional(),
        autoApproval: z.boolean().optional(),
        escalationRules: z.array(z.object({
            stepId: z.string(),
            escalationHours: z.number(),
            escalateTo: z.enum(['manager', 'director', 'ceo', 'specific_user']),
            escalateToUserId: z.string().optional(),
            notificationChannels: z.array(z.enum(['email', 'sms', 'slack', 'teams']))
        })).optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional()
    })
};
// ==================== ROUTE HANDLERS ====================
export function mountUnifiedApprovalRoutes(router) {
    // ==================== WORKFLOW MANAGEMENT ====================
    // Get all approval workflows
    router.get('/approval-workflows', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            const entityType = req.query.entityType;
            const entitySubType = req.query.entitySubType;
            const isActive = req.query.isActive === 'true';
            const workflows = await prisma.unifiedApprovalWorkflow.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId: companyId || undefined,
                    entityType: entityType || undefined,
                    entitySubType: entitySubType || undefined,
                    isActive: isActive ? true : undefined
                },
                orderBy: [
                    { priority: 'desc' },
                    { name: 'asc' }
                ]
            });
            const formattedWorkflows = workflows.map(w => ({
                id: w.id,
                name: w.name,
                description: w.description,
                entityType: w.entityType,
                entitySubType: w.entitySubType,
                isActive: w.isActive,
                steps: JSON.parse(w.steps),
                conditions: JSON.parse(w.conditions || '[]'),
                autoApproval: w.autoApproval,
                escalationRules: JSON.parse(w.escalationRules || '[]'),
                priority: w.priority,
                companyId: w.companyId,
                createdAt: w.createdAt,
                updatedAt: w.updatedAt
            }));
            res.json({ workflows: formattedWorkflows });
        }
        catch (error) {
            console.error('Error fetching approval workflows:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch workflows' });
        }
    });
    // Get workflow by ID
    router.get('/approval-workflows/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const workflow = await prisma.unifiedApprovalWorkflow.findFirst({
                where: { id, tenantId: req.tenantId }
            });
            if (!workflow) {
                return res.status(404).json({ error: 'not_found', message: 'Workflow not found' });
            }
            const formattedWorkflow = {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                entityType: workflow.entityType,
                entitySubType: workflow.entitySubType,
                isActive: workflow.isActive,
                steps: JSON.parse(workflow.steps),
                conditions: JSON.parse(workflow.conditions || '[]'),
                autoApproval: workflow.autoApproval,
                escalationRules: JSON.parse(workflow.escalationRules || '[]'),
                priority: workflow.priority,
                companyId: workflow.companyId,
                createdAt: workflow.createdAt,
                updatedAt: workflow.updatedAt
            };
            res.json({ workflow: formattedWorkflow });
        }
        catch (error) {
            console.error('Error fetching workflow:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch workflow' });
        }
    });
    // Create approval workflow
    router.post('/approval-workflows', validateBody(approvalSchemas.workflowCreate), async (req, res) => {
        try {
            console.log('🔍 Backend - Request body:', req.body);
            console.log('🔍 Backend - Request query:', req.query);
            console.log('🔍 Backend - Body companyId:', req.body.companyId);
            console.log('🔍 Backend - Query companyId:', req.query.companyId);
            const companyId = String(req.body.companyId || req.query.companyId || '');
            console.log('🔍 Backend - Final companyId:', companyId);
            console.log('🔍 Backend - CompanyId length:', companyId.length);
            if (!companyId) {
                console.log('❌ Backend - Company ID is missing!');
                return res.status(400).json({ error: 'company_id_required', message: 'Company ID is required' });
            }
            const workflowConfig = {
                ...req.body,
                companyId,
                tenantId: req.tenantId
            };
            const workflow = await UnifiedApprovalEngine.createWorkflow(workflowConfig);
            res.status(201).json({
                success: true,
                message: 'Workflow created successfully',
                workflow
            });
        }
        catch (error) {
            console.error('Error creating workflow:', error);
            res.status(500).json({ error: 'internal_error', message: error.message || 'Failed to create workflow' });
        }
    });
    // Update approval workflow
    router.put('/approval-workflows/:id', validateBody(approvalSchemas.workflowUpdate), async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            // Check if workflow exists
            const existingWorkflow = await prisma.unifiedApprovalWorkflow.findFirst({
                where: { id, tenantId: req.tenantId }
            });
            if (!existingWorkflow) {
                return res.status(404).json({ error: 'not_found', message: 'Workflow not found' });
            }
            // Prepare update data
            const updateFields = {};
            if (updateData.name !== undefined)
                updateFields.name = updateData.name;
            if (updateData.description !== undefined)
                updateFields.description = updateData.description;
            if (updateData.isActive !== undefined)
                updateFields.isActive = updateData.isActive;
            if (updateData.steps !== undefined)
                updateFields.steps = JSON.stringify(updateData.steps);
            if (updateData.conditions !== undefined)
                updateFields.conditions = JSON.stringify(updateData.conditions);
            if (updateData.autoApproval !== undefined)
                updateFields.autoApproval = updateData.autoApproval;
            if (updateData.escalationRules !== undefined)
                updateFields.escalationRules = JSON.stringify(updateData.escalationRules);
            if (updateData.priority !== undefined)
                updateFields.priority = updateData.priority;
            updateFields.updatedAt = new Date();
            const updatedWorkflow = await prisma.unifiedApprovalWorkflow.update({
                where: { id },
                data: updateFields
            });
            res.json({
                success: true,
                message: 'Workflow updated successfully',
                workflow: {
                    id: updatedWorkflow.id,
                    name: updatedWorkflow.name,
                    description: updatedWorkflow.description,
                    entityType: updatedWorkflow.entityType,
                    entitySubType: updatedWorkflow.entitySubType,
                    isActive: updatedWorkflow.isActive,
                    steps: JSON.parse(updatedWorkflow.steps),
                    conditions: JSON.parse(updatedWorkflow.conditions || '[]'),
                    autoApproval: updatedWorkflow.autoApproval,
                    escalationRules: JSON.parse(updatedWorkflow.escalationRules || '[]'),
                    priority: updatedWorkflow.priority,
                    companyId: updatedWorkflow.companyId,
                    createdAt: updatedWorkflow.createdAt,
                    updatedAt: updatedWorkflow.updatedAt
                }
            });
        }
        catch (error) {
            console.error('Error updating workflow:', error);
            res.status(500).json({ error: 'internal_error', message: error.message || 'Failed to update workflow' });
        }
    });
    // Delete approval workflow
    router.delete('/approval-workflows/:id', async (req, res) => {
        try {
            const { id } = req.params;
            // Check if workflow exists
            const existingWorkflow = await prisma.unifiedApprovalWorkflow.findFirst({
                where: { id, tenantId: req.tenantId }
            });
            if (!existingWorkflow) {
                return res.status(404).json({ error: 'not_found', message: 'Workflow not found' });
            }
            // Check if workflow has active approval requests
            const activeRequests = await prisma.unifiedApprovalRequest.count({
                where: { workflowId: id, status: 'pending' }
            });
            if (activeRequests > 0) {
                return res.status(400).json({
                    error: 'workflow_in_use',
                    message: 'Cannot delete workflow with active approval requests'
                });
            }
            await prisma.unifiedApprovalWorkflow.delete({
                where: { id }
            });
            res.json({
                success: true,
                message: 'Workflow deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting workflow:', error);
            res.status(500).json({ error: 'internal_error', message: error.message || 'Failed to delete workflow' });
        }
    });
    // ==================== APPROVAL REQUEST MANAGEMENT ====================
    // Create approval request
    router.post('/approval-requests', validateBody(approvalSchemas.approvalRequestCreate), async (req, res) => {
        try {
            const companyId = String(req.body.companyId || req.query.companyId || '');
            if (!companyId) {
                return res.status(400).json({ error: 'company_id_required', message: 'Company ID is required' });
            }
            const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(req.tenantId, companyId, req.body.entityType, req.body.entityId, req.body.entitySubType, req.user?.id || 'system', req.body.metadata);
            res.status(201).json({
                success: true,
                message: 'Approval request created successfully',
                approvalRequest
            });
        }
        catch (error) {
            console.error('Error creating approval request:', error);
            res.status(500).json({ error: 'internal_error', message: error.message || 'Failed to create approval request' });
        }
    });
    // Get approval requests
    router.get('/approval-requests', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            const entityType = req.query.entityType;
            const status = req.query.status;
            const requestedBy = req.query.requestedBy;
            const page = parseInt(String(req.query.page || '1'));
            const pageSize = parseInt(String(req.query.pageSize || '20'));
            const where = {
                tenantId: req.tenantId,
                companyId: companyId || undefined,
                entityType: entityType || undefined,
                status: status || undefined,
                requestedBy: requestedBy || undefined
            };
            const [approvalRequests, total] = await Promise.all([
                prisma.unifiedApprovalRequest.findMany({
                    where,
                    include: {
                        assignees: {
                            include: {
                                user: {
                                    select: { id: true, name: true, email: true }
                                }
                            }
                        }
                    },
                    orderBy: { requestedAt: 'desc' },
                    skip: (page - 1) * pageSize,
                    take: pageSize
                }),
                prisma.unifiedApprovalRequest.count({ where })
            ]);
            const formattedRequests = approvalRequests.map(ar => ({
                id: ar.id,
                entityType: ar.entityType,
                entityId: ar.entityId,
                entitySubType: ar.entitySubType,
                workflowId: ar.workflowId,
                status: ar.status,
                currentStep: ar.currentStep,
                totalSteps: ar.totalSteps,
                completedSteps: ar.completedSteps,
                requestedBy: ar.requestedBy,
                requestedAt: ar.requestedAt,
                approvedAt: ar.approvedAt,
                rejectedAt: ar.rejectedAt,
                comments: ar.comments,
                metadata: JSON.parse(ar.metadata || '{}'),
                approvers: ar.assignees.map(aa => ({
                    id: aa.id,
                    userId: aa.userId,
                    stepId: aa.stepId,
                    stepName: aa.stepName,
                    status: aa.status,
                    assignedAt: aa.assignedAt,
                    completedAt: aa.completedAt,
                    comments: aa.comments,
                    escalatedTo: aa.escalatedTo,
                    escalationReason: aa.escalationReason,
                    user: aa.user
                }))
            }));
            res.json({
                approvalRequests: formattedRequests,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize)
                }
            });
        }
        catch (error) {
            console.error('Error fetching approval requests:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch approval requests' });
        }
    });
    // Get approval request by ID
    router.get('/approval-requests/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const approvalRequest = await prisma.unifiedApprovalRequest.findFirst({
                where: { id, tenantId: req.tenantId },
                include: {
                    assignees: {
                        include: {
                            user: {
                                select: { id: true, name: true, email: true }
                            }
                        }
                    },
                    workflow: {
                        select: { id: true, name: true, steps: true }
                    }
                }
            });
            if (!approvalRequest) {
                return res.status(404).json({ error: 'not_found', message: 'Approval request not found' });
            }
            const formattedRequest = {
                id: approvalRequest.id,
                entityType: approvalRequest.entityType,
                entityId: approvalRequest.entityId,
                entitySubType: approvalRequest.entitySubType,
                workflowId: approvalRequest.workflowId,
                workflow: {
                    id: approvalRequest.workflow.id,
                    name: approvalRequest.workflow.name,
                    steps: JSON.parse(approvalRequest.workflow.steps)
                },
                status: approvalRequest.status,
                currentStep: approvalRequest.currentStep,
                totalSteps: approvalRequest.totalSteps,
                completedSteps: approvalRequest.completedSteps,
                requestedBy: approvalRequest.requestedBy,
                requestedAt: approvalRequest.requestedAt,
                approvedAt: approvalRequest.approvedAt,
                rejectedAt: approvalRequest.rejectedAt,
                comments: approvalRequest.comments,
                metadata: JSON.parse(approvalRequest.metadata || '{}'),
                approvers: approvalRequest.assignees.map(aa => ({
                    id: aa.id,
                    userId: aa.userId,
                    stepId: aa.stepId,
                    stepName: aa.stepName,
                    status: aa.status,
                    assignedAt: aa.assignedAt,
                    completedAt: aa.completedAt,
                    comments: aa.comments,
                    escalatedTo: aa.escalatedTo,
                    escalationReason: aa.escalationReason,
                    user: aa.user
                }))
            };
            res.json({ approvalRequest: formattedRequest });
        }
        catch (error) {
            console.error('Error fetching approval request:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch approval request' });
        }
    });
    // Process approval action
    router.post('/approval-requests/:id/actions/:assigneeId', validateBody(approvalSchemas.approvalAction), async (req, res) => {
        try {
            const { id, assigneeId } = req.params;
            const { action, comments, escalationReason } = req.body;
            const approvalRequest = await UnifiedApprovalEngine.processApprovalAction(req.tenantId, id, assigneeId, action, comments, escalationReason);
            res.json({
                success: true,
                message: `Approval ${action}ed successfully`,
                approvalRequest
            });
        }
        catch (error) {
            console.error('Error processing approval action:', error);
            res.status(500).json({ error: 'internal_error', message: error.message || 'Failed to process approval action' });
        }
    });
    // ==================== DASHBOARD & ANALYTICS ====================
    // Get approval dashboard data
    router.get('/approval-dashboard', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : new Date();
            const where = {
                tenantId: req.tenantId,
                companyId: companyId || undefined,
                requestedAt: { gte: dateFrom, lte: dateTo }
            };
            const results = await Promise.all([
                prisma.unifiedApprovalRequest.count({ where }),
                prisma.unifiedApprovalRequest.count({ where: { ...where, status: 'pending' } }),
                prisma.unifiedApprovalRequest.count({ where: { ...where, status: 'approved' } }),
                prisma.unifiedApprovalRequest.count({ where: { ...where, status: 'rejected' } }),
                prisma.unifiedApprovalRequest.count({ where: { ...where, status: 'escalated' } }),
                // Calculate average processing time
                prisma.unifiedApprovalRequest.findMany({
                    where: { ...where, status: { in: ['approved', 'rejected'] } },
                    select: {
                        requestedAt: true,
                        approvedAt: true,
                        rejectedAt: true
                    }
                }).then(requests => {
                    const processingTimes = requests
                        .map(req => {
                        const endTime = req.approvedAt || req.rejectedAt;
                        if (!endTime)
                            return null;
                        return new Date(endTime).getTime() - new Date(req.requestedAt).getTime();
                    })
                        .filter(time => time !== null);
                    return processingTimes.length > 0
                        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
                        : 0;
                }),
                prisma.unifiedApprovalRequest.groupBy({
                    by: ['entityType'],
                    where,
                    _count: { id: true }
                }),
                prisma.unifiedApprovalRequest.groupBy({
                    by: ['status'],
                    where,
                    _count: { id: true }
                }),
                prisma.unifiedApprovalRequest.findMany({
                    where,
                    include: {
                        assignees: {
                            include: {
                                user: {
                                    select: { id: true, name: true, email: true }
                                }
                            }
                        }
                    },
                    orderBy: { requestedAt: 'desc' },
                    take: 10
                })
            ]);
            const [totalRequests, pendingRequests, approvedRequests, rejectedRequests, escalatedRequests, avgProcessingTime, byEntityType, byStatus, recentRequests] = results;
            res.json({
                summary: {
                    totalRequests,
                    pendingRequests,
                    approvedRequests,
                    rejectedRequests,
                    escalatedRequests,
                    approvalRate: totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0,
                    avgProcessingTime: 0 // Would calculate from processing time field
                },
                byEntityType: byEntityType.map(item => ({
                    entityType: item.entityType,
                    count: item._count.id
                })),
                byStatus: byStatus.map(item => ({
                    status: item.status,
                    count: item._count.id
                })),
                recentRequests: recentRequests.map(ar => ({
                    id: ar.id,
                    entityType: ar.entityType,
                    entityId: ar.entityId,
                    status: ar.status,
                    requestedBy: ar.requestedBy,
                    requestedAt: ar.requestedAt,
                    currentStep: ar.currentStep,
                    totalSteps: ar.totalSteps,
                    approvers: ar.assignees.map(aa => ({
                        id: aa.id,
                        userId: aa.userId,
                        stepName: aa.stepName,
                        status: aa.status,
                        user: aa.user
                    }))
                }))
            });
        }
        catch (error) {
            console.error('Error fetching approval dashboard:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch approval dashboard' });
        }
    });
    // ==================== TEMPLATES ====================
    // Get approval templates
    router.get('/approval-templates', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            const entityType = req.query.entityType;
            const templates = await prisma.unifiedApprovalTemplate.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId: companyId || undefined,
                    entityType: entityType || undefined,
                    isActive: true
                },
                orderBy: [
                    { isSystem: 'desc' },
                    { name: 'asc' }
                ]
            });
            const formattedTemplates = templates.map(t => ({
                id: t.id,
                name: t.name,
                description: t.description,
                entityType: t.entityType,
                entitySubType: t.entitySubType,
                templateData: JSON.parse(t.templateData),
                isSystem: t.isSystem,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt
            }));
            res.json({ templates: formattedTemplates });
        }
        catch (error) {
            console.error('Error fetching approval templates:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch approval templates' });
        }
    });
    // Create approval template
    router.post('/approval-templates', async (req, res) => {
        try {
            const companyId = String(req.body.companyId || req.query.companyId || '');
            if (!companyId) {
                return res.status(400).json({ error: 'company_id_required', message: 'Company ID is required' });
            }
            const { name, description, entityType, entitySubType, templateData } = req.body;
            const template = await prisma.unifiedApprovalTemplate.create({
                data: {
                    tenantId: req.tenantId,
                    companyId,
                    name,
                    description,
                    entityType,
                    entitySubType,
                    templateData: JSON.stringify(templateData),
                    isSystem: false,
                    createdBy: req.user?.id || 'system'
                }
            });
            res.status(201).json({
                success: true,
                message: 'Template created successfully',
                template: {
                    id: template.id,
                    name: template.name,
                    description: template.description,
                    entityType: template.entityType,
                    entitySubType: template.entitySubType,
                    templateData: JSON.parse(template.templateData),
                    isSystem: template.isSystem,
                    createdAt: template.createdAt,
                    updatedAt: template.updatedAt
                }
            });
        }
        catch (error) {
            console.error('Error creating approval template:', error);
            res.status(500).json({ error: 'internal_error', message: error.message || 'Failed to create template' });
        }
    });
}
