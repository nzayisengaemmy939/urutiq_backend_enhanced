-- Delete accounts with null or wrong company ID for your tenant
DELETE FROM "Account" WHERE "tenantId" = 'tenant_1759326251514_z9gbpg8hv' AND ("companyId" IS NULL OR "companyId" != 'cmg7trbsf00097kb7rrpy9in1');

-- Delete account types with null or wrong company ID for your tenant  
DELETE FROM "AccountType" WHERE "tenantId" = 'tenant_1759326251514_z9gbpg8hv' AND ("companyId" IS NULL OR "companyId" != 'cmg7trbsf00097kb7rrpy9in1');
