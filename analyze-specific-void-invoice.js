import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeSpecificVoidInvoice() {
  try {
    console.log('🔍 Detailed Analysis of VOID-INV-POS-1759913288876\n')
    
    const originalInvoiceNumber = 'POS-1759913288876'
    const voidInvoiceNumber = 'VOID-INV-POS-1759913288876'
    
    // Step 1: Get the original invoice details
    console.log('=== Step 1: Original Invoice Analysis ===')
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
      return
    }
    
    console.log(`✅ Original Invoice Found: ${originalInvoice.invoiceNumber}`)
    console.log(`   Status: ${originalInvoice.status}`)
    console.log(`   Total: $${originalInvoice.totalAmount}`)
    console.log(`   Date: ${originalInvoice.createdAt}`)
    console.log(`   Lines: ${originalInvoice.lines.length}`)
    
    console.log('\n📋 Original Invoice Products:')
    originalInvoice.lines.forEach((line, idx) => {
      console.log(`   ${idx + 1}. ${line.description}`)
      console.log(`      Product: ${line.product?.name || 'Unknown'}`)
      console.log(`      Quantity: ${line.quantity}`)
      console.log(`      Unit Price: $${line.unitPrice}`)
      console.log(`      Line Total: $${Number(line.quantity) * Number(line.unitPrice)}`)
      console.log('')
    })
    
    // Step 2: Check journal entries for original invoice
    console.log('=== Step 2: Original Journal Entries ===')
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
      },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`Found ${originalJournalEntries.length} original journal entries:`)
    originalJournalEntries.forEach((entry, idx) => {
      console.log(`\n${idx + 1}. ${entry.reference} (Status: ${entry.status})`)
      console.log(`   Date: ${entry.createdAt}`)
      console.log(`   Lines: ${entry.lines.length}`)
      
      entry.lines.forEach((line, lineIdx) => {
        console.log(`     ${lineIdx + 1}. ${line.account.name}: $${line.debitAmount} Dr | $${line.creditAmount} Cr`)
      })
    })
    
    // Step 3: Check void journal entries
    console.log('\n=== Step 3: Void Journal Entries ===')
    const voidJournalEntries = await prisma.journalEntry.findMany({
      where: {
        reference: voidInvoiceNumber
      },
      include: {
        lines: {
          include: { account: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`Found ${voidJournalEntries.length} void journal entries:`)
    voidJournalEntries.forEach((entry, idx) => {
      console.log(`\n${idx + 1}. ${entry.reference} (Status: ${entry.status})`)
      console.log(`   Date: ${entry.createdAt}`)
      console.log(`   Lines: ${entry.lines.length}`)
      
      entry.lines.forEach((line, lineIdx) => {
        console.log(`     ${lineIdx + 1}. ${line.account.name}: $${line.debitAmount} Dr | $${line.creditAmount} Cr`)
      })
    })
    
    // Step 4: Analyze journal entry reversals
    console.log('\n=== Step 4: Journal Entry Reversal Analysis ===')
    
    if (originalJournalEntries.length > 0 && voidJournalEntries.length > 0) {
      // Calculate totals for key accounts
      const originalAR = originalJournalEntries.flatMap(je => je.lines.filter(line => 
        line.account.name.toLowerCase().includes('receivable')
      )).reduce((sum, line) => sum + Number(line.debitAmount || 0), 0)
      
      const voidAR = voidJournalEntries.flatMap(je => je.lines.filter(line => 
        line.account.name.toLowerCase().includes('receivable')
      )).reduce((sum, line) => sum + Number(line.creditAmount || 0), 0)
      
      const originalRevenue = originalJournalEntries.flatMap(je => je.lines.filter(line => 
        line.account.name.toLowerCase().includes('revenue')
      )).reduce((sum, line) => sum + Number(line.creditAmount || 0), 0)
      
      const voidRevenue = voidJournalEntries.flatMap(je => je.lines.filter(line => 
        line.account.name.toLowerCase().includes('revenue')
      )).reduce((sum, line) => sum + Number(line.debitAmount || 0), 0)
      
      const originalCOGS = originalJournalEntries.flatMap(je => je.lines.filter(line => 
        line.account.name.toLowerCase().includes('cost of goods sold')
      )).reduce((sum, line) => sum + Number(line.debitAmount || 0), 0)
      
      const voidCOGS = voidJournalEntries.flatMap(je => je.lines.filter(line => 
        line.account.name.toLowerCase().includes('cost of goods sold')
      )).reduce((sum, line) => sum + Number(line.creditAmount || 0), 0)
      
      const originalInventory = originalJournalEntries.flatMap(je => je.lines.filter(line => 
        line.account.name.toLowerCase().includes('inventory')
      )).reduce((sum, line) => sum + Number(line.creditAmount || 0), 0)
      
      const voidInventory = voidJournalEntries.flatMap(je => je.lines.filter(line => 
        line.account.name.toLowerCase().includes('inventory')
      )).reduce((sum, line) => sum + Number(line.debitAmount || 0), 0)
      
      console.log('📊 Account Reversal Analysis:')
      console.log(`   Accounts Receivable: Original $${originalAR} vs Void $${voidAR} (${Math.abs(originalAR - voidAR) < 0.01 ? '✅ Match' : '❌ Mismatch'})`)
      console.log(`   Sales Revenue: Original $${originalRevenue} vs Void $${voidRevenue} (${Math.abs(originalRevenue - voidRevenue) < 0.01 ? '✅ Match' : '❌ Mismatch'})`)
      console.log(`   COGS: Original $${originalCOGS} vs Void $${voidCOGS} (${Math.abs(originalCOGS - voidCOGS) < 0.01 ? '✅ Match' : '❌ Mismatch'})`)
      console.log(`   Inventory: Original $${originalInventory} vs Void $${voidInventory} (${Math.abs(originalInventory - voidInventory) < 0.01 ? '✅ Match' : '❌ Mismatch'})`)
    }
    
    // Step 5: Check inventory movements
    console.log('\n=== Step 5: Inventory Movements Analysis ===')
    
    const originalMovements = await prisma.inventoryMovement.findMany({
      where: {
        reference: {
          in: [originalInvoiceNumber, `INV-${originalInvoiceNumber}`]
        }
      },
      include: { product: true },
      orderBy: { movementDate: 'asc' }
    })
    
    const voidMovements = await prisma.inventoryMovement.findMany({
      where: {
        reference: voidInvoiceNumber
      },
      include: { product: true },
      orderBy: { movementDate: 'asc' }
    })
    
    console.log(`Original Inventory Movements: ${originalMovements.length}`)
    originalMovements.forEach((mov, idx) => {
      console.log(`   ${idx + 1}. ${mov.product?.name || 'Unknown'}: ${mov.quantity} units (${mov.movementType})`)
      console.log(`      Reference: ${mov.reference}`)
      console.log(`      Date: ${mov.movementDate}`)
    })
    
    console.log(`\nVoid Inventory Movements: ${voidMovements.length}`)
    voidMovements.forEach((mov, idx) => {
      console.log(`   ${idx + 1}. ${mov.product?.name || 'Unknown'}: ${mov.quantity} units (${mov.movementType})`)
      console.log(`      Reference: ${mov.reference}`)
      console.log(`      Date: ${mov.movementDate}`)
    })
    
    // Step 6: Check current stock levels
    console.log('\n=== Step 6: Current Stock Level Analysis ===')
    
    const affectedProducts = new Set()
    originalMovements.forEach(mov => {
      if (mov.productId) affectedProducts.add(mov.productId)
    })
    voidMovements.forEach(mov => {
      if (mov.productId) affectedProducts.add(mov.productId)
    })
    
    console.log(`Affected Products: ${affectedProducts.size}`)
    
    for (const productId of affectedProducts) {
      const product = await prisma.product.findUnique({
        where: { id: productId }
      })
      
      if (product) {
        console.log(`\n📦 ${product.name} (ID: ${product.id})`)
        console.log(`   Current Stock: ${product.stockQuantity || 0} units`)
        console.log(`   Product Type: ${product.type}`)
        
        // Calculate movements for this product
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
        }
        
        // Check if void movement exists
        if (originalTotal !== 0 && voidTotal === 0) {
          console.log(`   🚨 CRITICAL ISSUE: Original movement exists but NO void movement found!`)
          console.log(`   This means ${Math.abs(originalTotal)} units were removed from stock but NOT restored when voided.`)
        }
      }
    }
    
    // Step 7: Summary and recommendations
    console.log('\n🎯 === SUMMARY & RECOMMENDATIONS ===')
    
    const hasOriginalMovements = originalMovements.length > 0
    const hasVoidMovements = voidMovements.length > 0
    const hasOriginalJournal = originalJournalEntries.length > 0
    const hasVoidJournal = voidJournalEntries.length > 0
    
    console.log(`📋 Status Check:`)
    console.log(`   - Original Invoice: ✅ Found`)
    console.log(`   - Original Journal Entries: ${hasOriginalJournal ? '✅ Found' : '❌ Missing'}`)
    console.log(`   - Void Journal Entries: ${hasVoidJournal ? '✅ Found' : '❌ Missing'}`)
    console.log(`   - Original Inventory Movements: ${hasOriginalMovements ? '✅ Found' : '❌ Missing'}`)
    console.log(`   - Void Inventory Movements: ${hasVoidMovements ? '✅ Found' : '❌ Missing'}`)
    
    if (hasOriginalMovements && !hasVoidMovements) {
      console.log(`\n🚨 CRITICAL INVENTORY ISSUE DETECTED:`)
      console.log(`   The original invoice created inventory movements but the void process did NOT create reversing movements.`)
      console.log(`   This means stock quantities were reduced but NOT restored when the invoice was voided.`)
      console.log(`   \n💡 RECOMMENDATION: Create void inventory movements to restore the stock.`)
    } else if (hasOriginalMovements && hasVoidMovements) {
      console.log(`\n✅ INVENTORY PROPERLY VOIDED: Both original and void movements exist.`)
    } else if (!hasOriginalMovements) {
      console.log(`\n⚠️  No original movements found - this invoice may not have affected inventory.`)
    }
    
    // Check if there are any products with negative stock
    const allProducts = await prisma.product.findMany({
      where: { type: 'inventory' }
    })
    
    const negativeStockProducts = allProducts.filter(p => Number(p.stockQuantity || 0) < 0)
    if (negativeStockProducts.length > 0) {
      console.log(`\n🚨 Products with Negative Stock:`)
      negativeStockProducts.forEach(product => {
        console.log(`   ${product.name}: ${product.stockQuantity} units`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error analyzing void invoice:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the analysis
analyzeSpecificVoidInvoice()
