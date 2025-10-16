import type { OpenAPIV3 } from 'openapi-types';

/**
 * OpenAPI Extensions for New API Endpoints
 * This file contains OpenAPI documentation for recently added endpoints
 * that are not yet included in the main openapi.ts file
 */

export const newPaths: OpenAPIV3.PathsObject = {
  // ===================================================================
  // PURCHASE ORDER DELIVERY & RECEIPT ENDPOINTS
  // ===================================================================
  
  '/api/purchase-orders/{id}/deliver': {
    post: {
      summary: 'Mark purchase order as received/delivered',
      description: 'Marks a purchase order as received, updates inventory stock levels, creates inventory movements, and generates journal entries.',
      tags: ['Purchase Orders'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Purchase order ID',
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['deliveredDate'],
              properties: {
                deliveredDate: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Date when goods were received'
                },
                deliveredBy: {
                  type: 'string',
                  description: 'Name of person who received the goods'
                },
                notes: {
                  type: 'string',
                  description: 'Additional notes about the delivery'
                },
                journalEntryData: {
                  type: 'object',
                  properties: {
                    memo: {
                      type: 'string',
                      description: 'Memo for the journal entry'
                    },
                    reference: {
                      type: 'string',
                      description: 'Reference number for the journal entry'
                    }
                  }
                }
              }
            },
            example: {
              deliveredDate: '2024-10-10T10:00:00Z',
              deliveredBy: 'Warehouse Staff',
              notes: 'All items received in good condition',
              journalEntryData: {
                memo: 'Inventory received from PO PO-2024-001',
                reference: 'PO-PO-2024-001-RECEIVED'
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Purchase order marked as received successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Purchase order marked as received successfully' },
                  data: {
                    type: 'object',
                    properties: {
                      purchaseOrder: { $ref: '#/components/schemas/PurchaseOrder' },
                      inventoryMovements: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/InventoryMovement' }
                      },
                      journalEntry: { $ref: '#/components/schemas/JournalEntry' }
                    }
                  }
                }
              }
            }
          }
        },
        '400': {
          description: 'Invalid request data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        '404': {
          description: 'Purchase order not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        '500': {
          description: 'Server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/api/purchase-orders/{id}/delivery-status': {
    get: {
      summary: 'Get purchase order delivery status',
      description: 'Retrieves the delivery/receiving status of a purchase order including progress and quantities.',
      tags: ['Purchase Orders'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Purchase order ID',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Delivery status retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  purchaseOrderId: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['draft', 'sent', 'approved', 'received', 'closed', 'cancelled']
                  },
                  totalOrdered: { type: 'number' },
                  totalReceived: { type: 'number' },
                  totalDelivered: { type: 'number' },
                  deliveryProgress: {
                    type: 'number',
                    description: 'Percentage of delivery completion'
                  },
                  canDeliver: { type: 'boolean' },
                  isFullyDelivered: { type: 'boolean' },
                  isPartiallyDelivered: { type: 'boolean' }
                }
              },
              example: {
                purchaseOrderId: 'cmgkql25w000912ooi6zztmvq',
                status: 'received',
                totalOrdered: 15,
                totalReceived: 15,
                totalDelivered: 15,
                deliveryProgress: 100,
                canDeliver: false,
                isFullyDelivered: true,
                isPartiallyDelivered: false
              }
            }
          }
        },
        '404': {
          description: 'Purchase order not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  // ===================================================================
  // PURCHASE ORDER PDF ENDPOINTS
  // ===================================================================

  '/api/purchase-orders/{id}/pdf': {
    get: {
      summary: 'Download purchase order PDF',
      description: 'Generates and downloads a professional PDF for a purchase order.',
      tags: ['Purchase Orders', 'PDF Generation'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Purchase order ID',
          schema: { type: 'string' }
        },
        {
          name: 'generatedBy',
          in: 'query',
          required: false,
          description: 'Name of person generating the PDF',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'PDF generated successfully',
          content: {
            'application/pdf': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            }
          },
          headers: {
            'Content-Type': {
              schema: { type: 'string', example: 'application/pdf' }
            },
            'Content-Disposition': {
              schema: { type: 'string', example: 'attachment; filename="PurchaseOrder-PO-2024-001.pdf"' }
            }
          }
        },
        '404': {
          description: 'Purchase order not found'
        },
        '500': {
          description: 'PDF generation failed'
        }
      }
    }
  },

  '/api/purchase-orders/pdf/template': {
    get: {
      summary: 'Preview purchase order PDF template',
      description: 'Generates a sample purchase order PDF with template data for preview purposes.',
      tags: ['Purchase Orders', 'PDF Generation'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'generatedBy',
          in: 'query',
          required: false,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Template PDF generated successfully',
          content: {
            'application/pdf': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            }
          }
        },
        '500': {
          description: 'Template generation failed'
        }
      }
    }
  },

  '/api/purchase-orders/{id}/send-to-vendor': {
    post: {
      summary: 'Send purchase order to vendor via email',
      description: 'Generates a PDF of the purchase order and sends it to the vendor via email.',
      tags: ['Purchase Orders', 'Email'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Purchase order ID',
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['vendorEmail'],
              properties: {
                vendorEmail: {
                  type: 'string',
                  format: 'email',
                  description: 'Vendor email address'
                },
                ccEmails: {
                  type: 'array',
                  items: { type: 'string', format: 'email' },
                  description: 'Additional CC recipients'
                },
                message: {
                  type: 'string',
                  description: 'Custom message to include in email'
                }
              }
            },
            example: {
              vendorEmail: 'orders@vendor.com',
              ccEmails: ['purchasing@company.com'],
              message: 'Please confirm receipt of this purchase order.'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Email sent successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        '404': {
          description: 'Purchase order not found'
        },
        '500': {
          description: 'Email sending failed'
        }
      }
    }
  },

  // ===================================================================
  // GOOD RECEIPT PDF ENDPOINTS
  // ===================================================================

  '/api/good-receipts/purchase-orders/{id}/good-receipt/pdf': {
    get: {
      summary: 'Download good receipt PDF for purchase order',
      description: 'Generates and downloads a professional Good Receipt Note (GRN) PDF for a received purchase order.',
      tags: ['Good Receipts', 'PDF Generation'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Purchase order ID',
          schema: { type: 'string' }
        },
        {
          name: 'generatedBy',
          in: 'query',
          required: false,
          description: 'Name of person generating the receipt',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Good receipt PDF generated successfully',
          content: {
            'application/pdf': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            }
          },
          headers: {
            'Content-Type': {
              schema: { type: 'string', example: 'application/pdf' }
            },
            'Content-Disposition': {
              schema: { type: 'string', example: 'attachment; filename="GoodReceipt-PO-2024-001.pdf"' }
            }
          }
        },
        '400': {
          description: 'Purchase order not in received status'
        },
        '404': {
          description: 'Purchase order not found'
        },
        '500': {
          description: 'PDF generation failed'
        }
      }
    }
  },

  '/api/good-receipts/pdf/template': {
    get: {
      summary: 'Preview good receipt PDF template',
      description: 'Generates a sample good receipt PDF with template data for preview purposes.',
      tags: ['Good Receipts', 'PDF Generation'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'generatedBy',
          in: 'query',
          required: false,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Template PDF generated successfully',
          content: {
            'application/pdf': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            }
          }
        },
        '500': {
          description: 'Template generation failed'
        }
      }
    }
  },

  // ===================================================================
  // EXPENSE JOURNAL INTEGRATION ENDPOINTS
  // ===================================================================

  '/api/expenses/{id}/journal-entries': {
    get: {
      summary: 'Get journal entries for an expense',
      description: 'Retrieves all journal entries associated with a specific expense.',
      tags: ['Expenses', 'Journal Entries'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Expense ID',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Journal entries retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: '#/components/schemas/JournalEntry' },
                    {
                      type: 'object',
                      properties: {
                        lines: {
                          type: 'array',
                          items: {
                            allOf: [
                              { $ref: '#/components/schemas/JournalLine' },
                              {
                                type: 'object',
                                properties: {
                                  account: { $ref: '#/components/schemas/Account' }
                                }
                              }
                            ]
                          }
                        },
                        entryType: { $ref: '#/components/schemas/JournalEntryType' }
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        '404': {
          description: 'Expense not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  '/api/expenses/{id}/submit': {
    post: {
      summary: 'Submit expense for approval',
      description: 'Submits an expense and automatically generates journal entries if not already created.',
      tags: ['Expenses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Expense ID',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Expense submitted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Expense' }
            }
          }
        },
        '404': {
          description: 'Expense not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  '/api/expenses/{id}/approve': {
    post: {
      summary: 'Approve expense',
      description: 'Approves an expense and ensures journal entries are posted.',
      tags: ['Expenses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Expense ID',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Expense approved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Expense' }
            }
          }
        },
        '404': {
          description: 'Expense not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  '/api/expenses/{id}/reject': {
    post: {
      summary: 'Reject expense',
      description: 'Rejects an expense and creates reversal journal entries if needed.',
      tags: ['Expenses'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Expense ID',
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: 'Reason for rejection'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Expense rejected successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Expense' }
            }
          }
        },
        '404': {
          description: 'Expense not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  // ===================================================================
  // JOURNAL HUB ENDPOINTS
  // ===================================================================

  '/api/journal-hub/entries': {
    get: {
      summary: 'Get all journal entries',
      description: 'Retrieves a paginated list of journal entries with filtering and search capabilities.',
      tags: ['Journal Hub'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1, minimum: 1 }
        },
        {
          name: 'pageSize',
          in: 'query',
          schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 }
        },
        {
          name: 'search',
          in: 'query',
          schema: { type: 'string' },
          description: 'Search in reference or memo fields'
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['DRAFT', 'POSTED', 'VOID']
          }
        },
        {
          name: 'entryTypeId',
          in: 'query',
          schema: { type: 'string' }
        },
        {
          name: 'startDate',
          in: 'query',
          schema: { type: 'string', format: 'date' }
        },
        {
          name: 'endDate',
          in: 'query',
          schema: { type: 'string', format: 'date' }
        }
      ],
      responses: {
        '200': {
          description: 'Journal entries retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/JournalEntry' }
                  },
                  page: { type: 'integer' },
                  pageSize: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' }
                }
              }
            }
          }
        },
        '500': {
          description: 'Server error'
        }
      }
    },
    
    post: {
      summary: 'Create journal entry',
      description: 'Creates a new journal entry with balanced debit/credit lines.',
      tags: ['Journal Hub'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['date', 'entryTypeId', 'lines'],
              properties: {
                date: {
                  type: 'string',
                  format: 'date',
                  description: 'Entry date'
                },
                memo: {
                  type: 'string',
                  description: 'Entry description/memo'
                },
                reference: {
                  type: 'string',
                  description: 'Reference number'
                },
                entryTypeId: {
                  type: 'string',
                  description: 'Journal entry type ID'
                },
                status: {
                  type: 'string',
                  enum: ['DRAFT', 'POSTED'],
                  default: 'DRAFT'
                },
                lines: {
                  type: 'array',
                  minItems: 2,
                  description: 'Journal lines (must balance)',
                  items: {
                    type: 'object',
                    required: ['accountId', 'debit', 'credit'],
                    properties: {
                      accountId: { type: 'string' },
                      debit: { type: 'number', minimum: 0 },
                      credit: { type: 'number', minimum: 0 },
                      memo: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Journal entry created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JournalEntry' }
            }
          }
        },
        '400': {
          description: 'Invalid data or unbalanced entry',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  '/api/journal-hub/entries/{id}': {
    get: {
      summary: 'Get journal entry by ID',
      description: 'Retrieves a single journal entry with all its lines and related data.',
      tags: ['Journal Hub'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Journal entry retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JournalEntry' }
            }
          }
        },
        '404': {
          description: 'Journal entry not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    },

    put: {
      summary: 'Update journal entry',
      description: 'Updates an existing journal entry. Only draft entries can be updated.',
      tags: ['Journal Hub'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                date: { type: 'string', format: 'date' },
                memo: { type: 'string' },
                reference: { type: 'string' },
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
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Journal entry updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JournalEntry' }
            }
          }
        },
        '400': {
          description: 'Cannot update posted entry or unbalanced entry'
        },
        '404': {
          description: 'Journal entry not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    },

    delete: {
      summary: 'Delete journal entry',
      description: 'Deletes a journal entry. Only draft entries can be deleted.',
      tags: ['Journal Hub'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Journal entry deleted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Cannot delete posted entry'
        },
        '404': {
          description: 'Journal entry not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  '/api/journal-hub/entries/{id}/post': {
    post: {
      summary: 'Post journal entry',
      description: 'Posts a draft journal entry, making it permanent and affecting the general ledger.',
      tags: ['Journal Hub'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Journal entry posted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JournalEntry' }
            }
          }
        },
        '400': {
          description: 'Entry already posted or not balanced'
        },
        '404': {
          description: 'Journal entry not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  '/api/journal-hub/entries/{id}/void': {
    post: {
      summary: 'Void journal entry',
      description: 'Voids a posted journal entry by creating a reversal entry.',
      tags: ['Journal Hub'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: 'Reason for voiding the entry'
                }
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
                  voidedEntry: { $ref: '#/components/schemas/JournalEntry' },
                  reversalEntry: { $ref: '#/components/schemas/JournalEntry' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Cannot void draft or already voided entry'
        },
        '404': {
          description: 'Journal entry not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  '/api/journal-hub/entries/{id}/pdf': {
    get: {
      summary: 'Download journal entry PDF',
      description: 'Generates and downloads a PDF report for a journal entry.',
      tags: ['Journal Hub', 'PDF Generation'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'PDF generated successfully',
          content: {
            'application/pdf': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            }
          }
        },
        '404': {
          description: 'Journal entry not found'
        },
        '500': {
          description: 'PDF generation failed'
        }
      }
    }
  },

  '/api/journal-hub/entry-types': {
    get: {
      summary: 'Get all journal entry types',
      description: 'Retrieves all configured journal entry types.',
      tags: ['Journal Hub'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' }
      ],
      responses: {
        '200': {
          description: 'Entry types retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/JournalEntryType' }
              }
            }
          }
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  // ===================================================================
  // CHART OF ACCOUNTS ENDPOINTS
  // ===================================================================

  '/api/accounts': {
    get: {
      summary: 'Get chart of accounts',
      description: 'Retrieves the complete chart of accounts with optional filtering.',
      tags: ['Accounts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' },
        {
          name: 'typeId',
          in: 'query',
          schema: { type: 'string' },
          description: 'Filter by account type'
        },
        {
          name: 'search',
          in: 'query',
          schema: { type: 'string' },
          description: 'Search by account name or code'
        }
      ],
      responses: {
        '200': {
          description: 'Accounts retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Account' }
              }
            }
          }
        },
        '500': {
          description: 'Server error'
        }
      }
    },

    post: {
      summary: 'Create account',
      description: 'Creates a new account in the chart of accounts.',
      tags: ['Accounts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        { $ref: '#/components/parameters/CompanyIdHeader' }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['code', 'name', 'typeId'],
              properties: {
                code: {
                  type: 'string',
                  description: 'Account code (e.g., 1000, 2100)'
                },
                name: {
                  type: 'string',
                  description: 'Account name'
                },
                typeId: {
                  type: 'string',
                  description: 'Account type ID'
                },
                parentId: {
                  type: 'string',
                  description: 'Parent account ID for sub-accounts'
                },
                companyId: {
                  type: 'string',
                  description: 'Company ID (defaults to header value)'
                }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Account created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Account' }
            }
          }
        },
        '400': {
          description: 'Invalid data or duplicate account code'
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  '/api/accounts/{id}': {
    get: {
      summary: 'Get account by ID',
      description: 'Retrieves a single account with its details.',
      tags: ['Accounts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Account retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Account' }
            }
          }
        },
        '404': {
          description: 'Account not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    },

    put: {
      summary: 'Update account',
      description: 'Updates an existing account in the chart of accounts.',
      tags: ['Accounts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                parentId: { type: 'string' }
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
              schema: { $ref: '#/components/schemas/Account' }
            }
          }
        },
        '404': {
          description: 'Account not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    },

    delete: {
      summary: 'Delete account',
      description: 'Deletes an account from the chart of accounts. Only allowed if no transactions exist.',
      tags: ['Accounts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' },
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Account deleted successfully'
        },
        '400': {
          description: 'Cannot delete account with transactions'
        },
        '404': {
          description: 'Account not found'
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  },

  '/api/account-types': {
    get: {
      summary: 'Get all account types',
      description: 'Retrieves all account types (Asset, Liability, Equity, Revenue, Expense).',
      tags: ['Accounts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/TenantIdHeader' }
      ],
      responses: {
        '200': {
          description: 'Account types retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/AccountType' }
              }
            }
          }
        },
        '500': {
          description: 'Server error'
        }
      }
    }
  }
};

