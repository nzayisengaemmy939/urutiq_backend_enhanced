// Company Recovery Script
// This script helps recover deleted companies by checking for orphaned data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recoverCompany(companyId, tenantId) {
  console.log(`🔍 Searching for traces of company: ${companyId}`);
  
  try {
    // 1. Check audit logs for any mention of this company
    console.log('\n📋 Checking audit logs...');
    const auditLogs = await prisma.aiAuditTrail.findMany({
      where: {
        tenantId,
        companyId
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    
    if (auditLogs.length > 0) {
      console.log('✅ Found audit logs:');
      auditLogs.forEach(log => {
        console.log(`  - ${log.timestamp.toISOString()}: ${log.action}`);
      });
    } else {
      console.log('❌ No audit logs found for this company');
    }
    
    // 2. Check for orphaned data (invoices, bills, customers, etc.)
    console.log('\n🔍 Checking for orphaned data...');
    
    const orphanedData = {
      invoices: await prisma.invoice.count({ where: { companyId } }),
      bills: await prisma.bill.count({ where: { companyId } }),
      customers: await prisma.customer.count({ where: { companyId } }),
      vendors: await prisma.vendor.count({ where: { companyId } }),
      transactions: await prisma.transaction.count({ where: { companyId } }),
      accounts: await prisma.account.count({ where: { companyId } }),
      journalEntries: await prisma.journalEntry.count({ where: { companyId } })
    };
    
    console.log('📊 Orphaned data found:');
    Object.entries(orphanedData).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`  - ${type}: ${count} records`);
      }
    });
    
    // 3. Check company settings
    console.log('\n⚙️ Checking company settings...');
    const settings = await prisma.companySetting.findMany({
      where: { companyId, tenantId }
    });
    
    if (settings.length > 0) {
      console.log(`✅ Found ${settings.length} company settings:`);
      settings.forEach(setting => {
        console.log(`  - ${setting.key}: ${setting.value}`);
      });
    } else {
      console.log('❌ No company settings found');
    }
    
    // 4. If we have orphaned data, we can recreate the company
    const totalOrphanedData = Object.values(orphanedData).reduce((sum, count) => sum + count, 0);
    
    if (totalOrphanedData > 0) {
      console.log('\n🔄 RECOVERY POSSIBLE!');
      console.log(`Found ${totalOrphanedData} orphaned records that can be linked to a restored company.`);
      
      // Extract company info from settings
      const companyInfo = {};
      settings.forEach(setting => {
        companyInfo[setting.key] = setting.value;
      });
      
      console.log('\n📝 Suggested company data for recovery:');
      console.log(JSON.stringify(companyInfo, null, 2));
      
      return {
        canRecover: true,
        orphanedData,
        settings,
        auditLogs,
        suggestedCompanyData: companyInfo
      };
    } else {
      console.log('\n❌ No orphaned data found. Company may have been completely deleted.');
      return {
        canRecover: false,
        orphanedData,
        settings,
        auditLogs
      };
    }
    
  } catch (error) {
    console.error('❌ Error during recovery check:', error);
    throw error;
  }
}

// Recovery function to recreate the company
async function recreateCompany(companyId, tenantId, companyData) {
  console.log(`🔄 Recreating company: ${companyId}`);
  
  try {
    const newCompany = await prisma.company.create({
      data: {
        id: companyId, // Use the same ID to maintain relationships
        tenantId,
        name: companyData.name || 'Recovered Company',
        industry: companyData.industry || null,
        taxId: companyData.taxId || null,
        country: companyData.country || null,
        currency: companyData.currency || 'USD',
        fiscalYearStart: companyData.fiscalYearStart || null,
        email: companyData.email || null,
        phone: companyData.phone || null,
        website: companyData.website || null,
        address: companyData.address || null,
        city: companyData.city || null,
        state: companyData.state || null,
        postalCode: companyData.postalCode || null,
        status: 'active' // Set as active
      }
    });
    
    console.log('✅ Company recreated successfully!');
    console.log('Company details:', newCompany);
    
    // Log the recovery action
    await prisma.aiAuditTrail.create({
      data: {
        tenantId,
        companyId,
        action: `Company ${companyId} recovered from orphaned data`,
        aiValidationResult: JSON.stringify({
          recoveredAt: new Date().toISOString(),
          orphanedRecords: companyData.orphanedData || {},
          recoveredBy: 'system-recovery'
        })
      }
    });
    
    return newCompany;
    
  } catch (error) {
    console.error('❌ Error recreating company:', error);
    throw error;
  }
}

// Main recovery function
async function main() {
  const companyId = process.argv[2];
  const tenantId = process.argv[3];
  
  if (!companyId || !tenantId) {
    console.log('Usage: node recover-company.js <companyId> <tenantId>');
    console.log('Example: node recover-company.js cmgov2ki3000koqc4uq33xcrb your-tenant-id');
    process.exit(1);
  }
  
  console.log(`🚀 Starting recovery process for company: ${companyId}`);
  console.log(`🏢 Tenant: ${tenantId}`);
  
  const recoveryInfo = await recoverCompany(companyId, tenantId);
  
  if (recoveryInfo.canRecover) {
    console.log('\n❓ Do you want to recreate the company? (This will restore all orphaned data)');
    console.log('Run: node recover-company.js <companyId> <tenantId> recreate');
    
    if (process.argv[4] === 'recreate') {
      await recreateCompany(companyId, tenantId, recoveryInfo.suggestedCompanyData);
    }
  }
  
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(console.error);
}

export { recoverCompany, recreateCompany };
