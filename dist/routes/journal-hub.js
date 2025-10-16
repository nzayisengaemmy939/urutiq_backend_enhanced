import { prisma } from '../prisma.js';
import { validateBody, journalEntryTypeCreate, journalEntryCreate, journalEntryReversal, journalEntryAdjustment, journalEntryApprovalRequest, journalEntryBatchCreate, journalEntryBatchApprove, journalEntryBatchPost, journalEntryBatchReverse, journalEntryCsvImport, journalSearchSave, journalSearchUpdate } from '../validate.js';
import { emailNotificationService } from '../services/email-notification.service.js';
import { pdfGenerationService } from '../services/pdf-generation.service.js';
export function mountJournalHubRoutes(router) {
    // ==================== JOURNAL ENTRY TYPES ====================
    // Get all journal entry types
    router.get('/entry-types', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            if (!companyId) {
                return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
            }
            const entryTypes = await prisma.journalEntryType.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    isActive: true
                },
                include: {
                    allowedAccounts: {
                        include: {
                            account: {
                                select: { id: true, code: true, name: true, type: { select: { name: true } } }
                            }
                        }
                    }
                },
                orderBy: { name: 'asc' }
            });
            res.json({ entryTypes });
        }
        catch (error) {
            console.error('Error fetching journal entry types:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch journal entry types' });
        }
    });
    // Create journal entry type
    router.post('/entry-types', validateBody(journalEntryTypeCreate), async (req, res) => {
        try {
            const { name, description, category, requiresApproval, maxAmount, allowedAccountIds, companyId } = req.body;
            const entryType = await prisma.$transaction(async (tx) => {
                const created = await tx.journalEntryType.create({
                    data: {
                        tenantId: req.tenantId,
                        companyId,
                        name,
                        description,
                        category,
                        requiresApproval,
                        maxAmount,
                        isSystemGenerated: false
                    }
                });
                // Add allowed accounts
                if (allowedAccountIds && allowedAccountIds.length > 0) {
                    await tx.journalEntryTypeAccount.createMany({
                        data: allowedAccountIds.map((accountId) => ({
                            tenantId: req.tenantId,
                            entryTypeId: created.id,
                            accountId
                        }))
                    });
                }
                return created;
            });
            res.status(201).json(entryType);
        }
        catch (error) {
            console.error('Error creating journal entry type:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to create journal entry type' });
        }
    });
    // ==================== JOURNAL ENTRY TEMPLATES ====================
    // Get all templates
    router.get('/templates', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            if (!companyId) {
                return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
            }
            const templates = await prisma.journalEntryTemplate.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    isActive: true
                },
                include: {
                    lines: {
                        include: {
                            account: {
                                select: { id: true, code: true, name: true, type: { select: { name: true } } }
                            }
                        }
                    },
                    entryType: {
                        select: { id: true, name: true, category: true }
                    }
                },
                orderBy: { name: 'asc' }
            });
            res.json({ templates });
        }
        catch (error) {
            console.error('Error fetching templates:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch templates' });
        }
    });
    // Create template from journal entry
    router.post('/templates/from-entry/:entryId', async (req, res) => {
        try {
            const { entryId } = req.params;
            const { name, description, isRecurring, frequency, companyId } = req.body;
            const entry = await prisma.journalEntry.findFirst({
                where: {
                    id: entryId,
                    tenantId: req.tenantId,
                    companyId
                },
                include: {
                    lines: {
                        include: {
                            account: {
                                select: { id: true, code: true, name: true }
                            }
                        }
                    }
                }
            });
            if (!entry) {
                return res.status(404).json({ error: 'not_found', message: 'Journal entry not found' });
            }
            const template = await prisma.$transaction(async (tx) => {
                const created = await tx.journalEntryTemplate.create({
                    data: {
                        tenantId: req.tenantId,
                        companyId,
                        name,
                        description,
                        entryTypeId: entry.entryTypeId || null,
                        isRecurring,
                        frequency,
                        isActive: true
                    }
                });
                // Create template lines
                await tx.journalEntryTemplateLine.createMany({
                    data: entry.lines.map(line => ({
                        tenantId: req.tenantId,
                        templateId: created.id,
                        accountId: line.accountId,
                        debitFormula: Number(line.debit) > 0 ? line.debit.toString() : null,
                        creditFormula: Number(line.credit) > 0 ? line.credit.toString() : null,
                        memo: line.memo,
                        department: line.department,
                        project: line.project,
                        location: line.location,
                        isRequired: true
                    }))
                });
                return created;
            });
            res.status(201).json(template);
        }
        catch (error) {
            console.error('Error creating template:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to create template' });
        }
    });
    // ==================== ENHANCED JOURNAL ENTRIES ====================
    // Get journal entries with advanced filtering
    router.get('/entries', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            if (!companyId) {
                return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
            }
            // Parse filters
            const filters = {
                dateFrom: req.query.dateFrom ? new Date(String(req.query.dateFrom)) : undefined,
                dateTo: req.query.dateTo ? new Date(String(req.query.dateTo)) : undefined,
                status: req.query.status,
                entryType: String(req.query.entryType || ''),
                accountId: String(req.query.accountId || ''),
                amountMin: req.query.amountMin ? Number(req.query.amountMin) : undefined,
                amountMax: req.query.amountMax ? Number(req.query.amountMax) : undefined,
                reference: String(req.query.reference || ''),
                memo: String(req.query.memo || ''),
                createdById: String(req.query.createdById || ''),
                department: String(req.query.department || ''),
                project: String(req.query.project || ''),
                location: String(req.query.location || '')
            };
            // Build where clause
            const whereClause = {
                tenantId: req.tenantId,
                companyId
            };
            if (filters.dateFrom || filters.dateTo) {
                whereClause.date = {};
                if (filters.dateFrom)
                    whereClause.date.gte = filters.dateFrom;
                if (filters.dateTo)
                    whereClause.date.lte = filters.dateTo;
            }
            if (filters.status)
                whereClause.status = filters.status;
            if (filters.entryType)
                whereClause.entryTypeId = filters.entryType;
            if (filters.reference)
                whereClause.reference = { contains: filters.reference };
            if (filters.memo)
                whereClause.memo = { contains: filters.memo };
            if (filters.createdById)
                whereClause.createdById = filters.createdById;
            // Filter by account (through journal lines)
            if (filters.accountId) {
                whereClause.lines = {
                    some: {
                        accountId: filters.accountId
                    }
                };
            }
            // Filter by amount range
            if (filters.amountMin || filters.amountMax) {
                const amountFilter = {};
                if (filters.amountMin)
                    amountFilter.gte = filters.amountMin;
                if (filters.amountMax)
                    amountFilter.lte = filters.amountMax;
                whereClause.lines = {
                    some: {
                        OR: [
                            { debit: amountFilter },
                            { credit: amountFilter }
                        ]
                    }
                };
            }
            // Filter by dimensions
            if (filters.department || filters.project || filters.location) {
                const dimensionFilter = {};
                if (filters.department)
                    dimensionFilter.department = filters.department;
                if (filters.project)
                    dimensionFilter.project = filters.project;
                if (filters.location)
                    dimensionFilter.location = filters.location;
                whereClause.lines = {
                    some: dimensionFilter
                };
            }
            // Pagination
            const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
            const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
            const skip = (page - 1) * pageSize;
            // Get total count
            const totalCount = await prisma.journalEntry.count({ where: whereClause });
            // Get entries
            const entries = await prisma.journalEntry.findMany({
                where: whereClause,
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
                    },
                    approvals: {
                        include: {
                            approver: {
                                select: { id: true, name: true, email: true }
                            }
                        }
                    }
                },
                orderBy: { date: 'desc' },
                skip,
                take: pageSize
            });
            // Calculate totals and balance status for each entry
            const entriesWithTotals = entries.map(entry => {
                const totalDebit = entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
                const totalCredit = entry.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
                const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
                return {
                    ...entry,
                    totalDebit,
                    totalCredit,
                    isBalanced,
                    totalAmount: Math.max(totalDebit, totalCredit)
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
                    totalCount
                }
            });
        }
        catch (error) {
            console.error('Error fetching journal entries:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch journal entries' });
        }
    });
    // Create journal entry with enhanced features
    router.post('/entries', validateBody(journalEntryCreate), async (req, res) => {
        try {
            const { date, memo, reference, entryTypeId, lines, department, project, location, requiresApproval, companyId } = req.body;
            // Validate entry type if provided
            if (entryTypeId) {
                const entryType = await prisma.journalEntryType.findFirst({
                    where: {
                        id: entryTypeId,
                        tenantId: req.tenantId,
                        companyId
                    },
                    include: {
                        allowedAccounts: {
                            include: {
                                account: true
                            }
                        }
                    }
                });
                if (!entryType) {
                    return res.status(400).json({ error: 'invalid_entry_type', message: 'Invalid entry type' });
                }
                // Check if all accounts are allowed for this entry type
                const allowedAccountIds = entryType.allowedAccounts.map((aa) => aa.accountId);
                const usedAccountIds = lines.map((l) => l.accountId);
                const invalidAccounts = usedAccountIds.filter((id) => !allowedAccountIds.includes(id));
                if (invalidAccounts.length > 0) {
                    return res.status(400).json({
                        error: 'invalid_accounts',
                        message: 'Some accounts are not allowed for this entry type',
                        invalidAccounts
                    });
                }
                // Check amount limits
                if (entryType.maxAmount) {
                    const totalAmount = lines.reduce((sum, line) => sum + (line.debit || 0) + (line.credit || 0), 0);
                    if (totalAmount > entryType.maxAmount) {
                        return res.status(400).json({
                            error: 'amount_exceeded',
                            message: `Entry amount exceeds maximum allowed amount of ${entryType.maxAmount}`
                        });
                    }
                }
            }
            // Validate double-entry bookkeeping
            const debits = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
            const credits = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
            if (Math.abs(debits - credits) > 0.01) {
                return res.status(400).json({
                    error: 'unbalanced',
                    message: 'Journal entry must be balanced (total debits = total credits)',
                    debits,
                    credits,
                    difference: debits - credits
                });
            }
            // Determine status based on approval requirements
            const status = (requiresApproval || (entryTypeId && await prisma.journalEntryType.findFirst({
                where: { id: entryTypeId, requiresApproval: true }
            }))) ? 'PENDING_APPROVAL' : 'DRAFT';
            // Auto-generate reference if not provided (best practice)
            let finalReference = reference;
            if (!finalReference) {
                const d = new Date(date);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const prefix = `JE-${y}${m}${dd}`;
                // Find last sequence for this date and company
                const lastForDay = await prisma.journalEntry.findFirst({
                    where: {
                        tenantId: req.tenantId,
                        companyId,
                        reference: { startsWith: prefix }
                    },
                    orderBy: { reference: 'desc' }
                });
                const nextSeq = lastForDay?.reference?.match(/(\d+)$/)?.[1]
                    ? Number(lastForDay.reference.match(/(\d+)$/)[1]) + 1
                    : 1;
                finalReference = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
            }
            else {
                // Optional: prevent duplicates for manual references within tenant/company
                const exists = await prisma.journalEntry.findFirst({
                    where: { tenantId: req.tenantId, companyId, reference: finalReference }
                });
                if (exists) {
                    return res.status(400).json({ error: 'duplicate_reference', message: 'Reference already exists. Leave blank to auto-generate.' });
                }
            }
            const entry = await prisma.$transaction(async (tx) => {
                const created = await tx.journalEntry.create({
                    data: {
                        tenantId: req.tenantId,
                        companyId,
                        date: new Date(date),
                        memo,
                        reference: finalReference,
                        entryTypeId: entryTypeId || undefined,
                        status,
                        createdById: req.user?.id
                    }
                });
                // Create journal lines
                for (const line of lines) {
                    await tx.journalLine.create({
                        data: {
                            tenantId: req.tenantId,
                            entryId: created.id,
                            accountId: line.accountId,
                            debit: line.debit || 0,
                            credit: line.credit || 0,
                            memo: line.memo,
                            department: line.department || department,
                            project: line.project || project,
                            location: line.location || location
                        }
                    });
                }
                // Create approval request if needed
                if (status === 'PENDING_APPROVAL') {
                    await tx.journalEntryApproval.create({
                        data: {
                            tenantId: req.tenantId,
                            entryId: created.id,
                            requestedById: req.user?.sub,
                            status: 'PENDING',
                            requestedAt: new Date()
                        }
                    });
                }
                return created;
            });
            // Send email notification for entry creation
            try {
                await emailNotificationService.sendEntryCreated(entry.id);
            }
            catch (emailError) {
                console.error('Error sending entry created email:', emailError);
                // Don't fail the request if email fails
            }
            res.status(201).json(entry);
        }
        catch (error) {
            console.error('Error creating journal entry:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to create journal entry' });
        }
    });
    // ==================== JOURNAL ENTRY SUMMARY & ANALYTICS ====================
    // Get journal entry summary
    router.get('/summary', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : new Date();
            if (!companyId) {
                return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
            }
            // Get basic counts
            const [totalEntries, draftEntries, postedEntries, pendingApproval, reversedEntries] = await Promise.all([
                prisma.journalEntry.count({
                    where: { tenantId: req.tenantId, companyId, date: { gte: dateFrom, lte: dateTo } }
                }),
                prisma.journalEntry.count({
                    where: { tenantId: req.tenantId, companyId, status: 'DRAFT', date: { gte: dateFrom, lte: dateTo } }
                }),
                prisma.journalEntry.count({
                    where: { tenantId: req.tenantId, companyId, status: 'POSTED', date: { gte: dateFrom, lte: dateTo } }
                }),
                prisma.journalEntry.count({
                    where: { tenantId: req.tenantId, companyId, status: 'PENDING_APPROVAL', date: { gte: dateFrom, lte: dateTo } }
                }),
                prisma.journalEntry.count({
                    where: { tenantId: req.tenantId, companyId, status: 'REVERSED', date: { gte: dateFrom, lte: dateTo } }
                })
            ]);
            // Get total amounts
            const entriesWithLines = await prisma.journalEntry.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    date: { gte: dateFrom, lte: dateTo },
                    status: 'POSTED'
                },
                include: { lines: true }
            });
            const totalDebits = entriesWithLines.reduce((sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.debit || 0), 0), 0);
            const totalCredits = entriesWithLines.reduce((sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.credit || 0), 0), 0);
            // Get by type - Skip this grouping as entryTypeId may not exist in current schema
            const byType = [];
            // Get by status
            const byStatus = await prisma.journalEntry.groupBy({
                by: ['status'],
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    date: { gte: dateFrom, lte: dateTo }
                },
                _count: { id: true }
            });
            // Get monthly breakdown
            const monthlyData = await prisma.journalEntry.groupBy({
                by: ['date'],
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    date: { gte: dateFrom, lte: dateTo }
                },
                _count: { id: true }
            });
            const byMonth = monthlyData.map(item => ({
                month: item.date.toISOString().slice(0, 7),
                entries: item._count.id,
                debits: 0, // Would need additional query for amounts
                credits: 0
            }));
            // Calculate posted today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const postedToday = await prisma.journalEntry.count({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    status: 'POSTED',
                    date: {
                        gte: today,
                        lt: tomorrow
                    }
                }
            });
            const summary = {
                totalEntries,
                totalDebits,
                totalCredits,
                draftEntries,
                postedEntries,
                pendingApproval,
                reversedEntries,
                postedToday,
                byType: {},
                byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item._count?.id || 0 }), {}),
                byMonth
            };
            res.json(summary);
        }
        catch (error) {
            console.error('Error fetching journal entry summary:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch journal entry summary' });
        }
    });
    // ==================== APPROVAL WORKFLOW ====================
    // Get pending approvals
    router.get('/approvals/pending', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            if (!companyId) {
                return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
            }
            const pendingApprovals = await prisma.journalEntryApproval.findMany({
                where: {
                    tenantId: req.tenantId,
                    status: 'PENDING',
                    entry: { companyId }
                },
                include: {
                    entry: {
                        include: {
                            lines: {
                                include: {
                                    account: {
                                        select: { id: true, code: true, name: true, type: { select: { name: true } } }
                                    }
                                }
                            },
                            entryType: {
                                select: { id: true, name: true, category: true }
                            },
                            createdBy: {
                                select: { id: true, name: true, email: true }
                            }
                        }
                    },
                    requestedBy: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: { requestedAt: 'asc' }
            });
            res.json({ pendingApprovals });
        }
        catch (error) {
            console.error('Error fetching pending approvals:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch pending approvals' });
        }
    });
    // Approve journal entry
    router.post('/approvals/:id/approve', async (req, res) => {
        try {
            const { id } = req.params;
            const { comments } = req.body;
            const approval = await prisma.journalEntryApproval.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    entry: true
                }
            });
            if (!approval) {
                return res.status(404).json({ error: 'not_found', message: 'Approval not found' });
            }
            if (approval.status !== 'PENDING') {
                return res.status(400).json({ error: 'already_processed', message: 'Approval has already been processed' });
            }
            const result = await prisma.$transaction(async (tx) => {
                // Update approval
                const updatedApproval = await tx.journalEntryApproval.update({
                    where: { id },
                    data: {
                        status: 'APPROVED',
                        approvedById: req.user?.id,
                        approvedAt: new Date(),
                        comments
                    }
                });
                // Update journal entry status
                const updatedEntry = await tx.journalEntry.update({
                    where: { id: approval.entryId },
                    data: { status: 'POSTED' }
                });
                return { approval: updatedApproval, entry: updatedEntry };
            });
            // Send email notification to requester
            try {
                await emailNotificationService.sendApprovalResponse(approval.entryId, true, req.user?.id, comments);
            }
            catch (emailError) {
                console.error('Error sending approval email:', emailError);
                // Don't fail the request if email fails
            }
            res.json(result);
        }
        catch (error) {
            console.error('Error approving journal entry:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to approve journal entry' });
        }
    });
    // Reject journal entry
    router.post('/approvals/:id/reject', async (req, res) => {
        try {
            const { id } = req.params;
            const { comments } = req.body;
            const approval = await prisma.journalEntryApproval.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    entry: true
                }
            });
            if (!approval) {
                return res.status(404).json({ error: 'not_found', message: 'Approval not found' });
            }
            if (approval.status !== 'PENDING') {
                return res.status(400).json({ error: 'already_processed', message: 'Approval has already been processed' });
            }
            const result = await prisma.$transaction(async (tx) => {
                // Update approval
                const updatedApproval = await tx.journalEntryApproval.update({
                    where: { id },
                    data: {
                        status: 'REJECTED',
                        approvedById: req.user?.id,
                        approvedAt: new Date(),
                        comments
                    }
                });
                // Update journal entry status
                const updatedEntry = await tx.journalEntry.update({
                    where: { id: approval.entryId },
                    data: { status: 'DRAFT' }
                });
                return { approval: updatedApproval, entry: updatedEntry };
            });
            // Send email notification to requester
            try {
                await emailNotificationService.sendApprovalResponse(approval.entryId, false, req.user?.id, comments);
            }
            catch (emailError) {
                console.error('Error sending rejection email:', emailError);
                // Don't fail the request if email fails
            }
            res.json(result);
        }
        catch (error) {
            console.error('Error rejecting journal entry:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to reject journal entry' });
        }
    });
    // ==================== RECURRING ENTRIES ====================
    // Get recurring entries
    router.get('/recurring', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            if (!companyId) {
                return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
            }
            const recurringEntries = await prisma.journalEntryTemplate.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    isRecurring: true,
                    isActive: true
                },
                include: {
                    lines: {
                        include: {
                            account: {
                                select: { id: true, code: true, name: true, type: { select: { name: true } } }
                            }
                        }
                    },
                    entryType: {
                        select: { id: true, name: true, category: true }
                    }
                },
                orderBy: { nextRunDate: 'asc' }
            });
            res.json({ recurringEntries });
        }
        catch (error) {
            console.error('Error fetching recurring entries:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch recurring entries' });
        }
    });
    // Process recurring entries
    router.post('/recurring/process', async (req, res) => {
        try {
            const companyId = String(req.body.companyId || '');
            if (!companyId) {
                return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
            }
            const today = new Date();
            const recurringTemplates = await prisma.journalEntryTemplate.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    isRecurring: true,
                    isActive: true,
                    nextRunDate: { lte: today },
                    OR: [
                        { endDate: null },
                        { endDate: { gte: today } }
                    ]
                },
                include: {
                    lines: true
                }
            });
            const processedEntries = [];
            for (const template of recurringTemplates) {
                const entry = await prisma.$transaction(async (tx) => {
                    // Create journal entry
                    const created = await tx.journalEntry.create({
                        data: {
                            tenantId: req.tenantId,
                            companyId,
                            date: template.nextRunDate || today,
                            memo: `Recurring entry from template: ${template.name}`,
                            reference: `REC-${template.id}`,
                            entryTypeId: template.entryTypeId || undefined,
                            status: 'POSTED',
                            createdById: req.user?.id
                        }
                    });
                    // Create journal lines
                    for (const line of template.lines) {
                        await tx.journalLine.create({
                            data: {
                                tenantId: req.tenantId,
                                entryId: created.id,
                                accountId: line.accountId,
                                debit: line.debitFormula ? eval(line.debitFormula) : 0,
                                credit: line.creditFormula ? eval(line.creditFormula) : 0,
                                memo: line.memo,
                                department: line.department,
                                project: line.project,
                                location: line.location
                            }
                        });
                    }
                    // Update next run date
                    const nextRunDate = calculateNextRunDate(template.nextRunDate || today, template.frequency);
                    await tx.journalEntryTemplate.update({
                        where: { id: template.id },
                        data: { nextRunDate }
                    });
                    return created;
                });
                processedEntries.push(entry);
            }
            res.json({ processedEntries, count: processedEntries.length });
        }
        catch (error) {
            console.error('Error processing recurring entries:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to process recurring entries' });
        }
    });
    // ==================== REVERSAL & CORRECTION ====================
    // Reverse journal entry
    router.post('/entries/:id/reverse', validateBody(journalEntryReversal), async (req, res) => {
        try {
            const { id } = req.params;
            const { reason, reverseDate } = req.body;
            const originalEntry = await prisma.journalEntry.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    lines: {
                        include: {
                            account: true
                        }
                    }
                }
            });
            if (!originalEntry) {
                return res.status(404).json({ error: 'not_found', message: 'Journal entry not found' });
            }
            if (originalEntry.status !== 'POSTED') {
                return res.status(400).json({ error: 'invalid_status', message: 'Only posted entries can be reversed' });
            }
            const result = await prisma.$transaction(async (tx) => {
                // Mark original entry as reversed
                const updatedOriginal = await tx.journalEntry.update({
                    where: { id },
                    data: {
                        status: 'REVERSED',
                        memo: `${originalEntry.memo} - REVERSED: ${reason || 'No reason provided'}`
                    }
                });
                // Create reversal entry
                const reversalEntry = await tx.journalEntry.create({
                    data: {
                        tenantId: req.tenantId,
                        companyId: originalEntry.companyId,
                        date: reverseDate ? new Date(reverseDate) : new Date(),
                        memo: `Reversal of ${originalEntry.memo} - ${reason || 'No reason provided'}`,
                        reference: `REV-${originalEntry.reference}`,
                        status: 'POSTED',
                        entryTypeId: originalEntry.entryTypeId || undefined,
                        createdById: req.user?.id
                    }
                });
                // Create reversal journal lines (swap debits and credits)
                const reversalLines = [];
                for (const originalLine of originalEntry.lines || []) {
                    const reversalLine = await tx.journalLine.create({
                        data: {
                            tenantId: req.tenantId,
                            entryId: reversalEntry.id,
                            accountId: originalLine.accountId,
                            debit: originalLine.credit, // Swap: original credit becomes debit
                            credit: originalLine.debit, // Swap: original debit becomes credit
                            memo: `Reversal of ${originalLine.memo || originalLine.account?.name || 'Entry line'}`,
                            department: originalLine.department,
                            project: originalLine.project,
                            location: originalLine.location
                        }
                    });
                    reversalLines.push(reversalLine);
                }
                // Handle inventory movements if this is a sales-related journal entry
                let inventoryMovementsReversed = 0;
                let stockRestored = 0;
                // Check if this journal entry is related to a sales transaction
                if (originalEntry.reference && (originalEntry.reference.startsWith('INV-') || originalEntry.reference.startsWith('POS-'))) {
                    try {
                        // Find original inventory movements for this reference
                        const originalMovements = await tx.inventoryMovement.findMany({
                            where: {
                                tenantId: req.tenantId,
                                reference: originalEntry.reference
                            },
                            include: { product: true }
                        });
                        // Create reversing inventory movements and restore stock
                        for (const originalMovement of originalMovements) {
                            const originalQuantity = Number(originalMovement.quantity);
                            const reversingQuantity = -originalQuantity; // Reverse the quantity
                            // Create reversal inventory movement
                            await tx.inventoryMovement.create({
                                data: {
                                    tenantId: req.tenantId,
                                    productId: originalMovement.productId,
                                    movementType: 'REVERSAL',
                                    quantity: reversingQuantity,
                                    movementDate: new Date(),
                                    reference: `REV-${originalEntry.reference}`,
                                    reason: `Inventory restoration - reversed journal entry ${originalEntry.reference}: ${reason || 'No reason provided'}`,
                                    unitCost: originalMovement.unitCost || 0
                                }
                            });
                            // Update product stock quantity (restore the quantity)
                            if (originalMovement.product) {
                                const currentStock = Number(originalMovement.product.stockQuantity);
                                const restoredStock = currentStock + Math.abs(reversingQuantity);
                                await tx.product.update({
                                    where: { id: originalMovement.productId },
                                    data: { stockQuantity: restoredStock }
                                });
                                stockRestored++;
                            }
                            inventoryMovementsReversed++;
                        }
                    }
                    catch (inventoryError) {
                        console.error('Error handling inventory during journal reversal:', inventoryError);
                        // Continue with journal reversal even if inventory handling fails
                        // This ensures the accounting reversal still works
                    }
                }
                // Create audit trail entries
                await tx.journalEntryAudit.createMany({
                    data: [
                        {
                            tenantId: req.tenantId,
                            entryId: id,
                            userId: req.user?.id || 'system',
                            action: 'REVERSED',
                            oldValues: JSON.stringify({ status: 'POSTED' }),
                            newValues: JSON.stringify({ status: 'REVERSED' }),
                            comments: `Entry reversed: ${reason || 'No reason provided'}`,
                            ipAddress: req.ip,
                            userAgent: req.get('User-Agent')
                        },
                        {
                            tenantId: req.tenantId,
                            entryId: reversalEntry.id,
                            userId: req.user?.id || 'system',
                            action: 'CREATED',
                            comments: `Reversal entry created for ${originalEntry.reference}`,
                            ipAddress: req.ip,
                            userAgent: req.get('User-Agent')
                        }
                    ]
                });
                return {
                    originalEntry: updatedOriginal,
                    reversalEntry,
                    reversalLines,
                    inventoryMovementsReversed,
                    stockRestored
                };
            });
            const inventoryMessage = result.inventoryMovementsReversed > 0
                ? ` and ${result.inventoryMovementsReversed} inventory movements reversed (${result.stockRestored} products restored)`
                : '';
            // Send email notification for reversal
            try {
                await emailNotificationService.sendStatusChange(id, 'REVERSED', reason);
            }
            catch (emailError) {
                console.error('Error sending reversal email:', emailError);
                // Don't fail the request if email fails
            }
            res.json({
                success: true,
                message: `Journal entry reversed successfully${inventoryMessage}`,
                data: result
            });
        }
        catch (error) {
            console.error('Error reversing journal entry:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to reverse journal entry' });
        }
    });
    // Create adjustment entry
    router.post('/entries/:id/adjust', validateBody(journalEntryAdjustment), async (req, res) => {
        try {
            const { id } = req.params;
            const { adjustments, reason } = req.body;
            const originalEntry = await prisma.journalEntry.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    lines: {
                        include: {
                            account: true
                        }
                    }
                }
            });
            if (!originalEntry) {
                return res.status(404).json({ error: 'not_found', message: 'Journal entry not found' });
            }
            if (originalEntry.status !== 'POSTED') {
                return res.status(400).json({ error: 'invalid_status', message: 'Only posted entries can be adjusted' });
            }
            const result = await prisma.$transaction(async (tx) => {
                // Create adjustment entry
                const adjustmentEntry = await tx.journalEntry.create({
                    data: {
                        tenantId: req.tenantId,
                        companyId: originalEntry.companyId,
                        date: new Date(),
                        memo: `Adjustment for ${originalEntry.memo} - ${reason || 'No reason provided'}`,
                        reference: `ADJ-${originalEntry.reference}`,
                        status: 'POSTED',
                        entryTypeId: originalEntry.entryTypeId || undefined,
                        createdById: req.user?.id
                    }
                });
                // Create adjustment journal lines
                const adjustmentLines = [];
                for (const adjustment of adjustments) {
                    const adjustmentLine = await tx.journalLine.create({
                        data: {
                            tenantId: req.tenantId,
                            entryId: adjustmentEntry.id,
                            accountId: adjustment.accountId,
                            debit: adjustment.debit || 0,
                            credit: adjustment.credit || 0,
                            memo: adjustment.memo || `Adjustment for ${originalEntry.reference}`,
                            department: adjustment.department,
                            project: adjustment.project,
                            location: adjustment.location
                        }
                    });
                    adjustmentLines.push(adjustmentLine);
                }
                // Create audit trail entry
                await tx.journalEntryAudit.create({
                    data: {
                        tenantId: req.tenantId,
                        entryId: adjustmentEntry.id,
                        userId: req.user?.id || 'system',
                        action: 'CREATED',
                        comments: `Adjustment entry created for ${originalEntry.reference}: ${reason || 'No reason provided'}`,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                });
                return {
                    adjustmentEntry,
                    adjustmentLines
                };
            });
            res.json({
                success: true,
                message: 'Adjustment entry created successfully',
                data: result
            });
        }
        catch (error) {
            console.error('Error creating adjustment entry:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to create adjustment entry' });
        }
    });
    // ==================== MULTI-LEVEL APPROVAL ====================
    // Create approval workflow for journal entry
    router.post('/entries/:id/request-approval', validateBody(journalEntryApprovalRequest), async (req, res) => {
        try {
            const { id } = req.params;
            const { approvers, comments } = req.body;
            const entry = await prisma.journalEntry.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                }
            });
            if (!entry) {
                return res.status(404).json({ error: 'not_found', message: 'Journal entry not found' });
            }
            if (entry.status !== 'DRAFT') {
                return res.status(400).json({ error: 'invalid_status', message: 'Only draft entries can be sent for approval' });
            }
            const result = await prisma.$transaction(async (tx) => {
                // Update entry status
                const updatedEntry = await tx.journalEntry.update({
                    where: { id },
                    data: { status: 'PENDING_APPROVAL' }
                });
                // Create approval requests for each approver
                const approvalRequests = [];
                for (let i = 0; i < approvers.length; i++) {
                    const approval = await tx.journalEntryApproval.create({
                        data: {
                            tenantId: req.tenantId,
                            entryId: id,
                            requestedById: req.user?.id || 'system',
                            approvedById: approvers[i],
                            status: 'PENDING',
                            comments: i === 0 ? comments : undefined
                        }
                    });
                    approvalRequests.push(approval);
                }
                // Create audit trail entry
                await tx.journalEntryAudit.create({
                    data: {
                        tenantId: req.tenantId,
                        entryId: id,
                        userId: req.user?.id || 'system',
                        action: 'APPROVAL_REQUESTED',
                        comments: `Approval requested from ${approvers.length} approver(s)`,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                });
                return {
                    entry: updatedEntry,
                    approvalRequests
                };
            });
            // Send email notifications to approvers
            try {
                const approverUsers = await prisma.appUser.findMany({
                    where: { id: { in: approvers } },
                    select: { email: true, name: true }
                });
                const approverEmails = approverUsers
                    .filter((approver) => approver.email)
                    .map((approver) => approver.email);
                if (approverEmails.length > 0) {
                    await emailNotificationService.sendApprovalRequest(id, approverEmails);
                }
            }
            catch (emailError) {
                console.error('Error sending approval request emails:', emailError);
                // Don't fail the request if email fails
            }
            res.json({
                success: true,
                message: 'Approval request created successfully',
                data: result
            });
        }
        catch (error) {
            console.error('Error requesting approval:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to request approval' });
        }
    });
    // ==================== ROLE-BASED PERMISSIONS ====================
    // Check user permissions for journal entry operations
    router.get('/permissions/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { companyId } = req.query;
            const user = await prisma.appUser.findFirst({
                where: {
                    id: userId,
                    tenantId: req.tenantId
                }
            });
            if (!user) {
                return res.status(404).json({ error: 'not_found', message: 'User not found' });
            }
            // Define permissions based on role string
            const getPermissionsByRole = (role) => {
                switch (role) {
                    case 'admin':
                        return {
                            canCreate: true,
                            canEdit: true,
                            canDelete: true,
                            canPost: true,
                            canReverse: true,
                            canApprove: true,
                            canViewAll: true,
                            maxApprovalAmount: 999999999
                        };
                    case 'accountant':
                        return {
                            canCreate: true,
                            canEdit: true,
                            canDelete: false,
                            canPost: true,
                            canReverse: true,
                            canApprove: true,
                            canViewAll: true,
                            maxApprovalAmount: 100000
                        };
                    case 'auditor':
                        return {
                            canCreate: false,
                            canEdit: false,
                            canDelete: false,
                            canPost: false,
                            canReverse: false,
                            canApprove: false,
                            canViewAll: true,
                            maxApprovalAmount: 0
                        };
                    case 'employee':
                        return {
                            canCreate: true,
                            canEdit: true,
                            canDelete: false,
                            canPost: false,
                            canReverse: false,
                            canApprove: false,
                            canViewAll: false,
                            maxApprovalAmount: 0
                        };
                    default:
                        return {
                            canCreate: false,
                            canEdit: false,
                            canDelete: false,
                            canPost: false,
                            canReverse: false,
                            canApprove: false,
                            canViewAll: false,
                            maxApprovalAmount: 0
                        };
                }
            };
            const permissions = getPermissionsByRole(user.role);
            res.json({ permissions });
        }
        catch (error) {
            console.error('Error fetching permissions:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch permissions' });
        }
    });
    // ==================== ADVANCED MONITORING ====================
    // Get performance metrics
    router.get('/metrics', async (req, res) => {
        try {
            const { companyId, startDate, endDate } = req.query;
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();
            const metrics = await prisma.$transaction(async (tx) => {
                // Entry processing metrics
                const totalEntries = await tx.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId: companyId,
                        createdAt: { gte: start, lte: end }
                    }
                });
                const postedEntries = await tx.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId: companyId,
                        status: 'POSTED',
                        createdAt: { gte: start, lte: end }
                    }
                });
                const draftEntries = await tx.journalEntry.count({
                    where: {
                        tenantId: req.tenantId,
                        companyId: companyId,
                        status: 'DRAFT',
                        createdAt: { gte: start, lte: end }
                    }
                });
                const pendingApprovals = await tx.journalEntryApproval.count({
                    where: {
                        tenantId: req.tenantId,
                        status: 'PENDING',
                        entry: {
                            companyId: companyId
                        }
                    }
                });
                // Error detection
                const unbalancedEntries = await tx.journalEntry.findMany({
                    where: {
                        tenantId: req.tenantId,
                        companyId: companyId,
                        status: 'POSTED',
                        createdAt: { gte: start, lte: end }
                    },
                    include: {
                        lines: true
                    }
                });
                const unbalancedCount = unbalancedEntries.filter(entry => {
                    const totalDebit = entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
                    const totalCredit = entry.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
                    return Math.abs(totalDebit - totalCredit) >= 0.01;
                }).length;
                // Processing time metrics (simplified)
                const avgProcessingTime = 2.5; // This would be calculated from actual data
                return {
                    totalEntries,
                    postedEntries,
                    draftEntries,
                    pendingApprovals,
                    unbalancedCount,
                    successRate: totalEntries > 0 ? (postedEntries / totalEntries) * 100 : 0,
                    avgProcessingTime,
                    errorRate: totalEntries > 0 ? (unbalancedCount / totalEntries) * 100 : 0
                };
            });
            res.json({ metrics });
        }
        catch (error) {
            console.error('Error fetching metrics:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch metrics' });
        }
    });
    // ==================== AUDIT TRAIL ====================
    // Get audit trail for journal entry
    router.get('/entries/:id/audit', async (req, res) => {
        try {
            const { id } = req.params;
            const auditTrail = await prisma.journalEntryAudit.findMany({
                where: {
                    entryId: id,
                    tenantId: req.tenantId
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'asc' }
            });
            res.json({ auditTrail });
        }
        catch (error) {
            console.error('Error fetching audit trail:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch audit trail' });
        }
    });
    // ==================== BATCH PROCESSING ENDPOINTS ====================
    // Batch create journal entries
    router.post('/entries/batch', validateBody(journalEntryBatchCreate), async (req, res) => {
        try {
            const { entries, options = {} } = req.body;
            const { validateBalances = true, stopOnError = true } = options;
            if (!Array.isArray(entries) || entries.length === 0) {
                return res.status(400).json({ error: 'invalid_input', message: 'Entries array is required and cannot be empty' });
            }
            if (entries.length > 100) {
                return res.status(400).json({ error: 'invalid_input', message: 'Maximum 100 entries allowed per batch' });
            }
            const results = {
                success: [],
                errors: [],
                summary: {
                    total: entries.length,
                    successful: 0,
                    failed: 0,
                    processingTime: 0
                }
            };
            const startTime = Date.now();
            // Process entries in transaction
            await prisma.$transaction(async (tx) => {
                for (let i = 0; i < entries.length; i++) {
                    const entryData = entries[i];
                    try {
                        // Validate entry data
                        if (!entryData.lines || !Array.isArray(entryData.lines) || entryData.lines.length === 0) {
                            throw new Error('Entry must have at least one line');
                        }
                        // Calculate totals
                        const totalDebit = entryData.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
                        const totalCredit = entryData.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
                        // Validate balance if required
                        if (validateBalances && Math.abs(totalDebit - totalCredit) > 0.01) {
                            throw new Error(`Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
                        }
                        // Create journal entry
                        const journalEntry = await tx.journalEntry.create({
                            data: {
                                tenantId: req.tenantId,
                                companyId: entryData.companyId || req.query.companyId,
                                date: new Date(entryData.date),
                                memo: entryData.memo || `Batch entry ${i + 1}`,
                                reference: entryData.reference || `BATCH-${Date.now()}-${i + 1}`,
                                status: entryData.status || 'DRAFT',
                                entryTypeId: entryData.entryTypeId,
                                createdById: req.user?.id
                            }
                        });
                        // Create journal lines
                        const journalLines = [];
                        for (const line of entryData.lines) {
                            const journalLine = await tx.journalLine.create({
                                data: {
                                    tenantId: req.tenantId,
                                    entryId: journalEntry.id,
                                    accountId: line.accountId,
                                    debit: Number(line.debit) || 0,
                                    credit: Number(line.credit) || 0,
                                    memo: line.memo,
                                    department: line.department,
                                    project: line.project,
                                    location: line.location
                                }
                            });
                            journalLines.push(journalLine);
                        }
                        // Create audit trail
                        await tx.journalEntryAudit.create({
                            data: {
                                entryId: journalEntry.id,
                                userId: req.user?.id || 'system',
                                action: 'CREATED',
                                comments: `Batch created entry ${i + 1}`,
                                ipAddress: req.ip,
                                userAgent: req.get('User-Agent')
                            }
                        });
                        results.success.push({
                            index: i,
                            entryId: journalEntry.id,
                            reference: journalEntry.reference,
                            totalDebit,
                            totalCredit,
                            isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
                        });
                        results.summary.successful++;
                    }
                    catch (error) {
                        const errorInfo = {
                            index: i,
                            error: error.message,
                            entryData: {
                                reference: entryData.reference || `Entry ${i + 1}`,
                                memo: entryData.memo
                            }
                        };
                        results.errors.push(errorInfo);
                        results.summary.failed++;
                        if (stopOnError) {
                            throw error; // Stop processing on first error
                        }
                    }
                }
            });
            results.summary.processingTime = Date.now() - startTime;
            res.json({
                success: true,
                message: `Batch processing completed. ${results.summary.successful} successful, ${results.summary.failed} failed`,
                data: results
            });
        }
        catch (error) {
            console.error('Error in batch create:', error);
            res.status(500).json({
                error: 'internal_error',
                message: 'Batch processing failed',
                details: error.message
            });
        }
    });
    // Batch approve journal entries
    router.post('/entries/batch/approve', validateBody(journalEntryBatchApprove), async (req, res) => {
        try {
            const { entryIds, comments = 'Batch approval' } = req.body;
            if (!Array.isArray(entryIds) || entryIds.length === 0) {
                return res.status(400).json({ error: 'invalid_input', message: 'Entry IDs array is required' });
            }
            if (entryIds.length > 50) {
                return res.status(400).json({ error: 'invalid_input', message: 'Maximum 50 entries allowed per batch approval' });
            }
            const results = {
                success: [],
                errors: [],
                summary: {
                    total: entryIds.length,
                    successful: 0,
                    failed: 0,
                    processingTime: 0
                }
            };
            const startTime = Date.now();
            await prisma.$transaction(async (tx) => {
                for (const entryId of entryIds) {
                    try {
                        // Find the entry
                        const entry = await tx.journalEntry.findFirst({
                            where: {
                                id: entryId,
                                tenantId: req.tenantId
                            },
                            include: {
                                approvals: {
                                    where: { status: 'PENDING' }
                                }
                            }
                        });
                        if (!entry) {
                            throw new Error('Entry not found');
                        }
                        if (entry.status !== 'PENDING_APPROVAL') {
                            throw new Error('Entry is not pending approval');
                        }
                        // Approve all pending approvals for this entry
                        for (const approval of entry.approvals) {
                            await tx.journalEntryApproval.update({
                                where: { id: approval.id },
                                data: {
                                    status: 'APPROVED',
                                    approvedById: req.user?.id,
                                    approvedAt: new Date(),
                                    comments: comments
                                }
                            });
                        }
                        // Update entry status to POSTED if all approvals are complete
                        await tx.journalEntry.update({
                            where: { id: entryId },
                            data: { status: 'POSTED' }
                        });
                        // Create audit trail
                        await tx.journalEntryAudit.create({
                            data: {
                                entryId: entryId,
                                userId: req.user?.id || 'system',
                                action: 'BATCH_APPROVED',
                                comments: `Batch approved: ${comments}`,
                                ipAddress: req.ip,
                                userAgent: req.get('User-Agent')
                            }
                        });
                        results.success.push({
                            entryId: entryId,
                            reference: entry.reference,
                            status: 'POSTED'
                        });
                        results.summary.successful++;
                    }
                    catch (error) {
                        results.errors.push({
                            entryId: entryId,
                            error: error.message
                        });
                        results.summary.failed++;
                    }
                }
            });
            results.summary.processingTime = Date.now() - startTime;
            res.json({
                success: true,
                message: `Batch approval completed. ${results.summary.successful} successful, ${results.summary.failed} failed`,
                data: results
            });
        }
        catch (error) {
            console.error('Error in batch approve:', error);
            res.status(500).json({
                error: 'internal_error',
                message: 'Batch approval failed',
                details: error.message
            });
        }
    });
    // Batch post journal entries
    router.post('/entries/batch/post', validateBody(journalEntryBatchPost), async (req, res) => {
        try {
            const { entryIds } = req.body;
            if (!Array.isArray(entryIds) || entryIds.length === 0) {
                return res.status(400).json({ error: 'invalid_input', message: 'Entry IDs array is required' });
            }
            if (entryIds.length > 50) {
                return res.status(400).json({ error: 'invalid_input', message: 'Maximum 50 entries allowed per batch post' });
            }
            const results = {
                success: [],
                errors: [],
                summary: {
                    total: entryIds.length,
                    successful: 0,
                    failed: 0,
                    processingTime: 0
                }
            };
            const startTime = Date.now();
            await prisma.$transaction(async (tx) => {
                for (const entryId of entryIds) {
                    try {
                        // Find the entry with lines
                        const entry = await tx.journalEntry.findFirst({
                            where: {
                                id: entryId,
                                tenantId: req.tenantId
                            },
                            include: {
                                lines: {
                                    include: {
                                        account: true
                                    }
                                }
                            }
                        });
                        if (!entry) {
                            throw new Error('Entry not found');
                        }
                        if (entry.status !== 'DRAFT') {
                            throw new Error('Only draft entries can be posted');
                        }
                        // Validate balance
                        const totalDebit = entry.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
                        const totalCredit = entry.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
                        if (Math.abs(totalDebit - totalCredit) > 0.01) {
                            throw new Error(`Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
                        }
                        // Update entry status
                        await tx.journalEntry.update({
                            where: { id: entryId },
                            data: {
                                status: 'POSTED',
                                postedAt: new Date()
                            }
                        });
                        // Create audit trail
                        await tx.journalEntryAudit.create({
                            data: {
                                entryId: entryId,
                                userId: req.user?.id || 'system',
                                action: 'BATCH_POSTED',
                                comments: 'Batch posted entry',
                                ipAddress: req.ip,
                                userAgent: req.get('User-Agent')
                            }
                        });
                        results.success.push({
                            entryId: entryId,
                            reference: entry.reference,
                            status: 'POSTED',
                            totalDebit,
                            totalCredit
                        });
                        results.summary.successful++;
                    }
                    catch (error) {
                        results.errors.push({
                            entryId: entryId,
                            error: error.message
                        });
                        results.summary.failed++;
                    }
                }
            });
            results.summary.processingTime = Date.now() - startTime;
            res.json({
                success: true,
                message: `Batch posting completed. ${results.summary.successful} successful, ${results.summary.failed} failed`,
                data: results
            });
        }
        catch (error) {
            console.error('Error in batch post:', error);
            res.status(500).json({
                error: 'internal_error',
                message: 'Batch posting failed',
                details: error.message
            });
        }
    });
    // Batch reverse journal entries
    router.post('/entries/batch/reverse', validateBody(journalEntryBatchReverse), async (req, res) => {
        try {
            const { entryIds, reason = 'Batch reversal' } = req.body;
            if (!Array.isArray(entryIds) || entryIds.length === 0) {
                return res.status(400).json({ error: 'invalid_input', message: 'Entry IDs array is required' });
            }
            if (entryIds.length > 25) {
                return res.status(400).json({ error: 'invalid_input', message: 'Maximum 25 entries allowed per batch reversal' });
            }
            const results = {
                success: [],
                errors: [],
                summary: {
                    total: entryIds.length,
                    successful: 0,
                    failed: 0,
                    processingTime: 0,
                    inventoryMovementsReversed: 0,
                    stockRestored: 0
                }
            };
            const startTime = Date.now();
            await prisma.$transaction(async (tx) => {
                for (const entryId of entryIds) {
                    try {
                        // Find the entry
                        const entry = await tx.journalEntry.findFirst({
                            where: {
                                id: entryId,
                                tenantId: req.tenantId
                            },
                            include: {
                                lines: {
                                    include: {
                                        account: true
                                    }
                                }
                            }
                        });
                        if (!entry) {
                            throw new Error('Entry not found');
                        }
                        if (entry.status !== 'POSTED') {
                            throw new Error('Only posted entries can be reversed');
                        }
                        // Mark original as reversed
                        await tx.journalEntry.update({
                            where: { id: entryId },
                            data: {
                                status: 'REVERSED',
                                memo: `${entry.memo} - REVERSED: ${reason}`
                            }
                        });
                        // Create reversal entry
                        const reversalEntry = await tx.journalEntry.create({
                            data: {
                                tenantId: req.tenantId,
                                companyId: entry.companyId,
                                date: new Date(),
                                memo: `Reversal of ${entry.memo} - ${reason}`,
                                reference: `REV-${entry.reference}`,
                                status: 'POSTED',
                                entryTypeId: entry.entryTypeId,
                                createdById: req.user?.id
                            }
                        });
                        // Create reversal journal lines
                        for (const originalLine of entry.lines) {
                            await tx.journalLine.create({
                                data: {
                                    tenantId: req.tenantId,
                                    entryId: reversalEntry.id,
                                    accountId: originalLine.accountId,
                                    debit: originalLine.credit,
                                    credit: originalLine.debit,
                                    memo: `Reversal of ${originalLine.memo || originalLine.account?.name || 'Entry line'}`,
                                    department: originalLine.department,
                                    project: originalLine.project,
                                    location: originalLine.location
                                }
                            });
                        }
                        // Handle inventory movements if applicable
                        let inventoryMovementsReversed = 0;
                        let stockRestored = 0;
                        if (entry.reference && (entry.reference.startsWith('INV-') || entry.reference.startsWith('POS-'))) {
                            const originalMovements = await tx.inventoryMovement.findMany({
                                where: {
                                    tenantId: req.tenantId,
                                    reference: entry.reference
                                },
                                include: { product: true }
                            });
                            for (const originalMovement of originalMovements) {
                                const originalQuantity = Number(originalMovement.quantity);
                                const reversingQuantity = -originalQuantity;
                                await tx.inventoryMovement.create({
                                    data: {
                                        tenantId: req.tenantId,
                                        productId: originalMovement.productId,
                                        movementType: 'REVERSAL',
                                        quantity: reversingQuantity,
                                        movementDate: new Date(),
                                        reference: `REV-${entry.reference}`,
                                        reason: `Inventory restoration - batch reversed journal entry ${entry.reference}: ${reason}`,
                                        unitCost: originalMovement.unitCost || 0
                                    }
                                });
                                if (originalMovement.product) {
                                    const currentStock = Number(originalMovement.product.stockQuantity);
                                    const restoredStock = currentStock + Math.abs(reversingQuantity);
                                    await tx.product.update({
                                        where: { id: originalMovement.productId },
                                        data: { stockQuantity: restoredStock }
                                    });
                                    stockRestored++;
                                }
                                inventoryMovementsReversed++;
                            }
                        }
                        // Create audit trail
                        await tx.journalEntryAudit.createMany([
                            {
                                entryId: entryId,
                                userId: req.user?.id || 'system',
                                action: 'BATCH_REVERSED',
                                oldValues: JSON.stringify({ status: 'POSTED' }),
                                newValues: JSON.stringify({ status: 'REVERSED' }),
                                comments: `Batch reversed: ${reason}`,
                                ipAddress: req.ip,
                                userAgent: req.get('User-Agent')
                            },
                            {
                                entryId: reversalEntry.id,
                                userId: req.user?.id || 'system',
                                action: 'CREATED',
                                comments: `Batch reversal entry created for ${entry.reference}`,
                                ipAddress: req.ip,
                                userAgent: req.get('User-Agent')
                            }
                        ]);
                        results.success.push({
                            entryId: entryId,
                            reference: entry.reference,
                            reversalEntryId: reversalEntry.id,
                            reversalReference: reversalEntry.reference,
                            inventoryMovementsReversed,
                            stockRestored
                        });
                        results.summary.successful++;
                        results.summary.inventoryMovementsReversed += inventoryMovementsReversed;
                        results.summary.stockRestored += stockRestored;
                    }
                    catch (error) {
                        results.errors.push({
                            entryId: entryId,
                            error: error.message
                        });
                        results.summary.failed++;
                    }
                }
            });
            results.summary.processingTime = Date.now() - startTime;
            const inventoryMessage = results.summary.inventoryMovementsReversed > 0
                ? ` and ${results.summary.inventoryMovementsReversed} inventory movements reversed (${results.summary.stockRestored} products restored)`
                : '';
            res.json({
                success: true,
                message: `Batch reversal completed. ${results.summary.successful} successful, ${results.summary.failed} failed${inventoryMessage}`,
                data: results
            });
        }
        catch (error) {
            console.error('Error in batch reverse:', error);
            res.status(500).json({
                error: 'internal_error',
                message: 'Batch reversal failed',
                details: error.message
            });
        }
    });
    // Get batch processing status
    router.get('/entries/batch/status/:batchId', async (req, res) => {
        try {
            const { batchId } = req.params;
            // This would typically be stored in a batch processing table
            // For now, we'll return a simple status
            res.json({
                batchId,
                status: 'completed',
                message: 'Batch processing status endpoint - implementation pending'
            });
        }
        catch (error) {
            console.error('Error fetching batch status:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch batch status' });
        }
    });
    // ==================== IMPORT/EXPORT ENDPOINTS ====================
    // Export journal entries to CSV
    router.get('/entries/export/csv', async (req, res) => {
        try {
            const { companyId, dateFrom, dateTo, status, entryType, format = 'detailed' // 'detailed' or 'summary'
             } = req.query;
            // Build where clause
            const whereClause = {
                tenantId: req.tenantId
            };
            if (companyId)
                whereClause.companyId = companyId;
            if (status && status !== 'all')
                whereClause.status = status;
            if (entryType && entryType !== 'all')
                whereClause.entryTypeId = entryType;
            if (dateFrom || dateTo) {
                whereClause.date = {};
                if (dateFrom)
                    whereClause.date.gte = new Date(dateFrom);
                if (dateTo)
                    whereClause.date.lte = new Date(dateTo);
            }
            // Fetch entries with related data
            const entries = await prisma.journalEntry.findMany({
                where: whereClause,
                include: {
                    lines: {
                        include: {
                            account: true
                        }
                    },
                    entryType: true,
                    createdBy: {
                        select: { name: true, email: true }
                    }
                },
                orderBy: { date: 'desc' }
            });
            // Generate CSV content
            let csvContent = '';
            if (format === 'detailed') {
                // Detailed format with all journal lines
                csvContent = 'Entry ID,Reference,Date,Memo,Status,Entry Type,Created By,Account,Description,Debit,Credit,Department,Project,Location\n';
                for (const entry of entries) {
                    const baseData = [
                        entry.id,
                        entry.reference,
                        entry.date.toISOString().split('T')[0],
                        `"${entry.memo.replace(/"/g, '""')}"`,
                        entry.status,
                        entry.entryType?.name || '',
                        entry.createdBy?.name || 'System'
                    ].join(',');
                    if (entry.lines.length === 0) {
                        csvContent += baseData + ',,,,,,\n';
                    }
                    else {
                        for (const line of entry.lines) {
                            const lineData = [
                                baseData,
                                line.account?.name || '',
                                `"${(line.memo || '').replace(/"/g, '""')}"`,
                                line.debit || 0,
                                line.credit || 0,
                                line.department || '',
                                line.project || '',
                                line.location || ''
                            ].join(',');
                            csvContent += lineData + '\n';
                        }
                    }
                }
            }
            else {
                // Summary format with entry totals
                csvContent = 'Entry ID,Reference,Date,Memo,Status,Entry Type,Created By,Total Debit,Total Credit,Is Balanced,Line Count\n';
                for (const entry of entries) {
                    const totalDebit = entry.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
                    const totalCredit = entry.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
                    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
                    const row = [
                        entry.id,
                        entry.reference,
                        entry.date.toISOString().split('T')[0],
                        `"${entry.memo.replace(/"/g, '""')}"`,
                        entry.status,
                        entry.entryType?.name || '',
                        entry.createdBy?.name || 'System',
                        totalDebit,
                        totalCredit,
                        isBalanced ? 'Yes' : 'No',
                        entry.lines.length
                    ].join(',');
                    csvContent += row + '\n';
                }
            }
            // Set response headers
            const filename = `journal-entries-${new Date().toISOString().split('T')[0]}.csv`;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csvContent);
        }
        catch (error) {
            console.error('Error exporting CSV:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to export CSV' });
        }
    });
    // Export journal entries to Excel
    router.get('/entries/export/excel', async (req, res) => {
        try {
            const { companyId, dateFrom, dateTo, status, entryType, format = 'detailed' } = req.query;
            // For now, we'll return CSV format with Excel headers
            // In a production environment, you'd use a library like 'xlsx' or 'exceljs'
            const csvResponse = await fetch(`${req.protocol}://${req.get('host')}/api/journal-hub/entries/export/csv?${new URLSearchParams(req.query).toString()}`);
            if (!csvResponse.ok) {
                throw new Error('Failed to generate CSV data');
            }
            const csvContent = await csvResponse.text();
            // Set Excel headers
            const filename = `journal-entries-${new Date().toISOString().split('T')[0]}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            // For now, return CSV content with Excel headers
            // In production, convert to actual Excel format
            res.send(csvContent);
        }
        catch (error) {
            console.error('Error exporting Excel:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to export Excel' });
        }
    });
    // Import journal entries from CSV
    router.post('/entries/import/csv', validateBody(journalEntryCsvImport), async (req, res) => {
        try {
            const { csvData, options = {} } = req.body;
            const { validateBalances = true, createAsDraft = true, skipHeaderRow = true, dateFormat = 'YYYY-MM-DD' } = options;
            if (!csvData || typeof csvData !== 'string') {
                return res.status(400).json({ error: 'invalid_input', message: 'CSV data is required' });
            }
            // Parse CSV data
            const lines = csvData.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                return res.status(400).json({ error: 'invalid_input', message: 'No data found in CSV' });
            }
            // Skip header row if specified
            const dataLines = skipHeaderRow ? lines.slice(1) : lines;
            const results = {
                success: [],
                errors: [],
                summary: {
                    total: dataLines.length,
                    successful: 0,
                    failed: 0,
                    processingTime: 0
                }
            };
            const startTime = Date.now();
            // Group lines by entry (assuming entries are grouped together)
            const entryGroups = [];
            let currentEntry = null;
            for (let i = 0; i < dataLines.length; i++) {
                const line = dataLines[i].trim();
                if (!line)
                    continue;
                const columns = line.split(',').map(col => col.replace(/^"|"$/g, '').trim());
                // Check if this is a new entry (has entry-level data)
                if (columns.length >= 4) {
                    // If we have a current entry, save it
                    if (currentEntry) {
                        entryGroups.push(currentEntry);
                    }
                    // Start new entry
                    currentEntry = {
                        reference: columns[0] || `IMPORT-${Date.now()}-${i}`,
                        date: columns[1] || new Date().toISOString().split('T')[0],
                        memo: columns[2] || 'Imported entry',
                        status: createAsDraft ? 'DRAFT' : 'POSTED',
                        lines: []
                    };
                }
                // Add line to current entry
                if (currentEntry && columns.length >= 6) {
                    currentEntry.lines.push({
                        accountName: columns[3] || '',
                        description: columns[4] || '',
                        debit: parseFloat(columns[5]) || 0,
                        credit: parseFloat(columns[6]) || 0,
                        department: columns[7] || '',
                        project: columns[8] || '',
                        location: columns[9] || ''
                    });
                }
            }
            // Add the last entry
            if (currentEntry) {
                entryGroups.push(currentEntry);
            }
            // Process entries
            await prisma.$transaction(async (tx) => {
                for (let i = 0; i < entryGroups.length; i++) {
                    const entryData = entryGroups[i];
                    try {
                        // Validate entry has lines
                        if (!entryData.lines || entryData.lines.length === 0) {
                            throw new Error('Entry must have at least one line');
                        }
                        // Find accounts by name (simplified - in production, you'd have better account matching)
                        const accountMap = new Map();
                        for (const line of entryData.lines) {
                            if (line.accountName && !accountMap.has(line.accountName)) {
                                const account = await tx.account.findFirst({
                                    where: {
                                        tenantId: req.tenantId,
                                        name: { contains: line.accountName }
                                    }
                                });
                                accountMap.set(line.accountName, account?.id);
                            }
                        }
                        // Calculate totals
                        const totalDebit = entryData.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
                        const totalCredit = entryData.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
                        // Validate balance if required
                        if (validateBalances && Math.abs(totalDebit - totalCredit) > 0.01) {
                            throw new Error(`Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
                        }
                        // Create journal entry
                        const journalEntry = await tx.journalEntry.create({
                            data: {
                                tenantId: req.tenantId,
                                companyId: req.query.companyId,
                                date: new Date(entryData.date),
                                memo: entryData.memo,
                                reference: entryData.reference,
                                status: entryData.status,
                                createdById: req.user?.id
                            }
                        });
                        // Create journal lines
                        for (const line of entryData.lines) {
                            const accountId = accountMap.get(line.accountName);
                            if (!accountId) {
                                throw new Error(`Account not found: ${line.accountName}`);
                            }
                            await tx.journalLine.create({
                                data: {
                                    tenantId: req.tenantId,
                                    entryId: journalEntry.id,
                                    accountId: accountId,
                                    debit: Number(line.debit) || 0,
                                    credit: Number(line.credit) || 0,
                                    memo: line.description,
                                    department: line.department,
                                    project: line.project,
                                    location: line.location
                                }
                            });
                        }
                        // Create audit trail
                        await tx.journalEntryAudit.create({
                            data: {
                                entryId: journalEntry.id,
                                userId: req.user?.id || 'system',
                                action: 'IMPORTED',
                                comments: `Imported from CSV: ${entryData.reference}`,
                                ipAddress: req.ip,
                                userAgent: req.get('User-Agent')
                            }
                        });
                        results.success.push({
                            index: i,
                            entryId: journalEntry.id,
                            reference: journalEntry.reference,
                            totalDebit,
                            totalCredit,
                            isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
                        });
                        results.summary.successful++;
                    }
                    catch (error) {
                        results.errors.push({
                            index: i,
                            error: error.message,
                            entryData: {
                                reference: entryData.reference,
                                memo: entryData.memo
                            }
                        });
                        results.summary.failed++;
                    }
                }
            });
            results.summary.processingTime = Date.now() - startTime;
            res.json({
                success: true,
                message: `CSV import completed. ${results.summary.successful} successful, ${results.summary.failed} failed`,
                data: results
            });
        }
        catch (error) {
            console.error('Error importing CSV:', error);
            res.status(500).json({
                error: 'internal_error',
                message: 'CSV import failed',
                details: error.message
            });
        }
    });
    // Get import template
    router.get('/entries/import/template', async (req, res) => {
        try {
            const { format = 'csv' } = req.query;
            let templateContent = '';
            let filename = '';
            let contentType = '';
            if (format === 'csv') {
                templateContent = 'Reference,Date,Memo,Account Name,Description,Debit,Credit,Department,Project,Location\n' +
                    'SAMPLE-001,2024-01-15,Sample entry,Cash,Received payment,1000,0,Main Office,Project A,Location 1\n' +
                    'SAMPLE-001,2024-01-15,Sample entry,Revenue,Sales revenue,0,1000,Main Office,Project A,Location 1\n' +
                    'SAMPLE-002,2024-01-16,Another entry,Expenses,Office supplies,500,0,Main Office,Project B,Location 2\n' +
                    'SAMPLE-002,2024-01-16,Another entry,Cash,Paid for supplies,0,500,Main Office,Project B,Location 2';
                filename = 'journal-entries-template.csv';
                contentType = 'text/csv';
            }
            else {
                // Excel template (return CSV for now)
                templateContent = 'Reference,Date,Memo,Account Name,Description,Debit,Credit,Department,Project,Location\n' +
                    'SAMPLE-001,2024-01-15,Sample entry,Cash,Received payment,1000,0,Main Office,Project A,Location 1\n' +
                    'SAMPLE-001,2024-01-15,Sample entry,Revenue,Sales revenue,0,1000,Main Office,Project A,Location 1';
                filename = 'journal-entries-template.xlsx';
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            }
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(templateContent);
        }
        catch (error) {
            console.error('Error generating template:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to generate template' });
        }
    });
    // ==================== ADVANCED SEARCH ENDPOINTS ====================
    // Advanced search with multiple filters
    router.get('/entries/search/advanced', async (req, res) => {
        try {
            const { companyId, searchTerm, dateFrom, dateTo, status, entryType, accountId, amountMin, amountMax, reference, memo, createdById, department, project, location, isBalanced, sortBy = 'date', sortOrder = 'desc', page = 1, pageSize = 20 } = req.query;
            // Build where clause
            const whereClause = {
                tenantId: req.tenantId
            };
            if (companyId)
                whereClause.companyId = companyId;
            if (status && status !== 'all')
                whereClause.status = status;
            if (entryType && entryType !== 'all')
                whereClause.entryTypeId = entryType;
            if (createdById)
                whereClause.createdById = createdById;
            if (isBalanced !== undefined) {
                // This will be calculated after fetching entries
            }
            // Date range filter
            if (dateFrom || dateTo) {
                whereClause.date = {};
                if (dateFrom)
                    whereClause.date.gte = new Date(dateFrom);
                if (dateTo)
                    whereClause.date.lte = new Date(dateTo);
            }
            // Text search filters
            if (searchTerm) {
                whereClause.OR = [
                    { reference: { contains: searchTerm } },
                    { memo: { contains: searchTerm } }
                ];
            }
            if (reference)
                whereClause.reference = { contains: reference };
            if (memo)
                whereClause.memo = { contains: memo };
            // Amount filters (will be applied after fetching)
            const amountFilters = {
                min: amountMin ? parseFloat(amountMin) : undefined,
                max: amountMax ? parseFloat(amountMax) : undefined
            };
            // Account filter (through journal lines)
            let accountFilter = undefined;
            if (accountId) {
                accountFilter = {
                    lines: {
                        some: {
                            accountId: accountId
                        }
                    }
                };
            }
            // Department/Project/Location filters (through journal lines)
            let lineFilters = {};
            if (department)
                lineFilters.department = { contains: department };
            if (project)
                lineFilters.project = { contains: project };
            if (location)
                lineFilters.location = { contains: location };
            if (Object.keys(lineFilters).length > 0) {
                whereClause.lines = {
                    some: lineFilters
                };
            }
            // Combine account filter with main where clause
            if (accountFilter) {
                whereClause.AND = [accountFilter];
            }
            // Calculate pagination
            const skip = (Number(page) - 1) * Number(pageSize);
            const take = Number(pageSize);
            // Build order by clause
            const orderBy = {};
            switch (sortBy) {
                case 'date':
                    orderBy.date = sortOrder;
                    break;
                case 'reference':
                    orderBy.reference = sortOrder;
                    break;
                case 'amount':
                    orderBy.totalAmount = sortOrder;
                    break;
                case 'status':
                    orderBy.status = sortOrder;
                    break;
                case 'created':
                    orderBy.createdAt = sortOrder;
                    break;
                default:
                    orderBy.date = 'desc';
            }
            // Fetch entries with related data
            const [entries, totalCount] = await Promise.all([
                prisma.journalEntry.findMany({
                    where: whereClause,
                    include: {
                        lines: {
                            include: {
                                account: true
                            }
                        },
                        entryType: true,
                        createdBy: {
                            select: { name: true, email: true }
                        }
                    },
                    orderBy,
                    skip,
                    take
                }),
                prisma.journalEntry.count({ where: whereClause })
            ]);
            // Calculate totals and balance status for each entry
            const processedEntries = entries.map(entry => {
                const totalDebit = entry.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
                const totalCredit = entry.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
                const totalAmount = Math.max(totalDebit, totalCredit);
                const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
                return {
                    ...entry,
                    totalDebit,
                    totalCredit,
                    totalAmount,
                    isBalanced
                };
            });
            // Apply amount filters
            let filteredEntries = processedEntries;
            if (amountFilters.min !== undefined || amountFilters.max !== undefined) {
                filteredEntries = processedEntries.filter(entry => {
                    if (amountFilters.min !== undefined && entry.totalAmount < amountFilters.min)
                        return false;
                    if (amountFilters.max !== undefined && entry.totalAmount > amountFilters.max)
                        return false;
                    return true;
                });
            }
            // Apply balance filter
            if (isBalanced !== undefined) {
                const balanceFilter = isBalanced === 'true';
                filteredEntries = filteredEntries.filter(entry => entry.isBalanced === balanceFilter);
            }
            // Calculate pagination info
            const totalPages = Math.ceil(totalCount / Number(pageSize));
            const hasNextPage = Number(page) < totalPages;
            const hasPreviousPage = Number(page) > 1;
            res.json({
                success: true,
                data: {
                    entries: filteredEntries,
                    pagination: {
                        page: Number(page),
                        pageSize: Number(pageSize),
                        totalCount,
                        totalPages,
                        hasNextPage,
                        hasPreviousPage
                    },
                    filters: {
                        searchTerm,
                        dateFrom,
                        dateTo,
                        status,
                        entryType,
                        accountId,
                        amountMin,
                        amountMax,
                        reference,
                        memo,
                        createdById,
                        department,
                        project,
                        location,
                        isBalanced,
                        sortBy,
                        sortOrder
                    }
                }
            });
        }
        catch (error) {
            console.error('Error in advanced search:', error);
            res.status(500).json({ error: 'internal_error', message: 'Advanced search failed' });
        }
    });
    // Save search query
    router.post('/search/save', validateBody(journalSearchSave), async (req, res) => {
        try {
            const { name, description, filters, isPublic = false } = req.body;
            // Check if search with same name exists
            const existingSearch = await prisma.journalSearch.findFirst({
                where: {
                    tenantId: req.tenantId,
                    name: name,
                    createdById: req.user?.id
                }
            });
            if (existingSearch) {
                return res.status(400).json({
                    error: 'duplicate_name',
                    message: 'A search with this name already exists'
                });
            }
            // Create saved search
            const savedSearch = await prisma.journalSearch.create({
                data: {
                    tenantId: req.tenantId,
                    name,
                    description: description || '',
                    filters: JSON.stringify(filters),
                    isPublic,
                    createdById: req.user?.id
                }
            });
            res.json({
                success: true,
                message: 'Search saved successfully',
                data: savedSearch
            });
        }
        catch (error) {
            console.error('Error saving search:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to save search' });
        }
    });
    // Get saved searches
    router.get('/search/saved', async (req, res) => {
        try {
            const { includePublic = 'true' } = req.query;
            const whereClause = {
                tenantId: req.tenantId
            };
            if (includePublic === 'true') {
                whereClause.OR = [
                    { createdById: req.user?.id },
                    { isPublic: true }
                ];
            }
            else {
                whereClause.createdById = req.user?.id;
            }
            const savedSearches = await prisma.journalSearch.findMany({
                where: whereClause,
                include: {
                    createdBy: {
                        select: { name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json({
                success: true,
                data: savedSearches
            });
        }
        catch (error) {
            console.error('Error fetching saved searches:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch saved searches' });
        }
    });
    // Update saved search
    router.put('/search/saved/:id', validateBody(journalSearchUpdate), async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, filters, isPublic } = req.body;
            // Check if search exists and user owns it
            const existingSearch = await prisma.journalSearch.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId,
                    createdById: req.user?.id
                }
            });
            if (!existingSearch) {
                return res.status(404).json({ error: 'not_found', message: 'Saved search not found' });
            }
            // Update search
            const updatedSearch = await prisma.journalSearch.update({
                where: { id },
                data: {
                    name,
                    description,
                    filters: JSON.stringify(filters),
                    isPublic,
                    updatedAt: new Date()
                }
            });
            res.json({
                success: true,
                message: 'Search updated successfully',
                data: updatedSearch
            });
        }
        catch (error) {
            console.error('Error updating search:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to update search' });
        }
    });
    // Delete saved search
    router.delete('/search/saved/:id', async (req, res) => {
        try {
            const { id } = req.params;
            // Check if search exists and user owns it
            const existingSearch = await prisma.journalSearch.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId,
                    createdById: req.user?.id
                }
            });
            if (!existingSearch) {
                return res.status(404).json({ error: 'not_found', message: 'Saved search not found' });
            }
            // Delete search
            await prisma.journalSearch.delete({
                where: { id }
            });
            res.json({
                success: true,
                message: 'Search deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting search:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to delete search' });
        }
    });
    // Get search suggestions
    router.get('/search/suggestions', async (req, res) => {
        try {
            const { field, query } = req.query;
            if (!field || !query) {
                return res.status(400).json({ error: 'invalid_input', message: 'Field and query are required' });
            }
            let suggestions = [];
            switch (field) {
                case 'reference':
                    const references = await prisma.journalEntry.findMany({
                        where: {
                            tenantId: req.tenantId,
                            reference: { contains: query }
                        },
                        select: { reference: true },
                        distinct: ['reference'],
                        take: 10
                    });
                    suggestions = references.map(r => r.reference);
                    break;
                case 'memo':
                    const memos = await prisma.journalEntry.findMany({
                        where: {
                            tenantId: req.tenantId,
                            memo: { contains: query }
                        },
                        select: { memo: true },
                        distinct: ['memo'],
                        take: 10
                    });
                    suggestions = memos.map(m => m.memo);
                    break;
                case 'department':
                    const departments = await prisma.journalLine.findMany({
                        where: {
                            tenantId: req.tenantId,
                            department: { contains: query }
                        },
                        select: { department: true },
                        distinct: ['department'],
                        take: 10
                    });
                    suggestions = departments.map(d => d.department).filter(Boolean);
                    break;
                case 'project':
                    const projects = await prisma.journalLine.findMany({
                        where: {
                            tenantId: req.tenantId,
                            project: { contains: query }
                        },
                        select: { project: true },
                        distinct: ['project'],
                        take: 10
                    });
                    suggestions = projects.map(p => p.project).filter(Boolean);
                    break;
                case 'location':
                    const locations = await prisma.journalLine.findMany({
                        where: {
                            tenantId: req.tenantId,
                            location: { contains: query }
                        },
                        select: { location: true },
                        distinct: ['location'],
                        take: 10
                    });
                    suggestions = locations.map(l => l.location).filter(Boolean);
                    break;
                default:
                    return res.status(400).json({ error: 'invalid_field', message: 'Invalid field specified' });
            }
            res.json({
                success: true,
                data: suggestions
            });
        }
        catch (error) {
            console.error('Error fetching suggestions:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch suggestions' });
        }
    });
    // ==================== PDF GENERATION ENDPOINTS ====================
    // Generate PDF for single journal entry
    router.get('/entries/:id/pdf', async (req, res) => {
        try {
            const { id } = req.params;
            const { includeAuditTrail = 'true', includeCompanyHeader = 'true', format = 'detailed' } = req.query;
            const options = {
                includeAuditTrail: includeAuditTrail === 'true',
                includeCompanyHeader: includeCompanyHeader === 'true',
                format: format
            };
            const pdfBuffer = await pdfGenerationService.generatePDF(id, options);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="journal-entry-${id}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
        }
        catch (error) {
            console.error('Error generating PDF:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to generate PDF' });
        }
    });
    // Generate PDF for multiple journal entries
    router.post('/entries/pdf/batch', async (req, res) => {
        try {
            const { entryIds, includeAuditTrail = true, includeCompanyHeader = true, format = 'detailed' } = req.body;
            if (!Array.isArray(entryIds) || entryIds.length === 0) {
                return res.status(400).json({ error: 'invalid_input', message: 'Entry IDs array is required' });
            }
            if (entryIds.length > 10) {
                return res.status(400).json({ error: 'invalid_input', message: 'Maximum 10 entries allowed per batch PDF' });
            }
            const options = {
                includeAuditTrail,
                includeCompanyHeader,
                format: format
            };
            const pdfBuffer = await pdfGenerationService.generateMultiplePDFs(entryIds, options);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="journal-entries-${Date.now()}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
        }
        catch (error) {
            console.error('Error generating batch PDF:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to generate batch PDF' });
        }
    });
    // Get PDF preview (HTML)
    router.get('/entries/:id/preview', async (req, res) => {
        try {
            const { id } = req.params;
            const { includeAuditTrail = 'true', includeCompanyHeader = 'true', format = 'detailed' } = req.query;
            const options = {
                includeAuditTrail: includeAuditTrail === 'true',
                includeCompanyHeader: includeCompanyHeader === 'true',
                format: format
            };
            // Fetch entry data
            const entry = await prisma.journalEntry.findUnique({
                where: { id },
                include: {
                    lines: {
                        include: {
                            account: true
                        }
                    },
                    createdBy: {
                        select: { name: true, email: true }
                    },
                    entryType: true,
                    company: true,
                    audits: {
                        include: {
                            user: {
                                select: { name: true, email: true }
                            }
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    }
                }
            });
            if (!entry) {
                return res.status(404).json({ error: 'not_found', message: 'Journal entry not found' });
            }
            // Calculate totals
            const totalDebit = entry.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
            const totalCredit = entry.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
            // Prepare data
            const entryData = {
                entry: {
                    id: entry.id,
                    reference: entry.reference,
                    date: entry.date.toISOString(),
                    memo: entry.memo,
                    status: entry.status,
                    totalDebit,
                    totalCredit,
                    isBalanced,
                    createdBy: entry.createdBy,
                    entryType: entry.entryType,
                    company: entry.company
                },
                lines: entry.lines.map(line => ({
                    account: {
                        name: line.account.name,
                        code: line.account.code,
                        type: line.account.type
                    },
                    debit: Number(line.debit) || 0,
                    credit: Number(line.credit) || 0,
                    memo: line.memo,
                    department: line.department,
                    project: line.project,
                    location: line.location
                })),
                auditTrail: options.includeAuditTrail ? entry.audits.map(audit => ({
                    action: audit.action,
                    user: audit.user?.name || 'System',
                    timestamp: audit.createdAt.toISOString(),
                    comments: audit.comments
                })) : undefined
            };
            const html = await pdfGenerationService.generateHTML(entryData, options);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (error) {
            console.error('Error generating preview:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to generate preview' });
        }
    });
}
// Helper function to calculate next run date for recurring entries
function calculateNextRunDate(currentDate, frequency) {
    const nextDate = new Date(currentDate);
    switch (frequency) {
        case 'DAILY':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'WEEKLY':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'MONTHLY':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'QUARTERLY':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case 'YEARLY':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        default:
            nextDate.setDate(nextDate.getDate() + 1);
    }
    return nextDate;
}
