// ==================== UNIFIED APPROVAL INTEGRATION EXAMPLES ====================
// This file demonstrates how to integrate the unified approval system with existing entity creation

import { prisma } from '../prisma.js';
import { UnifiedApprovalEngine } from '../services/unified-approval-engine.service.js';

// ==================== EXAMPLE 1: JOURNAL ENTRY WITH UNIFIED APPROVAL ====================

export async function createJournalEntryWithUnifiedApproval(
  tenantId: string,
  companyId: string,
  journalEntryData: {
    date: Date;
    memo: string;
    reference?: string;
    lines: Array<{
      accountId: string;
      debit?: number;
      credit?: number;
      memo?: string;
    }>;
    department?: string;
    project?: string;
    location?: string;
    createdById: string;
  }
) {
  // Step 1: Create the journal entry
  const journalEntry = await prisma.journalEntry.create({
    data: {
      tenantId,
      companyId,
      date: journalEntryData.date,
      memo: journalEntryData.memo,
      reference: journalEntryData.reference,
      status: 'DRAFT', // Start as draft
      createdById: journalEntryData.createdById,
      total: journalEntryData.lines.reduce((sum, line) => 
        sum + (line.debit || 0) + (line.credit || 0), 0
      )
    }
  });

  // Step 2: Create journal lines
  for (const line of journalEntryData.lines) {
    await prisma.journalLine.create({
      data: {
        tenantId,
        entryId: journalEntry.id,
        accountId: line.accountId,
        debit: line.debit || 0,
        credit: line.credit || 0,
        memo: line.memo,
        department: journalEntryData.department,
        project: journalEntryData.project,
        location: journalEntryData.location
      }
    });
  }

  // Step 3: Determine if approval is needed
  const totalAmount = journalEntryData.lines.reduce((sum, line) => 
    sum + (line.debit || 0) + (line.credit || 0), 0
  );

  const needsApproval = totalAmount > 1000; // Example threshold

  if (needsApproval) {
    // Step 4: Create unified approval request
    const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(
      tenantId,
      companyId,
      'journal_entry',
      journalEntry.id,
      'adjustment', // or determine based on entry type
      journalEntryData.createdById,
      {
        amount: totalAmount,
        description: journalEntryData.memo,
        department: journalEntryData.department,
        project: journalEntryData.project
      }
    );

    // Step 5: Update journal entry status to pending approval
    await prisma.journalEntry.update({
      where: { id: journalEntry.id },
      data: { status: 'PENDING_APPROVAL' }
    });

    console.log(`Journal entry ${journalEntry.id} created with approval request ${approvalRequest.id}`);
    return { journalEntry, approvalRequest };
  } else {
    // Step 6: Auto-approve if no approval needed
    await prisma.journalEntry.update({
      where: { id: journalEntry.id },
      data: { status: 'POSTED' }
    });

    console.log(`Journal entry ${journalEntry.id} created and auto-approved`);
    return { journalEntry, approvalRequest: null };
  }
}

// ==================== EXAMPLE 2: INVOICE WITH UNIFIED APPROVAL ====================

export async function createInvoiceWithUnifiedApproval(
  tenantId: string,
  companyId: string,
  invoiceData: {
    customerId: string;
    invoiceNumber: string;
    issueDate: Date;
    dueDate: Date;
    total: number;
    lines: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    createdById: string;
  }
) {
  // Step 1: Create the invoice
  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      companyId,
      customerId: invoiceData.customerId,
      invoiceNumber: invoiceData.invoiceNumber,
      issueDate: invoiceData.issueDate,
      dueDate: invoiceData.dueDate,
      total: invoiceData.total,
      status: 'DRAFT',
      createdBy: invoiceData.createdById
    }
  });

  // Step 2: Create invoice lines
  for (const line of invoiceData.lines) {
    await prisma.invoiceLine.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.total
      }
    });
  }

  // Step 3: Determine if approval is needed based on amount
  const needsApproval = invoiceData.total > 5000; // Example threshold

  if (needsApproval) {
    // Step 4: Create unified approval request
    const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(
      tenantId,
      companyId,
      'invoice',
      invoice.id,
      'high_value',
      invoiceData.createdById,
      {
        amount: invoiceData.total,
        customerId: invoiceData.customerId,
        invoiceNumber: invoiceData.invoiceNumber
      }
    );

    // Step 5: Update invoice status
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PENDING_APPROVAL' }
    });

    console.log(`Invoice ${invoice.id} created with approval request ${approvalRequest.id}`);
    return { invoice, approvalRequest };
  } else {
    // Step 6: Auto-approve if no approval needed
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'APPROVED' }
    });

    console.log(`Invoice ${invoice.id} created and auto-approved`);
    return { invoice, approvalRequest: null };
  }
}

// ==================== EXAMPLE 3: PURCHASE ORDER WITH UNIFIED APPROVAL ====================

