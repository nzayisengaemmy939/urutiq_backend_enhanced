import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testInvoiceInventoryMovements() {
  try {
    console.log('=== Testing Invoice Inventory Movement Creation ===\n')
    
    // Find the specific invoice mentioned by the user
    const targetInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: 'POS-1759909857028' },
      include: { 
        lines: { 
          include: { product: true } 
        } 
      }
    })
    
    if (!targetInvoice) {
      console.log('❌ Invoice POS-1759909857028 not found')
      return
    }
    
    console.log(`📋 Invoice: ${targetInvoice.invoiceNumber}`)
    console.log(`📅 Status: ${targetInvoice.status}`)
    console.log(`💰 Total: $${targetInvoice.totalAmount}`)
    console.log(`📦 Lines: ${targetInvoice.lines.length}\n`)
    
    // Show invoice lines
    console.log('=== Invoice Lines ===')
    targetInvoice.lines.forEach((line, idx) => {
      console.log(`${idx + 1}. ${line.description}`)
      console.log(`   - ProductId: ${line.productId}`)
      console.log(`   - Product Type: ${line.product?.type}`)
      console.log(`   - Quantity: ${line.quantity}`)
      console.log(`   - Unit Price: $${line.unitPrice}`)
      console.log(`   - Line Total: $${line.lineTotal}`)
      console.log('')
    })
    
    // Check inventory movements for this invoice
    console.log('=== Related Inventory Movements ===')
    const movements = await prisma.inventoryMovement.findMany({
      where: { reference: targetInvoice.invoiceNumber },
      include: { product: true }
    })
    
    if (movements.length === 0) {
      console.log('❌ No inventory movements found for this invoice!')
      console.log('🔍 This explains why only one product appears in accounting transactions')
    } else {
      console.log(`✅ Found ${movements.length} inventory movements:`)
      movements.forEach((mov, idx) => {
        console.log(`${idx + 1}. ${mov.product?.name}`)
        console.log(`   - Movement Type: ${mov.movementType}`)
        console.log(`   - Quantity: ${mov.quantity}`)
        console.log(`   - Date: ${mov.movementDate}`)
        console.log(`   - Reference: ${mov.reference}`)
        console.log('')
      })
    }
    
    // Check journal entries for this invoice
    console.log('=== Related Journal Entries ===')
    const journalEntries = await prisma.journalEntry.findMany({
      where: { reference: targetInvoice.invoiceNumber },
      include: { lines: { include: { account: true } } }
    })
    
    if (journalEntries.length === 0) {
      console.log('❌ No journal entries found for this invoice!')
    } else {
      journalEntries.forEach((entry, idx) => {
        console.log(`📊 Journal Entry ${idx + 1}: ${entry.memo}`)
        console.log(`   Status: ${entry.status}`)
        console.log(`   Lines: ${entry.lines.length}`)
        entry.lines.forEach(line => {
          console.log(`   - ${line.account?.name}: Dr $${line.debit} | Cr $${line.credit} (${line.memo})`)
        })
        console.log('')
      })
    }
    
    console.log('=== Recommendations ===')
    if (movements.length < targetInvoice.lines.length) {
      console.log('🔧 Issue: Not all invoice line items created inventory movements')
      console.log('💡 Solution: The product type condition was incorrect (checking for "inventory" instead of "PRODUCT")')
      console.log('✅ This has been fixed in the code')
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
  }
}

testInvoiceInventoryMovements()