import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const TENANT_ID = 'tenant_demo';
const COMPANY_ID = 'seed-company-2';

// Sample data arrays
const VENDOR_TYPES = [
  'Office Supplies', 'Technology', 'Manufacturing', 'Logistics', 'Marketing', 
  'Professional Services', 'Equipment', 'Software', 'Consulting', 'Maintenance'
];

const PRODUCT_CATEGORIES = [
  'Office Equipment', 'Computer Hardware', 'Software Licenses', 'Office Supplies',
  'Manufacturing Materials', 'Marketing Materials', 'Professional Services',
  'Equipment Maintenance', 'Raw Materials', 'Packaging Materials'
];

const INCOTERMS = ['FOB', 'CIF', 'DDP', 'EXW', 'FAS', 'CFR', 'CPT', 'CIP'];
const SHIPPING_METHODS = ['sea', 'air', 'land', 'courier'];
const CARRIERS = ['Maersk', 'MSC', 'CMA CGM', 'COSCO', 'FedEx', 'DHL', 'UPS', 'TNT'];
const CUSTOMS_BROKERS = ['DHL Global Forwarding', 'Kuehne+Nagel', 'DB Schenker', 'Expeditors', 'Panalpina'];

const COUNTRIES = {
  'US': 'United States',
  'CN': 'China', 
  'DE': 'Germany',
  'JP': 'Japan',
  'GB': 'United Kingdom',
  'FR': 'France',
  'IT': 'Italy',
  'CA': 'Canada',
  'MX': 'Mexico',
  'IN': 'India'
};

const PORTS = {
  'US': ['LAX', 'NYC', 'SFO', 'SEA', 'MIA', 'CHI', 'BOS'],
  'CN': ['SHA', 'SZX', 'NGB', 'QIN', 'TSN'],
  'DE': ['HAM', 'BRE', 'DUS'],
  'JP': ['NRT', 'KIX', 'YOK'],
  'GB': ['LON', 'MAN', 'LIV'],
  'FR': ['PAR', 'MAR', 'LYO'],
  'IT': ['ROM', 'MIL', 'NAP'],
  'CA': ['TOR', 'VAN', 'MON'],
  'MX': ['MEX', 'GDL', 'TIJ'],
  'IN': ['BOM', 'DEL', 'BLR', 'MAA']
};

// Utility functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePONumber(index) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const sequence = String(index + 1).padStart(4, '0');
  return `PO-${year}${month}-${sequence}`;
}

function generateReceiptNumber(poNumber) {
  return `RC-${poNumber}`;
}

function generateShipmentNumber(poNumber) {
  return `SHP-${poNumber}`;
}

function generateTrackingNumber() {
  return `TRK-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
}

function generateContainerNumber() {
  return `CONT-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
}

// Main seeding functions
async function ensureCompany() {
  console.log('🏢 Ensuring company exists...');
  
  const company = await prisma.company.findFirst({
    where: { id: COMPANY_ID, tenantId: TENANT_ID }
  });

  if (!company) {
    await prisma.company.create({
      data: {
        id: COMPANY_ID,
        tenantId: TENANT_ID,
        name: 'Acme Trading Co',
        industry: 'Manufacturing',
        country: 'US',
        currency: 'USD',
        website: 'https://acmetrading.com',
        email: 'info@acmetrading.com',
        phone: '+1-555-0123',
        address: '123 Business Ave, Suite 100',
        city: 'New York',
        state: 'NY',
        postalCode: '10001'
      }
    });
    console.log('✅ Company created');
  } else {
    console.log('✅ Company already exists');
  }
}

