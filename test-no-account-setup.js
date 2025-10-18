const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndCreateTestData() {
  try {
    console.log('Checking existing categories...');
    const categories = await prisma.fixedAssetCategory.findMany({
      where: {
        tenantId: 'tenant_demo',
        companyId: 'seed-company-1'
      },
      select: {
        id: true,
        name: true,
        assetAccountId: true
      }
    });
    
    console.log('Existing categories:');
    categories.forEach(cat => {
      console.log(`- ${cat.name}: assetAccountId=${cat.assetAccountId || 'NOT SET'}`);
    });
    
    // Create a category without asset account if none exists
    const categoryWithoutAccount = categories.find(cat => !cat.assetAccountId);
    if (!categoryWithoutAccount) {
      console.log('Creating a category without asset account...');
      const newCategory = await prisma.fixedAssetCategory.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          name: 'Test Equipment - No Account',
          usefulLifeMonths: 60,
          method: 'straight_line',
          salvageRate: 10
          // Intentionally not setting assetAccountId
        }
      });
      console.log('Created category without asset account:', newCategory.name);
      
      // Create a test asset with this category
      console.log('Creating test asset...');
      const testAsset = await prisma.fixedAsset.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          categoryId: newCategory.id,
          name: 'Test Computer - No Account',
          cost: 1500,
          currency: 'USD',
          acquisitionDate: '2025-01-15',
          startDepreciation: '2025-01-15',
          salvageValue: 150,
          notes: 'Test asset to demonstrate no accounting entries',
          status: 'DRAFT'
        }
      });
      console.log('Created test asset:', testAsset.name, 'with status:', testAsset.status);
    } else {
      console.log('Found existing category without asset account:', categoryWithoutAccount.name);
      
      // Check if there's already a DRAFT asset for this category
      const existingAsset = await prisma.fixedAsset.findFirst({
        where: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          categoryId: categoryWithoutAccount.id,
          status: 'DRAFT'
        }
      });
      
      if (!existingAsset) {
        console.log('Creating test asset for existing category...');
        const testAsset = await prisma.fixedAsset.create({
          data: {
            tenantId: 'tenant_demo',
            companyId: 'seed-company-1',
            categoryId: categoryWithoutAccount.id,
            name: 'Test Asset - No Account',
            cost: 2000,
            currency: 'USD',
            acquisitionDate: '2025-01-20',
            startDepreciation: '2025-01-20',
            salvageValue: 200,
            notes: 'Test asset to demonstrate no accounting entries',
            status: 'DRAFT'
          }
        });
        console.log('Created test asset:', testAsset.name, 'with status:', testAsset.status);
      } else {
        console.log('Found existing DRAFT asset:', existingAsset.name);
      }
    }
    
    await prisma.$disconnect();
    console.log('Test data setup complete!');
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

checkAndCreateTestData();
