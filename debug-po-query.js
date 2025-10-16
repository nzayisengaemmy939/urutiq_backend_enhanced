import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugPurchaseOrderQuery() {
  try {
    const companyId = 'cmgfgiqos0001szdhlotx8vhg'; // testing company
    const tenantId = 'tenant_demo';
    
    console.log('=== DEBUGGING PURCHASE ORDER QUERY ===\n');
    console.log('Query parameters:');
    console.log('  companyId:', companyId);
    console.log('  tenantId:', tenantId);
    console.log('');
    
    // Test 1: Query with tenantId only
    console.log('Test 1: Query with tenantId only');
    const withTenantOnly = await prisma.purchaseOrder.findMany({
      where: { tenantId },
      take: 5,
      select: { id: true, poNumber: true, companyId: true, tenantId: true }
    });
    console.log('  Found:', withTenantOnly.length, 'purchase orders');
    console.log('  Sample:', JSON.stringify(withTenantOnly.slice(0, 2), null, 2));
    console.log('');
    
    // Test 2: Query with both tenantId and companyId
    console.log('Test 2: Query with BOTH tenantId and companyId');
    const withBoth = await prisma.purchaseOrder.findMany({
      where: { 
        tenantId,
        companyId 
      },
      take: 5,
      select: { id: true, poNumber: true, companyId: true, tenantId: true }
    });
    console.log('  Found:', withBoth.length, 'purchase orders');
    console.log('  Sample:', JSON.stringify(withBoth.slice(0, 2), null, 2));
    console.log('');
    
    // Test 3: Check what companyIds exist
    console.log('Test 3: All unique companyIds in purchase orders:');
    const companies = await prisma.purchaseOrder.groupBy({
      by: ['companyId'],
      _count: true
    });
    console.log(JSON.stringify(companies, null, 2));
    console.log('');
    
    // Test 4: Check if companyId is null
    console.log('Test 4: Purchase orders with NULL companyId:');
    const nullCompany = await prisma.purchaseOrder.count({
      where: { companyId: null }
    });
    console.log('  Count:', nullCompany);
    console.log('');
    
    // Test 5: Simulate exact backend query
    console.log('Test 5: Exact backend query simulation');
    const where = {
      tenantId,
      companyId: companyId || undefined,
    };
    // Remove undefined values like backend does
    Object.keys(where).forEach((k) => where[k] === undefined && delete where[k]);
    
    console.log('  Where clause:', JSON.stringify(where, null, 2));
    const backendResult = await prisma.purchaseOrder.findMany({
      where,
      take: 5,
      select: { id: true, poNumber: true, companyId: true, tenantId: true, status: true }
    });
    console.log('  Found:', backendResult.length, 'purchase orders');
    console.log('  Sample:', JSON.stringify(backendResult.slice(0, 2), null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPurchaseOrderQuery();
