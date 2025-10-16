import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedInventory() {
  console.log('🏪 Starting inventory seeding...')
  
  try {
    const companyId = 'cmgfgiqos0001szdhlotx8vhg'
    const tenantId = 'tenant_1759774868089_she4mvwhb'
    
    // 1. Create Categories
    console.log('Creating product categories...')
    const categories = [
      {
        id: `cat-electronics-${companyId}`,
        tenantId,
        companyId,
        name: 'Electronics',
        description: 'Electronic devices and accessories',
        color: '#3B82F6',
        icon: 'smartphone'
      },
      {
        id: `cat-clothing-${companyId}`,
        tenantId,
        companyId,
        name: 'Clothing',
        description: 'Apparel and fashion items',
        color: '#EF4444',
        icon: 'shirt'
      },
      {
        id: `cat-food-${companyId}`,
        tenantId,
        companyId,
        name: 'Food & Beverages',
        description: 'Food items and drinks',
        color: '#10B981',
        icon: 'coffee'
      },
      {
        id: `cat-books-${companyId}`,
        tenantId,
        companyId,
        name: 'Books & Media',
        description: 'Books, magazines, and media',
        color: '#F59E0B',
        icon: 'book'
      },
      {
        id: `cat-home-${companyId}`,
        tenantId,
        companyId,
        name: 'Home & Garden',
        description: 'Home improvement and garden supplies',
        color: '#8B5CF6',
        icon: 'home'
      },
      {
        id: `cat-sports-${companyId}`,
        tenantId,
        companyId,
        name: 'Sports & Outdoors',
        description: 'Sports equipment and outdoor gear',
        color: '#06B6D4',
        icon: 'activity'
      }
    ]

    try {
      await prisma.category.createMany({
        data: categories
      })
    } catch (error) {
      // Ignore duplicate key errors
      if (!error.message.includes('Unique constraint')) {
        throw error
      }
    }
    console.log(`✅ Created ${categories.length} categories`)

    // 2. Create Locations
    console.log('Creating inventory locations...')
    const locations = [
      {
        id: `loc-warehouse-${companyId}`,
        tenantId,
        companyId,
        name: 'Main Warehouse',
        code: 'WH001',
        type: 'warehouse',
        address: '123 Industrial Drive, Warehouse District'
      },
      {
        id: `loc-store-${companyId}`,
        tenantId,
        companyId,
        name: 'Downtown Store',
        code: 'ST001',
        type: 'store',
        address: '456 Main Street, Downtown'
      },
      {
        id: `loc-online-${companyId}`,
        tenantId,
        companyId,
        name: 'Online Fulfillment',
        code: 'ON001',
        type: 'fulfillment',
        address: '789 Distribution Center, Logistics Park'
      }
    ]

    try {
      await prisma.location.createMany({
        data: locations
      })
    } catch (error) {
      // Ignore duplicate key errors
      if (!error.message.includes('Unique constraint')) {
        throw error
      }
    }
    console.log(`✅ Created ${locations.length} locations`)

    // 3. Create Products
    console.log('Creating products...')
    const products = [
      // Electronics
      {
        id: `prod-iphone-${companyId}`,
        tenantId,
        companyId,
        name: 'iPhone 15 Pro',
        sku: 'ELEC-IPH15P-128',
        description: 'Latest iPhone 15 Pro with 128GB storage',
        unitPrice: 999.99,
        costPrice: 750.00,
        stockQuantity: 25,
        categoryId: `cat-electronics-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-macbook-${companyId}`,
        tenantId,
        companyId,
        name: 'MacBook Pro 14"',
        sku: 'ELEC-MBP14-512',
        description: 'MacBook Pro 14-inch with M3 chip and 512GB SSD',
        unitPrice: 1999.99,
        costPrice: 1500.00,
        stockQuantity: 15,
        categoryId: `cat-electronics-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-airpods-${companyId}`,
        tenantId,
        companyId,
        name: 'AirPods Pro 2nd Gen',
        sku: 'ELEC-APP-PRO2',
        description: 'AirPods Pro with active noise cancellation',
        unitPrice: 249.99,
        costPrice: 180.00,
        stockQuantity: 50,
        categoryId: `cat-electronics-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-samsung-${companyId}`,
        tenantId,
        companyId,
        name: 'Samsung Galaxy S24',
        sku: 'ELEC-SAM-S24-256',
        description: 'Samsung Galaxy S24 with 256GB storage',
        unitPrice: 899.99,
        costPrice: 650.00,
        stockQuantity: 8,
        categoryId: `cat-electronics-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },

      // Clothing
      {
        id: `prod-jeans-${companyId}`,
        tenantId,
        companyId,
        name: 'Premium Denim Jeans',
        sku: 'CLO-JEANS-32W',
        description: 'High-quality denim jeans, 32" waist',
        unitPrice: 79.99,
        costPrice: 35.00,
        stockQuantity: 45,
        categoryId: `cat-clothing-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-tshirt-${companyId}`,
        tenantId,
        companyId,
        name: 'Cotton T-Shirt (Large)',
        sku: 'CLO-TSHIRT-L-BLU',
        description: '100% cotton t-shirt in blue, size Large',
        unitPrice: 24.99,
        costPrice: 12.00,
        stockQuantity: 120,
        categoryId: `cat-clothing-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-sneakers-${companyId}`,
        tenantId,
        companyId,
        name: 'Running Sneakers',
        sku: 'CLO-SNEAK-10-WHT',
        description: 'Professional running sneakers, size 10, white',
        unitPrice: 129.99,
        costPrice: 65.00,
        stockQuantity: 35,
        categoryId: `cat-clothing-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },

      // Food & Beverages
      {
        id: `prod-coffee-${companyId}`,
        tenantId,
        companyId,
        name: 'Premium Coffee Beans',
        sku: 'FOOD-COFFEE-1LB',
        description: 'Organic premium coffee beans, 1 lb bag',
        unitPrice: 18.99,
        costPrice: 8.50,
        stockQuantity: 75,
        categoryId: `cat-food-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-tea-${companyId}`,
        tenantId,
        companyId,
        name: 'Green Tea Collection',
        sku: 'FOOD-TEA-GRN-20',
        description: 'Assorted green tea collection, 20 bags',
        unitPrice: 12.99,
        costPrice: 6.00,
        stockQuantity: 90,
        categoryId: `cat-food-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-chocolate-${companyId}`,
        tenantId,
        companyId,
        name: 'Dark Chocolate Bar',
        sku: 'FOOD-CHOC-DARK-85',
        description: '85% dark chocolate bar, premium quality',
        unitPrice: 5.99,
        costPrice: 2.50,
        stockQuantity: 200,
        categoryId: `cat-food-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },

      // Books & Media
      {
        id: `prod-novel-${companyId}`,
        tenantId,
        companyId,
        name: 'Bestselling Novel',
        sku: 'BOOK-NOVEL-001',
        description: 'Popular fiction novel, paperback edition',
        unitPrice: 16.99,
        costPrice: 8.00,
        stockQuantity: 60,
        categoryId: `cat-books-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-cookbook-${companyId}`,
        tenantId,
        companyId,
        name: 'Professional Cookbook',
        sku: 'BOOK-COOK-PRO',
        description: 'Professional chef cookbook with 200+ recipes',
        unitPrice: 29.99,
        costPrice: 15.00,
        stockQuantity: 30,
        categoryId: `cat-books-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },

      // Home & Garden
      {
        id: `prod-pillow-${companyId}`,
        tenantId,
        companyId,
        name: 'Memory Foam Pillow',
        sku: 'HOME-PILLOW-MEM',
        description: 'Ergonomic memory foam pillow for better sleep',
        unitPrice: 49.99,
        costPrice: 25.00,
        stockQuantity: 40,
        categoryId: `cat-home-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-planter-${companyId}`,
        tenantId,
        companyId,
        name: 'Ceramic Plant Pot',
        sku: 'GARD-POT-CER-MED',
        description: 'Medium-sized ceramic planter for indoor plants',
        unitPrice: 24.99,
        costPrice: 12.00,
        stockQuantity: 55,
        categoryId: `cat-home-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-candle-${companyId}`,
        tenantId,
        companyId,
        name: 'Scented Candle Set',
        sku: 'HOME-CANDLE-SET3',
        description: 'Set of 3 premium scented candles',
        unitPrice: 34.99,
        costPrice: 18.00,
        stockQuantity: 65,
        categoryId: `cat-home-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },

      // Sports & Outdoors
      {
        id: `prod-yoga-${companyId}`,
        tenantId,
        companyId,
        name: 'Yoga Mat Premium',
        sku: 'SPORT-YOGA-PREM',
        description: 'Non-slip premium yoga mat with carrying strap',
        unitPrice: 39.99,
        costPrice: 20.00,
        stockQuantity: 85,
        categoryId: `cat-sports-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-bottle-${companyId}`,
        tenantId,
        companyId,
        name: 'Insulated Water Bottle',
        sku: 'SPORT-BOTTLE-32OZ',
        description: '32oz stainless steel insulated water bottle',
        unitPrice: 28.99,
        costPrice: 15.00,
        stockQuantity: 100,
        categoryId: `cat-sports-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-backpack-${companyId}`,
        tenantId,
        companyId,
        name: 'Hiking Backpack',
        sku: 'SPORT-PACK-25L',
        description: '25L hiking backpack with multiple compartments',
        unitPrice: 89.99,
        costPrice: 45.00,
        stockQuantity: 20,
        categoryId: `cat-sports-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },

      // Some low stock and out of stock items for testing
      {
        id: `prod-lowstock-${companyId}`,
        tenantId,
        companyId,
        name: 'Limited Edition Watch',
        sku: 'ELEC-WATCH-LTD',
        description: 'Limited edition smartwatch with premium features',
        unitPrice: 399.99,
        costPrice: 250.00,
        stockQuantity: 3, // Low stock
        categoryId: `cat-electronics-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-outstock-${companyId}`,
        tenantId,
        companyId,
        name: 'Vintage Vinyl Record',
        sku: 'BOOK-VINYL-VINTAGE',
        description: 'Rare vintage vinyl record, collector edition',
        unitPrice: 89.99,
        costPrice: 45.00,
        stockQuantity: 0, // Out of stock
        categoryId: `cat-books-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      }
    ]

    try {
      await prisma.product.createMany({
        data: products
      })
    } catch (error) {
      // Ignore duplicate key errors
      if (!error.message.includes('Unique constraint')) {
        throw error
      }
    }
    console.log(`✅ Created ${products.length} products`)

    // 4. Create Product Locations (Stock Distribution)
    console.log('Creating product location distributions...')
    const productLocations = []
    
    // Distribute products across locations
    for (const product of products) {
      const totalStock = Number(product.stockQuantity)
      
      if (totalStock > 0) {
        // Main warehouse gets 60% of stock
        const warehouseStock = Math.floor(totalStock * 0.6)
        // Store gets 30% of stock
        const storeStock = Math.floor(totalStock * 0.3)
        // Online fulfillment gets remaining stock
        const onlineStock = totalStock - warehouseStock - storeStock
        
        if (warehouseStock > 0) {
          productLocations.push({
            id: `pl-${product.id}-wh`,
            tenantId,
            productId: product.id,
            locationId: `loc-warehouse-${companyId}`,
            stockQuantity: warehouseStock,
            reservedQuantity: 0,
            reorderPoint: Math.floor(warehouseStock * 0.2), // 20% reorder point
            maxStockLevel: warehouseStock * 2
          })
        }
        
        if (storeStock > 0) {
          productLocations.push({
            id: `pl-${product.id}-st`,
            tenantId,
            productId: product.id,
            locationId: `loc-store-${companyId}`,
            stockQuantity: storeStock,
            reservedQuantity: 0,
            reorderPoint: Math.floor(storeStock * 0.3), // 30% reorder point for store
            maxStockLevel: storeStock * 1.5
          })
        }
        
        if (onlineStock > 0) {
          productLocations.push({
            id: `pl-${product.id}-on`,
            tenantId,
            productId: product.id,
            locationId: `loc-online-${companyId}`,
            stockQuantity: onlineStock,
            reservedQuantity: 0,
            reorderPoint: Math.floor(onlineStock * 0.25), // 25% reorder point
            maxStockLevel: onlineStock * 3
          })
        }
      }
    }

    try {
      await prisma.productLocation.createMany({
        data: productLocations
      })
    } catch (error) {
      // Ignore duplicate key errors
      if (!error.message.includes('Unique constraint')) {
        throw error
      }
    }
    console.log(`✅ Created ${productLocations.length} product location records`)

    // 5. Create some sample inventory movements
    console.log('Creating sample inventory movements...')
    const movements = [
      {
        id: `mov-initial-${companyId}-1`,
        tenantId,
        productId: `prod-iphone-${companyId}`,
        locationId: `loc-warehouse-${companyId}`,
        movementType: 'INBOUND',
        quantity: 25,
        unitCost: 750.00,
        movementDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        reference: 'PO-001',
        reason: 'Initial stock purchase'
      },
      {
        id: `mov-sale-${companyId}-1`,
        tenantId,
        productId: `prod-iphone-${companyId}`,
        locationId: `loc-store-${companyId}`,
        movementType: 'OUTBOUND',
        quantity: -2,
        unitCost: 750.00,
        movementDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        reference: 'INV-001',
        reason: 'Customer sale'
      },
      {
        id: `mov-transfer-${companyId}-1`,
        tenantId,
        productId: `prod-macbook-${companyId}`,
        locationId: `loc-warehouse-${companyId}`,
        movementType: 'TRANSFER_OUT',
        quantity: -5,
        unitCost: 1500.00,
        movementDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        reference: 'TRF-001',
        reason: 'Transfer to store'
      }
    ]

    try {
      await prisma.inventoryMovement.createMany({
        data: movements
      })
    } catch (error) {
      // Ignore duplicate key errors
      if (!error.message.includes('Unique constraint')) {
        throw error
      }
    }
    console.log(`✅ Created ${movements.length} inventory movements`)

    console.log('🎉 Inventory seeding completed successfully!')
    console.log(`
📊 Summary:
- ${categories.length} product categories
- ${locations.length} inventory locations  
- ${products.length} products with varied stock levels
- ${productLocations.length} location-specific stock records
- ${movements.length} sample inventory movements

🛍️ Stock Levels for POS Testing:
- High Stock: Most products (20+ units)
- Low Stock: Limited Edition Watch (3 units)
- Out of Stock: Vintage Vinyl Record (0 units)

🏪 Ready for POS testing at /dashboard/pos
    `)

  } catch (error) {
    console.error('❌ Error seeding inventory:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding
seedInventory()
  .then(() => {
    console.log('✅ Seeding completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })

export { seedInventory }