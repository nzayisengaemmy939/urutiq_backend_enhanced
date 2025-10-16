import type { Router } from 'express';
import { prisma } from './prisma.js';
import { TenantRequest } from './tenant.js';
import { validateBody } from './validate.js';
import { z } from 'zod';

// Validation schemas
const approvalSchemas = {
  workflow: z.object({
    companyId: z.string(),
    name: z.string().min(1),
    description: z.string().optional(),
    entityType: z.enum(['purchase_order', 'expense', 'bill', 'invoice']),
    steps: z.string(), // JSON string for approval steps
    conditions: z.string().optional(), // JSON string for workflow conditions
    autoApproval: z.boolean().default(false),
    escalationRules: z.string().optional() // JSON string for escalation rules
  }),

  approval: z.object({
    workflowId: z.string(),
    entityType: z.enum(['purchase_order', 'expense', 'bill', 'invoice']),
    entityId: z.string(),
    stepNumber: z.number().int().min(1),
    approverId: z.string(),
    comments: z.string().optional()
  }),

  approvalAction: z.object({
    action: z.enum(['approve', 'reject', 'escalate']),
    comments: z.string().optional(),
    escalationReason: z.string().optional()
  })
};

export function mountApprovalRoutes(router: Router) {
  // Get all approval workflows
  router.get('/approval-workflows', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const entityType = req.query.entityType as string || undefined;
    const isActive = req.query.isActive === 'true';
    
    try {
      const where: any = {
        tenantId: req.tenantId,
        companyId,
        entityType: entityType || undefined,
        isActive: isActive ? true : undefined
      };

      const workflows = await prisma.approvalWorkflow.findMany({
        where,
        include: {
          approvals: {
            include: {
              approver: true
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: [
          { entityType: 'asc' },
          { name: 'asc' }
        ]
      });

      res.json(workflows);
    } catch (error) {
      console.error('Error fetching approval workflows:', error);
      res.status(500).json({ error: 'Failed to fetch approval workflows' });
    }
  });

  // Get single approval workflow
  router.get('/approval-workflows/:id', async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    try {
      const workflow = await prisma.approvalWorkflow.findFirst({
        where: { 
          id, 
          tenantId: req.tenantId! 
        },
        include: {
          approvals: {
            include: {
              approver: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Approval workflow not found' });
      }

      res.json(workflow);
    } catch (error) {
      console.error('Error fetching approval workflow:', error);
      res.status(500).json({ error: 'Failed to fetch approval workflow' });
    }
  });

  // Create approval workflow
  router.post('/approval-workflows', validateBody(approvalSchemas.workflow), async (req: TenantRequest, res) => {
    const data = req.body as any;
    
    try {
      const workflow = await prisma.approvalWorkflow.create({
        data: {
          tenantId: req.tenantId!,
          companyId: data.companyId,
          name: data.name,
          description: data.description,
          entityType: data.entityType,
          steps: data.steps,
          conditions: data.conditions,
          autoApproval: data.autoApproval,
          escalationRules: data.escalationRules
        }
      });

      res.status(201).json(workflow);
    } catch (error) {
      console.error('Error creating approval workflow:', error);
      res.status(500).json({ error: 'Failed to create approval workflow' });
    }
  });

  // Update approval workflow
  router.put('/approval-workflows/:id', validateBody(approvalSchemas.workflow), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body as any;
    
    try {
      const workflow = await prisma.approvalWorkflow.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          entityType: data.entityType,
          steps: data.steps,
          conditions: data.conditions,
          autoApproval: data.autoApproval,
          escalationRules: data.escalationRules
        }
      });

      res.json(workflow);
    } catch (error) {
      console.error('Error updating approval workflow:', error);
      res.status(500).json({ error: 'Failed to update approval workflow' });
    }
  });

  // Delete approval workflow
  router.delete('/approval-workflows/:id', async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    try {
      const workflow = await prisma.approvalWorkflow.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: { approvals: true }
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Approval workflow not found' });
      }

      if (workflow.approvals.length > 0) {
        return res.status(400).json({ error: 'Cannot delete workflow with existing approvals' });
      }

      await prisma.approvalWorkflow.delete({
        where: { id }
      });

      res.json({ message: 'Approval workflow deleted successfully' });
    } catch (error) {
      console.error('Error deleting approval workflow:', error);
      res.status(500).json({ error: 'Failed to delete approval workflow' });
    }
  });

  // Get approvals
  router.get('/approvals', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const entityType = req.query.entityType as string || undefined;
    const entityId = req.query.entityId as string || undefined;
    const status = req.query.status as string || undefined;
    const approverId = req.query.approverId as string || undefined;
    
    try {
      const where: any = {
        tenantId: req.tenantId,
        companyId,
        entityType: entityType || undefined,
        entityId: entityId || undefined,
        status: status || undefined,
        approverId: approverId || undefined
      };

      const approvals = await prisma.approval.findMany({
        where,
        include: {
          workflow: true,
          approver: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(approvals);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      res.status(500).json({ error: 'Failed to fetch approvals' });
    }
  });

  // Get single approval
  router.get('/approvals/:id', async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    try {
      const approval = await prisma.approval.findFirst({
        where: { 
          id, 
          tenantId: req.tenantId! 
        },
        include: {
          workflow: true,
          approver: true
        }
      });

      if (!approval) {
        return res.status(404).json({ error: 'Approval not found' });
      }

      res.json(approval);
    } catch (error) {
      console.error('Error fetching approval:', error);
      res.status(500).json({ error: 'Failed to fetch approval' });
    }
  });

  // Create approval request
  router.post('/approvals', validateBody(approvalSchemas.approval), async (req: TenantRequest, res) => {
    const data = req.body as any;
    
    try {
      const approval = await prisma.approval.create({
        data: {
          tenantId: req.tenantId!,
          companyId: data.companyId,
          workflowId: data.workflowId,
          entityType: data.entityType,
          entityId: data.entityId,
          stepNumber: data.stepNumber,
          approverId: data.approverId,
          comments: data.comments,
          status: 'pending'
        },
        include: {
          workflow: true,
          approver: true
        }
      });

      res.status(201).json(approval);
    } catch (error) {
      console.error('Error creating approval:', error);
      res.status(500).json({ error: 'Failed to create approval' });
    }
  });

  // Process approval action
  router.put('/approvals/:id/action', validateBody(approvalSchemas.approvalAction), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body as any;
    
    try {
      const approval = await prisma.approval.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: { workflow: true }
      });

      if (!approval) {
        return res.status(404).json({ error: 'Approval not found' });
      }

      if (approval.status !== 'pending') {
        return res.status(400).json({ error: 'Approval has already been processed' });
      }

      const updateData: any = {
        comments: data.comments
      };

      if (data.action === 'approve') {
        updateData.status = 'approved';
        updateData.approvedAt = new Date();
      } else if (data.action === 'reject') {
        updateData.status = 'rejected';
        updateData.rejectedAt = new Date();
      } else if (data.action === 'escalate') {
        updateData.status = 'escalated';
        updateData.escalationReason = data.escalationReason;
      }

      const updatedApproval = await prisma.approval.update({
        where: { id },
        data: updateData,
        include: {
          workflow: true,
          approver: true
        }
      });

      // Check if workflow is complete
      if (data.action === 'approve') {
        await checkWorkflowCompletion(approval.workflowId, approval.entityType, approval.entityId);
      }

      res.json(updatedApproval);
    } catch (error) {
      console.error('Error processing approval action:', error);
      res.status(500).json({ error: 'Failed to process approval action' });
    }
  });

  // Get pending approvals for user
  router.get('/approvals/pending/:userId', async (req: TenantRequest, res) => {
    const { userId } = req.params;
    
    try {
      const pendingApprovals = await prisma.approval.findMany({
        where: {
          tenantId: req.tenantId!,
          approverId: userId,
          status: 'pending'
        },
        include: {
          workflow: true,
          approver: true
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json(pendingApprovals);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      res.status(500).json({ error: 'Failed to fetch pending approvals' });
    }
  });

  // Get approval history for entity
  router.get('/approvals/entity/:entityType/:entityId', async (req: TenantRequest, res) => {
    const { entityType, entityId } = req.params;
    
    try {
      const approvals = await prisma.approval.findMany({
        where: {
          tenantId: req.tenantId!,
          entityType,
          entityId
        },
        include: {
          workflow: true,
          approver: true
        },
        orderBy: [
          { stepNumber: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      res.json(approvals);
    } catch (error) {
      console.error('Error fetching entity approvals:', error);
      res.status(500).json({ error: 'Failed to fetch entity approvals' });
    }
  });

  // Bulk create approvals for workflow
  router.post('/approvals/bulk', async (req: TenantRequest, res) => {
    const { workflowId, entityType, entityId, approvers } = req.body;
    
    try {
      const workflow = await prisma.approvalWorkflow.findFirst({
        where: { id: workflowId, tenantId: req.tenantId! }
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      const approvals = await Promise.all(
        approvers.map((approver: any, index: number) =>
          prisma.approval.create({
            data: {
              tenantId: req.tenantId!,
              companyId: workflow.companyId,
              workflowId,
              entityType,
              entityId,
              stepNumber: index + 1,
              approverId: approver.id,
              status: 'pending'
            }
          })
        )
      );

      res.status(201).json(approvals);
    } catch (error) {
      console.error('Error creating bulk approvals:', error);
      res.status(500).json({ error: 'Failed to create bulk approvals' });
    }
  });

  // Helper function to check workflow completion
  async function checkWorkflowCompletion(workflowId: string, entityType: string, entityId: string) {
    try {
      const workflow = await prisma.approvalWorkflow.findFirst({
        where: { id: workflowId }
      });

      if (!workflow) return;

      const steps = JSON.parse(workflow.steps);
      const approvals = await prisma.approval.findMany({
        where: {
          workflowId,
          entityType,
          entityId,
          status: 'approved'
        }
      });

      // Check if all steps are approved
      if (approvals.length >= steps.length) {
        // Update entity status based on type
        await updateEntityStatus(entityType, entityId, 'approved');
      }
    } catch (error) {
      console.error('Error checking workflow completion:', error);
    }
  }

  // Helper function to update entity status
  async function updateEntityStatus(entityType: string, entityId: string, status: string) {
    try {
      switch (entityType) {
        case 'purchase_order':
          await prisma.purchaseOrder.update({
            where: { id: entityId },
            data: { status }
          });
          break;
        case 'bill':
          await prisma.bill.update({
            where: { id: entityId },
            data: { status }
          });
          break;
        // Add other entity types as needed
      }
    } catch (error) {
      console.error('Error updating entity status:', error);
    }
  }

  // Get approval statistics
  router.get('/approvals/stats', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    try {
      const where: any = {
        tenantId: req.tenantId,
        companyId,
        createdAt: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined
        }
      };

      const [total, pending, approved, rejected, escalated] = await Promise.all([
        prisma.approval.count({ where }),
        prisma.approval.count({ where: { ...where, status: 'pending' } }),
        prisma.approval.count({ where: { ...where, status: 'approved' } }),
        prisma.approval.count({ where: { ...where, status: 'rejected' } }),
        prisma.approval.count({ where: { ...where, status: 'escalated' } })
      ]);

      const avgProcessingTime = await prisma.approval.aggregate({
        where: { ...where, approvedAt: { not: null } },
        _avg: {
          approvedAt: true
        }
      });

      res.json({
        total,
        pending,
        approved,
        rejected,
        escalated,
        approvalRate: total > 0 ? (approved / total) * 100 : 0,
        avgProcessingTime: avgProcessingTime._avg.approvedAt
      });
    } catch (error) {
      console.error('Error fetching approval statistics:', error);
      res.status(500).json({ error: 'Failed to fetch approval statistics' });
    }
  });
}
