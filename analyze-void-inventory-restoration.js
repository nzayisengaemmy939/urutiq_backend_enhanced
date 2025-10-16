import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeVoidInventoryRestoration() {
  try {
    console.log('🔍 Analyzing Voided Journal Entries Effect on Inventory Quantities\n')
    
    // Step 1: Find all voided invoices and their original invoices
    console.log('=== Step 1: Finding Voided Invoices ===')
    const voidedInvoices = await prisma.invoice.findMany({
      where: {
        invoiceNumber: {
          startsWith: 'VOID-INV-'
        }
      },
      include: {
        lines: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`Found ${voidedInvoices.length} voided invoices:`)
    voidedInvoices.forEach((invoice, idx) => {
      console.log(`${idx + 1}. ${invoice.invoiceNumber} (Status: ${invoice.status}, Total: $${invoice.totalAmount})`)
    })
    console.log('')
    
    // Step 2: For each voided invoice, analyze the restoration process
    for (const voidInvoice of voidedInvoices) {
      console.log(`\n🔍 === Analyzing ${voidInvoice.invoiceNumber} ===`)
      
      // Extract original invoice number
      const originalInvoiceNumber = voidInvoice.invoiceNumber.replace('VOID-INV-', '')
      console.log(`Original Invoice: ${originalInvoiceNumber}`)
      
      // Find the original invoice
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
        continue
      }
      
      console.log(`✅ Original invoice found (Status: ${originalInvoice.status})`)
      console.log(`   Total: $${originalInvoice.totalAmount}`)
      console.log(`   Lines: ${originalInvoice.lines.length}`)
      
      // Step 3: Check journal entries for both original and void
      console.log('\n📊 === Journal Entries Analysis ===')
      
      const originalJournalEntries = await prisma.journalEntry.findMany({
        where: {
          OR: [
            { reference: originalInvoiceNumber },
            { reference: `INV-${originalInvoiceNumber}` }
          ]
        },
        include: {
          lines: {
            include: { account: true }
          }
        }
      })
      
      const voidJournalEntries = await prisma.journalEntry.findMany({
        where: {
          reference: voidInvoice.invoiceNumber
        },
        include: {
          lines: {
            include: { account: true }
          }
        }
      })
      
      console.log(`Original Journal Entries: ${originalJournalEntries.length}`)
      console.log(`Void Journal Entries: ${voidJournalEntries.length}`)
      
      // Analyze journal entry reversals
      if (originalJournalEntries.length > 0 && voidJournalEntries.length > 0) {
        console.log('\n📋 Journal Entry Reversal Analysis:')
        
        // Check if COGS and Inventory accounts are properly reversed
        const originalCOGS = originalJournalEntries.flatMap(je => 
          je.lines.filter(line => line.account.name.toLowerCase().includes('cost of goods sold'))
        )
        const voidCOGS = voidJournalEntries.flatMap(je => 
          je.lines.filter(line => line.account.name.toLowerCase().includes('cost of goods sold'))
        )
        
        const originalInventory = originalJournalEntries.flatMap(je => 
          je.lines.filter(line => line.account.name.toLowerCase().includes('inventory'))
        )
        const voidInventory = voidJournalEntries.flatMap(je => 
          je.lines.filter(line => line.account.name.toLowerCase().includes('inventory'))
        )
        
        console.log(`   COGS Entries - Original: ${originalCOGS.length}, Void: ${voidCOGS.length}`)
        console.log(`   Inventory Entries - Original: ${originalInventory.length}, Void: ${voidInventory.length}`)
        
        // Calculate if amounts cancel out
        const originalCOGSTotal = originalCOGS.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0)
        const voidCOGSTotal = voidCOGS.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0)
        const originalInventoryTotal = originalInventory.reduce((sum, line) => sum + Number(line.creditAmount || 0), 0)
        const voidInventoryTotal = voidInventory.reduce((sum, line) => sum + Number(line.debitAmount || 0), 0)
        
        console.log(`   COGS: Original $${originalCOGSTotal} vs Void $${voidCOGSTotal} (${Math.abs(originalCOGSTotal - voidCOGSTotal) < 0.01 ? '✅ Match' : '❌ Mismatch'})`)
        console.log(`   Inventory: Original $${originalInventoryTotal} vs Void $${voidInventoryTotal} (${Math.abs(originalInventoryTotal - voidInventoryTotal) < 0.01 ? '✅ Match' : '❌ Mismatch'})`)
      }
      
      // Step 4: Check inventory movements
      console.log('\n📦 === Inventory Movements Analysis ===')
      
      const originalMovements = await prisma.inventoryMovement.findMany({
        where: {
          reference: {
            in: [originalInvoiceNumber, `INV-${originalInvoiceNumber}`]
          }
        },
        include: { product: true },
        orderBy: { createdAt: 'asc' }
      })
      
      const voidMovements = await prisma.inventoryMovement.findMany({
        where: {
          reference: voidInvoice.invoiceNumber
        },
        include: { product: true },
        orderBy: { createdAt: 'asc' }
      })
      
      console.log(`Original Movements: ${originalMovements.length}`)
      console.log(`Void Movements: ${voidMovements.length}`)
      
      if (originalMovements.length > 0) {
        console.log('\n📋 Original Inventory Movements:')
        originalMovements.forEach((mov, idx) => {
          console.log(`   ${idx + 1}. ${mov.product?.name || 'Unknown'}: ${mov.quantity} units (${mov.movementType})`)
        })
      }
      
      if (voidMovements.length > 0) {
        console.log('\n🔄 Void Inventory Movements:')
        voidMovements.forEach((mov, idx) => {
          console.log(`   ${idx + 1}. ${mov.product?.name || 'Unknown'}: ${mov.quantity} units (${mov.movementType})`)
        })
      }
      
      // Step 5: Check current stock levels for affected products
      console.log('\n📊 === Current Stock Level Analysis ===')
      
      const affectedProducts = new Set()
      originalMovements.forEach(mov => {
        if (mov.productId) affectedProducts.add(mov.productId)
      })
      voidMovements.forEach(mov => {
        if (mov.productId) affectedProducts.add(mov.productId)
      })
      
      let inventoryIssues = []
      
      for (const productId of affectedProducts) {
        const product = await prisma.product.findUnique({
          where: { id: productId }
        })
        
        if (product) {
          console.log(`\n📦 ${product.name} (ID: ${product.id})`)
          console.log(`   Current Stock: ${product.stockQuantity || 0} units`)
          
          // Calculate expected stock based on movements
          const productOriginalMovements = originalMovements.filter(mov => mov.productId === productId)
          const productVoidMovements = voidMovements.filter(mov => mov.productId === productId)
          
          const originalTotal = productOriginalMovements.reduce((sum, mov) => sum + Number(mov.quantity), 0)
          const voidTotal = productVoidMovements.reduce((sum, mov) => sum + Number(mov.quantity), 0)
          const netMovement = originalTotal + voidTotal
          
          console.log(`   Original Movement: ${originalTotal} units`)
          console.log(`   Void Movement: ${voidTotal} units`)
          console.log(`   Net Movement: ${netMovement} units`)
          
          if (Math.abs(netMovement) < 0.01) {
            console.log(`   ✅ Inventory movements properly cancelled out`)
          } else {
            console.log(`   ❌ Inventory movements NOT properly cancelled out`)
            inventoryIssues.push(`${product.name}: Net movement ${netMovement} units (should be ~0)`)
          }
          
          // Check if we can determine what the stock should be
          if (originalTotal !== 0 && voidTotal === 0) {
            console.log(`   🚨 ISSUE: Original movement exists but NO void movement found!`)
            console.log(`   This means inventory was reduced but not restored when voided.`)
            inventoryIssues.push(`${product.name}: Missing void movement (${originalTotal} units not restored)`)
          }
        }
      }
      
      // Step 6: Summary for this invoice
      console.log(`\n🎯 === Summary for ${voidInvoice.invoiceNumber} ===`)
      
      const hasOriginalMovements = originalMovements.length > 0
      const hasVoidMovements = voidMovements.length > 0
      const hasOriginalJournal = originalJournalEntries.length > 0
      const hasVoidJournal = voidJournalEntries.length > 0
      
      console.log(`📋 Status Check:`)
      console.log(`   - Original Invoice: ${originalInvoice ? '✅ Found' : '❌ Missing'}`)
      console.log(`   - Original Journal Entries: ${hasOriginalJournal ? '✅ Found' : '❌ Missing'}`)
      console.log(`   - Void Journal Entries: ${hasVoidJournal ? '✅ Found' : '❌ Missing'}`)
      console.log(`   - Original Inventory Movements: ${hasOriginalMovements ? '✅ Found' : '❌ Missing'}`)
      console.log(`   - Void Inventory Movements: ${hasVoidMovements ? '✅ Found' : '❌ Missing'}`)
      
      if (inventoryIssues.length > 0) {
        console.log(`\n🚨 INVENTORY ISSUES DETECTED:`)
        inventoryIssues.forEach(issue => console.log(`   - ${issue}`))
      } else {
        console.log(`\n✅ No inventory issues detected for this invoice`)
      }
      
      console.log('\n' + '='.repeat(80))
    }
    
    // Step 7: Overall system analysis
    console.log('\n🎯 === OVERALL SYSTEM INVENTORY ANALYSIS ===')
    
    // Get all products and their current stock levels
    const allProducts = await prisma.product.findMany({
      where: {
        type: 'inventory'
      },
      orderBy: { name: 'asc' }
    })
    
    console.log(`\n📦 Current Stock Levels for All Inventory Products:`)
    allProducts.forEach(product => {
      console.log(`   ${product.name}: ${product.stockQuantity || 0} units`)
    })
    
    // Check for any products with negative stock
    const negativeStockProducts = allProducts.filter(p => Number(p.stockQuantity || 0) < 0)
    if (negativeStockProducts.length > 0) {
      console.log(`\n🚨 Products with Negative Stock:`)
      negativeStockProducts.forEach(product => {
        console.log(`   ${product.name}: ${product.stockQuantity} units`)
      })
    }
    
    // Final recommendations
    console.log('\n💡 === RECOMMENDATIONS ===')
    console.log('1. If void movements are missing, create them to restore stock')
    console.log('2. If journal entries are missing, ensure proper accounting reversals')
    console.log('3. Consider implementing automated void process validation')
    console.log('4. Regular inventory reconciliation to catch discrepancies early')
    
  } catch (error) {
    console.error('❌ Error analyzing void inventory restoration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the analysis
analyzeVoidInventoryRestoration()
