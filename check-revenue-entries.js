import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRevenueEntries() {
  try {
    console.log('Checking revenue journal entries...');
    
    const tenantId = 'tenant_1760184367074_e5wdnirrd';
    const companyId = 'cmgm8bpzq000djg0rj25cjmsz';
    
    // Get the Sales Revenue account
    const salesRevenueAccount = await prisma.account.findFirst({
      where: { 
        tenantId, 
        companyId, 
        code: '4000' 
      }
    });
    
    if (!salesRevenueAccount) {
      console.log('Sales Revenue account not found');
      return;
    }
    
    console.log('Sales Revenue account:', {
      id: salesRevenueAccount.id,
      code: salesRevenueAccount.code,
      name: salesRevenueAccount.name,
      type: salesRevenueAccount.type,
      balance: salesRevenueAccount.balance
    });
    
    // Check journal lines for this account
    const journalLines = await prisma.journalLine.findMany({
      where: {
        tenantId,
        accountId: salesRevenueAccount.id
      },
      include: {
        entry: {
          select: { date: true, reference: true, memo: true, status: true }
        }
      }
    });
    
    console.log(`\nFound ${journalLines.length} journal lines for Sales Revenue account`);
    
    journalLines.forEach((line, index) => {
      console.log(`Line ${index + 1}:`, {
        id: line.id,
        entryDate: line.entry.date,
        entryRef: line.entry.reference,
        entryStatus: line.entry.status,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo
      });
    });
    
    // Calculate total credits (revenue increases with credits)
    const totalCredits = journalLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
    const totalDebits = journalLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    
    console.log(`\nTotal Credits: ${totalCredits}`);
    console.log(`Total Debits: ${totalDebits}`);
    console.log(`Net Revenue: ${totalCredits - totalDebits}`);
    
  } catch (error) {
    console.error('Error checking revenue entries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRevenueEntries();
