import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type SeedOpts = { tenantId: string; companyId: string; count?: number }

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export async function seedPurchaseOrdersAndRelated(opts: SeedOpts) {
  const { tenantId, companyId, count = 20 } = opts
  console.log(`🌱 Seeding ${count} purchase orders for company ${companyId}...`)

  // Ensure some vendors and products exist
  const vendors = await prisma.vendor.findMany({ where: { tenantId, companyId } })
  const products = await prisma.product.findMany({ where: { tenantId, companyId } })

  if (vendors.length < 5 || products.length < 10) {
    console.log('⚠️ Not enough vendors/products found. Run main seed or seed-purchases first.')
  }

  const poNumbers = new Set<string>()
  const genPoNumber = (i: number) => {
    const base = `PO-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`
    let n = base
    let k = 1
    while (poNumbers.has(n)) { n = `${base}-${k++}` }
    poNumbers.add(n)
    return n
  }

  const createdPOs: string[] = []

  for (let i = 0; i < count; i++) {
    const vendor = randomChoice(vendors)
    const purchaseType: 'local'|'import' = i % 2 === 0 ? 'local' : 'import'
    const orderDate = new Date()
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 90))
    const expectedDelivery = new Date(orderDate)
    expectedDelivery.setDate(orderDate.getDate() + 14 + Math.floor(Math.random() * 21))

    // Build lines (1-4)
    const numLines = 1 + Math.floor(Math.random() * 4)
    const lineInputs: Array<{ productId?: string; description: string; quantity: number; unitPrice: number; taxRate: number }> = []
    for (let j = 0; j < numLines; j++) {
      const p = randomChoice(products)
      lineInputs.push({
        productId: p?.id,
        description: p?.name || `Item ${j + 1}`,
        quantity: Math.floor(randomBetween(1, 10)),
        unitPrice: Number(randomBetween(20, 400).toFixed(2)),
        taxRate: Number(randomBetween(0, 15).toFixed(2)),
      })
    }

    const baseTotal = lineInputs.reduce((sum, l) => sum + l.quantity * l.unitPrice * (1 + l.taxRate / 100), 0)
    const freightCost = purchaseType === 'import' ? Number(randomBetween(50, 500).toFixed(2)) : 0
    const customsDuty = purchaseType === 'import' ? Number(randomBetween(30, 300).toFixed(2)) : 0
    const otherImportCosts = purchaseType === 'import' ? Number(randomBetween(10, 150).toFixed(2)) : 0
    const totalAmount = baseTotal + freightCost + customsDuty + otherImportCosts

    // Skip if this PO number already exists (idempotent reruns)
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: { tenantId, companyId, poNumber: genPoNumber(i) }
    })
    if (existingPO) {
      createdPOs.push(existingPO.id)
      continue
    }

    const created = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        companyId,
        vendorId: vendor.id,
        poNumber: genPoNumber(i),
        orderDate,
        expectedDelivery,
        currency: 'USD',
        notes: purchaseType === 'import' ? 'Import purchase with landed costs' : 'Local purchase',
        terms: 'Net 30',
        totalAmount,
        status: ['draft','sent','approved','received'][Math.floor(Math.random()*4)] as any,
        purchaseType,
        vendorCurrency: purchaseType === 'import' ? 'EUR' : 'USD',
        exchangeRate: purchaseType === 'import' ? 1.1 : 1,
        freightCost,
        customsDuty,
        otherImportCosts,
        incoterms: purchaseType === 'import' ? randomChoice(['FOB','CIF','DDP']) : null,
        shippingMethod: purchaseType === 'import' ? randomChoice(['sea','air','land']) : null,
        originCountry: purchaseType === 'import' ? 'CN' : null,
        destinationCountry: 'US',
        portOfEntry: purchaseType === 'import' ? randomChoice(['LAX','NYC','SFO','SEA']) : null,
      }
    })

    createdPOs.push(created.id)

    // Lines
    for (const l of lineInputs) {
      await prisma.purchaseOrderLine.create({
        data: {
          tenantId,
          purchaseOrderId: created.id,
          productId: l.productId || null,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          lineTotal: Number((l.quantity * l.unitPrice * (1 + l.taxRate/100)).toFixed(2))
        }
      })
    }

    // Receipts for ~60% of POs
    if (Math.random() < 0.6) {
      const receipt = await prisma.receipt.create({
        data: {
          tenantId,
          purchaseOrderId: created.id,
          receiptNumber: `RC-${created.poNumber}`,
          receivedDate: new Date(created.expectedDelivery.getTime() + Math.floor(Math.random()*5)*24*3600*1000),
          partialReceipt: Math.random() < 0.3,
          notes: 'Auto-seeded receipt'
        }
      })

      // receipt items mirror PO lines with some variance
      const poLines = await prisma.purchaseOrderLine.findMany({ where: { tenantId, purchaseOrderId: created.id } })
      for (const line of poLines) {
        const qtyReceived = Math.max(0, Math.min(line.quantity, Math.floor(line.quantity * (line.quantity > 1 ? randomBetween(0.6, 1.0) : 1))))
        await prisma.receiptItem.create({
          data: {
            tenantId,
            receiptId: receipt.id,
            purchaseOrderLineId: line.id,
            productId: line.productId,
            description: line.description,
            quantityReceived: qtyReceived,
            quantityAccepted: qtyReceived,
            quantityRejected: 0,
          }
        })
      }
    }

    // Import shipments for import POs (~70% of them)
    if (purchaseType === 'import' && Math.random() < 0.7) {
      const shipDate = new Date(orderDate)
      shipDate.setDate(shipDate.getDate() + 3)
      const shipment = await prisma.importShipment.create({
        data: {
          tenantId,
          companyId,
          purchaseOrderId: created.id,
          shipmentNumber: `SHP-${created.poNumber}`,
          shipmentDate: shipDate,
          expectedArrival: expectedDelivery,
          status: randomChoice(['pending','in_transit','arrived','cleared','delivered']) as any,
          carrier: randomChoice(['Maersk','MSC','CMA CGM','COSCO']),
          trackingNumber: `TRK-${Math.floor(Math.random()*1e6)}`,
          containerNumber: `CONT-${Math.floor(Math.random()*1e5)}`,
          vesselFlight: 'VSL-001',
          customsBroker: randomChoice(['DHL Global Forwarding','Kuehne+Nagel','DB Schenker']),
          dutiesPaid: customsDuty,
          taxesPaid: Number(randomBetween(0, 100).toFixed(2)),
          freightCost,
          insuranceCost: Number(randomBetween(10, 80).toFixed(2)),
          customsFees: Number(randomBetween(5, 60).toFixed(2)),
          storageCost: Number(randomBetween(0, 40).toFixed(2)),
          otherCosts: otherImportCosts,
          totalLandedCost: Number((freightCost + customsDuty + otherImportCosts).toFixed(2)),
          notes: 'Auto-seeded import shipment'
        }
      })

      // Initial customs events
      await prisma.customsEvent.createMany({ data: [
        { tenantId, importShipmentId: shipment.id, eventType: 'shipment_created', eventDate: shipDate, description: 'Shipment created', status: 'completed' },
        { tenantId, importShipmentId: shipment.id, eventType: 'customs_entry', eventDate: new Date(shipDate.getTime() + 5*24*3600*1000), description: 'Customs entry filed', status: 'completed' },
      ] })
    }
  }

  console.log(`✅ Created ${createdPOs.length} purchase orders with lines${' '}and related records`)
}

// Note: direct execution block removed for ESM compatibility. This module is invoked from main seed.


