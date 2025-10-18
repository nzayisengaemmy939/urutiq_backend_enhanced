import { prisma } from '../prisma.js';
import { TenantRequest } from '../tenant.js';

export interface FixedAssetReport {
  assetId: string;
  assetNumber: string;
  assetName: string;
  category: string;
  purchaseDate: Date;
  purchaseCost: number;
  usefulLifeYears: number;
  depreciationMethod: string;
  accumulatedDepreciation: number;
  netBookValue: number;
  status: string;
  location?: string;
  department?: string;
  custodian?: string;
}

export interface DepreciationScheduleReport {
  assetId: string;
  assetNumber: string;
  assetName: string;
  year: number;
  month: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  netBookValue: number;
}

export interface AssetDisposalReport {
  assetId: string;
  assetNumber: string;
  assetName: string;
  disposalDate: Date;
  disposalMethod: string;
  originalCost: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  disposalValue: number;
  gainOrLoss: number;
}

export interface MaintenanceReport {
  assetId: string;
  assetNumber: string;
  assetName: string;
  maintenanceDate: Date;
  maintenanceType: string;
  description: string;
  cost: number;
  performedBy?: string;
}

export class FixedAssetReportsService {
  /**
   * Generate comprehensive fixed asset register
   */
  static async generateAssetRegister(
    tenantId: string,
    companyId: string,
    filters: {
      status?: string;
      categoryId?: string;
      location?: string;
      department?: string;
      purchaseDateFrom?: Date;
      purchaseDateTo?: Date;
    } = {}
  ): Promise<FixedAssetReport[]> {
    const where: any = {
      tenantId,
      companyId
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.department) {
      where.department = { contains: filters.department, mode: 'insensitive' };
    }

    if (filters.purchaseDateFrom || filters.purchaseDateTo) {
      where.purchaseDate = {};
      if (filters.purchaseDateFrom) {
        where.purchaseDate.gte = filters.purchaseDateFrom;
      }
      if (filters.purchaseDateTo) {
        where.purchaseDate.lte = filters.purchaseDateTo;
      }
    }

    const assets = await prisma.fixedAsset.findMany({
      where,
      include: {
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { category: { name: 'asc' } },
        { assetNumber: 'asc' }
      ]
    });

    return assets.map(asset => ({
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      assetName: asset.name,
      category: asset.category.name,
      purchaseDate: asset.purchaseDate,
      purchaseCost: Number(asset.purchaseCost),
      usefulLifeYears: asset.usefulLifeYears,
      depreciationMethod: asset.depreciationMethod,
      accumulatedDepreciation: Number(asset.accumulatedDepreciation),
      netBookValue: Number(asset.netBookValue),
      status: asset.status,
      location: asset.location,
      department: asset.department,
      custodian: asset.custodian
    }));
  }

