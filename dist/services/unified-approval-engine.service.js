import { prisma } from '../prisma';
// ==================== UNIFIED APPROVAL ENGINE ====================
export class UnifiedApprovalEngine {
    // ==================== WORKFLOW MANAGEMENT ====================
    /**
     * Create a new approval workflow
     */
    static async createWorkflow(config) {
        const workflow = await prisma.unifiedApprovalWorkflow.create({
            data: {
                tenantId: config.tenantId,
                companyId: config.companyId,
                name: config.name,
                description: config.description,
                entityType: config.entityType,
                entitySubType: config.entitySubType,
                isActive: config.isActive,
                steps: JSON.stringify(config.steps),
                conditions: JSON.stringify(config.conditions),
                autoApproval: config.autoApproval,
                escalationRules: JSON.stringify(config.escalationRules),
                priority: config.priority,
                createdBy: 'system', // TODO: Get from context
                updatedBy: 'system' // TODO: Get from context
            }
        });
        return {
            ...config,
            id: workflow.id
        };
    }
    /**
     * Get workflows by entity type and conditions
     */
    static async getWorkflows(tenantId, companyId, entityType, entitySubType, metadata) {
        const workflows = await prisma.unifiedApprovalWorkflow.findMany({
            where: {
                tenantId,
                companyId,
                entityType,
                entitySubType: entitySubType || undefined,
                isActive: true
            }
        });
        return workflows.map(w => ({
            id: w.id,
            name: w.name,
            description: w.description || undefined,
            entityType: w.entityType,
            entitySubType: w.entitySubType || undefined,
            isActive: w.isActive,
            steps: JSON.parse(w.steps),
            conditions: JSON.parse(w.conditions || '[]'),
            autoApproval: w.autoApproval,
            escalationRules: JSON.parse(w.escalationRules || '[]'),
            priority: w.priority,
            companyId: w.companyId,
            tenantId: w.tenantId
        }));
    }
    // ==================== APPROVAL REQUEST MANAGEMENT ====================
    /**
     * Create an approval request for any entity
     */
    static async createApprovalRequest(tenantId, companyId, entityType, entityId, requestedBy, entitySubType, metadata) {
        // Find applicable workflows
        const workflows = await this.getWorkflows(tenantId, companyId, entityType, entitySubType, metadata);
        if (workflows.length === 0) {
            throw new Error(`No approval workflow found for ${entityType}${entitySubType ? ` (${entitySubType})` : ''}`);
        }
        // For now, use the first matching workflow
        // In the future, we could implement workflow selection logic
        const workflow = workflows[0];
        // Check if conditions are met
        const conditionsMet = await this.evaluateConditions(workflow.conditions, entityType, entityId, metadata);
        if (!conditionsMet) {
            throw new Error('Workflow conditions not met');
        }
        // Create approval request
        const approvalRequest = await prisma.unifiedApprovalRequest.create({
            data: {
                tenantId,
                companyId,
                entityType,
                entityId,
                entitySubType,
                workflowId: workflow.id,
                requestedBy,
                status: 'pending',
                currentStep: 1,
                totalSteps: workflow.steps.length,
                completedSteps: 0,
                metadata: JSON.stringify(metadata || {})
            }
        });
        // Create approval assignees for the first step
        const firstStep = workflow.steps[0];
        const assignees = await this.resolveApprovers(firstStep, tenantId, companyId, metadata);
        const approvalAssignees = await Promise.all(assignees.map(assignee => prisma.unifiedApprovalAssignee.create({
            data: {
                tenantId,
                approvalRequestId: approvalRequest.id,
                userId: assignee.userId,
                stepId: firstStep.id,
                stepName: firstStep.name,
                status: 'pending',
                assignedAt: new Date()
            }
        })));
        // Send notifications
        await this.sendApprovalNotifications(approvalRequest.id, assignees);
        return {
            id: approvalRequest.id,
            entityType: approvalRequest.entityType,
            entityId: approvalRequest.entityId,
            entitySubType: approvalRequest.entitySubType || undefined,
            workflowId: approvalRequest.workflowId,
            currentStep: approvalRequest.currentStep,
            status: approvalRequest.status,
            requestedBy: approvalRequest.requestedBy,
            requestedAt: approvalRequest.requestedAt,
            totalSteps: approvalRequest.totalSteps,
            completedSteps: approvalRequest.completedSteps,
            approvers: approvalAssignees.map(aa => ({
                id: aa.id,
                userId: aa.userId,
                stepId: aa.stepId,
                stepName: aa.stepName,
                status: aa.status,
                assignedAt: aa.assignedAt,
                completedAt: aa.completedAt || undefined,
                comments: aa.comments || undefined,
                escalatedTo: aa.escalatedTo || undefined,
                escalationReason: aa.escalationReason || undefined
            })),
            comments: approvalRequest.comments || undefined,
            metadata: JSON.parse(approvalRequest.metadata || '{}')
        };
    }
    /**
     * Process an approval action (approve, reject, escalate)
     */
    static async processApprovalAction(tenantId, approvalRequestId, assigneeId, action, comments, escalationReason) {
        const approvalRequest = await prisma.unifiedApprovalRequest.findFirst({
            where: { id: approvalRequestId, tenantId }
        });
        if (!approvalRequest) {
            throw new Error('Approval request not found');
        }
        const assignee = await prisma.unifiedApprovalAssignee.findFirst({
            where: { id: assigneeId, approvalRequestId }
        });
        if (!assignee) {
            throw new Error('Approval assignee not found');
        }
        if (assignee.status !== 'pending') {
            throw new Error('Approval has already been processed');
        }
        // Update assignee status
        await prisma.unifiedApprovalAssignee.update({
            where: { id: assigneeId },
            data: {
                status: action,
                completedAt: new Date(),
                comments,
                escalationReason: action === 'escalate' ? escalationReason : undefined
            }
        });
        if (action === 'reject') {
            // Reject the entire approval request
            await prisma.unifiedApprovalRequest.update({
                where: { id: approvalRequestId },
                data: {
                    status: 'rejected',
                    rejectedAt: new Date()
                }
            });
            // Update entity status
            await this.updateEntityStatus(approvalRequest.entityType, approvalRequest.entityId, 'rejected');
        }
        else if (action === 'approve') {
            // Check if this was the last step
            const completedSteps = await prisma.unifiedApprovalAssignee.count({
                where: { approvalRequestId, status: 'approved' }
            });
            if (completedSteps >= approvalRequest.totalSteps) {
                // All steps completed - approve the request
                await prisma.unifiedApprovalRequest.update({
                    where: { id: approvalRequestId },
                    data: {
                        status: 'approved',
                        approvedAt: new Date(),
                        completedSteps: completedSteps
                    }
                });
                // Update entity status
                await this.updateEntityStatus(approvalRequest.entityType, approvalRequest.entityId, 'approved');
            }
            else {
                // Move to next step
                await this.moveToNextStep(approvalRequestId, completedSteps + 1);
            }
        }
        // Send notifications
        await this.sendApprovalActionNotifications(approvalRequestId, action, comments);
        return this.getApprovalRequest(tenantId, approvalRequestId);
    }
    // ==================== HELPER METHODS ====================
    /**
     * Resolve approvers for a step
     */
    static async resolveApprovers(step, tenantId, companyId, metadata) {
        switch (step.approverType) {
            case 'user':
                if (!step.approverId)
                    throw new Error('User ID required for user approver type');
                const user = await prisma.appUser.findFirst({
                    where: { id: step.approverId, tenantId }
                });
                return user ? [{ userId: user.id, name: user.name || 'Unknown', email: user.email }] : [];
            case 'role':
                if (!step.role)
                    throw new Error('Role required for role approver type');
                const roleUsers = await prisma.appUser.findMany({
                    where: {
                        tenantId,
                        role: step.role
                    }
                });
                return roleUsers.map(u => ({ userId: u.id, name: u.name || 'Unknown', email: u.email }));
            case 'amount_based':
                if (!step.amountThreshold || !metadata?.amount) {
                    throw new Error('Amount threshold and metadata amount required for amount-based approver');
                }
                const amount = metadata.amount;
                if (amount <= step.amountThreshold) {
                    // Auto-approve or use lower-level approvers
                    return [];
                }
                else {
                    // Use high-level approvers (CEO, CFO, etc.)
                    const highLevelUsers = await prisma.appUser.findMany({
                        where: {
                            tenantId,
                            role: { in: ['admin', 'ceo', 'cfo'] }
                        }
                    });
                    return highLevelUsers.map(u => ({ userId: u.id, name: u.name || 'Unknown', email: u.email }));
                }
            default:
                throw new Error(`Unknown approver type: ${step.approverType}`);
        }
    }
    /**
     * Evaluate workflow conditions
     */
    static async evaluateConditions(conditions, entityType, entityId, metadata) {
        if (conditions.length === 0)
            return true;
        // This is a simplified implementation
        // In a real system, you'd fetch the entity data and evaluate conditions
        return true;
    }
    /**
     * Move to next approval step
     */
    static async moveToNextStep(approvalRequestId, nextStep) {
        const approvalRequest = await prisma.unifiedApprovalRequest.findUnique({
            where: { id: approvalRequestId }
        });
        if (!approvalRequest)
            return;
        const workflow = await prisma.unifiedApprovalWorkflow.findUnique({
            where: { id: approvalRequest.workflowId }
        });
        if (!workflow)
            return;
        const steps = JSON.parse(workflow.steps);
        const nextStepConfig = steps.find(s => s.order === nextStep);
        if (!nextStepConfig)
            return;
        // Create assignees for next step
        const assignees = await this.resolveApprovers(nextStepConfig, approvalRequest.tenantId, approvalRequest.companyId, JSON.parse(approvalRequest.metadata || '{}'));
        await Promise.all(assignees.map(assignee => prisma.unifiedApprovalAssignee.create({
            data: {
                tenantId: approvalRequest.tenantId,
                approvalRequestId,
                userId: assignee.userId,
                stepId: nextStepConfig.id,
                stepName: nextStepConfig.name,
                status: 'pending',
                assignedAt: new Date()
            }
        })));
        // Update approval request
        await prisma.unifiedApprovalRequest.update({
            where: { id: approvalRequestId },
            data: {
                currentStep: nextStep,
                completedSteps: nextStep - 1
            }
        });
    }
    /**
     * Update entity status based on approval result
     */
    static async updateEntityStatus(entityType, entityId, status) {
        switch (entityType) {
            case 'journal_entry':
                await prisma.journalEntry.update({
                    where: { id: entityId },
                    data: { status: status === 'approved' ? 'POSTED' : 'DRAFT' }
                });
                break;
            case 'invoice':
                await prisma.invoice.update({
                    where: { id: entityId },
                    data: { status: status === 'approved' ? 'APPROVED' : 'DRAFT' }
                });
                break;
            case 'purchase_order':
                await prisma.purchaseOrder.update({
                    where: { id: entityId },
                    data: { status: status === 'approved' ? 'approved' : 'draft' }
                });
                break;
            // Add other entity types as needed
        }
    }
    /**
     * Send approval notifications
     */
    static async sendApprovalNotifications(approvalRequestId, assignees) {
        // Implementation would send emails/SMS/Slack notifications
        // This is a placeholder
        console.log(`Sending approval notifications to ${assignees.length} assignees`);
    }
    /**
     * Send approval action notifications
     */
    static async sendApprovalActionNotifications(approvalRequestId, action, comments) {
        // Implementation would send notifications about approval actions
        console.log(`Sending ${action} notification for approval request ${approvalRequestId}`);
    }
    /**
     * Get approval request details
     */
    static async getApprovalRequest(tenantId, approvalRequestId) {
        const approvalRequest = await prisma.unifiedApprovalRequest.findFirst({
            where: { id: approvalRequestId, tenantId },
            include: {
                assignees: true
            }
        });
        if (!approvalRequest) {
            throw new Error('Approval request not found');
        }
        return {
            id: approvalRequest.id,
            entityType: approvalRequest.entityType,
            entityId: approvalRequest.entityId,
            entitySubType: approvalRequest.entitySubType || undefined,
            workflowId: approvalRequest.workflowId,
            currentStep: approvalRequest.currentStep,
            status: approvalRequest.status,
            requestedBy: approvalRequest.requestedBy,
            requestedAt: approvalRequest.requestedAt,
            totalSteps: approvalRequest.totalSteps,
            completedSteps: approvalRequest.completedSteps,
            approvers: approvalRequest.assignees.map(aa => ({
                id: aa.id,
                userId: aa.userId,
                stepId: aa.stepId,
                stepName: aa.stepName,
                status: aa.status,
                assignedAt: aa.assignedAt,
                completedAt: aa.completedAt || undefined,
                comments: aa.comments || undefined,
                escalatedTo: aa.escalatedTo || undefined,
                escalationReason: aa.escalationReason || undefined
            })),
            comments: approvalRequest.comments || undefined,
            metadata: JSON.parse(approvalRequest.metadata || '{}')
        };
    }
}
export const unifiedApprovalEngine = new UnifiedApprovalEngine();
