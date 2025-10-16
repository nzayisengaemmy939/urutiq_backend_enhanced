// Test API response format
const fetch = require('node-fetch')

async function testAPI() {
  try {
    // Get token
    const tokenResponse = await fetch('http://localhost:4000/api/auth/demo-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'tenant_demo'
      },
      body: JSON.stringify({ sub: 'user_demo', roles: ['admin'] })
    })
    const tokenData = await tokenResponse.json()
    const token = tokenData.token
    
    console.log('Token received:', token.substring(0, 20) + '...')
    
    // Test dimensions API
    const response = await fetch('http://localhost:4000/api/budget-management/seed-company-1/dimensions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': 'tenant_demo'
      }
    })
    
    const data = await response.json()
    console.log('Dimensions API Response:')
    console.log('Status:', response.status)
    console.log('Has success:', 'success' in data)
    console.log('Has data:', 'data' in data)
    console.log('Data type:', Array.isArray(data.data) ? 'Array' : typeof data.data)
    console.log('Data length:', data.data ? data.data.length : 'N/A')
    console.log('First item:', data.data ? data.data[0] : 'N/A')
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testAPI()
