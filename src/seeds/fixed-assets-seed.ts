import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedForCompany(company: any) {
  // Create Fixed Asset Categories
  const categories = [
    {
      tenantId: 'tenant_demo',
      companyId: company.id,
      name: 'Office Equipment',
      usefulLifeMonths: 60, // 5 years
      method: 'straight_line',
      salvageRate: 10
    },
    {
      tenantId: 'tenant_demo',
      companyId: company.id,
      name: 'Vehicles',
      usefulLifeMonths: 84, // 7 years
      method: 'straight_line',
      salvageRate: 15
    },
    {
      tenantId: 'tenant_demo',
      companyId: company.id,
      name: 'Machinery & Equipment',
      usefulLifeMonths: 120, // 10 years
      method: 'straight_line',
      salvageRate: 5
    },
    {
      tenantId: 'tenant_demo',
      companyId: company.id,
      name: 'Software & Licenses',
      usefulLifeMonths: 36, // 3 years
      method: 'straight_line',
      salvageRate: 0
    },
    {
      tenantId: 'tenant_demo',
      companyId: company.id,
      name: 'Buildings & Improvements',
      usefulLifeMonths: 180, // 15 years
      method: 'straight_line',
      salvageRate: 20
    }
  ];

  const createdCategories = [];
  for (const categoryData of categories) {
    const category = await prisma.fixedAssetCategory.create({
      data: categoryData
    });
    createdCategories.push(category);
    console.log(`✅ Created category: ${category.name}`);
  }

  // Create Sample Fixed Assets
  const assets = [
    {
      tenantId: 'tenant_demo',
      companyId: company.id,
      categoryId: createdCategories[0].id, // Office Equipment
      name: 'Dell OptiPlex Desktop Computer',
      cost: 1200.00,
      currency: 'USD',
      acquisitionDate: '2024-01-15',
      startDepreciation: '2024-02-01',
      salvageValue: 120.00,
      notes: 'Main office computer for accounting department'
    },
    {
      tenantId: 'tenant_demo',
      companyId: company.id,
      categoryId: createdCategories[0].id, // Office Equipment
      name: 'HP LaserJet Pro Printer',
      cost: 450.00,
      currency: 'USD',
      acquisitionDate: '2024-02-10',
      startDepreciation: '2024-03-01',
      salvageValue: 45.00,
      notes: 'Network printer for office use'
    },
    {
      tenantId: 'tenant_demo',
      companyId: company.id,
      categoryId: createdCategories[1].id, // Vehicles
      name: 'Toyota Camry Company Car',
      cost: 25000.00,
      currency: 'USD',
      acquisitionDate: '2024-01-01',
      startDepreciation: '2024-02-01',
      salvageValue: 3750.00,
      notes: 'Company vehicle for sales team'
    },
    {
      tenantId: 'tenant_demo',
      companyId: company.id,
      categoryId: createdCategories[2].id, // Machinery & Equipment
      name: 'Industrial CNC Machine',
      cost: 50000.00,
      currency: 'USD',
      acquisitionDate: '2023-12-01',
      startDepreciation: '2024-01-01',
      salvageValue: 2500.00,
      notes: 'Manufacturing equipment for production line'
    },
    {
      tenantId: 'tenant_demo',
      companyId: company.id,
      categoryId: createdCategories[3].id, // Software & Licenses
      name: 'Microsoft Office 365 License',
      cost: 1200.00,
      currency: 'USD',
      acquisitionDate: '2024-01-01',
      startDepreciation: '2024-01-01',
      salvageValue: 0.00,
      notes: 'Annual software license for 20 users'
    },
    {
      tenantId: 'tenant_demo',
      companyId: company.id,
      categoryId: createdCategories[4].id, // Buildings & Improvements
      name: 'Office Renovation',
      cost: 15000.00,
      currency: 'USD',
      acquisitionDate: '2023-11-15',
      startDepreciation: '2023-12-01',
      salvageValue: 3000.00,
      notes: 'Office space renovation and improvements'
    }
  ];

  const createdAssets = [];
  for (const assetData of assets) {
    const asset = await prisma.fixedAsset.create({
      data: assetData
    });
    createdAssets.push(asset);
    console.log(`✅ Created asset: ${asset.name}`);
  }

  console.log(`🎉 Fixed Assets seeding completed for ${company.name}!`);
  console.log(`📊 Created ${createdCategories.length} categories and ${createdAssets.length} assets`);
}

async function seedFixedAssets() {
  console.log('🌱 Seeding Fixed Asset Categories and Sample Assets...');

  try {
    // Get all companies for tenant_demo
    const companies = await prisma.company.findMany({
      where: { tenantId: 'tenant_demo' }
    });

    if (companies.length === 0) {
      console.log('❌ No companies found. Please run company seed first.');
      return;
    }

    // Seed for all companies
    for (const company of companies) {
      console.log(`📊 Seeding for company: ${company.name} (${company.id})`);
      
      await seedForCompany(company);
    }

    console.log('🎉 Fixed Assets seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding fixed assets:', error);
    throw error;
  }
}

// Run the seed function
seedFixedAssets()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedFixedAssets };