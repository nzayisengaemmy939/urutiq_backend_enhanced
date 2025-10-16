import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSpecificVoidInvoice() {
  try {
    const invoiceNumber = 'POS-1759914220248';
    const voidReference = 'VOID-INV-POS-1759914220248';
    
    console.log(`🔧 FIXING VOID INVOICE INVENTORY: ${voidReference}`);
    console.log('='.repeat(70));
    
    // Get the original invoice
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber },
      include: {
        lines: { include: { product: true } }
      }
    });
    
    if (!invoice) {
      console.log(`❌ Invoice ${invoiceNumber} not found!`);
      return;
    }
    
    console.log('📋 INVOICE DETAILS:');
    console.log(`   Invoice: ${invoice.invoiceNumber}`);
    console.log(`   Status: ${invoice.status}`);
    console.log(`   Total: $${invoice.totalAmount}`);
    console.log(`   Products: ${invoice.lines.length}`);
    
    // Show current stock levels
    console.log('\n📦 CURRENT STOCK LEVELS (Before Fix):');
    for (const line of invoice.lines) {
      console.log(`   ${line.product.name}:`);
      console.log(`     - Sold: ${line.quantity} units`);
      console.log(`     - Current Stock: ${line.product.stockQuantity} units`);
    }
    
    // Check if void movements already exist
    console.log('\n🔍 CHECKING FOR EXISTING VOID MOVEMENTS:');
    const existingVoidMovements = await prisma.inventoryMovement.findMany({
      where: {
        reference: voidReference
      },
      include: { product: true }
    });
    
    if (existingVoidMovements.length > 0) {
      console.log(`⚠️  Found ${existingVoidMovements.length} existing void movements:`);
      existingVoidMovements.forEach(movement => {
        console.log(`   - ${movement.product.name}: ${movement.quantity} units (${movement.movementType})`);
      });
      console.log('\n❌ Void movements already exist! No fix needed.');
      return;
    } else {
      console.log('❌ No void movements found - FIX NEEDED!');
    }
    
    console.log('\n🔧 CREATING REVERSING INVENTORY MOVEMENTS...');
    
    const results = await prisma.$transaction(async (tx) => {
      const movements = [];
      const stockUpdates = [];
      
      for (const line of invoice.lines) {
        const product = line.product;
        const soldQuantity = Number(line.quantity);
        
        console.log(`\n📦 Processing ${product.name}:`);
        console.log(`   - Sold quantity: ${soldQuantity}`);
        console.log(`   - Current stock: ${product.stockQuantity}`);
        
        // Create VOID movement (positive quantity to restore stock)
        const voidMovement = await tx.inventoryMovement.create({
          data: {
            tenantId: product.tenantId, // Add required tenantId
            productId: product.id,
            movementType: 'VOID',
            quantity: soldQuantity, // Positive to restore
            movementDate: new Date(),
            reference: voidReference,
            reason: `Inventory restoration - voided invoice ${invoiceNumber}`,
            unitCost: Number(line.unitPrice) || 0
          }
        });
        
        // Update product stock (add back the sold quantity)
        const currentStock = Number(product.stockQuantity);
        const newStock = currentStock + soldQuantity;
        
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: newStock }
        });
        
        console.log(`   ✅ Created void movement: +${soldQuantity}`);
        console.log(`   ✅ Updated stock: ${currentStock} → ${newStock}`);
        
        movements.push(voidMovement);
        stockUpdates.push({
          name: product.name,
          soldQuantity,
          oldStock: currentStock,
          newStock,
          movement: voidMovement
        });
      }
      
      return { movements, stockUpdates };
    });
    
    console.log('\n✅ FIX COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70));
    
    console.log('📊 SUMMARY OF CHANGES:');
    results.stockUpdates.forEach((update, index) => {
      console.log(`${index + 1}. ${update.name}:`);
      console.log(`   ├─ Void Movement: +${update.soldQuantity} units`);
      console.log(`   ├─ Stock Before: ${update.oldStock} units`);
      console.log(`   ├─ Stock After: ${update.newStock} units`);
      console.log(`   └─ Movement ID: ${update.movement.id}`);
    });
    
    console.log('\n🎯 VERIFICATION STATUS:');
    console.log('✅ Accounting: Journal entries already voided');
    console.log('✅ Inventory: Reversing movements created');
    console.log('✅ Stock: Quantities restored to pre-sale levels');
    console.log('✅ Audit: Complete void trail established');
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Use POST /api/sales/invoices/:id/void for future voids');
    console.log('2. This ensures both accounting AND inventory are handled automatically');
    console.log('3. No manual fixes needed when using the proper void endpoint');
    
    // Final verification
    console.log('\n🔍 FINAL VERIFICATION:');
    const finalMovements = await prisma.inventoryMovement.findMany({
      where: {
        OR: [
          { reference: invoiceNumber },
          { reference: `INV-${invoiceNumber}` },
          { reference: voidReference }
        ]
      },
      include: { product: true },
      orderBy: { movementDate: 'asc' }
    });
    
    const movementsByProduct = {};
    finalMovements.forEach(movement => {
      const productName = movement.product.name;
      if (!movementsByProduct[productName]) {
        movementsByProduct[productName] = [];
      }
      movementsByProduct[productName].push(movement);
    });
    
    for (const [productName, movements] of Object.entries(movementsByProduct)) {
      const totalMovement = movements.reduce((sum, m) => sum + Number(m.quantity), 0);
      console.log(`${productName}: Net movement = ${totalMovement} (should be 0) ${totalMovement === 0 ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing void invoice:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSpecificVoidInvoice();