# UrutiIQ API Documentation

## Overview
The UrutiIQ API is a comprehensive accounting and document management system with AI-powered features. This document provides a complete list of all available API endpoints organized by functionality.

## Base URL
- Development: `http://localhost:4000`
- Production: `https://api.urutiq.com`

## Authentication
All endpoints (except public ones) require Bearer token authentication:
```
Authorization: Bearer <your-jwt-token>
```

## Headers
- `x-tenant-id`: Required for multi-tenant operations
- `x-company-id`: Optional company context
- `Content-Type`: `application/json` for JSON requests

## API Endpoints

### System Endpoints

#### Health Check
- **GET** `/health`
  - **Description**: Check system health and status
  - **Authentication**: None (public)
  - **Response**: System status, timestamp, and version

### Authentication Endpoints

#### User Login
- **POST** `/auth/login`
  - **Description**: Authenticate user and get JWT token
  - **Authentication**: None (public)
  - **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "password123"
    }
    ```
  - **Response**: JWT token, user info, expiration

#### User Registration
- **POST** `/auth/register`
  - **Description**: Register new user account
  - **Authentication**: None (public)
  - **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "password123",
      "name": "John Doe"
    }
    ```
  - **Response**: JWT token, user info, expiration

### Company Management Endpoints

#### List Companies
- **GET** `/companies`
  - **Description**: Get list of companies for the tenant
  - **Query Parameters**: None
  - **Response**: Array of company objects

#### Create Company
- **POST** `/companies`
  - **Description**: Create new company
  - **Request Body**:
    ```json
    {
      "name": "Acme Corp",
      "industry": "Technology",
      "address": "123 Main St",
      "phone": "+1-555-0123",
      "email": "contact@acme.com",
      "website": "https://acme.com"
    }
    ```
  - **Response**: Created company object

#### Get Company
- **GET** `/companies/{id}`
  - **Description**: Get company by ID
  - **Path Parameters**: `id` (string) - Company ID
  - **Response**: Company object

#### Update Company
- **PUT** `/companies/{id}`
  - **Description**: Update company information
  - **Path Parameters**: `id` (string) - Company ID
  - **Request Body**: Same as create company
  - **Response**: Updated company object

#### Delete Company
- **DELETE** `/companies/{id}`
  - **Description**: Delete company
  - **Path Parameters**: `id` (string) - Company ID
  - **Response**: 204 No Content

### Accounting Endpoints

#### Account Types

##### List Account Types
- **GET** `/account-types`
  - **Description**: Get list of account types
  - **Query Parameters**: `companyId` (optional)
  - **Response**: Array of account type objects

##### Create Account Type
- **POST** `/account-types`
  - **Description**: Create new account type
  - **Request Body**:
    ```json
    {
      "code": "ASSET",
      "name": "Assets",
      "description": "Company assets",
      "normalBalance": "debit",
      "category": "Balance Sheet",
      "companyId": "company-id"
    }
    ```
  - **Response**: Created account type object

##### Update Account Type
- **PUT** `/account-types/{id}`
  - **Description**: Update account type
  - **Path Parameters**: `id` (string) - Account type ID
  - **Request Body**: Same as create account type
  - **Response**: Updated account type object

##### Delete Account Type
- **DELETE** `/account-types/{id}`
  - **Description**: Delete account type
  - **Path Parameters**: `id` (string) - Account type ID
  - **Response**: 204 No Content

#### Accounts

##### List Accounts
- **GET** `/accounts`
  - **Description**: Get list of accounts with filtering
  - **Query Parameters**: 
    - `companyId` (optional)
    - `accountTypeId` (optional)
    - `isActive` (optional boolean)
  - **Response**: Array of account objects with hierarchical structure

