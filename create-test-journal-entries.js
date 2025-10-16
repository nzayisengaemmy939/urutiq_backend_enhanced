import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestJournalEntries() {
  try {
    console.log('Creating test journal entries...');
    
    const tenantId = 'tenant_1760184367074_e5wdnirrd';
    const companyId = 'cmgm8bpzq000djg0rj25cjmsz';
    
    // Get some accounts to use
    const accounts = await prisma.account.findMany({
      where: { tenantId, companyId },
      take: 4
    });
    
    if (accounts.length < 2) {
      console.log('Not enough accounts found. Creating basic accounts first...');
      
      // Create basic accounts
      const cashAccount = await prisma.account.create({
        data: {
          tenantId,
          companyId,
          code: '1000',
          name: 'Cash',
          type: 'ASSET',
          balance: 0
        }
      });
      
      const revenueAccount = await prisma.account.create({
        data: {
          tenantId,
          companyId,
          code: '4000',
          name: 'Sales Revenue',
          type: 'REVENUE',
          balance: 0
        }
      });
      
      accounts.push(cashAccount, revenueAccount);
    }
    
    console.log(`Found ${accounts.length} accounts`);
    
    // Create a test journal entry with lines
    const journalEntry = await prisma.journalEntry.create({
      data: {
        tenantId,
        companyId,
        date: new Date('2025-10-10'),
        reference: 'TEST-001',
        memo: 'Test journal entry for general ledger',
        status: 'POSTED',
        lines: {
          create: [
            {
              tenantId,
              accountId: accounts[0].id,
              debit: 1000,
              credit: 0,
              memo: 'Debit to first account'
            },
            {
              tenantId,
              accountId: accounts[1]?.id || accounts[0].id,
              debit: 0,
              credit: 1000,
              memo: 'Credit to second account'
            }
          ]
        }
      }
    });
    
    console.log('Created journal entry:', journalEntry.id);
    
    // Create another entry for a different date
    const journalEntry2 = await prisma.journalEntry.create({
      data: {
        tenantId,
        companyId,
        date: new Date('2025-10-11'),
        reference: 'TEST-002',
        memo: 'Another test journal entry',
        status: 'DRAFT',
        lines: {
          create: [
            {
              tenantId,
              accountId: accounts[0].id,
              debit: 500,
              credit: 0,
              memo: 'Debit entry'
            },
            {
              tenantId,
              accountId: accounts[1]?.id || accounts[0].id,
              debit: 0,
              credit: 500,
              memo: 'Credit entry'
            }
          ]
        }
      }
    });
    
    console.log('Created second journal entry:', journalEntry2.id);
    
    // Check how many journal lines we have
    const lineCount = await prisma.journalLine.count({
      where: { tenantId, entry: { companyId } }
    });
    
    console.log(`Total journal lines for company: ${lineCount}`);
    
    console.log('✅ Test journal entries created successfully!');
    
  } catch (error) {
    console.error('Error creating test journal entries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestJournalEntries();
