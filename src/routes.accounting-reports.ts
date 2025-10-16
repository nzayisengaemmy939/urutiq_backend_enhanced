import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { TenantRequest } from './tenant.js';
import { authMiddleware, requireRoles } from './auth.js';
import { apiKeyAuthMiddleware } from './middleware/api-key-auth.js';
import { asyncHandler } from './errors.js';
import { redisCache } from './services/redis-cache.service.js';
import { cacheStrategies, cacheInvalidationMiddleware } from './middleware/cache.middleware.js';

const router = Router();
const prisma = new PrismaClient();

// Test endpoint
router.get('/test', async (req: TenantRequest, res) => {
  res.json({ 
    message: 'Accounting reports API is working!',
    timestamp: new Date().toISOString(),
    tenantId: req.tenantId,
    companyId: req.companyId
  });
});

// Trial Balance Report
router.get('/trial-balance', 
  cacheStrategies.medium('trial-balance'),
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['accountant', 'admin']),
  asyncHandler(async (req: TenantRequest, res) => {
  try {
    const { companyId, tenantId } = req;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // For now, return mock data to test the frontend
    // TODO: Replace with actual database queries once data is available
    const mockTrialBalance = [
      {
        accountId: '1',
        accountCode: '1000',
        accountName: 'Cash',
        accountType: 'Asset',
        debitTotal: 50000,
        creditTotal: 0,
        balance: 50000,
        isDebit: true
      },
      {
        accountId: '2',
        accountCode: '1100',
        accountName: 'Accounts Receivable',
        accountType: 'Asset',
        debitTotal: 25000,
        creditTotal: 0,
        balance: 25000,
        isDebit: true
      },
      {
        accountId: '3',
        accountCode: '2000',
        accountName: 'Accounts Payable',
        accountType: 'Liability',
        debitTotal: 0,
        creditTotal: 15000,
        balance: -15000,
        isDebit: false
      },
      {
        accountId: '4',
        accountCode: '3000',
        accountName: 'Owner Equity',
        accountType: 'Equity',
        debitTotal: 0,
        creditTotal: 60000,
        balance: -60000,
        isDebit: false
      }
    ];

    // Calculate totals
    const totalDebits = mockTrialBalance.reduce((sum, account) => sum + account.debitTotal, 0);
    const totalCredits = mockTrialBalance.reduce((sum, account) => sum + account.creditTotal, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    res.json({
      reportType: 'trial_balance',
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      accounts: mockTrialBalance,
      summary: {
        totalDebits,
        totalCredits,
        difference: totalDebits - totalCredits,
        isBalanced
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating trial balance:', error);
    res.status(500).json({ error: 'Failed to generate trial balance' });
  }
  })
);

// General Ledger Report
router.get('/general-ledger', async (req: TenantRequest, res) => {
  try {
    const { companyId, tenantId } = req;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const { accountId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Mock data for testing
    const mockEntries = [
      {
        id: '1',
        date: new Date('2024-01-15'),
        account: {
          id: '1',
          code: '1000',
          name: 'Cash',
          type: 'Asset'
        },
        entry: {
          id: 'JE001',
          memo: 'Initial investment',
          reference: 'INV-001',
          status: 'POSTED'
        },
        debit: 50000,
        credit: 0,
        balance: 50000
      },
      {
        id: '2',
        date: new Date('2024-01-16'),
        account: {
          id: '2',
          code: '1100',
          name: 'Accounts Receivable',
          type: 'Asset'
        },
        entry: {
          id: 'JE002',
          memo: 'Sale to customer',
          reference: 'INV-002',
          status: 'POSTED'
        },
        debit: 25000,
        credit: 0,
        balance: 25000
      },
      {
        id: '3',
        date: new Date('2024-01-17'),
        account: {
          id: '3',
          code: '2000',
          name: 'Accounts Payable',
          type: 'Liability'
        },
        entry: {
          id: 'JE003',
          memo: 'Purchase from vendor',
          reference: 'PO-001',
          status: 'POSTED'
        },
        debit: 0,
        credit: 15000,
        balance: -15000
      }
    ];

    res.json({
      reportType: 'general_ledger',
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      entries: mockEntries,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: mockEntries.length,
        pages: 1
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating general ledger:', error);
    res.status(500).json({ error: 'Failed to generate general ledger' });
  }
});

// Balance Sheet Report
router.get('/balance-sheet', async (req: TenantRequest, res) => {
  try {
    const { companyId, tenantId } = req;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const { asOfDate } = req.query;
    const asOf = asOfDate ? new Date(asOfDate as string) : new Date();

    // Get all accounts with their balances as of the specified date
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        isActive: true
      },
      include: {
        accountType: true,
        journalLines: {
          where: {
            entry: {
              date: {
                lte: asOf
              }
            }
          },
          include: {
            entry: true
          }
        }
      }
    });

    // Group accounts by type
    const accountGroups = {
      assets: [] as any[],
      liabilities: [] as any[],
      equity: [] as any[]
    };

    accounts.forEach(account => {
      const balance = account.journalLines.reduce((sum, line) => {
        return sum + (Number(line.debit) - Number(line.credit));
      }, 0);

      const accountData = {
        id: account.id,
        code: account.code,
        name: account.name,
        balance: Math.abs(balance),
        isDebit: balance >= 0
      };

      switch (account.accountType.code) {
        case 'ASSET':
          accountGroups.assets.push(accountData);
          break;
        case 'LIABILITY':
          accountGroups.liabilities.push(accountData);
          break;
        case 'EQUITY':
          accountGroups.equity.push(accountData);
          break;
      }
    });

    // Calculate totals
    const totalAssets = accountGroups.assets.reduce((sum, account) => sum + account.balance, 0);
    const totalLiabilities = accountGroups.liabilities.reduce((sum, account) => sum + account.balance, 0);
    const totalEquity = accountGroups.equity.reduce((sum, account) => sum + account.balance, 0);

    res.json({
      reportType: 'balance_sheet',
      asOfDate: asOf.toISOString(),
      assets: {
        accounts: accountGroups.assets,
        total: totalAssets
      },
      liabilities: {
        accounts: accountGroups.liabilities,
        total: totalLiabilities
      },
      equity: {
        accounts: accountGroups.equity,
        total: totalEquity
      },
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating balance sheet:', error);
    res.status(500).json({ error: 'Failed to generate balance sheet' });
  }
});

// Income Statement (P&L) Report
router.get('/income-statement', async (req: TenantRequest, res) => {
  try {
    const { companyId, tenantId } = req;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get revenue and expense accounts
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        isActive: true,
        accountType: {
          code: {
            in: ['REVENUE', 'EXPENSE']
          }
        }
      },
      include: {
        accountType: true,
        journalLines: {
          where: {
            entry: {
              date: {
                gte: start,
                lte: end
              }
            }
          },
          include: {
            entry: true
          }
        }
      }
    });

    const revenueAccounts = accounts.filter(acc => acc.accountType.code === 'REVENUE');
    const expenseAccounts = accounts.filter(acc => acc.accountType.code === 'EXPENSE');

    // Calculate revenue
    const revenue = revenueAccounts.map(account => {
      const balance = account.journalLines.reduce((sum, line) => {
        return sum + (Number(line.credit) - Number(line.debit)); // Revenue is typically credit
      }, 0);

      return {
        id: account.id,
        code: account.code,
        name: account.name,
        amount: Math.abs(balance)
      };
    });

    // Calculate expenses
    const expenses = expenseAccounts.map(account => {
      const balance = account.journalLines.reduce((sum, line) => {
        return sum + (Number(line.debit) - Number(line.credit)); // Expenses are typically debit
      }, 0);

      return {
        id: account.id,
        code: account.code,
        name: account.name,
        amount: Math.abs(balance)
      };
    });

    const totalRevenue = revenue.reduce((sum, account) => sum + account.amount, 0);
    const totalExpenses = expenses.reduce((sum, account) => sum + account.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    res.json({
      reportType: 'income_statement',
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      revenue: {
        accounts: revenue,
        total: totalRevenue
      },
      expenses: {
        accounts: expenses,
        total: totalExpenses
      },
      summary: {
        totalRevenue,
        totalExpenses,
        grossProfit: totalRevenue,
        netIncome,
        margin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating income statement:', error);
    res.status(500).json({ error: 'Failed to generate income statement' });
  }
});

// Accounts Receivable Aging Report
router.get('/ar-aging', async (req: TenantRequest, res) => {
  try {
    const { companyId, tenantId } = req;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const { asOfDate } = req.query;
    const asOf = asOfDate ? new Date(asOfDate as string) : new Date();

    // Get all customers with their outstanding invoices
    const customers = await prisma.customer.findMany({
      where: {
        companyId
      },
      include: {
        invoices: {
          where: {
            status: {
              in: ['SENT', 'PARTIAL', 'OVERDUE']
            },
            dueDate: {
              lte: asOf
            }
          },
          orderBy: {
            dueDate: 'asc'
          }
        }
      }
    });

    const agingReport = customers.map(customer => {
      const invoices = customer.invoices;
      const totalOutstanding = invoices.reduce((sum, invoice) => {
        return sum + (Number(invoice.total) - Number(invoice.paidAmount));
      }, 0);

      // Categorize by age
      const current = invoices.filter(inv => {
        const daysDiff = Math.floor((asOf.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 0;
      });

      const days30 = invoices.filter(inv => {
        const daysDiff = Math.floor((asOf.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > 0 && daysDiff <= 30;
      });

      const days60 = invoices.filter(inv => {
        const daysDiff = Math.floor((asOf.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > 30 && daysDiff <= 60;
      });

      const days90 = invoices.filter(inv => {
        const daysDiff = Math.floor((asOf.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > 60 && daysDiff <= 90;
      });

      const over90 = invoices.filter(inv => {
        const daysDiff = Math.floor((asOf.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > 90;
      });

      const calculateAmount = (invoiceList: any[]) => {
        return invoiceList.reduce((sum, invoice) => {
          return sum + (Number(invoice.total) - Number(invoice.paidAmount));
        }, 0);
      };

      return {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        totalOutstanding,
        aging: {
          current: calculateAmount(current),
          days30: calculateAmount(days30),
          days60: calculateAmount(days60),
          days90: calculateAmount(days90),
          over90: calculateAmount(over90)
        },
        invoiceCount: invoices.length
      };
    }).filter(customer => customer.totalOutstanding > 0);

    // Calculate totals
    const totals = agingReport.reduce((acc, customer) => {
      acc.current += customer.aging.current;
      acc.days30 += customer.aging.days30;
      acc.days60 += customer.aging.days60;
      acc.days90 += customer.aging.days90;
      acc.over90 += customer.aging.over90;
      acc.total += customer.totalOutstanding;
      return acc;
    }, {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      over90: 0,
      total: 0
    });

    res.json({
      reportType: 'ar_aging',
      asOfDate: asOf.toISOString(),
      customers: agingReport,
      totals,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating AR aging report:', error);
    res.status(500).json({ error: 'Failed to generate AR aging report' });
  }
});

// Accounts Payable Aging Report
router.get('/ap-aging', async (req: TenantRequest, res) => {
  try {
    const { companyId, tenantId } = req;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const { asOfDate } = req.query;
    const asOf = asOfDate ? new Date(asOfDate as string) : new Date();

    // Get all vendors with their outstanding bills
    const vendors = await prisma.vendor.findMany({
      where: {
        companyId
      },
      include: {
        bills: {
          where: {
            status: {
              in: ['RECEIVED', 'PARTIAL', 'OVERDUE']
            },
            dueDate: {
              lte: asOf
            }
          },
          orderBy: {
            dueDate: 'asc'
          }
        }
      }
    });

    const agingReport = vendors.map(vendor => {
      const bills = vendor.bills;
      const totalOutstanding = bills.reduce((sum, bill) => {
        return sum + (Number(bill.total) - Number(bill.paidAmount));
      }, 0);

      // Categorize by age
      const current = bills.filter(bill => {
        const daysDiff = Math.floor((asOf.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 0;
      });

      const days30 = bills.filter(bill => {
        const daysDiff = Math.floor((asOf.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > 0 && daysDiff <= 30;
      });

      const days60 = bills.filter(bill => {
        const daysDiff = Math.floor((asOf.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > 30 && daysDiff <= 60;
      });

      const days90 = bills.filter(bill => {
        const daysDiff = Math.floor((asOf.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > 60 && daysDiff <= 90;
      });

      const over90 = bills.filter(bill => {
        const daysDiff = Math.floor((asOf.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > 90;
      });

      const calculateAmount = (billList: any[]) => {
        return billList.reduce((sum, bill) => {
          return sum + (Number(bill.total) - Number(bill.paidAmount));
        }, 0);
      };

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorEmail: vendor.email,
        totalOutstanding,
        aging: {
          current: calculateAmount(current),
          days30: calculateAmount(days30),
          days60: calculateAmount(days60),
          days90: calculateAmount(days90),
          over90: calculateAmount(over90)
        },
        billCount: bills.length
      };
    }).filter(vendor => vendor.totalOutstanding > 0);

    // Calculate totals
    const totals = agingReport.reduce((acc, vendor) => {
      acc.current += vendor.aging.current;
      acc.days30 += vendor.aging.days30;
      acc.days60 += vendor.aging.days60;
      acc.days90 += vendor.aging.days90;
      acc.over90 += vendor.aging.over90;
      acc.total += vendor.totalOutstanding;
      return acc;
    }, {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      over90: 0,
      total: 0
    });

    res.json({
      reportType: 'ap_aging',
      asOfDate: asOf.toISOString(),
      vendors: agingReport,
      totals,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating AP aging report:', error);
    res.status(500).json({ error: 'Failed to generate AP aging report' });
  }
});

export default router;
