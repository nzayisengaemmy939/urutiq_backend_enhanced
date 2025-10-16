import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedFixedAssets(tenantId: string, companyId: string) {
  console.log(`🌱 Seeding fixed assets for company ${companyId}...`);

  // First, ensure we have the necessary chart of accounts
  const assetAccounts = await ensureAssetAccounts(tenantId, companyId);
  
  // Create fixed asset categories
  const categories = await createFixedAssetCategories(tenantId, companyId, assetAccounts);
  
  // Create fixed assets
  await createFixedAssets(tenantId, companyId, categories);
  
  console.log(`✅ Fixed assets seeding completed for company ${companyId}`);
}

async function ensureAssetAccounts(tenantId: string, companyId: string) {
  // Ensure we have the necessary chart of accounts for fixed assets
  const assetAccountTypes = [
    { code: "1500", name: "Equipment" },
    { code: "1501", name: "Computer Equipment" },
    { code: "1502", name: "Office Furniture" },
    { code: "1503", name: "Vehicles" },
    { code: "1504", name: "Machinery" },
    { code: "1505", name: "Buildings" },
    { code: "1506", name: "Land" },
    { code: "1507", name: "Leasehold Improvements" },
    { code: "1510", name: "Accumulated Depreciation - Equipment" },
    { code: "1511", name: "Accumulated Depreciation - Computer Equipment" },
    { code: "1512", name: "Accumulated Depreciation - Office Furniture" },
    { code: "1513", name: "Accumulated Depreciation - Vehicles" },
    { code: "1514", name: "Accumulated Depreciation - Machinery" },
    { code: "1515", name: "Accumulated Depreciation - Buildings" },
    { code: "1516", name: "Accumulated Depreciation - Leasehold Improvements" },
    { code: "6100", name: "Depreciation Expense - Equipment" },
    { code: "6101", name: "Depreciation Expense - Computer Equipment" },
    { code: "6102", name: "Depreciation Expense - Office Furniture" },
    { code: "6103", name: "Depreciation Expense - Vehicles" },
    { code: "6104", name: "Depreciation Expense - Machinery" },
    { code: "6105", name: "Depreciation Expense - Buildings" },
    { code: "6106", name: "Depreciation Expense - Leasehold Improvements" },
    { code: "4900", name: "Gain on Disposal of Assets" },
    { code: "4901", name: "Loss on Disposal of Assets" },
  ];

  const accounts: any[] = [];
  
  for (const accountType of assetAccountTypes) {
    const existing = await prisma.account.findFirst({
      where: { tenantId, companyId, code: accountType.code }
    });
    
    if (!existing) {
      const accountTypeId = accountType.code.startsWith('15') ? 'ASSET' : 
                           accountType.code.startsWith('61') ? 'EXPENSE' : 'REVENUE';
      
      const account = await prisma.account.create({
        data: {
          tenantId,
          companyId,
          code: accountType.code,
          name: accountType.name,
          type: accountTypeId,
          parentId: null,
          isActive: true,
          description: `Account for ${accountType.name}`,
        } as any
      });
      accounts.push(account);
    } else {
      accounts.push(existing);
    }
  }
  
  return accounts;
}

