import fetch from 'node-fetch';

// Configuration
const API_URL = 'http://localhost:3001'; // Change if your API runs on different port
const EMAIL = 'admin@urutiiq.com'; // Change to your user's email
const PASSWORD = 'admin123'; // Change to your user's password

async function getRealToken() {
  try {
    console.log('🔐 Attempting to login...');
    console.log(`   Email: ${EMAIL}`);
    console.log(`   API: ${API_URL}/api/auth/login\n`);
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Login failed:', response.status, error);
      console.log('\n💡 Tips:');
      console.log('   1. Make sure your API server is running on', API_URL);
      console.log('   2. Check if the email and password are correct');
      console.log('   3. Run list-users.js to see available users');
      console.log('   4. Run create-demo-user.js to create a new user');
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ Login successful!\n');
    console.log('📋 Access Token:');
    console.log(data.accessToken);
    console.log('\n📋 Refresh Token:');
    console.log(data.refreshToken);
    console.log('\n⏰ Expires In:', data.expiresIn, 'seconds');
    
    // Decode the JWT to show the payload (without verification)
    const payload = JSON.parse(Buffer.from(data.accessToken.split('.')[1], 'base64').toString());
    console.log('\n🔍 Token Payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    console.log('\n📝 Usage:');
    console.log('   Add this header to your API requests:');
    console.log(`   Authorization: Bearer ${data.accessToken}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Your API server is running');
    console.log('   2. The API_URL is correct (currently:', API_URL + ')');
  }
}

getRealToken();
