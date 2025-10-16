-- Check accounts with your real company ID
SELECT id, code, name, "companyId", "tenantId"
FROM "Account" 
WHERE "tenantId" = 'tenant_1759326251514_z9gbpg8hv' 
  AND "companyId" = 'cmg7trbsf00097kb7rrpy9in1'
ORDER BY code;

-- Check accounts with seed-company-1
SELECT id, code, name, "companyId", "tenantId"
FROM "Account" 
WHERE "tenantId" = 'tenant_1759326251514_z9gbpg8hv' 
  AND "companyId" = 'seed-company-1'
ORDER BY code;

-- Summary count
SELECT "companyId", COUNT(*) as count
FROM "Account" 
WHERE "tenantId" = 'tenant_1759326251514_z9gbpg8hv'
GROUP BY "companyId";
