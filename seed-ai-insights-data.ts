import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAIInsightsData() {
  const tenantId = 'tenant_1759326251514_z9gbpg8hv'; // Your tenant ID
  const companyId = 'cmg81fbt30001124ck0jol9xx'; // Your company ID
  
  console.log('🌱 Seeding AI Insights test data...');
  
  try {
    // Create a customer
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        companyId,
        name: 'Acme Corporation',
        email: 'billing@acme.com',
        phone: '+1234567890',
        type: 'business'
      }
    });
    console.log('✅ Created customer:', customer.id);

    // Create invoices (revenue)
    const invoices = await Promise.all([
      prisma.invoice.create({
        data: {
          tenantId,
          companyId,
          customerId: customer.id,
          invoiceNumber: `INV-${Date.now()}-1`,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'PAID',
          currency: 'USD',
          subtotal: 5000,
          taxAmount: 500,
          discountAmount: 0,
          totalAmount: 5500,
          balanceDue: 0,
          notes: 'Consulting services - Q1'
        }
      }),
      prisma.invoice.create({
        data: {
          tenantId,
          companyId,
          customerId: customer.id,
          invoiceNumber: `INV-${Date.now()}-2`,
          issueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          status: 'PAID',
          currency: 'USD',
          subtotal: 8000,
          taxAmount: 800,
          discountAmount: 0,
          totalAmount: 8800,
          balanceDue: 0,
          notes: 'Development services - Q1'
        }
      }),
      prisma.invoice.create({
        data: {
          tenantId,
          companyId,
          customerId: customer.id,
          invoiceNumber: `INV-${Date.now()}-3`,
          issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
          currency: 'USD',
          subtotal: 3000,
          taxAmount: 300,
          discountAmount: 0,
          totalAmount: 3300,
          balanceDue: 3300,
          notes: 'Support services - Q1'
        }
      })
    ]);
    console.log('✅ Created', invoices.length, 'invoices');

    // Create more expenses
    const expenses = await Promise.all([
      prisma.expense.create({
        data: {
          tenantId,
          companyId,
          amount: 1200,
          currency: 'USD',
          category: 'Office Supplies',
          description: 'Office furniture and equipment',
          expenseDate: new Date(),
          status: 'approved'
        }
      }),
      prisma.expense.create({
        data: {
          tenantId,
          companyId,
          amount: 2500,
          currency: 'USD',
          category: 'Software',
          description: 'Annual software licenses',
          expenseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          status: 'approved'
        }
      }),
      prisma.expense.create({
        data: {
          tenantId,
          companyId,
          amount: 800,
          currency: 'USD',
          category: 'Marketing',
          description: 'Social media advertising',
          expenseDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          status: 'approved'
        }
      }),
      prisma.expense.create({
        data: {
          tenantId,
          companyId,
          amount: 1500,
          currency: 'USD',
          category: 'Travel',
          description: 'Client meeting travel expenses',
          expenseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          status: 'approved'
        }
      })
    ]);
    console.log('✅ Created', expenses.length, 'expenses');

    console.log('\n📊 Summary:');
    console.log('Total Revenue (Invoices):', invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0));
    console.log('Total Expenses:', expenses.reduce((sum, exp) => sum + Number(exp.amount), 0) + 300); // Including existing 300
    console.log('Expected Profit:', invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0) - (expenses.reduce((sum, exp) => sum + Number(exp.amount), 0) + 300));
    
    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAIInsightsData();
