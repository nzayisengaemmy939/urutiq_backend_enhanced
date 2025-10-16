const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedVendors() {
  console.log('🏢 Seeding vendors for enhanced transaction processing...\n');

  const tenantId = 'tenant_demo';
  const companyId = 'seed-company-2'; // Using the same company as enhanced transaction processing

  // Check if company exists
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId }
  });

  if (!company) {
    console.log('❌ Company not found. Creating company first...');
    await prisma.company.create({
      data: {
        id: companyId,
        tenantId,
        name: 'Acme Trading Co'
      }
    });
    console.log('✅ Company created');
  }

  // Define vendors to seed
  const vendors = [
    {
      name: 'Office Supply Co',
      email: 'sales@officesupply.com',
      phone: '+1-555-0100',
      address: '123 Business Ave, Suite 100, New York, NY 10001',
      taxNumber: 'TAX-001234',
      website: 'https://officesupply.com'
    },
    {
      name: 'Tech Components Ltd',
      email: 'orders@techcomponents.com',
      phone: '+1-555-0200',
      address: '456 Tech Street, Building B, San Francisco, CA 94105',
      taxNumber: 'TAX-002345',
      website: 'https://techcomponents.com'
    },
    {
      name: 'Global Logistics Hub',
      email: 'shipping@logistics.com',
      phone: '+1-555-0300',
      address: '789 Shipping Blvd, Warehouse District, Los Angeles, CA 90021',
      taxNumber: 'TAX-003456',
      website: 'https://logistics.com'
    },
    {
      name: 'Stationery World',
      email: 'info@stationery.com',
      phone: '+1-555-0400',
      address: '321 Paper Lane, Office Park, Chicago, IL 60601',
      taxNumber: 'TAX-004567',
      website: 'https://stationery.com'
    },
    {
      name: 'Universal Imports',
      email: 'imports@universal.com',
      phone: '+1-555-0500',
      address: '654 Import Drive, Port Area, Miami, FL 33101',
      taxNumber: 'TAX-005678',
      website: 'https://universalimports.com'
    },
    {
      name: 'Digital Services Inc',
      email: 'services@digital.com',
      phone: '+1-555-0600',
      address: '987 Digital Way, Tech Center, Austin, TX 73301',
      taxNumber: 'TAX-006789',
      website: 'https://digitalservices.com'
    },
    {
      name: 'Equipment Rentals Co',
      email: 'rentals@equipment.com',
      phone: '+1-555-0700',
      address: '147 Rental Road, Industrial Zone, Phoenix, AZ 85001',
      taxNumber: 'TAX-007890',
      website: 'https://equipmentrentals.com'
    },
    {
      name: 'Marketing Solutions',
      email: 'marketing@solutions.com',
      phone: '+1-555-0800',
      address: '258 Marketing Ave, Creative District, Seattle, WA 98101',
      taxNumber: 'TAX-008901',
      website: 'https://marketingsolutions.com'
    }
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const vendorData of vendors) {
    try {
      // Check if vendor already exists
      const existing = await prisma.vendor.findFirst({
        where: {
          tenantId,
          companyId,
          name: vendorData.name
        }
      });

      if (existing) {
        console.log(`⏭️  Vendor already exists: ${vendorData.name}`);
        skippedCount++;
        continue;
      }

      // Create vendor
      const vendor = await prisma.vendor.create({
        data: {
          tenantId,
          companyId,
          name: vendorData.name,
          email: vendorData.email,
          phone: vendorData.phone,
          address: vendorData.address,
          taxNumber: vendorData.taxNumber,
          website: vendorData.website,
          isActive: true,
          paymentTerms: 'Net 30',
          creditLimit: 10000
        }
      });

      console.log(`✅ Created vendor: ${vendor.name}`);
      createdCount++;
    } catch (error) {
      console.log(`❌ Error creating vendor ${vendorData.name}:`, error.message);
    }
  }

  console.log(`\n📊 Seeding Summary:`);
  console.log(`   Created: ${createdCount} vendors`);
  console.log(`   Skipped: ${skippedCount} vendors (already exist)`);
  console.log(`   Total: ${createdCount + skippedCount} vendors`);

  // Verify vendors were created
  const totalVendors = await prisma.vendor.count({
    where: { tenantId, companyId }
  });

  console.log(`\n🎯 Database now has ${totalVendors} vendors for company ${companyId}`);

  if (totalVendors > 0) {
    console.log('\n🏢 Available vendors:');
    const allVendors = await prisma.vendor.findMany({
      where: { tenantId, companyId },
      select: { name: true, email: true, phone: true }
    });
    
    allVendors.forEach((vendor, index) => {
      console.log(`   ${index + 1}. ${vendor.name} (${vendor.email})`);
    });
  }
}

async function main() {
  try {
    await seedVendors();
    console.log('\n🎉 Vendor seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
