import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type SeedOpts = { tenantId: string; companyId: string; budgets?: number }

// Comprehensive expense categories following professional accounting standards
const comprehensiveCategorySeeds = [
  { 
    name: 'Travel & Transportation',
    taxTreatment: 'deductible' as const,
    color: '#3B82F6',
    icon: '✈️',
    children: [
      'Airfare & Flights',
      'Hotels & Accommodations',
      'Meals & Entertainment',
      'Car Rentals',
      'Mileage Reimbursement',
      'Taxi & Rideshare',
      'Parking & Tolls',
      'Public Transportation',
      'Travel Insurance',
      'Baggage & Shipping'
    ]
  },
  { 
    name: 'Office & Facilities',
    taxTreatment: 'deductible' as const,
    color: '#8B5CF6',
    icon: '🏢',
    children: [
      'Office Rent',
      'Office Supplies',
      'Furniture & Fixtures',
      'Equipment & Machinery',
      'Office Maintenance',
      'Cleaning Services',
      'Security Services',
      'Utilities - Electricity',
      'Utilities - Water',
      'Utilities - Gas',
      'Internet & Phone',
      'Building Insurance',
      'Property Taxes'
    ]
  },
  { 
    name: 'Technology & Software',
    taxTreatment: 'deductible' as const,
    color: '#06B6D4',
    icon: '💻',
    children: [
      'Software Licenses',
      'SaaS Subscriptions',
      'Cloud Services (AWS/Azure/GCP)',
      'Domain & Hosting',
      'Computer Hardware',
      'Mobile Devices',
      'IT Equipment',
      'Software Development Tools',
      'Data Storage',
      'Cybersecurity Software',
      'Communication Tools',
      'Project Management Software',
      'CRM Software',
      'Accounting Software'
    ]
  },
  { 
    name: 'Professional Services',
    taxTreatment: 'deductible' as const,
    color: '#EF4444',
    icon: '⚖️',
    children: [
      'Legal Fees',
      'Accounting & Bookkeeping',
      'Consulting Services',
      'Audit Fees',
      'Tax Preparation',
      'Business Advisory',
      'Payroll Services',
      'HR Consulting',
      'Recruitment Fees',
      'Background Checks'
    ]
  },
  { 
    name: 'Marketing & Advertising',
    taxTreatment: 'deductible' as const,
    color: '#F59E0B',
    icon: '📢',
    children: [
      'Digital Advertising (Google/Facebook)',
      'Social Media Marketing',
      'Content Marketing',
      'SEO Services',
      'Print Advertising',
      'Trade Shows & Events',
      'Sponsorships',
      'Marketing Materials',
      'Brand Development',
      'Public Relations',
      'Email Marketing',
      'Video Production',
      'Photography',
      'Website Development'
    ]
  },
  { 
    name: 'Sales & Business Development',
    taxTreatment: 'deductible' as const,
    color: '#10B981',
    icon: '💼',
    children: [
      'Sales Commissions',
      'Client Entertainment',
      'Business Meals',
      'Sales Tools & CRM',
      'Lead Generation',
      'Sales Training',
      'Conference Fees',
      'Membership Dues',
      'Trade Subscriptions',
      'Networking Events'
    ]
  },
  { 
    name: 'Payroll & Employee Benefits',
    taxTreatment: 'deductible' as const,
    color: '#EC4899',
    icon: '👥',
    children: [
      'Salaries & Wages',
      'Payroll Taxes',
      'Health Insurance',
      'Dental Insurance',
      'Vision Insurance',
      'Life Insurance',
      'Disability Insurance',
      '401(k) Contributions',
      'Retirement Plans',
      'Employee Training',
      'Professional Development',
      'Team Building',
      'Employee Wellness',
      'Workers Compensation',
      'Unemployment Insurance',
      'Bonus & Incentives'
    ]
  },
  { 
    name: 'Banking & Financial',
    taxTreatment: 'deductible' as const,
    color: '#6366F1',
    icon: '🏦',
    children: [
      'Bank Fees',
      'Credit Card Fees',
      'Merchant Processing Fees',
      'Wire Transfer Fees',
      'Interest Expense',
      'Loan Fees',
      'Foreign Exchange Fees',
      'ATM Fees',
      'Overdraft Fees',
      'Safe Deposit Box'
    ]
  },
  { 
    name: 'Insurance',
    taxTreatment: 'deductible' as const,
    color: '#14B8A6',
    icon: '🛡️',
    children: [
      'General Liability Insurance',
      'Professional Liability (E&O)',
      'Property Insurance',
      'Business Auto Insurance',
      'Directors & Officers Insurance',
      'Cyber Liability Insurance',
      'Product Liability Insurance',
      'Commercial Umbrella',
      'Business Interruption Insurance'
    ]
  },
  { 
    name: 'Vehicles & Transportation',
    taxTreatment: 'deductible' as const,
    color: '#F97316',
    icon: '🚗',
    children: [
      'Vehicle Purchase',
      'Vehicle Lease',
      'Fuel & Gas',
      'Vehicle Maintenance',
      'Vehicle Insurance',
      'Vehicle Registration',
      'Parking',
      'Tolls',
      'Fleet Management'
    ]
  },
  { 
    name: 'Taxes & Licenses',
    taxTreatment: 'deductible' as const,
    color: '#A855F7',
    icon: '📋',
    children: [
      'Business Licenses',
      'Professional Licenses',
      'Permits & Certifications',
      'State Income Tax',
      'Sales Tax',
      'Property Tax',
      'Franchise Tax',
      'Local Business Tax'
    ]
  },
  { 
    name: 'Shipping & Delivery',
    taxTreatment: 'deductible' as const,
    color: '#22D3EE',
    icon: '📦',
    children: [
      'Shipping Costs',
      'Freight & Logistics',
      'Courier Services',
      'Postage & Stamps',
      'Packaging Materials',
      'Warehouse Fees',
      'Distribution Costs'
    ]
  },
  { 
    name: 'Research & Development',
    taxTreatment: 'deductible' as const,
    color: '#8B5CF6',
    icon: '🔬',
    children: [
      'R&D Personnel',
      'R&D Materials',
      'R&D Equipment',
      'Patents & Trademarks',
      'Product Testing',
      'Prototype Development',
      'Lab Equipment',
      'Research Software'
    ]
  },
  { 
    name: 'Inventory & Supplies',
    taxTreatment: 'deductible' as const,
    color: '#F59E0B',
    icon: '📦',
    children: [
      'Raw Materials',
      'Finished Goods',
      'Work in Progress',
      'Office Supplies',
      'Janitorial Supplies',
      'Safety Equipment',
      'Uniforms & Workwear',
      'Tools & Equipment'
    ]
  },
  { 
    name: 'Maintenance & Repairs',
    taxTreatment: 'deductible' as const,
    color: '#EF4444',
    icon: '🔧',
    children: [
      'Building Repairs',
      'Equipment Repairs',
      'HVAC Maintenance',
      'Plumbing Repairs',
      'Electrical Repairs',
      'Landscaping',
      'Pest Control',
      'General Maintenance'
    ]
  },
  { 
    name: 'Charitable & Donations',
    taxTreatment: 'deductible' as const,
    color: '#10B981',
    icon: '❤️',
    children: [
      'Charitable Contributions',
      'Community Sponsorships',
      'Nonprofit Donations',
      'Educational Donations',
      'Political Contributions'
    ]
  },
  { 
    name: 'Depreciation & Amortization',
    taxTreatment: 'deductible' as const,
    color: '#6B7280',
    icon: '📉',
    children: [
      'Equipment Depreciation',
      'Building Depreciation',
      'Vehicle Depreciation',
      'Furniture Depreciation',
      'Software Amortization',
      'Leasehold Improvements'
    ]
  },
  { 
    name: 'Meals & Entertainment',
    taxTreatment: 'partially_deductible' as const,
    color: '#FB923C',
    icon: '🍽️',
    children: [
      'Business Meals',
      'Client Entertainment',
      'Team Lunches',
      'Catering Services',
      'Office Snacks & Beverages',
      'Holiday Parties',
      'Company Events'
    ]
  },
  { 
    name: 'Training & Education',
    taxTreatment: 'deductible' as const,
    color: '#3B82F6',
    icon: '📚',
    children: [
      'Professional Courses',
      'Certifications',
      'Conferences & Seminars',
      'Books & Publications',
      'Online Learning',
      'Workshops',
      'Industry Training',
      'Leadership Development'
    ]
  },
  { 
    name: 'Communication & Connectivity',
    taxTreatment: 'deductible' as const,
    color: '#06B6D4',
    icon: '📱',
    children: [
      'Mobile Phone Plans',
      'Internet Service',
      'VoIP Services',
      'Video Conferencing',
      'Communication Apps',
      'Telephone Systems',
      'Long Distance Calls'
    ]
  },
  { 
    name: 'Bad Debts & Write-offs',
    taxTreatment: 'deductible' as const,
    color: '#DC2626',
    icon: '❌',
    children: [
      'Uncollectible Accounts',
      'Customer Bad Debt',
      'Inventory Write-offs',
      'Asset Impairment'
    ]
  },
  { 
    name: 'Miscellaneous Expenses',
    taxTreatment: 'deductible' as const,
    color: '#6B7280',
    icon: '📋',
    children: [
      'Bank Charges',
      'Credit Card Fees',
      'Small Tools',
      'Sundry Expenses',
      'Petty Cash',
      'Miscellaneous Fees',
      'Other Operating Expenses'
    ]
  }
]

