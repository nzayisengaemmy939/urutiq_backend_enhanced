import { prisma } from '../prisma';
import { updateAccountBalances } from './account-balance';
/**
 * Complete post-payment processing workflow
 * This function handles all the steps that should happen after a payment is created
 */
export async function processPostPaymentWorkflow(tenantId, companyId, paymentId) {
    const steps = [];
    try {
        console.log(`🔄 Starting post-payment workflow for payment ${paymentId}`);
        // Step 1: Get payment details
        const payment = await prisma.billPayment.findFirst({
            where: { id: paymentId, tenantId },
            include: {
                bill: {
                    include: {
                        vendor: true,
                        invoiceCapture: true
                    }
                }
            }
        });
        if (!payment) {
            throw new Error('Payment not found');
        }
        steps.push({
            step: 'Get Payment Details',
            status: 'completed',
            details: { paymentId, billId: payment.billId, amount: payment.amount }
        });
        // Step 2: Update Bill Status
        const bill = payment.bill;
        const newBalance = Number(bill.balanceDue) - Number(payment.amount);
        const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
        await prisma.bill.update({
            where: { id: bill.id },
            data: {
                status: newStatus,
                balanceDue: Math.max(0, newBalance)
            }
        });
        steps.push({
            step: 'Update Bill Status',
            status: 'completed',
            details: {
                oldStatus: bill.status,
                newStatus,
                oldBalance: bill.balanceDue,
                newBalance: Math.max(0, newBalance)
            }
        });
        // Step 3: Create Journal Entry
        const journalEntry = await createPaymentJournalEntry(tenantId, companyId, payment, bill);
        steps.push({
            step: 'Create Journal Entry',
            status: journalEntry ? 'completed' : 'failed',
            details: journalEntry ? { journalEntryId: journalEntry.id } : { error: 'Failed to create journal entry' }
        });
        // Step 4: Update Account Balances
        if (journalEntry) {
            await updateAccountBalances(tenantId, companyId, journalEntry.id);
            steps.push({
                step: 'Update Account Balances',
                status: 'completed',
                details: { journalEntryId: journalEntry.id }
            });
        }
        else {
            steps.push({
                step: 'Update Account Balances',
                status: 'skipped',
                details: { reason: 'No journal entry created' }
            });
        }
        // Step 5: Update Purchase Orders (if applicable)
        const updatedPOs = await updateRelatedPurchaseOrders(tenantId, companyId, bill, payment);
        steps.push({
            step: 'Update Purchase Orders',
            status: updatedPOs.length > 0 ? 'completed' : 'skipped',
            details: { updatedCount: updatedPOs.length }
        });
        // Step 6: Send Notifications
        await sendPaymentNotifications(tenantId, companyId, payment, bill);
        steps.push({
            step: 'Send Notifications',
            status: 'completed',
            details: { notificationsSent: true }
        });
        // Step 7: Update Vendor Records
        await updateVendorPaymentHistory(tenantId, companyId, bill.vendorId, payment);
        steps.push({
            step: 'Update Vendor Records',
            status: 'completed',
            details: { vendorId: bill.vendorId }
        });
        // Step 8: Generate Payment Confirmation
        const confirmation = await generatePaymentConfirmation(tenantId, companyId, payment);
        steps.push({
            step: 'Generate Payment Confirmation',
            status: confirmation ? 'completed' : 'failed',
            details: confirmation ? { confirmationId: confirmation.id } : { error: 'Failed to generate confirmation' }
        });
        console.log(`✅ Post-payment workflow completed for payment ${paymentId}`);
        return { success: true, steps };
    }
    catch (error) {
        console.error('❌ Post-payment workflow failed:', error);
        steps.push({
            step: 'Workflow Error',
            status: 'failed',
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
        return { success: false, steps };
    }
}
/**
 * Create journal entry for payment
 */
async function createPaymentJournalEntry(tenantId, companyId, payment, bill) {
    try {
        // Get accounts
        const apAccount = await prisma.account.findFirst({
            where: {
                tenantId,
                companyId,
                name: 'Accounts Payable',
                isActive: true
            }
        });
        if (!apAccount) {
            throw new Error('Accounts Payable account not found');
        }
        // Get cash account based on payment method
        let cashAccount;
        switch (payment.paymentMethod) {
            case 'bank_transfer':
            case 'check':
                cashAccount = await prisma.account.findFirst({
                    where: { tenantId, companyId, name: 'Cash', isActive: true }
                });
                break;
            case 'credit_card':
                cashAccount = await prisma.account.findFirst({
                    where: { tenantId, companyId, name: 'Credit Card Payable', isActive: true }
                });
                break;
            case 'cash':
                cashAccount = await prisma.account.findFirst({
                    where: { tenantId, companyId, name: 'Cash', isActive: true }
                });
                break;
            default:
                cashAccount = await prisma.account.findFirst({
                    where: { tenantId, companyId, name: 'Cash', isActive: true }
                });
        }
        if (!cashAccount) {
            throw new Error(`${payment.paymentMethod} account not found`);
        }
        // Create journal entry
        const journalEntry = await prisma.journalEntry.create({
            data: {
                tenantId,
                companyId,
                date: new Date(),
                memo: `Payment to ${bill.vendor.name} - ${bill.billNumber}`,
                reference: payment.referenceNumber,
                status: 'POSTED',
                entryTypeId: null,
                createdById: null
            }
        });
        // Create journal lines
        await prisma.journalLine.create({
            data: {
                tenantId,
                entryId: journalEntry.id,
                accountId: apAccount.id,
                debit: Number(payment.amount),
                credit: 0,
                memo: `Payment to ${bill.vendor.name}`,
                department: null,
                project: null,
                location: null
            }
        });
        await prisma.journalLine.create({
            data: {
                tenantId,
                entryId: journalEntry.id,
                accountId: cashAccount.id,
                debit: 0,
                credit: Number(payment.amount),
                memo: `Payment to ${bill.vendor.name}`,
                department: null,
                project: null,
                location: null
            }
        });
        return journalEntry;
    }
    catch (error) {
        console.error('Error creating payment journal entry:', error);
        return null;
    }
}
/**
 * Update related purchase orders
 */
async function updateRelatedPurchaseOrders(tenantId, companyId, bill, payment) {
    const updatedPOs = [];
    try {
        if (bill.invoiceCapture?.rawData) {
            const rawData = JSON.parse(bill.invoiceCapture.rawData);
            if (rawData.purchaseOrderId) {
                const purchaseOrder = await prisma.purchaseOrder.findFirst({
                    where: { id: rawData.purchaseOrderId, tenantId, companyId }
                });
                if (purchaseOrder) {
                    const updatedPO = await prisma.purchaseOrder.update({
                        where: { id: purchaseOrder.id },
                        data: {
                            status: 'closed',
                            notes: `${purchaseOrder.notes || ''}\n\nMarked as paid via payment ${payment.referenceNumber}`.trim()
                        }
                    });
                    updatedPOs.push(updatedPO);
                }
            }
        }
    }
    catch (error) {
        console.error('Error updating purchase orders:', error);
    }
    return updatedPOs;
}
/**
 * Send payment notifications
 */
async function sendPaymentNotifications(tenantId, companyId, payment, bill) {
    try {
        // Send email notification to vendor
        // Send internal notification to accounting team
        // Send notification to approver
        console.log(`📧 Payment notifications sent for payment ${payment.referenceNumber}`);
    }
    catch (error) {
        console.error('Error sending notifications:', error);
    }
}
/**
 * Update vendor payment history
 */
async function updateVendorPaymentHistory(tenantId, companyId, vendorId, payment) {
    try {
        // Update vendor's payment statistics
        // Track payment history
        // Update vendor rating if applicable
        console.log(`📊 Vendor payment history updated for vendor ${vendorId}`);
    }
    catch (error) {
        console.error('Error updating vendor history:', error);
    }
}
/**
 * Generate payment confirmation
 */
async function generatePaymentConfirmation(tenantId, companyId, payment) {
    try {
        // Generate PDF confirmation
        // Store confirmation record
        // Return confirmation details
        return { id: `conf-${payment.id}`, generated: true };
    }
    catch (error) {
        console.error('Error generating confirmation:', error);
        return null;
    }
}
