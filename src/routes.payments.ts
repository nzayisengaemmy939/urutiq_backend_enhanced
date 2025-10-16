import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireRoles } from './auth.js';
import { TenantRequest } from './types.js';

const prisma = new PrismaClient();

const router = express.Router();

// Get payment data for accounts payable
router.get('/payments', requireRoles(['admin', 'accountant', 'manager']), async (req: TenantRequest, res) => {
  try {
    const { companyId } = req.query;
    const tenantId = req.tenantId!;
    
    console.log('🔍 Payments API called with:', { companyId, tenantId });

    // Get bill payments
    const billPayments = await prisma.billPayment.findMany({
      where: {
        tenantId,
        bill: {
          companyId: companyId as string
        }
      },
      include: {
        bill: {
          include: {
            vendor: true
          }
        },
        bankAccount: true
      },
      orderBy: { paymentDate: 'desc' }
    });

    // Get payment schedules
    const paymentSchedules = await prisma.paymentSchedule.findMany({
      where: {
        tenantId,
        companyId: companyId as string
      },
      include: {
        bill: {
          include: {
            vendor: true
          }
        },
        bankAccount: true
      },
      orderBy: { scheduledDate: 'desc' }
    });

    // Get bank accounts
    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        tenantId,
        companyId: companyId as string
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate payment statistics
    const totalPaid = billPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const totalScheduled = paymentSchedules.reduce((sum, schedule) => sum + Number(schedule.amount), 0);
    const totalBankBalance = bankAccounts.reduce((sum, account) => sum + Number(account.balance), 0);

    const paymentStats = {
      totalPayments: billPayments.length,
      totalPaid,
      totalScheduled,
      totalBankBalance,
      bankAccounts: bankAccounts.length,
      recentPayments: billPayments.slice(0, 10),
      upcomingPayments: paymentSchedules.filter(s => s.status === 'scheduled').slice(0, 10)
    };

    console.log('📦 Found payment data:', {
      payments: billPayments.length,
      schedules: paymentSchedules.length,
      bankAccounts: bankAccounts.length,
      totalPaid,
      totalScheduled
    });

    res.json({
      success: true,
      data: {
        payments: billPayments,
        schedules: paymentSchedules,
        bankAccounts,
        stats: paymentStats
      }
    });
  } catch (error) {
    console.error('❌ Error fetching payment data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch payment data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get payment history for a specific bill
router.get('/payments/bill/:billId', requireRoles(['admin', 'accountant', 'manager']), async (req: TenantRequest, res) => {
  try {
    const { billId } = req.params;
    const tenantId = req.tenantId!;

    const payments = await prisma.billPayment.findMany({
      where: {
        tenantId,
        billId
      },
      include: {
        bill: {
          include: {
            vendor: true
          }
        },
        bankAccount: true
      },
      orderBy: { paymentDate: 'desc' }
    });

    res.json({
      success: true,
      data: { payments }
    });
  } catch (error) {
    console.error('❌ Error fetching bill payments:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch bill payments'
    });
  }
});

export { router as paymentsRouter };
