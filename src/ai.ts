import { prisma } from './prisma';

export async function logAnomaly(params: { tenantId: string; companyId: string; transactionId?: string; anomalyType: string; confidenceScore?: number }) {
  const { tenantId, companyId, transactionId, anomalyType, confidenceScore = 0.6 } = params;
  return prisma.aiAnomalyLog.create({ data: { tenantId, companyId, transactionId, anomalyType, confidenceScore } });
}

export async function addInsight(params: { tenantId: string; companyId: string; category: string; insightText: string; priority?: string }) {
  const { tenantId, companyId, category, insightText, priority = 'medium' } = params;
  return prisma.aiInsight.create({ data: { tenantId, companyId, category, insightText, priority } });
}

export async function addAudit(params: { tenantId: string; companyId: string; userId?: string; action: string; aiValidationResult?: string }) {
  const { tenantId, companyId, userId, action, aiValidationResult } = params;
  return prisma.aiAuditTrail.create({ data: { tenantId, companyId, userId, action, aiValidationResult } });
}

// Enhanced anomaly detection
export async function detectAnomalies(tenantId: string, companyId: string) {
  const anomalies = [];
  
  // Check for duplicate transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { tenantId, companyId },
    orderBy: { transactionDate: 'desc' },
    take: 100,
    include: { linkedJournalEntry: true }
  });

  // Group by amount and date to find potential duplicates
  const amountGroups = new Map();
  recentTransactions.forEach(txn => {
    const key = `${txn.amount}_${txn.transactionDate.toDateString()}`;
    if (!amountGroups.has(key)) {
      amountGroups.set(key, []);
    }
    amountGroups.get(key).push(txn);
  });

  // Flag potential duplicates
  for (const [key, transactions] of amountGroups) {
    if (transactions.length > 1) {
      const [amount, date] = key.split('_');
      const anomaly = await logAnomaly({
        tenantId,
        companyId,
        transactionId: transactions[0].id,
        anomalyType: 'duplicate',
        confidenceScore: 0.8
      });
      anomalies.push(anomaly);
    }
  }

  // Check for unusual amounts (statistical outliers)
  const amounts = recentTransactions.map(t => Number(t.amount));
  if (amounts.length > 10) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    
    amounts.forEach((amount, index) => {
      const zScore = Math.abs((amount - mean) / stdDev);
      if (zScore > 3) { // More than 3 standard deviations
        logAnomaly({
          tenantId,
          companyId,
          transactionId: recentTransactions[index].id,
          anomalyType: 'unusual_amount',
          confidenceScore: Math.min(0.9, 0.5 + (zScore - 3) * 0.1)
        });
      }
    });
  }

  return anomalies;
}

