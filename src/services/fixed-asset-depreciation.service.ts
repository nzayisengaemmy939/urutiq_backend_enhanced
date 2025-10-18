import { prisma } from '../prisma.js';
import { TenantRequest } from '../tenant.js';

export interface DepreciationCalculation {
  assetId: string;
  periodStart: Date;
  periodEnd: Date;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  depreciationMethod: string;
  depreciationRate: number;
}

export interface DepreciationSchedule {
  year: number;
  month: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  netBookValue: number;
}

export class FixedAssetDepreciationService {
  /**
   * Calculate depreciation for a single asset using various methods
   */
  static calculateDepreciation(
    asset: any,
    periodStart: Date,
    periodEnd: Date,
    method: string = 'STRAIGHT_LINE'
  ): DepreciationCalculation {
    const cost = Number(asset.purchaseCost);
    const salvageValue = Number(asset.salvageValue);
    const usefulLifeYears = asset.usefulLifeYears;
    const purchaseDate = new Date(asset.purchaseDate);

    let depreciationAmount = 0;
    let depreciationRate = 0;

    switch (method) {
      case 'STRAIGHT_LINE':
        depreciationAmount = this.calculateStraightLineDepreciation(
          cost,
          salvageValue,
          usefulLifeYears,
          periodStart,
          periodEnd
        );
        depreciationRate = ((cost - salvageValue) / usefulLifeYears) / cost * 100;
        break;

      case 'DECLINING_BALANCE':
        depreciationAmount = this.calculateDecliningBalanceDepreciation(
          cost,
          salvageValue,
          usefulLifeYears,
          purchaseDate,
          periodStart,
          periodEnd
        );
        depreciationRate = (2 / usefulLifeYears) * 100; // Double declining balance
        break;

      case 'SUM_OF_YEARS':
        depreciationAmount = this.calculateSumOfYearsDepreciation(
          cost,
          salvageValue,
          usefulLifeYears,
          purchaseDate,
          periodStart,
          periodEnd
        );
        depreciationRate = this.calculateSumOfYearsRate(usefulLifeYears, purchaseDate, periodStart);
        break;

      case 'UNITS_OF_PRODUCTION':
        depreciationAmount = this.calculateUnitsOfProductionDepreciation(
          cost,
          salvageValue,
          asset.totalUnits || 1,
          asset.unitsUsed || 0,
          periodStart,
          periodEnd
        );
        depreciationRate = ((cost - salvageValue) / (asset.totalUnits || 1)) * 100;
        break;

      default:
        throw new Error(`Unsupported depreciation method: ${method}`);
    }

    // Get existing accumulated depreciation
    const existingDepreciation = asset.accumulatedDepreciation || 0;
    const accumulatedDepreciation = existingDepreciation + depreciationAmount;
    const netBookValue = cost - accumulatedDepreciation;

    return {
      assetId: asset.id,
      periodStart,
      periodEnd,
      depreciationAmount,
      accumulatedDepreciation,
      netBookValue,
      depreciationMethod: method,
      depreciationRate
    };
  }

  /**
   * Calculate straight-line depreciation
   */
  private static calculateStraightLineDepreciation(
    cost: number,
    salvageValue: number,
    usefulLifeYears: number,
    periodStart: Date,
    periodEnd: Date
  ): number {
    const annualDepreciation = (cost - salvageValue) / usefulLifeYears;
    const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysInYear = 365;
    
    return (annualDepreciation * daysInPeriod) / daysInYear;
  }

