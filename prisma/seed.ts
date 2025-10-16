import { PrismaClient } from "@prisma/client";
import { seedInvoicesAndRelated } from "./seed-invoices";
import { seedPurchaseOrdersAndRelated } from "./seed-purchase-orders";
import { seedExpenses } from "./seed-expenses";
import { seedFinancialData } from "./seed-financial-data";
import { seedBankingData } from "./seed-banking";
import { seedBankingIntegrationData } from "./seed-banking-integration";
import { seedInventoryData } from "./seed-inventory";
import { seedFixedAssets } from "./seed-fixed-assets";
import { seedCategories } from "./seed-categories";

const prisma = new PrismaClient();

async function ensureCompanies(tenantId: string) {
  const companies = [
    { id: "seed-company-1", name: "Uruti Hub Limited" },
    { id: "seed-company-2", name: "Acme Trading Co" },
  ];
  for (const c of companies) {
    await prisma.company.upsert({ where: { id: c.id }, update: {}, create: { id: c.id, tenantId, name: c.name } });
  }
  return companies.map((c) => c.id);
}

async function seedVendors(tenantId: string, companyId: string) {
  const existing = await prisma.vendor.count({ where: { tenantId, companyId } })
  if (existing >= 5) return
  const vendors = [
    { name: 'Acme Supplies', email: 'sales@acme.test', phone: '+1-555-1000' },
    { name: 'Global Parts Co', email: 'orders@globalparts.test', phone: '+1-555-2000' },
    { name: 'LogiTrans Freight', email: 'ops@logitrans.test', phone: '+1-555-3000' },
    { name: 'Tech Components Ltd', email: 'info@techcomponents.test', phone: '+1-555-4000' },
    { name: 'Universal Imports', email: 'hello@universalimports.test', phone: '+1-555-5000' },
  ]
  for (const v of vendors) {
    const existing = await prisma.vendor.findFirst({ where: { tenantId, companyId, name: v.name } })
    if (!existing) {
      await prisma.vendor.create({ data: { tenantId, companyId, name: v.name, email: v.email, phone: v.phone } as any })
    }
  }
}

async function seedAccountTypes(tenantId: string, companyId: string) {
  const types = [
    { code: "ASSET", name: "Assets" },
    { code: "LIABILITY", name: "Liabilities" },
    { code: "EQUITY", name: "Equity" },
    { code: "REVENUE", name: "Revenue" },
    { code: "EXPENSE", name: "Expenses" },
  ];
  const map: Record<string, string> = {};
  for (const t of types) {
    const created = await prisma.accountType.upsert({
      where: { tenantId_companyId_code: { tenantId, companyId, code: t.code } },
      update: { name: t.name },
      create: { tenantId, companyId, code: t.code, name: t.name },
    });
    map[t.code] = created.id;
  }
  return map;
}

async function seedTaxRates(tenantId: string, companyId: string) {
  // Ensure a default federal jurisdiction exists per company
  const jurisdiction = await prisma.taxJurisdiction.upsert({
    where: { tenantId_companyId_code: { tenantId, companyId, code: "US-FED" } },
    update: {},
    create: {
      tenantId,
      companyId,
      name: "Federal",
      code: "US-FED",
      country: "US",
      level: "federal",
      isActive: true,
    },
  });

  const taxRates = [
    { taxName: "VAT", rate: 0.15, appliesTo: "all" as const },
    { taxName: "GST", rate: 0.10, appliesTo: "all" as const },
    { taxName: "Sales Tax", rate: 0.08, appliesTo: "products" as const },
    { taxName: "Service Tax", rate: 0.12, appliesTo: "services" as const },
  ];

  // Use composite unique: (tenantId, companyId, jurisdictionId, taxName, effectiveFrom)
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  for (const tax of taxRates) {
    await prisma.taxRate.upsert({
      where: {
        tenantId_companyId_jurisdictionId_taxName_effectiveFrom: {
          tenantId,
          companyId,
          jurisdictionId: jurisdiction.id,
          taxName: tax.taxName,
          effectiveFrom: startOfYear,
        },
      },
      update: { rate: tax.rate, appliesTo: tax.appliesTo },
      create: {
        tenantId,
        companyId,
        jurisdictionId: jurisdiction.id,
        taxName: tax.taxName,
        taxType: "sales",
        rate: tax.rate,
        appliesTo: tax.appliesTo,
        effectiveFrom: startOfYear,
        isActive: true,
      },
    });
  }
}