// Enhanced insights generation - FIXED to use correct data sources
export async function generateInsights(tenantId: string, companyId: string) {
  const insights = [];
  
  // Get financial data for the last 12 months from ACTUAL tables
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  try {
    // STEP 1: Get revenue from invoices (not transactions)
    const invoices = await prisma.invoice.findMany({
      where: { 
        tenantId, 
        companyId,
        issueDate: { gte: last30Days } // Use last 30 days for more recent data
      },
      select: { totalAmount: true, issueDate: true, status: true },
      orderBy: { issueDate: 'asc' }
    });
    
    
    // STEP 2: Get expenses from expense table (not transactions)
    const expenses = await prisma.expense.findMany({
      where: { 
        tenantId, 
        companyId,
        expenseDate: { gte: last30Days }
      },
      select: { amount: true, expenseDate: true },
      orderBy: { expenseDate: 'asc' }
    });
    
    // STEP 3: Get journal entries for additional financial data
    const journalEntries = await prisma.journalEntry.findMany({
      where: { 
        companyId,
        status: { in: ['posted', 'POSTED', 'Posted', 'APPROVED', 'approved', 'Approved'] },
        date: { gte: last30Days }
      },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      },
      orderBy: { date: 'asc' }
    });
    
    // Calculate comprehensive financial metrics
    let totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    let totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    
    // Add journal entry impacts
    for (const entry of journalEntries) {
      for (const line of entry.lines) {
        const accountCode = line.account?.code || '';
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        
        // Revenue accounts (4000-4999): credits increase revenue
        if (accountCode.startsWith('4')) {
          totalRevenue += credit;
          totalRevenue -= debit;
        }
        
        // Expense accounts (5000-9999): debits increase expenses
        if (accountCode.match(/^[5-9]/)) {
          totalExpenses += debit;
          totalExpenses -= credit;
        }
      }
    }
    
    
    // Revenue trend analysis
    if (invoices.length > 0) {
      const monthlyRevenue = new Map();
      invoices.forEach(inv => {
        const month = inv.issueDate?.toISOString().slice(0, 7) || '';
        if (month) {
          monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + Number(inv.totalAmount || 0));
        }
      });
      
      if (monthlyRevenue.size > 1) {
        const revenueValues = Array.from(monthlyRevenue.values());
        const trend = revenueValues[revenueValues.length - 1] - revenueValues[0];
        const avgRevenue = revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length;
        
        if (trend > avgRevenue * 0.2) {
          insights.push(await addInsight({
            tenantId,
            companyId,
            category: 'revenue',
            insightText: `Strong revenue growth trend: ${trend > 0 ? '+' : ''}${(trend / avgRevenue * 100).toFixed(1)}% over recent period`,
            priority: 'high'
          }));
        }
      }
    }
    
    // Profit margin analysis
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    const netProfit = totalRevenue - totalExpenses;
    
    if (profitMargin < 10 && totalRevenue > 0) {
      insights.push(await addInsight({
        tenantId,
        companyId,
        category: 'expenses',
        insightText: `Low profit margin: ${profitMargin.toFixed(1)}%. Consider reviewing expense categories.`,
        priority: 'high'
      }));
    }
    
    // Financial crisis detection - FIXED calculation
    if (netProfit < 0) {
      const monthlyLoss = Math.abs(netProfit);
      insights.push(await addInsight({
        tenantId,
        companyId,
        category: 'financial_crisis',
        insightText: `Critical financial situation: losing $${monthlyLoss.toLocaleString()}/month`,
        priority: 'high'
      }));
    }
    
    // Cash flow insights
    const cashFlow = totalRevenue - totalExpenses;
    
    if (cashFlow < 0) {
      insights.push(await addInsight({
        tenantId,
        companyId,
        category: 'cashflow',
        insightText: `Negative cash flow detected: -$${Math.abs(cashFlow).toLocaleString()}. Review payment terms and collection processes.`,
        priority: 'medium'
      }));
    } else if (cashFlow > 0) {
      insights.push(await addInsight({
        tenantId,
        companyId,
        category: 'financial',
        insightText: `Positive cash flow: +$${cashFlow.toLocaleString()}. Consider reinvestment opportunities.`,
        priority: 'medium'
      }));
    }
    
    // Data availability insights
    if (totalRevenue === 0 && totalExpenses === 0) {
      insights.push(await addInsight({
        tenantId,
        companyId,
        category: 'system',
        insightText: `No financial data available for analysis. Add invoices and expenses to get meaningful insights.`,
        priority: 'low'
      }));
    }
    
    // Clean up old incorrect insights with $0 values
    try {
      await prisma.aiInsight.deleteMany({
        where: {
          tenantId,
          companyId,
          OR: [
            { insightText: { contains: 'losing $0' } },
            { insightText: { contains: '$0/month' } },
            { insightText: { contains: 'losing $0/month' } }
          ]
        }
      });
    } catch (cleanupError) {
      // Silent cleanup failure
    }
    
  } catch (error) {
    
    // Fallback insight
    insights.push(await addInsight({
      tenantId,
      companyId,
      category: 'system',
      insightText: `Unable to analyze financial data. Please check your data sources.`,
      priority: 'low'
    }));
  }
  
  return insights;
}

