import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndSeedVendors() {
  try {
    console.log('🔍 Checking vendors for your company...');
    
    const tenantId = 'tenant_1760184367074_e5wdnirrd';
    const companyId = 'cmgm8bpzq000djg0rj25cjmsz';
    
    // Check existing vendors for your company
    const existingVendors = await prisma.vendor.findMany({
      where: { 
        tenantId, 
        companyId 
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${existingVendors.length} vendors for your company:`);
    existingVendors.forEach(vendor => {
      console.log(`  - ${vendor.name} (${vendor.email}) - Active: ${vendor.isActive}`);
    });
    
    if (existingVendors.length === 0) {
      console.log('🌱 No vendors found! Creating sample vendors...');
      
      const sampleVendors = [
        { 
          name: 'Office Supplies Inc', 
          email: 'orders@officesupplies.com', 
          phone: '+1-555-0101',
          address: '123 Business Ave, City, State 12345',
          taxNumber: 'TAX-001'
        },
        { 
          name: 'Tech Solutions Ltd', 
          email: 'sales@techsolutions.com', 
          phone: '+1-555-0102',
          address: '456 Tech Street, City, State 12345',
          taxNumber: 'TAX-002'
        },
        { 
          name: 'Global Logistics', 
          email: 'logistics@global.com', 
          phone: '+1-555-0103',
          address: '789 Logistics Blvd, City, State 12345',
          taxNumber: 'TAX-003'
        },
        { 
          name: 'Stationery World', 
          email: 'orders@stationery.com', 
          phone: '+1-555-0104',
          address: '321 Stationery Lane, City, State 12345',
          taxNumber: 'TAX-004'
        },
        { 
          name: 'Amazon Business', 
          email: 'business@amazon.com', 
          phone: '+1-555-0105',
          address: 'Amazon Business Center, Seattle, WA',
          taxNumber: 'TAX-005'
        },
        { 
          name: 'Staples Office', 
          email: 'orders@staples.com', 
          phone: '+1-555-0106',
          address: 'Staples Corporate, Framingham, MA',
          taxNumber: 'TAX-006'
        },
        { 
          name: 'Office Depot', 
          email: 'orders@officedepot.com', 
          phone: '+1-555-0107',
          address: 'Office Depot Corporate, Boca Raton, FL',
          taxNumber: 'TAX-007'
        },
        { 
          name: 'Dell Technologies', 
          email: 'business@dell.com', 
          phone: '+1-555-0108',
          address: 'Dell Technologies, Round Rock, TX',
          taxNumber: 'TAX-008'
        }
      ];
      
      for (const vendor of sampleVendors) {
        await prisma.vendor.create({
          data: {
            tenantId,
            companyId,
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            address: vendor.address,
            taxNumber: vendor.taxNumber,
            isActive: true
          }
        });
        console.log(`  ✅ Created vendor: ${vendor.name}`);
      }
      
      console.log('🎉 Vendor seeding completed!');
    } else if (existingVendors.length < 5) {
      console.log('🌱 Adding more vendors to give you more options...');
      
      const additionalVendors = [
        { 
          name: 'Tech Solutions Ltd', 
          email: 'sales@techsolutions.com', 
          phone: '+1-555-0102',
          address: '456 Tech Street, City, State 12345',
          taxNumber: 'TAX-002'
        },
        { 
          name: 'Global Logistics', 
          email: 'logistics@global.com', 
          phone: '+1-555-0103',
          address: '789 Logistics Blvd, City, State 12345',
          taxNumber: 'TAX-003'
        },
        { 
          name: 'Stationery World', 
          email: 'orders@stationery.com', 
          phone: '+1-555-0104',
          address: '321 Stationery Lane, City, State 12345',
          taxNumber: 'TAX-004'
        },
        { 
          name: 'Amazon Business', 
          email: 'business@amazon.com', 
          phone: '+1-555-0105',
          address: 'Amazon Business Center, Seattle, WA',
          taxNumber: 'TAX-005'
        },
        { 
          name: 'Staples Office', 
          email: 'orders@staples.com', 
          phone: '+1-555-0106',
          address: 'Staples Corporate, Framingham, MA',
          taxNumber: 'TAX-006'
        }
      ];
      
      for (const vendor of additionalVendors) {
        const exists = await prisma.vendor.findFirst({
          where: { tenantId, companyId, name: vendor.name }
        });
        
        if (!exists) {
          await prisma.vendor.create({
            data: {
              tenantId,
              companyId,
              name: vendor.name,
              email: vendor.email,
              phone: vendor.phone,
              address: vendor.address,
              taxNumber: vendor.taxNumber,
              isActive: true
            }
          });
          console.log(`  ✅ Created vendor: ${vendor.name}`);
        } else {
          console.log(`  ⏭️  Vendor already exists: ${vendor.name}`);
        }
      }
      
      console.log('🎉 Additional vendor seeding completed!');
    } else {
      console.log('✅ Sufficient vendors already exist for your company');
    }
    
    // Show final vendor count
    const finalCount = await prisma.vendor.count({
      where: { tenantId, companyId }
    });
    console.log(`📊 Total vendors for your company: ${finalCount}`);
    
    // Show all vendors for verification
    const allVendors = await prisma.vendor.findMany({
      where: { tenantId, companyId },
      orderBy: { name: 'asc' }
    });
    
    console.log('\n📋 All vendors for your company:');
    allVendors.forEach((vendor, index) => {
      console.log(`${index + 1}. ${vendor.name}`);
      console.log(`   Email: ${vendor.email}`);
      console.log(`   Phone: ${vendor.phone}`);
      console.log(`   Active: ${vendor.isActive}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error checking/seeding vendors:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeedVendors();