async function seedCollaborationData(tenantId: string, companyId: string) {
  // Create a client user for portal access
  const clientUser = await prisma.appUser.upsert({
    where: { tenantId_email: { tenantId, email: "client@urutiq.app" } },
    update: {},
    create: { tenantId, email: "client@urutiq.app", name: "Client User", role: "client" },
  });

  // Grant client portal access
  await prisma.clientPortalAccess.create({
    data: {
      tenantId,
      companyId,
      userId: clientUser.id,
      permissions: JSON.stringify(['view_invoices', 'view_reports', 'send_messages']),
      isActive: true
    },
  });

  // Create some sample tasks
  const taskTypes = ['reconciliation', 'review', 'audit', 'approval', 'follow_up'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  
  for (let i = 1; i <= 3; i++) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (i * 2)); // Due in 2, 4, 6 days
    
    await prisma.task.upsert({
      where: { id: `seed-task-${companyId}-${i}` },
      update: {},
      create: {
        id: `seed-task-${companyId}-${i}`,
        tenantId,
        companyId,
        assignedTo: clientUser.id,
        taskType: taskTypes[i % taskTypes.length],
        title: `Sample Task ${i}`,
        description: `This is a sample task for testing purposes`,
        dueDate,
        priority: priorities[i % priorities.length],
        status: 'pending'
      },
    });
  }
}

