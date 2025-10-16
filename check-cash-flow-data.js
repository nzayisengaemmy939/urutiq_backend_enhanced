import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCashFlowData() {
  try {
    console.log('Checking Cash Flow data...');
    
    const tenantId = 'tenant_1760184367074_e5wdnirrd';
    const companyId = 'cmgm8bpzq000djg0rj25cjmsz';
    
    // Check cash accounts (code starts with '1' and name contains 'Cash')
    const cashAccounts = await prisma.account.findMany({
      where: {
        tenantId,
        companyId,
        code: { startsWith: '1' }, // Asset accounts
        name: { contains: 'Cash' }
      }
    });
    
    console.log(`Found ${cashAccounts.length} cash accounts:`);
    cashAccounts.forEach(account => {
      console.log(`- ${account.code}: ${account.name} (${account.type})`);
    });
    
    // Check all asset accounts (code starts with '1')
    const allAssetAccounts = await prisma.account.findMany({
      where: {
        tenantId,
        companyId,
        code: { startsWith: '1' }
      }
    });
    
    console.log(`\nAll asset accounts (1xxx): ${allAssetAccounts.length}`);
    allAssetAccounts.forEach(account => {
      console.log(`- ${account.code}: ${account.name} (${account.type})`);
    });
    
    // Check journal entries for cash accounts
    if (cashAccounts.length > 0) {
      const cashAccountIds = cashAccounts.map(a => a.id);
      
      const cashJournalLines = await prisma.journalLine.findMany({
        where: {
          tenantId,
          accountId: { in: cashAccountIds }
        },
        include: {
          entry: {
            select: { date: true, reference: true, memo: true, status: true }
          }
        }
      });
      
      console.log(`\nFound ${cashJournalLines.length} journal lines for cash accounts`);
      
      // Calculate total cash movements
      const totalDebits = cashJournalLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const totalCredits = cashJournalLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      
      console.log(`Total Cash Debits: ${totalDebits}`);
      console.log(`Total Cash Credits: ${totalCredits}`);
      console.log(`Net Cash Flow: ${totalCredits - totalDebits}`);
    }
    
  } catch (error) {
    console.error('Error checking cash flow data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCashFlowData();
