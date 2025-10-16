import { Router, Response } from 'express';
import { prisma } from './prisma';
import { TenantRequest } from './tenant';
import { requireRoles } from './auth'; // Fixed: use auth.ts instead of middleware/auth.ts
import { z } from 'zod';
import { validateRequest as validateRequestMiddleware } from './middleware/validation.middleware';

const router = Router();

// Helper function to parse attachments from JSON string to array
const parseAttachments = (bill: any) => {
  if (bill.attachments && typeof bill.attachments === 'string') {
    try {
      bill.attachments = JSON.parse(bill.attachments);
    } catch (e) {
      bill.attachments = [];
    }
  } else if (!bill.attachments) {
    bill.attachments = [];
  }
  return bill;
};

// Validation schemas
const billSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  billNumber: z.string().min(1, 'Bill number is required'),
  billDate: z.string().transform(str => new Date(str)),
  dueDate: z.string().transform(str => new Date(str)),
  description: z.string().optional(),
  subtotal: z.number().positive('Subtotal must be positive'),
  taxAmount: z.number().min(0, 'Tax amount cannot be negative').default(0),
  totalAmount: z.number().positive('Total amount must be positive'),
  status: z.enum(['draft', 'posted', 'paid', 'partially_paid', 'overdue', 'cancelled']).default('draft'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    amount: z.number().positive(),
    accountId: z.string().optional(),
    taxAmount: z.number().min(0).default(0)
  })).optional()
});

const paymentSchema = z.object({
  paymentDate: z.string().transform(str => new Date(str)),
  amount: z.number().positive('Payment amount must be positive'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'check', 'credit_card', 'online']),
  bankAccountId: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional()
});

/**
 * @route GET /api/bills
 * @desc Get all vendor bills
 * @access Private
 */
router.get('/', requireRoles(['admin', 'accountant', 'manager']), async (req: TenantRequest, res: Response) => {
  try {
    const { status, vendorId, startDate, endDate } = req.query;
    const companyId = req.header('x-company-id') || 'demo-company';
    
    console.log('🔍 Bills GET - tenantId:', req.tenantId, 'companyId:', companyId, 'header:', req.header('x-company-id'));

    const where: any = {
      tenantId: req.tenantId!,
      companyId: companyId
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = new Date(startDate as string);
      if (endDate) where.billDate.lte = new Date(endDate as string);
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        vendor: true,
        lineItems: {
          include: {
            account: true
          }
        },
        payments: true
      },
      orderBy: { billDate: 'desc' }
    });

    res.json({ success: true, data: { bills: bills.map(parseAttachments) } });
  } catch (error: any) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills', message: error.message });
  }
});

/**
 * @route GET /api/bills/:id
 * @desc Get single bill by ID
 * @access Private
 */
router.get('/:id', requireRoles(['admin', 'accountant', 'manager']), async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        tenantId: req.tenantId!,
        companyId: req.header('x-company-id') || 'demo-company'
      },
      include: {
        vendor: true,
        lineItems: {
          include: {
            account: true
          }
        },
        payments: {
          include: {
            bankAccount: true
          }
        }
      }
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json(parseAttachments(bill));
  } catch (error: any) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill', message: error.message });
  }
});

/**
 * @route POST /api/bills
 * @desc Create a new vendor bill
 * @access Private
 */
router.post('/', requireRoles(['admin', 'accountant']), validateRequestMiddleware({ body: billSchema }), async (req: TenantRequest, res: Response) => {
  try {
    console.log('📥 Bill creation request body:', JSON.stringify(req.body, null, 2));
    const data = req.body;
    const tenantId = req.tenantId!;
    const companyId = req.header('x-company-id') || 'demo-company';

    // Check if bill number already exists
    const existingBill = await prisma.bill.findFirst({
      where: {
        tenantId,
        companyId,
        billNumber: data.billNumber
      }
    });

    if (existingBill) {
      return res.status(400).json({ error: 'Bill number already exists' });
    }

    // Create bill with line items
    const bill = await prisma.bill.create({
      data: {
        tenantId,
        companyId,
        vendorId: data.vendorId,
        billNumber: data.billNumber,
        billDate: data.billDate,
        dueDate: data.dueDate,
        description: data.description,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        status: data.status,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null ? JSON.stringify(data.attachments) : null,
        lineItems: data.lineItems ? {
          create: data.lineItems.map(item => ({
            tenantId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            accountId: item.accountId,
            taxAmount: item.taxAmount
          }))
        } : undefined
      },
      include: {
        vendor: true,
        lineItems: {
          include: {
            account: true
          }
        }
      }
    });

    console.log('✅ Bill created successfully:', bill.id, bill.billNumber);
    res.status(201).json(parseAttachments(bill));
  } catch (error: any) {
    console.error('Error creating bill:', error);
    res.status(500).json({ error: 'Failed to create bill', message: error.message });
  }
});

/**
 * @route PUT /api/bills/:id
 * @desc Update a vendor bill
 * @access Private
 */