// Enhanced predictions using actual data sources
export async function generatePredictions(tenantId: string, companyId: string, type: string = 'revenue') {
  const predictions: any[] = [];
  
  // Get historical data from correct tables
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  
  let historicalData: any[] = [];
  
  try {
    if (type === 'revenue') {
      // Get revenue from invoices
      historicalData = await prisma.invoice.findMany({
        where: { 
          tenantId, 
          companyId,
          issueDate: { gte: twoYearsAgo }
        },
        select: { totalAmount: true, issueDate: true },
        orderBy: { issueDate: 'asc' }
      });
    } else {
      // Get expenses from expense table
      historicalData = await prisma.expense.findMany({
        where: { 
          tenantId, 
          companyId,
          expenseDate: { gte: twoYearsAgo }
        },
        select: { amount: true, expenseDate: true },
        orderBy: { expenseDate: 'asc' }
      });
    }
    
    if (historicalData.length < 6) {
      return predictions; // Need more data for predictions
    }

    // Group by month
    const monthlyData = new Map<string, number>();
    historicalData.forEach(record => {
      const date = type === 'revenue' ? record.issueDate : record.expenseDate;
      const amount = type === 'revenue' ? record.totalAmount : record.amount;
      
      if (date) {
        const month = date.toISOString().slice(0, 7);
        monthlyData.set(month, (monthlyData.get(month) || 0) + Number(amount || 0));
      }
    });

    const months = Array.from(monthlyData.keys()).sort();
    const values: number[] = months.map(month => monthlyData.get(month) || 0);

    // Simple moving average prediction
    const windowSize = Math.min(6, Math.max(1, Math.floor(values.length / 2)));
    const recentValues = values.slice(-windowSize);
    const avg = recentValues.length > 0 ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length : 0;
    
    // Calculate trend
    const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / (values.length - 1) : 0;
    
    // Predict next 3 months
    for (let i = 1; i <= 3; i++) {
      const predictedValue = Math.max(0, avg + (trend * i));
      const predictionDate = new Date();
      predictionDate.setMonth(predictionDate.getMonth() + i);
      
      const prediction = await prisma.aiPrediction.create({
        data: {
          tenantId,
          companyId,
          predictionType: type,
          predictedValue,
          predictionDate,
          confidenceLow: Math.max(0, predictedValue * 0.8),
          confidenceHigh: predictedValue * 1.2
        }
      });
      
      predictions.push(prediction);
    }
    
  } catch (error) {
    // Silent error handling
  }

  return predictions;
}

// Enhanced recommendations based on actual data
export async function generateRecommendations(tenantId: string, companyId: string) {
  const recommendations = [];
  
  try {
    // Check for overdue invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        companyId,
        dueDate: { lt: new Date() },
        status: { in: ['sent', 'SENT', 'posted', 'POSTED', 'approved', 'APPROVED'] },
        balanceDue: { gt: 0 }
      }
    });

    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0);
      recommendations.push(await prisma.aiRecommendation.create({
        data: {
          tenantId,
          companyId,
          recommendationType: 'payment_timing',
          recommendationText: `Follow up on ${overdueInvoices.length} overdue invoices totaling $${totalOverdue.toLocaleString()}. Consider implementing automated reminders.`
        }
      }));
    }

    // Check for high expenses from expense table
    const recentExpenses = await prisma.expense.findMany({
      where: { 
        tenantId, 
        companyId,
        expenseDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
      },
      select: { amount: true, description: true, category: true },
      orderBy: { amount: 'desc' },
      take: 10
    });
    
    if (recentExpenses.length > 0) {
      const totalExpenses = recentExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const avgExpense = totalExpenses / recentExpenses.length;
      const highExpenses = recentExpenses.filter(exp => Number(exp.amount || 0) > avgExpense * 2);
      
      if (highExpenses.length > 0) {
        recommendations.push(await prisma.aiRecommendation.create({
          data: {
            tenantId,
            companyId,
            recommendationType: 'cost_cutting',
            recommendationText: `${highExpenses.length} expenses are significantly above average ($${avgExpense.toLocaleString()}). Review high-cost items for potential savings.`
          }
        }));
      }
    }
    
    // Revenue optimization recommendations
    const recentInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        companyId,
        issueDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      },
      select: { totalAmount: true, status: true },
      take: 20
    });
    
    if (recentInvoices.length > 0) {
      const totalRevenue = recentInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
      const paidInvoices = recentInvoices.filter(inv => inv.status?.toLowerCase() === 'paid');
      const paymentRate = paidInvoices.length / recentInvoices.length;
      
      if (paymentRate < 0.8) {
        recommendations.push(await prisma.aiRecommendation.create({
          data: {
            tenantId,
            companyId,
            recommendationType: 'revenue_optimization',
            recommendationText: `Payment rate is ${(paymentRate * 100).toFixed(1)}%. Consider improving payment terms or follow-up processes to increase cash flow.`
          }
        }));
      }
    }
    
  } catch (error) {
    // Silent error handling
  }

  return recommendations;
}


