export class BankRulesService {
    async listRules(companyId) {
        try {
            // Temporary implementation - Prisma model not available
            const rows = [];
            if (!rows || rows.length === 0) {
                const seeds = this.getSeedRules(companyId);
                // Try to persist seeds; ignore errors if table absent
                for (const r of seeds) {
                    try { /* await prisma.bankRule.create({ data: r as any }); */ }
                    catch { }
                }
                return seeds;
            }
            return rows;
        }
        catch {
            // Fallback when table not present
            return this.getSeedRules(companyId);
        }
    }
    async upsertRule(rule) {
        try {
            // Temporary implementation - Prisma model not available
            const existing = null; // await prisma.bankRule.findFirst({ where: { id: rule.id } });
            if (existing) {
                const updated = rule; // await prisma.bankRule.update({ where: { id: rule.id }, data: rule as any });
                return updated;
            }
            const created = rule; // await prisma.bankRule.create({ data: rule as any });
            return created;
        }
        catch {
            return rule;
        }
    }
    async deleteRule(id) {
        try { /* await prisma.bankRule.delete({ where: { id } }); */ }
        catch { }
        return { id };
    }
    evaluateRule(rule, txn) {
        return (rule.conditions || []).every(c => {
            const fieldVal = String(txn[c.field] ?? '').toLowerCase();
            const compVal = String(c.value ?? '').toLowerCase();
            switch (c.operator) {
                case 'contains': return fieldVal.includes(compVal);
                case 'equals': return fieldVal === compVal;
                case 'startsWith': return fieldVal.startsWith(compVal);
                case 'endsWith': return fieldVal.endsWith(compVal);
                case 'gt': return Number(fieldVal) > Number(compVal);
                case 'lt': return Number(fieldVal) < Number(compVal);
                case 'regex': try {
                    return new RegExp(c.value, 'i').test(String(txn[c.field] ?? ''));
                }
                catch {
                    return false;
                }
                default: return false;
            }
        });
    }
    applyActions(rule, txn) {
        for (const a of (rule.actions || [])) {
            if (a.type === 'setCategory' && a.value)
                txn.category = a.value;
            if (a.type === 'setPayee' && a.value)
                txn.merchantName = a.value;
            if (a.type === 'setMemo' && a.value)
                txn.memo = a.value;
            if (a.type === 'markTransfer')
                txn.isTransfer = true;
        }
        return txn;
    }
    async runRules(companyId, transactions) {
        const rules = await this.listRules(companyId);
        const active = rules.filter(r => r.isActive).sort((a, b) => a.order - b.order);
        const updated = transactions.map(txn => {
            for (const r of active) {
                if (this.evaluateRule(r, txn)) {
                    txn = this.applyActions(r, txn);
                }
            }
            return txn;
        });
        // Simple transfer pairing: same absolute amount, opposite sign, within 3 days, not already marked
        const xfers = [];
        const byAmt = {};
        updated.forEach((t, idx) => {
            const key = String(Math.abs(Number(t.amount || 0)).toFixed(2));
            if (!byAmt[key])
                byAmt[key] = [];
            byAmt[key].push(idx);
        });
        const withinDays = (a, b, d = 3) => {
            try {
                const da = new Date(a.date || a.transactionDate);
                const db = new Date(b.date || b.transactionDate);
                return Math.abs((+da - +db) / 86400000) <= d;
            }
            catch {
                return false;
            }
        };
        for (const key of Object.keys(byAmt)) {
            const idxs = byAmt[key];
            for (let x = 0; x < idxs.length; x++) {
                for (let y = x + 1; y < idxs.length; y++) {
                    const i = idxs[x], j = idxs[y];
                    const ti = updated[i], tj = updated[j];
                    if ((ti.isTransfer || tj.isTransfer))
                        continue;
                    const ai = Number(ti.amount || 0), aj = Number(tj.amount || 0);
                    if (ai * aj < 0 && withinDays(ti, tj)) {
                        ti.isTransfer = true;
                        tj.isTransfer = true;
                        xfers.push({ i, j });
                    }
                }
            }
        }
        return { count: updated.length, updated, transfers: xfers };
    }
    getSeedRules(companyId) {
        const base = Date.now();
        const mk = (idx, name, conditions, actions, order) => ({ id: `seed_${base}_${idx}`, companyId, name, conditions, actions, order, isActive: true });
        return [
            mk(1, 'Uber → Travel', [{ field: 'description', operator: 'contains', value: 'uber' }], [{ type: 'setCategory', value: 'Travel' }], 10),
            mk(2, 'Starbucks → Meals', [{ field: 'description', operator: 'contains', value: 'starbucks' }], [{ type: 'setCategory', value: 'Meals' }], 20),
            mk(3, 'Stripe Payout → Transfer', [{ field: 'description', operator: 'contains', value: 'stripe payout' }], [{ type: 'markTransfer' }], 30),
            mk(4, 'Salary → Payroll', [{ field: 'description', operator: 'contains', value: 'salary' }], [{ type: 'setCategory', value: 'Payroll' }], 40),
            mk(5, 'AWS → Hosting', [{ field: 'description', operator: 'regex', value: 'amazon web services|aws' }], [{ type: 'setCategory', value: 'Hosting' }], 50),
            mk(6, 'Rent → Facilities', [{ field: 'description', operator: 'contains', value: 'rent' }], [{ type: 'setCategory', value: 'Facilities' }], 60),
            mk(7, 'Google Ads → Marketing', [{ field: 'description', operator: 'regex', value: 'google ads|adwords' }], [{ type: 'setCategory', value: 'Marketing' }], 70),
            mk(8, 'Office Depot → Office Supplies', [{ field: 'description', operator: 'regex', value: 'office depot|staples' }], [{ type: 'setCategory', value: 'Office Supplies' }], 80),
            mk(9, 'Transfer match', [{ field: 'reference', operator: 'startsWith', value: 'XFER' }], [{ type: 'markTransfer' }], 90),
        ];
    }
}
export const bankRulesService = new BankRulesService();
