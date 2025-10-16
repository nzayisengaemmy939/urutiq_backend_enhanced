import { prisma } from '../prisma';
export class CreditNotesService {
    async create(tenantId, companyId, body, userId) {
        try {
            // Generate credit note number
            const creditNoteNumber = `CN-${Date.now()}`;
            // Calculate totals
            const subtotal = (body.lines || []).reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
            const taxAmount = (body.lines || []).reduce((sum, l) => {
                const lineTotal = l.quantity * l.unitPrice;
                const discountAmount = lineTotal * ((l.discountRate || 0) / 100);
                const netAmount = lineTotal - discountAmount;
                return sum + (netAmount * ((l.taxRate || 0) / 100));
            }, 0);
            const discountAmount = (body.lines || []).reduce((sum, l) => {
                const lineTotal = l.quantity * l.unitPrice;
                return sum + (lineTotal * ((l.discountRate || 0) / 100));
            }, 0);
            const totalAmount = subtotal - discountAmount + taxAmount;
            // Create credit note with lines
            const created = await prisma.$transaction(async (tx) => {
                const creditNote = await tx.creditNote.create({
                    data: {
                        tenantId,
                        companyId,
                        creditNoteNumber,
                        invoiceId: body.invoiceId,
                        customerId: body.customerId,
                        reason: body.reason,
                        notes: body.notes,
                        terms: body.terms,
                        subtotal,
                        taxAmount,
                        discountAmount,
                        totalAmount,
                        status: 'draft'
                    }
                });
                // Create credit note lines
                const lines = await Promise.all((body.lines || []).map(async (line) => {
                    const lineTotal = line.quantity * line.unitPrice;
                    const lineDiscountAmount = lineTotal * ((line.discountRate || 0) / 100);
                    const netAmount = lineTotal - lineDiscountAmount;
                    const lineTaxAmount = netAmount * ((line.taxRate || 0) / 100);
                    const totalLineAmount = netAmount + lineTaxAmount;
                    return await tx.creditNoteLine.create({
                        data: {
                            tenantId,
                            creditNoteId: creditNote.id,
                            description: line.description,
                            quantity: line.quantity,
                            unitPrice: line.unitPrice,
                            totalAmount: totalLineAmount,
                            taxRate: line.taxRate || 0,
                            taxAmount: lineTaxAmount,
                            discountRate: line.discountRate || 0,
                            discountAmount: lineDiscountAmount,
                            productId: line.productId,
                            serviceId: line.serviceId
                        }
                    });
                }));
                return { ...creditNote, lines };
            });
            return created;
        }
        catch (error) {
            console.error('Error creating credit note:', error);
            throw new Error('Failed to create credit note');
        }
    }
    async list(tenantId, companyId) {
        try {
            return await prisma.creditNote.findMany({
                where: {
                    tenantId,
                    companyId
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    invoice: {
                        select: {
                            id: true,
                            invoiceNumber: true
                        }
                    },
                    lines: true
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            console.error('Error listing credit notes:', error);
            return [];
        }
    }
    async getById(tenantId, id) {
        try {
            return await prisma.creditNote.findUnique({
                where: {
                    id,
                    tenantId
                },
                include: {
                    customer: true,
                    invoice: true,
                    lines: true,
                    company: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
        }
        catch (error) {
            console.error('Error getting credit note:', error);
            return null;
        }
    }
    async update(tenantId, id, data) {
        try {
            return await prisma.creditNote.update({
                where: {
                    id,
                    tenantId
                },
                data: {
                    reason: data.reason,
                    notes: data.notes,
                    terms: data.terms
                }
            });
        }
        catch (error) {
            console.error('Error updating credit note:', error);
            throw new Error('Failed to update credit note');
        }
    }
    async delete(tenantId, id) {
        try {
            return await prisma.creditNote.delete({
                where: {
                    id,
                    tenantId
                }
            });
        }
        catch (error) {
            console.error('Error deleting credit note:', error);
            throw new Error('Failed to delete credit note');
        }
    }
}
export const creditNotesService = new CreditNotesService();
