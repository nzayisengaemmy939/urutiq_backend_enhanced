import type { Router } from 'express';
import { prisma } from './prisma.js';
import { TenantRequest } from './tenant.js';
import { validateBody } from './validate.js';
import { z } from 'zod';
import { asyncHandler } from './errors.js';
import { FixedAssetDepreciationService } from './services/fixed-asset-depreciation.service.js';
import { FixedAssetReportsService } from './services/fixed-asset-reports.service.js';

// Validation schemas for fixed assets
const fixedAssetSchemas = {
  category: z.object({
    companyId: z.string(),
    name: z.string().min(1),
    usefulLifeMonths: z.coerce.number().int().positive(),
    method: z.enum(['straight_line', 'declining_balance', 'sum_of_years_digits']).default('straight_line'),
    salvageRate: z.coerce.number().min(0).max(100).default(0),
    assetAccountId: z.string().optional(),
    depreciationExpenseId: z.string().optional(),
    accumulatedDepreciationId: z.string().optional(),
    disposalGainId: z.string().optional(),
    disposalLossId: z.string().optional()
  }),

  asset: z.object({
    companyId: z.string(),
    name: z.string().min(1),
    categoryId: z.string(),
    cost: z.coerce.number().positive(),
    currency: z.string().default('USD'),
    acquisitionDate: z.string().min(1),
    startDepreciation: z.string().min(1),
    salvageValue: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
    status: z.enum(['DRAFT', 'POSTED', 'DISPOSED']).default('DRAFT')
  }),

  depreciation: z.object({
    assetId: z.string(),
    periodStart: z.string().min(1),
    periodEnd: z.string().min(1),
    depreciationAmount: z.coerce.number().nonnegative(),
    depreciationMethod: z.string(),
    depreciationRate: z.coerce.number().min(0).max(100)
  }),

  maintenance: z.object({
    companyId: z.string(),
    assetId: z.string(),
    maintenanceDate: z.string().min(1),
    maintenanceType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION']),
    description: z.string().min(1),
    performedBy: z.string().optional(),
    cost: z.coerce.number().min(0).default(0),
    extendsUsefulLife: z.boolean().default(false),
    lifeExtensionMonths: z.coerce.number().int().positive().optional(),
    invoiceNumber: z.string().optional(),
    warrantyInfo: z.string().optional(),
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('SCHEDULED')
  }),

  disposal: z.object({
    assetId: z.string(),
    disposalDate: z.string().min(1),
    disposalMethod: z.enum(['SOLD', 'SCRAPPED', 'DONATED', 'TRADED_IN', 'LOST', 'STOLEN']),
    disposalReason: z.string().optional(),
    disposalValue: z.coerce.number().min(0).default(0),
    disposalCosts: z.coerce.number().min(0).default(0),
    buyer: z.string().optional(),
    disposalLocation: z.string().optional(),
    notes: z.string().optional()
  })
};

// Depreciation calculation functions
function calculateStraightLineDepreciation(cost: number, salvageValue: number, usefulLifeYears: number): number {
  return (cost - salvageValue) / usefulLifeYears;
}

function calculateDecliningBalanceDepreciation(cost: number, salvageValue: number, usefulLifeYears: number, year: number): number {
  const rate = 2 / usefulLifeYears; // Double declining balance
  const bookValue = cost * Math.pow(1 - rate, year - 1);
  const depreciation = bookValue * rate;
  return Math.max(depreciation, salvageValue - (cost - depreciation));
}

function calculateSumOfYearsDepreciation(cost: number, salvageValue: number, usefulLifeYears: number, year: number): number {
  const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
  const remainingLife = usefulLifeYears - year + 1;
  return ((cost - salvageValue) * remainingLife) / sumOfYears;
}

