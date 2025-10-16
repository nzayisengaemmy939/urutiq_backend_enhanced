import { prisma } from '../prisma.js';
import { Request, Response, NextFunction } from 'express';

export interface PerformanceMetrics {
  responseTime: number;
  statusCode: number;
  endpoint: string;
  method: string;
  requestSize?: number;
  responseSize?: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface ApiUsageAnalytics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  topEndpoints: Array<{
    endpoint: string;
    method: string;
    count: number;
    averageResponseTime: number;
  }>;
  statusCodeDistribution: Record<number, number>;
  hourlyDistribution: Array<{
    hour: number;
    count: number;
    averageResponseTime: number;
  }>;
}

export class PerformanceMonitoringService {
  // Log API usage
  static async logApiUsage(
    tenantId: string,
    metrics: PerformanceMetrics,
    userId?: string,
    companyId?: string,
    apiKeyId?: string
  ): Promise<void> {
    try {
      await prisma.apiUsageLog.create({
        data: {
          tenantId,
          companyId,
          userId,
          apiKeyId,
          endpoint: metrics.endpoint,
          method: metrics.method,
          statusCode: metrics.statusCode,
          responseTime: metrics.responseTime,
          requestSize: metrics.requestSize,
          responseSize: metrics.responseSize,
          userAgent: metrics.userAgent,
          ipAddress: metrics.ipAddress
        }
      });
    } catch (error) {
      console.error('Failed to log API usage:', error);
      // Don't throw error to avoid breaking the main request
    }
  }

  // Get API usage analytics
  static async getApiUsageAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    companyId?: string
  ): Promise<ApiUsageAnalytics> {
    const whereClause: any = {
      tenantId,
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    };

    if (companyId) {
      whereClause.companyId = companyId;
    }

    // Get total requests and average response time
    const [totalRequests, averageResponseTime, errorCount] = await Promise.all([
      prisma.apiUsageLog.count({ where: whereClause }),
      prisma.apiUsageLog.aggregate({
        where: whereClause,
        _avg: { responseTime: true }
      }),
      prisma.apiUsageLog.count({
        where: {
          ...whereClause,
          statusCode: { gte: 400 }
        }
      })
    ]);

    // Get top endpoints
    const topEndpoints = await prisma.apiUsageLog.groupBy({
      by: ['endpoint', 'method'],
      where: whereClause,
      _count: true,
      _avg: { responseTime: true },
      orderBy: { _count: { endpoint: 'desc' } },
      take: 10
    });

    // Get status code distribution
    const statusCodeDistribution = await prisma.apiUsageLog.groupBy({
      by: ['statusCode'],
      where: whereClause,
      _count: true
    });

    // Get hourly distribution
    const hourlyDistribution = await prisma.apiUsageLog.findMany({
      where: whereClause,
      select: {
        timestamp: true,
        responseTime: true
      }
    });

    // Process hourly data
    const hourlyMap = new Map<number, { count: number; totalResponseTime: number }>();
    hourlyDistribution.forEach(log => {
      const hour = log.timestamp.getHours();
      const existing = hourlyMap.get(hour) || { count: 0, totalResponseTime: 0 };
      hourlyMap.set(hour, {
        count: existing.count + 1,
        totalResponseTime: existing.totalResponseTime + log.responseTime
      });
    });

    const hourlyData = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
      hour,
      count: data.count,
      averageResponseTime: data.totalResponseTime / data.count
    }));

    return {
      totalRequests,
      averageResponseTime: averageResponseTime._avg.responseTime || 0,
      errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
      topEndpoints: topEndpoints.map(endpoint => ({
        endpoint: endpoint.endpoint,
        method: endpoint.method,
        count: endpoint._count,
        averageResponseTime: endpoint._avg.responseTime || 0
      })),
      statusCodeDistribution: statusCodeDistribution.reduce((acc, item) => {
        acc[item.statusCode] = item._count;
        return acc;
      }, {} as Record<number, number>),
      hourlyDistribution: hourlyData.sort((a, b) => a.hour - b.hour)
    };
  }

  // Get performance metrics
  static async getPerformanceMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    companyId?: string
  ): Promise<{
    p50: number;
    p95: number;
    p99: number;
    maxResponseTime: number;
    minResponseTime: number;
    totalErrors: number;
    totalRequests: number;
  }> {
    const whereClause: any = {
      tenantId,
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    };

    if (companyId) {
      whereClause.companyId = companyId;
    }

    const [responseTimes, totalRequests, totalErrors] = await Promise.all([
      prisma.apiUsageLog.findMany({
        where: whereClause,
        select: { responseTime: true },
        orderBy: { responseTime: 'asc' }
      }),
      prisma.apiUsageLog.count({ where: whereClause }),
      prisma.apiUsageLog.count({
        where: {
          ...whereClause,
          statusCode: { gte: 400 }
        }
      })
    ]);

    const sortedTimes = responseTimes.map(r => r.responseTime).sort((a, b) => a - b);
    const count = sortedTimes.length;

    if (count === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        totalErrors,
        totalRequests
      };
    }

    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    return {
      p50: sortedTimes[p50Index] || 0,
      p95: sortedTimes[p95Index] || 0,
      p99: sortedTimes[p99Index] || 0,
      maxResponseTime: sortedTimes[count - 1] || 0,
      minResponseTime: sortedTimes[0] || 0,
      totalErrors,
      totalRequests
    };
  }

  // Record custom metric
  static async recordMetric(
    tenantId: string,
    metricName: string,
    metricValue: number,
    metricUnit: string,
    tags?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.performanceMetric.create({
        data: {
          tenantId,
          metricName,
          metricValue,
          metricUnit,
          tags: tags ? JSON.stringify(tags) : null
        }
      });
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  // Get custom metrics
  static async getCustomMetrics(
    tenantId: string,
    metricName: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    timestamp: Date;
    value: number;
    unit: string;
    tags?: Record<string, any>;
  }>> {
    const metrics = await prisma.performanceMetric.findMany({
      where: {
        tenantId,
        metricName,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    return metrics.map(metric => ({
      timestamp: metric.timestamp,
      value: Number(metric.metricValue),
      unit: metric.metricUnit,
      tags: metric.tags ? JSON.parse(metric.tags) : undefined
    }));
  }

  // Cleanup old logs (run as cron job)
  static async cleanupOldLogs(retentionDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    await Promise.all([
      prisma.apiUsageLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      }),
      prisma.performanceMetric.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      })
    ]);
  }
}

// Middleware for automatic performance monitoring
export const performanceMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startSize = req.get('content-length') ? parseInt(req.get('content-length')!) : 0;

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const responseSize = chunk ? Buffer.byteLength(chunk, encoding) : 0;

    // Log performance metrics asynchronously
    setImmediate(async () => {
      try {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).user?.id;
        const companyId = (req as any).companyId;
        const apiKeyId = (req as any).apiKey?.id;

        if (tenantId) {
          await PerformanceMonitoringService.logApiUsage(tenantId, {
            responseTime,
            statusCode: res.statusCode,
            endpoint: req.path,
            method: req.method,
            requestSize: startSize,
            responseSize,
            userAgent: req.get('user-agent'),
            ipAddress: req.ip || req.connection.remoteAddress
          }, userId, companyId, apiKeyId);
        }
      } catch (error) {
        console.error('Performance monitoring error:', error);
      }
    });

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

