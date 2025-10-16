import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedServices() {
  console.log('🛠️ Starting service-based business seeding...')
  
  try {
    // First, let's check existing companies
    const companies = await prisma.company.findMany()
    console.log(`Found ${companies.length} existing companies`)
    
    let companyId
    let tenantId = 'tenant-1'
    
    if (companies.length > 0) {
      companyId = companies[0].id
      tenantId = companies[0].tenantId || 'tenant-1'
      console.log(`Using existing company: ${companies[0].name} (${companyId})`)
    } else {
      // Create Company X - Service Provider
      console.log('Creating Company X - Service Provider...')
      const company = await prisma.company.create({
        data: {
          id: 'company-x-services',
          tenantId: tenantId,
          name: 'Company X Professional Services',
          email: 'services@companyx.com',
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      companyId = company.id
      console.log(`✅ Created Company X: ${company.name} (${companyId})`)
    }

    // 1. Create Service Categories
    console.log('Creating service categories...')
    const serviceCategories = [
      {
        id: `cat-consulting-${companyId}`,
        tenantId,
        companyId,
        name: 'Consulting Services',
        description: 'Professional consulting and advisory services',
        color: '#3B82F6',
        icon: 'briefcase'
      },
      {
        id: `cat-technical-${companyId}`,
        tenantId,
        companyId,
        name: 'Technical Services',
        description: 'IT and technical support services',
        color: '#10B981',
        icon: 'cpu'
      },
      {
        id: `cat-creative-${companyId}`,
        tenantId,
        companyId,
        name: 'Creative Services',
        description: 'Design, marketing, and creative services',
        color: '#F59E0B',
        icon: 'palette'
      },
      {
        id: `cat-maintenance-${companyId}`,
        tenantId,
        companyId,
        name: 'Maintenance & Support',
        description: 'Ongoing maintenance and support services',
        color: '#EF4444',
        icon: 'wrench'
      },
      {
        id: `cat-training-${companyId}`,
        tenantId,
        companyId,
        name: 'Training & Education',
        description: 'Professional training and educational services',
        color: '#8B5CF6',
        icon: 'graduation-cap'
      }
    ]

    for (const category of serviceCategories) {
      try {
        await prisma.category.create({ data: category })
      } catch (error) {
        if (error.code !== 'P2002') {
          console.log(`Warning: Could not create category ${category.name}: ${error.message}`)
        }
      }
    }
    console.log(`✅ Created/ensured ${serviceCategories.length} service categories`)

    // 2. Create Service Products (TYPE = 'SERVICE')
    console.log('Creating service offerings...')
    const services = [
      // Consulting Services
      {
        id: `srv-strategy-${companyId}`,
        tenantId,
        companyId,
        name: 'Business Strategy Consultation',
        sku: `CONS-STRAT-${companyId.slice(-6)}`,
        description: 'Comprehensive business strategy consulting session (2 hours)',
        unitPrice: 350.00,
        costPrice: 200.00,
        stockQuantity: 999999, // Services have unlimited "stock"
        categoryId: `cat-consulting-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      {
        id: `srv-project-mgmt-${companyId}`,
        tenantId,
        companyId,
        name: 'Project Management Service',
        sku: `CONS-PM-${companyId.slice(-6)}`,
        description: 'Monthly project management and coordination service',
        unitPrice: 2500.00,
        costPrice: 1500.00,
        stockQuantity: 999999,
        categoryId: `cat-consulting-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      
      // Technical Services
      {
        id: `srv-web-dev-${companyId}`,
        tenantId,
        companyId,
        name: 'Website Development',
        sku: `TECH-WEB-${companyId.slice(-6)}`,
        description: 'Custom website development project (per project)',
        unitPrice: 5000.00,
        costPrice: 3000.00,
        stockQuantity: 999999,
        categoryId: `cat-technical-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      {
        id: `srv-it-support-${companyId}`,
        tenantId,
        companyId,
        name: 'IT Support (Hourly)',
        sku: `TECH-SUP-${companyId.slice(-6)}`,
        description: 'Technical support and troubleshooting (per hour)',
        unitPrice: 125.00,
        costPrice: 75.00,
        stockQuantity: 999999,
        categoryId: `cat-technical-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      {
        id: `srv-system-audit-${companyId}`,
        tenantId,
        companyId,
        name: 'System Security Audit',
        sku: `TECH-AUD-${companyId.slice(-6)}`,
        description: 'Comprehensive security audit and assessment',
        unitPrice: 1500.00,
        costPrice: 900.00,
        stockQuantity: 999999,
        categoryId: `cat-technical-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      
      // Creative Services
      {
        id: `srv-logo-design-${companyId}`,
        tenantId,
        companyId,
        name: 'Logo Design Package',
        sku: `CREA-LOGO-${companyId.slice(-6)}`,
        description: 'Professional logo design with 3 concepts and revisions',
        unitPrice: 800.00,
        costPrice: 400.00,
        stockQuantity: 999999,
        categoryId: `cat-creative-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      {
        id: `srv-marketing-${companyId}`,
        tenantId,
        companyId,
        name: 'Digital Marketing Campaign',
        sku: `CREA-MARK-${companyId.slice(-6)}`,
        description: 'Monthly digital marketing campaign management',
        unitPrice: 1800.00,
        costPrice: 1000.00,
        stockQuantity: 999999,
        categoryId: `cat-creative-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      
      // Maintenance & Support
      {
        id: `srv-maint-contract-${companyId}`,
        tenantId,
        companyId,
        name: 'Annual Maintenance Contract',
        sku: `MAINT-ANN-${companyId.slice(-6)}`,
        description: 'Annual maintenance and support contract',
        unitPrice: 3600.00,
        costPrice: 2000.00,
        stockQuantity: 50, // Limited contracts available
        categoryId: `cat-maintenance-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      {
        id: `srv-emergency-${companyId}`,
        tenantId,
        companyId,
        name: 'Emergency Support Call',
        sku: `MAINT-EMER-${companyId.slice(-6)}`,
        description: 'After-hours emergency support (minimum 2 hours)',
        unitPrice: 300.00,
        costPrice: 150.00,
        stockQuantity: 999999,
        categoryId: `cat-maintenance-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      
      // Training Services
      {
        id: `srv-training-workshop-${companyId}`,
        tenantId,
        companyId,
        name: 'Professional Training Workshop',
        sku: `TRAIN-WORK-${companyId.slice(-6)}`,
        description: 'Full-day professional training workshop (up to 20 participants)',
        unitPrice: 2200.00,
        costPrice: 1200.00,
        stockQuantity: 10, // Limited workshop slots per month
        categoryId: `cat-training-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      {
        id: `srv-online-course-${companyId}`,
        tenantId,
        companyId,
        name: 'Online Course Access',
        sku: `TRAIN-ONLN-${companyId.slice(-6)}`,
        description: '6-month access to professional online course library',
        unitPrice: 450.00,
        costPrice: 200.00,
        stockQuantity: 999999,
        categoryId: `cat-training-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      
      // Limited Availability Services (for testing)
      {
        id: `srv-limited-${companyId}`,
        tenantId,
        companyId,
        name: 'Executive Coaching (VIP)',
        sku: `CONS-VIP-${companyId.slice(-6)}`,
        description: 'Exclusive one-on-one executive coaching session',
        unitPrice: 750.00,
        costPrice: 400.00,
        stockQuantity: 2, // Very limited availability
        categoryId: `cat-consulting-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      },
      {
        id: `srv-unavailable-${companyId}`,
        tenantId,
        companyId,
        name: 'Premium Audit Service',
        sku: `CONS-PREM-${companyId.slice(-6)}`,
        description: 'Comprehensive premium business audit (currently booked)',
        unitPrice: 5000.00,
        costPrice: 3000.00,
        stockQuantity: 0, // Currently unavailable
        categoryId: `cat-consulting-${companyId}`,
        type: 'SERVICE',
        status: 'ACTIVE'
      }
    ]

    for (const service of services) {
      try {
        await prisma.product.create({ data: service })
      } catch (error) {
        if (error.code !== 'P2002') {
          console.log(`Warning: Could not create service ${service.name}: ${error.message}`)
        }
      }
    }
    console.log(`✅ Created/ensured ${services.length} service offerings`)

    console.log('🎉 Service-based business seeding completed successfully!')
    console.log(`
📊 Company X Service Portfolio Summary:
=====================================
- Company: ${companyId}
- ${serviceCategories.length} service categories
- ${services.length} service offerings

🛠️ Service Categories Created:
- 💼 Consulting Services (Strategy, Project Management)
- 💻 Technical Services (Web Dev, IT Support, Security)
- 🎨 Creative Services (Design, Marketing)
- 🔧 Maintenance & Support (Contracts, Emergency)
- 🎓 Training & Education (Workshops, Online Courses)

💰 Service Price Ranges:
- Hourly Services: $125 - $350
- Project Services: $800 - $5,000
- Monthly Services: $1,800 - $2,500
- Annual Services: $3,600+

📋 Service "Stock" Scenarios:
- ♾️  Unlimited Services: Most consulting, technical, creative
- 🔢 Limited Slots: Training workshops (10), Maintenance contracts (50)
- ⚠️  Low Availability: VIP Coaching (2 slots)
- 🚫 Fully Booked: Premium Audit (0 availability)

🏪 Perfect for Service-Based POS Testing!
Ready at /dashboard/pos
    `)

  } catch (error) {
    console.error('❌ Error seeding services:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding
seedServices()
  .then(() => {
    console.log('✅ Service seeding completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Service seeding failed:', error)
    process.exit(1)
  })

export { seedServices }