import type { Router } from 'express';
import { prisma } from './prisma.js';
import { TenantRequest } from './tenant.js';

export function mountAccountingOverviewRoutes(router: Router) {
  // Get accounting overview - aggregates data from multiple sources
  router.get('/overview', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    
    if (!companyId) {
      return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
    }

    try {
      // Get current date for calculations
      const asOf = new Date();
      const thirtyDaysAgo = new Date(asOf.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 1. Get trial balance data for metrics
      const accounts = await prisma.account.findMany({
        where: { 
          tenantId: req.tenantId!, 
          companyId,
          isActive: true 
        },
        include: { type: true }
      });

      // Calculate account balances
      const accountBalances = await Promise.all(
        accounts.map(async (account) => {
          const lines = await prisma.journalLine.findMany({
            where: {
              tenantId: req.tenantId!,
              accountId: account.id,
              entry: {
                date: { lte: asOf },
                status: 'POSTED',
                companyId: companyId
              }
            }
          });

          const debitBalance = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
          const creditBalance = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
          const netBalance = debitBalance - creditBalance;

          return {
            accountId: account.id,
            accountCode: account.code,
            accountName: account.name,
            accountType: account.type?.name || 'Unknown',
            debitBalance,
            creditBalance,
            netBalance
          };
        })
      );

      const totalDebits = accountBalances.reduce((sum, acc) => sum + acc.debitBalance, 0);
      const totalCredits = accountBalances.reduce((sum, acc) => sum + acc.creditBalance, 0);
      const balanceDifference = totalDebits - totalCredits;

      // 2. Calculate assets (sum of asset account balances)
      const assetAccounts = accountBalances.filter(acc => 
        acc.accountType.toLowerCase().includes('asset') || 
        acc.accountType.toLowerCase().includes('current asset') ||
        acc.accountType.toLowerCase().includes('fixed asset')
      );
      const totalAssets = assetAccounts.reduce((sum, acc) => sum + Math.max(0, acc.netBalance), 0);

      // 3. Get journal entry counts
      const totalJournalEntries = await prisma.journalEntry.count({
        where: { 
          tenantId: req.tenantId!,
          companyId
        }
      });

      const recentJournalEntries = await prisma.journalEntry.count({
        where: { 
          tenantId: req.tenantId!,
          companyId,
          createdAt: { gte: thirtyDaysAgo }
        }
      });

      // 4. Calculate revenue and expenses from income statement accounts
      const revenueAccounts = accountBalances.filter(acc => 
        acc.accountType.toLowerCase().includes('revenue') ||
        acc.accountType.toLowerCase().includes('income') ||
        acc.accountType.toLowerCase().includes('sales')
      );
      const expenseAccounts = accountBalances.filter(acc => 
        acc.accountType.toLowerCase().includes('expense') ||
        acc.accountType.toLowerCase().includes('cost') ||
        acc.accountType.toLowerCase().includes('overhead')
      );

      const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + Math.max(0, acc.netBalance), 0);
      const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + Math.abs(acc.netBalance), 0);
      const netIncome = totalRevenue - totalExpenses;

      // 5. Get recent activity (last 10 journal entries)
      const recentActivity = await prisma.journalEntry.findMany({
        where: { 
          tenantId: req.tenantId!,
          companyId
        },
        include: {
          lines: {
            include: {
              account: {
                select: { code: true, name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // 6. Calculate health metrics
      const pendingEntries = await prisma.journalEntry.count({
        where: { 
          tenantId: req.tenantId!,
          companyId,
          status: 'DRAFT'
        }
      });

      const unreconciledAccounts = await prisma.account.count({
        where: { 
          tenantId: req.tenantId!,
          companyId,
          isActive: true,
          // Add reconciliation logic here if you have reconciliation tables
        }
      });

      // Build the response
      const overview = {
        metrics: {
          assets: Math.round(totalAssets),
          netIncome: Math.round(netIncome),
          journalEntries: totalJournalEntries,
          balanceOk: Math.abs(balanceDifference) < 0.01 // Consider balanced if difference is less than 1 cent
        },
        health: [
          {
            label: 'Account Reconciliation',
            value: unreconciledAccounts === 0 ? 100 : Math.max(0, 100 - (unreconciledAccounts * 10)),
            status: unreconciledAccounts === 0 ? 'ok' : unreconciledAccounts < 5 ? 'warn' : 'due',
            description: unreconciledAccounts === 0 ? 'All accounts are reconciled' : `${unreconciledAccounts} accounts need reconciliation`
          },
          {
            label: 'Journal Entries',
            value: pendingEntries === 0 ? 100 : Math.max(50, 100 - (pendingEntries * 5)),
            status: pendingEntries === 0 ? 'ok' : pendingEntries < 5 ? 'warn' : 'due',
            description: `${totalJournalEntries} entries posted, ${pendingEntries} pending review`
          },
          {
            label: 'Trial Balance',
            value: Math.abs(balanceDifference) < 0.01 ? 100 : 75,
            status: Math.abs(balanceDifference) < 0.01 ? 'ok' : 'warn',
            description: Math.abs(balanceDifference) < 0.01 ? 'Total debits equal total credits' : `Balance difference: ${balanceDifference.toFixed(2)}`
          },
          {
            label: 'Financial Reports',
            value: recentJournalEntries > 0 ? 85 : 60,
            status: recentJournalEntries > 0 ? 'ok' : 'due',
            description: recentJournalEntries > 0 ? 'Recent activity detected' : 'No recent journal entries'
          }
        ],
        summary: {
          revenue: Math.round(totalRevenue),
          expenses: Math.round(totalExpenses),
          profit: Math.round(netIncome),
          netIncome: Math.round(netIncome)
        },
        activity: recentActivity.map((entry, index) => ({
          id: entry.id,
          icon: entry.status === 'POSTED' ? 'approved' : 'review',
          title: entry.status === 'POSTED' ? 'Journal Entry Posted' : 'Journal Entry Pending',
          detail: `${entry.reference || 'Entry'} - ${entry.memo || 'No memo'}`,
          minutesAgo: Math.round((Date.now() - entry.createdAt.getTime()) / (1000 * 60))
        })),
        tasks: [
          {
            label: 'Review journal entries',
            count: pendingEntries,
            variant: pendingEntries > 0 ? 'secondary' : 'outline'
          },
          {
            label: 'Bank reconciliations',
            count: Math.min(unreconciledAccounts, 5), // Cap at 5 for display
            variant: unreconciledAccounts > 0 ? 'secondary' : 'outline'
          },
          {
            label: 'Month-end closing',
            count: balanceDifference !== 0 ? 1 : 0,
            variant: balanceDifference !== 0 ? 'destructive' : 'outline'
          },
          {
            label: 'Audit preparation',
            count: Math.max(0, Math.floor(totalJournalEntries / 100)), // Estimate based on entry count
            variant: 'outline'
          }
        ],
        generatedAt: new Date().toISOString()
      };

      res.json(overview);
    } catch (error) {
      console.error('Error generating accounting overview:', error);
      res.status(500).json({ error: 'internal_error', message: 'Failed to generate accounting overview' });
    }
  });
}
