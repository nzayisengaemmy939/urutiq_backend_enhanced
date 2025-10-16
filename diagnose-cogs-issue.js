import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findRecentInvoicesAndCheckCOGS() {
  try {
    console.log('🔍 Finding Recent Invoices and Checking COGS Accounting\n')
    
    // Find recent invoices
    const recentInvoices = await prisma.invoice.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { 
        lines: { 
          include: { product: true } 
        } 
      }
    })
    
    console.log('=== Recent Invoices ===')
    recentInvoices.forEach((inv, idx) => {
      console.log(`${idx + 1}. ${inv.invoiceNumber} - $${inv.totalAmount} - ${inv.status} - ${inv.lines.length} lines`)
    })
    console.log('')
    
    // Check the most recent invoice for COGS
    if (recentInvoices.length === 0) {
      console.log('❌ No invoices found')
      return
    }
    
    const latestInvoice = recentInvoices[0]
    console.log(`🎯 Analyzing Latest Invoice: ${latestInvoice.invoiceNumber}\n`)
    
    console.log(`📋 Invoice: ${latestInvoice.invoiceNumber}`)
    console.log(`📅 Status: ${latestInvoice.status}`)
    console.log(`💰 Total: $${latestInvoice.totalAmount}`)
    console.log(`📦 Lines: ${latestInvoice.lines.length}\n`)
    
    // Show invoice lines with cost info
    console.log('=== Invoice Lines & Cost Analysis ===')
    let totalExpectedCOGS = 0
    let hasProductsWithCost = false
    
    latestInvoice.lines.forEach((line, idx) => {
      const qty = Number(line.quantity)
      const costPrice = Number(line.product?.costPrice || 0)
      const lineCOGS = qty * costPrice
      totalExpectedCOGS += lineCOGS
      
      if (costPrice > 0) hasProductsWithCost = true
      
      console.log(`${idx + 1}. ${line.description}`)
      console.log(`   - ProductId: ${line.productId}`)
      console.log(`   - Product Type: ${line.product?.type}`)
      console.log(`   - Quantity: ${qty}`)
      console.log(`   - Unit Price: $${line.unitPrice}`)
      console.log(`   - Cost Price: $${costPrice}`)
      console.log(`   - Line COGS: $${lineCOGS}`)
      console.log('')
    })
    
    console.log(`💵 Total Expected COGS: $${totalExpectedCOGS}`)
    console.log(`📊 Has Products with Cost: ${hasProductsWithCost ? '✅' : '❌'}\n`)
    
    // Check journal entries for this invoice
    console.log('=== Journal Entries Analysis ===')
    const journalEntries = await prisma.journalEntry.findMany({
      where: { 
        OR: [
          { reference: latestInvoice.invoiceNumber },
          { reference: { contains: latestInvoice.invoiceNumber } }
        ]
      },
      include: { 
        lines: { 
          include: { account: true } 
        } 
      }
    })
    
    if (journalEntries.length === 0) {
      console.log('❌ No journal entries found for this invoice!')
      console.log('💡 This means the invoice was not properly POSTED')
      console.log('🔧 Issue: Invoice needs to be posted to create COGS entries')
    } else {
      console.log(`📊 Found ${journalEntries.length} journal entries:`)
      
      journalEntries.forEach((entry, idx) => {
        console.log(`\n📋 Entry ${idx + 1}: ${entry.memo}`)
        console.log(`   Status: ${entry.status}`)
        console.log(`   Date: ${entry.date}`)
        console.log(`   Reference: ${entry.reference}`)
        
        let cogsEntries = []
        let inventoryEntries = []
        let arEntries = []
        let revenueEntries = []
        
        entry.lines.forEach(line => {
          const accountName = line.account?.name || 'Unknown'
          const accountPurpose = line.account?.purpose || ''
          const debit = Number(line.debit)
          const credit = Number(line.credit)
          
          console.log(`   - ${accountName}: Dr $${debit} | Cr $${credit} (${line.memo || 'No memo'})`)
          
          // Categorize entries
          if (accountPurpose === 'COGS' || accountName.toLowerCase().includes('cost') || line.memo?.toLowerCase().includes('cogs')) {
            cogsEntries.push({ account: accountName, debit, credit })
          }
          if (accountPurpose === 'INVENTORY' || accountName.toLowerCase().includes('inventory')) {
            inventoryEntries.push({ account: accountName, debit, credit })
          }
          if (accountPurpose === 'AR' || accountName.toLowerCase().includes('receivable')) {
            arEntries.push({ account: accountName, debit, credit })
          }
          if (accountPurpose === 'REVENUE' || accountName.toLowerCase().includes('revenue') || accountName.toLowerCase().includes('sales')) {
            revenueEntries.push({ account: accountName, debit, credit })
          }
        })
        
        console.log(`\n   📊 Entry Analysis:`)
        console.log(`   - AR Entries: ${arEntries.length} ${arEntries.length > 0 ? '✅' : '❌'}`)
        console.log(`   - Revenue Entries: ${revenueEntries.length} ${revenueEntries.length > 0 ? '✅' : '❌'}`)
        console.log(`   - COGS Entries: ${cogsEntries.length} ${cogsEntries.length > 0 ? '✅' : '❌'}`)
        console.log(`   - Inventory Entries: ${inventoryEntries.length} ${inventoryEntries.length > 0 ? '✅' : '❌'}`)
        
        if (cogsEntries.length === 0 && hasProductsWithCost) {
          console.log(`   🚨 MISSING: COGS entries expected but not found!`)
        }
        if (inventoryEntries.length === 0 && hasProductsWithCost) {
          console.log(`   🚨 MISSING: Inventory credit entries expected but not found!`)
        }
      })
    }
    
    // Check account setup
    console.log('\n=== Account Configuration ===')
    const company = await prisma.company.findFirst({ where: { id: latestInvoice.companyId } })
    if (company) {
      const accounts = await prisma.account.findMany({
        where: { 
          tenantId: company.tenantId,
          companyId: company.id
        }
      })
      
      const cogsAccounts = accounts.filter(acc => acc.purpose === 'COGS' || acc.name.toLowerCase().includes('cost'))
      const inventoryAccounts = accounts.filter(acc => acc.purpose === 'INVENTORY' || acc.name.toLowerCase().includes('inventory'))
      
      console.log(`💼 Total Accounts: ${accounts.length}`)
      console.log(`🏷️  COGS Accounts: ${cogsAccounts.length}`)
      cogsAccounts.forEach(acc => console.log(`   - ${acc.name} (${acc.purpose})`))
      
      console.log(`📦 Inventory Accounts: ${inventoryAccounts.length}`)
      inventoryAccounts.forEach(acc => console.log(`   - ${acc.name} (${acc.purpose})`))
      
      if (cogsAccounts.length === 0) {
        console.log('❌ No COGS accounts configured!')
      }
      if (inventoryAccounts.length === 0) {
        console.log('❌ No Inventory accounts configured!')
      }
    }
    
    console.log('\n=== COGS Issue Diagnosis ===')
    if (journalEntries.length === 0) {
      console.log('🔧 PRIMARY ISSUE: Invoice not posted - no accounting entries created')
      console.log('💡 SOLUTION: POST the invoice to trigger all accounting entries including COGS')
    } else {
      const hasCogsInEntries = journalEntries.some(entry => 
        entry.lines.some(line => 
          line.account?.purpose === 'COGS' || 
          line.account?.name?.toLowerCase().includes('cost') ||
          line.memo?.toLowerCase().includes('cogs')
        )
      )
      
      if (!hasCogsInEntries && hasProductsWithCost) {
        console.log('🔧 ISSUE: COGS entries missing despite products having cost prices')
        console.log('💡 POSSIBLE CAUSES:')
        console.log('   1. Missing COGS account configuration')  
        console.log('   2. Bug in COGS calculation logic')
        console.log('   3. Products not properly flagged as inventory')
      } else if (hasCogsInEntries) {
        console.log('✅ COGS entries appear to be created correctly')
      } else {
        console.log('ℹ️  No COGS expected - products have zero cost price')
      }
    }
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
  }
}

findRecentInvoicesAndCheckCOGS()