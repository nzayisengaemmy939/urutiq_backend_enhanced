import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkFrontendCreatedPOs() {
  try {
    console.log('=== CHECKING PURCHASE ORDERS ===\n');
    
    // Get all purchase orders sorted by creation date
    const allPOs = await prisma.purchaseOrder.findMany({
      select: {
        id: true,
        poNumber: true,
        companyId: true,
        tenantId: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
        orderDate: true,
        vendor: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Total Purchase Orders: ${allPOs.length}\n`);
    
    // Show all POs with their creation dates
    console.log('All Purchase Orders (newest first):');
    console.log('═══════════════════════════════════════════════════════════════════════\n');
    
    allPOs.forEach((po, index) => {
      console.log(`${index + 1}. ${po.poNumber}`);
      console.log(`   Vendor: ${po.vendor?.name || 'N/A'}`);
      console.log(`   Status: ${po.status}`);
      console.log(`   Amount: $${Number(po.totalAmount).toFixed(2)}`);
      console.log(`   Created: ${new Date(po.createdAt).toLocaleString()}`);
      console.log(`   Updated: ${new Date(po.updatedAt).toLocaleString()}`);
      console.log(`   Order Date: ${po.orderDate}`);
      console.log(`   Company ID: ${po.companyId}`);
      console.log(`   Tenant ID: ${po.tenantId}`);
      console.log('');
    });
    
    // Find the most recently created one (likely from frontend)
    if (allPOs.length > 0) {
      const mostRecent = allPOs[0];
      console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
      console.log('║  MOST RECENTLY CREATED (Likely your frontend creation):              ║');
      console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
      console.log(`   PO Number: ${mostRecent.poNumber}`);
      console.log(`   Vendor: ${mostRecent.vendor?.name || 'N/A'}`);
      console.log(`   Status: ${mostRecent.status}`);
      console.log(`   Amount: $${Number(mostRecent.totalAmount).toFixed(2)}`);
      console.log(`   Created: ${new Date(mostRecent.createdAt).toLocaleString()}`);
      console.log(`   Company ID: ${mostRecent.companyId}`);
      console.log(`   Tenant ID: ${mostRecent.tenantId}\n`);
    }
    
    // Check if there are any POs created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const createdToday = allPOs.filter(po => {
      const poDate = new Date(po.createdAt);
      poDate.setHours(0, 0, 0, 0);
      return poDate.getTime() === today.getTime();
    });
    
    if (createdToday.length > 0) {
      console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
      console.log('║  PURCHASE ORDERS CREATED TODAY:                                       ║');
      console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
      createdToday.forEach((po, index) => {
        console.log(`${index + 1}. ${po.poNumber} - ${po.vendor?.name || 'N/A'} - $${Number(po.totalAmount).toFixed(2)}`);
        console.log(`   Created: ${new Date(po.createdAt).toLocaleString()}`);
        console.log(`   Company: ${po.companyId}, Tenant: ${po.tenantId}\n`);
      });
    } else {
      console.log('\n❌ No purchase orders created today.\n');
    }
    
    // Group by company
    console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
    console.log('║  PURCHASE ORDERS BY COMPANY:                                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');
    
    const byCompany = {};
    for (const po of allPOs) {
      if (!byCompany[po.companyId]) {
        byCompany[po.companyId] = [];
      }
      byCompany[po.companyId].push(po);
    }
    
    for (const [companyId, pos] of Object.entries(byCompany)) {
      // Get company name
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true }
      });
      
      console.log(`Company: ${company?.name || 'Unknown'} (${companyId})`);
      console.log(`  Count: ${pos.length} purchase orders`);
      console.log(`  PO Numbers: ${pos.map(p => p.poNumber).join(', ')}\n`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFrontendCreatedPOs();