async function seedVendors(count = 15) {
  console.log(`🏭 Seeding ${count} vendors...`);
  
  const vendors = [];
  for (let i = 0; i < count; i++) {
    const vendorType = randomChoice(VENDOR_TYPES);
    const companyName = `${vendorType} ${randomChoice(['Corp', 'Inc', 'Ltd', 'Co', 'LLC', 'Group'])}`;
    
    vendors.push({
      name: companyName,
      email: `contact@${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: `+1-555-${String(randomInt(1000, 9999))}`,
      address: `${randomInt(100, 9999)} ${randomChoice(['Main', 'Oak', 'Pine', 'Cedar', 'Elm'])} St, ${randomChoice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'])}, ${randomChoice(['NY', 'CA', 'IL', 'TX', 'AZ', 'PA'])} ${randomInt(10000, 99999)}`,
      taxNumber: `TAX-${String(randomInt(100000, 999999))}`,
      isActive: true
    });
  }

  let createdCount = 0;
  for (const vendorData of vendors) {
    try {
      const existing = await prisma.vendor.findFirst({
        where: { tenantId: TENANT_ID, companyId: COMPANY_ID, name: vendorData.name }
      });

      if (!existing) {
        await prisma.vendor.create({
          data: {
            tenantId: TENANT_ID,
            companyId: COMPANY_ID,
            ...vendorData
          }
        });
        createdCount++;
        console.log(`✅ Created vendor: ${vendorData.name}`);
      } else {
        console.log(`⏭️  Vendor already exists: ${vendorData.name}`);
      }
    } catch (error) {
      console.log(`❌ Error creating vendor ${vendorData.name}:`, error.message);
    }
  }

  console.log(`📊 Created ${createdCount} new vendors`);
  return createdCount;
}

async function seedProducts(count = 50) {
  console.log(`📦 Seeding ${count} products...`);
  
  // First ensure we have categories
  const categories = [];
  for (const catName of PRODUCT_CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { tenantId_companyId_name: { tenantId: TENANT_ID, companyId: COMPANY_ID, name: catName } },
      update: {},
      create: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        name: catName,
        description: `${catName} category`,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        icon: 'package'
      }
    });
    categories.push(category);
  }

  const products = [];
  for (let i = 0; i < count; i++) {
    const category = randomChoice(categories);
    const productName = `${randomChoice(['Professional', 'Premium', 'Standard', 'Deluxe', 'Basic'])} ${category.name} ${randomInt(1, 999)}`;
    
    products.push({
      name: productName,
      sku: `SKU-${String(randomInt(100000, 999999))}`,
      description: `High-quality ${category.name.toLowerCase()} for professional use`,
      shortDescription: `Professional ${category.name.toLowerCase()}`,
      type: randomChoice(['PRODUCT', 'SERVICE', 'DIGITAL']),
      unitPrice: Number(randomBetween(10, 1000).toFixed(2)),
      costPrice: Number(randomBetween(5, 500).toFixed(2)),
      stockQuantity: randomInt(0, 1000),
      minStockLevel: randomInt(5, 50),
      maxStockLevel: randomInt(100, 1000),
      reorderPoint: randomInt(10, 100),
      reorderQuantity: randomInt(20, 200),
      categoryId: category.id,
      brand: randomChoice(['Acme', 'ProBrand', 'Elite', 'Standard', 'Premium']),
      model: `Model-${String(randomInt(1000, 9999))}`,
      weight: Number(randomBetween(0.1, 50).toFixed(2)),
      dimensionsLength: Number(randomBetween(1, 100).toFixed(2)),
      dimensionsWidth: Number(randomBetween(1, 100).toFixed(2)),
      dimensionsHeight: Number(randomBetween(1, 100).toFixed(2)),
      barcode: `${randomInt(1000000000000, 9999999999999)}`,
      taxRate: Number(randomBetween(0, 25).toFixed(2)),
      trackSerialNumbers: Math.random() < 0.3,
      trackBatches: Math.random() < 0.2,
      costingMethod: randomChoice(['FIFO', 'LIFO', 'WEIGHTED_AVERAGE'])
    });
  }

  let createdCount = 0;
  for (const productData of products) {
    try {
      const existing = await prisma.product.findFirst({
        where: { tenantId: TENANT_ID, companyId: COMPANY_ID, sku: productData.sku }
      });

      if (!existing) {
        await prisma.product.create({
          data: {
            tenantId: TENANT_ID,
            companyId: COMPANY_ID,
            ...productData
          }
        });
        createdCount++;
        console.log(`✅ Created product: ${productData.name}`);
      } else {
        console.log(`⏭️  Product already exists: ${productData.name}`);
      }
    } catch (error) {
      console.log(`❌ Error creating product ${productData.name}:`, error.message);
    }
  }

  console.log(`📊 Created ${createdCount} new products`);
  return createdCount;
}

