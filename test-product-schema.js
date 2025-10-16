// Test if categoryId field exists in Product table
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testProductSchema() {
  console.log('🔍 Testing Product table schema...')
  
  try {
    // Try to find a product with categoryId
    const productWithCategory = await prisma.product.findFirst({
      where: {
        categoryId: { not: null }
      }
    })
    
    console.log('✅ categoryId field exists!')
    console.log('Product with category:', productWithCategory ? {
      id: productWithCategory.id,
      name: productWithCategory.name,
      categoryId: (productWithCategory as any).categoryId
    } : 'No products with categories found')
    
    // Test creating a product with categoryId
    console.log('\n🧪 Testing product creation with categoryId...')
    const testProduct = await prisma.product.create({
      data: {
        tenantId: 'tenant_1759313374454_k1h5y8bi7',
        companyId: 'cmg7trbsf00097kb7rrpy9in1',
        name: 'Test Product with Category',
        sku: 'TEST-CAT-001',
        unitPrice: 10.00,
        costPrice: 5.00,
        stockQuantity: 100,
        categoryId: 'cat-electronics-tenant_1759313374454_k1h5y8bi7-cmg7trbsf00097kb7rrpy9in1', // Use one of your category IDs
        status: 'ACTIVE'
      }
    })
    
    console.log('✅ Product created with categoryId:', {
      id: testProduct.id,
      name: testProduct.name,
      categoryId: (testProduct as any).categoryId
    })
    
  } catch (error) {
    if (error.message.includes('categoryId')) {
      console.log('❌ categoryId field does NOT exist in Product table')
      console.log('You need to run: npx prisma db push')
    } else {
      console.log('❌ Other error:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testProductSchema()
