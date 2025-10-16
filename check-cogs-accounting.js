import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCOGSAccounting() {
  try {
    console.log('🔍 Checking COGS Accounting for Invoice INV-POS-1759910781728\n')
    
    // Find the specific invoice
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: 'INV-POS-1759910781728' },
      include: { 
        lines: { 
          include: { product: true } 
        } 
      }
    })
    
    if (!invoice) {
      console.log('❌ Invoice INV-POS-1759910781728 not found')
      return
    }
    
    console.log(`📋 Invoice: ${invoice.invoiceNumber}`)
    console.log(`📅 Status: ${invoice.status}`)
    console.log(`💰 Total: $${invoice.totalAmount}`)
    console.log(`📦 Lines: ${invoice.lines.length}\n`)
    
    // Show invoice lines with cost info
    console.log('=== Invoice Lines & Cost Info ===')
    let totalExpectedCOGS = 0
    invoice.lines.forEach((line, idx) => {
      const qty = Number(line.quantity)
      const costPrice = Number(line.product?.costPrice || 0)
      const lineCOGS = qty * costPrice
      totalExpectedCOGS += lineCOGS
      
      console.log(`${idx + 1}. ${line.description}`)
      console.log(`   - ProductId: ${line.productId}`)
      console.log(`   - Product Type: ${line.product?.type}`)
      console.log(`   - Quantity: ${qty}`)
      console.log(`   - Unit Price: $${line.unitPrice}`)
      console.log(`   - Cost Price: $${costPrice}`)
      console.log(`   - Line COGS: $${lineCOGS}`)
      console.log('')
    })
    
    console.log(`💵 Total Expected COGS: $${totalExpectedCOGS}\n`)
    
    // Check journal entries for this invoice
    console.log('=== Journal Entries Analysis ===')
    const journalEntries = await prisma.journalEntry.findMany({
      where: { reference: invoice.invoiceNumber },
      include: { 
        lines: { 
          include: { account: true } 
        } 
      }
    })
    
    if (journalEntries.length === 0) {
      console.log('❌ No journal entries found for this invoice!')
      console.log('💡 This means the invoice was not properly POSTED to create accounting entries')
    } else {
      journalEntries.forEach((entry, idx) => {
        console.log(`📊 Journal Entry ${idx + 1}: ${entry.memo}`)
        console.log(`   Status: ${entry.status}`)
        console.log(`   Date: ${entry.date}`)
        console.log(`   Reference: ${entry.reference}`)
        console.log(`   Lines: ${entry.lines.length}`)
        
        let cogsFound = false
        let inventoryFound = false
        let cogsAmount = 0
        let inventoryAmount = 0
        
        entry.lines.forEach(line => {
          const accountName = line.account?.name || 'Unknown'
          const accountType = line.account?.type || 'Unknown'
          
          console.log(`   - ${accountName} (${accountType}): Dr $${line.debit} | Cr $${line.credit} (${line.memo})`)
          
          // Check for COGS entries
          if (accountName.toLowerCase().includes('cogs') || accountName.toLowerCase().includes('cost of goods') || line.memo?.toLowerCase().includes('cogs')) {
            cogsFound = true
            cogsAmount = Number(line.debit) // COGS should be debited
          }
          
          // Check for Inventory entries  
          if (accountName.toLowerCase().includes('inventory') || line.memo?.toLowerCase().includes('inventory')) {
            inventoryFound = true
            inventoryAmount = Number(line.credit) // Inventory should be credited
          }
        })
        
        console.log('')
        console.log(`   🔍 COGS Entry Found: ${cogsFound ? '✅' : '❌'} ${cogsFound ? `($${cogsAmount})` : ''}`)
        console.log(`   🔍 Inventory Credit Found: ${inventoryFound ? '✅' : '❌'} ${inventoryFound ? `($${inventoryAmount})` : ''}`)
        
        if (cogsFound && inventoryFound) {
          console.log(`   ✅ COGS Accounting Complete: Dr COGS $${cogsAmount}, Cr Inventory $${inventoryAmount}`)
        } else {
          console.log(`   ❌ COGS Accounting Missing!`)
        }
        console.log('')
      })
    }
    
    // Check inventory movements
    console.log('=== Inventory Movements ===')
    const movements = await prisma.inventoryMovement.findMany({
      where: { reference: invoice.invoiceNumber },
      include: { product: true }
    })
    
    if (movements.length === 0) {
      console.log('❌ No inventory movements found!')
    } else {
      console.log(`✅ Found ${movements.length} inventory movements:`)
      movements.forEach((mov, idx) => {
        console.log(`${idx + 1}. ${mov.product?.name}`)
        console.log(`   - Movement Type: ${mov.movementType}`)
        console.log(`   - Quantity: ${mov.quantity}`)
        console.log(`   - Unit Cost: $${mov.unitCost || 'Not set'}`)
        console.log(`   - Date: ${mov.movementDate}`)
        console.log(`   - Reference: ${mov.reference}`)
        console.log('')
      })
    }
    
    // Check if accounts exist
    console.log('=== Account Configuration Check ===')
    const company = await prisma.company.findFirst({ where: { id: invoice.companyId } })
    if (company) {
      const accounts = await prisma.account.findMany({
        where: { 
          tenantId: company.tenantId,
          companyId: company.id,
          OR: [
            { purpose: 'COGS' },
            { purpose: 'INVENTORY' },
            { name: { contains: 'Cost of Goods', mode: 'insensitive' } },
            { name: { contains: 'Inventory', mode: 'insensitive' } }
          ]
        }
      })
      
      console.log(`📊 Relevant Accounts Found: ${accounts.length}`)
      accounts.forEach(acc => {
        console.log(`   - ${acc.name} (${acc.type}) - Purpose: ${acc.purpose || 'Not set'}`)
      })
      
      if (accounts.length === 0) {
        console.log('❌ No COGS or Inventory accounts found!')
        console.log('💡 This explains why COGS entries are not being created')
      }
    }
    
    console.log('\n=== Summary & Recommendations ===')
    if (journalEntries.length === 0) {
      console.log('🔧 Issue: Invoice not posted - no journal entries created')
      console.log('💡 Solution: POST the invoice to trigger accounting entries')
    } else {
      const hasCogsEntries = journalEntries.some(entry => 
        entry.lines.some(line => 
          line.account?.name?.toLowerCase().includes('cogs') || 
          line.memo?.toLowerCase().includes('cogs')
        )
      )
      
      if (!hasCogsEntries) {
        console.log('🔧 Issue: COGS entries missing from journal entries')
        console.log('💡 Solution: Check account configuration and posting logic')
      } else {
        console.log('✅ COGS entries appear to be present in journal entries')
      }
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
  }
}

checkCOGSAccounting()