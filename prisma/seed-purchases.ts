import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const vendorNames = [
  'Office Depot',
  'Staples',
  'Amazon Business',
  'Dell Technologies',
  'Microsoft',
  'Adobe',
  'Zoom Video Communications',
  'Slack Technologies',
  'Dropbox',
  'Salesforce',
  'HubSpot',
  'Mailchimp',
  'Canva',
  'Figma',
  'Notion',
  'Asana',
  'Trello',
  'Monday.com',
  'Zapier',
  'Stripe'
];

const productNames = [
  'Office Chair',
  'Desk Lamp',
  'Wireless Mouse',
  'Mechanical Keyboard',
  'Monitor Stand',
  'USB-C Hub',
  'Webcam',
  'Microphone',
  'Headphones',
  'Laptop Stand',
  'Cable Organizer',
  'Desk Mat',
  'Plant Pot',
  'Coffee Mug',
  'Water Bottle',
  'Notebook',
  'Pen Set',
  'Sticky Notes',
  'File Organizer',
  'Whiteboard'
];

const billNumbers = [
  'BILL-2024-001',
  'BILL-2024-002',
  'BILL-2024-003',
  'BILL-2024-004',
  'BILL-2024-005',
  'BILL-2024-006',
  'BILL-2024-007',
  'BILL-2024-008',
  'BILL-2024-009',
  'BILL-2024-010'
];

export async function seedPurchases() {
  console.log('🌱 Seeding purchase data...');

  // Get the demo company
  const company = await prisma.company.findFirst({
    where: { id: 'seed-company-1' }
  });

  if (!company) {
    console.log('❌ No demo company found. Please run the main seed first.');
    return;
  }

  // Create vendors
  console.log('📦 Creating vendors...');
  const vendors = [];
  for (let i = 0; i < vendorNames.length; i++) {
    // Check if vendor already exists
    let vendor = await prisma.vendor.findFirst({
      where: {
        tenantId: 'tenant_demo',
        companyId: company.id,
        name: vendorNames[i]
      }
    });

    if (!vendor) {
      vendor = await prisma.vendor.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: company.id,
          name: vendorNames[i],
          email: `${vendorNames[i].toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: `+1 (555) ${String(100 + i).padStart(3, '0')}-${String(1000 + i).padStart(4, '0')}`,
          taxNumber: `TAX-${String(100000 + i).padStart(6, '0')}`,
          address: `${100 + i} Business St, Suite ${i + 1}, New York, NY 10001`
        }
      });
      console.log(`✅ Created vendor: ${vendor.name}`);
    } else {
      console.log(`⏭️  Vendor already exists: ${vendor.name}`);
    }
    vendors.push(vendor);
  }

  // Create products
  console.log('📦 Creating products...');
  const products = [];
  for (let i = 0; i < productNames.length; i++) {
    const sku = `SKU-${String(1000 + i).padStart(4, '0')}`;
    
    // Check if product already exists
    let product = await prisma.product.findFirst({
      where: {
        tenantId: 'tenant_demo',
        companyId: company.id,
        sku: sku
      }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          tenantId: 'tenant_demo',
          companyId: company.id,
          name: productNames[i],
          sku: sku,
          description: `High-quality ${productNames[i].toLowerCase()} for professional use`,
          type: i < 15 ? 'inventory' : 'non-inventory',
          unitPrice: Math.round((Math.random() * 200 + 20) * 100) / 100,
          costPrice: Math.round((Math.random() * 150 + 15) * 100) / 100,
          stockQuantity: i < 15 ? Math.floor(Math.random() * 50) + 10 : 0
        }
      });
      console.log(`✅ Created product: ${product.name}`);
    } else {
      console.log(`⏭️  Product already exists: ${product.name}`);
    }
    products.push(product);
  }

  // Create bills
  console.log('📦 Creating bills...');
  for (let i = 0; i < billNumbers.length; i++) {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const billDate = new Date();
    billDate.setDate(billDate.getDate() - Math.floor(Math.random() * 30));
    
    const dueDate = new Date(billDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const purchaseType = Math.random() > 0.7 ? 'import' : 'local';
    const freightCost = purchaseType === 'import' ? Math.round((Math.random() * 50 + 10) * 100) / 100 : 0;
    const customsDuty = purchaseType === 'import' ? Math.round((Math.random() * 30 + 5) * 100) / 100 : 0;

    const bill = await prisma.bill.create({
      data: {
        tenantId: 'tenant_demo',
        companyId: company.id,
        vendorId: vendor.id,
        billNumber: billNumbers[i],
        billDate: billDate,
        dueDate: dueDate,
        status: ['draft', 'posted', 'paid'][Math.floor(Math.random() * 3)] as any,
        purchaseType: purchaseType as any,
        vendorCurrency: purchaseType === 'import' ? 'EUR' : 'USD',
        exchangeRate: purchaseType === 'import' ? 1.1 : 1,
        freightCost: freightCost,
        customsDuty: customsDuty,
        otherImportCosts: purchaseType === 'import' ? Math.round((Math.random() * 20 + 5) * 100) / 100 : 0,
        totalAmount: 0, // Will be calculated after lines
        balanceDue: 0 // Will be calculated after lines
      }
    });

    // Create bill lines
    const numLines = Math.floor(Math.random() * 3) + 1;
    let totalAmount = 0;

    for (let j = 0; j < numLines; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const unitPrice = product.unitPrice;
      const taxRate = Math.round((Math.random() * 10) * 100) / 100;
      const lineTotal = Math.round((quantity * unitPrice * (1 + taxRate / 100)) * 100) / 100;
      totalAmount += lineTotal;

      await prisma.billLine.create({
        data: {
          tenantId: 'tenant_demo',
          billId: bill.id,
          productId: product.id,
          description: product.description || product.name,
          quantity: quantity,
          unitPrice: unitPrice,
          taxRate: taxRate,
          lineTotal: lineTotal
        }
      });
    }

    // Add landed costs to total
    totalAmount += freightCost + customsDuty;

    // Update bill with calculated totals
    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        totalAmount: totalAmount,
        balanceDue: bill.status === 'paid' ? 0 : totalAmount
      }
    });

    console.log(`✅ Created bill: ${bill.billNumber} - $${totalAmount.toFixed(2)}`);
  }

  console.log('🎉 Purchase data seeding completed!');
}

// Run the seed function if this file is executed directly
seedPurchases()
  .catch((e) => {
    console.error('❌ Error seeding purchase data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
