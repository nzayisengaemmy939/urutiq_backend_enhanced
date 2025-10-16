#!/bin/bash

# Accounts Payable API Test Script
# This script tests the accounts payable endpoints to identify bad request issues

BASE_URL="http://localhost:3001"
TENANT_ID="test-tenant"
COMPANY_ID="test-company"

echo "🧪 Testing Accounts Payable API Endpoints"
echo "=========================================="

# Test 1: GET invoices
echo -e "\n1️⃣ Testing GET /api/accounts-payable/invoices"
curl -X GET \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-company-id: $COMPANY_ID" \
  -H "Authorization: Bearer test-token" \
  "$BASE_URL/api/accounts-payable/invoices" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n" + "="*50

# Test 2: POST invoice with valid data
echo -e "\n2️⃣ Testing POST /api/accounts-payable/invoices (valid data)"
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-company-id: $COMPANY_ID" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "vendorId": "test-vendor-id",
    "invoiceNumber": "INV-001",
    "invoiceDate": "2024-01-15",
    "dueDate": "2024-02-15",
    "totalAmount": 1000.00,
    "subtotal": 900.00,
    "taxAmount": 100.00,
    "currency": "USD",
    "source": "manual",
    "notes": "Test invoice"
  }' \
  "$BASE_URL/api/accounts-payable/invoices" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n" + "="*50

# Test 3: POST invoice with invalid data (should return 400)
echo -e "\n3️⃣ Testing POST /api/accounts-payable/invoices (invalid data)"
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-company-id: $COMPANY_ID" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "vendorId": "",
    "invoiceNumber": "",
    "totalAmount": -100,
    "currency": "INVALID"
  }' \
  "$BASE_URL/api/accounts-payable/invoices" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n" + "="*50

# Test 4: GET dashboard
echo -e "\n4️⃣ Testing GET /api/accounts-payable/dashboard"
curl -X GET \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-company-id: $COMPANY_ID" \
  -H "Authorization: Bearer test-token" \
  "$BASE_URL/api/accounts-payable/dashboard" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n" + "="*50

# Test 5: Test with missing headers
echo -e "\n5️⃣ Testing POST without required headers"
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "test-vendor-id",
    "invoiceNumber": "INV-002",
    "totalAmount": 1000.00,
    "currency": "USD",
    "source": "manual"
  }' \
  "$BASE_URL/api/accounts-payable/invoices" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n🏁 Tests completed!"
