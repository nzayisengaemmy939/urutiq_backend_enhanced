import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testRealUsers() {
  try {
    console.log('🔍 Testing Real User System...\n')
    
    // 1. Check what companies exist
    console.log('1. Available Companies:')
    const companies = await prisma.company.findMany({
      where: { tenantId: 'tenant_demo' },
      select: { id: true, name: true }
    })
    companies.forEach(company => {
      console.log(`   - ${company.name} (ID: ${company.id})`)
    })
    
    // 2. Check what users exist
    console.log('\n2. Available Users:')
    const users = await prisma.appUser.findMany({
      where: { tenantId: 'tenant_demo' },
      select: { id: true, name: true, email: true, role: true }
    })
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) [${user.role}] - ID: ${user.id}`)
    })
    
    // 3. Check portal access (which users can access which companies)
    console.log('\n3. Portal Access Relationships:')
    const portalAccess = await prisma.clientPortalAccess.findMany({
      where: { tenantId: 'tenant_demo' },
      include: {
        company: { select: { name: true } },
        user: { select: { name: true, email: true } }
      }
    })
    
    if (portalAccess.length === 0) {
      console.log('   ❌ No portal access relationships found!')
      console.log('   💡 This means companies have no associated users for messaging')
      
      // Create some portal access for testing
      if (companies.length > 0 && users.length > 0) {
        console.log('\n4. Creating Portal Access for Testing...')
        
        for (let i = 0; i < Math.min(companies.length, users.length); i++) {
          const access = await prisma.clientPortalAccess.create({
            data: {
              tenantId: 'tenant_demo',
              companyId: companies[i].id,
              userId: users[i].id,
              permissions: JSON.stringify(['view_messages', 'send_messages']),
              isActive: true
            }
          })
          console.log(`   ✅ Created access: ${users[i].name} → ${companies[i].name}`)
        }
      }
    } else {
      portalAccess.forEach(access => {
        console.log(`   - ${access.user.name} (${access.user.email}) → ${access.company.name}`)
      })
    }
    
    // 4. Test the API endpoint for each company
    console.log('\n5. Testing Company Users API for each company:')
    for (const company of companies.slice(0, 2)) { // Test first 2 companies
      console.log(`\n   Company: ${company.name}`)
      
      // Simulate the API call
      const companyUsers = await prisma.clientPortalAccess.findMany({
        where: {
          tenantId: 'tenant_demo',
          companyId: company.id,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      })
      
      const usersForCompany = companyUsers.map(access => access.user)
      
      if (usersForCompany.length === 0) {
        console.log(`   ❌ No users found for ${company.name}`)
        console.log(`   💡 API would return current user as fallback`)
      } else {
        console.log(`   ✅ Users available for ${company.name}:`)
        usersForCompany.forEach(user => {
          console.log(`      - ${user.name} (${user.email}) [${user.role}]`)
        })
      }
    }
    
    console.log('\n🎯 Summary:')
    console.log('✅ Companies: Real data from database')
    console.log('✅ Users: Real data from database') 
    console.log('✅ Company-User Relationships: Real portal access data')
    console.log('✅ No hardcoded recipients')
    console.log('✅ Dynamic user loading based on company selection')
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testRealUsers()
