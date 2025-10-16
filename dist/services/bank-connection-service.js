import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class BankConnectionService {
    // Plaid Sandbox configuration for testing
    static PLAID_CONFIG = {
        clientId: 'sandbox_client_id',
        secret: 'sandbox_secret',
        environment: 'sandbox'
    };
    // Yodlee Sandbox configuration for testing
    static YODLEE_CONFIG = {
        clientId: 'sandbox_yodlee_client_id',
        secret: 'sandbox_yodlee_secret',
        environment: 'sandbox'
    };
    /**
     * Get available financial institutions
     */
    static async getInstitutions(provider = 'plaid', country = 'US', search) {
        console.log(`BankConnectionService: getInstitutions called with provider=${provider}, country=${country}, search=${search}`);
        // For testing purposes, return Plaid sandbox institutions
        if (provider === 'plaid') {
            const sandboxInstitutions = [
                {
                    id: 'ins_109508',
                    name: 'Chase',
                    logo: 'https://logo.clearbit.com/chase.com',
                    primaryColor: '#0066b2',
                    url: 'https://chase.com',
                    country: 'US',
                    supportsAch: true,
                    supportsWire: true,
                    supportsOauth: true,
                    products: ['transactions', 'accounts', 'auth']
                },
                {
                    id: 'ins_109509',
                    name: 'Bank of America',
                    logo: 'https://logo.clearbit.com/bankofamerica.com',
                    primaryColor: '#e31837',
                    url: 'https://bankofamerica.com',
                    country: 'US',
                    supportsAch: true,
                    supportsWire: true,
                    supportsOauth: true,
                    products: ['transactions', 'accounts', 'auth']
                },
                {
                    id: 'ins_109510',
                    name: 'Wells Fargo',
                    logo: 'https://logo.clearbit.com/wellsfargo.com',
                    primaryColor: '#d71e2b',
                    url: 'https://wellsfargo.com',
                    country: 'US',
                    supportsAch: true,
                    supportsWire: true,
                    supportsOauth: true,
                    products: ['transactions', 'accounts', 'auth']
                },
                {
                    id: 'ins_109511',
                    name: 'Capital One',
                    logo: 'https://logo.clearbit.com/capitalone.com',
                    primaryColor: '#004977',
                    url: 'https://capitalone.com',
                    country: 'US',
                    supportsAch: true,
                    supportsWire: true,
                    supportsOauth: true,
                    products: ['transactions', 'accounts', 'auth']
                },
                {
                    id: 'ins_109512',
                    name: 'Citibank',
                    logo: 'https://logo.clearbit.com/citi.com',
                    primaryColor: '#056dae',
                    url: 'https://citi.com',
                    country: 'US',
                    supportsAch: true,
                    supportsWire: true,
                    supportsOauth: true,
                    products: ['transactions', 'accounts', 'auth']
                }
            ];
            let filteredInstitutions = sandboxInstitutions;
            if (search) {
                filteredInstitutions = sandboxInstitutions.filter(inst => inst.name.toLowerCase().includes(search.toLowerCase()));
            }
            console.log(`Returning ${filteredInstitutions.length} institutions for testing`);
            return filteredInstitutions;
        }
        // For Yodlee or other providers, return empty array
        console.log('Yodlee or other provider selected - returning empty array');
        return [];
    }
    /**
     * Create a new bank connection
     */
    static async createConnection(tenantId, companyId, provider, institutionId, credentials) {
        console.log(`BankConnectionService: createConnection called with provider=${provider}, institutionId=${institutionId}`);
        // Generate a realistic connection ID
        const connectionId = `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Get institution name
        const institutionName = this.getInstitutionName(institutionId);
        const connection = await prisma.bankConnection.create({
            data: {
                id: connectionId,
                tenantId,
                companyId,
                provider: provider,
                providerConnectionId: connectionId,
                bankName: institutionName,
                accountName: credentials.accountName || 'Primary Account',
                accountType: credentials.accountType || 'checking',
                accountNumber: credentials.accountNumber || '****1234',
                routingNumber: credentials.routingNumber,
                status: 'pending',
                metadata: JSON.stringify(credentials) // Convert object to string
            }
        });
        // Create corresponding BankAccount record
        const bankAccountId = `ba_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const bankAccount = await prisma.bankAccount.create({
            data: {
                id: bankAccountId,
                tenantId,
                companyId,
                bankName: institutionName,
                accountNumber: credentials.accountNumber || '****1234',
                accountType: credentials.accountType || 'checking',
                currency: 'USD',
                balance: 0, // Start with zero balance
                status: 'active',
                routingNumber: credentials.routingNumber,
                accountHolder: credentials.accountName || 'Primary Account',
                notes: `Connected via ${provider} - ${connectionId}`
            }
        });
        console.log(`Bank connection created: ${connectionId}`);
        console.log(`Bank account created: ${bankAccountId}`);
        // Simulate connection process with realistic timing
        setTimeout(async () => {
            try {
                console.log(`Simulating connection sync for ${connectionId}`);
                await this.syncConnection(connectionId);
            }
            catch (error) {
                console.error(`Connection sync failed for ${connectionId}:`, error);
            }
        }, 3000); // 3 second delay to simulate real connection process
        return {
            ...connection,
            provider: connection.provider,
            status: connection.status,
            routingNumber: connection.routingNumber || undefined,
            lastSyncAt: connection.lastSyncAt || undefined,
            errorMessage: connection.errorMessage || undefined
        };
    }
    /**
     * Sync bank connection and fetch accounts/transactions
     */
    static async syncConnection(connectionId) {
        const connection = await prisma.bankConnection.findUnique({
            where: { id: connectionId }
        });
        if (!connection) {
            throw new Error('Connection not found');
        }
        try {
            // Mock API call to fetch accounts and transactions
            const bankConnection = {
                ...connection,
                provider: connection.provider,
                status: connection.status,
                routingNumber: connection.routingNumber || undefined,
                lastSyncAt: connection.lastSyncAt || undefined,
                errorMessage: connection.errorMessage || undefined
            };
            const accounts = await this.fetchAccountsFromProvider(bankConnection);
            const transactions = await this.fetchTransactionsFromProvider(bankConnection);
            // Update connection status
            await prisma.bankConnection.update({
                where: { id: connectionId },
                data: {
                    status: 'active',
                    lastSyncAt: new Date()
                }
            });
            // Store accounts in database
            for (const account of accounts) {
                await prisma.bankAccount.upsert({
                    where: {
                        id: account.id || `temp-${account.accountNumber}`
                    },
                    update: {
                        balance: account.balance.toString(),
                        lastSyncAt: new Date()
                    },
                    create: {
                        id: account.id || `temp-${account.accountNumber}`,
                        tenantId: connection.tenantId,
                        companyId: connection.companyId,
                        bankName: account.bankName,
                        accountNumber: account.accountNumber,
                        accountType: account.type,
                        balance: account.balance.toString(),
                        status: 'active'
                    }
                });
            }
            // Store transactions in database
            for (const transaction of transactions) {
                await prisma.bankTransaction.create({
                    data: {
                        tenantId: connection.tenantId,
                        bankAccountId: transaction.accountId,
                        connectionId: connectionId,
                        transactionDate: new Date(transaction.date),
                        amount: transaction.amount.toString(),
                        currency: transaction.currency,
                        description: transaction.description,
                        merchantName: transaction.merchantName,
                        merchantCategory: transaction.category,
                        transactionType: transaction.transactionType,
                        reference: transaction.reference,
                        location: transaction.location,
                        status: 'unreconciled'
                    }
                });
            }
            return { accounts, transactions };
        }
        catch (error) {
            // Update connection status to error
            await prisma.bankConnection.update({
                where: { id: connectionId },
                data: {
                    status: 'error',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                }
            });
            throw error;
        }
    }
    /**
     * Fetch accounts from provider
     */
    static async fetchAccountsFromProvider(connection) {
        // In a real implementation, this would call the actual Plaid/Yodlee API
        // For now, return empty array since we don't have real bank integration
        console.log(`BankConnectionService: fetchAccountsFromProvider called for connection ${connection.id}`);
        console.log('Note: Real account fetching requires actual Plaid/Yodlee API integration');
        // Return empty array - no mock accounts
        return [];
    }
    /**
     * Fetch transactions from provider
     */
    static async fetchTransactionsFromProvider(connection) {
        // In a real implementation, this would call the actual Plaid/Yodlee API
        // For now, return empty array since we don't have real bank integration
        console.log(`BankConnectionService: fetchTransactionsFromProvider called for connection ${connection.id}`);
        console.log('Note: Real transaction fetching requires actual Plaid/Yodlee API integration');
        // Return empty array - no mock transactions
        return [];
    }
    /**
     * Get connection status
     */
    static async getConnectionStatus(connectionId) {
        const connection = await prisma.bankConnection.findUnique({
            where: { id: connectionId }
        });
        if (!connection) {
            throw new Error('Connection not found');
        }
        const accountsCount = await prisma.bankAccount.count({
            where: {
                tenantId: connection.tenantId,
                companyId: connection.companyId
            }
        });
        const transactionsCount = await prisma.bankTransaction.count({
            where: {
                tenantId: connection.tenantId,
                connectionId: connectionId
            }
        });
        return {
            status: connection.status,
            lastSyncAt: connection.lastSyncAt || undefined,
            errorMessage: connection.errorMessage || undefined,
            accountsCount,
            transactionsCount
        };
    }
    /**
     * Get all connections for a company
     */
    static async getCompanyConnections(tenantId, companyId) {
        const connections = await prisma.bankConnection.findMany({
            where: { tenantId, companyId },
            orderBy: { createdAt: 'desc' }
        });
        return connections.map(conn => ({
            ...conn,
            provider: conn.provider,
            status: conn.status,
            routingNumber: conn.routingNumber || undefined,
            lastSyncAt: conn.lastSyncAt || undefined,
            errorMessage: conn.errorMessage || undefined
        }));
    }
    /**
     * Disconnect a bank connection
     */
    static async disconnectConnection(connectionId) {
        // Update connection status
        await prisma.bankConnection.update({
            where: { id: connectionId },
            data: { status: 'inactive' }
        });
        // Note: BankAccount model doesn't have connectionId field
        // In a real implementation, you would update related bank accounts here
        // For now, we just update the connection status
        console.log(`Bank connection ${connectionId} disconnected successfully`);
    }
    /**
     * Reconnect a bank connection
     */
    static async reconnectConnection(connectionId) {
        const connection = await prisma.bankConnection.findUnique({
            where: { id: connectionId }
        });
        if (!connection) {
            throw new Error('Connection not found');
        }
        // Update connection status
        await prisma.bankConnection.update({
            where: { id: connectionId },
            data: { status: 'pending' }
        });
        // Sync connection
        await this.syncConnection(connectionId);
    }
    /**
     * Get connection statistics
     */
    static async getConnectionStats(tenantId, companyId) {
        const connections = await prisma.bankConnection.findMany({
            where: { tenantId, companyId }
        });
        const accounts = await prisma.bankAccount.findMany({
            where: { tenantId, companyId }
        });
        const transactions = await prisma.bankTransaction.findMany({
            where: { tenantId, bankAccount: { companyId } }
        });
        const activeConnections = connections.filter(c => c.status === 'active').length;
        const inactiveConnections = connections.filter(c => c.status === 'inactive').length;
        const errorConnections = connections.filter(c => c.status === 'error').length;
        const lastSyncAt = connections
            .filter(c => c.lastSyncAt)
            .sort((a, b) => (b.lastSyncAt?.getTime() || 0) - (a.lastSyncAt?.getTime() || 0))[0]?.lastSyncAt;
        return {
            totalConnections: connections.length,
            activeConnections,
            inactiveConnections,
            errorConnections,
            totalAccounts: accounts.length,
            totalTransactions: transactions.length,
            lastSyncAt: lastSyncAt || undefined
        };
    }
    /**
     * Helper methods
     */
    static getInstitutionName(institutionId) {
        const institutions = {
            'ins_109508': 'Chase',
            'ins_109509': 'Bank of America',
            'ins_109510': 'Wells Fargo',
            'ins_109511': 'Capital One',
            'ins_109512': 'Citibank'
        };
        return institutions[institutionId] || 'Bank Institution';
    }
}
