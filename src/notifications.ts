import { prisma } from './prisma'
import { enqueueAiJob } from './queue'

export interface NotificationTemplate {
  id: string
  name: string
  type: 'email' | 'sms' | 'push'
  subject?: string
  body: string
  variables: string[]
  isActive: boolean
}

export interface NotificationData {
  templateId: string
  recipientEmail?: string
  recipientPhone?: string
  recipientName?: string
  variables: Record<string, string>
  priority?: 'low' | 'normal' | 'high'
  scheduledFor?: Date
}

export class NotificationService {
  /**
   * Send payment reminder notifications
   */
  static async sendPaymentReminders(tenantId: string): Promise<void> {
    try {
      // Find overdue invoices
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          status: { in: ['sent', 'pending'] },
          dueDate: { lt: new Date() }
        },
        include: {
          customer: true,
          company: true
        }
      })

      // Find invoices due soon (within 3 days)
      const soonDueDate = new Date()
      soonDueDate.setDate(soonDueDate.getDate() + 3)
      
      const soonDueInvoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          status: { in: ['sent', 'pending'] },
          dueDate: { 
            gte: new Date(),
            lte: soonDueDate
          }
        },
        include: {
          customer: true,
          company: true
        }
      })

      // Send overdue reminders
      for (const invoice of overdueInvoices) {
        await this.sendPaymentReminder(invoice, 'overdue')
      }

      // Send due soon reminders
      for (const invoice of soonDueInvoices) {
        await this.sendPaymentReminder(invoice, 'due_soon')
      }

      console.log(`Sent payment reminders for ${overdueInvoices.length} overdue and ${soonDueInvoices.length} due soon invoices`)
    } catch (error) {
      console.error('Error sending payment reminders:', error)
      throw error
    }
  }

  /**
   * Send individual payment reminder
   */
  static async sendPaymentReminder(invoice: any, type: 'overdue' | 'due_soon'): Promise<void> {
    try {
      const customer = invoice.customer
      const company = invoice.company

      if (!customer?.email) {
        console.log(`Skipping reminder for invoice ${invoice.invoiceNumber} - no customer email`)
        return
      }

      const template = this.getPaymentReminderTemplate(type)
      const variables = {
        customerName: customer.name,
        companyName: company.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.balanceDue.toFixed(2),
        currency: invoice.currency,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A',
        paymentLink: `${process.env.FRONTEND_URL}/customer-portal/${invoice.id}`,
        companyEmail: company.email || 'noreply@yourcompany.com',
        companyPhone: company.phone || ''
      }

      await this.sendNotification({
        templateId: template.id,
        recipientEmail: customer.email,
        recipientName: customer.name,
        variables,
        priority: type === 'overdue' ? 'high' : 'normal'
      })

      // Log the reminder activity
      await prisma.invoiceActivity.create({
        data: {
          tenantId: invoice.tenantId,
          invoiceId: invoice.id,
          activityType: 'payment_reminder_sent',
          description: `Payment reminder sent (${type})`,
          metadata: { type, template: template.id }
        }
      })

    } catch (error) {
      console.error(`Error sending payment reminder for invoice ${invoice.invoiceNumber}:`, error)
    }
  }

  /**
   * Send payment confirmation
   */
  static async sendPaymentConfirmation(invoiceId: string, paymentData: any): Promise<void> {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId },
        include: { customer: true, company: true }
      })

      if (!invoice || !invoice.customer?.email) {
        return
      }

      const template = this.getPaymentConfirmationTemplate()
      const variables = {
        customerName: invoice.customer.name,
        companyName: invoice.company.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: paymentData.amount.toFixed(2),
        currency: paymentData.currency,
        paymentMethod: paymentData.paymentMethod || 'Credit Card',
        transactionId: paymentData.transactionId || 'N/A',
        paymentDate: new Date().toLocaleDateString()
      }

      await this.sendNotification({
        templateId: template.id,
        recipientEmail: invoice.customer.email,
        recipientName: invoice.customer.name,
        variables,
        priority: 'normal'
      })

      // Log the confirmation activity
      await prisma.invoiceActivity.create({
        data: {
          tenantId: invoice.tenantId,
          invoiceId: invoice.id,
          activityType: 'payment_confirmation_sent',
          description: 'Payment confirmation sent',
          metadata: { paymentData }
        }
      })

    } catch (error) {
      console.error(`Error sending payment confirmation for invoice ${invoiceId}:`, error)
    }
  }

  /**
   * Send invoice notification
   */
  static async sendInvoiceNotification(invoiceId: string, type: 'created' | 'sent' | 'updated'): Promise<void> {
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId },
        include: { customer: true, company: true }
      })

      if (!invoice || !invoice.customer?.email) {
        return
      }

      const template = this.getInvoiceNotificationTemplate(type)
      const variables = {
        customerName: invoice.customer.name,
        companyName: invoice.company.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount.toFixed(2),
        currency: invoice.currency,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A',
        paymentLink: `${process.env.FRONTEND_URL}/customer-portal/${invoice.id}`,
        companyEmail: invoice.company.email || 'noreply@yourcompany.com'
      }

      await this.sendNotification({
        templateId: template.id,
        recipientEmail: invoice.customer.email,
        recipientName: invoice.customer.name,
        variables,
        priority: 'normal'
      })

    } catch (error) {
      console.error(`Error sending invoice notification for invoice ${invoiceId}:`, error)
    }
  }

  /**
   * Send notification using template
   */
  static async sendNotification(data: NotificationData): Promise<void> {
    try {
      const template = this.getTemplateById(data.templateId)
      if (!template) {
        throw new Error(`Template ${data.templateId} not found`)
      }

      // Replace variables in template
      let subject = template.subject || ''
      let body = template.body

      for (const [key, value] of Object.entries(data.variables)) {
        const placeholder = `{{${key}}}`
        subject = subject.replace(new RegExp(placeholder, 'g'), value)
        body = body.replace(new RegExp(placeholder, 'g'), value)
      }

      // Queue the notification job
      await enqueueAiJob({
        type: 'send_notification',
        data: {
          templateId: template.id,
          type: template.type,
          recipientEmail: data.recipientEmail,
          recipientPhone: data.recipientPhone,
          recipientName: data.recipientName,
          subject,
          body,
          priority: data.priority || 'normal',
          scheduledFor: data.scheduledFor
        }
      })

    } catch (error) {
      console.error('Error sending notification:', error)
      throw error
    }
  }

  /**
   * Get payment reminder template
   */
  private static getPaymentReminderTemplate(type: 'overdue' | 'due_soon'): NotificationTemplate {
    if (type === 'overdue') {
      return {
        id: 'payment_reminder_overdue',
        name: 'Overdue Payment Reminder',
        type: 'email',
        subject: 'Payment Overdue - {{invoiceNumber}}',
        body: `Dear {{customerName}},

This is a friendly reminder that payment for Invoice {{invoiceNumber}} is now overdue.

Invoice Details:
- Invoice Number: {{invoiceNumber}}
- Amount Due: {{currency}} {{amount}}
- Due Date: {{dueDate}}

To make payment online, please visit: {{paymentLink}}

If you have already made payment, please disregard this notice.

For any questions, please contact us at {{companyEmail}} or {{companyPhone}}.

Thank you for your business.

Best regards,
{{companyName}}`,
        variables: ['customerName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'paymentLink', 'companyEmail', 'companyPhone', 'companyName'],
        isActive: true
      }
    } else {
      return {
        id: 'payment_reminder_due_soon',
        name: 'Payment Due Soon Reminder',
        type: 'email',
        subject: 'Payment Due Soon - {{invoiceNumber}}',
        body: `Dear {{customerName}},

This is a friendly reminder that payment for Invoice {{invoiceNumber}} is due soon.

Invoice Details:
- Invoice Number: {{invoiceNumber}}
- Amount Due: {{currency}} {{amount}}
- Due Date: {{dueDate}}

To make payment online, please visit: {{paymentLink}}

If you have any questions about this invoice, please don't hesitate to contact us at {{companyEmail}} or {{companyPhone}}.

Thank you for your business.

Best regards,
{{companyName}}`,
        variables: ['customerName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'paymentLink', 'companyEmail', 'companyPhone', 'companyName'],
        isActive: true
      }
    }
  }

  /**
   * Get payment confirmation template
   */
  private static getPaymentConfirmationTemplate(): NotificationTemplate {
    return {
      id: 'payment_confirmation',
      name: 'Payment Confirmation',
      type: 'email',
      subject: 'Payment Received - {{invoiceNumber}}',
      body: `Dear {{customerName}},

Thank you for your payment! We have successfully received payment for Invoice {{invoiceNumber}}.

Payment Details:
- Invoice Number: {{invoiceNumber}}
- Amount Paid: {{currency}} {{amount}}
- Payment Method: {{paymentMethod}}
- Transaction ID: {{transactionId}}
- Payment Date: {{paymentDate}}

A receipt has been generated and is available for download.

Thank you for your business!

Best regards,
{{companyName}}`,
      variables: ['customerName', 'invoiceNumber', 'amount', 'currency', 'paymentMethod', 'transactionId', 'paymentDate', 'companyName'],
      isActive: true
    }
  }

  /**
   * Get invoice notification template
   */
  private static getInvoiceNotificationTemplate(type: 'created' | 'sent' | 'updated'): NotificationTemplate {
    if (type === 'sent') {
      return {
        id: 'invoice_sent',
        name: 'Invoice Sent',
        type: 'email',
        subject: 'New Invoice - {{invoiceNumber}}',
        body: `Dear {{customerName}},

A new invoice has been sent to you.

Invoice Details:
- Invoice Number: {{invoiceNumber}}
- Amount: {{currency}} {{amount}}
- Due Date: {{dueDate}}

To view and pay your invoice online, please visit: {{paymentLink}}

If you have any questions about this invoice, please contact us at {{companyEmail}}.

Thank you for your business.

Best regards,
{{companyName}}`,
        variables: ['customerName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'paymentLink', 'companyEmail', 'companyName'],
        isActive: true
      }
    } else {
      return {
        id: 'invoice_updated',
        name: 'Invoice Updated',
        type: 'email',
        subject: 'Invoice Updated - {{invoiceNumber}}',
        body: `Dear {{customerName}},

Invoice {{invoiceNumber}} has been updated.

Please review the updated invoice details and make payment by the due date.

To view and pay your invoice online, please visit: {{paymentLink}}

If you have any questions, please contact us at {{companyEmail}}.

Thank you for your business.

Best regards,
{{companyName}}`,
        variables: ['customerName', 'invoiceNumber', 'paymentLink', 'companyEmail', 'companyName'],
        isActive: true
      }
    }
  }

  /**
   * Get template by ID
   */
  private static getTemplateById(id: string): NotificationTemplate | null {
    const templates = [
      this.getPaymentReminderTemplate('overdue'),
      this.getPaymentReminderTemplate('due_soon'),
      this.getPaymentConfirmationTemplate(),
      this.getInvoiceNotificationTemplate('sent'),
      this.getInvoiceNotificationTemplate('updated')
    ]
    
    return templates.find(t => t.id === id) || null
  }
}
