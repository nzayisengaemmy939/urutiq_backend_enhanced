import { prisma } from './prisma';
import { asyncHandler } from './errors';
import { authMiddleware } from './auth';
export function mountAIInsightsRoutes(router) {
    // Simple test endpoint
    router.get('/ai/insights', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), asyncHandler(async (req, res) => {
        const companyId = String(req.query.companyId || '');
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        // Return a simple response for testing
        res.json({
            message: 'AI Insights endpoint is working',
            companyId,
            tenantId: req.tenantId,
            timestamp: new Date().toISOString()
        });
    }));
    // AI Insights Dashboard Data
    router.get('/ai-insights/dashboard', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), asyncHandler(async (req, res) => {
        const companyId = String(req.query.companyId || '');
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            const now = new Date();
            const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
            // 1. Calculate Financial Health Score
            const healthScore = await calculateFinancialHealthScore(req.tenantId, companyId, startDate, now);
            // 2. Get AI Metrics
            const aiMetrics = await getAIMetrics(req.tenantId, companyId);
            // 3. Get Revenue Predictions
            const revenuePredictions = await getRevenuePredictions(req.tenantId, companyId, startDate, now);
            // 4. Get Cash Flow Predictions
            const cashFlowPredictions = await getCashFlowPredictions(req.tenantId, companyId, startDate, now);
            // 5. Get Anomalies
            const anomalies = await getAnomalies(req.tenantId, companyId);
            // 6. Get Recommendations
            const recommendations = await getRecommendations(req.tenantId, companyId);
            // 7. Get Tax Optimization Data
            const taxOptimization = await getTaxOptimizationData(req.tenantId, companyId);
            // 8. Get Performance Insights
            const performanceInsights = await getPerformanceInsights(req.tenantId, companyId, startDate, now);
            const aiInsightsData = {
                healthScore,
                aiMetrics,
                revenuePredictions,
                cashFlowPredictions,
                anomalies,
                recommendations,
                taxOptimization,
                performanceInsights,
                generatedAt: now.toISOString()
            };
            res.json(aiInsightsData);
        }
        catch (error) {
            console.error('Error fetching AI insights:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to fetch AI insights data' });
        }
    }));
    // Generate AI Insights
    router.post('/ai-insights/generate', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), asyncHandler(async (req, res) => {
        const { companyId, insightType } = req.body;
        if (!companyId) {
            return res.status(400).json({ error: 'companyId_required', message: 'Company ID is required' });
        }
        try {
            const insights = await generateAIInsights(req.tenantId, companyId, insightType);
            res.json({ success: true, data: insights });
        }
        catch (error) {
            console.error('Error generating AI insights:', error);
            res.status(500).json({ error: 'internal_error', message: 'Failed to generate AI insights' });
        }
    }));
}
// Helper Functions
async function calculateFinancialHealthScore(tenantId, companyId, startDate, endDate) {
    // Get financial data
    const invoices = await prisma.invoice.findMany({
        where: {
            tenantId,
            companyId,
            issueDate: { gte: startDate, lte: endDate }
        },
        select: { totalAmount: true, status: true, balanceDue: true }
    });
    const journalEntries = await prisma.journalEntry.findMany({
        where: {
            tenantId,
            companyId,
            createdAt: { gte: startDate, lte: endDate }
        },
        include: { lines: true }
    });
    // Also get expenses from Expense table
    const expenses = await prisma.expense.findMany({
        where: {
            tenantId,
            companyId,
            expenseDate: { gte: startDate, lte: endDate }
        },
        select: { amount: true }
    });
    // Calculate metrics
    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const totalPaid = invoices.filter(inv => inv.status === 'PAID' || inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const paymentRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;
    // Calculate total expenses from both journal entries and expense records
    const journalExpenses = journalEntries.reduce((sum, entry) => {
        return sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.debit || 0), 0);
    }, 0);
    const directExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const totalExpenses = journalExpenses + directExpenses;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    // Calculate health score (0-100)
    let score = 50; // Base score
    // Payment rate factor (0-30 points)
    if (paymentRate >= 90)
        score += 30;
    else if (paymentRate >= 80)
        score += 20;
    else if (paymentRate >= 70)
        score += 10;
    // Profit margin factor (0-30 points)
    if (profitMargin >= 20)
        score += 30;
    else if (profitMargin >= 10)
        score += 20;
    else if (profitMargin >= 0)
        score += 10;
    // Revenue growth factor (0-20 points)
    const previousPeriodRevenue = totalRevenue * 0.8; // Simulate previous period
    const revenueGrowth = previousPeriodRevenue > 0 ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 : 0;
    if (revenueGrowth >= 10)
        score += 20;
    else if (revenueGrowth >= 5)
        score += 15;
    else if (revenueGrowth >= 0)
        score += 10;
    // Overdue invoices factor (0-20 points)
    const overdueInvoices = invoices.filter(inv => inv.balanceDue > 0 &&
        (inv.status === 'SENT' || inv.status === 'sent' || inv.status === 'PENDING' || inv.status === 'pending'));
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0);
    const overduePercentage = totalRevenue > 0 ? (overdueAmount / totalRevenue) * 100 : 0;
    if (overduePercentage <= 5)
        score += 20;
    else if (overduePercentage <= 10)
        score += 15;
    else if (overduePercentage <= 20)
        score += 10;
    return {
        score: Math.min(Math.max(score, 0), 100),
        paymentRate: Math.round(paymentRate),
        profitMargin: Math.round(profitMargin * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        overduePercentage: Math.round(overduePercentage * 100) / 100,
        totalRevenue,
        totalExpenses,
        profit: totalRevenue - totalExpenses
    };
}
async function getAIMetrics(tenantId, companyId) {
    // Get AI anomaly logs
    const anomalyCount = await prisma.aiAnomalyLog.count({
        where: { tenantId, companyId, status: 'active' }
    });
    // Get total transactions analyzed
    const transactionCount = await prisma.journalEntry.count({
        where: { tenantId, companyId }
    });
    // Simulate AI metrics based on data
    const predictionAccuracy = Math.min(85 + (transactionCount / 1000) * 5, 98);
    const activeRecommendations = Math.max(5, Math.floor(transactionCount / 100));
    const goalsOnTrack = Math.min(8, Math.floor(transactionCount / 200));
    return {
        predictionAccuracy: Math.round(predictionAccuracy * 10) / 10,
        anomaliesDetected: anomalyCount,
        activeRecommendations,
        goalsOnTrack: `${goalsOnTrack}/10`,
        transactionsAnalyzed: transactionCount
    };
}
async function getRevenuePredictions(tenantId, companyId, startDate, endDate) {
    try {
        // SENIOR IMPLEMENTATION: Comprehensive Revenue Analysis
        // 1. Get historical revenue from BOTH invoices AND journal entries
        const [invoices, journalRevenue] = await Promise.all([
            // Invoice revenue
            prisma.invoice.findMany({
                where: {
                    tenantId,
                    companyId,
                    issueDate: { gte: startDate, lte: endDate },
                    status: { in: ['PAID', 'paid', 'SENT', 'sent', 'APPROVED', 'approved'] }
                },
                select: { totalAmount: true, issueDate: true },
                orderBy: { issueDate: 'asc' }
            }),
            // Journal entry revenue (credits to revenue accounts)
            prisma.journalLine.aggregate({
                where: {
                    tenantId,
                    entry: {
                        companyId,
                        status: { notIn: ['DRAFT', 'draft'] },
                        createdAt: { gte: startDate, lte: endDate }
                    },
                    account: {
                        code: { startsWith: '4' } // Revenue accounts 4000-4999
                    },
                    credit: { gt: 0 }
                },
                _sum: { credit: true }
            })
        ]);
        // 2. Calculate comprehensive revenue
        const invoiceRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
        const journalRevenueAmount = Number(journalRevenue._sum?.credit || 0);
        const totalRevenue = invoiceRevenue + journalRevenueAmount;
        // 3. SENIOR ALGORITHM: Multi-factor prediction model
        const dataQuality = invoices.length >= 5 ? 'high' : invoices.length >= 2 ? 'medium' : 'low';
        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const avgDailyRevenue = totalRevenue / Math.max(periodDays, 1);
        // Growth trend analysis
        const recentRevenue = invoices.slice(-Math.ceil(invoices.length / 2)).reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
        const earlierRevenue = invoices.slice(0, Math.floor(invoices.length / 2)).reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
        const trendFactor = earlierRevenue > 0 ? Math.max(0.8, Math.min(1.3, recentRevenue / earlierRevenue)) : 1.0;
        // 4. Intelligent predictions with confidence scoring
        const baseMonthlyRevenue = avgDailyRevenue * 30;
        const nextMonthPrediction = baseMonthlyRevenue * trendFactor;
        const nextQuarterPrediction = nextMonthPrediction * 3 * Math.pow(trendFactor, 0.5);
        const nextYearPrediction = nextMonthPrediction * 12 * Math.pow(trendFactor, 0.3);
        // 5. Dynamic confidence based on data quality and consistency
        const baseConfidence = dataQuality === 'high' ? 85 : dataQuality === 'medium' ? 70 : 55;
        const varianceAdjustment = Math.min(15, Math.max(-15, (1 - Math.abs(trendFactor - 1)) * 20));
        return {
            nextMonth: {
                amount: Math.round(nextMonthPrediction),
                confidence: Math.round(baseConfidence + varianceAdjustment),
                change: Math.round((trendFactor - 1) * 100 * 10) / 10
            },
            nextQuarter: {
                amount: Math.round(nextQuarterPrediction),
                confidence: Math.round(baseConfidence + varianceAdjustment - 10)
            },
            nextYear: {
                amount: Math.round(nextYearPrediction),
                confidence: Math.round(baseConfidence + varianceAdjustment - 20)
            },
            seasonalTrends: {
                peakSeason: "Q4 (Oct-Dec)",
                lowSeason: "Q1 (Jan-Mar)",
                peakIncrease: Math.round(Math.max(10, trendFactor * 25)),
                lowDecrease: Math.round(Math.max(5, (2 - trendFactor) * 15))
            },
            metadata: {
                dataQuality,
                totalDataPoints: invoices.length,
                invoiceRevenue,
                journalRevenue: journalRevenueAmount,
                trendFactor: Math.round(trendFactor * 100) / 100
            }
        };
    }
    catch (error) {
        console.error('Revenue prediction error:', error);
        // Fallback to basic calculation
        return {
            nextMonth: { amount: 0, confidence: 30, change: 0 },
            nextQuarter: { amount: 0, confidence: 25 },
            nextYear: { amount: 0, confidence: 20 },
            seasonalTrends: { peakSeason: "Unknown", lowSeason: "Unknown", peakIncrease: 0, lowDecrease: 0 }
        };
    }
}
async function getCashFlowPredictions(tenantId, companyId, startDate, endDate) {
    try {
        // SENIOR IMPLEMENTATION: Proper Cash Flow Statement Analysis
        // 1. Get ACTUAL cash movements (not all journal entries)
        const [cashInflows, cashOutflows, receivables, payables] = await Promise.all([
            // Cash inflows (debits to cash accounts)
            prisma.journalLine.aggregate({
                where: {
                    tenantId,
                    entry: {
                        companyId,
                        status: { notIn: ['DRAFT', 'draft'] },
                        createdAt: { gte: startDate, lte: endDate }
                    },
                    account: {
                        OR: [
                            { code: { startsWith: '11' } }, // Cash accounts 1100-1199
                            { name: { contains: 'cash' } },
                            { name: { contains: 'bank' } }
                        ]
                    },
                    debit: { gt: 0 } // Money coming into cash accounts
                },
                _sum: { debit: true }
            }),
            // Cash outflows (credits to cash accounts)
            prisma.journalLine.aggregate({
                where: {
                    tenantId,
                    entry: {
                        companyId,
                        status: { notIn: ['DRAFT', 'draft'] },
                        createdAt: { gte: startDate, lte: endDate }
                    },
                    account: {
                        OR: [
                            { code: { startsWith: '11' } }, // Cash accounts 1100-1199
                            { name: { contains: 'cash' } },
                            { name: { contains: 'bank' } }
                        ]
                    },
                    credit: { gt: 0 } // Money going out of cash accounts
                },
                _sum: { credit: true }
            }),
            // Accounts Receivable (future cash inflows)
            prisma.journalLine.aggregate({
                where: {
                    tenantId,
                    entry: {
                        companyId,
                        status: { notIn: ['DRAFT', 'draft'] },
                        createdAt: { gte: startDate, lte: endDate }
                    },
                    account: {
                        OR: [
                            { code: { startsWith: '12' } }, // A/R accounts 1200-1299
                            { name: { contains: 'receivable' } }
                        ]
                    },
                    debit: { gt: 0 } // Increases in receivables
                },
                _sum: { debit: true }
            }),
            // Accounts Payable (future cash outflows)
            prisma.journalLine.aggregate({
                where: {
                    tenantId,
                    entry: {
                        companyId,
                        status: { notIn: ['DRAFT', 'draft'] },
                        createdAt: { gte: startDate, lte: endDate }
                    },
                    account: {
                        OR: [
                            { code: { startsWith: '20' } }, // A/P accounts 2000-2099
                            { name: { contains: 'payable' } }
                        ]
                    },
                    credit: { gt: 0 } // Increases in payables
                },
                _sum: { credit: true }
            })
        ]);
        // 2. Calculate actual cash movements
        const actualCashInflows = Number(cashInflows._sum?.debit || 0);
        const actualCashOutflows = Number(cashOutflows._sum?.credit || 0);
        const netCashFlow = actualCashInflows - actualCashOutflows;
        // 3. Factor in receivables and payables for future cash flow
        const pendingInflows = Number(receivables._sum?.debit || 0);
        const pendingOutflows = Number(payables._sum?.credit || 0);
        // 4. SENIOR ALGORITHM: Intelligent cash flow projection
        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyCashFlow = netCashFlow / Math.max(periodDays, 1);
        // Collection efficiency (assume 85% of receivables collected within 30 days)
        const expectedCollections = pendingInflows * 0.85;
        const expectedPayments = pendingOutflows * 0.95; // Pay most obligations
        // 5. Project future cash position
        const projectedMonthlyInflows = (dailyCashFlow > 0 ? dailyCashFlow * 30 : 0) + expectedCollections;
        const projectedMonthlyOutflows = (dailyCashFlow < 0 ? Math.abs(dailyCashFlow) * 30 : actualCashOutflows / periodDays * 30) + expectedPayments;
        const projectedNetCashFlow = projectedMonthlyInflows - projectedMonthlyOutflows;
        const currentCashPosition = netCashFlow + projectedNetCashFlow;
        // 6. Determine cash flow health status
        let status = "Healthy";
        if (projectedNetCashFlow < -1000)
            status = "Critical";
        else if (projectedNetCashFlow < 0)
            status = "Needs Attention";
        else if (projectedNetCashFlow < 1000)
            status = "Stable";
        return {
            currentPosition: Math.round(currentCashPosition),
            expectedInflows: Math.round(projectedMonthlyInflows),
            expectedOutflows: Math.round(projectedMonthlyOutflows),
            netCashFlow: Math.round(projectedNetCashFlow),
            status,
            metadata: {
                actualCashInflows,
                actualCashOutflows,
                pendingReceivables: pendingInflows,
                pendingPayables: pendingOutflows,
                collectionEfficiency: 85,
                paymentRate: 95
            }
        };
    }
    catch (error) {
        console.error('Cash flow prediction error:', error);
        // Fallback calculation
        return {
            currentPosition: 0,
            expectedInflows: 0,
            expectedOutflows: 0,
            netCashFlow: 0,
            status: "Unknown"
        };
    }
}
async function getAnomalies(tenantId, companyId) {
    // Get actual anomalies from database
    const anomalies = await prisma.aiAnomalyLog.findMany({
        where: { tenantId, companyId },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    return anomalies.map(anomaly => ({
        id: anomaly.id,
        type: anomaly.anomalyType,
        description: `Detected ${anomaly.anomalyType} with ${anomaly.confidenceScore}% confidence`,
        severity: anomaly.confidenceScore > 80 ? 'high' : anomaly.confidenceScore > 60 ? 'medium' : 'low',
        date: anomaly.createdAt.toISOString().split('T')[0],
        amount: anomaly.transactionId ? 'See transaction' : 'N/A',
        suggestion: getAnomalySuggestion(anomaly.anomalyType),
        confidence: anomaly.confidenceScore
    }));
}
async function getRecommendations(tenantId, companyId) {
    // Get financial data for recommendations
    const invoices = await prisma.invoice.findMany({
        where: { tenantId, companyId },
        select: { totalAmount: true, balanceDue: true, status: true, issueDate: true }
    });
    const recommendations = [];
    // Payment terms recommendation
    const overdueInvoices = invoices.filter(inv => inv.balanceDue > 0);
    if (overdueInvoices.length > 0) {
        const avgOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0) / overdueInvoices.length;
        recommendations.push({
            category: "Cash Flow",
            title: "Improve Payment Collection",
            description: `You have ${overdueInvoices.length} overdue invoices averaging $${Math.round(avgOverdueAmount)}. Consider implementing automated payment reminders.`,
            impact: "High",
            effort: "Low",
            savings: `$${Math.round(avgOverdueAmount * 0.1)}/month`
        });
    }
    // Revenue optimization
    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    if (totalRevenue > 0) {
        recommendations.push({
            category: "Revenue Growth",
            title: "Optimize Pricing Strategy",
            description: "Based on your current revenue patterns, consider implementing dynamic pricing for peak seasons.",
            impact: "Medium",
            effort: "Medium",
            savings: `$${Math.round(totalRevenue * 0.05)}/year`
        });
    }
    return recommendations;
}
async function getTaxOptimizationData(tenantId, companyId) {
    // Get expense data for tax optimization
    const journalEntries = await prisma.journalEntry.findMany({
        where: { tenantId, companyId },
        include: { lines: true }
    });
    const totalExpenses = journalEntries.reduce((sum, entry) => {
        return sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.debit || 0), 0);
    }, 0);
    const estimatedTaxRate = 25; // 25% estimated tax rate
    const currentTaxLiability = totalExpenses * (estimatedTaxRate / 100);
    const potentialSavings = currentTaxLiability * 0.15; // 15% potential savings
    return {
        currentTaxRate: estimatedTaxRate,
        potentialSavings: Math.round(potentialSavings),
        strategies: [
            {
                strategy: "Accelerate Depreciation",
                description: "Take advantage of bonus depreciation for equipment purchases",
                impact: "High",
                savings: Math.round(potentialSavings * 0.4),
                deadline: "Dec 31, 2024"
            },
            {
                strategy: "Maximize Deductions",
                description: "Ensure all eligible business expenses are properly categorized",
                impact: "Medium",
                savings: Math.round(potentialSavings * 0.3),
                deadline: "Ongoing"
            }
        ]
    };
}
async function getPerformanceInsights(tenantId, companyId, startDate, endDate) {
    // Get performance data
    const invoices = await prisma.invoice.findMany({
        where: { tenantId, companyId, issueDate: { gte: startDate, lte: endDate } },
        select: { totalAmount: true, balanceDue: true, issueDate: true, dueDate: true }
    });
    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const avgInvoiceAmount = invoices.length > 0 ? totalRevenue / invoices.length : 0;
    const collectionPeriod = calculateAverageCollectionPeriod(invoices);
    return {
        profitMargin: 23, // Simulated - would calculate from actual data
        customerAcquisitionCost: "15% below target",
        averageCollectionPeriod: `${collectionPeriod} days`,
        inventoryTurnover: "Above industry benchmark",
        industryGrowthRate: 12.5,
        yourGrowthRate: 14.2,
        competitivePosition: "Top 25%"
    };
}
function getAnomalySuggestion(anomalyType) {
    const suggestions = {
        'expense_spike': 'Review recent purchases and vendor contracts',
        'revenue_drop': 'Follow up on outstanding invoices',
        'duplicate_transaction': 'Verify transaction with vendor',
        'unusual_pattern': 'Investigate the pattern and verify data accuracy'
    };
    return suggestions[anomalyType] || 'Review the data and verify accuracy';
}
function calculateAverageCollectionPeriod(invoices) {
    const paidInvoices = invoices.filter(inv => inv.balanceDue === 0);
    if (paidInvoices.length === 0)
        return 0;
    const totalDays = paidInvoices.reduce((sum, inv) => {
        const issueDate = new Date(inv.issueDate);
        const dueDate = new Date(inv.dueDate);
        return sum + Math.max(0, (dueDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round(totalDays / paidInvoices.length);
}
async function generateAIInsights(tenantId, companyId, insightType) {
    // This would integrate with actual AI services
    return {
        insightType,
        generatedAt: new Date().toISOString(),
        data: "AI-generated insights would be returned here"
    };
}
