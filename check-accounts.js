import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAccounts() {
  try {
    console.log('Checking accounts...');
    
    const tenantId = 'tenant_1760184367074_e5wdnirrd';
    const companyId = 'cmgm8bpzq000djg0rj25cjmsz';
    
    // Get all accounts
    const accounts = await prisma.account.findMany({
      where: { tenantId, companyId },
      orderBy: { code: 'asc' }
    });
    
    console.log(`Found ${accounts.length} accounts`);
    
    // Check revenue accounts (codes starting with '4')
    const revenueAccounts = accounts.filter(a => a.code.startsWith('4'));
    console.log(`\nRevenue accounts (4xxx): ${revenueAccounts.length}`);
    revenueAccounts.forEach(account => {
      console.log(`- ${account.code}: ${account.name} (${account.type})`);
    });
    
    // Check all account codes
    console.log('\nAll account codes:');
    accounts.forEach(account => {
      console.log(`- ${account.code}: ${account.name} (${account.type})`);
    });
    
    // Check if there are any accounts that might be revenue but have different codes
    const possibleRevenueAccounts = accounts.filter(a => 
      a.name.toLowerCase().includes('revenue') || 
      a.name.toLowerCase().includes('sales') ||
      a.name.toLowerCase().includes('income')
    );
    console.log(`\nPossible revenue accounts: ${possibleRevenueAccounts.length}`);
    possibleRevenueAccounts.forEach(account => {
      console.log(`- ${account.code}: ${account.name} (${account.type})`);
    });
    
  } catch (error) {
    console.error('Error checking accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAccounts();