##### Create Account
- **POST** `/accounts`
  - **Description**: Create new account
  - **Request Body**:
    ```json
    {
      "code": "1000",
      "name": "Cash",
      "description": "Cash on hand",
      "accountTypeId": "account-type-id",
      "parentId": "parent-account-id",
      "isActive": true,
      "companyId": "company-id"
    }
    ```
  - **Response**: Created account object

##### Get Account
- **GET** `/accounts/{id}`
  - **Description**: Get account by ID
  - **Path Parameters**: `id` (string) - Account ID
  - **Response**: Account object with children

##### Update Account
- **PUT** `/accounts/{id}`
  - **Description**: Update account
  - **Path Parameters**: `id` (string) - Account ID
  - **Request Body**: Same as create account
  - **Response**: Updated account object

##### Get Accounts Summary
- **GET** `/accounts/summary`
  - **Description**: Get accounts summary statistics
  - **Query Parameters**: `companyId` (optional)
  - **Response**: Summary object with counts and statistics

### Banking Endpoints

#### Bank Accounts

##### List Bank Accounts
- **GET** `/bank-accounts`
  - **Description**: Get list of bank accounts
  - **Query Parameters**: `companyId` (optional)
  - **Response**: Array of bank account objects

##### Create Bank Account
- **POST** `/bank-accounts`
  - **Description**: Create new bank account
  - **Request Body**:
    ```json
    {
      "bankName": "First National Bank",
      "accountNumber": "1234567890",
      "accountType": "checking",
      "currency": "USD",
      "companyId": "company-id"
    }
    ```
  - **Response**: Created bank account object

#### Payments

##### Create Payment
- **POST** `/payments`
  - **Description**: Create new payment
  - **Request Body**:
    ```json
    {
      "companyId": "company-id",
      "transactionId": "transaction-id",
      "bankAccountId": "bank-account-id",
      "method": "check",
      "reference": "CHK001",
      "amount": 1000.00,
      "paymentDate": "2024-01-15",
      "fxGainLoss": 0,
      "applications": [
        {
          "invoiceId": "invoice-id",
          "amount": 1000.00
        }
      ]
    }
    ```
  - **Response**: Created payment object

### Bank Feeds Endpoints

#### Bank Connections

##### List Bank Connections
- **GET** `/bank-feeds/connections`
  - **Description**: Get list of bank connections with pagination
  - **Query Parameters**:
    - `status` (optional) - Filter by status: active, inactive, error, pending
    - `bankName` (optional) - Filter by bank name
    - `accountType` (optional) - Filter by account type: checking, savings, credit, loan
    - `page` (optional) - Page number (default: 1)
    - `limit` (optional) - Items per page (default: 20, max: 100)
  - **Response**: Object with connections array and pagination info

##### Create Bank Connection
- **POST** `/bank-feeds/connections`
  - **Description**: Create new bank connection
  - **Request Body**:
    ```json
    {
      "bankName": "Chase Bank",
      "accountNumber": "1234567890",
      "accountType": "checking",
      "currency": "USD",
      "connectionType": "plaid",
      "connectionId": "plaid_connection_id",
      "syncFrequency": "daily",
      "credentials": "encrypted_credentials",
      "metadata": "additional_metadata"
    }
    ```
  - **Response**: Created bank connection object

##### Get Bank Connection
- **GET** `/bank-feeds/connections/{id}`
  - **Description**: Get bank connection by ID
  - **Path Parameters**: `id` (string) - Bank connection ID
  - **Response**: Bank connection object

##### Update Bank Connection
- **PUT** `/bank-feeds/connections/{id}`
  - **Description**: Update bank connection
  - **Path Parameters**: `id` (string) - Bank connection ID
  - **Request Body**: Same as create bank connection
  - **Response**: Updated bank connection object

##### Delete Bank Connection
- **DELETE** `/bank-feeds/connections/{id}`
  - **Description**: Delete bank connection
  - **Path Parameters**: `id` (string) - Bank connection ID
  - **Response**: Success message

