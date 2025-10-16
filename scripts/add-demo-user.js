import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password, salt = null) {
  const saltToUse = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, saltToUse, 100_000, 64, 'sha512').toString('hex');
  return { hash, salt: saltToUse };
}

async function addDemoUser() {
  try {
    console.log('Adding demo admin user...');
    
    const { hash, salt } = hashPassword('admin_demo');
    
    const demoUser = await prisma.appUser.upsert({
      where: { 
        tenantId_email: { 
          tenantId: 'tenant_demo', 
          email: 'admin@demo.com' 
        } 
      },
      update: {
        passwordHash: hash,
        passwordSalt: salt,
        name: 'Demo Admin',
        role: 'admin'
      },
      create: {
        tenantId: 'tenant_demo',
        email: 'admin@demo.com',
        name: 'Demo Admin',
        role: 'admin',
        passwordHash: hash,
        passwordSalt: salt,
      }
    });

    console.log('Demo admin user created/updated successfully:', demoUser.email);
    console.log('Password: admin_demo');
    
  } catch (error) {
    console.error('Error adding demo user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDemoUser();
