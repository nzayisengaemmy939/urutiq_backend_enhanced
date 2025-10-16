import { redisCache } from './redis-cache.service';
export class AccountingCacheService {
    static CACHE_PREFIX = 'accounting';
    static DEFAULT_TTL = 300; // 5 minutes
    // Trial Balance caching
    static async getTrialBalance(tenantId, companyId, startDate, endDate) {
        const cacheKey = `trial-balance:${tenantId}:${companyId}:${startDate}:${endDate}`;
        return await redisCache.get(cacheKey, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    static async setTrialBalance(tenantId, companyId, startDate, endDate, data) {
        const cacheKey = `trial-balance:${tenantId}:${companyId}:${startDate}:${endDate}`;
        return await redisCache.set(cacheKey, data, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    // General Ledger caching
    static async getGeneralLedger(tenantId, companyId, startDate, endDate, accountId, page = 1, limit = 50) {
        const cacheKey = `general-ledger:${tenantId}:${companyId}:${startDate}:${endDate}:${accountId || 'all'}:${page}:${limit}`;
        return await redisCache.get(cacheKey, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    static async setGeneralLedger(tenantId, companyId, startDate, endDate, data, accountId, page = 1, limit = 50) {
        const cacheKey = `general-ledger:${tenantId}:${companyId}:${startDate}:${endDate}:${accountId || 'all'}:${page}:${limit}`;
        return await redisCache.set(cacheKey, data, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    // Balance Sheet caching
    static async getBalanceSheet(tenantId, companyId, asOfDate) {
        const cacheKey = `balance-sheet:${tenantId}:${companyId}:${asOfDate}`;
        return await redisCache.get(cacheKey, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    static async setBalanceSheet(tenantId, companyId, asOfDate, data) {
        const cacheKey = `balance-sheet:${tenantId}:${companyId}:${asOfDate}`;
        return await redisCache.set(cacheKey, data, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    // Income Statement caching
    static async getIncomeStatement(tenantId, companyId, startDate, endDate) {
        const cacheKey = `income-statement:${tenantId}:${companyId}:${startDate}:${endDate}`;
        return await redisCache.get(cacheKey, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    static async setIncomeStatement(tenantId, companyId, startDate, endDate, data) {
        const cacheKey = `income-statement:${tenantId}:${companyId}:${startDate}:${endDate}`;
        return await redisCache.set(cacheKey, data, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    // Cash Flow caching
    static async getCashFlow(tenantId, companyId, startDate, endDate) {
        const cacheKey = `cash-flow:${tenantId}:${companyId}:${startDate}:${endDate}`;
        return await redisCache.get(cacheKey, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    static async setCashFlow(tenantId, companyId, startDate, endDate, data) {
        const cacheKey = `cash-flow:${tenantId}:${companyId}:${startDate}:${endDate}`;
        return await redisCache.set(cacheKey, data, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    // AR Aging caching
    static async getARAging(tenantId, companyId, asOfDate) {
        const cacheKey = `ar-aging:${tenantId}:${companyId}:${asOfDate}`;
        return await redisCache.get(cacheKey, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    static async setARAging(tenantId, companyId, asOfDate, data) {
        const cacheKey = `ar-aging:${tenantId}:${companyId}:${asOfDate}`;
        return await redisCache.set(cacheKey, data, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    // AP Aging caching
    static async getAPAging(tenantId, companyId, asOfDate) {
        const cacheKey = `ap-aging:${tenantId}:${companyId}:${asOfDate}`;
        return await redisCache.get(cacheKey, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    static async setAPAging(tenantId, companyId, asOfDate, data) {
        const cacheKey = `ap-aging:${tenantId}:${companyId}:${asOfDate}`;
        return await redisCache.set(cacheKey, data, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    // Cache invalidation methods
    static async invalidateCompanyCache(tenantId, companyId) {
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
    static async invalidateTrialBalanceCache(tenantId, companyId) {
        const pattern = `trial-balance:${tenantId}:${companyId}:*`;
        await redisCache.invalidatePattern(pattern, {
            prefix: this.CACHE_PREFIX
        });
    }
    static async invalidateGeneralLedgerCache(tenantId, companyId) {
        const pattern = `general-ledger:${tenantId}:${companyId}:*`;
        await redisCache.invalidatePattern(pattern, {
            prefix: this.CACHE_PREFIX
        });
    }
    static async invalidateBalanceSheetCache(tenantId, companyId) {
        const pattern = `balance-sheet:${tenantId}:${companyId}:*`;
        await redisCache.invalidatePattern(pattern, {
            prefix: this.CACHE_PREFIX
        });
    }
    static async invalidateIncomeStatementCache(tenantId, companyId) {
        const pattern = `income-statement:${tenantId}:${companyId}:*`;
        await redisCache.invalidatePattern(pattern, {
            prefix: this.CACHE_PREFIX
        });
    }
    static async invalidateCashFlowCache(tenantId, companyId) {
        const pattern = `cash-flow:${tenantId}:${companyId}:*`;
        await redisCache.invalidatePattern(pattern, {
            prefix: this.CACHE_PREFIX
        });
    }
    static async invalidateARAgingCache(tenantId, companyId) {
        const pattern = `ar-aging:${tenantId}:${companyId}:*`;
        await redisCache.invalidatePattern(pattern, {
            prefix: this.CACHE_PREFIX
        });
    }
    static async invalidateAPAgingCache(tenantId, companyId) {
        const pattern = `ap-aging:${tenantId}:${companyId}:*`;
        await redisCache.invalidatePattern(pattern, {
            prefix: this.CACHE_PREFIX
        });
    }
    // Cache warming methods
    static async warmTrialBalanceCache(tenantId, companyId, startDate, endDate) {
        const cacheKey = `trial-balance:${tenantId}:${companyId}:${startDate}:${endDate}`;
        return await redisCache.warmCache(cacheKey, async () => {
            // This would contain the actual data fetching logic
            // For now, return null to indicate cache miss
            return null;
        }, {
            prefix: this.CACHE_PREFIX,
            ttl: this.DEFAULT_TTL
        });
    }
    // Cache statistics
    static async getCacheStats() {
        try {
            const stats = await redisCache.getStats();
            const keys = await redisCache.keys('*', { prefix: this.CACHE_PREFIX });
            return {
                hitRate: 0, // Would need to implement hit/miss tracking
                missRate: 0,
                totalKeys: keys.length,
                memoryUsage: stats.memory || '0'
            };
        }
        catch (error) {
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
    static async cleanupExpiredCache() {
        // Redis automatically handles TTL expiration, but we can add manual cleanup if needed
        return 0;
    }
}