##### Sync Bank Transactions
- **POST** `/bank-feeds/connections/{id}/sync`
  - **Description**: Trigger bank transaction sync for a connection
  - **Path Parameters**: `id` (string) - Bank connection ID
  - **Request Body**:
    ```json
    {
      "syncType": "incremental",
      "forceSync": false
    }
    ```
  - **Response**: Sync results with imported/updated transaction counts

#### Bank Transactions

##### List Bank Transactions
- **GET** `/bank-feeds/transactions`
  - **Description**: Get list of bank transactions with pagination
  - **Query Parameters**:
    - `connectionId` (optional) - Filter by connection ID
    - `isReconciled` (optional) - Filter by reconciliation status
    - `transactionType` (optional) - Filter by type: debit, credit, transfer
    - `startDate` (optional) - Filter by start date
    - `endDate` (optional) - Filter by end date
    - `category` (optional) - Filter by category
    - `search` (optional) - Search in description, merchant name, reference
    - `page` (optional) - Page number (default: 1)
    - `limit` (optional) - Items per page (default: 20, max: 100)
  - **Response**: Object with transactions array and pagination info

##### Create Bank Transaction
- **POST** `/bank-feeds/transactions`
  - **Description**: Create new bank transaction
  - **Request Body**:
    ```json
    {
      "connectionId": "connection-id",
      "externalId": "bank_transaction_id",
      "transactionDate": "2024-01-15T10:30:00Z",
      "postedDate": "2024-01-15T10:30:00Z",
      "amount": 1250.50,
      "currency": "USD",
      "description": "Office Supplies Purchase",
      "merchantName": "Office Depot",
      "merchantCategory": "Office Supplies",
      "transactionType": "debit",
      "reference": "REF123456",
      "checkNumber": "CHK001",
      "memo": "Monthly office supplies",
      "category": "Office Expenses",
      "tags": "supplies,office,monthly"
    }
    ```
  - **Response**: Created bank transaction object

##### Update Bank Transaction
- **PUT** `/bank-feeds/transactions/{id}`
  - **Description**: Update bank transaction
  - **Path Parameters**: `id` (string) - Bank transaction ID
  - **Request Body**: Same as create bank transaction
  - **Response**: Updated bank transaction object

#### Reconciliation

##### Run Reconciliation
- **POST** `/bank-feeds/reconcile`
  - **Description**: Run automated reconciliation process
  - **Request Body**:
    ```json
    {
      "connectionId": "connection-id",
      "autoMatch": true,
      "applyRules": true,
      "dateRange": {
        "startDate": "2024-01-01T00:00:00Z",
        "endDate": "2024-01-31T23:59:59Z"
      }
    }
    ```
  - **Response**: Reconciliation job results

#### Reconciliation Rules

##### List Reconciliation Rules
- **GET** `/bank-feeds/reconciliation-rules`
  - **Description**: Get list of reconciliation rules
  - **Query Parameters**:
    - `page` (optional) - Page number (default: 1)
    - `limit` (optional) - Items per page (default: 20, max: 100)
  - **Response**: Object with rules array and pagination info

##### Create Reconciliation Rule
- **POST** `/bank-feeds/reconciliation-rules`
  - **Description**: Create new reconciliation rule
  - **Request Body**:
    ```json
    {
      "name": "Office Supplies Rule",
      "description": "Auto-match office supply transactions",
      "isActive": true,
      "priority": 1,
      "conditions": "{\"merchantName\": \"Office Depot\", \"amount\": {\"min\": 0, \"max\": 5000}}",
      "actions": "{\"category\": \"Office Expenses\", \"autoReconcile\": true}"
    }
    ```
  - **Response**: Created reconciliation rule object

#### Sync Logs

##### Get Sync Logs
- **GET** `/bank-feeds/sync-logs`
  - **Description**: Get synchronization history
  - **Query Parameters**:
    - `connectionId` (optional) - Filter by connection ID
    - `page` (optional) - Page number (default: 1)
    - `limit` (optional) - Items per page (default: 20, max: 100)
  - **Response**: Object with sync logs array and pagination info

