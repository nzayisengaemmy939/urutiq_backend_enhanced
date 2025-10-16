import { Router } from 'express';
import { prisma } from './prisma.js';
import { authMiddleware } from './auth.js';
import { validateBody } from './validate.js';
import { collaborationSchemas } from './validate.js';
import type { TenantRequest } from './tenant.js';
const requireAuth = authMiddleware(process.env.JWT_SECRET || 'dev-secret');

export function mountCollaborationRoutes(router: Router) {
  // Client Portal Access
  router.get('/client-access', requireAuth, async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const userId = String(req.query.userId || '');
    
    const where: any = { tenantId: req.tenantId! };
    if (companyId) where.companyId = companyId;
    if (userId) where.userId = userId;
    
    const access = await prisma.clientPortalAccess.findMany({
      where,
      include: {
        company: { select: { name: true } },
        user: { select: { name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(access);
  });

  router.post('/client-access', requireAuth, validateBody(collaborationSchemas.clientAccessCreate), async (req: TenantRequest, res) => {
    const { companyId, userId, permissions, isActive } = req.body as any;
    const created = await prisma.clientPortalAccess.create({
      data: {
        tenantId: req.tenantId!,
        companyId,
        userId,
        permissions: JSON.stringify(permissions),
        isActive
      }
    });
    res.status(201).json(created);
  });

  router.put('/client-access/:id', requireAuth, validateBody(collaborationSchemas.clientAccessUpdate), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const updates = req.body as any;
    
    // Convert permissions array to JSON string if provided
    if (updates.permissions) {
      updates.permissions = JSON.stringify(updates.permissions);
    }
    
    const updated = await prisma.clientPortalAccess.update({
      where: { id, tenantId: req.tenantId! },
      data: updates
    });
    res.json(updated);
  });

  router.delete('/client-access/:id', requireAuth, async (req: TenantRequest, res) => {
    const { id } = req.params;
    await prisma.clientPortalAccess.delete({ where: { id, tenantId: req.tenantId! } });
    res.status(204).send();
  });

  // Messages
  router.get('/messages', requireAuth, async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const conversationWith = String(req.query.conversationWith || '');
    const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;
    
    const where: any = { tenantId: req.tenantId! };
    if (companyId) where.companyId = companyId;
    if (isRead !== undefined) where.isRead = isRead;
    
    // Get messages where user is sender or receiver
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user?.sub },
          { receiverId: req.user?.sub }
        ],
        ...where
      },
      include: {
        company: { select: { name: true } },
        sender: { select: { name: true, email: true } },
        receiver: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Filter by conversation if specified
    let filteredMessages = messages;
    if (conversationWith) {
      filteredMessages = messages.filter(m => 
        m.senderId === conversationWith || m.receiverId === conversationWith
      );
    }
    
    res.json(filteredMessages);
  });

  router.post('/messages', requireAuth, validateBody(collaborationSchemas.messageCreate), async (req: TenantRequest, res) => {
    const { companyId, receiverId, messageText } = req.body as any;
    
    try {
      // Validate that the company exists
      const company = await prisma.company.findFirst({
        where: { id: companyId, tenantId: req.tenantId! }
      });
      
      if (!company) {
        return res.status(400).json({ error: 'Company not found' });
      }
      
      // Validate that the receiver exists
      const receiver = await prisma.appUser.findFirst({
        where: { id: receiverId, tenantId: req.tenantId! }
      });
      
      if (!receiver) {
        return res.status(400).json({ error: 'Receiver not found' });
      }
      
      // Validate that the sender exists
      const sender = await prisma.appUser.findFirst({
        where: { id: req.user?.sub!, tenantId: req.tenantId! }
      });
      
      if (!sender) {
        return res.status(400).json({ error: 'Sender not found' });
      }
      
      const created = await prisma.message.create({
        data: {
          tenantId: req.tenantId!,
          companyId,
          senderId: req.user?.sub!,
          receiverId,
          messageText
        }
      });
      
      res.status(201).json(created);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Message creation error:', error);
      res.status(500).json({ error: errorMessage });
    }
  });

  router.put('/messages/:id', requireAuth, validateBody(collaborationSchemas.messageUpdate), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const updates = req.body as any;
    
    // Only allow updating own messages or marking received messages as read
    const message = await prisma.message.findFirst({
      where: { id, tenantId: req.tenantId! }
    });
    
    if (!message) return res.status(404).json({ error: 'not_found' });
    
    // Can only edit message text if sender, can mark as read if receiver
    if (updates.messageText && message.senderId !== req.user?.sub) {
      return res.status(403).json({ error: 'forbidden' });
    }
    
    const updated = await prisma.message.update({
      where: { id, tenantId: req.tenantId! },
      data: updates
    });
    res.json(updated);
  });

  router.delete('/messages/:id', requireAuth, async (req: TenantRequest, res) => {
    const { id } = req.params;
    
    // Only allow deleting own messages
    const message = await prisma.message.findFirst({
      where: { id, tenantId: req.tenantId! }
    });
    
    if (!message) return res.status(404).json({ error: 'not_found' });
    if (message.senderId !== req.user?.sub) {
      return res.status(403).json({ error: 'forbidden' });
    }
    
    await prisma.message.delete({ where: { id, tenantId: req.tenantId! } });
    res.status(204).send();
  });

  // Tasks
  router.get('/tasks', requireAuth, async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const assignedTo = String(req.query.assignedTo || '');
    const taskType = String(req.query.taskType || '');
    const status = String(req.query.status || '');
    const priority = String(req.query.priority || '');
    
    const where: any = { tenantId: req.tenantId! };
    if (companyId) where.companyId = companyId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (taskType) where.taskType = taskType;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    const tasks = await prisma.task.findMany({
      where,
      include: {
        company: { select: { name: true } },
        assignedUser: { select: { name: true, email: true, role: true } }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ]
    });
    res.json(tasks);
  });

  router.post('/tasks', requireAuth, validateBody(collaborationSchemas.taskCreate), async (req: TenantRequest, res) => {
    const { companyId, assignedTo, taskType, title, description, dueDate, priority } = req.body as any;
    const created = await prisma.task.create({
      data: {
        tenantId: req.tenantId!,
        companyId,
        assignedTo,
        taskType,
        title,
        description,
        dueDate: new Date(dueDate),
        priority
      }
    });
    res.status(201).json(created);
  });

  router.put('/tasks/:id', requireAuth, validateBody(collaborationSchemas.taskUpdate), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const updates = req.body as any;
    
    // Convert dueDate string to Date if provided
    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate);
    }
    
    const updated = await prisma.task.update({
      where: { id, tenantId: req.tenantId! },
      data: updates
    });
    res.json(updated);
  });

  router.delete('/tasks/:id', requireAuth, async (req: TenantRequest, res) => {
    const { id } = req.params;
    await prisma.task.delete({ where: { id, tenantId: req.tenantId! } });
    res.status(204).send();
  });

  // Helper endpoint to get unread message count
  router.get('/messages/unread-count', requireAuth, async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    
    const where: any = { 
      tenantId: req.tenantId!,
      receiverId: req.user?.sub,
      isRead: false
    };
    if (companyId) where.companyId = companyId;
    
    const count = await prisma.message.count({ where });
    res.json({ unreadCount: count });
  });

  // Helper endpoint to get overdue tasks
  router.get('/tasks/overdue', requireAuth, async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    
    const where: any = { 
      tenantId: req.tenantId!,
      dueDate: { lt: new Date() },
      status: { not: 'completed' }
    };
    if (companyId) where.companyId = companyId;
    
    const overdueTasks = await prisma.task.findMany({
      where,
      include: {
        company: { select: { name: true } },
        assignedUser: { select: { name: true, email: true } }
      },
      orderBy: { dueDate: 'asc' }
    });
    res.json(overdueTasks);
  });

  // Helper endpoint to get users for a company
  router.get('/company-users/:companyId', requireAuth, async (req: TenantRequest, res) => {
    const { companyId } = req.params;
    
    try {
      // Get users who have portal access to this company
      const portalAccess = await prisma.clientPortalAccess.findMany({
        where: {
          tenantId: req.tenantId!,
          companyId,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });
      
      const users = portalAccess.map(access => access.user);
      
      // If no portal users exist, return current user as fallback
      if (users.length === 0) {
        const currentUser = await prisma.appUser.findUnique({
          where: { id: req.user?.sub! },
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        });
        
        if (currentUser) {
          users.push(currentUser);
        }
      }
      
      res.json(users);
    } catch (error) {
      console.error('Error getting company users:', error);
      res.status(500).json({ error: 'Failed to get company users' });
    }
  });
}
