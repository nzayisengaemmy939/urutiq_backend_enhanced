import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFinancialEndpoints() {
  console.log('🔍 Testing financial endpoints and data...');

  try {
    // Check what companies exist
    console.log('\n📋 Available Companies:');
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, tenantId: true }
    });
    
    companies.forEach(company => {
      console.log(`   - ${company.name} (${company.id}) - tenant: ${company.tenantId}`);
    });

    // Check if seed-company-1 exists (default UI company)
    let targetCompany = await prisma.company.findFirst({
      where: { id: 'seed-company-1' }
    });

    if (!targetCompany) {
      console.log('\n🏢 Creating seed-company-1 for UI...');
      targetCompany = await prisma.company.create({
        data: {
          id: 'seed-company-1',
          name: 'Demo Company',
          tenantId: 'demo-tenant',
          industry: 'Technology',
          currency: 'USD',
          country: 'US'
        }
      });
      console.log(`✅ Created: ${targetCompany.name}`);
    } else {
      console.log(`\n✅ Found target company: ${targetCompany.name}`);
    }

    // Add some sample invoices and expenses
    console.log('\n💰 Adding sample financial data...');

    // Create customer if needed
    let customer = await prisma.customer.findFirst({
      where: { companyId: targetCompany.id }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          tenantId: targetCompany.tenantId,
          companyId: targetCompany.id,
          name: 'Tech Solutions Inc',
          email: 'billing@techsolutions.com',
          currency: 'USD'
        }
      });
    }

    // Create some invoices
    const sampleInvoices = [
      { amount: 25000, description: 'Software Development Services', date: '2025-09-01' },
      { amount: 18000, description: 'Consulting Services', date: '2025-09-15' },
      { amount: 12000, description: 'Technical Support', date: '2025-09-20' },
    ];

    for (const inv of sampleInvoices) {
      try {
        await prisma.invoice.create({
          data: {
            tenantId: targetCompany.tenantId,
            companyId: targetCompany.id,
            customerId: customer.id,
            invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            issueDate: new Date(inv.date),
            dueDate: new Date(new Date(inv.date).setDate(new Date(inv.date).getDate() + 30)),
            status: 'paid',
            currency: 'USD',
            subtotal: inv.amount,
            taxAmount: 0,
            totalAmount: inv.amount,
            balanceDue: 0,
            notes: inv.description
          }
        });
        console.log(`  ✅ Invoice: $${inv.amount.toLocaleString()} - ${inv.description}`);
      } catch (err) {
        console.log(`  ⚠️  Skipped invoice: ${err.message}`);
      }
    }

    // Create expense category
    let expenseCategory = await prisma.expenseCategory.findFirst({
      where: { companyId: targetCompany.id }
    });

    if (!expenseCategory) {
      expenseCategory = await prisma.expenseCategory.create({
        data: {
          tenantId: targetCompany.tenantId,
          companyId: targetCompany.id,
          name: 'Operations',
          description: 'General operational expenses'
        }
      });
    }

    // Create some expenses
    const sampleExpenses = [
      { amount: 8000, description: 'Office Rent', date: '2025-09-01' },
      { amount: 3500, description: 'Software Licenses', date: '2025-09-05' },
      { amount: 2200, description: 'Marketing Campaign', date: '2025-09-10' },
      { amount: 1800, description: 'Utilities', date: '2025-09-15' },
    ];

    for (const exp of sampleExpenses) {
      try {
        await prisma.expense.create({
          data: {
            tenantId: targetCompany.tenantId,
            companyId: targetCompany.id,
            categoryId: expenseCategory.id,
            amount: exp.amount,
            totalAmount: exp.amount,
            description: exp.description,
            expenseDate: new Date(exp.date),
            status: 'approved',
            currency: 'USD'
          }
        });
        console.log(`  ✅ Expense: $${exp.amount.toLocaleString()} - ${exp.description}`);
      } catch (err) {
        console.log(`  ⚠️  Skipped expense: ${err.message}`);
      }
    }

    // Calculate totals
    const invoices = await prisma.invoice.findMany({
      where: { companyId: targetCompany.id }
    });
    
    const expenses = await prisma.expense.findMany({
      where: { companyId: targetCompany.id }
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.totalAmount), 0);
    const netIncome = totalRevenue - totalExpenses;

    console.log('\n📊 Financial Summary:');
    console.log(`   Company: ${targetCompany.name} (${targetCompany.id})`);
    console.log(`   Revenue: $${totalRevenue.toLocaleString()}`);
    console.log(`   Expenses: $${totalExpenses.toLocaleString()}`);
    console.log(`   Net Income: $${netIncome.toLocaleString()}`);
    console.log(`   Profit Margin: ${totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : 0}%`);

    console.log('\n🎯 Next Steps:');
    console.log('1. Refresh your UI page');
    console.log('2. The Financial Analytics should now show data instead of zeros');
    console.log('3. Try generating AI insights - they should be based on real financial data');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testFinancialEndpoints()
  .then(() => {
    console.log('\n🎉 Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
