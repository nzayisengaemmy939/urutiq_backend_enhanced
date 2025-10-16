const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedData() {
  console.log('🌱 Starting manual seeding...')
  
  try {
    const companyId = 'seed-company-1'
    
    // Insert dimensions
    console.log('Inserting dimensions...')
    await prisma.budgetDimension.createMany({
      data: [
        {
          id: `dim-${companyId}-1`,
          companyId,
          name: 'Sales Department',
          type: 'DEPARTMENT',
          isActive: true
        },
        {
          id: `dim-${companyId}-2`,
          companyId,
          name: 'Marketing Department',
          type: 'DEPARTMENT',
          isActive: true
        },
        {
          id: `dim-${companyId}-3`,
          companyId,
          name: 'Product A',
          type: 'PRODUCT_LINE',
          isActive: true
        }
      ],
      skipDuplicates: true
    })
    console.log('✅ Dimensions created')

    // Insert scenarios
    console.log('Inserting scenarios...')
    await prisma.budgetScenario.createMany({
      data: [
        {
          id: `scenario-${companyId}-1`,
          companyId,
          name: 'Base Case',
          description: 'Most likely scenario',
          type: 'BASE',
          isActive: true,
          isDefault: true
        },
        {
          id: `scenario-${companyId}-2`,
          companyId,
          name: 'Optimistic',
          description: 'Best case scenario',
          type: 'OPTIMISTIC',
          isActive: true,
          isDefault: false
        }
      ],
      skipDuplicates: true
    })
    console.log('✅ Scenarios created')

    // Insert periods
    console.log('Inserting periods...')
    await prisma.budgetPeriod.createMany({
      data: [
        {
          id: `period-${companyId}-1`,
          companyId,
          name: 'Q1 2024',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          periodType: 'QUARTERLY',
          isClosed: false,
          isCurrent: true
        },
        {
          id: `period-${companyId}-2`,
          companyId,
          name: 'Q2 2024',
          startDate: new Date('2024-04-01'),
          endDate: new Date('2024-06-30'),
          periodType: 'QUARTERLY',
          isClosed: false,
          isCurrent: false
        }
      ],
      skipDuplicates: true
    })
    console.log('✅ Periods created')

    // Insert budget accounts
    console.log('Inserting budget accounts...')
    await prisma.budgetAccount.createMany({
      data: [
        {
          id: `budget-acc-${companyId}-1`,
          companyId,
          accountId: 'acc-1',
          accountName: 'Sales Revenue',
          accountType: 'REVENUE',
          isActive: true
        },
        {
          id: `budget-acc-${companyId}-2`,
          companyId,
          accountId: 'acc-2',
          accountName: 'Marketing Expenses',
          accountType: 'EXPENSE',
          isActive: true
        }
      ],
      skipDuplicates: true
    })
    console.log('✅ Budget accounts created')

    // Insert budgets
    console.log('Inserting budgets...')
    await prisma.budget.createMany({
      data: [
        {
          id: `budget-${companyId}-1`,
          companyId,
          name: 'Q1 2024 Sales Budget',
          description: 'Sales budget for Q1 2024',
          amount: 500000,
          spentAmount: 450000,
          isActive: true
        },
        {
          id: `budget-${companyId}-2`,
          companyId,
          name: 'Q1 2024 Marketing Budget',
          description: 'Marketing budget for Q1 2024',
          amount: 100000,
          spentAmount: 95000,
          isActive: true
        }
      ],
      skipDuplicates: true
    })
    console.log('✅ Budgets created')

    // Insert budget line items
    console.log('Inserting budget line items...')
    await prisma.budgetLineItem.createMany({
      data: [
        {
          id: `line-${companyId}-1`,
          budgetId: `budget-${companyId}-1`,
          accountId: `budget-acc-${companyId}-1`,
          dimensionId: `dim-${companyId}-1`,
          periodId: `period-${companyId}-1`,
          plannedAmount: 500000,
          actualAmount: 450000,
          variance: -50000,
          variancePercent: -10,
          notes: 'Sales target for Q1'
        },
        {
          id: `line-${companyId}-2`,
          budgetId: `budget-${companyId}-2`,
          accountId: `budget-acc-${companyId}-2`,
          dimensionId: `dim-${companyId}-2`,
          periodId: `period-${companyId}-1`,
          plannedAmount: 100000,
          actualAmount: 95000,
          variance: -5000,
          variancePercent: -5,
          notes: 'Marketing spend for Q1'
        }
      ],
      skipDuplicates: true
    })
    console.log('✅ Budget line items created')

    // Insert rolling forecasts
    console.log('Inserting rolling forecasts...')
    await prisma.rollingForecast.createMany({
      data: [
        {
          id: `forecast-${companyId}-1`,
          companyId,
          name: '12-Month Rolling Forecast',
          description: 'Monthly rolling forecast for next 12 months',
          basePeriod: '2024-01',
          forecastPeriods: 12,
          frequency: 'MONTHLY',
          isActive: true
        }
      ],
      skipDuplicates: true
    })
    console.log('✅ Rolling forecasts created')

    console.log('🎉 All data seeded successfully!')

  } catch (error) {
    console.error('❌ Error seeding data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedData()