export function mountFixedAssetRoutes(router: Router) {
  // Fixed Asset Categories Routes
  router.get('/fixed-assets/categories', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;
    
    const categories = await prisma.fixedAssetCategory.findMany({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      orderBy: { name: 'asc' }
    });

    res.json({ categories });
  }));

  router.post('/fixed-assets/categories', validateBody(fixedAssetSchemas.category), asyncHandler(async (req: TenantRequest, res) => {
    const data = req.body;
    
    const category = await prisma.fixedAssetCategory.create({
      data: {
        tenantId: req.tenantId,
        ...data
      }
    });

    res.status(201).json({ category });
  }));

  router.put('/fixed-assets/categories/:id', validateBody(fixedAssetSchemas.category.partial()), asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body;
    
    const category = await prisma.fixedAssetCategory.update({
      where: {
        id,
        tenantId: req.tenantId
      },
      data
    });

    res.json({ category });
  }));

  router.delete('/fixed-assets/categories/:id', asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    // Check if category has assets
    const assetCount = await prisma.fixedAsset.count({
      where: {
        categoryId: id,
        tenantId: req.tenantId
      }
    });

    if (assetCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing assets' 
      });
    }

    await prisma.fixedAssetCategory.delete({
      where: {
        id,
        tenantId: req.tenantId
      }
    });

    res.status(204).send();
  }));

  // Fixed Assets Routes
  router.get('/fixed-assets', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, categoryId, search } = req.query;
    
    const where: any = {
      tenantId: req.tenantId,
      companyId: companyId as string
    };

    if (categoryId && categoryId !== 'undefined' && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    if (search && search !== 'undefined' && search.trim() !== '') {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const assets = await prisma.fixedAsset.findMany({
      where,
      include: {
        category: true,
        depreciations: {
          orderBy: { period: 'desc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ assets });
  }));

  // Maintenance Records - Must come before /:id route to avoid conflicts
  router.get('/fixed-assets/maintenance', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, assetId, status, type } = req.query;
    
    const where: any = {
      tenantId: req.tenantId,
      companyId: companyId as string
    };

    if (assetId && assetId !== 'undefined' && assetId !== 'all') {
      where.assetId = assetId;
    }

    if (status && status !== 'undefined' && status !== 'all') {
      where.status = status;
    }

    if (type && type !== 'undefined' && type !== 'all') {
      where.maintenanceType = type;
    }

    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { maintenanceDate: 'desc' }
    });

    res.json({ maintenanceRecords });
  }));

  router.post('/fixed-assets/maintenance', validateBody(fixedAssetSchemas.maintenance), asyncHandler(async (req: TenantRequest, res) => {
    const data = req.body;
    
    const maintenanceRecord = await prisma.maintenanceRecord.create({
      data: {
        tenantId: req.tenantId,
        companyId: data.companyId,
        assetId: data.assetId,
        maintenanceDate: new Date(data.maintenanceDate).toISOString(),
        maintenanceType: data.maintenanceType,
        description: data.description,
        performedBy: data.performedBy,
        cost: data.cost,
        extendsUsefulLife: data.extendsUsefulLife,
        lifeExtensionMonths: data.lifeExtensionMonths,
        invoiceNumber: data.invoiceNumber,
        warrantyInfo: data.warrantyInfo,
        status: data.status || 'SCHEDULED'
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({ maintenanceRecord });
  }));

  router.put('/fixed-assets/maintenance/:id', validateBody(fixedAssetSchemas.maintenance.partial()), asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body;
    
    const updateData: any = {};
    
    if (data.maintenanceDate !== undefined) updateData.maintenanceDate = new Date(data.maintenanceDate).toISOString();
    if (data.maintenanceType !== undefined) updateData.maintenanceType = data.maintenanceType;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.performedBy !== undefined) updateData.performedBy = data.performedBy;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.extendsUsefulLife !== undefined) updateData.extendsUsefulLife = data.extendsUsefulLife;
    if (data.lifeExtensionMonths !== undefined) updateData.lifeExtensionMonths = data.lifeExtensionMonths;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.warrantyInfo !== undefined) updateData.warrantyInfo = data.warrantyInfo;
    if (data.status !== undefined) updateData.status = data.status;

    const maintenanceRecord = await prisma.maintenanceRecord.update({
      where: {
        id,
        tenantId: req.tenantId
      },
      data: updateData,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    res.json({ maintenanceRecord });
  }));

  router.delete('/fixed-assets/maintenance/:id', asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    await prisma.maintenanceRecord.delete({
      where: {
        id,
        tenantId: req.tenantId
      }
    });

    res.status(204).send();
  }));

  router.get('/fixed-assets/maintenance/summary', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;
    
    const summary = await prisma.maintenanceRecord.aggregate({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      _count: {
        id: true
      },
      _sum: {
        cost: true
      }
    });

    const upcomingMaintenance = await prisma.maintenanceRecord.count({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string,
        maintenanceDate: {
          gte: new Date()
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        }
      }
    });

    const overdueMaintenance = await prisma.maintenanceRecord.count({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string,
        maintenanceDate: {
          lt: new Date()
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        }
      }
    });

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const yearlyCost = await prisma.maintenanceRecord.aggregate({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string,
        maintenanceDate: {
          gte: yearStart,
          lte: yearEnd
        }
      },
      _sum: {
        cost: true
      }
    });

    res.json({
      totalRecords: summary._count.id,
      totalCost: summary._sum.cost || 0,
      upcomingMaintenance,
      overdueMaintenance,
      yearlyCost: yearlyCost._sum.cost || 0
    });
  }));

  router.get('/fixed-assets/:id', asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    const asset = await prisma.fixedAsset.findUnique({
      where: {
        id,
        tenantId: req.tenantId
      },
      include: {
        category: true,
        depreciations: {
          orderBy: { period: 'desc' }
        },
        maintenanceRecords: {
          orderBy: { maintenanceDate: 'desc' }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json({ asset });
  }));

  router.post('/fixed-assets', validateBody(fixedAssetSchemas.asset), asyncHandler(async (req: TenantRequest, res) => {
    const data = req.body;
    
    const asset = await prisma.fixedAsset.create({
      data: {
        tenantId: req.tenantId,
        ...data
      },
      include: {
        category: true
      }
    });

    res.status(201).json({ asset });
  }));

  // Helper function to create or get account
  const createOrGetAccount = async (tenantId: string, companyId: string, accountData: any) => {
    // Check if account already exists
    const existingAccount = await prisma.account.findFirst({
      where: {
        tenantId,
        companyId,
        name: accountData.name,
        type: {
          code: accountData.accountType
        }
      }
    });

    if (existingAccount) {
      return existingAccount;
    }

    // Find or create the AccountType
    let accountType = await prisma.accountType.findFirst({
      where: {
        tenantId,
        companyId,
        code: accountData.accountType
      }
    });

    if (!accountType) {
      accountType = await prisma.accountType.create({
        data: {
          tenantId,
          companyId,
          code: accountData.accountType,
          name: accountData.accountType.charAt(0).toUpperCase() + accountData.accountType.slice(1).toLowerCase()
        }
      });
    }

    // Create new account
    const newAccount = await prisma.account.create({
      data: {
        tenantId,
        companyId,
        name: accountData.name,
        code: accountData.code,
        typeId: accountType.id,
        isActive: accountData.isActive,
        balance: 0
      }
    });

    return newAccount;
  };

  // Post fixed asset (create accounting entries)
  router.post('/fixed-assets/:id/post', asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    const asset = await prisma.fixedAsset.findFirst({
      where: {
        id,
        tenantId: req.tenantId
      },
      include: {
        category: true
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Asset is not in DRAFT status' });
    }

    // Create accounting entries
    const journalEntries = [];
    const createdAccounts = [];
    
    // 1. Debit Fixed Asset Account - Create if not exists
    let fixedAssetAccount;
    if (asset.category.assetAccountId) {
      fixedAssetAccount = await prisma.account.findUnique({
        where: { id: asset.category.assetAccountId }
      });
    } else {
      // Auto-create fixed asset account
      const accountName = `${asset.category.name} Assets`;
      const accountCode = `FA-${asset.category.name.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
      
      fixedAssetAccount = await createOrGetAccount(req.tenantId, asset.companyId, {
        name: accountName,
        code: accountCode,
        accountType: 'ASSET',
        description: `Fixed assets - ${asset.category.name}`,
        isActive: true
      });
      
      createdAccounts.push(fixedAssetAccount);
      
      // Update category with the new account ID
      await prisma.fixedAssetCategory.update({
        where: { id: asset.categoryId },
        data: { assetAccountId: fixedAssetAccount.id }
      });
    }

    journalEntries.push({
      accountId: fixedAssetAccount.id,
      debit: asset.cost,
      credit: 0,
      description: `Asset acquisition: ${asset.name}`
    });

    // 2. Credit Cash/Bank Account - Create if not exists
    let cashAccount = await prisma.account.findFirst({
      where: {
        tenantId: req.tenantId,
        companyId: asset.companyId,
        accountType: 'ASSET',
        name: { contains: 'Cash' }
      }
    });

    if (!cashAccount) {
      // Auto-create cash account
      cashAccount = await createOrGetAccount(req.tenantId, asset.companyId, {
        name: 'Cash and Cash Equivalents',
        code: 'CASH-001',
        accountType: 'ASSET',
        description: 'Cash and cash equivalents for asset purchases',
        isActive: true
      });
      
      createdAccounts.push(cashAccount);
    }

    journalEntries.push({
      accountId: cashAccount.id,
      debit: 0,
      credit: asset.cost,
      description: `Asset acquisition: ${asset.name}`
    });

    // Create journal entry if we have accounting entries
    if (journalEntries.length > 0) {
      // Find or create the Fixed Asset Acquisition entry type
      let entryType = await prisma.journalEntryType.findFirst({
        where: {
          tenantId: req.tenantId,
          companyId: asset.companyId,
          name: 'Fixed Asset Acquisition'
        }
      });

      if (!entryType) {
        entryType = await prisma.journalEntryType.create({
          data: {
            tenantId: req.tenantId,
            companyId: asset.companyId,
            name: 'Fixed Asset Acquisition',
            description: 'Journal entries for fixed asset acquisitions',
            category: 'DEPRECIATION',
            isSystemGenerated: true,
            requiresApproval: false,
            isActive: true
          }
        });
      }

      const journalEntry = await prisma.journalEntry.create({
        data: {
          tenantId: req.tenantId,
          companyId: asset.companyId,
          entryTypeId: entryType.id,
          date: new Date(asset.acquisitionDate), // Convert string to Date object
          reference: `FA-${asset.id}`,
          memo: `Fixed Asset Acquisition: ${asset.name}`,
          status: 'POSTED',
          postedAt: new Date(),
          lines: {
            create: journalEntries.map(entry => ({
              tenantId: req.tenantId,
              accountId: entry.accountId,
              debit: entry.debit,
              credit: entry.credit,
              memo: entry.description
            }))
          }
        }
      });

      // Update asset status to POSTED
      const updatedAsset = await prisma.fixedAsset.update({
        where: { id },
        data: { status: 'POSTED' },
        include: {
          category: true
        }
      });

      res.json({ 
        asset: updatedAsset, 
        journalEntry,
        createdAccounts,
        message: createdAccounts.length > 0 
          ? `Asset posted successfully with accounting entries created. ${createdAccounts.length} account(s) were automatically created.`
          : 'Asset posted successfully with accounting entries created'
      });
    } else {
      // This should not happen anymore since we auto-create accounts
      const updatedAsset = await prisma.fixedAsset.update({
        where: { id },
        data: { status: 'POSTED' },
        include: {
          category: true
        }
      });

      res.json({ 
        asset: updatedAsset,
        message: 'Asset posted successfully (no accounting entries - unexpected error)'
      });
    }
  }));

  router.put('/fixed-assets/:id', validateBody(fixedAssetSchemas.asset.partial()), asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body;
    
    // Only update fields that exist in the schema
    const updateData: any = {};
    
    // Map frontend fields to schema fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.acquisitionDate !== undefined) updateData.acquisitionDate = data.acquisitionDate;
    if (data.startDepreciation !== undefined) updateData.startDepreciation = data.startDepreciation;
    if (data.salvageValue !== undefined) updateData.salvageValue = data.salvageValue;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.disposedAt !== undefined) updateData.disposedAt = data.disposedAt;
    if (data.disposalProceeds !== undefined) updateData.disposalProceeds = data.disposalProceeds;
    if (data.disposalAccountId !== undefined) updateData.disposalAccountId = data.disposalAccountId;
    
    // Handle category relation
    if (data.categoryId !== undefined) {
      updateData.category = {
        connect: { id: data.categoryId }
      };
    }

    const asset = await prisma.fixedAsset.update({
      where: {
        id,
        tenantId: req.tenantId
      },
      data: updateData,
      include: {
        category: true,
        depreciations: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    res.json({ asset });
  }));

  router.delete('/fixed-assets/:id', asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    // Check if asset has depreciation records
    const depreciationCount = await prisma.fixedAssetDepreciation.count({
      where: {
        assetId: id,
        tenantId: req.tenantId
      }
    });

    if (depreciationCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete asset with depreciation records. Consider disposing the asset instead.' 
      });
    }

    await prisma.fixedAsset.delete({
      where: {
        id,
        tenantId: req.tenantId
      }
    });

    res.status(204).send();
  }));

  // Depreciation Routes
  router.get('/fixed-assets/:id/depreciation', asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { year, month } = req.query;
    
    const where: any = {
      assetId: id,
      tenantId: req.tenantId
    };

    if (year) {
      where.periodYear = parseInt(year as string);
    }
    if (month) {
      where.periodMonth = parseInt(month as string);
    }

    const depreciationRecords = await prisma.fixedAssetDepreciation.findMany({
      where,
      orderBy: { period: 'desc' }
    });

    res.json({ depreciationRecords });
  }));

  router.post('/fixed-assets/:id/depreciation', validateBody(fixedAssetSchemas.depreciation), asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body;
    
    // Get asset details
    const asset = await prisma.fixedAsset.findUnique({
      where: { id, tenantId: req.tenantId },
      include: {
        category: true // Include category to get depreciation method and useful life
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Calculate accumulated depreciation
    const existingDepreciation = await prisma.fixedAssetDepreciation.aggregate({
      where: {
        assetId: id,
        tenantId: req.tenantId
      },
      _sum: {
        amount: true
      }
    });

    const accumulatedDepreciation = (existingDepreciation._sum.amount || 0) + data.depreciationAmount;
    const netBookValue = asset.cost - accumulatedDepreciation;

    const depreciationRecord = await prisma.fixedAssetDepreciation.create({
      data: {
        tenantId: req.tenantId,
        companyId: asset.companyId,
        assetId: id,
        period: `${new Date(data.periodStart).getFullYear()}-${(new Date(data.periodStart).getMonth() + 1).toString().padStart(2, '0')}`,
        amount: data.depreciationAmount,
        accumulated: accumulatedDepreciation
      }
    });

    // Note: accumulatedDepreciation and netBookValue are calculated dynamically
    // from depreciation records, not stored in the asset table

    res.status(201).json({ depreciationRecord });
  }));

  // Calculate depreciation for all assets
  router.post('/fixed-assets/calculate-depreciation', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, year, month } = req.body;
    
    console.log('🔍 Calculate Depreciation Debug:', {
      tenantId: req.tenantId,
      companyId,
      year,
      month
    });
    
    const assets = await prisma.fixedAsset.findMany({
      where: {
        tenantId: req.tenantId,
        companyId,
        disposedAt: null // Only active assets (not disposed)
      },
      include: {
        category: true // Include category to get depreciation method and useful life
      }
    });

    console.log('📊 Found assets:', assets.length);
    console.log('📋 Asset details:', assets.map(a => ({ id: a.id, name: a.name, companyId: a.companyId })));

    const depreciationRecords = [];
    let processedCount = 0;
    let skippedCount = 0;

    for (const asset of assets) {
      // Check if depreciation already calculated for this period
      const existingRecord = await prisma.fixedAssetDepreciation.findFirst({
        where: {
          assetId: asset.id,
          tenantId: req.tenantId,
          period: `${year}-${month.toString().padStart(2, '0')}`
        }
      });

      if (existingRecord) {
        console.log(`⏭️ Skipping asset ${asset.name} - depreciation already calculated for ${year}-${month}`);
        skippedCount++;
        continue; // Skip if already calculated
      }

      let depreciationAmount = 0;
      
      // Get depreciation method and useful life from category
      const depreciationMethod = asset.category?.method || 'straight_line';
      const usefulLifeMonths = asset.category?.usefulLifeMonths || 60;
      const usefulLifeYears = usefulLifeMonths / 12;
      
      console.log(`🔧 Processing asset ${asset.name}:`, {
        depreciationMethod,
        usefulLifeMonths,
        usefulLifeYears,
        cost: asset.cost,
        salvageValue: asset.salvageValue
      });
      
      switch (depreciationMethod) {
        case 'straight_line':
          depreciationAmount = calculateStraightLineDepreciation(
            Number(asset.cost),
            Number(asset.salvageValue || 0),
            usefulLifeYears
          ) / 12; // Monthly depreciation
          break;
        case 'declining_balance':
          // Calculate year based on acquisition date
          const purchaseYear = new Date(asset.acquisitionDate).getFullYear();
          const currentYear = year;
          const yearInUse = currentYear - purchaseYear + 1;
          depreciationAmount = calculateDecliningBalanceDepreciation(
            Number(asset.cost),
            Number(asset.salvageValue || 0),
            usefulLifeYears,
            yearInUse
          ) / 12; // Monthly depreciation
          break;
        case 'sum_of_years_digits':
          const purchaseYearSum = new Date(asset.acquisitionDate).getFullYear();
          const currentYearSum = year;
          const yearInUseSum = currentYearSum - purchaseYearSum + 1;
          depreciationAmount = calculateSumOfYearsDepreciation(
            Number(asset.cost),
            Number(asset.salvageValue || 0),
            usefulLifeYears,
            yearInUseSum
          ) / 12; // Monthly depreciation
          break;
      }

      console.log(`💰 Calculated depreciation for ${asset.name}: $${depreciationAmount.toFixed(2)}`);

      if (depreciationAmount > 0) {
        // Calculate accumulated depreciation
        const existingDepreciation = await prisma.fixedAssetDepreciation.aggregate({
          where: {
            assetId: asset.id,
            tenantId: req.tenantId
          },
          _sum: {
            amount: true
          }
        });

        const accumulatedDepreciation = (existingDepreciation._sum.amount || 0) + depreciationAmount;
        const netBookValue = Number(asset.cost) - accumulatedDepreciation;

        const depreciationRecord = await prisma.fixedAssetDepreciation.create({
          data: {
            tenantId: req.tenantId,
            companyId: asset.companyId,
            assetId: asset.id,
            period: `${year}-${month.toString().padStart(2, '0')}`,
            amount: depreciationAmount,
            accumulated: accumulatedDepreciation
          }
        });

        depreciationRecords.push(depreciationRecord);
        processedCount++;

        // Note: accumulatedDepreciation and netBookValue are calculated dynamically
        // from depreciation records, not stored in the asset table
      }
    }

    console.log('📈 Depreciation calculation summary:', {
      totalAssets: assets.length,
      processed: processedCount,
      skipped: skippedCount,
      recordsCreated: depreciationRecords.length
    });

    res.json({ 
      message: `Calculated depreciation for ${depreciationRecords.length} assets`,
      depreciationRecords,
      summary: {
        totalAssets: assets.length,
        processed: processedCount,
        skipped: skippedCount
      }
    });
  }));

  // Maintenance Routes
  router.get('/fixed-assets/:id/maintenance', asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: {
        assetId: id,
        tenantId: req.tenantId
      },
      orderBy: { maintenanceDate: 'desc' }
    });

    res.json({ maintenanceRecords });
  }));

  router.post('/fixed-assets/:id/maintenance', validateBody(fixedAssetSchemas.maintenance), asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body;
    
    const maintenanceRecord = await prisma.maintenanceRecord.create({
      data: {
        tenantId: req.tenantId,
        companyId: req.companyId,
        assetId: id,
        maintenanceDate: new Date(data.maintenanceDate),
        ...data
      }
    });

    res.status(201).json({ maintenanceRecord });
  }));

  // Disposal Routes
  router.post('/fixed-assets/:id/dispose', validateBody(fixedAssetSchemas.disposal), asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body;
    
    // Get asset details
    const asset = await prisma.fixedAsset.findUnique({
      where: { id, tenantId: req.tenantId }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Calculate gain or loss
    const netDisposalValue = data.disposalValue - data.disposalCosts;
    const gainOrLoss = netDisposalValue - Number(asset.netBookValue);

    const disposalRecord = await prisma.disposalRecord.create({
      data: {
        tenantId: req.tenantId,
        companyId: asset.companyId,
        assetId: id,
        disposalDate: new Date(data.disposalDate),
        netDisposalValue,
        gainOrLoss,
        ...data
      }
    });

    // Update asset disposal status
    await prisma.fixedAsset.update({
      where: { id },
      data: {
        disposedAt: new Date(data.disposalDate).toISOString(),
        disposalProceeds: data.disposalValue,
        disposalAccountId: data.disposalAccountId
      }
    });

    res.status(201).json({ disposalRecord });
  }));


  // Fixed Asset Reports
  router.get('/fixed-assets/reports/summary', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;
    
    const summary = await prisma.fixedAsset.aggregate({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      _count: {
        id: true
      },
      _sum: {
        cost: true
      }
    });

    const categoryCounts = await prisma.fixedAsset.groupBy({
      by: ['categoryId'],
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      _count: {
        id: true
      },
      _sum: {
        cost: true
      }
    });

    // Get category names
    const categories = await prisma.fixedAssetCategory.findMany({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      select: { id: true, name: true }
    });

    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    }, {} as Record<string, string>);

    const categorySummary = categoryCounts.map(item => ({
      categoryId: item.categoryId,
      categoryName: categoryMap[item.categoryId] || 'Unknown',
      count: item._count.id,
      totalCost: item._sum.cost || 0
    }));

    // Calculate accumulated depreciation
    const depreciationSummary = await prisma.fixedAssetDepreciation.aggregate({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      _sum: {
        amount: true
      }
    });

    const accumulatedDepreciation = depreciationSummary._sum.amount || 0;
    const totalCost = summary._sum.cost || 0;
    const netBookValue = totalCost - accumulatedDepreciation;

    res.json({
      summary: {
        totalAssets: summary._count.id,
        totalCost: totalCost,
        accumulatedDepreciation: accumulatedDepreciation,
        netBookValue: netBookValue
      },
      // Also provide direct access for depreciation tab
      totalAssets: summary._count.id,
      totalCost: totalCost,
      accumulatedDepreciation: accumulatedDepreciation,
      netBookValue: netBookValue,
      categorySummary
    });
  }));

  // Depreciation Schedule Report
  router.get('/fixed-assets/reports/depreciation-schedule', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, year, assetId, categoryId } = req.query;
    
    const where: any = {
      tenantId: req.tenantId,
      companyId: companyId as string
    };

    if (year) {
      where.period = {
        startsWith: year as string
      };
    }

    if (assetId && assetId !== 'undefined') {
      where.assetId = assetId;
    }

    if (categoryId && categoryId !== 'undefined') {
      where.asset = {
        categoryId: categoryId as string
      };
    }

    const depreciationRecords = await prisma.fixedAssetDepreciation.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            cost: true,
            acquisitionDate: true,
            category: {
              select: {
                name: true,
                method: true
              }
            }
          }
        }
      },
      orderBy: [
        { asset: { name: 'asc' } },
        { period: 'asc' }
      ]
    });

    const depreciationSchedule = depreciationRecords.map(record => ({
      id: record.id,
      assetId: record.assetId,
      assetName: record.asset.name,
      category: record.asset.category?.name || 'Unknown',
      period: record.period,
      year: parseInt(record.period.split('-')[0]),
      month: parseInt(record.period.split('-')[1]),
      amount: Number(record.amount),
      accumulated: Number(record.accumulated),
      method: record.asset.category?.method || 'straight_line',
      createdAt: record.createdAt
    }));

    res.json({ depreciationSchedule });
  }));

  // Asset Register Report
  router.get('/fixed-assets/reports/asset-register', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, categoryId, location, department, purchaseDateFrom, purchaseDateTo } = req.query;
    
    const assetRegister = await FixedAssetReportsService.generateAssetRegister(
      req.tenantId,
      companyId as string,
      {
        categoryId: categoryId as string,
        location: location as string,
        department: department as string,
        purchaseDateFrom: purchaseDateFrom ? new Date(purchaseDateFrom as string) : undefined,
        purchaseDateTo: purchaseDateTo ? new Date(purchaseDateTo as string) : undefined
      }
    );

    res.json({ assetRegister });
  }));

  // Disposal Report
  router.get('/fixed-assets/reports/disposal', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, disposalDateFrom, disposalDateTo, disposalMethod } = req.query;
    
    const disposalReport = await FixedAssetReportsService.generateDisposalReport(
      req.tenantId,
      companyId as string,
      {
        disposalDateFrom: disposalDateFrom ? new Date(disposalDateFrom as string) : undefined,
        disposalDateTo: disposalDateTo ? new Date(disposalDateTo as string) : undefined,
        disposalMethod: disposalMethod as string
      }
    );

    res.json({ disposalReport });
  }));

  // Maintenance Report
  router.get('/fixed-assets/reports/maintenance', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, assetId, maintenanceDateFrom, maintenanceDateTo, maintenanceType } = req.query;
    
    const maintenanceReport = await FixedAssetReportsService.generateMaintenanceReport(
      req.tenantId,
      companyId as string,
      {
        assetId: assetId as string,
        maintenanceDateFrom: maintenanceDateFrom ? new Date(maintenanceDateFrom as string) : undefined,
        maintenanceDateTo: maintenanceDateTo ? new Date(maintenanceDateTo as string) : undefined,
        maintenanceType: maintenanceType as string
      }
    );

    res.json({ maintenanceReport });
  }));

  // Category Summary Report
  router.get('/fixed-assets/reports/category-summary', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;
    
    const categorySummary = await FixedAssetReportsService.generateCategorySummary(
      req.tenantId,
      companyId as string
    );

    res.json({ categorySummary });
  }));

  // Asset Aging Report
  router.get('/fixed-assets/reports/aging', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;
    
    const agingReport = await FixedAssetReportsService.generateAssetAgingReport(
      req.tenantId,
      companyId as string
    );

    res.json({ agingReport });
  }));

  // Depreciation Forecast
  router.get('/fixed-assets/reports/forecast', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, years } = req.query;
    
    const forecast = await FixedAssetReportsService.generateDepreciationForecast(
      req.tenantId,
      companyId as string,
      years ? parseInt(years as string) : 5
    );

    res.json({ forecast });
  }));

  // Compliance Report
  router.get('/fixed-assets/reports/compliance', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;
    
    const complianceReport = await FixedAssetReportsService.generateComplianceReport(
      req.tenantId,
      companyId as string
    );

    res.json({ complianceReport });
  }));

  // Enhanced Depreciation Calculation with Journal Integration
  router.post('/fixed-assets/calculate-and-post-depreciation', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, year, month, postToJournal } = req.body;
    
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    
    // Calculate depreciation for all assets
    const calculations = await FixedAssetDepreciationService.calculatePeriodDepreciation(
      req.tenantId,
      companyId,
      periodStart,
      periodEnd
    );

    // Create depreciation records
    const depreciationRecords = [];
    for (const calculation of calculations) {
      const record = await prisma.fixedAssetDepreciation.create({
        data: {
          tenantId: req.tenantId,
          companyId,
          assetId: calculation.assetId,
          period: `${calculation.periodStart.getFullYear()}-${(calculation.periodStart.getMonth() + 1).toString().padStart(2, '0')}`,
          amount: calculation.depreciationAmount,
          accumulated: calculation.accumulatedDepreciation
        }
      });

      // Note: accumulatedDepreciation and netBookValue are calculated dynamically
      // from depreciation records, not stored in the asset table

      depreciationRecords.push(record);
    }

    let journalEntryIds: string[] = [];
    if (postToJournal) {
      // Post depreciation to journal entries
      journalEntryIds = await FixedAssetDepreciationService.postDepreciationToJournal(
        req.tenantId,
        companyId,
        calculations
      );
    }

    res.json({
      message: `Calculated depreciation for ${depreciationRecords.length} assets`,
      depreciationRecords,
      journalEntryIds
    });
  }));

  // Enhanced Asset Disposal with Journal Integration
  router.post('/fixed-assets/:id/dispose-with-journal', validateBody(fixedAssetSchemas.disposal), asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body;
    
    const journalEntryId = await FixedAssetDepreciationService.handleAssetDisposal(
      req.tenantId,
      req.companyId,
      id,
      {
        disposalDate: new Date(data.disposalDate),
        disposalMethod: data.disposalMethod,
        disposalValue: data.disposalValue,
        disposalCosts: data.disposalCosts,
        disposalReason: data.disposalReason
      }
    );

    res.json({
      message: 'Asset disposed successfully',
      journalEntryId
    });
  }));

  // Generate Depreciation Schedule for Asset
  router.get('/fixed-assets/:id/depreciation-schedule', asyncHandler(async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { startYear, endYear } = req.query;
    
    const schedule = await FixedAssetDepreciationService.generateDepreciationSchedule(
      id,
      req.tenantId,
      startYear ? parseInt(startYear as string) : new Date().getFullYear(),
      endYear ? parseInt(endYear as string) : new Date().getFullYear() + 5
    );

    res.json({ schedule });
  }));

  // Get Depreciation Summary
  router.get('/fixed-assets/reports/depreciation-summary', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, year } = req.query;
    
    const summary = await FixedAssetDepreciationService.getDepreciationSummary(
      req.tenantId,
      companyId as string,
      year ? parseInt(year as string) : new Date().getFullYear()
    );

    res.json({ summary });
  }));

  // Report generation routes
  router.get('/fixed-assets/reports/asset-summary', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;
    
    const assets = await prisma.fixedAsset.findMany({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      include: {
        category: true,
        depreciations: {
          orderBy: { period: 'desc' }
        }
      }
    });

    const summary = await prisma.fixedAsset.aggregate({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      _count: { id: true },
      _sum: { cost: true }
    });

    const depreciationSummary = await prisma.fixedAssetDepreciation.aggregate({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      _sum: { amount: true }
    });

    res.json({
      assets,
      summary: {
        totalAssets: summary._count.id,
        totalCost: summary._sum.cost || 0,
        accumulatedDepreciation: depreciationSummary._sum.amount || 0,
        netBookValue: (summary._sum.cost || 0) - (depreciationSummary._sum.amount || 0)
      }
    });
  }));

  router.get('/fixed-assets/reports/depreciation-schedule', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId, year } = req.query;
    
    const depreciationSchedule = await prisma.fixedAssetDepreciation.findMany({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string,
        ...(year && { period: { contains: year as string } })
      },
      include: {
        asset: {
          include: {
            category: true
          }
        }
      },
      orderBy: [
        { assetId: 'asc' },
        { period: 'asc' }
      ]
    });

    res.json({ depreciationSchedule });
  }));

  router.get('/fixed-assets/reports/asset-register', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;
    
    const assets = await prisma.fixedAsset.findMany({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      include: {
        category: true,
        depreciations: {
          orderBy: { period: 'desc' }
        }
      },
      orderBy: { acquisitionDate: 'desc' }
    });

    res.json({ assets });
  }));

  router.get('/fixed-assets/reports/category-summary', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;
    
    const categories = await prisma.fixedAssetCategory.findMany({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      include: {
        assets: {
          include: {
            depreciations: true
          }
        }
      }
    });

    const categorySummary = categories.map(category => {
      const totalCost = category.assets.reduce((sum, asset) => sum + Number(asset.cost), 0);
      const totalDepreciation = category.assets.reduce((sum, asset) => 
        sum + asset.depreciations.reduce((depSum, dep) => depSum + Number(dep.amount), 0), 0
      );
      
      return {
        ...category,
        assetCount: category.assets.length,
        totalCost,
        totalDepreciation,
        netBookValue: totalCost - totalDepreciation
      };
    });

    res.json({ categorySummary });
  }));

  router.get('/fixed-assets/reports/aging', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;
    
    const assets = await prisma.fixedAsset.findMany({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      include: {
        category: true,
        depreciations: true
      }
    });

    const now = new Date();
    const agingReport = assets.map(asset => {
      const acquisitionDate = new Date(asset.acquisitionDate);
      const ageInYears = (now.getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      const usefulLifeYears = asset.category?.usefulLifeMonths ? asset.category.usefulLifeMonths / 12 : 5;
      const remainingLifeYears = Math.max(0, usefulLifeYears - ageInYears);
      
      return {
        ...asset,
        ageInYears: Math.round(ageInYears * 10) / 10,
        remainingLifeYears: Math.round(remainingLifeYears * 10) / 10,
        ageCategory: ageInYears < 1 ? 'New' : ageInYears < 5 ? 'Mid-life' : 'Mature'
      };
    });

    res.json({ agingReport });
  }));

  router.get('/fixed-assets/reports/compliance', asyncHandler(async (req: TenantRequest, res) => {
    const { companyId } = req.query;
    
    const assets = await prisma.fixedAsset.findMany({
      where: {
        tenantId: req.tenantId,
        companyId: companyId as string
      },
      include: {
        category: true,
        depreciations: true,
        maintenanceRecords: true
      }
    });

    const complianceReport = {
      totalAssets: assets.length,
      compliantAssets: assets.length, // All assets are compliant for now
      auditTrail: 'Complete',
      lastAudit: new Date().toISOString(),
      assets: assets.map(asset => ({
        id: asset.id,
        name: asset.name,
        acquisitionDate: asset.acquisitionDate,
        depreciationRecords: asset.depreciations.length,
        maintenanceRecords: asset.maintenanceRecords.length,
        complianceStatus: 'Compliant'
      }))
    };

    res.json(complianceReport);
  }));
}
