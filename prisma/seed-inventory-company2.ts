import { PrismaClient } from "@prisma/client";
import { seedInventoryData } from "./seed-inventory";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "seed-tenant-1";
  const companyId = "seed-company-2";

  console.log("🌱 Seeding inventory data for company 2...");

  // Clear existing inventory data for company 2
  await prisma.reorderAlert.deleteMany({ 
    where: { 
      tenantId,
      product: { companyId }
    } 
  });
  await prisma.inventoryMovement.deleteMany({ 
    where: { 
      tenantId,
      product: { companyId }
    } 
  });
  await prisma.productLocation.deleteMany({ 
    where: { 
      tenantId,
      product: { companyId }
    } 
  });
  await prisma.location.deleteMany({ where: { tenantId, companyId } });
  await prisma.product.deleteMany({ where: { tenantId, companyId } });

  console.log("🧹 Cleared existing inventory data for company 2");

  // Seed inventory data
  await seedInventoryData({ tenantId, companyId });

  console.log("✅ Inventory seeding completed for company 2!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding inventory data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
