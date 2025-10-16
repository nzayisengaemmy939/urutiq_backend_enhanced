import { prisma } from './prisma.js';
export async function getAccountByPurpose(tenantId, companyId, purpose) {
    const mapping = await prisma.accountMapping.findFirst({ where: { tenantId, companyId, purpose } });
    if (!mapping)
        return null;
    const account = await prisma.account.findFirst({ where: { id: mapping.accountId, tenantId, companyId } });
    return account;
}
