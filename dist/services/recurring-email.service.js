import nodemailer from 'nodemailer';
export class RecurringEmailService {
    transporter;
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    /**
     * Send recurring invoice generated notification
     */
    async sendRecurringInvoiceGenerated(recurring, generatedInvoice, customer) {
        const subject = `Invoice Generated: ${generatedInvoice.invoiceNumber}`;
        const html = this.generateInvoiceGeneratedTemplate({
            recurring,
            generatedInvoice,
            customer,
            subject
        });
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: customer.email,
            cc: this.parseEmailList(recurring.ccEmails),
            bcc: this.parseEmailList(recurring.bccEmails),
            subject,
            html,
        };
        await this.transporter.sendMail(mailOptions);
    }
    /**
     * Send recurring invoice reminder
     */
    async sendRecurringInvoiceReminder(recurring, generatedInvoice, customer, daysUntilDue) {
        const subject = `Reminder: Invoice ${generatedInvoice.invoiceNumber} due in ${daysUntilDue} days`;
        const html = this.generateReminderTemplate({
            recurring,
            generatedInvoice,
            customer,
            daysUntilDue,
            subject
        });
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: customer.email,
            cc: this.parseEmailList(recurring.ccEmails),
            bcc: this.parseEmailList(recurring.bccEmails),
            subject,
            html,
        };
        await this.transporter.sendMail(mailOptions);
    }
    /**
     * Send recurring invoice skipped notification
     */
    async sendRecurringInvoiceSkipped(recurring, customer, reason) {
        const subject = `Recurring Invoice Skipped: ${recurring.name}`;
        const html = this.generateSkippedTemplate({
            recurring,
            customer,
            reason,
            subject
        });
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: customer.email,
            cc: this.parseEmailList(recurring.ccEmails),
            bcc: this.parseEmailList(recurring.bccEmails),
            subject,
            html,
        };
        await this.transporter.sendMail(mailOptions);
    }
    /**
     * Send recurring invoice status change notification
     */
    async sendRecurringInvoiceStatusChange(recurring, customer, oldStatus, newStatus) {
        const subject = `Recurring Invoice Status Changed: ${recurring.name}`;
        const html = this.generateStatusChangeTemplate({
            recurring,
            customer,
            oldStatus,
            newStatus,
            subject
        });
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: customer.email,
            cc: this.parseEmailList(recurring.ccEmails),
            bcc: this.parseEmailList(recurring.bccEmails),
            subject,
            html,
        };
        await this.transporter.sendMail(mailOptions);
    }
    /**
     * Generate invoice generated email template
     */
    generateInvoiceGeneratedTemplate(data) {
        const { recurring, generatedInvoice, customer, subject } = data;
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .invoice-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice Generated</h1>
            <p>Your recurring invoice has been automatically generated.</p>
          </div>
          
          <div class="content">
            <h2>Invoice Details</h2>
            <div class="invoice-details">
              <p><strong>Invoice Number:</strong> ${generatedInvoice.invoiceNumber}</p>
              <p><strong>Amount:</strong> $${generatedInvoice.totalAmount.toFixed(2)} ${generatedInvoice.currency}</p>
              <p><strong>Due Date:</strong> ${new Date(generatedInvoice.dueDate).toLocaleDateString()}</p>
              <p><strong>Generated From:</strong> ${recurring.name}</p>
            </div>
            
            <p>This invoice was automatically generated from your recurring invoice template "${recurring.name}".</p>
            
            ${recurring.notes ? `<p><strong>Notes:</strong> ${recurring.notes}</p>` : ''}
            ${recurring.terms ? `<p><strong>Terms:</strong> ${recurring.terms}</p>` : ''}
            
            <p>Please review the invoice and make payment by the due date.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message from your recurring invoice system.</p>
            <p>If you have any questions, please contact us.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    /**
     * Generate reminder email template
     */
    generateReminderTemplate(data) {
        const { recurring, generatedInvoice, customer, daysUntilDue, subject } = data;
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .invoice-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Reminder</h1>
            <p>Your invoice is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}.</p>
          </div>
          
          <div class="content">
            <h2>Invoice Details</h2>
            <div class="invoice-details">
              <p><strong>Invoice Number:</strong> ${generatedInvoice.invoiceNumber}</p>
              <p><strong>Amount:</strong> $${generatedInvoice.totalAmount.toFixed(2)} ${generatedInvoice.currency}</p>
              <p><strong>Due Date:</strong> ${new Date(generatedInvoice.dueDate).toLocaleDateString()}</p>
              <p><strong>Days Until Due:</strong> ${daysUntilDue}</p>
            </div>
            
            <p>This is a friendly reminder that your invoice is due soon. Please ensure payment is made by the due date to avoid any late fees.</p>
            
            ${recurring.terms ? `<p><strong>Payment Terms:</strong> ${recurring.terms}</p>` : ''}
          </div>
          
          <div class="footer">
            <p>This is an automated reminder from your recurring invoice system.</p>
            <p>If you have already made payment, please disregard this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    /**
     * Generate skipped email template
     */
    generateSkippedTemplate(data) {
        const { recurring, customer, reason, subject } = data;
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recurring Invoice Skipped</h1>
            <p>Your recurring invoice was not generated this period.</p>
          </div>
          
          <div class="content">
            <h2>Recurring Invoice: ${recurring.name}</h2>
            <p><strong>Reason for skipping:</strong> ${reason}</p>
            
            <p>Your recurring invoice "${recurring.name}" was scheduled to be generated but was skipped due to the conditions you have set up.</p>
            
            <p>If you believe this is an error or would like to generate the invoice manually, please contact us.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message from your recurring invoice system.</p>
            <p>If you have any questions, please contact us.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    /**
     * Generate status change email template
     */
    generateStatusChangeTemplate(data) {
        const { recurring, customer, oldStatus, newStatus, subject } = data;
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #17a2b8; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .status-change { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recurring Invoice Status Changed</h1>
            <p>Your recurring invoice status has been updated.</p>
          </div>
          
          <div class="content">
            <h2>Recurring Invoice: ${recurring.name}</h2>
            <div class="status-change">
              <p><strong>Previous Status:</strong> ${oldStatus}</p>
              <p><strong>New Status:</strong> ${newStatus}</p>
              <p><strong>Changed On:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>Your recurring invoice "${recurring.name}" status has been changed from "${oldStatus}" to "${newStatus}".</p>
            
            ${newStatus === 'paused' ? '<p>This recurring invoice is now paused and will not generate new invoices until it is reactivated.</p>' : ''}
            ${newStatus === 'cancelled' ? '<p>This recurring invoice has been cancelled and will no longer generate new invoices.</p>' : ''}
            ${newStatus === 'active' ? '<p>This recurring invoice is now active and will continue to generate invoices according to its schedule.</p>' : ''}
          </div>
          
          <div class="footer">
            <p>This is an automated message from your recurring invoice system.</p>
            <p>If you have any questions, please contact us.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    /**
     * Parse email list from JSON string
     */
    parseEmailList(emailListJson) {
        if (!emailListJson)
            return [];
        try {
            return JSON.parse(emailListJson);
        }
        catch {
            return [];
        }
    }
    /**
     * Test email configuration
     */
    async testEmailConfiguration() {
        try {
            await this.transporter.verify();
            return true;
        }
        catch (error) {
            console.error('Email configuration test failed:', error);
            return false;
        }
    }
}
export const recurringEmailService = new RecurringEmailService();