  /**
   * Calculate declining balance depreciation
   */
  private static calculateDecliningBalanceDepreciation(
    cost: number,
    salvageValue: number,
    usefulLifeYears: number,
    purchaseDate: Date,
    periodStart: Date,
    periodEnd: Date
  ): number {
    const rate = 2 / usefulLifeYears; // Double declining balance
    const yearsSincePurchase = this.getYearsSincePurchase(purchaseDate, periodStart);
    
    // Calculate book value at the beginning of the period
    let bookValue = cost;
    for (let year = 1; year <= yearsSincePurchase; year++) {
      const yearDepreciation = bookValue * rate;
      bookValue = Math.max(bookValue - yearDepreciation, salvageValue);
    }

    const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysInYear = 365;
    
    const periodDepreciation = (bookValue * rate * daysInPeriod) / daysInYear;
    
    // Ensure we don't depreciate below salvage value
    return Math.max(periodDepreciation, salvageValue - bookValue);
  }

  /**
   * Calculate sum-of-years digits depreciation
   */
  private static calculateSumOfYearsDepreciation(
    cost: number,
    salvageValue: number,
    usefulLifeYears: number,
    purchaseDate: Date,
    periodStart: Date,
    periodEnd: Date
  ): number {
    const yearsSincePurchase = this.getYearsSincePurchase(purchaseDate, periodStart);
    const remainingLife = usefulLifeYears - yearsSincePurchase;
    
    if (remainingLife <= 0) {
      return 0;
    }

    const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
    const annualDepreciation = ((cost - salvageValue) * remainingLife) / sumOfYears;
    
    const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysInYear = 365;
    
    return (annualDepreciation * daysInPeriod) / daysInYear;
  }

  /**
   * Calculate units of production depreciation
   */
  private static calculateUnitsOfProductionDepreciation(
    cost: number,
    salvageValue: number,
    totalUnits: number,
    unitsUsed: number,
    periodStart: Date,
    periodEnd: Date
  ): number {
    if (totalUnits <= 0) {
      return 0;
    }

    const depreciationPerUnit = (cost - salvageValue) / totalUnits;
    const periodUnits = unitsUsed; // This would need to be calculated based on actual usage
    
    return depreciationPerUnit * periodUnits;
  }

  /**
   * Calculate sum-of-years depreciation rate
   */
  private static calculateSumOfYearsRate(
    usefulLifeYears: number,
    purchaseDate: Date,
    periodStart: Date
  ): number {
    const yearsSincePurchase = this.getYearsSincePurchase(purchaseDate, periodStart);
    const remainingLife = usefulLifeYears - yearsSincePurchase;
    
    if (remainingLife <= 0) {
      return 0;
    }

    const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
    return (remainingLife / sumOfYears) * 100;
  }