export const newSchemas: Record<string, OpenAPIV3.SchemaObject> = {
  PurchaseOrder: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      tenantId: { type: 'string' },
      companyId: { type: 'string' },
      vendorId: { type: 'string' },
      poNumber: { type: 'string' },
      orderDate: { type: 'string', format: 'date-time' },
      expectedDelivery: { type: 'string', format: 'date-time' },
      status: {
        type: 'string',
        enum: ['draft', 'sent', 'approved', 'received', 'closed', 'cancelled']
      },
      totalAmount: { type: 'number' },
      currency: { type: 'string' },
      notes: { type: 'string' },
      terms: { type: 'string' },
      receivingStatus: {
        type: 'string',
        enum: ['pending', 'partial', 'complete']
      },
      purchaseType: {
        type: 'string',
        enum: ['local', 'import']
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  InventoryMovement: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      productId: { type: 'string' },
      movementType: {
        type: 'string',
        enum: ['purchase', 'sale', 'adjustment', 'transfer', 'return']
      },
      quantity: { type: 'number' },
      unitCost: { type: 'number' },
      totalCost: { type: 'number' },
      movementDate: { type: 'string', format: 'date-time' },
      reference: { type: 'string' },
      reason: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },

  JournalEntry: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      tenantId: { type: 'string' },
      companyId: { type: 'string' },
      date: { type: 'string', format: 'date' },
      memo: { type: 'string' },
      reference: { type: 'string' },
      status: {
        type: 'string',
        enum: ['DRAFT', 'POSTED', 'VOID']
      },
      entryTypeId: { type: 'string' },
      createdById: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      lines: {
        type: 'array',
        items: { $ref: '#/components/schemas/JournalLine' }
      },
      entryType: { $ref: '#/components/schemas/JournalEntryType' }
    }
  },

  JournalLine: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      tenantId: { type: 'string' },
      journalEntryId: { type: 'string' },
      accountId: { type: 'string' },
      debit: { type: 'number' },
      credit: { type: 'number' },
      memo: { type: 'string' }
    }
  },

  JournalEntryType: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      tenantId: { type: 'string' },
      name: { type: 'string' },
      code: { type: 'string' },
      category: {
        type: 'string',
        description: 'Entry category (e.g., EXPENSE, INVENTORY, SALES)'
      },
      description: { type: 'string' },
      isActive: { type: 'boolean' }
    }
  },

  Account: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      tenantId: { type: 'string' },
      companyId: { type: 'string' },
      code: { type: 'string' },
      name: { type: 'string' },
      typeId: { type: 'string' },
      parentId: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      type: { $ref: '#/components/schemas/AccountType' }
    }
  },

  AccountType: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      tenantId: { type: 'string' },
      name: { type: 'string' },
      code: {
        type: 'string',
        enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']
      },
      normalBalance: {
        type: 'string',
        enum: ['DEBIT', 'CREDIT']
      }
    }
  },

  Expense: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      tenantId: { type: 'string' },
      companyId: { type: 'string' },
      categoryId: { type: 'string' },
      date: { type: 'string', format: 'date' },
      amount: { type: 'number' },
      description: { type: 'string' },
      vendor: { type: 'string' },
      status: {
        type: 'string',
        enum: ['draft', 'submitted', 'pending', 'approved', 'rejected', 'paid']
      },
      paymentMethod: {
        type: 'string',
        enum: ['cash', 'check', 'credit_card', 'bank_transfer', 'other']
      },
      accountCode: { type: 'string' },
      taxAmount: { type: 'number' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    }
  },

  Error: {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
      details: { type: 'object' }
    }
  }
};

