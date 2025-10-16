import { z } from 'zod';
// Common validation patterns
const emailSchema = z.string().email('Invalid email format');
const phoneSchema = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format');
const currencySchema = z.number().positive('Amount must be positive').max(999999999.99, 'Amount too large');
const percentageSchema = z.number().min(0, 'Percentage must be 0 or greater').max(100, 'Percentage cannot exceed 100');
const dateSchema = z.string().datetime('Invalid date format');
const uuidSchema = z.string().uuid('Invalid UUID format');
const skuSchema = z.string().min(1, 'SKU is required').max(50, 'SKU too long').regex(/^[A-Z0-9\-_]+$/, 'SKU must contain only uppercase letters, numbers, hyphens, and underscores');
// Account Type Validation
export const accountTypeSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    code: z.string().min(1, 'Code is required').max(10, 'Code too long').regex(/^[A-Z]+$/, 'Code must be uppercase letters only'),
    description: z.string().max(500, 'Description too long').optional(),
    isActive: z.boolean().default(true)
});
// Account Validation
export const accountSchema = z.object({
    code: z.string().min(1, 'Account code is required').max(20, 'Code too long'),
    name: z.string().min(1, 'Account name is required').max(200, 'Name too long'),
    typeId: z.string().uuid('Invalid account type ID'),
    parentId: z.string().uuid('Invalid parent account ID').optional(),
    companyId: z.string().min(1, 'Company ID is required'),
    isActive: z.boolean().default(true),
    description: z.string().max(1000, 'Description too long').optional()
});
// Product Category Validation
export const categorySchema = z.object({
    name: z.string().min(1, 'Category name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    parentId: z.string().uuid('Invalid parent category ID').optional(),
    isActive: z.boolean().default(true)
});
// Product Validation
export const productSchema = z.object({
    name: z.string().min(1, 'Product name is required').max(200, 'Name too long'),
    sku: skuSchema,
    description: z.string().max(1000, 'Description too long').optional(),
    type: z.enum(['PRODUCT', 'SERVICE']),
    categoryId: z.string().uuid('Invalid category ID'),
    unitPrice: currencySchema,
    costPrice: currencySchema,
    stockQuantity: z.number().min(0, 'Stock quantity cannot be negative').default(0),
    availableQuantity: z.number().min(0, 'Available quantity cannot be negative').default(0),
    reservedQuantity: z.number().min(0, 'Reserved quantity cannot be negative').default(0),
    minStockLevel: z.number().min(0, 'Minimum stock level cannot be negative').optional(),
    maxStockLevel: z.number().min(0, 'Maximum stock level cannot be negative').optional(),
    reorderPoint: z.number().min(0, 'Reorder point cannot be negative').optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED']).default('ACTIVE'),
    isTaxable: z.boolean().default(true),
    taxRate: percentageSchema.optional()
});
// Vendor Validation
export const vendorSchema = z.object({
    name: z.string().min(1, 'Vendor name is required').max(200, 'Name too long'),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    address: z.string().max(500, 'Address too long').optional(),
    city: z.string().max(100, 'City name too long').optional(),
    state: z.string().max(100, 'State name too long').optional(),
    zipCode: z.string().max(20, 'ZIP code too long').optional(),
    country: z.string().max(100, 'Country name too long').optional(),
    taxId: z.string().max(50, 'Tax ID too long').optional(),
    paymentTerms: z.number().min(0, 'Payment terms cannot be negative').optional(),
    isActive: z.boolean().default(true),
    notes: z.string().max(1000, 'Notes too long').optional()
});
// Purchase Order Validation
export const purchaseOrderSchema = z.object({
    poNumber: z.string().min(1, 'PO number is required').max(50, 'PO number too long'),
    vendorId: z.string().uuid('Invalid vendor ID'),
    orderDate: dateSchema,
    expectedDelivery: dateSchema.optional(),
    status: z.enum(['draft', 'sent', 'confirmed', 'delivered', 'cancelled']).default('draft'),
    receivingStatus: z.enum(['pending', 'partial', 'complete']).default('pending'),
    totalAmount: currencySchema,
    notes: z.string().max(1000, 'Notes too long').optional(),
    terms: z.string().max(500, 'Terms too long').optional()
});
// Purchase Order Line Validation
export const purchaseOrderLineSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().positive('Quantity must be positive'),
    unitPrice: currencySchema,
    taxRate: percentageSchema.default(0),
    lineTotal: currencySchema,
    receivedQuantity: z.number().min(0, 'Received quantity cannot be negative').default(0),
    notes: z.string().max(500, 'Notes too long').optional()
});
// Receipt Validation
export const receiptSchema = z.object({
    receiptNumber: z.string().min(1, 'Receipt number is required').max(50, 'Receipt number too long'),
    purchaseOrderId: z.string().uuid('Invalid purchase order ID'),
    receivedDate: dateSchema,
    receivedBy: z.string().min(1, 'Received by is required').max(100, 'Name too long'),
    partialReceipt: z.boolean().default(false),
    notes: z.string().max(1000, 'Notes too long').optional()
});
// Receipt Item Validation
export const receiptItemSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantityReceived: z.number().positive('Quantity received must be positive'),
    quantityAccepted: z.number().min(0, 'Quantity accepted cannot be negative'),
    quantityRejected: z.number().min(0, 'Quantity rejected cannot be negative'),
    rejectionReason: z.string().max(500, 'Rejection reason too long').optional(),
    notes: z.string().max(500, 'Notes too long').optional()
});
// Journal Entry Type Validation
export const journalEntryTypeSchema = z.object({
    name: z.string().min(1, 'Entry type name is required').max(100, 'Name too long'),
    category: z.enum(['EXPENSE', 'INVENTORY', 'SALES', 'PURCHASE', 'ADJUSTMENT', 'OTHER']),
    description: z.string().max(500, 'Description too long').optional(),
    isActive: z.boolean().default(true)
});
// Journal Entry Validation
export const journalEntrySchema = z.object({
    date: dateSchema,
    memo: z.string().min(1, 'Memo is required').max(500, 'Memo too long'),
    reference: z.string().min(1, 'Reference is required').max(100, 'Reference too long'),
    status: z.enum(['DRAFT', 'POSTED', 'CANCELLED']).default('DRAFT'),
    entryTypeId: z.string().uuid('Invalid entry type ID'),
    lines: z.array(z.object({
        accountId: z.string().uuid('Invalid account ID'),
        debit: currencySchema,
        credit: currencySchema,
        memo: z.string().max(500, 'Memo too long').optional()
    })).min(2, 'At least 2 lines required').refine((lines) => {
        const totalDebits = lines.reduce((sum, line) => sum + Number(line.debit), 0);
        const totalCredits = lines.reduce((sum, line) => sum + Number(line.credit), 0);
        return Math.abs(totalDebits - totalCredits) < 0.01; // Allow for small rounding differences
    }, { message: 'Total debits must equal total credits' })
});
// Expense Category Validation
export const expenseCategorySchema = z.object({
    name: z.string().min(1, 'Category name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    isActive: z.boolean().default(true),
    parentId: z.string().uuid('Invalid parent category ID').optional()
});
// Expense Validation
export const expenseSchema = z.object({
    description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
    amount: currencySchema,
    categoryId: z.string().uuid('Invalid category ID'),
    date: dateSchema,
    status: z.enum(['draft', 'submitted', 'pending', 'approved', 'rejected']).default('draft'),
    paymentMethod: z.enum(['cash', 'check', 'credit_card', 'bank_transfer', 'other']),
    vendor: z.string().max(200, 'Vendor name too long').optional(),
    reference: z.string().max(100, 'Reference too long').optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
    isBillable: z.boolean().default(false),
    isRecurring: z.boolean().default(false),
    recurringFrequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    taxAmount: currencySchema.optional(),
    taxRate: percentageSchema.optional(),
    mileage: z.number().min(0, 'Mileage cannot be negative').optional(),
    attachments: z.array(z.string().url('Invalid attachment URL')).optional()
});
// Budget Validation
export const budgetSchema = z.object({
    name: z.string().min(1, 'Budget name is required').max(200, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    amount: currencySchema,
    period: z.enum(['monthly', 'quarterly', 'yearly']),
    startDate: dateSchema,
    endDate: dateSchema,
    isActive: z.boolean().default(true),
    categoryId: z.string().uuid('Invalid category ID').optional()
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), { message: 'End date must be after start date', path: ['endDate'] });
// Expense Rule Validation
export const expenseRuleSchema = z.object({
    name: z.string().min(1, 'Rule name is required').max(200, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    ruleType: z.enum(['AUTO_APPROVE', 'AUTO_REJECT', 'ROUTE_FOR_APPROVAL']),
    conditions: z.string().min(1, 'Conditions are required'), // JSON string
    actions: z.string().min(1, 'Actions are required'), // JSON string
    priority: z.number().min(1, 'Priority must be at least 1').max(100, 'Priority cannot exceed 100'),
    isActive: z.boolean().default(true)
});
// Inventory Movement Validation
export const inventoryMovementSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
    movementType: z.enum(['purchase_receipt', 'purchase_delivery', 'sale', 'adjustment', 'transfer', 'return']),
    quantity: z.number().refine((val) => val !== 0, { message: 'Quantity cannot be zero' }),
    unitCost: currencySchema.optional(),
    movementDate: dateSchema,
    reference: z.string().min(1, 'Reference is required').max(100, 'Reference too long'),
    reason: z.string().max(500, 'Reason too long').optional(),
    notes: z.string().max(1000, 'Notes too long').optional()
});
// User Validation
export const userSchema = z.object({
    email: emailSchema,
    password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long'),
    firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
    roles: z.array(z.enum(['admin', 'accountant', 'manager', 'user'])).min(1, 'At least one role is required'),
    isActive: z.boolean().default(true),
    phone: phoneSchema.optional(),
    department: z.string().max(100, 'Department name too long').optional()
});
// Company Validation
export const companySchema = z.object({
    name: z.string().min(1, 'Company name is required').max(200, 'Name too long'),
    legalName: z.string().min(1, 'Legal name is required').max(200, 'Legal name too long'),
    taxId: z.string().max(50, 'Tax ID too long').optional(),
    address: z.string().max(500, 'Address too long').optional(),
    city: z.string().max(100, 'City name too long').optional(),
    state: z.string().max(100, 'State name too long').optional(),
    zipCode: z.string().max(20, 'ZIP code too long').optional(),
    country: z.string().max(100, 'Country name too long').optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    website: z.string().url('Invalid website URL').optional(),
    isActive: z.boolean().default(true)
});
// Common validation functions
export const validateEmail = (email) => emailSchema.safeParse(email);
export const validateCurrency = (amount) => currencySchema.safeParse(amount);
export const validatePercentage = (percentage) => percentageSchema.safeParse(percentage);
export const validateDate = (date) => dateSchema.safeParse(date);
export const validateUUID = (uuid) => uuidSchema.safeParse(uuid);
export const validateSKU = (sku) => skuSchema.safeParse(sku);
// Validation error formatter
export const formatValidationError = (error) => {
    if (!error || !error.issues || !Array.isArray(error.issues)) {
        return [{
                field: 'unknown',
                message: 'Validation error occurred',
                code: 'unknown'
            }];
    }
    return error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
    }));
};
// Custom validation rules
export const customValidators = {
    // Check if account code is unique within company
    uniqueAccountCode: async (code, companyId, excludeId) => {
        // This would be implemented with actual database check
        return true;
    },
    // Check if SKU is unique within tenant
    uniqueSKU: async (sku, tenantId, excludeId) => {
        // This would be implemented with actual database check
        return true;
    },
    // Check if PO number is unique within company
    uniquePONumber: async (poNumber, companyId, excludeId) => {
        // This would be implemented with actual database check
        return true;
    },
    // Validate journal entry balance
    validateJournalBalance: (lines) => {
        const totalDebits = lines.reduce((sum, line) => sum + Number(line.debit), 0);
        const totalCredits = lines.reduce((sum, line) => sum + Number(line.credit), 0);
        return Math.abs(totalDebits - totalCredits) < 0.01;
    },
    // Validate stock availability
    validateStockAvailability: async (productId, quantity) => {
        // This would be implemented with actual database check
        return true;
    }
};
export default {
    accountTypeSchema,
    accountSchema,
    categorySchema,
    productSchema,
    vendorSchema,
    purchaseOrderSchema,
    purchaseOrderLineSchema,
    receiptSchema,
    receiptItemSchema,
    journalEntryTypeSchema,
    journalEntrySchema,
    expenseCategorySchema,
    expenseSchema,
    budgetSchema,
    expenseRuleSchema,
    inventoryMovementSchema,
    userSchema,
    companySchema,
    validateEmail,
    validateCurrency,
    validatePercentage,
    validateDate,
    validateUUID,
    validateSKU,
    formatValidationError,
    customValidators
};
