import { prisma } from '../prisma';
export async function seedBudgetManagementData(companyId) {
    console.log(`🌱 Seeding budget management data for company: ${companyId}`);
    try {
        // 1. Seed Dimensions
        const dimensions = await seedDimensions(companyId);
        console.log(`✅ Created ${dimensions.length} dimensions`);
        // 2. Seed Scenarios
        const scenarios = await seedScenarios(companyId);
        console.log(`✅ Created ${scenarios.length} scenarios`);
        // 3. Seed Periods
        const periods = await seedPeriods(companyId);
        console.log(`✅ Created ${periods.length} periods`);
        // 4. Seed Budget Accounts
        const accounts = await seedBudgetAccounts(companyId);
        console.log(`✅ Created ${accounts.length} budget accounts`);
        // 5. Seed Budgets
        const budgets = await seedBudgets(companyId, scenarios[0].id, periods[0].id);
        console.log(`✅ Created ${budgets.length} budgets`);
        // 6. Seed Budget Line Items
        const lineItems = await seedBudgetLineItems(budgets[0].id, accounts, dimensions);
        console.log(`✅ Created ${lineItems.length} budget line items`);
        // 7. Seed Rolling Forecasts
        const forecasts = await seedRollingForecasts(companyId);
        console.log(`✅ Created ${forecasts.length} rolling forecasts`);
        console.log(`🎉 Budget management data seeded successfully for company: ${companyId}`);
        return {
            dimensions,
            scenarios,
            periods,
            accounts,
            budgets,
            lineItems,
            forecasts
        };
    }
    catch (error) {
        console.error('❌ Error seeding budget management data:', error);
        throw error;
    }
}
async function seedDimensions(companyId) {
    const dimensionsData = [
        {
            id: `dim-${companyId}-1`,
            companyId,
            name: 'Sales Department',
            type: 'DEPARTMENT',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `dim-${companyId}-2`,
            companyId,
            name: 'Marketing Department',
            type: 'DEPARTMENT',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `dim-${companyId}-3`,
            companyId,
            name: 'Product A',
            type: 'PRODUCT_LINE',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `dim-${companyId}-4`,
            companyId,
            name: 'North America',
            type: 'GEOGRAPHY',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];
    const dimensions = [];
    for (const dimensionData of dimensionsData) {
        const dimension = await prisma.budgetDimension.upsert({
            where: { id: dimensionData.id },
            update: dimensionData,
            create: dimensionData
        });
        dimensions.push(dimension);
    }
    return dimensions;
}
async function seedScenarios(companyId) {
    const scenariosData = [
        {
            id: `scenario-${companyId}-1`,
            companyId,
            name: 'Base Case',
            description: 'Most likely scenario based on current trends',
            type: 'BASE',
            isActive: true,
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `scenario-${companyId}-2`,
            companyId,
            name: 'Optimistic',
            description: 'Best case scenario with favorable conditions',
            type: 'OPTIMISTIC',
            isActive: true,
            isDefault: false,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `scenario-${companyId}-3`,
            companyId,
            name: 'Pessimistic',
            description: 'Worst case scenario with challenging conditions',
            type: 'PESSIMISTIC',
            isActive: true,
            isDefault: false,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];
    const scenarios = [];
    for (const scenarioData of scenariosData) {
        const scenario = await prisma.budgetScenario.upsert({
            where: { id: scenarioData.id },
            update: scenarioData,
            create: scenarioData
        });
        scenarios.push(scenario);
    }
    return scenarios;
}
async function seedPeriods(companyId) {
    const periodsData = [
        {
            id: `period-${companyId}-1`,
            companyId,
            name: 'Q1 2024',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            periodType: 'QUARTERLY',
            isClosed: false,
            isCurrent: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `period-${companyId}-2`,
            companyId,
            name: 'Q2 2024',
            startDate: new Date('2024-04-01'),
            endDate: new Date('2024-06-30'),
            periodType: 'QUARTERLY',
            isClosed: false,
            isCurrent: false,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `period-${companyId}-3`,
            companyId,
            name: '2024 Annual',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31'),
            periodType: 'YEARLY',
            isClosed: false,
            isCurrent: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];
    const periods = [];
    for (const periodData of periodsData) {
        const period = await prisma.budgetPeriod.upsert({
            where: { id: periodData.id },
            update: periodData,
            create: periodData
        });
        periods.push(period);
    }
    return periods;
}
async function seedBudgetAccounts(companyId) {
    const accountsData = [
        {
            id: `budget-acc-${companyId}-1`,
            companyId,
            accountId: 'acc-1',
            accountName: 'Sales Revenue',
            accountType: 'REVENUE',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `budget-acc-${companyId}-2`,
            companyId,
            accountId: 'acc-2',
            accountName: 'Marketing Expenses',
            accountType: 'EXPENSE',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `budget-acc-${companyId}-3`,
            companyId,
            accountId: 'acc-3',
            accountName: 'Salaries',
            accountType: 'EXPENSE',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `budget-acc-${companyId}-4`,
            companyId,
            accountId: 'acc-4',
            accountName: 'Office Rent',
            accountType: 'EXPENSE',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];
    const accounts = [];
    for (const accountData of accountsData) {
        const account = await prisma.budgetAccount.upsert({
            where: { id: accountData.id },
            update: accountData,
            create: accountData
        });
        accounts.push(account);
    }
    return accounts;
}
async function seedBudgets(companyId, scenarioId, periodId) {
    const budgetsData = [
        {
            id: `budget-${companyId}-1`,
            companyId,
            name: 'Q1 2024 Sales Budget',
            description: 'Sales budget for Q1 2024',
            scenarioId,
            periodId,
            status: 'ACTIVE',
            totalPlanned: 500000,
            totalActual: 450000,
            totalVariance: 50000,
            totalVariancePercent: 10,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `budget-${companyId}-2`,
            companyId,
            name: 'Q1 2024 Marketing Budget',
            description: 'Marketing budget for Q1 2024',
            scenarioId,
            periodId,
            status: 'ACTIVE',
            totalPlanned: 100000,
            totalActual: 95000,
            totalVariance: 5000,
            totalVariancePercent: 5,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];
    const budgets = [];
    for (const budgetData of budgetsData) {
        const budget = await prisma.budget.upsert({
            where: { id: budgetData.id },
            update: budgetData,
            create: budgetData
        });
        budgets.push(budget);
    }
    return budgets;
}
async function seedBudgetLineItems(budgetId, accounts, dimensions) {
    const lineItemsData = [
        {
            id: `line-${budgetId}-1`,
            budgetId,
            accountId: accounts[0].id,
            dimensionId: dimensions[0].id,
            periodId: 'period-1',
            plannedAmount: 500000,
            actualAmount: 450000,
            variance: 50000,
            variancePercent: 10,
            notes: 'Sales target for Q1',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `line-${budgetId}-2`,
            budgetId,
            accountId: accounts[1].id,
            dimensionId: dimensions[1].id,
            periodId: 'period-1',
            plannedAmount: 100000,
            actualAmount: 95000,
            variance: 5000,
            variancePercent: 5,
            notes: 'Marketing spend for Q1',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];
    const lineItems = [];
    for (const lineItemData of lineItemsData) {
        const lineItem = await prisma.budgetLineItem.upsert({
            where: { id: lineItemData.id },
            update: lineItemData,
            create: lineItemData
        });
        lineItems.push(lineItem);
    }
    return lineItems;
}
async function seedRollingForecasts(companyId) {
    const forecastsData = [
        {
            id: `forecast-${companyId}-1`,
            companyId,
            name: '12-Month Rolling Forecast',
            description: 'Monthly rolling forecast for next 12 months',
            basePeriod: '2024-01',
            forecastPeriods: 12,
            frequency: 'MONTHLY',
            isActive: true,
            lastUpdated: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: `forecast-${companyId}-2`,
            companyId,
            name: 'Quarterly Forecast',
            description: 'Quarterly rolling forecast',
            basePeriod: '2024-Q1',
            forecastPeriods: 4,
            frequency: 'QUARTERLY',
            isActive: true,
            lastUpdated: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];
    const forecasts = [];
    for (const forecastData of forecastsData) {
        const forecast = await prisma.rollingForecast.upsert({
            where: { id: forecastData.id },
            update: forecastData,
            create: forecastData
        });
        forecasts.push(forecast);
    }
    return forecasts;
}
