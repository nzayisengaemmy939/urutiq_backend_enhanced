// Debug script to check categories in database
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugCategories() {
  const tenantId = 'tenant_demo'
  const companyId = 'cmg7trbsf00097kb7rrpy9in1'

  console.log('🔍 Debugging Categories Database...')
  console.log('Target Company ID:', companyId)
  console.log('Target Tenant ID:', tenantId)
  console.log()

  try {
    // 1. Check all categories in database
    console.log('📊 ALL Categories in database:')
    const allCategories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        companyId: true,
        tenantId: true,
        isActive: true
      }
    })
    
    console.log(`Found ${allCategories.length} total categories:`)
    allCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name}`)
      console.log(`   ID: ${cat.id}`)
      console.log(`   Company: ${cat.companyId}`)
      console.log(`   Tenant: ${cat.tenantId}`)
      console.log(`   Active: ${cat.isActive}`)
      console.log()
    })

    // 2. Check categories for your specific company
    console.log('🎯 Categories for YOUR company:')
    const yourCategories = await prisma.category.findMany({
      where: {
        tenantId,
        companyId
      },
      select: {
        id: true,
        name: true,
        companyId: true,
        tenantId: true,
        isActive: true
      }
    })

    console.log(`Found ${yourCategories.length} categories for company ${companyId}:`)
    yourCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (ID: ${cat.id})`)
    })

    // 3. Test the exact API query
    console.log()
    console.log('🔍 Testing exact API query logic:')
    const apiQuery = await prisma.category.findMany({
      where: {
        tenantId: tenantId,
        ...(companyId && companyId !== '' ? { companyId } : {})
      },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    console.log(`API query would return ${apiQuery.length} categories:`)
    apiQuery.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (Products: ${cat._count.products})`)
    })

    // 4. Check for data mismatch
    if (yourCategories.length === 0) {
      console.log()
      console.log('❌ NO CATEGORIES FOUND for your company!')
      console.log('Possible issues:')
      console.log('1. Categories were created with wrong company ID')
      console.log('2. Categories were created with wrong tenant ID')
      console.log('3. Categories are marked as inactive')
      
      console.log()
      console.log('🔍 Let me check what company IDs exist:')
      const companiesWithCategories = await prisma.category.groupBy({
        by: ['companyId'],
        _count: true
      })
      
      console.log('Company IDs that have categories:')
      companiesWithCategories.forEach(company => {
        console.log(`- ${company.companyId}: ${company._count} categories`)
      })
    }

  } catch (error) {
    console.error('❌ Database Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

debugCategories()
