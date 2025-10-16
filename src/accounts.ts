import { prisma } from './prisma.js';

export async function getAccountByPurpose(tenantId: string, companyId: string, purpose: string) {
  const mapping = await prisma.accountMapping.findFirst({ where: { tenantId, companyId, purpose } });
  if (!mapping) return null;
  const account = await prisma.account.findFirst({ where: { id: mapping.accountId, tenantId, companyId } });
  return account;
}


