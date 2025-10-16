import { randomUUID } from 'crypto';
// In-memory store (scaffolding). Replace with Prisma persistence later.
const tenantSchedules = new Map();
function getKey(tenantId, companyId) {
    return `${tenantId}:${companyId}`;
}
export const revenueRecognitionService = {
    async listSchedules(tenantId, companyId) {
        try {
            // Temporary implementation - replace with actual Prisma when models are available
            console.log('Revenue recognition schedules not yet implemented in Prisma');
            const keyMem = getKey(tenantId, companyId);
            return tenantSchedules.get(keyMem) || [];
        }
        catch (error) {
            console.error('Error listing revenue recognition schedules:', error);
            const keyMem = getKey(tenantId, companyId);
            return tenantSchedules.get(keyMem) || [];
        }
    },
    async createSchedule(tenantId, companyId, input) {
        const row = { id: randomUUID(), tenantId, companyId, createdAt: new Date().toISOString(), ...input };
        try {
            // Temporary implementation - replace with actual Prisma when models are available
            console.log('Revenue recognition schedule creation not yet implemented in Prisma');
            const keyMem = getKey(tenantId, companyId);
            const items = tenantSchedules.get(keyMem) || [];
            items.unshift(row);
            tenantSchedules.set(keyMem, items);
            return row;
        }
        catch (error) {
            console.error('Error creating revenue recognition schedule:', error);
            const keyMem = getKey(tenantId, companyId);
            const items = tenantSchedules.get(keyMem) || [];
            items.unshift(row);
            tenantSchedules.set(keyMem, items);
            return row;
        }
    },
    async deleteSchedule(tenantId, companyId, id) {
        try {
            // Temporary implementation - replace with actual Prisma when models are available
            console.log('Revenue recognition schedule deletion not yet implemented in Prisma');
            const keyMem = getKey(tenantId, companyId);
            const arr = (tenantSchedules.get(keyMem) || []).filter(x => x.id !== id);
            tenantSchedules.set(keyMem, arr);
            return { id };
        }
        catch (error) {
            console.error('Error deleting revenue recognition schedule:', error);
            const keyMem = getKey(tenantId, companyId);
            const arr = (tenantSchedules.get(keyMem) || []).filter(x => x.id !== id);
            tenantSchedules.set(keyMem, arr);
            return { id };
        }
    },
    async runRecognition(tenantId, companyId, periodStart, periodEnd) {
        const schedules = await this.listSchedules(tenantId, companyId);
        const start = new Date(periodStart);
        const end = new Date(periodEnd);
        const postings = [];
        for (const s of schedules) {
            const sStart = new Date(s.startDate);
            const sEnd = new Date(s.endDate);
            const overlapStart = new Date(Math.max(sStart.getTime(), start.getTime()));
            const overlapEnd = new Date(Math.min(sEnd.getTime(), end.getTime()));
            if (overlapStart > overlapEnd)
                continue;
            if (s.method === 'straight_line' || s.method === 'daily_prorata') {
                const totalDays = Math.max(1, Math.ceil((sEnd.getTime() - sStart.getTime()) / 86400000) + 1);
                const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1);
                const amount = +(s.amount * (overlapDays / totalDays)).toFixed(2);
                if (amount > 0) {
                    postings.push({ date: overlapEnd.toISOString().slice(0, 10), amount, currency: s.currency, scheduleId: s.id });
                }
            }
            else {
                // custom: for scaffolding, use straight-line fallback
                const totalDays = Math.max(1, Math.ceil((sEnd.getTime() - sStart.getTime()) / 86400000) + 1);
                const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1);
                const amount = +(s.amount * (overlapDays / totalDays)).toFixed(2);
                if (amount > 0) {
                    postings.push({ date: overlapEnd.toISOString().slice(0, 10), amount, currency: s.currency, scheduleId: s.id });
                }
            }
        }
        return postings;
    },
    computeAccrualsForSchedule(schedule, periodStart, periodEnd) {
        const start = new Date(periodStart);
        const end = new Date(periodEnd);
        const sStart = new Date(schedule.startDate);
        const sEnd = new Date(schedule.endDate);
        const postings = [];
        const overlapStart = new Date(Math.max(sStart.getTime(), start.getTime()));
        const overlapEnd = new Date(Math.min(sEnd.getTime(), end.getTime()));
        if (overlapStart > overlapEnd)
            return postings;
        if (schedule.method === 'straight_line' || schedule.method === 'daily_prorata') {
            const totalDays = Math.max(1, Math.ceil((sEnd.getTime() - sStart.getTime()) / 86400000) + 1);
            const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1);
            const amount = +(schedule.amount * (overlapDays / totalDays)).toFixed(2);
            if (amount > 0)
                postings.push({ date: overlapEnd.toISOString().slice(0, 10), amount, currency: schedule.currency, scheduleId: schedule.id });
        }
        else {
            const totalDays = Math.max(1, Math.ceil((sEnd.getTime() - sStart.getTime()) / 86400000) + 1);
            const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1);
            const amount = +(schedule.amount * (overlapDays / totalDays)).toFixed(2);
            if (amount > 0)
                postings.push({ date: overlapEnd.toISOString().slice(0, 10), amount, currency: schedule.currency, scheduleId: schedule.id });
        }
        return postings;
    },
    async postRecognitionJournal(tenantId, companyId, periodStart, periodEnd, postings, accounts) {
        try {
            const { prisma } = await import('../prisma');
            const date = new Date(periodEnd);
            const memo = `Revenue recognition ${periodStart} to ${periodEnd}`;
            const total = postings.reduce((s, p) => s + (p.amount || 0), 0);
            if (total <= 0)
                return { created: null, total };
            const created = await prisma.$transaction(async (tx) => {
                const je = await tx.journalEntry.create({ data: { tenantId, companyId, date, memo, reference: `REVREC-${periodEnd}` } });
                await tx.journalLine.create({ data: { tenantId, entryId: je.id, accountId: accounts.deferredRevenueAccountId, debit: total, credit: 0, memo } });
                await tx.journalLine.create({ data: { tenantId, entryId: je.id, accountId: accounts.revenueAccountId, debit: 0, credit: total, memo } });
                return je;
            });
            return { created, total };
        }
        catch (error) {
            console.error('Error posting revenue recognition journal:', error);
            return { created: null, total: 0, error: 'Failed to post journal entry' };
        }
    }
};
