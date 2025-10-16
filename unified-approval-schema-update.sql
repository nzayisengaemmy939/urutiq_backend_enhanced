-- ==================== UNIFIED APPROVAL SYSTEM SCHEMA ====================
-- This file contains the database schema updates needed for the centralized approval system

-- 1. Enhanced Approval Workflow Table
CREATE TABLE IF NOT EXISTS "ApprovalWorkflow" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "entityType" TEXT NOT NULL, -- journal_entry, invoice, purchase_order, expense, bill, document, recurring_invoice
  "entitySubType" TEXT, -- adjustment, reversal, high_value, etc.
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "steps" TEXT NOT NULL, -- JSON array of ApprovalStep objects
  "conditions" TEXT, -- JSON array of ApprovalCondition objects
  "autoApproval" BOOLEAN NOT NULL DEFAULT false,
  "escalationRules" TEXT, -- JSON array of EscalationRule objects
  "priority" TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL
);

-- 2. Approval Request Table (replaces individual approval tables)
CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL, -- journal_entry, invoice, purchase_order, etc.
  "entityId" TEXT NOT NULL, -- ID of the entity being approved
  "entitySubType" TEXT, -- adjustment, reversal, high_value, etc.
  "workflowId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, escalated, cancelled
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "totalSteps" INTEGER NOT NULL,
  "completedSteps" INTEGER NOT NULL DEFAULT 0,
  "requestedBy" TEXT NOT NULL,
  "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" DATETIME,
  "rejectedAt" DATETIME,
  "cancelledAt" DATETIME,
  "comments" TEXT,
  "metadata" TEXT, -- JSON object for additional data
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE
);

-- 3. Approval Assignee Table (tracks individual approvers)
CREATE TABLE IF NOT EXISTS "ApprovalAssignee" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "approvalRequestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stepId" TEXT NOT NULL, -- ID from the workflow step
  "stepName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, escalated, skipped
  "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
  "comments" TEXT,
  "escalatedTo" TEXT, -- User ID if escalated
  "escalationReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE
);

-- 4. Approval Audit Trail Table
CREATE TABLE IF NOT EXISTS "ApprovalAudit" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "approvalRequestId" TEXT NOT NULL,
  "action" TEXT NOT NULL, -- created, step_completed, approved, rejected, escalated, cancelled
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "stepId" TEXT,
  "stepName" TEXT,
  "comments" TEXT,
  "metadata" TEXT, -- JSON object for additional data
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE
);

-- 5. Approval Template Table (for common workflow patterns)
CREATE TABLE IF NOT EXISTS "ApprovalTemplate" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "entityType" TEXT NOT NULL,
  "entitySubType" TEXT,
  "templateData" TEXT NOT NULL, -- JSON object containing workflow configuration
  "isSystem" BOOLEAN NOT NULL DEFAULT false, -- System templates vs user-created
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL
);

-- 6. Approval Notification Settings Table
CREATE TABLE IF NOT EXISTS "ApprovalNotificationSettings" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "notificationChannels" TEXT NOT NULL, -- JSON array: email, sms, slack, teams
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
  "teamsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
  "reminderHours" INTEGER NOT NULL DEFAULT 24,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE
);

-- ==================== INDEXES ====================

-- Approval Workflow indexes
CREATE INDEX IF NOT EXISTS "idx_approval_workflow_tenant_company" ON "ApprovalWorkflow"("tenantId", "companyId");
CREATE INDEX IF NOT EXISTS "idx_approval_workflow_entity_type" ON "ApprovalWorkflow"("entityType", "entitySubType");
CREATE INDEX IF NOT EXISTS "idx_approval_workflow_active" ON "ApprovalWorkflow"("isActive");

-- Approval Request indexes
CREATE INDEX IF NOT EXISTS "idx_approval_request_tenant_company" ON "ApprovalRequest"("tenantId", "companyId");
CREATE INDEX IF NOT EXISTS "idx_approval_request_entity" ON "ApprovalRequest"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "idx_approval_request_status" ON "ApprovalRequest"("status");
CREATE INDEX IF NOT EXISTS "idx_approval_request_requested_by" ON "ApprovalRequest"("requestedBy");
CREATE INDEX IF NOT EXISTS "idx_approval_request_workflow" ON "ApprovalRequest"("workflowId");

-- Approval Assignee indexes
CREATE INDEX IF NOT EXISTS "idx_approval_assignee_request" ON "ApprovalAssignee"("approvalRequestId");
CREATE INDEX IF NOT EXISTS "idx_approval_assignee_user" ON "ApprovalAssignee"("userId");
CREATE INDEX IF NOT EXISTS "idx_approval_assignee_status" ON "ApprovalAssignee"("status");
CREATE INDEX IF NOT EXISTS "idx_approval_assignee_step" ON "ApprovalAssignee"("stepId");

-- Approval Audit indexes
CREATE INDEX IF NOT EXISTS "idx_approval_audit_request" ON "ApprovalAudit"("approvalRequestId");
CREATE INDEX IF NOT EXISTS "idx_approval_audit_user" ON "ApprovalAudit"("userId");
CREATE INDEX IF NOT EXISTS "idx_approval_audit_action" ON "ApprovalAudit"("action");
CREATE INDEX IF NOT EXISTS "idx_approval_audit_created" ON "ApprovalAudit"("createdAt");

-- Approval Template indexes
CREATE INDEX IF NOT EXISTS "idx_approval_template_tenant_company" ON "ApprovalTemplate"("tenantId", "companyId");
CREATE INDEX IF NOT EXISTS "idx_approval_template_entity" ON "ApprovalTemplate"("entityType", "entitySubType");
CREATE INDEX IF NOT EXISTS "idx_approval_template_system" ON "ApprovalTemplate"("isSystem");

-- Approval Notification Settings indexes
CREATE INDEX IF NOT EXISTS "idx_approval_notification_user" ON "ApprovalNotificationSettings"("userId");
CREATE INDEX IF NOT EXISTS "idx_approval_notification_tenant" ON "ApprovalNotificationSettings"("tenantId", "companyId");

-- ==================== MIGRATION NOTES ====================

-- 1. This schema replaces the existing fragmented approval systems:
--    - JournalEntryApproval
--    - InvoiceApproval (if exists)
--    - DocumentWorkflow
--    - Any other entity-specific approval tables

-- 2. Migration strategy:
--    - Create new tables alongside existing ones
--    - Migrate existing approval data to new schema
--    - Update application code to use new unified system
--    - Drop old approval tables after migration is complete

-- 3. Benefits of unified approach:
--    - Single source of truth for all approvals
--    - Consistent approval workflow across all entities
--    - Centralized approval management and reporting
--    - Easier to maintain and extend
--    - Better audit trail and compliance
--    - Unified notification system
--    - Advanced workflow features (escalation, conditions, etc.)

-- 4. Entity types supported:
--    - journal_entry: Journal entries, adjustments, reversals
--    - invoice: Sales invoices, credit notes
--    - purchase_order: Purchase orders, receipts
--    - expense: Expense reports, reimbursements
--    - bill: Vendor bills, payments
--    - document: Document approvals, signatures
--    - recurring_invoice: Recurring invoice generation

-- 5. Workflow features:
--    - Multi-step approvals
--    - Role-based approvers
--    - Amount-based approval routing
--    - Conditional workflows
--    - Escalation rules
--    - Auto-approval for low-value items
--    - Parallel and sequential approval steps
--    - Approval templates for common patterns
