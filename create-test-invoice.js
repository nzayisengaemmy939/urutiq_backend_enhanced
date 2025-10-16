import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testFixedInventoryLogic() {
  try {
    console.log('🧪 Testing Fixed Inventory Movement Logic\n')
    
    // Get some products to test with
    const products = await prisma.product.findMany({
      where: { type: 'PRODUCT', stockQuantity: { gt: 5 } },
      take: 2
    })
    
    if (products.length < 2) {
      console.log('❌ Need at least 2 products with stock > 5')
      return
    }
    
    console.log('📦 Test Products Selected:')
    products.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name} (${p.sku}) - Stock: ${p.stockQuantity}, Type: ${p.type}`)
    })
    console.log('')
    
    // Get a customer
    const customer = await prisma.customer.findFirst()
    if (!customer) {
      console.log('❌ No customer found')
      return
    }
    
    // Get company
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ No company found') 
      return
    }
    
    console.log(`👤 Customer: ${customer.name}`)
    console.log(`🏢 Company: ${company.name}\n`)
    
    // Create test invoice with multiple products
    const testInvoiceNumber = `TEST-${Date.now()}`
    
    console.log('📋 Creating Test Invoice...')
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: company.tenantId,
        companyId: company.id,
        customerId: customer.id,
        invoiceNumber: testInvoiceNumber,
        issueDate: new Date(),
        status: 'draft',
        totalAmount: 100.00,
        balanceDue: 100.00,
        currency: 'USD',
        subtotal: 100.00,
        taxAmount: 0,
        discountAmount: 0,
        shippingAmount: 0
      }
    })
    
    // Create invoice lines for both products
    console.log('📄 Adding Invoice Lines...')
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      const quantity = 2 // Test with 2 units each
      const unitPrice = 25.00
      
      await prisma.invoiceLine.create({
        data: {
          tenantId: company.tenantId,
          invoiceId: invoice.id,
          productId: product.id,
          description: product.name,
          quantity: quantity,
          unitPrice: unitPrice,
          lineTotal: quantity * unitPrice,
          taxRate: 0,
          discountAmount: 0,
          taxAmount: 0,
          netAmount: quantity * unitPrice
        }
      })
      
      console.log(`   ✅ Added: ${product.name} x${quantity} @ $${unitPrice}`)
    }
    
    console.log(`\n🎯 Test Invoice Created: ${testInvoiceNumber}`)
    console.log('📋 Invoice has 2 products with different product IDs')
    console.log('🔍 Now we can test if the fixed logic creates inventory movements for ALL products\n')
    
    // Show current stock levels
    console.log('📊 Current Stock Levels:')
    const currentProducts = await prisma.product.findMany({
      where: { id: { in: products.map(p => p.id) } }
    })
    currentProducts.forEach(p => {
      console.log(`   - ${p.name}: ${p.stockQuantity} units`)
    })
    
    console.log(`\n✅ Test invoice ready: ${testInvoiceNumber}`)
    console.log('🚀 Next step: POST this invoice to trigger inventory movements')
    console.log('📝 The fixed code should now create inventory movements for BOTH products')
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

testFixedInventoryLogic()