export async function seedExpensesComprehensive({ tenantId, companyId, budgets = 30 }: SeedOpts) {
  console.log(`🌱 Seeding comprehensive expense categories for ${companyId}`)

  // Create comprehensive expense categories
  const createdCategories: string[] = []
  let totalCreated = 0

  for (const cat of comprehensiveCategorySeeds) {
    // Check if parent category exists
    let parent = await prisma.expenseCategory.findFirst({ 
      where: { tenantId, companyId, name: cat.name } 
    })
    
    if (!parent) {
      parent = await prisma.expenseCategory.create({ 
        data: { 
          tenantId, 
          companyId, 
          name: cat.name, 
          isActive: true, 
          taxTreatment: cat.taxTreatment,
          color: cat.color,
          icon: cat.icon,
          description: `${cat.name} related expenses`
        } as any 
      })
      totalCreated++
      console.log(`  ✓ Created parent category: ${cat.name}`)
    }
    
    createdCategories.push(parent.id)
    
    // Create child categories
    for (const child of cat.children) {
      const childName = `${cat.name} - ${child}`
      let c = await prisma.expenseCategory.findFirst({ 
        where: { tenantId, companyId, name: childName } 
      })
      
      if (!c) {
        c = await prisma.expenseCategory.create({ 
          data: { 
            tenantId, 
            companyId, 
            name: childName, 
            parentId: parent.id, 
            isActive: true, 
            taxTreatment: cat.taxTreatment,
            description: `${child} expenses under ${cat.name}`
          } as any 
        })
        totalCreated++
      }
      createdCategories.push(c.id)
    }
  }

  console.log(`  ✅ Created ${totalCreated} expense categories (${comprehensiveCategorySeeds.length} parent + children)`)

  // Create realistic budgets
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
  const periods = ['monthly', 'quarterly', 'yearly'] as const
  
  console.log(`\n💰 Creating ${budgets} budgets...`)
  
  for (let i = 0; i < budgets; i++) {
    const period = pick(periods as unknown as string[]) as any
    const start = new Date()
    start.setMonth(start.getMonth() - Math.floor(Math.random() * 3))
    
    const end = new Date(start)
    end.setMonth(start.getMonth() + (period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12))
    
    // More realistic budget amounts based on period
    const baseAmount = period === 'monthly' ? 2000 : period === 'quarterly' ? 6000 : 25000
    const amount = Number((baseAmount + Math.random() * baseAmount * 2).toFixed(2))
    const spent = Number((amount * (0.2 + Math.random() * 0.6)).toFixed(2)) // 20-80% spent
    
    const categoryId = pick(createdCategories)
    const category = await prisma.expenseCategory.findUnique({ where: { id: categoryId } })
    
    await prisma.budget.create({ 
      data: {
        tenantId, 
        companyId,
        name: `${category?.name || 'General'} Budget - ${period}`,
        description: `${period.charAt(0).toUpperCase() + period.slice(1)} budget for ${category?.name || 'expenses'}`,
        categoryId,
        period,
        startDate: start,
        endDate: end,
        amount,
        spentAmount: spent,
        isActive: true,
        alertThreshold: 80,
      }
    })
  }

  console.log(`  ✅ Created ${budgets} budgets`)

  // Create comprehensive expense rules
  console.log(`\n📋 Creating expense rules...`)
  
  const ruleDefs = [
    { 
      name: 'High Value Approval Required', 
      type: 'approval_required', 
      conditions: { amount_gt: 2500 }, 
      actions: { require_approval: true, notify_manager: true }, 
      priority: 1,
      description: 'All expenses over $2,500 require manager approval'
    },
    { 
      name: 'Travel Expense Approval', 
      type: 'approval_required', 
      conditions: { category: 'Travel' }, 
      actions: { require_approval: true }, 
      priority: 2,
      description: 'All travel expenses require pre-approval'
    },
    { 
      name: 'Meals Limit 50% Deductible', 
      type: 'amount_limit', 
      conditions: { category: 'Meals & Entertainment' }, 
      actions: { tax_deductible_percent: 50 }, 
      priority: 3,
      description: 'Meals and entertainment are 50% tax deductible'
    },
    { 
      name: 'Training Budget Limit', 
      type: 'amount_limit', 
      conditions: { amount_lte: 5000, category: 'Training' }, 
      actions: { allow: true }, 
      priority: 4,
      description: 'Training expenses up to $5,000 per employee per year'
    },
    { 
      name: 'Office Supplies Auto-Approve', 
      type: 'approval_required', 
      conditions: { amount_lte: 500, category: 'Office Supplies' }, 
      actions: { auto_approve: true }, 
      priority: 5,
      description: 'Office supplies under $500 are auto-approved'
    }
  ]
  
  for (const r of ruleDefs) {
    await prisma.expenseRule.create({ 
      data: {
        tenantId, 
        companyId,
        name: r.name,
        description: r.description,
        categoryId: pick(createdCategories),
        ruleType: r.type as any,
        conditions: JSON.stringify(r.conditions),
        actions: JSON.stringify(r.actions),
        isActive: true,
        priority: r.priority,
      }
    })
  }

  console.log(`  ✅ Created ${ruleDefs.length} expense rules`)

  // Create realistic sample expenses
  console.log(`\n📝 Creating sample expenses...`)
  
  const sampleExpenses = [
    { description: 'Microsoft 365 Business Premium - Annual License', amount: 149.99, vendorName: 'Microsoft', category: 'Technology & Software - SaaS Subscriptions', status: 'paid', taxRate: 0 },
    { description: 'AWS Cloud Services - Monthly Hosting', amount: 432.15, vendorName: 'Amazon Web Services', category: 'Technology & Software - Cloud Services (AWS/Azure/GCP)', status: 'paid', taxRate: 0 },
    { description: 'Office Rent - Downtown Location', amount: 3500.00, vendorName: 'Property Management Co', category: 'Office & Facilities - Office Rent', status: 'approved', taxRate: 0 },
    { description: 'Business Lunch with Potential Client', amount: 127.50, vendorName: 'The Steakhouse', category: 'Meals & Entertainment - Business Meals', status: 'submitted', taxRate: 8.5, isBillable: false },
    { description: 'Flight to Industry Conference - NYC', amount: 456.00, vendorName: 'United Airlines', category: 'Travel & Transportation - Airfare & Flights', status: 'approved', taxRate: 0, isBillable: true },
    { description: 'Google Ads Campaign - Q4 Marketing', amount: 2500.00, vendorName: 'Google LLC', category: 'Marketing & Advertising - Digital Advertising (Google/Facebook)', status: 'paid', taxRate: 0 },
    { description: 'Legal Consultation - Contract Review', amount: 850.00, vendorName: 'Smith & Associates Law', category: 'Professional Services - Legal Fees', status: 'paid', taxRate: 0 },
    { description: 'Office Supplies Bulk Order', amount: 287.43, vendorName: 'Office Depot', category: 'Office & Facilities - Office Supplies', status: 'draft', taxRate: 7.5 },
    { description: 'Employee Health Insurance Premium', amount: 1234.00, vendorName: 'Blue Cross Blue Shield', category: 'Payroll & Employee Benefits - Health Insurance', status: 'paid', taxRate: 0 },
    { description: 'Professional Development Course - Udemy', amount: 199.00, vendorName: 'Udemy', category: 'Training & Education - Online Learning', status: 'approved', taxRate: 0 },
    { description: 'Internet Service - Business Plan', amount: 129.99, vendorName: 'Comcast Business', category: 'Communication & Connectivity - Internet Service', status: 'paid', taxRate: 0 },
    { description: 'Mileage Reimbursement - Client Visits', amount: 67.20, vendorName: 'Employee Reimbursement', category: 'Travel & Transportation - Mileage Reimbursement', status: 'submitted', mileage: 120, mileageRate: 0.67 },
    { description: 'General Liability Insurance - Annual Premium', amount: 2400.00, vendorName: 'State Farm Business', category: 'Insurance - General Liability Insurance', status: 'paid', taxRate: 0 },
    { description: 'Salesforce CRM - Monthly Subscription', amount: 150.00, vendorName: 'Salesforce', category: 'Technology & Software - CRM Software', status: 'paid', taxRate: 0 },
    { description: 'Trade Show Booth Rental', amount: 1200.00, vendorName: 'Convention Center', category: 'Marketing & Advertising - Trade Shows & Events', status: 'approved', taxRate: 0 }
  ]

  for (const expense of sampleExpenses) {
    const expenseDate = new Date()
    expenseDate.setDate(expenseDate.getDate() - Math.floor(Math.random() * 60))
    
    // Find category by name
    const category = await prisma.expenseCategory.findFirst({
      where: { tenantId, companyId, name: { contains: expense.category } }
    })
    
    const taxAmount = expense.taxRate ? (expense.amount * expense.taxRate / 100) : 0
    const totalAmount = expense.amount + taxAmount
    
    await prisma.expense.create({
      data: {
        tenantId,
        companyId,
        description: expense.description,
        amount: expense.amount,
        totalAmount,
        vendorName: expense.vendorName,
        status: expense.status as any,
        expenseDate,
        categoryId: category?.id || createdCategories[0],
        taxRate: expense.taxRate,
        taxAmount,
        currency: 'USD',
        paymentMethod: expense.status === 'paid' ? 'credit_card' : undefined,
        isBillable: expense.isBillable || false,
        mileage: expense.mileage,
        mileageRate: expense.mileageRate,
        submittedAt: expense.status !== 'draft' ? new Date() : undefined,
        approvedAt: expense.status === 'approved' || expense.status === 'paid' ? new Date() : undefined,
        paidAt: expense.status === 'paid' ? new Date() : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  }

  console.log(`  ✅ Created ${sampleExpenses.length} sample expenses`)
  console.log(`\n✅ Comprehensive expense seeding complete!`)
  console.log(`\n📊 Summary:`)
  console.log(`   • ${comprehensiveCategorySeeds.length} parent categories`)
  console.log(`   • ${totalCreated} total categories (including subcategories)`)
  console.log(`   • ${budgets} budgets`)
  console.log(`   • ${ruleDefs.length} expense rules`)
  console.log(`   • ${sampleExpenses.length} sample expenses`)
}

// For direct execution
async function main() {
  const tenantId = 'demo-tenant'
  const companyId = process.argv[2] || 'demo-company'
  
  await seedExpensesComprehensive({ tenantId, companyId, budgets: 30 })
  await prisma.$disconnect()
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error seeding expenses:', error)
    process.exit(1)
  })
}

