import type { Router } from 'express';
import { prisma } from './prisma.js';
import { TenantRequest } from './tenant.js';
import { validateBody } from './validate.js';
import { z } from 'zod';
import { purchaseOrderPDFService } from './services/purchase-order-pdf.service.js';
import { emailService } from './services/email.service.js';
import { purchaseOrderDeliveryService } from './services/purchase-order-delivery.service.js';

// Validation schemas
const purchaseOrderSchemas = {
  create: z.object({
    companyId: z.string(),
    vendorId: z.string(),
    poNumber: z.string().min(1),
    orderDate: z.string().datetime(),
    expectedDelivery: z.string().datetime().optional(),
    currency: z.string().default('USD'),
    notes: z.string().optional(),
    terms: z.string().optional(),
    // Inventory Type - determines how products affect inventory
    inventoryType: z.enum(['assets', 'fixed_assets']).default('assets').optional(),
    // Import/Export Purchase Support
    purchaseType: z.enum(['local', 'import']).default('local').optional(),
    vendorCurrency: z.string().length(3).optional(),
    exchangeRate: z.number().positive().optional(),
    freightCost: z.number().nonnegative().default(0).optional(),
    customsDuty: z.number().nonnegative().default(0).optional(),
    otherImportCosts: z.number().nonnegative().default(0).optional(),
    // Incoterms and Shipping Details
    incoterms: z.string().optional(),
    shippingMethod: z.string().optional(),
    originCountry: z.string().length(2).optional(),
    destinationCountry: z.string().length(2).optional(),
    portOfEntry: z.string().optional(),
    lines: z.array(z.object({
      productId: z.string().optional(),
      description: z.string().min(1),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      taxRate: z.number().nonnegative().default(0)
    })).min(1)
  }),
  
  update: z.object({
    // Core fields that should be editable
    vendorId: z.string().optional(),
    poNumber: z.string().min(1).optional(),
    orderDate: z.string().datetime().optional(),
    expectedDelivery: z.string().datetime().optional(),
    currency: z.string().optional(),
    notes: z.string().optional(),
    terms: z.string().optional(),
    status: z.enum(['draft', 'approved', 'delivered', 'closed', 'cancelled']).optional(),
    // Inventory Type - determines how products affect inventory
    inventoryType: z.enum(['assets', 'fixed_assets']).optional(),
    // Import/Export Purchase Support
    purchaseType: z.enum(['local', 'import']).optional(),
    vendorCurrency: z.string().length(3).optional(),
    exchangeRate: z.number().positive().optional(),
    freightCost: z.number().nonnegative().optional(),
    customsDuty: z.number().nonnegative().optional(),
    otherImportCosts: z.number().nonnegative().optional(),
    // Incoterms and Shipping Details
    incoterms: z.string().optional(),
    shippingMethod: z.string().optional(),
    originCountry: z.string().length(2).optional(),
    destinationCountry: z.string().length(2).optional(),
    portOfEntry: z.string().optional(),
    lines: z.array(z.object({
      id: z.string().optional(),
      productId: z.string().optional(),
      description: z.string().min(1),
      quantity: z.number().positive(),
      unitPrice: z.number().nonnegative(),
      taxRate: z.number().nonnegative().default(0)
    })).min(1).optional()
  }),

  receipt: z.object({
    receiptNumber: z.string().min(1),
    receivedDate: z.string().datetime(),
    receivedBy: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(z.object({
      purchaseOrderLineId: z.string().optional(),
      productId: z.string().optional(),
      description: z.string().min(1),
      quantityReceived: z.number().positive(),
      quantityAccepted: z.number().nonnegative(),
      quantityRejected: z.number().nonnegative().default(0),
      rejectionReason: z.string().optional()
    })).min(1)
  }),

  delivery: z.object({
    deliveredDate: z.string().datetime(),
    deliveredBy: z.string().optional(),
    notes: z.string().optional(),
    journalEntryData: z.object({
      memo: z.string().optional(),
      reference: z.string().optional()
    }).optional()
  })
};

