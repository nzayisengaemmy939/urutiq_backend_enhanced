import axios from 'axios';

// Test configuration
const BASE_URL = 'http://localhost:4000';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWd0OG1odTIwMDAwZm5kejU2Njd2OGUwIiwidGVuYW50SWQiOiJ0ZW5hbnRfZGVtbyIsInJvbGVzIjpbImFkbWluIiwiYWNjb3VudGFudCJdLCJpYXQiOjE3NjA2MzIzNDYsImV4cCI6MTc2MDYzNDE0Nn0.1RUvNmT-EdpPoLEqBxyzZY32bYyflEF1vnMJnuxzryE';

// Headers for requests
const headers = {
  'Content-Type': 'application/json',
  'x-tenant-id': 'tenant_demo',
  'x-company-id': 'seed-company-1',
  'Authorization': `Bearer ${TOKEN}`
};

// Test data for invoice capture
const testInvoiceData = {
  vendorId: 'test-vendor-id',
  invoiceNumber: 'INV-001',
  invoiceDate: '2024-01-15',
  dueDate: '2024-02-15',
  totalAmount: 1000.00,
  subtotal: 900.00,
  taxAmount: 100.00,
  currency: 'USD',
  source: 'manual',
  notes: 'Test invoice for debugging'
};

async function testInvoiceCapture() {
  console.log('🧪 Testing Invoice Capture with Real Token...\n');

  try {
    // Test 1: GET invoices first
    console.log('1️⃣ Testing GET /api/accounts-payable/invoices');
    try {
      const response = await axios.get(`${BASE_URL}/api/accounts-payable/invoices`, { headers });
      console.log('✅ GET invoices - Status:', response.status);
      console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ GET invoices failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: POST invoice capture
    console.log('2️⃣ Testing POST /api/accounts-payable/invoices (Invoice Capture)');
    console.log('📤 Sending data:', JSON.stringify(testInvoiceData, null, 2));
    console.log('📤 Headers:', JSON.stringify(headers, null, 2));
    
    try {
      const response = await axios.post(`${BASE_URL}/api/accounts-payable/invoices`, testInvoiceData, { headers });
      console.log('✅ POST invoice capture - Status:', response.status);
      console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ POST invoice capture failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
      console.log('Error details:', error.response?.data?.details || 'No details');
      
      // Check if it's a validation error
      if (error.response?.data?.details) {
        console.log('\n🔍 Validation Errors:');
        error.response.data.details.forEach((detail, index) => {
          console.log(`${index + 1}. ${detail.path.join('.')}: ${detail.message}`);
        });
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Test with minimal required data
    console.log('3️⃣ Testing POST with minimal required data');
    const minimalData = {
      vendorId: 'test-vendor-id',
      invoiceNumber: 'INV-002',
      invoiceDate: '2024-01-15',
      totalAmount: 1000.00,
      currency: 'USD'
    };
    
    try {
      const response = await axios.post(`${BASE_URL}/api/accounts-payable/invoices`, minimalData, { headers });
      console.log('✅ POST minimal data - Status:', response.status);
      console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ POST minimal data failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
      console.log('Error details:', error.response?.data?.details || 'No details');
    }

  } catch (error) {
    console.error('🚨 Test suite failed:', error.message);
  }
}

// Run the test
testInvoiceCapture().catch(console.error);
