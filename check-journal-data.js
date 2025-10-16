import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJournalData() {
  try {
    console.log('Checking journal data...');
    
    const tenantId = 'tenant_1760184367074_e5wdnirrd';
    const companyId = 'cmgm8bpzq000djg0rj25cjmsz';
    
    // Check journal entries
    const entries = await prisma.journalEntry.findMany({
      where: { tenantId, companyId },
      include: { lines: true }
    });
    
    console.log(`Found ${entries.length} journal entries`);
    
    entries.forEach((entry, index) => {
      console.log(`Entry ${index + 1}:`, {
        id: entry.id,
        date: entry.date,
        reference: entry.reference,
        status: entry.status,
        linesCount: entry.lines.length
      });
    });
    
    // Check journal lines directly
    const lines = await prisma.journalLine.findMany({
      where: { 
        tenantId,
        entry: { companyId }
      },
      include: {
        entry: { select: { date: true, reference: true, status: true } },
        account: { select: { code: true, name: true } }
      }
    });
    
    console.log(`Found ${lines.length} journal lines`);
    
    // Check lines for our test entries
    const testLines = lines.filter(line => 
      line.entry.reference === 'TEST-001' || line.entry.reference === 'TEST-002'
    );
    
    console.log(`Found ${testLines.length} test journal lines`);
    
    testLines.forEach((line, index) => {
      console.log(`Test Line ${index + 1}:`, {
        id: line.id,
        entryDate: line.entry.date,
        entryRef: line.entry.reference,
        entryStatus: line.entry.status,
        accountCode: line.account.code,
        accountName: line.account.name,
        debit: line.debit,
        credit: line.credit
      });
    });
    
    // Test the exact query used by general-ledger
    const startDate = new Date('2023-10-12');
    const endDate = new Date('2025-10-12');
    
    const whereClause = {
      tenantId: tenantId,
      entry: {
        date: { gte: startDate, lte: endDate },
        status: { in: ['POSTED', 'DRAFT'] },
        companyId: companyId
      }
    };
    
    console.log('Testing general-ledger query...');
    console.log('Where clause:', JSON.stringify(whereClause, null, 2));
    
    const generalLedgerLines = await prisma.journalLine.findMany({
      where: whereClause,
      include: {
        entry: { select: { date: true, reference: true, memo: true } },
        account: { select: { code: true, name: true, type: { select: { name: true } } } }
      }
    });
    
    console.log(`General ledger query returned ${generalLedgerLines.length} lines`);
    
  } catch (error) {
    console.error('Error checking journal data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJournalData();
