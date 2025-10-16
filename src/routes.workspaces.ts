import { Router } from 'express';
import { prisma } from './prisma';
import { authMiddleware } from './auth';
import { validateBody } from './validate';
import { workspaceSchemas, fileSchemas, notificationSchemas } from './validate';
import { createMulter, tenantCompanyDir, computeSha256 } from './storage';
import path from 'node:path';
import fs from 'node:fs';
import type { TenantRequest } from './tenant';
const requireAuth = authMiddleware(process.env.JWT_SECRET || 'dev-secret');

export function mountWorkspaceRoutes(router: Router) {
  // Workspaces
  router.get('/workspaces', requireAuth, async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    if (!companyId) return res.status(400).json({ error: 'company_required' });
    const rows = await prisma.workspace.findMany({
      where: { tenantId: req.tenantId!, companyId },
      include: { members: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rows);
  });

  router.post('/workspaces', requireAuth, validateBody(workspaceSchemas.workspaceCreate), async (req: TenantRequest, res) => {
    const { companyId, name, description } = req.body as any;
    const created = await prisma.workspace.create({ data: { tenantId: req.tenantId!, companyId, name, description } });
    res.status(201).json(created);
  });

  router.put('/workspaces/:id', requireAuth, validateBody(workspaceSchemas.workspaceUpdate), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const updated = await prisma.workspace.update({ where: { id, tenantId: req.tenantId! }, data: req.body as any });
    res.json(updated);
  });

  router.delete('/workspaces/:id', requireAuth, async (req: TenantRequest, res) => {
    const { id } = req.params;
    await prisma.workspace.delete({ where: { id, tenantId: req.tenantId! } });
    res.status(204).send();
  });

  // Workspace Members
  router.get('/workspaces/:id/members', requireAuth, async (req: TenantRequest, res) => {
    const { id } = req.params;
    const rows = await prisma.workspaceMember.findMany({ where: { tenantId: req.tenantId!, workspaceId: id }, include: { user: { select: { name: true, email: true, role: true } } } });
    res.json(rows);
  });

  router.post('/workspaces/:id/members', requireAuth, validateBody(workspaceSchemas.memberAdd), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { userId, role } = req.body as any;
    const created = await prisma.workspaceMember.create({ data: { tenantId: req.tenantId!, workspaceId: id, userId, role } });
    res.status(201).json(created);
  });

  router.delete('/workspaces/:id/members/:memberId', requireAuth, async (req: TenantRequest, res) => {
    const { memberId } = req.params;
    await prisma.workspaceMember.delete({ where: { id: memberId, tenantId: req.tenantId! } });
    res.status(204).send();
  });

  // Files (metadata)
  router.get('/files', requireAuth, async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const workspaceId = String(req.query.workspaceId || '');
    const where: any = { tenantId: req.tenantId! };
    if (companyId) where.companyId = companyId;
    if (workspaceId) where.workspaceId = workspaceId;
    const files = await prisma.fileAsset.findMany({ where, orderBy: { uploadedAt: 'desc' } });
    res.json(files);
  });

  router.post('/files', requireAuth, validateBody(fileSchemas.fileCreate), async (req: TenantRequest, res) => {
    const { companyId, workspaceId, name, mimeType, sizeBytes, storageKey, sha256 } = req.body as any;
    const created = await prisma.fileAsset.create({ data: { tenantId: req.tenantId!, companyId, workspaceId, name, mimeType, sizeBytes, storageKey, sha256, uploaderId: req.user!.id } });
    res.status(201).json(created);
  });

  // File upload via multipart/form-data; field name: file
  router.post('/files/upload', requireAuth, async (req: TenantRequest, res, next) => {
    try {
      const companyId = String(req.body?.companyId || req.query.companyId || '');
      const workspaceId = String(req.body?.workspaceId || req.query.workspaceId || '');
      if (!companyId) return res.status(400).json({ error: 'company_required' });
      const upload = createMulter(req.tenantId!, companyId).single('file');
      upload(req as any, res as any, async (err: any) => {
        if (err) return next(err);
        const file = (req as any).file as any;
        if (!file) return res.status(400).json({ error: 'file_required' });
        const absPath = file.path;
        const sha = await computeSha256(absPath);
        const storageKey = path.relative(path.resolve(process.cwd(), 'uploads'), absPath).replace(/\\/g, '/');
        const uploaderId = String(req.user!.id);
        const created = await prisma.fileAsset.create({
          data: {
            tenantId: req.tenantId!,
            companyId,
            workspaceId: workspaceId || null,
            name: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            storageKey,
            sha256: sha,
            uploaderId
          }
        });
        res.status(201).json(created);
      });
    } catch (e) { next(e); }
  });

  // Notifications
  router.get('/notifications', requireAuth, async (req: TenantRequest, res) => {
    const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
    const where: any = { tenantId: req.tenantId!, userId: req.user!.id };
    if (isRead !== undefined) where.isRead = isRead;
    const rows = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(rows);
  });

  router.post('/notifications', requireAuth, validateBody(notificationSchemas.notifyCreate), async (req: TenantRequest, res) => {
    const { companyId, userId, type, title, body } = req.body as any;
    const created = await prisma.notification.create({ data: { tenantId: req.tenantId!, companyId: companyId || null, userId, type, title, body } });
    res.status(201).json(created);
  });

  router.put('/notifications/:id', requireAuth, validateBody(notificationSchemas.notifyUpdate), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const updated = await prisma.notification.update({ where: { id, tenantId: req.tenantId! }, data: req.body as any });
    res.json(updated);
  });

  router.post('/notifications/:id/read', requireAuth, async (req: TenantRequest, res) => {
    const { id } = req.params;
    const updated = await prisma.notification.update({ where: { id, tenantId: req.tenantId! }, data: { isRead: true } });
    res.json(updated);
  });

  // File download by id
  router.get('/files/:id/download', requireAuth, async (req: TenantRequest, res) => {
    const { id } = req.params;
    const meta = await prisma.fileAsset.findFirst({ where: { id, tenantId: req.tenantId! } });
    if (!meta) return res.status(404).json({ error: 'not_found' });
    const root = path.resolve(process.cwd(), 'uploads');
    const abs = path.join(root, meta.storageKey);
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'file_missing' });
    res.setHeader('Content-Type', meta.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${meta.name}"`);
    fs.createReadStream(abs).pipe(res);
  });
}
