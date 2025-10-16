const axios = require('axios');

async function testSeniorAI() {
  const baseURL = 'http://localhost:4000';
  
  // First get a demo token
  console.log('🧠 Senior AI Testing Suite');
  console.log('===========================\n');
  
  try {
    console.log('1. Getting demo authentication token...');
    const authResponse = await axios.get(`${baseURL}/api/auth/demo-token`);
    const token = authResponse.data.token;
    console.log('✅ Token obtained\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': 'tenant_demo',
      'Content-Type': 'application/json'
    };

    const testCases = [
      {
        name: 'Valid Transaction - Office Rent',
        description: 'Paid $1,500 for office rent',
        amount: 1500,
        expected: 'success'
      },
      {
        name: 'Valid Transaction - Auto-extracted Amount',
        description: 'Received $2,500 payment from customer for consulting services',
        amount: 2500,
        expected: 'success'
      },
      {
        name: 'Invalid Transaction - Meaningless Description',
        description: 'nnn',
        amount: 500,
        expected: 'validation_error'
      },
      {
        name: 'Invalid Transaction - Repeated Characters',
        description: 'aaa',
        amount: 300,
        expected: 'validation_error'
      },
      {
        name: 'Invalid Transaction - Test String',
        description: 'test',
        amount: 100,
        expected: 'validation_error'
      },
      {
        name: 'Valid Transaction - Purchase',
        description: 'Purchase office supplies from Staples',
        amount: 250,
        expected: 'success'
      }
    ];

    for (const testCase of testCases) {
      console.log(`🧪 Testing: ${testCase.name}`);
      console.log(`   Description: "${testCase.description}"`);
      console.log(`   Amount: $${testCase.amount}`);
      
      try {
        const response = await axios.post(`${baseURL}/api/enhanced-journal-management/create`, {
          description: testCase.description,
          amount: testCase.amount,
          companyId: 'seed-company-1',
          context: {
            processingLevel: 'senior',
            validationPassed: true
          }
        }, { headers });

        if (testCase.expected === 'success') {
          console.log(`   ✅ SUCCESS: Entry created with ID ${response.data.data.id}`);
          console.log(`   📊 Reference: ${response.data.data.reference}`);
          console.log(`   🧠 AI Model: ${response.data.data.metadata?.aiModel || 'standard'}`);
          console.log(`   🎯 Confidence: ${response.data.data.metadata?.confidence || 'unknown'}`);
        } else {
          console.log(`   ❌ UNEXPECTED SUCCESS: Expected validation error but entry was created`);
        }
      } catch (error) {
        if (testCase.expected === 'validation_error') {
          console.log(`   ✅ VALIDATION SUCCESS: ${error.response?.data?.error || error.message}`);
        } else {
          console.log(`   ❌ UNEXPECTED ERROR: ${error.response?.data?.error || error.message}`);
        }
      }
      
      console.log(''); // Empty line for readability
    }

    console.log('🧠 Senior AI Testing Complete!');
    console.log('===============================');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  }
}

testSeniorAI();
