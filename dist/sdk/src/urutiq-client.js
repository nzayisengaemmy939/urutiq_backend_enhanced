import { EventEmitter } from 'events';
// Error Classes
export class UrutiIQError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.name = 'UrutiIQError';
    }
}
export class NetworkError extends UrutiIQError {
    constructor(message, details) {
        super(0, 'NETWORK_ERROR', message, details);
        this.name = 'NetworkError';
    }
}
export class TimeoutError extends UrutiIQError {
    constructor(message, details) {
        super(408, 'TIMEOUT_ERROR', message, details);
        this.name = 'TimeoutError';
    }
}
// Main Client Class
export class UrutiIQClient extends EventEmitter {
    config;
    requestId = 0;
    constructor(config) {
        super();
        this.config = {
            baseUrl: config.baseUrl || 'https://api.urutiq.com',
            apiKey: config.apiKey || '',
            accessToken: config.accessToken || '',
            tenantId: config.tenantId || '',
            companyId: config.companyId || '',
            timeout: config.timeout || 30000,
            retries: config.retries || 3,
            retryDelay: config.retryDelay || 1000
        };
        // Validate configuration
        if (!this.config.apiKey && !this.config.accessToken) {
            throw new UrutiIQError(400, 'INVALID_CONFIG', 'Either apiKey or accessToken must be provided');
        }
    }
    // Core HTTP methods
    async request(options) {
        const requestId = ++this.requestId;
        const startTime = Date.now();
        try {
            this.emit('request:start', { requestId, options });
            const url = this.buildUrl(options.endpoint, options.params);
            const headers = this.buildHeaders(options.headers);
            const body = options.data ? JSON.stringify(options.data) : undefined;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.config.timeout);
            const response = await fetch(url, {
                method: options.method,
                headers,
                body,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const responseData = await this.parseResponse(response);
            const duration = Date.now() - startTime;
            this.emit('request:success', { requestId, options, response: responseData, duration });
            return responseData;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    const timeoutError = new TimeoutError('Request timeout');
                    this.emit('request:error', { requestId, options, error: timeoutError, duration });
                    throw timeoutError;
                }
                if (error.message.includes('fetch')) {
                    const networkError = new NetworkError('Network error', error.message);
                    this.emit('request:error', { requestId, options, error: networkError, duration });
                    throw networkError;
                }
            }
            this.emit('request:error', { requestId, options, error, duration });
            throw error;
        }
    }
    buildUrl(endpoint, params) {
        const url = new URL(endpoint, this.config.baseUrl);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }
        return url.toString();
    }
    buildHeaders(customHeaders) {
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'UrutiIQ-SDK/1.0.0',
            ...customHeaders
        };
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        else if (this.config.accessToken) {
            headers['Authorization'] = `Bearer ${this.config.accessToken}`;
        }
        if (this.config.tenantId) {
            headers['x-tenant-id'] = this.config.tenantId;
        }
        if (this.config.companyId) {
            headers['x-company-id'] = this.config.companyId;
        }
        return headers;
    }
    async parseResponse(response) {
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }
        else {
            data = await response.text();
        }
        if (!response.ok) {
            const errorData = data;
            throw new UrutiIQError(response.status, errorData.error || 'UNKNOWN_ERROR', errorData.error_description || errorData.message || 'Request failed', errorData);
        }
        return {
            data,
            status: response.status,
            statusText: response.statusText,
            headers
        };
    }
    // Accounting Reports API
    async getTrialBalance(params) {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/accounting-reports/trial-balance',
            params
        });
        return response.data;
    }
    async getGeneralLedger(params) {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/accounting-reports/general-ledger',
            params
        });
        return response.data;
    }
    async getBalanceSheet(params) {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/accounting-reports/balance-sheet',
            params
        });
        return response.data;
    }
    async getIncomeStatement(params) {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/accounting-reports/income-statement',
            params
        });
        return response.data;
    }
    async getCashFlow(params) {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/accounting-reports/cash-flow',
            params
        });
        return response.data;
    }
    async getARAging(params) {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/accounting-reports/ar-aging',
            params
        });
        return response.data;
    }
    async getAPAging(params) {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/accounting-reports/ap-aging',
            params
        });
        return response.data;
    }
    // API Key Management
    async createApiKey(data) {
        const response = await this.request({
            method: 'POST',
            endpoint: '/api/api-keys',
            data
        });
        return response.data;
    }
    async getApiKeys(params) {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/api-keys',
            params
        });
        return response.data;
    }
    async updateApiKey(id, data) {
        const response = await this.request({
            method: 'PUT',
            endpoint: `/api/api-keys/${id}`,
            data
        });
        return response.data;
    }
    async deleteApiKey(id) {
        await this.request({
            method: 'DELETE',
            endpoint: `/api/api-keys/${id}`
        });
    }
    async getApiKeyPermissions() {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/api-keys/permissions'
        });
        return response.data;
    }
    // OAuth 2.1 Management
    async createOAuthClient(data) {
        const response = await this.request({
            method: 'POST',
            endpoint: '/api/oauth2/clients',
            data
        });
        return response.data;
    }
    async getOAuthClients() {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/oauth2/clients'
        });
        return response.data;
    }
    async updateOAuthClient(id, data) {
        const response = await this.request({
            method: 'PUT',
            endpoint: `/api/oauth2/clients/${id}`,
            data
        });
        return response.data;
    }
    async deleteOAuthClient(id) {
        await this.request({
            method: 'DELETE',
            endpoint: `/api/oauth2/clients/${id}`
        });
    }
    async getOAuthScopes() {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/oauth2/scopes'
        });
        return response.data;
    }
    // Performance Analytics
    async getApiUsageAnalytics(params) {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/analytics/api-usage',
            params
        });
        return response.data;
    }
    async getPerformanceMetrics(params) {
        const response = await this.request({
            method: 'GET',
            endpoint: '/api/analytics/performance',
            params
        });
        return response.data;
    }
    async getCustomMetrics(metricName, params) {
        const response = await this.request({
            method: 'GET',
            endpoint: `/api/analytics/metrics/${metricName}`,
            params
        });
        return response.data;
    }
    async recordCustomMetric(data) {
        await this.request({
            method: 'POST',
            endpoint: '/api/analytics/metrics',
            data
        });
    }
    // Health Check
    async healthCheck() {
        const response = await this.request({
            method: 'GET',
            endpoint: '/health'
        });
        return response.data;
    }
    async redisHealthCheck() {
        const response = await this.request({
            method: 'GET',
            endpoint: '/health/redis'
        });
        return response.data;
    }
    // Utility methods
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    getConfig() {
        return { ...this.config };
    }
    // Event handling
    onRequestStart(callback) {
        return this.on('request:start', callback);
    }
    onRequestSuccess(callback) {
        return this.on('request:success', callback);
    }
    onRequestError(callback) {
        return this.on('request:error', callback);
    }
}
// Factory function
export function createUrutiIQClient(config) {
    return new UrutiIQClient(config);
}
// Default export
export default UrutiIQClient;
