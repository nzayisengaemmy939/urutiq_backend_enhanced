// ==================== UNIFIED APPROVAL SYSTEM - USAGE EXAMPLES ====================
// This file demonstrates how to use the unified approval system for different scenarios

import { UnifiedApprovalEngine } from '../services/unified-approval-engine.service';

// ==================== EXAMPLE 1: JOURNAL ENTRY APPROVAL ====================

export async function createJournalEntryApproval() {
  // Create approval request for a high-value journal entry
  const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(
    'tenant_demo',                    // tenantId
    'cmgfgiqos0001szdhlotx8vhg',     // companyId
    'journal_entry',                  // entityType
    'je-12345',                      // entityId
    'adjustment',                    // entitySubType
    'user-123',                      // requestedBy
    { 
      amount: 50000,                 // metadata
      description: 'Year-end adjustment',
      accountType: 'expense'
    }
  );

  console.log('Journal entry approval created:', approvalRequest.id);
  return approvalRequest;
}

// ==================== EXAMPLE 2: INVOICE APPROVAL ====================

export async function createInvoiceApproval() {
  // Create approval request for a large invoice
  const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(
    'tenant_demo',
    'cmgfgiqos0001szdhlotx8vhg',
    'invoice',
    'inv-67890',
    'high_value',
    'user-456',
    {
      amount: 100000,
      customerId: 'cust-123',
      currency: 'USD',
      dueDate: '2024-12-31'
    }
  );

  console.log('Invoice approval created:', approvalRequest.id);
  return approvalRequest;
}

// ==================== EXAMPLE 3: PURCHASE ORDER APPROVAL ====================

export async function createPurchaseOrderApproval() {
  // Create approval request for a purchase order
  const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(
    'tenant_demo',
    'cmgfgiqos0001szdhlotx8vhg',
    'purchase_order',
    'po-54321',
    'equipment',
    'user-789',
    {
      amount: 25000,
      vendorId: 'vendor-456',
      items: ['Laptop', 'Monitor', 'Keyboard'],
      department: 'IT'
    }
  );

  console.log('Purchase order approval created:', approvalRequest.id);
  return approvalRequest;
}

// ==================== EXAMPLE 4: PROCESS APPROVAL ACTION ====================

export async function processApproval() {
  // Approve a pending approval request
  const result = await UnifiedApprovalEngine.processApprovalAction(
    'tenant_demo',           // tenantId
    'approval-request-123',  // approvalRequestId
    'assignee-456',          // assigneeId
    'approve',               // action
    'Approved after review', // comments
    undefined                 // escalationReason
  );

  console.log('Approval processed:', result.id);
  return result;
}

// ==================== EXAMPLE 5: REJECT APPROVAL ====================

export async function rejectApproval() {
  // Reject a pending approval request
  const result = await UnifiedApprovalEngine.processApprovalAction(
    'tenant_demo',
    'approval-request-123',
    'assignee-456',
    'reject',
    'Insufficient documentation provided',
    undefined
  );

  console.log('Approval rejected:', result.id);
  return result;
}

// ==================== EXAMPLE 6: ESCALATE APPROVAL ====================

export async function escalateApproval() {
  // Escalate a pending approval request
  const result = await UnifiedApprovalEngine.processApprovalAction(
    'tenant_demo',
    'approval-request-123',
    'assignee-456',
    'escalate',
    'Requires higher authority approval',
    'Amount exceeds department limit'
  );

  console.log('Approval escalated:', result.id);
  return result;
}

// ==================== EXAMPLE 7: CREATE WORKFLOW ====================

