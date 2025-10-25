import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureAllCompaniesHaveLogoUrl() {
  try {
    console.log('🔍 Checking companies for logoUrl field...');
    
    // Get all companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        logoUrl: true,
        tenantId: true
      }
    });

    console.log(`📊 Found ${companies.length} companies`);

    let updatedCount = 0;
    let alreadyHasLogoCount = 0;

    for (const company of companies) {
      if (!company.logoUrl) {
        // Set a default logoUrl (you can customize this)
        const defaultLogoUrl = `/api/images/default-company-logo`;
        
        await prisma.company.update({
          where: { id: company.id },
          data: { logoUrl: defaultLogoUrl }
        });

        console.log(`✅ Updated company "${company.name}" (${company.id}) with default logoUrl`);
        updatedCount++;
      } else {
        console.log(`ℹ️  Company "${company.name}" already has logoUrl: ${company.logoUrl}`);
        alreadyHasLogoCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`- Companies updated: ${updatedCount}`);
    console.log(`- Companies already had logoUrl: ${alreadyHasLogoCount}`);
    console.log(`- Total companies: ${companies.length}`);

    // Verify the update
    console.log('\n🔍 Verifying all companies now have logoUrl...');
    const companiesAfterUpdate = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        logoUrl: true
      }
    });

    const companiesWithoutLogo = companiesAfterUpdate.filter(c => !c.logoUrl);
    
    if (companiesWithoutLogo.length === 0) {
      console.log('✅ All companies now have logoUrl!');
    } else {
      console.log(`❌ ${companiesWithoutLogo.length} companies still missing logoUrl:`);
      companiesWithoutLogo.forEach(c => {
        console.log(`   - ${c.name} (${c.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error ensuring companies have logoUrl:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
ensureAllCompaniesHaveLogoUrl();
