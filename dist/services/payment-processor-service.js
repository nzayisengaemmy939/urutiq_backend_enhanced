import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class PaymentProcessorService {
    /**
     * Initialize payment processor configuration
     */
    static async initializeProcessor(tenantId, companyId, processorType, config) {
        // Validate configuration based on processor type
        const validatedConfig = this.validateProcessorConfig(processorType, config);
        // Store configuration in database (in production, encrypt sensitive data)
        const processorConfig = await prisma.paymentProcessorConfig.create({
            data: {
                id: `${processorType}-${companyId}`,
                tenantId,
                companyId,
                name: `${processorType.charAt(0).toUpperCase() + processorType.slice(1)} Integration`,
                type: processorType,
                isActive: true,
                config: JSON.stringify(validatedConfig), // Convert to JSON string
                environment: config.environment || 'sandbox'
            }
        });
        return {
            ...processorConfig,
            config: JSON.parse(processorConfig.config),
            type: processorConfig.type
        };
    }
    /**
     * Validate processor configuration
     */
    static validateProcessorConfig(processorType, config) {
        switch (processorType) {
            case 'stripe':
                if (!config.secretKey || !config.publishableKey) {
                    throw new Error('Stripe requires secretKey and publishableKey');
                }
                return {
                    secretKey: config.secretKey,
                    publishableKey: config.publishableKey,
                    webhookSecret: config.webhookSecret,
                    environment: config.environment || 'sandbox'
                };
            case 'paypal':
                if (!config.clientId || !config.clientSecret) {
                    throw new Error('PayPal requires clientId and clientSecret');
                }
                return {
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                    environment: config.environment || 'sandbox'
                };
            case 'square':
                if (!config.applicationId || !config.accessToken) {
                    throw new Error('Square requires applicationId and accessToken');
                }
                return {
                    applicationId: config.applicationId,
                    accessToken: config.accessToken,
                    environment: config.environment || 'sandbox'
                };
            default:
                throw new Error(`Unsupported processor type: ${processorType}`);
        }
    }
    /**
     * Create payment intent
     */
    static async createPaymentIntent(tenantId, companyId, amount, currency, options = {}) {
        const processorConfig = await this.getActiveProcessor(tenantId, companyId);
        if (!processorConfig) {
            throw new Error('No active payment processor configured');
        }
        let paymentIntent;
        switch (processorConfig.type) {
            case 'stripe':
                paymentIntent = await this.createStripePaymentIntent(processorConfig, amount, currency, options);
                break;
            case 'paypal':
                paymentIntent = await this.createPayPalPaymentIntent(processorConfig, amount, currency, options);
                break;
            case 'square':
                paymentIntent = await this.createSquarePaymentIntent(processorConfig, amount, currency, options);
                break;
            default:
                throw new Error(`Unsupported processor type: ${processorConfig.type}`);
        }
        // Store payment intent in database
        const storedIntent = await prisma.paymentIntent.create({
            data: {
                id: paymentIntent.id,
                tenantId,
                companyId,
                amount,
                currency,
                status: paymentIntent.status,
                clientSecret: paymentIntent.clientSecret,
                paymentMethodId: paymentIntent.paymentMethodId,
                customerId: paymentIntent.customerId,
                description: paymentIntent.description,
                metadata: JSON.stringify(paymentIntent.metadata || {}), // Convert to JSON string
                processor: processorConfig.type,
                processorTransactionId: paymentIntent.processorTransactionId
            }
        });
        return {
            ...paymentIntent,
            createdAt: storedIntent.createdAt,
            updatedAt: storedIntent.updatedAt
        };
    }
    /**
     * Create Stripe payment intent
     */
    static async createStripePaymentIntent(config, amount, currency, options) {
        // Mock Stripe API call (in production, use actual Stripe SDK)
        const stripePaymentIntent = {
            id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            amount: Math.round(amount * 100), // Stripe uses cents
            currency: currency.toLowerCase(),
            status: 'pending',
            client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
            metadata: options.metadata || {}
        };
        return {
            id: stripePaymentIntent.id,
            amount,
            currency,
            status: 'pending',
            clientSecret: stripePaymentIntent.client_secret,
            paymentMethodId: options.paymentMethodId,
            customerId: options.customerId,
            description: options.description,
            metadata: stripePaymentIntent.metadata,
            processor: 'stripe',
            processorTransactionId: stripePaymentIntent.id,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    /**
     * Create PayPal payment intent
     */
    static async createPayPalPaymentIntent(config, amount, currency, options) {
        // Mock PayPal API call
        const paypalOrder = {
            id: `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            amount: {
                currency_code: currency,
                value: amount.toFixed(2)
            },
            status: 'CREATED',
            links: [
                {
                    href: `https://api.paypal.com/v2/checkout/orders/${Date.now()}`,
                    rel: 'approve',
                    method: 'GET'
                }
            ]
        };
        return {
            id: paypalOrder.id,
            amount,
            currency,
            status: 'pending',
            clientSecret: paypalOrder.links[0].href,
            paymentMethodId: options.paymentMethodId,
            customerId: options.customerId,
            description: options.description,
            metadata: options.metadata || {},
            processor: 'paypal',
            processorTransactionId: paypalOrder.id,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    /**
     * Create Square payment intent
     */
    static async createSquarePaymentIntent(config, amount, currency, options) {
        // Mock Square API call
        const squarePayment = {
            id: `SQUARE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            amount_money: {
                amount: Math.round(amount * 100), // Square uses cents
                currency: currency
            },
            status: 'PENDING',
            source_type: 'CARD'
        };
        return {
            id: squarePayment.id,
            amount,
            currency,
            status: 'pending',
            clientSecret: squarePayment.id,
            paymentMethodId: options.paymentMethodId,
            customerId: options.customerId,
            description: options.description,
            metadata: options.metadata || {},
            processor: 'square',
            processorTransactionId: squarePayment.id,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    /**
     * Confirm payment intent
     */
    static async confirmPaymentIntent(tenantId, companyId, paymentIntentId, paymentMethodId) {
        const paymentIntent = await prisma.paymentIntent.findFirst({
            where: { id: paymentIntentId, tenantId, companyId }
        });
        if (!paymentIntent) {
            throw new Error('Payment intent not found');
        }
        const processorConfig = await this.getActiveProcessor(tenantId, companyId);
        if (!processorConfig) {
            throw new Error('No active payment processor configured');
        }
        // Mock confirmation (in production, call actual processor API)
        const confirmedIntent = {
            ...paymentIntent,
            status: 'succeeded',
            updatedAt: new Date()
        };
        // Update in database
        await prisma.paymentIntent.update({
            where: { id: paymentIntentId },
            data: {
                status: 'succeeded',
                updatedAt: new Date()
            }
        });
        // Create corresponding bank transaction
        await this.createBankTransactionFromPayment(tenantId, companyId, {
            ...confirmedIntent,
            clientSecret: confirmedIntent.clientSecret || undefined,
            paymentMethodId: confirmedIntent.paymentMethodId || undefined,
            customerId: confirmedIntent.customerId || undefined,
            description: confirmedIntent.description || undefined,
            metadata: confirmedIntent.metadata ? JSON.parse(confirmedIntent.metadata) : {},
            processorTransactionId: confirmedIntent.processorTransactionId || undefined
        });
        return {
            ...confirmedIntent,
            clientSecret: confirmedIntent.clientSecret || undefined,
            paymentMethodId: confirmedIntent.paymentMethodId || undefined,
            customerId: confirmedIntent.customerId || undefined,
            description: confirmedIntent.description || undefined,
            metadata: confirmedIntent.metadata ? JSON.parse(confirmedIntent.metadata) : {},
            processorTransactionId: confirmedIntent.processorTransactionId || undefined
        };
    }
    /**
     * Create bank transaction from successful payment
     */
    static async createBankTransactionFromPayment(tenantId, companyId, paymentIntent) {
        // Find a bank account for this company
        const bankAccount = await prisma.bankAccount.findFirst({
            where: { tenantId, companyId, status: 'active' }
        });
        if (!bankAccount) {
            console.warn('No active bank account found for payment transaction');
            return;
        }
        // Create bank transaction
        await prisma.bankTransaction.create({
            data: {
                tenantId,
                bankAccountId: bankAccount.id,
                transactionDate: new Date(),
                amount: paymentIntent.amount.toString(),
                currency: paymentIntent.currency,
                description: `Payment via ${paymentIntent.processor}: ${paymentIntent.description || 'Payment'}`,
                transactionType: 'credit',
                reference: paymentIntent.processorTransactionId,
                status: 'reconciled',
                reconciledAt: new Date(),
                reconciledBy: 'system'
            }
        });
        // Update bank account balance
        await prisma.bankAccount.update({
            where: { id: bankAccount.id },
            data: {
                balance: (Number(bankAccount.balance) + paymentIntent.amount).toString(),
                lastSyncAt: new Date()
            }
        });
    }
    /**
     * Get active payment processor
     */
    static async getActiveProcessor(tenantId, companyId) {
        const config = await prisma.paymentProcessorConfig.findFirst({
            where: { tenantId, companyId, isActive: true }
        });
        if (!config)
            return null;
        return {
            ...config,
            config: JSON.parse(config.config),
            type: config.type
        };
    }
    /**
     * Create customer
     */
    static async createCustomer(tenantId, companyId, customerData) {
        // Validate that the company exists
        const company = await prisma.company.findFirst({
            where: { id: companyId, tenantId }
        });
        if (!company) {
            throw new Error(`Company with ID ${companyId} not found`);
        }
        // Check if there's an active processor, but don't require it for customer creation
        const processorConfig = await this.getActiveProcessor(tenantId, companyId);
        const processorType = processorConfig?.type || 'stripe'; // Default to stripe if no processor configured
        // Create real customer in the database
        console.log('Creating customer with data:', {
            tenantId,
            companyId,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            taxNumber: customerData.taxNumber,
            address: customerData.address,
            currency: customerData.currency
        });
        const customer = await prisma.customer.create({
            data: {
                tenantId,
                companyId,
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                taxNumber: customerData.taxNumber,
                address: customerData.address,
                currency: customerData.currency,
                customerType: 'individual', // Default type
                status: 'active' // Default status
            }
        });
        // Return in payment customer format
        return {
            id: customer.id,
            email: customer.email || '',
            name: customer.name,
            phone: customer.phone || '',
            processor: processorType,
            processorCustomerId: undefined, // Not needed for real customers
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt
        };
    }
    /**
     * Add payment method
     */
    static async addPaymentMethod(tenantId, companyId, customerId, paymentMethodData) {
        // Check if there's an active processor, but don't require it for payment method creation
        const processorConfig = await this.getActiveProcessor(tenantId, companyId);
        const processorType = processorConfig?.type || 'stripe'; // Default to stripe if no processor configured
        // Mock payment method creation
        const paymentMethod = {
            id: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: paymentMethodData.type,
            last4: paymentMethodData.card?.number.slice(-4) || paymentMethodData.bankAccount?.accountNumber.slice(-4),
            brand: paymentMethodData.type === 'card' ? 'visa' : undefined,
            expMonth: paymentMethodData.card?.expMonth,
            expYear: paymentMethodData.card?.expYear,
            bankName: paymentMethodData.bankAccount ? 'Bank Account' : undefined,
            accountType: paymentMethodData.bankAccount?.accountType,
            isDefault: paymentMethodData.isDefault || false,
            customerId,
            processor: processorType,
            processorPaymentMethodId: `proc_pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date()
        };
        // Store in database
        console.log('=== ADDING PAYMENT METHOD TO DATABASE ===');
        console.log('Payment method data to store:', {
            id: paymentMethod.id,
            tenantId,
            companyId,
            type: paymentMethod.type,
            last4: paymentMethod.last4,
            brand: paymentMethod.brand,
            expMonth: paymentMethod.expMonth,
            expYear: paymentMethod.expYear,
            bankName: paymentMethod.bankName,
            accountType: paymentMethod.accountType,
            isDefault: paymentMethod.isDefault,
            customerId: paymentMethod.customerId,
            processor: paymentMethod.processor,
            processorPaymentMethodId: paymentMethod.processorPaymentMethodId
        });
        const createdPaymentMethod = await prisma.paymentMethod.create({
            data: {
                id: paymentMethod.id,
                tenantId,
                companyId,
                type: paymentMethod.type,
                last4: paymentMethod.last4,
                brand: paymentMethod.brand,
                expMonth: paymentMethod.expMonth,
                expYear: paymentMethod.expYear,
                bankName: paymentMethod.bankName,
                accountType: paymentMethod.accountType,
                isDefault: paymentMethod.isDefault,
                customerId: paymentMethod.customerId,
                processor: paymentMethod.processor,
                processorPaymentMethodId: paymentMethod.processorPaymentMethodId
            }
        });
        console.log('Payment method created in database:', createdPaymentMethod.id);
        return paymentMethod;
    }
    /**
     * Get payment processor statistics
     */
    static async getProcessorStats(tenantId, companyId) {
        const payments = await prisma.paymentIntent.findMany({
            where: { tenantId, companyId }
        });
        const totalPayments = payments.length;
        const successfulPayments = payments.filter(p => p.status === 'succeeded').length;
        const failedPayments = payments.filter(p => p.status === 'failed').length;
        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;
        const processorBreakdown = payments.reduce((acc, payment) => {
            if (!acc[payment.processor]) {
                acc[payment.processor] = { count: 0, amount: 0 };
            }
            acc[payment.processor].count++;
            acc[payment.processor].amount += payment.amount;
            return acc;
        }, {});
        return {
            totalPayments,
            successfulPayments,
            failedPayments,
            totalAmount,
            averageAmount,
            processorBreakdown
        };
    }
    /**
     * Get payment intents
     */
    static async getPaymentIntents(tenantId, companyId, options = {}) {
        const where = {
            tenantId,
            companyId
        };
        if (options.status) {
            where.status = options.status;
        }
        if (options.processor) {
            where.processor = options.processor;
        }
        const paymentIntents = await prisma.paymentIntent.findMany({
            where,
            take: options.limit || 20,
            orderBy: { createdAt: 'desc' }
        });
        return paymentIntents.map(intent => ({
            id: intent.id,
            amount: intent.amount,
            currency: intent.currency,
            status: intent.status,
            clientSecret: intent.clientSecret || undefined,
            paymentMethodId: intent.paymentMethodId || undefined,
            customerId: intent.customerId || undefined,
            description: intent.description || undefined,
            metadata: intent.metadata ? JSON.parse(intent.metadata) : {},
            processor: intent.processor,
            processorTransactionId: intent.processorTransactionId || undefined,
            createdAt: intent.createdAt,
            updatedAt: intent.updatedAt
        }));
    }
    /**
     * Get customers
     */
    static async getCustomers(tenantId, companyId, options = {}) {
        const where = {
            tenantId,
            companyId
        };
        if (options.search) {
            where.OR = [
                { name: { contains: options.search } },
                { email: { contains: options.search } }
            ];
        }
        const customers = await prisma.customer.findMany({
            where,
            take: options.limit || 20,
            orderBy: { createdAt: 'desc' }
        });
        // Convert real customers to payment customer format
        return customers.map(customer => ({
            id: customer.id,
            email: customer.email || '',
            name: customer.name,
            phone: customer.phone || '',
            processor: 'stripe', // Default processor, can be enhanced later
            processorCustomerId: undefined, // Not needed for real customers
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt
        }));
    }
    /**
     * Get payment methods
     */
    static async getPaymentMethods(tenantId, companyId, options = {}) {
        console.log('=== PAYMENT PROCESSOR SERVICE DEBUG ===');
        console.log('getPaymentMethods called with:', { tenantId, companyId, options });
        const where = {
            tenantId,
            companyId
        };
        if (options.customerId) {
            where.customerId = options.customerId;
        }
        console.log('Database query where clause:', where);
        const paymentMethods = await prisma.paymentMethod.findMany({
            where,
            take: options.limit || 20,
            orderBy: { createdAt: 'desc' }
        });
        console.log('Raw payment methods from database:', paymentMethods.length);
        console.log('Raw payment methods data:', paymentMethods);
        const mappedMethods = paymentMethods.map(method => ({
            id: method.id,
            type: method.type,
            last4: method.last4,
            brand: method.brand,
            expMonth: method.expMonth,
            expYear: method.expYear,
            bankName: method.bankName,
            accountType: method.accountType,
            isDefault: method.isDefault,
            customerId: method.customerId,
            processor: method.processor,
            processorPaymentMethodId: method.processorPaymentMethodId,
            createdAt: method.createdAt,
            updatedAt: method.updatedAt
        }));
        console.log('Mapped payment methods:', mappedMethods.length);
        console.log('Mapped payment methods data:', mappedMethods);
        return mappedMethods;
    }
}
