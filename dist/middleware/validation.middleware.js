import { z } from 'zod';
import { formatValidationError } from '../validation/schemas';
export const validateRequest = (options) => {
    return (req, res, next) => {
        try {
            // Validate request body
            if (options.body) {
                const bodyResult = options.body.safeParse(req.body);
                if (!bodyResult.success) {
                    return res.status(400).json({
                        success: false,
                        error: 'VALIDATION_ERROR',
                        message: 'Request body validation failed',
                        details: formatValidationError(bodyResult.error)
                    });
                }
                req.body = bodyResult.data;
            }
            // Validate query parameters
            if (options.query) {
                const queryResult = options.query.safeParse(req.query);
                if (!queryResult.success) {
                    return res.status(400).json({
                        success: false,
                        error: 'VALIDATION_ERROR',
                        message: 'Query parameters validation failed',
                        details: formatValidationError(queryResult.error)
                    });
                }
                req.query = queryResult.data;
            }
            // Validate route parameters
            if (options.params) {
                const paramsResult = options.params.safeParse(req.params);
                if (!paramsResult.success) {
                    return res.status(400).json({
                        success: false,
                        error: 'VALIDATION_ERROR',
                        message: 'Route parameters validation failed',
                        details: formatValidationError(paramsResult.error)
                    });
                }
                req.params = paramsResult.data;
            }
            // Validate headers
            if (options.headers) {
                const headersResult = options.headers.safeParse(req.headers);
                if (!headersResult.success) {
                    return res.status(400).json({
                        success: false,
                        error: 'VALIDATION_ERROR',
                        message: 'Headers validation failed',
                        details: formatValidationError(headersResult.error)
                    });
                }
                req.headers = { ...req.headers, ...headersResult.data };
            }
            next();
        }
        catch (error) {
            console.error('Validation middleware error:', error);
            return res.status(500).json({
                success: false,
                error: 'INTERNAL_ERROR',
                message: 'Validation middleware error'
            });
        }
    };
};
// Common validation schemas for common patterns
export const commonSchemas = {
    // Pagination
    pagination: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).default('asc')
    }),
    // ID parameter
    idParam: z.object({
        id: z.string().uuid('Invalid ID format')
    }),
    // Tenant and Company headers
    tenantHeaders: z.object({
        'x-tenant-id': z.string().min(1, 'Tenant ID is required'),
        'x-company-id': z.string().min(1, 'Company ID is required')
    }),
    // Search parameters
    search: z.object({
        q: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
        category: z.string().optional(),
        status: z.string().optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional()
    }),
    // Date range
    dateRange: z.object({
        startDate: z.string().datetime('Invalid start date format'),
        endDate: z.string().datetime('Invalid end date format')
    }).refine((data) => new Date(data.endDate) > new Date(data.startDate), { message: 'End date must be after start date', path: ['endDate'] }),
    // Status filter
    statusFilter: z.object({
        status: z.enum(['active', 'inactive', 'draft', 'pending', 'approved', 'rejected', 'cancelled'])
    }),
    // Amount range
    amountRange: z.object({
        minAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).optional(),
        maxAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).optional()
    }).refine((data) => !data.minAmount || !data.maxAmount || data.minAmount <= data.maxAmount, { message: 'Minimum amount must be less than or equal to maximum amount', path: ['minAmount'] })
};
// Validation error handler
export const handleValidationError = (error, res) => {
    const formattedErrors = formatValidationError(error);
    return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: formattedErrors
    });
};
// Async validation helper for database checks
export const validateAsync = async (schema, data, customChecks) => {
    try {
        // Basic schema validation
        const result = schema.safeParse(data);
        if (!result.success) {
            return {
                success: false,
                errors: formatValidationError(result.error).map(err => err.message)
            };
        }
        // Custom async validation
        if (customChecks) {
            const customResult = await customChecks(result.data);
            if (!customResult.isValid) {
                return {
                    success: false,
                    errors: customResult.errors
                };
            }
        }
        return {
            success: true,
            data: result.data
        };
    }
    catch (error) {
        console.error('Async validation error:', error);
        return {
            success: false,
            errors: ['Validation error occurred']
        };
    }
};
// Validation middleware for specific modules
export const moduleValidators = {
    // Expense validation with custom checks
    expense: (req, res, next) => {
        // Add custom expense validation logic here
        next();
    },
    // Purchase order validation with custom checks
    purchaseOrder: (req, res, next) => {
        // Add custom purchase order validation logic here
        next();
    },
    // Journal entry validation with custom checks
    journalEntry: (req, res, next) => {
        // Add custom journal entry validation logic here
        next();
    },
    // Product validation with custom checks
    product: (req, res, next) => {
        // Add custom product validation logic here
        next();
    }
};
export default {
    validateRequest,
    commonSchemas,
    handleValidationError,
    validateAsync,
    moduleValidators
};
