import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/api-key.service.js';
import { ApiError } from '../errors.js';

export interface ApiKeyRequest extends Request {
  apiKey?: {
    id: string;
    name: string;
    permissions: string[];
    user: {
      id: string;
      tenantId: string;
      companyId: string;
    };
  };
}

export const apiKeyAuthMiddleware = (requiredPermissions?: string[]) => {
  return async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      console.log("test")
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ApiError(401, 'MISSING_API_KEY', 'API key is required');
      }
      
      const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Validate API key
      const validation = await ApiKeyService.validateApiKey(apiKey);
      
      if (!validation) {
        throw new ApiError(401, 'INVALID_API_KEY', 'Invalid or expired API key');
      }
      
      // Check permissions if required
      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.every(permission => 
          ApiKeyService.hasPermission(validation.apiKey, permission)
        );
        
        if (!hasPermission) {
          throw new ApiError(403, 'INSUFFICIENT_PERMISSIONS', 'Insufficient permissions');
        }
      }
      
      // Attach API key info to request
      req.apiKey = {
        id: validation.apiKey.id,
        name: validation.apiKey.name,
        permissions: validation.apiKey.permissions,
        user: validation.user
      };
      
      // Set tenant and company context
      (req as any).tenantId = validation.user.tenantId;
      (req as any).companyId = validation.user.companyId;
      (req as any).userId = validation.user.id;
      
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          error: error.code,
          error_description: error.message
        });
      }
      
      return res.status(401).json({
        error: 'invalid_api_key',
        error_description: 'Invalid API key'
      });
    }
  };
};

// Middleware to check specific API key permissions
export const requireApiKeyPermission = (permission: string) => {
  return (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'missing_api_key',
        error_description: 'API key is required'
      });
    }
    
    if (!ApiKeyService.hasPermission(req.apiKey, permission)) {
      return res.status(403).json({
        error: 'insufficient_permissions',
        error_description: `Permission '${permission}' is required`
      });
    }
    
    next();
  };
};

