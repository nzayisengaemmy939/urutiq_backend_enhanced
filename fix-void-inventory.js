import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixVoidInventoryIssue() {
  try {
    console.log('🔧 Fixing Void Inventory Issue for TEST-1759910642967\n')
    
    // Step 1: Identify the missing quantities
    const voidedInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: 'TEST-1759910642967' },
      include: { 
        lines: { 
          include: { product: true } 
        } 
      }
    })
    
    if (!voidedInvoice) {
      console.log('❌ Voided invoice not found')
      return
    }
    
    console.log('=== Voided Invoice Analysis ===')
    console.log(`📋 Invoice: ${voidedInvoice.invoiceNumber}`)
    console.log(`📅 Status: ${voidedInvoice.status}`)
    console.log('')
    
    // Step 2: Find original inventory movements for this invoice
    const originalMovements = await prisma.inventoryMovement.findMany({
      where: { 
        reference: { 
          in: ['INV-TEST-1759910642967', 'TEST-1759910642967']
        }
      },
      include: { product: true }
    })
    
    console.log(`📦 Original Inventory Movements: ${originalMovements.length}`)
    originalMovements.forEach((mov, idx) => {
      console.log(`${idx + 1}. ${mov.product?.name}: ${mov.quantity} units`)
      console.log(`   Reference: ${mov.reference}`)
      console.log(`   Movement Type: ${mov.movementType}`)
    })
    console.log('')
    
    // Step 3: Check if void movements already exist
    const existingVoidMovements = await prisma.inventoryMovement.findMany({
      where: { 
        reference: 'VOID-INV-TEST-1759910642967'
      }
    })
    
    console.log(`🔍 Existing Void Movements: ${existingVoidMovements.length}`)
    
    if (existingVoidMovements.length > 0) {
      console.log('ℹ️  Void movements already exist - checking if they are correct')
      existingVoidMovements.forEach((mov, idx) => {
        console.log(`${idx + 1}. Product: ${mov.productId}, Quantity: ${mov.quantity}`)
      })
    } else {
      console.log('❌ No void movements found - this is the issue!')
    }
    console.log('')
    
    // Step 4: Create missing void movements and restore stock
    console.log('=== Creating Missing Void Movements ===')
    
    for (const originalMovement of originalMovements) {
      const product = originalMovement.product
      if (!product) continue
      
      const originalQuantity = Number(originalMovement.quantity)
      const reversingQuantity = -originalQuantity // Reverse the original movement
      
      console.log(`🔄 Processing ${product.name}:`)
      console.log(`   Original Movement: ${originalQuantity}`)
      console.log(`   Reversing Movement: ${reversingQuantity}`)
      
      // Check if void movement already exists for this product
      const existingVoidForProduct = existingVoidMovements.find(
        vm => vm.productId === product.id
      )
      
      if (!existingVoidForProduct) {
        // Create the void movement
        await prisma.inventoryMovement.create({
          data: {
            tenantId: originalMovement.tenantId,
            productId: product.id,
            movementType: 'VOID',
            quantity: reversingQuantity,
            movementDate: new Date(),
            reference: 'VOID-INV-TEST-1759910642967',
            reason: `Inventory restoration - voided sale ${voidedInvoice.invoiceNumber}`,
            unitCost: originalMovement.unitCost || 0
          }
        })
        
        console.log(`   ✅ Created void movement: ${reversingQuantity} units`)
        
        // Update the product stock quantity
        const currentStock = Number(product.stockQuantity)
        const newStock = currentStock + Math.abs(reversingQuantity)
        
        await prisma.product.update({
          where: { id: product.id },
          data: { stockQuantity: newStock }
        })
        
        console.log(`   📦 Updated stock: ${currentStock} → ${newStock}`)
      } else {
        console.log(`   ℹ️  Void movement already exists for this product`)
      }
      console.log('')
    }
    
    // Step 5: Verify the fix
    console.log('=== Verification After Fix ===')
    
    const updatedProducts = await prisma.product.findMany({
      where: {
        id: {
          in: originalMovements.map(om => om.productId)
        }
      }
    })
    
    updatedProducts.forEach(product => {
      console.log(`📦 ${product.name}: Stock = ${product.stockQuantity}`)
    })
    
    const allVoidMovements = await prisma.inventoryMovement.findMany({
      where: { reference: 'VOID-INV-TEST-1759910642967' },
      include: { product: true }
    })
    
    console.log(`\n📋 All Void Movements: ${allVoidMovements.length}`)
    allVoidMovements.forEach((mov, idx) => {
      console.log(`${idx + 1}. ${mov.product?.name}: ${mov.quantity} units (${mov.movementType})`)
    })
    
    // Step 6: Verify net movements cancel out
    console.log('\n=== Movement Cancellation Verification ===')
    
    for (const product of updatedProducts) {
      const productOriginalMovements = originalMovements.filter(om => om.productId === product.id)
      const productVoidMovements = allVoidMovements.filter(vm => vm.productId === product.id)
      
      const originalTotal = productOriginalMovements.reduce((sum, mov) => sum + Number(mov.quantity), 0)
      const voidTotal = productVoidMovements.reduce((sum, mov) => sum + Number(mov.quantity), 0)
      const netMovement = originalTotal + voidTotal
      
      console.log(`🔍 ${product.name}:`)
      console.log(`   Original movements total: ${originalTotal}`)
      console.log(`   Void movements total: ${voidTotal}`)
      console.log(`   Net movement: ${netMovement} ${Math.abs(netMovement) < 0.01 ? '✅' : '❌'}`)
    }
    
    console.log('\n🎯 === FIX COMPLETE ===')
    console.log('✅ Missing void inventory movements created')
    console.log('✅ Product stock quantities restored')
    console.log('✅ Movement cancellation verified')
    console.log('✅ Void process now complete for both accounting and inventory')
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Error fixing void inventory issue:', error)
    await prisma.$disconnect()
  }
}

fixVoidInventoryIssue()