async function seedPurchaseOrders(count = 25) {
  console.log(`📋 Seeding ${count} purchase orders...`);
  
  const vendors = await prisma.vendor.findMany({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID } });
  const products = await prisma.product.findMany({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID } });

  if (vendors.length === 0 || products.length === 0) {
    console.log('❌ No vendors or products found. Please run vendor and product seeding first.');
    return 0;
  }

  let createdCount = 0;
  for (let i = 0; i < count; i++) {
    try {
      const vendor = randomChoice(vendors);
      const purchaseType = randomChoice(['local', 'import']);
      const poNumber = generatePONumber(i);
      
      // Check if PO already exists
      const existing = await prisma.purchaseOrder.findFirst({
        where: { tenantId: TENANT_ID, companyId: COMPANY_ID, poNumber }
      });

      if (existing) {
        console.log(`⏭️  PO already exists: ${poNumber}`);
        continue;
      }

      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - randomInt(0, 180));
      
      const expectedDelivery = new Date(orderDate);
      expectedDelivery.setDate(orderDate.getDate() + randomInt(7, 45));

      // Create PO lines (1-5 lines)
      const numLines = randomInt(1, 5);
      const lineInputs = [];
      for (let j = 0; j < numLines; j++) {
        const product = randomChoice(products);
        lineInputs.push({
          productId: product.id,
          description: product.name,
          quantity: randomInt(1, 20),
          unitPrice: Number(randomBetween(10, 500).toFixed(2)),
          taxRate: Number(randomBetween(0, 25).toFixed(2))
        });
      }

      const baseTotal = lineInputs.reduce((sum, line) => 
        sum + line.quantity * line.unitPrice * (1 + line.taxRate / 100), 0
      );

      const freightCost = purchaseType === 'import' ? Number(randomBetween(50, 1000).toFixed(2)) : 0;
      const customsDuty = purchaseType === 'import' ? Number(randomBetween(30, 500).toFixed(2)) : 0;
      const otherImportCosts = purchaseType === 'import' ? Number(randomBetween(10, 200).toFixed(2)) : 0;
      const totalAmount = Number((baseTotal + freightCost + customsDuty + otherImportCosts).toFixed(2));

      const status = randomChoice(['draft', 'sent', 'approved', 'received', 'closed']);
      const receivingStatus = status === 'received' || status === 'closed' ? 'complete' : 
                             status === 'approved' ? 'partial' : 'pending';

      const originCountry = purchaseType === 'import' ? randomChoice(Object.keys(COUNTRIES)) : 'US';
      const destinationCountry = 'US';
      const portOfEntry = purchaseType === 'import' ? randomChoice(PORTS[destinationCountry] || PORTS['US']) : null;

      const po = await prisma.purchaseOrder.create({
        data: {
          tenantId: TENANT_ID,
          companyId: COMPANY_ID,
          vendorId: vendor.id,
          poNumber,
          orderDate,
          expectedDelivery,
          status,
          receivingStatus,
          totalAmount,
          currency: 'USD',
          notes: purchaseType === 'import' ? 
            `Import purchase with landed costs. Origin: ${COUNTRIES[originCountry]}` : 
            'Local purchase order',
          terms: randomChoice(['Net 15', 'Net 30', 'Net 45', 'Net 60']),
          purchaseType,
          vendorCurrency: purchaseType === 'import' ? randomChoice(['EUR', 'CNY', 'JPY']) : 'USD',
          exchangeRate: purchaseType === 'import' ? Number(randomBetween(0.8, 1.5).toFixed(4)) : 1,
          freightCost,
          customsDuty,
          otherImportCosts,
          landedCostAllocated: purchaseType === 'import' && Math.random() < 0.7,
          incoterms: purchaseType === 'import' ? randomChoice(INCOTERMS) : null,
          shippingMethod: purchaseType === 'import' ? randomChoice(SHIPPING_METHODS) : null,
          originCountry,
          destinationCountry,
          portOfEntry,
          importLicense: purchaseType === 'import' ? `LIC-${randomInt(100000, 999999)}` : null,
          customsDeclaration: purchaseType === 'import' ? `CD-${randomInt(100000, 999999)}` : null,
          billOfLading: purchaseType === 'import' ? `BOL-${randomInt(100000, 999999)}` : null,
          commercialInvoice: purchaseType === 'import' ? `CI-${randomInt(100000, 999999)}` : null,
          packingList: purchaseType === 'import' ? `PL-${randomInt(100000, 999999)}` : null
        }
      });

      // Create PO lines
      for (const lineInput of lineInputs) {
        await prisma.purchaseOrderLine.create({
          data: {
            tenantId: TENANT_ID,
            purchaseOrderId: po.id,
            productId: lineInput.productId,
            description: lineInput.description,
            quantity: lineInput.quantity,
            unitPrice: lineInput.unitPrice,
            taxRate: lineInput.taxRate,
            lineTotal: Number((lineInput.quantity * lineInput.unitPrice * (1 + lineInput.taxRate / 100)).toFixed(2))
          }
        });
      }

      // Create receipt for 70% of POs
      if (Math.random() < 0.7) {
        const receiptDate = new Date(expectedDelivery);
        receiptDate.setDate(receiptDate.getDate() + randomInt(-5, 10));
        
        const receipt = await prisma.receipt.create({
          data: {
            tenantId: TENANT_ID,
            purchaseOrderId: po.id,
            receiptNumber: generateReceiptNumber(poNumber),
            receivedDate: receiptDate,
            partialReceipt: Math.random() < 0.3,
            notes: 'Auto-generated receipt',
            receivedBy: 'System'
          }
        });

        // Create receipt items
        const poLines = await prisma.purchaseOrderLine.findMany({
          where: { tenantId: TENANT_ID, purchaseOrderId: po.id }
        });

        for (const line of poLines) {
          const qtyReceived = Math.max(0, Math.min(line.quantity, 
            Math.floor(line.quantity * (line.quantity > 1 ? randomBetween(0.7, 1.0) : 1))
          ));
          
          await prisma.receiptItem.create({
            data: {
              tenantId: TENANT_ID,
              receiptId: receipt.id,
              purchaseOrderLineId: line.id,
              productId: line.productId,
              description: line.description,
              quantityReceived: qtyReceived,
              quantityAccepted: qtyReceived,
              quantityRejected: 0,
              condition: 'Good',
              notes: 'Received in good condition'
            }
          });
        }
      }

      // Create import shipment for import POs (80% of them)
      if (purchaseType === 'import' && Math.random() < 0.8) {
        const shipmentDate = new Date(orderDate);
        shipmentDate.setDate(shipmentDate.getDate() + randomInt(1, 7));
        
        const shipment = await prisma.importShipment.create({
          data: {
            tenantId: TENANT_ID,
            companyId: COMPANY_ID,
            purchaseOrderId: po.id,
            shipmentNumber: generateShipmentNumber(poNumber),
            shipmentDate,
            expectedArrival: expectedDelivery,
            actualArrival: Math.random() < 0.6 ? new Date(expectedDelivery.getTime() + randomInt(-2, 5) * 24 * 60 * 60 * 1000) : null,
            status: randomChoice(['pending', 'in_transit', 'arrived', 'cleared', 'delivered']),
            carrier: randomChoice(CARRIERS),
            trackingNumber: generateTrackingNumber(),
            containerNumber: generateContainerNumber(),
            vesselFlight: `VSL-${randomInt(100, 999)}`,
            customsBroker: randomChoice(CUSTOMS_BROKERS),
            dutiesPaid: customsDuty,
            taxesPaid: Number(randomBetween(0, 200).toFixed(2)),
            freightCost,
            insuranceCost: Number(randomBetween(10, 150).toFixed(2)),
            customsFees: Number(randomBetween(5, 100).toFixed(2)),
            storageCost: Number(randomBetween(0, 80).toFixed(2)),
            otherCosts: otherImportCosts,
            totalLandedCost: Number((freightCost + customsDuty + otherImportCosts).toFixed(2)),
            notes: `Import shipment from ${COUNTRIES[originCountry]} via ${randomChoice(SHIPPING_METHODS)}`
          }
        });

        // Create customs events
        const events = [
          {
            eventType: 'shipment_created',
            eventDate: shipmentDate,
            description: 'Shipment created and booked',
            status: 'completed'
          },
          {
            eventType: 'customs_entry',
            eventDate: new Date(shipmentDate.getTime() + randomInt(2, 7) * 24 * 60 * 60 * 1000),
            description: 'Customs entry filed',
            status: 'completed'
          }
        ];

        if (shipment.status === 'in_transit' || shipment.status === 'arrived' || shipment.status === 'cleared' || shipment.status === 'delivered') {
          events.push({
            eventType: 'departed_origin',
            eventDate: new Date(shipmentDate.getTime() + randomInt(1, 3) * 24 * 60 * 60 * 1000),
            description: 'Shipment departed origin port',
            status: 'completed'
          });
        }

        if (shipment.status === 'arrived' || shipment.status === 'cleared' || shipment.status === 'delivered') {
          events.push({
            eventType: 'arrived_destination',
            eventDate: shipment.actualArrival || expectedDelivery,
            description: 'Shipment arrived at destination port',
            status: 'completed'
          });
        }

        if (shipment.status === 'cleared' || shipment.status === 'delivered') {
          events.push({
            eventType: 'customs_cleared',
            eventDate: new Date((shipment.actualArrival || expectedDelivery).getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000),
            description: 'Customs clearance completed',
            status: 'completed'
          });
        }

        if (shipment.status === 'delivered') {
          events.push({
            eventType: 'delivered',
            eventDate: new Date((shipment.actualArrival || expectedDelivery).getTime() + randomInt(1, 3) * 24 * 60 * 60 * 1000),
            description: 'Shipment delivered to final destination',
            status: 'completed'
          });
        }

        for (const event of events) {
          await prisma.customsEvent.create({
            data: {
              tenantId: TENANT_ID,
              importShipmentId: shipment.id,
              ...event
            }
          });
        }
      }

      createdCount++;
      console.log(`✅ Created PO: ${poNumber} (${purchaseType}) - $${totalAmount.toFixed(2)}`);

    } catch (error) {
      console.log(`❌ Error creating PO ${i + 1}:`, error.message);
    }
  }

  console.log(`📊 Created ${createdCount} purchase orders`);
  return createdCount;
}

