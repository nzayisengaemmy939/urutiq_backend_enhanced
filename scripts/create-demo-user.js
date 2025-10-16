import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDemoUser() {
  try {
    console.log('Checking for existing demo users...');
    
    // Check if demo admin user exists
    const existingUser = await prisma.appUser.findFirst({
      where: {
        tenantId: 'tenant_demo',
        email: 'admin@demo.com'
      }
    });

    if (existingUser) {
      console.log('Demo admin user already exists:', existingUser.email);
      return;
    }

    // Create demo admin user
    const { hash, salt } = hashPassword('admin_demo');
    
    const demoUser = await prisma.appUser.create({
      data: {
        tenantId: 'tenant_demo',
        email: 'admin@demo.com',
        name: 'Demo Admin',
        role: 'admin',
        passwordHash: hash,
        passwordSalt: salt,
      }
    });

    console.log('Demo admin user created successfully:', demoUser.email);
    
    // Create demo company if it doesn't exist
    const existingCompany = await prisma.company.findFirst({
      where: {
        tenantId: 'tenant_demo',
        name: 'Demo Company'
      }
    });

    if (!existingCompany) {
      const demoCompany = await prisma.company.create({
        data: {
          tenantId: 'tenant_demo',
          name: 'Demo Company',
          industry: 'Technology',
          country: 'US',
          currency: 'USD',
          fiscalYearStart: '01-01'
        }
      });
      console.log('Demo company created successfully:', demoCompany.name);
    } else {
      console.log('Demo company already exists:', existingCompany.name);
    }

  } catch (error) {
    console.error('Error creating demo user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

import crypto from 'crypto';

function hashPassword(password, salt = null) {
  const saltToUse = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, saltToUse, 100_000, 64, 'sha512').toString('hex');
  return { hash, salt: saltToUse };
}

createDemoUser();
