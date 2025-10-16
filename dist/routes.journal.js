import { prisma } from './prisma.js';
import { validateBody, schemas } from './validate.js';
import { ApiError } from './errors.js';
function sum(values) { return values.reduce((a, b) => a + b, 0); }
export function mountJournalRoutes(router) {
    // Get all journal entries
    router.get('/', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        // Pagination parameters
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
        const skip = (page - 1) * pageSize;
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            // Get total count for pagination
            const totalCount = await prisma.journalEntry.count({
                where: {
                    tenantId: req.tenantId,
                    companyId
                }
            });
            const entries = await prisma.journalEntry.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId
                },
                include: {
                    lines: {
                        include: {
                            account: {
                                select: { code: true, name: true, type: { select: { name: true } } }
                            }
                        }
                    }
                },
                orderBy: { date: 'desc' },
                skip,
                take: pageSize
            });
            const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
            res.json({
                entries,
                pagination: {
                    page,
                    pageSize,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    totalCount
                }
            });
        }
        catch (error) {
            console.error('Error fetching journal entries:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch journal entries' });
        }
    });
    // General Ledger endpoint
    router.get('/general-ledger', async (req, res) => {
        console.log('=== GENERAL LEDGER ENDPOINT CALLED ===');
        console.log('Query params:', req.query);
        console.log('Tenant ID:', req.tenantId);
        const companyId = String(req.query.companyId || '');
        const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : new Date();
        const accountId = String(req.query.accountId || '');
        const accountType = String(req.query.accountType || '');
        // Pagination parameters
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
        const skip = (page - 1) * pageSize;
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            console.log('General Ledger Debug:', {
                companyId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                accountId,
                accountType,
                tenantId: req.tenantId
            });
            // Build where clause for journal lines
            const whereClause = {
                tenantId: req.tenantId,
                entry: {
                    date: { gte: startDate, lte: endDate },
                    status: { in: ['POSTED', 'DRAFT'] }, // Include both POSTED and DRAFT entries
                    companyId: companyId
                }
            };
            // Add account filter if specified
            if (accountId) {
                whereClause.accountId = accountId;
            }
            // Add account type filter if specified
            if (accountType) {
                whereClause.account = {
                    type: accountType
                };
            }
            console.log('Where clause:', JSON.stringify(whereClause, null, 2));
            // Get total count for pagination
            const totalCount = await prisma.journalLine.count({
                where: whereClause
            });
            console.log('Total count:', totalCount);
            // If no journal lines found, let's check if there are any journal entries at all
            if (totalCount === 0) {
                const journalEntriesCount = await prisma.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId: companyId,
                        date: { gte: startDate, lte: endDate },
                        status: { in: ['POSTED', 'DRAFT'] }
                    }
                });
                console.log('Journal entries count for date range:', journalEntriesCount);
                // Check if there are any journal lines at all for this company
                const totalLinesCount = await prisma.journalLine.count({
                    where: {
                        tenantId: req.tenantId,
                        entry: {
                            companyId: companyId
                        }
                    }
                });
                console.log('Total journal lines for company:', totalLinesCount);
            }
            // Get journal lines with entry details and pagination
            const lines = await prisma.journalLine.findMany({
                where: whereClause,
                include: {
                    entry: {
                        select: { date: true, reference: true, memo: true }
                    },
                    account: {
                        select: { code: true, name: true, type: { select: { name: true } } }
                    }
                },
                orderBy: [
                    { entry: { date: 'asc' } },
                    { id: 'asc' }
                ],
                skip,
                take: pageSize
            });
            // If no lines found, return empty result instead of error
            if (lines.length === 0) {
                return res.json({
                    entries: [],
                    totalEntries: 0,
                    pagination: {
                        page,
                        pageSize,
                        totalPages: 0,
                        hasNext: false,
                        hasPrev: false
                    },
                    runningBalance: 0
                });
            }
            // Transform to ledger entries format
            const entries = lines.map(line => ({
                id: line.id,
                date: line.entry.date.toISOString(),
                reference: line.entry.reference,
                memo: line.entry.memo,
                accountCode: line.account.code,
                accountName: line.account.name,
                accountType: line.account.type?.name || 'Unknown',
                debit: Number(line.debit || 0),
                credit: Number(line.credit || 0),
                balance: Number(line.debit || 0) - Number(line.credit || 0)
            }));
            // Calculate running balance
            let runningBalance = 0;
            const entriesWithBalance = entries.map(entry => {
                runningBalance += entry.balance;
                return {
                    ...entry,
                    runningBalance
                };
            });
            const totalPages = Math.ceil(totalCount / pageSize);
            res.json({
                entries: entriesWithBalance,
                totalEntries: totalCount,
                period: { start: startDate.toISOString(), end: endDate.toISOString() },
                runningBalance,
                pagination: {
                    page,
                    pageSize,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    totalCount
                }
            });
        }
        catch (error) {
            console.error('Error generating general ledger:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to generate general ledger' });
        }
    });
    // Trial Balance endpoint
    router.get('/trial-balance', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const asOf = req.query.asOf ? new Date(String(req.query.asOf)) : new Date();
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            // Get all accounts for the company
            const accounts = await prisma.account.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    isActive: true
                },
                include: { type: true }
            });
            // Get journal lines for each account up to the asOf date
            const accountBalances = await Promise.all(accounts.map(async (account) => {
                const lines = await prisma.journalLine.findMany({
                    where: {
                        tenantId: req.tenantId,
                        accountId: account.id,
                        entry: {
                            date: { lte: asOf },
                            status: 'POSTED' // Only include posted entries in trial balance
                        }
                    }
                });
                const balance = lines.reduce((b, l) => b + Number(l.debit) - Number(l.credit), 0);
                return {
                    id: account.id,
                    code: account.code,
                    name: account.name,
                    type: account.type?.name || 'Unknown',
                    balance: balance,
                    debitBalance: balance > 0 ? balance : 0,
                    creditBalance: balance < 0 ? Math.abs(balance) : 0
                };
            }));
            // Calculate totals
            const totalDebits = accountBalances.reduce((sum, acc) => sum + acc.debitBalance, 0);
            const totalCredits = accountBalances.reduce((sum, acc) => sum + acc.creditBalance, 0);
            const difference = totalDebits - totalCredits;
            res.json({
                accounts: accountBalances,
                totalDebits,
                totalCredits,
                difference,
                asOf: asOf.toISOString()
            });
        }
        catch (error) {
            console.error('Error generating trial balance:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to generate trial balance' });
        }
    });
    // Get single journal entry by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const entry = await prisma.journalEntry.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    lines: {
                        include: {
                            account: {
                                select: { id: true, code: true, name: true, type: { select: { name: true } } }
                            }
                        }
                    },
                    entryType: true,
                    createdBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });
            if (!entry) {
                return res.status(404).json({ error: 'not_found', message: 'Journal entry not found' });
            }
            // Format the date for frontend consumption
            const formattedEntry = {
                ...entry,
                date: entry.date ? entry.date.toISOString().split('T')[0] : null
            };
            res.json(formattedEntry);
        }
        catch (error) {
            console.error('Error fetching journal entry:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch journal entry' });
        }
    });
    router.post('/', validateBody(schemas.journalPost), async (req, res) => {
        const { date, memo, reference, lines, companyId } = req.body;
        if (!Array.isArray(lines) || lines.length < 2)
            return res.status(400).json({ error: 'at_least_two_lines' });
        const debits = sum(lines.map((l) => Number(l.debit || 0)));
        const credits = sum(lines.map((l) => Number(l.credit || 0)));
        if (Math.round((debits - credits) * 100) !== 0)
            return res.status(400).json({ error: 'unbalanced' });
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        const created = await prisma.$transaction(async (tx) => {
            const entry = await tx.journalEntry.create({
                data: {
                    tenantId: req.tenantId,
                    companyId,
                    date: date ? new Date(date) : new Date(),
                    memo,
                    reference
                }
            });
            for (const l of lines) {
                await tx.journalLine.create({
                    data: {
                        tenantId: req.tenantId,
                        entryId: entry.id,
                        accountId: l.accountId,
                        debit: l.debit || 0,
                        credit: l.credit || 0,
                        memo: l.memo,
                        department: l.department || null,
                        project: l.project || null,
                        location: l.location || null
                    }
                });
            }
            return entry;
        });
        res.status(201).json(created);
    });
    // Update journal entry
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { date, memo, reference, lines } = req.body;
        if (!Array.isArray(lines) || lines.length < 2) {
            return res.status(400).json({ error: 'at_least_two_lines', message: 'Journal entry must have at least two lines' });
        }
        const debits = sum(lines.map((l) => Number(l.debit || 0)));
        const credits = sum(lines.map((l) => Number(l.credit || 0)));
        if (Math.round((debits - credits) * 100) !== 0) {
            return res.status(400).json({ error: 'unbalanced', message: 'Journal entry must be balanced (total debits = total credits)' });
        }
        try {
            // Check if entry exists and belongs to tenant
            const existingEntry = await prisma.journalEntry.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                }
            });
            if (!existingEntry) {
                return res.status(404).json({ error: 'not_found', message: 'Journal entry not found' });
            }
            // Check if entry is already posted
            if (existingEntry.status === 'POSTED') {
                return res.status(400).json({ error: 'already_posted', message: 'Cannot modify posted journal entry' });
            }
            const updated = await prisma.$transaction(async (tx) => {
                // Update the entry
                const entry = await tx.journalEntry.update({
                    where: { id },
                    data: {
                        date: date ? new Date(date) : existingEntry.date,
                        memo,
                        reference
                    }
                });
                // Delete existing lines
                await tx.journalLine.deleteMany({
                    where: { entryId: id }
                });
                // Create new lines
                for (const l of lines) {
                    await tx.journalLine.create({
                        data: {
                            tenantId: req.tenantId,
                            entryId: id,
                            accountId: l.accountId,
                            debit: l.debit || 0,
                            credit: l.credit || 0,
                            memo: l.memo,
                            department: l.department || null,
                            project: l.project || null,
                            location: l.location || null
                        }
                    });
                }
                return entry;
            });
            res.json(updated);
        }
        catch (error) {
            console.error('Error updating journal entry:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to update journal entry' });
        }
    });
    // Delete journal entry
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            // Check if entry exists and belongs to tenant
            const existingEntry = await prisma.journalEntry.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                }
            });
            if (!existingEntry) {
                return res.status(404).json({ error: 'not_found', message: 'Journal entry not found' });
            }
            // Check if entry is already posted
            if (existingEntry.status === 'POSTED') {
                return res.status(400).json({ error: 'already_posted', message: 'Cannot delete posted journal entry' });
            }
            // Delete the entry (lines will be deleted by cascade)
            await prisma.journalEntry.delete({
                where: { id }
            });
            res.status(204).send();
        }
        catch (error) {
            console.error('Error deleting journal entry:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to delete journal entry' });
        }
    });
    // Post journal entry
    router.post('/:id/post', async (req, res) => {
        const { id } = req.params;
        try {
            // Check if entry exists and belongs to tenant
            const existingEntry = await prisma.journalEntry.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: { lines: true }
            });
            if (!existingEntry) {
                return res.status(404).json({ error: 'not_found', message: 'Journal entry not found' });
            }
            // Check if entry is already posted
            if (existingEntry.status === 'POSTED') {
                return res.status(400).json({ error: 'already_posted', message: 'Journal entry is already posted' });
            }
            // Validate balance before posting
            const debits = sum(existingEntry.lines.map(l => Number(l.debit || 0)));
            const credits = sum(existingEntry.lines.map(l => Number(l.credit || 0)));
            if (Math.round((debits - credits) * 100) !== 0) {
                return res.status(400).json({ error: 'unbalanced', message: 'Cannot post unbalanced journal entry' });
            }
            // Update status to POSTED
            const postedEntry = await prisma.journalEntry.update({
                where: { id },
                data: { status: 'POSTED' }
            });
            res.json(postedEntry);
        }
        catch (error) {
            console.error('Error posting journal entry:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to post journal entry' });
        }
    });
    router.get('/ledger', async (req, res) => {
        const accountId = String(req.query.accountId || '');
        if (!accountId)
            return res.status(400).json({ error: 'accountId_required' });
        const lines = await prisma.journalLine.findMany({ where: { tenantId: req.tenantId, accountId }, orderBy: { id: 'asc' } });
        const balance = lines.reduce((b, l) => b + Number(l.debit) - Number(l.credit), 0);
        res.json({ lines, balance });
    });
    // Trial Balance endpoint
    router.get('/trial-balance', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const asOf = req.query.asOf ? new Date(String(req.query.asOf)) : new Date();
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            // Get all accounts for the company
            const accounts = await prisma.account.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    isActive: true
                },
                include: { type: true }
            });
            // Calculate balances for each account
            const accountBalances = await Promise.all(accounts.map(async (account) => {
                // Get all journal lines for this account up to the asOf date
                const lines = await prisma.journalLine.findMany({
                    where: {
                        tenantId: req.tenantId,
                        accountId: account.id,
                        entry: {
                            date: { lte: asOf },
                            status: 'POSTED',
                            companyId: companyId
                        }
                    },
                    include: { entry: true }
                });
                const debitBalance = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
                const creditBalance = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
                const netBalance = debitBalance - creditBalance;
                return {
                    accountId: account.id,
                    accountCode: account.code,
                    accountName: account.name,
                    accountType: account.type?.name || 'Unknown',
                    debitBalance,
                    creditBalance,
                    netBalance,
                    asOf: asOf.toISOString()
                };
            }));
            const totalDebits = accountBalances.reduce((sum, acc) => sum + acc.debitBalance, 0);
            const totalCredits = accountBalances.reduce((sum, acc) => sum + acc.creditBalance, 0);
            const difference = totalDebits - totalCredits;
            res.json({
                accounts: accountBalances,
                totalDebits,
                totalCredits,
                difference,
                asOf: asOf.toISOString()
            });
        }
        catch (error) {
            console.error('Error generating trial balance:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to generate trial balance' });
        }
    });
    // General Ledger endpoint
    router.get('/general-ledger', async (req, res) => {
        console.log('=== GENERAL LEDGER ENDPOINT CALLED ===');
        console.log('Query params:', req.query);
        console.log('Tenant ID:', req.tenantId);
        const companyId = String(req.query.companyId || '');
        const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : new Date();
        const accountId = String(req.query.accountId || '');
        const accountType = String(req.query.accountType || '');
        // Pagination parameters
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
        const skip = (page - 1) * pageSize;
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            console.log('General Ledger Debug:', {
                companyId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                accountId,
                accountType,
                tenantId: req.tenantId
            });
            // Build where clause for journal lines
            const whereClause = {
                tenantId: req.tenantId,
                entry: {
                    date: { gte: startDate, lte: endDate },
                    status: { in: ['POSTED', 'DRAFT'] }, // Include both POSTED and DRAFT entries
                    companyId: companyId
                }
            };
            console.log('Where clause:', JSON.stringify(whereClause, null, 2));
            if (accountId) {
                whereClause.accountId = accountId;
            }
            // If filtering by account type, first get accounts of that type
            let accountIds = [];
            if (accountType) {
                const accountsOfType = await prisma.account.findMany({
                    where: {
                        tenantId: req.tenantId,
                        companyId,
                        type: { name: accountType }
                    },
                    select: { id: true }
                });
                accountIds = accountsOfType.map(acc => acc.id);
                if (accountIds.length > 0) {
                    whereClause.accountId = { in: accountIds };
                }
                else {
                    // No accounts of this type, return empty result
                    return res.json({
                        entries: [],
                        totalEntries: 0,
                        period: { start: startDate.toISOString(), end: endDate.toISOString() },
                        runningBalance: 0
                    });
                }
            }
            // Get total count for pagination
            const totalCount = await prisma.journalLine.count({
                where: whereClause
            });
            console.log('Total count:', totalCount);
            // If no journal lines found, let's check if there are any journal entries at all
            if (totalCount === 0) {
                const journalEntriesCount = await prisma.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId: companyId,
                        date: { gte: startDate, lte: endDate },
                        status: { in: ['POSTED', 'DRAFT'] }
                    }
                });
                console.log('Journal entries count for date range:', journalEntriesCount);
                // Check if there are any journal lines at all for this company
                const totalLinesCount = await prisma.journalLine.count({
                    where: {
                        tenantId: req.tenantId,
                        entry: {
                            companyId: companyId
                        }
                    }
                });
                console.log('Total journal lines for company:', totalLinesCount);
            }
            // Get journal lines with entry details and pagination
            const lines = await prisma.journalLine.findMany({
                where: whereClause,
                include: {
                    entry: {
                        select: { date: true, reference: true, memo: true }
                    },
                    account: {
                        select: { code: true, name: true, type: { select: { name: true } } }
                    }
                },
                orderBy: [
                    { entry: { date: 'asc' } },
                    { id: 'asc' }
                ],
                skip,
                take: pageSize
            });
            // If no lines found, return empty result instead of error
            if (lines.length === 0) {
                return res.json({
                    entries: [],
                    totalEntries: 0,
                    pagination: {
                        page,
                        pageSize,
                        totalPages: 0,
                        hasNext: false,
                        hasPrev: false
                    },
                    runningBalance: 0
                });
            }
            // Transform to ledger entries format
            const entries = lines.map(line => ({
                id: line.id,
                date: line.entry.date.toISOString(),
                accountId: line.accountId,
                reference: line.entry.reference,
                description: line.memo || '',
                debit: Number(line.debit || 0),
                credit: Number(line.credit || 0),
                account: line.account
            }));
            // Calculate running balance if filtering by specific account
            let runningBalance = 0;
            if (accountId) {
                const previousLines = await prisma.journalLine.findMany({
                    where: {
                        tenantId: req.tenantId,
                        accountId,
                        entry: {
                            date: { lt: startDate },
                            status: 'POSTED',
                            companyId: companyId
                        }
                    }
                });
                runningBalance = previousLines.reduce((sum, line) => sum + Number(line.debit || 0) - Number(line.credit || 0), 0);
            }
            const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
            res.json({
                entries,
                totalEntries: totalCount,
                period: { start: startDate.toISOString(), end: endDate.toISOString() },
                runningBalance,
                pagination: {
                    page,
                    pageSize,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    totalCount
                }
            });
        }
        catch (error) {
            console.error('Error generating general ledger:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to generate general ledger' });
        }
    });
    router.post('/journal/:id/post', validateBody(schemas.journalPostAction), async (req, res, next) => {
        try {
            const { id } = req.params;
            const entry = await prisma.journalEntry.findFirst({ where: { id, tenantId: req.tenantId }, include: { lines: true } });
            if (!entry)
                throw new ApiError(404, 'not_found', 'Journal entry not found');
            if (entry.status === 'POSTED')
                throw new ApiError(400, 'already_posted', 'Journal entry is already posted');
            const debits = entry.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
            const credits = entry.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
            if (Math.round((debits - credits) * 100) !== 0)
                throw new ApiError(400, 'unbalanced', 'Journal entry is not balanced');
            const { createTransaction, transaction } = req.body;
            const txResult = await prisma.$transaction(async (tx) => {
                const posted = await tx.journalEntry.update({ where: { id: entry.id }, data: { status: 'POSTED' } });
                let createdTx = null;
                if (createTransaction && transaction) {
                    const amount = transaction.amount ?? Math.abs(debits);
                    createdTx = await tx.transaction.create({
                        data: {
                            tenantId: req.tenantId,
                            companyId: transaction.companyId,
                            transactionType: transaction.transactionType,
                            amount,
                            currency: transaction.currency,
                            transactionDate: transaction.transactionDate ? new Date(transaction.transactionDate) : new Date(entry.date),
                            status: transaction.status || 'posted',
                            linkedJournalEntryId: posted.id
                        }
                    });
                }
                return { posted, createdTx };
            });
            res.json(txResult);
        }
        catch (e) {
            next(e);
        }
    });
}
