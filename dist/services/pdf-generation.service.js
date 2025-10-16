import puppeteer from 'puppeteer';
import { prisma } from '../prisma.js';
export class PDFGenerationService {
    async generateHTML(entryData, options = {}) {
        const { entry, lines, auditTrail } = entryData;
        const { includeAuditTrail = true, includeCompanyHeader = true, format = 'detailed' } = options;
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount);
        };
        const formatDate = (dateString) => {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };
        const getStatusColor = (status) => {
            switch (status) {
                case 'POSTED': return '#10b981';
                case 'DRAFT': return '#6b7280';
                case 'PENDING_APPROVAL': return '#f59e0b';
                case 'REVERSED': return '#ef4444';
                default: return '#6b7280';
            }
        };
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Journal Entry - ${entry.reference}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
          }
          
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          
          .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .company-header {
            text-align: center;
            margin-bottom: 20px;
          }
          
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
          }
          
          .company-details {
            font-size: 14px;
            color: #6b7280;
          }
          
          .document-title {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            text-align: center;
            margin-bottom: 10px;
          }
          
          .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          
          .entry-info {
            flex: 1;
          }
          
          .entry-info h3 {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 15px;
          }
          
          .info-row {
            display: flex;
            margin-bottom: 8px;
          }
          
          .info-label {
            font-weight: 600;
            color: #374151;
            min-width: 120px;
          }
          
          .info-value {
            color: #6b7280;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            color: white;
            background: ${getStatusColor(entry.status)};
          }
          
          .amount-summary {
            text-align: right;
            padding: 20px;
            background: #f0f9ff;
            border-radius: 8px;
            border: 1px solid #bae6fd;
          }
          
          .total-amount {
            font-size: 24px;
            font-weight: bold;
            color: #0369a1;
            margin-bottom: 5px;
          }
          
          .balance-status {
            font-size: 14px;
            color: ${entry.isBalanced ? '#059669' : '#dc2626'};
            font-weight: 600;
          }
          
          .lines-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .lines-table th {
            background: #1e40af;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
          }
          
          .lines-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
          }
          
          .lines-table tr:nth-child(even) {
            background: #f9fafb;
          }
          
          .lines-table tr:hover {
            background: #f3f4f6;
          }
          
          .account-code {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #6b7280;
          }
          
          .account-name {
            font-weight: 600;
            color: #1f2937;
          }
          
          .account-type {
            font-size: 12px;
            color: #6b7280;
            font-style: italic;
          }
          
          .debit-amount, .credit-amount {
            text-align: right;
            font-weight: 600;
            font-family: 'Courier New', monospace;
          }
          
          .debit-amount {
            color: #dc2626;
          }
          
          .credit-amount {
            color: #059669;
          }
          
          .zero-amount {
            color: #9ca3af;
          }
          
          .memo-text {
            font-style: italic;
            color: #6b7280;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .audit-trail {
            margin-top: 40px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          
          .audit-trail h3 {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 15px;
          }
          
          .audit-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .audit-item:last-child {
            border-bottom: none;
          }
          
          .audit-action {
            font-weight: 600;
            color: #1f2937;
          }
          
          .audit-user {
            color: #6b7280;
            font-size: 14px;
          }
          
          .audit-timestamp {
            color: #9ca3af;
            font-size: 12px;
          }
          
          .audit-comments {
            color: #6b7280;
            font-size: 14px;
            margin-top: 5px;
            font-style: italic;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          
          .print-date {
            margin-bottom: 10px;
          }
          
          @media print {
            body { margin: 0; }
            .container { max-width: none; padding: 0; }
            .lines-table { page-break-inside: avoid; }
            .audit-trail { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${includeCompanyHeader && entry.company ? `
            <div class="company-header">
              <div class="company-name">${entry.company.name}</div>
              ${entry.company.address ? `<div class="company-details">${entry.company.address}</div>` : ''}
              ${entry.company.phone ? `<div class="company-details">Phone: ${entry.company.phone}</div>` : ''}
              ${entry.company.email ? `<div class="company-details">Email: ${entry.company.email}</div>` : ''}
            </div>
          ` : ''}
          
          <div class="document-title">Journal Entry</div>
          
          <div class="entry-header">
            <div class="entry-info">
              <h3>Entry Details</h3>
              <div class="info-row">
                <span class="info-label">Reference:</span>
                <span class="info-value">${entry.reference}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">${formatDate(entry.date)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="status-badge">${entry.status.replace('_', ' ')}</span>
              </div>
              ${entry.entryType ? `
                <div class="info-row">
                  <span class="info-label">Type:</span>
                  <span class="info-value">${entry.entryType.name}</span>
                </div>
              ` : ''}
              ${entry.createdBy ? `
                <div class="info-row">
                  <span class="info-label">Created by:</span>
                  <span class="info-value">${entry.createdBy.name}</span>
                </div>
              ` : ''}
            </div>
            
            <div class="amount-summary">
              <div class="total-amount">${formatCurrency(Math.max(entry.totalDebit, entry.totalCredit))}</div>
              <div class="balance-status">
                ${entry.isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
              </div>
            </div>
          </div>
          
          ${entry.memo ? `
            <div style="margin-bottom: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #2563eb;">
              <strong>Memo:</strong> ${entry.memo}
            </div>
          ` : ''}
          
          <table class="lines-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Description</th>
                <th style="text-align: right;">Debit</th>
                <th style="text-align: right;">Credit</th>
                ${format === 'detailed' ? '<th>Memo</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${lines.map(line => `
                <tr>
                  <td>
                    <div class="account-code">${line.account.code}</div>
                    <div class="account-name">${line.account.name}</div>
                    <div class="account-type">${line.account.type}</div>
                  </td>
                  <td>
                    ${line.memo || '-'}
                    ${line.department ? `<br><small>Dept: ${line.department}</small>` : ''}
                    ${line.project ? `<br><small>Project: ${line.project}</small>` : ''}
                    ${line.location ? `<br><small>Location: ${line.location}</small>` : ''}
                  </td>
                  <td class="debit-amount ${line.debit === 0 ? 'zero-amount' : ''}">
                    ${line.debit > 0 ? formatCurrency(line.debit) : '-'}
                  </td>
                  <td class="credit-amount ${line.credit === 0 ? 'zero-amount' : ''}">
                    ${line.credit > 0 ? formatCurrency(line.credit) : '-'}
                  </td>
                  ${format === 'detailed' ? `
                    <td class="memo-text">${line.memo || '-'}</td>
                  ` : ''}
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f3f4f6; font-weight: bold;">
                <td colspan="2">TOTALS</td>
                <td class="debit-amount">${formatCurrency(entry.totalDebit)}</td>
                <td class="credit-amount">${formatCurrency(entry.totalCredit)}</td>
                ${format === 'detailed' ? '<td></td>' : ''}
              </tr>
            </tfoot>
          </table>
          
          ${includeAuditTrail && auditTrail && auditTrail.length > 0 ? `
            <div class="audit-trail">
              <h3>Audit Trail</h3>
              ${auditTrail.map(audit => `
                <div class="audit-item">
                  <div>
                    <div class="audit-action">${audit.action.replace('_', ' ')}</div>
                    <div class="audit-user">by ${audit.user}</div>
                    ${audit.comments ? `<div class="audit-comments">${audit.comments}</div>` : ''}
                  </div>
                  <div class="audit-timestamp">${formatDate(audit.timestamp)}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="footer">
            <div class="print-date">Printed on ${formatDate(new Date().toISOString())}</div>
            <div>Journal Entry ${entry.reference} - ${entry.status.replace('_', ' ')}</div>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    async generatePDF(entryId, options = {}, retryCount = 0) {
        const maxRetries = 2;
        try {
            // Fetch entry data
            const entry = await prisma.journalEntry.findUnique({
                where: { id: entryId },
                include: {
                    lines: {
                        include: {
                            account: true
                        }
                    },
                    entryType: true,
                    company: true
                }
            });
            if (!entry) {
                throw new Error('Journal entry not found');
            }
            // Audit trail feature temporarily disabled until Prisma schema is fixed
            const auditTrail = [];
            // Calculate totals
            const totalDebit = (entry.lines || []).reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
            const totalCredit = (entry.lines || []).reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
            // Prepare data
            const entryData = {
                entry: {
                    id: entry.id,
                    reference: entry.reference || 'N/A',
                    date: entry.date.toISOString(),
                    memo: entry.memo || '',
                    status: entry.status,
                    totalDebit,
                    totalCredit,
                    isBalanced,
                    createdBy: entry.createdBy || undefined,
                    entryType: entry.entryType || undefined,
                    company: entry.company || undefined
                },
                lines: (entry.lines || []).map((line) => ({
                    account: {
                        name: line.account.name,
                        code: line.account.code,
                        type: line.account.type
                    },
                    debit: Number(line.debit) || 0,
                    credit: Number(line.credit) || 0,
                    memo: line.memo,
                    department: line.department,
                    project: line.project,
                    location: line.location
                })),
                auditTrail: options.includeAuditTrail ? auditTrail.map((audit) => ({
                    action: audit.action,
                    user: audit.user?.name || 'System',
                    timestamp: audit.createdAt.toISOString(),
                    comments: audit.comments
                })) : undefined
            };
            // Generate HTML
            const html = await this.generateHTML(entryData, options);
            // Launch Puppeteer with additional stability options
            const browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ],
                timeout: 60000 // 60 seconds for browser launch
            });
            try {
                const page = await browser.newPage();
                // Set a longer timeout for page operations
                page.setDefaultTimeout(60000); // 60 seconds
                // Set content with more reliable wait condition
                await page.setContent(html, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });
                // Wait a bit for any dynamic content to load
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
                    timeout: 30000 // 30 seconds for PDF generation
                });
                return Buffer.from(pdfBuffer);
            }
            finally {
                await browser.close();
            }
        }
        catch (error) {
            console.error('Error generating PDF for entry', entryId, ':', error.message);
            if (error.name === 'TimeoutError' && retryCount < maxRetries) {
                console.log(`Retrying PDF generation for entry ${entryId} (attempt ${retryCount + 1}/${maxRetries})`);
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.generatePDF(entryId, options, retryCount + 1);
            }
            if (error.name === 'TimeoutError') {
                console.error('PDF generation timed out after all retries. This might be due to complex HTML content or resource loading issues.');
            }
            throw error;
        }
    }
    async generateMultiplePDFs(entryIds, options = {}) {
        try {
            const pdfBuffers = [];
            for (const entryId of entryIds) {
                const pdfBuffer = await this.generatePDF(entryId, options);
                pdfBuffers.push(pdfBuffer);
            }
            // For now, return the first PDF
            // In a production system, you might want to merge multiple PDFs
            return pdfBuffers[0];
        }
        catch (error) {
            console.error('Error generating multiple PDFs:', error);
            throw error;
        }
    }
}
export const pdfGenerationService = new PDFGenerationService();
