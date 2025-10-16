import { z } from 'zod';
import { ApiError } from './errors';
export function validateBody(schema) {
    return function (req, _res, next) {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            const errorDetails = parsed.error.issues.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code
            }));
            const errorMessage = errorDetails.length === 1
                ? `Validation error: ${errorDetails[0].field} - ${errorDetails[0].message}`
                : `Validation failed for ${errorDetails.length} fields: ${errorDetails.map(e => e.field).join(', ')}`;
            console.error('❌ Validation error:', errorMessage, '\nFields:', errorDetails, '\nRequest body:', req.body);
            return next(new ApiError(400, 'validation_error', errorMessage, errorDetails));
        }
        // @ts-ignore
        req.body = parsed.data;
        next();
    };
}
export function validateRequest(schema) {
    return validateBody(schema);
}
export function validateQuery(req, schema) {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
        throw new ApiError(400, 'invalid_query', 'Invalid query parameters', parsed.error.flatten());
    }
    return parsed.data;
}
export const schemas = {
    companyCreate: z.object({
        name: z.string().min(1),
        industry: z.string().optional(),
        taxId: z.string().optional(),
        country: z.string().optional(),
        currency: z.string().optional(),
        fiscalYearStart: z.string().optional(),
        // Fields that exist in the Company model
        email: z.string().email().optional(),
        phone: z.string().optional(),
        website: z.string().url().optional(),
        // Support both flat and nested address structures
        address: z.union([z.string(), z.object({
                street: z.string().optional(),
                city: z.string().optional(),
                state: z.string().optional(),
                zipCode: z.string().optional(),
            })]).optional(),
        city: z.string().optional().or(z.literal('')),
        state: z.string().optional().or(z.literal('')),
        postalCode: z.string().optional().or(z.literal('')),
        // Additional fields that don't exist in Company model but can be stored in settings
        description: z.string().optional(),
        employees: z.number().optional(),
        foundedYear: z.number().optional(),
        status: z.enum(['active', 'inactive', 'suspended', 'archived', 'deleted']).optional(),
        businessType: z.string().optional(),
        registrationNumber: z.string().optional(),
        timezone: z.string().optional(),
        settings: z.object({
            allowMultipleCurrencies: z.boolean().optional(),
            enableTaxCalculation: z.boolean().optional(),
            enableInventoryTracking: z.boolean().optional(),
            autoBackup: z.boolean().optional(),
        }).optional()
    }),
    companyUpdate: z.object({
        name: z.string().min(1).optional(),
        industry: z.string().optional(),
        taxId: z.string().optional(),
        country: z.string().optional(),
        currency: z.string().optional(),
        fiscalYearStart: z.string().optional(),
        // Fields that exist in the Company model
        email: z.string().email().optional(),
        phone: z.string().optional(),
        website: z.string().url().optional(),
        // Support both flat and nested address structures
        address: z.union([z.string(), z.object({
                street: z.string().optional(),
                city: z.string().optional(),
                state: z.string().optional(),
                zipCode: z.string().optional(),
            })]).optional(),
        city: z.string().optional().or(z.literal('')),
        state: z.string().optional().or(z.literal('')),
        postalCode: z.string().optional().or(z.literal('')),
        // Additional fields that don't exist in Company model but can be stored in settings
        description: z.string().optional(),
        employees: z.number().optional(),
        foundedYear: z.number().optional(),
        status: z.enum(['active', 'inactive', 'suspended', 'archived', 'deleted']).optional(),
        businessType: z.string().optional(),
        registrationNumber: z.string().optional(),
        timezone: z.string().optional(),
        settings: z.object({
            allowMultipleCurrencies: z.boolean().optional(),
            enableTaxCalculation: z.boolean().optional(),
            enableInventoryTracking: z.boolean().optional(),
            autoBackup: z.boolean().optional(),
        }).optional()
    }),
    accountTypeCreate: z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        companyId: z.string().optional()
    }),
    accountTypeUpdate: z.object({
        code: z.string().min(1).optional(),
        name: z.string().min(1).optional()
    }),
    accountCreate: z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        typeId: z.string().min(1),
        parentId: z.string().optional(),
        companyId: z.string().optional()
    }),
    accountUpdate: z.object({
        code: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        typeId: z.string().min(1).optional(),
        parentId: z.string().optional(),
        isActive: z.boolean().optional()
    }),
    journalPost: z.object({
        date: z.string().optional(),
        memo: z.string().optional(),
        reference: z.string().optional(),
        companyId: z.string().min(1),
        lines: z.array(z.object({
            accountId: z.string().min(1),
            debit: z.number().optional(),
            credit: z.number().optional(),
            memo: z.string().optional(),
            department: z.string().optional(),
            project: z.string().optional(),
            location: z.string().optional()
        })).min(2)
    }),
    journalPostAction: z.object({
        createTransaction: z.boolean().default(false).optional(),
        transaction: z.object({
            transactionType: z.string().min(1),
            amount: z.number().positive().optional(),
            currency: z.string().length(3),
            transactionDate: z.string().optional(),
            status: z.string().default('posted').optional(),
            companyId: z.string().optional()
        }).optional()
    }),
    customerCreate: z.object({
        companyId: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        taxNumber: z.string().optional(),
        address: z.string().optional(),
        currency: z.string().length(3).optional()
    }),
    vendorCreate: z.object({
        companyId: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        taxNumber: z.string().optional(),
        address: z.string().optional()
    }),
    invoiceCreate: z.object({
        companyId: z.string().min(1),
        customerId: z.string().min(1),
        invoiceNumber: z.string().min(1),
        issueDate: z.string(),
        dueDate: z.string().optional(),
        currency: z.string().length(3).optional(),
        lines: z.array(z.object({
            productId: z.string().optional(),
            description: z.string().optional(),
            quantity: z.coerce.number().positive().default(1),
            unitPrice: z.coerce.number().nonnegative().default(0),
            taxRate: z.coerce.number().min(0).default(0),
            discountRate: z.coerce.number().min(0).default(0),
            taxId: z.string().optional(),
            taxName: z.string().optional()
        })).min(1),
        subtotal: z.coerce.number().min(0).optional(),
        taxAmount: z.coerce.number().min(0).optional(),
        discountAmount: z.coerce.number().min(0).optional(),
        shippingAmount: z.coerce.number().min(0).optional(),
        totalAmount: z.coerce.number().min(0).optional(),
        notes: z.string().optional(),
        terms: z.string().optional(),
        footer: z.string().optional(),
        paymentTerms: z.string().optional(),
        lateFeeRate: z.coerce.number().min(0).optional(),
        deliveryMethod: z.string().optional(),
        taxInclusive: z.boolean().optional(),
        taxExemptionReason: z.string().optional(),
        createdBy: z.string().optional()
    }),
    estimateCreate: z.object({
        companyId: z.string().min(1),
        customerId: z.string().min(1),
        estimateNumber: z.string().min(1),
        issueDate: z.string(),
        expiryDate: z.string().optional(),
        currency: z.string().length(3).optional(),
        notes: z.string().optional(),
        terms: z.string().optional(),
        lines: z.array(z.object({
            productId: z.string().optional(),
            description: z.string().optional(),
            quantity: z.number().positive().default(1),
            unitPrice: z.number().nonnegative().default(0),
            taxRate: z.number().min(0).default(0),
            taxId: z.string().optional(),
            taxName: z.string().optional()
        })).min(1)
    }),
    recurringInvoiceCreate: z.object({
        companyId: z.string().min(1),
        customerId: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']),
        interval: z.number().positive().default(1),
        startDate: z.string(),
        endDate: z.string().optional(),
        currency: z.string().length(3).optional(),
        notes: z.string().optional(),
        terms: z.string().optional(),
        dueDateOffset: z.number().min(0).default(30),
        autoSend: z.boolean().default(false),
        emailTemplate: z.string().optional(),
        // Advanced Scheduling
        dayOfWeek: z.number().int().min(0).max(6).optional(),
        dayOfMonth: z.number().int().min(1).max(31).optional(),
        businessDaysOnly: z.boolean().default(false),
        skipHolidays: z.boolean().default(false),
        timezone: z.string().default("UTC"),
        // Conditional Logic
        skipIfOutstandingBalance: z.boolean().default(false),
        maxOutstandingAmount: z.number().min(0).optional(),
        skipIfCustomerInactive: z.boolean().default(false),
        requireApproval: z.boolean().default(false),
        approvalWorkflowId: z.string().optional(),
        // Email Settings
        ccEmails: z.array(z.string().email()).optional(),
        bccEmails: z.array(z.string().email()).optional(),
        reminderDays: z.array(z.number().int().min(0)).optional(),
        lines: z.array(z.object({
            productId: z.string().optional(),
            description: z.string().optional(),
            quantity: z.number().positive().default(1),
            unitPrice: z.number().nonnegative().default(0),
            taxRate: z.number().min(0).default(0)
        })).min(1)
    }),
    recurringInvoiceUpdate: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']).optional(),
        interval: z.number().positive().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
        currency: z.string().length(3).optional(),
        notes: z.string().optional(),
        terms: z.string().optional(),
        dueDateOffset: z.number().min(0).optional(),
        autoSend: z.boolean().optional(),
        emailTemplate: z.string().optional(),
        // Advanced Scheduling
        dayOfWeek: z.number().int().min(0).max(6).optional(),
        dayOfMonth: z.number().int().min(1).max(31).optional(),
        businessDaysOnly: z.boolean().optional(),
        skipHolidays: z.boolean().optional(),
        timezone: z.string().optional(),
        // Conditional Logic
        skipIfOutstandingBalance: z.boolean().optional(),
        maxOutstandingAmount: z.number().min(0).optional(),
        skipIfCustomerInactive: z.boolean().optional(),
        requireApproval: z.boolean().optional(),
        approvalWorkflowId: z.string().optional(),
        // Email Settings
        ccEmails: z.array(z.string().email()).optional(),
        bccEmails: z.array(z.string().email()).optional(),
        reminderDays: z.array(z.number().int().min(0)).optional(),
        lines: z.array(z.object({
            id: z.string().optional(),
            productId: z.string().optional(),
            description: z.string().optional(),
            quantity: z.number().positive().default(1),
            unitPrice: z.number().nonnegative().default(0),
            taxRate: z.number().min(0).default(0)
        })).optional()
    }),
    billCreate: z.object({
        companyId: z.string().min(1),
        vendorId: z.string().min(1),
        billNumber: z.string().min(1),
        billDate: z.string(),
        dueDate: z.string().optional(),
        currency: z.string().length(3).optional(),
        lines: z.array(z.object({
            productId: z.string().optional(),
            description: z.string().optional(),
            quantity: z.number().positive().default(1),
            unitPrice: z.number().nonnegative().default(0),
            taxRate: z.number().min(0).default(0),
            taxId: z.string().optional(),
            taxName: z.string().optional()
        })).min(1),
        purchaseType: z.enum(['local', 'import']).default('local').optional(),
        vendorCurrency: z.string().length(3).optional(),
        exchangeRate: z.number().positive().optional(),
        freightCost: z.number().nonnegative().default(0).optional(),
        customsDuty: z.number().nonnegative().default(0).optional(),
        otherImportCosts: z.number().nonnegative().default(0).optional(),
        allocateLandedCost: z.boolean().default(false).optional()
    }),
    invoicePostAction: z.object({
        createTransaction: z.boolean().default(true).optional()
    }),
    billPostAction: z.object({
        createTransaction: z.boolean().default(true).optional()
    }),
    // Enhanced Accounts Payable Process Schemas
    invoiceCapture: z.object({
        vendorId: z.string().min(1, 'Vendor is required'),
        invoiceNumber: z.string().min(1, 'Invoice number is required'),
        invoiceDate: z.string().transform(str => new Date(str)),
        dueDate: z.string().transform(str => new Date(str)).optional(),
        totalAmount: z.number().positive('Total amount must be positive'),
        subtotal: z.number().min(0, 'Subtotal cannot be negative'),
        taxAmount: z.number().min(0, 'Tax amount cannot be negative'),
        currency: z.string().length(3).default('USD'),
        source: z.enum(['manual', 'email', 'api', 'ocr', 'upload']).default('manual'),
        rawData: z.string().optional(),
        attachments: z.array(z.string()).optional(),
        notes: z.string().optional()
    }),
    invoiceMatching: z.object({
        invoiceId: z.string().min(1, 'Invoice ID is required'),
        purchaseOrderId: z.string().optional(),
        goodsReceivedNoteId: z.string().optional(),
        matchingType: z.enum(['two_way', 'three_way']),
        discrepancies: z.array(z.object({
            field: z.string(),
            expected: z.any(),
            actual: z.any(),
            severity: z.enum(['low', 'medium', 'high'])
        })).optional()
    }),
    invoiceApproval: z.object({
        invoiceId: z.string().min(1, 'Invoice ID is required'),
        approverId: z.string().min(1, 'Approver ID is required'),
        approvalLevel: z.number().int().min(1).default(1),
        comments: z.string().optional(),
        status: z.enum(['approved', 'rejected', 'delegated']).optional()
    }),
    paymentSchedule: z.object({
        billId: z.string().min(1, 'Bill ID is required'),
        scheduledDate: z.string().transform(str => new Date(str)),
        amount: z.number().positive('Amount must be positive'),
        paymentMethod: z.enum(['check', 'bank_transfer', 'credit_card', 'cash']),
        bankAccountId: z.string().optional(),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
        earlyPaymentDiscount: z.number().min(0).default(0),
        latePaymentPenalty: z.number().min(0).default(0),
        notes: z.string().optional()
    }),
    apReconciliation: z.object({
        periodStart: z.string().transform(str => new Date(str)),
        periodEnd: z.string().transform(str => new Date(str)),
        reconciledBy: z.string().min(1, 'Reconciled by is required'),
        notes: z.string().optional()
    }),
    apWorkflow: z.object({
        name: z.string().min(1, 'Workflow name is required'),
        description: z.string().optional(),
        workflowSteps: z.array(z.object({
            stepNumber: z.number().int().min(1),
            stepType: z.enum(['approval', 'matching', 'validation', 'notification']),
            assignedTo: z.string().optional(),
            required: z.boolean().default(true),
            timeLimit: z.number().positive().optional()
        })).min(1),
        approvalThresholds: z.record(z.string(), z.any()).optional(),
        autoApprovalRules: z.array(z.object({
            condition: z.string(),
            action: z.string()
        })).optional()
    }),
    goodsReceivedNote: z.object({
        purchaseOrderId: z.string().min(1, 'Purchase Order ID is required'),
        grnNumber: z.string().min(1, 'GRN number is required'),
        receivedDate: z.string().transform(str => new Date(str)),
        receivedBy: z.string().min(1, 'Received by is required'),
        notes: z.string().optional(),
        attachments: z.array(z.string()).optional()
    }),
    // Document schemas
    documentUpdate: z.object({
        displayName: z.string().min(1).optional(),
        description: z.string().optional(),
        categoryId: z.string().min(1).optional(),
        workspaceId: z.string().min(1).optional()
    }),
    documentCategoryCreate: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        companyId: z.string().min(1).optional()
    }),
    documentCategoryUpdate: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional()
    }),
    // Phase 2: Advanced Document Features
    documentShare: z.object({
        userId: z.string().min(1),
        permissions: z.enum(['read', 'write', 'admin']).default('read'),
        expiresAt: z.string().datetime().optional()
    }),
    documentWorkflow: z.object({
        workflowType: z.enum(['approval', 'review', 'signature']).default('approval'),
        assignedTo: z.string().min(1),
        comments: z.string().optional()
    }),
    documentWorkflowUpdate: z.object({
        status: z.enum(['pending', 'in_progress', 'approved', 'rejected', 'completed']).optional(),
        comments: z.string().optional()
    }),
    documentVersion: z.object({
        versionNotes: z.string().optional()
    }),
    bulkDocumentUpdate: z.object({
        documentIds: z.array(z.string().min(1)).min(1),
        updates: z.object({
            categoryId: z.string().min(1).optional(),
            workspaceId: z.string().min(1).optional(),
            status: z.enum(['active', 'archived', 'deleted']).optional()
        })
    }),
    bulkDocumentDelete: z.object({
        documentIds: z.array(z.string().min(1)).min(1)
    }),
    // Phase 3: AI-Powered Features
    documentAnalysis: z.object({
        analysisType: z.enum(['full', 'ocr', 'classification', 'sentiment']).default('full')
    }),
    documentClassification: z.object({
        suggestedCategory: z.string().min(1).optional(),
        suggestedWorkspace: z.string().min(1).optional(),
        confidence: z.number().min(0).max(1).optional(),
        tags: z.array(z.string()).optional()
    }),
    documentTemplate: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        categoryId: z.string().min(1).optional(),
        workspaceId: z.string().min(1).optional(),
        templateType: z.string().min(1),
        metadata: z.record(z.string(), z.any()).optional()
    }),
    documentAutomation: z.object({
        automationType: z.enum(['auto_categorize', 'auto_tag', 'auto_organize', 'compliance_check']),
        rules: z.record(z.string(), z.any()),
        documents: z.array(z.string().min(1)).min(1),
        schedule: z.enum(['immediate', 'daily', 'weekly', 'monthly']).default('immediate')
    }),
    aiSearch: z.object({
        query: z.string().min(1),
        semanticSearch: z.boolean().default(true),
        filters: z.record(z.string(), z.any()).optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20)
    }),
    // Phase 4: Enterprise Integration & Advanced Workflows
    advancedWorkflowCreate: z.object({
        steps: z.array(z.object({
            assignedTo: z.string().min(1),
            role: z.string().min(1),
            required: z.boolean().default(true),
            timeLimit: z.number().positive().optional() // hours
        })).min(1),
        conditions: z.record(z.string(), z.any()).optional(),
        autoApproval: z.boolean().default(false),
        escalationRules: z.array(z.object({
            trigger: z.string().min(1),
            action: z.string().min(1),
            assignee: z.string().min(1)
        })).optional()
    }),
    workflowStepProgress: z.object({
        action: z.enum(['approve', 'reject', 'request_changes', 'escalate']),
        comments: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional()
    }),
    accessControlCreate: z.object({
        accessLevel: z.enum(['public', 'restricted', 'confidential', 'secret']),
        userGroups: z.array(z.string()).optional(),
        timeRestrictions: z.object({
            startTime: z.string().optional(),
            endTime: z.string().optional(),
            daysOfWeek: z.array(z.number().min(0).max(6)).optional()
        }).optional(),
        ipRestrictions: z.array(z.string()).optional(),
        mfaRequired: z.boolean().default(false)
    }),
    webhookCreate: z.object({
        url: z.string().url(),
        events: z.array(z.string().min(1)).min(1),
        headers: z.record(z.string(), z.string()).optional(),
        retryPolicy: z.object({
            maxRetries: z.number().int().positive().default(3),
            backoffDelay: z.number().int().positive().default(1000)
        }).optional(),
        isActive: z.boolean().default(true)
    }),
    complianceCheckCreate: z.object({
        documentIds: z.array(z.string().min(1)).min(1),
        complianceRules: z.array(z.string().min(1)).min(1),
        schedule: z.enum(['immediate', 'daily', 'weekly', 'monthly']).default('immediate'),
        notifications: z.array(z.string().email()).optional()
    }),
    automatedReportCreate: z.object({
        reportType: z.enum(['compliance', 'audit', 'performance', 'storage', 'workflow']),
        schedule: z.string().min(1), // cron expression
        recipients: z.array(z.string().email()).min(1),
        format: z.enum(['pdf', 'excel', 'csv', 'json']).default('pdf'),
        filters: z.record(z.string(), z.any()).optional()
    })
};
export const bankingSchemas = {
    bankAccountCreate: z.object({
        companyId: z.string().min(1),
        bankName: z.string().min(1),
        accountNumber: z.string().min(1),
        accountType: z.string().optional().default('checking'),
        currency: z.string().length(3).optional().default('USD'),
        routingNumber: z.string().optional(),
        swiftCode: z.string().optional(),
        iban: z.string().optional(),
        accountHolder: z.string().optional(),
        branchCode: z.string().optional(),
        branchName: z.string().optional(),
        notes: z.string().optional()
    }),
    paymentCreate: z.object({
        companyId: z.string().min(1),
        transactionId: z.string().min(1),
        bankAccountId: z.string().min(1),
        method: z.string().min(1),
        reference: z.string().optional(),
        amount: z.number().positive(),
        paymentDate: z.string(),
        fxGainLoss: z.number().optional(),
        applications: z.array(z.object({
            invoiceId: z.string().optional(),
            billId: z.string().optional(),
            amount: z.number().positive()
        })).optional()
    }),
    reconcileBankTxn: z.object({
        paymentId: z.string().optional(),
        reconciledBy: z.string().optional()
    }),
    bankTransactionCreate: z.object({
        bankAccountId: z.string().min(1),
        transactionDate: z.string().min(1),
        amount: z.number(),
        currency: z.string().length(3).optional().default('USD'),
        description: z.string().optional(),
        merchantName: z.string().optional(),
        merchantCategory: z.string().optional(),
        transactionType: z.string().min(1),
        reference: z.string().optional(),
        checkNumber: z.string().optional(),
        memo: z.string().optional(),
        category: z.string().optional(),
        tags: z.string().optional(),
        fees: z.number().optional().default(0),
        exchangeRate: z.number().optional(),
        originalAmount: z.number().optional(),
        originalCurrency: z.string().optional(),
        location: z.string().optional(),
        authorizationCode: z.string().optional()
    })
};
export const inventorySchemas = {
    productCreate: z.object({
        // Core Information
        companyId: z.string().min(1),
        name: z.string().min(1),
        sku: z.string().min(1),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        type: z.string().default('PRODUCT').optional(),
        // Pricing Information
        unitPrice: z.number().nonnegative().default(0),
        costPrice: z.number().nonnegative().default(0),
        // Stock & Inventory Management
        stockQuantity: z.number().nonnegative().default(0).optional(),
        reservedQuantity: z.number().nonnegative().default(0).optional(),
        availableQuantity: z.number().nonnegative().default(0).optional(),
        minStockLevel: z.number().nonnegative().optional(),
        maxStockLevel: z.number().nonnegative().optional(),
        reorderPoint: z.number().nonnegative().optional(),
        reorderQuantity: z.number().nonnegative().optional(),
        // Classification & Organization
        categoryId: z.string().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
        tags: z.string().optional(),
        // Physical Properties
        weight: z.number().nonnegative().optional(),
        dimensionsLength: z.number().nonnegative().optional(),
        dimensionsWidth: z.number().nonnegative().optional(),
        dimensionsHeight: z.number().nonnegative().optional(),
        dimensionsString: z.string().optional(),
        // Identification & Tracking
        barcode: z.string().optional(),
        qrCode: z.string().optional(),
        trackSerialNumbers: z.boolean().default(false).optional(),
        trackBatches: z.boolean().default(false).optional(),
        costingMethod: z.string().default('FIFO').optional(),
        // Tax Information
        taxRate: z.number().nonnegative().optional(),
        taxInclusive: z.boolean().default(false).optional(),
        taxCode: z.string().optional(),
        taxExempt: z.boolean().default(false).optional(),
        // Product Type Flags
        isDigital: z.boolean().default(false).optional(),
        isService: z.boolean().default(false).optional(),
        isPhysical: z.boolean().default(true).optional(),
        trackInventory: z.boolean().default(true).optional(),
        // Business Rules & Options
        allowBackorder: z.boolean().default(false).optional(),
        allowPreorder: z.boolean().default(false).optional(),
        preorderDate: z.string().optional(),
        // Product Features & Marketing
        isFeatured: z.boolean().default(false).optional(),
        isBestSeller: z.boolean().default(false).optional(),
        isNewArrival: z.boolean().default(false).optional(),
        // Warranty & Returns
        warrantyPeriod: z.number().nonnegative().optional(),
        warrantyUnit: z.string().optional(),
        returnPolicy: z.string().optional(),
        // Shipping & Fulfillment
        shippingClass: z.string().optional(),
        // SEO & Marketing
        seoTitle: z.string().optional(),
        seoDescription: z.string().optional(),
        metaKeywords: z.string().optional(),
        // Media & Variants (JSON fields)
        images: z.string().optional(),
        variants: z.string().optional(),
        // Related Products & Cross-selling (JSON fields)
        relatedProducts: z.string().optional(),
        upsellProducts: z.string().optional(),
        crossSellProducts: z.string().optional(),
        // Custom Fields & Extensions
        customFields: z.string().optional(),
        // System Fields
        status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'DRAFT']).default('ACTIVE').optional()
    }),
    productUpdate: z.object({
        // Core Information
        name: z.string().min(1).optional(),
        sku: z.string().min(1).optional(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        type: z.string().optional(),
        // Pricing Information
        unitPrice: z.number().nonnegative().optional(),
        costPrice: z.number().nonnegative().optional(),
        // Stock & Inventory Management
        stockQuantity: z.number().nonnegative().optional(),
        reservedQuantity: z.number().nonnegative().optional(),
        availableQuantity: z.number().nonnegative().optional(),
        minStockLevel: z.number().nonnegative().optional(),
        maxStockLevel: z.number().nonnegative().optional(),
        reorderPoint: z.number().nonnegative().optional(),
        reorderQuantity: z.number().nonnegative().optional(),
        // Classification & Organization
        categoryId: z.string().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
        tags: z.string().optional(),
        // Physical Properties
        weight: z.number().nonnegative().optional(),
        dimensionsLength: z.number().nonnegative().optional(),
        dimensionsWidth: z.number().nonnegative().optional(),
        dimensionsHeight: z.number().nonnegative().optional(),
        dimensionsString: z.string().optional(),
        // Identification & Tracking
        barcode: z.string().optional(),
        qrCode: z.string().optional(),
        trackSerialNumbers: z.boolean().optional(),
        trackBatches: z.boolean().optional(),
        costingMethod: z.string().optional(),
        // Tax Information
        taxRate: z.number().nonnegative().optional(),
        taxInclusive: z.boolean().optional(),
        taxCode: z.string().optional(),
        taxExempt: z.boolean().optional(),
        // Product Type Flags
        isDigital: z.boolean().optional(),
        isService: z.boolean().optional(),
        isPhysical: z.boolean().optional(),
        trackInventory: z.boolean().optional(),
        // Business Rules & Options
        allowBackorder: z.boolean().optional(),
        allowPreorder: z.boolean().optional(),
        preorderDate: z.string().optional(),
        // Product Features & Marketing
        isFeatured: z.boolean().optional(),
        isBestSeller: z.boolean().optional(),
        isNewArrival: z.boolean().optional(),
        // Warranty & Returns
        warrantyPeriod: z.number().nonnegative().optional(),
        warrantyUnit: z.string().optional(),
        returnPolicy: z.string().optional(),
        // Shipping & Fulfillment
        shippingClass: z.string().optional(),
        // SEO & Marketing
        seoTitle: z.string().optional(),
        seoDescription: z.string().optional(),
        metaKeywords: z.string().optional(),
        // Media & Variants (JSON fields)
        images: z.string().optional(),
        variants: z.string().optional(),
        // Related Products & Cross-selling (JSON fields)
        relatedProducts: z.string().optional(),
        upsellProducts: z.string().optional(),
        crossSellProducts: z.string().optional(),
        // Custom Fields & Extensions
        customFields: z.string().optional(),
        // System Fields
        status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'DRAFT']).optional()
    }),
    movementCreate: z.object({
        productId: z.string().min(1),
        movementType: z.enum(['purchase', 'sale', 'adjustment']).or(z.string()),
        quantity: z.number(),
        movementDate: z.string(),
        reference: z.string().optional(),
        locationId: z.string().optional(),
        reason: z.string().optional(),
        unitCost: z.number().optional()
    }),
    movementUpdate: z.object({
        productId: z.string().min(1).optional(),
        movementType: z.enum(['purchase', 'sale', 'adjustment']).or(z.string()).optional(),
        quantity: z.number().optional(),
        movementDate: z.string().optional(),
        reference: z.string().optional(),
        locationId: z.string().optional(),
        reason: z.string().optional(),
        unitCost: z.number().optional()
    }),
    transferCreate: z.object({
        productId: z.string().min(1),
        fromLocationId: z.string().optional(),
        toLocationId: z.string().min(1),
        quantity: z.number().positive(),
        transferDate: z.string(),
        reference: z.string().optional(),
        notes: z.string().optional(),
        requestedBy: z.string().optional()
    }),
    locationCreate: z.object({
        companyId: z.string().min(1),
        name: z.string().min(1),
        code: z.string().min(1),
        type: z.string().default('warehouse').optional(),
        address: z.string().optional(),
        city: z.string().optional().or(z.literal('')),
        state: z.string().optional().or(z.literal('')),
        postalCode: z.string().optional().or(z.literal('')),
        country: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().email().optional(),
        isDefault: z.boolean().default(false).optional(),
        isActive: z.boolean().default(true).optional()
    }),
    locationUpdate: z.object({
        name: z.string().min(1).optional(),
        code: z.string().min(1).optional(),
        type: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional().or(z.literal('')),
        state: z.string().optional().or(z.literal('')),
        postalCode: z.string().optional().or(z.literal('')),
        country: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().email().optional(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional()
    })
};
export const mappingSchemas = {
    mappingUpsert: z.object({
        companyId: z.string().min(1),
        purpose: z.string().min(1),
        accountId: z.string().min(1)
    })
};
export const aiSchemas = {
    anomalyCreate: z.object({
        companyId: z.string().min(1),
        transactionId: z.string().optional(),
        anomalyType: z.string().min(1),
        confidenceScore: z.number().min(0).max(1).default(0.5)
    }),
    anomalyUpdateStatus: z.object({ status: z.string().min(1) }),
    insightCreate: z.object({ companyId: z.string().min(1), category: z.string().min(1), insightText: z.string().min(1), priority: z.string().optional() }),
    predictionCreate: z.object({ companyId: z.string().min(1), predictionType: z.string().min(1), predictedValue: z.number(), predictionDate: z.string(), confidenceLow: z.number().optional(), confidenceHigh: z.number().optional() }),
    recommendationCreate: z.object({ companyId: z.string().min(1), recommendationType: z.string().min(1), recommendationText: z.string().min(1) }),
    recommendationUpdateStatus: z.object({ status: z.string().min(1) }),
    auditAppend: z.object({ companyId: z.string().min(1), userId: z.string().optional(), action: z.string().min(1), aiValidationResult: z.string().optional() })
};
export const complianceSchemas = {
    taxRateCreate: z.object({
        companyId: z.string().min(1),
        taxName: z.string().min(1),
        rate: z.number().min(0).max(1), // 0.15 for 15%
        appliesTo: z.enum(['products', 'services', 'all']).default('all'),
        isActive: z.boolean().default(true)
    }),
    taxRateUpdate: z.object({
        taxName: z.string().min(1).optional(),
        rate: z.number().min(0).max(1).optional(),
        appliesTo: z.enum(['products', 'services', 'all']).optional(),
        isActive: z.boolean().optional()
    }),
    reportGenerate: z.object({
        companyId: z.string().min(1),
        reportType: z.enum(['P&L', 'Balance Sheet', 'Cash Flow', 'AR/AP Aging', 'Tax Summary']),
        parameters: z.record(z.string(), z.any()).optional(),
        createdBy: z.string().optional()
    }),
    auditLogCreate: z.object({
        userId: z.string().min(1),
        action: z.string().min(1),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional()
    })
};
export const collaborationSchemas = {
    clientAccessCreate: z.object({
        companyId: z.string().min(1),
        userId: z.string().min(1),
        permissions: z.array(z.string()).default([]), // view_invoices, view_reports, etc.
        isActive: z.boolean().default(true)
    }),
    clientAccessUpdate: z.object({
        permissions: z.array(z.string()).optional(),
        isActive: z.boolean().optional()
    }),
    messageCreate: z.object({
        companyId: z.string().min(1),
        receiverId: z.string().min(1),
        messageText: z.string().min(1)
    }),
    messageUpdate: z.object({
        messageText: z.string().min(1).optional(),
        isRead: z.boolean().optional()
    }),
    taskCreate: z.object({
        companyId: z.string().min(1),
        assignedTo: z.string().min(1),
        taskType: z.enum(['reconciliation', 'review', 'audit', 'approval', 'follow_up']),
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
    }),
    taskUpdate: z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        status: z.enum(['pending', 'in_progress', 'completed', 'overdue']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
    })
};
export const budgetSchemas = {
    budgetCreate: z.object({
        companyId: z.string().min(1, 'Company is required'),
        categoryId: z.string().min(1, 'Category is required'),
        name: z.string().min(1, 'Budget name is required'),
        description: z.string().optional(),
        period: z.enum(['monthly', 'quarterly', 'yearly']),
        startDate: z.string().min(1, 'Start date is required'),
        endDate: z.string().min(1, 'End date is required'),
        amount: z.coerce.number().positive('Amount must be positive'),
        alertThreshold: z.coerce.number().optional()
    }),
    budgetUpdate: z.object({
        name: z.string().min(1, 'Budget name is required').optional(),
        description: z.string().optional(),
        period: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
        startDate: z.string().min(1, 'Start date is required').optional(),
        endDate: z.string().min(1, 'End date is required').optional(),
        amount: z.coerce.number().positive('Amount must be positive').optional(),
        alertThreshold: z.coerce.number().optional(),
        isActive: z.boolean().optional()
    })
};
export const workspaceSchemas = {
    workspaceCreate: z.object({
        companyId: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional()
    }),
    workspaceUpdate: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional()
    }),
    memberAdd: z.object({
        userId: z.string().min(1),
        role: z.enum(['owner', 'admin', 'member', 'guest']).or(z.string())
    })
};
export const fileSchemas = {
    fileCreate: z.object({
        companyId: z.string().min(1),
        workspaceId: z.string().optional(),
        name: z.string().min(1),
        mimeType: z.string().min(1),
        sizeBytes: z.number().int().nonnegative(),
        storageKey: z.string().min(1),
        sha256: z.string().optional()
    })
};
export const notificationSchemas = {
    notifyCreate: z.object({
        companyId: z.string().optional(),
        userId: z.string().min(1),
        type: z.string().min(1),
        title: z.string().min(1),
        body: z.string().optional()
    }),
    notifyUpdate: z.object({
        isRead: z.boolean().optional()
    })
};
// Advanced Financial Reporting Suite Schemas
export const financialReportCreate = z.object({
    name: z.string().min(1, "Report name is required"),
    type: z.enum(["balance_sheet", "income_statement", "cash_flow", "equity", "custom"]),
    description: z.string().optional(),
    isTemplate: z.boolean().default(false),
    isPublic: z.boolean().default(false),
    metadata: z.string().optional(),
    items: z.array(z.object({
        name: z.string().min(1, "Item name is required"),
        type: z.enum(["account", "calculation", "text", "chart"]),
        order: z.number().int().min(0),
        configuration: z.string().optional(),
        formula: z.string().optional(),
        accountIds: z.string().optional()
    })).optional()
});
export const financialReportUpdate = z.object({
    name: z.string().min(1, "Report name is required").optional(),
    type: z.enum(["balance_sheet", "income_statement", "cash_flow", "equity", "custom"]).optional(),
    description: z.string().optional(),
    isTemplate: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    metadata: z.string().optional()
});
export const reportItemCreate = z.object({
    name: z.string().min(1, "Item name is required"),
    type: z.enum(["account", "calculation", "text", "chart"]),
    order: z.number().int().min(0),
    configuration: z.string().optional(),
    formula: z.string().optional(),
    accountIds: z.string().optional()
});
export const reportItemUpdate = z.object({
    name: z.string().min(1, "Item name is required").optional(),
    type: z.enum(["account", "calculation", "text", "chart"]).optional(),
    order: z.number().int().min(0).optional(),
    configuration: z.string().optional(),
    formula: z.string().optional(),
    accountIds: z.string().optional()
});
export const reportScheduleCreate = z.object({
    name: z.string().min(1, "Schedule name is required"),
    frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
    nextRun: z.string().datetime(),
    recipients: z.string().optional(),
    format: z.enum(["pdf", "excel", "csv"]),
    isActive: z.boolean().default(true)
});
export const reportScheduleUpdate = z.object({
    name: z.string().min(1, "Schedule name is required").optional(),
    frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).optional(),
    nextRun: z.string().datetime().optional(),
    recipients: z.string().optional(),
    format: z.enum(["pdf", "excel", "csv"]).optional(),
    isActive: z.boolean().optional()
});
export const reportTemplateCreate = z.object({
    name: z.string().min(1, "Template name is required"),
    type: z.enum(["balance_sheet", "income_statement", "cash_flow", "equity", "custom"]),
    category: z.enum(["industry", "standard", "custom"]),
    description: z.string().optional(),
    configuration: z.string(),
    isPublic: z.boolean().default(false)
});
export const reportExecutionCreate = z.object({
    parameters: z.string().optional() // JSON string for execution parameters
});
export const reportQuery = z.object({
    type: z.enum(["balance_sheet", "income_statement", "cash_flow", "equity", "custom"]).optional(),
    isTemplate: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    search: z.string().optional()
});
// Real-time Bank Feeds Schemas
export const bankConnectionCreate = z.object({
    bankName: z.string().min(1, "Bank name is required"),
    accountNumber: z.string().min(1, "Account number is required"),
    accountType: z.enum(["checking", "savings", "credit", "loan"]),
    currency: z.string().default("USD"),
    connectionType: z.enum(["plaid", "yodlee", "manual", "api"]),
    connectionId: z.string().optional(),
    syncFrequency: z.enum(["hourly", "daily", "weekly"]).default("daily"),
    credentials: z.string().optional(),
    metadata: z.string().optional()
});
export const bankConnectionUpdate = z.object({
    bankName: z.string().min(1, "Bank name is required").optional(),
    accountNumber: z.string().min(1, "Account number is required").optional(),
    accountType: z.enum(["checking", "savings", "credit", "loan"]).optional(),
    currency: z.string().optional(),
    connectionType: z.enum(["plaid", "yodlee", "manual", "api"]).optional(),
    connectionId: z.string().optional(),
    status: z.enum(["active", "inactive", "error", "pending"]).optional(),
    syncFrequency: z.enum(["hourly", "daily", "weekly"]).optional(),
    credentials: z.string().optional(),
    metadata: z.string().optional()
});
export const bankTransactionCreate = z.object({
    externalId: z.string().optional(),
    transactionDate: z.string().datetime(),
    postedDate: z.string().datetime().optional(),
    amount: z.number().positive("Amount must be positive"),
    currency: z.string().default("USD"),
    description: z.string().optional(),
    merchantName: z.string().optional(),
    merchantCategory: z.string().optional(),
    transactionType: z.enum(["debit", "credit", "transfer"]),
    reference: z.string().optional(),
    checkNumber: z.string().optional(),
    memo: z.string().optional(),
    category: z.string().optional(),
    tags: z.string().optional()
});
export const bankTransactionUpdate = z.object({
    externalId: z.string().optional(),
    transactionDate: z.string().datetime().optional(),
    postedDate: z.string().datetime().optional(),
    amount: z.number().positive("Amount must be positive").optional(),
    currency: z.string().optional(),
    description: z.string().optional(),
    merchantName: z.string().optional(),
    merchantCategory: z.string().optional(),
    transactionType: z.enum(["debit", "credit", "transfer"]).optional(),
    reference: z.string().optional(),
    checkNumber: z.string().optional(),
    memo: z.string().optional(),
    category: z.string().optional(),
    tags: z.string().optional(),
    isReconciled: z.boolean().optional(),
    matchedTransactionId: z.string().optional()
});
export const bankReconciliationRuleCreate = z.object({
    name: z.string().min(1, "Rule name is required"),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
    priority: z.number().int().min(0).default(0),
    conditions: z.string(), // JSON string for matching conditions
    actions: z.string() // JSON string for actions to take
});
export const bankReconciliationRuleUpdate = z.object({
    name: z.string().min(1, "Rule name is required").optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    priority: z.number().int().min(0).optional(),
    conditions: z.string().optional(),
    actions: z.string().optional()
});
export const bankSyncRequest = z.object({
    syncType: z.enum(["full", "incremental", "manual"]).default("incremental"),
    forceSync: z.boolean().default(false)
});
export const bankReconciliationRequest = z.object({
    connectionId: z.string().optional(), // If not provided, reconciles all connections
    autoMatch: z.boolean().default(true),
    applyRules: z.boolean().default(true),
    dateRange: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime()
    }).optional()
});
export const bankConnectionQuery = z.object({
    status: z.enum(["active", "inactive", "error", "pending"]).optional(),
    bankName: z.string().optional(),
    accountType: z.enum(["checking", "savings", "credit", "loan"]).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
});
export const bankTransactionQuery = z.object({
    connectionId: z.string().optional(),
    isReconciled: z.boolean().optional(),
    transactionType: z.enum(["debit", "credit", "transfer"]).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    category: z.string().optional(),
    search: z.string().optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
});
// MFA Schemas
export const mfaSetupStart = z.object({
// no body; uses auth context, included for consistency if needed in future
});
export const mfaSetupVerify = z.object({
    token: z.string().min(6).max(8)
});
export const mfaDisable = z.object({
    password: z.string().min(8)
});
export const mfaBackupCodesRegenerate = z.object({
    confirm: z.boolean().default(false)
});
export const mfaLoginChallenge = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});
export const mfaLoginVerify = z.object({
    challengeToken: z.string().min(10),
    code: z.string().min(6).max(10)
});
// Tax Calculation Engine Schemas
export const taxRateQuery = z.object({
    companyId: z.string().optional(),
    isActive: z.boolean().optional(),
    taxName: z.string().optional(),
    appliesTo: z.enum(["products", "services", "all"]).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
});
export const taxCalculationLine = z.object({
    id: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(["product", "service"]).or(z.string()).default("product"),
    amount: z.number().nonnegative(),
    taxExclusive: z.boolean().default(true),
    manualRate: z.number().min(0).max(1).optional()
});
export const taxCalculationRequest = z.object({
    companyId: z.string().min(1, "companyId is required"),
    currency: z.string().length(3).default("USD"),
    lines: z.array(taxCalculationLine).min(1),
    applyCompound: z.boolean().default(false)
});
export const taxCalculationResponse = z.object({
    currency: z.string(),
    totalTax: z.number(),
    totalAmount: z.number(),
    lines: z.array(z.object({
        id: z.string().optional(),
        amount: z.number(),
        taxAmount: z.number(),
        effectiveRate: z.number()
    }))
});
// Report Builder Schemas
export const reportBuilderItem = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    type: z.enum(["account", "calculation", "text", "chart", "pivot"]),
    order: z.number().int().min(0).default(0),
    configuration: z.any().optional(),
    formula: z.string().optional(),
    // Comma-separated account IDs in DB models; here allow array for builder ergonomics
    accountIds: z.array(z.string().min(1)).optional()
});
export const reportBuilderSpec = z.object({
    name: z.string().min(1),
    type: z.enum(["balance_sheet", "income_statement", "cash_flow", "equity", "custom"]).default("custom"),
    description: z.string().optional(),
    items: z.array(reportBuilderItem).min(1),
    parameters: z.record(z.string(), z.any()).optional()
});
export const reportBuilderPreviewRequest = z.object({
    companyId: z.string().min(1),
    spec: reportBuilderSpec
});
export const reportBuilderTemplateSave = z.object({
    name: z.string().min(1),
    type: z.enum(["balance_sheet", "income_statement", "cash_flow", "equity", "custom"]).default("custom"),
    category: z.enum(["industry", "standard", "custom"]).default("custom"),
    description: z.string().optional(),
    spec: reportBuilderSpec,
    isPublic: z.boolean().default(false)
});
// Enhanced Journal Hub Schemas
export const journalEntryTypeCreate = z.object({
    name: z.string().min(1, 'Entry type name is required'),
    description: z.string().optional(),
    category: z.enum(['SALES', 'EXPENSE', 'ADJUSTMENT', 'TRANSFER', 'DEPRECIATION', 'ACCRUAL', 'REVERSAL', 'CUSTOM']),
    requiresApproval: z.boolean().default(false),
    maxAmount: z.number().positive().optional(),
    allowedAccountIds: z.array(z.string()).optional(),
    companyId: z.string().min(1, 'Company ID is required')
});
export const journalEntryCreate = z.object({
    date: z.string().min(1, 'Date is required'),
    memo: z.string().optional(),
    reference: z.string().optional(),
    entryTypeId: z.string().optional(),
    lines: z.array(z.object({
        accountId: z.string().min(1, 'Account ID is required'),
        debit: z.number().min(0).optional(),
        credit: z.number().min(0).optional(),
        memo: z.string().optional(),
        department: z.string().optional(),
        project: z.string().optional(),
        location: z.string().optional()
    })).min(2, 'At least two lines are required'),
    department: z.string().optional(),
    project: z.string().optional(),
    location: z.string().optional(),
    requiresApproval: z.boolean().default(false),
    companyId: z.string().min(1, 'Company ID is required')
});
export const journalEntryUpdate = z.object({
    date: z.string().optional(),
    memo: z.string().optional(),
    reference: z.string().optional(),
    lines: z.array(z.object({
        accountId: z.string().min(1, 'Account ID is required'),
        debit: z.number().min(0).optional(),
        credit: z.number().min(0).optional(),
        memo: z.string().optional(),
        department: z.string().optional(),
        project: z.string().optional(),
        location: z.string().optional()
    })).min(2, 'At least two lines are required').optional()
});
export const journalEntryTemplateCreate = z.object({
    name: z.string().min(1, 'Template name is required'),
    description: z.string().optional(),
    entryTypeId: z.string().optional(),
    isRecurring: z.boolean().default(false),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
    nextRunDate: z.string().optional(),
    endDate: z.string().optional(),
    lines: z.array(z.object({
        accountId: z.string().min(1, 'Account ID is required'),
        debitFormula: z.string().optional(),
        creditFormula: z.string().optional(),
        memo: z.string().optional(),
        department: z.string().optional(),
        project: z.string().optional(),
        location: z.string().optional(),
        isRequired: z.boolean().default(true)
    })).min(2, 'At least two lines are required'),
    companyId: z.string().min(1, 'Company ID is required')
});
export const journalEntryApproval = z.object({
    comments: z.string().optional()
});
export const journalEntrySearch = z.object({
    companyId: z.string().min(1, 'Company ID is required'),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    status: z.enum(['DRAFT', 'POSTED', 'REVERSED', 'PENDING_APPROVAL']).optional(),
    entryType: z.string().optional(),
    accountId: z.string().optional(),
    amountMin: z.number().min(0).optional(),
    amountMax: z.number().min(0).optional(),
    reference: z.string().optional(),
    memo: z.string().optional(),
    createdById: z.string().optional(),
    department: z.string().optional(),
    project: z.string().optional(),
    location: z.string().optional(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(20)
});
export const journalEntryReversal = z.object({
    reason: z.string().min(1, 'Reason is required'),
    reverseDate: z.string().optional()
});
export const journalEntryAdjustment = z.object({
    adjustments: z.array(z.object({
        accountId: z.string().min(1, 'Account ID is required'),
        debit: z.number().min(0).optional(),
        credit: z.number().min(0).optional(),
        memo: z.string().optional(),
        department: z.string().optional(),
        project: z.string().optional(),
        location: z.string().optional()
    })).min(1, 'At least one adjustment is required'),
    reason: z.string().min(1, 'Reason is required')
});
export const journalEntryApprovalRequest = z.object({
    approvers: z.array(z.string().min(1, 'Approver ID is required')).min(1, 'At least one approver is required'),
    comments: z.string().optional()
});
// ==================== BATCH PROCESSING SCHEMAS ====================
export const journalEntryBatchCreate = z.object({
    entries: z.array(z.object({
        companyId: z.string().min(1, 'Company ID is required').optional(),
        date: z.string().min(1, 'Date is required'),
        memo: z.string().min(1, 'Memo is required'),
        reference: z.string().optional(),
        status: z.enum(['DRAFT', 'POSTED', 'PENDING_APPROVAL']).default('DRAFT').optional(),
        entryTypeId: z.string().min(1, 'Entry type ID is required').optional(),
        lines: z.array(z.object({
            accountId: z.string().min(1, 'Account ID is required'),
            debit: z.number().min(0).default(0),
            credit: z.number().min(0).default(0),
            memo: z.string().optional(),
            department: z.string().optional(),
            project: z.string().optional(),
            location: z.string().optional()
        })).min(2, 'At least two lines are required')
    })).min(1, 'At least one entry is required').max(100, 'Maximum 100 entries allowed per batch'),
    options: z.object({
        validateBalances: z.boolean().default(true).optional(),
        stopOnError: z.boolean().default(true).optional()
    }).optional()
});
export const journalEntryBatchApprove = z.object({
    entryIds: z.array(z.string().min(1, 'Entry ID is required')).min(1, 'At least one entry ID is required').max(50, 'Maximum 50 entries allowed per batch approval'),
    comments: z.string().optional()
});
export const journalEntryBatchPost = z.object({
    entryIds: z.array(z.string().min(1, 'Entry ID is required')).min(1, 'At least one entry ID is required').max(50, 'Maximum 50 entries allowed per batch post')
});
export const journalEntryBatchReverse = z.object({
    entryIds: z.array(z.string().min(1, 'Entry ID is required')).min(1, 'At least one entry ID is required').max(25, 'Maximum 25 entries allowed per batch reversal'),
    reason: z.string().min(1, 'Reason is required')
});
// ==================== IMPORT/EXPORT SCHEMAS ====================
export const journalEntryCsvImport = z.object({
    csvData: z.string().min(1, 'CSV data is required'),
    options: z.object({
        validateBalances: z.boolean().default(true).optional(),
        createAsDraft: z.boolean().default(true).optional(),
        skipHeaderRow: z.boolean().default(true).optional(),
        dateFormat: z.string().default('YYYY-MM-DD').optional()
    }).optional()
});
// ==================== ADVANCED SEARCH SCHEMAS ====================
export const journalSearchSave = z.object({
    name: z.string().min(1, 'Search name is required').max(100, 'Search name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    filters: z.object({
        searchTerm: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        status: z.string().optional(),
        entryType: z.string().optional(),
        accountId: z.string().optional(),
        amountMin: z.number().optional(),
        amountMax: z.number().optional(),
        reference: z.string().optional(),
        memo: z.string().optional(),
        createdById: z.string().optional(),
        department: z.string().optional(),
        project: z.string().optional(),
        location: z.string().optional(),
        isBalanced: z.boolean().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional()
    }),
    isPublic: z.boolean().default(false).optional()
});
export const journalSearchUpdate = z.object({
    name: z.string().min(1, 'Search name is required').max(100, 'Search name too long').optional(),
    description: z.string().max(500, 'Description too long').optional(),
    filters: z.object({
        searchTerm: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        status: z.string().optional(),
        entryType: z.string().optional(),
        accountId: z.string().optional(),
        amountMin: z.number().optional(),
        amountMax: z.number().optional(),
        reference: z.string().optional(),
        memo: z.string().optional(),
        createdById: z.string().optional(),
        department: z.string().optional(),
        project: z.string().optional(),
        location: z.string().optional(),
        isBalanced: z.boolean().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional()
    }).optional(),
    isPublic: z.boolean().optional()
});
