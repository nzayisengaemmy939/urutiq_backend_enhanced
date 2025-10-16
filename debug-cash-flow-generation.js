import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugCashFlowGeneration() {
  try {
    console.log('Debugging Cash Flow generation...');
    
    const tenantId = 'tenant_1760184367074_e5wdnirrd';
    const companyId = 'cmgm8bpzq000djg0rj25cjmsz';
    
    // Test the same logic as generateCashFlow
    const period = {
      startDate: new Date('2023-10-12'),
      endDate: new Date('2025-10-12')
    };
    
    // Get cash and bank accounts
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
      console.log(`- ${account.code}: ${account.name}`);
    });
    
    // Test calculateOperatingCashFlows logic
    const cashAccount = await prisma.account.findFirst({
      where: {
        tenantId,
        companyId,
        code: '1000' // Cash account
      }
    });
    
    if (cashAccount) {
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
        }
      });
      
      const operatingInflows = cashFlows.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      const operatingOutflows = cashFlows.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const operatingNetCashFlow = operatingInflows - operatingOutflows;
      
      console.log(`\nOperating Cash Flows:`);
      console.log(`- Inflows: ${operatingInflows}`);
      console.log(`- Outflows: ${operatingOutflows}`);
      console.log(`- Net Cash Flow: ${operatingNetCashFlow}`);
      
      // Test getCashBalance logic
      const beginningJournalLines = await prisma.journalLine.findMany({
        where: {
          tenantId,
          accountId: cashAccount.id,
          entry: {
            date: { lte: period.startDate },
            status: 'POSTED'
          }
        }
      });
      
      const endingJournalLines = await prisma.journalLine.findMany({
        where: {
          tenantId,
          accountId: cashAccount.id,
          entry: {
            date: { lte: period.endDate },
            status: 'POSTED'
          }
        }
      });
      
      const beginningDebitTotal = beginningJournalLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const beginningCreditTotal = beginningJournalLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      const beginningCash = beginningDebitTotal - beginningCreditTotal;
      
      const endingDebitTotal = endingJournalLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
      const endingCreditTotal = endingJournalLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      const endingCash = endingDebitTotal - endingCreditTotal;
      
      console.log(`\nCash Balances:`);
      console.log(`- Beginning Cash: ${beginningCash}`);
      console.log(`- Ending Cash: ${endingCash}`);
      console.log(`- Change in Cash: ${endingCash - beginningCash}`);
      
      // Expected Cash Flow structure
      const expectedCashFlow = {
        operatingActivities: {
          inflows: operatingInflows > 0 ? [{ description: 'Cash from operations', amount: operatingInflows, category: 'operating' }] : [],
          outflows: operatingOutflows > 0 ? [{ description: 'Cash used in operations', amount: operatingOutflows, category: 'operating' }] : [],
          netCashFlow: operatingNetCashFlow
        },
        investingActivities: {
          inflows: [],
          outflows: [],
          netCashFlow: 0
        },
        financingActivities: {
          inflows: [],
          outflows: [],
          netCashFlow: 0
        },
        netCashFlow: operatingNetCashFlow,
        beginningCash,
        endingCash
      };
      
      console.log(`\nExpected Cash Flow Structure:`);
      console.log(JSON.stringify(expectedCashFlow, null, 2));
    }
    
  } catch (error) {
    console.error('Error debugging cash flow generation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCashFlowGeneration();
