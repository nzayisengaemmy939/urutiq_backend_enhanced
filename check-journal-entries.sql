-- Check journal entries for your tenant and company
SELECT id, reference, status, "companyId", "tenantId", "createdAt"
FROM "JournalEntry" 
WHERE "tenantId" = 'tenant_1759326251514_z9gbpg8hv'
ORDER BY "createdAt" DESC
LIMIT 20;

-- Count by status
SELECT status, COUNT(*) as count
FROM "JournalEntry" 
WHERE "tenantId" = 'tenant_1759326251514_z9gbpg8hv'
GROUP BY status;

-- Count by company ID
SELECT "companyId", COUNT(*) as count
FROM "JournalEntry" 
WHERE "tenantId" = 'tenant_1759326251514_z9gbpg8hv'
GROUP BY "companyId";