async function seedAccounts(
  tenantId: string,
  companyId: string,
  typeIds: Record<string, string>
) {
  type AccountSeed = { code: string; name: string; type: string; parentCode?: string };
  const accounts: AccountSeed[] = [
    // Assets
    { code: "1000", name: "Cash and Cash Equivalents", type: "ASSET" },
    { code: "1001", name: "Main Bank Account", type: "ASSET", parentCode: "1000" },
    { code: "1002", name: "Petty Cash", type: "ASSET", parentCode: "1000" },
    { code: "1003", name: "Savings Account", type: "ASSET", parentCode: "1000" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" },
    { code: "1101", name: "Trade Receivables", type: "ASSET", parentCode: "1100" },
    { code: "1102", name: "Other Receivables", type: "ASSET", parentCode: "1100" },
    { code: "1200", name: "Inventory", type: "ASSET" },
    { code: "1201", name: "Raw Materials", type: "ASSET", parentCode: "1200" },
    { code: "1202", name: "Work in Progress", type: "ASSET", parentCode: "1200" },
    { code: "1203", name: "Finished Goods", type: "ASSET", parentCode: "1200" },
    { code: "1300", name: "Prepaid Expenses", type: "ASSET" },
    { code: "1301", name: "Prepaid Insurance", type: "ASSET", parentCode: "1300" },
    { code: "1302", name: "Prepaid Rent", type: "ASSET", parentCode: "1300" },
    { code: "1400", name: "Fixed Assets", type: "ASSET" },
    { code: "1401", name: "Equipment", type: "ASSET", parentCode: "1400" },
    { code: "1402", name: "Furniture", type: "ASSET", parentCode: "1400" },
    { code: "1403", name: "Vehicles", type: "ASSET", parentCode: "1400" },
    { code: "1404", name: "Buildings", type: "ASSET", parentCode: "1400" },
    { code: "1500", name: "Accumulated Depreciation", type: "ASSET" },
    { code: "1501", name: "Equipment Depreciation", type: "ASSET", parentCode: "1500" },
    { code: "1502", name: "Furniture Depreciation", type: "ASSET", parentCode: "1500" },
    { code: "1503", name: "Vehicle Depreciation", type: "ASSET", parentCode: "1500" },
    { code: "1504", name: "Building Depreciation", type: "ASSET", parentCode: "1500" },
    
    // Liabilities
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
    { code: "2001", name: "Trade Payables", type: "LIABILITY", parentCode: "2000" },
    { code: "2002", name: "Other Payables", type: "LIABILITY", parentCode: "2000" },
    { code: "2100", name: "Accrued Expenses", type: "LIABILITY" },
    { code: "2101", name: "Accrued Salaries", type: "LIABILITY", parentCode: "2100" },
    { code: "2102", name: "Accrued Taxes", type: "LIABILITY", parentCode: "2100" },
    { code: "2103", name: "Accrued Interest", type: "LIABILITY", parentCode: "2100" },
    { code: "2200", name: "Short-term Loans", type: "LIABILITY" },
    { code: "2201", name: "Bank Overdraft", type: "LIABILITY", parentCode: "2200" },
    { code: "2202", name: "Line of Credit", type: "LIABILITY", parentCode: "2200" },
    { code: "2300", name: "Long-term Liabilities", type: "LIABILITY" },
    { code: "2301", name: "Long-term Loans", type: "LIABILITY", parentCode: "2300" },
    { code: "2302", name: "Mortgage", type: "LIABILITY", parentCode: "2300" },
    { code: "2303", name: "Bonds Payable", type: "LIABILITY", parentCode: "2300" },
    
    // Equity
    { code: "3000", name: "Retained Earnings", type: "EQUITY" },
    { code: "3001", name: "Common Stock", type: "EQUITY" },
    { code: "3002", name: "Additional Paid-in Capital", type: "EQUITY" },
    { code: "3003", name: "Treasury Stock", type: "EQUITY" },
    { code: "3004", name: "Dividends", type: "EQUITY" },
    
    // Revenue
    { code: "4000", name: "Sales Revenue", type: "REVENUE" },
    { code: "4001", name: "Product Sales", type: "REVENUE", parentCode: "4000" },
    { code: "4002", name: "Service Revenue", type: "REVENUE", parentCode: "4000" },
    { code: "4003", name: "Consulting Fees", type: "REVENUE", parentCode: "4000" },
    { code: "4100", name: "Other Revenue", type: "REVENUE" },
    { code: "4101", name: "Interest Income", type: "REVENUE", parentCode: "4100" },
    { code: "4102", name: "Foreign Exchange Gain", type: "REVENUE", parentCode: "4100" },
    { code: "4103", name: "Rental Income", type: "REVENUE", parentCode: "4100" },
    { code: "4104", name: "Commission Income", type: "REVENUE", parentCode: "4100" },
    
    // Expenses
    { code: "5000", name: "Operating Expenses", type: "EXPENSE" },
    { code: "5001", name: "Salaries and Wages", type: "EXPENSE", parentCode: "5000" },
    { code: "5002", name: "Employee Benefits", type: "EXPENSE", parentCode: "5000" },
    { code: "5003", name: "Rent Expense", type: "EXPENSE", parentCode: "5000" },
    { code: "5004", name: "Utilities", type: "EXPENSE", parentCode: "5000" },
    { code: "5005", name: "Insurance", type: "EXPENSE", parentCode: "5000" },
    { code: "5006", name: "Depreciation", type: "EXPENSE", parentCode: "5000" },
    { code: "5007", name: "Office Supplies", type: "EXPENSE", parentCode: "5000" },
    { code: "5008", name: "Travel and Entertainment", type: "EXPENSE", parentCode: "5000" },
    { code: "5009", name: "Marketing and Advertising", type: "EXPENSE", parentCode: "5000" },
    { code: "5010", name: "Professional Services", type: "EXPENSE", parentCode: "5000" },
    { code: "5011", name: "Maintenance and Repairs", type: "EXPENSE", parentCode: "5000" },
    { code: "5012", name: "Telecommunications", type: "EXPENSE", parentCode: "5000" },
    { code: "5013", name: "Software Licenses", type: "EXPENSE", parentCode: "5000" },
    { code: "5014", name: "Bank Charges", type: "EXPENSE", parentCode: "5000" },
    { code: "5015", name: "Foreign Exchange Loss", type: "EXPENSE", parentCode: "5000" },
    { code: "5016", name: "Cost of Goods Sold", type: "EXPENSE", parentCode: "5000" },
    { code: "5017", name: "Freight and Delivery", type: "EXPENSE", parentCode: "5000" },
    { code: "5018", name: "Warranty Expenses", type: "EXPENSE", parentCode: "5000" },
    { code: "5019", name: "Training and Development", type: "EXPENSE", parentCode: "5000" },
    { code: "5020", name: "Legal and Professional", type: "EXPENSE", parentCode: "5000" },
  ];

  // First pass: create parents (no parentCode)
  for (const a of accounts.filter((a) => !a.parentCode)) {
    await prisma.account.upsert({
      where: { tenantId_companyId_code: { tenantId, companyId, code: a.code } },
      update: { name: a.name, typeId: typeIds[a.type] },
      create: { tenantId, companyId, code: a.code, name: a.name, typeId: typeIds[a.type] },
    });
  }
  // Second pass: create children with parent references
  for (const a of accounts.filter((a) => !!a.parentCode)) {
    const parent = await prisma.account.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code: a.parentCode! } },
      select: { id: true },
    });
    await prisma.account.upsert({
      where: { tenantId_companyId_code: { tenantId, companyId, code: a.code } },
      update: { name: a.name, typeId: typeIds[a.type], parentId: parent?.id },
      create: { tenantId, companyId, code: a.code, name: a.name, typeId: typeIds[a.type], parentId: parent?.id },
    });
  }
}

