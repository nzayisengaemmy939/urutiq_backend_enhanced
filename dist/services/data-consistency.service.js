import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class DataConsistencyService {
    prisma;
    constructor() {
        this.prisma = prisma;
    }
    // Check if all accounts have valid account types
    async validateAccountTypes() {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        try {
            const accountsWithoutTypes = await this.prisma.account.findMany({
                where: {
                    typeId: undefined
                },
                select: { id: true, name: true, code: true }
            });
            if (accountsWithoutTypes.length > 0) {
                errors.push(`${accountsWithoutTypes.length} accounts have invalid or missing account types`);
                accountsWithoutTypes.forEach(account => {
                    errors.push(`Account ${account.code} (${account.name}) has no account type`);
                });
            }
            // Check for orphaned account types
            const orphanedTypes = await this.prisma.accountType.findMany({
                where: {
                    accounts: {
                        none: {}
                    }
                }
            });
            if (orphanedTypes.length > 0) {
                warnings.push(`${orphanedTypes.length} account types have no associated accounts`);
                suggestions.push('Consider removing unused account types or creating accounts for them');
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suggestions
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [`Error validating account types: ${error}`],
                warnings: [],
                suggestions: []
            };
        }
    }
    // Check if all products have valid categories
    async validateProductCategories() {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        try {
            const productsWithoutCategories = await this.prisma.product.findMany({
                where: {
                    category: null
                },
                select: { id: true, name: true, sku: true }
            });
            if (productsWithoutCategories.length > 0) {
                errors.push(`${productsWithoutCategories.length} products have invalid or missing categories`);
                productsWithoutCategories.forEach(product => {
                    errors.push(`Product ${product.sku} (${product.name}) has no category`);
                });
            }
            // Check for orphaned categories
            const orphanedCategories = await this.prisma.category.findMany({
                where: {
                    products: {
                        none: {}
                    }
                }
            });
            if (orphanedCategories.length > 0) {
                warnings.push(`${orphanedCategories.length} categories have no associated products`);
                suggestions.push('Consider removing unused categories or assigning products to them');
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suggestions
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [`Error validating product categories: ${error}`],
                warnings: [],
                suggestions: []
            };
        }
    }
    // Check stock consistency between products and inventory movements
    async validateStockConsistency() {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        try {
            const productsWithStock = await this.prisma.product.findMany({
                where: {
                    stockQuantity: { gt: 0 }
                },
                select: { id: true, name: true, sku: true, stockQuantity: true }
            });
            let inconsistencies = 0;
            for (const product of productsWithStock) {
                const movements = await this.prisma.inventoryMovement.findMany({
                    where: { productId: product.id }
                });
                const calculatedStock = movements.reduce((sum, movement) => sum + Number(movement.quantity), 0);
                const actualStock = Number(product.stockQuantity);
                if (Math.abs(calculatedStock - actualStock) > 0.01) {
                    inconsistencies++;
                    errors.push(`Product ${product.sku} (${product.name}): Stock shows ${actualStock} but movements total ${calculatedStock}`);
                }
            }
            if (inconsistencies > 0) {
                errors.push(`${inconsistencies} products have stock inconsistencies`);
                suggestions.push('Run stock reconciliation to fix inconsistencies');
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suggestions
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [`Error validating stock consistency: ${error}`],
                warnings: [],
                suggestions: []
            };
        }
    }
    // Check if all journal entries are balanced
    async validateJournalEntryBalance() {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        try {
            const journalEntries = await this.prisma.journalEntry.findMany({
                include: { lines: true }
            });
            let unbalancedEntries = 0;
            for (const entry of journalEntries) {
                const totalDebits = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0);
                const totalCredits = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0);
                if (Math.abs(totalDebits - totalCredits) > 0.01) {
                    unbalancedEntries++;
                    errors.push(`Journal entry ${entry.reference}: Debits ${totalDebits} ≠ Credits ${totalCredits}`);
                }
            }
            if (unbalancedEntries > 0) {
                errors.push(`${unbalancedEntries} journal entries are unbalanced`);
                suggestions.push('Review and correct unbalanced journal entries');
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suggestions
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [`Error validating journal entry balance: ${error}`],
                warnings: [],
                suggestions: []
            };
        }
    }
    // Check if all expenses have proper journal entries
    async validateExpenseJournalIntegration() {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        try {
            const expenses = await this.prisma.expense.findMany({
                where: {
                    status: { not: 'draft' }
                },
                select: { id: true, description: true, amount: true, status: true }
            });
            let missingJournalEntries = 0;
            for (const expense of expenses) {
                const journalEntries = await this.prisma.journalEntry.findMany({
                    where: {
                        reference: { contains: expense.id.substring(0, 8) }
                    }
                });
                if (journalEntries.length === 0) {
                    missingJournalEntries++;
                    errors.push(`Expense ${expense.description} (${expense.status}) has no journal entry`);
                }
            }
            if (missingJournalEntries > 0) {
                errors.push(`${missingJournalEntries} expenses are missing journal entries`);
                suggestions.push('Generate journal entries for expenses that are missing them');
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suggestions
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [`Error validating expense journal integration: ${error}`],
                warnings: [],
                suggestions: []
            };
        }
    }
    // Check if all purchase orders have proper receipts
    async validatePurchaseOrderReceipts() {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        try {
            const deliveredPOs = await this.prisma.purchaseOrder.findMany({
                where: {
                    status: 'delivered'
                },
                include: { receipts: true }
            });
            let missingReceipts = 0;
            for (const po of deliveredPOs) {
                if (po.receipts.length === 0) {
                    missingReceipts++;
                    errors.push(`Purchase order ${po.poNumber} is marked as delivered but has no receipts`);
                }
            }
            if (missingReceipts > 0) {
                errors.push(`${missingReceipts} delivered purchase orders are missing receipts`);
                suggestions.push('Create receipts for delivered purchase orders');
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suggestions
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [`Error validating purchase order receipts: ${error}`],
                warnings: [],
                suggestions
            };
        }
    }
    // Check for orphaned records
    async validateOrphanedRecords() {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        try {
            // Check for orphaned purchase order lines
            const orphanedPOLines = await this.prisma.purchaseOrderLine.findMany({
                where: {
                    purchaseOrderId: undefined
                }
            });
            if (orphanedPOLines.length > 0) {
                errors.push(`${orphanedPOLines.length} purchase order lines are orphaned`);
                suggestions.push('Remove orphaned purchase order lines');
            }
            // Check for orphaned journal lines
            const orphanedJournalLines = await this.prisma.journalLine.findMany({
                where: {
                    entryId: undefined
                }
            });
            if (orphanedJournalLines.length > 0) {
                errors.push(`${orphanedJournalLines.length} journal lines are orphaned`);
                suggestions.push('Remove orphaned journal lines');
            }
            // Check for orphaned receipt items
            const orphanedReceiptItems = await this.prisma.receiptItem.findMany({
                where: {
                    receiptId: undefined
                }
            });
            if (orphanedReceiptItems.length > 0) {
                errors.push(`${orphanedReceiptItems.length} receipt items are orphaned`);
                suggestions.push('Remove orphaned receipt items');
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                suggestions
            };
        }
        catch (error) {
            return {
                isValid: false,
                errors: [`Error validating orphaned records: ${error}`],
                warnings: [],
                suggestions
            };
        }
    }
    // Run all consistency checks
    async runAllChecks() {
        const checks = [
            {
                name: 'Account Types',
                description: 'Validate account type relationships',
                check: () => this.validateAccountTypes()
            },
            {
                name: 'Product Categories',
                description: 'Validate product category relationships',
                check: () => this.validateProductCategories()
            },
            {
                name: 'Stock Consistency',
                description: 'Validate stock levels against movements',
                check: () => this.validateStockConsistency()
            },
            {
                name: 'Journal Entry Balance',
                description: 'Validate journal entry debits equal credits',
                check: () => this.validateJournalEntryBalance()
            },
            {
                name: 'Expense Journal Integration',
                description: 'Validate expense journal entry integration',
                check: () => this.validateExpenseJournalIntegration()
            },
            {
                name: 'Purchase Order Receipts',
                description: 'Validate purchase order receipt relationships',
                check: () => this.validatePurchaseOrderReceipts()
            },
            {
                name: 'Orphaned Records',
                description: 'Check for orphaned records',
                check: () => this.validateOrphanedRecords()
            }
        ];
        const results = [];
        let totalErrors = 0;
        let totalWarnings = 0;
        for (const check of checks) {
            const result = await check.check();
            results.push({ name: check.name, result });
            totalErrors += result.errors.length;
            totalWarnings += result.warnings.length;
        }
        const overall = {
            isValid: totalErrors === 0,
            errors: [`Total errors: ${totalErrors}`],
            warnings: [`Total warnings: ${totalWarnings}`],
            suggestions: ['Review individual check results for details']
        };
        return { overall, checks: results };
    }
    // Fix common data issues
    async fixCommonIssues() {
        const fixed = [];
        const errors = [];
        try {
            // Fix stock inconsistencies
            const stockResult = await this.validateStockConsistency();
            if (!stockResult.isValid) {
                // This would implement actual stock fixing logic
                fixed.push('Stock inconsistencies identified for fixing');
            }
            // Fix orphaned records
            const orphanedResult = await this.validateOrphanedRecords();
            if (!orphanedResult.isValid) {
                // This would implement actual orphaned record cleanup
                fixed.push('Orphaned records identified for cleanup');
            }
            return { fixed, errors };
        }
        catch (error) {
            return {
                fixed,
                errors: [`Error fixing common issues: ${error}`]
            };
        }
    }
}
export const dataConsistencyService = new DataConsistencyService();
