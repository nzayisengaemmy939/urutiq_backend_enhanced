import { prisma } from './prisma';
import { requireRoles } from './auth';
export function mountJournalHubRoutes(router) {
    console.log('🔍 mountJournalHubRoutes called - setting up routes');
    // Get all journal entries (matching the frontend API expectations)
    router.get('/entries', requireRoles(['admin', 'accountant']), async (req, res) => {
        console.log('🔍 === JOURNAL HUB /entries ROUTE HANDLER REACHED ===');
        console.log('🔍 === JOURNAL HUB /entries DEBUG START ===');
        console.log('🔍 Raw request headers:', JSON.stringify(req.headers, null, 2));
        console.log('🔍 Raw request query:', JSON.stringify(req.query, null, 2));
        console.log('🔍 Raw request body:', JSON.stringify(req.body, null, 2));
        const companyId = req.header('x-company-id') || String(req.query.companyId || '');
        console.log('🔍 Extracted values:');
        console.log('  - companyId from header:', req.header('x-company-id'));
        console.log('  - companyId from query:', req.query.companyId);
        console.log('  - Final companyId:', companyId);
        console.log('  - req.tenantId (from middleware):', req.tenantId);
        console.log('  - req.user:', req.user);
        console.log('🔍 === JOURNAL HUB /entries DEBUG END ===');
        // Pagination parameters
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
        const skip = (page - 1) * pageSize;
        // Filter parameters
        const status = String(req.query.status || '');
        const entryType = String(req.query.entryType || '');
        const reference = String(req.query.reference || '');
        const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : null;
        const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : null;
        if (!companyId) {
            console.log('❌ Journal Hub /entries - Missing companyId');
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            // Build where clause
            const whereClause = {
                tenantId: req.tenantId,
                companyId
            };
            if (status && status !== 'all') {
                whereClause.status = status;
            }
            if (entryType && entryType !== 'all') {
                whereClause.entryTypeId = entryType;
            }
            if (reference) {
                whereClause.reference = {
                    contains: reference,
                    mode: 'insensitive'
                };
            }
            if (dateFrom || dateTo) {
                whereClause.date = {};
                if (dateFrom)
                    whereClause.date.gte = dateFrom;
                if (dateTo)
                    whereClause.date.lte = dateTo;
            }
            // Get total count for pagination
            const totalCount = await prisma.journalEntry.count({
                where: whereClause
            });
            const entries = await prisma.journalEntry.findMany({
                where: whereClause,
                include: {
                    lines: {
                        include: {
                            account: {
                                select: { code: true, name: true, type: { select: { name: true } } }
                            }
                        }
                    },
                    entryType: true
                },
                orderBy: { date: 'desc' },
                skip,
                take: pageSize
            });
            // Calculate totals for each entry
            const entriesWithTotals = entries.map(entry => {
                const totalDebit = entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
                const totalCredit = entry.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
                const totalAmount = Math.max(totalDebit, totalCredit);
                const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01; // Allow for small rounding differences
                return {
                    ...entry,
                    totalDebit,
                    totalCredit,
                    totalAmount,
                    isBalanced,
                    date: entry.date ? entry.date.toISOString().split('T')[0] : null
                };
            });
            const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
            res.json({
                entries: entriesWithTotals,
                pagination: {
                    page,
                    pageSize,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    total: totalCount
                }
            });
        }
        catch (error) {
            console.error('Error fetching journal entries:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch journal entries' });
        }
    });
    // Get journal summary
    router.get('/summary', requireRoles(['admin', 'accountant']), async (req, res) => {
        const companyId = req.header('x-company-id') || String(req.query.companyId || '');
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const [totalEntries, postedToday, draftEntries, postedEntries] = await Promise.all([
                prisma.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId
                    }
                }),
                prisma.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId,
                        status: 'POSTED',
                        createdAt: { gte: startOfDay }
                    }
                }),
                prisma.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId,
                        status: 'DRAFT'
                    }
                }),
                prisma.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId,
                        status: 'POSTED'
                    }
                })
            ]);
            res.json({
                summary: {
                    totalEntries,
                    postedToday,
                    draftEntries,
                    postedEntries
                }
            });
        }
        catch (error) {
            console.error('Error fetching journal summary:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch journal summary' });
        }
    });
    // Get journal entry types
    router.get('/entry-types', requireRoles(['admin', 'accountant']), async (req, res) => {
        const companyId = req.header('x-company-id') || String(req.query.companyId || '');
        console.log('🔍 Journal Hub /entry-types - Debug info:', {
            companyId,
            tenantId: req.tenantId,
            user: req.user
        });
        if (!companyId) {
            console.log('❌ Journal Hub /entry-types - Missing companyId');
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            const entryTypes = await prisma.journalEntryType.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId
                },
                orderBy: { name: 'asc' }
            });
            res.json({
                entryTypes
            });
        }
        catch (error) {
            console.error('Error fetching journal entry types:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch journal entry types' });
        }
    });
    // Get pending approvals
    router.get('/pending-approvals', requireRoles(['admin', 'accountant']), async (req, res) => {
        const companyId = req.header('x-company-id') || String(req.query.companyId || '');
        console.log('🔍 Journal Hub /pending-approvals - Debug info:', {
            companyId,
            tenantId: req.tenantId,
            user: req.user
        });
        if (!companyId) {
            console.log('❌ Journal Hub /pending-approvals - Missing companyId');
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            // For now, return empty array since we don't have approval system implemented yet
            res.json({
                pendingApprovals: []
            });
        }
        catch (error) {
            console.error('Error fetching pending approvals:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch pending approvals' });
        }
    });
    // Get journal metrics
    router.get('/metrics', requireRoles(['admin', 'accountant']), async (req, res) => {
        const companyId = req.header('x-company-id') || String(req.query.companyId || '');
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            const [totalEntries, postedEntries, draftEntries, reversedEntries] = await Promise.all([
                prisma.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId
                    }
                }),
                prisma.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId,
                        status: 'POSTED'
                    }
                }),
                prisma.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId,
                        status: 'DRAFT'
                    }
                }),
                prisma.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId,
                        status: 'REVERSED'
                    }
                })
            ]);
            const successRate = totalEntries > 0 ? (postedEntries / totalEntries) * 100 : 0;
            const errorRate = totalEntries > 0 ? (reversedEntries / totalEntries) * 100 : 0;
            res.json({
                metrics: {
                    totalEntries,
                    postedEntries,
                    draftEntries,
                    pendingApprovals: 0, // Not implemented yet
                    unbalancedCount: 0, // Would need to calculate this
                    successRate,
                    avgProcessingTime: 0, // Not implemented yet
                    errorRate
                }
            });
        }
        catch (error) {
            console.error('Error fetching journal metrics:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch journal metrics' });
        }
    });
    // Get journal permissions
    router.get('/permissions/:userId', requireRoles(['admin', 'accountant']), async (req, res) => {
        const companyId = req.header('x-company-id') || String(req.query.companyId || '');
        const userId = String(req.params.userId || '');
        if (!companyId || !userId) {
            return res.status(400).json({ error: 'missing_parameters', message: 'Company ID and User ID are required' });
        }
        try {
            // For now, return default permissions for demo
            res.json({
                permissions: {
                    canCreate: true,
                    canEdit: true,
                    canDelete: true,
                    canPost: true,
                    canReverse: true,
                    canApprove: true,
                    canViewAll: true,
                    maxApprovalAmount: 100000
                }
            });
        }
        catch (error) {
            console.error('Error fetching journal permissions:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch journal permissions' });
        }
    });
    // Create new journal entry
    router.post('/entries', requireRoles(['admin', 'accountant']), async (req, res) => {
        const { date, memo, reference, lines, entryTypeId } = req.body;
        const companyId = req.header('x-company-id') || req.body.companyId;
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        if (!Array.isArray(lines) || lines.length < 2) {
            return res.status(400).json({ error: 'invalid_lines', message: 'Journal entry must have at least two lines' });
        }
        // Validate that debits equal credits
        const totalDebits = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
        const totalCredits = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            return res.status(400).json({ error: 'unbalanced', message: 'Journal entry must be balanced (total debits = total credits)' });
        }
        try {
            const journalEntry = await prisma.$transaction(async (tx) => {
                // Create the journal entry
                const entry = await tx.journalEntry.create({
                    data: {
                        tenantId: req.tenantId,
                        companyId,
                        date: date ? new Date(date) : new Date(),
                        memo: memo || '',
                        reference: reference || '',
                        status: 'DRAFT',
                        entryTypeId: entryTypeId || null,
                        createdById: null
                    }
                });
                // Create the journal lines
                for (const line of lines) {
                    await tx.journalLine.create({
                        data: {
                            tenantId: req.tenantId,
                            entryId: entry.id,
                            accountId: line.accountId,
                            debit: Number(line.debit || 0),
                            credit: Number(line.credit || 0),
                            memo: line.memo || '',
                            department: line.department || null,
                            project: line.project || null,
                            location: line.location || null
                        }
                    });
                }
                return entry;
            });
            res.status(201).json({
                success: true,
                data: journalEntry,
                message: 'Journal entry created successfully'
            });
        }
        catch (error) {
            console.error('Error creating journal entry:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to create journal entry' });
        }
    });
    // Post journal entry (change status from DRAFT to POSTED)
    router.post('/entries/:id/post', requireRoles(['admin', 'accountant']), async (req, res) => {
        const { id } = req.params;
        try {
            const entry = await prisma.journalEntry.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: { lines: true }
            });
            if (!entry) {
                return res.status(404).json({ error: 'not_found', message: 'Journal entry not found' });
            }
            if (entry.status === 'POSTED') {
                return res.status(400).json({ error: 'already_posted', message: 'Journal entry is already posted' });
            }
            // Validate balance before posting
            const totalDebits = entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
            const totalCredits = entry.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
            if (Math.abs(totalDebits - totalCredits) > 0.01) {
                return res.status(400).json({ error: 'unbalanced', message: 'Cannot post unbalanced journal entry' });
            }
            // Update status to POSTED
            const postedEntry = await prisma.journalEntry.update({
                where: { id },
                data: { status: 'POSTED' }
            });
            res.json({
                success: true,
                data: postedEntry,
                message: 'Journal entry posted successfully'
            });
        }
        catch (error) {
            console.error('Error posting journal entry:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to post journal entry' });
        }
    });
}
