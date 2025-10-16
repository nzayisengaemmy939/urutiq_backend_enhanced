import { Request, Response, NextFunction } from 'express'

export interface TenantRequest extends Request {
  tenantId?: string
}

export const tenantMiddleware = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    // Extract tenant ID from headers, query params, or subdomain
    const tenantId = 
      req.headers['x-tenant-id'] as string ||
      req.query.tenantId as string ||
      req.subdomains?.[0] ||
      'default'

    // Attach tenant ID to request
    req.tenantId = tenantId

    // In a real implementation, you might:
    // 1. Validate the tenant exists
    // 2. Set up tenant-specific database connections
    // 3. Apply tenant-specific configurations

    next()
  }
}
