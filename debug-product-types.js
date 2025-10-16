import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkProductTypes() {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, type: true, stockQuantity: true }
    })
    
    console.log('=== Products in database ===')
    products.forEach(p => {
      console.log(`- ${p.name}: type='${p.type}', stock=${p.stockQuantity}`)
    })
    
    console.log('\n=== Unique product types ===')
    const types = [...new Set(products.map(p => p.type))]
    types.forEach(type => console.log(`- ${type}`))
    
    // Check recent invoices
    console.log('\n=== Recent invoices ===')
    const invoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { lines: { include: { product: true } } }
    })
    
    invoices.forEach(inv => {
      console.log(`Invoice ${inv.invoiceNumber}:`)
      inv.lines.forEach(line => {
        console.log(`  - ${line.description} (productId: ${line.productId}, type: ${line.product?.type})`)
      })
    })
    
    // Check inventory movements
    console.log('\n=== Recent inventory movements ===')
    const movements = await prisma.inventoryMovement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { product: true }
    })
    
    movements.forEach(mov => {
      console.log(`- ${mov.product?.name}: ${mov.quantity} units (${mov.movementType}) - ${mov.reference}`)
    })
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error:', error)
    await prisma.$disconnect()
  }
}

checkProductTypes()