async function seedExpenseCategories() {
  console.log('📂 Seeding expense categories...');
  
  const categories = [
    { name: 'Office Supplies', description: 'General office supplies and stationery', color: '#3B82F6', icon: 'folder' },
    { name: 'Travel & Entertainment', description: 'Business travel and entertainment expenses', color: '#10B981', icon: 'plane' },
    { name: 'Technology', description: 'Software, hardware, and IT services', color: '#8B5CF6', icon: 'monitor' },
    { name: 'Marketing & Advertising', description: 'Marketing campaigns and advertising costs', color: '#F59E0B', icon: 'megaphone' },
    { name: 'Professional Services', description: 'Legal, accounting, and consulting services', color: '#EF4444', icon: 'briefcase' },
    { name: 'Utilities', description: 'Electricity, water, internet, and phone bills', color: '#06B6D4', icon: 'zap' },
    { name: 'Rent & Facilities', description: 'Office rent and facility maintenance', color: '#84CC16', icon: 'building' },
    { name: 'Equipment & Maintenance', description: 'Equipment purchases and maintenance', color: '#F97316', icon: 'wrench' },
    { name: 'Insurance', description: 'Business insurance premiums', color: '#EC4899', icon: 'shield' },
    { name: 'Training & Development', description: 'Employee training and professional development', color: '#6366F1', icon: 'graduation-cap' }
  ];

  let createdCount = 0;
  for (const catData of categories) {
    try {
      const existing = await prisma.expenseCategory.findFirst({
        where: { tenantId: TENANT_ID, companyId: COMPANY_ID, name: catData.name }
      });

      if (!existing) {
        await prisma.expenseCategory.create({
          data: {
            tenantId: TENANT_ID,
            companyId: COMPANY_ID,
            ...catData,
            isActive: true,
            taxTreatment: randomChoice(['deductible', 'non-deductible', 'partially_deductible']),
            approvalThreshold: Number(randomBetween(100, 1000).toFixed(2))
          }
        });
        createdCount++;
        console.log(`✅ Created expense category: ${catData.name}`);
      } else {
        console.log(`⏭️  Expense category already exists: ${catData.name}`);
      }
    } catch (error) {
      console.log(`❌ Error creating expense category ${catData.name}:`, error.message);
    }
  }

  console.log(`📊 Created ${createdCount} expense categories`);
  return createdCount;
}

