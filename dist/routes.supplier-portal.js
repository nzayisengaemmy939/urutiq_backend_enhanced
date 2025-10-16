import { prisma } from './prisma.js';
import { requireRoles } from './auth.js';
export function mountSupplierPortalRoutes(router) {
    // Get supplier profile
    router.get('/profile/:supplierId', requireRoles(['admin', 'accountant', 'supplier']), async (req, res) => {
        const { supplierId } = req.params;
        try {
            const supplier = await prisma.vendor.findFirst({
                where: {
                    id: supplierId,
                    tenantId: req.tenantId
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true,
                    city: true,
                    state: true,
                    postalCode: true,
                    country: true,
                    taxId: true,
                    website: true,
                    contactPerson: true,
                    paymentTerms: true,
                    currency: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            if (!supplier) {
                return res.status(404).json({ error: 'not_found', message: 'Supplier not found' });
            }
            res.json(supplier);
        }
        catch (error) {
            console.error('Error fetching supplier profile:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch supplier profile' });
        }
    });
    // Update supplier profile
    router.put('/profile/:supplierId', requireRoles(['admin', 'accountant', 'supplier']), async (req, res) => {
        const { supplierId } = req.params;
        const updateData = req.body;
        try {
            const supplier = await prisma.vendor.findFirst({
                where: {
                    id: supplierId,
                    tenantId: req.tenantId
                }
            });
            if (!supplier) {
                return res.status(404).json({ error: 'not_found', message: 'Supplier not found' });
            }
            const updatedSupplier = await prisma.vendor.update({
                where: { id: supplierId },
                data: {
                    name: updateData.name,
                    email: updateData.email,
                    phone: updateData.phone,
                    address: updateData.address,
                    city: updateData.city,
                    state: updateData.state,
                    postalCode: updateData.postalCode,
                    country: updateData.country,
                    taxId: updateData.taxId,
                    website: updateData.website,
                    contactPerson: updateData.contactPerson,
                    paymentTerms: updateData.paymentTerms,
                    currency: updateData.currency,
                    updatedAt: new Date()
                }
            });
            res.json(updatedSupplier);
        }
        catch (error) {
            console.error('Error updating supplier profile:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to update supplier profile' });
        }
    });
    // Get supplier statistics
    router.get('/stats/:supplierId', requireRoles(['admin', 'accountant', 'supplier']), async (req, res) => {
        const { supplierId } = req.params;
        try {
            const supplier = await prisma.vendor.findFirst({
                where: {
                    id: supplierId,
                    tenantId: req.tenantId
                }
            });
            if (!supplier) {
                return res.status(404).json({ error: 'not_found', message: 'Supplier not found' });
            }
            // Get invoice statistics
            const invoices = await prisma.bill.findMany({
                where: {
                    vendorId: supplierId,
                    tenantId: req.tenantId
                },
                select: {
                    id: true,
                    totalAmount: true,
                    status: true,
                    dueDate: true,
                    createdAt: true
                }
            });
            // Get payment statistics
            const payments = await prisma.billPayment.findMany({
                where: {
                    bill: { vendorId: supplierId },
                    tenantId: req.tenantId
                },
                select: {
                    id: true,
                    amount: true,
                    paymentDate: true,
                    status: true
                }
            });
            // Calculate statistics
            const totalInvoices = invoices.length;
            const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
            const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
            const overdueInvoices = invoices.filter(inv => inv.status === 'pending' && new Date(inv.dueDate) < new Date()).length;
            const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
            const paidAmount = invoices
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
            const pendingAmount = invoices
                .filter(inv => inv.status === 'pending')
                .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
            const overdueAmount = invoices
                .filter(inv => inv.status === 'pending' && new Date(inv.dueDate) < new Date())
                .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
            // Calculate average payment days
            const paidBills = invoices.filter(inv => inv.status === 'paid');
            const averagePaymentDays = paidBills.length > 0
                ? paidBills.reduce((sum, bill) => {
                    const payment = payments.find(p => p.bill?.id === bill.id);
                    if (payment) {
                        const daysDiff = Math.ceil((new Date(payment.paymentDate).getTime() - new Date(bill.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                        return sum + daysDiff;
                    }
                    return sum;
                }, 0) / paidBills.length
                : 0;
            // Get last and next payment dates
            const lastPayment = payments
                .filter(p => p.status === 'completed')
                .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];
            const nextPayment = invoices
                .filter(inv => inv.status === 'pending')
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
            const stats = {
                totalInvoices,
                paidInvoices,
                pendingInvoices,
                overdueInvoices,
                totalAmount,
                paidAmount,
                pendingAmount,
                overdueAmount,
                averagePaymentDays: Math.round(averagePaymentDays),
                lastPaymentDate: lastPayment?.paymentDate || null,
                nextPaymentDate: nextPayment?.dueDate || null
            };
            res.json(stats);
        }
        catch (error) {
            console.error('Error fetching supplier stats:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch supplier statistics' });
        }
    });
    // Get supplier invoices
    router.get('/invoices/:supplierId', requireRoles(['admin', 'accountant', 'supplier']), async (req, res) => {
        const { supplierId } = req.params;
        const { status, dateFrom, dateTo, page = 1, pageSize = 20 } = req.query;
        try {
            const supplier = await prisma.vendor.findFirst({
                where: {
                    id: supplierId,
                    tenantId: req.tenantId
                }
            });
            if (!supplier) {
                return res.status(404).json({ error: 'not_found', message: 'Supplier not found' });
            }
            const whereClause = {
                vendorId: supplierId,
                tenantId: req.tenantId
            };
            if (status && status !== 'all') {
                whereClause.status = status;
            }
            if (dateFrom || dateTo) {
                whereClause.createdAt = {};
                if (dateFrom)
                    whereClause.createdAt.gte = new Date(dateFrom);
                if (dateTo)
                    whereClause.createdAt.lte = new Date(dateTo);
            }
            const skip = (Number(page) - 1) * Number(pageSize);
            const take = Number(pageSize);
            const [invoices, totalCount] = await Promise.all([
                prisma.bill.findMany({
                    where: whereClause,
                    include: {
                        company: {
                            select: { name: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take
                }),
                prisma.bill.count({ where: whereClause })
            ]);
            const formattedInvoices = invoices.map(invoice => ({
                id: invoice.id,
                invoiceNumber: invoice.billNumber,
                invoiceDate: invoice.billDate,
                dueDate: invoice.dueDate,
                amount: Number(invoice.totalAmount),
                status: invoice.status,
                description: invoice.description,
                companyName: invoice.company?.name || 'Unknown Company',
                paymentTerms: supplier.paymentTerms || 'Net 30',
                createdAt: invoice.createdAt,
                updatedAt: invoice.updatedAt
            }));
            res.json({
                invoices: formattedInvoices,
                pagination: {
                    page: Number(page),
                    pageSize: Number(pageSize),
                    totalCount,
                    totalPages: Math.ceil(totalCount / Number(pageSize))
                }
            });
        }
        catch (error) {
            console.error('Error fetching supplier invoices:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch supplier invoices' });
        }
    });
    // Get supplier payments
    router.get('/payments/:supplierId', requireRoles(['admin', 'accountant', 'supplier']), async (req, res) => {
        const { supplierId } = req.params;
        const { status, dateFrom, dateTo, page = 1, pageSize = 20 } = req.query;
        try {
            const supplier = await prisma.vendor.findFirst({
                where: {
                    id: supplierId,
                    tenantId: req.tenantId
                }
            });
            if (!supplier) {
                return res.status(404).json({ error: 'not_found', message: 'Supplier not found' });
            }
            const whereClause = {
                bill: { vendorId: supplierId },
                tenantId: req.tenantId
            };
            if (status && status !== 'all') {
                whereClause.status = status;
            }
            if (dateFrom || dateTo) {
                whereClause.paymentDate = {};
                if (dateFrom)
                    whereClause.paymentDate.gte = new Date(dateFrom);
                if (dateTo)
                    whereClause.paymentDate.lte = new Date(dateTo);
            }
            const skip = (Number(page) - 1) * Number(pageSize);
            const take = Number(pageSize);
            const [payments, totalCount] = await Promise.all([
                prisma.billPayment.findMany({
                    where: whereClause,
                    include: {
                        bill: {
                            select: { billNumber: true }
                        }
                    },
                    orderBy: { paymentDate: 'desc' },
                    skip,
                    take
                }),
                prisma.billPayment.count({ where: whereClause })
            ]);
            const formattedPayments = payments.map(payment => ({
                id: payment.id,
                paymentNumber: payment.paymentNumber,
                paymentDate: payment.paymentDate,
                amount: Number(payment.amount),
                method: payment.paymentMethod,
                status: payment.status,
                invoiceId: payment.billId,
                invoiceNumber: payment.bill?.billNumber || 'N/A',
                reference: payment.reference || '',
                notes: payment.notes || ''
            }));
            res.json({
                payments: formattedPayments,
                pagination: {
                    page: Number(page),
                    pageSize: Number(pageSize),
                    totalCount,
                    totalPages: Math.ceil(totalCount / Number(pageSize))
                }
            });
        }
        catch (error) {
            console.error('Error fetching supplier payments:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch supplier payments' });
        }
    });
    // Download invoice PDF
    router.get('/invoices/:supplierId/:invoiceId/pdf', requireRoles(['admin', 'accountant', 'supplier']), async (req, res) => {
        const { supplierId, invoiceId } = req.params;
        try {
            const invoice = await prisma.bill.findFirst({
                where: {
                    id: invoiceId,
                    vendorId: supplierId,
                    tenantId: req.tenantId
                },
                include: {
                    vendor: true,
                    company: true,
                    lines: {
                        include: {
                            product: true
                        }
                    }
                }
            });
            if (!invoice) {
                return res.status(404).json({ error: 'not_found', message: 'Invoice not found' });
            }
            // For now, return a simple PDF response
            // In a real implementation, you would generate a proper PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.billNumber}.pdf"`);
            // Mock PDF content - replace with actual PDF generation
            const mockPdfContent = Buffer.from('Mock PDF content for invoice ' + invoice.billNumber);
            res.send(mockPdfContent);
        }
        catch (error) {
            console.error('Error generating invoice PDF:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to generate invoice PDF' });
        }
    });
    // Get invoice details
    router.get('/invoices/:supplierId/:invoiceId', requireRoles(['admin', 'accountant', 'supplier']), async (req, res) => {
        const { supplierId, invoiceId } = req.params;
        try {
            const invoice = await prisma.bill.findFirst({
                where: {
                    id: invoiceId,
                    vendorId: supplierId,
                    tenantId: req.tenantId
                },
                include: {
                    vendor: true,
                    company: true,
                    lines: {
                        include: {
                            product: true
                        }
                    }
                }
            });
            if (!invoice) {
                return res.status(404).json({ error: 'not_found', message: 'Invoice not found' });
            }
            res.json(invoice);
        }
        catch (error) {
            console.error('Error fetching invoice details:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch invoice details' });
        }
    });
    // Get payment details
    router.get('/payments/:supplierId/:paymentId', requireRoles(['admin', 'accountant', 'supplier']), async (req, res) => {
        const { supplierId, paymentId } = req.params;
        try {
            const payment = await prisma.billPayment.findFirst({
                where: {
                    id: paymentId,
                    bill: { vendorId: supplierId },
                    tenantId: req.tenantId
                },
                include: {
                    bill: {
                        include: {
                            vendor: true,
                            company: true
                        }
                    },
                    bankAccount: true
                }
            });
            if (!payment) {
                return res.status(404).json({ error: 'not_found', message: 'Payment not found' });
            }
            res.json(payment);
        }
        catch (error) {
            console.error('Error fetching payment details:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch payment details' });
        }
    });
    // Update supplier settings
    router.put('/settings/:supplierId', requireRoles(['admin', 'accountant', 'supplier']), async (req, res) => {
        const { supplierId } = req.params;
        const settings = req.body;
        try {
            const supplier = await prisma.vendor.findFirst({
                where: {
                    id: supplierId,
                    tenantId: req.tenantId
                }
            });
            if (!supplier) {
                return res.status(404).json({ error: 'not_found', message: 'Supplier not found' });
            }
            // Update supplier with settings
            const updatedSupplier = await prisma.vendor.update({
                where: { id: supplierId },
                data: {
                    ...settings,
                    updatedAt: new Date()
                }
            });
            res.json(updatedSupplier);
        }
        catch (error) {
            console.error('Error updating supplier settings:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to update supplier settings' });
        }
    });
    // Get supplier notifications
    router.get('/notifications/:supplierId', requireRoles(['admin', 'accountant', 'supplier']), async (req, res) => {
        const { supplierId } = req.params;
        try {
            // For now, return empty notifications
            // In a real implementation, you would have a notifications table
            res.json({ notifications: [] });
        }
        catch (error) {
            console.error('Error fetching supplier notifications:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch supplier notifications' });
        }
    });
    // Mark notification as read
    router.put('/notifications/:supplierId/:notificationId/read', requireRoles(['admin', 'accountant', 'supplier']), async (req, res) => {
        const { supplierId, notificationId } = req.params;
        try {
            // For now, return success
            // In a real implementation, you would update the notification status
            res.json({ success: true, message: 'Notification marked as read' });
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to mark notification as read' });
        }
    });
}
