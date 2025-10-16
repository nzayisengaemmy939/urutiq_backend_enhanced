import { PrismaClient } from "@prisma/client";
import { seedInventoryData } from "./seed-inventory";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "seed-tenant-1";
  const companyId = "seed-company-1";

  console.log("🌱 Seeding inventory data only...");

  // Clear existing inventory data
  await prisma.reorderAlert.deleteMany({ where: { tenantId } });
  await prisma.inventoryMovement.deleteMany({ where: { tenantId } });
  await prisma.productLocation.deleteMany({ where: { tenantId } });
  await prisma.location.deleteMany({ where: { tenantId, companyId } });
  await prisma.product.deleteMany({ where: { tenantId, companyId } });

  console.log("🧹 Cleared existing inventory data");

  // Seed inventory data
  await seedInventoryData({ tenantId, companyId });

  console.log("✅ Inventory seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding inventory data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
