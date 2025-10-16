import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedUnifiedApprovals() {
  console.log('🌱 Starting comprehensive unified approval system seeding...');

  try {
    // Clean up existing data
    console.log('🧹 Cleaning up existing unified approval data...');
    await prisma.unifiedApprovalNotificationSettings.deleteMany({});
    await prisma.unifiedApprovalAudit.deleteMany({});
    await prisma.unifiedApprovalAssignee.deleteMany({});
    await prisma.unifiedApprovalRequest.deleteMany({});
    await prisma.unifiedApprovalTemplate.deleteMany({});
    await prisma.unifiedApprovalWorkflow.deleteMany({});

    // Get or create test users
    console.log('👥 Creating test users...');
    const tenantId = 'tenant_demo';
    const companyId = 'cmgfgiqos0001szdhlotx8vhg';

    const users = await Promise.all([
      // Admin user
      prisma.appUser.upsert({
        where: { tenantId_email: { tenantId, email: 'admin@test.com' } },
        update: {},
        create: {
          tenantId,
          email: 'admin@test.com',
          name: 'System Administrator',
          role: 'admin'
        }
      }),
      // Manager user
      prisma.appUser.upsert({
        where: { tenantId_email: { tenantId, email: 'manager@test.com' } },
        update: {},
        create: {
          tenantId,
          email: 'manager@test.com',
          name: 'John Manager',
          role: 'accountant'
        }
      }),
      // CFO user
      prisma.appUser.upsert({
        where: { tenantId_email: { tenantId, email: 'cfo@test.com' } },
        update: {},
        create: {
          tenantId,
          email: 'cfo@test.com',
          name: 'Jane CFO',
          role: 'auditor'
        }
      }),
      // Employee user
      prisma.appUser.upsert({
        where: { tenantId_email: { tenantId, email: 'employee@test.com' } },
        update: {},
        create: {
          tenantId,
          email: 'employee@test.com',
          name: 'Bob Employee',
          role: 'employee'
        }
      })
    ]);

    console.log('✅ Created users:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));

    // Create approval workflows
    console.log('🔄 Creating approval workflows...');
    
    const workflows = await Promise.all([
      // Journal Entry Approval Workflow
      prisma.unifiedApprovalWorkflow.create({
        data: {
          tenantId,
          companyId,
          name: 'Journal Entry Approval',
          description: 'Standard approval workflow for journal entries',
          entityType: 'journal_entry',
          entitySubType: 'adjustment',
          isActive: true,
          steps: JSON.stringify([
            {
              id: 'step-1',
              name: 'Manager Review',
              approverType: 'role',
              role: 'accountant',
              isRequired: true,
              order: 1,
              autoApprove: false,
              escalationHours: 24
            },
            {
              id: 'step-2',
              name: 'CFO Approval',
              approverType: 'role',
              role: 'auditor',
              isRequired: true,
              order: 2,
              autoApprove: false,
              escalationHours: 48
            }
          ]),
          conditions: JSON.stringify([
            {
              field: 'amount',
              operator: 'greater_than',
              value: 1000,
              logicalOperator: 'AND'
            }
          ]),
          autoApproval: false,
          escalationRules: JSON.stringify([
            {
              condition: 'timeout',
              action: 'escalate',
              targetRole: 'admin',
              hours: 72
            }
          ]),
          priority: 'medium',
          createdBy: users[0].id,
          updatedBy: users[0].id
        }
      }),

      // Invoice Approval Workflow
      prisma.unifiedApprovalWorkflow.create({
        data: {
          tenantId,
          companyId,
          name: 'High Value Invoice Approval',
          description: 'Approval workflow for high-value invoices',
          entityType: 'invoice',
          entitySubType: 'high_value',
          isActive: true,
          steps: JSON.stringify([
            {
              id: 'step-1',
              name: 'Manager Review',
              approverType: 'role',
              role: 'accountant',
              isRequired: true,
              order: 1,
              autoApprove: false,
              escalationHours: 12
            },
            {
              id: 'step-2',
              name: 'CFO Approval',
              approverType: 'role',
              role: 'auditor',
              isRequired: true,
              order: 2,
              autoApprove: false,
              escalationHours: 24
            },
            {
              id: 'step-3',
              name: 'CEO Final Approval',
              approverType: 'role',
              role: 'admin',
              isRequired: true,
              order: 3,
              autoApprove: false,
              escalationHours: 48
            }
          ]),
          conditions: JSON.stringify([
            {
              field: 'totalAmount',
              operator: 'greater_than',
              value: 5000,
              logicalOperator: 'AND'
            }
          ]),
          autoApproval: false,
          escalationRules: JSON.stringify([
            {
              condition: 'timeout',
              action: 'escalate',
              targetRole: 'admin',
              hours: 48
            }
          ]),
          priority: 'high',
          createdBy: users[0].id,
          updatedBy: users[0].id
        }
      }),

      // Purchase Order Approval Workflow
      prisma.unifiedApprovalWorkflow.create({
        data: {
          tenantId,
          companyId,
          name: 'Purchase Order Approval',
          description: 'Approval workflow for purchase orders',
          entityType: 'purchase_order',
          entitySubType: 'standard',
          isActive: true,
          steps: JSON.stringify([
            {
              id: 'step-1',
              name: 'Department Head Review',
              approverType: 'role',
              role: 'accountant',
              isRequired: true,
              order: 1,
              autoApprove: false,
              escalationHours: 24
            },
            {
              id: 'step-2',
              name: 'Finance Approval',
              approverType: 'role',
              role: 'auditor',
              isRequired: true,
              order: 2,
              autoApprove: false,
              escalationHours: 48
            }
          ]),
          conditions: JSON.stringify([
            {
              field: 'totalAmount',
              operator: 'greater_than',
              value: 500,
              logicalOperator: 'AND'
            }
          ]),
          autoApproval: false,
          escalationRules: JSON.stringify([
            {
              condition: 'timeout',
              action: 'escalate',
              targetRole: 'admin',
              hours: 72
            }
          ]),
          priority: 'medium',
          createdBy: users[0].id,
          updatedBy: users[0].id
        }
      }),

      // Expense Approval Workflow
      prisma.unifiedApprovalWorkflow.create({
        data: {
          tenantId,
          companyId,
          name: 'Expense Approval',
          description: 'Approval workflow for expense reports',
          entityType: 'expense',
          entitySubType: 'travel',
          isActive: true,
          steps: JSON.stringify([
            {
              id: 'step-1',
              name: 'Manager Approval',
              approverType: 'role',
              role: 'accountant',
              isRequired: true,
              order: 1,
              autoApprove: false,
              escalationHours: 48
            }
          ]),
          conditions: JSON.stringify([
            {
              field: 'amount',
              operator: 'greater_than',
              value: 100,
              logicalOperator: 'AND'
            }
          ]),
          autoApproval: false,
          escalationRules: JSON.stringify([
            {
              condition: 'timeout',
              action: 'escalate',
              targetRole: 'admin',
              hours: 96
            }
          ]),
          priority: 'low',
          createdBy: users[0].id,
          updatedBy: users[0].id
        }
      }),

      // Auto-approval workflow for small amounts
      prisma.unifiedApprovalWorkflow.create({
        data: {
          tenantId,
          companyId,
          name: 'Auto-Approval Small Amounts',
          description: 'Automatic approval for small journal entries',
          entityType: 'journal_entry',
          entitySubType: 'small_amount',
          isActive: true,
          steps: JSON.stringify([
            {
              id: 'step-1',
              name: 'Auto Approval',
              approverType: 'role',
              role: 'system',
              isRequired: false,
              order: 1,
              autoApprove: true,
              escalationHours: 0
            }
          ]),
          conditions: JSON.stringify([
            {
              field: 'amount',
              operator: 'less_than',
              value: 100,
              logicalOperator: 'AND'
            }
          ]),
          autoApproval: true,
          escalationRules: JSON.stringify([]),
          priority: 'low',
          createdBy: users[0].id,
          updatedBy: users[0].id
        }
      })
    ]);

    console.log('✅ Created workflows:', workflows.map(w => ({ id: w.id, name: w.name, entityType: w.entityType })));

    // Create approval templates
    console.log('📋 Creating approval templates...');
    
    const templates = await Promise.all([
      prisma.unifiedApprovalTemplate.create({
        data: {
          tenantId,
          companyId,
          name: 'Standard Journal Entry Template',
          description: 'Template for standard journal entry approvals',
          entityType: 'journal_entry',
          entitySubType: 'standard',
          templateData: JSON.stringify({
            steps: [
              {
                id: 'step-1',
                name: 'Manager Review',
                approverType: 'role',
                role: 'accountant',
                isRequired: true,
                order: 1,
                autoApprove: false,
                escalationHours: 24
              }
            ],
            conditions: [
              {
                field: 'amount',
                operator: 'greater_than',
                value: 500,
                logicalOperator: 'AND'
              }
            ],
            autoApproval: false,
            priority: 'medium'
          }),
          isSystem: true,
          isActive: true,
          createdBy: users[0].id
        }
      }),

      prisma.unifiedApprovalTemplate.create({
        data: {
          tenantId,
          companyId,
          name: 'High Value Invoice Template',
          description: 'Template for high-value invoice approvals',
          entityType: 'invoice',
          entitySubType: 'high_value',
          templateData: JSON.stringify({
            steps: [
              {
                id: 'step-1',
                name: 'Manager Review',
                approverType: 'role',
                role: 'accountant',
                isRequired: true,
                order: 1,
                autoApprove: false,
                escalationHours: 12
              },
              {
                id: 'step-2',
                name: 'CFO Approval',
                approverType: 'role',
                role: 'auditor',
                isRequired: true,
                order: 2,
                autoApprove: false,
                escalationHours: 24
              }
            ],
            conditions: [
              {
                field: 'totalAmount',
                operator: 'greater_than',
                value: 2000,
                logicalOperator: 'AND'
              }
            ],
            autoApproval: false,
            priority: 'high'
          }),
          isSystem: true,
          isActive: true,
          createdBy: users[0].id
        }
      })
    ]);

    console.log('✅ Created templates:', templates.map(t => ({ id: t.id, name: t.name, entityType: t.entityType })));

    // Create approval requests
    console.log('📝 Creating approval requests...');
    
    const requests = await Promise.all([
      // Pending journal entry request
      prisma.unifiedApprovalRequest.create({
        data: {
          tenantId,
          companyId,
          entityType: 'journal_entry',
          entityId: 'je-001',
          entitySubType: 'adjustment',
          workflowId: workflows[0].id,
          status: 'pending',
          currentStep: 1,
          totalSteps: 2,
          completedSteps: 0,
          requestedBy: users[3].id, // employee
          requestedAt: new Date(),
          comments: 'Monthly adjustment for depreciation',
          metadata: JSON.stringify({
            amount: 2500,
            description: 'Depreciation adjustment for office equipment',
            account: 'Accumulated Depreciation'
          })
        }
      }),

      // Approved invoice request
      prisma.unifiedApprovalRequest.create({
        data: {
          tenantId,
          companyId,
          entityType: 'invoice',
          entityId: 'inv-001',
          entitySubType: 'high_value',
          workflowId: workflows[1].id,
          status: 'approved',
          currentStep: 3,
          totalSteps: 3,
          completedSteps: 3,
          requestedBy: users[3].id, // employee
          requestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          comments: 'High-value invoice for software license',
          metadata: JSON.stringify({
            totalAmount: 15000,
            customerName: 'Acme Corp',
            description: 'Annual software license renewal'
          })
        }
      }),

      // Rejected purchase order request
      prisma.unifiedApprovalRequest.create({
        data: {
          tenantId,
          companyId,
          entityType: 'purchase_order',
          entityId: 'po-001',
          entitySubType: 'standard',
          workflowId: workflows[2].id,
          status: 'rejected',
          currentStep: 1,
          totalSteps: 2,
          completedSteps: 1,
          requestedBy: users[3].id, // employee
          requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          rejectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          comments: 'Purchase order for office supplies',
          metadata: JSON.stringify({
            totalAmount: 800,
            vendorName: 'Office Depot',
            description: 'Office supplies and stationery'
          })
        }
      }),

      // Escalated expense request
      prisma.unifiedApprovalRequest.create({
        data: {
          tenantId,
          companyId,
          entityType: 'expense',
          entityId: 'exp-001',
          entitySubType: 'travel',
          workflowId: workflows[3].id,
          status: 'escalated',
          currentStep: 2,
          totalSteps: 1,
          completedSteps: 0,
          requestedBy: users[3].id, // employee
          requestedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          comments: 'Business travel expenses',
          metadata: JSON.stringify({
            amount: 2500,
            description: 'Client meeting travel expenses',
            location: 'New York'
          })
        }
      })
    ]);

    console.log('✅ Created requests:', requests.map(r => ({ id: r.id, entityType: r.entityType, status: r.status })));

    // Create approval assignees
    console.log('👤 Creating approval assignees...');
    
    const assignees = await Promise.all([
      // Pending journal entry assignees
      prisma.unifiedApprovalAssignee.create({
        data: {
          tenantId,
          approvalRequestId: requests[0].id,
          userId: users[1].id, // manager
          stepId: 'step-1',
          stepName: 'Manager Review',
          status: 'pending',
          assignedAt: new Date()
        }
      }),
      prisma.unifiedApprovalAssignee.create({
        data: {
          tenantId,
          approvalRequestId: requests[0].id,
          userId: users[2].id, // CFO
          stepId: 'step-2',
          stepName: 'CFO Approval',
          status: 'pending',
          assignedAt: new Date()
        }
      }),

      // Approved invoice assignees
      prisma.unifiedApprovalAssignee.create({
        data: {
          tenantId,
          approvalRequestId: requests[1].id,
          userId: users[1].id, // manager
          stepId: 'step-1',
          stepName: 'Manager Review',
          status: 'approved',
          assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000),
          comments: 'Approved - within budget'
        }
      }),
      prisma.unifiedApprovalAssignee.create({
        data: {
          tenantId,
          approvalRequestId: requests[1].id,
          userId: users[2].id, // CFO
          stepId: 'step-2',
          stepName: 'CFO Approval',
          status: 'approved',
          assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          comments: 'Approved - necessary for operations'
        }
      }),
      prisma.unifiedApprovalAssignee.create({
        data: {
          tenantId,
          approvalRequestId: requests[1].id,
          userId: users[0].id, // admin
          stepId: 'step-3',
          stepName: 'CEO Final Approval',
          status: 'approved',
          assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000),
          comments: 'Final approval granted'
        }
      }),

      // Rejected purchase order assignees
      prisma.unifiedApprovalAssignee.create({
        data: {
          tenantId,
          approvalRequestId: requests[2].id,
          userId: users[1].id, // manager
          stepId: 'step-1',
          stepName: 'Department Head Review',
          status: 'rejected',
          assignedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          comments: 'Rejected - not in current budget'
        }
      }),

      // Escalated expense assignees
      prisma.unifiedApprovalAssignee.create({
        data: {
          tenantId,
          approvalRequestId: requests[3].id,
          userId: users[1].id, // manager
          stepId: 'step-1',
          stepName: 'Manager Approval',
          status: 'escalated',
          assignedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          escalatedTo: users[0].id, // escalated to admin
          escalationReason: 'Manager unavailable - escalated to admin'
        }
      })
    ]);

    console.log('✅ Created assignees:', assignees.length);

    // Create audit logs
    console.log('📊 Creating audit logs...');
    
    const audits = await Promise.all([
      // Journal entry audit logs
      prisma.unifiedApprovalAudit.create({
        data: {
          tenantId,
          approvalRequestId: requests[0].id,
          action: 'created',
          userId: users[3].id,
          userName: users[3].name,
          userEmail: users[3].email,
          comments: 'Journal entry approval request created',
          metadata: JSON.stringify({ amount: 2500 }),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),

      // Invoice audit logs
      prisma.unifiedApprovalAudit.create({
        data: {
          tenantId,
          approvalRequestId: requests[1].id,
          action: 'created',
          userId: users[3].id,
          userName: users[3].name,
          userEmail: users[3].email,
          comments: 'High-value invoice approval request created',
          metadata: JSON.stringify({ totalAmount: 15000 }),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),
      prisma.unifiedApprovalAudit.create({
        data: {
          tenantId,
          approvalRequestId: requests[1].id,
          action: 'step_completed',
          userId: users[1].id,
          userName: users[1].name,
          userEmail: users[1].email,
          stepId: 'step-1',
          stepName: 'Manager Review',
          comments: 'Approved - within budget',
          metadata: JSON.stringify({ decision: 'approved' }),
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }),
      prisma.unifiedApprovalAudit.create({
        data: {
          tenantId,
          approvalRequestId: requests[1].id,
          action: 'approved',
          userId: users[0].id,
          userName: users[0].name,
          userEmail: users[0].email,
          stepId: 'step-3',
          stepName: 'CEO Final Approval',
          comments: 'Final approval granted',
          metadata: JSON.stringify({ decision: 'approved' }),
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        }
      }),

      // Purchase order audit logs
      prisma.unifiedApprovalAudit.create({
        data: {
          tenantId,
          approvalRequestId: requests[2].id,
          action: 'created',
          userId: users[3].id,
          userName: users[3].name,
          userEmail: users[3].email,
          comments: 'Purchase order approval request created',
          metadata: JSON.stringify({ totalAmount: 800 }),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),
      prisma.unifiedApprovalAudit.create({
        data: {
          tenantId,
          approvalRequestId: requests[2].id,
          action: 'rejected',
          userId: users[1].id,
          userName: users[1].name,
          userEmail: users[1].email,
          stepId: 'step-1',
          stepName: 'Department Head Review',
          comments: 'Rejected - not in current budget',
          metadata: JSON.stringify({ decision: 'rejected', reason: 'budget' }),
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }),

      // Expense audit logs
      prisma.unifiedApprovalAudit.create({
        data: {
          tenantId,
          approvalRequestId: requests[3].id,
          action: 'created',
          userId: users[3].id,
          userName: users[3].name,
          userEmail: users[3].email,
          comments: 'Expense approval request created',
          metadata: JSON.stringify({ amount: 2500 }),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),
      prisma.unifiedApprovalAudit.create({
        data: {
          tenantId,
          approvalRequestId: requests[3].id,
          action: 'escalated',
          userId: users[1].id,
          userName: users[1].name,
          userEmail: users[1].email,
          stepId: 'step-1',
          stepName: 'Manager Approval',
          comments: 'Escalated due to manager unavailability',
          metadata: JSON.stringify({ reason: 'unavailable', escalatedTo: users[0].id }),
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      })
    ]);

    console.log('✅ Created audit logs:', audits.length);

    // Create notification settings
    console.log('🔔 Creating notification settings...');
    
    const notificationSettings = await Promise.all([
      prisma.unifiedApprovalNotificationSettings.create({
        data: {
          tenantId,
          companyId,
          userId: users[0].id, // admin
          notificationChannels: JSON.stringify(['email', 'slack']),
          emailEnabled: true,
          smsEnabled: false,
          slackEnabled: true,
          teamsEnabled: false,
          escalationEnabled: true,
          reminderEnabled: true,
          reminderHours: 24
        }
      }),
      prisma.unifiedApprovalNotificationSettings.create({
        data: {
          tenantId,
          companyId,
          userId: users[1].id, // manager
          notificationChannels: JSON.stringify(['email']),
          emailEnabled: true,
          smsEnabled: false,
          slackEnabled: false,
          teamsEnabled: false,
          escalationEnabled: true,
          reminderEnabled: true,
          reminderHours: 12
        }
      }),
      prisma.unifiedApprovalNotificationSettings.create({
        data: {
          tenantId,
          companyId,
          userId: users[2].id, // CFO
          notificationChannels: JSON.stringify(['email', 'teams']),
          emailEnabled: true,
          smsEnabled: false,
          slackEnabled: false,
          teamsEnabled: true,
          escalationEnabled: true,
          reminderEnabled: true,
          reminderHours: 6
        }
      }),
      prisma.unifiedApprovalNotificationSettings.create({
        data: {
          tenantId,
          companyId,
          userId: users[3].id, // employee
          notificationChannels: JSON.stringify(['email']),
          emailEnabled: true,
          smsEnabled: false,
          slackEnabled: false,
          teamsEnabled: false,
          escalationEnabled: false,
          reminderEnabled: false,
          reminderHours: 48
        }
      })
    ]);

    console.log('✅ Created notification settings:', notificationSettings.length);

    // Summary
    console.log('\n🎉 Unified Approval System Seeding Complete!');
    console.log('📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   🔄 Workflows: ${workflows.length}`);
    console.log(`   📋 Templates: ${templates.length}`);
    console.log(`   📝 Requests: ${requests.length}`);
    console.log(`   👤 Assignees: ${assignees.length}`);
    console.log(`   📊 Audit Logs: ${audits.length}`);
    console.log(`   🔔 Notification Settings: ${notificationSettings.length}`);

    console.log('\n📋 Created Workflows:');
    workflows.forEach(w => {
      console.log(`   • ${w.name} (${w.entityType}) - ${w.isActive ? 'Active' : 'Inactive'}`);
    });

    console.log('\n📝 Created Requests:');
    requests.forEach(r => {
      console.log(`   • ${r.entityType} ${r.entityId} - ${r.status.toUpperCase()}`);
    });

    console.log('\n✅ All data has been successfully seeded!');

  } catch (error) {
    console.error('❌ Error seeding unified approval system:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedUnifiedApprovals()
  .then(() => {
    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });

export { seedUnifiedApprovals };