async function seedBudgets() {
  console.log('💰 Seeding budgets...');
  
  const categories = await prisma.expenseCategory.findMany({
    where: { tenantId: TENANT_ID, companyId: COMPANY_ID }
  });

  if (categories.length === 0) {
    console.log('⚠️  No expense categories found. Skipping budget seeding.');
    return 0;
  }

  const periods = ['monthly', 'quarterly', 'yearly'];
  let createdCount = 0;

  for (const category of categories) {
    for (const period of periods) {
      try {
        const existing = await prisma.budget.findFirst({
          where: { 
            tenantId: TENANT_ID, 
            companyId: COMPANY_ID, 
            categoryId: category.id,
            period 
          }
        });

        if (!existing) {
          const startDate = new Date();
          const endDate = new Date();
          
          if (period === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
          } else if (period === 'quarterly') {
            endDate.setMonth(endDate.getMonth() + 3);
          } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }

          await prisma.budget.create({
            data: {
              tenantId: TENANT_ID,
              companyId: COMPANY_ID,
              categoryId: category.id,
              name: `${category.name} - ${period.charAt(0).toUpperCase() + period.slice(1)} Budget`,
              description: `Budget for ${category.name} expenses on a ${period} basis`,
              period,
              startDate,
              endDate,
              amount: Number(randomBetween(1000, 50000).toFixed(2)),
              spentAmount: Number(randomBetween(0, 5000).toFixed(2)),
              isActive: true,
              alertThreshold: Number(randomBetween(70, 90).toFixed(2))
            }
          });
          createdCount++;
          console.log(`✅ Created budget: ${category.name} - ${period}`);
        } else {
          console.log(`⏭️  Budget already exists: ${category.name} - ${period}`);
        }
      } catch (error) {
        console.log(`❌ Error creating budget for ${category.name} - ${period}:`, error.message);
      }
    }
  }

  console.log(`📊 Created ${createdCount} budgets`);
  return createdCount;
}

