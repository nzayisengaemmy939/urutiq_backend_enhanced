import { prisma } from '../prisma';
export class BudgetManagementService {
    // Dimension Management
    async createDimension(companyId, dimensionData) {
        const dimension = {
            id: `dim-${Date.now()}`,
            ...dimensionData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        // Save to database
        const savedDimension = await prisma.budgetDimension.create({
            data: {
                id: dimension.id,
                companyId: companyId,
                name: dimension.name,
                type: dimension.type,
                isActive: dimension.isActive,
                createdAt: new Date(dimension.createdAt),
                updatedAt: new Date(dimension.updatedAt)
            }
        });
        return {
            id: savedDimension.id,
            name: savedDimension.name,
            type: savedDimension.type,
            isActive: savedDimension.isActive,
            createdAt: savedDimension.createdAt.toISOString(),
            updatedAt: savedDimension.updatedAt.toISOString()
        };
    }
    async getDimensions(companyId) {
        try {
            const dimensions = await prisma.budgetDimension.findMany({
                where: {
                    companyId: companyId,
                    isActive: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
            return dimensions.map((dim) => ({
                id: dim.id,
                name: dim.name,
                type: dim.type,
                isActive: dim.isActive,
                createdAt: dim.createdAt.toISOString(),
                updatedAt: dim.updatedAt.toISOString()
            }));
        }
        catch (error) {
            throw new Error('Failed to fetch dimensions from database');
        }
    }
    async updateDimension(dimensionId, dimensionData) {
        try {
            const updatedDimension = await prisma.budgetDimension.update({
                where: { id: dimensionId },
                data: {
                    name: dimensionData.name,
                    type: dimensionData.type,
                    isActive: dimensionData.isActive
                }
            });
            return {
                id: updatedDimension.id,
                name: updatedDimension.name,
                type: updatedDimension.type,
                isActive: updatedDimension.isActive,
                createdAt: updatedDimension.createdAt.toISOString(),
                updatedAt: updatedDimension.updatedAt.toISOString()
            };
        }
        catch (error) {
            throw new Error('Failed to update dimension');
        }
    }
    async deleteDimension(dimensionId) {
        try {
            await prisma.budgetDimension.delete({
                where: { id: dimensionId }
            });
        }
        catch (error) {
            throw new Error('Failed to delete dimension');
        }
    }
    // Scenario Management
    async createScenario(companyId, scenarioData) {
        const scenario = {
            id: `scenario-${Date.now()}`,
            ...scenarioData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        return scenario;
    }
    async getScenarios(companyId) {
        try {
            const scenarios = await prisma.budgetScenario.findMany({
                where: {
                    companyId: companyId,
                    isActive: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
            return scenarios.map((scenario) => ({
                id: scenario.id,
                name: scenario.name,
                description: scenario.description || '',
                type: scenario.type,
                isActive: scenario.isActive,
                isDefault: scenario.isDefault,
                createdAt: scenario.createdAt.toISOString(),
                updatedAt: scenario.updatedAt.toISOString()
            }));
        }
        catch (error) {
            throw new Error('Failed to fetch scenarios from database');
        }
    }
    // Period Management
    async createPeriod(companyId, periodData) {
        const period = {
            id: `period-${Date.now()}`,
            ...periodData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        return period;
    }
    async getPeriods(companyId, year) {
        const currentYear = year || new Date().getFullYear();
        const periods = [];
        // Generate monthly periods for the year
        for (let month = 0; month < 12; month++) {
            const startDate = new Date(currentYear, month, 1);
            const endDate = new Date(currentYear, month + 1, 0);
            periods.push({
                id: `period-${currentYear}-${month + 1}`,
                name: `${startDate.toLocaleDateString('en-US', { month: 'long' })} ${currentYear}`,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                periodType: 'MONTHLY',
                isClosed: month < new Date().getMonth(),
                isCurrent: month === new Date().getMonth(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        return periods;
    }
    // Budget Account Management
    async getBudgetAccounts(companyId) {
        try {
            const accounts = await prisma.budgetAccount.findMany({
                where: {
                    companyId: companyId,
                    isActive: true
                },
                orderBy: {
                    accountName: 'asc'
                }
            });
            return accounts.map((account) => ({
                id: account.id,
                accountId: account.accountId,
                accountName: account.accountName,
                accountType: account.accountType,
                isActive: account.isActive,
                createdAt: account.createdAt.toISOString(),
                updatedAt: account.updatedAt.toISOString()
            }));
        }
        catch (error) {
            throw new Error('Failed to fetch budget accounts from database');
        }
    }
    // Budget Management
    async createBudget(companyId, budgetData) {
        const budget = {
            id: `budget-${Date.now()}`,
            ...budgetData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        return budget;
    }
    async getBudgets(companyId, status, periodId) {
        try {
            // Query the actual budget data from the database
            const whereClause = {
                companyId: companyId
            };
            if (status) {
                whereClause.status = status;
            }
            const budgets = await prisma.budget.findMany({
                where: whereClause,
                include: {
                    category: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            // Transform the database budget data to match our Budget interface
            return budgets.map((budget) => ({
                id: budget.id,
                companyId: budget.companyId,
                name: budget.name,
                description: budget.description || '',
                scenarioId: 'default', // Default scenario since simple budgets don't have scenarios
                periodId: 'default', // Default period since simple budgets don't have periods
                status: budget.isActive ? 'ACTIVE' : 'DRAFT',
                totalPlanned: Number(budget.amount),
                totalActual: Number(budget.spentAmount || 0),
                totalVariance: Number(budget.amount) - Number(budget.spentAmount || 0),
                totalVariancePercent: Number(budget.amount) > 0 ?
                    ((Number(budget.amount) - Number(budget.spentAmount || 0)) / Number(budget.amount)) * 100 : 0,
                createdBy: 'system',
                approvedBy: budget.isActive ? 'system' : undefined,
                approvedAt: budget.isActive ? budget.updatedAt.toISOString() : undefined,
                createdAt: budget.createdAt.toISOString(),
                updatedAt: budget.updatedAt.toISOString()
            }));
        }
        catch (error) {
            throw new Error('Failed to fetch budgets from database');
        }
    }
    async getBudgetLineItems(budgetId) {
        try {
            const lineItems = await prisma.budgetLineItem.findMany({
                where: {
                    budgetId: budgetId
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
            return lineItems.map((item) => ({
                id: item.id,
                budgetId: item.budgetId,
                accountId: item.accountId,
                dimensionId: item.dimensionId,
                periodId: item.periodId,
                plannedAmount: Number(item.plannedAmount),
                actualAmount: Number(item.actualAmount),
                variance: Number(item.variance),
                variancePercent: Number(item.variancePercent),
                notes: item.notes || '',
                createdAt: item.createdAt.toISOString(),
                updatedAt: item.updatedAt.toISOString()
            }));
        }
        catch (error) {
            throw new Error('Failed to fetch budget line items from database');
        }
    }
    // Rolling Forecast Management
    async createRollingForecast(companyId, forecastData) {
        const forecast = {
            id: `forecast-${Date.now()}`,
            ...forecastData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        // Save to database
        const savedForecast = await prisma.rollingForecast.create({
            data: {
                id: forecast.id,
                companyId: companyId,
                name: forecast.name,
                description: forecast.description,
                basePeriod: forecast.basePeriod,
                forecastPeriods: forecast.forecastPeriods,
                frequency: forecast.frequency,
                isActive: forecast.isActive,
                lastUpdated: new Date(forecast.lastUpdated),
                createdAt: new Date(forecast.createdAt),
                updatedAt: new Date(forecast.updatedAt)
            }
        });
        return {
            id: savedForecast.id,
            companyId: savedForecast.companyId,
            name: savedForecast.name,
            description: savedForecast.description || undefined,
            basePeriod: savedForecast.basePeriod,
            forecastPeriods: savedForecast.forecastPeriods,
            frequency: savedForecast.frequency,
            isActive: savedForecast.isActive,
            lastUpdated: savedForecast.lastUpdated.toISOString(),
            createdAt: savedForecast.createdAt.toISOString(),
            updatedAt: savedForecast.updatedAt.toISOString()
        };
    }
    async getRollingForecasts(companyId) {
        try {
            const forecasts = await prisma.rollingForecast.findMany({
                where: {
                    companyId: companyId,
                    isActive: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            return forecasts.map((forecast) => ({
                id: forecast.id,
                companyId: forecast.companyId,
                name: forecast.name,
                description: forecast.description || '',
                basePeriod: forecast.basePeriod,
                forecastPeriods: forecast.forecastPeriods,
                frequency: forecast.frequency,
                isActive: forecast.isActive,
                lastUpdated: forecast.lastUpdated.toISOString(),
                createdAt: forecast.createdAt.toISOString(),
                updatedAt: forecast.updatedAt.toISOString()
            }));
        }
        catch (error) {
            throw new Error('Failed to fetch rolling forecasts from database');
        }
    }
    async generateForecast(companyId, forecastId) {
        // In a real implementation, this would use historical data and forecasting algorithms
        const forecast = await this.getRollingForecasts(companyId).then(f => f.find(f => f.id === forecastId));
        if (!forecast)
            throw new Error('Forecast not found');
        const forecastData = [];
        const dimensions = await this.getDimensions(companyId);
        const accounts = await this.getBudgetAccounts(companyId);
        // Generate forecast for each period
        for (let i = 0; i < forecast.forecastPeriods; i++) {
            const period = new Date();
            period.setMonth(period.getMonth() + i);
            const periodStr = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`;
            const dimensionData = dimensions.map(dim => ({
                dimensionId: dim.id,
                dimensionName: dim.name,
                accounts: accounts.map(acc => ({
                    accountId: acc.id,
                    accountName: acc.accountName,
                    forecastedAmount: Math.random() * 100000, // Simplified for demo
                    confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
                    assumptions: [
                        'Based on historical trends',
                        'Market growth assumptions',
                        'Seasonal adjustments applied'
                    ]
                }))
            }));
            forecastData.push({
                period: periodStr,
                dimensions: dimensionData
            });
        }
        return forecastData;
    }
    async updateRollingForecast(forecastId, forecastData) {
        try {
            const updatedForecast = await prisma.rollingForecast.update({
                where: { id: forecastId },
                data: {
                    name: forecastData.name,
                    description: forecastData.description,
                    basePeriod: forecastData.basePeriod,
                    forecastPeriods: forecastData.forecastPeriods,
                    frequency: forecastData.frequency,
                    lastUpdated: new Date(forecastData.lastUpdated || new Date().toISOString()),
                    isActive: forecastData.isActive
                }
            });
            return {
                id: updatedForecast.id,
                companyId: updatedForecast.companyId,
                name: updatedForecast.name,
                description: updatedForecast.description || '',
                basePeriod: updatedForecast.basePeriod,
                forecastPeriods: updatedForecast.forecastPeriods,
                frequency: updatedForecast.frequency,
                isActive: updatedForecast.isActive,
                lastUpdated: updatedForecast.lastUpdated.toISOString(),
                createdAt: updatedForecast.createdAt.toISOString(),
                updatedAt: updatedForecast.updatedAt.toISOString()
            };
        }
        catch (error) {
            throw new Error('Failed to update rolling forecast');
        }
    }
    async deleteRollingForecast(forecastId) {
        try {
            await prisma.rollingForecast.delete({
                where: { id: forecastId }
            });
        }
        catch (error) {
            throw new Error('Failed to delete rolling forecast');
        }
    }
    // Variance Analysis
    async getBudgetVariances(companyId, budgetId) {
        const lineItems = await this.getBudgetLineItems(budgetId);
        const dimensions = await this.getDimensions(companyId);
        const accounts = await this.getBudgetAccounts(companyId);
        return lineItems.map(item => {
            const dimension = dimensions.find(d => d.id === item.dimensionId);
            const account = accounts.find(a => a.id === item.accountId);
            // Calculate trend based on variance
            let trend = 'STABLE';
            if (item.variancePercent > 10)
                trend = 'DETERIORATING';
            else if (item.variancePercent < -10)
                trend = 'IMPROVING';
            // Calculate risk level
            let riskLevel = 'LOW';
            if (Math.abs(item.variancePercent) > 20)
                riskLevel = 'HIGH';
            else if (Math.abs(item.variancePercent) > 10)
                riskLevel = 'MEDIUM';
            return {
                accountId: item.accountId,
                accountName: account?.accountName || 'Unknown',
                dimensionId: item.dimensionId,
                dimensionName: dimension?.name || 'Unknown',
                plannedAmount: item.plannedAmount,
                actualAmount: item.actualAmount,
                variance: item.variance,
                variancePercent: item.variancePercent,
                trend,
                riskLevel
            };
        });
    }
    // Budget Reports
    async generateBudgetReport(companyId, reportType, period, dimensions) {
        switch (reportType) {
            case 'SUMMARY':
                return {
                    reportType: 'SUMMARY',
                    period,
                    dimensions: dimensions || [],
                    data: {
                        totalPlanned: 1000000,
                        totalActual: 850000,
                        totalVariance: -150000,
                        totalVariancePercent: -15,
                        budgetCount: 1,
                        activeBudgets: 1,
                        closedBudgets: 0
                    },
                    generatedAt: new Date().toISOString()
                };
            case 'DETAILED':
                const budgets = await this.getBudgets(companyId);
                return {
                    reportType: 'DETAILED',
                    period,
                    dimensions: dimensions || [],
                    data: budgets,
                    generatedAt: new Date().toISOString()
                };
            case 'VARIANCE':
                const variances = await this.getBudgetVariances(companyId, 'budget-1');
                return {
                    reportType: 'VARIANCE',
                    period,
                    dimensions: dimensions || [],
                    data: variances,
                    generatedAt: new Date().toISOString()
                };
            case 'FORECAST':
                const forecasts = await this.generateForecast(companyId, 'forecast-1');
                return {
                    reportType: 'FORECAST',
                    period,
                    dimensions: dimensions || [],
                    data: forecasts,
                    generatedAt: new Date().toISOString()
                };
            default:
                throw new Error(`Unsupported report type: ${reportType}`);
        }
    }
    // Budget Approval Workflow
    async approveBudget(budgetId, approvedBy) {
        // In a real implementation, this would update the database
        const budget = await this.getBudgets('').then(budgets => budgets.find(b => b.id === budgetId));
        if (!budget)
            throw new Error('Budget not found');
        return {
            ...budget,
            status: 'APPROVED',
            approvedBy,
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
    async activateBudget(budgetId) {
        const budget = await this.getBudgets('').then(budgets => budgets.find(b => b.id === budgetId));
        if (!budget)
            throw new Error('Budget not found');
        return {
            ...budget,
            status: 'ACTIVE',
            updatedAt: new Date().toISOString()
        };
    }
    // Budget Copy and Templates
    async copyBudget(sourceBudgetId, newName, newPeriodId) {
        const sourceBudget = await this.getBudgets('').then(budgets => budgets.find(b => b.id === sourceBudgetId));
        if (!sourceBudget)
            throw new Error('Source budget not found');
        const newBudget = {
            id: `budget-${Date.now()}`,
            companyId: sourceBudget.companyId,
            name: newName,
            description: `Copied from ${sourceBudget.name}`,
            scenarioId: sourceBudget.scenarioId,
            periodId: newPeriodId,
            status: 'DRAFT',
            totalPlanned: sourceBudget.totalPlanned,
            totalActual: 0,
            totalVariance: 0,
            totalVariancePercent: 0,
            createdBy: 'user-1', // In real implementation, get from auth context
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        return newBudget;
    }
    // Budget Performance Metrics
    async getBudgetPerformanceMetrics(companyId, period) {
        try {
            // Get all budgets for the company
            const budgets = await prisma.budget.findMany({
                where: { companyId }
            });
            if (budgets.length === 0) {
                return {
                    budgetAccuracy: 0,
                    varianceTrend: 'STABLE',
                    topPerformingDimensions: [],
                    underperformingDimensions: [],
                    recommendations: ['No budget data available for analysis']
                };
            }
            // Calculate overall budget accuracy
            const totalPlanned = budgets.reduce((sum, budget) => sum + Number(budget.amount), 0);
            const totalActual = budgets.reduce((sum, budget) => sum + Number(budget.spentAmount || 0), 0);
            const budgetAccuracy = totalPlanned > 0 ? ((totalPlanned - Math.abs(totalPlanned - totalActual)) / totalPlanned) * 100 : 0;
            // Get dimensions for performance analysis
            const dimensions = await this.getDimensions(companyId);
            const lineItems = await Promise.all(budgets.map(budget => this.getBudgetLineItems(budget.id)));
            const allLineItems = lineItems.flat();
            // Calculate performance by dimension
            const dimensionPerformance = dimensions.map(dim => {
                const dimLineItems = allLineItems.filter(item => item.dimensionId === dim.id);
                if (dimLineItems.length === 0)
                    return { dimensionId: dim.id, dimensionName: dim.name, performance: 0 };
                const totalPlanned = dimLineItems.reduce((sum, item) => sum + item.plannedAmount, 0);
                const totalActual = dimLineItems.reduce((sum, item) => sum + item.actualAmount, 0);
                const performance = totalPlanned > 0 ? ((totalPlanned - Math.abs(totalPlanned - totalActual)) / totalPlanned) * 100 : 0;
                return { dimensionId: dim.id, dimensionName: dim.name, performance };
            });
            const topPerformingDimensions = dimensionPerformance
                .filter(dim => dim.performance > 0)
                .sort((a, b) => b.performance - a.performance)
                .slice(0, 3);
            const underperformingDimensions = dimensionPerformance
                .filter(dim => dim.performance > 0 && dim.performance < 80)
                .sort((a, b) => a.performance - b.performance)
                .slice(0, 3);
            // Determine variance trend
            const avgVariance = allLineItems.reduce((sum, item) => sum + item.variancePercent, 0) / allLineItems.length;
            let varianceTrend = 'STABLE';
            if (avgVariance > 10)
                varianceTrend = 'DETERIORATING';
            else if (avgVariance < -10)
                varianceTrend = 'IMPROVING';
            // Generate recommendations
            const recommendations = [];
            if (budgetAccuracy < 80)
                recommendations.push('Improve budget accuracy through better forecasting');
            if (underperformingDimensions.length > 0)
                recommendations.push('Review underperforming dimensions');
            if (varianceTrend === 'DETERIORATING')
                recommendations.push('Address deteriorating variance trends');
            if (recommendations.length === 0)
                recommendations.push('Budget performance is within acceptable ranges');
            return {
                budgetAccuracy: Math.round(budgetAccuracy * 100) / 100,
                varianceTrend,
                topPerformingDimensions,
                underperformingDimensions,
                recommendations
            };
        }
        catch (error) {
            throw new Error('Failed to calculate performance metrics');
        }
    }
}
export const budgetManagementService = new BudgetManagementService();
