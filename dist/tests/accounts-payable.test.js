import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '../prisma';
import { mountAccountsPayableRoutes } from '../routes.accounts-payable';
// Mock Prisma
vi.mock('../prisma', () => ({
    prisma: {
        invoiceCapture: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            count: vi.fn()
        },
        invoiceMatching: {
            create: vi.fn(),
            findFirst: vi.fn()
        },
        invoiceApproval: {
            create: vi.fn()
        },
        bill: {
            findFirst: vi.fn(),
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn()
        },
        purchaseOrder: {
            findFirst: vi.fn()
        },
        goodsReceivedNote: {
            findFirst: vi.fn()
        },
        paymentSchedule: {
            create: vi.fn()
        },
        aPReconciliation: {
            create: vi.fn()
        },
        aPReconciliationItem: {
            create: vi.fn()
        },
        vendor: {
            findFirst: vi.fn()
        }
    }
}));
// Mock middleware
vi.mock('../middleware', () => ({
    requireRoles: vi.fn(() => (req, res, next) => next()),
    validateRequestMiddleware: vi.fn(() => (req, res, next) => next())
}));
// Mock AI and webhook functions
vi.mock('../ai', () => ({
    addAudit: vi.fn()
}));
vi.mock('../webhooks', () => ({
    enqueueWebhooks: vi.fn()
}));
describe('Accounts Payable Routes', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    beforeEach(() => {
        mockReq = {
            tenantId: 'test-tenant',
            header: vi.fn().mockReturnValue('test-company'),
            query: {},
            body: {}
        };
        mockRes = {
            json: vi.fn(),
            status: vi.fn().mockReturnThis()
        };
        mockNext = vi.fn();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('GET /invoices', () => {
        it('should fetch invoices successfully', async () => {
            const mockInvoices = [
                {
                    id: '1',
                    invoiceNumber: 'INV-001',
                    vendor: { name: 'Test Vendor' },
                    totalAmount: 1000,
                    status: 'captured'
                }
            ];
            prisma.invoiceCapture.findMany.mockResolvedValue(mockInvoices);
            prisma.invoiceCapture.count.mockResolvedValue(1);
            const router = { get: vi.fn() };
            mountAccountsPayableRoutes(router);
            // Simulate the route handler
            const routeHandler = router.get.mock.calls[0][1];
            await routeHandler(mockReq, mockRes);
            expect(prisma.invoiceCapture.findMany).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    invoices: mockInvoices,
                    pagination: expect.any(Object)
                }
            });
        });
        it('should handle errors when fetching invoices', async () => {
            prisma.invoiceCapture.findMany.mockRejectedValue(new Error('Database error'));
            const router = { get: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.get.mock.calls[0][1];
            await routeHandler(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to fetch invoices',
                message: 'Database error'
            });
        });
    });
    describe('POST /invoices', () => {
        it('should capture invoice successfully', async () => {
            const invoiceData = {
                vendorId: 'vendor-1',
                invoiceNumber: 'INV-001',
                invoiceDate: '2024-01-01',
                totalAmount: 1000,
                subtotal: 900,
                taxAmount: 100,
                currency: 'USD',
                source: 'manual'
            };
            mockReq.body = invoiceData;
            prisma.invoiceCapture.findFirst.mockResolvedValue(null);
            prisma.invoiceCapture.create.mockResolvedValue({
                id: '1',
                ...invoiceData,
                vendor: { name: 'Test Vendor' }
            });
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[0][2];
            await routeHandler(mockReq, mockRes);
            expect(prisma.invoiceCapture.create).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.any(Object)
            });
        });
        it('should return error if invoice number already exists', async () => {
            const invoiceData = {
                vendorId: 'vendor-1',
                invoiceNumber: 'INV-001',
                invoiceDate: '2024-01-01',
                totalAmount: 1000,
                subtotal: 900,
                taxAmount: 100,
                currency: 'USD',
                source: 'manual'
            };
            mockReq.body = invoiceData;
            prisma.invoiceCapture.findFirst.mockResolvedValue({ id: '1' });
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[0][2];
            await routeHandler(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invoice number already exists'
            });
        });
    });
    describe('POST /invoices/:id/match', () => {
        it('should match invoice successfully', async () => {
            const invoiceId = 'invoice-1';
            const matchingData = {
                purchaseOrderId: 'po-1',
                matchingType: 'two_way'
            };
            mockReq.params = { id: invoiceId };
            mockReq.body = matchingData;
            prisma.invoiceCapture.findFirst.mockResolvedValue({
                id: invoiceId,
                totalAmount: 1000
            });
            prisma.purchaseOrder.findFirst.mockResolvedValue({
                id: 'po-1',
                totalAmount: 1000
            });
            prisma.invoiceMatching.create.mockResolvedValue({
                id: '1',
                status: 'matched'
            });
            prisma.invoiceCapture.update.mockResolvedValue({});
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[1][2];
            await routeHandler(mockReq, mockRes);
            expect(prisma.invoiceMatching.create).toHaveBeenCalled();
            expect(prisma.invoiceCapture.update).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.any(Object)
            });
        });
        it('should return error if invoice not found', async () => {
            const invoiceId = 'invoice-1';
            const matchingData = {
                purchaseOrderId: 'po-1',
                matchingType: 'two_way'
            };
            mockReq.params = { id: invoiceId };
            mockReq.body = matchingData;
            prisma.invoiceCapture.findFirst.mockResolvedValue(null);
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[1][2];
            await routeHandler(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Invoice not found'
            });
        });
    });
    describe('POST /invoices/:id/approve', () => {
        it('should approve invoice successfully', async () => {
            const invoiceId = 'invoice-1';
            const approvalData = {
                approverId: 'approver-1',
                approvalLevel: 1,
                status: 'approved',
                comments: 'Approved'
            };
            mockReq.params = { id: invoiceId };
            mockReq.body = approvalData;
            prisma.invoiceCapture.findFirst.mockResolvedValue({
                id: invoiceId,
                vendorId: 'vendor-1',
                invoiceNumber: 'INV-001',
                invoiceDate: new Date(),
                dueDate: new Date(),
                totalAmount: 1000,
                subtotal: 900,
                taxAmount: 100
            });
            prisma.invoiceApproval.create.mockResolvedValue({
                id: '1',
                status: 'approved'
            });
            prisma.invoiceCapture.update.mockResolvedValue({});
            prisma.bill.create.mockResolvedValue({
                id: 'bill-1',
                billNumber: 'BILL-INV-001'
            });
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[2][2];
            await routeHandler(mockReq, mockRes);
            expect(prisma.invoiceApproval.create).toHaveBeenCalled();
            expect(prisma.bill.create).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.any(Object)
            });
        });
    });
    describe('POST /payment-schedule', () => {
        it('should schedule payment successfully', async () => {
            const paymentData = {
                billId: 'bill-1',
                scheduledDate: '2024-01-15',
                amount: 1000,
                paymentMethod: 'bank_transfer',
                priority: 'normal'
            };
            mockReq.body = paymentData;
            prisma.bill.findFirst.mockResolvedValue({
                id: 'bill-1',
                vendor: { name: 'Test Vendor' }
            });
            prisma.paymentSchedule.create.mockResolvedValue({
                id: '1',
                ...paymentData
            });
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[3][2];
            await routeHandler(mockReq, mockRes);
            expect(prisma.paymentSchedule.create).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.any(Object)
            });
        });
        it('should return error if bill not found', async () => {
            const paymentData = {
                billId: 'bill-1',
                scheduledDate: '2024-01-15',
                amount: 1000,
                paymentMethod: 'bank_transfer',
                priority: 'normal'
            };
            mockReq.body = paymentData;
            prisma.bill.findFirst.mockResolvedValue(null);
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[3][2];
            await routeHandler(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Bill not found'
            });
        });
    });
    describe('GET /aging-report', () => {
        it('should generate aging report successfully', async () => {
            const mockBills = [
                {
                    id: '1',
                    billNumber: 'BILL-001',
                    vendor: { name: 'Vendor 1' },
                    dueDate: new Date('2024-01-01'),
                    balanceDue: 1000,
                    payments: []
                },
                {
                    id: '2',
                    billNumber: 'BILL-002',
                    vendor: { name: 'Vendor 2' },
                    dueDate: new Date('2023-12-01'),
                    balanceDue: 2000,
                    payments: []
                }
            ];
            prisma.bill.findMany.mockResolvedValue(mockBills);
            const router = { get: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.get.mock.calls[4][1];
            await routeHandler(mockReq, mockRes);
            expect(prisma.bill.findMany).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    agingReport: expect.any(Array),
                    agingSummary: expect.any(Object),
                    totalOutstanding: expect.any(Number)
                }
            });
        });
    });
    describe('GET /dashboard', () => {
        it('should fetch dashboard data successfully', async () => {
            const mockCounts = {
                totalInvoices: 10,
                pendingInvoices: 2,
                matchedInvoices: 3,
                approvedInvoices: 4,
                totalBills: 8,
                outstandingBills: 5,
                overdueBills: 1,
                totalVendors: 15
            };
            prisma.invoiceCapture.count.mockResolvedValue(mockCounts.totalInvoices);
            prisma.bill.count.mockResolvedValue(mockCounts.totalBills);
            prisma.vendor.count.mockResolvedValue(mockCounts.totalVendors);
            prisma.bill.findMany.mockResolvedValue([
                { balanceDue: 1000 },
                { balanceDue: 2000 }
            ]);
            const router = { get: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.get.mock.calls[5][1];
            await routeHandler(mockReq, mockRes);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    summary: expect.objectContaining({
                        totalInvoices: expect.any(Number),
                        totalOutstanding: expect.any(Number)
                    })
                }
            });
        });
    });
    describe('POST /reconcile', () => {
        it('should start reconciliation process successfully', async () => {
            const reconciliationData = {
                periodStart: '2024-01-01',
                periodEnd: '2024-01-31',
                reconciledBy: 'user-1',
                notes: 'Monthly reconciliation'
            };
            mockReq.body = reconciliationData;
            const mockBills = [
                { id: 'bill-1', balanceDue: 1000 },
                { id: 'bill-2', balanceDue: 2000 }
            ];
            prisma.bill.findMany.mockResolvedValue(mockBills);
            prisma.aPReconciliation.create.mockResolvedValue({
                id: '1',
                ...reconciliationData
            });
            prisma.aPReconciliationItem.create.mockResolvedValue({});
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[4][2];
            await routeHandler(mockReq, mockRes);
            expect(prisma.aPReconciliation.create).toHaveBeenCalled();
            expect(prisma.aPReconciliationItem.create).toHaveBeenCalledTimes(2);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.any(Object)
            });
        });
    });
    describe('Invoice Matching Logic', () => {
        it('should calculate match score correctly for two-way matching', async () => {
            const invoiceId = 'invoice-1';
            const matchingData = {
                purchaseOrderId: 'po-1',
                matchingType: 'two_way'
            };
            mockReq.params = { id: invoiceId };
            mockReq.body = matchingData;
            prisma.invoiceCapture.findFirst.mockResolvedValue({
                id: invoiceId,
                totalAmount: 1000
            });
            prisma.purchaseOrder.findFirst.mockResolvedValue({
                id: 'po-1',
                totalAmount: 1000,
                lines: []
            });
            prisma.invoiceMatching.create.mockResolvedValue({
                id: '1',
                status: 'matched',
                matchScore: 100
            });
            prisma.invoiceCapture.update.mockResolvedValue({});
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[1][2];
            await routeHandler(mockReq, mockRes);
            expect(prisma.invoiceMatching.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    status: 'matched',
                    matchScore: 100
                })
            }));
        });
        it('should handle partial matching when amounts differ', async () => {
            const invoiceId = 'invoice-1';
            const matchingData = {
                purchaseOrderId: 'po-1',
                matchingType: 'two_way'
            };
            mockReq.params = { id: invoiceId };
            mockReq.body = matchingData;
            prisma.invoiceCapture.findFirst.mockResolvedValue({
                id: invoiceId,
                totalAmount: 1000
            });
            prisma.purchaseOrder.findFirst.mockResolvedValue({
                id: 'po-1',
                totalAmount: 800,
                lines: []
            });
            prisma.invoiceMatching.create.mockResolvedValue({
                id: '1',
                status: 'partial',
                matchScore: 80
            });
            prisma.invoiceCapture.update.mockResolvedValue({});
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[1][2];
            await routeHandler(mockReq, mockRes);
            expect(prisma.invoiceMatching.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    status: 'partial',
                    matchScore: 80
                })
            }));
        });
    });
    describe('Error Handling', () => {
        it('should handle database connection errors gracefully', async () => {
            prisma.invoiceCapture.findMany.mockRejectedValue(new Error('Connection failed'));
            const router = { get: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.get.mock.calls[0][1];
            await routeHandler(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to fetch invoices',
                message: 'Connection failed'
            });
        });
        it('should handle validation errors in invoice capture', async () => {
            const invalidData = {
                vendorId: '',
                invoiceNumber: '',
                totalAmount: -100
            };
            mockReq.body = invalidData;
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            // This would be handled by validation middleware in real implementation
            // For testing, we simulate the validation error
            const routeHandler = router.post.mock.calls[0][2];
            // Mock the validation to pass but simulate a business logic error
            prisma.invoiceCapture.findFirst.mockResolvedValue(null);
            prisma.invoiceCapture.create.mockRejectedValue(new Error('Validation failed'));
            await routeHandler(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to capture invoice',
                message: 'Validation failed'
            });
        });
    });
    describe('Business Logic', () => {
        it('should create bill when invoice is approved', async () => {
            const invoiceId = 'invoice-1';
            const approvalData = {
                approverId: 'approver-1',
                approvalLevel: 1,
                status: 'approved',
                comments: 'Approved'
            };
            mockReq.params = { id: invoiceId };
            mockReq.body = approvalData;
            const mockInvoice = {
                id: invoiceId,
                vendorId: 'vendor-1',
                invoiceNumber: 'INV-001',
                invoiceDate: new Date('2024-01-01'),
                dueDate: new Date('2024-01-31'),
                totalAmount: 1000,
                subtotal: 900,
                taxAmount: 100
            };
            prisma.invoiceCapture.findFirst.mockResolvedValue(mockInvoice);
            prisma.invoiceApproval.create.mockResolvedValue({
                id: '1',
                status: 'approved'
            });
            prisma.invoiceCapture.update.mockResolvedValue({});
            prisma.bill.create.mockResolvedValue({
                id: 'bill-1',
                billNumber: 'BILL-INV-001'
            });
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[2][2];
            await routeHandler(mockReq, mockRes);
            expect(prisma.bill.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    vendorId: mockInvoice.vendorId,
                    billNumber: `BILL-${mockInvoice.invoiceNumber}`,
                    totalAmount: mockInvoice.totalAmount,
                    invoiceCaptureId: mockInvoice.id
                })
            });
        });
        it('should not create bill when invoice is rejected', async () => {
            const invoiceId = 'invoice-1';
            const approvalData = {
                approverId: 'approver-1',
                approvalLevel: 1,
                status: 'rejected',
                comments: 'Rejected due to discrepancies'
            };
            mockReq.params = { id: invoiceId };
            mockReq.body = approvalData;
            prisma.invoiceCapture.findFirst.mockResolvedValue({
                id: invoiceId,
                vendorId: 'vendor-1'
            });
            prisma.invoiceApproval.create.mockResolvedValue({
                id: '1',
                status: 'rejected'
            });
            prisma.invoiceCapture.update.mockResolvedValue({});
            const router = { post: vi.fn() };
            mountAccountsPayableRoutes(router);
            const routeHandler = router.post.mock.calls[2][2];
            await routeHandler(mockReq, mockRes);
            expect(prisma.bill.create).not.toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: expect.any(Object)
            });
        });
    });
});
