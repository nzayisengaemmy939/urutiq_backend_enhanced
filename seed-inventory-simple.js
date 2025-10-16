import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedInventorySimple() {
  console.log('🏪 Starting simple inventory seeding...')
  
  try {
    // First, let's check if we have any existing companies
    const companies = await prisma.company.findMany()
    console.log(`Found ${companies.length} existing companies`)
    
    let companyId
    let tenantId = 'tenant-1'
    
    if (companies.length > 0) {
      // Use the first existing company
      companyId = companies[0].id
      tenantId = companies[0].tenantId || 'tenant-1'
      console.log(`Using existing company: ${companies[0].name} (${companyId})`)
    } else {
      // Create a test company
      console.log('Creating test company...')
      const company = await prisma.company.create({
        data: {
          id: 'test-company-pos',
          tenantId: tenantId,
          name: 'POS Test Company',
          email: 'test@pos.com',
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      companyId = company.id
      console.log(`✅ Created test company: ${company.name} (${companyId})`)
    }

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
      }
    ]

    for (const category of categories) {
      try {
        await prisma.category.create({ data: category })
      } catch (error) {
        if (error.code !== 'P2002') { // Not a unique constraint error
          console.log(`Warning: Could not create category ${category.name}: ${error.message}`)
        }
      }
    }
    console.log(`✅ Created/ensured ${categories.length} categories`)

    // 2. Create Sample Products (simplified)
    console.log('Creating sample products...')
    const products = [
      {
        id: `prod-iphone-${companyId}`,
        tenantId,
        companyId,
        name: 'iPhone 15 Pro',
        sku: `ELEC-IPH15P-${companyId}`,
        description: 'Latest iPhone 15 Pro with 128GB storage',
        unitPrice: 999.99,
        costPrice: 750.00,
        stockQuantity: 25,
        categoryId: `cat-electronics-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-tshirt-${companyId}`,
        tenantId,
        companyId,
        name: 'Cotton T-Shirt (Large)',
        sku: `CLO-TSHIRT-${companyId}`,
        description: '100% cotton t-shirt in blue, size Large',
        unitPrice: 24.99,
        costPrice: 12.00,
        stockQuantity: 120,
        categoryId: `cat-clothing-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-coffee-${companyId}`,
        tenantId,
        companyId,
        name: 'Premium Coffee Beans',
        sku: `FOOD-COFFEE-${companyId}`,
        description: 'Organic premium coffee beans, 1 lb bag',
        unitPrice: 18.99,
        costPrice: 8.50,
        stockQuantity: 75,
        categoryId: `cat-food-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-lowstock-${companyId}`,
        tenantId,
        companyId,
        name: 'Limited Edition Watch',
        sku: `ELEC-WATCH-${companyId}`,
        description: 'Limited edition smartwatch with premium features',
        unitPrice: 399.99,
        costPrice: 250.00,
        stockQuantity: 3,
        categoryId: `cat-electronics-${companyId}`,
        type: 'PRODUCT',
        status: 'ACTIVE'
      },
      {
        id: `prod-outstock-${companyId}`,
        tenantId,
        companyId,
        name: 'Vintage Vinyl Record',
        sku: `BOOK-VINYL-${companyId}`,
        description: 'Rare vintage vinyl record, collector edition',
        unitPrice: 89.99,
        costPrice: 45.00,
        stockQuantity: 0,
        categoryId: `cat-electronics-${companyId}`, // Using electronics as we don't have books category
        type: 'PRODUCT',
        status: 'ACTIVE'
      }
    ]

    for (const product of products) {
      try {
        await prisma.product.create({ data: product })
      } catch (error) {
        if (error.code !== 'P2002') { // Not a unique constraint error
          console.log(`Warning: Could not create product ${product.name}: ${error.message}`)
        }
      }
    }
    console.log(`✅ Created/ensured ${products.length} products`)

    console.log('🎉 Simple inventory seeding completed successfully!')
    console.log(`
📊 Summary:
- Company: ${companyId}
- ${categories.length} product categories
- ${products.length} products with varied stock levels

🛍️ Stock Levels for POS Testing:
- High Stock: iPhone (25), T-Shirt (120), Coffee (75)
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
seedInventorySimple()
  .then(() => {
    console.log('✅ Seeding completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })

export { seedInventorySimple }