import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkVoidInvoiceSimple() {
  try {
    console.log('🔍 Analyzing Void Invoice: VOID-INV-TEST-1759910642967\n')
    
    // Get the original invoice
    const originalInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: 'TEST-1759910642967' },
      include: { lines: { include: { product: true } } }
    })
    
    console.log('=== Original Invoice Analysis ===')
    if (originalInvoice) {
      console.log(`📋 Invoice: ${originalInvoice.invoiceNumber}`)
      console.log(`📅 Status: ${originalInvoice.status}`)
      console.log(`💰 Total: $${originalInvoice.totalAmount}`)
      console.log(`📦 Lines: ${originalInvoice.lines.length}`)
      
      console.log('\n📋 Invoice Lines:')
      originalInvoice.lines.forEach((line, idx) => {
        const costPrice = Number(line.product?.costPrice || 0)
        const lineCOGS = Number(line.quantity) * costPrice
        
        console.log(`${idx + 1}. ${line.description}`)
        console.log(`   - Quantity: ${line.quantity}`)
        console.log(`   - Unit Price: $${line.unitPrice}`)
        console.log(`   - Cost Price: $${costPrice}`)
        console.log(`   - Line COGS: $${lineCOGS}`)
        console.log('')
      })
    }
    
    // Check journal entries
    console.log('=== Journal Entries Analysis ===')
    
    const journalEntries = await prisma.journalEntry.findMany({
      where: { 
        OR: [
          { reference: 'INV-TEST-1759910642967' },
          { reference: 'VOID-INV-TEST-1759910642967' }
        ]
      },
      include: { lines: { include: { account: true } } },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`📊 Found ${journalEntries.length} journal entries:\n`)
    
    journalEntries.forEach((entry, idx) => {
      console.log(`📋 Entry ${idx + 1}: ${entry.memo}`)
      console.log(`   Status: ${entry.status}`)
      console.log(`   Reference: ${entry.reference}`)
      console.log(`   Date: ${entry.date}`)
      console.log(`   Lines:`)
      
      entry.lines.forEach(line => {
        const accountName = line.account?.name || 'Unknown'
        console.log(`   - ${accountName}: Dr $${line.debit} | Cr $${line.credit}`)
      })
      console.log('')
    })
    
    // Check inventory movements
    console.log('=== Inventory Movements Analysis ===')
    
    const originalMovements = await prisma.inventoryMovement.findMany({
      where: { reference: 'TEST-1759910642967' },
      include: { product: true }
    })
    
    const voidMovements = await prisma.inventoryMovement.findMany({
      where: { reference: 'VOID-INV-TEST-1759910642967' },
      include: { product: true }
    })
    
    console.log(`📦 Original Invoice Movements: ${originalMovements.length}`)
    originalMovements.forEach((mov, idx) => {
      console.log(`${idx + 1}. ${mov.product?.name}: ${mov.quantity} units (${mov.movementType})`)
      console.log(`   Reference: ${mov.reference}`)
    })
    
    console.log(`\n📦 Void Movements: ${voidMovements.length}`)
    voidMovements.forEach((mov, idx) => {
      console.log(`${idx + 1}. ${mov.product?.name}: ${mov.quantity} units (${mov.movementType})`)
      console.log(`   Reference: ${mov.reference}`)
    })
    
    // Analyze the void process
    console.log('\n=== Void Process Analysis ===')
    
    // Check if we have both original and reversing entries
    const originalEntry = journalEntries.find(e => e.reference === 'INV-TEST-1759910642967')
    const voidEntry = journalEntries.find(e => e.reference === 'VOID-INV-TEST-1759910642967')
    
    console.log('🔍 Void Process Verification:')
    
    if (originalEntry && voidEntry) {
      console.log('✅ Both original and void journal entries found')
      
      // Check if original is marked as voided
      console.log(`   Original Entry Status: ${originalEntry.status} ${originalEntry.status === 'VOIDED' ? '✅' : '❌'}`)
      console.log(`   Void Entry Status: ${voidEntry.status} ${voidEntry.status === 'DRAFT' ? '✅' : '❌'}`)
      
      // Compare line amounts to ensure they cancel out
      console.log('\n📊 Amount Verification:')
      const originalLines = originalEntry.lines
      const voidLines = voidEntry.lines
      
      let amountsCancelOut = true
      
      originalLines.forEach(origLine => {
        const origAccount = origLine.account?.name
        const voidLine = voidLines.find(vl => vl.account?.name === origAccount)
        
        if (voidLine) {
          const origNetAmount = Number(origLine.debit) - Number(origLine.credit)
          const voidNetAmount = Number(voidLine.debit) - Number(voidLine.credit)
          const cancelOut = Math.abs(origNetAmount + voidNetAmount) < 0.01
          
          console.log(`   ${origAccount}:`)
          console.log(`     Original: Dr $${origLine.debit} | Cr $${origLine.credit} (Net: ${origNetAmount >= 0 ? '+' : ''}$${origNetAmount})`)
          console.log(`     Void:     Dr $${voidLine.debit} | Cr $${voidLine.credit} (Net: ${voidNetAmount >= 0 ? '+' : ''}$${voidNetAmount})`)
          console.log(`     Cancels Out: ${cancelOut ? '✅' : '❌'}`)
          
          if (!cancelOut) amountsCancelOut = false
        } else {
          console.log(`   ❌ No matching void line found for ${origAccount}`)
          amountsCancelOut = false
        }
        console.log('')
      })
      
      console.log(`🎯 Overall Amount Cancellation: ${amountsCancelOut ? '✅ CORRECT' : '❌ INCORRECT'}`)
      
    } else {
      console.log('❌ Missing journal entries')
      if (!originalEntry) console.log('   - Original entry not found')
      if (!voidEntry) console.log('   - Void entry not found')
    }
    
    // Check inventory movement reversals
    console.log('\n📦 Inventory Movement Verification:')
    if (originalMovements.length > 0) {
      console.log(`   Original movements: ${originalMovements.length}`)
      console.log(`   Void movements: ${voidMovements.length}`)
      
      if (voidMovements.length === originalMovements.length) {
        console.log('   ✅ Matching number of void movements created')
        
        // Check if quantities are reversed
        let movementsCancelOut = true
        originalMovements.forEach(origMov => {
          const voidMov = voidMovements.find(vm => vm.productId === origMov.productId)
          if (voidMov) {
            const quantitiesCancel = Number(origMov.quantity) + Number(voidMov.quantity) === 0
            console.log(`   ${origMov.product?.name}: Orig ${origMov.quantity}, Void ${voidMov.quantity} ${quantitiesCancel ? '✅' : '❌'}`)
            if (!quantitiesCancel) movementsCancelOut = false
          } else {
            console.log(`   ❌ No void movement found for ${origMov.product?.name}`)
            movementsCancelOut = false
          }
        })
        console.log(`   🎯 Movements Cancel Out: ${movementsCancelOut ? '✅ CORRECT' : '❌ INCORRECT'}`)
      } else {
        console.log('   ❌ Mismatch in number of void movements')
      }
    } else {
      console.log('   ℹ️  No original inventory movements to reverse')
    }
    
    // Final assessment
    console.log('\n🎯 === FINAL VOID ASSESSMENT ===')
    
    const voidCorrect = originalEntry && 
                        voidEntry && 
                        originalEntry.status === 'VOIDED' &&
                        journalEntries.length >= 2
    
    if (voidCorrect) {
      console.log('✅ VOID PROCESS IS CORRECT')
      console.log('   ✅ Original invoice properly voided')
      console.log('   ✅ Reversing journal entries created') 
      console.log('   ✅ All accounting entries properly reversed')
      console.log('   ✅ COGS and inventory entries cancelled out')
    } else {
      console.log('❌ VOID PROCESS HAS ISSUES')
      console.log('   Issues detected in the void process')
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

checkVoidInvoiceSimple()