  /**
   * Generate depreciation schedule report
   */
  static async generateDepreciationSchedule(
    tenantId: string,
    companyId: string,
    year: number,
    filters: {
      assetId?: string;
      categoryId?: string;
      status?: string;
    } = {}
  ): Promise<DepreciationScheduleReport[]> {
    const where: any = {
      tenantId,
      companyId
    };

    if (year) {
      where.period = {
        startsWith: year.toString()
      };
    }

    if (filters.assetId) {
      where.assetId = filters.assetId;
    }

    if (filters.categoryId) {
      where.asset = {
        categoryId: filters.categoryId
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
            category: {
              select: {
                name: true
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

    return depreciationRecords.map(record => ({
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
  }

  /**
   * Generate asset disposal report
   */
  static async generateDisposalReport(
    tenantId: string,
    companyId: string,
    filters: {
      disposalDateFrom?: Date;
      disposalDateTo?: Date;
      disposalMethod?: string;
    } = {}
  ): Promise<AssetDisposalReport[]> {
    const where: any = {
      tenantId,
      companyId
    };

    if (filters.disposalDateFrom || filters.disposalDateTo) {
      where.disposalDate = {};
      if (filters.disposalDateFrom) {
        where.disposalDate.gte = filters.disposalDateFrom;
      }
      if (filters.disposalDateTo) {
        where.disposalDate.lte = filters.disposalDateTo;
      }
    }

    if (filters.disposalMethod) {
      where.disposalMethod = filters.disposalMethod;
    }

    const disposalRecords = await prisma.disposalRecord.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true,
            purchaseCost: true,
            accumulatedDepreciation: true,
            netBookValue: true
          }
        }
      },
      orderBy: { disposalDate: 'desc' }
    });

    return disposalRecords.map(record => ({
      assetId: record.assetId,
      assetNumber: record.asset.assetNumber,
      assetName: record.asset.name,
      disposalDate: record.disposalDate,
      disposalMethod: record.disposalMethod,
      originalCost: Number(record.asset.purchaseCost),
      accumulatedDepreciation: Number(record.asset.accumulatedDepreciation),
      netBookValue: Number(record.asset.netBookValue),
      disposalValue: Number(record.disposalValue),
      gainOrLoss: Number(record.gainOrLoss)
    }));
  }

  /**
   * Generate maintenance report
   */
  static async generateMaintenanceReport(
    tenantId: string,
    companyId: string,
    filters: {
      assetId?: string;
      maintenanceDateFrom?: Date;
      maintenanceDateTo?: Date;
      maintenanceType?: string;
    } = {}
  ): Promise<MaintenanceReport[]> {
    const where: any = {
      tenantId,
      companyId
    };

    if (filters.assetId) {
      where.assetId = filters.assetId;
    }

    if (filters.maintenanceDateFrom || filters.maintenanceDateTo) {
      where.maintenanceDate = {};
      if (filters.maintenanceDateFrom) {
        where.maintenanceDate.gte = filters.maintenanceDateFrom;
      }
      if (filters.maintenanceDateTo) {
        where.maintenanceDate.lte = filters.maintenanceDateTo;
      }
    }

    if (filters.maintenanceType) {
      where.maintenanceType = filters.maintenanceType;
    }

    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true
          }
        }
      },
      orderBy: { maintenanceDate: 'desc' }
    });

    return maintenanceRecords.map(record => ({
      assetId: record.assetId,
      assetNumber: record.asset.assetNumber,
      assetName: record.asset.name,
      maintenanceDate: record.maintenanceDate,
      maintenanceType: record.maintenanceType,
      description: record.description,
      cost: Number(record.cost),
      performedBy: record.performedBy
    }));
  }

  /**
   * Generate asset summary by category
   */
  static async generateCategorySummary(
    tenantId: string,
    companyId: string
  ): Promise<{
    categoryId: string;
    categoryName: string;
    assetCount: number;
    totalCost: number;
    totalDepreciation: number;
    netBookValue: number;
  }[]> {
    const assets = await prisma.fixedAsset.findMany({
      where: {
        tenantId,
        companyId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const categoryMap = new Map<string, {
      categoryId: string;
      categoryName: string;
      assetCount: number;
      totalCost: number;
      totalDepreciation: number;
      netBookValue: number;
    }>();

    assets.forEach(asset => {
      const categoryId = asset.categoryId;
      const categoryName = asset.category.name;

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          categoryId,
          categoryName,
          assetCount: 0,
          totalCost: 0,
          totalDepreciation: 0,
          netBookValue: 0
        });
      }

      const categoryData = categoryMap.get(categoryId)!;
      categoryData.assetCount++;
      categoryData.totalCost += Number(asset.purchaseCost);
      categoryData.totalDepreciation += Number(asset.accumulatedDepreciation);
      categoryData.netBookValue += Number(asset.netBookValue);
    });

    return Array.from(categoryMap.values()).sort((a, b) => 
      a.categoryName.localeCompare(b.categoryName)
    );
  }

  /**
   * Generate asset aging report
   */
  static async generateAssetAgingReport(
    tenantId: string,
    companyId: string
  ): Promise<{
    assetId: string;
    assetNumber: string;
    assetName: string;
    purchaseDate: Date;
    ageInYears: number;
    remainingLifeYears: number;
    depreciationPercentage: number;
    status: string;
  }[]> {
    const assets = await prisma.fixedAsset.findMany({
      where: {
        tenantId,
        companyId
      },
      select: {
        id: true,
        assetNumber: true,
        name: true,
        purchaseDate: true,
        usefulLifeYears: true,
        purchaseCost: true,
        accumulatedDepreciation: true,
        status: true
      }
    });

    const currentDate = new Date();

    return assets.map(asset => {
      const ageInYears = Math.floor(
        (currentDate.getTime() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      );
      const remainingLifeYears = Math.max(0, asset.usefulLifeYears - ageInYears);
      const depreciationPercentage = Number(asset.accumulatedDepreciation) / Number(asset.purchaseCost) * 100;

      return {
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        assetName: asset.name,
        purchaseDate: asset.purchaseDate,
        ageInYears,
        remainingLifeYears,
        depreciationPercentage,
        status: asset.status
      };
    }).sort((a, b) => b.ageInYears - a.ageInYears);
  }

  /**
   * Generate depreciation forecast
   */
  static async generateDepreciationForecast(
    tenantId: string,
    companyId: string,
    forecastYears: number = 5
  ): Promise<{
    year: number;
    totalDepreciation: number;
    assetCount: number;
    categoryBreakdown: { categoryName: string; depreciation: number }[];
  }[]> {
    const assets = await prisma.fixedAsset.findMany({
      where: {
        tenantId,
        companyId,
        status: 'ACTIVE'
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    const currentYear = new Date().getFullYear();
    const forecast: any[] = [];

    for (let year = currentYear; year < currentYear + forecastYears; year++) {
      const yearData = {
        year,
        totalDepreciation: 0,
        assetCount: 0,
        categoryBreakdown: new Map<string, number>()
      };

      assets.forEach(asset => {
        const purchaseYear = asset.purchaseDate.getFullYear();
        const assetAge = year - purchaseYear;
        
        // Skip if asset is beyond its useful life
        if (assetAge >= asset.usefulLifeYears) {
          return;
        }

        let annualDepreciation = 0;
        
        switch (asset.depreciationMethod) {
          case 'STRAIGHT_LINE':
            annualDepreciation = (Number(asset.purchaseCost) - Number(asset.salvageValue)) / asset.usefulLifeYears;
            break;
          case 'DECLINING_BALANCE':
            const rate = 2 / asset.usefulLifeYears;
            const bookValue = Number(asset.purchaseCost) * Math.pow(1 - rate, assetAge);
            annualDepreciation = bookValue * rate;
            break;
          case 'SUM_OF_YEARS':
            const remainingLife = asset.usefulLifeYears - assetAge;
            const sumOfYears = (asset.usefulLifeYears * (asset.usefulLifeYears + 1)) / 2;
            annualDepreciation = ((Number(asset.purchaseCost) - Number(asset.salvageValue)) * remainingLife) / sumOfYears;
            break;
        }

        yearData.totalDepreciation += annualDepreciation;
        yearData.assetCount++;

        const categoryName = asset.category.name;
        if (!yearData.categoryBreakdown.has(categoryName)) {
          yearData.categoryBreakdown.set(categoryName, 0);
        }
        yearData.categoryBreakdown.set(
          categoryName, 
          yearData.categoryBreakdown.get(categoryName)! + annualDepreciation
        );
      });

      forecast.push({
        ...yearData,
        categoryBreakdown: Array.from(yearData.categoryBreakdown.entries()).map(
          ([categoryName, depreciation]) => ({ categoryName, depreciation })
        )
      });
    }

    return forecast;
  }

  /**
   * Generate compliance report for asset tracking
   */
  static async generateComplianceReport(
    tenantId: string,
    companyId: string
  ): Promise<{
    totalAssets: number;
    assetsWithMissingInfo: number;
    assetsRequiringMaintenance: number;
    assetsNearEndOfLife: number;
    complianceIssues: {
      assetId: string;
      assetNumber: string;
      assetName: string;
      issue: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
    }[];
  }> {
    const assets = await prisma.fixedAsset.findMany({
      where: {
        tenantId,
        companyId
      },
      include: {
        maintenanceRecords: {
          orderBy: { maintenanceDate: 'desc' },
          take: 1
        }
      }
    });

    const currentDate = new Date();
    const complianceIssues: any[] = [];
    let assetsWithMissingInfo = 0;
    let assetsRequiringMaintenance = 0;
    let assetsNearEndOfLife = 0;

    assets.forEach(asset => {
      // Check for missing information
      const missingInfo = [];
      if (!asset.location) missingInfo.push('Location');
      if (!asset.department) missingInfo.push('Department');
      if (!asset.custodian) missingInfo.push('Custodian');
      if (!asset.serialNumber) missingInfo.push('Serial Number');

      if (missingInfo.length > 0) {
        assetsWithMissingInfo++;
        complianceIssues.push({
          assetId: asset.id,
          assetNumber: asset.assetNumber,
          assetName: asset.name,
          issue: `Missing: ${missingInfo.join(', ')}`,
          severity: 'MEDIUM' as const
        });
      }

      // Check for maintenance requirements
      const lastMaintenance = asset.maintenanceRecords[0];
      if (lastMaintenance) {
        const daysSinceMaintenance = Math.floor(
          (currentDate.getTime() - lastMaintenance.maintenanceDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceMaintenance > 365) { // More than a year
          assetsRequiringMaintenance++;
          complianceIssues.push({
            assetId: asset.id,
            assetNumber: asset.assetNumber,
            assetName: asset.name,
            issue: `No maintenance in ${Math.floor(daysSinceMaintenance / 365)} years`,
            severity: 'HIGH' as const
          });
        }
      } else {
        assetsRequiringMaintenance++;
        complianceIssues.push({
          assetId: asset.id,
          assetNumber: asset.assetNumber,
          assetName: asset.name,
          issue: 'No maintenance records',
          severity: 'MEDIUM' as const
        });
      }

      // Check for assets near end of life
      const ageInYears = Math.floor(
        (currentDate.getTime() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      );
      const remainingLifePercentage = ((asset.usefulLifeYears - ageInYears) / asset.usefulLifeYears) * 100;
      
      if (remainingLifePercentage < 20 && remainingLifePercentage > 0) {
        assetsNearEndOfLife++;
        complianceIssues.push({
          assetId: asset.id,
          assetNumber: asset.assetNumber,
          assetName: asset.name,
          issue: `Near end of life (${Math.floor(remainingLifePercentage)}% remaining)`,
          severity: 'LOW' as const
        });
      }
    });

    return {
      totalAssets: assets.length,
      assetsWithMissingInfo,
      assetsRequiringMaintenance,
      assetsNearEndOfLife,
      complianceIssues
    };
  }
}
