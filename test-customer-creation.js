const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCustomerCreation() {
  console.log('Testing customer creation without payment processor...');
  
  try {
    const customer = await prisma.customer.create({
      data: {
        tenantId: 'tenant_demo',
        companyId: 'seed-company-2',
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1-555-0123',
        taxNumber: 'TAX123',
        address: '123 Test Street',
        currency: 'USD',
        customerType: 'individual',
        status: 'active'
      }
    });
    
    console.log('✅ Customer created successfully:', customer.name);
    console.log('Customer ID:', customer.id);
    
    // Clean up
    await prisma.customer.delete({ where: { id: customer.id } });
    console.log('✅ Test customer cleaned up');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCustomerCreation();
