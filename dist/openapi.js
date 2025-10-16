export function buildOpenApi(baseUrl) {
    const info = {
        title: 'UrutiIQ API',
        version: '1.0.0',
        description: 'Comprehensive accounting and document management API with AI-powered features',
        contact: {
            name: 'UrutiIQ Support',
            email: 'support@urutiq.com'
        }
    };
    const doc = {
        openapi: '3.0.0',
        info,
        servers: [{ url: baseUrl }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            parameters: {
                TenantIdHeader: {
                    name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' }, description: 'Tenant identifier'
                },
                CompanyIdHeader: {
                    name: 'x-company-id', in: 'header', required: false, schema: { type: 'string' }, description: 'Company identifier (optional)'
                }
            },
            schemas: {
                Invoice: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        customerId: { type: 'string' },
                        invoiceNumber: { type: 'string' },
                        issueDate: { type: 'string', format: 'date' },
                        dueDate: { type: 'string', format: 'date' },
                        totalAmount: { type: 'number' },
                        balanceDue: { type: 'number' },
                        status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] },
                        currency: { type: 'string' }
                    },
                    required: ['id', 'companyId', 'customerId', 'invoiceNumber', 'issueDate', 'totalAmount', 'status']
                },
                InvoiceCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        customerId: { type: 'string' },
                        invoiceNumber: { type: 'string' },
                        issueDate: { type: 'string', format: 'date' },
                        dueDate: { type: 'string', format: 'date' },
                        currency: { type: 'string' },
                        lines: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    description: { type: 'string' },
                                    quantity: { type: 'number' },
                                    unitPrice: { type: 'number' },
                                    taxRate: { type: 'number' }
                                },
                                required: ['description', 'quantity', 'unitPrice']
                            }
                        }
                    },
                    required: ['companyId', 'customerId', 'invoiceNumber', 'issueDate', 'lines']
                },
                Estimate: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        customerId: { type: 'string' },
                        estimateNumber: { type: 'string' },
                        issueDate: { type: 'string', format: 'date' },
                        totalAmount: { type: 'number' },
                        status: { type: 'string', enum: ['draft', 'sent', 'accepted', 'rejected'] },
                        currency: { type: 'string' }
                    },
                    required: ['id', 'companyId', 'customerId', 'estimateNumber', 'issueDate', 'totalAmount', 'status']
                },
                EstimateCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        customerId: { type: 'string' },
                        estimateNumber: { type: 'string' },
                        issueDate: { type: 'string', format: 'date' },
                        currency: { type: 'string' },
                        lines: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    description: { type: 'string' },
                                    quantity: { type: 'number' },
                                    unitPrice: { type: 'number' },
                                    taxRate: { type: 'number' }
                                },
                                required: ['description', 'quantity', 'unitPrice']
                            }
                        }
                    },
                    required: ['companyId', 'customerId', 'estimateNumber', 'issueDate', 'lines']
                },
                TransactionInput: {
                    type: 'object',
                    properties: {
                        transactionType: { type: 'string' },
                        amount: { type: 'number' },
                        currency: { type: 'string', minLength: 3, maxLength: 3 },
                        transactionDate: { type: 'string', format: 'date-time' },
                        status: { type: 'string' },
                        companyId: { type: 'string' }
                    },
                    required: ['transactionType', 'currency', 'companyId']
                },
                // Common schemas
                Error: {
                    type: 'object',
                    properties: {
                        code: { type: 'string' },
                        message: { type: 'string' },
                        details: { type: 'object' }
                    }
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', minimum: 1 },
                        pageSize: { type: 'integer', minimum: 1, maximum: 100 },
                        totalCount: { type: 'integer' },
                        totalPages: { type: 'integer' },
                        hasNext: { type: 'boolean' },
                        hasPrev: { type: 'boolean' }
                    }
                },
                // Authentication schemas
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                        tenantId: { type: 'string' },
                        roles: { type: 'array', items: { type: 'string' } }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 8 }
                    },
                    required: ['email', 'password']
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' },
                        expiresIn: { type: 'string' }
                    }
                },
                RegisterRequest: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 8 },
                        name: { type: 'string' }
                    },
                    required: ['email', 'password', 'name']
                },
                // Company/Workspace schemas
                Company: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        industry: { type: 'string' },
                        address: { type: 'string' },
                        phone: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        website: { type: 'string' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                CompanyCreate: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        industry: { type: 'string' },
                        address: { type: 'string' },
                        phone: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        website: { type: 'string' }
                    },
                    required: ['name']
                },
                // Document schemas
                Document: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        displayName: { type: 'string' },
                        description: { type: 'string' },
                        mimeType: { type: 'string' },
                        sizeBytes: { type: 'integer' },
                        storageKey: { type: 'string' },
                        status: { type: 'string', enum: ['active', 'deleted'] },
                        uploadedAt: { type: 'string', format: 'date-time' },
                        companyId: { type: 'string' },
                        workspaceId: { type: 'string' },
                        categoryId: { type: 'string' },
                        uploaderId: { type: 'string' },
                        tenantId: { type: 'string' },
                        uploader: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                email: { type: 'string' }
                            }
                        },
                        company: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' }
                            }
                        },
                        category: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                color: { type: 'string' }
                            }
                        }
                    }
                },
                DocumentCreate: {
                    type: 'object',
                    properties: {
                        displayName: { type: 'string' },
                        description: { type: 'string' },
                        categoryId: { type: 'string' },
                        workspaceId: { type: 'string' },
                        companyId: { type: 'string' }
                    }
                },
                DocumentUpdate: {
                    type: 'object',
                    properties: {
                        displayName: { type: 'string' },
                        description: { type: 'string' },
                        categoryId: { type: 'string' },
                        workspaceId: { type: 'string' }
                    }
                },
                DocumentCategory: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        color: { type: 'string' },
                        companyId: { type: 'string' },
                        tenantId: { type: 'string' },
                        _count: {
                            type: 'object',
                            properties: {
                                documents: { type: 'integer' }
                            }
                        }
                    }
                },
                DocumentCategoryCreate: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        color: { type: 'string' },
                        companyId: { type: 'string' }
                    },
                    required: ['name']
                },
                DocumentCategoryUpdate: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        color: { type: 'string' }
                    }
                },
                DocumentStats: {
                    type: 'object',
                    properties: {
                        totalDocuments: { type: 'integer' },
                        storageUsed: { type: 'integer', description: 'Storage used in bytes' },
                        pendingApprovals: { type: 'integer' },
                        sharedDocuments: { type: 'integer' },
                        documentsByCategory: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    categoryName: { type: 'string' },
                                    count: { type: 'integer' }
                                }
                            }
                        },
                        recentActivity: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    action: { type: 'string' },
                                    documentName: { type: 'string' },
                                    userName: { type: 'string' },
                                    timestamp: { type: 'string', format: 'date-time' }
                                }
                            }
                        }
                    }
                },
                // AI Analysis schemas
                DocumentAnalysisRequest: {
                    type: 'object',
                    properties: {
                        analysisType: {
                            type: 'string',
                            enum: ['text_extraction', 'entity_recognition', 'classification', 'sentiment', 'summary']
                        },
                        options: {
                            type: 'object',
                            properties: {
                                language: { type: 'string' },
                                extractImages: { type: 'boolean' },
                                extractTables: { type: 'boolean' }
                            }
                        }
                    },
                    required: ['analysisType']
                },
                DocumentAnalysisResult: {
                    type: 'object',
                    properties: {
                        jobId: { type: 'string' },
                        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
                        results: {
                            type: 'object',
                            properties: {
                                text: { type: 'string' },
                                entities: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            type: { type: 'string' },
                                            value: { type: 'string' },
                                            confidence: { type: 'number' }
                                        }
                                    }
                                },
                                classification: {
                                    type: 'object',
                                    properties: {
                                        category: { type: 'string' },
                                        confidence: { type: 'number' }
                                    }
                                }
                            }
                        },
                        error: { type: 'string' }
                    }
                },
                // Workflow schemas
                DocumentWorkflow: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        documentId: { type: 'string' },
                        workflowType: { type: 'string', enum: ['approval', 'review', 'signature', 'compliance'] },
                        status: { type: 'string', enum: ['pending', 'in_progress', 'approved', 'rejected', 'completed'] },
                        assignedTo: { type: 'string' },
                        assignedAt: { type: 'string', format: 'date-time' },
                        completedAt: { type: 'string', format: 'date-time' },
                        comments: { type: 'string' },
                        metadata: { type: 'string' },
                        companyId: { type: 'string' },
                        tenantId: { type: 'string' }
                    }
                },
                DocumentWorkflowCreate: {
                    type: 'object',
                    properties: {
                        workflowType: { type: 'string', enum: ['approval', 'review', 'signature', 'compliance'] },
                        assignedTo: { type: 'string' },
                        comments: { type: 'string' },
                        metadata: { type: 'string' }
                    },
                    required: ['workflowType', 'assignedTo']
                },
                // Access Control schemas
                DocumentAccessControl: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        documentId: { type: 'string' },
                        accessLevel: { type: 'string', enum: ['public', 'restricted', 'confidential', 'secret'] },
                        userGroups: { type: 'string' },
                        timeRestrictions: { type: 'string' },
                        ipRestrictions: { type: 'string' },
                        mfaRequired: { type: 'boolean' },
                        createdBy: { type: 'string' },
                        companyId: { type: 'string' },
                        tenantId: { type: 'string' }
                    }
                },
                DocumentAccessControlCreate: {
                    type: 'object',
                    properties: {
                        accessLevel: { type: 'string', enum: ['public', 'restricted', 'confidential', 'secret'] },
                        userGroups: { type: 'string' },
                        timeRestrictions: { type: 'string' },
                        ipRestrictions: { type: 'string' },
                        mfaRequired: { type: 'boolean' }
                    },
                    required: ['accessLevel']
                },
                // Webhook schemas
                DocumentWebhook: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        documentId: { type: 'string' },
                        eventType: { type: 'string', enum: ['uploaded', 'updated', 'deleted', 'shared', 'workflow_started', 'workflow_completed'] },
                        webhookUrl: { type: 'string', format: 'uri' },
                        secret: { type: 'string' },
                        isActive: { type: 'boolean' },
                        createdBy: { type: 'string' },
                        companyId: { type: 'string' },
                        tenantId: { type: 'string' }
                    }
                },
                DocumentWebhookCreate: {
                    type: 'object',
                    properties: {
                        eventType: { type: 'string', enum: ['uploaded', 'updated', 'deleted', 'shared', 'workflow_started', 'workflow_completed'] },
                        webhookUrl: { type: 'string', format: 'uri' },
                        secret: { type: 'string' },
                        isActive: { type: 'boolean', default: true }
                    },
                    required: ['eventType', 'webhookUrl']
                },
                // Compliance schemas
                ComplianceCheck: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        documentId: { type: 'string' },
                        checkType: { type: 'string', enum: ['gdpr', 'hipaa', 'sox', 'pci_dss', 'iso27001'] },
                        status: { type: 'string', enum: ['pending', 'passed', 'failed', 'warning'] },
                        results: { type: 'string' },
                        checkedAt: { type: 'string', format: 'date-time' },
                        createdBy: { type: 'string' },
                        companyId: { type: 'string' },
                        tenantId: { type: 'string' }
                    }
                },
                ComplianceCheckCreate: {
                    type: 'object',
                    properties: {
                        checkType: { type: 'string', enum: ['gdpr', 'hipaa', 'sox', 'pci_dss', 'iso27001'] },
                        documentId: { type: 'string' }
                    },
                    required: ['checkType', 'documentId']
                },
                // Analytics schemas
                DocumentAnalytics: {
                    type: 'object',
                    properties: {
                        uploadsOverTime: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    date: { type: 'string', format: 'date' },
                                    count: { type: 'integer' }
                                }
                            }
                        },
                        topCategories: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    categoryName: { type: 'string' },
                                    documentCount: { type: 'integer' },
                                    storageUsed: { type: 'integer' }
                                }
                            }
                        },
                        fileTypeDistribution: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    mimeType: { type: 'string' },
                                    count: { type: 'integer' },
                                    percentage: { type: 'number' }
                                }
                            }
                        }
                    }
                },
                // Bulk operations
                DocumentBulkUpdate: {
                    type: 'object',
                    properties: {
                        documentIds: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        updates: {
                            type: 'object',
                            properties: {
                                categoryId: { type: 'string' },
                                workspaceId: { type: 'string' },
                                status: { type: 'string', enum: ['active', 'deleted'] }
                            }
                        }
                    },
                    required: ['documentIds', 'updates']
                },
                BulkOperationResult: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        processedCount: { type: 'integer' },
                        failedCount: { type: 'integer' },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    documentId: { type: 'string' },
                                    error: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                // Financial Reporting schemas
                FinancialReport: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        type: { type: 'string', enum: ['balance_sheet', 'income_statement', 'cash_flow', 'equity', 'custom'] },
                        description: { type: 'string' },
                        companyId: { type: 'string' },
                        createdBy: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        isTemplate: { type: 'boolean' },
                        isPublic: { type: 'boolean' },
                        metadata: { type: 'string' },
                        createdByUser: { $ref: '#/components/schemas/User' },
                        reportItems: { type: 'array', items: { $ref: '#/components/schemas/ReportItem' } },
                        reportSchedules: { type: 'array', items: { $ref: '#/components/schemas/ReportSchedule' } },
                        _count: {
                            type: 'object',
                            properties: {
                                reportItems: { type: 'integer' },
                                reportSchedules: { type: 'integer' }
                            }
                        }
                    }
                },
                ReportItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        reportId: { type: 'string' },
                        name: { type: 'string' },
                        type: { type: 'string', enum: ['account', 'calculation', 'text', 'chart'] },
                        order: { type: 'integer' },
                        configuration: { type: 'string' },
                        formula: { type: 'string' },
                        accountIds: { type: 'string' }
                    }
                },
                ReportSchedule: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        reportId: { type: 'string' },
                        name: { type: 'string' },
                        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
                        nextRun: { type: 'string', format: 'date-time' },
                        recipients: { type: 'string' },
                        format: { type: 'string', enum: ['pdf', 'excel', 'csv'] },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                ReportTemplate: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        type: { type: 'string', enum: ['balance_sheet', 'income_statement', 'cash_flow', 'equity', 'custom'] },
                        category: { type: 'string', enum: ['industry', 'standard', 'custom'] },
                        description: { type: 'string' },
                        configuration: { type: 'string' },
                        isPublic: { type: 'boolean' },
                        createdBy: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        createdByUser: { $ref: '#/components/schemas/User' }
                    }
                },
                ReportExecution: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        reportId: { type: 'string' },
                        executedBy: { type: 'string' },
                        executedAt: { type: 'string', format: 'date-time' },
                        parameters: { type: 'string' },
                        result: { type: 'string' },
                        status: { type: 'string', enum: ['success', 'error', 'processing'] },
                        errorMessage: { type: 'string' },
                        executedByUser: { $ref: '#/components/schemas/User' }
                    }
                },
                ReportData: {
                    type: 'object',
                    properties: {
                        report: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                type: { type: 'string' },
                                description: { type: 'string' }
                            }
                        },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    name: { type: 'string' },
                                    type: { type: 'string' },
                                    order: { type: 'integer' },
                                    value: { oneOf: [{ type: 'number' }, { type: 'string' }] },
                                    details: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                name: { type: 'string' },
                                                code: { type: 'string' },
                                                type: { type: 'string' },
                                                balance: { type: 'number' }
                                            }
                                        }
                                    },
                                    configuration: { type: 'object' }
                                }
                            }
                        },
                        summary: {
                            type: 'object',
                            properties: {
                                totalAssets: { type: 'number' },
                                totalLiabilities: { type: 'number' },
                                totalEquity: { type: 'number' },
                                totalRevenue: { type: 'number' },
                                totalExpenses: { type: 'number' },
                                netIncome: { type: 'number' }
                            }
                        },
                        generatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                // Accounting schemas
                AccountType: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        code: { type: 'string' },
                        name: { type: 'string' },
                        companyId: { type: 'string' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                AccountTypeCreate: {
                    type: 'object',
                    properties: {
                        code: { type: 'string' },
                        name: { type: 'string' },
                        companyId: { type: 'string' }
                    },
                    required: ['code', 'name']
                },
                AccountTypeUpdate: {
                    type: 'object',
                    properties: {
                        code: { type: 'string' },
                        name: { type: 'string' }
                    }
                },
                Account: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        code: { type: 'string' },
                        name: { type: 'string' },
                        typeId: { type: 'string' },
                        parentId: { type: 'string' },
                        companyId: { type: 'string' },
                        tenantId: { type: 'string' },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        type: { $ref: '#/components/schemas/AccountType' },
                        parent: { $ref: '#/components/schemas/Account' },
                        children: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Account' }
                        },
                        journalLines: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/JournalLine' }
                        }
                    }
                },
                AccountCreate: {
                    type: 'object',
                    properties: {
                        code: { type: 'string' },
                        name: { type: 'string' },
                        typeId: { type: 'string' },
                        parentId: { type: 'string' },
                        companyId: { type: 'string' }
                    },
                    required: ['code', 'name', 'typeId']
                },
                AccountUpdate: {
                    type: 'object',
                    properties: {
                        code: { type: 'string' },
                        name: { type: 'string' },
                        typeId: { type: 'string' },
                        parentId: { type: 'string' },
                        isActive: { type: 'boolean' }
                    }
                },
                AccountBalance: {
                    type: 'object',
                    properties: {
                        accountId: { type: 'string' },
                        accountCode: { type: 'string' },
                        accountName: { type: 'string' },
                        balance: { type: 'number' },
                        asOf: { type: 'string', format: 'date-time' },
                        transactionCount: { type: 'integer' }
                    }
                },
                AccountSummary: {
                    type: 'object',
                    properties: {
                        summary: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    typeCode: { type: 'string' },
                                    typeName: { type: 'string' },
                                    count: { type: 'integer' },
                                    accounts: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                code: { type: 'string' },
                                                name: { type: 'string' },
                                                isActive: { type: 'boolean' }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        totalAccounts: { type: 'integer' },
                        companyId: { type: 'string' }
                    }
                },
                AccountHierarchy: {
                    type: 'object',
                    properties: {
                        accounts: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Account' }
                        },
                        flat: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Account' }
                        },
                        total: { type: 'integer' }
                    }
                },
                // Banking schemas
                BankAccount: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        bankName: { type: 'string' },
                        accountNumber: { type: 'string' },
                        currency: { type: 'string', minLength: 3, maxLength: 3 },
                        companyId: { type: 'string' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                BankAccountCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        bankName: { type: 'string' },
                        accountNumber: { type: 'string' },
                        currency: { type: 'string', minLength: 3, maxLength: 3 }
                    },
                    required: ['companyId', 'bankName', 'accountNumber', 'currency']
                },
                BankTransaction: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        bankAccountId: { type: 'string' },
                        transactionDate: { type: 'string', format: 'date-time' },
                        amount: { type: 'number' },
                        transactionType: { type: 'string', enum: ['credit', 'debit'] },
                        description: { type: 'string' },
                        status: { type: 'string', enum: ['unreconciled', 'reconciled'] },
                        companyId: { type: 'string' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Payment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        transactionId: { type: 'string' },
                        bankAccountId: { type: 'string' },
                        method: { type: 'string' },
                        reference: { type: 'string' },
                        amount: { type: 'number' },
                        paymentDate: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                PaymentCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        transactionId: { type: 'string' },
                        bankAccountId: { type: 'string' },
                        method: { type: 'string' },
                        reference: { type: 'string' },
                        amount: { type: 'number' },
                        paymentDate: { type: 'string', format: 'date-time' },
                        applications: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    invoiceId: { type: 'string' },
                                    billId: { type: 'string' },
                                    amount: { type: 'number' }
                                }
                            }
                        },
                        fxGainLoss: { type: 'number' }
                    },
                    required: ['companyId', 'transactionId', 'amount', 'paymentDate']
                },
                PaymentApplication: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        paymentId: { type: 'string' },
                        invoiceId: { type: 'string' },
                        billId: { type: 'string' },
                        amount: { type: 'number' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                ReconcileBankTransaction: {
                    type: 'object',
                    properties: {
                        paymentId: { type: 'string' }
                    },
                    required: ['paymentId']
                },
                BankFeed: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            date: { type: 'string', format: 'date' },
                            amount: { type: 'number' },
                            description: { type: 'string' },
                            reference: { type: 'string' }
                        }
                    }
                },
                // Journal schemas
                JournalEntry: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        date: { type: 'string', format: 'date-time' },
                        memo: { type: 'string' },
                        reference: { type: 'string' },
                        status: { type: 'string', enum: ['DRAFT', 'POSTED'] },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        lines: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/JournalLine' }
                        }
                    }
                },
                JournalLine: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        entryId: { type: 'string' },
                        accountId: { type: 'string' },
                        debit: { type: 'number' },
                        credit: { type: 'number' },
                        memo: { type: 'string' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        account: {
                            type: 'object',
                            properties: {
                                code: { type: 'string' },
                                name: { type: 'string' },
                                type: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                },
                JournalPost: {
                    type: 'object',
                    properties: {
                        date: { type: 'string', format: 'date-time' },
                        memo: { type: 'string' },
                        reference: { type: 'string' },
                        companyId: { type: 'string' },
                        lines: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    accountId: { type: 'string' },
                                    debit: { type: 'number' },
                                    credit: { type: 'number' },
                                    memo: { type: 'string' }
                                }
                            }
                        }
                    },
                    required: ['companyId', 'lines']
                },
                JournalPostAction: {
                    type: 'object',
                    properties: {
                        createTransaction: { type: 'boolean', default: false },
                        transaction: { $ref: '#/components/schemas/TransactionInput' }
                    }
                },
                LedgerEntry: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        date: { type: 'string', format: 'date-time' },
                        accountId: { type: 'string' },
                        reference: { type: 'string' },
                        description: { type: 'string' },
                        debit: { type: 'number' },
                        credit: { type: 'number' },
                        account: {
                            type: 'object',
                            properties: {
                                code: { type: 'string' },
                                name: { type: 'string' },
                                type: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                },
                TrialBalance: {
                    type: 'object',
                    properties: {
                        accounts: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    accountId: { type: 'string' },
                                    accountCode: { type: 'string' },
                                    accountName: { type: 'string' },
                                    accountType: { type: 'string' },
                                    debitBalance: { type: 'number' },
                                    creditBalance: { type: 'number' },
                                    netBalance: { type: 'number' },
                                    asOf: { type: 'string', format: 'date-time' }
                                }
                            }
                        },
                        totalDebits: { type: 'number' },
                        totalCredits: { type: 'number' },
                        difference: { type: 'number' },
                        asOf: { type: 'string', format: 'date-time' }
                    }
                },
                GeneralLedger: {
                    type: 'object',
                    properties: {
                        entries: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/LedgerEntry' }
                        },
                        totalEntries: { type: 'integer' },
                        period: {
                            type: 'object',
                            properties: {
                                start: { type: 'string', format: 'date-time' },
                                end: { type: 'string', format: 'date-time' }
                            }
                        },
                        runningBalance: { type: 'number' },
                        pagination: { $ref: '#/components/schemas/Pagination' }
                    }
                },
                // Transaction schemas
                Transaction: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        transactionType: { type: 'string' },
                        amount: { type: 'number' },
                        currency: { type: 'string', minLength: 3, maxLength: 3 },
                        transactionDate: { type: 'string', format: 'date-time' },
                        status: { type: 'string' },
                        companyId: { type: 'string' },
                        linkedJournalEntryId: { type: 'string' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                TransactionCreate: {
                    type: 'object',
                    properties: {
                        transactionType: { type: 'string' },
                        amount: { type: 'number' },
                        currency: { type: 'string', minLength: 3, maxLength: 3 },
                        transactionDate: { type: 'string', format: 'date-time' },
                        status: { type: 'string' },
                        companyId: { type: 'string' },
                        linkedJournalEntryId: { type: 'string' }
                    },
                    required: ['transactionType', 'amount', 'currency', 'transactionDate']
                },
                // MFA schemas
                MfaSetupStartResponse: {
                    type: 'object',
                    properties: {
                        secret: { type: 'string' },
                        otpauth: { type: 'string' }
                    }
                },
                MfaEnableResponse: {
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean' },
                        backupCodes: { type: 'array', items: { type: 'string' } }
                    }
                },
                MfaLoginChallengeResponse: {
                    type: 'object',
                    properties: {
                        challengeRequired: { type: 'boolean' },
                        challengeToken: { type: 'string' }
                    }
                },
                // Bank Feeds schemas
                BankConnection: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        bankName: { type: 'string' },
                        accountNumber: { type: 'string' },
                        accountType: { type: 'string', enum: ['checking', 'savings', 'credit', 'loan'] },
                        currency: { type: 'string', default: 'USD' },
                        connectionType: { type: 'string', enum: ['plaid', 'yodlee', 'manual', 'api'] },
                        connectionId: { type: 'string' },
                        status: { type: 'string', enum: ['active', 'inactive', 'error', 'pending'] },
                        lastSyncAt: { type: 'string', format: 'date-time' },
                        nextSyncAt: { type: 'string', format: 'date-time' },
                        syncFrequency: { type: 'string', enum: ['hourly', 'daily', 'weekly'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        _count: {
                            type: 'object',
                            properties: {
                                bankTransactions: { type: 'integer' },
                                syncLogs: { type: 'integer' }
                            }
                        }
                    }
                },
                BankConnectionCreate: {
                    type: 'object',
                    properties: {
                        bankName: { type: 'string' },
                        accountNumber: { type: 'string' },
                        accountType: { type: 'string', enum: ['checking', 'savings', 'credit', 'loan'] },
                        currency: { type: 'string', default: 'USD' },
                        connectionType: { type: 'string', enum: ['plaid', 'yodlee', 'manual', 'api'] },
                        connectionId: { type: 'string' },
                        syncFrequency: { type: 'string', enum: ['hourly', 'daily', 'weekly'] },
                        credentials: { type: 'string' },
                        metadata: { type: 'string' }
                    },
                    required: ['bankName', 'accountNumber', 'accountType', 'connectionType']
                },
                BankTransaction: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        connectionId: { type: 'string' },
                        externalId: { type: 'string' },
                        transactionDate: { type: 'string', format: 'date-time' },
                        postedDate: { type: 'string', format: 'date-time' },
                        amount: { type: 'number' },
                        currency: { type: 'string', default: 'USD' },
                        description: { type: 'string' },
                        merchantName: { type: 'string' },
                        merchantCategory: { type: 'string' },
                        transactionType: { type: 'string', enum: ['debit', 'credit', 'transfer'] },
                        reference: { type: 'string' },
                        checkNumber: { type: 'string' },
                        memo: { type: 'string' },
                        category: { type: 'string' },
                        tags: { type: 'string' },
                        isReconciled: { type: 'boolean' },
                        reconciledAt: { type: 'string', format: 'date-time' },
                        reconciledBy: { type: 'string' },
                        matchedTransactionId: { type: 'string' },
                        confidence: { type: 'number' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        connection: { $ref: '#/components/schemas/BankConnection' },
                        reconciledByUser: { $ref: '#/components/schemas/User' },
                        matchedTransaction: { $ref: '#/components/schemas/Transaction' }
                    }
                },
                BankTransactionCreate: {
                    type: 'object',
                    properties: {
                        externalId: { type: 'string' },
                        transactionDate: { type: 'string', format: 'date-time' },
                        postedDate: { type: 'string', format: 'date-time' },
                        amount: { type: 'number' },
                        currency: { type: 'string', default: 'USD' },
                        description: { type: 'string' },
                        merchantName: { type: 'string' },
                        merchantCategory: { type: 'string' },
                        transactionType: { type: 'string', enum: ['debit', 'credit', 'transfer'] },
                        reference: { type: 'string' },
                        checkNumber: { type: 'string' },
                        memo: { type: 'string' },
                        category: { type: 'string' },
                        tags: { type: 'string' }
                    },
                    required: ['transactionDate', 'amount', 'transactionType']
                },
                BankReconciliationRule: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        isActive: { type: 'boolean' },
                        priority: { type: 'integer' },
                        conditions: { type: 'string' },
                        actions: { type: 'string' },
                        createdBy: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        createdByUser: { $ref: '#/components/schemas/User' }
                    }
                },
                BankReconciliationRuleCreate: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        isActive: { type: 'boolean' },
                        priority: { type: 'integer' },
                        conditions: { type: 'string' },
                        actions: { type: 'string' }
                    },
                    required: ['name', 'conditions', 'actions']
                },
                BankSyncLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        connectionId: { type: 'string' },
                        syncType: { type: 'string', enum: ['full', 'incremental', 'manual'] },
                        status: { type: 'string', enum: ['success', 'error', 'partial', 'running'] },
                        startedAt: { type: 'string', format: 'date-time' },
                        completedAt: { type: 'string', format: 'date-time' },
                        transactionsFound: { type: 'integer' },
                        transactionsImported: { type: 'integer' },
                        transactionsUpdated: { type: 'integer' },
                        errorMessage: { type: 'string' },
                        connection: { $ref: '#/components/schemas/BankConnection' }
                    }
                },
                BankReconciliationJob: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        connectionId: { type: 'string' },
                        jobType: { type: 'string', enum: ['auto', 'manual', 'scheduled'] },
                        status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
                        startedAt: { type: 'string', format: 'date-time' },
                        completedAt: { type: 'string', format: 'date-time' },
                        transactionsProcessed: { type: 'integer' },
                        transactionsMatched: { type: 'integer' },
                        transactionsUnmatched: { type: 'integer' },
                        errorMessage: { type: 'string' }
                    }
                },
                // Sales schemas
                Customer: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        phone: { type: 'string' },
                        taxNumber: { type: 'string' },
                        address: { type: 'string' },
                        currency: { type: 'string', default: 'USD' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                CustomerCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        phone: { type: 'string' },
                        taxNumber: { type: 'string' },
                        address: { type: 'string' }
                    },
                    required: ['companyId', 'name']
                },
                Invoice: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        customerId: { type: 'string' },
                        invoiceNumber: { type: 'string' },
                        issueDate: { type: 'string', format: 'date-time' },
                        dueDate: { type: 'string', format: 'date-time' },
                        status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] },
                        currency: { type: 'string', default: 'USD' },
                        subtotal: { type: 'number' },
                        taxTotal: { type: 'number' },
                        totalAmount: { type: 'number' },
                        balanceDue: { type: 'number' },
                        notes: { type: 'string' },
                        terms: { type: 'string' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        customer: { $ref: '#/components/schemas/Customer' },
                        lines: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/InvoiceLine' }
                        }
                    }
                },
                InvoiceLine: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        invoiceId: { type: 'string' },
                        productId: { type: 'string' },
                        description: { type: 'string' },
                        quantity: { type: 'number' },
                        unitPrice: { type: 'number' },
                        taxRate: { type: 'number' },
                        lineTotal: { type: 'number' },
                        tenantId: { type: 'string' }
                    }
                },
                InvoiceCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        customerId: { type: 'string' },
                        invoiceNumber: { type: 'string' },
                        issueDate: { type: 'string' },
                        dueDate: { type: 'string' },
                        currency: { type: 'string', default: 'USD' },
                        lines: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    productId: { type: 'string' },
                                    description: { type: 'string' },
                                    quantity: { type: 'number', default: 1 },
                                    unitPrice: { type: 'number', default: 0 },
                                    taxRate: { type: 'number', default: 0 },
                                    taxId: { type: 'string' },
                                    taxName: { type: 'string' }
                                },
                                required: ['quantity', 'unitPrice']
                            }
                        }
                    },
                    required: ['companyId', 'customerId', 'invoiceNumber', 'issueDate', 'lines']
                },
                Estimate: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        customerId: { type: 'string' },
                        estimateNumber: { type: 'string' },
                        issueDate: { type: 'string', format: 'date-time' },
                        expiryDate: { type: 'string', format: 'date-time' },
                        status: { type: 'string', enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'] },
                        currency: { type: 'string', default: 'USD' },
                        totalAmount: { type: 'number' },
                        notes: { type: 'string' },
                        terms: { type: 'string' },
                        validUntil: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        customer: { $ref: '#/components/schemas/Customer' },
                        lines: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/EstimateLine' }
                        }
                    }
                },
                EstimateLine: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        estimateId: { type: 'string' },
                        productId: { type: 'string' },
                        description: { type: 'string' },
                        quantity: { type: 'number' },
                        unitPrice: { type: 'number' },
                        taxRate: { type: 'number' },
                        lineTotal: { type: 'number' },
                        tenantId: { type: 'string' }
                    }
                },
                EstimateCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        customerId: { type: 'string' },
                        estimateNumber: { type: 'string' },
                        issueDate: { type: 'string' },
                        expiryDate: { type: 'string' },
                        currency: { type: 'string', default: 'USD' },
                        notes: { type: 'string' },
                        terms: { type: 'string' },
                        lines: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    productId: { type: 'string' },
                                    description: { type: 'string' },
                                    quantity: { type: 'number', default: 1 },
                                    unitPrice: { type: 'number', default: 0 },
                                    taxRate: { type: 'number', default: 0 },
                                    taxId: { type: 'string' },
                                    taxName: { type: 'string' }
                                },
                                required: ['quantity', 'unitPrice']
                            }
                        }
                    },
                    required: ['companyId', 'customerId', 'estimateNumber', 'issueDate', 'lines']
                },
                RecurringInvoice: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        customerId: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'] },
                        interval: { type: 'integer', default: 1 },
                        startDate: { type: 'string', format: 'date-time' },
                        endDate: { type: 'string', format: 'date-time' },
                        nextRunDate: { type: 'string', format: 'date-time' },
                        lastRunDate: { type: 'string', format: 'date-time' },
                        status: { type: 'string', enum: ['active', 'paused', 'completed', 'cancelled'] },
                        currency: { type: 'string', default: 'USD' },
                        totalAmount: { type: 'number' },
                        notes: { type: 'string' },
                        terms: { type: 'string' },
                        dueDateOffset: { type: 'integer', default: 30 },
                        autoSend: { type: 'boolean', default: false },
                        emailTemplate: { type: 'string' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        customer: { $ref: '#/components/schemas/Customer' },
                        lines: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/RecurringInvoiceLine' }
                        },
                        _count: {
                            type: 'object',
                            properties: {
                                generatedInvoices: { type: 'integer' }
                            }
                        }
                    }
                },
                RecurringInvoiceLine: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        recurringInvoiceId: { type: 'string' },
                        productId: { type: 'string' },
                        description: { type: 'string' },
                        quantity: { type: 'number' },
                        unitPrice: { type: 'number' },
                        taxRate: { type: 'number' },
                        lineTotal: { type: 'number' },
                        tenantId: { type: 'string' }
                    }
                },
                RecurringInvoiceCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        customerId: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'] },
                        interval: { type: 'integer', default: 1 },
                        startDate: { type: 'string' },
                        endDate: { type: 'string' },
                        currency: { type: 'string', default: 'USD' },
                        notes: { type: 'string' },
                        terms: { type: 'string' },
                        dueDateOffset: { type: 'integer', default: 30 },
                        autoSend: { type: 'boolean', default: false },
                        emailTemplate: { type: 'string' },
                        lines: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    productId: { type: 'string' },
                                    description: { type: 'string' },
                                    quantity: { type: 'number', default: 1 },
                                    unitPrice: { type: 'number', default: 0 },
                                    taxRate: { type: 'number', default: 0 }
                                },
                                required: ['quantity', 'unitPrice']
                            }
                        }
                    },
                    required: ['companyId', 'customerId', 'name', 'frequency', 'startDate', 'lines']
                },
                RecurringInvoiceUpdate: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'] },
                        interval: { type: 'integer' },
                        startDate: { type: 'string' },
                        endDate: { type: 'string' },
                        status: { type: 'string', enum: ['active', 'paused', 'completed', 'cancelled'] },
                        currency: { type: 'string' },
                        notes: { type: 'string' },
                        terms: { type: 'string' },
                        dueDateOffset: { type: 'integer' },
                        autoSend: { type: 'boolean' },
                        emailTemplate: { type: 'string' },
                        lines: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    productId: { type: 'string' },
                                    description: { type: 'string' },
                                    quantity: { type: 'number', default: 1 },
                                    unitPrice: { type: 'number', default: 0 },
                                    taxRate: { type: 'number', default: 0 }
                                }
                            }
                        }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        sku: { type: 'string' },
                        unitPrice: { type: 'number' },
                        currency: { type: 'string', default: 'USD' },
                        taxRate: { type: 'number', default: 0 },
                        isActive: { type: 'boolean', default: true },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Location: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        tenantId: { type: 'string' },
                        code: { type: 'string' },
                        name: { type: 'string' },
                        address: { type: 'string' },
                        type: { type: 'string', enum: ['WAREHOUSE', 'STORE', 'OFFICE', 'OTHER'] },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        postalCode: { type: 'string' },
                        country: { type: 'string' },
                        contactName: { type: 'string' },
                        contactPhone: { type: 'string' },
                        contactEmail: { type: 'string', format: 'email' },
                        isDefault: { type: 'boolean', default: false },
                        isActive: { type: 'boolean', default: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        _count: {
                            type: 'object',
                            properties: {
                                products: { type: 'number' },
                                movements: { type: 'number' }
                            }
                        }
                    },
                    required: ['id', 'companyId', 'tenantId', 'code', 'name', 'type']
                },
                LocationCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        code: { type: 'string' },
                        name: { type: 'string' },
                        address: { type: 'string' },
                        type: { type: 'string', enum: ['WAREHOUSE', 'STORE', 'OFFICE', 'OTHER'], default: 'WAREHOUSE' },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        postalCode: { type: 'string' },
                        country: { type: 'string' },
                        contactName: { type: 'string' },
                        contactPhone: { type: 'string' },
                        contactEmail: { type: 'string', format: 'email' },
                        isDefault: { type: 'boolean', default: false },
                        isActive: { type: 'boolean', default: true }
                    },
                    required: ['companyId', 'name']
                },
                LocationUpdate: {
                    type: 'object',
                    properties: {
                        code: { type: 'string' },
                        name: { type: 'string' },
                        address: { type: 'string' },
                        type: { type: 'string', enum: ['WAREHOUSE', 'STORE', 'OFFICE', 'OTHER'] },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        postalCode: { type: 'string' },
                        country: { type: 'string' },
                        contactName: { type: 'string' },
                        contactPhone: { type: 'string' },
                        contactEmail: { type: 'string', format: 'email' },
                        isDefault: { type: 'boolean' },
                        isActive: { type: 'boolean' }
                    }
                },
                // Purchase schemas
                Vendor: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        phone: { type: 'string' },
                        taxNumber: { type: 'string' },
                        address: { type: 'string' },
                        currency: { type: 'string', default: 'USD' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                VendorCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        phone: { type: 'string' },
                        taxNumber: { type: 'string' },
                        address: { type: 'string' }
                    },
                    required: ['companyId', 'name']
                },
                Bill: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        vendorId: { type: 'string' },
                        billNumber: { type: 'string' },
                        billDate: { type: 'string', format: 'date-time' },
                        dueDate: { type: 'string', format: 'date-time' },
                        status: { type: 'string', enum: ['draft', 'received', 'paid', 'overdue', 'cancelled'] },
                        currency: { type: 'string', default: 'USD' },
                        subtotal: { type: 'number' },
                        taxTotal: { type: 'number' },
                        totalAmount: { type: 'number' },
                        balanceDue: { type: 'number' },
                        purchaseType: { type: 'string', enum: ['local', 'import'] },
                        vendorCurrency: { type: 'string' },
                        exchangeRate: { type: 'number' },
                        freightCost: { type: 'number' },
                        customsDuty: { type: 'number' },
                        landedCosts: { type: 'number' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        vendor: { $ref: '#/components/schemas/Vendor' },
                        lines: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/BillLine' }
                        }
                    }
                },
                BillLine: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        billId: { type: 'string' },
                        productId: { type: 'string' },
                        description: { type: 'string' },
                        quantity: { type: 'number' },
                        unitPrice: { type: 'number' },
                        taxRate: { type: 'number' },
                        lineTotal: { type: 'number' },
                        tenantId: { type: 'string' }
                    }
                },
                BillCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        vendorId: { type: 'string' },
                        billNumber: { type: 'string' },
                        billDate: { type: 'string' },
                        dueDate: { type: 'string' },
                        currency: { type: 'string', default: 'USD' },
                        lines: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    productId: { type: 'string' },
                                    description: { type: 'string' },
                                    quantity: { type: 'number', default: 1 },
                                    unitPrice: { type: 'number', default: 0 },
                                    taxRate: { type: 'number', default: 0 },
                                    taxId: { type: 'string' },
                                    taxName: { type: 'string' }
                                },
                                required: ['quantity', 'unitPrice']
                            }
                        },
                        purchaseType: { type: 'string', enum: ['local', 'import'], default: 'local' },
                        vendorCurrency: { type: 'string' },
                        exchangeRate: { type: 'number' },
                        freightCost: { type: 'number', default: 0 },
                        customsDuty: { type: 'number', default: 0 }
                    },
                    required: ['companyId', 'vendorId', 'billNumber', 'billDate', 'lines']
                },
                // Inventory schemas
                InventoryMovement: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        productId: { type: 'string' },
                        movementType: { type: 'string', enum: ['in', 'out', 'adjustment'] },
                        quantity: { type: 'number' },
                        unitCost: { type: 'number' },
                        reference: { type: 'string' },
                        referenceType: { type: 'string', enum: ['purchase', 'sale', 'adjustment', 'transfer'] },
                        referenceId: { type: 'string' },
                        date: { type: 'string', format: 'date-time' },
                        notes: { type: 'string' },
                        tenantId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                InventoryMovementCreate: {
                    type: 'object',
                    properties: {
                        companyId: { type: 'string' },
                        productId: { type: 'string' },
                        movementType: { type: 'string', enum: ['in', 'out', 'adjustment'] },
                        quantity: { type: 'number' },
                        unitCost: { type: 'number' },
                        reference: { type: 'string' },
                        referenceType: { type: 'string', enum: ['purchase', 'sale', 'adjustment', 'transfer'] },
                        referenceId: { type: 'string' },
                        date: { type: 'string' },
                        notes: { type: 'string' }
                    },
                    required: ['companyId', 'productId', 'movementType', 'quantity', 'date']
                },
                // Collaboration schemas
                Comment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        resourceType: { type: 'string' },
                        resourceId: { type: 'string' },
                        authorId: { type: 'string' },
                        text: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
                    },
                    required: ['id', 'resourceType', 'resourceId', 'authorId', 'text', 'createdAt']
                },
                CommentCreate: {
                    type: 'object',
                    properties: {
                        resourceType: { type: 'string' },
                        resourceId: { type: 'string' },
                        text: { type: 'string' }
                    },
                    required: ['resourceType', 'resourceId', 'text']
                },
                Share: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        resourceType: { type: 'string' },
                        resourceId: { type: 'string' },
                        sharedWith: { type: 'string' },
                        accessLevel: { type: 'string', enum: ['view', 'comment', 'edit'] },
                        expiresAt: { type: 'string', format: 'date-time' }
                    },
                    required: ['id', 'resourceType', 'resourceId', 'sharedWith', 'accessLevel']
                },
                ShareCreate: {
                    type: 'object',
                    properties: {
                        resourceType: { type: 'string' },
                        resourceId: { type: 'string' },
                        sharedWith: { type: 'string' },
                        accessLevel: { type: 'string', enum: ['view', 'comment', 'edit'] },
                        expiresAt: { type: 'string', format: 'date-time' }
                    },
                    required: ['resourceType', 'resourceId', 'sharedWith', 'accessLevel']
                },
                // AI schemas
                AIChatRequest: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        context: { type: 'object' }
                    },
                    required: ['message']
                },
                AIChatResponse: {
                    type: 'object',
                    properties: {
                        reply: { type: 'string' },
                        citations: { type: 'array', items: { type: 'string' } },
                        metadata: { type: 'object' }
                    },
                    required: ['reply']
                },
                AIConfig: {
                    type: 'object',
                    properties: {
                        model: { type: 'string' },
                        temperature: { type: 'number' },
                        topP: { type: 'number' },
                        features: { type: 'object' }
                    }
                }
            },
            responses: {
                BadRequest: {
                    description: 'Invalid input, object invalid, or missing fields',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                Unauthorized: {
                    description: 'Authentication failed or user not authorized',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                NotFound: {
                    description: 'The specified resource was not found',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                InternalServerError: {
                    description: 'Server error',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                }
            },
            // Enhanced Bank Integration schemas
            BankFeedTransaction: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    externalId: { type: 'string' },
                    transactionDate: { type: 'string', format: 'date-time' },
                    postedDate: { type: 'string', format: 'date-time' },
                    amount: { type: 'number' },
                    currency: { type: 'string' },
                    description: { type: 'string' },
                    merchantName: { type: 'string' },
                    merchantCategory: { type: 'string' },
                    transactionType: { type: 'string', enum: ['debit', 'credit', 'transfer'] },
                    reference: { type: 'string' },
                    checkNumber: { type: 'string' },
                    memo: { type: 'string' },
                    rawData: { type: 'object' }
                },
                required: ['id', 'externalId', 'transactionDate', 'amount', 'currency', 'description', 'transactionType']
            },
            BankReconciliationMatch: {
                type: 'object',
                properties: {
                    bankTransactionId: { type: 'string' },
                    internalTransactionId: { type: 'string' },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    matchType: { type: 'string', enum: ['exact', 'fuzzy', 'ai_suggested', 'manual'] },
                    reasoning: { type: 'string' },
                    suggestedCategory: { type: 'string' },
                    suggestedVendor: { type: 'string' },
                    riskScore: { type: 'number', minimum: 0, maximum: 1 },
                    requiresReview: { type: 'boolean' }
                },
                required: ['bankTransactionId', 'confidence', 'matchType', 'reasoning', 'riskScore', 'requiresReview']
            },
            BankReconciliationResult: {
                type: 'object',
                properties: {
                    connectionId: { type: 'string' },
                    processedTransactions: { type: 'integer' },
                    matchedTransactions: { type: 'integer' },
                    unmatchedTransactions: { type: 'integer' },
                    autoReconciled: { type: 'integer' },
                    requiresReview: { type: 'integer' },
                    fraudAlerts: { type: 'integer' },
                    processingTime: { type: 'integer' },
                    matches: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/BankReconciliationMatch' }
                    },
                    summary: {
                        type: 'object',
                        properties: {
                            totalAmount: { type: 'number' },
                            averageConfidence: { type: 'number' },
                            riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] }
                        }
                    }
                },
                required: ['connectionId', 'processedTransactions', 'matchedTransactions', 'unmatchedTransactions', 'summary']
            },
            BankIntegrationConfig: {
                type: 'object',
                properties: {
                    autoReconciliation: { type: 'boolean' },
                    confidenceThreshold: { type: 'number', minimum: 0, maximum: 1 },
                    fraudDetectionEnabled: { type: 'boolean' },
                    autoCategorization: { type: 'boolean' },
                    realTimeSync: { type: 'boolean' },
                    syncFrequency: { type: 'string', enum: ['hourly', 'daily', 'weekly'] },
                    notificationSettings: {
                        type: 'object',
                        properties: {
                            email: { type: 'boolean' },
                            slack: { type: 'boolean' },
                            webhook: { type: 'string' }
                        }
                    }
                },
                required: ['autoReconciliation', 'confidenceThreshold', 'fraudDetectionEnabled', 'autoCategorization']
            },
            BankIntegrationStats: {
                type: 'object',
                properties: {
                    totalConnections: { type: 'integer' },
                    activeConnections: { type: 'integer' },
                    totalTransactions: { type: 'integer' },
                    reconciledTransactions: { type: 'integer' },
                    pendingReconciliation: { type: 'integer' },
                    fraudAlerts: { type: 'integer' },
                    averageProcessingTime: { type: 'number' },
                    lastSyncTime: { type: 'string', format: 'date-time' },
                    syncSuccessRate: { type: 'number', minimum: 0, maximum: 1 }
                },
                required: ['totalConnections', 'activeConnections', 'totalTransactions', 'reconciledTransactions', 'pendingReconciliation', 'fraudAlerts', 'syncSuccessRate']
            },
            JournalEntry: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    companyId: { type: 'string' },
                    tenantId: { type: 'string' },
                    date: { type: 'string', format: 'date-time' },
                    reference: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string', enum: ['draft', 'posted', 'voided'] },
                    totalDebit: { type: 'number' },
                    totalCredit: { type: 'number' },
                    isBalanced: { type: 'boolean' },
                    postedAt: { type: 'string', format: 'date-time' },
                    postedBy: { type: 'string' },
                    entries: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/JournalLine' }
                    },
                    metadata: { type: 'object' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                },
                required: ['id', 'companyId', 'tenantId', 'date', 'reference', 'description', 'status', 'totalDebit', 'totalCredit', 'isBalanced']
            },
            JournalLine: {
                type: 'object',
                properties: {
                    accountId: { type: 'string' },
                    debit: { type: 'number' },
                    credit: { type: 'number' },
                    description: { type: 'string' },
                    reference: { type: 'string' },
                    metadata: { type: 'object' }
                },
                required: ['accountId', 'debit', 'credit']
            },
            AccountSuggestion: {
                type: 'object',
                properties: {
                    accountId: { type: 'string' },
                    accountName: { type: 'string' },
                    accountCode: { type: 'string' },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    reasoning: { type: 'string' },
                    suggestedCategory: { type: 'string' }
                },
                required: ['accountId', 'accountName', 'accountCode', 'confidence', 'reasoning']
            },
            JournalValidationResult: {
                type: 'object',
                properties: {
                    isValid: { type: 'boolean' },
                    isBalanced: { type: 'boolean' },
                    errors: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    warnings: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    suggestions: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    complianceIssues: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                },
                required: ['isValid', 'isBalanced', 'errors', 'warnings', 'suggestions', 'complianceIssues']
            },
            LedgerBalance: {
                type: 'object',
                properties: {
                    accountId: { type: 'string' },
                    accountName: { type: 'string' },
                    accountCode: { type: 'string' },
                    openingBalance: { type: 'number' },
                    currentBalance: { type: 'number' },
                    periodDebit: { type: 'number' },
                    periodCredit: { type: 'number' },
                    lastTransactionDate: { type: 'string', format: 'date-time' }
                },
                required: ['accountId', 'accountName', 'accountCode', 'openingBalance', 'currentBalance', 'periodDebit', 'periodCredit']
            },
            ChartOfAccounts: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    code: { type: 'string' },
                    type: { type: 'string', enum: ['asset', 'liability', 'equity', 'revenue', 'expense'] },
                    parentId: { type: 'string' },
                    children: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ChartOfAccounts' }
                    },
                    isActive: { type: 'boolean' },
                    balance: { type: 'number' },
                    metadata: { type: 'object' }
                },
                required: ['id', 'name', 'code', 'type', 'isActive', 'balance']
            },
            // Enhanced Financial Reports schemas
            BalanceSheet: {
                type: 'object',
                properties: {
                    asOfDate: { type: 'string', format: 'date' },
                    company: { $ref: '#/components/schemas/Company' },
                    assets: {
                        type: 'object',
                        properties: {
                            currentAssets: { type: 'array', items: { $ref: '#/components/schemas/AccountBalance' } },
                            fixedAssets: { type: 'array', items: { $ref: '#/components/schemas/AccountBalance' } },
                            totalAssets: { type: 'number' }
                        }
                    },
                    liabilities: {
                        type: 'object',
                        properties: {
                            currentLiabilities: { type: 'array', items: { $ref: '#/components/schemas/AccountBalance' } },
                            longTermLiabilities: { type: 'array', items: { $ref: '#/components/schemas/AccountBalance' } },
                            totalLiabilities: { type: 'number' }
                        }
                    },
                    equity: {
                        type: 'object',
                        properties: {
                            retainedEarnings: { type: 'number' },
                            currentEarnings: { type: 'number' },
                            totalEquity: { type: 'number' }
                        }
                    }
                }
            },
            ProfitAndLoss: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', format: 'date' },
                    endDate: { type: 'string', format: 'date' },
                    company: { $ref: '#/components/schemas/Company' },
                    revenue: {
                        type: 'object',
                        properties: {
                            accounts: { type: 'array', items: { $ref: '#/components/schemas/AccountBalance' } },
                            totalRevenue: { type: 'number' }
                        }
                    },
                    expenses: {
                        type: 'object',
                        properties: {
                            accounts: { type: 'array', items: { $ref: '#/components/schemas/AccountBalance' } },
                            totalExpenses: { type: 'number' }
                        }
                    },
                    netIncome: { type: 'number' },
                    grossProfit: { type: 'number' }
                }
            },
            CashFlowStatement: {
                type: 'object',
                properties: {
                    startDate: { type: 'string', format: 'date' },
                    endDate: { type: 'string', format: 'date' },
                    company: { $ref: '#/components/schemas/Company' },
                    operatingActivities: {
                        type: 'object',
                        properties: {
                            netIncome: { type: 'number' },
                            adjustments: { type: 'array', items: { $ref: '#/components/schemas/AccountBalance' } },
                            totalOperating: { type: 'number' }
                        }
                    },
                    investingActivities: {
                        type: 'object',
                        properties: {
                            activities: { type: 'array', items: { $ref: '#/components/schemas/AccountBalance' } },
                            totalInvesting: { type: 'number' }
                        }
                    },
                    financingActivities: {
                        type: 'object',
                        properties: {
                            activities: { type: 'array', items: { $ref: '#/components/schemas/AccountBalance' } },
                            totalFinancing: { type: 'number' }
                        }
                    },
                    netCashFlow: { type: 'number' },
                    beginningCash: { type: 'number' },
                    endingCash: { type: 'number' }
                }
            },
            // Tax Management schemas
            TaxRate: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    companyId: { type: 'string' },
                    taxName: { type: 'string' },
                    rate: { type: 'number', minimum: 0, maximum: 100 },
                    appliesTo: { type: 'string', enum: ['products', 'services', 'all'] },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                },
                required: ['id', 'companyId', 'taxName', 'rate', 'appliesTo', 'isActive']
            },
            // Bank Feeds schemas
            BankConnection: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    companyId: { type: 'string' },
                    bankName: { type: 'string' },
                    accountType: { type: 'string' },
                    accountNumber: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'inactive', 'error'] },
                    lastSyncDate: { type: 'string', format: 'date-time' },
                    nextSyncDate: { type: 'string', format: 'date-time' },
                    credentials: { type: 'object' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                },
                required: ['id', 'companyId', 'bankName', 'accountType', 'accountNumber', 'status']
            },
            AccountBalance: {
                type: 'object',
                properties: {
                    accountId: { type: 'string' },
                    accountName: { type: 'string' },
                    accountCode: { type: 'string' },
                    balance: { type: 'number' },
                    debitTotal: { type: 'number' },
                    creditTotal: { type: 'number' }
                },
                required: ['accountId', 'accountName', 'accountCode', 'balance']
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'System', description: 'System health and status endpoints' },
            { name: 'Authentication', description: 'User authentication and registration' },
            { name: 'Companies', description: 'Company and workspace management' },
            { name: 'Accounting', description: 'Chart of accounts and account type management' },
            { name: 'Dashboard', description: 'Dashboard data and analytics including financial metrics, revenue sources, and trends' },
            { name: 'Banking', description: 'Bank accounts, transactions, and payments' },
            { name: 'Journal', description: 'Journal entries, general ledger, and trial balance' },
            { name: 'Transactions', description: 'Transaction management and processing' },
            { name: 'Sales', description: 'Sales management including customers, invoices, estimates, and recurring invoices' },
            { name: 'Purchases', description: 'Purchase management including vendors and bills' },
            { name: 'Inventory', description: 'Inventory management including products and movements' },
            { name: 'Documents', description: 'Document management, sharing, workflows, and AI analysis' },
            { name: 'AI', description: 'AI-powered document analysis and automation' },
            { name: 'Workflows', description: 'Document workflow and approval management' },
            { name: 'Security', description: 'Document access control and security' },
            { name: 'Compliance', description: 'Regulatory compliance and auditing' },
            { name: 'Tax', description: 'Tax rates and calculation' },
            { name: 'Analytics', description: 'Document analytics and reporting' },
            { name: 'Reports', description: 'Advanced Financial Reporting Suite endpoints' },
            { name: 'Bank Feeds', description: 'Real-time bank feeds and reconciliation endpoints' },
            { name: 'Enhanced Conversational AI', description: 'AI-powered conversational interface for transaction processing' },
            { name: 'Enhanced Bank Integration', description: 'AI-powered real-time bank feed processing and reconciliation' },
            { name: 'Enhanced Journal Management', description: 'AI-powered journal entry generation and advanced ledger management' },
            { name: 'Enhanced Financial Reports', description: 'AI-enhanced financial reporting with advanced analytics' },
            { name: 'Tax Management', description: 'Tax rates, calculations, and compliance management' }
        ],
        paths: {
            // System endpoints
            '/health': {
                get: {
                    summary: 'Health check',
                    tags: ['System'],
                    security: [],
                    responses: {
                        '200': {
                            description: 'System is healthy',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            status: { type: 'string' },
                                            timestamp: { type: 'string', format: 'date-time' },
                                            version: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // Authentication endpoints
            '/auth/login': {
                post: {
                    summary: 'User login',
                    tags: ['Authentication'],
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/LoginRequest' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Login successful',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/LoginResponse' }
                                }
                            }
                        },
                        '401': {
                            description: 'MFA challenge required or invalid credentials',
                            content: {
                                'application/json': {
                                    oneOf: [
                                        { $ref: '#/components/schemas/MfaLoginChallengeResponse' },
                                        { $ref: '#/components/schemas/Error' }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            '/auth/register': {
                post: {
                    summary: 'User registration',
                    tags: ['Authentication'],
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/RegisterRequest' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'User registered successfully',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/LoginResponse' }
                                }
                            }
                        },
                        '400': {
                            description: 'Invalid registration data',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Error' }
                                }
                            }
                        }
                    }
                }
            },
            // MFA endpoints
            '/auth/mfa/setup/start': {
                post: {
                    summary: 'Start MFA setup (returns secret and otpauth URI)',
                    tags: ['Authentication'],
                    parameters: [{ name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'MFA setup started', content: { 'application/json': { schema: { $ref: '#/components/schemas/MfaSetupStartResponse' } } } },
                        '401': { $ref: '#/components/responses/Unauthorized' }
                    }
                }
            },
            '/auth/mfa/setup/verify': {
                post: {
                    summary: 'Verify token and enable MFA, returns backup codes',
                    tags: ['Authentication'],
                    parameters: [{ name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] } } } },
                    responses: {
                        '200': { description: 'MFA enabled', content: { 'application/json': { schema: { $ref: '#/components/schemas/MfaEnableResponse' } } } },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '401': { $ref: '#/components/responses/Unauthorized' }
                    }
                }
            },
            '/auth/mfa/disable': {
                post: {
                    summary: 'Disable MFA (requires password)',
                    tags: ['Authentication'],
                    parameters: [{ name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { password: { type: 'string' } }, required: ['password'] } } } },
                    responses: {
                        '200': { description: 'MFA disabled' },
                        '401': { $ref: '#/components/responses/Unauthorized' }
                    }
                }
            },
            '/auth/mfa/backup/regenerate': {
                post: {
                    summary: 'Regenerate backup codes',
                    tags: ['Authentication'],
                    parameters: [{ name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Backup codes regenerated', content: { 'application/json': { schema: { $ref: '#/components/schemas/MfaEnableResponse' } } } },
                        '401': { $ref: '#/components/responses/Unauthorized' }
                    }
                }
            },
            '/auth/mfa/login/verify': {
                post: {
                    summary: 'Verify MFA code or backup code to complete login',
                    tags: ['Authentication'],
                    security: [],
                    parameters: [{ name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { challengeToken: { type: 'string' }, code: { type: 'string' } }, required: ['challengeToken', 'code'] } } } },
                    responses: {
                        '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
                        '401': { $ref: '#/components/responses/Unauthorized' }
                    }
                }
            },
            // Company endpoints
            '/api/companies': {
                get: {
                    summary: 'List companies',
                    tags: ['Companies'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of companies',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Company' }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create company',
                    tags: ['Companies'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/CompanyCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Company created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Company' }
                                }
                            }
                        }
                    }
                }
            },
            // Approvals
            '/approvals/pending': {
                get: {
                    summary: 'List pending approvals for the authenticated user',
                    tags: ['Approvals'],
                    parameters: [
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { $ref: '#/components/parameters/CompanyIdHeader' },
                    ],
                    responses: {
                        '200': {
                            description: 'Pending approvals',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            approvals: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string' },
                                                        invoiceId: { type: 'string' },
                                                        invoiceNumber: { type: 'string' },
                                                        amount: { type: 'number' },
                                                        currency: { type: 'string' },
                                                        customerName: { type: 'string' },
                                                        dueDate: { type: 'string', format: 'date-time' },
                                                        submittedAt: { type: 'string', format: 'date-time' },
                                                        comments: { type: 'string' }
                                                    },
                                                    required: ['id', 'invoiceId', 'amount', 'currency']
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/Unauthorized' }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/approvals/{approvalId}/action': {
                post: {
                    summary: 'Process an approval action',
                    tags: ['Approvals'],
                    parameters: [
                        { name: 'approvalId', in: 'path', required: true, schema: { type: 'string' } },
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { $ref: '#/components/parameters/CompanyIdHeader' },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        action: { type: 'string', enum: ['approve', 'reject', 'escalate'] },
                                        comments: { type: 'string' },
                                        escalationReason: { type: 'string' }
                                    },
                                    required: ['action']
                                }
                            }
                        }
                    },
                    responses: {
                        '200': { description: 'Action processed' },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '401': { $ref: '#/components/responses/Unauthorized' }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/invoices/{invoiceId}/approval-status': {
                get: {
                    summary: 'Get approval status for an invoice',
                    tags: ['Approvals'],
                    parameters: [
                        { name: 'invoiceId', in: 'path', required: true, schema: { type: 'string' } },
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { $ref: '#/components/parameters/CompanyIdHeader' },
                    ],
                    responses: {
                        '200': {
                            description: 'Invoice approval status',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            invoiceStatus: { type: 'string' },
                                            approvals: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string' },
                                                        stepNumber: { type: 'integer' },
                                                        approver: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } } },
                                                        status: { type: 'string' },
                                                        comments: { type: 'string' },
                                                        createdAt: { type: 'string', format: 'date-time' },
                                                        processedAt: { type: 'string', format: 'date-time' },
                                                        workflow: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { $ref: '#/components/responses/Unauthorized' }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Invoices
            '/api/invoices': {
                get: {
                    summary: 'List invoices',
                    tags: ['Invoices'],
                    parameters: [
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { $ref: '#/components/parameters/CompanyIdHeader' },
                        { name: 'status', in: 'query', required: false, schema: { type: 'string' } },
                        { name: 'q', in: 'query', required: false, schema: { type: 'string' } },
                    ],
                    responses: {
                        '200': { description: 'List of invoices', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } } } } }
                    },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create invoice',
                    tags: ['Invoices'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceCreate' } } } },
                    responses: { '201': { description: 'Invoice created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/invoices/{id}': {
                get: {
                    summary: 'Get an invoice',
                    tags: ['Invoices'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Invoice', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update an invoice',
                    tags: ['Invoices'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceCreate' } } } },
                    responses: { '200': { description: 'Updated invoice', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete an invoice',
                    tags: ['Invoices'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Estimates
            '/api/estimates': {
                get: {
                    summary: 'List estimates',
                    tags: ['Estimates'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of estimates', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Estimate' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create estimate',
                    tags: ['Estimates'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EstimateCreate' } } } },
                    responses: { '201': { description: 'Estimate created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Estimate' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/estimates/{id}': {
                get: {
                    summary: 'Get an estimate',
                    tags: ['Estimates'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Estimate', content: { 'application/json': { schema: { $ref: '#/components/schemas/Estimate' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update an estimate',
                    tags: ['Estimates'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EstimateCreate' } } } },
                    responses: { '200': { description: 'Updated estimate', content: { 'application/json': { schema: { $ref: '#/components/schemas/Estimate' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete an estimate',
                    tags: ['Estimates'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Bills (Purchases)
            '/api/bills': {
                get: {
                    summary: 'List bills',
                    tags: ['Purchases'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of bills', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Bill' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create bill',
                    tags: ['Purchases'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BillCreate' } } } },
                    responses: { '201': { description: 'Bill created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Bill' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/bills/{id}': {
                get: {
                    summary: 'Get a bill',
                    tags: ['Purchases'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Bill', content: { 'application/json': { schema: { $ref: '#/components/schemas/Bill' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update a bill',
                    tags: ['Purchases'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BillCreate' } } } },
                    responses: { '200': { description: 'Updated bill', content: { 'application/json': { schema: { $ref: '#/components/schemas/Bill' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete a bill',
                    tags: ['Purchases'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Expenses
            '/api/expenses': {
                get: {
                    summary: 'List expenses',
                    tags: ['Purchases'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of expenses', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Expense' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create expense',
                    tags: ['Purchases'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ExpenseCreate' } } } },
                    responses: { '201': { description: 'Expense created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Expense' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/expenses/{id}': {
                get: {
                    summary: 'Get an expense',
                    tags: ['Purchases'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Expense', content: { 'application/json': { schema: { $ref: '#/components/schemas/Expense' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update an expense',
                    tags: ['Purchases'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ExpenseCreate' } } } },
                    responses: { '200': { description: 'Updated expense', content: { 'application/json': { schema: { $ref: '#/components/schemas/Expense' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete an expense',
                    tags: ['Purchases'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Purchase Orders
            '/api/purchase-orders': {
                get: {
                    summary: 'List purchase orders',
                    tags: ['Purchases'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of purchase orders', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PurchaseOrder' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create purchase order',
                    tags: ['Purchases'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchaseOrderCreate' } } } },
                    responses: { '201': { description: 'Purchase order created', content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchaseOrder' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/purchase-orders/{id}': {
                get: {
                    summary: 'Get a purchase order',
                    tags: ['Purchases'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Purchase order', content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchaseOrder' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update a purchase order',
                    tags: ['Purchases'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchaseOrderCreate' } } } },
                    responses: { '200': { description: 'Updated purchase order', content: { 'application/json': { schema: { $ref: '#/components/schemas/PurchaseOrder' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete a purchase order',
                    tags: ['Purchases'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Banking - Accounts
            '/api/bank-accounts': {
                get: {
                    summary: 'List bank accounts',
                    tags: ['Banking'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of bank accounts', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/BankAccount' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create bank account',
                    tags: ['Banking'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BankAccountCreate' } } } },
                    responses: { '201': { description: 'Bank account created', content: { 'application/json': { schema: { $ref: '#/components/schemas/BankAccount' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/bank-accounts/{id}': {
                get: {
                    summary: 'Get a bank account',
                    tags: ['Banking'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Bank account', content: { 'application/json': { schema: { $ref: '#/components/schemas/BankAccount' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update a bank account',
                    tags: ['Banking'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BankAccountCreate' } } } },
                    responses: { '200': { description: 'Updated bank account', content: { 'application/json': { schema: { $ref: '#/components/schemas/BankAccount' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete a bank account',
                    tags: ['Banking'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Banking - Transactions
            '/api/bank-transactions': {
                get: {
                    summary: 'List bank transactions',
                    tags: ['Banking'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of bank transactions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/BankTransaction' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create bank transaction (manual import)',
                    tags: ['Banking'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BankTransactionCreate' } } } },
                    responses: { '201': { description: 'Bank transaction created', content: { 'application/json': { schema: { $ref: '#/components/schemas/BankTransaction' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/bank-transactions/{id}': {
                get: {
                    summary: 'Get a bank transaction',
                    tags: ['Banking'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Bank transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/BankTransaction' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Banking - Payments
            '/api/payments': {
                get: {
                    summary: 'List payments',
                    tags: ['Banking'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of payments', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Payment' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create payment',
                    tags: ['Banking'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentCreate' } } } },
                    responses: { '201': { description: 'Payment created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/payments/{id}': {
                get: {
                    summary: 'Get a payment',
                    tags: ['Banking'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Payment', content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete a payment',
                    tags: ['Banking'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Tax endpoints
            '/api/tax/rates': {
                get: {
                    summary: 'List tax rates',
                    tags: ['Tax'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', schema: { type: 'string' } },
                        { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
                        { name: 'taxName', in: 'query', schema: { type: 'string' } },
                        { name: 'appliesTo', in: 'query', schema: { type: 'string', enum: ['products', 'services', 'all'] } },
                        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
                    ],
                    responses: {
                        '200': { description: 'List of tax rates' }
                    }
                },
                post: {
                    summary: 'Create tax rate',
                    tags: ['Tax'],
                    parameters: [{ name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { companyId: { type: 'string' }, taxName: { type: 'string' }, rate: { type: 'number', minimum: 0, maximum: 1 }, appliesTo: { type: 'string', enum: ['products', 'services', 'all'] }, isActive: { type: 'boolean' } }, required: ['companyId', 'taxName', 'rate'] } } } },
                    responses: { '201': { description: 'Created' } }
                }
            },
            // Journal
            '/api/journal': {
                get: {
                    summary: 'List journal entries',
                    tags: ['Journal'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of journal entries', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/JournalEntry' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create journal entry',
                    tags: ['Journal'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/JournalPost' } } } },
                    responses: { '201': { description: 'Journal entry created', content: { 'application/json': { schema: { $ref: '#/components/schemas/JournalEntry' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/journal/{id}': {
                get: {
                    summary: 'Get a journal entry',
                    tags: ['Journal'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Journal entry', content: { 'application/json': { schema: { $ref: '#/components/schemas/JournalEntry' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/journal/trial-balance': {
                get: {
                    summary: 'Trial balance',
                    tags: ['Journal'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Trial balance', content: { 'application/json': { schema: { $ref: '#/components/schemas/TrialBalance' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/journal/general-ledger': {
                get: {
                    summary: 'General ledger',
                    tags: ['Journal'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'General ledger', content: { 'application/json': { schema: { $ref: '#/components/schemas/GeneralLedger' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Dashboard API
            '/api/ai/insights': {
                get: {
                    summary: 'Get AI Insights (Test Endpoint)',
                    description: 'Simple test endpoint for AI insights functionality',
                    tags: ['AI'],
                    parameters: [
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' }, description: 'Company identifier' }
                    ],
                    responses: {
                        '200': {
                            description: 'AI insights test data retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { type: 'string', description: 'Success message' },
                                            companyId: { type: 'string', description: 'Company identifier' },
                                            tenantId: { type: 'string', description: 'Tenant identifier' },
                                            timestamp: { type: 'string', format: 'date-time', description: 'Response timestamp' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'Bad request - missing required parameters',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '401': {
                            description: 'Unauthorized - invalid or missing authentication',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/ai-insights/dashboard': {
                get: {
                    summary: 'Get AI Insights Dashboard Data',
                    description: 'Get comprehensive AI insights including health score, predictions, anomalies, and recommendations',
                    tags: ['AI'],
                    parameters: [
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' }, description: 'Company identifier' }
                    ],
                    responses: {
                        '200': {
                            description: 'AI insights data retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            healthScore: {
                                                type: 'object',
                                                properties: {
                                                    score: { type: 'number', description: 'Financial health score (0-100)' },
                                                    paymentRate: { type: 'number', description: 'Payment rate percentage' },
                                                    profitMargin: { type: 'number', description: 'Profit margin percentage' },
                                                    revenueGrowth: { type: 'number', description: 'Revenue growth percentage' },
                                                    overduePercentage: { type: 'number', description: 'Overdue invoices percentage' },
                                                    totalRevenue: { type: 'number', description: 'Total revenue' },
                                                    totalExpenses: { type: 'number', description: 'Total expenses' },
                                                    profit: { type: 'number', description: 'Net profit' }
                                                }
                                            },
                                            aiMetrics: {
                                                type: 'object',
                                                properties: {
                                                    predictionAccuracy: { type: 'number', description: 'AI prediction accuracy percentage' },
                                                    anomaliesDetected: { type: 'integer', description: 'Number of anomalies detected' },
                                                    activeRecommendations: { type: 'integer', description: 'Number of active recommendations' },
                                                    goalsOnTrack: { type: 'string', description: 'Goals on track status' },
                                                    transactionsAnalyzed: { type: 'integer', description: 'Number of transactions analyzed' }
                                                }
                                            },
                                            revenuePredictions: {
                                                type: 'object',
                                                properties: {
                                                    nextMonth: {
                                                        type: 'object',
                                                        properties: {
                                                            amount: { type: 'number', description: 'Predicted revenue amount' },
                                                            confidence: { type: 'number', description: 'Prediction confidence percentage' },
                                                            change: { type: 'number', description: 'Expected change percentage' }
                                                        }
                                                    },
                                                    nextQuarter: {
                                                        type: 'object',
                                                        properties: {
                                                            amount: { type: 'number', description: 'Predicted revenue amount' },
                                                            confidence: { type: 'number', description: 'Prediction confidence percentage' }
                                                        }
                                                    },
                                                    nextYear: {
                                                        type: 'object',
                                                        properties: {
                                                            amount: { type: 'number', description: 'Predicted revenue amount' },
                                                            confidence: { type: 'number', description: 'Prediction confidence percentage' }
                                                        }
                                                    },
                                                    seasonalTrends: {
                                                        type: 'object',
                                                        properties: {
                                                            peakSeason: { type: 'string', description: 'Peak season period' },
                                                            lowSeason: { type: 'string', description: 'Low season period' },
                                                            peakIncrease: { type: 'number', description: 'Peak season increase percentage' },
                                                            lowDecrease: { type: 'number', description: 'Low season decrease percentage' }
                                                        }
                                                    }
                                                }
                                            },
                                            cashFlowPredictions: {
                                                type: 'object',
                                                properties: {
                                                    currentPosition: { type: 'number', description: 'Current cash position' },
                                                    expectedInflows: { type: 'number', description: 'Expected cash inflows' },
                                                    expectedOutflows: { type: 'number', description: 'Expected cash outflows' },
                                                    netCashFlow: { type: 'number', description: 'Net cash flow' },
                                                    status: { type: 'string', description: 'Cash flow status' }
                                                }
                                            },
                                            anomalies: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string', description: 'Anomaly ID' },
                                                        type: { type: 'string', description: 'Anomaly type' },
                                                        description: { type: 'string', description: 'Anomaly description' },
                                                        severity: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Anomaly severity' },
                                                        date: { type: 'string', format: 'date', description: 'Anomaly date' },
                                                        amount: { type: 'string', description: 'Anomaly amount' },
                                                        suggestion: { type: 'string', description: 'Suggested action' },
                                                        confidence: { type: 'number', description: 'Confidence score' }
                                                    }
                                                }
                                            },
                                            recommendations: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        category: { type: 'string', description: 'Recommendation category' },
                                                        title: { type: 'string', description: 'Recommendation title' },
                                                        description: { type: 'string', description: 'Recommendation description' },
                                                        impact: { type: 'string', enum: ['High', 'Medium', 'Low'], description: 'Impact level' },
                                                        effort: { type: 'string', enum: ['High', 'Medium', 'Low'], description: 'Effort required' },
                                                        savings: { type: 'string', description: 'Potential savings' }
                                                    }
                                                }
                                            },
                                            taxOptimization: {
                                                type: 'object',
                                                properties: {
                                                    currentTaxRate: { type: 'number', description: 'Current tax rate percentage' },
                                                    potentialSavings: { type: 'number', description: 'Potential tax savings' },
                                                    strategies: {
                                                        type: 'array',
                                                        items: {
                                                            type: 'object',
                                                            properties: {
                                                                strategy: { type: 'string', description: 'Strategy name' },
                                                                description: { type: 'string', description: 'Strategy description' },
                                                                impact: { type: 'string', enum: ['High', 'Medium', 'Low'], description: 'Impact level' },
                                                                savings: { type: 'number', description: 'Potential savings amount' },
                                                                deadline: { type: 'string', description: 'Strategy deadline' }
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            performanceInsights: {
                                                type: 'object',
                                                properties: {
                                                    profitMargin: { type: 'number', description: 'Profit margin percentage' },
                                                    customerAcquisitionCost: { type: 'string', description: 'Customer acquisition cost status' },
                                                    averageCollectionPeriod: { type: 'string', description: 'Average collection period' },
                                                    inventoryTurnover: { type: 'string', description: 'Inventory turnover status' },
                                                    industryGrowthRate: { type: 'number', description: 'Industry growth rate percentage' },
                                                    yourGrowthRate: { type: 'number', description: 'Your growth rate percentage' },
                                                    competitivePosition: { type: 'string', description: 'Competitive position' }
                                                }
                                            },
                                            generatedAt: { type: 'string', format: 'date-time', description: 'Data generation timestamp' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'Bad request - missing required parameters',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '401': {
                            description: 'Unauthorized - invalid or missing authentication',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '500': {
                            description: 'Internal server error',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/ai-insights/generate': {
                post: {
                    summary: 'Generate AI Insights',
                    description: 'Generate specific AI insights based on insight type',
                    tags: ['AI'],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        companyId: { type: 'string', description: 'Company identifier' },
                                        insightType: {
                                            type: 'string',
                                            enum: ['financial_anomaly', 'trend_analysis', 'risk_assessment', 'optimization', 'forecasting'],
                                            description: 'Type of insight to generate'
                                        }
                                    },
                                    required: ['companyId', 'insightType']
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'AI insights generated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { type: 'object' },
                                            message: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'Bad request - missing required parameters',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '401': {
                            description: 'Unauthorized - invalid or missing authentication',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '500': {
                            description: 'Internal server error',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/dashboard': {
                get: {
                    summary: 'Get Dashboard Data',
                    description: 'Get comprehensive dashboard data including financial metrics, revenue sources, recent activity, and trends',
                    tags: ['Dashboard'],
                    parameters: [
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' }, description: 'Company identifier' },
                        { name: 'period', in: 'query', required: false, schema: { type: 'integer', default: 30 }, description: 'Period in days (default: 30)' }
                    ],
                    responses: {
                        '200': {
                            description: 'Dashboard data retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            metrics: {
                                                type: 'object',
                                                properties: {
                                                    totalRevenue: { type: 'number', description: 'Total revenue for the period' },
                                                    totalExpenses: { type: 'number', description: 'Total expenses for the period' },
                                                    netProfit: { type: 'number', description: 'Net profit (revenue - expenses)' },
                                                    profitMargin: { type: 'number', description: 'Profit margin percentage' },
                                                    pendingInvoices: { type: 'number', description: 'Total amount of pending invoices' },
                                                    overdueInvoices: { type: 'number', description: 'Total amount of overdue invoices' }
                                                }
                                            },
                                            changes: {
                                                type: 'object',
                                                properties: {
                                                    revenueChange: { type: 'number', description: 'Revenue change percentage' },
                                                    expenseChange: { type: 'number', description: 'Expense change percentage' },
                                                    profitChange: { type: 'number', description: 'Profit change percentage' }
                                                }
                                            },
                                            revenueSources: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        name: { type: 'string', description: 'Customer name' },
                                                        revenue: { type: 'number', description: 'Revenue amount' },
                                                        count: { type: 'integer', description: 'Number of invoices' },
                                                        percentage: { type: 'number', description: 'Percentage of total revenue' }
                                                    }
                                                }
                                            },
                                            recentActivity: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string', description: 'Activity ID' },
                                                        title: { type: 'string', description: 'Activity title' },
                                                        amount: { type: 'number', description: 'Activity amount' },
                                                        type: { type: 'string', description: 'Activity type' },
                                                        timestamp: { type: 'string', format: 'date-time', description: 'Activity timestamp' }
                                                    }
                                                }
                                            },
                                            monthlyTrends: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        month: { type: 'string', description: 'Month name' },
                                                        revenue: { type: 'number', description: 'Monthly revenue' },
                                                        expenses: { type: 'number', description: 'Monthly expenses' },
                                                        profit: { type: 'number', description: 'Monthly profit' }
                                                    }
                                                }
                                            },
                                            generatedAt: { type: 'string', format: 'date-time', description: 'Data generation timestamp' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'Bad request - missing required parameters',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '401': {
                            description: 'Unauthorized - invalid or missing authentication',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '500': {
                            description: 'Internal server error',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Accounting Overview
            '/api/accounting/overview': {
                get: {
                    summary: 'Accounting overview dashboard',
                    description: 'Get comprehensive accounting overview with real-time metrics, health checks, and activity feed',
                    tags: ['Accounting'],
                    parameters: [
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' }, description: 'Company identifier' }
                    ],
                    responses: {
                        '200': {
                            description: 'Accounting overview data',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            metrics: {
                                                type: 'object',
                                                properties: {
                                                    assets: { type: 'number', description: 'Total assets value' },
                                                    netIncome: { type: 'number', description: 'Net income amount' },
                                                    journalEntries: { type: 'number', description: 'Total journal entries count' },
                                                    balanceOk: { type: 'boolean', description: 'Whether trial balance is balanced' }
                                                }
                                            },
                                            health: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        label: { type: 'string' },
                                                        value: { type: 'number' },
                                                        status: { type: 'string', enum: ['ok', 'warn', 'due'] },
                                                        description: { type: 'string' }
                                                    }
                                                }
                                            },
                                            summary: {
                                                type: 'object',
                                                properties: {
                                                    revenue: { type: 'number' },
                                                    expenses: { type: 'number' },
                                                    profit: { type: 'number' },
                                                    netIncome: { type: 'number' }
                                                }
                                            },
                                            activity: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string' },
                                                        icon: { type: 'string' },
                                                        title: { type: 'string' },
                                                        detail: { type: 'string' },
                                                        minutesAgo: { type: 'number' }
                                                    }
                                                }
                                            },
                                            tasks: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        label: { type: 'string' },
                                                        count: { type: 'number' },
                                                        variant: { type: 'string' }
                                                    }
                                                }
                                            },
                                            generatedAt: { type: 'string', format: 'date-time' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { description: 'Bad request - companyId required' },
                        '500': { description: 'Internal server error' }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Tax
            '/api/tax/rates': {
                get: {
                    summary: 'List tax rates',
                    tags: ['Tax'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of tax rates', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TaxRate' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create tax rate',
                    tags: ['Tax'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxRateCreate' } } } },
                    responses: { '201': { description: 'Tax rate created', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxRate' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/tax/rates/{id}': {
                put: {
                    summary: 'Update tax rate',
                    tags: ['Tax'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxRateCreate' } } } },
                    responses: { '200': { description: 'Updated tax rate', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxRate' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete tax rate',
                    tags: ['Tax'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/tax/calculate': {
                post: {
                    summary: 'Calculate tax totals for line items',
                    tags: ['Tax'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxCalculateRequest' } } } },
                    responses: { '200': { description: 'Calculated totals', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxCalculateResponse' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Inventory
            '/api/products': {
                get: {
                    summary: 'List products',
                    tags: ['Inventory'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of products', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create product',
                    tags: ['Inventory'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
                    responses: { '201': { description: 'Product created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/products/{id}': {
                get: {
                    summary: 'Get a product',
                    tags: ['Inventory'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Product', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update a product',
                    tags: ['Inventory'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
                    responses: { '200': { description: 'Updated product', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete a product',
                    tags: ['Inventory'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/locations': {
                get: {
                    summary: 'List locations',
                    description: 'Get all locations for a company',
                    tags: ['Inventory'],
                    parameters: [
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { $ref: '#/components/parameters/CompanyIdHeader' }
                    ],
                    responses: {
                        '200': {
                            description: 'List of locations',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Location' }
                                    }
                                }
                            }
                        },
                        '401': {
                            description: 'Unauthorized',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create location',
                    description: 'Create a new location for a company',
                    tags: ['Inventory'],
                    parameters: [
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { $ref: '#/components/parameters/CompanyIdHeader' }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/LocationCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Location created successfully',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Location' }
                                }
                            }
                        },
                        '400': {
                            description: 'Bad request - validation error',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '401': {
                            description: 'Unauthorized',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/locations/{id}': {
                get: {
                    summary: 'Get location',
                    description: 'Get a specific location by ID',
                    tags: ['Inventory'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Location ID' },
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { $ref: '#/components/parameters/CompanyIdHeader' }
                    ],
                    responses: {
                        '200': {
                            description: 'Location details',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Location' }
                                }
                            }
                        },
                        '404': {
                            description: 'Location not found',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '401': {
                            description: 'Unauthorized',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update location',
                    description: 'Update an existing location',
                    tags: ['Inventory'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Location ID' },
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { $ref: '#/components/parameters/CompanyIdHeader' }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/LocationUpdate' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Location updated successfully',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Location' }
                                }
                            }
                        },
                        '400': {
                            description: 'Bad request - validation error',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '404': {
                            description: 'Location not found',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '401': {
                            description: 'Unauthorized',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete location',
                    description: 'Delete a location',
                    tags: ['Inventory'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Location ID' },
                        { $ref: '#/components/parameters/TenantIdHeader' },
                        { $ref: '#/components/parameters/CompanyIdHeader' }
                    ],
                    responses: {
                        '204': {
                            description: 'Location deleted successfully'
                        },
                        '404': {
                            description: 'Location not found',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        },
                        '401': {
                            description: 'Unauthorized',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ErrorResponse' }
                                }
                            }
                        }
                    },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/inventory/movements': {
                get: {
                    summary: 'List inventory movements',
                    tags: ['Inventory'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of movements', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/InventoryMovement' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create inventory movement',
                    tags: ['Inventory'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryMovementCreate' } } } },
                    responses: { '201': { description: 'Movement created', content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryMovement' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/inventory/movements/{id}': {
                get: {
                    summary: 'Get an inventory movement',
                    tags: ['Inventory'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Movement', content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryMovement' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Compliance
            '/api/compliance/checks': {
                get: {
                    summary: 'List compliance checks',
                    tags: ['Compliance'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of compliance checks', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ComplianceCheck' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create compliance check',
                    tags: ['Compliance'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ComplianceCheckCreate' } } } },
                    responses: { '201': { description: 'Compliance check created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ComplianceCheck' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/compliance/checks/{id}': {
                get: {
                    summary: 'Get a compliance check',
                    tags: ['Compliance'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Compliance check', content: { 'application/json': { schema: { $ref: '#/components/schemas/ComplianceCheck' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Analytics
            '/analytics/documents': {
                get: {
                    summary: 'Document analytics overview',
                    tags: ['Analytics'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Analytics data', content: { 'application/json': { schema: { $ref: '#/components/schemas/DocumentAnalytics' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Workspaces
            '/api/workspaces': {
                get: {
                    summary: 'List workspaces',
                    tags: ['Companies'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }],
                    responses: { '200': { description: 'List of workspaces', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Company' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create workspace',
                    tags: ['Companies'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CompanyCreate' } } } },
                    responses: { '201': { description: 'Workspace created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Company' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/workspaces/{id}': {
                get: {
                    summary: 'Get a workspace',
                    tags: ['Companies'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }],
                    responses: { '200': { description: 'Workspace', content: { 'application/json': { schema: { $ref: '#/components/schemas/Company' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update a workspace',
                    tags: ['Companies'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CompanyCreate' } } } },
                    responses: { '200': { description: 'Updated workspace', content: { 'application/json': { schema: { $ref: '#/components/schemas/Company' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete a workspace',
                    tags: ['Companies'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Mappings
            '/api/mappings': {
                get: {
                    summary: 'List data mappings',
                    tags: ['Analytics'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Mappings list', content: { 'application/json': { schema: { type: 'array', items: { type: 'object' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create data mapping',
                    tags: ['Analytics'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
                    responses: { '201': { description: 'Mapping created' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/mappings/{id}': {
                get: {
                    summary: 'Get a mapping',
                    tags: ['Analytics'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Mapping', content: { 'application/json': { schema: { type: 'object' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update a mapping',
                    tags: ['Analytics'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
                    responses: { '200': { description: 'Updated mapping', content: { 'application/json': { schema: { type: 'object' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete a mapping',
                    tags: ['Analytics'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Collaboration
            '/api/collaboration/comments': {
                get: {
                    summary: 'List comments',
                    tags: ['Workflows'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Comments list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Comment' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Add a comment',
                    tags: ['Workflows'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CommentCreate' } } } },
                    responses: { '201': { description: 'Comment created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Comment' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/collaboration/comments/{id}': {
                delete: {
                    summary: 'Delete a comment',
                    tags: ['Workflows'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/collaboration/shares': {
                post: {
                    summary: 'Share a document/resource',
                    tags: ['Workflows'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ShareCreate' } } } },
                    responses: { '201': { description: 'Share created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Share' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // AI Core
            '/ai/chat': {
                post: {
                    summary: 'AI chat interaction',
                    tags: ['AI'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AIChatRequest' } } } },
                    responses: { '200': { description: 'AI response', content: { 'application/json': { schema: { $ref: '#/components/schemas/AIChatResponse' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/ai/insights': {
                get: {
                    summary: 'AI financial insights',
                    tags: ['AI'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Insights', content: { 'application/json': { schema: { type: 'object' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/ai/config': {
                get: {
                    summary: 'Get AI configuration',
                    tags: ['AI'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }],
                    responses: { '200': { description: 'AI config', content: { 'application/json': { schema: { $ref: '#/components/schemas/AIConfig' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update AI configuration',
                    tags: ['AI'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AIConfig' } } } },
                    responses: { '200': { description: 'Updated config' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Documents
            '/api/documents': {
                get: {
                    summary: 'List documents',
                    tags: ['Documents'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'List of documents', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Document' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create document (metadata)',
                    tags: ['Documents'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DocumentCreate' } } } },
                    responses: { '201': { description: 'Document created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Document' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/documents/{id}': {
                get: {
                    summary: 'Get a document',
                    tags: ['Documents'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Document', content: { 'application/json': { schema: { $ref: '#/components/schemas/Document' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                put: {
                    summary: 'Update a document (metadata)',
                    tags: ['Documents'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DocumentUpdate' } } } },
                    responses: { '200': { description: 'Updated document', content: { 'application/json': { schema: { $ref: '#/components/schemas/Document' } } } } },
                    security: [{ bearerAuth: [] }]
                },
                delete: {
                    summary: 'Delete a document',
                    tags: ['Documents'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '204': { description: 'Deleted' } },
                    security: [{ bearerAuth: [] }]
                }
            },
            // Financial Reports (basic)
            '/api/reports': {
                get: {
                    summary: 'List reports',
                    tags: ['Reports'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Reports list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FinancialReport' } } } } } },
                    security: [{ bearerAuth: [] }]
                },
                post: {
                    summary: 'Create report',
                    tags: ['Reports'],
                    parameters: [{ $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
                    responses: { '201': { description: 'Report created', content: { 'application/json': { schema: { $ref: '#/components/schemas/FinancialReport' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/reports/{id}': {
                get: {
                    summary: 'Get a report',
                    tags: ['Reports'],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/TenantIdHeader' }, { $ref: '#/components/parameters/CompanyIdHeader' }],
                    responses: { '200': { description: 'Report', content: { 'application/json': { schema: { $ref: '#/components/schemas/FinancialReport' } } } } },
                    security: [{ bearerAuth: [] }]
                }
            },
            '/api/tax/rates/{id}': {
                put: {
                    summary: 'Update tax rate',
                    tags: ['Tax'],
                    parameters: [{ name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { taxName: { type: 'string' }, rate: { type: 'number', minimum: 0, maximum: 1 }, appliesTo: { type: 'string', enum: ['products', 'services', 'all'] }, isActive: { type: 'boolean' } } } } } },
                    responses: { '200': { description: 'Updated' } }
                },
                delete: {
                    summary: 'Delete tax rate',
                    tags: ['Tax'],
                    parameters: [{ name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }, { name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { '200': { description: 'Deleted' } }
                }
            },
            '/api/tax/calculate': {
                post: {
                    summary: 'Calculate taxes for a set of lines',
                    tags: ['Tax'],
                    parameters: [{ name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { companyId: { type: 'string' }, currency: { type: 'string' }, applyCompound: { type: 'boolean' }, lines: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, description: { type: 'string' }, type: { type: 'string' }, amount: { type: 'number' }, taxExclusive: { type: 'boolean' }, manualRate: { type: 'number' } }, required: ['amount'] } } }, required: ['companyId', 'lines'] } } } },
                    responses: {
                        '200': { description: 'Tax calculation result', content: { 'application/json': { schema: { type: 'object', properties: { currency: { type: 'string' }, totalTax: { type: 'number' }, totalAmount: { type: 'number' }, lines: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, amount: { type: 'number' }, taxAmount: { type: 'number' }, effectiveRate: { type: 'number' } } } } } } } } }
                    }
                }
            },
            '/api/companies/{id}': {
                get: {
                    summary: 'Get company by ID',
                    tags: ['Companies'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Company details',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Company' }
                                }
                            }
                        }
                    }
                },
                put: {
                    summary: 'Update company',
                    tags: ['Companies'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/CompanyCreate' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Company updated',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Company' }
                                }
                            }
                        }
                    }
                },
                delete: {
                    summary: 'Delete company',
                    tags: ['Companies'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '204': {
                            description: 'Company deleted'
                        }
                    }
                }
            },
            // Document Management Endpoints
            '/api/documents': {
                get: {
                    summary: 'List documents with filtering and pagination',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', schema: { type: 'string' } },
                        { name: 'search', in: 'query', schema: { type: 'string' } },
                        { name: 'category', in: 'query', schema: { type: 'string' } },
                        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'deleted'] } },
                        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of documents',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            documents: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Document' }
                                            },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/documents/upload': {
                post: {
                    summary: 'Upload new document',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'multipart/form-data': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        file: { type: 'string', format: 'binary' },
                                        displayName: { type: 'string' },
                                        description: { type: 'string' },
                                        categoryId: { type: 'string' },
                                        workspaceId: { type: 'string' },
                                        companyId: { type: 'string' }
                                    },
                                    required: ['file']
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Document uploaded successfully',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Document' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/documents/{id}': {
                get: {
                    summary: 'Get document by ID',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Document details',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Document' }
                                }
                            }
                        }
                    }
                },
                put: {
                    summary: 'Update document',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/DocumentUpdate' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Document updated',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Document' }
                                }
                            }
                        }
                    }
                },
                delete: {
                    summary: 'Delete document',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '204': {
                            description: 'Document deleted'
                        }
                    }
                }
            },
            '/api/documents/{id}/download': {
                get: {
                    summary: 'Download document',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Document file',
                            content: {
                                'application/octet-stream': {
                                    schema: { type: 'string', format: 'binary' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/documents/{id}/preview': {
                get: {
                    summary: 'Get document preview',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Document preview',
                            content: {
                                'text/html': {
                                    schema: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/documents/{id}/analyze': {
                post: {
                    summary: 'Analyze document with AI',
                    tags: ['AI'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/DocumentAnalysisRequest' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Analysis started',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/DocumentAnalysisResult' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/documents/{id}/workflows': {
                get: {
                    summary: 'Get document workflows',
                    tags: ['Workflows'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Document workflows',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/DocumentWorkflow' }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create document workflow',
                    tags: ['Workflows'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/DocumentWorkflowCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Workflow created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/DocumentWorkflow' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/documents/{id}/access-control': {
                get: {
                    summary: 'Get document access control',
                    tags: ['Security'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Access control settings',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/DocumentAccessControl' }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Set document access control',
                    tags: ['Security'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/DocumentAccessControlCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Access control set',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/DocumentAccessControl' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/documents/{id}/webhooks': {
                get: {
                    summary: 'Get document webhooks',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Document webhooks',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/DocumentWebhook' }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create document webhook',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/DocumentWebhookCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Webhook created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/DocumentWebhook' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/documents/{id}/compliance': {
                get: {
                    summary: 'Get document compliance checks',
                    tags: ['Compliance'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Compliance checks',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/ComplianceCheck' }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Run compliance check',
                    tags: ['Compliance'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ComplianceCheckCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Compliance check started',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ComplianceCheck' }
                                }
                            }
                        }
                    }
                }
            },
            // Document Categories
            '/api/documents/categories': {
                get: {
                    summary: 'List document categories',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of categories',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/DocumentCategory' }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create document category',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/DocumentCategoryCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Category created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/DocumentCategory' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/documents/categories/{id}': {
                put: {
                    summary: 'Update document category',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/DocumentCategoryUpdate' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Category updated',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/DocumentCategory' }
                                }
                            }
                        }
                    }
                },
                delete: {
                    summary: 'Delete document category',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '204': {
                            description: 'Category deleted'
                        }
                    }
                }
            },
            // Document Analytics and Stats
            '/api/documents/stats': {
                get: {
                    summary: 'Get document statistics',
                    tags: ['Analytics'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Document statistics',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/DocumentStats' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/documents/analytics': {
                get: {
                    summary: 'Get document analytics',
                    tags: ['Analytics'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', schema: { type: 'string' } },
                        { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
                        { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Document analytics',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/DocumentAnalytics' }
                                }
                            }
                        }
                    }
                }
            },
            // Bulk Operations
            '/api/documents/bulk': {
                put: {
                    summary: 'Bulk update documents',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/DocumentBulkUpdate' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Bulk update completed',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/BulkOperationResult' }
                                }
                            }
                        }
                    }
                },
                delete: {
                    summary: 'Bulk delete documents',
                    tags: ['Documents'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        documentIds: {
                                            type: 'array',
                                            items: { type: 'string' }
                                        }
                                    },
                                    required: ['documentIds']
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Bulk delete completed',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/BulkOperationResult' }
                                }
                            }
                        }
                    }
                }
            },
            // Accounting Endpoints
            '/account-types': {
                get: {
                    summary: 'List account types',
                    tags: ['Accounting'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of account types',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                code: { type: 'string' },
                                                name: { type: 'string' },
                                                description: { type: 'string' },
                                                normalBalance: { type: 'string', enum: ['debit', 'credit'] },
                                                category: { type: 'string' },
                                                companyId: { type: 'string' },
                                                tenantId: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create account type',
                    tags: ['Accounting'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        code: { type: 'string' },
                                        name: { type: 'string' },
                                        description: { type: 'string' },
                                        normalBalance: { type: 'string', enum: ['debit', 'credit'] },
                                        category: { type: 'string' },
                                        companyId: { type: 'string' }
                                    },
                                    required: ['code', 'name', 'normalBalance']
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Account type created',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            code: { type: 'string' },
                                            name: { type: 'string' },
                                            description: { type: 'string' },
                                            normalBalance: { type: 'string' },
                                            category: { type: 'string' },
                                            companyId: { type: 'string' },
                                            tenantId: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/account-types/{id}': {
                put: {
                    summary: 'Update account type',
                    tags: ['Accounting'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        code: { type: 'string' },
                                        name: { type: 'string' },
                                        description: { type: 'string' },
                                        normalBalance: { type: 'string', enum: ['debit', 'credit'] },
                                        category: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Account type updated',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            code: { type: 'string' },
                                            name: { type: 'string' },
                                            description: { type: 'string' },
                                            normalBalance: { type: 'string' },
                                            category: { type: 'string' },
                                            companyId: { type: 'string' },
                                            tenantId: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                delete: {
                    summary: 'Delete account type',
                    tags: ['Accounting'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '204': {
                            description: 'Account type deleted'
                        }
                    }
                }
            },
            '/accounts': {
                get: {
                    summary: 'List accounts',
                    tags: ['Accounting'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', schema: { type: 'string' } },
                        { name: 'accountTypeId', in: 'query', schema: { type: 'string' } },
                        { name: 'isActive', in: 'query', schema: { type: 'boolean' } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of accounts',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                code: { type: 'string' },
                                                name: { type: 'string' },
                                                description: { type: 'string' },
                                                accountTypeId: { type: 'string' },
                                                accountType: { type: 'string' },
                                                parentId: { type: 'string' },
                                                isActive: { type: 'boolean' },
                                                companyId: { type: 'string' },
                                                tenantId: { type: 'string' },
                                                children: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/Account' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create account',
                    tags: ['Accounting'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        code: { type: 'string' },
                                        name: { type: 'string' },
                                        description: { type: 'string' },
                                        accountTypeId: { type: 'string' },
                                        parentId: { type: 'string' },
                                        isActive: { type: 'boolean', default: true },
                                        companyId: { type: 'string' }
                                    },
                                    required: ['code', 'name', 'accountTypeId', 'companyId']
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Account created',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            code: { type: 'string' },
                                            name: { type: 'string' },
                                            description: { type: 'string' },
                                            accountTypeId: { type: 'string' },
                                            accountType: { type: 'string' },
                                            parentId: { type: 'string' },
                                            isActive: { type: 'boolean' },
                                            companyId: { type: 'string' },
                                            tenantId: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/accounts/summary': {
                get: {
                    summary: 'Get accounts summary',
                    tags: ['Accounting'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Accounts summary',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            totalAccounts: { type: 'integer' },
                                            activeAccounts: { type: 'integer' },
                                            totalAccountTypes: { type: 'integer' },
                                            maxDepth: { type: 'integer' },
                                            lastUpdated: { type: 'string', format: 'date-time' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/accounts/{id}': {
                get: {
                    summary: 'Get account by ID',
                    tags: ['Accounting'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Account details',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            code: { type: 'string' },
                                            name: { type: 'string' },
                                            description: { type: 'string' },
                                            accountTypeId: { type: 'string' },
                                            accountType: { type: 'string' },
                                            parentId: { type: 'string' },
                                            isActive: { type: 'boolean' },
                                            companyId: { type: 'string' },
                                            tenantId: { type: 'string' },
                                            children: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Account' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                put: {
                    summary: 'Update account',
                    tags: ['Accounting'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        code: { type: 'string' },
                                        name: { type: 'string' },
                                        description: { type: 'string' },
                                        accountTypeId: { type: 'string' },
                                        parentId: { type: 'string' },
                                        isActive: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Account updated',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            code: { type: 'string' },
                                            name: { type: 'string' },
                                            description: { type: 'string' },
                                            accountTypeId: { type: 'string' },
                                            accountType: { type: 'string' },
                                            parentId: { type: 'string' },
                                            isActive: { type: 'boolean' },
                                            companyId: { type: 'string' },
                                            tenantId: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // Banking Endpoints
            '/api/bank-accounts': {
                get: {
                    summary: 'List bank accounts',
                    tags: ['Banking'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of bank accounts',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                bankName: { type: 'string' },
                                                accountNumber: { type: 'string' },
                                                accountType: { type: 'string' },
                                                currency: { type: 'string' },
                                                balance: { type: 'number' },
                                                status: { type: 'string' },
                                                companyId: { type: 'string' },
                                                tenantId: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create bank account',
                    tags: ['Banking'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        bankName: { type: 'string' },
                                        accountNumber: { type: 'string' },
                                        accountType: { type: 'string' },
                                        currency: { type: 'string' },
                                        companyId: { type: 'string' }
                                    },
                                    required: ['bankName', 'accountNumber', 'companyId']
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Bank account created',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            bankName: { type: 'string' },
                                            accountNumber: { type: 'string' },
                                            accountType: { type: 'string' },
                                            currency: { type: 'string' },
                                            balance: { type: 'number' },
                                            status: { type: 'string' },
                                            companyId: { type: 'string' },
                                            tenantId: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/payments': {
                post: {
                    summary: 'Create payment',
                    tags: ['Banking'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        companyId: { type: 'string' },
                                        transactionId: { type: 'string' },
                                        bankAccountId: { type: 'string' },
                                        method: { type: 'string' },
                                        reference: { type: 'string' },
                                        amount: { type: 'number' },
                                        paymentDate: { type: 'string', format: 'date' },
                                        fxGainLoss: { type: 'number' },
                                        applications: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    invoiceId: { type: 'string' },
                                                    billId: { type: 'string' },
                                                    amount: { type: 'number' }
                                                }
                                            }
                                        }
                                    },
                                    required: ['companyId', 'transactionId', 'bankAccountId', 'method', 'amount', 'paymentDate']
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Payment created',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            amount: { type: 'number' },
                                            method: { type: 'string' },
                                            reference: { type: 'string' },
                                            paymentDate: { type: 'string', format: 'date' },
                                            description: { type: 'string' },
                                            companyId: { type: 'string' },
                                            transactionId: { type: 'string' },
                                            bankAccountId: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // Sales Endpoints
            '/api/customers': {
                get: {
                    summary: 'List customers',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                        { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
                        { name: 'q', in: 'query', schema: { type: 'string', description: 'Search query for name or email' } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of customers with pagination',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            items: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Customer' }
                                            },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create customer',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/CustomerCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Customer created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Customer' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/invoices/next-number': {
                get: {
                    summary: 'Get next invoice number',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Next invoice number',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            nextNumber: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/invoices/{id}': {
                put: {
                    summary: 'Update invoice',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/InvoiceCreate' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Invoice updated',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Invoice' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/invoices/{id}/send': {
                post: {
                    summary: 'Send invoice by email',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Invoice sent successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/invoices/{id}/payment-link': {
                post: {
                    summary: 'Generate payment link for invoice',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Payment link generated',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            paymentLink: { type: 'string' },
                                            expiresAt: { type: 'string', format: 'date-time' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/invoices/{id}/activity': {
                get: {
                    summary: 'Get invoice activity log',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Invoice activity log',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                action: { type: 'string' },
                                                timestamp: { type: 'string', format: 'date-time' },
                                                user: { type: 'string' },
                                                details: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/invoices/{id}/pdf': {
                get: {
                    summary: 'Generate PDF for invoice',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'PDF generated',
                            content: {
                                'application/pdf': {
                                    schema: { type: 'string', format: 'binary' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/estimates': {
                get: {
                    summary: 'List estimates',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'] } },
                        { name: 'q', in: 'query', schema: { type: 'string', description: 'Search query for estimate number' } },
                        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                        { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of estimates with pagination',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            items: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Estimate' }
                                            },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create estimate',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/EstimateCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Estimate created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Estimate' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/estimates/next-number': {
                get: {
                    summary: 'Get next estimate number',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Next estimate number',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            nextNumber: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/estimates/{id}': {
                put: {
                    summary: 'Update estimate',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/EstimateCreate' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Estimate updated',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Estimate' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/estimates/{id}/convert': {
                post: {
                    summary: 'Convert estimate to invoice',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Estimate converted to invoice',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Invoice' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/estimates/{id}/pdf': {
                get: {
                    summary: 'Generate PDF for estimate',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'PDF generated',
                            content: {
                                'application/pdf': {
                                    schema: { type: 'string', format: 'binary' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/recurring-invoices': {
                get: {
                    summary: 'List recurring invoices',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'paused', 'completed', 'cancelled'] } },
                        { name: 'q', in: 'query', schema: { type: 'string', description: 'Search query for name' } },
                        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                        { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of recurring invoices with pagination',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            items: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/RecurringInvoice' }
                                            },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create recurring invoice',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/RecurringInvoiceCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Recurring invoice created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/RecurringInvoice' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/recurring-invoices/{id}': {
                get: {
                    summary: 'Get recurring invoice by ID',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Recurring invoice details',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/RecurringInvoice' }
                                }
                            }
                        }
                    }
                },
                put: {
                    summary: 'Update recurring invoice',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/RecurringInvoiceUpdate' }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Recurring invoice updated',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/RecurringInvoice' }
                                }
                            }
                        }
                    }
                },
                delete: {
                    summary: 'Delete recurring invoice',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '204': {
                            description: 'Recurring invoice deleted'
                        }
                    }
                }
            },
            '/api/recurring-invoices/{id}/generate': {
                post: {
                    summary: 'Generate invoice from recurring invoice',
                    tags: ['Sales'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Invoice generated from recurring invoice',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Invoice' }
                                }
                            }
                        }
                    }
                }
            },
            // Purchase Endpoints
            '/api/vendors': {
                get: {
                    summary: 'List vendors',
                    tags: ['Purchases'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of vendors',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Vendor' }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create vendor',
                    tags: ['Purchases'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/VendorCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Vendor created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Vendor' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/bills': {
                post: {
                    summary: 'Create bill',
                    tags: ['Purchases'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/BillCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Bill created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Bill' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/bills/{id}/post': {
                post: {
                    summary: 'Post bill',
                    tags: ['Purchases'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        createTransaction: { type: 'boolean', default: false },
                                        transaction: {
                                            type: 'object',
                                            properties: {
                                                transactionType: { type: 'string' },
                                                amount: { type: 'number' },
                                                currency: { type: 'string' },
                                                transactionDate: { type: 'string' },
                                                status: { type: 'string', default: 'posted' },
                                                companyId: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Bill posted successfully',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Bill' }
                                }
                            }
                        }
                    }
                }
            },
            // Inventory Endpoints
            '/api/products': {
                get: {
                    summary: 'List products',
                    tags: ['Inventory'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of products',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Product' }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create product',
                    tags: ['Inventory'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        companyId: { type: 'string' },
                                        name: { type: 'string' },
                                        description: { type: 'string' },
                                        sku: { type: 'string' },
                                        unitPrice: { type: 'number' },
                                        currency: { type: 'string', default: 'USD' },
                                        taxRate: { type: 'number', default: 0 },
                                        isActive: { type: 'boolean', default: true }
                                    },
                                    required: ['companyId', 'name']
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Product created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Product' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/inventory-movements': {
                post: {
                    summary: 'Create inventory movement',
                    tags: ['Inventory'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/InventoryMovementCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Inventory movement created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/InventoryMovement' }
                                }
                            }
                        }
                    }
                }
            },
            // Transaction Endpoints
            '/api/transactions': {
                get: {
                    summary: 'List transactions',
                    tags: ['Transactions'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                        { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of transactions with pagination',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            items: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Transaction' }
                                            },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create transaction',
                    tags: ['Transactions'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/TransactionCreate' }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Transaction created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Transaction' }
                                }
                            }
                        }
                    }
                }
            },
            // Journal Entries Endpoints
            '/api/journal': {
                get: {
                    summary: 'List journal entries',
                    tags: ['Journal'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                        { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
                    ],
                    responses: {
                        '200': {
                            description: 'List of journal entries with pagination',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            entries: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string' },
                                                        date: { type: 'string', format: 'date-time' },
                                                        memo: { type: 'string' },
                                                        reference: { type: 'string' },
                                                        status: { type: 'string', enum: ['DRAFT', 'POSTED'] },
                                                        companyId: { type: 'string' },
                                                        tenantId: { type: 'string' },
                                                        lines: {
                                                            type: 'array',
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    id: { type: 'string' },
                                                                    accountId: { type: 'string' },
                                                                    debit: { type: 'number' },
                                                                    credit: { type: 'number' },
                                                                    memo: { type: 'string' },
                                                                    account: {
                                                                        type: 'object',
                                                                        properties: {
                                                                            code: { type: 'string' },
                                                                            name: { type: 'string' },
                                                                            type: {
                                                                                type: 'object',
                                                                                properties: {
                                                                                    name: { type: 'string' }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: 'Create journal entry',
                    tags: ['Journal'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        date: { type: 'string', format: 'date-time' },
                                        memo: { type: 'string' },
                                        reference: { type: 'string' },
                                        companyId: { type: 'string' },
                                        lines: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    accountId: { type: 'string' },
                                                    debit: { type: 'number' },
                                                    credit: { type: 'number' },
                                                    memo: { type: 'string' }
                                                },
                                                required: ['accountId']
                                            },
                                            minItems: 2
                                        }
                                    },
                                    required: ['companyId', 'lines']
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Journal entry created',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            date: { type: 'string', format: 'date-time' },
                                            memo: { type: 'string' },
                                            reference: { type: 'string' },
                                            status: { type: 'string', enum: ['DRAFT', 'POSTED'] },
                                            companyId: { type: 'string' },
                                            tenantId: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/journal/ledger': {
                get: {
                    summary: 'Get account ledger',
                    tags: ['Journal'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'accountId', in: 'query', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Account ledger entries and balance',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            lines: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string' },
                                                        accountId: { type: 'string' },
                                                        debit: { type: 'number' },
                                                        credit: { type: 'number' },
                                                        memo: { type: 'string' }
                                                    }
                                                }
                                            },
                                            balance: { type: 'number' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/journal/trial-balance': {
                get: {
                    summary: 'Generate trial balance',
                    tags: ['Journal'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'asOf', in: 'query', schema: { type: 'string', format: 'date' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Trial balance report',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            accounts: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        accountId: { type: 'string' },
                                                        accountCode: { type: 'string' },
                                                        accountName: { type: 'string' },
                                                        accountType: { type: 'string' },
                                                        debitBalance: { type: 'number' },
                                                        creditBalance: { type: 'number' },
                                                        netBalance: { type: 'number' },
                                                        asOf: { type: 'string', format: 'date-time' }
                                                    }
                                                }
                                            },
                                            totalDebits: { type: 'number' },
                                            totalCredits: { type: 'number' },
                                            difference: { type: 'number' },
                                            asOf: { type: 'string', format: 'date-time' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/journal/general-ledger': {
                get: {
                    summary: 'Generate general ledger',
                    tags: ['Journal'],
                    parameters: [
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
                        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
                        { name: 'accountId', in: 'query', schema: { type: 'string' } },
                        { name: 'accountType', in: 'query', schema: { type: 'string' } },
                        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                        { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
                    ],
                    responses: {
                        '200': {
                            description: 'General ledger report',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            entries: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string' },
                                                        date: { type: 'string', format: 'date-time' },
                                                        accountId: { type: 'string' },
                                                        reference: { type: 'string' },
                                                        description: { type: 'string' },
                                                        debit: { type: 'number' },
                                                        credit: { type: 'number' },
                                                        account: {
                                                            type: 'object',
                                                            properties: {
                                                                code: { type: 'string' },
                                                                name: { type: 'string' },
                                                                type: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        name: { type: 'string' }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            totalEntries: { type: 'integer' },
                                            period: {
                                                type: 'object',
                                                properties: {
                                                    start: { type: 'string', format: 'date-time' },
                                                    end: { type: 'string', format: 'date-time' }
                                                }
                                            },
                                            runningBalance: { type: 'number' },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/journal/{id}/post': {
                post: {
                    summary: 'Post journal entry',
                    tags: ['Journal'],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        createTransaction: { type: 'boolean', default: false },
                                        transaction: { $ref: '#/components/schemas/TransactionInput' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Journal entry posted successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            posted: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'string' },
                                                    status: { type: 'string', enum: ['POSTED'] }
                                                }
                                            },
                                            createdTx: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'string' },
                                                    transactionType: { type: 'string' },
                                                    amount: { type: 'number' },
                                                    currency: { type: 'string' },
                                                    transactionDate: { type: 'string', format: 'date-time' },
                                                    status: { type: 'string' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                // Bank Feeds endpoints
                '/bank-feeds/connections': {
                    get: {
                        summary: 'List bank connections',
                        tags: ['Bank Feeds'],
                        parameters: [
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'error', 'pending'] } },
                            { name: 'bankName', in: 'query', schema: { type: 'string' } },
                            { name: 'accountType', in: 'query', schema: { type: 'string', enum: ['checking', 'savings', 'credit', 'loan'] } },
                            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
                        ],
                        responses: {
                            '200': {
                                description: 'List of bank connections',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                connections: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/BankConnection' }
                                                },
                                                pagination: { $ref: '#/components/schemas/Pagination' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    post: {
                        summary: 'Create bank connection',
                        tags: ['Bank Feeds'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/BankConnectionCreate' }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Bank connection created',
                                content: {
                                    'application/json': {
                                        schema: { $ref: '#/components/schemas/BankConnection' }
                                    }
                                }
                            }
                        }
                    }
                },
                '/bank-feeds/connections/{id}': {
                    get: {
                        summary: 'Get bank connection',
                        tags: ['Bank Feeds'],
                        parameters: [
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Bank connection details',
                                content: {
                                    'application/json': {
                                        schema: { $ref: '#/components/schemas/BankConnection' }
                                    }
                                }
                            }
                        }
                    },
                    put: {
                        summary: 'Update bank connection',
                        tags: ['Bank Feeds'],
                        parameters: [
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/BankConnectionCreate' }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Bank connection updated',
                                content: {
                                    'application/json': {
                                        schema: { $ref: '#/components/schemas/BankConnection' }
                                    }
                                }
                            }
                        }
                    },
                    delete: {
                        summary: 'Delete bank connection',
                        tags: ['Bank Feeds'],
                        parameters: [
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Bank connection deleted',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/bank-feeds/connections/{id}/sync': {
                    post: {
                        summary: 'Sync bank transactions',
                        tags: ['Bank Feeds'],
                        parameters: [
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            syncType: { type: 'string', enum: ['full', 'incremental', 'manual'], default: 'incremental' },
                                            forceSync: { type: 'boolean', default: false }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Sync completed',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                syncId: { type: 'string' },
                                                status: { type: 'string' },
                                                imported: { type: 'integer' },
                                                updated: { type: 'integer' },
                                                total: { type: 'integer' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/bank-feeds/transactions': {
                    get: {
                        summary: 'List bank transactions',
                        tags: ['Bank Feeds'],
                        parameters: [
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'connectionId', in: 'query', schema: { type: 'string' } },
                            { name: 'isReconciled', in: 'query', schema: { type: 'boolean' } },
                            { name: 'transactionType', in: 'query', schema: { type: 'string', enum: ['debit', 'credit', 'transfer'] } },
                            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
                            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
                            { name: 'category', in: 'query', schema: { type: 'string' } },
                            { name: 'search', in: 'query', schema: { type: 'string' } },
                            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
                        ],
                        responses: {
                            '200': {
                                description: 'List of bank transactions',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                transactions: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/BankTransaction' }
                                                },
                                                pagination: { $ref: '#/components/schemas/Pagination' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    post: {
                        summary: 'Create bank transaction',
                        tags: ['Bank Feeds'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/BankTransactionCreate' }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Bank transaction created',
                                content: {
                                    'application/json': {
                                        schema: { $ref: '#/components/schemas/BankTransaction' }
                                    }
                                }
                            }
                        }
                    }
                },
                '/bank-feeds/transactions/{id}': {
                    put: {
                        summary: 'Update bank transaction',
                        tags: ['Bank Feeds'],
                        parameters: [
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/BankTransactionCreate' }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Bank transaction updated',
                                content: {
                                    'application/json': {
                                        schema: { $ref: '#/components/schemas/BankTransaction' }
                                    }
                                }
                            }
                        }
                    }
                },
                '/bank-feeds/reconcile': {
                    post: {
                        summary: 'Run reconciliation',
                        tags: ['Bank Feeds'],
                        parameters: [
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            connectionId: { type: 'string' },
                                            autoMatch: { type: 'boolean', default: true },
                                            applyRules: { type: 'boolean', default: true },
                                            dateRange: {
                                                type: 'object',
                                                properties: {
                                                    startDate: { type: 'string', format: 'date-time' },
                                                    endDate: { type: 'string', format: 'date-time' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Reconciliation completed',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                jobId: { type: 'string' },
                                                status: { type: 'string' },
                                                processed: { type: 'integer' },
                                                matched: { type: 'integer' },
                                                unmatched: { type: 'integer' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/bank-feeds/reconciliation-rules': {
                    get: {
                        summary: 'List reconciliation rules',
                        tags: ['Bank Feeds'],
                        parameters: [
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
                        ],
                        responses: {
                            '200': {
                                description: 'List of reconciliation rules',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                rules: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/BankReconciliationRule' }
                                                },
                                                pagination: { $ref: '#/components/schemas/Pagination' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    post: {
                        summary: 'Create reconciliation rule',
                        tags: ['Bank Feeds'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/BankReconciliationRuleCreate' }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Reconciliation rule created',
                                content: {
                                    'application/json': {
                                        schema: { $ref: '#/components/schemas/BankReconciliationRule' }
                                    }
                                }
                            }
                        }
                    }
                },
                '/bank-feeds/sync-logs': {
                    get: {
                        summary: 'Get sync logs',
                        tags: ['Bank Feeds'],
                        parameters: [
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'connectionId', in: 'query', schema: { type: 'string' } },
                            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
                            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
                        ],
                        responses: {
                            '200': {
                                description: 'List of sync logs',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                logs: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/BankSyncLog' }
                                                },
                                                pagination: { $ref: '#/components/schemas/Pagination' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                // AI Schema Definitions
                AIModel: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        modelType: { type: 'string' },
                        version: { type: 'string' },
                        status: { type: 'string' },
                        accuracy: { type: 'number' },
                        precision: { type: 'number' },
                        recall: { type: 'number' },
                        f1Score: { type: 'number' },
                        trainingDataSize: { type: 'integer' },
                        validationDataSize: { type: 'integer' },
                        hyperparameters: { type: 'object' },
                        modelPath: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' },
                        createdBy: { type: 'string' }
                    }
                },
                AIModelCreate: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        modelType: { type: 'string' },
                        version: { type: 'string' },
                        hyperparameters: { type: 'object' },
                        trainingDataSize: { type: 'integer' },
                        validationDataSize: { type: 'integer' }
                    },
                    required: ['name', 'modelType', 'version']
                },
                AIModelTrainingRun: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        modelId: { type: 'string' },
                        status: { type: 'string' },
                        startTime: { type: 'string', format: 'date-time' },
                        endTime: { type: 'string', format: 'date-time' },
                        duration: { type: 'integer' },
                        accuracy: { type: 'number' },
                        loss: { type: 'number' },
                        hyperparameters: { type: 'object' },
                        trainingMetrics: { type: 'object' },
                        validationMetrics: { type: 'object' },
                        createdAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' },
                        createdBy: { type: 'string' }
                    }
                },
                AIModelPrediction: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        modelId: { type: 'string' },
                        inputData: { type: 'object' },
                        prediction: { type: 'object' },
                        confidence: { type: 'number' },
                        timestamp: { type: 'string', format: 'date-time' },
                        metadata: { type: 'object' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' },
                        createdBy: { type: 'string' }
                    }
                },
                AIModelFeatureImportance: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        modelId: { type: 'string' },
                        featureName: { type: 'string' },
                        importance: { type: 'number' },
                        rank: { type: 'integer' },
                        createdAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' }
                    }
                },
                AIDataPipeline: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        pipelineType: { type: 'string' },
                        status: { type: 'string' },
                        configuration: { type: 'object' },
                        schedule: { type: 'string' },
                        lastRun: { type: 'string', format: 'date-time' },
                        nextRun: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' },
                        createdBy: { type: 'string' }
                    }
                },
                AIPipelineCreate: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        pipelineType: { type: 'string' },
                        configuration: { type: 'object' },
                        schedule: { type: 'string' }
                    },
                    required: ['name', 'pipelineType']
                },
                AIDataPipelineRun: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        pipelineId: { type: 'string' },
                        status: { type: 'string' },
                        startTime: { type: 'string', format: 'date-time' },
                        endTime: { type: 'string', format: 'date-time' },
                        duration: { type: 'integer' },
                        recordsProcessed: { type: 'integer' },
                        recordsFailed: { type: 'integer' },
                        logs: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' }
                    }
                },
                AIDataQuality: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        pipelineId: { type: 'string' },
                        runId: { type: 'string' },
                        qualityScore: { type: 'number' },
                        completeness: { type: 'number' },
                        accuracy: { type: 'number' },
                        consistency: { type: 'number' },
                        timeliness: { type: 'number' },
                        issues: { type: 'array', items: { type: 'object' } },
                        createdAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' }
                    }
                },
                AIPerformanceMetrics: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        modelId: { type: 'string' },
                        metricType: { type: 'string' },
                        value: { type: 'number' },
                        timestamp: { type: 'string', format: 'date-time' },
                        metadata: { type: 'object' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' }
                    }
                },
                AILearningFeedback: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        modelId: { type: 'string' },
                        predictionId: { type: 'string' },
                        feedbackType: { type: 'string' },
                        rating: { type: 'integer' },
                        comment: { type: 'string' },
                        metadata: { type: 'object' },
                        createdAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' },
                        createdBy: { type: 'string' }
                    }
                },
                AIDriftDetection: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        modelId: { type: 'string' },
                        driftType: { type: 'string' },
                        severity: { type: 'string' },
                        confidence: { type: 'number' },
                        details: { type: 'object' },
                        detectedAt: { type: 'string', format: 'date-time' },
                        status: { type: 'string' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' }
                    }
                },
                AIExperiment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        objective: { type: 'string' },
                        status: { type: 'string' },
                        startDate: { type: 'string', format: 'date-time' },
                        endDate: { type: 'string', format: 'date-time' },
                        hypothesis: { type: 'string' },
                        results: { type: 'object' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' },
                        createdBy: { type: 'string' }
                    }
                },
                AIExperimentCreate: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        objective: { type: 'string' },
                        hypothesis: { type: 'string' }
                    },
                    required: ['name', 'objective']
                },
                AIDeployment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        modelId: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        status: { type: 'string' },
                        environment: { type: 'string' },
                        deploymentType: { type: 'string' },
                        configuration: { type: 'object' },
                        deployedAt: { type: 'string', format: 'date-time' },
                        deployedBy: { type: 'string' },
                        healthStatus: { type: 'string' },
                        performanceMetrics: { type: 'object' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' }
                    }
                },
                AIDeploymentCreate: {
                    type: 'object',
                    properties: {
                        modelId: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        environment: { type: 'string' },
                        deploymentType: { type: 'string' },
                        configuration: { type: 'object' }
                    },
                    required: ['modelId', 'name', 'environment', 'deploymentType']
                },
                AIGovernance: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        policyType: { type: 'string' },
                        status: { type: 'string' },
                        rules: { type: 'object' },
                        thresholds: { type: 'object' },
                        enforcementLevel: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' },
                        createdBy: { type: 'string' }
                    }
                },
                AIGovernancePolicyCreate: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        policyType: { type: 'string' },
                        rules: { type: 'object' },
                        thresholds: { type: 'object' },
                        enforcementLevel: { type: 'string' }
                    },
                    required: ['name', 'policyType']
                },
                AIGovernanceViolation: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        policyId: { type: 'string' },
                        modelId: { type: 'string' },
                        violationType: { type: 'string' },
                        severity: { type: 'string' },
                        description: { type: 'string' },
                        details: { type: 'object' },
                        detectedAt: { type: 'string', format: 'date-time' },
                        status: { type: 'string' },
                        resolvedAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' }
                    }
                },
                AIInsight: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        type: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        confidence: { type: 'number' },
                        data: { type: 'object' },
                        recommendations: { type: 'array', items: { type: 'string' } },
                        createdAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' },
                        createdBy: { type: 'string' }
                    }
                },
                AIRecommendation: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        type: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        priority: { type: 'string' },
                        impact: { type: 'string' },
                        implementation: { type: 'string' },
                        estimatedSavings: { type: 'number' },
                        createdAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' },
                        createdBy: { type: 'string' }
                    }
                },
                AIAudit: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        auditType: { type: 'string' },
                        modelId: { type: 'string' },
                        deploymentId: { type: 'string' },
                        status: { type: 'string' },
                        results: { type: 'object' },
                        findings: { type: 'array', items: { type: 'object' } },
                        recommendations: { type: 'array', items: { type: 'string' } },
                        createdAt: { type: 'string', format: 'date-time' },
                        completedAt: { type: 'string', format: 'date-time' },
                        tenantId: { type: 'string' },
                        companyId: { type: 'string' },
                        createdBy: { type: 'string' }
                    }
                },
                AIModelStats: {
                    type: 'object',
                    properties: {
                        totalModels: { type: 'integer' },
                        activeModels: { type: 'integer' },
                        trainingModels: { type: 'integer' },
                        averageAccuracy: { type: 'number' },
                        totalPredictions: { type: 'integer' },
                        recentPredictions: { type: 'integer' }
                    }
                },
                AIPipelineStats: {
                    type: 'object',
                    properties: {
                        totalPipelines: { type: 'integer' },
                        activePipelines: { type: 'integer' },
                        failedPipelines: { type: 'integer' },
                        totalRecordsProcessed: { type: 'integer' },
                        averageProcessingTime: { type: 'number' }
                    }
                },
                AIGovernanceStats: {
                    type: 'object',
                    properties: {
                        totalPolicies: { type: 'integer' },
                        activePolicies: { type: 'integer' },
                        totalViolations: { type: 'integer' },
                        openViolations: { type: 'integer' },
                        criticalViolations: { type: 'integer' }
                    }
                },
                AIDeploymentStats: {
                    type: 'object',
                    properties: {
                        totalDeployments: { type: 'integer' },
                        activeDeployments: { type: 'integer' },
                        healthyDeployments: { type: 'integer' },
                        totalFeedback: { type: 'integer' },
                        averageRating: { type: 'number' }
                    }
                },
                // AI Routes
                '/ai/dashboard/{companyId}': {
                    get: {
                        summary: 'Get AI Dashboard Data',
                        description: 'Get comprehensive AI dashboard data including model statistics, pipeline statistics, governance statistics, and recent activities',
                        tags: ['AI'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'AI dashboard data retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        modelStats: { $ref: '#/components/schemas/AIModelStats' },
                                                        pipelineStats: { $ref: '#/components/schemas/AIPipelineStats' },
                                                        governanceStats: { $ref: '#/components/schemas/AIGovernanceStats' },
                                                        deploymentStats: { $ref: '#/components/schemas/AIDeploymentStats' },
                                                        recentInsights: { type: 'array', items: { $ref: '#/components/schemas/AIInsight' } },
                                                        recentPredictions: { type: 'array', items: { $ref: '#/components/schemas/AIModelPrediction' } },
                                                        recentViolations: { type: 'array', items: { $ref: '#/components/schemas/AIGovernanceViolation' } }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/insights': {
                    post: {
                        summary: 'Generate AI Insights',
                        description: 'Generate AI-powered insights for financial data analysis',
                        tags: ['AI'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            insightType: {
                                                type: 'string',
                                                enum: ['financial_anomaly', 'trend_analysis', 'risk_assessment', 'optimization', 'forecasting']
                                            },
                                            data: { type: 'object' },
                                            modelId: { type: 'string' }
                                        },
                                        required: ['insightType']
                                    }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'AI insight generated successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        insight: { $ref: '#/components/schemas/AIInsight' },
                                                        prediction: { $ref: '#/components/schemas/AIModelPrediction' },
                                                        model: { $ref: '#/components/schemas/AIModel' }
                                                    }
                                                },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/insights/{companyId}': {
                    get: {
                        summary: 'Get AI Insights',
                        description: 'Retrieve AI insights for a company',
                        tags: ['AI'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'type', in: 'query', schema: { type: 'string' } },
                            { name: 'status', in: 'query', schema: { type: 'string' } },
                            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
                        ],
                        responses: {
                            '200': {
                                description: 'AI insights retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { type: 'array', items: { $ref: '#/components/schemas/AIInsight' } },
                                                count: { type: 'integer' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/predictions': {
                    post: {
                        summary: 'Make AI Prediction',
                        description: 'Make predictions using trained AI models',
                        tags: ['AI'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            modelId: { type: 'string' },
                                            inputData: { type: 'object' },
                                            context: { type: 'object' }
                                        },
                                        required: ['modelId', 'inputData']
                                    }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Prediction completed successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        prediction: { $ref: '#/components/schemas/AIModelPrediction' },
                                                        model: { $ref: '#/components/schemas/AIModel' }
                                                    }
                                                },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/predictions/{companyId}': {
                    get: {
                        summary: 'Get AI Predictions',
                        description: 'Retrieve prediction history for a company',
                        tags: ['AI'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'modelId', in: 'query', schema: { type: 'string' } },
                            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
                        ],
                        responses: {
                            '200': {
                                description: 'AI predictions retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { type: 'array', items: { $ref: '#/components/schemas/AIModelPrediction' } },
                                                count: { type: 'integer' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/recommendations': {
                    post: {
                        summary: 'Generate AI Recommendations',
                        description: 'Generate AI-powered recommendations for business optimization',
                        tags: ['AI'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            recommendationType: {
                                                type: 'string',
                                                enum: ['cost_savings', 'revenue_optimization', 'risk_mitigation', 'process_improvement']
                                            },
                                            data: { type: 'object' }
                                        },
                                        required: ['recommendationType']
                                    }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'AI recommendation generated successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        recommendation: { $ref: '#/components/schemas/AIRecommendation' },
                                                        relatedInsights: { type: 'array', items: { $ref: '#/components/schemas/AIInsight' } },
                                                        availableModels: { type: 'array', items: { $ref: '#/components/schemas/AIModel' } }
                                                    }
                                                },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/audits': {
                    post: {
                        summary: 'Perform AI Audit',
                        description: 'Perform comprehensive AI audit including compliance, performance, security, and bias checks',
                        tags: ['AI'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            auditType: {
                                                type: 'string',
                                                enum: ['compliance', 'performance', 'security', 'bias']
                                            },
                                            modelId: { type: 'string' },
                                            deploymentId: { type: 'string' }
                                        },
                                        required: ['auditType']
                                    }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'AI audit completed successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        audit: { $ref: '#/components/schemas/AIAudit' },
                                                        results: { type: 'object' }
                                                    }
                                                },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/models': {
                    post: {
                        summary: 'Create AI Model',
                        description: 'Create a new AI model with configuration and parameters',
                        tags: ['AI Models'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/AIModelCreate' }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'AI model created successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/AIModel' },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/models/{companyId}': {
                    get: {
                        summary: 'Get AI Models',
                        description: 'Retrieve AI models for a company',
                        tags: ['AI Models'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'status', in: 'query', schema: { type: 'string' } },
                            { name: 'modelType', in: 'query', schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'AI models retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { type: 'array', items: { $ref: '#/components/schemas/AIModel' } },
                                                count: { type: 'integer' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/models/{companyId}/{modelId}': {
                    get: {
                        summary: 'Get AI Model Details',
                        description: 'Retrieve detailed information about a specific AI model',
                        tags: ['AI Models'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'modelId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'AI model details retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/AIModel' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/models/{modelId}/train': {
                    post: {
                        summary: 'Train AI Model',
                        description: 'Start training process for an AI model',
                        tags: ['AI Models'],
                        parameters: [
                            { name: 'modelId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            validationDataSize: { type: 'integer' },
                                            hyperparameters: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Model training started successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/AIModelTrainingRun' },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/pipelines': {
                    post: {
                        summary: 'Create AI Pipeline',
                        description: 'Create a new data processing pipeline',
                        tags: ['AI Pipelines'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/AIPipelineCreate' }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'AI pipeline created successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/AIDataPipeline' },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/pipelines/{companyId}': {
                    get: {
                        summary: 'Get AI Pipelines',
                        description: 'Retrieve data processing pipelines for a company',
                        tags: ['AI Pipelines'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'status', in: 'query', schema: { type: 'string' } },
                            { name: 'pipelineType', in: 'query', schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'AI pipelines retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { type: 'array', items: { $ref: '#/components/schemas/AIDataPipeline' } },
                                                count: { type: 'integer' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/governance/policies': {
                    post: {
                        summary: 'Create Governance Policy',
                        description: 'Create a new AI governance policy',
                        tags: ['AI Governance'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/AIGovernancePolicyCreate' }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Governance policy created successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/AIGovernance' },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/governance/policies/{companyId}': {
                    get: {
                        summary: 'Get Governance Policies',
                        description: 'Retrieve AI governance policies for a company',
                        tags: ['AI Governance'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'status', in: 'query', schema: { type: 'string' } },
                            { name: 'policyType', in: 'query', schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Governance policies retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { type: 'array', items: { $ref: '#/components/schemas/AIGovernance' } },
                                                count: { type: 'integer' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/deployments': {
                    post: {
                        summary: 'Create AI Deployment',
                        description: 'Create a new model deployment',
                        tags: ['AI Deployments'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/AIDeploymentCreate' }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'AI deployment created successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/AIDeployment' },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/deployments/{companyId}': {
                    get: {
                        summary: 'Get AI Deployments',
                        description: 'Retrieve model deployments for a company',
                        tags: ['AI Deployments'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'status', in: 'query', schema: { type: 'string' } },
                            { name: 'environment', in: 'query', schema: { type: 'string' } },
                            { name: 'deploymentType', in: 'query', schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'AI deployments retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { type: 'array', items: { $ref: '#/components/schemas/AIDeployment' } },
                                                count: { type: 'integer' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/deployments/{deploymentId}/deploy': {
                    post: {
                        summary: 'Deploy Model',
                        description: 'Activate a model deployment',
                        tags: ['AI Deployments'],
                        parameters: [
                            { name: 'deploymentId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Model deployed successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/AIDeployment' },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/feedback': {
                    post: {
                        summary: 'Submit Learning Feedback',
                        description: 'Submit feedback for AI model predictions',
                        tags: ['AI Learning'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            modelId: { type: 'string' },
                                            predictionId: { type: 'string' },
                                            feedbackType: {
                                                type: 'string',
                                                enum: ['accuracy', 'relevance', 'usefulness', 'bias', 'other']
                                            },
                                            rating: { type: 'integer', minimum: 1, maximum: 5 },
                                            comment: { type: 'string' },
                                            metadata: { type: 'object' }
                                        },
                                        required: ['modelId', 'feedbackType', 'rating']
                                    }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Learning feedback submitted successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/AILearningFeedback' },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/feedback/{companyId}': {
                    get: {
                        summary: 'Get Learning Feedback',
                        description: 'Retrieve learning feedback for a company',
                        tags: ['AI Learning'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'status', in: 'query', schema: { type: 'string' } },
                            { name: 'feedbackType', in: 'query', schema: { type: 'string' } },
                            { name: 'modelId', in: 'query', schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Learning feedback retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { type: 'array', items: { $ref: '#/components/schemas/AILearningFeedback' } },
                                                count: { type: 'integer' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/experiments': {
                    post: {
                        summary: 'Create AI Experiment',
                        description: 'Create a new AI experiment',
                        tags: ['AI Experiments'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/AIExperimentCreate' }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'AI experiment created successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/AIExperiment' },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/ai/experiments/{companyId}': {
                    get: {
                        summary: 'Get AI Experiments',
                        description: 'Retrieve AI experiments for a company',
                        tags: ['AI Experiments'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'x-tenant-id', in: 'header', required: true, schema: { type: 'string' } },
                            { name: 'status', in: 'query', schema: { type: 'string' } },
                            { name: 'objective', in: 'query', schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'AI experiments retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { type: 'array', items: { $ref: '#/components/schemas/AIExperiment' } },
                                                count: { type: 'integer' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                // Enhanced Conversational AI endpoints
                '/enhanced-conversational-ai/chat': {
                    post: {
                        summary: 'Process Natural Language Input',
                        description: 'Process natural language input with enhanced context awareness and learning',
                        tags: ['Enhanced Conversational AI'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['text', 'companyId'],
                                        properties: {
                                            text: { type: 'string', description: 'Natural language transaction description' },
                                            companyId: { type: 'string', description: 'Company ID' },
                                            sessionId: { type: 'string', description: 'Session ID for conversation tracking' },
                                            userPreferences: {
                                                type: 'object',
                                                properties: {
                                                    language: { type: 'string', enum: ['en', 'fr', 'rw', 'sw'] },
                                                    currency: { type: 'string' },
                                                    dateFormat: { type: 'string' },
                                                    autoConfirm: { type: 'boolean' },
                                                    confidenceThreshold: { type: 'number', minimum: 50, maximum: 95 },
                                                    preferredCategories: { type: 'array', items: { type: 'string' } },
                                                    excludedCategories: { type: 'array', items: { type: 'string' } },
                                                    notificationPreferences: {
                                                        type: 'object',
                                                        properties: {
                                                            email: { type: 'boolean' },
                                                            push: { type: 'boolean' },
                                                            sms: { type: 'boolean' }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Message processed successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        message: { type: 'string' },
                                                        parsedTransaction: { type: 'object' },
                                                        suggestions: { type: 'array', items: { type: 'string' } },
                                                        nextActions: { type: 'array', items: { type: 'string' } },
                                                        confidence: { type: 'number' },
                                                        requiresConfirmation: { type: 'boolean' },
                                                        learningApplied: { type: 'boolean' }
                                                    }
                                                },
                                                sessionId: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-conversational-ai/batch-chat': {
                    post: {
                        summary: 'Batch Process Transactions',
                        description: 'Process multiple natural language transactions in batch',
                        tags: ['Enhanced Conversational AI'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['texts', 'companyId'],
                                        properties: {
                                            texts: { type: 'array', items: { type: 'string' } },
                                            companyId: { type: 'string' },
                                            sessionId: { type: 'string' },
                                            userPreferences: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Batch processing completed successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        responses: { type: 'array', items: { type: 'object' } },
                                                        totalProcessed: { type: 'number' },
                                                        successful: { type: 'number' },
                                                        sessionId: { type: 'string' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-conversational-ai/history/{companyId}': {
                    get: {
                        summary: 'Get Conversation History',
                        description: 'Retrieve conversation history for a company',
                        tags: ['Enhanced Conversational AI'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                            { name: 'sessionId', in: 'query', schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Conversation history retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        history: { type: 'array', items: { type: 'object' } },
                                                        total: { type: 'number' },
                                                        sessionId: { type: 'string' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-conversational-ai/preferences': {
                    put: {
                        summary: 'Update User Preferences',
                        description: 'Update user preferences for conversational AI',
                        tags: ['Enhanced Conversational AI'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['preferences'],
                                        properties: {
                                            preferences: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'User preferences updated successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        message: { type: 'string' },
                                                        updatedPreferences: { type: 'object' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-conversational-ai/insights/{companyId}': {
                    get: {
                        summary: 'Get Learning Insights',
                        description: 'Retrieve learning insights for a company',
                        tags: ['Enhanced Conversational AI'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Learning insights retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        frequentVendors: { type: 'array', items: { type: 'object' } },
                                                        frequentCategories: { type: 'array', items: { type: 'object' } },
                                                        commonAmounts: { type: 'array', items: { type: 'object' } },
                                                        userPatterns: { type: 'array', items: { type: 'object' } },
                                                        industryContext: { type: 'string' },
                                                        complianceRequirements: { type: 'array', items: { type: 'string' } }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-conversational-ai/languages': {
                    get: {
                        summary: 'Get Supported Languages',
                        description: 'Get list of supported languages for conversational AI',
                        tags: ['Enhanced Conversational AI'],
                        responses: {
                            '200': {
                                description: 'Supported languages retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            code: { type: 'string' },
                                                            name: { type: 'string' },
                                                            nativeName: { type: 'string' }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-conversational-ai/examples': {
                    get: {
                        summary: 'Get Conversation Examples',
                        description: 'Get conversation examples for different languages and categories',
                        tags: ['Enhanced Conversational AI'],
                        parameters: [
                            { name: 'language', in: 'query', schema: { type: 'string', default: 'en' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Conversation examples retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        categories: {
                                                            type: 'array',
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    name: { type: 'string' },
                                                                    examples: { type: 'array', items: { type: 'string' } }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-conversational-ai/stats/{companyId}': {
                    get: {
                        summary: 'Get Conversation Statistics',
                        description: 'Get conversation and transaction statistics for a company',
                        tags: ['Enhanced Conversational AI'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'period', in: 'query', schema: { type: 'string', default: '30' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Conversation statistics retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        totalTransactions: { type: 'number' },
                                                        totalAmount: { type: 'number' },
                                                        avgAmount: { type: 'number' },
                                                        transactionTypes: { type: 'object' },
                                                        topCategories: { type: 'array', items: { type: 'object' } },
                                                        period: { type: 'string' },
                                                        learningInsights: { type: 'object' },
                                                        confidenceDistribution: { type: 'object' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-conversational-ai/test': {
                    post: {
                        summary: 'Test Enhanced Conversational AI',
                        description: 'Test endpoint for enhanced conversational AI functionality',
                        tags: ['Enhanced Conversational AI'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['text', 'companyId'],
                                        properties: {
                                            text: { type: 'string' },
                                            companyId: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Test completed successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { type: 'object' },
                                                sessionId: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                // Enhanced Bank Integration endpoints
                '/enhanced-bank-integration/process-feed': {
                    post: {
                        summary: 'Process Real-time Bank Feed',
                        description: 'Process real-time bank feed with AI-powered reconciliation and fraud detection',
                        tags: ['Enhanced Bank Integration'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['connectionId', 'transactions'],
                                        properties: {
                                            connectionId: { type: 'string', description: 'Bank connection ID' },
                                            transactions: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/BankFeedTransaction' }
                                            },
                                            config: { $ref: '#/components/schemas/BankIntegrationConfig' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Bank feed processed successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                result: { $ref: '#/components/schemas/BankReconciliationResult' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-bank-integration/reconcile': {
                    post: {
                        summary: 'Run AI-Powered Reconciliation',
                        description: 'Run AI-powered reconciliation on bank transactions',
                        tags: ['Enhanced Bank Integration'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['connectionId'],
                                        properties: {
                                            connectionId: { type: 'string', description: 'Bank connection ID' },
                                            dateRange: {
                                                type: 'object',
                                                properties: {
                                                    startDate: { type: 'string', format: 'date' },
                                                    endDate: { type: 'string', format: 'date' }
                                                }
                                            },
                                            config: { $ref: '#/components/schemas/BankIntegrationConfig' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Reconciliation completed successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                result: { $ref: '#/components/schemas/BankReconciliationResult' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-bank-integration/stats/{companyId}': {
                    get: {
                        summary: 'Get Bank Integration Statistics',
                        description: 'Get comprehensive bank integration statistics',
                        tags: ['Enhanced Bank Integration'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Bank integration statistics retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                stats: { $ref: '#/components/schemas/BankIntegrationStats' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-bank-integration/connections/{companyId}': {
                    get: {
                        summary: 'Get Bank Connections with Health Status',
                        description: 'Get bank connections with health status and sync information',
                        tags: ['Enhanced Bank Integration'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Bank connections retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                connections: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'string' },
                                                            bankName: { type: 'string' },
                                                            accountNumber: { type: 'string' },
                                                            accountType: { type: 'string' },
                                                            status: { type: 'string' },
                                                            healthStatus: { type: 'string' },
                                                            lastSyncAt: { type: 'string', format: 'date-time' },
                                                            daysSinceLastSync: { type: 'number' },
                                                            testResult: { type: 'object' },
                                                            _count: {
                                                                type: 'object',
                                                                properties: {
                                                                    bankTransactions: { type: 'number' },
                                                                    syncLogs: { type: 'number' }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-bank-integration/transactions/{connectionId}': {
                    get: {
                        summary: 'Get Transactions with AI Insights',
                        description: 'Get bank transactions with AI-powered insights and risk analysis',
                        tags: ['Enhanced Bank Integration'],
                        parameters: [
                            { name: 'connectionId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                            { name: 'isReconciled', in: 'query', schema: { type: 'boolean' } },
                            { name: 'transactionType', in: 'query', schema: { type: 'string' } },
                            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
                            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
                            { name: 'search', in: 'query', schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Transactions with AI insights retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                transactions: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'string' },
                                                            transactionDate: { type: 'string', format: 'date-time' },
                                                            amount: { type: 'number' },
                                                            description: { type: 'string' },
                                                            merchantName: { type: 'string' },
                                                            transactionType: { type: 'string' },
                                                            isReconciled: { type: 'boolean' },
                                                            confidence: { type: 'number' },
                                                            aiInsights: {
                                                                type: 'object',
                                                                properties: {
                                                                    riskScore: { type: 'number' },
                                                                    fraudScore: { type: 'number' },
                                                                    confidence: { type: 'number' },
                                                                    requiresReview: { type: 'boolean' },
                                                                    suggestedCategory: { type: 'string' },
                                                                    suggestedVendor: { type: 'string' }
                                                                }
                                                            }
                                                        }
                                                    }
                                                },
                                                pagination: {
                                                    type: 'object',
                                                    properties: {
                                                        page: { type: 'integer' },
                                                        limit: { type: 'integer' },
                                                        total: { type: 'integer' },
                                                        pages: { type: 'integer' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-bank-integration/auto-categorize/{transactionId}': {
                    post: {
                        summary: 'Auto-Categorize Transaction',
                        description: 'Use AI to automatically categorize a bank transaction',
                        tags: ['Enhanced Bank Integration'],
                        parameters: [
                            { name: 'transactionId', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Transaction auto-categorized successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                category: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-bank-integration/fraud-analysis/{transactionId}': {
                    post: {
                        summary: 'Analyze Transaction for Fraud',
                        description: 'Analyze a bank transaction for potential fraud using AI',
                        tags: ['Enhanced Bank Integration'],
                        parameters: [
                            { name: 'transactionId', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Fraud analysis completed successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                analysis: {
                                                    type: 'object',
                                                    properties: {
                                                        fraudScore: { type: 'number' },
                                                        riskScore: { type: 'number' },
                                                        riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
                                                        indicators: { type: 'object' },
                                                        recommendations: { type: 'array', items: { type: 'string' } }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-bank-integration/sync/{connectionId}': {
                    post: {
                        summary: 'Trigger Manual Sync',
                        description: 'Trigger a manual sync for a bank connection',
                        tags: ['Enhanced Bank Integration'],
                        parameters: [
                            { name: 'connectionId', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        requestBody: {
                            required: false,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            syncType: { type: 'string', enum: ['full', 'incremental'], default: 'incremental' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Sync completed successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                syncLogId: { type: 'string' },
                                                result: { $ref: '#/components/schemas/BankReconciliationResult' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-bank-integration/rules/{companyId}': {
                    get: {
                        summary: 'Get Reconciliation Rules',
                        description: 'Get AI-powered reconciliation rules for a company',
                        tags: ['Enhanced Bank Integration'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Reconciliation rules retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                rules: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            id: { type: 'string' },
                                                            name: { type: 'string' },
                                                            description: { type: 'string' },
                                                            isActive: { type: 'boolean' },
                                                            priority: { type: 'integer' },
                                                            conditions: { type: 'string' },
                                                            actions: { type: 'string' },
                                                            createdByUser: {
                                                                type: 'object',
                                                                properties: {
                                                                    name: { type: 'string' },
                                                                    email: { type: 'string' }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-bank-integration/rules': {
                    post: {
                        summary: 'Create Reconciliation Rule',
                        description: 'Create a new AI-powered reconciliation rule',
                        tags: ['Enhanced Bank Integration'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['companyId', 'name', 'conditions', 'actions'],
                                        properties: {
                                            companyId: { type: 'string' },
                                            name: { type: 'string' },
                                            description: { type: 'string' },
                                            conditions: { type: 'object' },
                                            actions: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Reconciliation rule created successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                rule: { type: 'object' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-bank-integration/test-connection/{connectionId}': {
                    post: {
                        summary: 'Test Bank Connection',
                        description: 'Test the health and connectivity of a bank connection',
                        tags: ['Enhanced Bank Integration'],
                        parameters: [
                            { name: 'connectionId', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Connection test completed successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                testResult: {
                                                    type: 'object',
                                                    properties: {
                                                        success: { type: 'boolean' },
                                                        message: { type: 'string' },
                                                        details: { type: 'object' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/create': {
                    post: {
                        summary: 'Create AI-Powered Journal Entry',
                        description: 'Generate and create a journal entry using AI based on transaction description',
                        tags: ['Enhanced Journal Management'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['description', 'amount'],
                                        properties: {
                                            description: { type: 'string' },
                                            amount: { type: 'number' },
                                            context: {
                                                type: 'object',
                                                properties: {
                                                    category: { type: 'string' },
                                                    vendor: { type: 'string' },
                                                    customer: { type: 'string' },
                                                    transactionType: { type: 'string', enum: ['sale', 'purchase', 'expense', 'payment', 'receipt'] }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Journal entry created successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                data: { $ref: '#/components/schemas/JournalEntry' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/manual': {
                    post: {
                        summary: 'Create Manual Journal Entry',
                        description: 'Create a manual journal entry with custom entries',
                        tags: ['Enhanced Journal Management'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['date', 'reference', 'description', 'entries'],
                                        properties: {
                                            date: { type: 'string', format: 'date' },
                                            reference: { type: 'string' },
                                            description: { type: 'string' },
                                            entries: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/JournalLine' }
                                            },
                                            metadata: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Manual journal entry created successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                data: { $ref: '#/components/schemas/JournalEntry' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/post/{id}': {
                    post: {
                        summary: 'Post Journal Entry',
                        description: 'Post a draft journal entry to the ledger',
                        tags: ['Enhanced Journal Management'],
                        parameters: [
                            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            postedBy: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Journal entry posted successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                data: { $ref: '#/components/schemas/JournalEntry' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/void/{id}': {
                    post: {
                        summary: 'Void Journal Entry',
                        description: 'Void a posted journal entry with reversal entries',
                        tags: ['Enhanced Journal Management'],
                        parameters: [
                            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['reason'],
                                        properties: {
                                            voidedBy: { type: 'string' },
                                            reason: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Journal entry voided successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                data: { $ref: '#/components/schemas/JournalEntry' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/entry/{id}': {
                    get: {
                        summary: 'Get Journal Entry Details',
                        description: 'Retrieve detailed information about a specific journal entry',
                        tags: ['Enhanced Journal Management'],
                        parameters: [
                            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Journal entry details retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/JournalEntry' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/entries/{companyId}': {
                    get: {
                        summary: 'Get Journal Entries',
                        description: 'Retrieve journal entries for a company within a date range',
                        tags: ['Enhanced Journal Management'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
                            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
                            { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'posted', 'voided'] } }
                        ],
                        responses: {
                            '200': {
                                description: 'Journal entries retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/JournalEntry' }
                                                },
                                                count: { type: 'number' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/account-suggestions': {
                    post: {
                        summary: 'Get Account Suggestions',
                        description: 'Get AI-powered account suggestions for a transaction',
                        tags: ['Enhanced Journal Management'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['description', 'amount'],
                                        properties: {
                                            description: { type: 'string' },
                                            amount: { type: 'number' },
                                            context: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Account suggestions retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/AccountSuggestion' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/validate': {
                    post: {
                        summary: 'Validate Journal Entry',
                        description: 'Validate a journal entry for errors and compliance',
                        tags: ['Enhanced Journal Management'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['date', 'reference', 'description', 'entries'],
                                        properties: {
                                            date: { type: 'string', format: 'date' },
                                            reference: { type: 'string' },
                                            description: { type: 'string' },
                                            entries: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/JournalLine' }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Journal entry validation completed',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/JournalValidationResult' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/ledger-balances/{companyId}': {
                    get: {
                        summary: 'Get Ledger Balances',
                        description: 'Retrieve ledger balances for all accounts in a company',
                        tags: ['Enhanced Journal Management'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
                            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Ledger balances retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/LedgerBalance' }
                                                },
                                                count: { type: 'number' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/anomalies/{companyId}': {
                    get: {
                        summary: 'Detect Anomalies',
                        description: 'Detect anomalies in journal entries for a company',
                        tags: ['Enhanced Journal Management'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'periodDays', in: 'query', schema: { type: 'number', default: 30 } }
                        ],
                        responses: {
                            '200': {
                                description: 'Anomalies detected successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            type: { type: 'string' },
                                                            description: { type: 'string' },
                                                            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
                                                        }
                                                    }
                                                },
                                                count: { type: 'number' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/chart-of-accounts/{companyId}': {
                    get: {
                        summary: 'Get Chart of Accounts',
                        description: 'Retrieve the hierarchical chart of accounts for a company',
                        tags: ['Enhanced Journal Management'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'includeInactive', in: 'query', schema: { type: 'boolean', default: false } }
                        ],
                        responses: {
                            '200': {
                                description: 'Chart of accounts retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'array',
                                                    items: { $ref: '#/components/schemas/ChartOfAccounts' }
                                                },
                                                count: { type: 'number' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/accounts': {
                    post: {
                        summary: 'Create Account',
                        description: 'Create a new account in the chart of accounts',
                        tags: ['Enhanced Journal Management'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['name', 'code', 'typeId'],
                                        properties: {
                                            name: { type: 'string' },
                                            code: { type: 'string' },
                                            typeId: { type: 'string' },
                                            parentId: { type: 'string' },
                                            isActive: { type: 'boolean', default: true }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Account created successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                data: { $ref: '#/components/schemas/ChartOfAccounts' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/accounts/{id}': {
                    get: {
                        summary: 'Get Account Details',
                        description: 'Retrieve detailed information about a specific account',
                        tags: ['Enhanced Journal Management'],
                        parameters: [
                            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Account details retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: { $ref: '#/components/schemas/ChartOfAccounts' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    put: {
                        summary: 'Update Account',
                        description: 'Update an existing account in the chart of accounts',
                        tags: ['Enhanced Journal Management'],
                        parameters: [
                            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            code: { type: 'string' },
                                            typeId: { type: 'string' },
                                            parentId: { type: 'string' },
                                            isActive: { type: 'boolean' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Account updated successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                data: { $ref: '#/components/schemas/ChartOfAccounts' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/stats/{companyId}': {
                    get: {
                        summary: 'Get Journal Statistics',
                        description: 'Retrieve comprehensive statistics for journal entries',
                        tags: ['Enhanced Journal Management'],
                        parameters: [
                            { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
                            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
                            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Journal statistics retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        period: {
                                                            type: 'object',
                                                            properties: {
                                                                start: { type: 'string', format: 'date' },
                                                                end: { type: 'string', format: 'date' }
                                                            }
                                                        },
                                                        entries: {
                                                            type: 'object',
                                                            properties: {
                                                                draft: { type: 'number' },
                                                                posted: { type: 'number' },
                                                                voided: { type: 'number' },
                                                                total: { type: 'number' }
                                                            }
                                                        },
                                                        amounts: {
                                                            type: 'object',
                                                            properties: {
                                                                totalDebit: { type: 'number' },
                                                                totalCredit: { type: 'number' },
                                                                netAmount: { type: 'number' }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/batch-post': {
                    post: {
                        summary: 'Batch Post Journal Entries',
                        description: 'Post multiple journal entries in a single operation',
                        tags: ['Enhanced Journal Management'],
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['entryIds'],
                                        properties: {
                                            entryIds: {
                                                type: 'array',
                                                items: { type: 'string' }
                                            },
                                            postedBy: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        responses: {
                            '200': {
                                description: 'Batch post operation completed',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                message: { type: 'string' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        posted: {
                                                            type: 'array',
                                                            items: { $ref: '#/components/schemas/JournalEntry' }
                                                        },
                                                        errors: {
                                                            type: 'array',
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    entryId: { type: 'string' },
                                                                    error: { type: 'string' }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                '/enhanced-journal-management/audit-trail/{entryId}': {
                    get: {
                        summary: 'Get Journal Entry Audit Trail',
                        description: 'Retrieve the complete audit trail for a journal entry',
                        tags: ['Enhanced Journal Management'],
                        parameters: [
                            { name: 'entryId', in: 'path', required: true, schema: { type: 'string' } }
                        ],
                        responses: {
                            '200': {
                                description: 'Audit trail retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                success: { type: 'boolean' },
                                                data: {
                                                    type: 'object',
                                                    properties: {
                                                        originalEntry: { $ref: '#/components/schemas/JournalEntry' },
                                                        relatedEntries: {
                                                            type: 'array',
                                                            items: { $ref: '#/components/schemas/JournalEntry' }
                                                        },
                                                        timeline: {
                                                            type: 'array',
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    date: { type: 'string', format: 'date-time' },
                                                                    action: { type: 'string' },
                                                                    description: { type: 'string' },
                                                                    user: { type: 'string' }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // Enhanced Financial Reports endpoints
            '/api/enhanced-financial-reports/balance-sheet': {
                get: {
                    summary: 'Generate Enhanced Balance Sheet',
                    tags: ['Enhanced Financial Reports'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'asOfDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Balance sheet generated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/BalanceSheet' },
                                            message: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            },
            '/api/enhanced-financial-reports/profit-loss': {
                get: {
                    summary: 'Generate Enhanced Profit & Loss Statement',
                    tags: ['Enhanced Financial Reports'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
                        { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Profit & Loss statement generated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/ProfitAndLoss' },
                                            message: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            },
            '/api/enhanced-financial-reports/cash-flow': {
                get: {
                    summary: 'Generate Enhanced Cash Flow Statement',
                    tags: ['Enhanced Financial Reports'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
                        { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Cash flow statement generated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/CashFlowStatement' },
                                            message: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            },
            '/api/enhanced-financial-reports/ratios': {
                get: {
                    summary: 'Calculate Financial Ratios',
                    tags: ['Enhanced Financial Reports'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'companyId', in: 'query', required: true, schema: { type: 'string' } },
                        { name: 'asOfDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Financial ratios calculated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    ratios: {
                                                        type: 'object',
                                                        properties: {
                                                            currentRatio: { type: 'number' },
                                                            quickRatio: { type: 'number' },
                                                            debtToEquityRatio: { type: 'number' },
                                                            returnOnAssets: { type: 'number' },
                                                            returnOnEquity: { type: 'number' },
                                                            grossProfitMargin: { type: 'number' },
                                                            netProfitMargin: { type: 'number' },
                                                            assetTurnover: { type: 'number' }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            },
            '/api/enhanced-financial-reports/templates': {
                get: {
                    summary: 'Get Report Templates',
                    tags: ['Enhanced Financial Reports'],
                    security: [{ bearerAuth: [] }],
                    responses: {
                        '200': {
                            description: 'Report templates retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        id: { type: 'string' },
                                                        name: { type: 'string' },
                                                        description: { type: 'string' },
                                                        type: { type: 'string' },
                                                        columns: { type: 'array' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            },
            '/api/enhanced-financial-reports/export': {
                post: {
                    summary: 'Export Financial Report',
                    tags: ['Enhanced Financial Reports'],
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        report: { type: 'object' },
                                        format: { type: 'string', enum: ['pdf', 'excel', 'csv'] }
                                    },
                                    required: ['report', 'format']
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Report exported successfully',
                            content: {
                                'application/octet-stream': {
                                    schema: { type: 'string', format: 'binary' }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            },
            // Tax Management endpoints
            '/api/tax/rates': {
                get: {
                    summary: 'List Tax Rates',
                    tags: ['Tax Management'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'companyId', in: 'query', required: false, schema: { type: 'string' } },
                        { name: 'isActive', in: 'query', required: false, schema: { type: 'boolean' } },
                        { name: 'taxName', in: 'query', required: false, schema: { type: 'string' } },
                        { name: 'appliesTo', in: 'query', required: false, schema: { type: 'string', enum: ['products', 'services', 'all'] } },
                        { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1 } },
                        { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100 } }
                    ],
                    responses: {
                        '200': {
                            description: 'Tax rates retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/TaxRate' }
                                            },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                },
                post: {
                    summary: 'Create Tax Rate',
                    tags: ['Tax Management'],
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        companyId: { type: 'string' },
                                        taxName: { type: 'string' },
                                        rate: { type: 'number', minimum: 0, maximum: 100 },
                                        appliesTo: { type: 'string', enum: ['products', 'services', 'all'] },
                                        isActive: { type: 'boolean' }
                                    },
                                    required: ['companyId', 'taxName', 'rate']
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Tax rate created successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/TaxRate' },
                                            message: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            },
            '/api/tax/rates/{id}': {
                put: {
                    summary: 'Update Tax Rate',
                    tags: ['Tax Management'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        taxName: { type: 'string' },
                                        rate: { type: 'number', minimum: 0, maximum: 100 },
                                        appliesTo: { type: 'string', enum: ['products', 'services', 'all'] },
                                        isActive: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Tax rate updated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/TaxRate' },
                                            message: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                },
                delete: {
                    summary: 'Delete Tax Rate',
                    tags: ['Tax Management'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '204': { description: 'Tax rate deleted successfully' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            },
            '/api/tax/calculate': {
                post: {
                    summary: 'Calculate Tax',
                    tags: ['Tax Management'],
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        companyId: { type: 'string' },
                                        currency: { type: 'string', minLength: 3, maxLength: 3 },
                                        applyCompound: { type: 'boolean' },
                                        lines: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'string' },
                                                    description: { type: 'string' },
                                                    type: { type: 'string' },
                                                    amount: { type: 'number' },
                                                    taxExclusive: { type: 'boolean' },
                                                    manualRate: { type: 'number' }
                                                },
                                                required: ['amount']
                                            }
                                        }
                                    },
                                    required: ['companyId', 'lines']
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Tax calculated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    totalTax: { type: 'number' },
                                                    totalAmount: { type: 'number' },
                                                    lines: {
                                                        type: 'array',
                                                        items: {
                                                            type: 'object',
                                                            properties: {
                                                                lineId: { type: 'string' },
                                                                taxAmount: { type: 'number' },
                                                                taxRate: { type: 'number' },
                                                                taxName: { type: 'string' }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            },
            // Bank Feeds endpoints
            '/api/bank-feeds/connections': {
                get: {
                    summary: 'List Bank Connections',
                    tags: ['Bank Feeds'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'companyId', in: 'query', required: false, schema: { type: 'string' } },
                        { name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['active', 'inactive', 'error'] } }
                    ],
                    responses: {
                        '200': {
                            description: 'Bank connections retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/BankConnection' }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                },
                post: {
                    summary: 'Create Bank Connection',
                    tags: ['Bank Feeds'],
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        companyId: { type: 'string' },
                                        bankName: { type: 'string' },
                                        accountType: { type: 'string' },
                                        accountNumber: { type: 'string' },
                                        credentials: { type: 'object' }
                                    },
                                    required: ['companyId', 'bankName', 'accountType', 'accountNumber']
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Bank connection created successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/BankConnection' },
                                            message: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            },
            '/api/bank-feeds/connections/{id}': {
                get: {
                    summary: 'Get Bank Connection',
                    tags: ['Bank Feeds'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Bank connection retrieved successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/BankConnection' }
                                        }
                                    }
                                }
                            }
                        },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                },
                put: {
                    summary: 'Update Bank Connection',
                    tags: ['Bank Feeds'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        bankName: { type: 'string' },
                                        accountType: { type: 'string' },
                                        accountNumber: { type: 'string' },
                                        credentials: { type: 'object' },
                                        status: { type: 'string', enum: ['active', 'inactive'] }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Bank connection updated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/BankConnection' },
                                            message: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                },
                delete: {
                    summary: 'Delete Bank Connection',
                    tags: ['Bank Feeds'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    responses: {
                        '204': { description: 'Bank connection deleted successfully' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            },
            '/api/bank-feeds/sync/{connectionId}': {
                post: {
                    summary: 'Sync Bank Data',
                    tags: ['Bank Feeds'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'connectionId', in: 'path', required: true, schema: { type: 'string' } }
                    ],
                    requestBody: {
                        required: false,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        startDate: { type: 'string', format: 'date' },
                                        endDate: { type: 'string', format: 'date' },
                                        forceSync: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Bank data synced successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    transactionsImported: { type: 'integer' },
                                                    lastSyncDate: { type: 'string', format: 'date-time' },
                                                    nextSyncDate: { type: 'string', format: 'date-time' }
                                                }
                                            },
                                            message: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '404': { $ref: '#/components/responses/NotFound' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            }
        }
    };
    return doc;
}
