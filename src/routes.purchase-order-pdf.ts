import { Router } from 'express';
import { purchaseOrderPDFService } from './services/purchase-order-pdf.service.js';
import { validateRequest, commonSchemas } from './middleware/validation.middleware.js';
import { z } from 'zod';
import { asyncHandler } from './errors.js';
import { authMiddleware, requireRoles } from './auth.js';
import { TenantRequest } from './tenant.js';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { prisma } from './prisma.js';

const router = Router();

// Validation schemas
const pdfGenerationSchema = z.object({
  includeReceived: z.boolean().optional().default(false),
  generatedBy: z.string().optional()
});

const emailSchema = z.object({
  to: z.string().email('Invalid email address'),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().optional(),
  includeReceived: z.boolean().optional().default(false)
});

// Email configuration
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// GET /api/purchase-orders/:id/pdf - Generate PDF for purchase order
router.get('/:id/pdf', 
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'manager']),
  validateRequest({
    query: pdfGenerationSchema
  }),
  asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { includeReceived, generatedBy } = req.query as any;

    try {
      const pdfBuffer = await purchaseOrderPDFService.generatePurchaseOrderPDF(id, {
        includeReceived,
        generatedBy
      });

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PO-${id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      console.error('Error generating purchase order PDF:', error);
      res.status(500).json({
        success: false,
        error: 'PDF_GENERATION_FAILED',
        message: 'Failed to generate purchase order PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// GET /api/purchase-orders/:id/pdf/preview - Preview PDF in browser
router.get('/:id/pdf/preview', 
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'manager']),
  validateRequest({
    query: pdfGenerationSchema
  }),
  asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { includeReceived, generatedBy } = req.query as any;

    try {
      const pdfBuffer = await purchaseOrderPDFService.generatePurchaseOrderPDF(id, {
        includeReceived,
        generatedBy
      });

      // Set response headers for PDF preview
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="PO-preview.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      console.error('Error generating purchase order PDF preview:', error);
      res.status(500).json({
        success: false,
        error: 'PDF_PREVIEW_FAILED',
        message: 'Failed to generate purchase order PDF preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// POST /api/purchase-orders/:id/pdf/email - Email PDF to vendor
router.post('/:id/pdf/email',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'manager']),
  validateRequest({
    body: emailSchema
  }),
  asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { to, cc, bcc, subject, message, includeReceived } = req.body as any;

    try {
      // Generate PDF
      const pdfBuffer = await purchaseOrderPDFService.generatePurchaseOrderPDF(id, {
        includeReceived,
        generatedBy: req.user?.email || 'System'
      });

      // Get purchase order details for email content
      const { prisma } = await import('./prisma');
      const purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          vendor: true,
          company: true
        }
      });

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          error: 'PURCHASE_ORDER_NOT_FOUND',
          message: 'Purchase order not found'
        });
      }

      // Create email transporter
      const transporter = createEmailTransporter();

      // Prepare email content
      const defaultSubject = `Purchase Order ${purchaseOrder.poNumber} - ${purchaseOrder.company.name}`;
      const defaultMessage = `
Dear ${purchaseOrder.vendor.name},

Please find attached the purchase order ${purchaseOrder.poNumber} from ${purchaseOrder.company.name}.

Order Details:
- PO Number: ${purchaseOrder.poNumber}
- Order Date: ${purchaseOrder.orderDate.toLocaleDateString()}
- Expected Delivery: ${purchaseOrder.expectedDelivery ? purchaseOrder.expectedDelivery.toLocaleDateString() : 'Not specified'}
- Total Amount: $${purchaseOrder.totalAmount.toFixed(2)}

Please confirm receipt of this purchase order and provide an estimated delivery date.

If you have any questions, please contact us at ${purchaseOrder.company.email || purchaseOrder.company.phone}.

Best regards,
${purchaseOrder.company.name}
      `;

      // Send email
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: to,
        cc: cc || [],
        bcc: bcc || [],
        subject: subject || defaultSubject,
        text: message || defaultMessage,
        attachments: [
          {
            filename: `PO-${purchaseOrder.poNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      await transporter.sendMail(mailOptions);

      res.json({
        success: true,
        message: 'Purchase order PDF sent successfully',
        data: {
          purchaseOrderId: id,
          poNumber: purchaseOrder.poNumber,
          sentTo: to,
          sentAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error sending purchase order PDF email:', error);
      res.status(500).json({
        success: false,
        error: 'EMAIL_SEND_FAILED',
        message: 'Failed to send purchase order PDF email',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// POST /api/purchase-orders/:id/pdf/save - Save PDF to file system
router.post('/:id/pdf/save',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  validateRequest({
    body: z.object({
      filePath: z.string().optional(),
      includeReceived: z.boolean().optional().default(false),
      generatedBy: z.string().optional()
    })
  }),
  asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { filePath, includeReceived, generatedBy } = req.body as any;

    try {
      // Generate default file path if not provided
      const defaultPath = path.join(
        process.cwd(),
        'uploads',
        'purchase-orders',
        `PO-${id}-${Date.now()}.pdf`
      );

      const finalPath = filePath || defaultPath;

      // Ensure directory exists
      const dir = path.dirname(finalPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save PDF to file
      await purchaseOrderPDFService.savePDFToFile(id, finalPath, {
        includeReceived,
        generatedBy
      });

      res.json({
        success: true,
        message: 'Purchase order PDF saved successfully',
        data: {
          purchaseOrderId: id,
          filePath: finalPath,
          savedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error saving purchase order PDF:', error);
      res.status(500).json({
        success: false,
        error: 'PDF_SAVE_FAILED',
        message: 'Failed to save purchase order PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// GET /api/purchase-orders/:id/pdf/base64 - Get PDF as base64 string
router.get('/:id/pdf/base64',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant', 'manager']),
  validateRequest({
    query: pdfGenerationSchema
  }),
  asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { includeReceived, generatedBy } = req.query as any;

    try {
      const base64String = await purchaseOrderPDFService.getPDFAsBase64(id, {
        includeReceived,
        generatedBy
      });

      res.json({
        success: true,
        data: {
          purchaseOrderId: id,
          pdfBase64: base64String,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error generating purchase order PDF base64:', error);
      res.status(500).json({
        success: false,
        error: 'PDF_BASE64_FAILED',
        message: 'Failed to generate purchase order PDF base64',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// GET /api/purchase-orders/pdf/template - Get PDF template preview
router.get('/pdf/template',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res) => {
    try {
      // Create a sample purchase order for template preview
      const sampleData = {
        purchaseOrder: {
          id: 'sample',
          poNumber: 'PO-2024-SAMPLE',
          orderDate: new Date(),
          expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'draft',
          totalAmount: 1500.00,
          notes: 'This is a sample purchase order for template preview.',
          terms: 'Payment terms: Net 30 days',
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
          },
          lines: [
            {
              id: '1',
              quantity: 10,
              unitPrice: 50.00,
              taxRate: 8.5,
              lineTotal: 500.00,
              receivedQuantity: 0,
              notes: 'Sample product 1',
              product: {
                name: 'Sample Product 1',
                sku: 'SAMPLE-001',
                description: 'This is a sample product for template preview'
              }
            },
            {
              id: '2',
              quantity: 5,
              unitPrice: 100.00,
              taxRate: 8.5,
              lineTotal: 500.00,
              receivedQuantity: 0,
              notes: 'Sample product 2',
              product: {
                name: 'Sample Product 2',
                sku: 'SAMPLE-002',
                description: 'Another sample product for template preview'
              }
            },
            {
              id: '3',
              quantity: 2,
              unitPrice: 250.00,
              taxRate: 8.5,
              lineTotal: 500.00,
              receivedQuantity: 0,
              notes: 'Sample product 3',
              product: {
                name: 'Sample Product 3',
                sku: 'SAMPLE-003',
                description: 'Third sample product for template preview'
              }
            }
          ]
        },
        generatedAt: new Date(),
        generatedBy: 'System Template'
      };

      const htmlContent = purchaseOrderPDFService['generateHTML'](sampleData, { includeReceived: true });
      const pdfBuffer = await purchaseOrderPDFService['generatePDF'](htmlContent);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="PO-template.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

    } catch (error) {
      console.error('Error generating template PDF:', error);
      res.status(500).json({
        success: false,
        error: 'TEMPLATE_PDF_FAILED',
        message: 'Failed to generate template PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

export default router;
