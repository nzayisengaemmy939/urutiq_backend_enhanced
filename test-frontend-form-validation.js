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

async function testFrontendFormValidation() {
  console.log('🧪 Testing Frontend Form Validation Scenarios...\n');

  try {
    // Get a valid vendor first
    const vendorsResponse = await axios.get(`${BASE_URL}/api/vendors`, { headers });
    const vendors = vendorsResponse.data?.items || [];
    
    if (vendors.length === 0) {
      console.log('❌ No vendors found. Cannot test form validation.');
      return;
    }
    
    const validVendorId = vendors[0].id;
    console.log('✅ Using vendor:', validVendorId, vendors[0].name);

    // Test scenarios that might cause 400 Bad Request
    const testScenarios = [
      {
        name: 'Missing vendorId',
        data: {
          invoiceNumber: 'INV-001',
          invoiceDate: '2024-01-15',
          totalAmount: 1000,
          subtotal: 900,
          taxAmount: 100,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Empty vendorId',
        data: {
          vendorId: '',
          invoiceNumber: 'INV-002',
          invoiceDate: '2024-01-15',
          totalAmount: 1000,
          subtotal: 900,
          taxAmount: 100,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Missing invoiceNumber',
        data: {
          vendorId: validVendorId,
          invoiceDate: '2024-01-15',
          totalAmount: 1000,
          subtotal: 900,
          taxAmount: 100,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Empty invoiceNumber',
        data: {
          vendorId: validVendorId,
          invoiceNumber: '',
          invoiceDate: '2024-01-15',
          totalAmount: 1000,
          subtotal: 900,
          taxAmount: 100,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Missing invoiceDate',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-003',
          totalAmount: 1000,
          subtotal: 900,
          taxAmount: 100,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Invalid invoiceDate format',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-004',
          invoiceDate: 'invalid-date',
          totalAmount: 1000,
          subtotal: 900,
          taxAmount: 100,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Missing totalAmount',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-005',
          invoiceDate: '2024-01-15',
          subtotal: 900,
          taxAmount: 100,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Zero totalAmount',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-006',
          invoiceDate: '2024-01-15',
          totalAmount: 0,
          subtotal: 0,
          taxAmount: 0,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Negative totalAmount',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-007',
          invoiceDate: '2024-01-15',
          totalAmount: -100,
          subtotal: 900,
          taxAmount: 100,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Missing subtotal',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-008',
          invoiceDate: '2024-01-15',
          totalAmount: 1000,
          taxAmount: 100,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Missing taxAmount',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-009',
          invoiceDate: '2024-01-15',
          totalAmount: 1000,
          subtotal: 900,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Invalid currency',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-010',
          invoiceDate: '2024-01-15',
          totalAmount: 1000,
          subtotal: 900,
          taxAmount: 100,
          currency: 'INVALID',
          source: 'manual'
        }
      },
      {
        name: 'Invalid source',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-011',
          invoiceDate: '2024-01-15',
          totalAmount: 1000,
          subtotal: 900,
          taxAmount: 100,
          currency: 'USD',
          source: 'invalid-source'
        }
      },
      {
        name: 'String values instead of numbers',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-012',
          invoiceDate: '2024-01-15',
          totalAmount: '1000', // String instead of number
          subtotal: '900',     // String instead of number
          taxAmount: '100',    // String instead of number
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Null values',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-013',
          invoiceDate: '2024-01-15',
          totalAmount: null,
          subtotal: null,
          taxAmount: null,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Undefined values',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-014',
          invoiceDate: '2024-01-15',
          totalAmount: undefined,
          subtotal: undefined,
          taxAmount: undefined,
          currency: 'USD',
          source: 'manual'
        }
      },
      {
        name: 'Valid data (should work)',
        data: {
          vendorId: validVendorId,
          invoiceNumber: 'INV-VALID-' + Date.now(),
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          totalAmount: 1000,
          subtotal: 900,
          taxAmount: 100,
          currency: 'USD',
          source: 'manual',
          notes: 'Test invoice with valid data'
        }
      }
    ];

    for (const scenario of testScenarios) {
      console.log(`\n🧪 Testing: ${scenario.name}`);
      console.log('📤 Data:', JSON.stringify(scenario.data, null, 2));
      
      try {
        const response = await axios.post(`${BASE_URL}/api/accounts-payable/invoices`, scenario.data, { headers });
        console.log('✅ SUCCESS - Status:', response.status);
        console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      } catch (error) {
        console.log('❌ FAILED - Status:', error.response?.status);
        console.log('📊 Error:', error.response?.data);
        
        if (error.response?.data?.details) {
          console.log('🔍 Validation Details:');
          error.response.data.details.forEach((detail, index) => {
            console.log(`  ${index + 1}. ${detail.path?.join('.') || detail.field}: ${detail.message}`);
          });
        }
      }
      
      console.log('-'.repeat(50));
    }

  } catch (error) {
    console.error('🚨 Test suite failed:', error.message);
  }
}

// Run the test
testFrontendFormValidation().catch(console.error);
