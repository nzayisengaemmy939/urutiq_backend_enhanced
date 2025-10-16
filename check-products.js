import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProducts() {
  const products = await prisma.product.findMany({
    where: { companyId: 'cmgfgiqos0001szdhlotx8vhg' },
    select: { 
      id: true, 
      name: true, 
      unitPrice: true, 
      stockQuantity: true, 
      availableQuantity: true,
      status: true,
      type: true 
    }
  });
  
  console.log('📦 Existing products:');
  products.forEach((p, i) => {
    console.log(`${i+1}. ${p.name} - $${p.unitPrice} - Stock: ${p.stockQuantity || 0} - Available: ${p.availableQuantity || 0} - Status: ${p.status} - Type: ${p.type}`);
  });
  
  await prisma.$disconnect();
}

checkProducts().catch(console.error);