### Journal Entries Endpoints

#### Journal Entries

##### List Journal Entries
- **GET** `/journal`
  - **Description**: Get list of journal entries with pagination
  - **Query Parameters**:
    - `companyId` (required) - Company ID
    - `page` (optional) - Page number (default: 1)
    - `pageSize` (optional) - Items per page (default: 20, max: 100)
  - **Response**: Object with journal entries array and pagination info

##### Create Journal Entry
- **POST** `/journal`
  - **Description**: Create new journal entry
  - **Request Body**:
    ```json
    {
      "date": "2024-01-15T00:00:00Z",
      "memo": "Monthly rent payment",
      "reference": "JE-001",
      "companyId": "company-id",
      "lines": [
        {
          "accountId": "rent-expense-account-id",
          "debit": 2000.00,
          "memo": "Office rent"
        },
        {
          "accountId": "cash-account-id",
          "credit": 2000.00,
          "memo": "Cash payment"
        }
      ]
    }
    ```
  - **Response**: Created journal entry object
  - **Note**: Journal entries must be balanced (total debits = total credits)

##### Post Journal Entry
- **POST** `/journal/{id}/post`
  - **Description**: Post a journal entry (change status from DRAFT to POSTED)
  - **Path Parameters**: `id` (string) - Journal entry ID
  - **Request Body**:
    ```json
    {
      "createTransaction": true,
      "transaction": {
        "transactionType": "expense",
        "amount": 2000.00,
        "currency": "USD",
        "transactionDate": "2024-01-15T00:00:00Z",
        "status": "posted",
        "companyId": "company-id"
      }
    }
    ```
  - **Response**: Posted journal entry and optionally created transaction

#### Account Ledger

##### Get Account Ledger
- **GET** `/journal/ledger`
  - **Description**: Get ledger entries for a specific account
  - **Query Parameters**: `accountId` (required) - Account ID
  - **Response**: Object with ledger entries and running balance

#### Financial Reports

##### Generate Trial Balance
- **GET** `/journal/trial-balance`
  - **Description**: Generate trial balance report
  - **Query Parameters**:
    - `companyId` (required) - Company ID
    - `asOf` (optional) - Date for trial balance (default: current date)
  - **Response**: Trial balance with account balances and totals

##### Generate General Ledger
- **GET** `/journal/general-ledger`
  - **Description**: Generate general ledger report
  - **Query Parameters**:
    - `companyId` (required) - Company ID
    - `startDate` (optional) - Start date for report
    - `endDate` (optional) - End date for report
    - `accountId` (optional) - Filter by specific account
    - `accountType` (optional) - Filter by account type
    - `page` (optional) - Page number (default: 1)
    - `pageSize` (optional) - Items per page (default: 20, max: 100)
  - **Response**: General ledger entries with pagination and running balance

### Document Management Endpoints

#### Documents

##### List Documents
- **GET** `/documents`
  - **Description**: Get list of documents with filtering and pagination
  - **Query Parameters**:
    - `companyId` (optional)
    - `search` (optional) - Search in name, displayName, description
    - `category` (optional) - Filter by category ID
    - `status` (optional) - 'active' or 'deleted'
    - `page` (optional) - Page number (default: 1)
    - `limit` (optional) - Items per page (default: 20, max: 100)
  - **Response**: Object with documents array and pagination info

##### Upload Document
- **POST** `/documents/upload`
  - **Description**: Upload new document
  - **Content-Type**: `multipart/form-data`
  - **Request Body**:
    - `file` (required) - File to upload
    - `displayName` (optional) - Display name for document
    - `description` (optional) - Document description
    - `categoryId` (optional) - Category ID
    - `workspaceId` (optional) - Workspace ID
    - `companyId` (optional) - Company ID
  - **Response**: Created document object

