import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMaintenanceRecords() {
  console.log('🔧 Seeding Maintenance Records...');

  try {
    // Get all companies for tenant_demo
    const companies = await prisma.company.findMany({
      where: { tenantId: 'tenant_demo' }
    });

    if (companies.length === 0) {
      console.log('❌ No companies found. Please run company seed first.');
      return;
    }

    // Get fixed assets for each company
    for (const company of companies) {
      console.log(`📊 Seeding maintenance for company: ${company.name} (${company.id})`);
      
      const assets = await prisma.fixedAsset.findMany({
        where: { 
          tenantId: 'tenant_demo',
          companyId: company.id 
        },
        take: 3 // Take first 3 assets for sample data
      });

      if (assets.length === 0) {
        console.log(`⚠️ No assets found for company ${company.name}. Skipping maintenance seeding.`);
        continue;
      }

      // Sample maintenance records
      const maintenanceRecords = [
        {
          tenantId: 'tenant_demo',
          companyId: company.id,
          assetId: assets[0].id,
          maintenanceDate: new Date('2024-12-15'),
          maintenanceType: 'PREVENTIVE',
          description: 'Regular cleaning and calibration performed. Toner levels checked and replaced. All systems functioning normally.',
          performedBy: 'John Smith',
          cost: 150,
          extendsUsefulLife: false,
          lifeExtensionMonths: null,
          invoiceNumber: 'INV-2024-001',
          warrantyInfo: 'Standard warranty applies',
          status: 'COMPLETED'
        },
        {
          tenantId: 'tenant_demo',
          companyId: company.id,
          assetId: assets[1]?.id || assets[0].id,
          maintenanceDate: new Date('2024-12-20'),
          maintenanceType: 'EMERGENCY',
          description: 'Power supply unit failure detected. Replacement parts ordered. Temporary backup system in place.',
          performedBy: 'Tech Solutions Inc.',
          cost: 850,
          extendsUsefulLife: false,
          lifeExtensionMonths: null,
          invoiceNumber: 'INV-2024-002',
          warrantyInfo: 'Extended warranty coverage',
          status: 'IN_PROGRESS'
        },
        {
          tenantId: 'tenant_demo',
          companyId: company.id,
          assetId: assets[2]?.id || assets[0].id,
          maintenanceDate: new Date('2025-01-10'),
          maintenanceType: 'INSPECTION',
          description: 'Annual comprehensive inspection including filter replacement, coil cleaning, and system calibration.',
          performedBy: 'Climate Control Co.',
          cost: 300,
          extendsUsefulLife: true,
          lifeExtensionMonths: 6,
          invoiceNumber: 'INV-2025-001',
          warrantyInfo: 'Annual service contract',
          status: 'SCHEDULED'
        },
        {
          tenantId: 'tenant_demo',
          companyId: company.id,
          assetId: assets[0].id,
          maintenanceDate: new Date('2024-11-20'),
          maintenanceType: 'CORRECTIVE',
          description: 'Network connectivity issues resolved. Router firmware updated and configuration optimized.',
          performedBy: 'IT Support Team',
          cost: 200,
          extendsUsefulLife: false,
          lifeExtensionMonths: null,
          invoiceNumber: 'INV-2024-003',
          warrantyInfo: 'Service warranty 90 days',
          status: 'COMPLETED'
        },
        {
          tenantId: 'tenant_demo',
          companyId: company.id,
          assetId: assets[1]?.id || assets[0].id,
          maintenanceDate: new Date('2025-02-15'),
          maintenanceType: 'PREVENTIVE',
          description: 'Scheduled maintenance: oil change, filter replacement, and performance testing.',
          performedBy: 'Equipment Services Ltd.',
          cost: 450,
          extendsUsefulLife: true,
          lifeExtensionMonths: 12,
          invoiceNumber: 'INV-2025-002',
          warrantyInfo: 'Annual maintenance contract',
          status: 'SCHEDULED'
        }
      ];

      // Create maintenance records
      for (const recordData of maintenanceRecords) {
        const record = await prisma.maintenanceRecord.create({
          data: recordData
        });
        console.log(`✅ Created maintenance record: ${record.description.substring(0, 50)}...`);
      }

      console.log(`🎉 Maintenance seeding completed for ${company.name}!`);
    }

    console.log('🎉 All maintenance records seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding maintenance records:', error);
    throw error;
  }
}

// Run the seed function
seedMaintenanceRecords()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedMaintenanceRecords };
