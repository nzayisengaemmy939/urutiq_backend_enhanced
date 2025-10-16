import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

export interface GoodReceiptPDFData {
  receipt: {
    id: string;
    receiptNumber: string;
    receivedDate: Date;
    receivedBy?: string;
    notes?: string;
    purchaseOrder: {
      id: string;
      poNumber: string;
      orderDate: Date;
      expectedDelivery?: Date;
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
    };
    items: Array<{
      id: string;
      productId?: string;
      description: string;
      quantityReceived: number;
      quantityAccepted: number;
      quantityRejected: number;
      rejectionReason?: string;
      unitPrice?: number;
      lineTotal?: number;
      product?: {
        name: string;
        sku: string;
        description?: string;
      };
    }>;
  };
  generatedAt: Date;
  generatedBy?: string;
}

export class GoodReceiptPDFService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Generate PDF for a good receipt
   */
  async generateGoodReceiptPDF(receiptId: string, options: {
    generatedBy?: string;
  } = {}): Promise<Buffer> {
    try {
      // Fetch receipt data
      const receipt = await this.prisma.receipt.findUnique({
        where: { id: receiptId },
        include: {
          purchaseOrder: {
            include: {
              vendor: true,
              company: true
            }
          },
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!receipt) {
        throw new Error('Receipt not found');
      }

      const pdfData: GoodReceiptPDFData = {
        receipt: {
          id: receipt.id,
          receiptNumber: receipt.receiptNumber,
          receivedDate: receipt.receivedDate,
          receivedBy: receipt.receivedBy,
          notes: receipt.notes,
          purchaseOrder: {
            id: receipt.purchaseOrder.id,
            poNumber: receipt.purchaseOrder.poNumber,
            orderDate: receipt.purchaseOrder.orderDate,
            expectedDelivery: receipt.purchaseOrder.expectedDelivery,
            vendor: {
              name: receipt.purchaseOrder.vendor.name,
              email: receipt.purchaseOrder.vendor.email,
              phone: receipt.purchaseOrder.vendor.phone,
              address: receipt.purchaseOrder.vendor.address,
              city: receipt.purchaseOrder.vendor.city,
              state: receipt.purchaseOrder.vendor.state,
              zipCode: receipt.purchaseOrder.vendor.zipCode,
              country: receipt.purchaseOrder.vendor.country,
              taxId: receipt.purchaseOrder.vendor.taxId
            },
            company: {
              name: receipt.purchaseOrder.company.name,
              legalName: receipt.purchaseOrder.company.legalName,
              address: receipt.purchaseOrder.company.address,
              city: receipt.purchaseOrder.company.city,
              state: receipt.purchaseOrder.company.state,
              zipCode: receipt.purchaseOrder.company.zipCode,
              country: receipt.purchaseOrder.company.country,
              phone: receipt.purchaseOrder.company.phone,
              email: receipt.purchaseOrder.company.email,
              website: receipt.purchaseOrder.company.website,
              taxId: receipt.purchaseOrder.company.taxId
            }
          },
          items: receipt.items.map(item => ({
            id: item.id,
            productId: item.productId,
            description: item.description,
            quantityReceived: item.quantityReceived,
            quantityAccepted: item.quantityAccepted,
            quantityRejected: item.quantityRejected,
            rejectionReason: item.rejectionReason,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            product: item.product ? {
              name: item.product.name,
              sku: item.product.sku,
              description: item.product.description
            } : undefined
          }))
        },
        generatedAt: new Date(),
        generatedBy: options.generatedBy
      };

      // Generate HTML content
      const htmlContent = this.generateHTML(pdfData, options);

      // Generate PDF using Puppeteer
      const pdfBuffer = await this.generatePDF(htmlContent);

      return Buffer.from(pdfBuffer);

    } catch (error) {
      console.error('Error generating good receipt PDF:', error);
      throw error;
    }
  }

  /**
   * Generate PDF for a purchase order (creates receipt on the fly)
   */
  async generatePurchaseOrderReceiptPDF(purchaseOrderId: string, options: {
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

      // Create receipt data from purchase order
      const receiptData: GoodReceiptPDFData = {
        receipt: {
          id: `temp-${purchaseOrderId}`,
          receiptNumber: `RCV-${purchaseOrder.poNumber}`,
          receivedDate: new Date(),
          receivedBy: 'System',
          notes: 'Auto-generated receipt from purchase order',
          purchaseOrder: {
            id: purchaseOrder.id,
            poNumber: purchaseOrder.poNumber,
            orderDate: purchaseOrder.orderDate,
            expectedDelivery: purchaseOrder.expectedDelivery || undefined,
            vendor: {
              name: purchaseOrder.vendor.name,
              email: purchaseOrder.vendor.email || undefined,
              phone: purchaseOrder.vendor.phone || undefined,
              address: purchaseOrder.vendor.address || undefined,
              city: purchaseOrder.vendor.city || undefined,
              state: purchaseOrder.vendor.state || undefined,
              zipCode: purchaseOrder.vendor.zipCode || undefined,
              country: purchaseOrder.vendor.country || undefined,
              taxId: purchaseOrder.vendor.taxNumber || undefined
            },
            company: {
              name: purchaseOrder.company.name,
              legalName: purchaseOrder.company.legalName || undefined,
              address: purchaseOrder.company.address || undefined,
              city: purchaseOrder.company.city || undefined,
              state: purchaseOrder.company.state || undefined,
              zipCode: purchaseOrder.company.zipCode || undefined,
              country: purchaseOrder.company.country || undefined,
              phone: purchaseOrder.company.phone || undefined,
              email: purchaseOrder.company.email || undefined,
              website: purchaseOrder.company.website || undefined,
              taxId: purchaseOrder.company.taxId || undefined
            }
          },
          items: purchaseOrder.lines.map(line => ({
            id: line.id,
            productId: line.productId || undefined,
            description: line.description || 'No description',
            quantityReceived: Number(line.quantity),
            quantityAccepted: Number(line.quantity),
            quantityRejected: 0,
            rejectionReason: undefined,
            unitPrice: Number(line.unitPrice),
            lineTotal: Number(line.lineTotal),
            product: line.product ? {
              name: line.product.name,
              sku: line.product.sku,
              description: line.product.description || undefined
            } : undefined
          }))
        },
        generatedAt: new Date(),
        generatedBy: options.generatedBy
      };

      // Generate HTML content
      const htmlContent = this.generateHTML(receiptData, options);

      // Generate PDF using Puppeteer
      const pdfBuffer = await this.generatePDF(htmlContent);

      return Buffer.from(pdfBuffer);

    } catch (error) {
      console.error('Error generating purchase order receipt PDF:', error);
      throw error;
    }
  }

  /**
   * Generate HTML content for the PDF
   */
  private generateHTML(data: GoodReceiptPDFData, options: any): string {
    const { receipt } = data;
    const totalReceived = receipt.items.reduce((sum, item) => sum + item.quantityReceived, 0);
    const totalAccepted = receipt.items.reduce((sum, item) => sum + item.quantityAccepted, 0);
    const totalRejected = receipt.items.reduce((sum, item) => sum + item.quantityRejected, 0);
    const totalValue = receipt.items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Good Receipt - ${receipt.receiptNumber}</title>
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
            border-bottom: 3px solid #059669;
        }

        .company-info {
            flex: 1;
        }

        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 5px;
        }

        .company-details {
            font-size: 11px;
            color: #666;
            line-height: 1.4;
        }

        .receipt-info {
            text-align: right;
            flex: 1;
        }

        .receipt-title {
            font-size: 28px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 10px;
        }

        .receipt-number {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }

        .receipt-date {
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
            color: #059669;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .address-content {
            font-size: 11px;
            line-height: 1.4;
            color: #333;
        }

        .receipt-details {
            background: #f0fdf4;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            border-left: 4px solid #059669;
        }

        .receipt-details-grid {
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
            background: #059669;
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
            background: #e6fffa;
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

        .summary-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }

        .summary-table {
            width: 300px;
            border-collapse: collapse;
        }

        .summary-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 11px;
        }

        .summary-table .label {
            text-align: right;
            font-weight: 500;
            color: #666;
        }

        .summary-table .value {
            text-align: right;
            font-weight: bold;
            color: #333;
        }

        .summary-table .total-row {
            background: #059669;
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
            color: #059669;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .notes-content {
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            background: #f0fdf4;
            padding: 10px;
            border-radius: 3px;
            border-left: 3px solid #059669;
        }

        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
        }

        .signature-block {
            text-align: center;
            width: 200px;
        }

        .signature-line {
            border-bottom: 1px solid #333;
            margin-bottom: 5px;
            height: 40px;
        }

        .signature-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
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
            background: #dcfce7;
            color: #16a34a;
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
                <div class="company-name">${receipt.purchaseOrder.company.name}</div>
                <div class="company-details">
                    ${receipt.purchaseOrder.company.legalName ? `<div>${receipt.purchaseOrder.company.legalName}</div>` : ''}
                    ${receipt.purchaseOrder.company.address ? `<div>${receipt.purchaseOrder.company.address}</div>` : ''}
                    ${receipt.purchaseOrder.company.city || receipt.purchaseOrder.company.state ? `<div>${[receipt.purchaseOrder.company.city, receipt.purchaseOrder.company.state, receipt.purchaseOrder.company.zipCode].filter(Boolean).join(', ')}</div>` : ''}
                    ${receipt.purchaseOrder.company.country ? `<div>${receipt.purchaseOrder.company.country}</div>` : ''}
                    ${receipt.purchaseOrder.company.phone ? `<div>Phone: ${receipt.purchaseOrder.company.phone}</div>` : ''}
                    ${receipt.purchaseOrder.company.email ? `<div>Email: ${receipt.purchaseOrder.company.email}</div>` : ''}
                    ${receipt.purchaseOrder.company.website ? `<div>Web: ${receipt.purchaseOrder.company.website}</div>` : ''}
                    ${receipt.purchaseOrder.company.taxId ? `<div>Tax ID: ${receipt.purchaseOrder.company.taxId}</div>` : ''}
                </div>
            </div>
            <div class="receipt-info">
                <div class="receipt-title">GOOD RECEIPT</div>
                <div class="receipt-number">${receipt.receiptNumber}</div>
                <div class="receipt-date">Date: ${receipt.receivedDate.toLocaleDateString()}</div>
                <div class="status-badge">RECEIVED</div>
            </div>
        </div>

        <!-- Addresses -->
        <div class="addresses">
            <div class="address-block">
                <div class="address-title">Received By</div>
                <div class="address-content">
                    <div class="font-bold">${receipt.purchaseOrder.company.name}</div>
                    ${receipt.purchaseOrder.company.address ? `<div>${receipt.purchaseOrder.company.address}</div>` : ''}
                    ${receipt.purchaseOrder.company.city || receipt.purchaseOrder.company.state ? `<div>${[receipt.purchaseOrder.company.city, receipt.purchaseOrder.company.state, receipt.purchaseOrder.company.zipCode].filter(Boolean).join(', ')}</div>` : ''}
                    ${receipt.purchaseOrder.company.country ? `<div>${receipt.purchaseOrder.company.country}</div>` : ''}
                </div>
            </div>
            <div class="address-block">
                <div class="address-title">Delivered By</div>
                <div class="address-content">
                    <div class="font-bold">${receipt.purchaseOrder.vendor.name}</div>
                    ${receipt.purchaseOrder.vendor.address ? `<div>${receipt.purchaseOrder.vendor.address}</div>` : ''}
                    ${receipt.purchaseOrder.vendor.city || receipt.purchaseOrder.vendor.state ? `<div>${[receipt.purchaseOrder.vendor.city, receipt.purchaseOrder.vendor.state, receipt.purchaseOrder.vendor.zipCode].filter(Boolean).join(', ')}</div>` : ''}
                    ${receipt.purchaseOrder.vendor.country ? `<div>${receipt.purchaseOrder.vendor.country}</div>` : ''}
                    ${receipt.purchaseOrder.vendor.phone ? `<div>Phone: ${receipt.purchaseOrder.vendor.phone}</div>` : ''}
                    ${receipt.purchaseOrder.vendor.email ? `<div>Email: ${receipt.purchaseOrder.vendor.email}</div>` : ''}
                    ${receipt.purchaseOrder.vendor.taxId ? `<div>Tax ID: ${receipt.purchaseOrder.vendor.taxId}</div>` : ''}
                </div>
            </div>
        </div>

        <!-- Receipt Details -->
        <div class="receipt-details">
            <div class="receipt-details-grid">
                <div class="detail-item">
                    <div class="detail-label">Receipt Date</div>
                    <div class="detail-value">${receipt.receivedDate.toLocaleDateString()}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Purchase Order</div>
                    <div class="detail-value">${receipt.purchaseOrder.poNumber}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Received By</div>
                    <div class="detail-value">${receipt.receivedBy || 'System'}</div>
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
                    <th style="width: 10%;" class="text-center">Received</th>
                    <th style="width: 10%;" class="text-center">Accepted</th>
                    <th style="width: 10%;" class="text-center">Rejected</th>
                    <th style="width: 12%;" class="text-right">Unit Price</th>
                    <th style="width: 10%;" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${receipt.items.map((item, index) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="font-bold">${item.product?.sku || '-'}</td>
                    <td>
                        <div class="font-bold">${item.description}</div>
                        ${item.product?.description ? `<div style="font-size: 10px; color: #666; margin-top: 2px;">${item.product.description}</div>` : ''}
                        ${item.rejectionReason ? `<div style="font-size: 10px; color: #dc2626; margin-top: 2px; font-style: italic;">Rejected: ${item.rejectionReason}</div>` : ''}
                    </td>
                    <td class="text-center">${item.quantityReceived.toLocaleString()}</td>
                    <td class="text-center">${item.quantityAccepted.toLocaleString()}</td>
                    <td class="text-center">${item.quantityRejected.toLocaleString()}</td>
                    <td class="text-right">${item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}</td>
                    <td class="text-right font-bold">${item.lineTotal ? `$${item.lineTotal.toFixed(2)}` : '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Summary -->
        <div class="summary-section">
            <table class="summary-table">
                <tr>
                    <td class="label">Total Received:</td>
                    <td class="value">${totalReceived.toLocaleString()}</td>
                </tr>
                <tr>
                    <td class="label">Total Accepted:</td>
                    <td class="value">${totalAccepted.toLocaleString()}</td>
                </tr>
                <tr>
                    <td class="label">Total Rejected:</td>
                    <td class="value">${totalRejected.toLocaleString()}</td>
                </tr>
                ${totalValue > 0 ? `
                <tr class="total-row">
                    <td class="label">Total Value:</td>
                    <td class="value">$${totalValue.toFixed(2)}</td>
                </tr>
                ` : ''}
            </table>
        </div>

        <!-- Notes -->
        ${receipt.notes ? `
        <div class="notes-section">
            <div class="notes-title">Notes</div>
            <div class="notes-content">${receipt.notes}</div>
        </div>
        ` : ''}

        <!-- Signatures -->
        <div class="signature-section">
            <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">Received By</div>
            </div>
            <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">Delivered By</div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div>This good receipt was generated on ${data.generatedAt.toLocaleString()}</div>
            ${data.generatedBy ? `<div>Generated by: ${data.generatedBy}</div>` : ''}
            <div style="margin-top: 10px;">
                <div>Please sign and return one copy for our records</div>
                <div>For questions, contact us at ${receipt.purchaseOrder.company.email || receipt.purchaseOrder.company.phone}</div>
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
  async savePDFToFile(receiptId: string, filePath: string, options: any = {}): Promise<void> {
    const pdfBuffer = await this.generateGoodReceiptPDF(receiptId, options);
    fs.writeFileSync(filePath, pdfBuffer);
  }

  /**
   * Get PDF as base64 string for email attachment
   */
  async getPDFAsBase64(receiptId: string, options: any = {}): Promise<string> {
    const pdfBuffer = await this.generateGoodReceiptPDF(receiptId, options);
    return pdfBuffer.toString('base64');
  }
}

export const goodReceiptPDFService = new GoodReceiptPDFService();
