import axios from 'axios';

// Test configuration
const BASE_URL = 'http://localhost:3001'; // Adjust port as needed
const TEST_TENANT_ID = 'test-tenant';
const TEST_COMPANY_ID = 'test-company';

// Test data for invoice creation
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

// Headers for requests
const headers = {
  'Content-Type': 'application/json',
  'x-tenant-id': TEST_TENANT_ID,
  'x-company-id': TEST_COMPANY_ID,
  'Authorization': 'Bearer test-token' // You may need to get a real token
};

async function testAccountsPayableEndpoints() {
  console.log('🧪 Testing Accounts Payable Endpoints...\n');

  try {
    // Test 1: GET /api/accounts-payable/invoices
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

    // Test 2: POST /api/accounts-payable/invoices
    console.log('2️⃣ Testing POST /api/accounts-payable/invoices');
    try {
      const response = await axios.post(`${BASE_URL}/api/accounts-payable/invoices`, testInvoiceData, { headers });
      console.log('✅ POST invoice - Status:', response.status);
      console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ POST invoice failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
      console.log('Request data:', testInvoiceData);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Test with invalid data
    console.log('3️⃣ Testing POST with invalid data');
    const invalidData = {
      vendorId: '', // Empty vendor ID
      invoiceNumber: '', // Empty invoice number
      totalAmount: -100, // Negative amount
      currency: 'INVALID' // Invalid currency
    };

    try {
      const response = await axios.post(`${BASE_URL}/api/accounts-payable/invoices`, invalidData, { headers });
      console.log('✅ POST with invalid data - Status:', response.status);
    } catch (error) {
      console.log('❌ POST with invalid data failed (expected):');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Test dashboard endpoint
    console.log('4️⃣ Testing GET /api/accounts-payable/dashboard');
    try {
      const response = await axios.get(`${BASE_URL}/api/accounts-payable/dashboard`, { headers });
      console.log('✅ GET dashboard - Status:', response.status);
      console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ GET dashboard failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }

  } catch (error) {
    console.error('🚨 Test suite failed:', error.message);
  }
}

// Test specific validation scenarios
async function testValidationScenarios() {
  console.log('\n🔍 Testing Validation Scenarios...\n');

  const scenarios = [
    {
      name: 'Missing required fields',
      data: {
        invoiceNumber: 'INV-002'
        // Missing vendorId, totalAmount, etc.
      }
    },
    {
      name: 'Invalid date format',
      data: {
        ...testInvoiceData,
        invoiceNumber: 'INV-003',
        invoiceDate: 'invalid-date'
      }
    },
    {
      name: 'Invalid currency',
      data: {
        ...testInvoiceData,
        invoiceNumber: 'INV-004',
        currency: 'INVALID'
      }
    },
    {
      name: 'Negative amounts',
      data: {
        ...testInvoiceData,
        invoiceNumber: 'INV-005',
        totalAmount: -100
      }
    },
    {
      name: 'Invalid source',
      data: {
        ...testInvoiceData,
        invoiceNumber: 'INV-006',
        source: 'invalid-source'
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`🧪 Testing: ${scenario.name}`);
    try {
      const response = await axios.post(`${BASE_URL}/api/accounts-payable/invoices`, scenario.data, { headers });
      console.log('✅ Unexpected success:', response.status);
    } catch (error) {
      console.log('❌ Expected failure:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }
    console.log('-'.repeat(30));
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Accounts Payable API Tests\n');
  
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first.');
    console.log('Run: npm start');
    return;
  }

  await testAccountsPayableEndpoints();
  await testValidationScenarios();
  
  console.log('\n🏁 Tests completed!');
}

// Run the tests
runTests().catch(console.error);
