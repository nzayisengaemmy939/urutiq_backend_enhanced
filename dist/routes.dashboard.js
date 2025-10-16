import { prisma } from './prisma.js';
export function mountDashboardRoutes(router) {
    // Get comprehensive dashboard data
    router.get('/dashboard', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const period = String(req.query.period || '30'); // days
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            const now = new Date();
            const startDate = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);
            console.log('=== DASHBOARD BACKEND DEBUG ===');
            console.log('Received companyId:', companyId);
            console.log('Received tenantId:', req.tenantId);
            console.log('Period startDate:', startDate);
            // Get all invoices for this company with due dates
            const allInvoices = await prisma.invoice.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId
                },
                select: {
                    id: true,
                    invoiceNumber: true,
                    status: true,
                    totalAmount: true,
                    issueDate: true,
                    dueDate: true
                }
            });
            console.log('=== ALL INVOICES DEBUG ===');
            console.log('Total invoices found:', allInvoices.length);
            allInvoices.forEach(inv => {
                const isOverdue = inv.dueDate && inv.dueDate < now;
                console.log(`Invoice ${inv.invoiceNumber}: status="${inv.status}", dueDate=${inv.dueDate || 'NULL'}, isOverdue=${isOverdue}`);
            });
            // Calculate pending invoices (draft/pending status)
            const pendingInvoices = allInvoices.filter(inv => ['draft', 'DRAFT', 'pending', 'PENDING'].includes(inv.status)).length;
            // Calculate overdue invoices (past due date, not paid/cancelled, has due date)
            const overdueInvoices = allInvoices.filter(inv => inv.dueDate &&
                inv.dueDate < now &&
                !['PAID', 'paid', 'CANCELLED', 'cancelled'].includes(inv.status)).length;
            console.log('Pending invoices (draft/pending status):', pendingInvoices);
            console.log('Overdue invoices (past due, not paid):', overdueInvoices);
            // ===== SENIOR IMPLEMENTATION: COMPREHENSIVE FINANCIAL CALCULATIONS =====
            let totalRevenue = 0;
            let totalExpenses = 0;
            try {
                // PERFORMANCE: Execute all financial queries in parallel
                const [invoiceRevenueResult, journalRevenueResult, expenseTableResult, journalExpenseResult] = await Promise.all([
                    // 1. Revenue from Invoices
                    prisma.invoice.aggregate({
                        where: {
                            tenantId: req.tenantId,
                            companyId,
                            status: {
                                in: ['PAID', 'PARTIALLY_PAID', 'SENT', 'APPROVED', 'paid', 'partially_paid', 'sent', 'approved', 'draft', 'DRAFT']
                            },
                            issueDate: { gte: startDate }
                        },
                        _sum: { totalAmount: true }
                    }),
                    // 2. Revenue from Journal Entries (Credits to Revenue Accounts)
                    prisma.journalLine.aggregate({
                        where: {
                            tenantId: req.tenantId,
                            entry: {
                                companyId,
                                status: { notIn: ['DRAFT', 'draft'] }, // Only posted entries
                                createdAt: { gte: startDate }
                            },
                            account: {
                                // Revenue accounts typically 4000-4999
                                code: { startsWith: '4' }
                            },
                            credit: { gt: 0 } // Credits increase revenue
                        },
                        _sum: { credit: true }
                    }),
                    // 3. Expenses from Expense Table
                    prisma.expense.aggregate({
                        where: {
                            tenantId: req.tenantId,
                            companyId,
                            status: {
                                notIn: ['draft', 'DRAFT', 'cancelled', 'CANCELLED']
                            },
                            expenseDate: { gte: startDate }
                        },
                        _sum: { totalAmount: true }
                    }),
                    // 4. Expenses from Journal Entries (Debits to Expense Accounts)
                    prisma.journalLine.aggregate({
                        where: {
                            tenantId: req.tenantId,
                            entry: {
                                companyId,
                                status: { notIn: ['DRAFT', 'draft'] }, // Only posted entries
                                createdAt: { gte: startDate }
                            },
                            account: {
                                // Expense accounts typically 5000-9999
                                OR: [
                                    { code: { startsWith: '5' } },
                                    { code: { startsWith: '6' } },
                                    { code: { startsWith: '7' } },
                                    { code: { startsWith: '8' } },
                                    { code: { startsWith: '9' } }
                                ]
                            },
                            debit: { gt: 0 } // Debits increase expenses
                        },
                        _sum: { debit: true }
                    })
                ]);
                // SAFETY: Robust number conversion with fallbacks
                const invoiceRevenue = Number(invoiceRevenueResult._sum?.totalAmount || 0);
                const journalRevenue = Number(journalRevenueResult._sum?.credit || 0);
                const expenseTableTotal = Number(expenseTableResult._sum?.totalAmount || 0);
                const journalExpenses = Number(journalExpenseResult._sum?.debit || 0);
                // VALIDATION: Ensure no NaN values
                const safeInvoiceRevenue = isFinite(invoiceRevenue) ? invoiceRevenue : 0;
                const safeJournalRevenue = isFinite(journalRevenue) ? journalRevenue : 0;
                const safeExpenseTableTotal = isFinite(expenseTableTotal) ? expenseTableTotal : 0;
                const safeJournalExpenses = isFinite(journalExpenses) ? journalExpenses : 0;
                // COMPREHENSIVE TOTALS
                totalRevenue = safeInvoiceRevenue + safeJournalRevenue;
                totalExpenses = safeExpenseTableTotal + safeJournalExpenses;
                // SENIOR LOGGING: Detailed breakdown for debugging
                console.log('=== COMPREHENSIVE FINANCIAL CALCULATION BREAKDOWN ===');
                console.log('Invoice Revenue:', safeInvoiceRevenue);
                console.log('Journal Revenue (Credits to 4xxx accounts):', safeJournalRevenue);
                console.log('TOTAL REVENUE:', totalRevenue);
                console.log('Expense Table Total:', safeExpenseTableTotal);
                console.log('Journal Expenses (Debits to 5xxx-9xxx accounts):', safeJournalExpenses);
                console.log('TOTAL EXPENSES:', totalExpenses);
                console.log('NET PROFIT:', totalRevenue - totalExpenses);
            }
            catch (financialCalculationError) {
                console.error('❌ CRITICAL: Financial calculation failed:', financialCalculationError);
                // FALLBACK: Use basic invoice/expense calculation if journal entry queries fail
                const fallbackRevenue = await prisma.invoice.aggregate({
                    where: { tenantId: req.tenantId, companyId, issueDate: { gte: startDate } },
                    _sum: { totalAmount: true }
                });
                const fallbackExpenses = await prisma.expense.aggregate({
                    where: { tenantId: req.tenantId, companyId, expenseDate: { gte: startDate } },
                    _sum: { totalAmount: true }
                });
                totalRevenue = Number(fallbackRevenue._sum?.totalAmount || 0);
                totalExpenses = Number(fallbackExpenses._sum?.totalAmount || 0);
                console.log('⚠️ Using fallback calculations - Journal entries excluded');
                console.log('Fallback Revenue:', totalRevenue);
                console.log('Fallback Expenses:', totalExpenses);
            }
            // Get recent activity - both invoices and journal entries
            const recentInvoices = await prisma.invoice.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId
                },
                include: {
                    customer: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            const recentJournalEntries = await prisma.journalEntry.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId
                },
                include: {
                    lines: {
                        select: { debit: true, credit: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            });
            // Combine and sort all activities
            const invoiceActivities = recentInvoices.map(invoice => ({
                id: invoice.id,
                type: 'invoice',
                title: `Invoice ${invoice.invoiceNumber}`,
                description: `${invoice.customer?.name || 'Unknown Customer'} - $${invoice.totalAmount}`,
                amount: Number(invoice.totalAmount),
                date: invoice.createdAt.toISOString(),
                status: invoice.status.toLowerCase()
            }));
            const journalActivities = recentJournalEntries.map(entry => {
                const totalAmount = entry.lines.reduce((sum, line) => sum + Math.max(Number(line.debit), Number(line.credit)), 0);
                return {
                    id: entry.id,
                    type: 'journal_entry',
                    title: `Journal Entry ${entry.reference || entry.id.slice(-8)}`,
                    description: `${entry.memo || 'Journal Entry'} - $${totalAmount.toFixed(2)}`,
                    amount: totalAmount,
                    date: entry.createdAt.toISOString(),
                    status: entry.status?.toLowerCase() || 'posted'
                };
            });
            const recentActivity = [...invoiceActivities, ...journalActivities]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10);
            // Calculate metrics
            const netProfit = totalRevenue - totalExpenses;
            const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
            console.log('Final calculations:');
            console.log('- Total Revenue:', totalRevenue);
            console.log('- Total Expenses:', totalExpenses);
            console.log('- Net Profit:', netProfit);
            console.log('- Profit Margin:', profitMargin + '%');
            console.log('- Pending Invoices:', pendingInvoices);
            console.log('- Overdue Invoices:', overdueInvoices);
            // Response
            res.json({
                metrics: {
                    totalRevenue,
                    totalExpenses,
                    netProfit,
                    profitMargin,
                    activeCustomers: 1,
                    pendingInvoices,
                    overdueInvoices
                },
                changes: {
                    revenue: 0,
                    expenses: 0,
                    profit: 0
                },
                revenueSources: [{
                        name: 'Invoice Revenue',
                        revenue: totalRevenue,
                        count: allInvoices.length,
                        percentage: 100
                    }],
                recentActivity,
                monthlyTrend: [],
                invoiceStatusBreakdown: allInvoices.reduce((acc, inv) => {
                    acc[inv.status] = (acc[inv.status] || 0) + 1;
                    return acc;
                }, {}),
                period: {
                    days: parseInt(period),
                    startDate: startDate.toISOString(),
                    endDate: now.toISOString()
                },
                generatedAt: now.toISOString()
            });
        }
        catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({ error: 'Failed to fetch dashboard data' });
        }
    });
}
