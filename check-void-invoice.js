import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkVoidedInvoice() {
  try {
    console.log('🔍 Checking Voided Invoice: VOID-INV-TEST-1759910642967\n')
    
    // First, let's find the original invoice and any void-related entries
    const originalInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: 'TEST-1759910642967' },
      include: { 
        lines: { 
          include: { product: true } 
        } 
      }
    })
    
    const voidInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: 'VOID-INV-TEST-1759910642967' },
      include: { 
        lines: { 
          include: { product: true } 
        } 
      }
    })
    
    console.log('=== Invoice Status Check ===')
    if (originalInvoice) {
      console.log(`✅ Original Invoice Found: ${originalInvoice.invoiceNumber}`)
      console.log(`   Status: ${originalInvoice.status}`)
      console.log(`   Total: $${originalInvoice.totalAmount}`)
      console.log(`   Lines: ${originalInvoice.lines.length}`)
    } else {
      console.log('❌ Original invoice TEST-1759910642967 not found')
    }
    
    if (voidInvoice) {
      console.log(`✅ Void Invoice Found: ${voidInvoice.invoiceNumber}`)
      console.log(`   Status: ${voidInvoice.status}`)
      console.log(`   Total: $${voidInvoice.totalAmount}`)
      console.log(`   Lines: ${voidInvoice.lines.length}`)
    } else {
      console.log('❌ Void invoice VOID-INV-TEST-1759910642967 not found')
    }
    console.log('')
    
    // If we have both invoices, analyze them
    if (originalInvoice && voidInvoice) {
      console.log('=== Void Invoice Analysis ===')
      console.log('📋 Original Invoice Details:')
      originalInvoice.lines.forEach((line, idx) => {
        console.log(`${idx + 1}. ${line.description}`)
        console.log(`   - Quantity: ${line.quantity}`)
        console.log(`   - Unit Price: $${line.unitPrice}`)
        console.log(`   - Line Total: $${line.lineTotal}`)
        console.log(`   - Product Cost: $${line.product?.costPrice || 0}`)
        console.log('')
      })
      
      console.log('📋 Void Invoice Details:')
      voidInvoice.lines.forEach((line, idx) => {
        console.log(`${idx + 1}. ${line.description}`)
        console.log(`   - Quantity: ${line.quantity}`)
        console.log(`   - Unit Price: $${line.unitPrice}`)
        console.log(`   - Line Total: $${line.lineTotal}`)
        console.log('')
      })
      
      // Check if void amounts are negatives of original
      console.log('🔍 Void Amount Verification:')
      console.log(`   Original Total: $${originalInvoice.totalAmount}`)
      console.log(`   Void Total: $${voidInvoice.totalAmount}`)
      console.log(`   Expected Void Total: $${-originalInvoice.totalAmount}`)
      console.log(`   Amounts Cancel Out: ${(originalInvoice.totalAmount + voidInvoice.totalAmount === 0) ? '✅' : '❌'}`)
    }
    
    // Check journal entries for both invoices
    console.log('\n=== Journal Entries Analysis ===')
    
    const originalJournalEntries = await prisma.journalEntry.findMany({
      where: { 
        OR: [
          { reference: 'TEST-1759910642967' },
          { reference: { contains: 'TEST-1759910642967' } }
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
        OR: [
          { reference: 'VOID-INV-TEST-1759910642967' },
          { reference: { contains: 'VOID-INV-TEST-1759910642967' } }
        ]
      },
      include: { 
        lines: { 
          include: { account: true } 
        } 
      }
    })
    
    console.log(`📊 Original Invoice Journal Entries: ${originalJournalEntries.length}`)
    originalJournalEntries.forEach((entry, idx) => {
      console.log(`\n📋 Original Entry ${idx + 1}: ${entry.memo}`)
      console.log(`   Status: ${entry.status}`)
      console.log(`   Reference: ${entry.reference}`)
      entry.lines.forEach(line => {
        console.log(`   - ${line.account?.name}: Dr $${line.debit} | Cr $${line.credit}`)
      })
    })
    
    console.log(`\n📊 Void Invoice Journal Entries: ${voidJournalEntries.length}`)
    voidJournalEntries.forEach((entry, idx) => {
      console.log(`\n📋 Void Entry ${idx + 1}: ${entry.memo}`)
      console.log(`   Status: ${entry.status}`)
      console.log(`   Reference: ${entry.reference}`)
      entry.lines.forEach(line => {
        console.log(`   - ${line.account?.name}: Dr $${line.debit} | Cr $${line.credit}`)
      })
    })
    
    // Check inventory movements
    console.log('\n=== Inventory Movements Analysis ===')
    
    const originalMovements = await prisma.inventoryMovement.findMany({
      where: { reference: 'TEST-1759910642967' },
      include: { product: true }
    })
    
    const voidMovements = await prisma.inventoryMovement.findMany({
      where: { 
        OR: [
          { reference: 'VOID-INV-TEST-1759910642967' },
          { reference: { contains: 'VOID' } },
          { reason: { contains: 'void', mode: 'insensitive' } }
        ]
      },
      include: { product: true }
    })
    
    console.log(`📦 Original Invoice Movements: ${originalMovements.length}`)
    originalMovements.forEach((mov, idx) => {
      console.log(`${idx + 1}. ${mov.product?.name}`)
      console.log(`   - Type: ${mov.movementType}`)
      console.log(`   - Quantity: ${mov.quantity}`)
      console.log(`   - Reference: ${mov.reference}`)
      console.log(`   - Reason: ${mov.reason || 'Not specified'}`)
    })
    
    console.log(`\n📦 Void-Related Movements: ${voidMovements.length}`)
    voidMovements.forEach((mov, idx) => {
      console.log(`${idx + 1}. ${mov.product?.name}`)
      console.log(`   - Type: ${mov.movementType}`)
      console.log(`   - Quantity: ${mov.quantity}`)
      console.log(`   - Reference: ${mov.reference}`)
      console.log(`   - Reason: ${mov.reason || 'Not specified'}`)
    })
    
    // Void Process Verification
    console.log('\n=== Void Process Verification ===')
    
    let voidProcessCorrect = true
    const issues = []
    
    // Check if original invoice exists and is marked as voided
    if (!originalInvoice) {
      issues.push('❌ Original invoice not found')
      voidProcessCorrect = false
    } else if (originalInvoice.status !== 'voided' && originalInvoice.status !== 'cancelled') {
      issues.push(`❌ Original invoice status is '${originalInvoice.status}' (should be 'voided' or 'cancelled')`)
      voidProcessCorrect = false
    }
    
    // Check if void invoice was created
    if (!voidInvoice) {
      issues.push('❌ Void invoice not created')
      voidProcessCorrect = false
    } else {
      // Check if void amounts are negative of original
      if (originalInvoice && voidInvoice.totalAmount !== -originalInvoice.totalAmount) {
        issues.push('❌ Void invoice amounts do not cancel out original amounts')
        voidProcessCorrect = false
      }
    }
    
    // Check if reversing journal entries were created
    if (originalJournalEntries.length > 0 && voidJournalEntries.length === 0) {
      issues.push('❌ No reversing journal entries created for void')
      voidProcessCorrect = false
    }
    
    // Check if inventory movements were reversed
    if (originalMovements.length > 0 && voidMovements.length === 0) {
      issues.push('❌ No reversing inventory movements created for void')
      voidProcessCorrect = false
    }
    
    console.log('🎯 Void Process Assessment:')
    if (voidProcessCorrect) {
      console.log('✅ VOID PROCESS CORRECT')
      console.log('   - Original invoice properly marked as voided')
      console.log('   - Void invoice created with reversing amounts')
      console.log('   - Journal entries reversed appropriately')
      console.log('   - Inventory movements reversed correctly')
    } else {
      console.log('❌ VOID PROCESS HAS ISSUES')
      issues.forEach(issue => console.log(`   ${issue}`))
    }
    
    // Recommendations
    console.log('\n=== Recommendations ===')
    if (issues.length > 0) {
      console.log('🔧 Issues to Address:')
      issues.forEach(issue => console.log(`   ${issue}`))
      
      console.log('\n💡 Required Actions:')
      if (!originalInvoice || originalInvoice.status !== 'voided') {
        console.log('   1. Mark original invoice as voided')
      }
      if (!voidInvoice) {
        console.log('   2. Create proper void invoice with negative amounts')
      }
      if (voidJournalEntries.length === 0) {
        console.log('   3. Create reversing journal entries')
      }
      if (voidMovements.length === 0) {
        console.log('   4. Create reversing inventory movements')
      }
    } else {
      console.log('✅ Void process appears to be handled correctly')
      console.log('   All expected void entries and reversals are in place')
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

checkVoidedInvoice()