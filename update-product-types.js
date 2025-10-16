import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateProductTypes() {
  try {
    console.log('Updating existing products to have type "PRODUCT"...');
    
    const result = await prisma.product.updateMany({
      where: {
        OR: [
          { type: null },
          { type: undefined },
          { type: '' }
        ]
      },
      data: {
        type: 'PRODUCT'
      }
    });
    
    console.log(`Updated ${result.count} products with type "PRODUCT"`);
    
    // Also update all products to PRODUCT type if they exist
    const allProductsResult = await prisma.product.updateMany({
      data: {
        type: 'PRODUCT'
      }
    });
    
    console.log(`Set type "PRODUCT" for ${allProductsResult.count} total products`);
    
  } catch (error) {
    console.error('Error updating products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateProductTypes();
