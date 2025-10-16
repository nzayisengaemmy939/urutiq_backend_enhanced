import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateProductsForPOS() {
  console.log('🔄 Updating products to make them available for POS...');
  
  try {
    // Update products with stock to have matching available quantities
    const updates = [
      { id: 'clrb5e4cw000a13ny9n6s9gcx', name: 'iPhone 15 Pro', stock: 19, available: 19 },
      { id: 'clrb5e4cw000b13ny8w7z2mfx', name: 'Cotton T-Shirt (Large)', stock: 60, available: 60 },
      { id: 'clrb5e4cw000c13nyh5p8k1dx', name: 'Premium Coffee Beans', stock: 69, available: 69 },
      { id: 'clrb5e4cw000d13ny3x9l4nfx', name: 'Limited Edition Watch', stock: 3, available: 3 },
      // Services with unlimited stock
      { name: 'Business Strategy Consultation', unitPrice: 350 },
      { name: 'IT Support (Hourly)', unitPrice: 125 },
      { name: 'Logo Design Package', unitPrice: 800 },
      { name: 'Digital Marketing Campaign', unitPrice: 1800 }
    ];

    // Update products by name since we can see them in the list
    const productUpdates = [
      { name: 'iPhone 15 Pro', availableQuantity: 19 },
      { name: 'Cotton T-Shirt (Large)', availableQuantity: 60 },
      { name: 'Premium Coffee Beans', availableQuantity: 69 },
      { name: 'Limited Edition Watch', availableQuantity: 3 },
      { name: 'Business Strategy Consultation', availableQuantity: 999 },
      { name: 'IT Support (Hourly)', availableQuantity: 999 },
      { name: 'Logo Design Package', availableQuantity: 999 },
      { name: 'Digital Marketing Campaign', availableQuantity: 999 }
    ];

    for (const update of productUpdates) {
      await prisma.product.updateMany({
        where: {
          companyId: 'cmgfgiqos0001szdhlotx8vhg',
          name: update.name
        },
        data: {
          availableQuantity: update.availableQuantity
        }
      });
      console.log(`✅ Updated ${update.name} - Available: ${update.availableQuantity}`);
    }

    console.log('🎉 Products updated successfully for POS testing!');
    
    // Show updated products
    const products = await prisma.product.findMany({
      where: { 
        companyId: 'cmgfgiqos0001szdhlotx8vhg',
        availableQuantity: { gt: 0 }
      },
      select: { 
        name: true, 
        unitPrice: true, 
        stockQuantity: true, 
        availableQuantity: true,
        status: true,
        type: true 
      }
    });
    
    console.log('\\n📦 Available products for POS:');
    products.forEach((p, i) => {
      console.log(`${i+1}. ${p.name} - $${p.unitPrice} - Stock: ${p.stockQuantity || 0} - Available: ${p.availableQuantity} - ${p.type}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateProductsForPOS();