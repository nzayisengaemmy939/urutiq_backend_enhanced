import { Router } from 'express';
import { goodReceiptPDFService } from './services/good-receipt-pdf.service.js';
import { validateRequest } from './middleware/validation.middleware.js';
import { z } from 'zod';
import { asyncHandler } from './errors.js';
import { authMiddleware, requireRoles } from './auth.js';
const router = Router();
// Validation schemas
const pdfGenerationSchema = z.object({
    generatedBy: z.string().optional()
});
// GET /api/good-receipts/:id/pdf - Generate PDF for good receipt
router.get('/:id/pdf', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant', 'manager']), validateRequest({
    query: pdfGenerationSchema
}), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { generatedBy } = req.query;
    try {
        const pdfBuffer = await goodReceiptPDFService.generateGoodReceiptPDF(id, {
            generatedBy
        });
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="GoodReceipt-${id}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error generating good receipt PDF:', error);
        res.status(500).json({
            success: false,
            error: 'PDF_GENERATION_FAILED',
            message: 'Failed to generate good receipt PDF',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// GET /api/good-receipts/:id/pdf/preview - Preview PDF in browser
router.get('/:id/pdf/preview', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant', 'manager']), validateRequest({
    query: pdfGenerationSchema
}), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { generatedBy } = req.query;
    try {
        const pdfBuffer = await goodReceiptPDFService.generateGoodReceiptPDF(id, {
            generatedBy
        });
        // Set response headers for PDF preview
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="GoodReceipt-preview.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error generating good receipt PDF preview:', error);
        res.status(500).json({
            success: false,
            error: 'PDF_PREVIEW_FAILED',
            message: 'Failed to generate good receipt PDF preview',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// GET /api/purchase-orders/:id/good-receipt/pdf - Generate PDF for purchase order receipt
router.get('/purchase-orders/:id/good-receipt/pdf', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant', 'manager']), validateRequest({
    query: pdfGenerationSchema
}), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { generatedBy } = req.query;
    try {
        const pdfBuffer = await goodReceiptPDFService.generatePurchaseOrderReceiptPDF(id, {
            generatedBy
        });
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="GoodReceipt-PO-${id}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error generating purchase order receipt PDF:', error);
        res.status(500).json({
            success: false,
            error: 'PDF_GENERATION_FAILED',
            message: 'Failed to generate purchase order receipt PDF',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// GET /api/purchase-orders/:id/good-receipt/pdf/preview - Preview purchase order receipt PDF
router.get('/purchase-orders/:id/good-receipt/pdf/preview', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant', 'manager']), validateRequest({
    query: pdfGenerationSchema
}), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { generatedBy } = req.query;
    try {
        const pdfBuffer = await goodReceiptPDFService.generatePurchaseOrderReceiptPDF(id, {
            generatedBy
        });
        // Set response headers for PDF preview
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="GoodReceipt-preview.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error generating purchase order receipt PDF preview:', error);
        res.status(500).json({
            success: false,
            error: 'PDF_PREVIEW_FAILED',
            message: 'Failed to generate purchase order receipt PDF preview',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// GET /api/good-receipts/pdf/template - Get PDF template preview
router.get('/pdf/template', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    try {
        // Create a sample good receipt for template preview
        const sampleData = {
            receipt: {
                id: 'sample',
                receiptNumber: 'RCV-2024-SAMPLE',
                receivedDate: new Date(),
                receivedBy: 'John Doe',
                notes: 'This is a sample good receipt for template preview.',
                purchaseOrder: {
                    id: 'sample-po',
                    poNumber: 'PO-2024-SAMPLE',
                    orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    expectedDelivery: new Date(),
                    vendor: {
                        name: 'Sample Vendor Inc.',
                        email: 'vendor@sample.com',
                        phone: '+1-555-0123',
                        address: '123 Vendor Street',
                        city: 'Vendor City',
                        state: 'VC',
                        zipCode: '12345',
                        country: 'United States',
                        taxId: '12-3456789'
                    },
                    company: {
                        name: 'Your Company Name',
                        legalName: 'Your Company Name LLC',
                        address: '456 Company Avenue',
                        city: 'Company City',
                        state: 'CC',
                        zipCode: '67890',
                        country: 'United States',
                        phone: '+1-555-0456',
                        email: 'orders@yourcompany.com',
                        website: 'www.yourcompany.com',
                        taxId: '98-7654321'
                    }
                },
                items: [
                    {
                        id: '1',
                        productId: 'prod-1',
                        description: 'Sample Product 1',
                        quantityReceived: 10,
                        quantityAccepted: 10,
                        quantityRejected: 0,
                        rejectionReason: undefined,
                        unitPrice: 50.00,
                        lineTotal: 500.00,
                        product: {
                            name: 'Sample Product 1',
                            sku: 'SAMPLE-001',
                            description: 'This is a sample product for template preview'
                        }
                    },
                    {
                        id: '2',
                        productId: 'prod-2',
                        description: 'Sample Product 2',
                        quantityReceived: 5,
                        quantityAccepted: 4,
                        quantityRejected: 1,
                        rejectionReason: 'Damaged packaging',
                        unitPrice: 100.00,
                        lineTotal: 400.00,
                        product: {
                            name: 'Sample Product 2',
                            sku: 'SAMPLE-002',
                            description: 'Another sample product for template preview'
                        }
                    }
                ]
            },
            generatedAt: new Date(),
            generatedBy: 'System Template'
        };
        const htmlContent = goodReceiptPDFService['generateHTML'](sampleData, {});
        const pdfBuffer = await goodReceiptPDFService['generatePDF'](htmlContent);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="GoodReceipt-template.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error generating template PDF:', error);
        res.status(500).json({
            success: false,
            error: 'TEMPLATE_PDF_FAILED',
            message: 'Failed to generate template PDF',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
export default router;
