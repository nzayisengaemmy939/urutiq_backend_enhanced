import { Request, Response, NextFunction } from 'express';
import { redisCache } from '../services/redis-cache.service';
import { ApiError } from '../errors';

export interface CacheMiddlewareOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  skipCacheOnError?: boolean;
}

export const cacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
  const {
    ttl = 300, // 5 minutes default
    prefix = 'api',
    keyGenerator = defaultKeyGenerator,
    skipCache = () => false,
    skipCacheOnError = true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if specified
    if (skipCache(req)) {
      return next();
    }

    try {
      const cacheKey = keyGenerator(req);
      
      // Try to get from cache
      const cachedResponse = await redisCache.get(cacheKey, {
        ttl,
        prefix,
        serialize: false
      });

      if (cachedResponse) {
        const { statusCode, headers, body } = JSON.parse(cachedResponse);
        
        // Set response headers
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value as string);
        });
        
        return res.status(statusCode).json(body);
      }

      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);
      let responseBody: any;

      res.json = function(body: any) {
        responseBody = body;
        return originalJson(body);
      };

      // Store original res.status to capture status code
      const originalStatus = res.status.bind(res);
      let statusCode = 200;

      res.status = function(code: number) {
        statusCode = code;
        return originalStatus(code);
      };

      // Override res.end to cache the response
      const originalEnd = res.end.bind(res);
      res.end = function(chunk?: any, encoding?: any) {
        // Cache the response if it's successful
        if (statusCode >= 200 && statusCode < 300) {
          const responseToCache = {
            statusCode,
            headers: res.getHeaders(),
            body: responseBody
          };

          redisCache.set(cacheKey, JSON.stringify(responseToCache), {
            ttl,
            prefix,
            serialize: false
          }).catch(error => {
            console.error('Failed to cache response:', error);
          });
        }

        return originalEnd(chunk, encoding);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      if (skipCacheOnError) {
        next();
      } else {
        next(new ApiError(500, 'CACHE_ERROR', 'Failed to process cache'));
      }
    }
  };
};

// Default key generator
function defaultKeyGenerator(req: Request): string {
  const { method, originalUrl, query } = req;
  const tenantId = (req as any).tenantId || 'default';
  const companyId = (req as any).companyId || 'default';
  
  // Create a deterministic key from request parameters
  const queryString = Object.keys(query)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');
  
  const baseKey = `${method}:${originalUrl}`;
  const fullKey = queryString ? `${baseKey}?${queryString}` : baseKey;
  
  return `${tenantId}:${companyId}:${fullKey}`;
}

// Cache invalidation middleware
export const cacheInvalidationMiddleware = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    let responseBody: any;

    res.json = function(body: any) {
      responseBody = body;
      return originalJson(body);
    };

    // Override res.end to invalidate cache after successful response
    const originalEnd = res.end.bind(res);
    res.end = function(chunk?: any, encoding?: any) {
      // Invalidate cache if response is successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const tenantId = (req as any).tenantId || 'default';
        const companyId = (req as any).companyId || 'default';
        
        patterns.forEach(pattern => {
          const fullPattern = `${tenantId}:${companyId}:${pattern}`;
          redisCache.invalidatePattern(fullPattern).catch(error => {
            console.error('Failed to invalidate cache:', error);
          });
        });
      }

      return originalEnd(chunk, encoding);
    };

    next();
  };
};

// Specific cache strategies
export const cacheStrategies = {
  // Short-term cache (1 minute)
  short: (prefix?: string) => cacheMiddleware({
    ttl: 60,
    prefix: prefix || 'short'
  }),

  // Medium-term cache (5 minutes)
  medium: (prefix?: string) => cacheMiddleware({
    ttl: 300,
    prefix: prefix || 'medium'
  }),

  // Long-term cache (1 hour)
  long: (prefix?: string) => cacheMiddleware({
    ttl: 3600,
    prefix: prefix || 'long'
  }),

  // User-specific cache
  user: (prefix?: string) => cacheMiddleware({
    ttl: 300,
    prefix: prefix || 'user',
    keyGenerator: (req) => {
      const tenantId = (req as any).tenantId || 'default';
      const companyId = (req as any).companyId || 'default';
      const userId = (req as any).user?.id || 'anonymous';
      const { method, originalUrl, query } = req;
      
      const queryString = Object.keys(query)
        .sort()
        .map(key => `${key}=${query[key]}`)
        .join('&');
      
      const baseKey = `${method}:${originalUrl}`;
      const fullKey = queryString ? `${baseKey}?${queryString}` : baseKey;
      
      return `${tenantId}:${companyId}:${userId}:${fullKey}`;
    }
  }),

  // Company-specific cache
  company: (prefix?: string) => cacheMiddleware({
    ttl: 300,
    prefix: prefix || 'company',
    keyGenerator: (req) => {
      const tenantId = (req as any).tenantId || 'default';
      const companyId = (req as any).companyId || 'default';
      const { method, originalUrl, query } = req;
      
      const queryString = Object.keys(query)
        .sort()
        .map(key => `${key}=${query[key]}`)
        .join('&');
      
      const baseKey = `${method}:${originalUrl}`;
      const fullKey = queryString ? `${baseKey}?${queryString}` : baseKey;
      
      return `${tenantId}:${companyId}:${fullKey}`;
    }
  })
};

