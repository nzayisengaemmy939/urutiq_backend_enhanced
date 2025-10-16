import { prisma } from '../prisma.ts';

async function seedAccountsPayable() {
  console.log('🌱 Seeding Enhanced Accounts Payable data...');

  try {
    // Get or create demo tenant and company
    let tenant = await prisma.tenant.findFirst({
      where: { id: 'tenant_demo' }
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          id: 'tenant_demo',
          name: 'Demo Tenant',
          domain: 'demo.urutiiq.com',
          isActive: true
        }
      });
    }

    let company = await prisma.company.findFirst({
      where: { 
        tenantId: 'tenant_demo',
        id: 'seed-company-1'
      }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          id: 'seed-company-1',
          tenantId: 'tenant_demo',
          name: 'Uruti Hub Limited',
          industry: 'Technology',
          taxId: 'TAX123456789',
          country: 'US',
          currency: 'USD',
          fiscalYearStart: new Date('2024-01-01')
        }
      });
    }

    // Create vendors
    const vendors = await Promise.all([
      prisma.vendor.upsert({
        where: { 
          tenantId_companyId_name: {
            tenantId: 'tenant_demo',
            companyId: 'seed-company-1',
            name: 'Tech Supplies Inc'
          }
        },
        update: {},
        create: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          name: 'Tech Supplies Inc',
          email: 'orders@techsupplies.com',
          phone: '+1-555-0123',
          address: '123 Tech Street, Silicon Valley, CA 94000',
          taxId: 'VENDOR001',
          paymentTerms: 30,
          isActive: true
        }
      }),
      prisma.vendor.upsert({
        where: { 
          tenantId_companyId_name: {
            tenantId: 'tenant_demo',
            companyId: 'seed-company-1',
            name: 'Office Solutions Ltd'
          }
        },
        update: {},
        create: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          name: 'Office Solutions Ltd',
          email: 'billing@officesolutions.com',
          phone: '+1-555-0456',
          address: '456 Office Ave, Business District, NY 10001',
          taxId: 'VENDOR002',
          paymentTerms: 15,
          isActive: true
        }
      }),
      prisma.vendor.upsert({
        where: { 
          tenantId_companyId_name: {
            tenantId: 'tenant_demo',
            companyId: 'seed-company-1',
            name: 'Marketing Partners Co'
          }
        },
        update: {},
        create: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          name: 'Marketing Partners Co',
          email: 'invoices@marketingpartners.com',
          phone: '+1-555-0789',
          address: '789 Marketing Blvd, Creative City, CA 90210',
          taxId: 'VENDOR003',
          paymentTerms: 45,
          isActive: true
        }
      }),
      prisma.vendor.upsert({
        where: { 
          tenantId_companyId_name: {
            tenantId: 'tenant_demo',
            companyId: 'seed-company-1',
            name: 'Cloud Services Pro'
          }
        },
        update: {},
        create: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          name: 'Cloud Services Pro',
          email: 'billing@cloudservices.com',
          phone: '+1-555-0321',
          address: '321 Cloud Drive, Data Center, TX 75001',
          taxId: 'VENDOR004',
          paymentTerms: 30,
          isActive: true
        }
      })
    ]);

    console.log(`✅ Created ${vendors.length} vendors`);

    // Create sample invoice captures
    const invoiceCaptures = await Promise.all([
      prisma.invoiceCapture.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          vendorId: vendors[0].id,
          invoiceNumber: 'INV-2024-001',
          invoiceDate: new Date('2024-01-15'),
          dueDate: new Date('2024-02-14'),
          totalAmount: 2500.00,
          subtotal: 2272.73,
          taxAmount: 227.27,
          currency: 'USD',
          status: 'captured',
          source: 'manual',
          notes: 'Laptop computers and accessories'
        }
      }),
      prisma.invoiceCapture.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          vendorId: vendors[1].id,
          invoiceNumber: 'INV-2024-002',
          invoiceDate: new Date('2024-01-20'),
          dueDate: new Date('2024-02-04'),
          totalAmount: 850.00,
          subtotal: 772.73,
          taxAmount: 77.27,
          currency: 'USD',
          status: 'processing',
          source: 'email',
          notes: 'Office furniture and supplies'
        }
      }),
      prisma.invoiceCapture.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          vendorId: vendors[2].id,
          invoiceNumber: 'INV-2024-003',
          invoiceDate: new Date('2024-01-25'),
          dueDate: new Date('2024-03-11'),
          totalAmount: 5000.00,
          subtotal: 4545.45,
          taxAmount: 454.55,
          currency: 'USD',
          status: 'matched',
          source: 'api',
          notes: 'Digital marketing campaign services'
        }
      }),
      prisma.invoiceCapture.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          vendorId: vendors[3].id,
          invoiceNumber: 'INV-2024-004',
          invoiceDate: new Date('2024-02-01'),
          dueDate: new Date('2024-03-02'),
          totalAmount: 1200.00,
          subtotal: 1090.91,
          taxAmount: 109.09,
          currency: 'USD',
          status: 'approved',
          source: 'ocr',
          notes: 'Cloud hosting and storage services'
        }
      }),
      prisma.invoiceCapture.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          vendorId: vendors[0].id,
          invoiceNumber: 'INV-2024-005',
          invoiceDate: new Date('2024-02-05'),
          dueDate: new Date('2024-03-06'),
          totalAmount: 1800.00,
          subtotal: 1636.36,
          taxAmount: 163.64,
          currency: 'USD',
          status: 'paid',
          source: 'upload',
          notes: 'Software licenses and maintenance'
        }
      })
    ]);

    console.log(`✅ Created ${invoiceCaptures.length} invoice captures`);

    // Create sample bills from approved invoices
    const bills = await Promise.all([
      prisma.bill.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          vendorId: vendors[3].id,
          billNumber: 'BILL-INV-2024-004',
          billDate: new Date('2024-02-01'),
          dueDate: new Date('2024-03-02'),
          totalAmount: 1200.00,
          subtotal: 1090.91,
          taxAmount: 109.09,
          status: 'posted',
          balanceDue: 1200.00,
          invoiceCaptureId: invoiceCaptures[3].id
        }
      }),
      prisma.bill.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          vendorId: vendors[0].id,
          billNumber: 'BILL-INV-2024-005',
          billDate: new Date('2024-02-05'),
          dueDate: new Date('2024-03-06'),
          totalAmount: 1800.00,
          subtotal: 1636.36,
          taxAmount: 163.64,
          status: 'paid',
          balanceDue: 0.00,
          invoiceCaptureId: invoiceCaptures[4].id
        }
      }),
      prisma.bill.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          vendorId: vendors[1].id,
          billNumber: 'BILL-2024-001',
          billDate: new Date('2024-01-10'),
          dueDate: new Date('2024-02-09'),
          totalAmount: 1500.00,
          subtotal: 1363.64,
          taxAmount: 136.36,
          status: 'partially_paid',
          balanceDue: 750.00
        }
      }),
      prisma.bill.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          vendorId: vendors[2].id,
          billNumber: 'BILL-2024-002',
          billDate: new Date('2024-01-15'),
          dueDate: new Date('2024-01-30'),
          totalAmount: 3000.00,
          subtotal: 2727.27,
          taxAmount: 272.73,
          status: 'overdue',
          balanceDue: 3000.00
        }
      })
    ]);

    console.log(`✅ Created ${bills.length} bills`);

    // Create sample invoice matching records
    const invoiceMatching = await prisma.invoiceMatching.create({
      data: {
        tenantId: 'tenant_demo',
        companyId: 'seed-company-1',
        invoiceId: invoiceCaptures[2].id,
        matchingType: 'two_way',
        status: 'matched',
        matchScore: 95.0,
        discrepancies: JSON.stringify([]),
        matchedBy: 'system',
        matchedAt: new Date('2024-01-26')
      }
    });

    console.log('✅ Created invoice matching record');

    // Create sample invoice approval records
    const invoiceApprovals = await Promise.all([
      prisma.invoiceApproval.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          invoiceId: invoiceCaptures[3].id,
          approverId: 'admin-user',
          approvalLevel: 1,
          status: 'approved',
          comments: 'Approved for payment - within budget',
          approvedAt: new Date('2024-02-02')
        }
      }),
      prisma.invoiceApproval.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          invoiceId: invoiceCaptures[4].id,
          approverId: 'admin-user',
          approvalLevel: 1,
          status: 'approved',
          comments: 'Software licenses approved',
          approvedAt: new Date('2024-02-06')
        }
      })
    ]);

    console.log(`✅ Created ${invoiceApprovals.length} invoice approvals`);

    // Create sample payment schedules
    const paymentSchedules = await Promise.all([
      prisma.paymentSchedule.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          billId: bills[0].id,
          scheduledDate: new Date('2024-03-01'),
          amount: 1200.00,
          paymentMethod: 'bank_transfer',
          priority: 'normal',
          notes: 'Scheduled payment for cloud services'
        }
      }),
      prisma.paymentSchedule.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          billId: bills[2].id,
          scheduledDate: new Date('2024-02-15'),
          amount: 750.00,
          paymentMethod: 'check',
          priority: 'high',
          notes: 'Remaining balance payment'
        }
      })
    ]);

    console.log(`✅ Created ${paymentSchedules.length} payment schedules`);

    // Create sample AP reconciliation
    const reconciliation = await prisma.aPReconciliation.create({
      data: {
        tenantId: 'tenant_demo',
        companyId: 'seed-company-1',
        reconciliationDate: new Date('2024-02-01'),
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        status: 'completed',
        totalOutstanding: 4950.00,
        totalReconciled: 4950.00,
        reconciledBy: 'admin-user',
        reviewedBy: 'manager-user',
        completedAt: new Date('2024-02-01')
      }
    });

    // Create reconciliation items
    const reconciliationItems = await Promise.all([
      prisma.aPReconciliationItem.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          reconciliationId: reconciliation.id,
          billId: bills[0].id,
          expectedAmount: 1200.00,
          actualAmount: 1200.00,
          status: 'matched',
          resolvedAt: new Date('2024-02-01')
        }
      }),
      prisma.aPReconciliationItem.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          reconciliationId: reconciliation.id,
          billId: bills[1].id,
          expectedAmount: 1800.00,
          actualAmount: 1800.00,
          status: 'matched',
          resolvedAt: new Date('2024-02-01')
        }
      })
    ]);

    console.log(`✅ Created AP reconciliation with ${reconciliationItems.length} items`);

    // Create sample AP workflow
    const workflow = await prisma.aPWorkflow.create({
      data: {
        tenantId: 'tenant_demo',
        companyId: 'seed-company-1',
        name: 'Standard Invoice Approval Workflow',
        description: 'Standard workflow for invoice processing and approval',
        isActive: true,
        workflowSteps: JSON.stringify([
          {
            stepNumber: 1,
            stepType: 'validation',
            required: true,
            timeLimit: 24
          },
          {
            stepNumber: 2,
            stepType: 'matching',
            required: true,
            timeLimit: 48
          },
          {
            stepNumber: 3,
            stepType: 'approval',
            assignedTo: 'manager',
            required: true,
            timeLimit: 72
          }
        ]),
        approvalThresholds: JSON.stringify({
          '0-1000': 1,
          '1000-5000': 2,
          '5000+': 3
        }),
        autoApprovalRules: JSON.stringify([
          {
            condition: 'amount < 500 AND vendor.trusted = true',
            action: 'auto_approve'
          }
        ])
      }
    });

    console.log('✅ Created AP workflow');

    // Create sample workflow instances
    const workflowInstances = await Promise.all([
      prisma.aPWorkflowInstance.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          workflowId: workflow.id,
          invoiceId: invoiceCaptures[0].id,
          currentStep: 2,
          status: 'active',
          startedAt: new Date('2024-01-15')
        }
      }),
      prisma.aPWorkflowInstance.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          workflowId: workflow.id,
          invoiceId: invoiceCaptures[1].id,
          currentStep: 1,
          status: 'active',
          startedAt: new Date('2024-01-20')
        }
      })
    ]);

    console.log(`✅ Created ${workflowInstances.length} workflow instances`);

    // Create workflow steps
    const workflowSteps = await Promise.all([
      prisma.aPWorkflowStep.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          workflowInstanceId: workflowInstances[0].id,
          stepNumber: 1,
          stepType: 'validation',
          status: 'completed',
          completedAt: new Date('2024-01-16')
        }
      }),
      prisma.aPWorkflowStep.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          workflowInstanceId: workflowInstances[0].id,
          stepNumber: 2,
          stepType: 'matching',
          status: 'in_progress',
          dueDate: new Date('2024-01-18')
        }
      })
    ]);

    console.log(`✅ Created ${workflowSteps.length} workflow steps`);

    console.log('🎉 Enhanced Accounts Payable seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${vendors.length} vendors`);
    console.log(`- ${invoiceCaptures.length} invoice captures`);
    console.log(`- ${bills.length} bills`);
    console.log(`- ${invoiceApprovals.length} invoice approvals`);
    console.log(`- ${paymentSchedules.length} payment schedules`);
    console.log(`- 1 AP reconciliation with ${reconciliationItems.length} items`);
    console.log(`- 1 AP workflow with ${workflowInstances.length} instances`);
    console.log(`- ${workflowSteps.length} workflow steps`);

  } catch (error) {
    console.error('❌ Error seeding accounts payable data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAccountsPayable()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedAccountsPayable };
