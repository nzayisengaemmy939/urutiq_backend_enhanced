import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSpecificInvoice() {
  try {
    console.log('🔍 Investigating Invoice: VOID-INV-POS-1759913288876\n')
    
    // Step 1: Search for the original invoice (POS-1759913288876)
    const originalInvoiceNumber = 'POS-1759913288876'
    const voidInvoiceNumber = 'VOID-INV-POS-1759913288876'
    
    console.log('=== Step 1: Finding Original Invoice ===')
    const originalInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: originalInvoiceNumber },
      include: { 
        lines: { 
          include: { product: true } 
        } 
      }
    })
    
    if (originalInvoice) {
      console.log(`✅ Original Invoice Found: ${originalInvoice.invoiceNumber}`)
      console.log(`   Status: ${originalInvoice.status}`)
      console.log(`   Total: $${originalInvoice.totalAmount}`)
      console.log(`   Lines: ${originalInvoice.lines.length}`)
      
      console.log('\n📋 Products in Original Invoice:')
      originalInvoice.lines.forEach((line, idx) => {
        console.log(`${idx + 1}. ${line.description}`)
        console.log(`   - Product: ${line.product?.name || 'Unknown'}`)
        console.log(`   - Quantity: ${line.quantity}`)
        console.log(`   - Unit Price: $${line.unitPrice}`)
        console.log(`   - Product ID: ${line.productId}`)
        console.log('')
      })
    } else {
      console.log(`❌ Original invoice ${originalInvoiceNumber} not found`)
      
      // Try searching for similar patterns
      console.log('\n🔍 Searching for similar invoices...')
      const similarInvoices = await prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: '1759913288876' } },
            { invoiceNumber: { contains: 'POS-1759913288876' } }
          ]
        },
        include: { lines: { include: { product: true } } }
      })
      
      console.log(`Found ${similarInvoices.length} similar invoices:`)
      similarInvoices.forEach(inv => {
        console.log(`- ${inv.invoiceNumber} (Status: ${inv.status}, Total: $${inv.totalAmount})`)
      })
    }
    
    // Step 2: Check for void invoice
    console.log('\n=== Step 2: Checking Void Invoice ===')
    const voidInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: voidInvoiceNumber },
      include: { 
        lines: { 
          include: { product: true } 
        } 
      }
    })
    
    if (voidInvoice) {
      console.log(`✅ Void Invoice Found: ${voidInvoice.invoiceNumber}`)
      console.log(`   Status: ${voidInvoice.status}`)
      console.log(`   Total: $${voidInvoice.totalAmount}`)
      console.log(`   Lines: ${voidInvoice.lines.length}`)
    } else {
      console.log(`❌ Void invoice ${voidInvoiceNumber} not found`)
    }
    
    // Step 3: Check inventory movements
    console.log('\n=== Step 3: Inventory Movements Analysis ===')
    
    // Check original movements
    const originalMovements = await prisma.inventoryMovement.findMany({
      where: { 
        reference: { 
          in: [originalInvoiceNumber, `INV-${originalInvoiceNumber}`]
        }
      },
      include: { product: true },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`📦 Original Inventory Movements: ${originalMovements.length}`)
    originalMovements.forEach((mov, idx) => {
      console.log(`${idx + 1}. ${mov.product?.name || 'Unknown Product'}`)
      console.log(`   - Quantity: ${mov.quantity} units`)
      console.log(`   - Movement Type: ${mov.movementType}`)
      console.log(`   - Reference: ${mov.reference}`)
      console.log(`   - Date: ${mov.createdAt}`)
      console.log('')
    })
    
    // Check void movements
    const voidMovements = await prisma.inventoryMovement.findMany({
      where: { 
        reference: voidInvoiceNumber
      },
      include: { product: true },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`🔄 Void Inventory Movements: ${voidMovements.length}`)
    voidMovements.forEach((mov, idx) => {
      console.log(`${idx + 1}. ${mov.product?.name || 'Unknown Product'}`)
      console.log(`   - Quantity: ${mov.quantity} units`)
      console.log(`   - Movement Type: ${mov.movementType}`)
      console.log(`   - Reference: ${mov.reference}`)
      console.log(`   - Date: ${mov.createdAt}`)
      console.log('')
    })
    
    // Step 4: Check current stock levels for affected products
    console.log('=== Step 4: Current Stock Levels ===')
    
    // Get all unique product IDs from movements
    const affectedProductIds = new Set()
    originalMovements.forEach(mov => {
      if (mov.productId) affectedProductIds.add(mov.productId)
    })
    voidMovements.forEach(mov => {
      if (mov.productId) affectedProductIds.add(mov.productId)
    })
    
    if (affectedProductIds.size > 0) {
      console.log(`📊 Checking stock for ${affectedProductIds.size} affected products:`)
      
      for (const productId of affectedProductIds) {
        const product = await prisma.product.findUnique({
          where: { id: productId }
        })
        
        if (product) {
          console.log(`\n📦 ${product.name} (ID: ${product.id})`)
          console.log(`   - Current Stock: ${product.stockQuantity || 0} units`)
          console.log(`   - Cost Price: $${product.costPrice || 0}`)
          console.log(`   - Product Type: ${product.type}`)
          
          // Get recent movements for this product
          const recentMovements = await prisma.inventoryMovement.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
            take: 5
          })
          
          console.log(`   - Recent Movements:`)
          recentMovements.forEach((mov, idx) => {
            console.log(`     ${idx + 1}. ${mov.quantity} units (${mov.movementType}) - ${mov.reference} - ${mov.createdAt}`)
          })
        }
      }
    } else {
      console.log('❌ No products found in movements')
    }
    
    // Step 5: Summary
    console.log('\n=== Step 5: Summary ===')
    
    const hasOriginalInvoice = !!originalInvoice
    const hasVoidInvoice = !!voidInvoice
    const hasOriginalMovements = originalMovements.length > 0
    const hasVoidMovements = voidMovements.length > 0
    
    console.log(`📋 Invoice Status:`)
    console.log(`   - Original Invoice: ${hasOriginalInvoice ? '✅ Found' : '❌ Missing'}`)
    console.log(`   - Void Invoice: ${hasVoidInvoice ? '✅ Found' : '❌ Missing'}`)
    console.log(`   - Original Movements: ${hasOriginalMovements ? '✅ Found' : '❌ Missing'}`)
    console.log(`   - Void Movements: ${hasVoidMovements ? '✅ Found' : '❌ Missing'}`)
    
    if (hasOriginalMovements && !hasVoidMovements) {
      console.log('\n🚨 ISSUE DETECTED: Original inventory movements exist but no void movements found!')
      console.log('   This means inventory was reduced but not restored when voided.')
      console.log('   Recommendation: Create void movements to restore stock.')
    } else if (hasOriginalMovements && hasVoidMovements) {
      console.log('\n✅ INVENTORY CORRECTLY VOIDED: Both original and void movements exist.')
    } else if (!hasOriginalMovements) {
      console.log('\n⚠️  No original movements found - invoice may not have affected inventory.')
    }
    
  } catch (error) {
    console.error('❌ Error investigating invoice:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the investigation
checkSpecificInvoice()
