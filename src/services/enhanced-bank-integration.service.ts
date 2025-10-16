import { prisma } from '../prisma';
import { ApiError } from '../errors';
import crypto from 'crypto';

export interface BankConnection {
  id: string;
  tenantId: string;
  companyId: string;
  bankId: string;
  bankName: string;
  accountType: 'checking' | 'savings' | 'credit' | 'investment' | 'loan';
  accountNumber: string;
  routingNumber?: string;
  accountName: string;
  currency: string;
  isActive: boolean;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  credentials: BankCredentials;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankCredentials {
  type: 'oauth' | 'api_key' | 'username_password' | 'token';
  encryptedData: string;
  expiresAt?: Date;
  refreshToken?: string;
}

export interface BankTransaction {
  id: string;
  bankConnectionId: string;
  externalId: string;
  date: Date;
  amount: number;
  currency: string;
  description: string;
  merchantName?: string;
  category?: string;
  subcategory?: string;
  accountBalance?: number;
  transactionType: 'debit' | 'credit' | 'transfer';
  status: 'pending' | 'posted' | 'cancelled';
  isReconciled: boolean;
  reconciledAt?: Date;
  matchedPaymentId?: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashFlowForecast {
  id: string;
  tenantId: string;
  companyId: string;
  forecastDate: Date;
  forecastPeriod: '7d' | '14d' | '30d' | '60d' | '90d';
  confidence: number; // 0-100
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  endingBalance: number;
  dailyProjections: DailyProjection[];
  riskFactors: RiskFactor[];
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyProjection {
  date: Date;
  expectedInflows: number;
  expectedOutflows: number;
  netFlow: number;
  projectedBalance: number;
  confidence: number;
  transactions: ProjectedTransaction[];
}

export interface ProjectedTransaction {
  description: string;
  amount: number;
  type: 'inflow' | 'outflow';
  confidence: number;
  category: string;
  isRecurring: boolean;
  pattern: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface RiskFactor {
  type: 'low_balance' | 'high_outflow' | 'unusual_pattern' | 'seasonal' | 'market';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number;
  probability: number;
  mitigation: string;
}

export interface BankSyncResult {
  success: boolean;
  transactionsAdded: number;
  transactionsUpdated: number;
  errors: string[];
  syncDuration: number;
  nextSyncAt: Date;
}

export interface BankProvider {
  id: string;
  name: string;
  country: string;
  supportedAccountTypes: string[];
  features: string[];
  apiEndpoint: string;
  authType: 'oauth' | 'api_key' | 'username_password';
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  isActive: boolean;
}

export class EnhancedBankIntegrationService {
  /**
   * Connect to a bank account
   */
  static async connectBankAccount(
    tenantId: string,
    companyId: string,
    bankData: {
      bankId: string;
      accountType: string;
      accountNumber: string;
      routingNumber?: string;
      accountName: string;
      currency: string;
      credentials: any;
    }
  ): Promise<BankConnection> {
    // Validate bank provider
    const bankProvider = await this.getBankProvider(bankData.bankId);
    if (!bankProvider || !bankProvider.isActive) {
      throw new ApiError(400, 'BANK_PROVIDER_NOT_FOUND', 'Bank provider not found or inactive');
    }

    // Encrypt credentials
    const encryptedCredentials = this.encryptCredentials(bankData.credentials);

    // Test connection
    const connectionTest = await this.testBankConnection(bankData.bankId, bankData.credentials);
    if (!connectionTest.success) {
      throw new ApiError(400, 'BANK_CONNECTION_FAILED', connectionTest.error || 'Failed to connect to bank');
    }

    // Create bank connection
    const bankConnection: BankConnection = {
      id: `bank_conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      companyId,
      bankId: bankData.bankId,
      bankName: bankProvider.name,
      accountType: bankData.accountType as any,
      accountNumber: bankData.accountNumber,
      routingNumber: bankData.routingNumber,
      accountName: bankData.accountName,
      currency: bankData.currency,
      isActive: true,
      syncFrequency: 'daily',
      credentials: {
        type: bankProvider.authType,
        encryptedData: encryptedCredentials,
        expiresAt: connectionTest.expiresAt
      },
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    await prisma.bankConnection.create({
      data: {
        id: bankConnection.id,
        tenantId,
        companyId,
        provider: 'manual',
        providerConnectionId: bankData.bankId,
        bankName: bankProvider.name,
        accountType: bankData.accountType,
        accountNumber: bankData.accountNumber,
        routingNumber: bankData.routingNumber,
        accountName: bankData.accountName,
        status: 'connected',
        createdAt: bankConnection.createdAt,
        updatedAt: bankConnection.updatedAt
      }
    });

    // Schedule initial sync
    await this.scheduleBankSync(bankConnection.id);

    return bankConnection;
  }

  /**
   * Sync bank transactions
   */
  static async syncBankTransactions(
    bankConnectionId: string,
    forceSync: boolean = false
  ): Promise<BankSyncResult> {
    const startTime = Date.now();
    const bankConnection = await prisma.bankConnection.findUnique({
      where: { id: bankConnectionId }
    });

    if (!bankConnection) {
      throw new ApiError(404, 'BANK_CONNECTION_NOT_FOUND', 'Bank connection not found');
    }

    if (!(bankConnection as any).isActive) {
      throw new ApiError(400, 'BANK_CONNECTION_INACTIVE', 'Bank connection is inactive');
    }

    // Check if sync is needed
    if (!forceSync && (bankConnection as any).nextSyncAt && (bankConnection as any).nextSyncAt > new Date()) {
      return {
        success: true,
        transactionsAdded: 0,
        transactionsUpdated: 0,
        errors: ['Sync not needed yet'],
        syncDuration: 0,
        nextSyncAt: (bankConnection as any).nextSyncAt
      };
    }

    try {
      // Decrypt credentials
      const credentials = JSON.parse((bankConnection as any).credentials || '{}');
      const decryptedCredentials = this.decryptCredentials(credentials.encryptedData);

      // Fetch transactions from bank API
      const bankTransactions = await this.fetchBankTransactions(
        (bankConnection as any).bankId,
        decryptedCredentials,
        (bankConnection as any).lastSyncAt || undefined
      );

      let transactionsAdded = 0;
      let transactionsUpdated = 0;
      const errors: string[] = [];

      // Process each transaction
      for (const bankTx of bankTransactions) {
        try {
          const existingTransaction = await prisma.bankTransaction.findFirst({
            where: {
              connectionId: bankConnectionId,
              externalId: bankTx.externalId
            }
          });

          if (existingTransaction) {
            // Update existing transaction
            await prisma.bankTransaction.update({
              where: { id: existingTransaction.id },
              data: {
                amount: bankTx.amount,
                description: bankTx.description,
                merchantName: bankTx.merchantName,
                category: bankTx.category,
                status: bankTx.status,
                updatedAt: new Date()
              }
            });
            transactionsUpdated++;
          } else {
            // Create new transaction
            await prisma.bankTransaction.create({
              data: {
                id: `bank_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                tenantId: (bankConnection as any).tenantId,
                connectionId: bankConnectionId,
                externalId: bankTx.externalId,
                transactionDate: bankTx.date,
                amount: bankTx.amount,
                currency: bankTx.currency,
                description: bankTx.description,
                merchantName: bankTx.merchantName,
                category: bankTx.category,
                transactionType: bankTx.transactionType,
                status: bankTx.status,
                isReconciled: false,
                tags: JSON.stringify(bankTx.tags || []),
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            transactionsAdded++;
          }
        } catch (error) {
          errors.push(`Error processing transaction ${bankTx.externalId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update bank connection sync status
      const nextSyncAt = this.calculateNextSyncTime((bankConnection as any).syncFrequency);
      await prisma.bankConnection.update({
        where: { id: bankConnectionId },
        data: {
          lastSyncAt: new Date(),
          status: 'connected',
          updatedAt: new Date()
        }
      });

      const syncDuration = Date.now() - startTime;

      return {
        success: true,
        transactionsAdded,
        transactionsUpdated,
        errors,
        syncDuration,
        nextSyncAt
      };
    } catch (error) {
      // Update bank connection with error status
      await prisma.bankConnection.update({
        where: { id: bankConnectionId },
        data: {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        }
      });

      return {
        success: false,
        transactionsAdded: 0,
        transactionsUpdated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        syncDuration: Date.now() - startTime,
        nextSyncAt: new Date(Date.now() + 60 * 60 * 1000) // Retry in 1 hour
      };
    }
  }

  /**
   * Generate cash flow forecast
   */
  static async generateCashFlowForecast(
    tenantId: string,
    companyId: string,
    forecastPeriod: '7d' | '14d' | '30d' | '60d' | '90d' = '30d'
  ): Promise<CashFlowForecast> {
    // Get bank connections
    const bankConnections = await prisma.bankConnection.findMany({
      where: { tenantId, companyId }
    });

    if (bankConnections.length === 0) {
      throw new ApiError(400, 'NO_BANK_CONNECTIONS', 'No active bank connections found');
    }

    // Get historical transactions
    const daysBack = this.getDaysForPeriod(forecastPeriod);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        connectionId: { in: bankConnections.map(bc => bc.id) },
        transactionDate: { gte: startDate },
        status: 'posted'
      },
      orderBy: { transactionDate: 'asc' }
    });

    // Analyze transaction patterns
    const patterns = await this.analyzeTransactionPatterns(transactions);
    
    // Generate daily projections
    const dailyProjections = await this.generateDailyProjections(
      patterns,
      forecastPeriod,
      bankConnections
    );

    // Calculate risk factors
    const riskFactors = await this.analyzeRiskFactors(dailyProjections, patterns);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(riskFactors, dailyProjections);

    // Calculate totals
    const totalInflows = dailyProjections.reduce((sum, day) => sum + day.expectedInflows, 0);
    const totalOutflows = dailyProjections.reduce((sum, day) => sum + day.expectedOutflows, 0);
    const netCashFlow = totalInflows - totalOutflows;
    
    // Get current balance
    const currentBalance = await this.getCurrentBankBalance(bankConnections);
    const endingBalance = currentBalance + netCashFlow;

    // Calculate confidence score
    const confidence = this.calculateConfidenceScore(patterns, riskFactors);

    const forecast: CashFlowForecast = {
      id: `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      companyId,
      forecastDate: new Date(),
      forecastPeriod,
      confidence,
      totalInflows,
      totalOutflows,
      netCashFlow,
      endingBalance,
      dailyProjections,
      riskFactors,
      recommendations,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save forecast to database
    // await prisma.cashFlowForecast.create({
    //   data: {
    //     id: forecast.id,
    //     tenantId,
    //     companyId,
    //     forecastDate: forecast.forecastDate,
    //     forecastPeriod,
    //     confidence,
    //     totalInflows,
    //     totalOutflows,
    //     netCashFlow,
    //     endingBalance,
    //     dailyProjections: JSON.stringify(dailyProjections),
    //     riskFactors: JSON.stringify(riskFactors),
    //     recommendations: JSON.stringify(recommendations),
    //     createdAt: forecast.createdAt,
    //     updatedAt: forecast.updatedAt
    //   }
    // });

    return forecast;
  }

  /**
   * Get bank connections for a company
   */
  static async getBankConnections(
    tenantId: string,
    companyId?: string
  ): Promise<BankConnection[]> {
    const whereClause: any = { tenantId, isActive: true };
    if (companyId) {
      whereClause.companyId = companyId;
    }

    const connections = await prisma.bankConnection.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return connections.map(conn => ({
      id: conn.id,
      tenantId: conn.tenantId,
      companyId: conn.companyId,
      bankId: (conn as any).bankId || 'unknown',
      bankName: conn.bankName,
      accountType: conn.accountType as any,
      accountNumber: conn.accountNumber,
      routingNumber: conn.routingNumber || undefined,
      accountName: conn.accountName,
      currency: (conn as any).currency || 'USD',
      isActive: (conn as any).isActive || true,
      lastSyncAt: conn.lastSyncAt || undefined,
      nextSyncAt: (conn as any).nextSyncAt,
      syncFrequency: (conn as any).syncFrequency || 'daily' as any,
      credentials: JSON.parse((conn as any).credentials || '{}'),
      status: conn.status as any,
      errorMessage: conn.errorMessage || undefined,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt
    }));
  }

  /**
   * Get available bank providers
   */
  static async getBankProviders(country?: string): Promise<BankProvider[]> {
    // TODO: Implement actual bank provider lookup
    // This would integrate with bank data providers like Plaid, Yodlee, etc.
    
    const providers: BankProvider[] = [
      {
        id: 'chase',
        name: 'Chase Bank',
        country: 'US',
        supportedAccountTypes: ['checking', 'savings', 'credit'],
        features: ['realtime', 'transactions', 'balance', 'account_info'],
        apiEndpoint: 'https://api.chase.com',
        authType: 'oauth',
        rateLimit: { requestsPerMinute: 100, requestsPerDay: 10000 },
        isActive: true
      },
      {
        id: 'bank_of_america',
        name: 'Bank of America',
        country: 'US',
        supportedAccountTypes: ['checking', 'savings', 'credit'],
        features: ['realtime', 'transactions', 'balance', 'account_info'],
        apiEndpoint: 'https://api.bankofamerica.com',
        authType: 'oauth',
        rateLimit: { requestsPerMinute: 100, requestsPerDay: 10000 },
        isActive: true
      },
      {
        id: 'wells_fargo',
        name: 'Wells Fargo',
        country: 'US',
        supportedAccountTypes: ['checking', 'savings', 'credit'],
        features: ['realtime', 'transactions', 'balance', 'account_info'],
        apiEndpoint: 'https://api.wellsfargo.com',
        authType: 'oauth',
        rateLimit: { requestsPerMinute: 100, requestsPerDay: 10000 },
        isActive: true
      }
    ];

    return country ? providers.filter(p => p.country === country) : providers;
  }

  // Helper methods
  private static async getBankProvider(bankId: string): Promise<BankProvider | null> {
    const providers = await this.getBankProviders();
    return providers.find(p => p.id === bankId) || null;
  }

  private static encryptCredentials(credentials: any): string {
    // Simple encryption - in production, use proper encryption
    const key = process.env.ENCRYPTION_KEY || 'default-key';
    const cipher = crypto.createCipher('aes192', key);
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private static decryptCredentials(encryptedData: string): any {
    // Simple decryption - in production, use proper decryption
    const key = process.env.ENCRYPTION_KEY || 'default-key';
    const decipher = crypto.createDecipher('aes192', key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  private static async testBankConnection(bankId: string, credentials: any): Promise<{
    success: boolean;
    error?: string;
    expiresAt?: Date;
  }> {
    // TODO: Implement actual bank connection testing
    // This would make real API calls to test the connection
    return {
      success: true,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    };
  }

  private static async fetchBankTransactions(
    bankId: string,
    credentials: any,
    lastSyncAt?: Date
  ): Promise<BankTransaction[]> {
    // TODO: Implement actual bank API integration
    // This would fetch real transactions from the bank's API
    
    // Mock data for demonstration
    return [
      {
        id: `mock_tx_${Date.now()}`,
        bankConnectionId: '',
        externalId: `ext_${Date.now()}`,
        date: new Date(),
        amount: -150.00,
        currency: 'USD',
        description: 'Coffee Shop Purchase',
        merchantName: 'Starbucks',
        category: 'Food & Dining',
        subcategory: 'Coffee',
        accountBalance: 1250.00,
        transactionType: 'debit',
        status: 'posted',
        isReconciled: false,
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  private static calculateNextSyncTime(syncFrequency: string): Date {
    const now = new Date();
    switch (syncFrequency) {
      case 'realtime':
        return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to daily
    }
  }

  private static async scheduleBankSync(bankConnectionId: string): Promise<void> {
    // TODO: Implement job scheduling (BullMQ, Agenda, etc.)
    console.log(`Scheduled sync for bank connection: ${bankConnectionId}`);
  }

  private static getDaysForPeriod(period: string): number {
    switch (period) {
      case '7d': return 7;
      case '14d': return 14;
      case '30d': return 30;
      case '60d': return 60;
      case '90d': return 90;
      default: return 30;
    }
  }

  private static async analyzeTransactionPatterns(transactions: any[]): Promise<any> {
    // Analyze transaction patterns for forecasting
    const patterns = {
      daily: new Map(),
      weekly: new Map(),
      monthly: new Map(),
      recurring: [],
      seasonal: []
    };

    // Group transactions by day of week, day of month, etc.
    for (const tx of transactions) {
      const date = new Date(tx.date);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();
      const month = date.getMonth();

      // Daily patterns
      const dailyKey = `${dayOfWeek}`;
      if (!patterns.daily.has(dailyKey)) {
        patterns.daily.set(dailyKey, []);
      }
      patterns.daily.get(dailyKey).push(tx);

      // Monthly patterns
      const monthlyKey = `${dayOfMonth}`;
      if (!patterns.monthly.has(monthlyKey)) {
        patterns.monthly.set(monthlyKey, []);
      }
      patterns.monthly.get(monthlyKey).push(tx);
    }

    return patterns;
  }

  private static async generateDailyProjections(
    patterns: any,
    forecastPeriod: string,
    bankConnections: any[]
  ): Promise<DailyProjection[]> {
    const days = this.getDaysForPeriod(forecastPeriod);
    const projections: DailyProjection[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();

      // Get historical data for this day pattern
      const dailyPattern = patterns.daily.get(`${dayOfWeek}`) || [];
      const monthlyPattern = patterns.monthly.get(`${dayOfMonth}`) || [];

      // Calculate expected flows
      const expectedInflows = this.calculateExpectedAmount(dailyPattern, 'credit');
      const expectedOutflows = this.calculateExpectedAmount(dailyPattern, 'debit');
      const netFlow = expectedInflows - expectedOutflows;

      // Generate projected transactions
      const transactions = this.generateProjectedTransactions(dailyPattern, monthlyPattern);

      projections.push({
        date,
        expectedInflows,
        expectedOutflows,
        netFlow,
        projectedBalance: 0, // Will be calculated after all projections
        confidence: this.calculateDayConfidence(dailyPattern, monthlyPattern),
        transactions
      });
    }

    // Calculate projected balances
    let runningBalance = await this.getCurrentBankBalance(bankConnections);
    for (const projection of projections) {
      runningBalance += projection.netFlow;
      projection.projectedBalance = runningBalance;
    }

    return projections;
  }

  private static calculateExpectedAmount(transactions: any[], type: string): number {
    const filtered = transactions.filter(tx => tx.transactionType === type);
    if (filtered.length === 0) return 0;

    const amounts = filtered.map(tx => Math.abs(tx.amount));
    return amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  }

  private static generateProjectedTransactions(dailyPattern: any[], monthlyPattern: any[]): ProjectedTransaction[] {
    const transactions: ProjectedTransaction[] = [];

    // Generate recurring transactions
    for (const tx of dailyPattern) {
      if (this.isRecurringTransaction(tx)) {
        transactions.push({
          description: tx.description,
          amount: Math.abs(tx.amount),
          type: tx.transactionType === 'credit' ? 'inflow' : 'outflow',
          confidence: 0.8,
          category: tx.category || 'Other',
          isRecurring: true,
          pattern: this.detectPattern(tx)
        });
      }
    }

    return transactions;
  }

  private static isRecurringTransaction(transaction: any): boolean {
    // Simple heuristic for recurring transactions
    const recurringKeywords = ['salary', 'rent', 'mortgage', 'insurance', 'subscription'];
    const description = transaction.description.toLowerCase();
    return recurringKeywords.some(keyword => description.includes(keyword));
  }

  private static detectPattern(transaction: any): 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' {
    // Simple pattern detection
    const description = transaction.description.toLowerCase();
    if (description.includes('daily')) return 'daily';
    if (description.includes('weekly')) return 'weekly';
    if (description.includes('monthly')) return 'monthly';
    if (description.includes('quarterly')) return 'quarterly';
    if (description.includes('yearly')) return 'yearly';
    return 'monthly'; // Default
  }

  private static calculateDayConfidence(dailyPattern: any[], monthlyPattern: any[]): number {
    const dailyCount = dailyPattern.length;
    const monthlyCount = monthlyPattern.length;
    
    // Higher confidence with more historical data
    const confidence = Math.min(100, (dailyCount * 10) + (monthlyCount * 5));
    return Math.max(20, confidence); // Minimum 20% confidence
  }

  private static async analyzeRiskFactors(
    projections: DailyProjection[],
    patterns: any
  ): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // Check for low balance risk
    const minBalance = Math.min(...projections.map(p => p.projectedBalance));
    if (minBalance < 1000) {
      riskFactors.push({
        type: 'low_balance',
        severity: minBalance < 0 ? 'critical' : 'high',
        description: `Projected balance may drop to $${minBalance.toFixed(2)}`,
        impact: Math.abs(minBalance),
        probability: 0.7,
        mitigation: 'Consider reducing expenses or increasing income'
      });
    }

    // Check for high outflow risk
    const maxOutflow = Math.max(...projections.map(p => p.expectedOutflows));
    if (maxOutflow > 5000) {
      riskFactors.push({
        type: 'high_outflow',
        severity: 'medium',
        description: `High outflow day detected: $${maxOutflow.toFixed(2)}`,
        impact: maxOutflow,
        probability: 0.6,
        mitigation: 'Review and optimize large expenses'
      });
    }

    return riskFactors;
  }

  private static async generateRecommendations(
    riskFactors: RiskFactor[],
    projections: DailyProjection[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Generate recommendations based on risk factors
    for (const risk of riskFactors) {
      recommendations.push(risk.mitigation);
    }

    // Generate general recommendations
    const avgInflow = projections.reduce((sum, p) => sum + p.expectedInflows, 0) / projections.length;
    const avgOutflow = projections.reduce((sum, p) => sum + p.expectedOutflows, 0) / projections.length;

    if (avgOutflow > avgInflow) {
      recommendations.push('Consider reducing expenses or increasing revenue to improve cash flow');
    }

    if (projections.some(p => p.projectedBalance < 0)) {
      recommendations.push('Monitor cash flow closely to avoid overdraft');
    }

    return recommendations;
  }

  private static calculateConfidenceScore(patterns: any, riskFactors: RiskFactor[]): number {
    let confidence = 80; // Base confidence

    // Reduce confidence based on risk factors
    for (const risk of riskFactors) {
      if (risk.severity === 'critical') confidence -= 20;
      else if (risk.severity === 'high') confidence -= 15;
      else if (risk.severity === 'medium') confidence -= 10;
      else if (risk.severity === 'low') confidence -= 5;
    }

    // Increase confidence based on data quality
    const totalTransactions = Object.values(patterns).reduce((sum: number, pattern: any) => {
      return sum + (Array.isArray(pattern) ? pattern.length : 0);
    }, 0);

    if (totalTransactions > 100) confidence += 10;
    else if (totalTransactions > 50) confidence += 5;

    return Math.max(20, Math.min(100, confidence));
  }

  private static async getCurrentBankBalance(bankConnections: any[]): Promise<number> {
    // Get current balance from all bank connections
    let totalBalance = 0;

    for (const connection of bankConnections) {
      // TODO: Get real-time balance from bank API
      // For now, use mock data
      totalBalance += 10000; // Mock balance
    }

    return totalBalance;
  }
}
