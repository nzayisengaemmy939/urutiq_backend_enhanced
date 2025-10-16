import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPurchaseOrders() {
  try {
    // Count total purchase orders
    const count = await prisma.purchaseOrder.count();
    console.log('Total purchase orders:', count);
    
    // Get all companies
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, tenantId: true }
    });
    console.log('\nCompanies:', JSON.stringify(companies, null, 2));
    
    // Get purchase orders with details
    const pos = await prisma.purchaseOrder.findMany({
      take: 5,
      select: {
        id: true,
        poNumber: true,
        companyId: true,
        tenantId: true,
        status: true,
        totalAmount: true,
        vendor: { select: { name: true } }
      }
    });
    console.log('\nSample purchase orders:', JSON.stringify(pos, null, 2));
    
    // Check by tenant
    const tenants = await prisma.purchaseOrder.groupBy({
      by: ['tenantId'],
      _count: true
    });
    console.log('\nPurchase orders by tenant:', JSON.stringify(tenants, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPurchaseOrders();
