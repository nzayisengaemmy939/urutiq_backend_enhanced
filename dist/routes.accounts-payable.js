import { z } from 'zod';
import { prisma } from './prisma';
import { validateRequest as validateRequestMiddleware } from './middleware/validation.middleware';
import { requireRoles } from './auth.js';
import { addAudit } from './ai';
import { processPostPaymentWorkflow } from './utils/post-payment-workflow';
// Validation schemas for comprehensive AP process
const invoiceCaptureSchema = z.object({
    vendorId: z.string().min(1, 'Vendor is required'),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    invoiceDate: z.string().transform(str => new Date(str)),
    dueDate: z.string().transform(str => new Date(str)).optional(),
    totalAmount: z.number().positive('Total amount must be positive'),
    subtotal: z.number().min(0, 'Subtotal cannot be negative'),
    taxAmount: z.number().min(0, 'Tax amount cannot be negative'),
    currency: z.string().length(3).default('USD'),
    source: z.enum(['manual', 'email', 'api', 'ocr', 'upload']).default('manual'),
    rawData: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    notes: z.string().optional(),
    purchaseOrderId: z.string().optional() // Add purchase order reference
});
const invoiceMatchingSchema = z.object({
    invoiceId: z.string().min(1, 'Invoice ID is required'),
    purchaseOrderId: z.string().optional(),
    goodsReceivedNoteId: z.string().optional(),
    matchingType: z.enum(['two_way', 'three_way']),
    discrepancies: z.array(z.object({
        field: z.string(),
        expected: z.any(),
        actual: z.any(),
        severity: z.enum(['low', 'medium', 'high'])
    })).optional()
});
const invoiceApprovalSchema = z.object({
    approverId: z.string().min(1, 'Approver ID is required'),
    approvalLevel: z.number().int().min(1).default(1),
    comments: z.string().optional(),
    status: z.enum(['approved', 'rejected']).default('approved')
});
const paymentScheduleSchema = z.object({
    billId: z.string().min(1, 'Bill ID is required'),
    scheduledDate: z.string().transform(str => new Date(str)),
    amount: z.number().positive('Amount must be positive'),
    paymentMethod: z.enum(['check', 'bank_transfer', 'credit_card', 'cash']),
    bankAccountId: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    earlyPaymentDiscount: z.number().min(0).default(0),
    latePaymentPenalty: z.number().min(0).default(0),
    notes: z.string().optional()
});
const reconciliationSchema = z.object({
    periodStart: z.string().transform(str => new Date(str)),
    periodEnd: z.string().transform(str => new Date(str)),
    reconciledBy: z.string().min(1, 'Reconciled by is required'),
    notes: z.string().optional()
});
/**
 * @route GET /api/accounts-payable/invoices
 * @desc Get all captured invoices with filtering and pagination
 * @access Private
 */
