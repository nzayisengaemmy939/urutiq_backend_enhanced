import jwt from 'jsonwebtoken';

const secret = 'dev-secret';
const payload = { 
  sub: 'admin_demo', 
  tenantId: 'tenant_demo', 
  roles: ['admin'] 
};

try {
  const token = jwt.sign(payload, secret, { expiresIn: '30m' });
  console.log('Generated JWT token:');
  console.log('Token:', token);
  console.log('Token length:', token.length);
  
  const parts = token.split('.');
  console.log('Token parts count:', parts.length);
  
  if (parts.length === 3) {
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('Header:', header);
      console.log('Payload:', payload);
    } catch (e) {
      console.error('Failed to decode parts:', e);
    }
  }
  
  // Test verification
  try {
    const decoded = jwt.verify(token, secret);
    console.log('Verified payload:', decoded);
  } catch (e) {
    console.error('Verification failed:', e);
  }
  
} catch (error) {
  console.error('JWT generation failed:', error);
}
