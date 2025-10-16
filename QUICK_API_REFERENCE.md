# 📚 URUTIIQ API - Quick Reference Guide

**Base URL**: `http://localhost:4000`  
**Authentication**: Bearer Token (JWT)  
**Headers**: `x-tenant-id`, `x-company-id`

---

## 🚀 Quick Start

### Authentication
```bash
# Login
POST /auth/login
{
  "email": "admin@urutiq.app",
  "password": "Admin123!"
}

# Returns
{
  "accessToken": "eyJhbGc...",
  "user": {...}
}
```

### Use Token
```bash
curl -H "Authorization: Bearer {token}" \
     -H "x-tenant-id: demo-tenant" \
     -H "x-company-id: demo-company" \
     {endpoint}
```

---

## 📦 Purchase Orders

### List POs
```
GET /api/purchase-orders?page=1&pageSize=20&status=received
```

### Mark as Received
```
POST /api/purchase-orders/{id}/deliver
{
  "deliveredDate": "2024-10-10T10:00:00Z",
  "deliveredBy": "Staff Name"
}
```

### Download PDF
```
GET /api/purchase-orders/{id}/pdf
```

### Download Good Receipt
```
GET /api/good-receipts/purchase-orders/{id}/good-receipt/pdf
```

### Send to Vendor
```
POST /api/purchase-orders/{id}/send-to-vendor
{
  "vendorEmail": "vendor@email.com"
}
```

---

## 💰 Expenses

### Get Journal Entries
```
GET /api/expenses/{id}/journal-entries
```

### Submit Expense
```
POST /api/expenses/{id}/submit
```

### Approve/Reject
```
POST /api/expenses/{id}/approve
POST /api/expenses/{id}/reject
{
  "reason": "Reason for rejection"
}
```

---

## 📒 Journal Hub

### List Entries
```
GET /api/journal-hub/entries?page=1&status=POSTED&search=rent
```

### Create Entry
```
POST /api/journal-hub/entries
{
  "date": "2024-10-10",
  "memo": "Description",
  "entryTypeId": "...",
  "lines": [
    {"accountId": "...", "debit": 100, "credit": 0},
    {"accountId": "...", "debit": 0, "credit": 100}
  ]
}
```

### Post Entry
```
POST /api/journal-hub/entries/{id}/post
```

### Void Entry
```
POST /api/journal-hub/entries/{id}/void
{
  "reason": "Voiding reason"
}
```

### Download PDF
```
GET /api/journal-hub/entries/{id}/pdf
```

---

## 📊 Chart of Accounts

### List Accounts
```
GET /api/accounts?typeId=...&search=cash
```

### Create Account
```
POST /api/accounts
{
  "code": "1000",
  "name": "Cash",
  "typeId": "...",
  "parentId": "..." // optional
}
```

### Get Account Types
```
GET /api/account-types
```

---

## 🔒 Security

### Required Headers
- `Authorization: Bearer {token}`
- `x-tenant-id: {tenantId}`
- `x-company-id: {companyId}` (optional)

### Roles
- `admin` - Full access
- `accountant` - Accounting ops
- `manager` - Approvals
- `user` - Basic ops

---

## ⚠️ Common Errors

### 400 - Bad Request
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid data"
}
```

### 401 - Unauthorized
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

### 403 - Forbidden
```json
{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions"
}
```

### 404 - Not Found
```json
{
  "error": "NOT_FOUND",
  "message": "Resource not found"
}
```

---

## 📝 Response Formats

### Success (200/201)
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

### Paginated List
```json
{
  "items": [...],
  "page": 1,
  "pageSize": 20,
  "total": 100,
  "totalPages": 5
}
```

### Error
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Error description"
}
```

---

## 🛠️ Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## 📖 Full Documentation

- **OpenAPI Spec**: `apps/api/src/openapi-extensions.ts`
- **Detailed Guide**: `apps/api/OPENAPI_UPDATE_REPORT.md`
- **Complete Summary**: `API_DOCUMENTATION_COMPLETE.md`

---

*Quick Reference v1.0 - December 2024*