##### Get Document
- **GET** `/documents/{id}`
  - **Description**: Get document by ID
  - **Path Parameters**: `id` (string) - Document ID
  - **Response**: Document object with metadata

##### Update Document
- **PUT** `/documents/{id}`
  - **Description**: Update document metadata
  - **Path Parameters**: `id` (string) - Document ID
  - **Request Body**:
    ```json
    {
      "displayName": "Updated Document Name",
      "description": "Updated description",
      "categoryId": "new-category-id",
      "workspaceId": "new-workspace-id"
    }
    ```
  - **Response**: Updated document object

##### Delete Document
- **DELETE** `/documents/{id}`
  - **Description**: Delete document (soft delete)
  - **Path Parameters**: `id` (string) - Document ID
  - **Response**: 204 No Content

##### Download Document
- **GET** `/documents/{id}/download`
  - **Description**: Download document file
  - **Path Parameters**: `id` (string) - Document ID
  - **Response**: Binary file content

##### Get Document Preview
- **GET** `/documents/{id}/preview`
  - **Description**: Get document preview (HTML)
  - **Path Parameters**: `id` (string) - Document ID
  - **Response**: HTML preview content

#### Document Categories

##### List Document Categories
- **GET** `/documents/categories`
  - **Description**: Get list of document categories
  - **Query Parameters**: `companyId` (optional)
  - **Response**: Array of category objects

##### Create Document Category
- **POST** `/documents/categories`
  - **Description**: Create new document category
  - **Request Body**:
    ```json
    {
      "name": "Contracts",
      "description": "Legal contracts and agreements",
      "color": "#3B82F6",
      "companyId": "company-id"
    }
    ```
  - **Response**: Created category object

##### Update Document Category
- **PUT** `/documents/categories/{id}`
  - **Description**: Update document category
  - **Path Parameters**: `id` (string) - Category ID
  - **Request Body**: Same as create category
  - **Response**: Updated category object

##### Delete Document Category
- **DELETE** `/documents/categories/{id}`
  - **Description**: Delete document category
  - **Path Parameters**: `id` (string) - Category ID
  - **Response**: 204 No Content

#### Document Analytics

##### Get Document Statistics
- **GET** `/documents/stats`
  - **Description**: Get document statistics and metrics
  - **Query Parameters**: `companyId` (optional)
  - **Response**: Statistics object with counts and metrics

##### Get Document Analytics
- **GET** `/documents/analytics`
  - **Description**: Get detailed document analytics
  - **Query Parameters**:
    - `companyId` (optional)
    - `dateFrom` (optional) - Start date (YYYY-MM-DD)
    - `dateTo` (optional) - End date (YYYY-MM-DD)
  - **Response**: Analytics object with trends and distributions

#### Bulk Operations

##### Bulk Update Documents
- **PUT** `/documents/bulk`
  - **Description**: Update multiple documents at once
  - **Request Body**:
    ```json
    {
      "documentIds": ["doc1", "doc2", "doc3"],
      "updates": {
        "categoryId": "new-category-id",
        "workspaceId": "new-workspace-id",
        "status": "active"
      }
    }
    ```
  - **Response**: Bulk operation result with success/failure counts

##### Bulk Delete Documents
- **DELETE** `/documents/bulk`
  - **Description**: Delete multiple documents at once
  - **Request Body**:
    ```json
    {
      "documentIds": ["doc1", "doc2", "doc3"]
    }
    ```
  - **Response**: Bulk operation result with success/failure counts

### AI-Powered Features

#### Document Analysis

##### Analyze Document
- **POST** `/documents/{id}/analyze`
  - **Description**: Analyze document with AI
  - **Path Parameters**: `id` (string) - Document ID
  - **Request Body**:
    ```json
    {
      "analysisType": "text_extraction",
      "options": {
        "language": "en",
        "extractImages": true,
        "extractTables": true
      }
    }
    ```
  - **Response**: Analysis result with job ID and status

