import { Ollama } from 'ollama';
import { HfInference } from '@huggingface/inference';
import { llamaEnhancedConversationalAI } from './llama-enhanced-conversational-ai';
import { prisma } from '../prisma';
export class LlamaPredictiveAnalytics {
    ollama;
    hfInference;
    llamaAI;
    constructor() {
        this.ollama = new Ollama({
            host: process.env.OLLAMA_HOST || 'http://localhost:11434'
        });
        this.hfInference = new HfInference(process.env.HUGGINGFACE_API_KEY);
        // Initialize llamaAI lazily to avoid circular dependency issues
        this.llamaAI = null;
    }
    getLlamaAI() {
        if (!this.llamaAI) {
            this.llamaAI = llamaEnhancedConversationalAI;
        }
        return this.llamaAI;
    }
    async generateCashFlowForecast(companyId, months = 12, context) {
        try {
            console.log(`Generating ${months}-month cash flow forecast for company ${companyId}...`);
            // Get historical financial data
            const historicalData = await this.getHistoricalFinancialData(companyId, 24); // 24 months of history
            // Build comprehensive analysis prompt
            const analysisPrompt = this.buildCashFlowAnalysisPrompt(historicalData, months, context);
            // Use advanced Llama model for complex financial analysis
            const analysis = await this.getLlamaAI().processNaturalLanguageInput(analysisPrompt, context);
            // Parse and structure the results
            const forecasts = this.parseCashFlowForecasts(analysis.message, months);
            const insights = await this.generateCashFlowInsights(forecasts, historicalData, context);
            const recommendations = await this.generateCashFlowRecommendations(forecasts, context);
            const riskAssessment = await this.assessCashFlowRisk(forecasts, historicalData, context);
            return {
                success: true,
                forecasts,
                insights,
                recommendations,
                riskAssessment,
                confidence: analysis.confidence
            };
        }
        catch (error) {
            console.error('Error generating cash flow forecast:', error);
            return {
                success: false,
                forecasts: [],
                insights: [],
                recommendations: [],
                riskAssessment: this.getDefaultRiskAssessment(),
                confidence: 0,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async generateRevenueForecast(companyId, months = 12, context) {
        try {
            console.log(`Generating ${months}-month revenue forecast for company ${companyId}...`);
            const historicalData = await this.getHistoricalRevenueData(companyId, 24);
            const analysisPrompt = this.buildRevenueAnalysisPrompt(historicalData, months, context);
            const analysis = await this.getLlamaAI().processNaturalLanguageInput(analysisPrompt, context);
            const forecasts = this.parseRevenueForecasts(analysis.message, months);
            const insights = await this.generateRevenueInsights(forecasts, historicalData, context);
            const recommendations = await this.generateRevenueRecommendations(forecasts, context);
            const riskAssessment = await this.assessRevenueRisk(forecasts, historicalData, context);
            return {
                success: true,
                forecasts,
                insights,
                recommendations,
                riskAssessment,
                confidence: analysis.confidence
            };
        }
        catch (error) {
            console.error('Error generating revenue forecast:', error);
            return {
                success: false,
                forecasts: [],
                insights: [],
                recommendations: [],
                riskAssessment: this.getDefaultRiskAssessment(),
                confidence: 0,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async generateExpenseForecast(companyId, months = 12, context) {
        try {
            console.log(`Generating ${months}-month expense forecast for company ${companyId}...`);
            const historicalData = await this.getHistoricalExpenseData(companyId, 24);
            const analysisPrompt = this.buildExpenseAnalysisPrompt(historicalData, months, context);
            const analysis = await this.getLlamaAI().processNaturalLanguageInput(analysisPrompt, context);
            const forecasts = this.parseExpenseForecasts(analysis.message, months);
            const insights = await this.generateExpenseInsights(forecasts, historicalData, context);
            const recommendations = await this.generateExpenseRecommendations(forecasts, context);
            const riskAssessment = await this.assessExpenseRisk(forecasts, historicalData, context);
            return {
                success: true,
                forecasts,
                insights,
                recommendations,
                riskAssessment,
                confidence: analysis.confidence
            };
        }
        catch (error) {
            console.error('Error generating expense forecast:', error);
            return {
                success: false,
                forecasts: [],
                insights: [],
                recommendations: [],
                riskAssessment: this.getDefaultRiskAssessment(),
                confidence: 0,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async generateComprehensiveBusinessForecast(companyId, months = 12, context) {
        try {
            console.log(`Generating comprehensive ${months}-month business forecast for company ${companyId}...`);
            // Get all historical data
            const financialData = await this.getHistoricalFinancialData(companyId, 24);
            const revenueData = await this.getHistoricalRevenueData(companyId, 24);
            const expenseData = await this.getHistoricalExpenseData(companyId, 24);
            // Build comprehensive analysis prompt
            const analysisPrompt = this.buildComprehensiveAnalysisPrompt(financialData, revenueData, expenseData, months, context);
            const analysis = await this.getLlamaAI().processNaturalLanguageInput(analysisPrompt, context);
            // Parse comprehensive results using real historical data
            const forecasts = this.parseComprehensiveForecasts(analysis.message, months, financialData, revenueData, expenseData);
            const insights = await this.generateComprehensiveInsights(forecasts, context);
            const recommendations = await this.generateComprehensiveRecommendations(forecasts, context);
            const riskAssessment = await this.assessComprehensiveRisk(forecasts, context);
            return {
                success: true,
                forecasts,
                insights,
                recommendations,
                riskAssessment,
                confidence: analysis.confidence
            };
        }
        catch (error) {
            console.error('Error generating comprehensive business forecast:', error);
            return {
                success: false,
                forecasts: [],
                insights: [],
                recommendations: [],
                riskAssessment: this.getDefaultRiskAssessment(),
                confidence: 0,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async getHistoricalFinancialData(companyId, months) {
        try {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);
            const transactions = await prisma.transaction.findMany({
                where: {
                    companyId,
                    transactionDate: {
                        gte: startDate
                    }
                },
                orderBy: {
                    transactionDate: 'asc'
                }
            });
            return transactions;
        }
        catch (error) {
            console.error('Error fetching historical financial data:', error);
            return [];
        }
    }
    async getHistoricalRevenueData(companyId, months) {
        try {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);
            const invoices = await prisma.invoice.findMany({
                where: {
                    companyId,
                    issueDate: {
                        gte: startDate
                    }
                },
                orderBy: {
                    issueDate: 'asc'
                }
            });
            return invoices;
        }
        catch (error) {
            console.error('Error fetching historical revenue data:', error);
            return [];
        }
    }
    async getHistoricalExpenseData(companyId, months) {
        try {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);
            const expenses = await prisma.transaction.findMany({
                where: {
                    companyId,
                    transactionType: 'expense',
                    transactionDate: {
                        gte: startDate
                    }
                },
                orderBy: {
                    transactionDate: 'asc'
                }
            });
            return expenses;
        }
        catch (error) {
            console.error('Error fetching historical expense data:', error);
            return [];
        }
    }
    buildCashFlowAnalysisPrompt(historicalData, months, context) {
        const dataSummary = this.summarizeFinancialData(historicalData);
        return `Analyze the cash flow patterns and generate a ${months}-month forecast:

HISTORICAL DATA SUMMARY:
${dataSummary}

COMPANY CONTEXT:
- Company: ${context.companyId}
- Business Type: ${context.financialContext.businessType}
- Revenue Range: ${context.financialContext.revenueRange}
- Currency: ${context.financialContext.currency}

Please provide:
1. Monthly cash flow forecasts for the next ${months} months
2. Key factors influencing cash flow
3. Seasonal patterns and trends
4. Risk factors and scenarios (optimistic, realistic, pessimistic)
5. Confidence levels for each prediction

Format as structured analysis with specific numerical predictions and reasoning.`;
    }
    buildRevenueAnalysisPrompt(historicalData, months, context) {
        const dataSummary = this.summarizeRevenueData(historicalData);
        return `Analyze revenue patterns and generate a ${months}-month revenue forecast:

HISTORICAL REVENUE DATA:
${dataSummary}

COMPANY CONTEXT:
- Company: ${context.companyId}
- Business Type: ${context.financialContext.businessType}
- Revenue Range: ${context.financialContext.revenueRange}
- Transaction Volume: ${context.financialContext.transactionVolume}

Provide:
1. Monthly revenue forecasts
2. Growth trends and patterns
3. Seasonal variations
4. Customer behavior insights
5. Market factors affecting revenue

Include confidence levels and scenario analysis.`;
    }
    buildExpenseAnalysisPrompt(historicalData, months, context) {
        const dataSummary = this.summarizeExpenseData(historicalData);
        return `Analyze expense patterns and generate a ${months}-month expense forecast:

HISTORICAL EXPENSE DATA:
${dataSummary}

COMPANY CONTEXT:
- Company: ${context.companyId}
- Business Type: ${context.financialContext.businessType}
- Revenue Range: ${context.financialContext.revenueRange}

Provide:
1. Monthly expense forecasts by category
2. Cost optimization opportunities
3. Fixed vs variable expense trends
4. Inflation impact analysis
5. Efficiency improvement potential

Include specific recommendations for cost management.`;
    }
    buildComprehensiveAnalysisPrompt(financialData, revenueData, expenseData, months, context) {
        const financialSummary = this.summarizeFinancialData(financialData);
        const revenueSummary = this.summarizeRevenueData(revenueData);
        const expenseSummary = this.summarizeExpenseData(expenseData);
        return `Generate a comprehensive ${months}-month business forecast:

FINANCIAL DATA SUMMARY:
${financialSummary}

REVENUE DATA SUMMARY:
${revenueSummary}

EXPENSE DATA SUMMARY:
${expenseSummary}

COMPANY CONTEXT:
- Company: ${context.companyId}
- Business Type: ${context.financialContext.businessType}
- Revenue Range: ${context.financialContext.revenueRange}
- Transaction Volume: ${context.financialContext.transactionVolume}
- Currency: ${context.financialContext.currency}

Provide comprehensive analysis including:
1. Revenue, expense, and cash flow forecasts
2. Profitability analysis
3. Growth opportunities
4. Risk assessment
5. Strategic recommendations
6. Key performance indicators

Include confidence levels, scenarios, and actionable insights.`;
    }
    summarizeFinancialData(data) {
        if (data.length === 0)
            return 'No historical data available';
        const totalAmount = data.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const averageAmount = totalAmount / data.length;
        const monthlyTotals = this.groupByMonth(data, 'transactionDate', 'amount');
        return `
- Total Transactions: ${data.length}
- Total Amount: $${totalAmount.toFixed(2)}
- Average Transaction: $${averageAmount.toFixed(2)}
- Monthly Breakdown: ${Object.entries(monthlyTotals).map(([month, amount]) => `${month}: $${amount}`).join(', ')}
`;
    }
    summarizeRevenueData(data) {
        if (data.length === 0)
            return 'No revenue data available';
        const totalRevenue = data.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const averageInvoice = totalRevenue / data.length;
        const monthlyRevenue = this.groupByMonth(data, 'issueDate', 'total');
        return `
- Total Invoices: ${data.length}
- Total Revenue: $${totalRevenue.toFixed(2)}
- Average Invoice: $${averageInvoice.toFixed(2)}
- Monthly Revenue: ${Object.entries(monthlyRevenue).map(([month, amount]) => `${month}: $${amount}`).join(', ')}
`;
    }
    summarizeExpenseData(data) {
        if (data.length === 0)
            return 'No expense data available';
        const totalExpenses = data.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const averageExpense = totalExpenses / data.length;
        const monthlyExpenses = this.groupByMonth(data, 'transactionDate', 'amount');
        return `
- Total Expenses: ${data.length}
- Total Amount: $${totalExpenses.toFixed(2)}
- Average Expense: $${averageExpense.toFixed(2)}
- Monthly Expenses: ${Object.entries(monthlyExpenses).map(([month, amount]) => `${month}: $${amount}`).join(', ')}
`;
    }
    parseCashFlowForecasts(analysisText, months) {
        // Parse the analysis text to extract cash flow forecasts
        const forecasts = [];
        // This would parse the Llama response and extract structured forecast data
        // For now, return a sample structure
        for (let i = 1; i <= months; i++) {
            forecasts.push({
                type: 'cash_flow',
                period: `Month ${i}`,
                predictedValue: 10000 + (i * 1000), // Sample data
                confidence: 0.8,
                trend: 'increasing',
                factors: ['Seasonal growth', 'Market expansion'],
                scenarios: {
                    optimistic: 12000 + (i * 1200),
                    realistic: 10000 + (i * 1000),
                    pessimistic: 8000 + (i * 800)
                }
            });
        }
        return forecasts;
    }
    parseRevenueForecasts(analysisText, months) {
        // Similar parsing logic for revenue forecasts
        return this.parseCashFlowForecasts(analysisText, months).map(f => ({
            ...f,
            type: 'revenue'
        }));
    }
    parseExpenseForecasts(analysisText, months) {
        // Similar parsing logic for expense forecasts
        return this.parseCashFlowForecasts(analysisText, months).map(f => ({
            ...f,
            type: 'expense'
        }));
    }
    parseComprehensiveForecasts(analysisText, months, financialData, revenueData, expenseData) {
        // Parse comprehensive forecasts based on real data analysis
        const forecasts = [];
        // Calculate real metrics from historical data
        const metrics = this.calculateRealMetrics(financialData, revenueData, expenseData);
        // If no real data available, return empty forecasts
        if (metrics.totalRevenue === 0 && metrics.totalExpenses === 0) {
            return [];
        }
        // If we have very little data (less than 3 months), return empty forecasts
        const hasMinimalData = (revenueData && revenueData.length >= 3) || (expenseData && expenseData.length >= 3);
        if (!hasMinimalData) {
            return [];
        }
        const types = ['revenue', 'expense', 'cash_flow', 'profit'];
        types.forEach(type => {
            const baseValue = this.getBaseValueForType(type, metrics);
            const growthRate = this.calculateGrowthRate(type, metrics);
            const volatility = this.calculateVolatility(type, metrics);
            for (let i = 1; i <= months; i++) {
                // Calculate predicted value based on real data trends
                const predictedValue = this.calculatePredictedValue(baseValue, growthRate, i, volatility);
                const trend = this.determineTrend(growthRate);
                const confidence = this.calculateConfidence(volatility, i);
                forecasts.push({
                    type: type,
                    period: `Month ${i}`,
                    predictedValue: Math.round(predictedValue),
                    confidence: confidence,
                    trend: trend,
                    factors: this.generateFactors(type, growthRate, volatility),
                    scenarios: {
                        optimistic: Math.round(predictedValue * 1.2),
                        realistic: Math.round(predictedValue),
                        pessimistic: Math.round(predictedValue * 0.8)
                    }
                });
            }
        });
        return forecasts;
    }
    calculateRealMetrics(financialData, revenueData, expenseData) {
        // Calculate real metrics from actual historical data
        const metrics = {
            totalRevenue: 0,
            totalExpenses: 0,
            avgMonthlyRevenue: 0,
            avgMonthlyExpenses: 0,
            revenueGrowth: 0,
            expenseGrowth: 0,
            profitMargin: 0,
            cashFlow: 0,
            revenueVolatility: 0,
            expenseVolatility: 0
        };
        // Calculate revenue metrics from invoices
        if (revenueData && revenueData.length > 0) {
            metrics.totalRevenue = revenueData.reduce((sum, invoice) => {
                const amount = parseFloat(invoice.totalAmount) || 0;
                return sum + amount;
            }, 0);
            metrics.avgMonthlyRevenue = Math.max(0, metrics.totalRevenue / Math.max(1, revenueData.length));
            // Calculate revenue growth trend
            const monthlyRevenue = this.groupByMonth(revenueData, 'issueDate', 'totalAmount');
            const monthlyRevenueValues = Object.values(monthlyRevenue).sort();
            metrics.revenueGrowth = this.calculateGrowthTrend(monthlyRevenueValues);
            metrics.revenueVolatility = this.calculateVolatilityTrend(monthlyRevenueValues);
        }
        // Calculate expense metrics from transactions
        if (expenseData && expenseData.length > 0) {
            metrics.totalExpenses = expenseData.reduce((sum, transaction) => {
                const amount = parseFloat(transaction.amount) || 0;
                return sum + amount;
            }, 0);
            metrics.avgMonthlyExpenses = Math.max(0, metrics.totalExpenses / Math.max(1, expenseData.length));
            // Calculate expense growth trend
            const monthlyExpenses = this.groupByMonth(expenseData, 'transactionDate', 'amount');
            const monthlyExpenseValues = Object.values(monthlyExpenses).sort();
            metrics.expenseGrowth = this.calculateGrowthTrend(monthlyExpenseValues);
            metrics.expenseVolatility = this.calculateVolatilityTrend(monthlyExpenseValues);
        }
        // Calculate profit and cash flow
        metrics.cashFlow = metrics.totalRevenue - metrics.totalExpenses;
        metrics.profitMargin = metrics.totalRevenue > 0 ? (metrics.cashFlow / metrics.totalRevenue) : 0;
        return metrics;
    }
    groupByMonth(data, dateField, amountField) {
        // Group data by month and sum amounts
        const monthlyData = {};
        data.forEach(item => {
            const date = new Date(item[dateField]);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const amount = parseFloat(item[amountField]) || 0;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount;
        });
        return monthlyData;
    }
    calculateGrowthTrend(monthlyData) {
        if (monthlyData.length < 2)
            return 0; // No growth if insufficient data
        // Calculate month-over-month growth rate
        const growthRates = [];
        for (let i = 1; i < monthlyData.length; i++) {
            if (monthlyData[i - 1] > 0) {
                growthRates.push((monthlyData[i] - monthlyData[i - 1]) / monthlyData[i - 1]);
            }
        }
        // Return average growth rate
        return growthRates.length > 0 ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 0;
    }
    calculateVolatilityTrend(monthlyData) {
        if (monthlyData.length < 2)
            return 0; // No volatility if insufficient data
        const mean = monthlyData.reduce((sum, val) => sum + val, 0) / monthlyData.length;
        const variance = monthlyData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / monthlyData.length;
        const standardDeviation = Math.sqrt(variance);
        return mean > 0 ? standardDeviation / mean : 0;
    }
    getBaseValueForType(type, metrics) {
        switch (type) {
            case 'revenue':
                return metrics.avgMonthlyRevenue;
            case 'expense':
                return metrics.avgMonthlyExpenses;
            case 'cash_flow':
                return metrics.avgMonthlyRevenue - metrics.avgMonthlyExpenses;
            case 'profit':
                return metrics.avgMonthlyRevenue - metrics.avgMonthlyExpenses;
            default:
                return 0;
        }
    }
    calculateGrowthRate(type, metrics) {
        // Calculate growth rate based on historical data patterns
        switch (type) {
            case 'revenue':
                return metrics.revenueGrowth;
            case 'expense':
                return metrics.expenseGrowth;
            case 'cash_flow':
                return metrics.revenueGrowth - metrics.expenseGrowth;
            case 'profit':
                return metrics.revenueGrowth - metrics.expenseGrowth;
            default:
                return 0;
        }
    }
    calculateVolatility(type, metrics) {
        // Calculate volatility based on historical data
        switch (type) {
            case 'revenue':
                return metrics.revenueVolatility;
            case 'expense':
                return metrics.expenseVolatility;
            case 'cash_flow':
                return Math.max(metrics.revenueVolatility, metrics.expenseVolatility);
            case 'profit':
                return Math.max(metrics.revenueVolatility, metrics.expenseVolatility);
            default:
                return 0;
        }
    }
    calculatePredictedValue(baseValue, growthRate, month, volatility) {
        // Calculate predicted value with compound growth and volatility
        // Ensure all values are valid numbers
        const safeBaseValue = isNaN(baseValue) ? 0 : Math.max(0, baseValue);
        const safeGrowthRate = isNaN(growthRate) ? 0 : Math.max(-0.2, Math.min(growthRate, 0.2)); // Cap at ±20%
        const safeVolatility = isNaN(volatility) ? 0 : Math.max(0, Math.min(volatility, 0.3)); // Cap at 30%
        // If no base value, return 0
        if (safeBaseValue === 0)
            return 0;
        // Calculate growth factor with reasonable bounds
        const growthFactor = Math.pow(1 + safeGrowthRate, month);
        // Calculate volatility factor (smaller impact)
        const volatilityFactor = 1 + (Math.random() - 0.5) * safeVolatility * 0.1; // Reduced volatility impact
        const result = safeBaseValue * growthFactor * volatilityFactor;
        // Only cap if result is unreasonably large (more than 100x base value)
        if (result > safeBaseValue * 100) {
            return safeBaseValue * 2; // Cap at 2x base value
        }
        return Math.max(0, result);
    }
    determineTrend(growthRate) {
        const safeGrowthRate = isNaN(growthRate) ? 0 : growthRate;
        if (safeGrowthRate > 0.02)
            return 'increasing';
        if (safeGrowthRate < -0.02)
            return 'decreasing';
        return 'stable';
    }
    calculateConfidence(volatility, month) {
        // Confidence decreases with volatility and time
        const safeVolatility = isNaN(volatility) ? 0 : volatility;
        const safeMonth = isNaN(month) ? 1 : month;
        const baseConfidence = 0.9;
        const volatilityPenalty = safeVolatility * 0.5;
        const timePenalty = safeMonth * 0.01;
        return Math.max(0.5, baseConfidence - volatilityPenalty - timePenalty);
    }
    generateFactors(type, growthRate, volatility) {
        const factors = [];
        if (growthRate > 0.05) {
            factors.push('Strong market growth');
        }
        else if (growthRate > 0) {
            factors.push('Moderate growth');
        }
        else {
            factors.push('Market challenges');
        }
        if (volatility < 0.1) {
            factors.push('Stable operations');
        }
        else {
            factors.push('Market volatility');
        }
        factors.push('Business performance');
        return factors;
    }
    async generateCashFlowInsights(forecasts, historicalData, context) {
        const insights = [];
        // Analyze trends
        const trend = this.analyzeTrend(forecasts);
        if (trend !== 'stable') {
            insights.push({
                type: 'trend',
                title: `Cash Flow ${trend === 'increasing' ? 'Growth' : 'Decline'} Detected`,
                description: `Cash flow is predicted to ${trend} over the forecast period`,
                confidence: 0.8,
                impact: 'medium',
                timeframe: '3-6 months',
                probability: 0.7,
                actionable: true
            });
        }
        return insights;
    }
    async generateRevenueInsights(forecasts, historicalData, context) {
        // Similar logic for revenue insights
        return [];
    }
    async generateExpenseInsights(forecasts, historicalData, context) {
        // Similar logic for expense insights
        return [];
    }
    async generateComprehensiveInsights(forecasts, context) {
        const insights = [];
        // Analyze revenue forecasts
        const revenueForecasts = forecasts.filter(f => f.type === 'revenue');
        const expenseForecasts = forecasts.filter(f => f.type === 'expense');
        const profitForecasts = forecasts.filter(f => f.type === 'profit');
        const cashFlowForecasts = forecasts.filter(f => f.type === 'cash_flow');
        // Revenue growth insight
        if (revenueForecasts.length >= 2) {
            const firstMonth = revenueForecasts[0].predictedValue;
            const lastMonth = revenueForecasts[revenueForecasts.length - 1].predictedValue;
            const growthRate = ((lastMonth - firstMonth) / firstMonth) * 100;
            insights.push({
                type: 'trend',
                title: 'Revenue Growth Trajectory',
                description: `Your revenue is projected to grow by ${growthRate.toFixed(1)}% over the next ${revenueForecasts.length} months, from $${firstMonth.toLocaleString()} to $${lastMonth.toLocaleString()}.`,
                confidence: 0.85,
                impact: growthRate > 20 ? 'high' : growthRate > 10 ? 'medium' : 'low',
                timeframe: `${revenueForecasts.length} months`,
                probability: 0.85,
                actionable: true
            });
        }
        // Profit margin insight
        if (profitForecasts.length > 0 && revenueForecasts.length > 0) {
            const avgProfit = profitForecasts.reduce((sum, f) => sum + f.predictedValue, 0) / profitForecasts.length;
            const avgRevenue = revenueForecasts.reduce((sum, f) => sum + f.predictedValue, 0) / revenueForecasts.length;
            const profitMargin = (avgProfit / avgRevenue) * 100;
            insights.push({
                type: 'pattern',
                title: 'Profit Margin Analysis',
                description: `Your average profit margin is projected at ${profitMargin.toFixed(1)}%, with average monthly profit of $${avgProfit.toLocaleString()}.`,
                confidence: 0.8,
                impact: profitMargin > 15 ? 'high' : profitMargin > 5 ? 'medium' : 'low',
                timeframe: 'ongoing',
                probability: 0.8,
                actionable: true
            });
        }
        // Cash flow stability insight
        if (cashFlowForecasts.length > 0) {
            const cashFlowValues = cashFlowForecasts.map(f => f.predictedValue);
            const minCashFlow = Math.min(...cashFlowValues);
            const maxCashFlow = Math.max(...cashFlowValues);
            const volatility = ((maxCashFlow - minCashFlow) / Math.abs(minCashFlow)) * 100;
            insights.push({
                type: 'pattern',
                title: 'Cash Flow Stability',
                description: `Your cash flow shows ${volatility < 20 ? 'stable' : 'volatile'} patterns, ranging from $${minCashFlow.toLocaleString()} to $${maxCashFlow.toLocaleString()}.`,
                confidence: 0.75,
                impact: volatility > 50 ? 'high' : volatility > 25 ? 'medium' : 'low',
                timeframe: 'ongoing',
                probability: 0.75,
                actionable: true
            });
        }
        // Expense efficiency insight
        if (expenseForecasts.length > 0 && revenueForecasts.length > 0) {
            const avgExpenses = expenseForecasts.reduce((sum, f) => sum + f.predictedValue, 0) / expenseForecasts.length;
            const avgRevenue = revenueForecasts.reduce((sum, f) => sum + f.predictedValue, 0) / revenueForecasts.length;
            const expenseRatio = (avgExpenses / avgRevenue) * 100;
            insights.push({
                type: 'pattern',
                title: 'Expense Management Efficiency',
                description: `Your expense-to-revenue ratio is ${expenseRatio.toFixed(1)}%, indicating ${expenseRatio < 70 ? 'efficient' : expenseRatio < 85 ? 'moderate' : 'high'} cost management.`,
                confidence: 0.8,
                impact: expenseRatio > 90 ? 'high' : expenseRatio > 80 ? 'medium' : 'low',
                timeframe: 'ongoing',
                probability: 0.8,
                actionable: true
            });
        }
        return insights;
    }
    async generateCashFlowRecommendations(forecasts, context) {
        const recommendations = [];
        // Analyze cash flow patterns and generate recommendations
        const avgCashFlow = forecasts.reduce((sum, f) => sum + f.predictedValue, 0) / forecasts.length;
        if (avgCashFlow < 0) {
            recommendations.push({
                category: 'cash_flow',
                title: 'Improve Cash Flow Management',
                description: 'Negative cash flow trend detected. Consider optimizing payment terms and reducing expenses.',
                expectedImpact: 0.15,
                implementationEffort: 'medium',
                timeframe: '1-3 months',
                priority: 'high',
                confidence: 0.9
            });
        }
        return recommendations;
    }
    async generateRevenueRecommendations(forecasts, context) {
        return [];
    }
    async generateExpenseRecommendations(forecasts, context) {
        return [];
    }
    async generateComprehensiveRecommendations(forecasts, context) {
        const recommendations = [];
        // Analyze forecasts to generate recommendations
        const revenueForecasts = forecasts.filter(f => f.type === 'revenue');
        const expenseForecasts = forecasts.filter(f => f.type === 'expense');
        const profitForecasts = forecasts.filter(f => f.type === 'profit');
        const cashFlowForecasts = forecasts.filter(f => f.type === 'cash_flow');
        // Revenue growth recommendation
        if (revenueForecasts.length >= 2) {
            const firstMonth = revenueForecasts[0].predictedValue;
            const lastMonth = revenueForecasts[revenueForecasts.length - 1].predictedValue;
            const growthRate = ((lastMonth - firstMonth) / firstMonth) * 100;
            if (growthRate < 10) {
                recommendations.push({
                    category: 'revenue',
                    title: 'Accelerate Revenue Growth',
                    description: 'Your revenue growth is below 10%. Consider expanding marketing efforts, launching new products, or entering new markets.',
                    expectedImpact: 0.25,
                    implementationEffort: 'medium',
                    timeframe: '2-6 months',
                    priority: 'high',
                    confidence: 0.85
                });
            }
            else if (growthRate > 30) {
                recommendations.push({
                    category: 'revenue',
                    title: 'Sustain High Growth Momentum',
                    description: 'Excellent growth trajectory! Focus on scaling operations and maintaining quality while expanding.',
                    expectedImpact: 0.15,
                    implementationEffort: 'high',
                    timeframe: 'ongoing',
                    priority: 'medium',
                    confidence: 0.9
                });
            }
        }
        // Profit margin recommendations
        if (profitForecasts.length > 0 && revenueForecasts.length > 0) {
            const avgProfit = profitForecasts.reduce((sum, f) => sum + f.predictedValue, 0) / profitForecasts.length;
            const avgRevenue = revenueForecasts.reduce((sum, f) => sum + f.predictedValue, 0) / revenueForecasts.length;
            const profitMargin = (avgProfit / avgRevenue) * 100;
            if (profitMargin < 5) {
                recommendations.push({
                    category: 'cost',
                    title: 'Improve Profit Margins',
                    description: 'Low profit margins detected. Focus on cost reduction, price optimization, and operational efficiency.',
                    expectedImpact: 0.3,
                    implementationEffort: 'medium',
                    timeframe: '1-3 months',
                    priority: 'high',
                    confidence: 0.8
                });
            }
            else if (profitMargin > 20) {
                recommendations.push({
                    category: 'growth',
                    title: 'Maintain Strong Profitability',
                    description: 'Excellent profit margins! Continue current strategies and consider reinvesting profits for growth.',
                    expectedImpact: 0.1,
                    implementationEffort: 'low',
                    timeframe: 'ongoing',
                    priority: 'low',
                    confidence: 0.9
                });
            }
        }
        // Cash flow recommendations
        if (cashFlowForecasts.length > 0) {
            const cashFlowValues = cashFlowForecasts.map(f => f.predictedValue);
            const minCashFlow = Math.min(...cashFlowValues);
            const avgCashFlow = cashFlowValues.reduce((sum, val) => sum + val, 0) / cashFlowValues.length;
            if (minCashFlow < 0) {
                recommendations.push({
                    category: 'cash_flow',
                    title: 'Address Negative Cash Flow',
                    description: 'Negative cash flow periods detected. Implement better payment terms, reduce expenses, or secure additional funding.',
                    expectedImpact: 0.4,
                    implementationEffort: 'high',
                    timeframe: 'immediate',
                    priority: 'high',
                    confidence: 0.95
                });
            }
            else if (avgCashFlow < 1000) {
                recommendations.push({
                    category: 'cash_flow',
                    title: 'Build Cash Reserves',
                    description: 'Low cash flow levels. Focus on building emergency reserves and improving cash management.',
                    expectedImpact: 0.2,
                    implementationEffort: 'medium',
                    timeframe: '1-6 months',
                    priority: 'high',
                    confidence: 0.8
                });
            }
        }
        // Expense management recommendations
        if (expenseForecasts.length > 0 && revenueForecasts.length > 0) {
            const avgExpenses = expenseForecasts.reduce((sum, f) => sum + f.predictedValue, 0) / expenseForecasts.length;
            const avgRevenue = revenueForecasts.reduce((sum, f) => sum + f.predictedValue, 0) / revenueForecasts.length;
            const expenseRatio = (avgExpenses / avgRevenue) * 100;
            if (expenseRatio > 90) {
                recommendations.push({
                    category: 'cost',
                    title: 'Reduce Operating Expenses',
                    description: 'High expense ratio detected. Review and optimize operational costs, negotiate better vendor terms.',
                    expectedImpact: 0.25,
                    implementationEffort: 'medium',
                    timeframe: '1-3 months',
                    priority: 'high',
                    confidence: 0.85
                });
            }
        }
        // General business recommendations
        recommendations.push({
            category: 'growth',
            title: 'Regular Financial Review',
            description: 'Schedule monthly financial reviews to track progress against forecasts and adjust strategies accordingly.',
            expectedImpact: 0.15,
            implementationEffort: 'low',
            timeframe: 'ongoing',
            priority: 'medium',
            confidence: 0.9
        });
        return recommendations;
    }
    async assessCashFlowRisk(forecasts, historicalData, context) {
        return this.getDefaultRiskAssessment();
    }
    async assessRevenueRisk(forecasts, historicalData, context) {
        return this.getDefaultRiskAssessment();
    }
    async assessExpenseRisk(forecasts, historicalData, context) {
        return this.getDefaultRiskAssessment();
    }
    async assessComprehensiveRisk(forecasts, context) {
        return this.getDefaultRiskAssessment();
    }
    analyzeTrend(forecasts) {
        if (forecasts.length < 2)
            return 'stable';
        const first = forecasts[0].predictedValue;
        const last = forecasts[forecasts.length - 1].predictedValue;
        const change = (last - first) / first;
        if (change > 0.05)
            return 'increasing';
        if (change < -0.05)
            return 'decreasing';
        return 'stable';
    }
    getDefaultRiskAssessment() {
        return {
            overallRisk: 'medium',
            riskFactors: [],
            cashFlowRisk: 0.5,
            marketRisk: 0.5,
            operationalRisk: 0.5,
            complianceRisk: 0.5
        };
    }
}
export const llamaPredictiveAnalytics = new LlamaPredictiveAnalytics();
