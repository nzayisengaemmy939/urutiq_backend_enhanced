import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCashFlowCalculation() {
  try {
    console.log('Testing Cash Flow calculation...');
    
    const tenantId = 'tenant_1760184367074_e5wdnirrd';
    const companyId = 'cmgm8bpzq000djg0rj25cjmsz';
    
    // Test the same logic as calculateOperatingCashFlows
    const cashAccount = await prisma.account.findFirst({
      where: {
        tenantId,
        companyId,
        code: '1000' // Cash account
      }
    });
    
    console.log('Cash account found:', cashAccount ? {
      id: cashAccount.id,
      code: cashAccount.code,
      name: cashAccount.name
    } : 'Not found');
    
    if (cashAccount) {
      const period = {
        startDate: new Date('2023-10-12'),
        endDate: new Date('2025-10-12')
      };
      
      // Get journal lines for cash account in the period
      const cashFlows = await prisma.journalLine.findMany({
        where: {
          tenantId,
          accountId: cashAccount.id,
          entry: {
            date: {
              gte: period.startDate,
              lte: period.endDate
            },
            status: 'POSTED'
          }
        },
        include: {
          entry: {
            select: { date: true, reference: true, memo: true }
          }
        }
      });
      
      console.log(`\nFound ${cashFlows.length} cash flow journal lines`);
      
      cashFlows.forEach((line, index) => {
        console.log(`Line ${index + 1}:`, {
          id: line.id,
          entryDate: line.entry.date,
          entryRef: line.entry.reference,
          debit: line.debit,
          credit: line.credit,
          memo: line.memo
        });
      });
      
      // Calculate operating cash flows
      const operatingInflows = cashFlows.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      const operatingOutflows = cashFlows.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const netCashFlow = operatingInflows - operatingOutflows;
      
      console.log(`\nOperating Cash Flows:`);
      console.log(`- Inflows: ${operatingInflows}`);
      console.log(`- Outflows: ${operatingOutflows}`);
      console.log(`- Net Cash Flow: ${netCashFlow}`);
    }
    
  } catch (error) {
    console.error('Error testing cash flow calculation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCashFlowCalculation();
