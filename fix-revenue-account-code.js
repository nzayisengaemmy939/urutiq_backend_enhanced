import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRevenueAccountCode() {
  try {
    console.log('Fixing revenue account code...');
    
    const tenantId = 'tenant_1760184367074_e5wdnirrd';
    const companyId = 'cmgm8bpzq000djg0rj25cjmsz';
    
    // Update the Sales Revenue account code from 4000 to 4100
    const updatedAccount = await prisma.account.update({
      where: {
        id: 'cmgm8fma5000hyu0bxnygb329' // Sales Revenue account ID
      },
      data: {
        code: '4100' // Change from 4000 to 4100 to match Sales Revenue category
      }
    });
    
    console.log('Updated account:', {
      id: updatedAccount.id,
      code: updatedAccount.code,
      name: updatedAccount.name,
      type: updatedAccount.type
    });
    
    console.log('✅ Sales Revenue account code updated from 4000 to 4100');
    console.log('Now the Profit & Loss report should show the revenue breakdown correctly!');
    
  } catch (error) {
    console.error('Error updating account code:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRevenueAccountCode();
