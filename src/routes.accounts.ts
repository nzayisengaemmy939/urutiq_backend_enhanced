

import type { Router, Response } from 'express';
import { prisma } from './prisma.js';
import { TenantRequest } from './tenant.js';
import { validateBody, schemas } from './validate.js';
import { ApiError, asyncHandler } from './errors.js';
import type { Account, AccountType, Company } from '@prisma/client';
import { authMiddleware, requireRoles } from './auth.js';
const AUTH_SECRET = process.env.JWT_SECRET || 'dev-secret';

// --- Helper functions for validation and reuse ---
async function getCompanyOrThrow(tenantId: string, companyId: string): Promise<Company> {
  const company = await prisma.company.findFirst({ where: { id: companyId, tenantId } });
  if (!company) throw new ApiError(400, 'COMPANY_NOT_FOUND', 'Company not found');
  return company;
}

async function getAccountTypeOrThrow(tenantId: string, typeId: string): Promise<AccountType> {
  const accountType = await prisma.accountType.findFirst({ where: { id: typeId, tenantId } });
  if (!accountType) throw new ApiError(400, 'ACCOUNT_TYPE_NOT_FOUND', 'Account type not found');
  return accountType;
}

async function getParentAccountOrThrow(tenantId: string, parentId: string): Promise<Account> {
  const parentAccount = await prisma.account.findFirst({ where: { id: parentId, tenantId } });
  if (!parentAccount) throw new ApiError(400, 'PARENT_ACCOUNT_NOT_FOUND', 'Parent account not found');
  return parentAccount;
}

function buildAccountHierarchy(accounts: (Account & { type: AccountType; parent: Account | null; children: Account[] })[]): { accounts: any[]; flat: any[]; total: number } {
  const accountsMap = new Map<string, any>();
  const rootAccounts: any[] = [];
  accounts.forEach(account => {
    accountsMap.set(account.id, { ...account, children: [] });
  });
  accounts.forEach(account => {
    if (account.parentId) {
      const parent = accountsMap.get(account.parentId);
      if (parent) {
        parent.children.push(accountsMap.get(account.id));
      }
    } else {
      rootAccounts.push(accountsMap.get(account.id));
    }
  });
  return { accounts: rootAccounts, flat: accounts, total: accounts.length };
}

