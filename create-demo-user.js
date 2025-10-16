const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password, salt) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

async function createDemoUser() {
  try {
    const tenantId = 'tenant_1759313374454_k1h5y8bi7';
    const email = 'admin@urutiiq.com';
    const password = 'admin123'; // Change this to your preferred password
    
    // Check if user already exists by email
    const existingUser = await prisma.appUser.findFirst({
      where: { email }
    });
    
    if (existingUser) {
      console.log('✅ User already exists:');
      console.log('   User ID:', existingUser.id);
      console.log('   Email:', existingUser.email);
      console.log('   Tenant ID:', existingUser.tenantId);
      console.log('\n📝 Use this email to login via POST /api/auth/login');
      console.log('   If you forgot the password, delete this user and run this script again.');
      return;
    }
    
    // Create password hash
    const { hash, salt } = hashPassword(password);
    
    // Create real user (let database generate ID)
    const user = await prisma.appUser.create({
      data: {
        tenantId,
        email,
        name: 'Admin User',
        role: 'admin',
        passwordHash: hash,
        passwordSalt: salt,
        mfaEnabled: false
      }
    });
    
    console.log('✅ User created successfully!');
    console.log('   User ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Password:', password);
    console.log('   Tenant ID:', user.tenantId);
    console.log('\n📝 Login Instructions:');
    console.log('   POST /api/auth/login');
    console.log('   Body: { "email": "' + email + '", "password": "' + password + '" }');
    console.log('   The response will include an accessToken with real user ID.');
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUser();
