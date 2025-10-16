import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigateVoidInvoice() {
  try {
    console.log('🔍 Investigating Void Invoice: VOID-INV-POS-1759913288876\n')
    
    // Step 1: Find the original invoice (remove VOID-INV- prefix)
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
    
    if (!originalInvoice) {
      console.log(`❌ Original invoice ${originalInvoiceNumber} not found`)
      console.log('🔍 Searching for similar invoices...')
      
      // Search for invoices with similar patterns
      const similarInvoices = await prisma.invoice.findMany({
        where: {
          invoiceNumber: {
            contains: '1759913288876'
          }
        },
        include: { lines: { include: { product: true } } }
      })
      
      console.log(`Found ${similarInvoices.length} similar invoices:`)
      similarInvoices.forEach(inv => {
        console.log(`- ${inv.invoiceNumber} (Status: ${inv.status}, Total: $${inv.totalAmount})`)
      })
      
      if (similarInvoices.length === 0) {
        console.log('❌ No invoices found with that number pattern')
        return
      }
    } else {
      console.log(`✅ Original Invoice Found: ${originalInvoice.invoiceNumber}`)
      console.log(`   Status: ${originalInvoice.status}`)
      console.log(`   Total: $${originalInvoice.totalAmount}`)
      console.log(`   Lines: ${originalInvoice.lines.length}`)
      
      console.log('\n📋 Invoice Lines:')
      originalInvoice.lines.forEach((line, idx) => {
        console.log(`${idx + 1}. ${line.description}`)
        console.log(`   - Product: ${line.product?.name || 'Unknown'}`)
        console.log(`   - Quantity: ${line.quantity}`)
        console.log(`   - Unit Price: $${line.unitPrice}`)
        console.log(`   - Line Total: $${Number(line.quantity) * Number(line.unitPrice)}`)
        console.log('')
      })
    }
    
    // Step 2: Check for void invoice
    console.log('\n=== Step 2: Checking for Void Invoice ===')
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
    
    // Step 3: Check inventory movements for original invoice
    console.log('\n=== Step 3: Checking Inventory Movements ===')
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
    
    // Step 4: Check for void movements
    console.log('=== Step 4: Checking Void Movements ===')
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
    
    // Step 5: Check current stock levels for affected products
    console.log('=== Step 5: Current Stock Levels ===')
    const affectedProducts = new Set()
    
    // Collect products from original movements
    originalMovements.forEach(mov => {
      if (mov.productId) affectedProducts.add(mov.productId)
    })
    
    // Collect products from void movements
    voidMovements.forEach(mov => {
      if (mov.productId) affectedProducts.add(mov.productId)
    })
    
    if (affectedProducts.size > 0) {
      console.log(`📊 Checking stock for ${affectedProducts.size} affected products:`)
      
      for (const productId of affectedProducts) {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          include: {
            inventoryMovements: {
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          }
        })
        
        if (product) {
          console.log(`\n📦 ${product.name} (ID: ${product.id})`)
          console.log(`   - Current Stock: ${product.stockQuantity || 0} units`)
          console.log(`   - Cost Price: $${product.costPrice || 0}`)
          console.log(`   - Recent Movements:`)
          
          product.inventoryMovements.forEach((mov, idx) => {
            console.log(`     ${idx + 1}. ${mov.quantity} units (${mov.movementType}) - ${mov.reference} - ${mov.createdAt}`)
          })
        }
      }
    } else {
      console.log('❌ No products found in movements')
    }
    
    // Step 6: Check journal entries
    console.log('\n=== Step 6: Journal Entries Analysis ===')
    const journalEntries = await prisma.journalEntry.findMany({
      where: { 
        OR: [
          { reference: originalInvoiceNumber },
          { reference: `INV-${originalInvoiceNumber}` },
          { reference: voidInvoiceNumber }
        ]
      },
      include: { 
        lines: { 
          include: { account: true } 
        } 
      },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`📊 Found ${journalEntries.length} journal entries:`)
    journalEntries.forEach((entry, idx) => {
      console.log(`\n${idx + 1}. ${entry.reference} (Status: ${entry.status})`)
      console.log(`   Date: ${entry.createdAt}`)
      console.log(`   Lines: ${entry.lines.length}`)
      
      entry.lines.forEach((line, lineIdx) => {
        console.log(`     ${lineIdx + 1}. ${line.account.name}: $${line.debitAmount} Dr | $${line.creditAmount} Cr`)
      })
    })
    
    // Step 7: Summary and recommendations
    console.log('\n=== Step 7: Summary & Recommendations ===')
    
    const hasOriginalMovements = originalMovements.length > 0
    const hasVoidMovements = voidMovements.length > 0
    const hasOriginalInvoice = !!originalInvoice
    const hasVoidInvoice = !!voidInvoice
    
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
    console.error('❌ Error investigating void invoice:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the investigation
investigateVoidInvoice()
