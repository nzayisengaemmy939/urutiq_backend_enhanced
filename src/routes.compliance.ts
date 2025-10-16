import { Router } from 'express';
import { prisma } from './prisma.js';
import { authMiddleware } from './auth.js';
import { validateBody } from './validate.js';
import { complianceSchemas } from './validate.js';
import type { TenantRequest } from './tenant.js';
const requireAuth = authMiddleware(process.env.JWT_SECRET || 'dev-secret');

export function mountComplianceRoutes(router: Router) {
  // Tax Rates
  router.get('/tax-rates', requireAuth, async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    if (!companyId) return res.status(400).json({ error: 'company_required' });
    
    const taxRates = await prisma.taxRate.findMany({
      where: { tenantId: req.tenantId!, companyId },
      orderBy: { taxName: 'asc' }
    });
    res.json(taxRates);
  });

  router.post('/tax-rates', requireAuth, validateBody(complianceSchemas.taxRateCreate), async (req: TenantRequest, res) => {
    const { companyId, taxName, rate, appliesTo, isActive } = req.body as any;
    const created = await prisma.taxRate.create({
      data: { tenantId: req.tenantId!, companyId, taxName, rate, appliesTo, isActive }
    });
    res.status(201).json(created);
  });

  router.put('/tax-rates/:id', requireAuth, validateBody(complianceSchemas.taxRateUpdate), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const updates = req.body as any;
    const updated = await prisma.taxRate.update({
      where: { id, tenantId: req.tenantId! },
      data: updates
    });
    res.json(updated);
  });

  router.delete('/tax-rates/:id', requireAuth, async (req: TenantRequest, res) => {
    const { id } = req.params;
    await prisma.taxRate.delete({ where: { id, tenantId: req.tenantId! } });
    res.status(204).send();
  });

  // Reports
  router.get('/reports', requireAuth, async (req: TenantRequest, res) => {
    const companyId = String(req.query.companyId || '');
    const reportType = String(req.query.reportType || '');
    if (!companyId) return res.status(400).json({ error: 'company_required' });
    
    const where: any = { tenantId: req.tenantId!, companyId };
    if (reportType) where.reportType = reportType;
    
    const reports = await prisma.report.findMany({
      where,
      orderBy: { generatedAt: 'desc' }
    });
    res.json(reports);
  });

  router.post('/reports', requireAuth, validateBody(complianceSchemas.reportGenerate), async (req: TenantRequest, res) => {
    const { companyId, reportType, parameters, createdBy } = req.body as any;
    
    // For now, create a stub report. In production, this would generate actual reports
    const report = await prisma.report.create({
      data: {
        tenantId: req.tenantId!,
        companyId,
        reportType,
        parameters: parameters ? JSON.stringify(parameters) : null,
        createdBy,
        status: 'generated',
        fileUrl: `/reports/${Date.now()}-${reportType.toLowerCase().replace(/\s+/g, '-')}.pdf`
      }
    });
    
    res.status(201).json(report);
  });

  router.get('/reports/:id', requireAuth, async (req: TenantRequest, res) => {
    const { id } = req.params;
    const report = await prisma.report.findFirst({
      where: { id, tenantId: req.tenantId! }
    });
    if (!report) return res.status(404).json({ error: 'not_found' });
    res.json(report);
  });

  // PUT /reports/:id - Update compliance report
  router.put('/reports/:id', requireAuth, validateBody(complianceSchemas.reportGenerate), async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const { companyId, reportType, parameters, createdBy } = req.body as any;
      
      // Check if report exists
      const existingReport = await prisma.report.findFirst({
        where: { id, tenantId: req.tenantId! }
      });
      
      if (!existingReport) {
        return res.status(404).json({ error: 'not_found', message: 'Report not found' });
      }
      
      // Update the report
      const updatedReport = await prisma.report.update({
        where: { id },
        data: {
          reportType,
          parameters: JSON.stringify(parameters),
          createdBy,
          generatedAt: new Date()
        }
      });
      
      res.json(updatedReport);
    } catch (error) {
      console.error('Error updating report:', error);
      res.status(500).json({ error: 'failed_to_update_report', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // DELETE /reports/:id - Delete compliance report
  router.delete('/reports/:id', requireAuth, async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      
      // Check if report exists
      const existingReport = await prisma.report.findFirst({
        where: { id, tenantId: req.tenantId! }
      });
      
      if (!existingReport) {
        return res.status(404).json({ error: 'not_found', message: 'Report not found' });
      }
      
      // Delete the report
      await prisma.report.delete({
        where: { id }
      });
      
      res.status(204).send(); // No content response for successful deletion
    } catch (error) {
      console.error('Error deleting report:', error);
      res.status(500).json({ error: 'failed_to_delete_report', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Test endpoint to verify route is working
  router.get('/reports/test', async (req: TenantRequest, res) => {
    console.log('✅ PDF route test endpoint hit');
    res.json({ message: 'PDF route is working', timestamp: new Date().toISOString() });
  });

  // Serve PDF files from reports
  router.get('/reports/:filename', async (req: TenantRequest, res) => {
    const tenantId = req.headers['x-tenant-id'] as string || req.query.tenantId as string || 'tenant_demo';
    
    console.log('🔧 PDF Request:', {
      path: req.path,
      query: req.query,
      headers: req.headers,
      tenantId: tenantId
    });
    
    try {
      // Extract filename from route parameter
      const filename = req.params.filename;
      if (!filename || !filename.endsWith('.pdf')) {
        console.log('❌ Invalid filename:', filename);
        return res.status(400).json({ error: 'invalid_filename', filename: filename });
      }

      console.log('🔧 Serving PDF:', filename, 'for tenant:', tenantId);

      // For now, we'll create a simple PDF response
      // In production, you would serve actual PDF files from storage
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Report: ${filename}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', pdfContent.length);
      res.send(pdfContent);
      
    } catch (error) {
      console.error('❌ Error serving PDF:', error);
      console.error('❌ Request details:', {
        path: req.path,
        params: req.params,
        query: req.query,
        headers: req.headers
      });
      res.status(500).json({ 
        error: 'failed_to_serve_pdf',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          path: req.path,
          params: req.params,
          query: req.query
        }
      });
    }
  });

  // Audit Logs
  router.get('/audit-logs', requireAuth, async (req: TenantRequest, res) => {
    const userId = String(req.query.userId || '');
    const entityType = String(req.query.entityType || '');
    const entityId = String(req.query.entityId || '');
    
    const where: any = { tenantId: req.tenantId! };
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { timestamp: 'desc' }
    });
    res.json(auditLogs);
  });

  router.post('/audit-logs', requireAuth, validateBody(complianceSchemas.auditLogCreate), async (req: TenantRequest, res) => {
    const { userId, action, entityType, entityId, ipAddress, userAgent } = req.body as any;
    const created = await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId,
        action,
        entityType,
        entityId,
        ipAddress,
        userAgent
      }
    });
    res.status(201).json(created);
  });

  // Helper endpoint to log common actions
  router.post('/audit-logs/action', requireAuth, async (req: TenantRequest, res) => {
    const { userId, action, entityType, entityId } = req.body as any;
    if (!userId || !action) return res.status(400).json({ error: 'missing_required_fields' });
    
    const created = await prisma.auditLog.create({
      data: {
        tenantId: req.tenantId!,
        userId,
        action,
        entityType,
        entityId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    res.status(201).json(created);
  });
}
