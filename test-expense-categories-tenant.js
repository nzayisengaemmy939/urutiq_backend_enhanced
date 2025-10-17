import { PrismaClient } from '@prisma/client';

async function testExpenseCategoriesWithTenant() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing expense categories with tenant ID...');
    
    // Check what tenant IDs exist
    const tenants = await prisma.expenseCategory.findMany({
      select: {
        tenantId: true
      },
      distinct: ['tenantId']
    });
    
    console.log('📊 Available tenant IDs in expense categories:', tenants.map(t => t.tenantId));
    
    // Test query with tenant_demo (which should match the expense categories we found)
    const categories = await prisma.expenseCategory.findMany({
      where: {
        tenantId: 'tenant_demo',
        companyId: 'seed-company-1'
      }
    });
    
    console.log(`📦 Found ${categories.length} expense categories for tenant_demo and seed-company-1:`);
    console.log(JSON.stringify(categories, null, 2));
    
    // Test the API query format
    const apiQuery = await prisma.expenseCategory.findMany({
      where: {
        tenantId: 'tenant_demo',
        companyId: 'seed-company-1',
        isActive: true
      },
      include: {
        parent: true,
        children: true,
        budgets: { where: { isActive: true } },
        expenseRules: { where: { isActive: true } }
      },
      orderBy: [
        { parentId: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log(`\n🔧 API Query Result (${apiQuery.length} categories):`);
    console.log(JSON.stringify(apiQuery, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testExpenseCategoriesWithTenant();