### Workflow Management

#### Document Workflows

##### Get Document Workflows
- **GET** `/documents/{id}/workflows`
  - **Description**: Get workflows for a document
  - **Path Parameters**: `id` (string) - Document ID
  - **Response**: Array of workflow objects

##### Create Document Workflow
- **POST** `/documents/{id}/workflows`
  - **Description**: Create workflow for document
  - **Path Parameters**: `id` (string) - Document ID
  - **Request Body**:
    ```json
    {
      "workflowType": "approval",
      "assignedTo": "user-id",
      "comments": "Please review and approve",
      "metadata": "{\"priority\": \"high\"}"
    }
    ```
  - **Response**: Created workflow object

### Security & Access Control

#### Document Access Control

##### Get Document Access Control
- **GET** `/documents/{id}/access-control`
  - **Description**: Get access control settings for document
  - **Path Parameters**: `id` (string) - Document ID
  - **Response**: Access control object

##### Set Document Access Control
- **POST** `/documents/{id}/access-control`
  - **Description**: Set access control for document
  - **Path Parameters**: `id` (string) - Document ID
  - **Request Body**:
    ```json
    {
      "accessLevel": "confidential",
      "userGroups": "managers,accountants",
      "timeRestrictions": "9-17",
      "ipRestrictions": "192.168.1.0/24",
      "mfaRequired": true
    }
    ```
  - **Response**: Created access control object

### Webhooks & Integrations

#### Document Webhooks

##### Get Document Webhooks
- **GET** `/documents/{id}/webhooks`
  - **Description**: Get webhooks for a document
  - **Path Parameters**: `id` (string) - Document ID
  - **Response**: Array of webhook objects

##### Create Document Webhook
- **POST** `/documents/{id}/webhooks`
  - **Description**: Create webhook for document events
  - **Path Parameters**: `id` (string) - Document ID
  - **Request Body**:
    ```json
    {
      "eventType": "uploaded",
      "webhookUrl": "https://example.com/webhook",
      "secret": "webhook-secret",
      "isActive": true
    }
    ```
  - **Response**: Created webhook object

### Compliance & Auditing

#### Document Compliance

##### Get Document Compliance Checks
- **GET** `/documents/{id}/compliance`
  - **Description**: Get compliance checks for document
  - **Path Parameters**: `id` (string) - Document ID
  - **Response**: Array of compliance check objects

##### Run Compliance Check
- **POST** `/documents/{id}/compliance`
  - **Description**: Run compliance check on document
  - **Path Parameters**: `id` (string) - Document ID
  - **Request Body**:
    ```json
    {
      "checkType": "gdpr",
      "documentId": "document-id"
    }
    ```
  - **Response**: Compliance check result

## Financial Reports Endpoints

The Advanced Financial Reporting Suite provides comprehensive financial reporting capabilities including custom report creation, templates, scheduling, and execution.

### List Financial Reports
**GET** `/api/reports`

Retrieve a paginated list of financial reports for the company.

**Query Parameters:**
- `type` (optional): Filter by report type (`balance_sheet`, `income_statement`, `cash_flow`, `equity`, `custom`)
- `isTemplate` (optional): Filter by template status (boolean)
- `isPublic` (optional): Filter by public status (boolean)
- `search` (optional): Search in report name and description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 20, max: 100)

