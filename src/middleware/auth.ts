import { Request, Response, NextFunction } from 'express'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    tenantId: string
  }
}

export const authMiddleware = (secret: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // In a real implementation, this would verify JWT tokens, session cookies, etc.
    // For now, we'll use a simple demo authentication
    
    const authHeader = req.headers.authorization
    const tenantId = req.headers['x-tenant-id'] as string
    
    if (!authHeader && !tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        details: 'Missing authorization header or tenant ID'
      })
    }

    // Demo user for development
    req.user = {
      id: 'demo-user-1',
      email: 'demo@example.com',
      role: 'admin',
      tenantId: tenantId || 'tenant_demo'
    }

    next()
  }
}

export const requireRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        details: `Required roles: ${roles.join(', ')}`
      })
    }

    next()
  }
}
