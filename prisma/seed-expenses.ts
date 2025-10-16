import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type SeedOpts = { tenantId: string; companyId: string; budgets?: number }

const categorySeeds = [
  { name: 'Office', children: ['Supplies', 'Furniture', 'Utilities'] },
  { name: 'Travel', children: ['Flights', 'Hotels', 'Meals'] },
  { name: 'IT & Software', children: ['Licenses', 'Cloud', 'Hardware'] },
  { name: 'Professional Services', children: ['Legal', 'Accounting', 'Consulting'] },
]

export async function seedExpenses({ tenantId, companyId, budgets = 20 }: SeedOpts) {
  console.log(`🌱 Seeding expense categories/rules/budgets for ${companyId}`)

  // Categories
  const createdCategories: string[] = []
  for (const cat of categorySeeds) {
    let parent = await prisma.expenseCategory.findFirst({ where: { tenantId, companyId, name: cat.name } })
    if (!parent) {
      parent = await prisma.expenseCategory.create({ data: { tenantId, companyId, name: cat.name, isActive: true, taxTreatment: 'deductible' } as any })
    }
    createdCategories.push(parent.id)
    for (const child of cat.children) {
      let c = await prisma.expenseCategory.findFirst({ where: { tenantId, companyId, name: `${cat.name} - ${child}` } })
      if (!c) {
        c = await prisma.expenseCategory.create({ data: { tenantId, companyId, name: `${cat.name} - ${child}`, parentId: parent.id, isActive: true, taxTreatment: 'deductible' } as any })
      }
      createdCategories.push(c.id)
    }
  }

  // Budgets (20)
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
  const periods = ['monthly','quarterly','yearly'] as const
  for (let i = 0; i < budgets; i++) {
    const period = pick(periods as unknown as string[]) as any
    const start = new Date(); start.setMonth(start.getMonth() - Math.floor(Math.random()*6))
    const end = new Date(start); end.setMonth(start.getMonth() + (period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12))
    const amount = Number((500 + Math.random()*4500).toFixed(2))
    const spent = Number((amount * Math.random()).toFixed(2))
    await prisma.budget.create({ data: {
      tenantId, companyId,
      name: `Budget ${i+1}`,
      description: 'Seeded budget',
      categoryId: pick(createdCategories),
      period,
      startDate: start,
      endDate: end,
      amount,
      spentAmount: spent,
      isActive: true,
      alertThreshold: 80,
    }})
  }

  // Rules (3)
  const ruleDefs = [
    { name: 'High Amount Approval', type: 'approval_required', conditions: { amount_gt: 1000 }, actions: { require_approval: true }, priority: 1 },
    { name: 'Vendor Restriction', type: 'vendor_restriction', conditions: { vendor_in: ['Acme Supplies'] }, actions: { flag: true }, priority: 2 },
    { name: 'Amount Limit', type: 'amount_limit', conditions: { amount_lte: 5000 }, actions: { allow: true }, priority: 3 },
  ]
  for (const r of ruleDefs) {
    await prisma.expenseRule.create({ data: {
      tenantId, companyId,
      name: r.name,
      description: 'Seeded rule',
      categoryId: pick(createdCategories),
      ruleType: r.type as any,
      conditions: JSON.stringify(r.conditions),
      actions: JSON.stringify(r.actions),
      isActive: true,
      priority: r.priority,
    }})
  }

  // Expenses (10 sample expenses)
  const expenseData = [
    { description: 'Office supplies purchase', amount: 150.00, vendorName: 'Office Depot', status: 'draft' },
    { description: 'Business lunch with client', amount: 85.50, vendorName: 'Restaurant ABC', status: 'submitted' },
    { description: 'Software license renewal', amount: 299.99, vendorName: 'TechCorp', status: 'approved' },
    { description: 'Travel to conference', amount: 450.00, vendorName: 'Airline XYZ', status: 'paid' },
    { description: 'Marketing materials', amount: 200.00, vendorName: 'PrintShop Pro', status: 'draft' },
    { description: 'Equipment maintenance', amount: 125.00, vendorName: 'Service Co', status: 'submitted' },
    { description: 'Training course fee', amount: 399.00, vendorName: 'EduTech', status: 'approved' },
    { description: 'Office furniture', amount: 750.00, vendorName: 'Furniture Plus', status: 'paid' },
    { description: 'Internet service', amount: 89.99, vendorName: 'ISP Provider', status: 'draft' },
    { description: 'Legal consultation', amount: 500.00, vendorName: 'Law Firm LLC', status: 'submitted' }
  ]

  for (const expense of expenseData) {
    const expenseDate = new Date()
    expenseDate.setDate(expenseDate.getDate() - Math.floor(Math.random() * 30))
    
    await prisma.expense.create({
      data: {
        tenantId,
        companyId,
        description: expense.description,
        amount: expense.amount,
        totalAmount: expense.amount, // Set totalAmount same as amount for now
        vendorName: expense.vendorName,
        status: expense.status as any,
        expenseDate,
        categoryId: pick(createdCategories),
        submittedAt: expense.status !== 'draft' ? new Date() : null,
        approvedAt: expense.status === 'approved' || expense.status === 'paid' ? new Date() : null,
        paidAt: expense.status === 'paid' ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  }

  console.log('✅ Expense seeding complete')
}

// Note: direct execution block removed for ESM compatibility. This module is invoked from main seed.


