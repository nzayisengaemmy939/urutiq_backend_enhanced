// Company Seed Data Script
// This script creates a new company with basic accounting data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSeedCompany(tenantId, companyName = 'My Business') {
  console.log(`🌱 Creating seed company: ${companyName}`);
  
  try {
    // 1. Create the company
    const company = await prisma.company.create({
      data: {
        tenantId,
        name: companyName,
        industry: 'Technology',
        country: 'US',
        currency: 'USD',
        fiscalYearStart: '01-01',
        email: 'admin@mybusiness.com',
        phone: '+1-555-0123',
        website: 'https://mybusiness.com',
        address: '123 Business St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        status: 'active'
      }
    });
    
    console.log(`✅ Company created: ${company.id}`);
    
    // 2. Create basic chart of accounts
    const accounts = [
      // Assets
      { name: 'Cash', type: 'ASSET', code: '1000', balance: 10000 },
      { name: 'Accounts Receivable', type: 'ASSET', code: '1100', balance: 0 },
      { name: 'Inventory', type: 'ASSET', code: '1200', balance: 0 },
      { name: 'Equipment', type: 'ASSET', code: '1500', balance: 5000 },
      
      // Liabilities
      { name: 'Accounts Payable', type: 'LIABILITY', code: '2000', balance: 0 },
      { name: 'Accrued Expenses', type: 'LIABILITY', code: '2100', balance: 0 },
      
      // Equity
      { name: 'Owner\'s Equity', type: 'EQUITY', code: '3000', balance: 15000 },
      { name: 'Retained Earnings', type: 'EQUITY', code: '3100', balance: 0 },
      
      // Revenue
      { name: 'Sales Revenue', type: 'REVENUE', code: '4000', balance: 0 },
      { name: 'Service Revenue', type: 'REVENUE', code: '4100', balance: 0 },
      
      // Expenses
      { name: 'Cost of Goods Sold', type: 'EXPENSE', code: '5000', balance: 0 },
      { name: 'Office Supplies', type: 'EXPENSE', code: '5100', balance: 0 },
      { name: 'Rent Expense', type: 'EXPENSE', code: '5200', balance: 0 },
      { name: 'Utilities', type: 'EXPENSE', code: '5300', balance: 0 }
    ];
    
    console.log('📊 Creating chart of accounts...');
    const createdAccounts = [];
    
    for (const accountData of accounts) {
      const account = await prisma.account.create({
        data: {
          tenantId,
          companyId: company.id,
          name: accountData.name,
          type: accountData.type,
          code: accountData.code,
          isActive: true,
          description: `${accountData.type} account for ${accountData.name.toLowerCase()}`
        }
      });
      createdAccounts.push(account);
    }
    
    console.log(`✅ Created ${createdAccounts.length} accounts`);
    
    // 3. Create sample customers
    const customers = [
      {
        name: 'ABC Corporation',
        email: 'contact@abccorp.com',
        phone: '+1-555-1001',
        address: '456 Corporate Ave',
        city: 'Boston',
        state: 'MA',
        postalCode: '02101',
        country: 'US'
      },
      {
        name: 'XYZ Industries',
        email: 'info@xyzindustries.com',
        phone: '+1-555-1002',
        address: '789 Industrial Blvd',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'US'
      },
      {
        name: 'Tech Solutions Inc',
        email: 'sales@techsolutions.com',
        phone: '+1-555-1003',
        address: '321 Tech Park',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94101',
        country: 'US'
      }
    ];
    
    console.log('👥 Creating sample customers...');
    const createdCustomers = [];
    
    for (const customerData of customers) {
      const customer = await prisma.customer.create({
        data: {
          tenantId,
          companyId: company.id,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          city: customerData.city,
          state: customerData.state,
          postalCode: customerData.postalCode,
          country: customerData.country,
          status: 'active'
        }
      });
      createdCustomers.push(customer);
    }
    
    console.log(`✅ Created ${createdCustomers.length} customers`);
    
    // 4. Create sample vendors
    const vendors = [
      {
        name: 'Office Supply Co',
        email: 'orders@officesupply.com',
        phone: '+1-555-2001',
        address: '100 Supply St',
        city: 'Atlanta',
        state: 'GA',
        postalCode: '30301',
        country: 'US'
      },
      {
        name: 'Equipment Rentals LLC',
        email: 'rentals@equipment.com',
        phone: '+1-555-2002',
        address: '200 Rental Ave',
        city: 'Dallas',
        state: 'TX',
        postalCode: '75201',
        country: 'US'
      }
    ];
    
    console.log('🏢 Creating sample vendors...');
    const createdVendors = [];
    
    for (const vendorData of vendors) {
      const vendor = await prisma.vendor.create({
        data: {
          tenantId,
          companyId: company.id,
          name: vendorData.name,
          email: vendorData.email,
          phone: vendorData.phone,
          address: vendorData.address,
          city: vendorData.city,
          state: vendorData.state,
          postalCode: vendorData.postalCode,
          country: vendorData.country,
          status: 'active'
        }
      });
      createdVendors.push(vendor);
    }
    
    console.log(`✅ Created ${createdVendors.length} vendors`);
    
    // 5. Create sample products/services
    const products = [
      {
        name: 'Consulting Services',
        description: 'Professional consulting services',
        type: 'SERVICE',
        price: 150.00,
        cost: 0.00,
        sku: 'CONS-001'
      },
      {
        name: 'Software License',
        description: 'Annual software license',
        type: 'PRODUCT',
        price: 500.00,
        cost: 200.00,
        sku: 'SOFT-001'
      },
      {
        name: 'Training Package',
        description: 'Employee training package',
        type: 'SERVICE',
        price: 300.00,
        cost: 50.00,
        sku: 'TRAIN-001'
      }
    ];
    
    console.log('📦 Creating sample products...');
    const createdProducts = [];
    
    for (const productData of products) {
      const product = await prisma.product.create({
        data: {
          tenantId,
          companyId: company.id,
          name: productData.name,
          description: productData.description,
          type: productData.type,
          price: productData.price,
          cost: productData.cost,
          sku: productData.sku,
          status: 'ACTIVE'
        }
      });
      createdProducts.push(product);
    }
    
    console.log(`✅ Created ${createdProducts.length} products`);
    
    // 6. Create sample journal entries
    console.log('📝 Creating sample journal entries...');
    
    // Initial investment entry
    const cashAccount = createdAccounts.find(acc => acc.name === 'Cash');
    const equityAccount = createdAccounts.find(acc => acc.name === 'Owner\'s Equity');
    
    if (cashAccount && equityAccount) {
      const journalEntry = await prisma.journalEntry.create({
        data: {
          tenantId,
          companyId: company.id,
          date: new Date(),
          memo: 'Initial investment',
          reference: 'INV-001',
          status: 'POSTED'
        }
      });
      
      // Create journal lines
      await prisma.journalLine.createMany({
        data: [
          {
            tenantId,
            entryId: journalEntry.id,
            accountId: cashAccount.id,
            debit: 10000,
            credit: 0,
            memo: 'Initial cash investment'
          },
          {
            tenantId,
            entryId: journalEntry.id,
            accountId: equityAccount.id,
            debit: 0,
            credit: 10000,
            memo: 'Owner equity increase'
          }
        ]
      });
      
      console.log('✅ Created initial investment journal entry');
    }
    
    // 7. Create company settings
    const settings = [
      { key: 'companyName', value: companyName },
      { key: 'industry', value: 'Technology' },
      { key: 'foundedYear', value: '2024' },
      { key: 'employees', value: '5' },
      { key: 'businessType', value: 'LLC' },
      { key: 'timezone', value: 'America/New_York' },
      { key: 'enableInventoryTracking', value: 'true' },
      { key: 'enableTaxCalculation', value: 'true' },
      { key: 'autoBackup', value: 'true' }
    ];
    
    console.log('⚙️ Creating company settings...');
    
    for (const setting of settings) {
      await prisma.companySetting.create({
        data: {
          tenantId,
          companyId: company.id,
          key: setting.key,
          value: setting.value
        }
      });
    }
    
    console.log(`✅ Created ${settings.length} company settings`);
    
    // 8. Log the seed action
    await prisma.aiAuditTrail.create({
      data: {
        tenantId,
        companyId: company.id,
        action: `Company ${companyName} seeded with initial data`,
        aiValidationResult: JSON.stringify({
          seededAt: new Date().toISOString(),
          accountsCreated: createdAccounts.length,
          customersCreated: createdCustomers.length,
          vendorsCreated: createdVendors.length,
          productsCreated: createdProducts.length
        })
      }
    });
    
    console.log('\n🎉 Seed data creation completed successfully!');
    console.log(`\n📋 Summary:`);
    console.log(`- Company: ${company.name} (${company.id})`);
    console.log(`- Accounts: ${createdAccounts.length}`);
    console.log(`- Customers: ${createdCustomers.length}`);
    console.log(`- Vendors: ${createdVendors.length}`);
    console.log(`- Products: ${createdProducts.length}`);
    console.log(`- Settings: ${settings.length}`);
    
    return {
      company,
      accounts: createdAccounts,
      customers: createdCustomers,
      vendors: createdVendors,
      products: createdProducts
    };
    
  } catch (error) {
    console.error('❌ Error creating seed data:', error);
    throw error;
  }
}

// Main function
async function main() {
  const tenantId = process.argv[2];
  const companyName = process.argv[3] || 'My Business';
  
  if (!tenantId) {
    console.log('Usage: node seed-company.js <tenantId> [companyName]');
    console.log('Example: node seed-company.js your-tenant-id "Acme Corporation"');
    process.exit(1);
  }
  
  console.log(`🚀 Starting seed data creation...`);
  console.log(`🏢 Tenant: ${tenantId}`);
  console.log(`🏭 Company: ${companyName}`);
  
  await createSeedCompany(tenantId, companyName);
  
  await prisma.$disconnect();
  console.log('\n✅ Seed data creation completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

export { createSeedCompany };
