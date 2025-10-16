import { Router } from 'express';
import { salesAccountingIntegration } from '../services/sales-accounting-integration.js';
import { TenantRequest } from '../tenant.js';
import { prisma } from '../prisma.js';

export function mountSalesAccountingRoutes(router: Router) {
  
  // Test route to verify mounting
  router.get('/test', (req, res) => {
    res.json({ message: 'Sales accounting routes are working!', timestamp: new Date().toISOString() });
  });
  
  /**
   * Process invoice payment and create accounting entries
   * POST /api/sales-accounting/process-payment/:invoiceId
   */
  router.post('/process-payment/:invoiceId', async (req: TenantRequest, res) => {
    try {
      const { invoiceId } = req.params;
      const { tenantId } = req;

      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant ID required' });
      }

      const result = await salesAccountingIntegration.processInvoicePayment(invoiceId, tenantId);

      res.json({
        success: true,
        message: 'Invoice payment processed successfully',
        data: result
      });
    } catch (error: any) {
      console.error('Error processing invoice payment:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process invoice payment'
      });
    }
  });

  /**
   * Get accounting entries for an invoice
   * GET /api/sales-accounting/invoice/:invoiceId/entries
   */
  router.get('/invoice/:invoiceId/entries', async (req: TenantRequest, res) => {
    try {
      const { invoiceId } = req.params;
      const { tenantId } = req;

      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant ID required' });
      }

      // Get journal entries related to this invoice
      const journalEntries = await prisma.journalEntry.findMany({
        where: {
          tenantId,
          reference: { contains: invoiceId }
        },
        include: {
          lines: {
            include: {
              account: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: journalEntries
      });
    } catch (error: any) {
      console.error('Error fetching invoice accounting entries:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch accounting entries'
      });
    }
  });

  /**
   * Test journal entry logic
   * GET /api/sales-accounting/test-logic
   */
  router.get('/test-logic', async (req: TenantRequest, res) => {
    try {
      await salesAccountingIntegration.testJournalEntryLogic();
      
      res.json({
        success: true,
        message: 'Journal entry logic test completed. Check server logs for results.'
      });
    } catch (error: any) {
      console.error('Error testing journal entry logic:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to test journal entry logic'
      });
    }
  });

  /**
   * Get inventory movements for an invoice
   * GET /api/sales-accounting/invoice/:invoiceId/inventory-movements
   */
  router.get('/invoice/:invoiceId/inventory-movements', async (req: TenantRequest, res) => {
    try {
      const { invoiceId } = req.params;
      const { tenantId } = req;

      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant ID required' });
      }

      // Get inventory movements related to this invoice
      const movements = await prisma.inventoryMovement.findMany({
        where: {
          tenantId,
          reference: { contains: invoiceId }
        },
        include: {
          product: true
        }
      });

      res.json({
        success: true,
        data: movements
      });
    } catch (error: any) {
      console.error('Error fetching inventory movements:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch inventory movements'
      });
    }
  });
}