export async function createApprovalWorkflow() {
  // Create a multi-step approval workflow for high-value transactions
  const workflow = await UnifiedApprovalEngine.createWorkflow({
    tenantId: 'tenant_demo',
    companyId: 'cmgfgiqos0001szdhlotx8vhg',
    name: 'High-Value Transaction Approval',
    description: 'Multi-step approval for transactions over $10,000',
    entityType: 'journal_entry',
    entitySubType: 'high_value',
    isActive: true,
    steps: [
      {
        id: 'step-1',
        name: 'Department Manager Approval',
        approverType: 'role',
        role: 'manager',
        isRequired: true,
        order: 1,
        escalationHours: 24
      },
      {
        id: 'step-2',
        name: 'Finance Director Approval',
        approverType: 'role',
        role: 'finance_director',
        isRequired: true,
        order: 2,
        escalationHours: 48
      },
      {
        id: 'step-3',
        name: 'CFO Final Approval',
        approverType: 'role',
        role: 'cfo',
        isRequired: true,
        order: 3,
        escalationHours: 72
      }
    ],
    conditions: [
      {
        field: 'amount',
        operator: 'greater_than',
        value: 10000
      }
    ],
    autoApproval: false,
    escalationRules: [
      {
        stepId: 'step-1',
        escalationHours: 24,
        escalateTo: 'manager',
        notificationChannels: ['email', 'slack']
      },
      {
        stepId: 'step-2',
        escalationHours: 48,
        escalateTo: 'ceo',
        notificationChannels: ['email', 'sms']
      }
    ],
    priority: 'high'
  });

  console.log('Workflow created:', workflow.id);
  return workflow;
}

// ==================== EXAMPLE 8: AMOUNT-BASED APPROVAL ====================

export async function createAmountBasedWorkflow() {
  // Create workflow with amount-based approval routing
  const workflow = await UnifiedApprovalEngine.createWorkflow({
    tenantId: 'tenant_demo',
    companyId: 'cmgfgiqos0001szdhlotx8vhg',
    name: 'Amount-Based Purchase Approval',
    description: 'Different approvers based on purchase amount',
    entityType: 'purchase_order',
    isActive: true,
    steps: [
      {
        id: 'step-1',
        name: 'Manager Approval',
        approverType: 'amount_based',
        amountThreshold: 1000,
        isRequired: true,
        order: 1
      },
      {
        id: 'step-2',
        name: 'Director Approval',
        approverType: 'amount_based',
        amountThreshold: 10000,
        isRequired: true,
        order: 2
      },
      {
        id: 'step-3',
        name: 'CFO Approval',
        approverType: 'amount_based',
        amountThreshold: 50000,
        isRequired: true,
        order: 3
      }
    ],
    conditions: [],
    autoApproval: false,
    escalationRules: [],
    priority: 'medium'
  });

  console.log('Amount-based workflow created:', workflow.id);
  return workflow;
}

// ==================== EXAMPLE 9: PARALLEL APPROVAL ====================

export async function createParallelApprovalWorkflow() {
  // Create workflow with parallel approval steps
  const workflow = await UnifiedApprovalEngine.createWorkflow({
    tenantId: 'tenant_demo',
    companyId: 'cmgfgiqos0001szdhlotx8vhg',
    name: 'Parallel Department Approval',
    description: 'Multiple departments approve simultaneously',
    entityType: 'expense',
    entitySubType: 'department_expense',
    isActive: true,
    steps: [
      {
        id: 'step-1',
        name: 'Department Head Approval',
        approverType: 'department',
        department: 'sales',
        isRequired: true,
        order: 1
      },
      {
        id: 'step-2',
        name: 'Finance Team Approval',
        approverType: 'role',
        role: 'accountant',
        isRequired: true,
        order: 1  // Same order = parallel
      },
      {
        id: 'step-3',
        name: 'HR Approval',
        approverType: 'role',
        role: 'hr_manager',
        isRequired: true,
        order: 1  // Same order = parallel
      }
    ],
    conditions: [],
    autoApproval: false,
    escalationRules: [],
    priority: 'medium'
  });

  console.log('Parallel approval workflow created:', workflow.id);
  return workflow;
}

// ==================== EXAMPLE 10: AUTO-APPROVAL WORKFLOW ====================

