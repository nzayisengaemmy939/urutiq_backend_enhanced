// Temporary script to create categories directly
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createCategories() {
  const tenantIds = ['tenant_demo', 'tenant_1759313374454_k1h5y8bi7'] // Support both tenants
  const companyIds = ['cmg7trbsf00097kb7rrpy9in1', 'seed-company-1'] // Support both IDs

  console.log('Creating categories for multiple tenants and companies...')

  try {
    for (const tenantId of tenantIds) {
      for (const companyId of companyIds) {
        console.log(`\n📊 Creating categories for tenant: ${tenantId}, company: ${companyId}`)
        
        // Create a few test categories
        const categories = [
          { id: `cat-electronics-${tenantId}-${companyId}`, name: 'Electronics & Technology', color: '#2563eb', icon: 'Zap' },
          { id: `cat-office-${tenantId}-${companyId}`, name: 'Office & Business', color: '#059669', icon: 'Building' },
          { id: `cat-industrial-${tenantId}-${companyId}`, name: 'Industrial & Manufacturing', color: '#dc2626', icon: 'Wrench' },
          { id: `cat-healthcare-${tenantId}-${companyId}`, name: 'Healthcare & Medical', color: '#7c3aed', icon: 'Heart' },
          { id: `cat-automotive-${tenantId}-${companyId}`, name: 'Automotive & Transportation', color: '#ea580c', icon: 'Car' }
        ]

        for (const cat of categories) {
          try {
            await prisma.category.upsert({
              where: { id: cat.id },
              update: {
                name: cat.name,
                color: cat.color,
                icon: cat.icon,
                isActive: true
              },
              create: {
                id: cat.id,
                tenantId,
                companyId,
                name: cat.name,
                color: cat.color,
                icon: cat.icon,
                isActive: true
              }
            })
            console.log(`    ✅ ${cat.name}`)
          } catch (error) {
            console.log(`    ⚠️  Skipped ${cat.name}: ${error.message}`)
          }
        }
      }
    }

    console.log('🎉 Categories created successfully!')
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createCategories()
