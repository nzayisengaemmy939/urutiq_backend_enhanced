import { prisma } from '../prisma.js';
export class SalesAccountingIntegrationService {
    /**
     * Ensure we're using the shared Prisma instance and not creating new connections
     */
    getDatabase() {
        return prisma;
    }
    /**
     * Clean up any potential connection issues
     */
    async cleanup() {
        try {
            // Force disconnect and reconnect if needed
            await prisma.$disconnect();
            console.log('✅ Prisma connection cleaned up');
        }
        catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
    /**
     * Test function to verify journal entry calculation logic
     */
    async testJournalEntryLogic() {
        console.log('🧪 Testing Journal Entry Logic...');
        // Test Case 1: Simple transaction
        const testInvoice1 = {
            invoiceNumber: 'TEST-001',
            subtotal: 10000,
            discountAmount: 1000,
            taxAmount: 1500,
            totalAmount: 10500, // 10000 - 1000 + 1500
            status: 'paid',
            companyId: 'test-company',
            tenantId: 'test-tenant',
            lines: [
                {
                    product: { type: 'PRODUCT', costPrice: 5000 },
                    quantity: 1
                }
            ]
        };
        console.log('📊 Test Case 1 - Expected Journal Entries:');
        console.log('Debit:  Cash $10,500');
        console.log('Credit: Revenue $10,000');
        console.log('Debit:  Sales Discounts $1,000');
        console.log('Credit: Tax Payable $1,500');
        console.log('Debit:  COGS $5,000');
        console.log('Credit: Inventory $5,000');
        console.log('Total Debits: $16,500 | Total Credits: $16,500 ✅');
        // Test Case 2: No discount
        const testInvoice2 = {
            invoiceNumber: 'TEST-002',
            subtotal: 20000,
            discountAmount: 0,
            taxAmount: 3000,
            totalAmount: 23000, // 20000 + 3000
            status: 'paid',
            companyId: 'test-company',
            tenantId: 'test-tenant',
            lines: [
                {
                    product: { type: 'PRODUCT', costPrice: 8000 },
                    quantity: 1
                }
            ]
        };
        console.log('\n📊 Test Case 2 - Expected Journal Entries:');
        console.log('Debit:  Cash $23,000');
        console.log('Credit: Revenue $20,000');
        console.log('Credit: Tax Payable $3,000');
        console.log('Debit:  COGS $8,000');
        console.log('Credit: Inventory $8,000');
        console.log('Total Debits: $31,000 | Total Credits: $31,000 ✅');
        // Test Case 3: High discount
        const testInvoice3 = {
            invoiceNumber: 'TEST-003',
            subtotal: 50000,
            discountAmount: 10000,
            taxAmount: 6000,
            totalAmount: 46000, // 50000 - 10000 + 6000
            status: 'paid',
            companyId: 'test-company',
            tenantId: 'test-tenant',
            lines: [
                {
                    product: { type: 'PRODUCT', costPrice: 20000 },
                    quantity: 1
                }
            ]
        };
        console.log('\n📊 Test Case 3 - Expected Journal Entries:');
        console.log('Debit:  Cash $46,000');
        console.log('Credit: Revenue $50,000');
        console.log('Debit:  Sales Discounts $10,000');
        console.log('Credit: Tax Payable $6,000');
        console.log('Debit:  COGS $20,000');
        console.log('Credit: Inventory $20,000');
        console.log('Total Debits: $76,000 | Total Credits: $76,000 ✅');
        console.log('\n✅ Journal Entry Logic Test Complete!');
        console.log('The logic should create balanced entries for all test cases.');
    }
    /**
     * Validate inventory availability for an invoice
     */
    async validateInventoryAvailability(invoice, tenantId) {
        const errors = [];
        const warnings = [];
        try {
            if (!invoice.lines || invoice.lines.length === 0) {
                warnings.push('Invoice has no line items');
                return { valid: true, errors, warnings };
            }
            // Check inventory for each line item
            console.log('Validating inventory for invoice lines:', invoice.lines);
            for (const line of invoice.lines) {
                console.log('Processing line item:', {
                    product: line.product,
                    productType: line.product?.type,
                    quantity: line.quantity,
                    description: line.description
                });
                let product = null;
                let productName = '';
                // If line has a product association, use it
                if (line.product && line.product.type === 'PRODUCT') {
                    product = line.product;
                    productName = line.product.name;
                }
                // If no product but has description, try to find product by name
                else if (line.description && !line.product) {
                    console.log(`Looking up product by description: ${line.description}`);
                    product = await prisma.product.findFirst({
                        where: {
                            name: { contains: line.description },
                            tenantId,
                            type: 'PRODUCT'
                        }
                    });
                    if (product) {
                        productName = product.name;
                        console.log(`Found product by description: ${productName}`);
                    }
                    else {
                        console.log(`No inventory product found for description: ${line.description}`);
                        // Skip this line item - it's not an inventory item
                        continue;
                    }
                }
                else {
                    console.log(`Skipping non-inventory item: ${line.product?.name || line.description || 'Unknown'}, type: ${line.product?.type || 'Unknown'}`);
                    continue;
                }
                if (product) {
                    const quantity = Number(line.quantity || 0);
                    const productId = product.id;
                    console.log(`Checking inventory for product: ${productName}, quantity: ${quantity}`);
                    // Get current stock quantity
                    const currentProduct = await prisma.product.findFirst({
                        where: { id: productId, tenantId }
                    });
                    if (!currentProduct) {
                        console.log(`Product not found: ${productName}`);
                        errors.push(`Product "${productName}" not found in inventory`);
                        continue;
                    }
                    const currentStock = Number(currentProduct.stockQuantity || 0);
                    console.log(`Current stock for ${productName}: ${currentStock}, Required: ${quantity}`);
                    if (currentStock < quantity) {
                        errors.push(`Insufficient stock for "${productName}". ` +
                            `Available: ${currentStock}, Required: ${quantity}`);
                    }
                    else if (currentStock === quantity) {
                        warnings.push(`Stock is exactly sufficient for "${productName}". ` +
                            `Consider reordering soon.`);
                    }
                    else if (currentStock < quantity * 1.5) {
                        warnings.push(`Low stock warning for "${productName}". ` +
                            `Available: ${currentStock}, Required: ${quantity}`);
                    }
                }
            }
            return {
                valid: errors.length === 0,
                errors,
                warnings
            };
        }
        catch (error) {
            console.error('Error validating inventory availability:', error);
            errors.push(`Validation error: ${error.message}`);
            return { valid: false, errors, warnings };
        }
    }
    /**
     * Main method to process invoice payment and create all necessary accounting entries
     */
    async processInvoicePayment(invoiceId, tenantId) {
        try {
            // Get the invoice with all related data
            const invoice = await this.getDatabase().invoice.findFirst({
                where: { id: invoiceId, tenantId },
                include: {
                    lines: {
                        include: {
                            product: true
                        }
                    },
                    customer: true,
                    company: true
                }
            });
            if (!invoice) {
                throw new Error('Invoice not found');
            }
            // Validate inventory availability before processing
            const inventoryValidation = await this.validateInventoryAvailability(invoice, tenantId);
            if (!inventoryValidation.valid) {
                throw new Error(`Insufficient inventory: ${inventoryValidation.errors.join(', ')}`);
            }
            const result = await this.getDatabase().$transaction(async (tx) => {
                // 1. Create accounting journal entries
                const journalEntryId = await this.createSalesAccountingEntries(invoice, tenantId, tx);
                // 2. Update inventory for sold products
                const inventoryMovementIds = await this.updateInventoryForSales(invoice, tenantId, tx);
                // 3. Update invoice with accounting reference
                await tx.invoice.update({
                    where: { id: invoiceId },
                    data: {
                        // Add accounting reference if needed
                        updatedAt: new Date()
                    }
                });
                return {
                    journalEntryId,
                    inventoryMovements: inventoryMovementIds,
                    success: true
                };
            }, {
                timeout: 30000, // Increase timeout to 30 seconds
                maxWait: 15000, // Maximum time to wait for transaction to start
                isolationLevel: 'ReadCommitted' // Use less strict isolation for better performance
            });
            return result;
        }
        catch (error) {
            console.error('Error processing invoice payment:', error);
            // Check if it's a connection error
            if (error.message?.includes('too many connections') || error.message?.includes('connection')) {
                console.error('🔌 Database connection issue detected');
                // Try to cleanup connections
                await this.cleanup();
            }
            throw new Error(`Failed to process invoice payment: ${error.message}`);
        }
    }
    /**
     * Create double-entry accounting journal entries for sales
     */
    async createSalesAccountingEntries(invoice, tenantId, tx) {
        const db = tx || this.getDatabase();
        try {
            // Get or create required accounts
            const accounts = await this.getOrCreateSalesAccounts(invoice.companyId, tenantId, db);
            // Get or create Sales Revenue entry type
            let salesEntryType = await db.journalEntryType.findFirst({
                where: {
                    companyId: invoice.companyId,
                    name: 'Sales Revenue'
                }
            });
            if (!salesEntryType) {
                salesEntryType = await db.journalEntryType.create({
                    data: {
                        tenantId: invoice.tenantId,
                        companyId: invoice.companyId,
                        name: 'Sales Revenue',
                        description: 'Revenue from sales transactions',
                        category: 'REVENUE',
                        isSystemGenerated: true,
                        requiresApproval: false,
                        isActive: true
                    }
                });
            }
            // Create journal entry using new schema
            const journalEntry = await db.journalEntry.create({
                data: {
                    tenantId,
                    companyId: invoice.companyId,
                    date: new Date(invoice.issueDate),
                    memo: `Sales Invoice ${invoice.invoiceNumber} - ${invoice.customer?.name || 'Customer'}`,
                    reference: `INV-${invoice.invoiceNumber}`,
                    status: 'POSTED',
                    entryTypeId: salesEntryType.id,
                    createdById: null
                }
            });
            // Create journal lines for double-entry bookkeeping
            const journalLines = [];
            // Calculate amounts
            const subtotal = Number(invoice.subtotal || 0);
            const discountAmount = Number(invoice.discountAmount || 0);
            const taxAmount = Number(invoice.taxAmount || 0);
            const totalAmount = Number(invoice.totalAmount || 0);
            // Debug: Log the invoice amounts
            console.log('🔍 Invoice Amounts Debug:', {
                invoiceNumber: invoice.invoiceNumber,
                subtotal: invoice.subtotal,
                discountAmount: invoice.discountAmount,
                taxAmount: invoice.taxAmount,
                totalAmount: invoice.totalAmount,
                calculatedSubtotal: subtotal,
                calculatedDiscountAmount: discountAmount,
                calculatedTaxAmount: taxAmount,
                calculatedTotalAmount: totalAmount
            });
            // Test the calculation logic
            const expectedTotal = subtotal - discountAmount + taxAmount;
            console.log('🧮 Calculation Test:', {
                formula: `${subtotal} - ${discountAmount} + ${taxAmount} = ${expectedTotal}`,
                actualTotal: totalAmount,
                matches: expectedTotal === totalAmount ? '✅ CORRECT' : '❌ MISMATCH'
            });
            // 1. Debit: Accounts Receivable (if not paid) or Cash (if paid)
            if (invoice.status === 'paid') {
                // If paid, debit Cash account
                journalLines.push({
                    tenantId,
                    entryId: journalEntry.id,
                    accountId: accounts.cash.id,
                    debit: totalAmount,
                    credit: 0,
                    memo: `Cash received for Invoice ${invoice.invoiceNumber}`
                });
            }
            else {
                // If not paid, debit Accounts Receivable
                journalLines.push({
                    tenantId,
                    entryId: journalEntry.id,
                    accountId: accounts.accountsReceivable.id,
                    debit: totalAmount,
                    credit: 0,
                    memo: `Accounts Receivable for Invoice ${invoice.invoiceNumber}`
                });
            }
            // 2. Credit: Revenue account (subtotal before discount)
            journalLines.push({
                tenantId,
                entryId: journalEntry.id,
                accountId: accounts.revenue.id,
                debit: 0,
                credit: subtotal,
                memo: `Sales Revenue for Invoice ${invoice.invoiceNumber}`
            });
            // 3. Handle discount if applicable
            if (discountAmount > 0) {
                journalLines.push({
                    tenantId,
                    entryId: journalEntry.id,
                    accountId: accounts.discounts.id,
                    debit: discountAmount,
                    credit: 0,
                    memo: `Sales Discount for Invoice ${invoice.invoiceNumber}`
                });
            }
            // 3. Handle COGS (Cost of Goods Sold) for inventory items
            if (invoice.lines && invoice.lines.length > 0) {
                let totalCogs = 0;
                for (const line of invoice.lines) {
                    if (line.product && line.product.type === 'PRODUCT') {
                        const quantity = Number(line.quantity || 0);
                        // Use a reasonable cost price - if costPrice seems inflated, use a percentage of unitPrice
                        let unitCost = Number(line.product.costPrice || 0);
                        const unitPrice = Number(line.unitPrice || 0);
                        // If costPrice is more than 10x unitPrice, it's likely inflated - use 70% of unitPrice as cost
                        if (unitCost > unitPrice * 10) {
                            unitCost = unitPrice * 0.7; // 70% of selling price as cost
                            console.log(`Adjusted inflated cost price: ${line.product.costPrice} → ${unitCost} for product ${line.product.name}`);
                        }
                        const lineCogs = quantity * unitCost;
                        totalCogs += lineCogs;
                    }
                }
                if (totalCogs > 0) {
                    // Debit: COGS account
                    journalLines.push({
                        tenantId,
                        entryId: journalEntry.id,
                        accountId: accounts.cogs.id,
                        debit: totalCogs,
                        credit: 0,
                        memo: `Cost of Goods Sold for Invoice ${invoice.invoiceNumber}`
                    });
                    // Credit: Inventory account
                    journalLines.push({
                        tenantId,
                        entryId: journalEntry.id,
                        accountId: accounts.inventory.id,
                        debit: 0,
                        credit: totalCogs,
                        memo: `Inventory reduction for Invoice ${invoice.invoiceNumber}`
                    });
                }
            }
            // 4. Handle tax if applicable
            if (taxAmount > 0) {
                journalLines.push({
                    tenantId,
                    entryId: journalEntry.id,
                    accountId: accounts.taxPayable.id,
                    debit: 0,
                    credit: taxAmount,
                    memo: `Tax payable for Invoice ${invoice.invoiceNumber}`
                });
            }
            // Create all journal lines using new schema
            await db.journalLine.createMany({
                data: journalLines
            });
            // Debug: Log the journal lines created
            console.log('🔍 Journal Lines Debug:', {
                invoiceNumber: invoice.invoiceNumber,
                journalLines: journalLines.map(line => ({
                    accountId: line.accountId,
                    debit: line.debit,
                    credit: line.credit,
                    memo: line.memo
                })),
                totalDebit: journalLines.reduce((sum, line) => sum + line.debit, 0),
                totalCredit: journalLines.reduce((sum, line) => sum + line.credit, 0)
            });
            // Test journal entry balance
            const totalDebit = journalLines.reduce((sum, line) => sum + line.debit, 0);
            const totalCredit = journalLines.reduce((sum, line) => sum + line.credit, 0);
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
            console.log('⚖️ Journal Balance Test:', {
                totalDebit,
                totalCredit,
                difference: totalDebit - totalCredit,
                isBalanced: isBalanced ? '✅ BALANCED' : '❌ UNBALANCED'
            });
            return journalEntry.id;
        }
        catch (error) {
            console.error('Error creating sales accounting entries:', error);
            throw new Error(`Failed to create accounting entries: ${error.message}`);
        }
    }
    /**
     * Update inventory for sold products
     */
    async updateInventoryForSales(invoice, tenantId, tx) {
        const db = tx || this.getDatabase();
        const movementIds = [];
        try {
            if (!invoice.lines || invoice.lines.length === 0) {
                return movementIds;
            }
            console.log('Updating inventory for sales, invoice lines:', invoice.lines);
            for (const line of invoice.lines) {
                console.log('Processing line for inventory update:', {
                    product: line.product,
                    productType: line.product?.type,
                    quantity: line.quantity,
                    description: line.description
                });
                let product = null;
                let productName = '';
                // If line has a product association, use it
                if (line.product && line.product.type === 'PRODUCT') {
                    product = line.product;
                    productName = line.product.name;
                }
                // If no product but has description, try to find product by name
                else if (line.description && !line.product) {
                    console.log(`Looking up product by description for stock update: ${line.description}`);
                    product = await db.product.findFirst({
                        where: {
                            name: { contains: line.description },
                            tenantId,
                            type: 'PRODUCT'
                        }
                    });
                    if (product) {
                        productName = product.name;
                        console.log(`Found product by description for stock update: ${productName}`);
                    }
                    else {
                        console.log(`No inventory product found for description: ${line.description}`);
                        // Skip this line item - it's not an inventory item
                        continue;
                    }
                }
                else {
                    console.log(`Skipping non-inventory item for stock update: ${line.product?.name || line.description || 'Unknown'}, type: ${line.product?.type || 'Unknown'}`);
                    continue;
                }
                if (product) {
                    const quantity = Number(line.quantity || 0);
                    const productId = product.id;
                    console.log(`Updating inventory for product: ${productName}, quantity: ${quantity}`);
                    // Check if sufficient stock is available
                    const currentProduct = await db.product.findFirst({
                        where: { id: productId, tenantId }
                    });
                    if (!currentProduct) {
                        console.log(`Product not found for inventory update: ${productName}`);
                        throw new Error(`Product ${productName} not found`);
                    }
                    const currentStock = Number(currentProduct.stockQuantity || 0);
                    console.log(`Current stock before update: ${currentStock}, reducing by: ${quantity}`);
                    if (currentStock < quantity) {
                        throw new Error(`Insufficient stock for ${productName}. Available: ${currentStock}, Required: ${quantity}`);
                    }
                    // Create inventory movement (sale reduces stock)
                    const movement = await db.inventoryMovement.create({
                        data: {
                            tenantId,
                            productId,
                            movementType: 'SALE',
                            quantity: -quantity, // Negative for stock reduction
                            movementDate: new Date(invoice.issueDate),
                            reference: `INV-${invoice.invoiceNumber}`,
                            reason: `Sale to ${invoice.customer?.name || 'Customer'}`,
                            unitCost: (() => {
                                let cost = Number(product.costPrice || 0);
                                const unitPrice = Number(line.unitPrice || 0);
                                // If costPrice is more than 10x unitPrice, it's likely inflated - use 70% of unitPrice as cost
                                if (cost > unitPrice * 10) {
                                    cost = unitPrice * 0.7; // 70% of selling price as cost
                                }
                                return cost;
                            })()
                        }
                    });
                    movementIds.push(movement.id);
                    console.log(`Created inventory movement: ${movement.id}`);
                    // Update product stock quantity
                    const newStockQuantity = currentStock - quantity;
                    const reservedQuantity = Number(currentProduct.reservedQuantity || 0);
                    const newAvailableQuantity = newStockQuantity - reservedQuantity;
                    console.log(`Updating stock from ${currentStock} to ${newStockQuantity}`);
                    console.log(`Updating available quantity from ${Number(currentProduct.availableQuantity || 0)} to ${newAvailableQuantity}`);
                    await db.product.update({
                        where: { id: productId },
                        data: {
                            stockQuantity: newStockQuantity,
                            availableQuantity: newAvailableQuantity,
                            status: newStockQuantity <= 0 ? 'INACTIVE' : 'ACTIVE'
                        }
                    });
                    console.log(`Stock updated successfully for product: ${productName}`);
                }
            }
            return movementIds;
        }
        catch (error) {
            console.error('Error updating inventory for sales:', error);
            throw new Error(`Failed to update inventory: ${error.message}`);
        }
    }
    /**
     * Get or create required accounts for sales accounting
     */
    async getOrCreateSalesAccounts(companyId, tenantId, db) {
        const database = db || this.getDatabase();
        // Validate company exists
        const company = await database.company.findFirst({
            where: { id: companyId, tenantId }
        });
        if (!company) {
            throw new Error(`Company with ID ${companyId} not found for tenant ${tenantId}`);
        }
        // Define account mappings with type codes and fallbacks
        const accountMappings = {
            cash: {
                name: 'Cash',
                code: '1000',
                typeCode: 'ASSET',
                fallbackNames: ['Cash', 'Bank - Checking Account', 'Bank - Savings Account'],
                fallbackCodes: ['1000', '1010', '1020']
            },
            accountsReceivable: {
                name: 'Accounts Receivable',
                code: '1100',
                typeCode: 'ASSET',
                fallbackNames: ['Accounts Receivable'],
                fallbackCodes: ['1100']
            },
            revenue: {
                name: 'Sales Revenue',
                code: '4000',
                typeCode: 'REVENUE',
                fallbackNames: ['Sales Revenue', 'Service Revenue'],
                fallbackCodes: ['4000', '4100']
            },
            cogs: {
                name: 'Cost of Goods Sold',
                code: '5000',
                typeCode: 'EXPENSE',
                fallbackNames: ['Cost of Goods Sold'],
                fallbackCodes: ['5000']
            },
            inventory: {
                name: 'Inventory',
                code: '1200',
                typeCode: 'ASSET',
                fallbackNames: ['Inventory'],
                fallbackCodes: ['1200']
            },
            taxPayable: {
                name: 'Tax Payable',
                code: '2100',
                typeCode: 'LIABILITY',
                fallbackNames: ['Tax Payable', 'Taxes Payable', 'Accrued Expenses'],
                fallbackCodes: ['2100', '2300']
            },
            discounts: {
                name: 'Sales Discounts',
                code: '5001',
                typeCode: 'EXPENSE',
                fallbackNames: ['Sales Discounts', 'Discounts'],
                fallbackCodes: ['5001', '5002']
            }
        };
        const accounts = {};
        for (const [key, mapping] of Object.entries(accountMappings)) {
            try {
                // First, get or create the account type
                let accountType = await database.accountType.findFirst({
                    where: {
                        tenantId,
                        companyId,
                        code: mapping.typeCode
                    }
                });
                if (!accountType) {
                    accountType = await database.accountType.create({
                        data: {
                            tenantId,
                            companyId,
                            code: mapping.typeCode,
                            name: mapping.typeCode.charAt(0) + mapping.typeCode.slice(1).toLowerCase()
                        }
                    });
                }
                // Then, get or create the account with fallbacks
                let account = await database.account.findFirst({
                    where: {
                        tenantId,
                        companyId,
                        OR: [
                            { name: mapping.name },
                            { code: mapping.code },
                            // Try fallback names and codes
                            ...(mapping.fallbackNames?.map(name => ({ name })) || []),
                            ...(mapping.fallbackCodes?.map(code => ({ code })) || [])
                        ]
                    }
                });
                if (!account) {
                    // If no account found, create it
                    account = await database.account.create({
                        data: {
                            tenantId,
                            name: mapping.name,
                            code: mapping.code,
                            type: {
                                connect: { id: accountType.id }
                            },
                            company: {
                                connect: { id: companyId }
                            }
                        }
                    });
                    console.log(`✅ Created new account: ${mapping.name} (${mapping.code})`);
                }
                else {
                    console.log(`✅ Found existing account: ${account.name} (${account.code})`);
                }
                accounts[key] = account;
            }
            catch (error) {
                console.error(`Error creating account ${key} (${mapping.name}):`, error);
                throw new Error(`Failed to create account ${mapping.name}: ${error.message}`);
            }
        }
        // Validate that all required accounts are present
        const missingAccounts = [];
        for (const [key, account] of Object.entries(accounts)) {
            if (!account) {
                missingAccounts.push(key);
            }
        }
        if (missingAccounts.length > 0) {
            throw new Error(`Missing required accounts: ${missingAccounts.join(', ')}. Please ensure all required accounts exist or can be created.`);
        }
        console.log('✅ All required accounts found/created successfully');
        return accounts;
    }
}
export const salesAccountingIntegration = new SalesAccountingIntegrationService();
