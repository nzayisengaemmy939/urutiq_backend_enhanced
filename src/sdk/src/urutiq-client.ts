import { EventEmitter } from 'events';

// Types and Interfaces
export interface UrutiIQConfig {
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  tenantId?: string;
  companyId?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TrialBalanceData {
  reportType: string;
  period: {
    startDate: string;
    endDate: string;
  };
  accounts: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    accountType: string;
    debitTotal: number;
    creditTotal: number;
    balance: number;
    isDebit: boolean;
  }>;
  summary: {
    totalDebits: number;
    totalCredits: number;
    difference: number;
    isBalanced: boolean;
  };
  generatedAt: string;
}

export interface GeneralLedgerData {
  reportType: string;
  period: {
    startDate: string;
    endDate: string;
  };
  entries: Array<{
    id: string;
    date: string;
    account: {
      id: string;
      code: string;
      name: string;
      type: string;
    };
    entry: {
      id: string;
      memo: string;
      reference: string;
      status: string;
    };
    debit: number;
    credit: number;
    balance: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  generatedAt: string;
}

export interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface OAuthClientData {
  id: string;
  clientId: string;
  name: string;
  description?: string;
  redirectUris: string[];
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceMetrics {
  p50: number;
  p95: number;
  p99: number;
  maxResponseTime: number;
  minResponseTime: number;
  totalErrors: number;
  totalRequests: number;
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

// Error Classes
export class UrutiIQError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'UrutiIQError';
  }
}

export class NetworkError extends UrutiIQError {
  constructor(message: string, details?: any) {
    super(0, 'NETWORK_ERROR', message, details);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends UrutiIQError {
  constructor(message: string, details?: any) {
    super(408, 'TIMEOUT_ERROR', message, details);
    this.name = 'TimeoutError';
  }
}

// Main Client Class
export class UrutiIQClient extends EventEmitter {
  private config: Required<UrutiIQConfig>;
  private requestId = 0;

  constructor(config: UrutiIQConfig) {
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
  private async request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
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

      const responseData = await this.parseResponse<T>(response);
      const duration = Date.now() - startTime;

      this.emit('request:success', { requestId, options, response: responseData, duration });

      return responseData;
    } catch (error) {
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

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
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

  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'UrutiIQ-SDK/1.0.0',
      ...customHeaders
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else if (this.config.accessToken) {
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

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    let data: T;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text() as T;
    }

    if (!response.ok) {
      const errorData = data as any;
      throw new UrutiIQError(
        response.status,
        errorData.error || 'UNKNOWN_ERROR',
        errorData.error_description || errorData.message || 'Request failed',
        errorData
      );
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers
    };
  }

  // Accounting Reports API
  async getTrialBalance(params: {
    startDate: string;
    endDate: string;
  }): Promise<TrialBalanceData> {
    const response = await this.request<TrialBalanceData>({
      method: 'GET',
      endpoint: '/api/accounting-reports/trial-balance',
      params
    });
    return response.data;
  }

  async getGeneralLedger(params: {
    startDate: string;
    endDate: string;
    accountId?: string;
    page?: number;
    limit?: number;
  }): Promise<GeneralLedgerData> {
    const response = await this.request<GeneralLedgerData>({
      method: 'GET',
      endpoint: '/api/accounting-reports/general-ledger',
      params
    });
    return response.data;
  }

  async getBalanceSheet(params: {
    asOfDate: string;
  }): Promise<any> {
    const response = await this.request({
      method: 'GET',
      endpoint: '/api/accounting-reports/balance-sheet',
      params
    });
    return response.data;
  }

  async getIncomeStatement(params: {
    startDate: string;
    endDate: string;
  }): Promise<any> {
    const response = await this.request({
      method: 'GET',
      endpoint: '/api/accounting-reports/income-statement',
      params
    });
    return response.data;
  }

  async getCashFlow(params: {
    startDate: string;
    endDate: string;
  }): Promise<any> {
    const response = await this.request({
      method: 'GET',
      endpoint: '/api/accounting-reports/cash-flow',
      params
    });
    return response.data;
  }

  async getARAging(params: {
    asOfDate: string;
  }): Promise<any> {
    const response = await this.request({
      method: 'GET',
      endpoint: '/api/accounting-reports/ar-aging',
      params
    });
    return response.data;
  }

  async getAPAging(params: {
    asOfDate: string;
  }): Promise<any> {
    const response = await this.request({
      method: 'GET',
      endpoint: '/api/accounting-reports/ap-aging',
      params
    });
    return response.data;
  }

  // API Key Management
  async createApiKey(data: {
    companyId: string;
    name: string;
    permissions: string[];
    expiresAt?: string;
  }): Promise<ApiKeyData & { plainKey?: string }> {
    const response = await this.request<ApiKeyData & { plainKey?: string }>({
      method: 'POST',
      endpoint: '/api/api-keys',
      data
    });
    return response.data;
  }

  async getApiKeys(params: {
    companyId: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ApiKeyData>> {
    const response = await this.request<PaginatedResponse<ApiKeyData>>({
      method: 'GET',
      endpoint: '/api/api-keys',
      params
    });
    return response.data;
  }

  async updateApiKey(id: string, data: {
    name?: string;
    permissions?: string[];
    expiresAt?: string;
    isActive?: boolean;
  }): Promise<ApiKeyData> {
    const response = await this.request<ApiKeyData>({
      method: 'PUT',
      endpoint: `/api/api-keys/${id}`,
      data
    });
    return response.data;
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      endpoint: `/api/api-keys/${id}`
    });
  }

  async getApiKeyPermissions(): Promise<{
    permissions: string[];
    permissionGroups: Record<string, string[]>;
  }> {
    const response = await this.request({
      method: 'GET',
      endpoint: '/api/api-keys/permissions'
    });
    return response.data;
  }

  // OAuth 2.1 Management
  async createOAuthClient(data: {
    name: string;
    description?: string;
    redirectUris: string[];
    scopes: string[];
  }): Promise<OAuthClientData & { clientSecret?: string }> {
    const response = await this.request<OAuthClientData & { clientSecret?: string }>({
      method: 'POST',
      endpoint: '/api/oauth2/clients',
      data
    });
    return response.data;
  }

  async getOAuthClients(): Promise<OAuthClientData[]> {
    const response = await this.request<OAuthClientData[]>({
      method: 'GET',
      endpoint: '/api/oauth2/clients'
    });
    return response.data;
  }

  async updateOAuthClient(id: string, data: {
    name?: string;
    description?: string;
    redirectUris?: string[];
    scopes?: string[];
    isActive?: boolean;
  }): Promise<OAuthClientData> {
    const response = await this.request<OAuthClientData>({
      method: 'PUT',
      endpoint: `/api/oauth2/clients/${id}`,
      data
    });
    return response.data;
  }

  async deleteOAuthClient(id: string): Promise<void> {
    await this.request({
      method: 'DELETE',
      endpoint: `/api/oauth2/clients/${id}`
    });
  }

  async getOAuthScopes(): Promise<{
    scopes: Record<string, string>;
    description: Record<string, string>;
  }> {
    const response = await this.request({
      method: 'GET',
      endpoint: '/api/oauth2/scopes'
    });
    return response.data;
  }

  // Performance Analytics
  async getApiUsageAnalytics(params: {
    startDate: string;
    endDate: string;
    companyId?: string;
  }): Promise<ApiUsageAnalytics> {
    const response = await this.request<ApiUsageAnalytics>({
      method: 'GET',
      endpoint: '/api/analytics/api-usage',
      params
    });
    return response.data;
  }

  async getPerformanceMetrics(params: {
    startDate: string;
    endDate: string;
    companyId?: string;
  }): Promise<PerformanceMetrics> {
    const response = await this.request<PerformanceMetrics>({
      method: 'GET',
      endpoint: '/api/analytics/performance',
      params
    });
    return response.data;
  }

  async getCustomMetrics(metricName: string, params: {
    startDate: string;
    endDate: string;
  }): Promise<Array<{
    timestamp: string;
    value: number;
    unit: string;
    tags?: Record<string, any>;
  }>> {
    const response = await this.request({
      method: 'GET',
      endpoint: `/api/analytics/metrics/${metricName}`,
      params
    });
    return response.data;
  }

  async recordCustomMetric(data: {
    metricName: string;
    metricValue: number;
    metricUnit: string;
    tags?: Record<string, any>;
  }): Promise<void> {
    await this.request({
      method: 'POST',
      endpoint: '/api/analytics/metrics',
      data
    });
  }

  // Health Check
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    version: string;
  }> {
    const response = await this.request({
      method: 'GET',
      endpoint: '/health'
    });
    return response.data;
  }

  async redisHealthCheck(): Promise<{
    status: string;
    connected: boolean;
    stats: any;
  }> {
    const response = await this.request({
      method: 'GET',
      endpoint: '/health/redis'
    });
    return response.data;
  }

  // Utility methods
  updateConfig(config: Partial<UrutiIQConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): UrutiIQConfig {
    return { ...this.config };
  }

  // Event handling
  onRequestStart(callback: (data: { requestId: number; options: RequestOptions }) => void): this {
    return this.on('request:start', callback);
  }

  onRequestSuccess(callback: (data: { requestId: number; options: RequestOptions; response: ApiResponse; duration: number }) => void): this {
    return this.on('request:success', callback);
  }

  onRequestError(callback: (data: { requestId: number; options: RequestOptions; error: Error; duration: number }) => void): this {
    return this.on('request:error', callback);
  }
}

// Factory function
export function createUrutiIQClient(config: UrutiIQConfig): UrutiIQClient {
  return new UrutiIQClient(config);
}

// Default export
export default UrutiIQClient;