export async function createPurchaseOrderWithUnifiedApproval(
  tenantId: string,
  companyId: string,
  poData: {
    vendorId: string;
    poNumber: string;
    orderDate: Date;
    expectedDate: Date;
    total: number;
    lines: Array<{
      productId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    createdById: string;
  }
) {
  // Step 1: Create the purchase order
  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      companyId,
      vendorId: poData.vendorId,
      poNumber: poData.poNumber,
      orderDate: poData.orderDate,
      expectedDate: poData.expectedDate,
      total: poData.total,
      status: 'draft',
      createdBy: poData.createdById
    }
  });

  // Step 2: Create purchase order lines
  for (const line of poData.lines) {
    await prisma.purchaseOrderLine.create({
      data: {
        tenantId,
        purchaseOrderId: purchaseOrder.id,
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.total
      }
    });
  }

  // Step 3: Determine if approval is needed
  const needsApproval = poData.total > 2000; // Example threshold

  if (needsApproval) {
    // Step 4: Create unified approval request
    const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(
      tenantId,
      companyId,
      'purchase_order',
      purchaseOrder.id,
      'equipment', // or determine based on category
      poData.createdById,
      {
        amount: poData.total,
        vendorId: poData.vendorId,
        poNumber: poData.poNumber,
        department: 'procurement'
      }
    );

    // Step 5: Update purchase order status
    await prisma.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: { status: 'pending_approval' }
    });

    console.log(`Purchase order ${purchaseOrder.id} created with approval request ${approvalRequest.id}`);
    return { purchaseOrder, approvalRequest };
  } else {
    // Step 6: Auto-approve if no approval needed
    await prisma.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: { status: 'approved' }
    });

    console.log(`Purchase order ${purchaseOrder.id} created and auto-approved`);
    return { purchaseOrder, approvalRequest: null };
  }
}

// ==================== EXAMPLE 4: HANDLE APPROVAL CALLBACK ====================

export async function handleApprovalCallback(
  tenantId: string,
  approvalRequestId: string,
  action: 'approved' | 'rejected'
) {
  // Get the approval request
  const approvalRequest = await prisma.unifiedApprovalRequest.findFirst({
    where: { id: approvalRequestId, tenantId }
  });

  if (!approvalRequest) {
    throw new Error('Approval request not found');
  }

  // Update the entity based on approval result
  switch (approvalRequest.entityType) {
    case 'journal_entry':
      await prisma.journalEntry.update({
        where: { id: approvalRequest.entityId },
        data: { 
          status: action === 'approved' ? 'POSTED' : 'DRAFT' 
        }
      });
      break;

    case 'invoice':
      await prisma.invoice.update({
        where: { id: approvalRequest.entityId },
        data: { 
          status: action === 'approved' ? 'APPROVED' : 'DRAFT' 
        }
      });
      break;

    case 'purchase_order':
      await prisma.purchaseOrder.update({
        where: { id: approvalRequest.entityId },
        data: { 
          status: action === 'approved' ? 'approved' : 'draft' 
        }
      });
      break;

    default:
      console.log(`Unknown entity type: ${approvalRequest.entityType}`);
  }

  console.log(`Entity ${approvalRequest.entityId} ${action} for approval request ${approvalRequestId}`);
}

// ==================== EXAMPLE 5: BATCH APPROVAL PROCESSING ====================

export async function processBatchApprovals(
  tenantId: string,
  companyId: string,
  entityType: string,
  entityIds: string[],
  requestedBy: string
) {
  const results = [];

  for (const entityId of entityIds) {
    try {
      // Get entity details
      let entity;
      let amount = 0;
      let metadata = {};

      switch (entityType) {
        case 'journal_entry':
          entity = await prisma.journalEntry.findUnique({
            where: { id: entityId },
            include: { lines: true }
          });
          if (entity) {
            amount = entity.lines.reduce((sum, line) => sum + Number(line.debit || 0) + Number(line.credit || 0), 0);
            metadata = { description: entity.memo, reference: entity.reference };
          }
          break;

        case 'invoice':
          entity = await prisma.invoice.findUnique({
            where: { id: entityId }
          });
          if (entity) {
            amount = Number(entity.total);
            metadata = { invoiceNumber: entity.invoiceNumber, customerId: entity.customerId };
          }
          break;

        case 'purchase_order':
          entity = await prisma.purchaseOrder.findUnique({
            where: { id: entityId }
          });
          if (entity) {
            amount = Number(entity.total);
            metadata = { poNumber: entity.poNumber, vendorId: entity.vendorId };
          }
          break;
      }

      if (!entity) {
        results.push({ entityId, success: false, error: 'Entity not found' });
        continue;
      }

      // Create approval request
      const approvalRequest = await UnifiedApprovalEngine.createApprovalRequest(
        tenantId,
        companyId,
        entityType,
        entityId,
        'batch_processing',
        requestedBy,
        { amount, ...metadata }
      );

      results.push({ entityId, success: true, approvalRequestId: approvalRequest.id });

    } catch (error) {
      results.push({ entityId, success: false, error: error.message });
    }
  }

  return results;
}

// ==================== USAGE EXAMPLES ====================

// Example usage in a route handler:
/*
router.post('/journal-entries', async (req: TenantRequest, res) => {
  try {
    const { journalEntryData } = req.body;
    
    const result = await createJournalEntryWithUnifiedApproval(
      req.tenantId!,
      req.body.companyId,
      journalEntryData
    );

    res.json({
      success: true,
      journalEntry: result.journalEntry,
      approvalRequest: result.approvalRequest
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/

export {
  createJournalEntryWithUnifiedApproval,
  createInvoiceWithUnifiedApproval,
  createPurchaseOrderWithUnifiedApproval,
  handleApprovalCallback,
  processBatchApprovals
};
