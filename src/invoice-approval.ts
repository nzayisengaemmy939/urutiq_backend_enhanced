import { prisma } from './prisma'
import { TenantRequest } from './tenant'
import { NotificationService } from './notifications'

export interface InvoiceApprovalData {
  invoiceId: string
  workflowId?: string
  approverId: string
  comments?: string
  action: 'approve' | 'reject' | 'escalate'
  escalationReason?: string
}

export interface ApprovalWorkflowConfig {
  id: string
  name: string
  entityType: 'invoice'
  steps: Array<{
    stepNumber: number
    approverRole: string
    amountThreshold?: number
    conditions?: Record<string, any>
  }>
  autoApproval: boolean
  escalationRules?: Array<{
    condition: string
    action: string
    timeoutHours: number
  }>
}

export class InvoiceApprovalService {
  /**
   * Create approval workflow for invoice
   */
  static async createInvoiceApprovalWorkflow(
    tenantId: string,
    companyId: string,
    config: Omit<ApprovalWorkflowConfig, 'id'>
  ): Promise<ApprovalWorkflowConfig> {
    try {
      const workflow = await prisma.approvalWorkflow.create({
        data: {
          tenantId,
          companyId,
          name: config.name,
          description: `Invoice approval workflow: ${config.name}`,
          entityType: 'invoice',
          steps: JSON.stringify(config.steps),
          conditions: JSON.stringify(config.conditions || {}),
          autoApproval: config.autoApproval,
          escalationRules: JSON.stringify(config.escalationRules || []),
          isActive: true
        }
      })

      return {
        id: workflow.id,
        name: workflow.name,
        entityType: 'invoice',
        steps: JSON.parse(workflow.steps),
        autoApproval: workflow.autoApproval,
        escalationRules: workflow.escalationRules ? JSON.parse(workflow.escalationRules) : undefined
      }
    } catch (error) {
      console.error('Error creating invoice approval workflow:', error)
      throw error
    }
  }

