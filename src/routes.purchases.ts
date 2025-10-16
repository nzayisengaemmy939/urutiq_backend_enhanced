import type { Router } from 'express';
import { prisma } from './prisma';
import { TenantRequest } from './tenant';
import { validateBody, schemas } from './validate';
import { prisma as db } from './prisma';
import { getAccountByPurpose } from './accounts';
import { logAnomaly, addAudit } from './ai';
import { enqueueAiJob } from './queue';
import { enqueueWebhooks } from './webhooks';

function calcLineTotal(qty: number, price: number, taxRate: number) {
  const base = qty * price;
  const tax = base * (taxRate / 100);
  return Math.round((base + tax) * 100) / 100;
}

export function mountPurchaseRoutes(router: Router) {
  // Vendors
  router.get('/vendors', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    const q = (req.query.q as string) || undefined;
    const skip = (page - 1) * pageSize;

    console.log('🔍 Vendors API called with:', { companyId, tenantId: req.tenantId, page, pageSize, q });
    
    try {
      // Get the actual company ID from database if companyId is 'demo-company' or invalid
      let actualCompanyId = companyId;
      if (companyId === 'demo-company' || !companyId) {
        const company = await prisma.company.findFirst({ 
          where: { tenantId: req.tenantId! } 
        });
        actualCompanyId = company?.id || '';
      }
      
      const where: any = {
        tenantId: req.tenantId,
        companyId: actualCompanyId || undefined,
        OR: q ? [
          { name: { contains: q } },
          { email: { contains: q } },
        ] : undefined,
      };
      Object.keys(where).forEach((k) => where[k] === undefined && delete where[k]);

      let [total, items] = await Promise.all([
        prisma.vendor.count({ where }),
        prisma.vendor.findMany({ 
          where, 
          orderBy: { name: 'asc' }, 
          skip, 
          take: pageSize 
        })
      ]);

      // Dev bootstrap: if no vendors exist for this tenant (and optional company), create a few sample ones
      if (total === 0 && process.env.NODE_ENV !== 'production' && actualCompanyId) {
        const samples = [
          { name: 'Acme Supplies', email: 'acme@example.com' },
          { name: 'Global Office Co', email: 'office@example.com' },
          { name: 'Tech Parts Ltd', email: 'techparts@example.com' },
          { name: 'Logistics Hub', email: 'logistics@example.com' },
          { name: 'Stationery World', email: 'stationery@example.com' },
        ];
        for (const s of samples) {
          const exists = await prisma.vendor.findFirst({ 
            where: { tenantId: req.tenantId!, companyId: actualCompanyId, name: s.name } 
          });
          if (!exists) {
            await prisma.vendor.create({ 
              data: { 
                tenantId: req.tenantId!, 
                companyId: actualCompanyId, 
                name: s.name, 
                email: s.email,
                isActive: true
              } 
            });
          }
        }
        // Re-query after bootstrap using the actual company ID
        total = await prisma.vendor.count({ 
          where: { tenantId: req.tenantId!, companyId: actualCompanyId } 
        });
        items = await prisma.vendor.findMany({ 
          where: { tenantId: req.tenantId!, companyId: actualCompanyId }, 
          orderBy: { name: 'asc' }, 
          skip, 
          take: pageSize 
        });
      }

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      
      console.log('📦 Found vendors:', items.length, 'of', total, 'total');
      
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
      console.error('❌ Error fetching vendors:', error);
      res.status(500).json({ error: 'Failed to fetch vendors' });
    }
  });
  router.post('/vendors', validateBody(schemas.vendorCreate), async (req: TenantRequest, res) => {
    const data = req.body as any;
    const created = await prisma.vendor.create({ data: { tenantId: req.tenantId!, ...data } });
    res.status(201).json(created);
  });

  // Bills
  router.get('/bills', async (req: TenantRequest, res) => {
  const companyId = req.query.companyId ? String(req.query.companyId) : undefined;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
    const q = (req.query.q as string) || undefined;
    const status = (req.query.status as string) || undefined;
    const skip = (page - 1) * pageSize;

    console.log('🔍 Bills API called with:', { companyId, tenantId: req.tenantId, page, pageSize, q, status });
    
    try {
      const where: any = {
        tenantId: req.tenantId,
        companyId,
        status: status || undefined,
        OR: q ? [
          { billNumber: { contains: q } },
          { vendor: { name: { contains: q } } },
        ] : undefined,
      };
      Object.keys(where).forEach((k) => where[k] === undefined && delete where[k]);

      const [total, items] = await Promise.all([
        prisma.bill.count({ where }),
        prisma.bill.findMany({ 
          where, 
          include: { vendor: true, lines: true },
          orderBy: { billDate: 'desc' }, 
          skip, 
          take: pageSize 
        })
      ]);

      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      
      console.log('📦 Found bills:', items.length, 'of', total, 'total');
      
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
      console.error('❌ Error fetching bills:', error);
      res.status(500).json({ error: 'Failed to fetch bills' });
    }
  });

  // NOTE: Disabled legacy bills route - now handled by dedicated routes.bills.ts router
  router.post('/bills', validateBody(schemas.billCreate), async (req: TenantRequest, res) => {
    console.log('📝 Bill creation request body:', req.body);
    const { companyId, vendorId, billNumber, billDate, dueDate, currency, lines, purchaseType, vendorCurrency, exchangeRate, freightCost = 0, customsDuty = 0, otherImportCosts = 0, allocateLandedCost = false } = req.body as any;
    if (!companyId) {
      console.error('❌ Bill creation error: companyId missing in request body:', req.body);
      return res.status(400).json({ error: 'companyId_required', message: 'companyId must be provided in the request body.', debug: req.body });
    }
    // Resolve tax rates by taxId or taxName, fallback to numeric
    const resolvedLines = await Promise.all((lines as any[]).map(async (l) => {
      let effectiveRate = Number(l.taxRate || 0);
      if (l.taxId) {
        const tr = await prisma.taxRate.findFirst({ where: { tenantId: req.tenantId!, companyId, id: l.taxId, isActive: true } });
        if (tr) effectiveRate = Number(tr.rate) * 100;
      } else if (l.taxName) {
        const tr = await prisma.taxRate.findFirst({ where: { tenantId: req.tenantId!, companyId, taxName: l.taxName, isActive: true } });
        if (tr) effectiveRate = Number(tr.rate) * 100;
      }
      return { ...l, effectiveRate };
    }));
    const totals = resolvedLines.map((l: any) => calcLineTotal(l.quantity ?? 1, l.unitPrice ?? 0, l.effectiveRate ?? 0));
    let totalAmount = totals.reduce((a: number, b: number) => a + b, 0);
    const landedCosts = Number(freightCost) + Number(customsDuty) + Number(otherImportCosts);
    const created = await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: { tenantId: req.tenantId!, companyId, vendorId, billNumber, billDate: new Date(billDate), dueDate: dueDate ? new Date(dueDate) : null, status: 'draft', totalAmount: totalAmount + landedCosts, balanceDue: totalAmount + landedCosts, purchaseType: purchaseType || 'local', vendorCurrency, exchangeRate, freightCost, customsDuty, otherImportCosts }
      });
      for (let i = 0; i < resolvedLines.length; i++) {
        const l = resolvedLines[i];
        await tx.billLine.create({ data: { tenantId: req.tenantId!, billId: bill.id, productId: l.productId, description: l.description, quantity: l.quantity ?? 1, unitPrice: l.unitPrice ?? 0, taxRate: l.effectiveRate ?? 0, lineTotal: totals[i] } });
      }
      // optionally allocate landed costs across inventory items by line value proportion
      if (allocateLandedCost && landedCosts > 0) {
        const invLines = await tx.billLine.findMany({ where: { billId: bill.id, tenantId: req.tenantId!, productId: { not: null } } });
        const invTotal = invLines.reduce((s, bl) => s + Number(bl.lineTotal), 0);
        for (const bl of invLines) {
          const share = invTotal > 0 ? (Number(bl.lineTotal) / invTotal) * landedCosts : 0;
          const qty = Number(bl.quantity);
          const extraPerUnit = qty > 0 ? share / qty : 0;
          // update product cost price increasing by allocated per-unit
          const product = await tx.product.findFirst({ where: { id: bl.productId!, tenantId: req.tenantId! } });
          if (product && product.type === 'inventory') {
            const newCost = Number(product.costPrice) + extraPerUnit;
            await tx.product.update({ where: { id: product.id }, data: { costPrice: newCost } });
          }
        }
        await tx.bill.update({ where: { id: bill.id }, data: { landedCostAllocated: true } });
      }
      return bill;
    });
    res.status(201).json(created);
  });

  // Post bill -> create journal + transaction (Inventory/Expense, AP) and inventory movements for inventory products
  router.post('/bills/:id/post', validateBody(schemas.billPostAction), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const bill = await prisma.bill.findFirst({ where: { id, tenantId: req.tenantId }, include: { company: true, vendor: true, lines: true } });
    if (!bill) return res.status(404).json({ error: 'not_found' });
    if (bill.status === 'posted') return res.status(400).json({ error: 'already_posted' });

    const inventory = await getAccountByPurpose(req.tenantId!, bill.companyId, 'INVENTORY');
    const expense = await getAccountByPurpose(req.tenantId!, bill.companyId, 'EXPENSE');
    const ap = await getAccountByPurpose(req.tenantId!, bill.companyId, 'AP');
    if (!ap) return res.status(400).json({ error: 'missing_accounts', message: 'Require mapping for AP' });

    const result = await db.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({ data: { tenantId: req.tenantId!, companyId: bill.companyId, date: new Date(bill.billDate), memo: `Bill ${bill.billNumber}`, reference: bill.billNumber, status: 'DRAFT' } });

      let inventoryTotal = 0;
      let expenseTotal = 0;
      for (const line of bill.lines) {
        if (line.productId) {
          const product = await tx.product.findFirst({ where: { id: line.productId, tenantId: req.tenantId } });
          if (product) {
            const qty = Number(line.quantity ?? 0);
            const cost = Number(line.unitPrice ?? 0) * qty;
            if (product.type === 'inventory') {
              inventoryTotal += cost;
              // movement (purchase -> positive)
              await tx.inventoryMovement.create({ data: { tenantId: req.tenantId!, productId: product.id, movementType: 'purchase', quantity: qty, movementDate: new Date(bill.billDate), reference: bill.billNumber } });
              await tx.product.update({ where: { id: product.id }, data: { stockQuantity: (typeof product.stockQuantity === 'object' ? Number(product.stockQuantity) : Number(product.stockQuantity)) + qty, costPrice: Number(line.unitPrice ?? product.costPrice) } });
            } else {
              expenseTotal += cost;
            }
          } else if (expense) {
            // unknown product, treat as expense
            expenseTotal += Number(line.unitPrice ?? 0) * Number(line.quantity ?? 0);
          }
        } else if (expense) {
          expenseTotal += Number(line.unitPrice ?? 0) * Number(line.quantity ?? 0);
        }
      }

      // landed costs handling for import purchases
      const landedCosts = Number(bill.freightCost || 0) + Number(bill.customsDuty || 0) + Number(bill.otherImportCosts || 0);

      if (inventoryTotal > 0 && inventory) {
        await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: inventory.id, debit: inventoryTotal, credit: 0, memo: 'Inventory' } });
      }
      if (expenseTotal > 0 && expense) {
        await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: expense.id, debit: expenseTotal, credit: 0, memo: 'Expense' } });
      }
      if (bill.purchaseType === 'import' && landedCosts > 0) {
        if (bill.landedCostAllocated && inventory) {
          // capitalize landed costs into inventory
          await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: inventory.id, debit: landedCosts, credit: 0, memo: 'Landed costs' } });
        } else if (expense) {
          // expense landed costs if not allocated
          await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: expense.id, debit: landedCosts, credit: 0, memo: 'Import costs' } });
        }
      }
      await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: ap.id, debit: 0, credit: bill.totalAmount, memo: 'AP' } });
      const posted = await tx.journalEntry.update({ where: { id: entry.id }, data: { status: 'POSTED' } });
      const updatedBill = await tx.bill.update({ where: { id: bill.id }, data: { status: 'posted' } });
      let createdTx = null as any;
      if (req.body?.createTransaction !== false) {
        createdTx = await tx.transaction.create({ data: { tenantId: req.tenantId!, companyId: bill.companyId, transactionType: 'bill', amount: bill.totalAmount, currency: bill.company?.currency || 'USD', transactionDate: new Date(bill.billDate), status: 'posted', linkedJournalEntryId: entry.id } });
      }
      return { posted, bill: updatedBill, transaction: createdTx };
    });
    // Enqueue AI jobs: anomaly detection and insights asynchronously
    try {
      await enqueueAiJob('detect-anomalies', { tenantId: req.tenantId!, companyId: bill.companyId }, { removeOnComplete: true, removeOnFail: false });
      await enqueueAiJob('generate-insights', { tenantId: req.tenantId!, companyId: bill.companyId }, { removeOnComplete: true, removeOnFail: false });
      await enqueueAiJob('generate-recommendations', { tenantId: req.tenantId!, companyId: bill.companyId }, { removeOnComplete: true, removeOnFail: false });
    } catch (e) {
      console.error('Failed to enqueue AI jobs for bill post', e);
    }
  await addAudit({ tenantId: req.tenantId!, companyId: bill.companyId, action: `Bill ${bill.billNumber} posted` });
  try { enqueueWebhooks('bill.posted', { billId: bill.id, companyId: bill.companyId }); } catch (e) { console.error('enqueueWebhooks failed', e); }
  res.json(result);
  });
}

