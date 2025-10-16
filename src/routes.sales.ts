import type { Router } from 'express';
import { prisma } from './prisma';
import { TenantRequest } from './tenant';
import { config } from './config.js';
import { validateBody, schemas } from './validate';
import { prisma as db } from './prisma';
import { getAccountByPurpose } from './accounts';
import { logAnomaly, addAudit } from './ai';
import { enqueueAiJob } from './queue';
import nodemailer from 'nodemailer';
import multer from 'multer';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

// Configure multer for PDF file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});
import { enqueueWebhooks } from './webhooks';
import { PaymentService } from './payment';
import { NotificationService } from './notifications';
import { InvoiceApprovalService } from './invoice-approval';
import { InvoiceOCRService } from './invoice-ocr';
import { InvoiceNLPService } from './invoice-nlp';
import { ConversationalAccountingService } from './ai-conversational-accounting';

function calcLineTotal(qty: number, price: number, taxRate: number) {
  const base = qty * price;
  const tax = base * (taxRate / 100);
  return Math.round((base + tax) * 100) / 100;
}

export function mountSalesRoutes(router: Router) {
  function escapePdfText(input: string): string {
    return (input || '').replace(/[\\()]/g, (m) => `\\${m}`);
  }

  async function buildInvoicePdf(tenantId: string, invoiceId: string): Promise<Buffer> {
    const inv = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { customer: true }
    });
    if (!inv) throw new Error('invoice_not_found');
    const lines = await prisma.invoiceLine.findMany({ where: { invoiceId, tenantId } });

    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', reject);

        // Colors matching frontend
        const primaryColor = '#009688';
        const secondaryColor = '#1565c0';
        const textColor = '#374151';
        const lightGray = '#f9fafb';

        // Company info (left side)
        doc.fontSize(24)
           .fillColor(primaryColor)
           .text('Your Company', 50, 50);
        
        doc.fontSize(10)
           .fillColor(textColor)
           .text('123 Business St', 50, 80)
           .text('City, State 12345', 50, 95)
           .text('Email: info@company.com', 50, 110)
           .text('Phone: +1-555-0123', 50, 125);

        // Invoice header (right side)
        doc.fontSize(28)
           .fillColor(primaryColor)
           .text('INVOICE', 400, 50);
        
        doc.fontSize(16)
           .fillColor(textColor)
           .text(`#${inv.invoiceNumber || invoiceId}`, 400, 80);
        
        // Status badge (removed to match frontend - no colored status badge)

        // Generate barcode (teal color, positioned on left)
        const barcodeWidth = 2;
        let barcodeX = 300;
        const invoiceCode = (inv.invoiceNumber || invoiceId).replace(/[^0-9]/g, '') || '123456';
        
        doc.fillColor(primaryColor); // Teal barcode like frontend
        for (let i = 0; i < invoiceCode.length; i++) {
          const digit = parseInt(invoiceCode[i]);
          for (let j = 0; j < 5; j++) {
            if ((digit + j) % 2 === 0) {
              doc.rect(barcodeX, 120, barcodeWidth, 15, 'F');
            }
            barcodeX += barcodeWidth + 1;
          }
          barcodeX += 3;
        }
        
        doc.fontSize(8)
           .fillColor(textColor)
           .text(inv.invoiceNumber || invoiceId, 350, 140, { align: 'center' });

        // Generate QR Code (teal color, positioned on right)
        try {
          const qrData = `Invoice: ${inv.invoiceNumber || invoiceId}\nAmount: $${Number(inv.totalAmount || 0).toFixed(2)}\nDue: ${(inv as any).dueDate ? new Date((inv as any).dueDate).toLocaleDateString() : 'N/A'}`;
          const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 100,
            margin: 1,
            color: { dark: primaryColor, light: '#FFFFFF' } // Teal QR code like frontend
          });
          
          // Convert data URL to buffer
          const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
          const qrBuffer = Buffer.from(base64Data, 'base64');
          
          doc.image(qrBuffer, 450, 120, { width: 25, height: 25 }); // Moved to right side
          doc.fontSize(8)
             .fillColor(textColor)
             .text('Scan to Pay', 462, 150, { align: 'center' });
        } catch (error) {
          console.error('Error generating QR code:', error);
        }

        // Line separator
        doc.moveTo(50, 180)
           .lineTo(545, 180)
           .stroke();

        // Bill To section (left)
        doc.fontSize(12)
           .fillColor(textColor)
           .text('BILL TO', 50, 200);
        
        const customer = inv.customer;
        if (customer) {
          doc.fontSize(10)
             .text(customer.name || 'Customer', 50, 220)
             .text(customer.address || '', 50, 235)
             .text(customer.email || '', 50, 250)
             .text(customer.phone || '', 50, 265);
        }

        // Invoice details (right)
        doc.fontSize(12)
           .fillColor(textColor)
           .text('INVOICE DETAILS', 300, 200);
        
        const issueDate = inv.issueDate ? new Date(inv.issueDate as any).toLocaleDateString() : '';
        const dueDate = (inv as any).dueDate ? new Date((inv as any).dueDate).toLocaleDateString() : '';
        
        doc.fontSize(10)
           .text(`Issue Date: ${issueDate}`, 300, 220)
           .text(`Due Date: ${dueDate}`, 300, 235)
           .text('Currency: USD', 300, 250)
           .text(`Amount: $${Number(inv.totalAmount || 0).toFixed(2)}`, 300, 265);

        // Line items table
        const tableY = Math.max(280, 280);
        
        // Table header
        doc.rect(50, tableY, 495, 25)
           .fill('#1f2937')
           .fillColor('white')
           .fontSize(10)
           .text('Description', 60, tableY + 8)
           .text('Qty', 300, tableY + 8)
           .text('Rate', 350, tableY + 8)
           .text('Tax', 400, tableY + 8)
           .text('Amount', 450, tableY + 8);

        // Table rows
        let currentY = tableY + 25;
        let subtotal = 0;
        let totalTax = 0;
        let totalDiscount = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const qty = Number((line as any).quantity || 1);
          const unitPrice = Number((line as any).unitPrice || 0);
          const taxRate = Number((line as any).taxRate || 0);
          const discount = Number((line as any).discount || 0);
          
          const lineSubtotal = qty * unitPrice;
          const lineDiscount = lineSubtotal * (discount / 100);
          const lineAfterDiscount = lineSubtotal - lineDiscount;
          const lineTax = lineAfterDiscount * (taxRate / 100);
          const lineTotal = lineAfterDiscount + lineTax;
          
          subtotal += lineSubtotal;
          totalDiscount += lineDiscount;
          totalTax += lineTax;
          
          // Alternate row background
          if (i % 2 === 1) {
            doc.rect(50, currentY, 495, 20)
               .fill(lightGray);
          }
          
          doc.fillColor(textColor)
             .fontSize(9)
             .text((line as any).description || 'Item', 60, currentY + 6)
             .text(qty.toString(), 300, currentY + 6)
             .text(`$${unitPrice.toFixed(2)}`, 350, currentY + 6)
             .text(`${taxRate}%`, 400, currentY + 6)
             .text(`$${lineTotal.toFixed(2)}`, 450, currentY + 6);
          
          currentY += 20;
          
          if (currentY > 650) break; // Prevent overflow
        }

        // Totals section
        const totalsY = currentY + 20;
        
        // Subtotal
        doc.fillColor(textColor)
           .fontSize(10)
           .text('Subtotal:', 350, totalsY)
           .text(`$${subtotal.toFixed(2)}`, 450, totalsY);
        
        // Discount
        if (totalDiscount > 0) {
          doc.text('Discount:', 350, totalsY + 15)
             .text(`-$${totalDiscount.toFixed(2)}`, 450, totalsY + 15);
        }
        
        // Tax
        if (totalTax > 0) {
          doc.text('Tax:', 350, totalsY + (totalDiscount > 0 ? 30 : 15))
             .text(`$${totalTax.toFixed(2)}`, 450, totalsY + (totalDiscount > 0 ? 30 : 15));
        }
        
        // Line above total
        const totalLineY = totalsY + (totalDiscount > 0 ? 45 : totalTax > 0 ? 30 : 15);
        doc.moveTo(350, totalLineY)
           .lineTo(545, totalLineY)
           .stroke();
        
        // Total
        doc.fontSize(14)
           .fillColor(primaryColor)
           .text(`TOTAL: $${(subtotal - totalDiscount + totalTax).toFixed(2)}`, 350, totalLineY + 10);

        // Footer
        doc.fontSize(8)
           .fillColor('#6b7280')
           .text('Thank you for your business!', 50, 750, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  // Customers
  router.get('/customers', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    const q = (req.query.q as string) || undefined;
    const skip = (page - 1) * pageSize;

    // Debug removed
    
    try {
      const where: any = {
        tenantId: req.tenantId,
        companyId,
        OR: q ? [
          { name: { contains: q } },
          { email: { contains: q } },
        ] : undefined,
      };
      Object.keys(where).forEach((k) => where[k] === undefined && delete where[k]);

      const [total, items] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({ 
          where, 
          orderBy: { name: 'asc' }, 
          skip, 
          take: pageSize 
        })
      ]);

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      
      // Debug removed
      
      res.json({ 
        items, 
        page, 
        pageSize, 
        total, 
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      });
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });
  router.post('/customers', validateBody(schemas.customerCreate), async (req: TenantRequest, res) => {
    const data = req.body as any;
    const created = await prisma.customer.create({ 
      data: { 
        tenantId: req.tenantId!, 
        ...data,
        // Set defaults for enhanced fields
        customerType: data.customerType || 'individual',
        status: data.status || 'active',
        emailOptIn: data.emailOptIn !== undefined ? data.emailOptIn : true,
        smsOptIn: data.smsOptIn !== undefined ? data.smsOptIn : false,
        taxExempt: data.taxExempt || false
      } 
    });
    res.status(201).json(created);
  });

  // Get customer details with enhanced data
  router.get('/customers/:id', async (req: TenantRequest, res) => {
    const { id } = req.params;
    try {
      const customer = await prisma.customer.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: {
          contacts: true,
          addresses: true,
          activities: {
            include: {
              user: { select: { id: true, name: true, email: true } }
            },
            orderBy: { activityDate: 'desc' },
            take: 10
          },
          assignedUser: { select: { id: true, name: true, email: true } },
          _count: { 
            select: { 
              invoices: true, 
              estimates: true, 
              recurringInvoices: true 
            } 
          }
        }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json(customer);
    } catch (error) {
      console.error('❌ Error fetching customer:', error);
      res.status(500).json({ error: 'Failed to fetch customer' });
    }
  });

  // Update customer
  router.put('/customers/:id', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body as any;
    
    try {
      const updated = await prisma.customer.update({
        where: { id, tenantId: req.tenantId! },
        data: {
          ...data,
          lastContactAt: data.lastContactAt ? new Date(data.lastContactAt) : undefined
        }
      });
      res.json(updated);
    } catch (error) {
      console.error('❌ Error updating customer:', error);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  });

  // Customer contacts
  router.get('/customers/:id/contacts', async (req: TenantRequest, res) => {
    const { id } = req.params;
    try {
      const contacts = await prisma.customerContact.findMany({
        where: { customerId: id, tenantId: req.tenantId! },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }]
      });
      res.json(contacts);
    } catch (error) {
      console.error('❌ Error fetching customer contacts:', error);
      res.status(500).json({ error: 'Failed to fetch customer contacts' });
    }
  });

  router.post('/customers/:id/contacts', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body as any;
    
    try {
      const contact = await prisma.customerContact.create({
        data: {
          tenantId: req.tenantId!,
          customerId: id,
          ...data
        }
      });
      res.status(201).json(contact);
    } catch (error) {
      console.error('❌ Error creating customer contact:', error);
      res.status(500).json({ error: 'Failed to create customer contact' });
    }
  });

  // Customer addresses
  router.get('/customers/:id/addresses', async (req: TenantRequest, res) => {
    const { id } = req.params;
    try {
      const addresses = await prisma.customerAddress.findMany({
        where: { customerId: id, tenantId: req.tenantId! },
        orderBy: [{ isDefault: 'desc' }, { addressType: 'asc' }]
      });
      res.json(addresses);
    } catch (error) {
      console.error('❌ Error fetching customer addresses:', error);
      res.status(500).json({ error: 'Failed to fetch customer addresses' });
    }
  });

  router.post('/customers/:id/addresses', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body as any;
    
    try {
      const address = await prisma.customerAddress.create({
        data: {
          tenantId: req.tenantId!,
          customerId: id,
          ...data
        }
      });
      res.status(201).json(address);
    } catch (error) {
      console.error('❌ Error creating customer address:', error);
      res.status(500).json({ error: 'Failed to create customer address' });
    }
  });

  // Customer activities
  router.get('/customers/:id/activities', async (req: TenantRequest, res) => {
    const { id } = req.params;
    try {
      const activities = await prisma.customerActivity.findMany({
        where: { customerId: id, tenantId: req.tenantId! },
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { activityDate: 'desc' }
      });
      res.json(activities);
    } catch (error) {
      console.error('❌ Error fetching customer activities:', error);
      res.status(500).json({ error: 'Failed to fetch customer activities' });
    }
  });

  router.post('/customers/:id/activities', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body as any;
    
    try {
      const activity = await prisma.customerActivity.create({
        data: {
          tenantId: req.tenantId!,
          customerId: id,
          activityDate: new Date(data.activityDate),
          ...data
        },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });

      // Update customer last contact date
      await prisma.customer.update({
        where: { id, tenantId: req.tenantId! },
        data: { lastContactAt: new Date(data.activityDate) }
      });

      res.status(201).json(activity);
    } catch (error) {
      console.error('❌ Error creating customer activity:', error);
      res.status(500).json({ error: 'Failed to create customer activity' });
    }
  });

  // Invoices - list (enhanced)
  router.get('/invoices', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const status = (req.query.status as string) || undefined;
    const q = (req.query.q as string) || undefined;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '10'), 10)));
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: req.tenantId,
      companyId: companyId || undefined,
      status: status || undefined,
      OR: q ? [
        { invoiceNumber: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { email: { contains: q } } },
      ] : undefined,
    };
    Object.keys(where).forEach((k) => where[k] === undefined && delete where[k]);

    const [total, items] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({ 
        where, 
        orderBy: { issueDate: 'desc' }, 
        skip, 
        take: pageSize,
        include: {
          customer: { select: { id: true, name: true, email: true, customerCode: true } },
          lines: { select: { id: true, description: true, quantity: true, unitPrice: true, lineTotal: true } },
          creator: { select: { id: true, name: true, email: true } },
          _count: { select: { activities: true, attachments: true, payments: true } }
        }
      })
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.json({ 
      items, 
      page, 
      pageSize, 
      total, 
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    });
  });

  // Invoices (enhanced)
  router.post('/invoices', validateBody(schemas.invoiceCreate), async (req: TenantRequest, res) => {
    // Debug removed
    const { 
      companyId, 
      customerId, 
      invoiceNumber, 
      issueDate, 
      dueDate, 
      currency = 'USD',
      lines,
      // Enhanced fields
      subtotal,
      taxAmount,
      discountAmount,
      shippingAmount,
      notes,
      terms,
      footer,
      paymentTerms,
      lateFeeRate,
      deliveryMethod,
      taxInclusive = false,
      taxExemptionReason,
      createdBy
    } = req.body as any;

    // Resolve tax rates by taxId or taxName, falling back to provided numeric taxRate
    const resolvedLines = await Promise.all((lines as any[]).map(async (l) => {
      let effectiveRate = Number(l.taxRate || 0);
      if (l.taxId) {
        const tr = await prisma.taxRate.findFirst({ where: { tenantId: req.tenantId!, companyId, id: l.taxId, isActive: true } });
        if (tr) effectiveRate = Number(tr.rate) * 100; // stored as 0.15 → 15%
      } else if (l.taxName) {
        const tr = await prisma.taxRate.findFirst({ where: { tenantId: req.tenantId!, companyId, taxName: l.taxName, isActive: true } });
        if (tr) effectiveRate = Number(tr.rate) * 100;
      }
      return { ...l, effectiveRate };
    }));

    // Calculate totals
    const lineTotals = resolvedLines.map((l: any) => {
      const baseAmount = (l.quantity ?? 1) * (l.unitPrice ?? 0);
      const discount = baseAmount * ((l.discountRate ?? 0) / 100);
      const netAmount = baseAmount - discount;
      const tax = taxInclusive ? 0 : netAmount * ((l.effectiveRate ?? 0) / 100);
      return {
        ...l,
        netAmount,
        discountAmount: discount,
        taxAmount: tax,
        lineTotal: netAmount + tax
      };
    });

    const calculatedSubtotal = subtotal || lineTotals.reduce((sum, l) => sum + l.netAmount, 0);
    const calculatedTaxAmount = taxAmount || lineTotals.reduce((sum, l) => sum + l.taxAmount, 0);
    const calculatedDiscountAmount = discountAmount || lineTotals.reduce((sum, l) => sum + l.discountAmount, 0);
    const shipping = shippingAmount || 0;
    const totalAmount = calculatedSubtotal + calculatedTaxAmount + shipping - calculatedDiscountAmount;

    const created = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: { 
          tenantId: req.tenantId!, 
          companyId, 
          customerId, 
          invoiceNumber, 
          issueDate: new Date(issueDate), 
          dueDate: dueDate ? new Date(dueDate) : null, 
          status: 'draft', 
          totalAmount, 
          balanceDue: totalAmount,
          currency,
          subtotal: calculatedSubtotal,
          taxAmount: calculatedTaxAmount,
          discountAmount: calculatedDiscountAmount,
          shippingAmount: shipping,
          notes,
          terms,
          footer,
          paymentTerms,
          lateFeeRate,
          deliveryMethod,
          taxInclusive,
          taxExemptionReason,
          createdBy
        }
      });

      // Create invoice lines with enhanced fields
      for (let i = 0; i < resolvedLines.length; i++) {
        const l = lineTotals[i];
        
        // If productId is provided, fetch the product to create the relationship
        let product = null;
        if (l.productId) {
          product = await tx.product.findFirst({
            where: { id: l.productId, tenantId: req.tenantId! }
          });
        }
        
        await tx.invoiceLine.create({ 
          data: { 
            tenantId: req.tenantId!, 
            invoiceId: inv.id, 
            productId: l.productId, 
            description: l.description, 
            quantity: l.quantity ?? 1, 
            unitPrice: l.unitPrice ?? 0, 
            taxRate: l.effectiveRate ?? 0, 
            lineTotal: l.lineTotal,
            discountRate: l.discountRate ?? 0,
            discountAmount: l.discountAmount,
            taxAmount: l.taxAmount,
            netAmount: l.netAmount,
            productCode: l.productCode,
            unitOfMeasure: l.unitOfMeasure,
            taxCode: l.taxCode,
            taxExempt: l.taxExempt ?? false,
            notes: l.notes,
            costPrice: l.costPrice
          } 
        });
      }

      // Create activity log
      await tx.invoiceActivity.create({
        data: {
          tenantId: req.tenantId!,
          invoiceId: inv.id,
          activityType: 'created',
          description: 'Invoice created',
          performedBy: createdBy
        }
      });

      return inv;
    });
    res.status(201).json(created);
  });

  // Update invoice (status, dueDate, balanceDue, etc.)
  router.put('/invoices/:id', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body as any;
    const updated = await prisma.invoice.update({ where: { id, tenantId: req.tenantId! }, data: {
      status: data.status || undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      balanceDue: typeof data.balanceDue === 'number' ? data.balanceDue : undefined,
    }});
    res.json(updated);
  });

  // Post invoice -> create journal + transaction (AR, Revenue) and COGS/Inventory for inventory products
  router.post('/invoices/:id/post', validateBody(schemas.invoicePostAction), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const invoice = await prisma.invoice.findFirst({ where: { id, tenantId: req.tenantId }, include: { company: true, customer: true, lines: true } });
    if (!invoice) return res.status(404).json({ error: 'not_found' });
    if (invoice.status === 'posted') return res.status(400).json({ error: 'already_posted' });

    const ar = await getAccountByPurpose(req.tenantId!, invoice.companyId, 'AR');
    const revenue = await getAccountByPurpose(req.tenantId!, invoice.companyId, 'REVENUE');
    const inventory = await getAccountByPurpose(req.tenantId!, invoice.companyId, 'INVENTORY');
    const cogsExpense = await getAccountByPurpose(req.tenantId!, invoice.companyId, 'COGS');
    if (!ar || !revenue) return res.status(400).json({ error: 'missing_accounts', message: 'Require mappings for AR and REVENUE' });

    const result = await db.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({ data: { tenantId: req.tenantId!, companyId: invoice.companyId, date: new Date(invoice.issueDate), memo: `Invoice ${invoice.invoiceNumber}`, reference: invoice.invoiceNumber, status: 'DRAFT' } });
      await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: ar.id, debit: invoice.totalAmount, credit: 0, memo: 'AR' } });
      await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: revenue.id, debit: 0, credit: invoice.totalAmount, memo: 'Revenue' } });

      // Inventory and COGS handling
      if (inventory && cogsExpense) {
        let totalCogs = 0;
        for (const line of invoice.lines) {
          if (!line.productId) continue;
          const product = await tx.product.findFirst({ where: { id: line.productId, tenantId: req.tenantId } });
          // Handle both PRODUCT (physical inventory) and SERVICE types
          if (product && (product.type === 'PRODUCT' || product.type === 'inventory')) {
            const qty = Number(line.quantity ?? 0);
            const cogs = Number(product.costPrice) * qty;
            totalCogs += cogs;
            
            // create inventory movement (sale -> negative)
            await tx.inventoryMovement.create({ 
              data: { 
                tenantId: req.tenantId!, 
                productId: product.id, 
                movementType: 'sale', 
                quantity: -qty, 
                movementDate: new Date(invoice.issueDate), 
                reference: invoice.invoiceNumber,
                reason: `Sale - Invoice ${invoice.invoiceNumber} - ${line.description}`,
                unitCost: Number(product.costPrice) || 0
              } 
            });
            
            // update stock (only for physical products, not services with unlimited stock)
            if (product.type === 'PRODUCT' && Number(product.stockQuantity) < 999999) {
              await tx.product.update({ 
                where: { id: product.id }, 
                data: { stockQuantity: Math.max(0, Number(product.stockQuantity) - qty) } 
              });
            }
          }
        }
        if (totalCogs > 0) {
          // Dr COGS (expense), Cr Inventory
          await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: cogsExpense.id, debit: totalCogs, credit: 0, memo: 'COGS' } });
          await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: inventory.id, debit: 0, credit: totalCogs, memo: 'Inventory' } });
        }
      }
      const posted = await tx.journalEntry.update({ where: { id: entry.id }, data: { status: 'POSTED' } });
      const updatedInvoice = await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'posted' } });
      let createdTx = null as any;
      if (req.body?.createTransaction !== false) {
        createdTx = await tx.transaction.create({ data: { tenantId: req.tenantId!, companyId: invoice.companyId, transactionType: 'invoice', amount: invoice.totalAmount, currency: invoice.company?.currency || 'USD', transactionDate: new Date(invoice.issueDate), status: 'posted', linkedJournalEntryId: entry.id } });
      }
      return { posted, invoice: updatedInvoice, transaction: createdTx };
    });
    // Enqueue AI jobs: anomaly detection and insights asynchronously
    try {
      await enqueueAiJob('detect-anomalies', { tenantId: req.tenantId!, companyId: invoice.companyId }, { removeOnComplete: true, removeOnFail: false });
      await enqueueAiJob('generate-insights', { tenantId: req.tenantId!, companyId: invoice.companyId }, { removeOnComplete: true, removeOnFail: false });
      await enqueueAiJob('generate-recommendations', { tenantId: req.tenantId!, companyId: invoice.companyId }, { removeOnComplete: true, removeOnFail: false });
    } catch (e) {
      console.error('Failed to enqueue AI jobs for invoice post', e);
    }
  await addAudit({ tenantId: req.tenantId!, companyId: invoice.companyId, action: `Invoice ${invoice.invoiceNumber} posted` });
  // Enqueue webhook deliveries
  try { enqueueWebhooks('invoice.posted', { invoiceId: invoice.id, companyId: invoice.companyId }); } catch (e) { console.error('enqueueWebhooks failed', e); }
  res.json(result);
  });

  // Next invoice number helper
  router.get('/invoices/next-number', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const last = await prisma.invoice.findFirst({ where: { tenantId: req.tenantId!, companyId: companyId || undefined }, orderBy: { createdAt: 'desc' } });
    let next = 1;
    const match = last?.invoiceNumber?.match(/(\d+)/);
    if (match) {
      next = parseInt(match[1], 10) + 1;
    } else {
      const count = await prisma.invoice.count({ where: { tenantId: req.tenantId!, companyId: companyId || undefined } });
      next = count + 1;
    }
    const invoiceNumber = `INV-${String(next).padStart(4,'0')}`;
    res.json({ invoiceNumber });
  });

  // Send invoice email (SMTP)
  router.post('/invoices/:id/send', upload.any(), async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const { to, subject, message, attachPdf } = (req.body || {}) as { to?: string; subject?: string; message?: string; attachPdf?: boolean };
      
      console.log('🔍 Request Debug:', {
        body: req.body,
        files: req.files,
        file: req.file,
        headers: req.headers['content-type']
      });
      
      if (!to) return res.status(400).json({ error: 'missing_to', message: 'Recipient email (to) is required' });

      // Load invoice summary
      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: { customer: { select: { name: true, email: true } } }
      });
      if (!invoice) return res.status(404).json({ error: 'invoice_not_found' });

      // Create transporter from env
      const smtpUrl = process.env.SMTP_URL;
      let transporter = smtpUrl ? nodemailer.createTransport(smtpUrl) : nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
        secure: !!process.env.SMTP_SECURE && process.env.SMTP_SECURE !== 'false',
        auth: (process.env.SMTP_USER || process.env.SMTP_PASS) ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      } as any);

      const from = process.env.SMTP_FROM || process.env.REPORTS_FROM_EMAIL || 'no-reply@urutiIQ.local';
      const mailOptions: any = {
        from,
        to,
        subject: subject || `Invoice ${invoice.invoiceNumber || invoice.id}`,
        text: message || `Please find your invoice ${invoice.invoiceNumber || invoice.id}. Total: ${invoice.totalAmount || 0}.`,
      };

      // Optional: attach PDF
      if (attachPdf) {
        let pdf: Buffer;
        let filename: string;
        
        // Find the PDF file in the uploaded files
        const pdfFile = (req.files as any[])?.find((file: any) => file.fieldname === 'pdf');
        
        console.log('🔍 PDF Attachment Debug:', {
          hasFile: !!req.file,
          hasFiles: !!req.files,
          filesCount: (req.files as any[])?.length || 0,
          pdfFile: !!pdfFile,
          fileName: pdfFile?.originalname,
          fileSize: pdfFile?.size,
          attachPdf: attachPdf
        });
        
        if (pdfFile) {
          // Use frontend-generated PDF
          console.log('✅ Using frontend-generated PDF');
          pdf = pdfFile.buffer;
          filename = pdfFile.originalname || `invoice-${invoice?.invoiceNumber || id}.pdf`;
        } else {
          // Fallback to backend-generated PDF
          console.log('⚠️ Using backend-generated PDF (fallback)');
          pdf = await buildInvoicePdf(req.tenantId!, id);
          filename = `invoice-${invoice?.invoiceNumber || id}.pdf`;
        }
        
        mailOptions.attachments = [{ filename, content: pdf, contentType: 'application/pdf' }];
      }

      const info = await transporter.sendMail(mailOptions);
      const accepted = (info as any)?.accepted || [];
      if (accepted.length === 0) return res.status(502).json({ ok: false, error: 'not_accepted', provider: info });
      res.json({ ok: true, id: (info as any).messageId || true });
    } catch (e: any) {
      console.error('❌ Email send failed:', e);
      res.status(500).json({ ok: false, error: e?.message || 'send_failed' });
    }
  });

  // Create payment link (signed placeholder)
  router.post('/invoices/:id/payment-link', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const base = config.external.nextPublicApiUrl;
    res.json({ url: `${base}/pay/${id}` });
  });

  // Invoice activity (enhanced)
  router.get('/invoices/:id/activity', async (req: TenantRequest, res) => {
    const { id } = req.params;
    try {
      const activities = await prisma.invoiceActivity.findMany({
        where: { invoiceId: id, tenantId: req.tenantId! },
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(activities);
    } catch (error) {
      console.error('❌ Error fetching invoice activities:', error);
      res.status(500).json({ error: 'Failed to fetch invoice activities' });
    }
  });

  // Add invoice activity
  router.post('/invoices/:id/activity', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { activityType, description, performedBy, metadata } = req.body;
    
    try {
      const activity = await prisma.invoiceActivity.create({
        data: {
          tenantId: req.tenantId!,
          invoiceId: id,
          activityType,
          description,
          performedBy,
          metadata: metadata ? JSON.stringify(metadata) : null
        },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });
      res.status(201).json(activity);
    } catch (error) {
      console.error('❌ Error creating invoice activity:', error);
      res.status(500).json({ error: 'Failed to create invoice activity' });
    }
  });

  // Invoice attachments
  router.get('/invoices/:id/attachments', async (req: TenantRequest, res) => {
    const { id } = req.params;
    try {
      const attachments = await prisma.invoiceAttachment.findMany({
        where: { invoiceId: id, tenantId: req.tenantId! },
        include: {
          uploader: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(attachments);
    } catch (error) {
      console.error('❌ Error fetching invoice attachments:', error);
      res.status(500).json({ error: 'Failed to fetch invoice attachments' });
    }
  });

  // Add invoice attachment
  router.post('/invoices/:id/attachments', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { fileName, fileSize, mimeType, fileUrl, uploadedBy, description } = req.body;
    
    try {
      const attachment = await prisma.invoiceAttachment.create({
        data: {
          tenantId: req.tenantId!,
          invoiceId: id,
          fileName,
          fileSize,
          mimeType,
          fileUrl,
          uploadedBy,
          description
        },
        include: {
          uploader: { select: { id: true, name: true, email: true } }
        }
      });
      res.status(201).json(attachment);
    } catch (error) {
      console.error('❌ Error creating invoice attachment:', error);
      res.status(500).json({ error: 'Failed to create invoice attachment' });
    }
  });

  // Invoice payments
  router.get('/invoices/:id/payments', async (req: TenantRequest, res) => {
    const { id } = req.params;
    try {
      const payments = await prisma.invoicePayment.findMany({
        where: { invoiceId: id, tenantId: req.tenantId! },
        orderBy: { paymentDate: 'desc' }
      });
      res.json(payments);
    } catch (error) {
      console.error('❌ Error fetching invoice payments:', error);
      res.status(500).json({ error: 'Failed to fetch invoice payments' });
    }
  });

  // Add invoice payment
  router.post('/invoices/:id/payments', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { paymentId, amount, paymentDate, paymentMethod, reference, notes } = req.body;
    
    try {
      const payment = await prisma.invoicePayment.create({
        data: {
          tenantId: req.tenantId!,
          invoiceId: id,
          paymentId,
          amount,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          reference,
          notes
        }
      });

      // Update invoice balance
      await prisma.invoice.update({
        where: { id, tenantId: req.tenantId! },
        data: {
          balanceDue: { decrement: amount }
        }
      });

      // Create activity log
      await prisma.invoiceActivity.create({
        data: {
          tenantId: req.tenantId!,
          invoiceId: id,
          activityType: 'payment_received',
          description: `Payment of ${amount} received via ${paymentMethod}`,
          metadata: JSON.stringify({ paymentId, reference })
        }
      });

      res.status(201).json(payment);
    } catch (error) {
      console.error('❌ Error creating invoice payment:', error);
      res.status(500).json({ error: 'Failed to create invoice payment' });
    }
  });

  // Invoice reminders
  router.get('/invoices/:id/reminders', async (req: TenantRequest, res) => {
    const { id } = req.params;
    try {
      const reminders = await prisma.invoiceReminder.findMany({
        where: { invoiceId: id, tenantId: req.tenantId! },
        include: {
          sender: { select: { id: true, name: true, email: true } }
        },
        orderBy: { sentAt: 'desc' }
      });
      res.json(reminders);
    } catch (error) {
      console.error('❌ Error fetching invoice reminders:', error);
      res.status(500).json({ error: 'Failed to fetch invoice reminders' });
    }
  });

  // Send invoice reminder
  router.post('/invoices/:id/reminders', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { reminderType, sentBy, templateId, response } = req.body;
    
    try {
      const reminder = await prisma.invoiceReminder.create({
        data: {
          tenantId: req.tenantId!,
          invoiceId: id,
          reminderType,
          sentAt: new Date(),
          sentBy,
          templateId,
          status: 'sent',
          response
        },
        include: {
          sender: { select: { id: true, name: true, email: true } }
        }
      });

      // Update invoice reminder count
      await prisma.invoice.update({
        where: { id, tenantId: req.tenantId! },
        data: {
          reminderCount: { increment: 1 }
        }
      });

      // Create activity log
      await prisma.invoiceActivity.create({
        data: {
          tenantId: req.tenantId!,
          invoiceId: id,
          activityType: 'reminder_sent',
          description: `${reminderType} reminder sent`,
          performedBy: sentBy,
          metadata: JSON.stringify({ templateId, response })
        }
      });

      res.status(201).json(reminder);
    } catch (error) {
      console.error('❌ Error creating invoice reminder:', error);
      res.status(500).json({ error: 'Failed to create invoice reminder' });
    }
  });

  // Invoice PDF (basic one-page PDF with details)
  router.get('/invoices/:id/pdf', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const pdf = await buildInvoicePdf(req.tenantId!, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${id}.pdf`);
    res.send(pdf);
  });

  // Estimates - list
  router.get('/estimates', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const status = (req.query.status as string) || undefined;
    const q = (req.query.q as string) || undefined;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '10'), 10)));
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: req.tenantId,
      companyId: companyId || undefined,
      status: status || undefined,
      OR: q ? [
        // Emulate case-insensitive contains for SQLite by checking common variants
        { estimateNumber: { contains: q } },
        { estimateNumber: { contains: String(q).toUpperCase() } },
        { estimateNumber: { contains: String(q).toLowerCase() } },
      ] : undefined,
    };
    Object.keys(where).forEach((k) => where[k] === undefined && delete where[k]);

    const [total, items] = await Promise.all([
      prisma.estimate.count({ where }),
      prisma.estimate.findMany({ 
        where, 
        orderBy: { issueDate: 'desc' }, 
        skip, 
        take: pageSize,
        include: {
          customer: { select: { name: true, email: true } }
        }
      })
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.json({ items, page, pageSize, total, totalPages });
  });

  // Create estimate
  router.post('/estimates', validateBody(schemas.estimateCreate), async (req: TenantRequest, res) => {
    const { companyId, customerId, estimateNumber, issueDate, expiryDate, currency, notes, terms, lines } = req.body as any;
    
    // Resolve tax rates by taxId or taxName, falling back to provided numeric taxRate
    const resolvedLines = await Promise.all((lines as any[]).map(async (l) => {
      let effectiveRate = Number(l.taxRate || 0);
      if (l.taxId) {
        const tr = await prisma.taxRate.findFirst({ where: { tenantId: req.tenantId!, companyId, id: l.taxId, isActive: true } });
        if (tr) effectiveRate = Number(tr.rate) * 100; // stored as 0.15 → 15%
      } else if (l.taxName) {
        const tr = await prisma.taxRate.findFirst({ where: { tenantId: req.tenantId!, companyId, taxName: l.taxName, isActive: true } });
        if (tr) effectiveRate = Number(tr.rate) * 100;
      }
      return { ...l, effectiveRate };
    }));
    
    const totals = resolvedLines.map((l: any) => calcLineTotal(l.quantity ?? 1, l.unitPrice ?? 0, l.effectiveRate ?? 0));
    const totalAmount = totals.reduce((a: number, b: number) => a + b, 0);
    
    const created = await prisma.$transaction(async (tx) => {
      const est = await tx.estimate.create({
        data: { 
          tenantId: req.tenantId!, 
          companyId, 
          customerId, 
          estimateNumber, 
          issueDate: new Date(issueDate), 
          expiryDate: expiryDate && expiryDate.trim() !== '' ? new Date(expiryDate) : null,
          currency: currency || 'USD',
          notes,
          terms,
          status: 'draft', 
          totalAmount 
        }
      });
      
      for (let i = 0; i < resolvedLines.length; i++) {
        const l = resolvedLines[i];
        await tx.estimateLine.create({ 
          data: { 
            tenantId: req.tenantId!, 
            estimateId: est.id, 
            productId: l.productId, 
            description: l.description, 
            quantity: l.quantity ?? 1, 
            unitPrice: l.unitPrice ?? 0, 
            taxRate: l.effectiveRate ?? 0, 
            lineTotal: totals[i] 
          } 
        });
      }
      return est;
    });
    res.status(201).json(created);
  });

  // Update estimate
  router.put('/estimates/:id', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body as any;
    const updated = await prisma.estimate.update({ 
      where: { id, tenantId: req.tenantId! }, 
      data: {
        status: data.status || undefined,
        expiryDate: data.expiryDate && data.expiryDate.trim() !== '' ? new Date(data.expiryDate) : (data.expiryDate === '' ? null : undefined),
        notes: data.notes || undefined,
        terms: data.terms || undefined,
      }
    });
    res.json(updated);
  });

  // Convert estimate to invoice
  router.post('/estimates/:id/convert', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const estimate = await prisma.estimate.findFirst({ 
      where: { id, tenantId: req.tenantId }, 
      include: { lines: true, customer: true } 
    });
    
    if (!estimate) return res.status(404).json({ error: 'not_found' });
    if (estimate.status === 'converted') return res.status(400).json({ error: 'already_converted' });

    // Generate next invoice number
    const last = await prisma.invoice.findFirst({ 
      where: { tenantId: req.tenantId!, companyId: estimate.companyId }, 
      orderBy: { createdAt: 'desc' } 
    });
    let next = 1;
    const match = last?.invoiceNumber?.match(/(\d+)/);
    if (match) {
      next = parseInt(match[1], 10) + 1;
    } else {
      const count = await prisma.invoice.count({ where: { tenantId: req.tenantId!, companyId: estimate.companyId } });
      next = count + 1;
    }
    const invoiceNumber = `INV-${String(next).padStart(4,'0')}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create invoice
      const inv = await tx.invoice.create({
        data: { 
          tenantId: req.tenantId!, 
          companyId: estimate.companyId, 
          customerId: estimate.customerId, 
          invoiceNumber, 
          issueDate: new Date(), 
          status: 'draft', 
          totalAmount: estimate.totalAmount, 
          balanceDue: estimate.totalAmount 
        }
      });

      // Create invoice lines
      for (const line of estimate.lines) {
        await tx.invoiceLine.create({ 
          data: { 
            tenantId: req.tenantId!, 
            invoiceId: inv.id, 
            productId: line.productId, 
            description: line.description, 
            quantity: line.quantity, 
            unitPrice: line.unitPrice, 
            taxRate: line.taxRate, 
            lineTotal: line.lineTotal 
          } 
        });
      }

      // Update estimate status
      await tx.estimate.update({ 
        where: { id: estimate.id }, 
        data: { 
          status: 'converted',
          convertedToInvoiceId: inv.id
        } 
      });

      return inv;
    });

    res.json(result);
  });

  // Next estimate number helper
  router.get('/estimates/next-number', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const last = await prisma.estimate.findFirst({ 
      where: { tenantId: req.tenantId!, companyId: companyId || undefined }, 
      orderBy: { createdAt: 'desc' } 
    });
    let next = 1;
    const match = last?.estimateNumber?.match(/(\d+)/);
    if (match) {
      next = parseInt(match[1], 10) + 1;
    } else {
      const count = await prisma.estimate.count({ where: { tenantId: req.tenantId!, companyId: companyId || undefined } });
      next = count + 1;
    }
    const estimateNumber = `EST-${String(next).padStart(4,'0')}`;
    res.json({ estimateNumber });
  });

  // Estimate PDF (generate minimal PDF)
  router.get('/estimates/:id/pdf', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const est = await prisma.estimate.findFirst({ 
      where: { id, tenantId: req.tenantId! },
      include: { customer: { select: { name: true } } }
    });
    const text = `Estimate ${est?.estimateNumber || id} for ${est?.customer?.name || 'Customer'}`;
    // Minimal PDF content
    const pdf = Buffer.from(
      `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 56>>stream\nBT /F1 24 Tf 72 720 Td (${text}) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000113 00000 n \n0000000330 00000 n \n0000000450 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n550\n%%EOF`
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=estimate-${est?.estimateNumber || id}.pdf`);
    res.send(pdf);
  });

  // ===== RECURRING INVOICES =====
  
  // List recurring invoices
  router.get('/recurring-invoices', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    const q = (req.query.q as string) || undefined;
    const status = (req.query.status as string) || undefined;
    const skip = (page - 1) * pageSize;

    try {
      const where: any = {
        tenantId: req.tenantId,
        companyId,
        status: status || undefined,
        OR: q ? [
          { name: { contains: q } },
          { description: { contains: q } },
        ] : undefined,
      };
      Object.keys(where).forEach((k) => where[k] === undefined && delete where[k]);

      const [total, items] = await Promise.all([
        prisma.recurringInvoice.count({ where }),
        prisma.recurringInvoice.findMany({ 
          where, 
          include: { 
            customer: { select: { name: true, email: true } },
            lines: true,
            _count: { select: { generatedInvoices: true } }
          },
          orderBy: { createdAt: 'desc' }, 
          skip, 
          take: pageSize 
        })
      ]);

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      
      res.json({ 
        items, 
        page, 
        pageSize, 
        total, 
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      });
    } catch (error) {
      console.error('❌ Error fetching recurring invoices:', error);
      res.status(500).json({ error: 'Failed to fetch recurring invoices' });
    }
  });

  // Create recurring invoice
  router.post('/recurring-invoices', validateBody(schemas.recurringInvoiceCreate), async (req: TenantRequest, res) => {
    try {
      const { lines, ...data } = req.body;
      
      // Calculate next run date based on frequency
      const startDate = new Date(data.startDate);
      const nextRunDate = calculateNextRunDate(startDate, data.frequency, data.interval);
      
      const result = await prisma.$transaction(async (tx) => {
        // Create recurring invoice
        const recurring = await tx.recurringInvoice.create({
          data: {
            ...data,
            tenantId: req.tenantId!,
            startDate,
            endDate: data.endDate && data.endDate.trim() !== '' ? new Date(data.endDate) : null,
            nextRunDate,
            totalAmount: lines.reduce((sum: number, line: any) => sum + calcLineTotal(line.quantity, line.unitPrice, line.taxRate), 0)
          }
        });

        // Create lines
        for (const line of lines) {
          await tx.recurringInvoiceLine.create({
            data: {
              tenantId: req.tenantId!,
              recurringInvoiceId: recurring.id,
              productId: line.productId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxRate: line.taxRate,
              lineTotal: calcLineTotal(line.quantity, line.unitPrice, line.taxRate)
            }
          });
        }

        return recurring;
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('❌ Error creating recurring invoice:', error);
      res.status(500).json({ error: 'Failed to create recurring invoice' });
    }
  });

  // Update recurring invoice
  router.put('/recurring-invoices/:id', validateBody(schemas.recurringInvoiceUpdate), async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const { lines, ...data } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        // Update recurring invoice
        const recurring = await tx.recurringInvoice.update({
          where: { id, tenantId: req.tenantId! },
          data: {
            ...data,
            endDate: data.endDate && data.endDate.trim() !== '' ? new Date(data.endDate) : (data.endDate === '' ? null : undefined),
            totalAmount: lines ? lines.reduce((sum: number, line: any) => sum + calcLineTotal(line.quantity, line.unitPrice, line.taxRate), 0) : undefined
          }
        });

        // Update lines if provided
        if (lines) {
          // Delete existing lines
          await tx.recurringInvoiceLine.deleteMany({
            where: { recurringInvoiceId: id, tenantId: req.tenantId! }
          });

          // Create new lines
          for (const line of lines) {
            await tx.recurringInvoiceLine.create({
              data: {
                tenantId: req.tenantId!,
                recurringInvoiceId: id,
                productId: line.productId,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                taxRate: line.taxRate,
                lineTotal: calcLineTotal(line.quantity, line.unitPrice, line.taxRate)
              }
            });
          }
        }

        return recurring;
      });

      res.json(result);
    } catch (error) {
      console.error('❌ Error updating recurring invoice:', error);
      res.status(500).json({ error: 'Failed to update recurring invoice' });
    }
  });

  // Get recurring invoice details
  router.get('/recurring-invoices/:id', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const recurring = await prisma.recurringInvoice.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: { 
          customer: true,
          lines: true,
          generatedInvoices: { 
            select: { id: true, invoiceNumber: true, issueDate: true, status: true, totalAmount: true },
            orderBy: { issueDate: 'desc' },
            take: 10
          }
        }
      });

      if (!recurring) {
        return res.status(404).json({ error: 'Recurring invoice not found' });
      }

      res.json(recurring);
    } catch (error) {
      console.error('❌ Error fetching recurring invoice:', error);
      res.status(500).json({ error: 'Failed to fetch recurring invoice' });
    }
  });

  // Delete recurring invoice
  router.delete('/recurring-invoices/:id', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      
      await prisma.$transaction(async (tx) => {
        // Delete lines first
        await tx.recurringInvoiceLine.deleteMany({
          where: { recurringInvoiceId: id, tenantId: req.tenantId! }
        });

        // Delete recurring invoice
        await tx.recurringInvoice.delete({
          where: { id, tenantId: req.tenantId! }
        });
      });

      res.status(204).send();
    } catch (error) {
      console.error('❌ Error deleting recurring invoice:', error);
      res.status(500).json({ error: 'Failed to delete recurring invoice' });
    }
  });

  // Update recurring invoice status (pause/resume/cancel)
  router.patch('/recurring-invoices/:id/status', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'paused', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be active, paused, completed, or cancelled' });
      }

      // Get old status before updating
      const oldRecurring = await prisma.recurringInvoice.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: { customer: true }
      });

      const recurring = await prisma.recurringInvoice.update({
        where: { id, tenantId: req.tenantId! },
        data: { status },
        include: {
          customer: true,
          company: true,
          lines: true,
          _count: {
            select: { generatedInvoices: true }
          }
        }
      });

      // Send email notification for status change
      if (oldRecurring?.customer?.email && oldRecurring.status !== status) {
        try {
          const { recurringEmailService } = require('../services/recurring-email.service');
          await recurringEmailService.sendRecurringInvoiceStatusChange(
            recurring,
            oldRecurring.customer,
            oldRecurring.status,
            status
          );
        } catch (emailError) {
          console.error('Failed to send status change email:', emailError);
          // Don't fail the request if email fails
        }
      }

      res.json(recurring);
    } catch (error) {
      console.error('❌ Error updating recurring invoice status:', error);
      res.status(500).json({ error: 'Failed to update recurring invoice status' });
    }
  });

  // Get generated invoices history for a recurring invoice
  router.get('/recurring-invoices/:id/history', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
      const skip = (page - 1) * pageSize;

      // Verify recurring invoice exists
      const recurring = await prisma.recurringInvoice.findFirst({
        where: { id, tenantId: req.tenantId! },
        select: { id: true, name: true }
      });

      if (!recurring) {
        return res.status(404).json({ error: 'Recurring invoice not found' });
      }

      // Get generated invoices
      const [invoices, totalCount] = await Promise.all([
        prisma.invoice.findMany({
          where: { 
            recurringInvoiceId: id,
            tenantId: req.tenantId! 
          },
          include: { 
            customer: { select: { id: true, name: true, email: true } },
            payments: { select: { id: true, amount: true, paymentDate: true, paymentMethod: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize
        }),
        prisma.invoice.count({
          where: { 
            recurringInvoiceId: id,
            tenantId: req.tenantId! 
          }
        })
      ]);

      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

      res.json({
        invoices,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('❌ Error fetching recurring invoice history:', error);
      res.status(500).json({ error: 'Failed to fetch recurring invoice history' });
    }
  });

  // Generate invoice from recurring template
  router.post('/recurring-invoices/:id/generate', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const { issueDate } = req.body;

      const recurring = await prisma.recurringInvoice.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: { customer: true, lines: true }
      });

      if (!recurring) {
        return res.status(404).json({ error: 'Recurring invoice not found' });
      }

      if (recurring.status !== 'active') {
        return res.status(400).json({ error: 'Recurring invoice is not active' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Get next invoice number
        const lastInvoice = await tx.invoice.findFirst({
          where: { tenantId: req.tenantId!, companyId: recurring.companyId },
          orderBy: { createdAt: 'desc' }
        });
        
        let nextNumber = 1;
        if (lastInvoice?.invoiceNumber) {
          const match = lastInvoice.invoiceNumber.match(/(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
          }
        }
        const invoiceNumber = `INV-${String(nextNumber).padStart(4, '0')}`;

        // Create invoice
        const invoice = await tx.invoice.create({
          data: {
            tenantId: req.tenantId!,
            companyId: recurring.companyId,
            customerId: recurring.customerId,
            invoiceNumber,
            issueDate: new Date(issueDate || new Date()),
            dueDate: new Date(new Date(issueDate || new Date()).getTime() + recurring.dueDateOffset * 24 * 60 * 60 * 1000),
            status: 'draft',
            totalAmount: recurring.totalAmount,
            balanceDue: recurring.totalAmount,
            recurringInvoiceId: recurring.id
          }
        });

        // Create invoice lines
        for (const line of recurring.lines) {
          await tx.invoiceLine.create({
            data: {
              tenantId: req.tenantId!,
              invoiceId: invoice.id,
              productId: line.productId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxRate: line.taxRate,
              lineTotal: line.lineTotal
            }
          });
        }

        // Update next run date
        const nextRunDate = calculateNextRunDate(new Date(issueDate || new Date()), recurring.frequency, recurring.interval);
        await tx.recurringInvoice.update({
          where: { id: recurring.id },
          data: { 
            lastRunDate: new Date(issueDate || new Date()),
            nextRunDate,
            ...(recurring.endDate && new Date(issueDate || new Date()) >= recurring.endDate ? { status: 'completed' } : {})
          }
        });

        return invoice;
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('❌ Error generating invoice from recurring template:', error);
      res.status(500).json({ error: 'Failed to generate invoice' });
    }
  });

  // Helper function to calculate next run date
  function calculateNextRunDate(startDate: Date, frequency: string, interval: number): Date {
    const next = new Date(startDate);
    
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + interval);
        break;
      case 'weekly':
        next.setDate(next.getDate() + (7 * interval));
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + interval);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + (3 * interval));
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + interval);
        break;
      default:
        next.setDate(next.getDate() + interval);
    }
    
    return next;
  }

  // Payment Integration Routes
  
  // Create payment intent for invoice
  router.post('/invoices/:id/payment-intent', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { customerEmail, customerName, description } = req.body;
    
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: { customer: true }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Invoice is already paid' });
      }

      const paymentIntent = await PaymentService.createPaymentIntent({
        invoiceId: id,
        amount: invoice.balanceDue,
        currency: invoice.currency,
        customerEmail: customerEmail || invoice.customer?.email,
        customerName: customerName || invoice.customer?.name,
        description: description || `Payment for Invoice ${invoice.invoiceNumber}`,
        metadata: {
          tenantId: req.tenantId!,
          companyId: invoice.companyId,
        }
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  });

  // Create payment link for invoice
  router.post('/invoices/:id/payment-link', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { expiresInMinutes, customerEmail, customerName, description } = req.body;
    
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: { customer: true }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Invoice is already paid' });
      }

      const paymentLink = await PaymentService.createPaymentLink({
        invoiceId: id,
        amount: invoice.balanceDue,
        currency: invoice.currency,
        expiresInMinutes: expiresInMinutes || 1440, // Default 24 hours
        customerEmail: customerEmail || invoice.customer?.email,
        customerName: customerName || invoice.customer?.name,
        description: description || `Payment for Invoice ${invoice.invoiceNumber}`,
      });

      res.json({
        url: paymentLink.url,
        expiresAt: paymentLink.expiresAt,
        amount: invoice.balanceDue,
        currency: invoice.currency,
      });
    } catch (error) {
      console.error('Error creating payment link:', error);
      res.status(500).json({ error: 'Failed to create payment link' });
    }
  });

  // Get payment status for invoice
  router.get('/invoices/:id/payment-status', async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const lastPayment = invoice.payments[0];
      
      res.json({
        invoiceId: id,
        status: invoice.status,
        balanceDue: invoice.balanceDue,
        totalAmount: invoice.totalAmount,
        hasPaymentLink: false, // Will be implemented with payment link storage
        lastPaymentIntent: lastPayment?.paymentId,
        paymentStatus: lastPayment ? 'completed' : 'pending',
        lastPaymentDate: lastPayment?.paymentDate,
        paymentMethod: lastPayment?.paymentMethod,
      });
    } catch (error) {
      console.error('Error getting payment status:', error);
      res.status(500).json({ error: 'Failed to get payment status' });
    }
  });

  // Create customer portal session
  router.post('/customer-portal', async (req: TenantRequest, res) => {
    const { customerEmail, returnUrl } = req.body;
    
    try {
      if (!customerEmail || !returnUrl) {
        return res.status(400).json({ error: 'Customer email and return URL are required' });
      }

      const session = await PaymentService.createCustomerPortalSession(customerEmail, returnUrl);
      
      res.json(session);
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      res.status(500).json({ error: 'Failed to create customer portal session' });
    }
  });

  // Stripe webhook endpoint
  router.post('/webhooks/stripe', async (req: TenantRequest, res) => {
    try {
      const { handleStripeWebhook } = await import('./payment');
      await handleStripeWebhook(req, res);
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Notification Routes
  
  // Send payment reminder
  router.post('/invoices/:id/send-reminder', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { type = 'overdue' } = req.body;
    
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: { customer: true, company: true }
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      await NotificationService.sendPaymentReminder(invoice, type as 'overdue' | 'due_soon');
      
      res.json({ success: true, message: 'Payment reminder sent' });
    } catch (error: any) {
      console.error('Error sending payment reminder:', error);
      res.status(500).json({ error: error.message || 'Failed to send reminder' });
    }
  });

  // Send invoice notification
  router.post('/invoices/:id/send-notification', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { type = 'sent' } = req.body;
    
    try {
      await NotificationService.sendInvoiceNotification(id, type as 'created' | 'sent' | 'updated');
      
      res.json({ success: true, message: 'Invoice notification sent' });
    } catch (error: any) {
      console.error('Error sending invoice notification:', error);
      res.status(500).json({ error: error.message || 'Failed to send notification' });
    }
  });

  // Send payment confirmation
  router.post('/invoices/:id/send-confirmation', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { paymentData } = req.body;
    
    try {
      await NotificationService.sendPaymentConfirmation(id, paymentData);
      
      res.json({ success: true, message: 'Payment confirmation sent' });
    } catch (error: any) {
      console.error('Error sending payment confirmation:', error);
      res.status(500).json({ error: error.message || 'Failed to send confirmation' });
    }
  });

  // Bulk send reminders
  router.post('/invoices/send-bulk-reminders', async (req: TenantRequest, res) => {
    const { type = 'overdue', invoiceIds } = req.body;
    
    try {
      if (!invoiceIds || !Array.isArray(invoiceIds)) {
        return res.status(400).json({ error: 'invoiceIds array is required' });
      }

      const invoices = await prisma.invoice.findMany({
        where: { 
          id: { in: invoiceIds },
          tenantId: req.tenantId!
        },
        include: { customer: true, company: true }
      });

      let successCount = 0;
      let errorCount = 0;

      for (const invoice of invoices) {
        try {
          await NotificationService.sendPaymentReminder(invoice, type as 'overdue' | 'due_soon');
          successCount++;
        } catch (error) {
          console.error(`Error sending reminder for invoice ${invoice.id}:`, error);
          errorCount++;
        }
      }

      res.json({ 
        success: true, 
        message: `Sent ${successCount} reminders, ${errorCount} failed`,
        successCount,
        errorCount
      });
    } catch (error: any) {
      console.error('Error sending bulk reminders:', error);
      res.status(500).json({ error: error.message || 'Failed to send bulk reminders' });
    }
  });

  // Get notification templates
  router.get('/notification-templates', async (req: TenantRequest, res) => {
    try {
      const templates = [
        {
          id: 'payment_reminder_overdue',
          name: 'Overdue Payment Reminder',
          type: 'email',
          description: 'Sent when payment is overdue'
        },
        {
          id: 'payment_reminder_due_soon',
          name: 'Payment Due Soon Reminder',
          type: 'email',
          description: 'Sent when payment is due within 3 days'
        },
        {
          id: 'payment_confirmation',
          name: 'Payment Confirmation',
          type: 'email',
          description: 'Sent after successful payment'
        },
        {
          id: 'invoice_sent',
          name: 'Invoice Sent',
          type: 'email',
          description: 'Sent when invoice is sent to customer'
        },
        {
          id: 'invoice_updated',
          name: 'Invoice Updated',
          type: 'email',
          description: 'Sent when invoice is updated'
        }
      ];

      res.json({ templates });
    } catch (error: any) {
      console.error('Error getting notification templates:', error);
      res.status(500).json({ error: error.message || 'Failed to get templates' });
    }
  });

  // Invoice Approval Workflow Routes
  
  // Create invoice approval workflow
  router.post('/approval-workflows', async (req: TenantRequest, res) => {
    const { companyId, name, description, steps, conditions, autoApproval, escalationRules } = req.body;
    
    try {
      const workflow = await InvoiceApprovalService.createInvoiceApprovalWorkflow(
        req.tenantId!,
        companyId,
        {
          name,
          description,
          entityType: 'invoice',
          steps: JSON.parse(steps),
          conditions: conditions ? JSON.parse(conditions) : undefined,
          autoApproval: autoApproval || false,
          escalationRules: escalationRules ? JSON.parse(escalationRules) : undefined
        }
      );
      
      res.json({ workflow });
    } catch (error: any) {
      console.error('Error creating invoice approval workflow:', error);
      res.status(500).json({ error: error.message || 'Failed to create workflow' });
    }
  });

  // Trigger approval workflow for invoice
  router.post('/invoices/:id/trigger-approval', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { workflowId } = req.body;
    
    try {
      await InvoiceApprovalService.triggerInvoiceApproval(req.tenantId!, id, workflowId);
      
      res.json({ success: true, message: 'Approval workflow triggered' });
    } catch (error: any) {
      console.error('Error triggering invoice approval:', error);
      res.status(500).json({ error: error.message || 'Failed to trigger approval' });
    }
  });

  // Process approval action
  router.post('/approvals/:id/action', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { action, comments, escalationReason } = req.body;
    
    try {
      await InvoiceApprovalService.processApprovalAction(
        req.tenantId!,
        id,
        action,
        comments,
        escalationReason
      );
      
      res.json({ success: true, message: `Approval ${action} processed` });
    } catch (error: any) {
      console.error('Error processing approval action:', error);
      res.status(500).json({ error: error.message || 'Failed to process approval' });
    }
  });

  // Get pending approvals for user
  router.get('/approvals/pending', async (req: TenantRequest, res) => {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    try {
      const approvals = await InvoiceApprovalService.getPendingApprovals(req.tenantId!, userId);
      
      res.json({ approvals });
    } catch (error: any) {
      console.error('Error getting pending approvals:', error);
      res.status(500).json({ error: error.message || 'Failed to get pending approvals' });
    }
  });

  // Get approval workflow status for invoice
  router.get('/invoices/:id/approval-status', async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    try {
      const approvals = await prisma.approval.findMany({
        where: {
          tenantId: req.tenantId!,
          entityType: 'invoice',
          entityId: id
        },
        include: {
          approver: {
            select: { id: true, name: true, email: true }
          },
          workflow: {
            select: { id: true, name: true }
          }
        },
        orderBy: { stepNumber: 'asc' }
      });

      const invoice = await prisma.invoice.findFirst({
        where: { id, tenantId: req.tenantId! },
        select: { status: true }
      });

      res.json({
        invoiceStatus: invoice?.status,
        approvals: approvals.map(approval => ({
          id: approval.id,
          stepNumber: approval.stepNumber,
          approver: approval.approver,
          status: approval.status,
          comments: approval.comments,
          createdAt: approval.createdAt,
          processedAt: approval.processedAt,
          workflow: approval.workflow
        }))
      });
    } catch (error: any) {
      console.error('Error getting approval status:', error);
      res.status(500).json({ error: error.message || 'Failed to get approval status' });
    }
  });

  // OCR Invoice Processing Routes
  
  // Process uploaded invoice document
  router.post('/invoices/process-document', async (req: TenantRequest, res) => {
    try {
      // This would typically handle file upload via multer
      // For now, we'll simulate the processing
      const { fileName, mimeType, fileData } = req.body;
      
      if (!fileName || !fileData) {
        return res.status(400).json({ error: 'File data is required' });
      }

      const fileBuffer = Buffer.from(fileData, 'base64');
      const ocrResult = await InvoiceOCRService.processInvoiceDocument(
        req.tenantId!,
        fileBuffer,
        fileName,
        mimeType || 'application/pdf'
      );

      res.json({ 
        success: true, 
        result: ocrResult,
        message: 'Document processed successfully' 
      });
    } catch (error: any) {
      console.error('Error processing invoice document:', error);
      res.status(500).json({ error: error.message || 'Failed to process document' });
    }
  });

  // Create invoice from OCR result
  router.post('/invoices/create-from-ocr', async (req: TenantRequest, res) => {
    const { companyId, customerId, ocrResult, additionalData } = req.body;
    
    try {
      if (!companyId || !customerId || !ocrResult) {
        return res.status(400).json({ error: 'Company ID, Customer ID, and OCR result are required' });
      }

      const invoice = await InvoiceOCRService.createInvoiceFromOCR(
        req.tenantId!,
        companyId,
        customerId,
        ocrResult,
        additionalData
      );

      res.json({ 
        success: true, 
        invoice,
        message: 'Invoice created from OCR processing' 
      });
    } catch (error: any) {
      console.error('Error creating invoice from OCR:', error);
      res.status(500).json({ error: error.message || 'Failed to create invoice' });
    }
  });

  // Match expenses to invoice
  router.get('/invoices/:id/match-expenses', async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    try {
      const result = await InvoiceOCRService.matchExpensesToInvoice(req.tenantId!, id);
      
      res.json({ 
        success: true, 
        result,
        message: 'Expense matching completed' 
      });
    } catch (error: any) {
      console.error('Error matching expenses:', error);
      res.status(500).json({ error: error.message || 'Failed to match expenses' });
    }
  });

  // Apply expense matches to invoice
  router.post('/invoices/:id/apply-expense-matches', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { matches } = req.body;
    
    try {
      if (!matches || !Array.isArray(matches)) {
        return res.status(400).json({ error: 'Matches array is required' });
      }

      await InvoiceOCRService.applyExpenseMatches(req.tenantId!, id, matches);
      
      res.json({ 
        success: true, 
        message: 'Expense matches applied successfully' 
      });
    } catch (error: any) {
      console.error('Error applying expense matches:', error);
      res.status(500).json({ error: error.message || 'Failed to apply expense matches' });
    }
  });

  // Natural Language Invoice Creation Routes
  
  // Parse natural language text to extract invoice data
  router.post('/invoices/parse-text', async (req: TenantRequest, res) => {
    const { text, companyId, customerId, context } = req.body;
    
    try {
      if (!text || !companyId) {
        return res.status(400).json({ error: 'Text and company ID are required' });
      }

      const parsedData = await InvoiceNLPService.parseInvoiceText(req.tenantId!, {
        text,
        companyId,
        customerId,
        context
      });

      res.json({ 
        success: true, 
        parsedData,
        message: 'Text parsed successfully' 
      });
    } catch (error: any) {
      console.error('Error parsing invoice text:', error);
      res.status(500).json({ error: error.message || 'Failed to parse text' });
    }
  });

  // Create invoice from natural language
  router.post('/invoices/create-from-text', async (req: TenantRequest, res) => {
    const { text, companyId, customerId, autoCreateCustomer, validateData } = req.body;
    
    try {
      if (!text || !companyId) {
        return res.status(400).json({ error: 'Text and company ID are required' });
      }

      // First parse the text
      const parsedData = await InvoiceNLPService.parseInvoiceText(req.tenantId!, {
        text,
        companyId,
        customerId
      });

      // Then create the invoice
      const result = await InvoiceNLPService.createInvoiceFromNLP(
        req.tenantId!,
        companyId,
        parsedData,
        {
          customerId,
          autoCreateCustomer: autoCreateCustomer || false,
          validateData: validateData || true
        }
      );

      res.json(result);
    } catch (error: any) {
      console.error('Error creating invoice from text:', error);
      res.status(500).json({ error: error.message || 'Failed to create invoice' });
    }
  });

  // Get invoice creation suggestions
  router.get('/invoices/suggestions', async (req: TenantRequest, res) => {
    const { companyId, text } = req.query;
    
    try {
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const suggestions = await InvoiceNLPService.getInvoiceSuggestions(
        req.tenantId!,
        companyId as string,
        (text as string) || ''
      );

      res.json({ 
        success: true, 
        suggestions,
        message: 'Suggestions generated successfully' 
      });
    } catch (error: any) {
      console.error('Error getting invoice suggestions:', error);
      res.status(500).json({ error: error.message || 'Failed to get suggestions' });
    }
  });

  // Validate parsed invoice data
  router.post('/invoices/validate-parsed-data', async (req: TenantRequest, res) => {
    const { parsedData } = req.body;
    
    try {
      if (!parsedData) {
        return res.status(400).json({ error: 'Parsed data is required' });
      }

      // This would typically call the validation method
      // For now, return a simple validation response
      const validation = {
        isValid: true,
        warnings: [],
        suggestions: [],
        confidence: parsedData.metadata?.confidence || 0
      };

      res.json({ 
        success: true, 
        validation,
        message: 'Data validation completed' 
      });
    } catch (error: any) {
      console.error('Error validating parsed data:', error);
      res.status(500).json({ error: error.message || 'Failed to validate data' });
    }
  });

  // AI Conversational Accounting Routes
  
  // Process conversational message
  router.post('/ai-chat/message', async (req: TenantRequest, res) => {
    const { message, companyId, sessionId, conversationHistory } = req.body;
    const userId = (req as any).user?.id;
    
    try {
      if (!message || !companyId || !userId) {
        return res.status(400).json({ error: 'Message, company ID, and user ID are required' });
      }

      const response = await ConversationalAccountingService.processMessage(
        req.tenantId!,
        companyId,
        userId,
        message,
        sessionId || `session_${Date.now()}`,
        conversationHistory || []
      );

      res.json({ 
        success: true, 
        response,
        message: 'Message processed successfully' 
      });
    } catch (error: any) {
      console.error('Error processing conversational message:', error);
      res.status(500).json({ error: error.message || 'Failed to process message' });
    }
  });

  // Execute AI-suggested action
  router.post('/ai-chat/execute-action', async (req: TenantRequest, res) => {
    const { action } = req.body;
    
    try {
      if (!action || !action.type) {
        return res.status(400).json({ error: 'Action type and data are required' });
      }

      const result = await ConversationalAccountingService.executeAction(
        req.tenantId!,
        action
      );

      res.json({ 
        success: result.success, 
        result: result.result,
        message: result.message 
      });
    } catch (error: any) {
      console.error('Error executing AI action:', error);
      res.status(500).json({ error: error.message || 'Failed to execute action' });
    }
  });

  // Get conversation history
  router.get('/ai-chat/history/:sessionId', async (req: TenantRequest, res) => {
    const { sessionId } = req.params;
    const { limit } = req.query;
    
    try {
      const history = await ConversationalAccountingService.getConversationHistory(
        req.tenantId!,
        sessionId,
        limit ? parseInt(limit as string) : 50
      );

      res.json({ 
        success: true, 
        history,
        message: 'Conversation history retrieved successfully' 
      });
    } catch (error: any) {
      console.error('Error getting conversation history:', error);
      res.status(500).json({ error: error.message || 'Failed to get conversation history' });
    }
  });

  // Get financial insights
  router.get('/ai-chat/insights/:companyId', async (req: TenantRequest, res) => {
    const { companyId } = req.params;
    
    try {
      // Get financial summary for AI insights
      const invoices = await prisma.invoice.findMany({
        where: { tenantId: req.tenantId!, companyId },
        include: { customer: true }
      });

      const expenses = await prisma.expense.findMany({
        where: { tenantId: req.tenantId!, companyId },
        include: { category: true }
      });

      const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const netIncome = totalRevenue - totalExpenses;

      const insights = {
        financialSummary: {
          totalRevenue,
          totalExpenses,
          netIncome,
          profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
        },
        trends: {
          revenueGrowth: 0, // Would calculate from historical data
          expenseGrowth: 0,
          profitGrowth: 0
        },
        recommendations: [
          totalExpenses > totalRevenue ? 'Consider reducing expenses to improve profitability' : 'Great job maintaining profitability!',
          netIncome < 0 ? 'Focus on increasing revenue or reducing costs' : 'Your business is profitable!',
          'Consider automating invoice reminders to improve cash flow'
        ]
      };

      res.json({ 
        success: true, 
        insights,
        message: 'Financial insights generated successfully' 
      });
    } catch (error: any) {
      console.error('Error getting financial insights:', error);
      res.status(500).json({ error: error.message || 'Failed to get financial insights' });
    }
  });

  // Void invoice -> reverse journal entries and inventory movements
  router.post('/invoices/:id/void', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { reason, voidedBy } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Void reason is required' });
    }

    try {
      const invoice = await prisma.invoice.findFirst({ 
        where: { id, tenantId: req.tenantId }, 
        include: { 
          company: true, 
          customer: true, 
          lines: { include: { product: true } } 
        } 
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'voided') {
        return res.status(400).json({ error: 'Invoice is already voided' });
      }

      const result = await db.$transaction(async (tx) => {
        // 1. Mark original invoice as voided
        const voidedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: { 
            status: 'voided',
            notes: invoice.notes ? `${invoice.notes}\n\nVOIDED: ${reason}` : `VOIDED: ${reason}`
          }
        });

        // 2. Find and void original journal entries
        const originalJournalEntries = await tx.journalEntry.findMany({
          where: { 
            tenantId: req.tenantId!,
            reference: { 
              in: [invoice.invoiceNumber, `INV-${invoice.invoiceNumber}`]
            }
          },
          include: { lines: { include: { account: true } } }
        });

        // 3. Create reversing journal entries
        for (const originalEntry of originalJournalEntries) {
          // Mark original as voided
          await tx.journalEntry.update({
            where: { id: originalEntry.id },
            data: { 
              status: 'VOIDED',
              memo: `${originalEntry.memo} - VOIDED: ${reason}`
            }
          });

          // Create reversing entry
          const voidEntry = await tx.journalEntry.create({
            data: {
              tenantId: req.tenantId!,
              companyId: invoice.companyId,
              date: new Date(),
              memo: `Void: ${originalEntry.memo} - ${reason}`,
              reference: `VOID-${invoice.invoiceNumber}`,
              status: 'POSTED'
            }
          });

          // Create reversing journal lines
          for (const originalLine of originalEntry.lines) {
            await tx.journalLine.create({
              data: {
                tenantId: req.tenantId!,
                entryId: voidEntry.id,
                accountId: originalLine.accountId,
                debit: originalLine.credit, // Reverse: original credit becomes debit
                credit: originalLine.debit, // Reverse: original debit becomes credit
                memo: `Void: ${originalLine.memo || originalLine.account?.name || 'Entry reversal'}`
              }
            });
          }
        }

        // 4. Find and reverse inventory movements
        const originalMovements = await tx.inventoryMovement.findMany({
          where: {
            tenantId: req.tenantId!,
            reference: { 
              in: [invoice.invoiceNumber, `INV-${invoice.invoiceNumber}`]
            }
          },
          include: { product: true }
        });

        // 5. Create reversing inventory movements and restore stock
        for (const originalMovement of originalMovements) {
          const originalQuantity = Number(originalMovement.quantity);
          const reversingQuantity = -originalQuantity;

          // Create void movement
          await tx.inventoryMovement.create({
            data: {
              tenantId: req.tenantId!,
              productId: originalMovement.productId,
              movementType: 'VOID',
              quantity: reversingQuantity,
              movementDate: new Date(),
              reference: `VOID-${invoice.invoiceNumber}`,
              reason: `Inventory restoration - voided invoice ${invoice.invoiceNumber}: ${reason}`,
              unitCost: originalMovement.unitCost || 0
            }
          });

          // Update product stock quantity (restore the quantity)
          if (originalMovement.product) {
            const currentStock = Number(originalMovement.product.stockQuantity);
            const restoredStock = currentStock + Math.abs(reversingQuantity);
            
            await tx.product.update({
              where: { id: originalMovement.productId },
              data: { stockQuantity: restoredStock }
            });
          }
        }

        // 6. Create void activity log
        await tx.invoiceActivity.create({
          data: {
            tenantId: req.tenantId!,
            invoiceId: invoice.id,
            activityType: 'voided',
            description: `Invoice voided: ${reason}`,
            performedBy: voidedBy || 'system'
          }
        });

        return {
          voidedInvoice,
          reversedJournalEntries: originalJournalEntries.length,
          reversedInventoryMovements: originalMovements.length,
          reason
        };
      });

      res.json({
        success: true,
        message: 'Invoice voided successfully',
        data: result
      });

    } catch (error: any) {
      console.error('Error voiding invoice:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to void invoice',
        details: error.stack 
      });
    }
  });

  // Start new conversation session
  router.post('/ai-chat/start-session', async (req: TenantRequest, res) => {
    const { companyId } = req.body;
    const userId = (req as any).user?.id;
    
    try {
      if (!companyId || !userId) {
        return res.status(400).json({ error: 'Company ID and user ID are required' });
      }

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store initial system message
      await prisma.conversationMessage.create({
        data: {
          tenantId: req.tenantId!,
          sessionId,
          userId,
          role: 'system',
          content: 'AI accounting assistant session started',
          timestamp: new Date()
        }
      });

      res.json({ 
        success: true, 
        sessionId,
        message: 'Conversation session started successfully' 
      });
    } catch (error: any) {
      console.error('Error starting conversation session:', error);
      res.status(500).json({ error: error.message || 'Failed to start session' });
    }
  });
}

