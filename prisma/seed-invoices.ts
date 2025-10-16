import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedOptions = {
  tenantId: string;
  companyId: string;
  customersPerCompany?: number;
  productsPerCompany?: number;
  invoicesPerCompany?: number;
};

const CURRENCIES = ["USD", "EUR", "GBP", "KES", "NGN"] as const;
const PRODUCT_TYPES = ["inventory", "non-inventory", "service"] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number, precision = 2): number {
  const n = Math.random() * (max - min) + min;
  return parseFloat(n.toFixed(precision));
}

function dateShift(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

async function seedCustomers(tenantId: string, companyId: string, count: number) {
  const customers = [] as Array<{ id: string }>;
  for (let i = 0; i < count; i++) {
    const name = `Customer ${i + 1}`;
    const rand = Math.random().toString(36).slice(2, 8);
    const email = `customer${i + 1}.${companyId}.${rand}@example.com`;
    try {
      const c = await prisma.customer.create({
        data: { tenantId, companyId, name, email },
      });
      customers.push({ id: c.id });
    } catch {
      const existing = await prisma.customer.findFirst({ where: { tenantId, companyId, name } });
      if (existing) customers.push({ id: existing.id });
    }
  }
  return customers;
}

async function seedProducts(tenantId: string, companyId: string, count: number) {
  const products = [] as Array<{ id: string; unitPrice: number; name: string }>;
  for (let i = 0; i < count; i++) {
    const type = pick(PRODUCT_TYPES);
    const name = type === "service" ? `Service ${i + 1}` : `Product ${i + 1}`;
    const sku = `SKU-${String(i + 1).padStart(4, "0")}`;
    const unitPrice = type === "service" ? rand(50, 500) : rand(10, 200);
    const costPrice = type === "service" ? 0 : rand(5, 120);
    const stockQuantity = type === "inventory" ? rand(10, 200, 0) : 0;

    try {
      const p = await prisma.product.create({
        data: { tenantId, companyId, name, sku, description: `${name} description`, type, unitPrice, costPrice, stockQuantity },
      });
      products.push({ id: p.id, unitPrice: Number(p.unitPrice), name: p.name });
    } catch {
      const existing = await prisma.product.findFirst({ where: { tenantId, companyId, sku } });
      if (existing) products.push({ id: existing.id, unitPrice: Number((existing as any).unitPrice || 0), name: existing.name });
    }
  }
  return products;
}

async function seedInvoices(tenantId: string, companyId: string, customers: Array<{ id: string }>, products: Array<{ id: string; unitPrice: number; name: string }>, count: number) {
  const now = new Date();
  const start = new Date();
  start.setMonth(now.getMonth() - 6);

  if (!customers || customers.length === 0) {
    console.warn(`No customers available for ${companyId}. Skipping invoice seeding.`);
    return;
  }
  if (!products || products.length === 0) {
    console.warn(`No products available for ${companyId}. Skipping invoice seeding.`);
    return;
  }

  for (let i = 0; i < count; i++) {
    const customer = pick(customers);
    if (!customer) continue;
    const issueDate = dateShift(start, Math.floor(Math.random() * 180));
    const dueDate = Math.random() < 0.85 ? dateShift(issueDate, 14 + Math.floor(Math.random() * 16)) : null;

    // Status distribution
    let status = "draft";
    const roll = Math.random();
    if (roll < 0.4) status = "paid"; else if (roll < 0.8) status = "sent"; else status = "draft";

    // 1-5 lines
    const lineCount = 1 + Math.floor(Math.random() * 5);
    const chosen = Array.from({ length: lineCount }, () => pick(products));

    let subtotal = 0; let taxTotal = 0;
    const linesData = chosen.map((p) => {
      const quantity = pick([1, 1, 2, 3, 5]);
      const unitPrice = p.unitPrice || rand(10, 300);
      const taxRate = pick([0, 0, 5, 10, 12, 15]);
      subtotal += quantity * unitPrice;
      taxTotal += quantity * unitPrice * (taxRate / 100);
      const lineTotal = quantity * unitPrice * (1 + taxRate / 100);
      return { tenantId, productId: p.id, description: p.name, quantity, unitPrice, taxRate, lineTotal };
    });

    const shipping = Math.random() < 0.2 ? rand(5, 25) : 0;
    const discount = Math.random() < 0.25 ? rand(5, 20) : 0; // absolute discount
    const totalAmount = Math.max(0, subtotal - discount) + taxTotal + shipping;
    const balanceDue = status === "paid" ? 0 : totalAmount;
    const isOverdue = status !== "paid" && !!dueDate && new Date(dueDate) < now;

    const invoiceNumber = `INV-${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(4, "0")}`;

    try {
      const invoice = await prisma.invoice.create({
        data: {
          tenantId,
          companyId,
          customerId: customer.id,
          invoiceNumber,
          issueDate,
          dueDate: dueDate || undefined,
          status: isOverdue ? "overdue" : status,
          totalAmount,
          balanceDue,
        },
      });

      for (const line of linesData) {
        await prisma.invoiceLine.create({
          data: {
            tenantId,
            invoiceId: invoice.id,
            productId: line.productId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
            lineTotal: line.lineTotal,
          },
        });
      }
    } catch (e: any) {
      // Skip duplicates on reruns
      if (e?.code !== 'P2002') throw e;
    }
  }
}

export async function seedInvoicesAndRelated(opts: SeedOptions) {
  const {
    tenantId,
    companyId,
    customersPerCompany = 15,
    productsPerCompany = 25,
    invoicesPerCompany = 120,
  } = opts;

  const customers = await seedCustomers(tenantId, companyId, customersPerCompany);
  const products = await seedProducts(tenantId, companyId, productsPerCompany);
  await seedInvoices(tenantId, companyId, customers, products, invoicesPerCompany);
  console.log(`Seeded customers (${customers.length}), products (${products.length}), invoices (${invoicesPerCompany}) for company ${companyId}`);
}


