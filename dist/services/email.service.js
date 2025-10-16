import nodemailer from 'nodemailer';
/**
 * Email Service
 *
 * Handles all email operations including sending purchase orders,
 * invoices, and notifications to vendors, customers, and internal users.
 *
 * @example
 * ```typescript
 * const emailService = new EmailService();
 * await emailService.sendEmail({
 *   to: 'vendor@example.com',
 *   subject: 'Purchase Order #PO-12345',
 *   html: '<h1>Purchase Order</h1>',
 *   attachments: [{ filename: 'PO-12345.pdf', content: pdfBuffer }]
 * });
 * ```
 */
export class EmailService {
    transporter;
    defaultFrom;
    constructor() {
        // Initialize email transporter
        this.transporter = this.createTransporter();
        this.defaultFrom = process.env.EMAIL_FROM || 'noreply@urutiq.com';
    }
    /**
     * Creates the email transporter based on environment configuration
     *
     * @returns Nodemailer transporter instance
     */
    createTransporter() {
        // Check if we're in development mode
        const isDevelopment = process.env.NODE_ENV !== 'production';
        if (isDevelopment && !process.env.SMTP_HOST) {
            // In development without SMTP config, use Ethereal (test email service)
            console.log('📧 Email Service: Using test mode (emails will be logged, not sent)');
            // Create a test account on the fly (for development)
            return nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: 'test@ethereal.email',
                    pass: 'test123456'
                }
            });
        }
        // Production or configured SMTP
        const config = {
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
        };
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            config.auth = {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            };
        }
        console.log(`📧 Email Service: Configured with SMTP ${config.host}:${config.port}`);
        return nodemailer.createTransport(config);
    }
    /**
     * Sends an email with optional attachments
     *
     * @param options - Email options including recipient, subject, content, and attachments
     * @returns Promise that resolves when email is sent
     * @throws Error if email sending fails
     */
    async sendEmail(options) {
        try {
            const mailOptions = {
                from: options.from || this.defaultFrom,
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
                cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
                bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
                attachments: options.attachments
            };
            const info = await this.transporter.sendMail(mailOptions);
            console.log('📧 Email sent successfully:', {
                messageId: info.messageId,
                to: options.to,
                subject: options.subject,
                preview: nodemailer.getTestMessageUrl(info) // Only works with Ethereal
            });
        }
        catch (error) {
            console.error('📧 Error sending email:', error);
            throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Sends a purchase order to a vendor
     *
     * @param vendorEmail - Vendor email address
     * @param vendorName - Vendor name
     * @param poNumber - Purchase order number
     * @param pdfBuffer - PDF file as buffer
     * @param companyName - Sender company name
     * @param additionalNotes - Optional additional notes
     * @returns Promise that resolves when email is sent
     */
    async sendPurchaseOrderToVendor(vendorEmail, vendorName, poNumber, pdfBuffer, companyName, additionalNotes) {
        const subject = `Purchase Order ${poNumber} from ${companyName}`;
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: #1e40af;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
          }
          .highlight {
            background: #dbeafe;
            padding: 15px;
            border-left: 4px solid #2563eb;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 12px;
          }
          .button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Purchase Order</h1>
          </div>
          <div class="content">
            <p>Dear ${vendorName},</p>
            
            <p>Please find attached Purchase Order <strong>${poNumber}</strong> from ${companyName}.</p>
            
            <div class="highlight">
              <p><strong>📄 Purchase Order Number:</strong> ${poNumber}</p>
              <p><strong>📅 Date:</strong> ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</p>
            </div>
            
            ${additionalNotes ? `
              <p><strong>Additional Notes:</strong></p>
              <p>${additionalNotes}</p>
            ` : ''}
            
            <p>Please review the attached purchase order and confirm receipt at your earliest convenience.</p>
            
            <p>If you have any questions or concerns regarding this purchase order, please don't hesitate to contact us.</p>
            
            <p>Thank you for your business!</p>
            
            <p>Best regards,<br>
            <strong>${companyName}</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message from ${companyName}.</p>
            <p>Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
        const text = `
Dear ${vendorName},

Please find attached Purchase Order ${poNumber} from ${companyName}.

Purchase Order Number: ${poNumber}
Date: ${new Date().toLocaleDateString()}

${additionalNotes ? `Additional Notes:\n${additionalNotes}\n\n` : ''}

Please review the attached purchase order and confirm receipt at your earliest convenience.

If you have any questions or concerns regarding this purchase order, please don't hesitate to contact us.

Thank you for your business!

Best regards,
${companyName}

---
This is an automated message from ${companyName}.
Please do not reply directly to this email.
    `;
        await this.sendEmail({
            to: vendorEmail,
            subject,
            text,
            html,
            attachments: [
                {
                    filename: `PO-${poNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });
    }
    /**
     * Sends a test email to verify email configuration
     *
     * @param recipientEmail - Email address to send test email to
     * @returns Promise that resolves when test email is sent
     */
    async sendTestEmail(recipientEmail) {
        await this.sendEmail({
            to: recipientEmail,
            subject: 'Test Email from UrutiIQ',
            html: `
        <h1>Email Service Test</h1>
        <p>This is a test email from UrutiIQ to verify that the email service is working correctly.</p>
        <p>If you received this email, the email configuration is working properly!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
            text: `Email Service Test\n\nThis is a test email from UrutiIQ to verify that the email service is working correctly.\n\nIf you received this email, the email configuration is working properly!\n\nSent at: ${new Date().toISOString()}`
        });
    }
}
// Export singleton instance
export const emailService = new EmailService();
