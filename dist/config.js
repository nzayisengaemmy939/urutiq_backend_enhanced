/**
 * Backend Environment Configuration
 * This centralizes all environment variables - no fallbacks
 */
// Debug: Log all environment variables (commented out to avoid loading before dotenv)
// console.log('🔧 All environment variables:', Object.keys(process.env).filter(key => key.includes('PORT') || key.includes('JWT') || key.includes('DATABASE') || key.includes('HOST') || key.includes('NODE_ENV') || key.includes('API') || key.includes('FRONTEND')));
// Get environment variables - throws error if not set
const getEnvVar = (key) => {
    const value = process.env[key];
    console.log(`🔧 Environment variable ${key}:`, value);
    if (!value) {
        throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value;
};
const getEnvVarNumber = (key) => {
    const value = process.env[key];
    console.log(`🔧 Environment variable ${key}:`, value);
    if (!value) {
        throw new Error(`Environment variable ${key} is required but not set`);
    }
    const num = Number(value);
    if (isNaN(num)) {
        throw new Error(`Environment variable ${key} must be a valid number`);
    }
    return num;
};
// Lazy loading configuration - only evaluate when accessed
export const config = {
    // Server Configuration
    get server() {
        return {
            port: getEnvVarNumber('PORT_BACKEND'),
            host: getEnvVar('HOST'),
            environment: getEnvVar('NODE_ENV'),
        };
    },
    // API Configuration
    get api() {
        return {
            baseUrl: getEnvVar('API_BASE_URL'),
            frontendUrl: getEnvVar('FRONTEND_URL'),
        };
    },
    // Database Configuration
    get database() {
        return {
            url: getEnvVar('DATABASE_URL'),
        };
    },
    // Authentication
    get auth() {
        return {
            jwtSecret: getEnvVar('JWT_SECRET'),
            jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN'),
        };
    },
    // Email Configuration (optional - with fallbacks)
    email: {
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtpPort: Number(process.env.SMTP_PORT) || 587,
        smtpUser: process.env.SMTP_USER || '',
        smtpPass: process.env.SMTP_PASS || '',
        smtpSecure: process.env.SMTP_SECURE === 'true',
        fromEmail: process.env.FROM_EMAIL || 'noreply@urutibiz.com',
        fromName: process.env.FROM_NAME || 'Urutiq',
    },
    // AI Services Configuration (optional - with fallbacks)
    ai: {
        ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
        huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY || '',
    },
    // External API Configuration (optional - with fallbacks)
    external: {
        nextPublicApiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    },
    // Payment Services (optional - with fallbacks)
    payments: {
        stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    // Bank Integration (optional - with fallbacks)
    banking: {
        chaseApiEndpoint: process.env.CHASE_API_ENDPOINT || 'https://api.chase.com',
        bankOfAmericaApiEndpoint: process.env.BANK_OF_AMERICA_API_ENDPOINT || 'https://api.bankofamerica.com',
        wellsFargoApiEndpoint: process.env.WELLS_FARGO_API_ENDPOINT || 'https://api.wellsfargo.com',
    },
    // Mobile Money Services (optional - with fallbacks)
    mobileMoney: {
        paypalApiEndpoint: process.env.PAYPAL_API_ENDPOINT || 'https://api.paypal.com/v1',
        venmoApiEndpoint: process.env.VENMO_API_ENDPOINT || 'https://api.venmo.com/v1',
        mtnGhanaApiEndpoint: process.env.MTN_GHANA_API_ENDPOINT || 'https://api.mtn.com.gh/momo',
        mtnNigeriaApiEndpoint: process.env.MTN_NIGERIA_API_ENDPOINT || 'https://api.mtn.com.ng/momo',
    },
};
// Helper functions for common configurations
export const getApiUrl = (endpoint = '') => {
    const baseUrl = config.api.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
    return `${baseUrl}/${cleanEndpoint}`;
};
export const getFrontendUrl = (path = '') => {
    const baseUrl = config.api.frontendUrl.replace(/\/$/, ''); // Remove trailing slash
    const cleanPath = path.replace(/^\//, ''); // Remove leading slash
    return `${baseUrl}/${cleanPath}`;
};
export const getOllamaUrl = (endpoint = '') => {
    const baseUrl = config.ai.ollamaBaseUrl.replace(/\/$/, ''); // Remove trailing slash
    const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
    return `${baseUrl}/${cleanEndpoint}`;
};
export const getBankApiUrl = (bank, endpoint = '') => {
    let baseUrl;
    switch (bank.toLowerCase()) {
        case 'chase':
            baseUrl = config.banking.chaseApiEndpoint;
            break;
        case 'bankofamerica':
            baseUrl = config.banking.bankOfAmericaApiEndpoint;
            break;
        case 'wellsfargo':
            baseUrl = config.banking.wellsFargoApiEndpoint;
            break;
        default:
            baseUrl = config.api.baseUrl;
    }
    const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
    return `${baseUrl}/${cleanEndpoint}`;
};
export const getMobileMoneyApiUrl = (provider, endpoint = '') => {
    let baseUrl;
    switch (provider.toLowerCase()) {
        case 'paypal':
            baseUrl = config.mobileMoney.paypalApiEndpoint;
            break;
        case 'venmo':
            baseUrl = config.mobileMoney.venmoApiEndpoint;
            break;
        case 'mtn_ghana':
            baseUrl = config.mobileMoney.mtnGhanaApiEndpoint;
            break;
        case 'mtn_nigeria':
            baseUrl = config.mobileMoney.mtnNigeriaApiEndpoint;
            break;
        default:
            baseUrl = config.api.baseUrl;
    }
    const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
    return `${baseUrl}/${cleanEndpoint}`;
};
