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

async function testInvoiceCaptureWithValidData() {
  console.log('🧪 Testing Invoice Capture with Valid Data...\n');

  try {
    // Step 1: Get existing vendors
    console.log('1️⃣ Getting existing vendors...');
    try {
      const vendorsResponse = await axios.get(`${BASE_URL}/api/vendors`, { headers });
      console.log('✅ Vendors - Status:', vendorsResponse.status);
      console.log('📊 Vendors data:', JSON.stringify(vendorsResponse.data, null, 2));
      
      // Use first vendor if available
      const vendors = vendorsResponse.data?.items || [];
      if (vendors.length === 0) {
        console.log('❌ No vendors found. Need to create a vendor first.');
        return;
      }
      
      const firstVendor = vendors[0];
      console.log('✅ Using vendor:', firstVendor.id, firstVendor.name);
      
      // Step 2: Test invoice capture with valid vendor
      console.log('\n2️⃣ Testing POST /api/accounts-payable/invoices with valid vendor');
      const validInvoiceData = {
        vendorId: firstVendor.id,
        invoiceNumber: 'INV-' + Date.now(),
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        totalAmount: 1000.00,
        subtotal: 900.00,
        taxAmount: 100.00,
        currency: 'USD',
        source: 'manual',
        notes: 'Test invoice with valid vendor'
      };
      
      console.log('📤 Sending data:', JSON.stringify(validInvoiceData, null, 2));
      
      const response = await axios.post(`${BASE_URL}/api/accounts-payable/invoices`, validInvoiceData, { headers });
      console.log('✅ POST invoice capture - Status:', response.status);
      console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log('❌ Vendor fetch failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Step 3: Test with minimal valid data
    console.log('3️⃣ Testing POST with minimal valid data');
    try {
      const vendorsResponse = await axios.get(`${BASE_URL}/api/vendors`, { headers });
      const vendors = vendorsResponse.data?.items || [];
      
      if (vendors.length > 0) {
        const minimalData = {
          vendorId: vendors[0].id,
          invoiceNumber: 'INV-MIN-' + Date.now(),
          invoiceDate: '2024-01-15',
          totalAmount: 1000.00,
          subtotal: 1000.00,  // Required field
          taxAmount: 0.00,    // Required field
          currency: 'USD'
        };
        
        console.log('📤 Sending minimal data:', JSON.stringify(minimalData, null, 2));
        
        const response = await axios.post(`${BASE_URL}/api/accounts-payable/invoices`, minimalData, { headers });
        console.log('✅ POST minimal data - Status:', response.status);
        console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
      }
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
testInvoiceCaptureWithValidData().catch(console.error);
