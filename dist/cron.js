import { NotificationService } from './notifications';
import { prisma } from './prisma';
export class CronService {
    /**
     * Run daily cron jobs
     */
    static async runDailyJobs() {
        console.log('Starting daily cron jobs...');
        try {
            // Get all active tenants
            const tenants = await prisma.tenant.findMany({
                where: { isActive: true }
            });
            for (const tenant of tenants) {
                try {
                    await this.runTenantJobs(tenant.id);
                }
                catch (error) {
                    console.error(`Error running jobs for tenant ${tenant.id}:`, error);
                }
            }
            console.log('Daily cron jobs completed');
        }
        catch (error) {
            console.error('Error running daily cron jobs:', error);
        }
    }
    /**
     * Run jobs for a specific tenant
     */
    static async runTenantJobs(tenantId) {
        console.log(`Running jobs for tenant ${tenantId}`);
        // Send payment reminders
        await NotificationService.sendPaymentReminders(tenantId);
        // Process recurring invoices
        await this.processRecurringInvoices(tenantId);
        // Clean up old notifications
        await this.cleanupOldNotifications(tenantId);
        // Update invoice statuses
        await this.updateInvoiceStatuses(tenantId);
    }
    /**
     * Process recurring invoices
     */
    static async processRecurringInvoices(tenantId) {
        try {
            const recurringInvoices = await prisma.recurringInvoice.findMany({
                where: {
                    tenantId,
                    isActive: true,
                    nextRunDate: { lte: new Date() }
                },
                include: {
                    customer: true,
                    company: true
                }
            });
            for (const recurring of recurringInvoices) {
                try {
                    // Check conditional logic before generating
                    const { AdvancedSchedulingService } = require('./services/advanced-scheduling.service');
                    const shouldSkip = await AdvancedSchedulingService.shouldSkipRecurringInvoice(recurring, recurring.customer);
                    if (shouldSkip.shouldSkip) {
                        console.log(`Skipping recurring invoice ${recurring.id}: ${shouldSkip.reason}`);
                        continue;
                    }
                    await this.generateRecurringInvoice(recurring);
                }
                catch (error) {
                    console.error(`Error generating recurring invoice ${recurring.id}:`, error);
                }
            }
            console.log(`Processed ${recurringInvoices.length} recurring invoices`);
        }
        catch (error) {
            console.error('Error processing recurring invoices:', error);
        }
    }
    /**
     * Generate invoice from recurring template
     */
    static async generateRecurringInvoice(recurring) {
        try {
            // Calculate next run date with advanced scheduling options
            const nextRunDate = this.calculateNextRunDate(new Date(recurring.nextRunDate), recurring.frequency, recurring.interval, {
                dayOfWeek: recurring.dayOfWeek,
                dayOfMonth: recurring.dayOfMonth,
                businessDaysOnly: recurring.businessDaysOnly,
                skipHolidays: recurring.skipHolidays,
                timezone: recurring.timezone
            });
            // Create new invoice
            const invoice = await prisma.invoice.create({
                data: {
                    tenantId: recurring.tenantId,
                    companyId: recurring.companyId,
                    customerId: recurring.customerId,
                    invoiceNumber: await this.generateInvoiceNumber(recurring.tenantId),
                    issueDate: new Date().toISOString(),
                    dueDate: this.calculateDueDate(new Date(), recurring.paymentTerms || 30),
                    status: 'draft',
                    subtotal: recurring.subtotal,
                    taxTotal: recurring.taxTotal,
                    totalAmount: recurring.totalAmount,
                    balanceDue: recurring.totalAmount,
                    currency: recurring.currency,
                    notes: recurring.notes,
                    terms: recurring.terms,
                    lines: recurring.lines
                }
            });
            // Create invoice lines
            for (const line of recurring.lines) {
                await prisma.invoiceLine.create({
                    data: {
                        tenantId: recurring.tenantId,
                        invoiceId: invoice.id,
                        description: line.description,
                        quantity: line.quantity,
                        unitPrice: line.unitPrice,
                        lineTotal: line.lineTotal,
                        taxRate: line.taxRate
                    }
                });
            }
            // Update recurring invoice next run date
            await prisma.recurringInvoice.update({
                where: { id: recurring.id },
                data: { nextRunDate: nextRunDate.toISOString() }
            });
            // Log activity
            await prisma.invoiceActivity.create({
                data: {
                    tenantId: recurring.tenantId,
                    invoiceId: invoice.id,
                    activityType: 'recurring_invoice_generated',
                    description: `Generated from recurring template: ${recurring.name}`,
                    metadata: { recurringInvoiceId: recurring.id }
                }
            });
            // Send email notification if auto-send is enabled
            if (recurring.autoSend) {
                try {
                    const { recurringEmailService } = require('./services/recurring-email.service');
                    await recurringEmailService.sendRecurringInvoiceGenerated(recurring, invoice, recurring.customer);
                    console.log(`Email sent for generated invoice ${invoice.invoiceNumber}`);
                }
                catch (emailError) {
                    console.error(`Failed to send email for invoice ${invoice.invoiceNumber}:`, emailError);
                }
            }
            console.log(`Generated recurring invoice ${invoice.invoiceNumber} from template ${recurring.name}`);
        }
        catch (error) {
            console.error(`Error generating recurring invoice:`, error);
            throw error;
        }
    }
    /**
     * Calculate next run date for recurring invoice using advanced scheduling
     */
    static calculateNextRunDate(currentDate, frequency, interval, options = {}) {
        const { AdvancedSchedulingService } = require('./services/advanced-scheduling.service');
        return AdvancedSchedulingService.calculateNextRunDate(currentDate, frequency, interval, {
            dayOfWeek: options.dayOfWeek,
            dayOfMonth: options.dayOfMonth,
            businessDaysOnly: options.businessDaysOnly,
            skipHolidays: options.skipHolidays,
            timezone: options.timezone
        });
    }
    /**
     * Calculate due date
     */
    static calculateDueDate(issueDate, paymentTerms) {
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + paymentTerms);
        return dueDate;
    }
    /**
     * Generate invoice number
     */
    static async generateInvoiceNumber(tenantId) {
        const count = await prisma.invoice.count({
            where: { tenantId }
        });
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const number = String(count + 1).padStart(4, '0');
        return `INV-${year}${month}-${number}`;
    }
    /**
     * Clean up old notifications
     */
    static async cleanupOldNotifications(tenantId) {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            await prisma.notification.deleteMany({
                where: {
                    tenantId,
                    createdAt: { lt: thirtyDaysAgo }
                }
            });
            console.log(`Cleaned up old notifications for tenant ${tenantId}`);
        }
        catch (error) {
            console.error(`Error cleaning up notifications for tenant ${tenantId}:`, error);
        }
    }
    /**
     * Update invoice statuses
     */
    static async updateInvoiceStatuses(tenantId) {
        try {
            const today = new Date();
            // Mark overdue invoices
            await prisma.invoice.updateMany({
                where: {
                    tenantId,
                    status: { in: ['sent', 'pending'] },
                    dueDate: { lt: today }
                },
                data: { status: 'overdue' }
            });
            console.log(`Updated invoice statuses for tenant ${tenantId}`);
        }
        catch (error) {
            console.error(`Error updating invoice statuses for tenant ${tenantId}:`, error);
        }
    }
    /**
     * Run weekly jobs
     */
    static async runWeeklyJobs() {
        console.log('Starting weekly cron jobs...');
        try {
            // Get all active tenants
            const tenants = await prisma.tenant.findMany({
                where: { isActive: true }
            });
            for (const tenant of tenants) {
                try {
                    await this.runWeeklyTenantJobs(tenant.id);
                }
                catch (error) {
                    console.error(`Error running weekly jobs for tenant ${tenant.id}:`, error);
                }
            }
            console.log('Weekly cron jobs completed');
        }
        catch (error) {
            console.error('Error running weekly cron jobs:', error);
        }
    }
    /**
     * Run weekly jobs for a specific tenant
     */
    static async runWeeklyTenantJobs(tenantId) {
        console.log(`Running weekly jobs for tenant ${tenantId}`);
        // Generate reports
        await this.generateWeeklyReports(tenantId);
        // Archive old data
        await this.archiveOldData(tenantId);
    }
    /**
     * Generate weekly reports
     */
    static async generateWeeklyReports(tenantId) {
        try {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const invoices = await prisma.invoice.findMany({
                where: {
                    tenantId,
                    createdAt: { gte: oneWeekAgo }
                }
            });
            const totalInvoices = invoices.length;
            const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
            const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
            const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
            // Create report record
            await prisma.report.create({
                data: {
                    tenantId,
                    type: 'weekly_summary',
                    title: 'Weekly Invoice Summary',
                    data: {
                        period: 'week',
                        totalInvoices,
                        totalAmount,
                        paidInvoices,
                        overdueInvoices,
                        generatedAt: new Date().toISOString()
                    }
                }
            });
            console.log(`Generated weekly report for tenant ${tenantId}`);
        }
        catch (error) {
            console.error(`Error generating weekly report for tenant ${tenantId}:`, error);
        }
    }
    /**
     * Archive old data
     */
    static async archiveOldData(tenantId) {
        try {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            // Archive old paid invoices
            await prisma.invoice.updateMany({
                where: {
                    tenantId,
                    status: 'paid',
                    createdAt: { lt: sixMonthsAgo }
                },
                data: { isArchived: true }
            });
            console.log(`Archived old data for tenant ${tenantId}`);
        }
        catch (error) {
            console.error(`Error archiving data for tenant ${tenantId}:`, error);
        }
    }
}