async function seedJournalEntries(tenantId: string, companyId: string) {
  // Get account IDs for journal entries
  const accounts = await prisma.account.findMany({
    where: { tenantId, companyId },
    select: { id: true, code: true, type: { select: { name: true } } }
  });

  const cashAccount = accounts.find(a => a.code === '1001')?.id;
  const arAccount = accounts.find(a => a.code === '1101')?.id;
  const apAccount = accounts.find(a => a.code === '2001')?.id;
  const salesAccount = accounts.find(a => a.code === '4001')?.id;
  const serviceAccount = accounts.find(a => a.code === '4002')?.id;
  const cogsAccount = accounts.find(a => a.code === '5016')?.id;
  const inventoryAccount = accounts.find(a => a.code === '1203')?.id;
  const salaryAccount = accounts.find(a => a.code === '5001')?.id;
  const rentAccount = accounts.find(a => a.code === '5003')?.id;
  const utilitiesAccount = accounts.find(a => a.code === '5004')?.id;
  const insuranceAccount = accounts.find(a => a.code === '5005')?.id;
  const depreciationAccount = accounts.find(a => a.code === '5006')?.id;
  const officeSuppliesAccount = accounts.find(a => a.code === '5007')?.id;
  const travelAccount = accounts.find(a => a.code === '5008')?.id;
  const marketingAccount = accounts.find(a => a.code === '5009')?.id;
  const professionalAccount = accounts.find(a => a.code === '5010')?.id;
  const maintenanceAccount = accounts.find(a => a.code === '5011')?.id;
  const telecomAccount = accounts.find(a => a.code === '5012')?.id;
  const softwareAccount = accounts.find(a => a.code === '5013')?.id;
  const bankChargesAccount = accounts.find(a => a.code === '5014')?.id;
  const fxGainAccount = accounts.find(a => a.code === '4102')?.id;
  const fxLossAccount = accounts.find(a => a.code === '5015')?.id;
  const freightAccount = accounts.find(a => a.code === '5017')?.id;
  const warrantyAccount = accounts.find(a => a.code === '5018')?.id;
  const trainingAccount = accounts.find(a => a.code === '5019')?.id;
  const legalAccount = accounts.find(a => a.code === '5020')?.id;
  const prepaidInsuranceAccount = accounts.find(a => a.code === '1301')?.id;
  const prepaidRentAccount = accounts.find(a => a.code === '1302')?.id;
  const equipmentAccount = accounts.find(a => a.code === '1401')?.id;
  const furnitureAccount = accounts.find(a => a.code === '1402')?.id;
  const vehicleAccount = accounts.find(a => a.code === '1403')?.id;
  const buildingAccount = accounts.find(a => a.code === '1404')?.id;
  const accumulatedDepreciationAccount = accounts.find(a => a.code === '1500')?.id;

  if (!cashAccount || !arAccount || !apAccount || !salesAccount) {
    console.log('Required accounts not found, skipping journal entries');
    return;
  }

  // Generate 100+ realistic journal entries over the past year
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  
  const journalEntries = [];
  
  // Monthly recurring entries
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(startDate);
    monthDate.setMonth(startDate.getMonth() + month);
    
    // Monthly salary expense
    if (salaryAccount) {
      journalEntries.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 25),
        memo: `Monthly salary expense - ${monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        reference: `SAL-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        status: 'POSTED',
        lines: [
          { accountId: salaryAccount, debit: 15000, credit: 0, memo: 'Salary expense' },
          { accountId: cashAccount, debit: 0, credit: 15000, memo: 'Cash payment' }
        ]
      });
    }

    // Monthly rent expense
    if (rentAccount && prepaidRentAccount) {
      journalEntries.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
        memo: `Monthly rent expense - ${monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        reference: `RENT-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        status: 'POSTED',
        lines: [
          { accountId: rentAccount, debit: 5000, credit: 0, memo: 'Rent expense' },
          { accountId: prepaidRentAccount, debit: 0, credit: 5000, memo: 'Prepaid rent reduction' }
        ]
      });
    }

    // Monthly utilities
    if (utilitiesAccount) {
      const utilityAmount = 800 + Math.random() * 400; // Random between 800-1200
      journalEntries.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
        memo: `Monthly utilities - ${monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        reference: `UTIL-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        status: 'POSTED',
        lines: [
          { accountId: utilitiesAccount, debit: utilityAmount, credit: 0, memo: 'Utilities expense' },
          { accountId: cashAccount, debit: 0, credit: utilityAmount, memo: 'Cash payment' }
        ]
      });
    }

    // Monthly insurance
    if (insuranceAccount && prepaidInsuranceAccount) {
      journalEntries.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 10),
        memo: `Monthly insurance expense - ${monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        reference: `INS-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        status: 'POSTED',
        lines: [
          { accountId: insuranceAccount, debit: 1200, credit: 0, memo: 'Insurance expense' },
          { accountId: prepaidInsuranceAccount, debit: 0, credit: 1200, memo: 'Prepaid insurance reduction' }
        ]
      });
    }

    // Monthly depreciation
    if (depreciationAccount && accumulatedDepreciationAccount) {
      journalEntries.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 30),
        memo: `Monthly depreciation - ${monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        reference: `DEP-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        status: 'POSTED',
        lines: [
          { accountId: depreciationAccount, debit: 2500, credit: 0, memo: 'Depreciation expense' },
          { accountId: accumulatedDepreciationAccount, debit: 0, credit: 2500, memo: 'Accumulated depreciation' }
        ]
      });
    }
  }

  // Sales transactions (2-4 per month)
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(startDate);
    monthDate.setMonth(startDate.getMonth() + month);
    
    const salesCount = 2 + Math.floor(Math.random() * 3); // 2-4 sales per month
    
    for (let sale = 0; sale < salesCount; sale++) {
      const saleDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 5 + sale * 8);
      const saleAmount = 5000 + Math.random() * 15000; // Random between 5000-20000
      
      journalEntries.push({
        date: saleDate,
        memo: `Product sale - Invoice #INV-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${sale + 1}`,
        reference: `INV-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${sale + 1}`,
        status: 'POSTED',
        lines: [
          { accountId: arAccount, debit: saleAmount, credit: 0, memo: 'Accounts receivable' },
          { accountId: salesAccount, debit: 0, credit: saleAmount, memo: 'Sales revenue' }
        ]
      });

      // Cash receipt for some sales (60% of sales)
      if (Math.random() < 0.6) {
        const receiptDate = new Date(saleDate);
        receiptDate.setDate(receiptDate.getDate() + 15 + Math.floor(Math.random() * 15)); // 15-30 days later
        
        journalEntries.push({
          date: receiptDate,
          memo: `Cash receipt for Invoice #INV-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${sale + 1}`,
          reference: `REC-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${sale + 1}`,
          status: 'POSTED',
          lines: [
            { accountId: cashAccount, debit: saleAmount, credit: 0, memo: 'Cash receipt' },
            { accountId: arAccount, debit: 0, credit: saleAmount, memo: 'Accounts receivable reduction' }
          ]
        });
      }
    }
  }

  // Service revenue (1-2 per month)
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(startDate);
    monthDate.setMonth(startDate.getMonth() + month);
    
    const serviceCount = 1 + Math.floor(Math.random() * 2); // 1-2 services per month
    
    for (let service = 0; service < serviceCount; service++) {
      const serviceDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 10 + service * 15);
      const serviceAmount = 3000 + Math.random() * 7000; // Random between 3000-10000
      
      journalEntries.push({
        date: serviceDate,
        memo: `Service revenue - Service #SRV-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${service + 1}`,
        reference: `SRV-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${service + 1}`,
        status: 'POSTED',
        lines: [
          { accountId: cashAccount, debit: serviceAmount, credit: 0, memo: 'Cash receipt' },
          { accountId: serviceAccount, debit: 0, credit: serviceAmount, memo: 'Service revenue' }
        ]
      });
    }
  }

  // Purchase transactions (1-3 per month)
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(startDate);
    monthDate.setMonth(startDate.getMonth() + month);
    
    const purchaseCount = 1 + Math.floor(Math.random() * 3); // 1-3 purchases per month
    
    for (let purchase = 0; purchase < purchaseCount; purchase++) {
      const purchaseDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 12 + purchase * 10);
      const purchaseAmount = 2000 + Math.random() * 8000; // Random between 2000-10000
      
      journalEntries.push({
        date: purchaseDate,
        memo: `Inventory purchase - PO #PO-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${purchase + 1}`,
        reference: `PO-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${purchase + 1}`,
        status: 'POSTED',
        lines: [
          { accountId: inventoryAccount, debit: purchaseAmount, credit: 0, memo: 'Inventory increase' },
          { accountId: apAccount, debit: 0, credit: purchaseAmount, memo: 'Accounts payable' }
        ]
      });

      // Payment for some purchases (70% of purchases)
      if (Math.random() < 0.7) {
        const paymentDate = new Date(purchaseDate);
        paymentDate.setDate(paymentDate.getDate() + 20 + Math.floor(Math.random() * 10)); // 20-30 days later
        
        journalEntries.push({
          date: paymentDate,
          memo: `Payment for PO #PO-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${purchase + 1}`,
          reference: `PAY-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${purchase + 1}`,
          status: 'POSTED',
          lines: [
            { accountId: apAccount, debit: purchaseAmount, credit: 0, memo: 'Accounts payable reduction' },
            { accountId: cashAccount, debit: 0, credit: purchaseAmount, memo: 'Cash payment' }
          ]
        });
      }
    }
  }

  // Miscellaneous expenses (1-2 per month)
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(startDate);
    monthDate.setMonth(startDate.getMonth() + month);
    
    const expenseCount = 1 + Math.floor(Math.random() * 2); // 1-2 expenses per month
    
    for (let expense = 0; expense < expenseCount; expense++) {
      const expenseDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 20 + expense * 5);
      const expenseAmount = 200 + Math.random() * 800; // Random between 200-1000
      
      // Random expense types
      const expenseTypes = [
        { account: officeSuppliesAccount, name: 'Office Supplies' },
        { account: travelAccount, name: 'Travel Expense' },
        { account: marketingAccount, name: 'Marketing Expense' },
        { account: professionalAccount, name: 'Professional Services' },
        { account: maintenanceAccount, name: 'Maintenance Expense' },
        { account: telecomAccount, name: 'Telecommunications' },
        { account: softwareAccount, name: 'Software License' },
        { account: bankChargesAccount, name: 'Bank Charges' },
        { account: freightAccount, name: 'Freight Expense' },
        { account: warrantyAccount, name: 'Warranty Expense' },
        { account: trainingAccount, name: 'Training Expense' },
        { account: legalAccount, name: 'Legal Expense' }
      ];
      
      const selectedExpense = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
      
      if (selectedExpense.account) {
        journalEntries.push({
          date: expenseDate,
          memo: `${selectedExpense.name} - ${monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          reference: `EXP-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${expense + 1}`,
          status: 'POSTED',
          lines: [
            { accountId: selectedExpense.account, debit: expenseAmount, credit: 0, memo: selectedExpense.name },
            { accountId: cashAccount, debit: 0, credit: expenseAmount, memo: 'Cash payment' }
          ]
        });
      }
    }
  }

  // Foreign exchange transactions (occasional)
  for (let month = 0; month < 12; month++) {
    if (Math.random() < 0.3) { // 30% chance per month
      const monthDate = new Date(startDate);
      monthDate.setMonth(startDate.getMonth() + month);
      const fxDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 15 + Math.floor(Math.random() * 15));
      const fxAmount = 500 + Math.random() * 1500; // Random between 500-2000
      
      // 50/50 chance of gain or loss
      if (Math.random() < 0.5 && fxGainAccount) {
        journalEntries.push({
          date: fxDate,
          memo: `Foreign exchange gain - ${monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          reference: `FX-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
          status: 'POSTED',
          lines: [
            { accountId: cashAccount, debit: fxAmount, credit: 0, memo: 'FX gain' },
            { accountId: fxGainAccount, debit: 0, credit: fxAmount, memo: 'Foreign exchange gain' }
          ]
        });
      } else if (fxLossAccount) {
        journalEntries.push({
          date: fxDate,
          memo: `Foreign exchange loss - ${monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          reference: `FX-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
          status: 'POSTED',
          lines: [
            { accountId: fxLossAccount, debit: fxAmount, credit: 0, memo: 'Foreign exchange loss' },
            { accountId: cashAccount, debit: 0, credit: fxAmount, memo: 'FX loss' }
          ]
        });
      }
    }
  }

  // Equipment purchases (quarterly)
  for (let quarter = 0; quarter < 4; quarter++) {
    const quarterDate = new Date(startDate);
    quarterDate.setMonth(startDate.getMonth() + quarter * 3);
    const purchaseDate = new Date(quarterDate.getFullYear(), quarterDate.getMonth(), 15);
    const purchaseAmount = 10000 + Math.random() * 20000; // Random between 10000-30000
    
    if (equipmentAccount) {
      journalEntries.push({
        date: purchaseDate,
        memo: `Equipment purchase - ${quarterDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        reference: `EQP-${quarterDate.getFullYear()}-Q${quarter + 1}`,
        status: 'POSTED',
        lines: [
          { accountId: equipmentAccount, debit: purchaseAmount, credit: 0, memo: 'Equipment asset' },
          { accountId: cashAccount, debit: 0, credit: purchaseAmount, memo: 'Cash payment' }
        ]
      });
    }
  }

  // Create all journal entries
  for (const entry of journalEntries) {
    const createdEntry = await prisma.journalEntry.create({
      data: {
        tenantId,
        companyId,
        date: entry.date,
        memo: entry.memo,
        reference: entry.reference,
        status: entry.status
      }
    });

    // Create journal lines
    for (const line of entry.lines) {
      await prisma.journalLine.create({
        data: {
          tenantId,
          entryId: createdEntry.id,
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          memo: line.memo
        }
      });
    }
  }

  console.log(`Created ${journalEntries.length} journal entries for company ${companyId}`);
}

async function main() {
  const tenantId = process.env.SEED_TENANT_ID || "tenant_demo";

  // companies & default admin
  const companyIds = await ensureCompanies(tenantId);
  
  // Create demo admin user
  await prisma.appUser.upsert({
    where: { tenantId_email: { tenantId, email: "admin@demo.com" } },
    update: {},
    create: { 
      tenantId, 
      email: "admin@demo.com", 
      name: "Demo Admin", 
      role: "admin",
      passwordHash: "demo_hash_placeholder", // Will be updated with real hash
      passwordSalt: "demo_salt_placeholder"  // Will be updated with real salt
    },
  });
  
  // Create original admin user
  await prisma.appUser.upsert({
    where: { tenantId_email: { tenantId, email: "admin@urutiq.app" } },
    update: {},
    create: { tenantId, email: "admin@urutiq.app", name: "Admin", role: "admin" },
  });

  // per-company account types and COA
  for (const companyId of companyIds) {
    const typeIds = await seedAccountTypes(tenantId, companyId);
    await seedAccounts(tenantId, companyId, typeIds);
    await seedTaxRates(tenantId, companyId);
    await seedCollaborationData(tenantId, companyId);
    
    // Seed journal entries with realistic data
    await seedJournalEntries(tenantId, companyId);
    await seedInvoicesAndRelated({ tenantId, companyId, customersPerCompany: 15, productsPerCompany: 30, invoicesPerCompany: 120 });
    // Ensure vendors for purchasing
    await seedVendors(tenantId, companyId);
    // Seed purchase orders (20, half local, half import) with receipts and import shipments
    await seedPurchaseOrdersAndRelated({ tenantId, companyId, count: 20 });
    // Seed expense categories, 20 budgets, and a few rules
    await seedExpenses({ tenantId, companyId, budgets: 20 });
    
    // Seed comprehensive financial data for reporting
    // Choose industry per company for varied demo data
    const industry = companyId === 'seed-company-1' ? 'saas' : 'retail'
    await seedFinancialData({ tenantId, companyId, industry });
    
    // Seed banking data (accounts, transactions, payments)
    await seedBankingData({ tenantId, companyId });
    
    // Seed banking integration data (enhanced testing data)
    await seedBankingIntegrationData({ tenantId, companyId });
    
    // Seed inventory data (products, locations, movements, alerts)
    await seedInventoryData({ tenantId, companyId });
    
    // Seed categories for inventory management
    await seedCategories(tenantId, companyId);
    
    // Seed fixed assets data (categories, assets, depreciation)
    await seedFixedAssets(tenantId, companyId);
    
    // Seed a default workspace and a sample file metadata
    const ws = await prisma.workspace.upsert({
      where: { tenantId_companyId_name: { tenantId, companyId, name: 'General' } },
      update: {},
      create: { tenantId, companyId, name: 'General', description: 'Default workspace' }
    });
    const anyUser = await prisma.appUser.findFirst({ where: { tenantId } });
    if (anyUser) {
      await prisma.workspaceMember.upsert({
        where: { tenantId_workspaceId_userId: { tenantId, workspaceId: ws.id, userId: anyUser.id } },
        update: { role: 'owner' },
        create: { tenantId, workspaceId: ws.id, userId: anyUser.id, role: 'owner' }
      });
      await prisma.fileAsset.create({
        data: {
          tenantId,
          companyId,
          uploaderId: anyUser.id,
          workspaceId: ws.id,
          name: 'welcome.txt',
          mimeType: 'text/plain',
          sizeBytes: 12,
          storageKey: 'seed/welcome.txt'
        }
      });
    }
    // Default account mappings
    const findAccount = (code: string) => prisma.account.findFirst({ where: { tenantId, companyId, code } });
    const mappings: [string, string][] = [];
    const ar = await findAccount('1100'); if (ar) mappings.push(['AR', ar.id]);
    const ap = await findAccount('2000'); if (ap) mappings.push(['AP', ap.id]);
    const cash = await findAccount('1000'); if (cash) mappings.push(['CASH', cash.id]);
    const inventory = await findAccount('1200'); if (inventory) mappings.push(['INVENTORY', inventory.id]);
    const revenue = await findAccount('4000'); if (revenue) mappings.push(['REVENUE', revenue.id]);
    const cogs = await findAccount('5000'); if (cogs) mappings.push(['COGS', cogs.id]);
    const fxGain = await findAccount('4102'); if (fxGain) mappings.push(['FX_GAIN', fxGain.id]);
    const fxLoss = await findAccount('5015'); if (fxLoss) mappings.push(['FX_LOSS', fxLoss.id]);
    for (const [purpose, accountId] of mappings) {
      await prisma.accountMapping.upsert({
        where: { tenantId_companyId_purpose: { tenantId, companyId, purpose } },
        update: { accountId },
        create: { tenantId, companyId, purpose, accountId }
      });
    }
  }

  console.log("Seed complete for tenant:", tenantId);
}

main().finally(async () => {
  await prisma.$disconnect();
});


