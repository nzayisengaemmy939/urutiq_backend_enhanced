import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface MobileMoneyProvider {
  id: string
  name: string
  country: string
  currency: string
  logo?: string
  primaryColor?: string
  apiEndpoint: string
  isActive: boolean
  supportedOperations: string[]
  fees: {
    deposit: number
    withdrawal: number
    transfer: number
    payment: number
  }
  limits: {
    daily: number
    monthly: number
    perTransaction: number
  }
}

export interface MobileMoneyAccount {
  id: string
  tenantId: string
  companyId: string
  provider: string
  accountNumber: string
  accountName: string
  phoneNumber: string
  balance: number
  currency: string
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MobileMoneyTransaction {
  id: string
  tenantId: string
  companyId: string
  provider: string
  transactionType: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'reversal'
  amount: number
  currency: string
  reference: string
  externalReference?: string
  phoneNumber: string
  recipientPhoneNumber?: string
  recipientName?: string
  description: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  fees: number
  netAmount: number
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export interface MobileMoneyPaymentRequest {
  provider: string
  amount: number
  currency: string
  phoneNumber: string
  recipientPhoneNumber?: string
  recipientName?: string
  description: string
  reference?: string
  callbackUrl?: string
}

export interface MobileMoneyPaymentResponse {
  success: boolean
  transactionId?: string
  reference?: string
  status?: string
  message?: string
  fees?: number
  netAmount?: number
  externalReference?: string
}

export class MobileMoneyService {
  
  // Supported mobile money providers
  private static readonly PROVIDERS: MobileMoneyProvider[] = [
    // East Africa
    {
      id: 'mpesa_kenya',
      name: 'M-Pesa Kenya',
      country: 'Kenya',
      currency: 'KES',
      logo: 'https://logo.clearbit.com/safaricom.co.ke',
      primaryColor: '#00A651',
      apiEndpoint: 'https://api.safaricom.co.ke/mpesa',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment', 'reversal'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 150000, monthly: 300000, perTransaction: 70000 }
    },
    {
      id: 'mpesa_tanzania',
      name: 'M-Pesa Tanzania',
      country: 'Tanzania',
      currency: 'TZS',
      logo: 'https://logo.clearbit.com/vodacom.co.tz',
      primaryColor: '#E60012',
      apiEndpoint: 'https://api.vodacom.co.tz/mpesa',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 1000000, monthly: 2000000, perTransaction: 500000 }
    },
    {
      id: 'airtel_money_kenya',
      name: 'Airtel Money Kenya',
      country: 'Kenya',
      currency: 'KES',
      logo: 'https://logo.clearbit.com/airtel.co.ke',
      primaryColor: '#E60012',
      apiEndpoint: 'https://api.airtel.co.ke/money',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 150000, monthly: 300000, perTransaction: 70000 }
    },
    {
      id: 'airtel_money_tanzania',
      name: 'Airtel Money Tanzania',
      country: 'Tanzania',
      currency: 'TZS',
      logo: 'https://logo.clearbit.com/airtel.co.tz',
      primaryColor: '#E60012',
      apiEndpoint: 'https://api.airtel.co.tz/money',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 1000000, monthly: 2000000, perTransaction: 500000 }
    },
    {
      id: 'mtn_momo_rwanda',
      name: 'MTN MoMo Rwanda',
      country: 'Rwanda',
      currency: 'RWF',
      logo: 'https://logo.clearbit.com/mtn.co.rw',
      primaryColor: '#FFCC00',
      apiEndpoint: 'https://api.mtn.co.rw/momo',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 500000, monthly: 2000000, perTransaction: 250000 }
    },
    {
      id: 'airtel_money_rwanda',
      name: 'Airtel Money Rwanda',
      country: 'Rwanda',
      currency: 'RWF',
      logo: 'https://logo.clearbit.com/airtel.rw',
      primaryColor: '#E60012',
      apiEndpoint: 'https://api.airtel.rw/money',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 500000, monthly: 2000000, perTransaction: 250000 }
    },
    {
      id: 'tigo_cash_rwanda',
      name: 'Tigo Cash Rwanda',
      country: 'Rwanda',
      currency: 'RWF',
      logo: 'https://logo.clearbit.com/tigo.rw',
      primaryColor: '#00A651',
      apiEndpoint: 'https://api.tigo.rw/cash',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 500000, monthly: 2000000, perTransaction: 250000 }
    },
    
    // West Africa
    {
      id: 'mtn_momo_ghana',
      name: 'MTN MoMo Ghana',
      country: 'Ghana',
      currency: 'GHS',
      logo: 'https://logo.clearbit.com/mtn.com.gh',
      primaryColor: '#FFCC00',
      apiEndpoint: 'https://api.mtn.com.gh/momo',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 1000, monthly: 5000, perTransaction: 500 }
    },
    {
      id: 'mtn_momo_nigeria',
      name: 'MTN MoMo Nigeria',
      country: 'Nigeria',
      currency: 'NGN',
      logo: 'https://logo.clearbit.com/mtn.com.ng',
      primaryColor: '#FFCC00',
      apiEndpoint: 'https://api.mtn.com.ng/momo',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 50000, monthly: 200000, perTransaction: 20000 }
    },
    {
      id: 'mtn_momo_uganda',
      name: 'MTN MoMo Uganda',
      country: 'Uganda',
      currency: 'UGX',
      logo: 'https://logo.clearbit.com/mtn.co.ug',
      primaryColor: '#FFCC00',
      apiEndpoint: 'https://api.mtn.co.ug/momo',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 1000000, monthly: 5000000, perTransaction: 500000 }
    },
    {
      id: 'orange_money_senegal',
      name: 'Orange Money Senegal',
      country: 'Senegal',
      currency: 'XOF',
      logo: 'https://logo.clearbit.com/orange.sn',
      primaryColor: '#FF6600',
      apiEndpoint: 'https://api.orange.sn/money',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 500000, monthly: 2000000, perTransaction: 250000 }
    },
    {
      id: 'orange_money_cote_divoire',
      name: 'Orange Money Côte d\'Ivoire',
      country: 'Côte d\'Ivoire',
      currency: 'XOF',
      logo: 'https://logo.clearbit.com/orange.ci',
      primaryColor: '#FF6600',
      apiEndpoint: 'https://api.orange.ci/money',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 500000, monthly: 2000000, perTransaction: 250000 }
    },
    {
      id: 'moov_money_togo',
      name: 'Moov Money Togo',
      country: 'Togo',
      currency: 'XOF',
      logo: 'https://logo.clearbit.com/moov.tg',
      primaryColor: '#00A651',
      apiEndpoint: 'https://api.moov.tg/money',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 500000, monthly: 2000000, perTransaction: 250000 }
    },
    {
      id: 'moov_money_benin',
      name: 'Moov Money Benin',
      country: 'Benin',
      currency: 'XOF',
      logo: 'https://logo.clearbit.com/moov.bj',
      primaryColor: '#00A651',
      apiEndpoint: 'https://api.moov.bj/money',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 500000, monthly: 2000000, perTransaction: 250000 }
    },
    
    // Central Africa
    {
      id: 'mtn_momo_cameroon',
      name: 'MTN MoMo Cameroon',
      country: 'Cameroon',
      currency: 'XAF',
      logo: 'https://logo.clearbit.com/mtn.cm',
      primaryColor: '#FFCC00',
      apiEndpoint: 'https://api.mtn.cm/momo',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 500000, monthly: 2000000, perTransaction: 250000 }
    },
    {
      id: 'orange_money_cameroon',
      name: 'Orange Money Cameroon',
      country: 'Cameroon',
      currency: 'XAF',
      logo: 'https://logo.clearbit.com/orange.cm',
      primaryColor: '#FF6600',
      apiEndpoint: 'https://api.orange.cm/money',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 500000, monthly: 2000000, perTransaction: 250000 }
    },
    
    // Southern Africa
    {
      id: 'ecocash_zimbabwe',
      name: 'EcoCash Zimbabwe',
      country: 'Zimbabwe',
      currency: 'USD',
      logo: 'https://logo.clearbit.com/econet.co.zw',
      primaryColor: '#00A651',
      apiEndpoint: 'https://api.econet.co.zw/ecocash',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 1000, monthly: 5000, perTransaction: 500 }
    },
    {
      id: 'mtn_momo_zambia',
      name: 'MTN MoMo Zambia',
      country: 'Zambia',
      currency: 'ZMW',
      logo: 'https://logo.clearbit.com/mtn.co.zm',
      primaryColor: '#FFCC00',
      apiEndpoint: 'https://api.mtn.co.zm/momo',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0.5, transfer: 0.5, payment: 0.5 },
      limits: { daily: 5000, monthly: 25000, perTransaction: 2500 }
    },
    
    // Global
    {
      id: 'paypal',
      name: 'PayPal',
      country: 'Global',
      currency: 'USD',
      logo: 'https://logo.clearbit.com/paypal.com',
      primaryColor: '#0070BA',
      apiEndpoint: 'https://api.paypal.com/v1',
      isActive: true,
      supportedOperations: ['deposit', 'withdrawal', 'transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 2.9, transfer: 2.9, payment: 2.9 },
      limits: { daily: 10000, monthly: 50000, perTransaction: 5000 }
    },
    {
      id: 'venmo',
      name: 'Venmo',
      country: 'USA',
      currency: 'USD',
      logo: 'https://logo.clearbit.com/venmo.com',
      primaryColor: '#3D95CE',
      apiEndpoint: 'https://api.venmo.com/v1',
      isActive: true,
      supportedOperations: ['transfer', 'payment'],
      fees: { deposit: 0, withdrawal: 0, transfer: 0, payment: 0 },
      limits: { daily: 5000, monthly: 20000, perTransaction: 3000 }
    }
  ]

  /**
   * Get all supported mobile money providers
   */
  static async getProviders(country?: string): Promise<MobileMoneyProvider[]> {
    if (country) {
      return this.PROVIDERS.filter(provider => 
        provider.country.toLowerCase() === country.toLowerCase() || 
        provider.country === 'Global'
      )
    }
    return this.PROVIDERS
  }

  /**
   * Get provider by ID
   */
  static async getProvider(providerId: string): Promise<MobileMoneyProvider | null> {
    return this.PROVIDERS.find(provider => provider.id === providerId) || null
  }

  /**
   * Create mobile money account
   */
  static async createAccount(
    tenantId: string,
    companyId: string,
    provider: string,
    accountNumber: string,
    accountName: string,
    phoneNumber: string,
    currency: string
  ): Promise<MobileMoneyAccount> {
    
    const account = await prisma.mobileMoneyAccount.create({
      data: {
        tenantId,
        companyId,
        provider,
        accountNumber,
        accountName,
        phoneNumber,
        balance: 0,
        currency,
        status: 'pending',
        isVerified: false
      }
    })

    return account
  }

  /**
   * Get company mobile money accounts
   */
  static async getCompanyAccounts(
    tenantId: string,
    companyId: string
  ): Promise<MobileMoneyAccount[]> {
    
    return await prisma.mobileMoneyAccount.findMany({
      where: { tenantId, companyId },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Initiate mobile money payment
   */
  static async initiatePayment(
    tenantId: string,
    companyId: string,
    paymentRequest: MobileMoneyPaymentRequest
  ): Promise<MobileMoneyPaymentResponse> {
    
    try {
      // Validate currency code
      if (!paymentRequest.currency || paymentRequest.currency.trim() === '') {
        throw new Error('Invalid currency code: Currency is required')
      }

      // Calculate fees
      const provider = await this.getProvider(paymentRequest.provider)
      if (!provider) {
        throw new Error('Provider not found')
      }

      // Validate currency matches provider
      if (paymentRequest.currency !== provider.currency) {
        throw new Error(`Invalid currency code: ${paymentRequest.currency} does not match provider currency ${provider.currency}`)
      }

      // Convert amount to number to ensure proper type
      const amount = parseFloat(paymentRequest.amount.toString())
      
      const fees = this.calculateFees(amount, paymentRequest.provider, paymentRequest.transactionType || 'payment')
      const netAmount = amount - fees

      // Create transaction record
      const transaction = await prisma.mobileMoneyTransaction.create({
        data: {
          tenantId,
          companyId,
          provider: paymentRequest.provider,
          transactionType: 'payment',
          amount: amount,
          currency: paymentRequest.currency,
          reference: paymentRequest.reference || `MM_${Date.now()}`,
          phoneNumber: paymentRequest.phoneNumber,
          recipientPhoneNumber: paymentRequest.recipientPhoneNumber,
          recipientName: paymentRequest.recipientName,
          description: paymentRequest.description,
          status: 'pending',
          fees,
          netAmount,
          metadata: JSON.stringify({
            provider: paymentRequest.provider,
            transactionType: 'payment',
            callbackUrl: paymentRequest.callbackUrl,
            timestamp: new Date().toISOString()
          })
        }
      })

      // Simulate API call to provider
      const externalReference = await this.callProviderAPI(paymentRequest.provider, {
        amount: amount,
        currency: paymentRequest.currency,
        phoneNumber: paymentRequest.phoneNumber,
        recipientPhoneNumber: paymentRequest.recipientPhoneNumber,
        description: paymentRequest.description,
        reference: transaction.reference,
        callbackUrl: paymentRequest.callbackUrl
      })

      // Update transaction with external reference
      await prisma.mobileMoneyTransaction.update({
        where: { id: transaction.id },
        data: { externalReference }
      })

      return {
        success: true,
        transactionId: transaction.id,
        reference: transaction.reference,
        status: 'pending',
        message: 'Payment initiated successfully',
        fees,
        netAmount,
        externalReference
      }
    } catch (error) {
      console.error('Error initiating mobile money payment:', error)
      return {
        success: false,
        message: error.message || 'Failed to initiate payment'
      }
    }
  }

  /**
   * Process payment callback
   */
  static async processCallback(
    provider: string,
    externalReference: string,
    status: string,
    metadata?: any
  ): Promise<void> {
    
    const transaction = await prisma.mobileMoneyTransaction.findFirst({
      where: { provider, externalReference }
    })

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    // Update transaction status
    // Parse existing metadata (it's stored as JSON string)
    let existingMetadata = {}
    try {
      existingMetadata = transaction.metadata ? JSON.parse(transaction.metadata) : {}
    } catch (error) {
      console.warn('Failed to parse existing metadata:', error)
      existingMetadata = {}
    }

    await prisma.mobileMoneyTransaction.update({
      where: { id: transaction.id },
      data: {
        status: status === 'success' ? 'completed' : 'failed',
        metadata: JSON.stringify({ ...existingMetadata, callbackData: metadata })
      }
    })

    // If payment successful, update account balance
    if (status === 'success') {
      const account = await prisma.mobileMoneyAccount.findFirst({
        where: {
          tenantId: transaction.tenantId,
          companyId: transaction.companyId,
          provider: transaction.provider,
          phoneNumber: transaction.phoneNumber
        }
      })

      if (account) {
        await prisma.mobileMoneyAccount.update({
          where: { id: account.id },
          data: {
            balance: account.balance - transaction.amount
          }
        })
      }
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(
    tenantId: string,
    companyId: string,
    provider?: string,
    limit: number = 50
  ): Promise<MobileMoneyTransaction[]> {
    
    const where: any = { tenantId, companyId }
    if (provider) {
      where.provider = provider
    }

    return await prisma.mobileMoneyTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Get account balance
   */
  static async getAccountBalance(
    tenantId: string,
    companyId: string,
    provider: string,
    phoneNumber: string
  ): Promise<{ balance: number; currency: string }> {
    
    const account = await prisma.mobileMoneyAccount.findFirst({
      where: { tenantId, companyId, provider, phoneNumber }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    return {
      balance: account.balance,
      currency: account.currency
    }
  }

  /**
   * Get mobile money statistics
   */
  static async getStats(
    tenantId: string,
    companyId: string
  ): Promise<{
    totalAccounts: number
    activeAccounts: number
    totalTransactions: number
    totalVolume: number
    totalFees: number
    providers: Array<{
      provider: string
      accounts: number
      transactions: number
      volume: number
    }>
  }> {
    
    const accounts = await prisma.mobileMoneyAccount.findMany({
      where: { tenantId, companyId }
    })

    const transactions = await prisma.mobileMoneyTransaction.findMany({
      where: { tenantId, companyId }
    })

    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0)
    const totalFees = transactions.reduce((sum, t) => sum + t.fees, 0)

    const providers = this.PROVIDERS.map(provider => {
      const providerAccounts = accounts.filter(a => a.provider === provider.id)
      const providerTransactions = transactions.filter(t => t.provider === provider.id)
      const providerVolume = providerTransactions.reduce((sum, t) => sum + t.amount, 0)

      return {
        provider: provider.name,
        accounts: providerAccounts.length,
        transactions: providerTransactions.length,
        volume: providerVolume
      }
    }).filter(p => p.accounts > 0 || p.transactions > 0)

    return {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter(a => a.status === 'active').length,
      totalTransactions: transactions.length,
      totalVolume,
      totalFees,
      providers
    }
  }

  /**
   * Calculate fees for transaction
   */
  private static calculateFees(amount: number, provider: string, transactionType: string): number {
    const providerConfig = this.PROVIDERS.find(p => p.id === provider)
    if (!providerConfig) return 0

    const feeRate = providerConfig.fees[transactionType as keyof typeof providerConfig.fees] || 0
    return amount * (feeRate / 100)
  }

  /**
   * Simulate API call to provider
   */
  private static async callProviderAPI(provider: string, data: any): Promise<string> {
    // In production, this would make actual API calls to the provider
    // For now, we'll simulate the response
    
    const externalReference = `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Simulate async processing
    setTimeout(async () => {
      // Simulate 90% success rate
      const success = Math.random() > 0.1
      await this.processCallback(provider, externalReference, success ? 'success' : 'failed')
    }, 2000)

    return externalReference
  }
}
