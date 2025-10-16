import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
// Rate limiting for different endpoints
export const createRateLimiters = () => {
    // General API rate limit
    const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        skip: () => process.env.NODE_ENV !== 'production',
    });
    // Stricter limit for auth endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 requests per windowMs
        message: 'Too many authentication attempts, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        skip: () => process.env.NODE_ENV !== 'production',
    });
    // File upload rate limit
    const uploadLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // limit each IP to 20 uploads per windowMs
        message: 'Too many file uploads, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        skip: () => process.env.NODE_ENV !== 'production',
    });
    return { generalLimiter, authLimiter, uploadLimiter };
};
// Security headers configuration
export const securityConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
});
// Input sanitization helper
export const sanitizeInput = (input) => {
    return input
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .trim();
};
// SQL injection prevention helper
export const validateSqlInput = (input) => {
    const sqlKeywords = [
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
        'UNION', 'EXEC', 'EXECUTE', 'SCRIPT', 'EVAL', 'FUNCTION'
    ];
    const upperInput = input.toUpperCase();
    return !sqlKeywords.some(keyword => upperInput.includes(keyword));
};
