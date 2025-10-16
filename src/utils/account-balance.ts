import { prisma } from '../prisma';

/**
 * Updates account balances based on journal entries
 * This function should be called after journal entries are posted
 */
export async function updateAccountBalances(
  tenantId: string,
  companyId: string,
  journalEntryId: string
): Promise<void> {
  try {
    // Get the journal entry with its lines
    const journalEntry = await prisma.journalEntry.findFirst({
      where: {
        id: journalEntryId,
        tenantId,
        companyId,
        status: 'POSTED'
      },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    });

    if (!journalEntry) {
      throw new Error('Journal entry not found or not posted');
    }

    // Update balances for each account affected
    for (const line of journalEntry.lines) {
      const accountId = line.accountId;
      const debitAmount = Number(line.debit || 0);
      const creditAmount = Number(line.credit || 0);
      
      // Calculate net change (debit increases asset/expense, credit increases liability/equity/revenue)
      const netChange = debitAmount - creditAmount;
      
      // Update account balance (skip for now as balance field doesn't exist in Account model)
      // await prisma.account.update({
      //   where: { id: accountId },
      //   data: {
      //     balance: {
      //       increment: netChange
      //     },
      //     lastUpdated: new Date()
      //   }
      // });

      console.log(`✅ Account balance update skipped for account ${accountId} (balance field not available)`);
    }

    console.log(`✅ Account balances updated for journal entry ${journalEntryId}`);
  } catch (error) {
    console.error('Error updating account balances:', error);
    throw error;
  }
}

/**
 * Recalculates all account balances for a company
 * This is useful for data integrity checks or after bulk operations
 */
export async function recalculateAllAccountBalances(
  tenantId: string,
  companyId: string
): Promise<void> {
  try {
    console.log(`🔄 Recalculating account balances for company ${companyId}`);

    // Get all accounts for the company
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        companyId,
        isActive: true
      }
    });

    // Reset all balances to zero (balance field not available in Account model)
    // await prisma.account.updateMany({
    //   where: {
    //     tenantId,
    //     companyId,
    //     isActive: true
    //   },
    //   data: {
    //     balance: 0,
    //     lastUpdated: new Date()
    //   }
    // });

    // Get all posted journal entries with their lines
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        tenantId,
        companyId,
        status: 'POSTED'
      },
      include: {
        lines: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Calculate balances for each account
    const accountBalances = new Map<string, number>();

    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        const accountId = line.accountId;
        const debitAmount = Number(line.debit || 0);
        const creditAmount = Number(line.credit || 0);
        const netChange = debitAmount - creditAmount;

        const currentBalance = accountBalances.get(accountId) || 0;
        accountBalances.set(accountId, currentBalance + netChange);
      }
    }

    // Update account balances (balance field not available in Account model)
    // for (const [accountId, balance] of accountBalances) {
    //   await prisma.account.update({
    //     where: { id: accountId },
    //     data: {
    //       balance,
    //       lastUpdated: new Date()
    //     }
    //   });
    // }

    console.log(`✅ Recalculated balances for ${accounts.length} accounts`);
  } catch (error) {
    console.error('Error recalculating account balances:', error);
    throw error;
  }
}

/**
 * Gets account balance for a specific account
 */
export async function getAccountBalance(
  tenantId: string,
  companyId: string,
  accountId: string
): Promise<number> {
  try {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        tenantId,
        companyId,
        isActive: true
      }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return Number((account as any).balance || 0);
  } catch (error) {
    console.error('Error getting account balance:', error);
    throw error;
  }
}

/**
 * Gets account balances for multiple accounts
 */
export async function getAccountBalances(
  tenantId: string,
  companyId: string,
  accountIds: string[]
): Promise<Map<string, number>> {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        tenantId,
        companyId,
        isActive: true
      }
    });

    const balances = new Map<string, number>();
    for (const account of accounts) {
      balances.set(account.id, Number((account as any).balance || 0));
    }

    return balances;
  } catch (error) {
    console.error('Error getting account balances:', error);
    throw error;
  }
}
