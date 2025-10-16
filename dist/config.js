/**
 * Backend Environment Configuration
 * This centralizes all environment variables and provides fallbacks
 */
export const config = {
    // Server Configuration
    server: {
        port: Number(process.env.PORT_BACKEND) || 4000,
        host: process.env.HOST || 'localhost',
        environment: process.env.NODE_ENV || 'development',
    },
    // API Configuration
    api: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
    // Database Configuration
    database: {
        url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
    },
    // Authentication
    auth: {
        jwtSecret: process.env.JWT_SECRET || 'dev-secret',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    // Email Configuration
    email: {
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtpPort: Number(process.env.SMTP_PORT) || 587,
        smtpUser: process.env.SMTP_USER || '',
        smtpPass: process.env.SMTP_PASS || '',
        smtpSecure: process.env.SMTP_SECURE === 'true',
        fromEmail: process.env.FROM_EMAIL || 'noreply@urutibiz.com',
        fromName: process.env.FROM_NAME || 'Urutiq',
    },
    // AI Services Configuration
    ai: {
        ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
        huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY || '',
    },
    // External API Configuration
    external: {
        nextPublicApiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    },
    // Payment Services
    payments: {
        stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    // Bank Integration
    banking: {
        chaseApiEndpoint: process.env.CHASE_API_ENDPOINT || 'https://api.chase.com',
        bankOfAmericaApiEndpoint: process.env.BANK_OF_AMERICA_API_ENDPOINT || 'https://api.bankofamerica.com',
        wellsFargoApiEndpoint: process.env.WELLS_FARGO_API_ENDPOINT || 'https://api.wellsfargo.com',
    },
    // Mobile Money Services
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