export function mountPurchaseOrderRoutes(router: Router) {
  // List match exceptions (out-of-tolerance POs with linked bills)
  router.get('/purchase-orders/match-exceptions', async (req: TenantRequest, res) => {
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '50'), 10)))
    const tolerancePctDefault = Number((req.query.tolerancePct as string) || process.env.THREE_WAY_TOLERANCE_PCT || 2)
    const toleranceAbsDefault = Number((req.query.toleranceAbs as string) || process.env.THREE_WAY_TOLERANCE_ABS || 5)
    const companyId = (req.query.companyId as string) || ''
    try {
      const pos = await prisma.purchaseOrder.findMany({
        where: { tenantId: req.tenantId!, relatedBillId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: { vendor: true }
      })
      // Load company settings if companyId provided
      let tolLocalPct = tolerancePctDefault
      let tolLocalAbs = toleranceAbsDefault
      let tolImportPct = tolerancePctDefault
      let tolImportAbs = toleranceAbsDefault
      if (companyId) {
        try {
          const settings = await prisma.companySetting.findMany({ where: { tenantId: req.tenantId!, companyId } })
          const getVal = (k: string) => settings.find(s => s.key === k)?.value
          tolLocalPct = Number(getVal('three_way_tolerance_pct_local') ?? tolLocalPct)
          tolLocalAbs = Number(getVal('three_way_tolerance_abs_local') ?? tolLocalAbs)
          tolImportPct = Number(getVal('three_way_tolerance_pct_import') ?? tolImportPct)
          tolImportAbs = Number(getVal('three_way_tolerance_abs_import') ?? tolImportAbs)
        } catch {}
      }
      const billIds = pos.map(p => p.relatedBillId!).filter(Boolean)
      const bills = await prisma.bill.findMany({ where: { tenantId: req.tenantId!, id: { in: billIds } } })
      const billById = new Map(bills.map(b => [b.id, b]))
      const exceptions = pos.map(po => {
        const bill = billById.get(po.relatedBillId!)
        const poTotal = Number(po.totalAmount)
        const billTotal = bill ? Number(bill.totalAmount) : 0
        const diff = Math.abs(poTotal - billTotal)
        const pct = poTotal > 0 ? (diff / poTotal) * 100 : 0
        const isImport = String((po as any).purchaseType || '').toLowerCase() === 'import'
        const tolPct = isImport ? tolImportPct : tolLocalPct
        const tolAbs = isImport ? tolImportAbs : tolLocalAbs
        const within = diff <= tolAbs || pct <= tolPct
        return within ? null : {
          id: po.id,
          poNumber: po.poNumber,
          vendor: po.vendor?.name,
          poTotal,
          billId: bill?.id,
          billTotal,
          diff: Number(diff.toFixed(2)),
          pctDiff: Number(pct.toFixed(2)),
          tolerance: { pct: tolPct, abs: tolAbs },
          updatedAt: po.updatedAt
        }
      }).filter(Boolean)
      res.json({ items: exceptions })
    } catch (e) {
      console.error('Error listing match exceptions', e)
      res.status(500).json({ error: 'Failed to list exceptions' })
    }
  })

  // Resolve a match exception (best-effort: log audit entry)
  router.post('/purchase-orders/:id/resolve-exception', async (req: TenantRequest, res) => {
    const { id } = req.params
    try {
      const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId: req.tenantId! } })
      if (!po) return res.status(404).json({ error: 'not_found' })
      try {
        await prisma.auditLog.create({
          data: {
            tenantId: req.tenantId!,
            userId: (req as any).userId || 'system',
            action: 'three_way_match_exception_resolved',
            entityType: 'purchase_order',
            entityId: id,
          }
        } as any)
      } catch {}
      res.json({ ok: true })
    } catch (e) {
      console.error('Error resolving exception', e)
      res.status(500).json({ error: 'Failed to resolve exception' })
    }
  })
  // Get all purchase orders
  router.get('/purchase-orders', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    const q = (req.query.q as string) || undefined;
    const status = (req.query.status as string) || undefined;
    const skip = (page - 1) * pageSize;

    try {
      const where: any = {
        tenantId: req.tenantId,
        companyId: companyId || undefined,
        status: status || undefined,
        OR: q ? [
          { poNumber: { contains: q } },
          { vendor: { name: { contains: q } } },
        ] : undefined,
      };
      Object.keys(where).forEach((k) => where[k] === undefined && delete where[k]);

      const [total, items] = await Promise.all([
        prisma.purchaseOrder.count({ where }),
        prisma.purchaseOrder.findMany({ 
          where, 
          include: { 
            vendor: true, 
            lines: true,
            receipts: { include: { items: true } }
          },
          orderBy: { orderDate: 'asc' }, 
          skip, 
          take: pageSize 
        })
      ]);

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      
      res.json({ 
        items, 
        page, 
        pageSize, 
        total, 
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      });
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
  });

  // Get single purchase order
  router.get('/purchase-orders/:id', async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    try {
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: { 
          id, 
          tenantId: req.tenantId! 
        },
        include: { 
          vendor: true, 
          lines: true,
          receipts: { include: { items: true } },
          relatedBill: true
        }
      });

      if (!purchaseOrder) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      res.json(purchaseOrder);
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
  });

  // Create purchase order
  router.post('/purchase-orders', async (req: TenantRequest, res) => {
    const data = req.body as any;
    const companyId = req.header('x-company-id') || String(req.query.companyId || '');
    
    console.log('🔍 DEBUG: Purchase order creation started');
    console.log('🔍 DEBUG: Data received:', JSON.stringify(data, null, 2));
    console.log('🔍 DEBUG: Company ID from header:', companyId);
    
    try {
      console.log('🔍 DEBUG: Starting database transaction');
      const result = await prisma.$transaction(async (tx) => {
        // Calculate total amount including import costs
        const baseTotal = data.lines.reduce((sum: number, line: any) => {
          const lineTotal = line.quantity * line.unitPrice * (1 + line.taxRate / 100);
          return sum + lineTotal;
        }, 0);
        
        const importCosts = (data.freightCost || 0) + (data.customsDuty || 0) + (data.otherImportCosts || 0);
        const totalAmount = baseTotal + importCosts;

        console.log('🔍 DEBUG: Calculated total amount:', totalAmount);

        // Create purchase order
        console.log('🔍 DEBUG: Creating purchase order...');
        const purchaseOrder = await tx.purchaseOrder.create({
          data: {
            tenantId: req.tenantId!,
            companyId: companyId,
            vendorId: data.vendorId,
            poNumber: data.poNumber,
            orderDate: new Date(data.orderDate),
            expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
            currency: data.currency,
            notes: data.notes,
            terms: data.terms,
            totalAmount,
            status: 'draft',
            // Import/Export fields
            purchaseType: data.purchaseType || 'local',
            vendorCurrency: data.vendorCurrency,
            exchangeRate: data.exchangeRate,
            freightCost: data.freightCost || 0,
            customsDuty: data.customsDuty || 0,
            otherImportCosts: data.otherImportCosts || 0,
            incoterms: data.incoterms,
            shippingMethod: data.shippingMethod,
            originCountry: data.originCountry,
            destinationCountry: data.destinationCountry,
            portOfEntry: data.portOfEntry,
            // Inventory Type - using type assertion due to Prisma client generation issue
            inventoryType: (data as any).inventoryType || 'assets'
          } as any
        });

        console.log('🔍 DEBUG: Purchase order created successfully:', purchaseOrder.id);

        // Create purchase order lines
        console.log('🔍 DEBUG: Creating purchase order lines...');
        const lines = await Promise.all(
          data.lines.map((line: any) => {
            // For fixed assets, productId is optional
            if ((purchaseOrder as any).inventoryType === 'fixed_assets') {
              return tx.purchaseOrderLine.create({
                data: {
                  tenantId: req.tenantId!,
                  purchaseOrderId: purchaseOrder.id,
                  productId: line.productId || null, // Allow null for fixed assets
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  taxRate: line.taxRate,
                  lineTotal: line.quantity * line.unitPrice * (1 + line.taxRate / 100)
                }
              });
            } else {
              // For regular assets, productId is required
              if (!line.productId) {
                throw new Error('Product selection is required for inventory items');
              }
              return tx.purchaseOrderLine.create({
                data: {
                  tenantId: req.tenantId!,
                  purchaseOrderId: purchaseOrder.id,
                  productId: line.productId,
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  taxRate: line.taxRate,
                  lineTotal: line.quantity * line.unitPrice * (1 + line.taxRate / 100)
                }
              });
            }
          })
        );

        console.log('🔍 DEBUG: Purchase order lines created successfully');
        return { purchaseOrder, lines };
      });

      console.log('🔍 DEBUG: Transaction completed successfully');
      res.status(201).json(result);
    } catch (error) {
      console.error('❌ ERROR creating purchase order:', error);
      console.error('❌ ERROR stack:', error.stack);
      res.status(500).json({ error: 'Failed to create purchase order', details: error.message });
    }
  });

  // Update purchase order
  router.put('/purchase-orders/:id', validateBody(purchaseOrderSchemas.update), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body as any;
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existingPO = await tx.purchaseOrder.findFirst({
          where: { id, tenantId: req.tenantId! },
          include: { lines: true }
        });

        if (!existingPO) {
          throw new Error('Purchase order not found');
        }

        // Check if purchase order is in a final state - cannot edit
        if (existingPO.status === 'closed' || existingPO.status === 'cancelled') {
          throw new Error('Cannot edit closed or cancelled purchase orders');
        }

        // Prevent changing from delivered back to draft or approved
        if (existingPO.status === 'delivered' && (data.status === 'draft' || data.status === 'approved')) {
          throw new Error('Cannot change status from delivered back to draft or approved');
        }

        // Prevent changing from approved back to draft
        if (existingPO.status === 'approved' && data.status === 'draft') {
          throw new Error('Cannot change status from approved back to draft');
        }

        // If changing to delivered, trigger the delivery process
        if (data.status === 'delivered' && existingPO.status === 'approved') {
          // Import the delivery service
          const { purchaseOrderDeliveryService } = await import('./services/purchase-order-delivery.service');
          
          // Prepare delivery data
          const deliveryData = {
            purchaseOrderId: id,
            deliveredDate: new Date(),
            deliveredBy: 'System',
            notes: 'Status changed to delivered via API',
            journalEntryData: {
              memo: `Inventory delivered from PO ${existingPO.poNumber}`,
              reference: `PO-${existingPO.poNumber}-DELIVERED`
            }
          };

          // Process delivery (this will update status to delivered and handle inventory)
          const deliveryResult = await purchaseOrderDeliveryService.processDelivery(deliveryData);
          
          return {
            purchaseOrder: deliveryResult.purchaseOrder,
            lines: existingPO.lines,
            deliveryProcessed: true,
            inventoryMovements: deliveryResult.inventoryMovements,
            journalEntry: deliveryResult.journalEntry
          };
        }

        // Calculate new total if lines are updated
        let baseTotal = existingPO.totalAmount;
        if (data.lines) {
          baseTotal = data.lines.reduce((sum: number, line: any) => {
            const lineTotal = line.quantity * line.unitPrice * (1 + line.taxRate / 100);
            return sum + lineTotal;
          }, 0);
        }
        
        const importCosts = (data.freightCost ?? existingPO.freightCost) + 
                           (data.customsDuty ?? existingPO.customsDuty) + 
                           (data.otherImportCosts ?? existingPO.otherImportCosts);
        const totalAmount = baseTotal + importCosts;

        // Update purchase order
        const purchaseOrder = await tx.purchaseOrder.update({
          where: { id },
          data: {
            // Core fields
            vendorId: data.vendorId,
            poNumber: data.poNumber,
            orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
            expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : undefined,
            currency: data.currency,
            notes: data.notes,
            terms: data.terms,
            status: data.status,
            totalAmount,
            // Inventory Type - using type assertion due to Prisma client generation issue
            inventoryType: (data as any).inventoryType,
            // Import/Export fields
            purchaseType: data.purchaseType,
            vendorCurrency: data.vendorCurrency,
            exchangeRate: data.exchangeRate,
            freightCost: data.freightCost,
            customsDuty: data.customsDuty,
            otherImportCosts: data.otherImportCosts,
            incoterms: data.incoterms,
            shippingMethod: data.shippingMethod,
            originCountry: data.originCountry,
            destinationCountry: data.destinationCountry,
            portOfEntry: data.portOfEntry
          } as any
        });

        // Update lines if provided
        if (data.lines) {
          // Delete existing lines
          await tx.purchaseOrderLine.deleteMany({
            where: { purchaseOrderId: id }
          });

          // Create new lines
          const lines = await Promise.all(
            data.lines.map((line: any) => {
              // For fixed assets, productId is optional
              if ((existingPO as any).inventoryType === 'fixed_assets') {
                return tx.purchaseOrderLine.create({
                  data: {
                    tenantId: req.tenantId!,
                    purchaseOrderId: id,
                    productId: line.productId || null, // Allow null for fixed assets
                    description: line.description,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    taxRate: line.taxRate,
                    lineTotal: line.quantity * line.unitPrice * (1 + line.taxRate / 100)
                  }
                });
              } else {
                // For regular assets, productId is required
                if (!line.productId) {
                  throw new Error('Product selection is required for inventory items');
                }
                return tx.purchaseOrderLine.create({
                  data: {
                    tenantId: req.tenantId!,
                    purchaseOrderId: id,
                    productId: line.productId,
                    description: line.description,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    taxRate: line.taxRate,
                    lineTotal: line.quantity * line.unitPrice * (1 + line.taxRate / 100)
                  }
                });
              }
            })
          );

          return { purchaseOrder, lines };
        }

        return { purchaseOrder };
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
      
      // Handle specific business logic errors
      if (error.message?.includes('Cannot edit completed')) {
        return res.status(403).json({ 
          error: 'EDIT_NOT_ALLOWED',
          message: error.message 
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to update purchase order',
        message: error.message 
      });
    }
  });

  // Create receipt for purchase order
  router.post('/purchase-orders/:id/receipts', async (req: TenantRequest, res) => {
    console.log('🚀 RECEIPT ROUTE HIT - Starting receipt creation');
    try {
    const { id } = req.params;
    const data = req.body as any;
    
      console.log('🔍 DEBUG: Receipt creation started');
      console.log('🔍 DEBUG: Purchase Order ID:', id);
      console.log('🔍 DEBUG: Receipt data:', JSON.stringify(data, null, 2));
      console.log('🔍 DEBUG: Tenant ID:', req.tenantId);
      console.log('🔍 DEBUG: Company ID:', req.header('x-company-id'));
      const result = await prisma.$transaction(async (tx) => {
        // Verify purchase order exists
        const purchaseOrder = await tx.purchaseOrder.findFirst({
          where: { id, tenantId: req.tenantId! },
          include: { lines: true }
        });

        if (!purchaseOrder) {
          throw new Error('Purchase order not found');
        }

        // Create receipt
        const receipt = await tx.receipt.create({
          data: {
            tenantId: req.tenantId!,
            purchaseOrderId: id,
            receiptNumber: data.receiptNumber,
            receivedDate: new Date(data.receivedDate),
            receivedBy: data.receivedBy,
            notes: data.notes,
            partialReceipt: false // Will be calculated based on items
          } as any
        });

        // Create receipt items
        const items = await Promise.all(
          data.items.map((item: any) =>
            tx.receiptItem.create({
              data: {
                tenantId: req.tenantId!,
                receiptId: receipt.id,
                purchaseOrderLineId: item.purchaseOrderLineId,
                productId: item.productId,
                description: item.description,
                quantityReceived: item.quantityReceived,
                quantityAccepted: item.quantityAccepted,
                quantityRejected: item.quantityRejected,
                rejectionReason: item.rejectionReason
              }
            })
          )
        );

        // Update purchase order receiving status
        const totalReceived = items.reduce((sum, item) => sum + Number(item.quantityAccepted), 0);
        const totalOrdered = purchaseOrder.lines.reduce((sum, line) => sum + Number(line.quantity), 0);
        
        let receivingStatus = 'pending';
        if (totalReceived >= totalOrdered) {
          receivingStatus = 'complete';
        } else if (totalReceived > 0) {
          receivingStatus = 'partial';
        }

        await tx.purchaseOrder.update({
          where: { id },
          data: { receivingStatus }
        });

        // Update received quantities on PO lines and update inventory
        for (const item of items) {
          if (item.purchaseOrderLineId) {
            // Get the PO line and associated product separately
            const poLine = await tx.purchaseOrderLine.findUnique({
              where: { id: item.purchaseOrderLineId }
            });

            if (!poLine) continue;

            // Get product if productId exists
            let product = null;
            if (poLine.productId) {
              product = await tx.product.findUnique({
                where: { id: poLine.productId }
              });
            }

            // Update PO line received quantity
            await tx.purchaseOrderLine.update({
              where: { id: item.purchaseOrderLineId },
              data: {
                receivedQuantity: {
                  increment: item.quantityAccepted
                }
              }
            });

            // Update inventory based on inventory type
            if (poLine.productId) {
              if ((purchaseOrder as any).inventoryType === 'fixed_assets') {
                // Skip fixed assets processing in transaction - will handle separately
                console.log('🔍 Fixed assets will be processed after transaction');
              } else {
                // Handle normal assets inventory (existing logic)
              const product = await tx.product.findUnique({
                where: { 
                  id: poLine.productId,
                  tenantId: req.tenantId! 
                }
              });

              if (product) {
                const currentStock = Number(product.stockQuantity || 0);
                const newStockQuantity = currentStock + item.quantityAccepted;
                // Using a fixed reorder point since it's not in the schema
                const defaultReorderPoint = 5;

                await tx.product.update({
                  where: { 
                    id: poLine.productId,
                    tenantId: req.tenantId! 
                  },
                  data: {
                    stockQuantity: newStockQuantity,
                    status: newStockQuantity <= 0 ? 'INACTIVE' : 'ACTIVE'
                  }
                });

                // Create stock movement record
                await tx.inventoryMovement.create({
                  data: {
                    tenantId: req.tenantId!,
                    productId: poLine.productId,
                    movementType: 'purchase_receipt',
                    quantity: item.quantityAccepted,
                    reference: `PO-${purchaseOrder.poNumber}`,
                    reason: `Received from PO ${purchaseOrder.poNumber}`,
                    movementDate: new Date()
                  }
                });
              }
              }
            } else if ((purchaseOrder as any).inventoryType === 'fixed_assets') {
              // For fixed assets without productId, we'll handle them in the fixed assets processing section
              console.log('🔍 Fixed assets without productId will be processed after transaction');
            }
          }
        }

        return { receipt, items, receivingStatus };
      });

      // SIMPLE FIXED ASSETS PROCESSING - ALWAYS RUN AFTER RECEIPT
      let fixedAssetsDebug = '🚀 SIMPLE FIXED ASSETS PROCESSING STARTED';
      
      try {
        // Get purchase order to check inventory type
        const po = await prisma.purchaseOrder.findFirst({
          where: { id, tenantId: req.tenantId! }
        });
        
        fixedAssetsDebug += ` | PO Found: ${po ? 'YES' : 'NO'}`;
        if (po) {
          fixedAssetsDebug += ` | Inventory Type: ${(po as any).inventoryType}`;
        }
        
        if (po && (po as any).inventoryType === 'fixed_assets') {
          fixedAssetsDebug += ' | Processing FIXED ASSETS';
          
          // Use a separate transaction to ensure fixed assets are committed
          await prisma.$transaction(async (tx) => {
            for (const item of data.items) {
              fixedAssetsDebug += ` | Processing: ${item.description} (Qty: ${item.quantityAccepted})`;
              
              // Get purchase order line
              const poLine = await tx.purchaseOrderLine.findUnique({
                where: { id: item.purchaseOrderLineId }
              });
              
              if (poLine) {
                // Create or get default category
                let defaultCategory = await tx.fixedAssetCategory.findFirst({
                  where: {
                    tenantId: req.tenantId!,
                    companyId: po.companyId,
                    name: 'General Equipment'
                  }
                });
                
                if (!defaultCategory) {
                  defaultCategory = await tx.fixedAssetCategory.create({
                    data: {
                      tenantId: req.tenantId!,
                      companyId: po.companyId,
                      name: 'General Equipment',
                      usefulLifeMonths: 60,
                      method: 'straight_line',
                      salvageRate: 0.1
                    }
                  });
                }
                
                // Use description as asset name
                const assetName = item.description || 'Unknown Asset';
                
                // Check if asset exists
                const existingAsset = await tx.fixedAsset.findFirst({
                  where: {
                    tenantId: req.tenantId!,
                    companyId: po.companyId,
                    name: assetName,
                    cost: Number(poLine.unitPrice)
                  }
                });
                
                if (existingAsset) {
                  // Update existing asset quantity
                  await tx.fixedAsset.update({
                    where: { id: existingAsset.id },
                    data: {
                      quantity: (existingAsset as any).quantity + item.quantityAccepted
                    } as any
                  });
                  fixedAssetsDebug += ` | UPDATED: ${assetName} -> ${(existingAsset as any).quantity + item.quantityAccepted}`;
                } else {
                  // Create new asset
                  const newAsset = await tx.fixedAsset.create({
                    data: {
                      tenantId: req.tenantId!,
                      companyId: po.companyId,
                      categoryId: defaultCategory.id,
                      name: assetName,
                      cost: Number(poLine.unitPrice),
                      quantity: item.quantityAccepted,
                      currency: po.currency,
                      acquisitionDate: new Date().toISOString().split('T')[0],
                      startDepreciation: new Date().toISOString().split('T')[0],
                      salvageValue: Number(poLine.unitPrice) * 0.1,
                      notes: `Created from PO ${po.poNumber}`,
                      status: 'POSTED'
                    } as any
                  });
                  fixedAssetsDebug += ` | CREATED: ${assetName} (Qty: ${item.quantityAccepted}) ID: ${newAsset.id}`;
                }
              }
            }
          });
        } else {
          fixedAssetsDebug += ' | Not fixed assets PO - skipping';
        }
    } catch (error) {
        fixedAssetsDebug += ` | ERROR: ${error.message}`;
      }

      res.status(201).json({ ...result, fixedAssetsDebug });
    } catch (error) {
      console.error('❌ ERROR creating receipt:', error);
      console.error('❌ ERROR stack:', error.stack);
      console.error('❌ ERROR details:', JSON.stringify(error, null, 2));
      res.status(500).json({ 
        error: 'Failed to create receipt', 
        details: error.message,
        stack: error.stack 
      });
    }
  });

  // Get receipts for purchase order
  router.get('/purchase-orders/:id/receipts', async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    try {
      const receipts = await prisma.receipt.findMany({
        where: { 
          purchaseOrderId: id, 
          tenantId: req.tenantId! 
        },
        include: { 
          items: true 
        },
        orderBy: { receivedDate: 'desc' }
      });

      res.json(receipts);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({ error: 'Failed to fetch receipts' });
    }
  });

  // Mark purchase order as delivered
  router.post('/purchase-orders/:id/deliver', validateBody(purchaseOrderSchemas.delivery), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const data = req.body as any;
    
    try {
      const result = await purchaseOrderDeliveryService.processDelivery({
        purchaseOrderId: id,
        deliveredDate: new Date(data.deliveredDate),
        deliveredBy: data.deliveredBy,
        notes: data.notes,
        journalEntryData: data.journalEntryData,
        userId: req.user?.sub // Pass the user ID from token sub field
      });

      res.status(200).json({
        success: true,
        message: 'Purchase order marked as delivered successfully',
        data: result
      });
    } catch (error) {
      console.error('Error marking purchase order as delivered:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to mark purchase order as delivered',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get delivery status for purchase order
  router.get('/purchase-orders/:id/delivery-status', async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    try {
      const deliveryStatus = await purchaseOrderDeliveryService.getDeliveryStatus(id, req.tenantId!);
      res.json(deliveryStatus);
    } catch (error) {
      console.error('Error fetching delivery status:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch delivery status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Three-way matching: PO → Receipt → Bill
  router.post('/purchase-orders/:id/match-bill', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { billId } = req.body;
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Get purchase order with all related data
        const purchaseOrder = await tx.purchaseOrder.findFirst({
          where: { id, tenantId: req.tenantId! },
          include: { 
            lines: true,
            receipts: { include: { items: true } }
          } as any
        });

        if (!purchaseOrder) {
          throw new Error('Purchase order not found');
        }

        // Get bill
        const bill = await tx.bill.findFirst({
          where: { id: billId, tenantId: req.tenantId! },
          include: { lines: true }
        });

        if (!bill) {
          throw new Error('Bill not found');
        }

        // Perform three-way matching with tolerances (resolve by company and PO type)
        let tolerancePct = Number(process.env.THREE_WAY_TOLERANCE_PCT || 2); // 2% default
        let toleranceAbs = Number(process.env.THREE_WAY_TOLERANCE_ABS || 5); // $5 default
        try {
          if (purchaseOrder.companyId) {
            const settings = await tx.companySetting.findMany({ where: { tenantId: req.tenantId!, companyId: purchaseOrder.companyId } })
            const getVal = (k: string) => settings.find(s => s.key === k)?.value
            const isImport = String((purchaseOrder as any).purchaseType || '').toLowerCase() === 'import'
            const pctKey = isImport ? 'three_way_tolerance_pct_import' : 'three_way_tolerance_pct_local'
            const absKey = isImport ? 'three_way_tolerance_abs_import' : 'three_way_tolerance_abs_local'
            const resolvedPct = getVal(pctKey)
            const resolvedAbs = getVal(absKey)
            if (resolvedPct !== undefined) tolerancePct = Number(resolvedPct)
            if (resolvedAbs !== undefined) toleranceAbs = Number(resolvedAbs)
          }
        } catch {}
        const poTotal = Number(purchaseOrder.totalAmount)
        const billTotal = Number(bill.totalAmount)
        const receiptQtyTotal = (purchaseOrder as any).receipts.reduce((sum: number, receipt: any) =>
          sum + (receipt as any).items.reduce((itemSum: number, item: any) => itemSum + Number(item.quantityAccepted), 0), 0)

        const diff = Math.abs(poTotal - billTotal)
        const pct = poTotal > 0 ? (diff / poTotal) * 100 : 0

        const withinTolerance = diff <= toleranceAbs || pct <= tolerancePct

        const matchingResults = {
          poTotal,
          billTotal,
          receiptTotal: receiptQtyTotal,
          matches: {
            quantities: true,
            prices: withinTolerance,
            totals: withinTolerance
          },
          discrepancies: [] as string[],
          tolerance: { pct: tolerancePct, abs: toleranceAbs, diff, pctDiff: Number(pct.toFixed(2)) }
        } as any;

        if (!withinTolerance) {
          matchingResults.discrepancies.push(`Total mismatch beyond tolerance (diff=${diff.toFixed(2)}, pct=${pct.toFixed(2)}%)`)
        }

        // Link bill to purchase order
        await tx.purchaseOrder.update({
          where: { id },
          data: { relatedBillId: billId }
        });

        // If out of tolerance, log an audit event for exception queue
        if (!withinTolerance) {
          try {
            await tx.auditLog.create({
              data: {
                tenantId: req.tenantId!,
                entityType: 'purchase_order',
                entityId: id,
                action: 'three_way_match_exception',
                userId: (req as any).userId || 'system',
                details: JSON.stringify({ billId, matchingResults })
              }
            } as any)
          } catch (e) {
            // ignore if auditLog differs by schema; non-blocking
          }
        }

        return { purchaseOrder, bill, matchingResults };
      });

      res.json(result);
    } catch (error) {
      console.error('Error performing three-way matching:', error);
      res.status(500).json({ error: 'Failed to perform three-way matching' });
    }
  });

  // Generate PDF for purchase order
  router.get('/purchase-orders/:id/pdf', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const includeTerms = req.query.includeTerms !== 'false';
    const includeNotes = req.query.includeNotes !== 'false';
    const format = (req.query.format as 'detailed' | 'summary') || 'detailed';
    
    try {
      // Verify purchase order exists and belongs to tenant
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: { id, tenantId: req.tenantId! }
      });

      if (!purchaseOrder) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      // Generate PDF
      const pdfBuffer = await purchaseOrderPDFService.generatePurchaseOrderPDF(id, {
        includeReceived: true,
        generatedBy: req.user?.sub
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PO-${purchaseOrder.poNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating purchase order PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  });

  // Send purchase order to vendor via email
  router.post('/purchase-orders/:id/send-to-vendor', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { notes } = req.body as { notes?: string };
    
    try {
      // Fetch purchase order with vendor and company info
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: { id, tenantId: req.tenantId! },
        include: {
          vendor: true,
          company: true
        }
      });

      if (!purchaseOrder) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      // Validate vendor email
      if (!purchaseOrder.vendor.email) {
        return res.status(400).json({ 
          error: 'Vendor email not configured',
          message: `Vendor ${purchaseOrder.vendor.name} does not have an email address on file.`
        });
      }

      // Generate PDF
      const pdfBuffer = await purchaseOrderPDFService.generatePurchaseOrderPDF(id, {
        includeReceived: true,
        generatedBy: req.user?.sub
      });

      // Send email with PDF attachment
      await emailService.sendPurchaseOrderToVendor(
        purchaseOrder.vendor.email,
        purchaseOrder.vendor.name,
        purchaseOrder.poNumber,
        pdfBuffer,
        purchaseOrder.company.name,
        notes
      );

      // Update PO status to 'sent' if it was 'draft'
      if (purchaseOrder.status === 'draft') {
        await prisma.purchaseOrder.update({
          where: { id },
          data: { status: 'sent' }
        });
      }

      res.json({ 
        success: true,
        message: `Purchase order ${purchaseOrder.poNumber} sent to ${purchaseOrder.vendor.name} (${purchaseOrder.vendor.email})`,
        sentTo: purchaseOrder.vendor.email,
        sentAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending purchase order to vendor:', error);
      res.status(500).json({ 
        error: 'Failed to send purchase order',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete purchase order
  router.delete('/purchase-orders/:id', async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    try {
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: { id, tenantId: req.tenantId! }
      });

      if (!purchaseOrder) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      // Only draft purchase orders can be deleted
      if (purchaseOrder.status !== 'draft') {
        return res.status(400).json({ 
          error: 'Cannot delete non-draft purchase order',
          message: 'Only draft purchase orders can be deleted. For other statuses, please cancel the order instead.'
        });
      }

      // Delete related records first, then the purchase order
      await prisma.$transaction(async (tx) => {
        // Delete receipt items first (they reference receipts)
        await tx.receiptItem.deleteMany({
          where: { 
            receipt: { 
              purchaseOrderId: id 
            } 
          } as any
        });

        // Delete receipts (they reference purchase orders)
        await tx.receipt.deleteMany({
          where: { purchaseOrderId: id }
        });

        // Delete purchase order lines
        await tx.purchaseOrderLine.deleteMany({
          where: { purchaseOrderId: id }
        });

        // Finally delete the purchase order
        await tx.purchaseOrder.delete({
          where: { id }
        });
      });

      res.json({ message: 'Purchase order deleted successfully' });
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      res.status(500).json({ error: 'Failed to delete purchase order' });
    }
  });
}