router.put('/:id', requireRoles(['admin', 'accountant']), validateRequestMiddleware({ body: billSchema.partial() }), async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const tenantId = req.tenantId!;
    const companyId = req.header('x-company-id') || 'demo-company';

    // Check if bill exists
    const existingBill = await prisma.bill.findFirst({
      where: { id, tenantId, companyId }
    });

    if (!existingBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Cannot edit paid bills
    if (existingBill.status === 'paid') {
      return res.status(400).json({ error: 'Cannot edit paid bills' });
    }

    // Update bill
    const bill = await prisma.bill.update({
      where: { id },
      data: {
        vendorId: data.vendorId,
        billNumber: data.billNumber,
        billDate: data.billDate,
        dueDate: data.dueDate,
        description: data.description,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        status: data.status,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null
      },
      include: {
        vendor: true,
        lineItems: {
          include: {
            account: true
          }
        }
      }
    });

    res.json(parseAttachments(bill));
  } catch (error: any) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill', message: error.message });
  }
});

/**
 * @route DELETE /api/bills/:id
 * @desc Delete a vendor bill
 * @access Private
 */
router.delete('/:id', requireRoles(['admin', 'accountant']), async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const companyId = req.header('x-company-id') || 'demo-company';

    const bill = await prisma.bill.findFirst({
      where: { id, tenantId, companyId },
      include: { payments: true }
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Cannot delete bills with payments
    if (bill.payments && bill.payments.length > 0) {
      return res.status(400).json({ error: 'Cannot delete bills with payments' });
    }

    // Only draft bills can be deleted
    if (bill.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft bills can be deleted' });
    }

    await prisma.bill.delete({ where: { id } });

    res.json({ message: 'Bill deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ error: 'Failed to delete bill', message: error.message });
  }
});

/**
 * @route POST /api/bills/:id/post
 * @desc Post a bill (move from draft to posted)
 * @access Private
 */
router.post('/:id/post', requireRoles(['admin', 'accountant']), async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    const companyId = req.header('x-company-id') || 'demo-company';

    const bill = await prisma.bill.findFirst({
      where: { id, tenantId, companyId },
      include: { vendor: true, lineItems: { include: { account: true } } }
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (bill.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft bills can be posted' });
    }

    // Create journal entry for the bill
    const apAccount = await prisma.account.findFirst({
      where: {
        tenantId,
        companyId,
        code: '2001' // Accounts Payable
      }
    });

    if (!apAccount) {
      return res.status(400).json({ error: 'Accounts Payable account not found' });
    }

    // Get or create BILL entry type
    let entryType = await prisma.journalEntryType.findFirst({
      where: { tenantId, category: 'BILL' }
    });

    if (!entryType) {
      entryType = await prisma.journalEntryType.create({
        data: {
          tenantId,
          companyId,
          name: 'Vendor Bill',
          category: 'BILL',
          description: 'Journal entries for vendor bills'
        }
      });
    }

    // Create journal entry
    const journalEntry = await prisma.journalEntry.create({
      data: {
        tenantId,
        companyId,
        entryTypeId: entryType.id,
        date: bill.billDate,
        reference: bill.billNumber,
        memo: `Vendor Bill: ${bill.billNumber} - ${bill.vendor.name}`,
        status: 'POSTED',
        createdById: req.user?.id || null,
        lines: {
          create: [
            // Debit expense/asset accounts from line items
            ...bill.lineItems.map(item => ({
              tenantId,
              accountId: item.accountId || apAccount.id,
              debit: item.amount,
              credit: 0,
              memo: item.description
            })),
            // Credit Accounts Payable
            {
              tenantId,
              accountId: apAccount.id,
              debit: 0,
              credit: bill.totalAmount,
              memo: `Accounts Payable - ${bill.vendor.name}`
            }
          ]
        }
      },
      include: {
        lines: { include: { account: true } }
      }
    });

    // Update bill status
    const updatedBill = await prisma.bill.update({
      where: { id },
      data: {
        status: 'posted',
        journalEntryId: journalEntry.id
      },
      include: {
        vendor: true,
        lineItems: { include: { account: true } },
        journalEntry: { include: { lines: { include: { account: true } } } }
      }
    });

    res.json(updatedBill);
  } catch (error: any) {
    console.error('Error posting bill:', error);
    res.status(500).json({ error: 'Failed to post bill', message: error.message });
  }
});

/**
 * @route POST /api/bills/:id/payment
 * @desc Record a payment for a bill
 * @access Private
 */
router.post('/:id/payment', requireRoles(['admin', 'accountant']), validateRequestMiddleware({ body: paymentSchema }), async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const tenantId = req.tenantId!;
    const companyId = req.header('x-company-id') || 'demo-company';

    const bill = await prisma.bill.findFirst({
      where: { id, tenantId, companyId },
      include: { vendor: true, payments: true }
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (bill.status !== 'posted' && bill.status !== 'partially_paid') {
      return res.status(400).json({ error: 'Bill must be posted before payment can be recorded' });
    }

    // Calculate remaining amount
    const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = bill.totalAmount - totalPaid;

    if (data.amount > remainingAmount) {
      return res.status(400).json({ error: 'Payment amount exceeds remaining balance' });
    }

    // Get AP account
    const apAccount = await prisma.account.findFirst({
      where: { tenantId, companyId, code: '2001' }
    });

    // Get payment account (cash/bank)
    let paymentAccount = await prisma.account.findFirst({
      where: {
        tenantId,
        companyId,
        code: data.paymentMethod === 'cash' ? '1001' : '1002'
      }
    });

    if (!apAccount || !paymentAccount) {
      return res.status(400).json({ error: 'Required accounts not found' });
    }

    // Get or create PAYMENT entry type
    let entryType = await prisma.journalEntryType.findFirst({
      where: { tenantId, category: 'PAYMENT' }
    });

    if (!entryType) {
      entryType = await prisma.journalEntryType.create({
        data: {
          tenantId,
          companyId,
          name: 'Bill Payment',
          category: 'PAYMENT',
          description: 'Journal entries for bill payments'
        }
      });
    }

    // Create journal entry for payment
    const journalEntry = await prisma.journalEntry.create({
      data: {
        tenantId,
        companyId,
        entryTypeId: entryType.id,
        date: data.paymentDate,
        reference: `PAY-${bill.billNumber}`,
        memo: `Payment for Bill ${bill.billNumber} - ${bill.vendor.name}`,
        status: 'POSTED',
        createdById: req.user?.id || null,
        lines: {
          create: [
            // Debit AP (reduce liability)
            {
              tenantId,
              accountId: apAccount.id,
              debit: data.amount,
              credit: 0,
              memo: `Payment for ${bill.billNumber}`
            },
            // Credit Cash/Bank (reduce asset)
            {
              tenantId,
              accountId: paymentAccount.id,
              debit: 0,
              credit: data.amount,
              memo: `Payment to ${bill.vendor.name}`
            }
          ]
        }
      }
    });

    // Create payment record
    const payment = await prisma.billPayment.create({
      data: {
        tenantId,
        billId: id,
        paymentDate: data.paymentDate,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        bankAccountId: data.bankAccountId,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        journalEntryId: journalEntry.id
      }
    });

    // Update bill status
    const newTotalPaid = totalPaid + data.amount;
    const newStatus = newTotalPaid >= bill.totalAmount ? 'paid' : 'partially_paid';

    const updatedBill = await prisma.bill.update({
      where: { id },
      data: { status: newStatus },
      include: {
        vendor: true,
        lineItems: { include: { account: true } },
        payments: { include: { journalEntry: true } }
      }
    });

    res.json({ bill: parseAttachments(updatedBill), payment });
  } catch (error: any) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment', message: error.message });
  }
});

/**
 * @route GET /api/bills/analytics/aging
 * @desc Get accounts payable aging report
 * @access Private
 */
router.get('/analytics/aging', requireRoles(['admin', 'accountant', 'manager']), async (req: TenantRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const companyId = req.header('x-company-id') || 'demo-company';

    const bills = await prisma.bill.findMany({
      where: {
        tenantId,
        companyId,
        status: { in: ['posted', 'partially_paid', 'overdue'] }
      },
      include: {
        vendor: true,
        payments: true
      }
    });

    const today = new Date();
    const aging = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      over90: 0,
      total: 0,
      details: bills.map(bill => {
        const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
        const balance = bill.totalAmount - totalPaid;
        const daysOverdue = Math.floor((today.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24));

        let category = 'current';
        if (daysOverdue > 0 && daysOverdue <= 30) category = 'days1_30';
        else if (daysOverdue > 30 && daysOverdue <= 60) category = 'days31_60';
        else if (daysOverdue > 60 && daysOverdue <= 90) category = 'days61_90';
        else if (daysOverdue > 90) category = 'over90';

        return {
          billId: bill.id,
          billNumber: bill.billNumber,
          vendor: bill.vendor.name,
          billDate: bill.billDate,
          dueDate: bill.dueDate,
          totalAmount: bill.totalAmount,
          totalPaid,
          balance,
          daysOverdue: Math.max(0, daysOverdue),
          category
        };
      })
    };

    // Calculate totals
    aging.details.forEach(item => {
      aging.total += item.balance;
      if (item.category === 'current') aging.current += item.balance;
      else if (item.category === 'days1_30') aging.days1_30 += item.balance;
      else if (item.category === 'days31_60') aging.days31_60 += item.balance;
      else if (item.category === 'days61_90') aging.days61_90 += item.balance;
      else if (item.category === 'over90') aging.over90 += item.balance;
    });

    res.json(aging);
  } catch (error: any) {
    console.error('Error generating aging report:', error);
    res.status(500).json({ error: 'Failed to generate aging report', message: error.message });
  }
});

export default router;