async function createFixedAssetCategories(tenantId: string, companyId: string, accounts: any[]) {
  const categories = [
    {
      id: "cat-computer-equipment",
      name: "Computer Equipment",
      usefulLifeMonths: 36, // 3 years
      method: "straight_line",
      salvageRate: 0.10, // 10%
      accounts: {
        assetAccountId: accounts.find(a => a.code === "1501")?.id,
        depreciationExpenseId: accounts.find(a => a.code === "6101")?.id,
        accumulatedDepreciationId: accounts.find(a => a.code === "1511")?.id,
        disposalGainId: accounts.find(a => a.code === "4900")?.id,
        disposalLossId: accounts.find(a => a.code === "4901")?.id,
      }
    },
    {
      id: "cat-office-furniture",
      name: "Office Furniture",
      usefulLifeMonths: 84, // 7 years
      method: "straight_line",
      salvageRate: 0.15, // 15%
      accounts: {
        assetAccountId: accounts.find(a => a.code === "1502")?.id,
        depreciationExpenseId: accounts.find(a => a.code === "6102")?.id,
        accumulatedDepreciationId: accounts.find(a => a.code === "1512")?.id,
        disposalGainId: accounts.find(a => a.code === "4900")?.id,
        disposalLossId: accounts.find(a => a.code === "4901")?.id,
      }
    },
    {
      id: "cat-vehicles",
      name: "Vehicles",
      usefulLifeMonths: 60, // 5 years
      method: "declining_balance",
      salvageRate: 0.20, // 20%
      accounts: {
        assetAccountId: accounts.find(a => a.code === "1503")?.id,
        depreciationExpenseId: accounts.find(a => a.code === "6103")?.id,
        accumulatedDepreciationId: accounts.find(a => a.code === "1513")?.id,
        disposalGainId: accounts.find(a => a.code === "4900")?.id,
        disposalLossId: accounts.find(a => a.code === "4901")?.id,
      }
    },
    {
      id: "cat-machinery",
      name: "Machinery",
      usefulLifeMonths: 120, // 10 years
      method: "sum_of_years_digits",
      salvageRate: 0.10, // 10%
      accounts: {
        assetAccountId: accounts.find(a => a.code === "1504")?.id,
        depreciationExpenseId: accounts.find(a => a.code === "6104")?.id,
        accumulatedDepreciationId: accounts.find(a => a.code === "1514")?.id,
        disposalGainId: accounts.find(a => a.code === "4900")?.id,
        disposalLossId: accounts.find(a => a.code === "4901")?.id,
      }
    },
    {
      id: "cat-buildings",
      name: "Buildings",
      usefulLifeMonths: 300, // 25 years
      method: "straight_line",
      salvageRate: 0.05, // 5%
      accounts: {
        assetAccountId: accounts.find(a => a.code === "1505")?.id,
        depreciationExpenseId: accounts.find(a => a.code === "6105")?.id,
        accumulatedDepreciationId: accounts.find(a => a.code === "1515")?.id,
        disposalGainId: accounts.find(a => a.code === "4900")?.id,
        disposalLossId: accounts.find(a => a.code === "4901")?.id,
      }
    },
    {
      id: "cat-leasehold-improvements",
      name: "Leasehold Improvements",
      usefulLifeMonths: 84, // 7 years
      method: "straight_line",
      salvageRate: 0.0, // 0%
      accounts: {
        assetAccountId: accounts.find(a => a.code === "1507")?.id,
        depreciationExpenseId: accounts.find(a => a.code === "6106")?.id,
        accumulatedDepreciationId: accounts.find(a => a.code === "1516")?.id,
        disposalGainId: accounts.find(a => a.code === "4900")?.id,
        disposalLossId: accounts.find(a => a.code === "4901")?.id,
      }
    }
  ];

  const createdCategories = [];
  
  for (const category of categories) {
    const existing = await prisma.fixedAssetCategory.findFirst({
      where: { tenantId, companyId, id: category.id }
    });
    
    if (!existing) {
      const created = await prisma.fixedAssetCategory.create({
        data: {
          id: category.id,
          tenantId,
          companyId,
          name: category.name,
          usefulLifeMonths: category.usefulLifeMonths,
          method: category.method,
          salvageRate: category.salvageRate,
          assetAccountId: category.accounts.assetAccountId,
          depreciationExpenseId: category.accounts.depreciationExpenseId,
          accumulatedDepreciationId: category.accounts.accumulatedDepreciationId,
          disposalGainId: category.accounts.disposalGainId,
          disposalLossId: category.accounts.disposalLossId,
        } as any
      });
      createdCategories.push(created);
    } else {
      createdCategories.push(existing);
    }
  }
  
  return createdCategories;
}

