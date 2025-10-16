import * as express from 'express';
import { asyncHandler } from '../errors.js';
import { enhancedJournalManagementService } from '../services/enhanced-journal-management.js';
import { prisma } from '../prisma.js';
const router = express.Router();
// Create AI-powered journal entry
router.post('/create', asyncHandler(async (req, res) => {
    const { description, amount, context, companyId } = req.body;
    const { tenantId } = req;
    if (!description) {
        return res.status(400).json({ error: 'Description is required' });
    }
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }
    // Extract amount from description if not provided
    let finalAmount = amount;
    if (!amount) {
        const amountMatch = description.match(/(?:RWF|USD|EUR|GBP|\$|€|£)\s*([0-9,]+)|([0-9,]+)\s*(?:RWF|USD|EUR|GBP|\$|€|£)/i);
        if (amountMatch) {
            finalAmount = parseInt((amountMatch[1] || amountMatch[2]).replace(/,/g, ''));
        }
        else {
            return res.status(400).json({ error: 'Amount is required or must be specified in description (e.g., "RWF 150,000")' });
        }
    }
    try {
        const journalEntryRequest = await enhancedJournalManagementService.generateJournalEntry(description, finalAmount, companyId, context, tenantId || 'tenant_demo');
        const journalEntry = await enhancedJournalManagementService.createJournalEntry(journalEntryRequest);
        res.json({
            success: true,
            message: 'AI journal entry created successfully',
            data: journalEntry
        });
    }
    catch (error) {
        console.error('Error creating AI journal entry:', error);
        res.status(500).json({ error: 'Failed to create AI journal entry' });
    }
}));
// Create manual journal entry
router.post('/manual', asyncHandler(async (req, res) => {
    const { date, reference, description, entries, metadata, companyId } = req.body;
    const { tenantId } = req;
    if (!date || !reference || !description || !entries || !Array.isArray(entries)) {
        return res.status(400).json({ error: 'Date, reference, description, and entries array are required' });
    }
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }
    try {
        const journalEntryRequest = {
            companyId,
            tenantId: tenantId || 'demo-tenant-id',
            date: new Date(date),
            reference,
            description,
            entries,
            source: 'manual',
            metadata
        };
        const journalEntry = await enhancedJournalManagementService.createJournalEntry(journalEntryRequest);
        res.json({
            success: true,
            message: 'Manual journal entry created successfully',
            data: journalEntry
        });
    }
    catch (error) {
        console.error('Error creating manual journal entry:', error);
        res.status(500).json({ error: 'Failed to create manual journal entry' });
    }
}));
// Post journal entry
router.post('/post/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { postedBy } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'Journal entry ID is required' });
    }
    try {
        const journalEntry = await enhancedJournalManagementService.postJournalEntry(id, postedBy || 'demo-user-id');
        res.json({
            success: true,
            message: 'Journal entry posted successfully',
            data: journalEntry
        });
    }
    catch (error) {
        console.error('Error posting journal entry:', error);
        res.status(500).json({ error: 'Failed to post journal entry' });
    }
}));
// Void journal entry
router.post('/void/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { voidedBy, reason } = req.body;
    if (!id || !reason) {
        return res.status(400).json({ error: 'Journal entry ID and void reason are required' });
    }
    try {
        const journalEntry = await enhancedJournalManagementService.voidJournalEntry(id, voidedBy || 'demo-user-id', reason);
        res.json({
            success: true,
            message: 'Journal entry voided successfully',
            data: journalEntry
        });
    }
    catch (error) {
        console.error('Error voiding journal entry:', error);
        res.status(500).json({ error: 'Failed to void journal entry' });
    }
}));
// Get journal entry details
router.get('/entry/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: 'Journal entry ID is required' });
    }
    try {
        const journalEntry = await enhancedJournalManagementService.getJournalEntry(id);
        if (!journalEntry) {
            return res.status(404).json({ error: 'Journal entry not found' });
        }
        res.json({
            success: true,
            data: journalEntry
        });
    }
    catch (error) {
        console.error('Error getting journal entry:', error);
        res.status(500).json({ error: 'Failed to get journal entry' });
    }
}));
// Get journal entries for period
router.get('/entries/:companyId', asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { startDate, endDate, status } = req.query;
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }
    try {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const journalEntries = await enhancedJournalManagementService.getJournalEntries(companyId, start, end, status);
        res.json({
            success: true,
            data: journalEntries,
            count: journalEntries.length
        });
    }
    catch (error) {
        console.error('Error getting journal entries:', error);
        res.status(500).json({ error: 'Failed to get journal entries' });
    }
}));
// Get account suggestions
router.post('/account-suggestions', asyncHandler(async (req, res) => {
    const { description, amount, context, companyId } = req.body;
    const { tenantId } = req;
    if (!description || !amount) {
        return res.status(400).json({ error: 'Description and amount are required' });
    }
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }
    try {
        // Temporary: bypass the AI service and directly call the fallback
        const suggestions = await enhancedJournalManagementService.getDefaultAccountSuggestions(description, amount, companyId, tenantId || 'tenant_demo');
        res.json({
            success: true,
            data: suggestions,
            count: suggestions.length
        });
    }
    catch (error) {
        console.error('Error getting account suggestions:', error);
        res.status(500).json({ error: 'Failed to get account suggestions' });
    }
}));
// Validate journal entry
router.post('/validate', asyncHandler(async (req, res) => {
    const { date, reference, description, entries } = req.body;
    const { tenantId } = req;
    if (!date || !reference || !description || !entries) {
        return res.status(400).json({ error: 'Date, reference, description, and entries are required' });
    }
    try {
        const journalEntryRequest = {
            companyId: 'demo-company-id',
            tenantId: tenantId || 'demo-tenant-id',
            date: new Date(date),
            reference,
            description,
            entries,
            source: 'manual'
        };
        const validation = await enhancedJournalManagementService.validateJournalEntry(journalEntryRequest);
        res.json({
            success: true,
            data: validation
        });
    }
    catch (error) {
        console.error('Error validating journal entry:', error);
        res.status(500).json({ error: 'Failed to validate journal entry' });
    }
}));
// Get ledger balances
router.get('/ledger-balances/:companyId', asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { startDate, endDate } = req.query;
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }
    try {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const balances = await enhancedJournalManagementService.getLedgerBalances(companyId, start, end);
        res.json({
            success: true,
            data: balances,
            count: balances.length
        });
    }
    catch (error) {
        console.error('Error getting ledger balances:', error);
        res.status(500).json({ error: 'Failed to get ledger balances' });
    }
}));
// Detect anomalies
router.get('/anomalies/:companyId', asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { periodDays } = req.query;
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }
    try {
        const anomalies = await enhancedJournalManagementService.detectAnomalies(companyId, periodDays ? parseInt(periodDays) : 30);
        res.json({
            success: true,
            data: anomalies,
            count: anomalies.length
        });
    }
    catch (error) {
        console.error('Error detecting anomalies:', error);
        res.status(500).json({ error: 'Failed to detect anomalies' });
    }
}));
// Get chart of accounts
router.get('/chart-of-accounts/:companyId', asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { includeInactive } = req.query;
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }
    try {
        const where = { companyId };
        if (includeInactive !== 'true') {
            where.isActive = true;
        }
        const accounts = await prisma.account.findMany({
            where,
            orderBy: [
                { code: 'asc' }
            ],
            include: {
                type: true
            }
        });
        // Build hierarchical structure
        const accountMap = new Map();
        const rootAccounts = [];
        for (const account of accounts) {
            accountMap.set(account.id, {
                ...account,
                children: []
            });
        }
        for (const account of accounts) {
            if (account.parentId && accountMap.has(account.parentId)) {
                accountMap.get(account.parentId).children.push(accountMap.get(account.id));
            }
            else {
                rootAccounts.push(accountMap.get(account.id));
            }
        }
        res.json({
            success: true,
            data: rootAccounts,
            count: accounts.length
        });
    }
    catch (error) {
        console.error('Error getting chart of accounts:', error);
        res.status(500).json({ error: 'Failed to get chart of accounts' });
    }
}));
// Create account
router.post('/accounts', asyncHandler(async (req, res) => {
    const { name, code, typeId, parentId, isActive } = req.body;
    const { tenantId } = req;
    if (!name || !code || !typeId) {
        return res.status(400).json({ error: 'Name, code, and type are required' });
    }
    try {
        const account = await prisma.account.create({
            data: {
                tenantId: tenantId || 'demo-tenant-id',
                companyId: 'demo-company-id',
                name,
                code,
                typeId,
                parentId,
                isActive: isActive !== false
            },
            include: {
                type: true
            }
        });
        res.json({
            success: true,
            message: 'Account created successfully',
            data: account
        });
    }
    catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
}));
// Update account
router.put('/accounts/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, code, typeId, parentId, isActive } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'Account ID is required' });
    }
    try {
        // Build update data with only provided fields
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (code !== undefined)
            updateData.code = code;
        if (typeId !== undefined)
            updateData.typeId = typeId;
        if (parentId !== undefined)
            updateData.parentId = parentId;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        const account = await prisma.account.update({
            where: { id },
            data: updateData,
            include: {
                type: true
            }
        });
        res.json({
            success: true,
            message: 'Account updated successfully',
            data: account
        });
    }
    catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({ error: 'Failed to update account' });
    }
}));
// Get account details
router.get('/accounts/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: 'Account ID is required' });
    }
    try {
        const account = await prisma.account.findUnique({
            where: { id },
            include: {
                type: true,
                parent: true,
                children: true
            }
        });
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }
        res.json({
            success: true,
            data: account
        });
    }
    catch (error) {
        console.error('Error getting account:', error);
        res.status(500).json({ error: 'Failed to get account' });
    }
}));
// Get journal entry statistics
router.get('/stats/:companyId', asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { startDate, endDate } = req.query;
    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }
    try {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const [draftEntries, postedEntries, voidedEntries] = await Promise.all([
            enhancedJournalManagementService.getJournalEntries(companyId, start, end, 'draft'),
            enhancedJournalManagementService.getJournalEntries(companyId, start, end, 'posted'),
            enhancedJournalManagementService.getJournalEntries(companyId, start, end, 'voided')
        ]);
        // Calculate totals from journal lines since totalDebit/totalCredit don't exist in schema
        const totalDebit = postedEntries.reduce((sum, entry) => {
            return sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.debit), 0);
        }, 0);
        const totalCredit = postedEntries.reduce((sum, entry) => {
            return sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.credit), 0);
        }, 0);
        const stats = {
            period: { start, end },
            entries: {
                draft: draftEntries.length,
                posted: postedEntries.length,
                voided: voidedEntries.length,
                total: draftEntries.length + postedEntries.length + voidedEntries.length
            },
            amounts: {
                totalDebit,
                totalCredit,
                netAmount: totalDebit - totalCredit
            },
            averages: {
                averageDebit: postedEntries.length > 0 ? totalDebit / postedEntries.length : 0,
                averageCredit: postedEntries.length > 0 ? totalCredit / postedEntries.length : 0
            }
        };
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error getting journal statistics:', error);
        res.status(500).json({ error: 'Failed to get journal statistics' });
    }
}));
// Batch post journal entries
router.post('/batch-post', asyncHandler(async (req, res) => {
    const { entryIds, postedBy } = req.body;
    const { tenantId } = req;
    if (!entryIds || !Array.isArray(entryIds)) {
        return res.status(400).json({ error: 'Entry IDs array is required' });
    }
    try {
        const results = [];
        const errors = [];
        for (const entryId of entryIds) {
            try {
                const journalEntry = await enhancedJournalManagementService.postJournalEntry(entryId, postedBy || 'demo-user-id');
                results.push(journalEntry);
            }
            catch (error) {
                errors.push({ entryId, error: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
        res.json({
            success: true,
            message: `Posted ${results.length} entries, ${errors.length} failed`,
            data: {
                posted: results,
                errors
            }
        });
    }
    catch (error) {
        console.error('Error batch posting journal entries:', error);
        res.status(500).json({ error: 'Failed to batch post journal entries' });
    }
}));
// Get journal entry audit trail
router.get('/audit-trail/:entryId', asyncHandler(async (req, res) => {
    const { entryId } = req.params;
    if (!entryId) {
        return res.status(400).json({ error: 'Entry ID is required' });
    }
    try {
        const journalEntry = await enhancedJournalManagementService.getJournalEntry(entryId);
        if (!journalEntry) {
            return res.status(404).json({ error: 'Journal entry not found' });
        }
        // Get related entries (voids, reversals, etc.)
        const relatedEntries = await prisma.journalEntry.findMany({
            where: {
                OR: [
                    { id: entryId },
                    { memo: { contains: entryId } }
                ]
            },
            include: {
                lines: {
                    include: {
                        account: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        const auditTrail = {
            originalEntry: journalEntry,
            relatedEntries: relatedEntries.filter(e => e.id !== entryId),
            timeline: relatedEntries.map(entry => ({
                date: entry.createdAt,
                action: entry.status,
                description: entry.memo || 'No description',
                user: entry.createdById || 'system'
            }))
        };
        res.json({
            success: true,
            data: auditTrail
        });
    }
    catch (error) {
        console.error('Error getting audit trail:', error);
        res.status(500).json({ error: 'Failed to get audit trail' });
    }
}));
export default router;
