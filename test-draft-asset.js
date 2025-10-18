const { PrismaClient } = require('@prisma/client');

async function testDraftAsset() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing asset creation with DRAFT status...');
    
    // First, get a valid category
    const category = await prisma.fixedAssetCategory.findFirst({
      where: {
        tenantId: 'tenant_demo',
        companyId: 'seed-company-1'
      }
    });
    
    if (!category) {
      console.log('No category found, creating one...');
      const newCategory = await prisma.fixedAssetCategory.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: 'seed-company-1',
          name: 'Test Equipment',
          usefulLifeMonths: 60,
          method: 'straight_line',
          salvageRate: 10
        }
      });
      console.log('Category created:', newCategory.id);
    }
    
    // Create a DRAFT asset
    const asset = await prisma.fixedAsset.create({
      data: {
        tenantId: 'tenant_demo',
        companyId: 'seed-company-1',
        categoryId: category?.id || 'test-category',
        name: 'Test Asset - DRAFT',
        cost: 1000,
        acquisitionDate: '2025-01-18',
        startDepreciation: '2025-01-18',
        status: 'DRAFT'
      }
    });
    
    console.log('✅ Asset created with DRAFT status:', {
      id: asset.id,
      name: asset.name,
      status: asset.status,
      cost: asset.cost
    });
    
    // Test posting the asset
    console.log('Testing asset posting...');
    const updatedAsset = await prisma.fixedAsset.update({
      where: { id: asset.id },
      data: { status: 'POSTED' }
    });
    
    console.log('✅ Asset posted successfully:', {
      id: updatedAsset.id,
      name: updatedAsset.name,
      status: updatedAsset.status
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDraftAsset();
