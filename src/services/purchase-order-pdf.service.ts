import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

export interface PurchaseOrderPDFData {
  purchaseOrder: {
    id: string;
    poNumber: string;
    orderDate: Date;
    expectedDelivery?: Date;
    status: string;
    totalAmount: number;
    notes?: string;
    terms?: string;
    vendor: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      taxId?: string;
    };
    company: {
      name: string;
      legalName?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      phone?: string;
      email?: string;
      website?: string;
      taxId?: string;
    };
    lines: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      lineTotal: number;
      receivedQuantity?: number;
      notes?: string;
      product: {
        name: string;
        sku: string;
        description?: string;
      };
    }>;
  };
  generatedAt: Date;
  generatedBy?: string;
}

export class PurchaseOrderPDFService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Generate PDF for a purchase order
   */
  async generatePurchaseOrderPDF(purchaseOrderId: string, options: {
    includeReceived?: boolean;
    generatedBy?: string;
  } = {}): Promise<Buffer> {
    try {
      // Fetch purchase order data
      const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
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

      if (!purchaseOrder) {
        throw new Error('Purchase order not found');
      }

      const pdfData: PurchaseOrderPDFData = {
        purchaseOrder: {
          id: purchaseOrder.id,
          poNumber: purchaseOrder.poNumber,
          orderDate: purchaseOrder.orderDate,
          expectedDelivery: purchaseOrder.expectedDelivery || undefined,
          status: purchaseOrder.status,
          totalAmount: Number(purchaseOrder.totalAmount),
          notes: purchaseOrder.notes || undefined,
          terms: purchaseOrder.terms || undefined,
          vendor: {
            name: purchaseOrder.vendor.name,
            email: purchaseOrder.vendor.email || undefined,
            phone: purchaseOrder.vendor.phone || undefined,
            address: purchaseOrder.vendor.address || undefined,
            city: undefined, // Vendor model doesn't have city
            state: undefined, // Vendor model doesn't have state
            zipCode: undefined, // Vendor model doesn't have zipCode
            country: undefined, // Vendor model doesn't have country
            taxId: purchaseOrder.vendor.taxNumber || undefined
          },
          company: {
            name: purchaseOrder.company.name,
            legalName: undefined, // Company model doesn't have legalName
            address: purchaseOrder.company.address || undefined,
            city: purchaseOrder.company.city || undefined,
            state: purchaseOrder.company.state || undefined,
            zipCode: undefined, // Company model doesn't have zipCode
            country: purchaseOrder.company.country || undefined,
            phone: purchaseOrder.company.phone || undefined,
            email: purchaseOrder.company.email || undefined,
            website: undefined, // Company model doesn't have website
            taxId: undefined // Company model doesn't have taxId
          },
          lines: purchaseOrder.lines.map(line => ({
            id: line.id,
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            taxRate: Number(line.taxRate),
            lineTotal: Number(line.lineTotal),
            receivedQuantity: line.receivedQuantity ? Number(line.receivedQuantity) : undefined,
            notes: undefined, // Line model doesn't have notes
            product: {
              name: line.product.name,
              sku: line.product.sku,
              description: line.product.description || undefined
            }
          }))
        },
        generatedAt: new Date(),
        generatedBy: options.generatedBy
      };

      // Generate HTML content
      const htmlContent = this.generateHTML(pdfData, options);

      // Generate PDF using Puppeteer
      const pdfBuffer = await this.generatePDF(htmlContent);

      return pdfBuffer;

    } catch (error) {
      console.error('Error generating purchase order PDF:', error);
      throw error;
    }
  }

  /**
   * Generate HTML content for the PDF
   */
  private generateHTML(data: PurchaseOrderPDFData, options: any): string {
    const { purchaseOrder } = data;
    const subtotal = purchaseOrder.lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const totalTax = purchaseOrder.lines.reduce((sum, line) => sum + (line.lineTotal * line.taxRate / 100), 0);
    const grandTotal = subtotal + totalTax;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Purchase Order - ${purchaseOrder.poNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            font-size: 12px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2c5aa0;
        }

        .company-info {
            flex: 1;
        }

        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 5px;
        }

        .company-details {
            font-size: 11px;
            color: #666;
            line-height: 1.4;
        }

        .po-info {
            text-align: right;
            flex: 1;
        }

        .po-title {
            font-size: 28px;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 10px;
        }

        .po-number {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }

        .po-date {
            font-size: 12px;
            color: #666;
        }

        .addresses {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }

        .address-block {
            flex: 1;
            margin-right: 20px;
        }

        .address-block:last-child {
            margin-right: 0;
        }

        .address-title {
            font-weight: bold;
            font-size: 14px;
            color: #2c5aa0;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .address-content {
            font-size: 11px;
            line-height: 1.4;
            color: #333;
        }

        .po-details {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
        }

        .po-details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
        }

        .detail-item {
            display: flex;
            flex-direction: column;
        }

        .detail-label {
            font-weight: bold;
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
        }

        .detail-value {
            font-size: 12px;
            color: #333;
            font-weight: 500;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
        }

        .items-table th {
            background: #2c5aa0;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .items-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 11px;
            vertical-align: top;
        }

        .items-table tr:nth-child(even) {
            background: #f8f9fa;
        }

        .items-table tr:hover {
            background: #e3f2fd;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .font-bold {
            font-weight: bold;
        }

        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }

        .totals-table {
            width: 300px;
            border-collapse: collapse;
        }

        .totals-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 11px;
        }

        .totals-table .label {
            text-align: right;
            font-weight: 500;
            color: #666;
        }

        .totals-table .value {
            text-align: right;
            font-weight: bold;
            color: #333;
        }

        .totals-table .total-row {
            background: #2c5aa0;
            color: white;
            font-weight: bold;
            font-size: 14px;
        }

        .notes-section {
            margin-bottom: 30px;
        }

        .notes-title {
            font-weight: bold;
            font-size: 12px;
            color: #2c5aa0;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .notes-content {
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            background: #f8f9fa;
            padding: 10px;
            border-radius: 3px;
            border-left: 3px solid #2c5aa0;
        }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 10px;
            color: #666;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-draft {
            background: #f3f4f6;
            color: #6b7280;
        }

        .status-sent {
            background: #dbeafe;
            color: #1d4ed8;
        }

        .status-confirmed {
            background: #dcfce7;
            color: #16a34a;
        }

        .status-delivered {
            background: #dcfce7;
            color: #16a34a;
        }

        .status-cancelled {
            background: #fecaca;
            color: #dc2626;
        }

        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .container {
                max-width: none;
                margin: 0;
                padding: 0;
            }
            
            .no-print {
                display: none;
            }
        }

        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="company-info">
                <div class="company-name">${purchaseOrder.company.name}</div>
                <div class="company-details">
                    ${purchaseOrder.company.legalName ? `<div>${purchaseOrder.company.legalName}</div>` : ''}
                    ${purchaseOrder.company.address ? `<div>${purchaseOrder.company.address}</div>` : ''}
                    ${purchaseOrder.company.city || purchaseOrder.company.state ? `<div>${[purchaseOrder.company.city, purchaseOrder.company.state, purchaseOrder.company.zipCode].filter(Boolean).join(', ')}</div>` : ''}
                    ${purchaseOrder.company.country ? `<div>${purchaseOrder.company.country}</div>` : ''}
                    ${purchaseOrder.company.phone ? `<div>Phone: ${purchaseOrder.company.phone}</div>` : ''}
                    ${purchaseOrder.company.email ? `<div>Email: ${purchaseOrder.company.email}</div>` : ''}
                    ${purchaseOrder.company.website ? `<div>Web: ${purchaseOrder.company.website}</div>` : ''}
                    ${purchaseOrder.company.taxId ? `<div>Tax ID: ${purchaseOrder.company.taxId}</div>` : ''}
                </div>
            </div>
            <div class="po-info">
                <div class="po-title">PURCHASE ORDER</div>
                <div class="po-number">${purchaseOrder.poNumber}</div>
                <div class="po-date">Date: ${purchaseOrder.orderDate.toLocaleDateString()}</div>
                <div class="status-badge status-${purchaseOrder.status}">${purchaseOrder.status}</div>
            </div>
        </div>

        <!-- Addresses -->
        <div class="addresses">
            <div class="address-block">
                <div class="address-title">Bill To</div>
                <div class="address-content">
                    <div class="font-bold">${purchaseOrder.company.name}</div>
                    ${purchaseOrder.company.address ? `<div>${purchaseOrder.company.address}</div>` : ''}
                    ${purchaseOrder.company.city || purchaseOrder.company.state ? `<div>${[purchaseOrder.company.city, purchaseOrder.company.state, purchaseOrder.company.zipCode].filter(Boolean).join(', ')}</div>` : ''}
                    ${purchaseOrder.company.country ? `<div>${purchaseOrder.company.country}</div>` : ''}
                </div>
            </div>
            <div class="address-block">
                <div class="address-title">Ship To</div>
                <div class="address-content">
                    <div class="font-bold">${purchaseOrder.vendor.name}</div>
                    ${purchaseOrder.vendor.address ? `<div>${purchaseOrder.vendor.address}</div>` : ''}
                    ${purchaseOrder.vendor.city || purchaseOrder.vendor.state ? `<div>${[purchaseOrder.vendor.city, purchaseOrder.vendor.state, purchaseOrder.vendor.zipCode].filter(Boolean).join(', ')}</div>` : ''}
                    ${purchaseOrder.vendor.country ? `<div>${purchaseOrder.vendor.country}</div>` : ''}
                    ${purchaseOrder.vendor.phone ? `<div>Phone: ${purchaseOrder.vendor.phone}</div>` : ''}
                    ${purchaseOrder.vendor.email ? `<div>Email: ${purchaseOrder.vendor.email}</div>` : ''}
                    ${purchaseOrder.vendor.taxId ? `<div>Tax ID: ${purchaseOrder.vendor.taxId}</div>` : ''}
                </div>
            </div>
        </div>

        <!-- PO Details -->
        <div class="po-details">
            <div class="po-details-grid">
                <div class="detail-item">
                    <div class="detail-label">Order Date</div>
                    <div class="detail-value">${purchaseOrder.orderDate.toLocaleDateString()}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Expected Delivery</div>
                    <div class="detail-value">${purchaseOrder.expectedDelivery ? purchaseOrder.expectedDelivery.toLocaleDateString() : 'Not specified'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        <span class="status-badge status-${purchaseOrder.status}">${purchaseOrder.status}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 8%;">#</th>
                    <th style="width: 15%;">SKU</th>
                    <th style="width: 25%;">Description</th>
                    <th style="width: 8%;" class="text-center">Qty</th>
                    <th style="width: 10%;" class="text-right">Unit Price</th>
                    <th style="width: 8%;" class="text-center">Tax %</th>
                    <th style="width: 12%;" class="text-right">Line Total</th>
                    ${options.includeReceived ? '<th style="width: 8%;" class="text-center">Received</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${purchaseOrder.lines.map((line, index) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="font-bold">${line.product.sku}</td>
                    <td>
                        <div class="font-bold">${line.product.name}</div>
                        ${line.product.description ? `<div style="font-size: 10px; color: #666; margin-top: 2px;">${line.product.description}</div>` : ''}
                        ${line.notes ? `<div style="font-size: 10px; color: #666; margin-top: 2px; font-style: italic;">Note: ${line.notes}</div>` : ''}
                    </td>
                    <td class="text-center">${line.quantity.toLocaleString()}</td>
                    <td class="text-right">$${line.unitPrice.toFixed(2)}</td>
                    <td class="text-center">${line.taxRate.toFixed(1)}%</td>
                    <td class="text-right font-bold">$${line.lineTotal.toFixed(2)}</td>
                    ${options.includeReceived ? `<td class="text-center">${line.receivedQuantity || 0}</td>` : ''}
                </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="label">Subtotal:</td>
                    <td class="value">$${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="label">Tax:</td>
                    <td class="value">$${totalTax.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td class="label">Total:</td>
                    <td class="value">$${grandTotal.toFixed(2)}</td>
                </tr>
            </table>
        </div>

        <!-- Notes -->
        ${purchaseOrder.notes || purchaseOrder.terms ? `
        <div class="notes-section">
            ${purchaseOrder.notes ? `
            <div class="notes-title">Notes</div>
            <div class="notes-content">${purchaseOrder.notes}</div>
            ` : ''}
            ${purchaseOrder.terms ? `
            <div class="notes-title">Terms & Conditions</div>
            <div class="notes-content">${purchaseOrder.terms}</div>
            ` : ''}
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <div>This purchase order was generated on ${data.generatedAt.toLocaleString()}</div>
            ${data.generatedBy ? `<div>Generated by: ${data.generatedBy}</div>` : ''}
            <div style="margin-top: 10px;">
                <div>Please confirm receipt of this purchase order</div>
                <div>For questions, contact us at ${purchaseOrder.company.email || purchaseOrder.company.phone}</div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate PDF using Puppeteer
   */
  private async generatePDF(htmlContent: string): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set page size for A4
      await page.setViewport({ width: 800, height: 600 });
      
      // Set content with timeout
      await page.setContent(htmlContent, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });

      // Wait for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        displayHeaderFooter: false,
        timeout: 30000
      });

      return Buffer.from(pdfBuffer);

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Save PDF to file system
   */
  async savePDFToFile(purchaseOrderId: string, filePath: string, options: any = {}): Promise<void> {
    const pdfBuffer = await this.generatePurchaseOrderPDF(purchaseOrderId, options);
    fs.writeFileSync(filePath, pdfBuffer);
  }

  /**
   * Get PDF as base64 string for email attachment
   */
  async getPDFAsBase64(purchaseOrderId: string, options: any = {}): Promise<string> {
    const pdfBuffer = await this.generatePurchaseOrderPDF(purchaseOrderId, options);
    return pdfBuffer.toString('base64');
  }
}

export const purchaseOrderPDFService = new PurchaseOrderPDFService();