export async function createAutoApprovalWorkflow() {
  // Create workflow with auto-approval for low-value items
  const workflow = await UnifiedApprovalEngine.createWorkflow({
    tenantId: 'tenant_demo',
    companyId: 'cmgfgiqos0001szdhlotx8vhg',
    name: 'Low-Value Auto-Approval',
    description: 'Auto-approve low-value transactions',
    entityType: 'expense',
    entitySubType: 'low_value',
    isActive: true,
    steps: [
      {
        id: 'step-1',
        name: 'Auto-Approval',
        approverType: 'user',
        approverId: 'system',
        isRequired: false,
        order: 1,
        autoApprove: true
      }
    ],
    conditions: [
      {
        field: 'amount',
        operator: 'less_than',
        value: 100
      }
    ],
    autoApproval: true,
    escalationRules: [],
    priority: 'low'
  });

  console.log('Auto-approval workflow created:', workflow.id);
  return workflow;
}

// ==================== INTEGRATION EXAMPLES ====================

// Example: Integrate with existing journal entry creation
export async function createJournalEntryWithApproval() {
  // 1. Create journal entry
  const journalEntry = await prisma.journalEntry.create({
    data: {
      tenantId: 'tenant_demo',
      companyId: 'cmgfgiqos0001szdhlotx8vhg',
      reference: 'JE-2024-001',
      description: 'Year-end adjustment',
      total: 50000,
      status: 'DRAFT'
    }
  });

  // 2. Create approval request
  const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(
    'tenant_demo',
    'cmgfgiqos0001szdhlotx8vhg',
    'journal_entry',
    journalEntry.id,
    'adjustment',
    'user-123',
    { amount: journalEntry.total }
  );

  console.log('Journal entry created with approval:', {
    journalEntry: journalEntry.id,
    approvalRequest: approvalRequest.id
  });

  return { journalEntry, approvalRequest };
}

// Example: Integrate with existing invoice creation
export async function createInvoiceWithApproval() {
  // 1. Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: 'tenant_demo',
      companyId: 'cmgfgiqos0001szdhlotx8vhg',
      invoiceNumber: 'INV-2024-001',
      total: 100000,
      status: 'DRAFT'
    }
  });

  // 2. Create approval request
  const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(
    'tenant_demo',
    'cmgfgiqos0001szdhlotx8vhg',
    'invoice',
    invoice.id,
    'high_value',
    'user-456',
    { amount: invoice.total, customerId: 'cust-123' }
  );

  console.log('Invoice created with approval:', {
    invoice: invoice.id,
    approvalRequest: approvalRequest.id
  });

  return { invoice, approvalRequest };
}

// ==================== USAGE IN EXISTING CODE ====================

// Before: Journal entry approval
/*
const approval = await prisma.journalEntryApproval.create({
  data: {
    tenantId: req.tenantId!,
    entryId: journalEntry.id,
    requestedById: req.user?.id!,
    approvedById: approverId,
    status: 'PENDING'
  }
});
*/

// After: Unified approval
/*
const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(
  req.tenantId!,
  req.body.companyId,
  'journal_entry',
  journalEntry.id,
  'adjustment',
  req.user?.id!,
  { amount: journalEntry.total }
);
*/

// Before: Invoice approval
/*
const invoiceApproval = await InvoiceApprovalService.createApproval(
  req.tenantId!,
  invoice.id,
  approverId
);
*/

// After: Unified approval
/*
const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(
  req.tenantId!,
  req.body.companyId,
  'invoice',
  invoice.id,
  'high_value',
  req.user?.id!,
  { amount: invoice.total }
);
*/

export {
  createJournalEntryApproval,
  createInvoiceApproval,
  createPurchaseOrderApproval,
  processApproval,
  rejectApproval,
  escalateApproval,
  createApprovalWorkflow,
  createAmountBasedWorkflow,
  createParallelApprovalWorkflow,
  createAutoApprovalWorkflow,
  createJournalEntryWithApproval,
  createInvoiceWithApproval
};
