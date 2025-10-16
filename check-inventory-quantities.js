import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkInventoryQuantities() {
  try {
    console.log('🔍 Checking Inventory Quantities for Void Invoice\n')
    
    // Get the original invoice to see what products were involved
    const originalInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: 'TEST-1759910642967' },
      include: { 
        lines: { 
          include: { product: true } 
        } 
      }
    })
    
    if (!originalInvoice) {
      console.log('❌ Original invoice not found')
      return
    }
    
    console.log('=== Original Invoice Products ===')
    console.log(`📋 Invoice: ${originalInvoice.invoiceNumber} (Status: ${originalInvoice.status})`)
    console.log(`💰 Total: $${originalInvoice.totalAmount}\n`)
    
    // Show what products were sold and check current stock levels
    console.log('📦 Products Sold in Original Invoice:')
    const productsInInvoice = []
    
    for (const line of originalInvoice.lines) {
      const product = line.product
      if (product) {
        productsInInvoice.push({
          productId: product.id,
          name: product.name,
          soldQuantity: Number(line.quantity),
          currentStock: Number(product.stockQuantity)
        })
        
        console.log(`${productsInInvoice.length}. ${product.name}`)
        console.log(`   - Product ID: ${product.id}`)
        console.log(`   - Quantity Sold: ${line.quantity}`)
        console.log(`   - Current Stock: ${product.stockQuantity}`)
        console.log(`   - Product Type: ${product.type}`)
        console.log('')
      }
    }
    
    // Check inventory movements for both original and void
    console.log('=== Inventory Movements Analysis ===')
    
    const originalMovements = await prisma.inventoryMovement.findMany({
      where: { 
        reference: { 
          in: ['TEST-1759910642967', originalInvoice.invoiceNumber] 
        }
      },
      include: { product: true },
      orderBy: { movementDate: 'asc' }
    })
    
    const voidMovements = await prisma.inventoryMovement.findMany({
      where: { 
        reference: {
          in: ['VOID-INV-TEST-1759910642967', 'VOID-TEST-1759910642967']
        }
      },
      include: { product: true },
      orderBy: { movementDate: 'asc' }
    })
    
    console.log(`📊 Original Sale Movements: ${originalMovements.length}`)
    originalMovements.forEach((mov, idx) => {
      console.log(`${idx + 1}. ${mov.product?.name}`)
      console.log(`   - Movement Type: ${mov.movementType}`)
      console.log(`   - Quantity: ${mov.quantity} (${mov.quantity < 0 ? 'Reduction' : 'Increase'})`)
      console.log(`   - Date: ${mov.movementDate}`)
      console.log(`   - Reference: ${mov.reference}`)
      console.log(`   - Reason: ${mov.reason || 'Not specified'}`)
      console.log('')
    })
    
    console.log(`📊 Void-Related Movements: ${voidMovements.length}`)
    voidMovements.forEach((mov, idx) => {
      console.log(`${idx + 1}. ${mov.product?.name}`)
      console.log(`   - Movement Type: ${mov.movementType}`)
      console.log(`   - Quantity: ${mov.quantity} (${mov.quantity < 0 ? 'Reduction' : 'Increase'})`)
      console.log(`   - Date: ${mov.movementDate}`)
      console.log(`   - Reference: ${mov.reference}`)
      console.log(`   - Reason: ${mov.reason || 'Not specified'}`)
      console.log('')
    })
    
    // Check if inventory movements exist for the products in the invoice
    console.log('=== Inventory Movement Verification ===')
    
    let inventoryIssuesFound = []
    
    for (const productInfo of productsInInvoice) {
      const { productId, name, soldQuantity } = productInfo
      
      // Find movements for this specific product
      const productOriginalMovements = originalMovements.filter(m => m.productId === productId)
      const productVoidMovements = voidMovements.filter(m => m.productId === productId)
      
      console.log(`🔍 ${name}:`)
      console.log(`   Sold Quantity: ${soldQuantity}`)
      console.log(`   Original Movements: ${productOriginalMovements.length}`)
      console.log(`   Void Movements: ${productVoidMovements.length}`)
      
      // Check if original sale created inventory movement
      if (productOriginalMovements.length === 0) {
        console.log(`   ❌ No inventory movement created for original sale!`)
        inventoryIssuesFound.push(`${name}: No original inventory movement`)
      } else {
        const originalQtyChange = productOriginalMovements.reduce((sum, mov) => sum + Number(mov.quantity), 0)
        console.log(`   📉 Original movement qty change: ${originalQtyChange}`)
        
        if (Math.abs(originalQtyChange) !== soldQuantity) {
          console.log(`   ⚠️  Movement quantity (${Math.abs(originalQtyChange)}) doesn't match sold quantity (${soldQuantity})`)
        }
      }
      
      // Check if void created reversing inventory movement  
      if (productVoidMovements.length === 0) {
        console.log(`   ❌ No void inventory movement created!`)
        inventoryIssuesFound.push(`${name}: No void inventory movement`)
      } else {
        const voidQtyChange = productVoidMovements.reduce((sum, mov) => sum + Number(mov.quantity), 0)
        console.log(`   📈 Void movement qty change: ${voidQtyChange}`)
        
        const originalQtyChange = productOriginalMovements.reduce((sum, mov) => sum + Number(mov.quantity), 0)
        if (Math.abs(originalQtyChange + voidQtyChange) > 0.01) {
          console.log(`   ❌ Movements don't cancel out! Original: ${originalQtyChange}, Void: ${voidQtyChange}`)
          inventoryIssuesFound.push(`${name}: Movements don't cancel out`)
        } else {
          console.log(`   ✅ Movements properly cancel out`)
        }
      }
      console.log('')
    }
    
    // Get current stock levels after void
    console.log('=== Current Stock Verification ===')
    
    for (const productInfo of productsInInvoice) {
      const currentProduct = await prisma.product.findUnique({
        where: { id: productInfo.productId }
      })
      
      if (currentProduct) {
        console.log(`📦 ${currentProduct.name}:`)
        console.log(`   Current Stock: ${currentProduct.stockQuantity}`)
        
        // Calculate what stock should be if void was processed correctly
        const originalMovements = await prisma.inventoryMovement.findMany({
          where: { 
            productId: productInfo.productId,
            reference: { 
              in: ['TEST-1759910642967', originalInvoice.invoiceNumber] 
            }
          }
        })
        
        const voidMovements = await prisma.inventoryMovement.findMany({
          where: { 
            productId: productInfo.productId,
            reference: {
              contains: 'VOID'
            }
          }
        })
        
        const totalOriginalMovement = originalMovements.reduce((sum, mov) => sum + Number(mov.quantity), 0)
        const totalVoidMovement = voidMovements.reduce((sum, mov) => sum + Number(mov.quantity), 0)
        
        console.log(`   Total Original Movement: ${totalOriginalMovement}`)
        console.log(`   Total Void Movement: ${totalVoidMovement}`)
        console.log(`   Net Movement: ${totalOriginalMovement + totalVoidMovement}`)
        
        if (Math.abs(totalOriginalMovement + totalVoidMovement) < 0.01) {
          console.log(`   ✅ Stock movements properly cancelled out`)
        } else {
          console.log(`   ❌ Stock movements NOT properly cancelled out`)
          inventoryIssuesFound.push(`${currentProduct.name}: Stock not properly restored`)
        }
        console.log('')
      }
    }
    
    // Final assessment
    console.log('🎯 === INVENTORY QUANTITY ASSESSMENT ===')
    
    if (inventoryIssuesFound.length === 0) {
      console.log('✅ INVENTORY QUANTITIES ARE CORRECT')
      console.log('   ✅ All products have proper inventory movements')
      console.log('   ✅ Original sales movements created')
      console.log('   ✅ Void reversing movements created') 
      console.log('   ✅ Stock quantities properly restored')
    } else {
      console.log('❌ INVENTORY QUANTITY ISSUES FOUND')
      console.log('   Issues detected:')
      inventoryIssuesFound.forEach(issue => {
        console.log(`   - ${issue}`)
      })
      
      console.log('\n💡 Recommendations:')
      console.log('   1. Check if inventory movements are being created on invoice posting')
      console.log('   2. Verify void process creates reversing inventory movements')
      console.log('   3. Ensure stock quantities are updated correctly')
    }
    
    // Check if the issue is that original invoice was never posted for inventory
    console.log('\n🔍 === ROOT CAUSE ANALYSIS ===')
    
    if (originalMovements.length === 0) {
      console.log('🔧 ISSUE IDENTIFIED: Original invoice never created inventory movements')
      console.log('💡 CAUSE: Invoice may have been created but never POSTED to trigger inventory updates')
      console.log('📝 SOLUTION: Inventory movements are only created when invoices are POSTED, not just created')
      console.log('   - The journal entries show proper COGS/Inventory accounting')
      console.log('   - But physical inventory quantities require inventory movements')
      console.log('   - This suggests a gap between financial accounting and inventory management')
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

checkInventoryQuantities()