async function main() {
  console.log('🚀 Starting comprehensive purchase order seeding...\n');
  
  try {
    // Ensure company exists
    await ensureCompany();
    
    // Seed vendors
    const vendorCount = await seedVendors(15);
    
    // Seed products
    const productCount = await seedProducts(50);
    
    // Seed expense categories
    const categoryCount = await seedExpenseCategories();
    
    // Seed budgets
    const budgetCount = await seedBudgets();
    
    // Seed purchase orders
    const poCount = await seedPurchaseOrders(25);
    
    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Vendors: ${vendorCount}`);
    console.log(`   Products: ${productCount}`);
    console.log(`   Expense Categories: ${categoryCount}`);
    console.log(`   Budgets: ${budgetCount}`);
    console.log(`   Purchase Orders: ${poCount}`);
    
    // Display some statistics
    const totalVendors = await prisma.vendor.count({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID } });
    const totalProducts = await prisma.product.count({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID } });
    const totalPOs = await prisma.purchaseOrder.count({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID } });
    const totalReceipts = await prisma.receipt.count({ where: { tenantId: TENANT_ID } });
    const totalShipments = await prisma.importShipment.count({ where: { tenantId: TENANT_ID, companyId: COMPANY_ID } });
    
    console.log('\n📈 Database Statistics:');
    console.log(`   Total Vendors: ${totalVendors}`);
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   Total Purchase Orders: ${totalPOs}`);
    console.log(`   Total Receipts: ${totalReceipts}`);
    console.log(`   Total Import Shipments: ${totalShipments}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
