// Test script to check if categories API is working
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCategoriesAPI() {
  const tenantId = 'tenant_demo'
  const companyId = 'cmg7trbsf00097kb7rrpy9in1'

  console.log('Testing categories API...')
  console.log('Company ID:', companyId)
  console.log('Tenant ID:', tenantId)

  try {
    // Test direct database query (what the API should return)
    const categories = await prisma.category.findMany({
      where: {
        tenantId,
        companyId
      },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    })

    console.log(`\n📊 Found ${categories.length} categories:`)
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (ID: ${cat.id})`)
    })

    if (categories.length === 0) {
      console.log('\n❌ No categories found for this company!')
      console.log('The frontend category dropdown will be empty.')
    } else {
      console.log('\n✅ Categories found! Frontend should display them.')
    }

  } catch (error) {
    console.error('❌ Database Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testCategoriesAPI()
