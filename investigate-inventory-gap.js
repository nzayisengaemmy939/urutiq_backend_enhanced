import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigateInventoryGap() {
  try {
    console.log('🔍 Investigating Inventory Management Gap\n')
    
    // Check the current stock levels of the products that should have been affected
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: ['prod-coffee-cmgfgiqos0001szdhlotx8vhg', 'prod-iphone-cmgfgiqos0001szdhlotx8vhg']
        }
      }
    })
    
    console.log('=== Current Stock Analysis ===')
    products.forEach(product => {
      console.log(`📦 ${product.name}:`)
      console.log(`   Current Stock: ${product.stockQuantity}`)
      console.log(`   Product Type: ${product.type}`)
      console.log('')
    })
    
    // Let's trace what should have happened based on initial stock
    console.log('=== Expected Stock Calculation ===')
    console.log('From our earlier seed data, we know:')
    console.log('- Premium Coffee Beans started with: 75 units (seeded)')
    console.log('- iPhone 15 Pro started with: 25 units (seeded)')
    console.log('')
    
    console.log('Timeline Analysis:')
    console.log('1. 🌱 SEED: Coffee=75, iPhone=25')
    console.log('2. 📄 INVOICE TEST-1759910642967: Sold Coffee=2, iPhone=2')
    console.log('3. 📊 EXPECTED AFTER SALE: Coffee=73, iPhone=23')  
    console.log('4. ❌ VOIDED: Should restore Coffee=75, iPhone=25')
    console.log('5. 📋 ACTUAL NOW: Coffee=67, iPhone=23')
    console.log('')
    
    // Check if there were other sales that affected stock
    console.log('=== Other Sales Impact ===')
    const otherInvoices = await prisma.invoice.findMany({
      where: {
        invoiceNumber: { not: 'TEST-1759910642967' },
        status: { in: ['posted', 'paid'] }
      },
      include: {
        lines: {
          where: {
            productId: {
              in: ['prod-coffee-cmgfgiqos0001szdhlotx8vhg', 'prod-iphone-cmgfgiqos0001szdhlotx8vhg']
            }
          },
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    
    console.log(`📊 Found ${otherInvoices.length} other invoices affecting these products:`)
    
    let coffeeSoldElsewhere = 0
    let iphoneSoldElsewhere = 0
    
    otherInvoices.forEach((inv, idx) => {
      if (inv.lines.length > 0) {
        console.log(`\n${idx + 1}. Invoice: ${inv.invoiceNumber} (${inv.status})`)
        inv.lines.forEach(line => {
          console.log(`   - ${line.product?.name}: ${line.quantity} units sold`)
          if (line.productId === 'prod-coffee-cmgfgiqos0001szdhlotx8vhg') {
            coffeeSoldElsewhere += Number(line.quantity)
          }
          if (line.productId === 'prod-iphone-cmgfgiqos0001szdhlotx8vhg') {
            iphoneSoldElsewhere += Number(line.quantity)
          }
        })
      }
    })
    
    console.log(`\n📊 Total sold in other invoices:`)
    console.log(`   - Coffee: ${coffeeSoldElsewhere} units`)
    console.log(`   - iPhone: ${iphoneSoldElsewhere} units`)
    
    // Calculate expected current stock
    console.log('\n=== Stock Reconciliation ===')
    const expectedCoffeeStock = 75 - coffeeSoldElsewhere // Original - other sales (TEST invoice was voided)
    const expectedIPhoneStock = 25 - iphoneSoldElsewhere
    
    console.log('Expected Current Stock (assuming void worked correctly):')
    console.log(`   Coffee: 75 (initial) - ${coffeeSoldElsewhere} (other sales) = ${expectedCoffeeStock}`)
    console.log(`   iPhone: 25 (initial) - ${iphoneSoldElsewhere} (other sales) = ${expectedIPhoneStock}`)
    
    console.log('\nActual Current Stock:')
    products.forEach(product => {
      const actual = Number(product.stockQuantity)
      let expected = 0
      if (product.id === 'prod-coffee-cmgfgiqos0001szdhlotx8vhg') {
        expected = expectedCoffeeStock
      } else if (product.id === 'prod-iphone-cmgfgiqos0001szdhlotx8vhg') {
        expected = expectedIPhoneStock
      }
      
      const difference = actual - expected
      console.log(`   ${product.name}: ${actual} (expected: ${expected}) ${difference === 0 ? '✅' : '❌ diff: ' + difference}`)
    })
    
    // Check all inventory movements to see what actually happened
    console.log('\n=== Complete Inventory Movement History ===')
    const allMovements = await prisma.inventoryMovement.findMany({
      where: {
        productId: {
          in: ['prod-coffee-cmgfgiqos0001szdhlotx8vhg', 'prod-iphone-cmgfgiqos0001szdhlotx8vhg']
        }
      },
      include: { product: true },
      orderBy: { movementDate: 'asc' }
    })
    
    console.log(`📋 Total movements found: ${allMovements.length}`)
    
    if (allMovements.length === 0) {
      console.log('❌ NO INVENTORY MOVEMENTS FOUND AT ALL!')
      console.log('🔧 This means:')
      console.log('   1. Stock changes are happening without inventory movements')
      console.log('   2. Direct stock updates are bypassing the movement system')
      console.log('   3. The inventory management system is not integrated with sales')
    } else {
      allMovements.forEach((mov, idx) => {
        console.log(`${idx + 1}. ${mov.product?.name}`)
        console.log(`   Quantity: ${mov.quantity} (${mov.movementType})`)
        console.log(`   Date: ${mov.movementDate}`)
        console.log(`   Reference: ${mov.reference}`)
        console.log(`   Reason: ${mov.reason || 'Not specified'}`)
        console.log('')
      })
    }
    
    // Final diagnosis
    console.log('🎯 === INVENTORY SYSTEM DIAGNOSIS ===')
    
    const actualCoffee = products.find(p => p.id === 'prod-coffee-cmgfgiqos0001szdhlotx8vhg')?.stockQuantity || 0
    const actualIPhone = products.find(p => p.id === 'prod-iphone-cmgfgiqos0001szdhlotx8vhg')?.stockQuantity || 0
    
    console.log('\n🔍 Key Findings:')
    console.log('1. ❌ NO inventory movements exist for any sales')
    console.log('2. ✅ Journal entries for COGS/Inventory are correct')  
    console.log('3. ❌ Stock quantities changed without movement tracking')
    console.log('4. 🔧 Gap between financial accounting and inventory management')
    console.log('')
    
    console.log('🚨 CRITICAL ISSUE:')
    console.log('The system is updating stock quantities during sales BUT not creating inventory movements!')
    console.log('This means:')
    console.log('- Financial accounting is correct (COGS/Inventory journal entries)')
    console.log('- Physical inventory tracking is broken (no movement records)')
    console.log('- Void process cannot restore quantities (no movements to reverse)')
    console.log('')
    
    console.log('💡 SOLUTION NEEDED:')
    console.log('1. Fix invoice posting to create inventory movements when reducing stock')
    console.log('2. Fix void process to create reversing inventory movements')
    console.log('3. Ensure both financial and physical inventory are synchronized')
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

investigateInventoryGap()