  /**
   * Get years since purchase date
   */
  private static getYearsSincePurchase(purchaseDate: Date, currentDate: Date): number {
    const diffTime = currentDate.getTime() - purchaseDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 365);
  }

  /**
   * Generate depreciation schedule for an asset
   */
  static async generateDepreciationSchedule(
    assetId: string,
    tenantId: string,
    startYear: number,
    endYear: number
  ): Promise<DepreciationSchedule[]> {
    const asset = await prisma.fixedAsset.findUnique({
      where: { id: assetId, tenantId }
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    const schedule: DepreciationSchedule[] = [];
    const purchaseDate = new Date(asset.purchaseDate);
    const purchaseYear = purchaseDate.getFullYear();
    const purchaseMonth = purchaseDate.getMonth() + 1;

    for (let year = Math.max(startYear, purchaseYear); year <= endYear; year++) {
      for (let month = 1; month <= 12; month++) {
        // Skip months before purchase
        if (year === purchaseYear && month < purchaseMonth) {
          continue;
        }

        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0);

        const calculation = this.calculateDepreciation(
          asset,
          periodStart,
          periodEnd,
          asset.depreciationMethod
        );

        schedule.push({
          year,
          month,
          depreciationAmount: calculation.depreciationAmount,
          accumulatedDepreciation: calculation.accumulatedDepreciation,
          netBookValue: calculation.netBookValue
        });
      }
    }

    return schedule;
  }

  /**
   * Calculate depreciation for all active assets in a period
   */
  static async calculatePeriodDepreciation(
    tenantId: string,
    companyId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<DepreciationCalculation[]> {
    const assets = await prisma.fixedAsset.findMany({
      where: {
        tenantId,
        companyId,
        status: 'ACTIVE'
      }
    });

    const calculations: DepreciationCalculation[] = [];

    for (const asset of assets) {
      // Check if depreciation already calculated for this period
      const existingRecord = await prisma.depreciationRecord.findFirst({
        where: {
          assetId: asset.id,
          tenantId,
          periodStart: { lte: periodStart },
          periodEnd: { gte: periodEnd }
        }
      });

      if (existingRecord) {
        continue; // Skip if already calculated
      }

      const calculation = this.calculateDepreciation(
        asset,
        periodStart,
        periodEnd,
        asset.depreciationMethod
      );

      calculations.push(calculation);
    }

    return calculations;
  }

  /**
   * Post depreciation to journal entries
   */
  static async postDepreciationToJournal(
    tenantId: string,
    companyId: string,
    calculations: DepreciationCalculation[]
  ): Promise<string[]> {
    const journalEntryIds: string[] = [];

    for (const calculation of calculations) {
      // Get asset details
      const asset = await prisma.fixedAsset.findUnique({
        where: { id: calculation.assetId }
      });

      if (!asset) {
        continue;
      }

      // Create journal entry for depreciation
      const journalEntry = await prisma.journalEntry.create({
        data: {
          tenantId,
          companyId,
          entryNumber: `DEP-${Date.now()}-${calculation.assetId}`,
          date: calculation.periodEnd,
          description: `Depreciation for ${asset.name} (${asset.assetNumber})`,
          type: 'DEPRECIATION',
          status: 'POSTED',
          totalDebit: calculation.depreciationAmount,
          totalCredit: calculation.depreciationAmount,
          lines: {
            create: [
              {
                tenantId,
                companyId,
                accountId: asset.depreciationAccountId || 'default-depreciation-expense',
                description: `Depreciation expense - ${asset.name}`,
                debit: calculation.depreciationAmount,
                credit: 0
              },
              {
                tenantId,
                companyId,
                accountId: asset.assetAccountId || 'default-accumulated-depreciation',
                description: `Accumulated depreciation - ${asset.name}`,
                debit: 0,
                credit: calculation.depreciationAmount
              }
            ]
          }
        }
      });

      journalEntryIds.push(journalEntry.id);

      // Update depreciation record with journal entry reference
      await prisma.depreciationRecord.updateMany({
        where: {
          assetId: calculation.assetId,
          tenantId,
          periodStart: calculation.periodStart,
          periodEnd: calculation.periodEnd
        },
        data: {
          journalEntryId: journalEntry.id,
          isPosted: true
        }
      });
    }

    return journalEntryIds;
  }

  /**
   * Handle asset disposal and create disposal journal entry
   */
  static async handleAssetDisposal(
    tenantId: string,
    companyId: string,
    assetId: string,
    disposalData: {
      disposalDate: Date;
      disposalMethod: string;
      disposalValue: number;
      disposalCosts: number;
      disposalReason?: string;
    }
  ): Promise<string> {
    const asset = await prisma.fixedAsset.findUnique({
      where: { id: assetId, tenantId }
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    const netDisposalValue = disposalData.disposalValue - disposalData.disposalCosts;
    const gainOrLoss = netDisposalValue - Number(asset.netBookValue);

    // Create disposal record
    const disposalRecord = await prisma.disposalRecord.create({
      data: {
        tenantId,
        companyId,
        assetId,
        disposalDate: disposalData.disposalDate,
        disposalMethod: disposalData.disposalMethod,
        disposalReason: disposalData.disposalReason,
        disposalValue: disposalData.disposalValue,
        disposalCosts: disposalData.disposalCosts,
        netDisposalValue,
        gainOrLoss
      }
    });

    // Create journal entry for disposal
    const journalEntry = await prisma.journalEntry.create({
      data: {
        tenantId,
        companyId,
        entryNumber: `DISPOSAL-${Date.now()}-${assetId}`,
        date: disposalData.disposalDate,
        description: `Asset disposal - ${asset.name} (${asset.assetNumber})`,
        type: 'DISPOSAL',
        status: 'POSTED',
        totalDebit: Number(asset.accumulatedDepreciation) + netDisposalValue,
        totalCredit: Number(asset.purchaseCost),
        lines: {
          create: [
            // Remove asset from books
            {
              tenantId,
              companyId,
              accountId: asset.assetAccountId || 'default-fixed-assets',
              description: `Remove asset - ${asset.name}`,
              debit: 0,
              credit: Number(asset.purchaseCost)
            },
            // Remove accumulated depreciation
            {
              tenantId,
              companyId,
              accountId: asset.depreciationAccountId || 'default-accumulated-depreciation',
              description: `Remove accumulated depreciation - ${asset.name}`,
              debit: Number(asset.accumulatedDepreciation),
              credit: 0
            },
            // Record disposal proceeds
            {
              tenantId,
              companyId,
              accountId: 'cash-account', // This should be mapped to actual cash account
              description: `Disposal proceeds - ${asset.name}`,
              debit: netDisposalValue,
              credit: 0
            },
            // Record gain or loss
            ...(gainOrLoss !== 0 ? [{
              tenantId,
              companyId,
              accountId: gainOrLoss > 0 ? 'gain-on-disposal' : 'loss-on-disposal',
              description: `${gainOrLoss > 0 ? 'Gain' : 'Loss'} on disposal - ${asset.name}`,
              debit: gainOrLoss < 0 ? Math.abs(gainOrLoss) : 0,
              credit: gainOrLoss > 0 ? gainOrLoss : 0
            }] : [])
          ]
        }
      }
    });

    // Update disposal record with journal entry reference
    await prisma.disposalRecord.update({
      where: { id: disposalRecord.id },
      data: { journalEntryId: journalEntry.id }
    });

    // Update asset status
    await prisma.fixedAsset.update({
      where: { id: assetId },
      data: {
        status: 'DISPOSED',
        disposalDate: disposalData.disposalDate,
        disposalMethod: disposalData.disposalMethod,
        disposalValue: disposalData.disposalValue
      }
    });

    return journalEntry.id;
  }

  /**
   * Get depreciation summary for reporting
   */
  static async getDepreciationSummary(
    tenantId: string,
    companyId: string,
    year: number
  ): Promise<{
    totalDepreciation: number;
    monthlyDepreciation: { month: number; amount: number }[];
    assetDepreciation: { assetId: string; assetName: string; totalDepreciation: number }[];
  }> {
    const depreciationRecords = await prisma.depreciationRecord.findMany({
      where: {
        tenantId,
        companyId,
        periodYear: year
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assetNumber: true
          }
        }
      }
    });

    const totalDepreciation = depreciationRecords.reduce(
      (sum, record) => sum + Number(record.depreciationAmount),
      0
    );

    const monthlyDepreciation = Array.from({ length: 12 }, (_, i) => {
      const monthDepreciation = depreciationRecords
        .filter(record => record.periodMonth === i + 1)
        .reduce((sum, record) => sum + Number(record.depreciationAmount), 0);
      
      return { month: i + 1, amount: monthDepreciation };
    });

    const assetDepreciation = depreciationRecords.reduce((acc, record) => {
      const assetId = record.assetId;
      if (!acc[assetId]) {
        acc[assetId] = {
          assetId,
          assetName: record.asset.name,
          totalDepreciation: 0
        };
      }
      acc[assetId].totalDepreciation += Number(record.depreciationAmount);
      return acc;
    }, {} as Record<string, { assetId: string; assetName: string; totalDepreciation: number }>);

    return {
      totalDepreciation,
      monthlyDepreciation,
      assetDepreciation: Object.values(assetDepreciation)
    };
  }
}
