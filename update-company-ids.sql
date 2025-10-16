-- Retrieve all accounts for the specific company ID
SELECT id, code, name, "companyId", "tenantId", "typeId", "isActive"
FROM "Account" 
WHERE "tenantId" = 'tenant_1759326251514_z9gbpg8hv' 
  AND "companyId" = 'cmg7trbsf00097kb7rrpy9in1'
ORDER BY code;

-- Retrieve all account types for the specific company ID
SELECT id, code, name, "companyId", "tenantId"
FROM "AccountType" 
WHERE "tenantId" = 'tenant_1759326251514_z9gbpg8hv' 
  AND "companyId" = 'cmg7trbsf00097kb7rrpy9in1'
ORDER BY code;

-- Count by company ID to see distribution
SELECT "companyId", COUNT(*) as account_count
FROM "Account" 
WHERE "tenantId" = 'tenant_1759326251514_z9gbpg8hv'
GROUP BY "companyId";
