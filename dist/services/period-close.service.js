import { prisma } from '../prisma.js';
// Simple in-memory storage for period statuses (in production, use a proper database table)
const periodStatusStorage = new Map();
// In-memory storage for period runs
const periodRunsStorage = new Map();
// Helper function to get period status from database or memory
async function getPeriodStatus(companyId, period) {
    // First check in-memory storage
    const key = `${companyId}:${period}`;
    const stored = periodStatusStorage.get(key);
    if (stored) {
        return stored.status;
    }
    // If not in memory, try to get from a database field
    // For now, we'll use a simple approach with the Company table
    try {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true, name: true }
        });
        if (company) {
            // For demo purposes, we'll store period statuses in a simple way
            // In a real implementation, you'd add a PeriodStatus table
            return 'open'; // Default to open if not found
        }
    }
    catch (error) {
        console.error('Error getting period status from database:', error);
    }
    return 'open'; // Default fallback
}
export class PeriodCloseService {
    async getStatus(companyId, period) {
        return await getPeriodStatus(companyId, period);
    }
    async listPeriods(companyId) {
        // Only get periods from actual transactions - no fallback
        // Get transactions and extract periods using JavaScript date formatting
        const transactions = await prisma.transaction.findMany({
            where: { companyId },
            select: { transactionDate: true },
        }).catch(() => []);
        // Extract unique periods from transaction dates
        const periodSet = new Set();
        transactions.forEach(t => {
            const date = new Date(t.transactionDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            periodSet.add(`${year}-${month}`);
        });
        const periods = Array.from(periodSet).sort().reverse(); // Most recent first
        // Get lock states from storage
        const locks = {};
        for (const period of periods) {
            locks[period] = await getPeriodStatus(companyId, period);
        }
        // Return only real periods with their actual lock status
        return periods.map((p) => ({
            period: p,
            status: locks[p] || 'open'
        }));
    }
    async lockPeriod(companyId, period, lockedBy) {
        await this.setPeriodStatus(companyId, period, 'locked', lockedBy);
        return { period, status: 'locked' };
    }
    async unlockPeriod(companyId, period, unlockedBy) {
        await this.setPeriodStatus(companyId, period, 'open', unlockedBy);
        return { period, status: 'open' };
    }
    async completeClose(companyId, period, completedBy) {
        await this.setPeriodStatus(companyId, period, 'closed', completedBy);
        return { period, status: 'closed' };
    }
    async setPeriodStatus(companyId, period, status, userId) {
        // Store period status in in-memory storage
        const key = `${companyId}:${period}`;
        const value = {
            status,
            updatedBy: userId,
            updatedAt: new Date().toISOString()
        };
        periodStatusStorage.set(key, value);
        // Log the status change for debugging
        console.log(`Period status changed: ${companyId} - ${period} -> ${status} by ${userId}`);
        console.log(`Storage key: ${key}, value:`, value);
    }
    async getChecklist(companyId, period) {
        try {
            const items = await prisma.closeChecklistItem.findMany({
                where: { companyId, period },
                orderBy: { order: 'asc' },
            });
            return items;
        }
        catch {
            // Return default checklist items for demo purposes
            const defaultChecklist = [
                { id: '1', companyId, period, title: 'Bank reconciliations complete', completed: false, order: 1 },
                { id: '2', companyId, period, title: 'Accruals and deferrals posted', completed: false, order: 2 },
                { id: '3', companyId, period, title: 'Intercompany reconciled', completed: false, order: 3 },
                { id: '4', companyId, period, title: 'Revenue recognition posted', completed: false, order: 4 },
                { id: '5', companyId, period, title: 'Expense accruals reviewed', completed: false, order: 5 },
                { id: '6', companyId, period, title: 'Fixed asset depreciation posted', completed: false, order: 6 },
                { id: '7', companyId, period, title: 'Financial statements prepared', completed: false, order: 7 },
                { id: '8', companyId, period, title: 'Management review completed', completed: false, order: 8 },
            ];
            return defaultChecklist;
        }
    }
    async updateChecklistItem(companyId, period, itemId, changes) {
        try {
            const item = await prisma.closeChecklistItem.update({
                where: { id: itemId },
                data: {
                    title: changes.title,
                    description: changes.description,
                    completed: changes.completed,
                    completedBy: changes.completedBy,
                    completedAt: changes.completed ? new Date() : undefined,
                    order: changes.order,
                },
            });
            return item;
        }
        catch {
            // No table: just echo back
            return { id: itemId, companyId, period, title: changes.title || '', completed: !!changes.completed, order: changes.order || 1 };
        }
    }
    async createRecurringJournalTemplate(template) {
        try {
            const created = await prisma.recurringJournalTemplate.create({ data: template });
            return created;
        }
        catch {
            return template; // fallback
        }
    }
    async runRecurringJournals(companyId, period) {
        // Pseudo: load templates where nextRunPeriod <= period, post journals, advance nextRunPeriod
        try {
            const templates = await prisma.recurringJournalTemplate.findMany({ where: { companyId, isActive: true } });
            // In a real impl, we would create JournalEntry + JournalLines
            const result = { posted: templates.length, period, at: new Date().toISOString(), type: 'recurring' };
            await this.recordRun(companyId, period, 'recurring', result);
            return result;
        }
        catch {
            const result = { posted: 0, period, at: new Date().toISOString(), type: 'recurring' };
            await this.recordRun(companyId, period, 'recurring', result);
            return result;
        }
    }
    async runAllocations(companyId, period) {
        // Placeholder for allocation logic (e.g., allocate overhead by driver)
        const result = { success: true, allocationsPosted: 0, period, at: new Date().toISOString(), type: 'allocations' };
        await this.recordRun(companyId, period, 'allocations', result);
        return result;
    }
    async runFxRevaluation(companyId, period, baseCurrency = 'USD') {
        // Back-compat shim: keep old endpoint as a post action
        const preview = await this.previewFxRevaluation(companyId, period, baseCurrency);
        const posted = await this.postFxRevaluation(companyId, period, baseCurrency, preview.entries);
        const result = { success: true, entriesPosted: posted.postedCount, baseCurrency, period, at: new Date().toISOString(), type: 'fx-reval' };
        await this.recordRun(companyId, period, 'fx-reval', result);
        return result;
    }
    async previewFxRevaluation(companyId, period, baseCurrency) {
        // Try to build balances by currency using transactions; fallback to synthetic sample
        let rows;
        try {
            // Example: sum by currency for the period end (simplified)
            rows = await prisma.$queryRawUnsafe(`SELECT COALESCE(currency, 'USD') as currency, SUM(amount) as balance
         FROM "Transaction"
         WHERE "companyId" = $1 AND to_char("transactionDate", 'YYYY-MM') <= $2
         GROUP BY currency
         HAVING COALESCE(currency, 'USD') <> $3`, companyId, period, baseCurrency);
        }
        catch {
            rows = [
                { currency: 'EUR', balance: 10000 },
                { currency: 'GBP', balance: 5000 },
            ];
        }
        // Fetch spot rates; for scaffolding use settings or fixed demo rates
        const rates = {};
        for (const r of rows) {
            rates[r.currency] = await this.getFxRate(companyId, r.currency, baseCurrency);
        }
        const entries = rows.map(r => {
            const rate = rates[r.currency] || 1;
            const base = +(r.balance * rate).toFixed(2);
            const reval = +(base - r.balance).toFixed(2);
            return {
                currency: r.currency,
                foreignBalance: r.balance,
                rate,
                baseCurrency,
                baseBalance: base,
                revaluation: reval,
                debitAccount: reval > 0 ? 'FX Loss' : 'FX Gain',
                creditAccount: reval > 0 ? 'Foreign Currency Balance' : 'Foreign Currency Balance',
            };
        });
        const total = entries.reduce((s, e) => s + e.revaluation, 0);
        return { entries, total };
    }
    async postFxRevaluation(companyId, period, baseCurrency, entries) {
        const data = entries || (await this.previewFxRevaluation(companyId, period, baseCurrency)).entries;
        // Persist a simple history record in settings table
        const key = `fx_reval:${period}`;
        const record = { period, baseCurrency, entries: data, postedAt: new Date().toISOString() };
        try {
            const existing = await prisma.setting.findFirst({ where: { companyId, key } });
            if (existing)
                await prisma.setting.update({ where: { id: existing.id }, data: { value: record } });
            else
                await prisma.setting.create({ data: { companyId, key, value: record } });
        }
        catch {
            // ignore if settings table not available
        }
        // In real impl: create JournalEntry + lines
        return { postedCount: data.length };
    }
    async postFxRevaluationJournal(tenantId, companyId, period, baseCurrency, entries, accounts) {
        const periodDate = new Date(period + '-01');
        const endOfMonth = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);
        const memo = `FX Revaluation ${period} (${baseCurrency})`;
        const lines = [];
        for (const e of entries) {
            const amt = Math.abs(e.revaluation || 0);
            if (amt === 0)
                continue;
            const detail = `FX reval ${e.currency}->${baseCurrency} @ ${e.rate}`;
            if ((e.revaluation || 0) > 0) {
                // Loss: DR Loss, CR Revalued
                lines.push({ accountId: accounts.fxLossAccountId, debit: amt, credit: 0, memo: detail });
                lines.push({ accountId: accounts.revaluedAccountId, debit: 0, credit: amt, memo: detail });
            }
            else {
                // Gain: DR Revalued, CR Gain
                lines.push({ accountId: accounts.revaluedAccountId, debit: amt, credit: 0, memo: detail });
                lines.push({ accountId: accounts.fxGainAccountId, debit: 0, credit: amt, memo: detail });
            }
        }
        if (lines.length === 0)
            return { created: null };
        const created = await prisma.$transaction(async (tx) => {
            const entry = await tx.journalEntry.create({ data: { tenantId, companyId, date: endOfMonth, memo, reference: `FX-${period}` } });
            for (const l of lines) {
                await tx.journalLine.create({ data: { tenantId, entryId: entry.id, accountId: l.accountId, debit: l.debit, credit: l.credit, memo: l.memo } });
            }
            return entry;
        });
        return { created };
    }
    async getFxRevaluationHistory(companyId, period) {
        const key = `fx_reval:${period}`;
        try {
            const existing = await prisma.setting.findFirst({ where: { companyId, key } });
            return existing?.value || null;
        }
        catch {
            return null;
        }
    }
    async getFxRate(companyId, from, to) {
        // Try settings override first
        const key = `fx_rate:${from}->${to}`;
        try {
            const s = await prisma.setting.findFirst({ where: { companyId, key } });
            if (s?.value?.rate)
                return Number(s.value.rate);
        }
        catch { /* ignore */ }
        // Demo fixed rates
        const demo = { 'EUR->USD': 1.08, 'GBP->USD': 1.26 };
        return demo[`${from}->${to}`] || 1;
    }
    async recordRun(companyId, period, type, payload) {
        const key = `${companyId}:${period}`;
        const runId = `${type}:${Date.now()}`;
        const runRecord = {
            id: runId,
            type,
            at: new Date().toISOString(),
            payload
        };
        // Get existing runs or create new array
        const existingRuns = periodRunsStorage.get(key) || [];
        // Add new run to the beginning
        existingRuns.unshift(runRecord);
        // Store back in memory
        periodRunsStorage.set(key, existingRuns);
        console.log(`Recorded run: ${key} - ${type}`, runRecord);
    }
    // Post a prior-period adjustment into the next open period, with audit trail
    async postPriorPeriodAdjustment(tenantId, companyId, closedPeriod, payload) {
        const baseDescription = payload.description || `Prior-period adjustment for ${closedPeriod}`;
        const transactionType = payload.transactionType || 'expense';
        const currency = payload.currency || 'USD';
        // Compute next month from closedPeriod
        const [yearStr, monthStr] = closedPeriod.split('-');
        let year = parseInt(yearStr, 10);
        let month = parseInt(monthStr, 10);
        month += 1;
        if (month > 12) {
            year += 1;
            month = 1;
        }
        // Find the next open period (max 24 months lookahead)
        let targetPeriod = `${year}-${String(month).padStart(2, '0')}`;
        for (let i = 0; i < 24; i++) {
            const status = await this.getStatus(companyId, targetPeriod);
            if (status === 'open')
                break;
            month += 1;
            if (month > 12) {
                year += 1;
                month = 1;
            }
            targetPeriod = `${year}-${String(month).padStart(2, '0')}`;
        }
        const txDate = new Date(`${targetPeriod}-01T00:00:00Z`);
        // Create the adjustment transaction in the next open period
        const created = await prisma.transaction.create({
            data: {
                tenantId,
                companyId,
                transactionType: transactionType,
                amount: payload.amount,
                currency,
                transactionDate: txDate,
                status: 'completed',
            }
        });
        // Record an audit run under the closed period
        await this.recordRun(companyId, closedPeriod, 'adjustment', {
            postedInto: targetPeriod,
            amount: payload.amount,
            transactionType,
            currency,
            description: baseDescription,
            status: 'posted',
            at: new Date().toISOString()
        });
        return { success: true, data: { adjustmentTransaction: created, targetPeriod } };
    }
    async listRuns(companyId, period, type) {
        const key = `${companyId}:${period}`;
        const runs = periodRunsStorage.get(key) || [];
        // Filter by type if specified
        if (type) {
            return runs.filter(run => run.type === type);
        }
        return runs;
    }
    async rollbackRun(companyId, period, runId) {
        // Stub rollback: just record a rollback action
        await this.recordRun(companyId, period, 'allocations', { rollbackOf: runId, at: new Date().toISOString(), status: 'rolled_back' });
        return { ok: true };
    }
}
export const periodCloseService = new PeriodCloseService();