export function mountAccountsPayableRoutes(router) {
    router.get('/invoices', requireRoles(['admin', 'accountant', 'manager']), async (req, res) => {
        try {
            const { page = '1', pageSize = '20', status, vendorId, source, dateFrom, dateTo, q } = req.query;
            const pageNum = Math.max(1, parseInt(page, 10));
            const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
            const skip = (pageNum - 1) * pageSizeNum;
            const where = {
                tenantId: req.tenantId,
                companyId: req.header('x-company-id') || 'demo-company',
                ...(status && { status }),
                ...(vendorId && { vendorId }),
                ...(source && { source }),
                ...(dateFrom && { invoiceDate: { gte: new Date(dateFrom) } }),
                ...(dateTo && { invoiceDate: { lte: new Date(dateTo) } }),
                ...(q && {
                    OR: [
                        { invoiceNumber: { contains: q } },
                        { vendor: { name: { contains: q } } }
                    ]
                })
            };
            const [total, invoices] = await Promise.all([
                prisma.invoiceCapture.count({ where }),
                prisma.invoiceCapture.findMany({
                    where,
                    include: {
                        vendor: true,
                        matching: {
                            include: {
                                purchaseOrder: true,
                                goodsReceivedNote: true
                            }
                        },
                        approval: true,
                        bills: true
                    },
                    orderBy: { invoiceDate: 'desc' },
                    skip,
                    take: pageSizeNum
                })
            ]);
            const totalPages = Math.ceil(total / pageSizeNum);
            res.json({
                success: true,
                data: {
                    invoices,
                    pagination: {
                        page: pageNum,
                        pageSize: pageSizeNum,
                        total,
                        totalPages,
                        hasNext: pageNum < totalPages,
                        hasPrev: pageNum > 1
                    }
                }
            });
        }
        catch (error) {
            console.error('Error fetching invoices:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch invoices',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * @route POST /api/accounts-payable/invoices
     * @desc Capture a new invoice
     * @access Private
     */
    router.post('/invoices', requireRoles(['admin', 'accountant']), validateRequestMiddleware({ body: invoiceCaptureSchema }), async (req, res) => {
        try {
            const data = req.body;
            const tenantId = req.tenantId;
            const companyId = req.header('x-company-id') || 'demo-company';
            console.log('🔧 AP Invoice Creation Request:', {
                tenantId,
                companyId,
                data,
                headers: req.headers
            });
            // Check if invoice number already exists
            const existingInvoice = await prisma.invoiceCapture.findFirst({
                where: {
                    tenantId,
                    companyId,
                    invoiceNumber: data.invoiceNumber
                }
            });
            if (existingInvoice) {
                return res.status(400).json({
                    success: false,
                    error: 'Invoice number already exists'
                });
            }
            const invoice = await prisma.invoiceCapture.create({
                data: {
                    tenantId,
                    companyId,
                    vendorId: data.vendorId,
                    invoiceNumber: data.invoiceNumber,
                    invoiceDate: data.invoiceDate,
                    dueDate: data.dueDate,
                    totalAmount: data.totalAmount,
                    subtotal: data.subtotal,
                    taxAmount: data.taxAmount,
                    currency: data.currency,
                    source: data.source,
                    rawData: data.rawData ? JSON.stringify(data.rawData) : (data.purchaseOrderId ? JSON.stringify({ purchaseOrderId: data.purchaseOrderId }) : null),
                    attachments: data.attachments ? JSON.stringify(data.attachments) : null,
                    notes: data.notes ? (data.purchaseOrderId ? `${data.notes}\n\nRelated Purchase Order: ${data.purchaseOrderId}` : data.notes) : (data.purchaseOrderId ? `Related Purchase Order: ${data.purchaseOrderId}` : null)
                },
                include: {
                    vendor: true
                }
            });
            // Log audit trail
            await addAudit({
                tenantId,
                companyId,
                action: `Invoice ${data.invoiceNumber} captured from ${data.source}`
            });
            res.status(201).json({
                success: true,
                data: invoice
            });
        }
        catch (error) {
            console.error('Error capturing invoice:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to capture invoice',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * @route PUT /api/accounts-payable/invoices/:id
     * @desc Update an existing invoice
     * @access Private
     */
    router.put('/invoices/:id', requireRoles(['admin', 'accountant']), validateRequestMiddleware({ body: invoiceCaptureSchema }), async (req, res) => {
        try {
            const { id } = req.params;
            const data = req.body;
            const tenantId = req.tenantId;
            const companyId = req.header('x-company-id') || 'demo-company';
            // Check if invoice exists
            const existingInvoice = await prisma.invoiceCapture.findFirst({
                where: { id, tenantId, companyId }
            });
            if (!existingInvoice) {
                return res.status(404).json({
                    success: false,
                    error: 'Invoice not found'
                });
            }
            // Check if invoice can be updated (only captured invoices can be updated)
            if (existingInvoice.status !== 'captured') {
                return res.status(400).json({
                    success: false,
                    error: 'Only captured invoices can be updated'
                });
            }
            // Check if invoice number already exists (excluding current invoice)
            if (data.invoiceNumber !== existingInvoice.invoiceNumber) {
                const duplicateInvoice = await prisma.invoiceCapture.findFirst({
                    where: {
                        tenantId,
                        companyId,
                        invoiceNumber: data.invoiceNumber,
                        id: { not: id }
                    }
                });
                if (duplicateInvoice) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invoice number already exists'
                    });
                }
            }
            // Update the invoice
            const updatedInvoice = await prisma.invoiceCapture.update({
                where: { id },
                data: {
                    vendorId: data.vendorId,
                    invoiceNumber: data.invoiceNumber,
                    invoiceDate: data.invoiceDate,
                    dueDate: data.dueDate,
                    totalAmount: data.totalAmount,
                    subtotal: data.subtotal,
                    taxAmount: data.taxAmount,
                    currency: data.currency,
                    source: data.source,
                    rawData: data.rawData ? JSON.stringify(data.rawData) : (data.purchaseOrderId ? JSON.stringify({ purchaseOrderId: data.purchaseOrderId }) : null),
                    attachments: data.attachments ? JSON.stringify(data.attachments) : null,
                    notes: data.notes ? (data.purchaseOrderId ? `${data.notes}\n\nRelated Purchase Order: ${data.purchaseOrderId}` : data.notes) : (data.purchaseOrderId ? `Related Purchase Order: ${data.purchaseOrderId}` : null)
                },
                include: {
                    vendor: true
                }
            });
            // Log audit trail
            await addAudit({
                tenantId,
                companyId,
                action: `Invoice ${updatedInvoice.invoiceNumber} updated`,
                details: `Updated invoice details`
            });
            res.json({
                success: true,
                data: updatedInvoice
            });
        }
        catch (error) {
            console.error('Error updating invoice:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update invoice',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * @route DELETE /api/accounts-payable/invoices/:id
     * @desc Delete an existing invoice
     * @access Private
     */
    router.delete('/invoices/:id', requireRoles(['admin', 'accountant']), async (req, res) => {
        try {
            const { id } = req.params;
            const tenantId = req.tenantId;
            const companyId = req.header('x-company-id') || 'demo-company';
            // Check if invoice exists
            const existingInvoice = await prisma.invoiceCapture.findFirst({
                where: { id, tenantId, companyId }
            });
            if (!existingInvoice) {
                return res.status(404).json({
                    success: false,
                    error: 'Invoice not found'
                });
            }
            // Check if invoice can be deleted (only captured invoices can be deleted)
            if (existingInvoice.status !== 'captured') {
                return res.status(400).json({
                    success: false,
                    error: 'Only captured invoices can be deleted'
                });
            }
            // Delete the invoice
            await prisma.invoiceCapture.delete({
                where: { id }
            });
            // Log audit trail
            await addAudit({
                tenantId,
                companyId,
                action: `Invoice ${existingInvoice.invoiceNumber} deleted`,
                details: `Deleted captured invoice`
            });
            res.json({
                success: true,
                message: 'Invoice deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting invoice:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete invoice',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * @route POST /api/accounts-payable/invoices/:id/match
     * @desc Match invoice with PO and/or GRN
     * @access Private
     */
    router.post('/invoices/:id/match', requireRoles(['admin', 'accountant']), validateRequestMiddleware({ body: invoiceMatchingSchema }), async (req, res) => {
        try {
            const { id } = req.params;
            const data = req.body;
            const tenantId = req.tenantId;
            const companyId = req.header('x-company-id') || 'demo-company';
            const invoice = await prisma.invoiceCapture.findFirst({
                where: { id, tenantId, companyId }
            });
            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    error: 'Invoice not found'
                });
            }
            // Calculate match score based on matching type
            let matchScore = 100;
            const discrepancies = [];
            if (data.matchingType === 'two_way' && data.purchaseOrderId) {
                const po = await prisma.purchaseOrder.findFirst({
                    where: { id: data.purchaseOrderId, tenantId, companyId },
                    include: { lines: true }
                });
                if (po) {
                    // Compare invoice with PO
                    if (Math.abs(Number(invoice.totalAmount) - Number(po.totalAmount)) > 0.01) {
                        matchScore -= 20;
                        discrepancies.push({
                            field: 'totalAmount',
                            expected: po.totalAmount,
                            actual: invoice.totalAmount,
                            severity: 'high'
                        });
                    }
                }
            }
            if (data.matchingType === 'three_way' && data.goodsReceivedNoteId) {
                const grn = await prisma.goodsReceivedNote.findFirst({
                    where: { id: data.goodsReceivedNoteId, tenantId, companyId }
                });
                if (grn) {
                    // Additional validation for three-way matching
                    matchScore -= 10; // Base deduction for three-way complexity
                }
            }
            const matching = await prisma.invoiceMatching.create({
                data: {
                    tenantId,
                    companyId,
                    invoiceId: id,
                    purchaseOrderId: data.purchaseOrderId,
                    goodsReceivedNoteId: data.goodsReceivedNoteId,
                    matchingType: data.matchingType,
                    status: matchScore >= 80 ? 'matched' : matchScore >= 50 ? 'partial' : 'unmatched',
                    matchScore,
                    discrepancies: JSON.stringify(discrepancies),
                    matchedBy: req.user?.id || 'system',
                    matchedAt: new Date()
                },
                include: {
                    purchaseOrder: true,
                    goodsReceivedNote: true
                }
            });
            // Update invoice status
            await prisma.invoiceCapture.update({
                where: { id },
                data: {
                    status: matchScore >= 80 ? 'matched' : 'processing',
                    processedAt: new Date()
                }
            });
            res.json({
                success: true,
                data: matching
            });
        }
        catch (error) {
            console.error('Error matching invoice:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to match invoice',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * @route POST /api/accounts-payable/invoices/:id/approve
     * @desc Approve or reject an invoice
     * @access Private
     */
    router.post('/invoices/:id/approve', requireRoles(['admin', 'accountant', 'manager']), validateRequestMiddleware({ body: invoiceApprovalSchema }), async (req, res) => {
        try {
            const { id } = req.params;
            const { approverId, approvalLevel, comments, status } = req.body;
            const tenantId = req.tenantId;
            const companyId = req.header('x-company-id') || 'demo-company';
            const invoice = await prisma.invoiceCapture.findFirst({
                where: { id, tenantId, companyId }
            });
            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    error: 'Invoice not found'
                });
            }
            const approval = await prisma.invoiceApproval.create({
                data: {
                    tenantId,
                    companyId,
                    invoiceId: id,
                    approverId,
                    approvalLevel,
                    status: status || 'approved',
                    comments,
                    approvedAt: status === 'approved' ? new Date() : null
                }
            });
            // Update invoice status
            const newStatus = status === 'approved' ? 'approved' : 'rejected';
            await prisma.invoiceCapture.update({
                where: { id },
                data: {
                    status: newStatus,
                    approvedAt: status === 'approved' ? new Date() : null
                }
            });
            // If approved, create a bill
            if (status === 'approved') {
                const bill = await prisma.bill.create({
                    data: {
                        tenantId,
                        companyId,
                        vendorId: invoice.vendorId,
                        billNumber: `BILL-${invoice.invoiceNumber}`,
                        billDate: invoice.invoiceDate,
                        dueDate: invoice.dueDate,
                        totalAmount: invoice.totalAmount,
                        subtotal: invoice.subtotal,
                        taxAmount: invoice.taxAmount,
                        status: 'posted', // Auto-post the bill instead of draft
                        balanceDue: invoice.totalAmount,
                        invoiceCaptureId: invoice.id
                    }
                });
                // Log audit trail
                await addAudit({
                    tenantId,
                    companyId,
                    action: `Invoice ${invoice.invoiceNumber} approved and converted to bill ${bill.billNumber}`
                });
                res.json({
                    success: true,
                    data: {
                        approval,
                        bill
                    }
                });
            }
            else {
                res.json({
                    success: true,
                    data: approval
                });
            }
        }
        catch (error) {
            console.error('Error approving invoice:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to approve invoice',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * @route POST /api/accounts-payable/payment-schedule
     * @desc Schedule a payment
     * @access Private
     */
    router.post('/payment-schedule', requireRoles(['admin', 'accountant']), validateRequestMiddleware({ body: paymentScheduleSchema }), async (req, res) => {
        try {
            const data = req.body;
            const tenantId = req.tenantId;
            const companyId = req.header('x-company-id') || 'demo-company';
            const bill = await prisma.bill.findFirst({
                where: { id: data.billId, tenantId, companyId }
            });
            if (!bill) {
                return res.status(404).json({
                    success: false,
                    error: 'Bill not found'
                });
            }
            const paymentSchedule = await prisma.paymentSchedule.create({
                data: {
                    tenantId,
                    companyId,
                    billId: data.billId,
                    scheduledDate: data.scheduledDate,
                    amount: data.amount,
                    paymentMethod: data.paymentMethod,
                    bankAccountId: data.bankAccountId,
                    priority: data.priority,
                    earlyPaymentDiscount: data.earlyPaymentDiscount,
                    latePaymentPenalty: data.latePaymentPenalty,
                    notes: data.notes
                },
                include: {
                    bill: {
                        include: {
                            vendor: true
                        }
                    },
                    bankAccount: true
                }
            });
            res.status(201).json({
                success: true,
                data: paymentSchedule
            });
        }
        catch (error) {
            console.error('Error scheduling payment:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to schedule payment',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * @route GET /api/accounts-payable/aging-report
     * @desc Get AP aging report
     * @access Private
     */
    router.get('/aging-report', requireRoles(['admin', 'accountant', 'manager']), async (req, res) => {
        try {
            const { companyId } = req.query;
            const tenantId = req.tenantId;
            const bills = await prisma.bill.findMany({
                where: {
                    tenantId,
                    companyId: companyId || req.header('x-company-id') || 'demo-company',
                    status: { in: ['posted', 'partially_paid'] }
                },
                include: {
                    vendor: true,
                    payments: true
                },
                orderBy: { dueDate: 'asc' }
            });
            const now = new Date();
            const agingReport = bills.map(bill => {
                const daysPastDue = bill.dueDate ? Math.floor((now.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                let agingBucket = 'current';
                if (daysPastDue > 90)
                    agingBucket = 'over_90_days';
                else if (daysPastDue > 60)
                    agingBucket = '61_90_days';
                else if (daysPastDue > 30)
                    agingBucket = '31_60_days';
                else if (daysPastDue > 0)
                    agingBucket = '1_30_days';
                return {
                    ...bill,
                    daysPastDue,
                    agingBucket,
                    totalPaid: bill.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
                };
            });
            // Group by aging buckets
            const agingSummary = agingReport.reduce((acc, bill) => {
                const bucket = bill.agingBucket;
                if (!acc[bucket]) {
                    acc[bucket] = { count: 0, totalAmount: 0 };
                }
                acc[bucket].count += 1;
                acc[bucket].totalAmount += Number(bill.balanceDue);
                return acc;
            }, {});
            res.json({
                success: true,
                data: {
                    agingReport,
                    agingSummary,
                    totalOutstanding: agingReport.reduce((sum, bill) => sum + Number(bill.balanceDue), 0)
                }
            });
        }
        catch (error) {
            console.error('Error generating aging report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate aging report',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * @route POST /api/accounts-payable/reconcile
     * @desc Start AP reconciliation process
     * @access Private
     */
    router.post('/reconcile', requireRoles(['admin', 'accountant']), validateRequestMiddleware({ body: reconciliationSchema }), async (req, res) => {
        try {
            const data = req.body;
            const tenantId = req.tenantId;
            const companyId = req.header('x-company-id') || 'demo-company';
            // Get all outstanding bills in the period
            const bills = await prisma.bill.findMany({
                where: {
                    tenantId,
                    companyId,
                    status: { in: ['posted', 'partially_paid'] },
                    billDate: {
                        gte: data.periodStart,
                        lte: data.periodEnd
                    }
                },
                include: {
                    vendor: true,
                    payments: true
                }
            });
            const reconciliation = await prisma.aPReconciliation.create({
                data: {
                    tenantId,
                    companyId,
                    reconciliationDate: new Date(),
                    periodStart: data.periodStart,
                    periodEnd: data.periodEnd,
                    status: 'draft',
                    totalOutstanding: bills.reduce((sum, bill) => sum + Number(bill.balanceDue), 0),
                    reconciledBy: data.reconciledBy,
                    notes: data.notes
                }
            });
            // Create reconciliation items
            const reconciliationItems = await Promise.all(bills.map(bill => prisma.aPReconciliationItem.create({
                data: {
                    tenantId,
                    companyId,
                    reconciliationId: reconciliation.id,
                    billId: bill.id,
                    expectedAmount: Number(bill.balanceDue),
                    status: 'pending'
                }
            })));
            res.status(201).json({
                success: true,
                data: {
                    reconciliation,
                    items: reconciliationItems
                }
            });
        }
        catch (error) {
            console.error('Error starting reconciliation:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start reconciliation',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * @route GET /api/accounts-payable/dashboard
     * @desc Get AP dashboard data
     * @access Private
     */
    router.get('/dashboard', requireRoles(['admin', 'accountant', 'manager']), async (req, res) => {
        try {
            const tenantId = req.tenantId;
            const companyId = req.header('x-company-id') || 'demo-company';
            const [totalInvoices, pendingInvoices, matchedInvoices, approvedInvoices, totalBills, outstandingBills, overdueBills, totalVendors] = await Promise.all([
                prisma.invoiceCapture.count({ where: { tenantId, companyId } }),
                prisma.invoiceCapture.count({ where: { tenantId, companyId, status: 'captured' } }),
                prisma.invoiceCapture.count({ where: { tenantId, companyId, status: 'matched' } }),
                prisma.invoiceCapture.count({ where: { tenantId, companyId, status: 'approved' } }),
                prisma.bill.count({ where: { tenantId, companyId } }),
                prisma.bill.count({ where: { tenantId, companyId, status: { in: ['posted', 'partially_paid'] } } }),
                prisma.bill.count({
                    where: {
                        tenantId,
                        companyId,
                        status: { in: ['posted', 'partially_paid'] },
                        dueDate: { lt: new Date() }
                    }
                }),
                prisma.vendor.count({ where: { tenantId, companyId } })
            ]);
            // Calculate total outstanding amount
            const outstandingBillsData = await prisma.bill.findMany({
                where: {
                    tenantId,
                    companyId,
                    status: { in: ['posted', 'partially_paid'] }
                },
                select: { balanceDue: true }
            });
            const totalOutstanding = outstandingBillsData.reduce((sum, bill) => sum + Number(bill.balanceDue), 0);
            res.json({
                success: true,
                data: {
                    summary: {
                        totalInvoices,
                        pendingInvoices,
                        matchedInvoices,
                        approvedInvoices,
                        totalBills,
                        outstandingBills,
                        overdueBills,
                        totalVendors,
                        totalOutstanding
                    }
                }
            });
        }
        catch (error) {
            console.error('Error fetching dashboard data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch dashboard data',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * @route POST /api/accounts-payable/payments/process
     * @desc Process a payment and mark related purchase orders as paid
     * @access Private
     */
    router.post('/payments/process', requireRoles(['admin', 'accountant']), async (req, res) => {
        try {
            const data = req.body;
            const tenantId = req.tenantId;
            const companyId = req.header('x-company-id') || 'demo-company';
            console.log('Payment processing request:', { data, tenantId, companyId });
            // Validate required fields
            if (!data.billId || !data.amount || !data.paymentMethod) {
                console.log('Validation failed:', {
                    billId: !!data.billId,
                    amount: !!data.amount,
                    paymentMethod: !!data.paymentMethod,
                    actualValues: { billId: data.billId, amount: data.amount, paymentMethod: data.paymentMethod }
                });
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: billId, amount, paymentMethod'
                });
            }
            // Validate amount is a valid number
            const amount = parseFloat(data.amount);
            if (isNaN(amount) || amount <= 0) {
                console.log('Invalid amount:', { amount: data.amount, parsed: amount });
                return res.status(400).json({
                    success: false,
                    error: 'Invalid amount: must be a positive number'
                });
            }
            // Find the bill
            const bill = await prisma.bill.findFirst({
                where: { id: data.billId, tenantId, companyId },
                include: {
                    vendor: true,
                    invoiceCapture: true
                }
            });
            if (!bill) {
                return res.status(404).json({
                    success: false,
                    error: 'Bill not found'
                });
            }
            // Check if bill is already paid
            if (bill.status === 'paid') {
                return res.status(400).json({
                    success: false,
                    error: 'Bill is already paid'
                });
            }
            // Calculate new balance
            const paymentAmount = amount; // Use the validated amount
            const currentBalance = Number(bill.balanceDue);
            const newBalance = currentBalance - paymentAmount;
            const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
            // Update bill status and balance
            const updatedBill = await prisma.bill.update({
                where: { id: bill.id },
                data: {
                    status: newStatus,
                    balanceDue: Math.max(0, newBalance)
                }
            });
            // Get accounts before transaction - use direct account lookup instead of getAccountByPurpose
            const apAccount = await prisma.account.findFirst({
                where: {
                    tenantId,
                    companyId,
                    name: 'Accounts Payable',
                    isActive: true
                }
            });
            if (!apAccount) {
                throw new Error('Accounts Payable account not found');
            }
            // Get Cash/Bank account based on payment method
            let cashAccount;
            switch (data.paymentMethod) {
                case 'bank_transfer':
                case 'check':
                    cashAccount = await prisma.account.findFirst({
                        where: { tenantId, companyId, name: 'Cash', isActive: true }
                    });
                    break;
                case 'credit_card':
                    cashAccount = await prisma.account.findFirst({
                        where: { tenantId, companyId, name: 'Credit Card Payable', isActive: true }
                    });
                    break;
                case 'cash':
                    cashAccount = await prisma.account.findFirst({
                        where: { tenantId, companyId, name: 'Cash', isActive: true }
                    });
                    break;
                default:
                    cashAccount = await prisma.account.findFirst({
                        where: { tenantId, companyId, name: 'Cash', isActive: true }
                    });
            }
            if (!cashAccount) {
                throw new Error(`${data.paymentMethod} account not found`);
            }
            // Create payment record
            const payment = await prisma.billPayment.create({
                data: {
                    tenantId,
                    billId: bill.id,
                    paymentDate: new Date(),
                    amount: paymentAmount,
                    paymentMethod: data.paymentMethod,
                    referenceNumber: `PAY-${Date.now()}`,
                    notes: data.notes || null
                }
            });
            // Process comprehensive post-payment workflow
            const workflowResult = await processPostPaymentWorkflow(tenantId, companyId, payment.id);
            console.log('📋 Post-payment workflow completed:', workflowResult);
            // Mark related purchase orders as paid if bill is fully paid
            let updatedPurchaseOrders = [];
            if (newStatus === 'paid' && bill.invoiceCapture?.rawData) {
                try {
                    const rawData = JSON.parse(bill.invoiceCapture.rawData);
                    if (rawData.purchaseOrderId) {
                        // Find and update the purchase order
                        const purchaseOrder = await prisma.purchaseOrder.findFirst({
                            where: { id: rawData.purchaseOrderId, tenantId, companyId }
                        });
                        if (purchaseOrder) {
                            const updatedPO = await prisma.purchaseOrder.update({
                                where: { id: purchaseOrder.id },
                                data: {
                                    status: 'closed',
                                    notes: `${purchaseOrder.notes || ''}\n\nMarked as paid via payment ${payment.referenceNumber}`.trim()
                                }
                            });
                            updatedPurchaseOrders.push(updatedPO);
                        }
                    }
                }
                catch (error) {
                    console.error('Error parsing invoice capture raw data:', error);
                }
            }
            // Log audit trail
            await addAudit({
                tenantId,
                companyId,
                action: `Payment processed for bill ${bill.billNumber} - Amount: $${paymentAmount}, Method: ${data.paymentMethod}, Payment Reference: ${payment.referenceNumber}, New status: ${newStatus}`
            });
            res.json({
                success: true,
                message: 'Payment processed successfully',
                data: {
                    payment,
                    workflowResult,
                    bill: updatedBill,
                    accountingEntries: {
                        accountsPayableAccount: apAccount.name,
                        cashAccount: cashAccount.name,
                        debitAmount: paymentAmount,
                        creditAmount: paymentAmount,
                        reference: payment.referenceNumber
                    }
                }
            });
        }
        catch (error) {
            console.error('Error processing payment:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process payment',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
