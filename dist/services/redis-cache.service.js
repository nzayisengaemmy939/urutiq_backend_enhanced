import Redis from 'ioredis';
import { ApiError } from '../errors';
export class RedisCacheService {
    static instance;
    redis;
    isConnected = false;
    constructor(config) {
        const defaultConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true
        };
        const finalConfig = { ...defaultConfig, ...config };
        this.redis = new Redis(finalConfig);
        this.redis.on('connect', () => {
            console.log('Redis connected successfully');
            this.isConnected = true;
        });
        this.redis.on('error', (error) => {
            console.error('Redis connection error:', error);
            this.isConnected = false;
        });
        this.redis.on('close', () => {
            console.log('Redis connection closed');
            this.isConnected = false;
        });
    }
    static getInstance(config) {
        if (!RedisCacheService.instance) {
            RedisCacheService.instance = new RedisCacheService(config);
        }
        return RedisCacheService.instance;
    }
    // Basic cache operations
    async get(key, options) {
        try {
            if (!this.isConnected) {
                console.warn('Redis not connected, skipping cache get');
                return null;
            }
            const fullKey = this.buildKey(key, options?.prefix);
            const value = await this.redis.get(fullKey);
            if (!value) {
                return null;
            }
            if (options?.serialize !== false) {
                return JSON.parse(value);
            }
            return value;
        }
        catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }
    async set(key, value, options) {
        try {
            if (!this.isConnected) {
                console.warn('Redis not connected, skipping cache set');
                return false;
            }
            const fullKey = this.buildKey(key, options?.prefix);
            let serializedValue;
            if (options?.serialize !== false) {
                serializedValue = JSON.stringify(value);
            }
            else {
                serializedValue = value;
            }
            if (options?.ttl) {
                await this.redis.setex(fullKey, options.ttl, serializedValue);
            }
            else {
                await this.redis.set(fullKey, serializedValue);
            }
            return true;
        }
        catch (error) {
            console.error('Redis set error:', error);
            return false;
        }
    }
    async del(key, options) {
        try {
            if (!this.isConnected) {
                console.warn('Redis not connected, skipping cache delete');
                return false;
            }
            const fullKey = this.buildKey(key, options?.prefix);
            const result = await this.redis.del(fullKey);
            return result > 0;
        }
        catch (error) {
            console.error('Redis delete error:', error);
            return false;
        }
    }
    async exists(key, options) {
        try {
            if (!this.isConnected) {
                return false;
            }
            const fullKey = this.buildKey(key, options?.prefix);
            const result = await this.redis.exists(fullKey);
            return result === 1;
        }
        catch (error) {
            console.error('Redis exists error:', error);
            return false;
        }
    }
    // Advanced cache operations
    async mget(keys, options) {
        try {
            if (!this.isConnected) {
                return keys.map(() => null);
            }
            const fullKeys = keys.map(key => this.buildKey(key, options?.prefix));
            const values = await this.redis.mget(...fullKeys);
            return values.map(value => {
                if (!value)
                    return null;
                if (options?.serialize !== false) {
                    return JSON.parse(value);
                }
                return value;
            });
        }
        catch (error) {
            console.error('Redis mget error:', error);
            return keys.map(() => null);
        }
    }
    async mset(keyValuePairs, options) {
        try {
            if (!this.isConnected) {
                console.warn('Redis not connected, skipping cache mset');
                return false;
            }
            const pipeline = this.redis.pipeline();
            for (const [key, value] of Object.entries(keyValuePairs)) {
                const fullKey = this.buildKey(key, options?.prefix);
                let serializedValue;
                if (options?.serialize !== false) {
                    serializedValue = JSON.stringify(value);
                }
                else {
                    serializedValue = value;
                }
                if (options?.ttl) {
                    pipeline.setex(fullKey, options.ttl, serializedValue);
                }
                else {
                    pipeline.set(fullKey, serializedValue);
                }
            }
            await pipeline.exec();
            return true;
        }
        catch (error) {
            console.error('Redis mset error:', error);
            return false;
        }
    }
    // Pattern-based operations
    async keys(pattern, options) {
        try {
            if (!this.isConnected) {
                return [];
            }
            const fullPattern = this.buildKey(pattern, options?.prefix);
            return await this.redis.keys(fullPattern);
        }
        catch (error) {
            console.error('Redis keys error:', error);
            return [];
        }
    }
    async delPattern(pattern, options) {
        try {
            if (!this.isConnected) {
                return 0;
            }
            const fullPattern = this.buildKey(pattern, options?.prefix);
            const keys = await this.redis.keys(fullPattern);
            if (keys.length === 0) {
                return 0;
            }
            return await this.redis.del(...keys);
        }
        catch (error) {
            console.error('Redis delPattern error:', error);
            return 0;
        }
    }
    // Cache invalidation
    async invalidatePattern(pattern, options) {
        return this.delPattern(pattern, options);
    }
    async invalidateByPrefix(prefix) {
        return this.delPattern('*', { prefix });
    }
    // Cache statistics
    async getStats() {
        try {
            if (!this.isConnected) {
                return {
                    connected: false,
                    memory: null,
                    info: null
                };
            }
            const [memory, info] = await Promise.all([
                this.redis.memory('STATS'),
                this.redis.info('memory')
            ]);
            return {
                connected: true,
                memory,
                info
            };
        }
        catch (error) {
            console.error('Redis stats error:', error);
            return {
                connected: false,
                memory: null,
                info: null
            };
        }
    }
    // Cache warming
    async warmCache(key, dataFetcher, options) {
        // Try to get from cache first
        const cached = await this.get(key, options);
        if (cached !== null) {
            return cached;
        }
        // Fetch fresh data
        const freshData = await dataFetcher();
        // Store in cache
        await this.set(key, freshData, options);
        return freshData;
    }
    // Cache with fallback
    async getOrSet(key, dataFetcher, options) {
        return this.warmCache(key, dataFetcher, options);
    }
    // Atomic operations
    async increment(key, options) {
        try {
            if (!this.isConnected) {
                throw new ApiError(500, 'CACHE_UNAVAILABLE', 'Redis cache is not available');
            }
            const fullKey = this.buildKey(key, options?.prefix);
            return await this.redis.incr(fullKey);
        }
        catch (error) {
            console.error('Redis increment error:', error);
            throw new ApiError(500, 'CACHE_ERROR', 'Failed to increment cache value');
        }
    }
    async decrement(key, options) {
        try {
            if (!this.isConnected) {
                throw new ApiError(500, 'CACHE_UNAVAILABLE', 'Redis cache is not available');
            }
            const fullKey = this.buildKey(key, options?.prefix);
            return await this.redis.decr(fullKey);
        }
        catch (error) {
            console.error('Redis decrement error:', error);
            throw new ApiError(500, 'CACHE_ERROR', 'Failed to decrement cache value');
        }
    }
    // Hash operations
    async hget(key, field, options) {
        try {
            if (!this.isConnected) {
                return null;
            }
            const fullKey = this.buildKey(key, options?.prefix);
            const value = await this.redis.hget(fullKey, field);
            if (!value) {
                return null;
            }
            if (options?.serialize !== false) {
                return JSON.parse(value);
            }
            return value;
        }
        catch (error) {
            console.error('Redis hget error:', error);
            return null;
        }
    }
    async hset(key, field, value, options) {
        try {
            if (!this.isConnected) {
                return false;
            }
            const fullKey = this.buildKey(key, options?.prefix);
            let serializedValue;
            if (options?.serialize !== false) {
                serializedValue = JSON.stringify(value);
            }
            else {
                serializedValue = value;
            }
            await this.redis.hset(fullKey, field, serializedValue);
            if (options?.ttl) {
                await this.redis.expire(fullKey, options.ttl);
            }
            return true;
        }
        catch (error) {
            console.error('Redis hset error:', error);
            return false;
        }
    }
    async hgetall(key, options) {
        try {
            if (!this.isConnected) {
                return {};
            }
            const fullKey = this.buildKey(key, options?.prefix);
            const hash = await this.redis.hgetall(fullKey);
            const result = {};
            for (const [field, value] of Object.entries(hash)) {
                if (options?.serialize !== false) {
                    result[field] = JSON.parse(value);
                }
                else {
                    result[field] = value;
                }
            }
            return result;
        }
        catch (error) {
            console.error('Redis hgetall error:', error);
            return {};
        }
    }
    // List operations
    async lpush(key, ...values) {
        try {
            if (!this.isConnected) {
                return 0;
            }
            const serializedValues = values.map(v => JSON.stringify(v));
            return await this.redis.lpush(key, ...serializedValues);
        }
        catch (error) {
            console.error('Redis lpush error:', error);
            return 0;
        }
    }
    async rpop(key) {
        try {
            if (!this.isConnected) {
                return null;
            }
            const value = await this.redis.rpop(key);
            if (!value) {
                return null;
            }
            return JSON.parse(value);
        }
        catch (error) {
            console.error('Redis rpop error:', error);
            return null;
        }
    }
    // Utility methods
    buildKey(key, prefix) {
        if (prefix) {
            return `${prefix}:${key}`;
        }
        return key;
    }
    async disconnect() {
        if (this.redis) {
            await this.redis.disconnect();
        }
    }
    // Health check
    async ping() {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        }
        catch (error) {
            console.error('Redis ping error:', error);
            return false;
        }
    }
}
// Export singleton instance
export const redisCache = RedisCacheService.getInstance();