async function createFixedAssets(tenantId: string, companyId: string, categories: any[]) {
  const assets = [
    // Computer Equipment
    {
      id: "asset-laptop-1",
      name: "Dell Latitude 5520 Laptop",
      categoryId: "cat-computer-equipment",
      cost: 1299.00,
      currency: "USD",
      acquisitionDate: "2024-01-15",
      startDepreciation: "2024-02-01",
      salvageValue: 129.90,
      notes: "Primary laptop for CEO"
    },
    {
      id: "asset-laptop-2",
      name: "MacBook Pro 14-inch",
      categoryId: "cat-computer-equipment",
      cost: 2499.00,
      currency: "USD",
      acquisitionDate: "2024-02-10",
      startDepreciation: "2024-03-01",
      salvageValue: 249.90,
      notes: "Development team laptop"
    },
    {
      id: "asset-desktop-1",
      name: "Dell OptiPlex Desktop",
      categoryId: "cat-computer-equipment",
      cost: 899.00,
      currency: "USD",
      acquisitionDate: "2024-01-20",
      startDepreciation: "2024-02-01",
      salvageValue: 89.90,
      notes: "Reception desk computer"
    },
    {
      id: "asset-monitor-1",
      name: "Dell UltraSharp 27-inch Monitor",
      categoryId: "cat-computer-equipment",
      cost: 399.00,
      currency: "USD",
      acquisitionDate: "2024-01-25",
      startDepreciation: "2024-02-01",
      salvageValue: 39.90,
      notes: "External monitor for laptop setup"
    },

    // Office Furniture
    {
      id: "asset-desk-1",
      name: "Standing Desk - Electric Adjustable",
      categoryId: "cat-office-furniture",
      cost: 899.00,
      currency: "USD",
      acquisitionDate: "2024-01-10",
      startDepreciation: "2024-02-01",
      salvageValue: 134.85,
      notes: "CEO's standing desk"
    },
    {
      id: "asset-chair-1",
      name: "Herman Miller Aeron Chair",
      categoryId: "cat-office-furniture",
      cost: 1295.00,
      currency: "USD",
      acquisitionDate: "2024-01-10",
      startDepreciation: "2024-02-01",
      salvageValue: 194.25,
      notes: "Ergonomic office chair"
    },
    {
      id: "asset-filing-cabinet-1",
      name: "4-Drawer Filing Cabinet",
      categoryId: "cat-office-furniture",
      cost: 299.00,
      currency: "USD",
      acquisitionDate: "2024-01-30",
      startDepreciation: "2024-02-01",
      salvageValue: 44.85,
      notes: "Metal filing cabinet for documents"
    },

    // Vehicles
    {
      id: "asset-vehicle-1",
      name: "Toyota Camry 2024",
      categoryId: "cat-vehicles",
      cost: 28500.00,
      currency: "USD",
      acquisitionDate: "2024-02-01",
      startDepreciation: "2024-03-01",
      salvageValue: 5700.00,
      notes: "Company car for sales team"
    },
    {
      id: "asset-vehicle-2",
      name: "Ford Transit Van",
      categoryId: "cat-vehicles",
      cost: 35000.00,
      currency: "USD",
      acquisitionDate: "2024-01-15",
      startDepreciation: "2024-02-01",
      salvageValue: 7000.00,
      notes: "Delivery van for inventory transport"
    },

    // Machinery
    {
      id: "asset-printer-1",
      name: "HP LaserJet Enterprise Printer",
      categoryId: "cat-machinery",
      cost: 2499.00,
      currency: "USD",
      acquisitionDate: "2024-01-05",
      startDepreciation: "2024-02-01",
      salvageValue: 249.90,
      notes: "High-volume office printer"
    },
    {
      id: "asset-copier-1",
      name: "Canon ImageRunner Copier",
      categoryId: "cat-machinery",
      cost: 8999.00,
      currency: "USD",
      acquisitionDate: "2024-01-12",
      startDepreciation: "2024-02-01",
      salvageValue: 899.90,
      notes: "Multi-function copier/scanner/printer"
    },

    // Buildings
    {
      id: "asset-office-building",
      name: "Office Building - 123 Business Ave",
      categoryId: "cat-buildings",
      cost: 750000.00,
      currency: "USD",
      acquisitionDate: "2023-06-01",
      startDepreciation: "2023-07-01",
      salvageValue: 37500.00,
      notes: "Main office building"
    },

    // Leasehold Improvements
    {
      id: "asset-office-renovation",
      name: "Office Renovation & Fit-out",
      categoryId: "cat-leasehold-improvements",
      cost: 45000.00,
      currency: "USD",
      acquisitionDate: "2023-07-01",
      startDepreciation: "2023-08-01",
      salvageValue: 0,
      notes: "Complete office renovation including flooring, lighting, and fixtures"
    },
    {
      id: "asset-kitchen-setup",
      name: "Kitchen & Break Room Setup",
      categoryId: "cat-leasehold-improvements",
      cost: 12500.00,
      currency: "USD",
      acquisitionDate: "2023-08-15",
      startDepreciation: "2023-09-01",
      salvageValue: 0,
      notes: "Kitchen appliances and break room furniture"
    }
  ];

  for (const asset of assets) {
    const existing = await prisma.fixedAsset.findFirst({
      where: { tenantId, companyId, id: asset.id }
    });
    
    if (!existing) {
      await prisma.fixedAsset.create({
        data: {
          id: asset.id,
          tenantId,
          companyId,
          categoryId: asset.categoryId,
          name: asset.name,
          cost: asset.cost,
          currency: asset.currency,
          acquisitionDate: asset.acquisitionDate,
          startDepreciation: asset.startDepreciation,
          salvageValue: asset.salvageValue,
          notes: asset.notes,
        } as any
      });
    }
  }
}
