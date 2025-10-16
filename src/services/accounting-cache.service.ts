import { redisCache } from './redis-cache.service.js';
import { prisma } from '../prisma.js';

export interface TrialBalanceCacheData {
  reportType: string;
  period: {
    startDate: string;
    endDate: string;
  };
  accounts: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    accountType: string;
    debitTotal: number;
    creditTotal: number;
    balance: number;
    isDebit: boolean;
  }>;
  summary: {
    totalDebits: number;
    totalCredits: number;
    difference: number;
    isBalanced: boolean;
  };
  generatedAt: string;
}

export class AccountingCacheService {
  private static readonly CACHE_PREFIX = 'accounting';
  private static readonly DEFAULT_TTL = 300; // 5 minutes

  // Trial Balance caching
  static async getTrialBalance(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<TrialBalanceCacheData | null> {
    const cacheKey = `trial-balance:${tenantId}:${companyId}:${startDate}:${endDate}`;
    return await redisCache.get<TrialBalanceCacheData>(cacheKey, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  static async setTrialBalance(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string,
    data: TrialBalanceCacheData
  ): Promise<boolean> {
    const cacheKey = `trial-balance:${tenantId}:${companyId}:${startDate}:${endDate}`;
    return await redisCache.set(cacheKey, data, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  // General Ledger caching
  static async getGeneralLedger(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string,
    accountId?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<any | null> {
    const cacheKey = `general-ledger:${tenantId}:${companyId}:${startDate}:${endDate}:${accountId || 'all'}:${page}:${limit}`;
    return await redisCache.get(cacheKey, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  static async setGeneralLedger(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string,
    data: any,
    accountId?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<boolean> {
    const cacheKey = `general-ledger:${tenantId}:${companyId}:${startDate}:${endDate}:${accountId || 'all'}:${page}:${limit}`;
    return await redisCache.set(cacheKey, data, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  // Balance Sheet caching
  static async getBalanceSheet(
    tenantId: string,
    companyId: string,
    asOfDate: string
  ): Promise<any | null> {
    const cacheKey = `balance-sheet:${tenantId}:${companyId}:${asOfDate}`;
    return await redisCache.get(cacheKey, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  static async setBalanceSheet(
    tenantId: string,
    companyId: string,
    asOfDate: string,
    data: any
  ): Promise<boolean> {
    const cacheKey = `balance-sheet:${tenantId}:${companyId}:${asOfDate}`;
    return await redisCache.set(cacheKey, data, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  // Income Statement caching
  static async getIncomeStatement(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<any | null> {
    const cacheKey = `income-statement:${tenantId}:${companyId}:${startDate}:${endDate}`;
    return await redisCache.get(cacheKey, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  static async setIncomeStatement(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string,
    data: any
  ): Promise<boolean> {
    const cacheKey = `income-statement:${tenantId}:${companyId}:${startDate}:${endDate}`;
    return await redisCache.set(cacheKey, data, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  // Cash Flow caching
  static async getCashFlow(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<any | null> {
    const cacheKey = `cash-flow:${tenantId}:${companyId}:${startDate}:${endDate}`;
    return await redisCache.get(cacheKey, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  static async setCashFlow(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string,
    data: any
  ): Promise<boolean> {
    const cacheKey = `cash-flow:${tenantId}:${companyId}:${startDate}:${endDate}`;
    return await redisCache.set(cacheKey, data, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  // AR Aging caching
  static async getARAging(
    tenantId: string,
    companyId: string,
    asOfDate: string
  ): Promise<any | null> {
    const cacheKey = `ar-aging:${tenantId}:${companyId}:${asOfDate}`;
    return await redisCache.get(cacheKey, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  static async setARAging(
    tenantId: string,
    companyId: string,
    asOfDate: string,
    data: any
  ): Promise<boolean> {
    const cacheKey = `ar-aging:${tenantId}:${companyId}:${asOfDate}`;
    return await redisCache.set(cacheKey, data, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  // AP Aging caching
  static async getAPAging(
    tenantId: string,
    companyId: string,
    asOfDate: string
  ): Promise<any | null> {
    const cacheKey = `ap-aging:${tenantId}:${companyId}:${asOfDate}`;
    return await redisCache.get(cacheKey, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  static async setAPAging(
    tenantId: string,
    companyId: string,
    asOfDate: string,
    data: any
  ): Promise<boolean> {
    const cacheKey = `ap-aging:${tenantId}:${companyId}:${asOfDate}`;
    return await redisCache.set(cacheKey, data, {
      prefix: this.CACHE_PREFIX,
      ttl: this.DEFAULT_TTL
    });
  }

  // Cache invalidation methods
  static async invalidateCompanyCache(tenantId: string, companyId: string): Promise<void> {
    const patterns = [
      `trial-balance:${tenantId}:${companyId}:*`,
      `general-ledger:${tenantId}:${companyId}:*`,
      `balance-sheet:${tenantId}:${companyId}:*`,
      `income-statement:${tenantId}:${companyId}:*`,
      `cash-flow:${tenantId}:${companyId}:*`,
      `ar-aging:${tenantId}:${companyId}:*`,
      `ap-aging:${tenantId}:${companyId}:*`
    ];

    for (const pattern of patterns) {
      await redisCache.invalidatePattern(pattern, {
        prefix: this.CACHE_PREFIX
      });
    }
  }

  static async invalidateTrialBalanceCache(tenantId: string, companyId: string): Promise<void> {
    const pattern = `trial-balance:${tenantId}:${companyId}:*`;
    await redisCache.invalidatePattern(pattern, {
      prefix: this.CACHE_PREFIX
    });
  }

  static async invalidateGeneralLedgerCache(tenantId: string, companyId: string): Promise<void> {
    const pattern = `general-ledger:${tenantId}:${companyId}:*`;
    await redisCache.invalidatePattern(pattern, {
      prefix: this.CACHE_PREFIX
    });
  }

  static async invalidateBalanceSheetCache(tenantId: string, companyId: string): Promise<void> {
    const pattern = `balance-sheet:${tenantId}:${companyId}:*`;
    await redisCache.invalidatePattern(pattern, {
      prefix: this.CACHE_PREFIX
    });
  }

  static async invalidateIncomeStatementCache(tenantId: string, companyId: string): Promise<void> {
    const pattern = `income-statement:${tenantId}:${companyId}:*`;
    await redisCache.invalidatePattern(pattern, {
      prefix: this.CACHE_PREFIX
    });
  }

  static async invalidateCashFlowCache(tenantId: string, companyId: string): Promise<void> {
    const pattern = `cash-flow:${tenantId}:${companyId}:*`;
    await redisCache.invalidatePattern(pattern, {
      prefix: this.CACHE_PREFIX
    });
  }

  static async invalidateARAgingCache(tenantId: string, companyId: string): Promise<void> {
    const pattern = `ar-aging:${tenantId}:${companyId}:*`;
    await redisCache.invalidatePattern(pattern, {
      prefix: this.CACHE_PREFIX
    });
  }

  static async invalidateAPAgingCache(tenantId: string, companyId: string): Promise<void> {
    const pattern = `ap-aging:${tenantId}:${companyId}:*`;
    await redisCache.invalidatePattern(pattern, {
      prefix: this.CACHE_PREFIX
    });
  }

  // Cache warming methods
  static async warmTrialBalanceCache(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<TrialBalanceCacheData | null> {
    const cacheKey = `trial-balance:${tenantId}:${companyId}:${startDate}:${endDate}`;
    
    return await redisCache.warmCache(
      cacheKey,
      async () => {
        // This would contain the actual data fetching logic
        // For now, return null to indicate cache miss
        return null;
      },
      {
        prefix: this.CACHE_PREFIX,
        ttl: this.DEFAULT_TTL
      }
    );
  }

  // Cache statistics
  static async getCacheStats(): Promise<{
    hitRate: number;
    missRate: number;
    totalKeys: number;
    memoryUsage: string;
  }> {
    try {
      const stats = await redisCache.getStats();
      const keys = await redisCache.keys('*', { prefix: this.CACHE_PREFIX });
      
      return {
        hitRate: 0, // Would need to implement hit/miss tracking
        missRate: 0,
        totalKeys: keys.length,
        memoryUsage: stats.memory || '0'
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        hitRate: 0,
        missRate: 0,
        totalKeys: 0,
        memoryUsage: '0'
      };
    }
  }

  // Cache cleanup
  static async cleanupExpiredCache(): Promise<number> {
    // Redis automatically handles TTL expiration, but we can add manual cleanup if needed
    return 0;
  }
}