**Response:**
```json
{
  "reports": [
    {
      "id": "clx1234567890",
      "name": "Monthly Balance Sheet",
      "type": "balance_sheet",
      "description": "Comprehensive monthly balance sheet report",
      "isTemplate": false,
      "isPublic": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "createdByUser": {
        "id": "user123",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "_count": {
        "reportItems": 15,
        "reportSchedules": 2
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### Create Financial Report
**POST** `/api/reports`

Create a new financial report with optional report items.

**Request Body:**
```json
{
  "name": "Custom Financial Report",
  "type": "balance_sheet",
  "description": "Custom balance sheet with specific accounts",
  "isTemplate": false,
  "isPublic": false,
  "metadata": "{\"period\": \"monthly\", \"comparison\": true}",
  "items": [
    {
      "name": "Total Assets",
      "type": "account",
      "order": 1,
      "accountIds": "acc1,acc2,acc3",
      "configuration": "{\"format\": \"currency\", \"showDetails\": true}"
    },
    {
      "name": "Net Income",
      "type": "calculation",
      "order": 2,
      "formula": "revenue - expenses",
      "configuration": "{\"format\": \"currency\"}"
    }
  ]
}
```

**Response:** Returns the created financial report with full details.

### Get Financial Report
**GET** `/api/reports/{id}`

Retrieve a specific financial report by ID.

**Path Parameters:**
- `id`: Report ID

**Response:** Returns the financial report with all items and schedules.

### Update Financial Report
**PUT** `/api/reports/{id}`

Update an existing financial report.

**Path Parameters:**
- `id`: Report ID

**Request Body:**
```json
{
  "name": "Updated Report Name",
  "description": "Updated description",
  "isPublic": true
}
```

**Response:**
```json
{
  "message": "Report updated successfully"
}
```

### Delete Financial Report
**DELETE** `/api/reports/{id}`

Delete a financial report and all its associated items.

**Path Parameters:**
- `id`: Report ID

**Response:**
```json
{
  "message": "Report deleted successfully"
}
```

### Execute Financial Report
**POST** `/api/reports/{id}/execute`

Execute a financial report and return calculated data.

**Path Parameters:**
- `id`: Report ID

**Request Body:**
```json
{
  "parameters": "{\"asOfDate\": \"2024-01-31\", \"includeDetails\": true}"
}
```

**Response:**
```json
{
  "executionId": "exec1234567890",
  "status": "success",
  "data": {
    "report": {
      "id": "clx1234567890",
      "name": "Monthly Balance Sheet",
      "type": "balance_sheet",
      "description": "Comprehensive monthly balance sheet report"
    },
    "items": [
      {
        "id": "item123",
        "name": "Total Assets",
        "type": "account",
        "order": 1,
        "value": 1234567.89,
        "details": [
          {
            "id": "acc1",
            "name": "Cash and Cash Equivalents",
            "code": "1000",
            "type": "Asset",
            "balance": 234567.89
          }
        ],
        "configuration": {
          "format": "currency",
          "showDetails": true
        }
      }
    ],
    "summary": {
      "totalAssets": 1234567.89,
      "totalLiabilities": 567890.12,
      "totalEquity": 666677.77,
      "totalRevenue": 0,
      "totalExpenses": 0,
      "netIncome": 0
    },
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get Report Executions
**GET** `/api/reports/{id}/executions`

Retrieve execution history for a specific report.

**Path Parameters:**
- `id`: Report ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 20, max: 100)

**Response:**
```json
{
  "executions": [
    {
      "id": "exec1234567890",
      "executedAt": "2024-01-15T10:30:00Z",
      "status": "success",
      "executedByUser": {
        "id": "user123",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

### Add Report Item
**POST** `/api/reports/{id}/items`

Add a new item to a financial report.

**Path Parameters:**
- `id`: Report ID

**Request Body:**
```json
{
  "name": "New Report Item",
  "type": "account",
  "order": 3,
  "accountIds": "acc4,acc5",
  "configuration": "{\"format\": \"percentage\"}"
}
```

**Response:** Returns the created report item.

### Update Report Item
**PUT** `/api/reports/{id}/items/{itemId}`

Update a specific item in a financial report.

**Path Parameters:**
- `id`: Report ID
- `itemId`: Report item ID

**Request Body:**
```json
{
  "name": "Updated Item Name",
  "order": 4,
  "configuration": "{\"format\": \"currency\", \"showDetails\": false}"
}
```

**Response:**
```json
{
  "message": "Report item updated successfully"
}
```

### Delete Report Item
**DELETE** `/api/reports/{id}/items/{itemId}`

Delete a specific item from a financial report.

**Path Parameters:**
- `id`: Report ID
- `itemId`: Report item ID

**Response:**
```json
{
  "message": "Report item deleted successfully"
}
```

### List Report Templates
**GET** `/api/reports/templates`

Retrieve available report templates.

**Query Parameters:**
- `type` (optional): Filter by template type
- `category` (optional): Filter by template category (`industry`, `standard`, `custom`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 20, max: 100)

**Response:**
```json
{
  "templates": [
    {
      "id": "tmpl1234567890",
      "name": "Standard Balance Sheet",
      "type": "balance_sheet",
      "category": "standard",
      "description": "Standard balance sheet template",
      "isPublic": true,
      "createdByUser": {
        "id": "user123",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "pages": 2
  }
}
```

### Create Report Template
**POST** `/api/reports/templates`

Create a new report template.

**Request Body:**
```json
{
  "name": "Custom Template",
  "type": "income_statement",
  "category": "custom",
  "description": "Custom income statement template",
  "configuration": "{\"items\": [{\"name\": \"Revenue\", \"type\": \"account\"}]}",
  "isPublic": false
}
```

**Response:** Returns the created report template.

### Report Types

The system supports the following report types:

1. **Balance Sheet** (`balance_sheet`): Shows assets, liabilities, and equity
2. **Income Statement** (`income_statement`): Shows revenue, expenses, and net income
3. **Cash Flow** (`cash_flow`): Shows operating, investing, and financing cash flows
4. **Equity** (`equity`): Shows changes in equity over time
5. **Custom** (`custom`): User-defined custom reports

### Report Item Types

Report items can be of the following types:

1. **Account** (`account`): References specific accounts from the chart of accounts
2. **Calculation** (`calculation`): Uses formulas to calculate values
3. **Text** (`text`): Displays static text or labels
4. **Chart** (`chart`): Generates visual charts and graphs

### Report Scheduling

Reports can be scheduled for automatic execution with the following frequencies:

- **Daily**: Runs every day
- **Weekly**: Runs once per week
- **Monthly**: Runs once per month
- **Quarterly**: Runs once per quarter
- **Yearly**: Runs once per year

### Export Formats

Reports can be exported in the following formats:

- **PDF**: Portable Document Format
- **Excel**: Microsoft Excel format
- **CSV**: Comma-separated values

### Error Handling

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

Error responses include detailed error messages:

```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "name",
      "message": "Report name is required"
    }
  ]
}
```

## Response Formats

### Success Responses
- **200 OK**: Successful GET, PUT requests
- **201 Created**: Successful POST requests
- **204 No Content**: Successful DELETE requests

### Error Responses
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

### Error Response Format
```json
{
  "code": "error_code",
  "message": "Human readable error message",
  "details": {
    "field": "Additional error details"
  }
}
```

## Rate Limiting
- General endpoints: 100 requests per minute
- Authentication endpoints: 10 requests per minute
- Upload endpoints: 20 requests per minute

## Pagination
List endpoints support pagination with these parameters:
- `page`: Page number (1-based, default: 1)
- `limit`: Items per page (default: 20, max: 100)

Pagination response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## WebSocket Events (Future)
Real-time updates for:
- Document upload progress
- Workflow status changes
- AI analysis completion
- System notifications

## SDKs and Libraries
- JavaScript/TypeScript SDK (planned)
- Python SDK (planned)
- Postman Collection (available)

## Support
- API Documentation: `/docs` (Swagger UI)
- OpenAPI Spec: `/openapi.json`
- Support Email: api-support@urutiq.com
