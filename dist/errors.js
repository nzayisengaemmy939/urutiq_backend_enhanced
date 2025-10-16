export class ApiError extends Error {
    statusCode;
    code;
    details;
    isOperational;
    constructor(statusCode, code, message, details, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;
        this.name = 'ApiError';
        Error.captureStackTrace(this, this.constructor);
    }
}
export class ValidationError extends ApiError {
    constructor(message, details) {
        super(400, 'validation_error', message, details);
    }
}
export class AuthenticationError extends ApiError {
    constructor(message = 'Authentication required') {
        super(401, 'authentication_error', message);
    }
}
export class AuthorizationError extends ApiError {
    constructor(message = 'Insufficient permissions') {
        super(403, 'authorization_error', message);
    }
}
export class NotFoundError extends ApiError {
    constructor(resource) {
        super(404, 'not_found', `${resource} not found`);
    }
}
export class ConflictError extends ApiError {
    constructor(message) {
        super(409, 'conflict', message);
    }
}
export class RateLimitError extends ApiError {
    constructor(message = 'Rate limit exceeded') {
        super(429, 'rate_limit_exceeded', message);
    }
}
// Enhanced error handler with logging
export function errorHandler(err, req, res, next) {
    // Log error details
    console.error('Error occurred:', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
        }
    });
    // Handle known API errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method,
            }
        });
    }
    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err;
        if (prismaError.code === 'P2002') {
            return res.status(409).json({
                error: {
                    code: 'duplicate_entry',
                    message: 'A record with this information already exists',
                    timestamp: new Date().toISOString(),
                    path: req.path,
                    method: req.method,
                }
            });
        }
        if (prismaError.code === 'P2025') {
            return res.status(404).json({
                error: {
                    code: 'not_found',
                    message: 'Record not found',
                    timestamp: new Date().toISOString(),
                    path: req.path,
                    method: req.method,
                }
            });
        }
    }
    // Handle validation errors
    if (err.name === 'ZodError') {
        return res.status(400).json({
            error: {
                code: 'validation_error',
                message: 'Invalid request data',
                details: err.errors,
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method,
            }
        });
    }
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: {
                code: 'invalid_token',
                message: 'Invalid authentication token',
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method,
            }
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: {
                code: 'token_expired',
                message: 'Authentication token has expired',
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method,
            }
        });
    }
    // Default error response
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;
    res.status(statusCode).json({
        error: {
            code: 'internal_error',
            message,
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
        }
    });
}
// Async error wrapper
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