  /**
   * Trigger approval workflow for invoice
   */
  static async triggerInvoiceApproval(
    tenantId: string,
    invoiceId: string,
    workflowId?: string
  ): Promise<void> {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { customer: true, company: true }
      })

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // Find appropriate workflow
      let workflow
      if (workflowId) {
        workflow = await prisma.approvalWorkflow.findFirst({
          where: { id: workflowId, tenantId, entityType: 'invoice', isActive: true }
        })
      } else {
        // Find workflow based on invoice amount or other criteria
        workflow = await this.findApplicableWorkflow(tenantId, invoice)
      }

      if (!workflow) {
        console.log(`No approval workflow found for invoice ${invoiceId}`)
        return
      }

      const steps = JSON.parse(workflow.steps)
      const firstStep = steps.find((s: any) => s.stepNumber === 1)

      if (!firstStep) {
        throw new Error('Invalid workflow configuration')
      }

      // Check if auto-approval applies
      if (workflow.autoApproval && this.shouldAutoApprove(invoice, firstStep)) {
        await this.autoApproveInvoice(invoiceId, workflow.id)
        return
      }

      // Find approver for first step
      const approver = await this.findApprover(tenantId, firstStep.approverRole, invoice.companyId)

      if (!approver) {
        throw new Error(`No approver found for role: ${firstStep.approverRole}`)
      }

      // Create approval record
      await prisma.approval.create({
        data: {
          tenantId,
          workflowId: workflow.id,
          entityType: 'invoice',
          entityId: invoiceId,
          stepNumber: 1,
          approverId: approver.id,
          status: 'pending',
          comments: `Invoice ${invoice.invoiceNumber} requires approval`
        }
      })

      // Send notification to approver
      await this.notifyApprover(approver, invoice, workflow)

      // Log activity
      await prisma.invoiceActivity.create({
        data: {
          tenantId,
          invoiceId,
          activityType: 'approval_requested',
          description: `Approval workflow triggered for invoice ${invoice.invoiceNumber}`,
          metadata: { workflowId: workflow.id, approverId: approver.id }
        }
      })

    } catch (error) {
      console.error('Error triggering invoice approval:', error)
      throw error
    }
  }

  /**
   * Process approval action
   */
  static async processApprovalAction(
    tenantId: string,
    approvalId: string,
    action: 'approve' | 'reject' | 'escalate',
    comments?: string,
    escalationReason?: string
  ): Promise<void> {
    try {
      const approval = await prisma.approval.findFirst({
        where: { id: approvalId, tenantId },
        include: {
          workflow: true,
          approver: true
        }
      })

      if (!approval) {
        throw new Error('Approval not found')
      }

      if (approval.status !== 'pending') {
        throw new Error('Approval already processed')
      }

      // Update approval status
      await prisma.approval.update({
        where: { id: approvalId },
        data: {
          status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'escalated',
          comments: comments || approval.comments,
          processedAt: new Date(),
          escalationReason: action === 'escalate' ? escalationReason : null
        }
      })

      // Process next step or complete workflow
      if (action === 'approve') {
        await this.processNextApprovalStep(tenantId, approval)
      } else if (action === 'reject') {
        await this.handleRejection(tenantId, approval)
      } else if (action === 'escalate') {
        await this.handleEscalation(tenantId, approval, escalationReason)
      }

      // Log activity
      await prisma.invoiceActivity.create({
        data: {
          tenantId,
          invoiceId: approval.entityId,
          activityType: `approval_${action}`,
          description: `Invoice approval ${action} by ${approval.approver.name}`,
          metadata: { approvalId, comments, escalationReason }
        }
      })

    } catch (error) {
      console.error('Error processing approval action:', error)
      throw error
    }
  }

  /**
   * Get pending approvals for user
   */
  static async getPendingApprovals(
    tenantId: string,
    userId: string
  ): Promise<Array<{
    id: string
    invoiceId: string
    invoiceNumber: string
    amount: number
    currency: string
    customerName: string
    dueDate: Date
    submittedAt: Date
    comments: string
  }>> {
    try {
      const approvals = await prisma.approval.findMany({
        where: {
          tenantId,
          approverId: userId,
          status: 'pending',
          entityType: 'invoice'
        },
        include: {
          workflow: true,
          invoice: {
            include: {
              customer: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      return approvals.map(approval => ({
        id: approval.id,
        invoiceId: approval.entityId,
        invoiceNumber: approval.invoice?.invoiceNumber || 'Unknown',
        amount: approval.invoice?.totalAmount || 0,
        currency: approval.invoice?.currency || 'USD',
        customerName: approval.invoice?.customer?.name || 'Unknown',
        dueDate: approval.invoice?.dueDate || new Date(),
        submittedAt: approval.createdAt,
        comments: approval.comments || ''
      }))
    } catch (error) {
      console.error('Error getting pending approvals:', error)
      throw error
    }
  }

  /**
   * Find applicable workflow for invoice
   */
  private static async findApplicableWorkflow(tenantId: string, invoice: any): Promise<any> {
    const workflows = await prisma.approvalWorkflow.findMany({
      where: {
        tenantId,
        entityType: 'invoice',
        isActive: true
      }
    })

    // Find workflow based on amount thresholds
    for (const workflow of workflows) {
      const steps = JSON.parse(workflow.steps)
      const firstStep = steps.find((s: any) => s.stepNumber === 1)
      
      if (firstStep?.amountThreshold && invoice.totalAmount >= firstStep.amountThreshold) {
        return workflow
      }
    }

    // Return default workflow if no specific one found
    return workflows.find(w => w.name.toLowerCase().includes('default'))
  }

  /**
   * Check if invoice should be auto-approved
   */
  private static shouldAutoApprove(invoice: any, step: any): boolean {
    if (!step.amountThreshold) return false
    return invoice.totalAmount < step.amountThreshold
  }

  /**
   * Auto-approve invoice
   */
  private static async autoApproveInvoice(invoiceId: string, workflowId: string): Promise<void> {
    await prisma.approval.create({
      data: {
        tenantId: '', // Will be set by caller
        workflowId,
        entityType: 'invoice',
        entityId: invoiceId,
        stepNumber: 1,
        approverId: 'system',
        status: 'approved',
        comments: 'Auto-approved based on workflow rules',
        processedAt: new Date()
      }
    })

    // Update invoice status
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'approved' }
    })
  }

  /**
   * Find approver for role
   */
  private static async findApprover(tenantId: string, role: string, companyId: string): Promise<any> {
    // This would typically look up users by role/permissions
    // For now, return the first admin user
    return await prisma.appUser.findFirst({
      where: {
        tenantId,
        companyId,
        role: 'admin' // This should be based on the role parameter
      }
    })
  }

  /**
   * Notify approver
   */
  private static async notifyApprover(approver: any, invoice: any, workflow: any): Promise<void> {
    // Send email notification
    await NotificationService.sendNotification({
      templateId: 'invoice_approval_request',
      recipientEmail: approver.email,
      recipientName: approver.name,
      variables: {
        approverName: approver.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount.toFixed(2),
        currency: invoice.currency,
        customerName: invoice.customer?.name || 'Unknown',
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A',
        workflowName: workflow.name,
        approvalLink: `${process.env.FRONTEND_URL}/approvals/pending/${invoice.id}`
      },
      priority: 'high'
    })
  }

  /**
   * Process next approval step
   */
  private static async processNextApprovalStep(tenantId: string, approval: any): Promise<void> {
    const workflow = approval.workflow
    const steps = JSON.parse(workflow.steps)
    const nextStep = steps.find((s: any) => s.stepNumber === approval.stepNumber + 1)

    if (!nextStep) {
      // Workflow complete - approve invoice
      await prisma.invoice.update({
        where: { id: approval.entityId },
        data: { status: 'approved' }
      })
      return
    }

    // Find approver for next step
    const approver = await this.findApprover(tenantId, nextStep.approverRole, approval.invoice?.companyId)

    if (!approver) {
      throw new Error(`No approver found for role: ${nextStep.approverRole}`)
    }

    // Create next approval
    await prisma.approval.create({
      data: {
        tenantId,
        workflowId: workflow.id,
        entityType: 'invoice',
        entityId: approval.entityId,
        stepNumber: nextStep.stepNumber,
        approverId: approver.id,
        status: 'pending',
        comments: `Invoice ${approval.invoice?.invoiceNumber} requires approval`
      }
    })

    // Notify next approver
    await this.notifyApprover(approver, approval.invoice, workflow)
  }

  /**
   * Handle rejection
   */
  private static async handleRejection(tenantId: string, approval: any): Promise<void> {
    // Update invoice status
    await prisma.invoice.update({
      where: { id: approval.entityId },
      data: { status: 'rejected' }
    })

    // Notify invoice creator
    // This would typically notify the user who created the invoice
  }

  /**
   * Handle escalation
   */
  private static async handleEscalation(tenantId: string, approval: any, reason?: string): Promise<void> {
    // Find escalation approver (typically a manager or admin)
    const escalationApprover = await prisma.appUser.findFirst({
      where: {
        tenantId,
        role: 'admin' // This should be based on escalation rules
      }
    })

    if (escalationApprover) {
      // Create escalation approval
      await prisma.approval.create({
        data: {
          tenantId,
          workflowId: approval.workflowId,
          entityType: 'invoice',
          entityId: approval.entityId,
          stepNumber: approval.stepNumber,
          approverId: escalationApprover.id,
          status: 'pending',
          comments: `Escalated: ${reason || 'No reason provided'}`,
          isEscalation: true
        }
      })

      // Notify escalation approver
      await this.notifyApprover(escalationApprover, approval.invoice, approval.workflow)
    }
  }
}
