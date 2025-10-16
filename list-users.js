import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.appUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        mfaEnabled: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (users.length === 0) {
      console.log('❌ No users found in the database.');
      console.log('   Run create-demo-user.js to create a user.');
      return;
    }
    
    console.log(`✅ Found ${users.length} user(s):\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Tenant ID: ${user.tenantId}`);
      console.log(`   MFA Enabled: ${user.mfaEnabled}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });
    
    console.log('📝 To login with any of these users:');
    console.log('   POST /api/auth/login');
    console.log('   Body: { "email": "<user-email>", "password": "<password>" }');
    console.log('\n⚠️  If you don\'t know the password, you need to reset it or create a new user.');
    
  } catch (error) {
    console.error('❌ Error listing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
