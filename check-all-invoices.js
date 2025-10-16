import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAllInvoices() {
  try {
    console.log('🔍 Checking All Invoices in the System\n')
    
    // Get all invoices
    const allInvoices = await prisma.invoice.findMany({
      include: {
        lines: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20 // Limit to recent 20
    })
    
    console.log(`Found ${allInvoices.length} invoices (showing recent 20):\n`)
    
    allInvoices.forEach((invoice, idx) => {
      console.log(`${idx + 1}. ${invoice.invoiceNumber}`)
      console.log(`   Status: ${invoice.status}`)
      console.log(`   Total: $${invoice.totalAmount}`)
      console.log(`   Date: ${invoice.createdAt}`)
      console.log(`   Lines: ${invoice.lines.length}`)
      
      if (invoice.lines.length > 0) {
        console.log(`   Products:`)
        invoice.lines.forEach((line, lineIdx) => {
          console.log(`     ${lineIdx + 1}. ${line.description} (${line.quantity} x $${line.unitPrice})`)
        })
      }
      console.log('')
    })
    
    // Check for any invoices with "void" in the name or status
    console.log('\n=== Checking for Void-Related Invoices ===')
    const voidRelatedInvoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: 'VOID' } },
          { invoiceNumber: { contains: 'void' } },
          { status: { contains: 'void' } },
          { status: { contains: 'VOID' } }
        ]
      },
      include: {
        lines: {
          include: { product: true }
        }
      }
    })
    
    console.log(`Found ${voidRelatedInvoices.length} void-related invoices:`)
    voidRelatedInvoices.forEach((invoice, idx) => {
      console.log(`${idx + 1}. ${invoice.invoiceNumber} (Status: ${invoice.status})`)
    })
    
    // Check journal entries for void patterns
    console.log('\n=== Checking Journal Entries for Void Patterns ===')
    const voidJournalEntries = await prisma.journalEntry.findMany({
      where: {
        OR: [
          { reference: { contains: 'VOID' } },
          { reference: { contains: 'void' } }
        ]
      },
      include: {
        lines: {
          include: { account: true }
        }
      }
    })
    
    console.log(`Found ${voidJournalEntries.length} void-related journal entries:`)
    voidJournalEntries.forEach((entry, idx) => {
      console.log(`${idx + 1}. ${entry.reference} (Status: ${entry.status})`)
      console.log(`   Date: ${entry.createdAt}`)
      console.log(`   Lines: ${entry.lines.length}`)
    })
    
    // Check inventory movements for void patterns
    console.log('\n=== Checking Inventory Movements for Void Patterns ===')
    const voidMovements = await prisma.inventoryMovement.findMany({
      where: {
        OR: [
          { reference: { contains: 'VOID' } },
          { reference: { contains: 'void' } }
        ]
      },
      include: { product: true }
    })
    
    console.log(`Found ${voidMovements.length} void-related inventory movements:`)
    voidMovements.forEach((movement, idx) => {
      console.log(`${idx + 1}. ${movement.product?.name || 'Unknown'}: ${movement.quantity} units`)
      console.log(`   Reference: ${movement.reference}`)
      console.log(`   Type: ${movement.movementType}`)
      console.log(`   Date: ${movement.createdAt}`)
    })
    
    // Check current stock levels
    console.log('\n=== Current Stock Levels ===')
    const products = await prisma.product.findMany({
      where: {
        type: 'inventory'
      }
    })
    
    console.log(`Found ${products.length} inventory products:`)
    products.forEach(product => {
      console.log(`   ${product.name}: ${product.stockQuantity || 0} units`)
    })
    
  } catch (error) {
    console.error('❌ Error checking invoices:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkAllInvoices()
