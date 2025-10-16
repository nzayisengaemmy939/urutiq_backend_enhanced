import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const total = await prisma.journalEntry.count()
  const byCompany = await prisma.journalEntry.groupBy({ by: ['companyId'], _count: { id: true } })
  const byTenantCompany = await prisma.journalEntry.groupBy({ by: ['tenantId','companyId'], _count: { id: true } })
  const byStatus = await prisma.journalEntry.groupBy({ by: ['status'], _count: { id: true } })
  const extremes = await prisma.journalEntry.findMany({ select: { date: true, companyId: true }, orderBy: { date: 'asc' }, take: 1 })
  const latest = await prisma.journalEntry.findMany({ select: { date: true, companyId: true }, orderBy: { date: 'desc' }, take: 1 })

  console.log(JSON.stringify({
    total,
    byCompany,
    byStatus,
    byTenantCompany,
    earliest: extremes[0] || null,
    latest: latest[0] || null,
  }, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })


