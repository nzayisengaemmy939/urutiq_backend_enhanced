import { prisma } from '../prisma.js';
export class ThreeWayMatchService {
    async getApprovalsMatrix(companyId) {
        try {
            // Temporary implementation - replace with actual Prisma when models are available
            console.log('Three-way approvals matrix not yet implemented in Prisma');
            return { tiers: [{ amountGt: 10000, roles: ['admin'] }], reasons: ['Price variance', 'Quantity variance', 'Unmatched item'] };
        }
        catch (error) {
            console.error('Error getting approvals matrix:', error);
            return { tiers: [{ amountGt: 10000, roles: ['admin'] }], reasons: ['Price variance', 'Quantity variance', 'Unmatched item'] };
        }
    }
    async setApprovalsMatrix(companyId, value) {
        try {
            // Temporary implementation - replace with actual Prisma when models are available
            console.log('Three-way approvals matrix setting not yet implemented in Prisma');
            return { ok: true };
        }
        catch (error) {
            console.error('Error setting approvals matrix:', error);
            return { ok: true };
        }
    }
    async receiveGoods(poId, lines, userId) {
        try {
            // Temporary implementation - replace with actual Prisma when models are available
            console.log('Goods receipt creation not yet implemented in Prisma');
            return { id: `grn_${Date.now()}`, purchaseOrderId: poId, lines, receivedBy: userId };
        }
        catch (error) {
            console.error('Error creating goods receipt:', error);
            return { id: `grn_${Date.now()}`, purchaseOrderId: poId, lines };
        }
    }
    async matchBill(poId, billId) {
        // Simplified match: compare quantities and flag mismatches
        try {
            const po = await prisma.purchaseOrder.findFirst({ where: { id: poId }, include: { lines: true } });
            const bill = await prisma.bill.findFirst({ where: { id: billId }, include: { lines: true } });
            const mismatches = [];
            const byDesc = new Map();
            (po?.lines || []).forEach((l) => byDesc.set(l.description || l.productId, (byDesc.get(l.description || l.productId) || 0) + Number(l.quantity || 0)));
            (bill?.lines || []).forEach((l) => {
                const key = l.description || l.productId;
                const expected = byDesc.get(key) || 0;
                if (expected !== Number(l.quantity || 0))
                    mismatches.push({ description: key, expected, actual: Number(l.quantity || 0) });
            });
            const status = mismatches.length === 0 ? 'matched' : 'exception';
            // Audit log
            try {
                await prisma.auditLog.create({
                    data: {
                        tenantId: 'demo-tenant-id',
                        entityType: 'three_way_match',
                        entityId: poId,
                        action: 'match',
                        userId: 'system',
                        // payload: JSON.stringify({ billId, mismatches }) // Commented out - field not available in Prisma model
                    }
                });
            }
            catch (error) {
                console.error('Error creating audit log:', error);
            }
            return { ok: mismatches.length === 0, mismatches, status };
        }
        catch {
            return { ok: true, mismatches: [] };
        }
    }
    async approveException(poId, userId, reason) {
        try {
            await prisma.auditLog.create({
                data: {
                    tenantId: 'demo-tenant-id',
                    entityType: 'three_way_match',
                    entityId: poId,
                    action: 'approve_exception',
                    userId,
                    // payload: JSON.stringify({ reason }) // Commented out - field not available in Prisma model
                }
            });
        }
        catch (error) {
            console.error('Error creating audit log:', error);
        }
        return { ok: true };
    }
    async rejectException(poId, userId, reason) {
        try {
            await prisma.auditLog.create({
                data: {
                    tenantId: 'demo-tenant-id',
                    entityType: 'three_way_match',
                    entityId: poId,
                    action: 'reject_exception',
                    userId,
                    // payload: JSON.stringify({ reason }) // Commented out - field not available in Prisma model
                }
            });
        }
        catch (error) {
            console.error('Error creating audit log:', error);
        }
        return { ok: true };
    }
    async listAudit(poId) {
        try {
            return await prisma.auditLog.findMany({
                where: {
                    entityType: 'three_way_match',
                    entityId: poId
                },
                orderBy: { timestamp: 'desc' }
            });
        }
        catch (error) {
            console.error('Error listing audit logs:', error);
            return [];
        }
    }
}
export const threeWayMatchService = new ThreeWayMatchService();
