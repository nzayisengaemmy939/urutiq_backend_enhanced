import nodemailer from 'nodemailer';
import { prisma } from '../prisma';
// Email configuration
const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
};
// Create transporter with proper default export handling
let transporter = null;
// Initialize transporter lazily with ESM compatibility
function getTransporter() {
    if (!transporter) {
        // Handle both default and named exports
        const createTransport = nodemailer.default?.createTransport || nodemailer.createTransport || nodemailer;
        if (typeof createTransport === 'function') {
            transporter = createTransport(emailConfig);
        }
        else if (typeof nodemailer.createTransport === 'function') {
            transporter = nodemailer.createTransport(emailConfig);
        }
        else {
            console.warn('Nodemailer not properly configured. Email functionality disabled.');
            // Return a mock transporter for development
            transporter = {
                sendMail: async () => ({ messageId: 'mock-message-id' })
            };
        }
    }
    return transporter;
}
export class EmailNotificationService {
    async sendEmail(to, subject, html, text) {
        try {
            const recipients = Array.isArray(to) ? to.join(', ') : to;
            const mailOptions = {
                from: `"${process.env.APP_NAME || 'UrutiIQ'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: recipients,
                subject,
                html,
                text: text || this.stripHtml(html)
            };
            const result = await getTransporter()?.sendMail(mailOptions);
            console.log('Email sent successfully:', result?.messageId);
            return { success: true, messageId: result?.messageId || 'no-id' };
        }
        catch (error) {
            console.error('Error sending email:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
    generateEmailTemplate(template, data) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const companyLogo = process.env.COMPANY_LOGO_URL || '';
        const commonStyles = `
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
        .footer { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6c757d; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .button:hover { background: #0056b3; }
        .alert { padding: 15px; margin: 15px 0; border-radius: 4px; }
        .alert-info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
        .alert-success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .alert-warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .alert-danger { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .entry-details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .entry-details h3 { margin: 0 0 10px 0; color: #495057; }
        .entry-details p { margin: 5px 0; }
        .amount { font-size: 18px; font-weight: bold; color: #28a745; }
        .reference { font-family: monospace; background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
      </style>
    `;
        switch (template) {
            case 'approval-request':
                return `
          <!DOCTYPE html>
          <html>
          <head>${commonStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-height: 50px;">` : ''}
                <h1>Journal Entry Approval Request</h1>
              </div>
              <div class="content">
                <div class="alert alert-info">
                  <strong>Action Required:</strong> A journal entry requires your approval.
                </div>
                
                <div class="entry-details">
                  <h3>Entry Details</h3>
                  <p><strong>Reference:</strong> <span class="reference">${data.entryReference}</span></p>
                  <p><strong>Date:</strong> ${new Date(data.entryDate).toLocaleDateString()}</p>
                  <p><strong>Amount:</strong> <span class="amount">$${data.entryAmount.toLocaleString()}</span></p>
                  <p><strong>Memo:</strong> ${data.entryMemo}</p>
                  <p><strong>Requested by:</strong> ${data.requesterName} (${data.requesterEmail})</p>
                </div>

                <p>Please review and approve or reject this journal entry at your earliest convenience.</p>
                
                <a href="${data.actionUrl}" class="button">Review Entry</a>
                
                <p><small>This is an automated notification. Please do not reply to this email.</small></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
                <p>This email was sent to ${data.approverEmail} regarding journal entry ${data.entryReference}.</p>
              </div>
            </div>
          </body>
          </html>
        `;
            case 'approval-approved':
                return `
          <!DOCTYPE html>
          <html>
          <head>${commonStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-height: 50px;">` : ''}
                <h1>Journal Entry Approved</h1>
              </div>
              <div class="content">
                <div class="alert alert-success">
                  <strong>Approved:</strong> Your journal entry has been approved.
                </div>
                
                <div class="entry-details">
                  <h3>Entry Details</h3>
                  <p><strong>Reference:</strong> <span class="reference">${data.entryReference}</span></p>
                  <p><strong>Date:</strong> ${new Date(data.entryDate).toLocaleDateString()}</p>
                  <p><strong>Amount:</strong> <span class="amount">$${data.entryAmount.toLocaleString()}</span></p>
                  <p><strong>Memo:</strong> ${data.entryMemo}</p>
                  <p><strong>Approved by:</strong> ${data.approverName} (${data.approverEmail})</p>
                </div>

                <p>The journal entry has been approved and is now posted to the general ledger.</p>
                
                <a href="${data.actionUrl}" class="button">View Entry</a>
                
                <p><small>This is an automated notification. Please do not reply to this email.</small></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
                <p>This email was sent to ${data.requesterEmail} regarding journal entry ${data.entryReference}.</p>
              </div>
            </div>
          </body>
          </html>
        `;
            case 'approval-rejected':
                return `
          <!DOCTYPE html>
          <html>
          <head>${commonStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-height: 50px;">` : ''}
                <h1>Journal Entry Rejected</h1>
              </div>
              <div class="content">
                <div class="alert alert-danger">
                  <strong>Rejected:</strong> Your journal entry has been rejected.
                </div>
                
                <div class="entry-details">
                  <h3>Entry Details</h3>
                  <p><strong>Reference:</strong> <span class="reference">${data.entryReference}</span></p>
                  <p><strong>Date:</strong> ${new Date(data.entryDate).toLocaleDateString()}</p>
                  <p><strong>Amount:</strong> <span class="amount">$${data.entryAmount.toLocaleString()}</span></p>
                  <p><strong>Memo:</strong> ${data.entryMemo}</p>
                  <p><strong>Rejected by:</strong> ${data.approverName} (${data.approverEmail})</p>
                  ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
                </div>

                <p>Please review the feedback and make necessary corrections before resubmitting.</p>
                
                <a href="${data.actionUrl}" class="button">Edit Entry</a>
                
                <p><small>This is an automated notification. Please do not reply to this email.</small></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
                <p>This email was sent to ${data.requesterEmail} regarding journal entry ${data.entryReference}.</p>
              </div>
            </div>
          </body>
          </html>
        `;
            case 'entry-posted':
                return `
          <!DOCTYPE html>
          <html>
          <head>${commonStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-height: 50px;">` : ''}
                <h1>Journal Entry Posted</h1>
              </div>
              <div class="content">
                <div class="alert alert-success">
                  <strong>Posted:</strong> Your journal entry has been posted to the general ledger.
                </div>
                
                <div class="entry-details">
                  <h3>Entry Details</h3>
                  <p><strong>Reference:</strong> <span class="reference">${data.entryReference}</span></p>
                  <p><strong>Date:</strong> ${new Date(data.entryDate).toLocaleDateString()}</p>
                  <p><strong>Amount:</strong> <span class="amount">$${data.entryAmount.toLocaleString()}</span></p>
                  <p><strong>Memo:</strong> ${data.entryMemo}</p>
                </div>

                <p>The journal entry is now live in the accounting system and will appear in financial reports.</p>
                
                <a href="${data.actionUrl}" class="button">View Entry</a>
                
                <p><small>This is an automated notification. Please do not reply to this email.</small></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
                <p>This email was sent to ${data.requesterEmail} regarding journal entry ${data.entryReference}.</p>
              </div>
            </div>
          </body>
          </html>
        `;
            case 'entry-reversed':
                return `
          <!DOCTYPE html>
          <html>
          <head>${commonStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-height: 50px;">` : ''}
                <h1>Journal Entry Reversed</h1>
              </div>
              <div class="content">
                <div class="alert alert-warning">
                  <strong>Reversed:</strong> A journal entry has been reversed.
                </div>
                
                <div class="entry-details">
                  <h3>Entry Details</h3>
                  <p><strong>Reference:</strong> <span class="reference">${data.entryReference}</span></p>
                  <p><strong>Date:</strong> ${new Date(data.entryDate).toLocaleDateString()}</p>
                  <p><strong>Amount:</strong> <span class="amount">$${data.entryAmount.toLocaleString()}</span></p>
                  <p><strong>Memo:</strong> ${data.entryMemo}</p>
                  ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
                </div>

                <p>The journal entry has been reversed and the accounting impact has been undone.</p>
                
                <a href="${data.actionUrl}" class="button">View Entry</a>
                
                <p><small>This is an automated notification. Please do not reply to this email.</small></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
                <p>This email was sent to ${data.requesterEmail} regarding journal entry ${data.entryReference}.</p>
              </div>
            </div>
          </body>
          </html>
        `;
            case 'entry-created':
                return `
          <!DOCTYPE html>
          <html>
          <head>${commonStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" style="max-height: 50px;">` : ''}
                <h1>New Journal Entry Created</h1>
              </div>
              <div class="content">
                <div class="alert alert-info">
                  <strong>Created:</strong> A new journal entry has been created.
                </div>
                
                <div class="entry-details">
                  <h3>Entry Details</h3>
                  <p><strong>Reference:</strong> <span class="reference">${data.entryReference}</span></p>
                  <p><strong>Date:</strong> ${new Date(data.entryDate).toLocaleDateString()}</p>
                  <p><strong>Amount:</strong> <span class="amount">$${data.entryAmount.toLocaleString()}</span></p>
                  <p><strong>Memo:</strong> ${data.entryMemo}</p>
                  <p><strong>Created by:</strong> ${data.requesterName} (${data.requesterEmail})</p>
                </div>

                <p>The journal entry has been created and is ready for review or posting.</p>
                
                <a href="${data.actionUrl}" class="button">View Entry</a>
                
                <p><small>This is an automated notification. Please do not reply to this email.</small></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
                <p>This email was sent to ${data.requesterEmail} regarding journal entry ${data.entryReference}.</p>
              </div>
            </div>
          </body>
          </html>
        `;
            default:
                return `
          <!DOCTYPE html>
          <html>
          <head>${commonStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Journal Entry Notification</h1>
              </div>
              <div class="content">
                <p>You have a new journal entry notification.</p>
                <a href="${data.actionUrl}" class="button">View Details</a>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        }
    }
    async sendNotification(notificationData) {
        try {
            const html = this.generateEmailTemplate(notificationData.template, notificationData.data);
            const text = this.stripHtml(html);
            return await this.sendEmail(notificationData.to, notificationData.subject, html, text);
        }
        catch (error) {
            console.error('Error generating email notification:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async sendApprovalRequest(entryId, approverEmails) {
        try {
            // Get entry details
            const entry = await prisma.journalEntry.findUnique({
                where: { id: entryId },
                include: {
                    lines: true
                }
            });
            if (!entry) {
                throw new Error('Journal entry not found');
            }
            const totalAmount = (entry.lines || []).reduce((sum, line) => sum + Math.max(Number(line.debit) || 0, Number(line.credit) || 0), 0);
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const actionUrl = `${baseUrl}/dashboard/journal-hub?entryId=${entryId}`;
            const notificationData = {
                to: approverEmails,
                subject: `Journal Entry Approval Request - ${entry.reference || 'N/A'}`,
                template: 'approval-request',
                data: {
                    entryId: entry.id,
                    entryReference: entry.reference || 'N/A',
                    entryMemo: entry.memo || '',
                    entryDate: entry.date.toISOString(),
                    entryAmount: totalAmount,
                    requesterName: entry.createdBy?.name || 'System',
                    requesterEmail: entry.createdBy?.email || 'system@example.com',
                    companyName: entry.company?.name || 'Company',
                    actionUrl
                }
            };
            return await this.sendNotification(notificationData);
        }
        catch (error) {
            console.error('Error sending approval request:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async sendApprovalResponse(entryId, approved, approverId, reason) {
        try {
            // Get entry details
            const entry = await prisma.journalEntry.findUnique({
                where: { id: entryId },
                include: {
                    lines: true
                }
            });
            if (!entry) {
                throw new Error('Journal entry or creator not found');
            }
            // Get approver details
            const approver = await prisma.appUser.findUnique({
                where: { id: approverId }
            });
            if (!approver) {
                throw new Error('Approver not found');
            }
            const totalAmount = (entry.lines || []).reduce((sum, line) => sum + Math.max(Number(line.debit) || 0, Number(line.credit) || 0), 0);
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const actionUrl = `${baseUrl}/dashboard/journal-hub?entryId=${entryId}`;
            const notificationData = {
                to: entry.createdBy?.email || 'system@example.com',
                subject: `Journal Entry ${approved ? 'Approved' : 'Rejected'} - ${entry.reference || 'N/A'}`,
                template: approved ? 'approval-approved' : 'approval-rejected',
                data: {
                    entryId: entry.id,
                    entryReference: entry.reference || 'N/A',
                    entryMemo: entry.memo || '',
                    entryDate: entry.date.toISOString(),
                    entryAmount: totalAmount,
                    requesterName: entry.createdBy?.name || 'System',
                    requesterEmail: entry.createdBy?.email || 'system@example.com',
                    approverName: approver.name || 'System',
                    approverEmail: approver.email,
                    reason,
                    companyName: entry.company?.name || 'Company',
                    actionUrl
                }
            };
            return await this.sendNotification(notificationData);
        }
        catch (error) {
            console.error('Error sending approval response:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async sendStatusChange(entryId, status, reason) {
        try {
            // Get entry details
            const entry = await prisma.journalEntry.findUnique({
                where: { id: entryId },
                include: {
                    lines: true
                }
            });
            if (!entry) {
                throw new Error('Journal entry or creator not found');
            }
            const totalAmount = (entry.lines || []).reduce((sum, line) => sum + Math.max(Number(line.debit) || 0, Number(line.credit) || 0), 0);
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const actionUrl = `${baseUrl}/dashboard/journal-hub?entryId=${entryId}`;
            const notificationData = {
                to: entry.createdBy?.email || 'system@example.com',
                subject: `Journal Entry ${status} - ${entry.reference || 'N/A'}`,
                template: status === 'POSTED' ? 'entry-posted' : 'entry-reversed',
                data: {
                    entryId: entry.id,
                    entryReference: entry.reference || 'N/A',
                    entryMemo: entry.memo || '',
                    entryDate: entry.date.toISOString(),
                    entryAmount: totalAmount,
                    requesterName: entry.createdBy?.name || 'System',
                    requesterEmail: entry.createdBy?.email || 'system@example.com',
                    reason,
                    companyName: entry.company?.name || 'Company',
                    actionUrl
                }
            };
            return await this.sendNotification(notificationData);
        }
        catch (error) {
            console.error('Error sending status change notification:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async sendEntryCreated(entryId) {
        try {
            // Get entry details
            const entry = await prisma.journalEntry.findUnique({
                where: { id: entryId },
                include: {
                    lines: true
                }
            });
            if (!entry) {
                throw new Error('Journal entry or creator not found');
            }
            const totalAmount = (entry.lines || []).reduce((sum, line) => sum + Math.max(Number(line.debit) || 0, Number(line.credit) || 0), 0);
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const actionUrl = `${baseUrl}/dashboard/journal-hub?entryId=${entryId}`;
            const notificationData = {
                to: entry.createdBy?.email || 'system@example.com',
                subject: `New Journal Entry Created - ${entry.reference || 'N/A'}`,
                template: 'entry-created',
                data: {
                    entryId: entry.id,
                    entryReference: entry.reference || 'N/A',
                    entryMemo: entry.memo || '',
                    entryDate: entry.date.toISOString(),
                    entryAmount: totalAmount,
                    requesterName: entry.createdBy?.name || 'System',
                    requesterEmail: entry.createdBy?.email || 'system@example.com',
                    companyName: entry.company?.name || 'Company',
                    actionUrl
                }
            };
            return await this.sendNotification(notificationData);
        }
        catch (error) {
            console.error('Error sending entry created notification:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
export const emailNotificationService = new EmailNotificationService();
