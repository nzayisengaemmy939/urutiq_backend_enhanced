import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigateSpecificVoidInvoice() {
  try {
    const voidInvoiceNumber = 'VOID-INV-POS-1759914220248';
    const originalInvoiceNumber = 'POS-1759914220248';
    
    console.log(`🔍 INVESTIGATING: ${voidInvoiceNumber}`);
    console.log('='.repeat(60));
    
    // 1. Look for the original invoice
    console.log('📋 ORIGINAL INVOICE:');
    const originalInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: originalInvoiceNumber },
      include: {
        lines: { include: { product: true } }
      }
    });
    
    if (!originalInvoice) {
      console.log(`❌ Original invoice ${originalInvoiceNumber} NOT FOUND`);
      
      // Search for any invoice with that timestamp
      const anyInvoice = await prisma.invoice.findMany({
        where: {
          invoiceNumber: { contains: '1759913288876' }
        }
      });
      
      console.log(`🔍 Found ${anyInvoice.length} invoices with timestamp 1759913288876:`);
      anyInvoice.forEach(inv => {
        console.log(`  - ${inv.invoiceNumber} (${inv.status}) $${inv.totalAmount}`);
      });
      
      if (anyInvoice.length === 0) {
        console.log('❌ NO invoices found with that timestamp!');
        return;
      }
    } else {
      console.log(`✅ FOUND: ${originalInvoice.invoiceNumber}`);
      console.log(`   Status: ${originalInvoice.status}`);
      console.log(`   Total: $${originalInvoice.totalAmount}`);
      console.log(`   Date: ${originalInvoice.invoiceDate}`);
      
      console.log('\n🛍️ PRODUCTS SOLD:');
      for (const line of originalInvoice.lines) {
        const product = line.product;
        console.log(`  ${product.name}:`);
        console.log(`    - Quantity Sold: ${line.quantity}`);
        console.log(`    - Current Stock: ${product.stockQuantity}`);
        console.log(`    - Price: $${line.unitPrice}`);
        console.log(`    - Product Type: ${product.type}`);
      }
    }
    
    console.log('\n📦 INVENTORY MOVEMENTS:');
    
    // Check for ANY inventory movements related to this invoice
    const movements = await prisma.inventoryMovement.findMany({
      where: {
        OR: [
          { reference: originalInvoiceNumber },
          { reference: `INV-${originalInvoiceNumber}` },
          { reference: voidInvoiceNumber }
        ]
      },
      include: { product: true },
      orderBy: { movementDate: 'asc' }
    });
    
    console.log(`Found ${movements.length} inventory movements:`);
    
    if (movements.length === 0) {
      console.log('❌ NO inventory movements found!');
      console.log('🚨 This means either:');
      console.log('   1. Invoice was never properly processed for inventory');
      console.log('   2. Products were services (no inventory tracking)');
      console.log('   3. System bug - inventory not updated');
    } else {
      movements.forEach((movement, index) => {
        console.log(`\n${index + 1}. ${movement.product.name}`);
        console.log(`   Type: ${movement.movementType}`);
        console.log(`   Quantity: ${movement.quantity}`);
        console.log(`   Date: ${movement.movementDate.toISOString().split('T')[0]}`);
        console.log(`   Reference: ${movement.reference}`);
        console.log(`   Reason: ${movement.reason || 'N/A'}`);
      });
    }
    
    console.log('\n💰 JOURNAL ENTRIES:');
    
    // Check for journal entries
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        OR: [
          { reference: originalInvoiceNumber },
          { reference: `INV-${originalInvoiceNumber}` },
          { reference: voidInvoiceNumber }
        ]
      },
      include: {
        lines: { include: { account: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Found ${journalEntries.length} journal entries:`);
    
    journalEntries.forEach((entry, index) => {
      console.log(`\n${index + 1}. ${entry.reference} (${entry.status})`);
      console.log(`   Memo: ${entry.memo}`);
      console.log(`   Date: ${entry.createdAt.toISOString().split('T')[0]}`);
      
      entry.lines.forEach(line => {
        console.log(`   ${line.account.name}: Dr $${line.debit || 0} | Cr $${line.credit || 0}`);
      });
    });
    
    console.log('\n🎯 SUMMARY:');
    console.log('='.repeat(60));
    
    const hasOriginalInvoice = !!originalInvoice;
    const hasVoidMovements = movements.some(m => m.movementType === 'VOID' || Number(m.quantity) > 0);
    const hasVoidJournalEntries = journalEntries.some(j => j.status === 'VOIDED' || j.reference.includes('VOID'));
    
    console.log(`Original Invoice: ${hasOriginalInvoice ? '✅ Found' : '❌ Missing'}`);
    console.log(`Void Movements: ${hasVoidMovements ? '✅ Found' : '❌ Missing'}`);
    console.log(`Void Journal Entries: ${hasVoidJournalEntries ? '✅ Found' : '❌ Missing'}`);
    
    if (hasOriginalInvoice && !hasVoidMovements && !hasVoidJournalEntries) {
      console.log('\n🚨 ISSUE: Invoice exists but was NEVER voided!');
      console.log('💡 ACTION: This invoice needs to be properly voided using the void endpoint.');
    } else if (hasVoidJournalEntries && !hasVoidMovements) {
      console.log('\n⚠️  PARTIAL VOID: Accounting voided but inventory not restored!');
      console.log('💡 ACTION: Need to create reversing inventory movements.');
    } else if (hasVoidMovements && hasVoidJournalEntries) {
      console.log('\n✅ COMPLETE VOID: Both accounting and inventory handled.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

investigateSpecificVoidInvoice();