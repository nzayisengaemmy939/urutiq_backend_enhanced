import express from 'express';
import { authMiddleware, requireRoles } from '../auth.js';
import type { TenantRequest } from '../tenant.js';
import { asyncHandler } from '../errors.js';
import { creditNotesService } from '../services/credit-notes.service.js';

const router = express.Router();

// Get all credit notes for a company
router.get('/credit-notes/:companyId',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId } = req.params;
    const rows = await creditNotesService.list(req.user?.sub || 'demo-tenant-id', companyId);
    res.json({ success: true, data: rows });
  })
);

// Get specific credit note
router.get('/credit-notes/:companyId/:id',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { id } = req.params;
    const creditNote = await creditNotesService.getById(req.user?.sub || 'demo-tenant-id', id);
    if (!creditNote) {
      return res.status(404).json({ success: false, error: 'Credit note not found' });
    }
    res.json({ success: true, data: creditNote });
  })
);

// Create new credit note
router.post('/credit-notes/:companyId',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { companyId } = req.params;
    const created = await creditNotesService.create(req.user?.sub || 'demo-tenant-id', companyId, req.body, req.user?.sub);
    res.status(201).json({ success: true, data: created });
  })
);

// Update credit note
router.put('/credit-notes/:companyId/:id',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { id } = req.params;
    const updated = await creditNotesService.update(req.user?.sub || 'demo-tenant-id', id, req.body);
    res.json({ success: true, data: updated });
  })
);

// Delete credit note
router.delete('/credit-notes/:companyId/:id',
  authMiddleware(process.env.JWT_SECRET || 'dev-secret'),
  requireRoles(['admin', 'accountant']),
  asyncHandler(async (req: TenantRequest, res: any) => {
    const { id } = req.params;
    await creditNotesService.delete(req.user?.sub || 'demo-tenant-id', id);
    res.json({ success: true, message: 'Credit note deleted successfully' });
  })
);

export default router;