export function mountAccountRoutes(router: Router) {
  // Apply authentication to all routes in this router
  router.use(authMiddleware(AUTH_SECRET));
  // Account Types Management
  router.get('/account-types', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const data = await prisma.accountType.findMany({ 
      where: { 
        tenantId: req.tenantId,
        companyId: companyId || null
      },
      orderBy: { code: 'asc' }
    });
    res.json(data);
  });

  router.post('/account-types', requireRoles(['admin', 'accountant']), validateBody(schemas.accountTypeCreate), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { code, name, companyId } = req.body ?? {};
    
    // Check if account type already exists
    const existing = await prisma.accountType.findFirst({
      where: { 
        tenantId: req.tenantId!, 
        code, 
        companyId: companyId || null 
      }
    });
    
    if (existing) {
      throw new ApiError(400, 'ACCOUNT_TYPE_EXISTS', 'Account type with this code already exists');
    }

    const created = await prisma.accountType.create({ 
      data: { 
        tenantId: req.tenantId!, 
        code, 
        name,
        companyId: companyId || null
      } 
    });
    
    res.status(201).json(created);
  }));

  router.put('/account-types/:id', requireRoles(['admin', 'accountant']), validateBody(schemas.accountTypeUpdate), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { code, name } = req.body ?? {};
    
    const updated = await prisma.accountType.update({
      where: { id, tenantId: req.tenantId! },
      data: { code, name }
    });
    res.json(updated);
  }));

  router.delete('/account-types/:id', requireRoles(['admin', 'accountant']), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    
    // Check if account type is being used
    const accountsUsingType = await prisma.account.findFirst({
      where: { typeId: id, tenantId: req.tenantId! }
    });
    
    if (accountsUsingType) {
      throw new ApiError(400, 'TYPE_IN_USE', 'Cannot delete account type that is being used by accounts');
    }
    
    await prisma.accountType.delete({
      where: { id, tenantId: req.tenantId! }
    });
    res.status(204).send();
  }));

  // Chart of Accounts Management
  router.get('/accounts', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const includeInactive = req.query.includeInactive === 'true';
    const where: Record<string, unknown> = { tenantId: req.tenantId };
    if (companyId) where.companyId = companyId;
    if (!includeInactive) where.isActive = true;
    const data = await prisma.account.findMany({
      where,
      include: {
        type: true,
        parent: true,
        children: { include: { type: true } }
      },
      orderBy: [
        { code: 'asc' },
        { name: 'asc' }
      ]
    });
    res.json(buildAccountHierarchy(data));
  });

  // Chart of Accounts Summary
  router.get('/accounts/summary', async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const where: Record<string, unknown> = { tenantId: req.tenantId, isActive: true };
    if (companyId) where.companyId = companyId;
    const accounts = await prisma.account.findMany({
      where,
      include: { type: true },
      orderBy: { code: 'asc' }
    });
    // Group by account type
    type Summary = Record<string, {
      typeCode: string;
      typeName: string;
      count: number;
      accounts: Array<{ id: string; code: string; name: string; isActive: boolean }>;
    }>;
    const summary: Summary = accounts.reduce((acc, account) => {
      const type = account.type.code;
      if (!acc[type]) {
        acc[type] = {
          typeCode: type,
          typeName: account.type.name,
          count: 0,
          accounts: []
        };
      }
      acc[type].count++;
      acc[type].accounts.push({
        id: account.id,
        code: account.code,
        name: account.name,
        isActive: account.isActive
      });
      return acc;
    }, {} as Summary);
    res.json({
      summary: Object.values(summary),
      totalAccounts: accounts.length,
      companyId: companyId || null
    });
  });

  router.get('/accounts/:id', async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    const account = await prisma.account.findFirst({
      where: { id, tenantId: req.tenantId! },
      include: {
        type: true,
        parent: true,
        children: {
          include: { type: true }
        },
        journalLines: {
          orderBy: { entry: { date: 'desc' } },
          take: 50,
          include: {
            entry: true
          }
        }
      }
    });
    
    if (!account) {
      throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Account not found');
    }
    
    // Calculate current balance
    const balance = account.journalLines.reduce((acc, line) => {
      return acc + Number(line.debit) - Number(line.credit);
    }, 0);
    
    res.json({
      ...account,
      currentBalance: balance
    });
  });

  router.post('/accounts', requireRoles(['admin', 'accountant']), validateBody(schemas.accountCreate), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { code, name, typeId, parentId, companyId: bodyCompanyId } = req.body ?? {};
    
    // Get company ID from body OR header (like other routes do)
    const companyId = bodyCompanyId || req.header('x-company-id');
    
    // Company ID is required for accounts
    if (!companyId) {
      throw new ApiError(400, 'COMPANY_ID_REQUIRED', 'Company ID is required for creating accounts');
    }
    
    await getCompanyOrThrow(req.tenantId!, companyId);
    await getAccountTypeOrThrow(req.tenantId!, typeId);
    if (parentId) await getParentAccountOrThrow(req.tenantId!, parentId);
    
    // Check if account code already exists
    const existingAccount = await prisma.account.findFirst({
      where: {
        tenantId: req.tenantId!,
        code,
        companyId
      }
    });
    if (existingAccount) {
      throw new ApiError(400, 'ACCOUNT_CODE_EXISTS', 'Account with this code already exists');
    }
    
    const created = await prisma.account.create({
      data: {
        tenantId: req.tenantId!,
        code,
        name,
        typeId,
        parentId: parentId || null,
        companyId
      }
    });
    res.status(201).json(created);
  }));

  router.put('/accounts/:id', requireRoles(['admin', 'accountant']), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    const { code, name, typeId, parentId, isActive } = req.body ?? {};
    
    // Build update data object with only provided fields
    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (typeId !== undefined) updateData.typeId = typeId;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updated = await prisma.account.update({
      where: { id, tenantId: req.tenantId! },
      data: updateData
    });
    res.json(updated);
  }));

  router.delete('/accounts/:id', requireRoles(['admin', 'accountant']), asyncHandler(async (req: TenantRequest, res: Response) => {
    const { id } = req.params;
    
    // Check if account has children
    const children = await prisma.account.findFirst({
      where: { parentId: id, tenantId: req.tenantId! }
    });
    
    if (children) {
      throw new ApiError(400, 'HAS_CHILDREN', 'Cannot delete account that has child accounts');
    }
    
    // Check if account has journal lines
    const journalLines = await prisma.journalLine.findFirst({
      where: { accountId: id, tenantId: req.tenantId! }
    });
    
    if (journalLines) {
      throw new ApiError(400, 'HAS_TRANSACTIONS', 'Cannot delete account that has transactions');
    }
    
    await prisma.account.delete({
      where: { id, tenantId: req.tenantId! }
    });
    
    res.status(204).send();
  }));

  // Account Balances and Summary
  router.get('/accounts/:id/balance', async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { asOf } = req.query;
    
    const account = await prisma.account.findFirst({
      where: { id, tenantId: req.tenantId! }
    });
    
    if (!account) {
      throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Account not found');
    }
    
    // Get balance as of specific date or current
    const whereClause: any = { 
      accountId: id, 
      tenantId: req.tenantId! 
    };
    
    if (asOf) {
      whereClause.entry = {
        date: { lte: new Date(asOf as string) }
      };
    }
    
    const journalLines = await prisma.journalLine.findMany({
      where: whereClause,
      include: {
        entry: {
          select: { date: true, memo: true, reference: true }
        }
      },
      orderBy: { entry: { date: 'asc' } }
    });
    
    const balance = journalLines.reduce((acc, line) => {
      return acc + Number(line.debit) - Number(line.credit);
    }, 0);
    
    res.json({
      accountId: id,
      accountCode: account.code,
      accountName: account.name,
      balance,
      asOf: asOf || new Date().toISOString(),
      transactionCount: journalLines.length
    });
  });
}

