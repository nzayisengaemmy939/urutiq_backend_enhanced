import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma } from './prisma.js';
import {
  financialReportCreate,
  financialReportUpdate,
  reportItemCreate,
  reportItemUpdate,
  reportScheduleCreate,
  reportScheduleUpdate,
  reportTemplateCreate,
  reportExecutionCreate,
  reportQuery,
  reportBuilderPreviewRequest,
  reportBuilderTemplateSave
} from './validate.js';
import { TenantRequest } from './tenant.js';
import { authMiddleware } from './auth.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import { IncomingWebhook } from '@slack/webhook';
import { Parser } from 'expr-eval';
import { addCompanyLogoToPDF, getCompanyForPDF } from '../utils/pdf-logo-helper';

const router = Router();
const prisma = new PrismaClient();

// Minimal audit helper
async function audit(tenantId: string | undefined, userId: string | undefined, action: string, meta?: any) {
  try {
    await prisma.auditLog?.create?.({
      data: { tenantId: tenantId || 'unknown', userId: userId || 'system', action, details: meta ? JSON.stringify(meta) : null }
    } as any);
  } catch {}
}

// Helper function to calculate report data
async function calculateReportData(reportId: string, companyId: string, parameters?: any) {
  const report = await prisma.financialReport.findUnique({
    where: { id: reportId },
    include: {
      reportItems: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!report) {
    throw new Error('Report not found');
  }

  const result: any = {
    report: {
      id: report.id,
      name: report.name,
      type: report.type,
      description: report.description
    },
    items: [],
    summary: {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0
    },
    generatedAt: new Date().toISOString()
  };

  for (const item of report.reportItems) {
    let value = 0;
    let details: any[] = [];

    switch (item.type) {
      case 'account':
        if (item.accountIds) {
          const accountIds = item.accountIds.split(',').map(id => id.trim());
          const accounts = await prisma.account.findMany({
            where: {
              id: { in: accountIds },
              companyId: companyId
            },
            include: {
              accountType: true,
              journalEntries: {
                include: {
                  journal: true
                }
              }
            }
          });

          const hasDateRange = parameters?.startDate || parameters?.endDate;
          const startDate = parameters?.startDate ? new Date(parameters.startDate) : undefined;
          const endDate = parameters?.endDate ? new Date(parameters.endDate) : undefined;

          value = accounts.reduce((sum, account) => {
            const balance = account.journalEntries.reduce((acc, entry) => {
              // dimension filters
              if (parameters?.department && entry.department !== parameters.department) return acc;
              if (parameters?.project && entry.project !== parameters.project) return acc;
              if (parameters?.location && entry.location !== parameters.location) return acc;
              // date filters on related journal
              if (hasDateRange) {
                const d = entry.journal?.date ? new Date(entry.journal.date as any) : undefined;
                if (startDate && d && d < startDate) return acc;
                if (endDate && d && d > endDate) return acc;
              }
              return acc + (entry.journal.type === 'debit' ? entry.amount : -entry.amount);
            }, 0);
            return sum + balance;
          }, 0);

          details = accounts.map(account => ({
            id: account.id,
            name: account.name,
            code: account.code,
            type: account.accountType.name,
            balance: account.journalEntries.reduce((acc, entry) => {
              if (parameters?.department && entry.department !== parameters.department) return acc;
              if (parameters?.project && entry.project !== parameters.project) return acc;
              if (parameters?.location && entry.location !== parameters.location) return acc;
              if (hasDateRange) {
                const d = entry.journal?.date ? new Date(entry.journal.date as any) : undefined;
                if (startDate && d && d < startDate) return acc;
                if (endDate && d && d > endDate) return acc;
              }
              return acc + (entry.journal.type === 'debit' ? entry.amount : -entry.amount);
            }, 0)
          }));
        }
        break;

      case 'calculation':
        if (item.formula) {
          // Simple formula evaluation - in production, use a proper expression parser
          try {
            // This is a simplified implementation
            value = eval(item.formula);
          } catch (error) {
            console.error('Formula evaluation error:', error);
            value = 0;
          }
        }
        break;

      case 'text':
        value = item.name;
        break;

      case 'chart':
        // Chart data would be generated here
        value = 'chart_data';
        break;
      case 'pivot': {
        const cfg: any = item.configuration ? JSON.parse(item.configuration) : { groupBy: 'type' };
        const groupKey = String(cfg.groupBy || 'type');
        const dimKeys = ['department','project','location'];
        // If grouping by dimensions, fetch journal lines for provided accountIds in config
        if (dimKeys.includes(groupKey) && Array.isArray(cfg.accountIds) && cfg.accountIds.length > 0) {
          const lines = await prisma.journalLine.findMany({
            where: { accountId: { in: cfg.accountIds } },
            include: { entry: true }
          });
          const groups: Record<string, number> = {};
          for (const l of lines) {
            const key = String(((l as any)[groupKey]) || 'Unspecified');
            const amt = Number(l.debit || 0) - Number(l.credit || 0);
            groups[key] = (groups[key] || 0) + amt;
          }
          value = groups;
        } else {
          // Fallback to grouping account details (type/code/name)
          if (details && Array.isArray(details) && details.length > 0) {
            const groups: Record<string, number> = {};
            for (const d of details) {
              const key = String(d[groupKey] || d.type || 'Other');
              const amt = Number(d.balance || 0);
              groups[key] = (groups[key] || 0) + amt;
            }
            value = groups;
          } else {
            value = {};
          }
        }
        break;
      }
    }

    result.items.push({
      id: item.id,
      name: item.name,
      type: item.type,
      order: item.order,
      value: value,
      details: details,
      configuration: item.configuration ? JSON.parse(item.configuration) : null
    });
  }

  // Calculate summary based on report type
  if (report.type === 'balance_sheet') {
    result.summary.totalAssets = result.items
      .filter((item: any) => item.type === 'account' && item.details.some((d: any) => d.type === 'Asset'))
      .reduce((sum: number, item: any) => sum + Math.abs(item.value), 0);
    
    result.summary.totalLiabilities = result.items
      .filter((item: any) => item.type === 'account' && item.details.some((d: any) => d.type === 'Liability'))
      .reduce((sum: number, item: any) => sum + Math.abs(item.value), 0);
    
    result.summary.totalEquity = result.items
      .filter((item: any) => item.type === 'account' && item.details.some((d: any) => d.type === 'Equity'))
      .reduce((sum: number, item: any) => sum + Math.abs(item.value), 0);
  } else if (report.type === 'income_statement') {
    result.summary.totalRevenue = result.items
      .filter((item: any) => item.type === 'account' && item.details.some((d: any) => d.type === 'Revenue'))
      .reduce((sum: number, item: any) => sum + Math.abs(item.value), 0);
    
    result.summary.totalExpenses = result.items
      .filter((item: any) => item.type === 'account' && item.details.some((d: any) => d.type === 'Expense'))
      .reduce((sum: number, item: any) => sum + Math.abs(item.value), 0);
    
    result.summary.netIncome = result.summary.totalRevenue - result.summary.totalExpenses;
  }

  return result;
}

// Helper: calculate from ad-hoc builder spec (without saving)
async function calculateReportDataFromSpec(spec: any, companyId: string) {
  const result: any = {
    report: {
      id: 'preview',
      name: spec.name,
      type: spec.type,
      description: spec.description
    },
    items: [],
    summary: {
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0
    },
    generatedAt: new Date().toISOString()
  };

  for (const item of spec.items) {
    let value = 0;
    let details: any[] = [];

    switch (item.type) {
      case 'account': {
        if (item.accountIds && item.accountIds.length > 0) {
          const accounts = await prisma.account.findMany({
            where: {
              id: { in: item.accountIds },
              companyId: companyId
            },
            include: {
              accountType: true,
              journalEntries: { include: { journal: true } }
            }
          });

          value = accounts.reduce((sum, account) => {
            const balance = account.journalEntries.reduce((acc, entry) => {
              return acc + (entry.journal.type === 'debit' ? entry.amount : -entry.amount);
            }, 0);
            return sum + balance;
          }, 0);

          details = accounts.map(account => ({
            id: account.id,
            name: account.name,
            code: account.code,
            type: account.accountType.name,
            balance: account.journalEntries.reduce((acc, entry) => {
              return acc + (entry.journal.type === 'debit' ? entry.amount : -entry.amount);
            }, 0)
          }));
        }
        break;
      }
      case 'calculation': {
        if (item.formula) {
          try {
            const parser = new Parser();
            // Context can resolve references to previous items by name
            const vars: Record<string, number> = {};
            for (const existing of result.items) {
              if (existing && typeof existing.value === 'number' && existing.name) {
                const key = existing.name.replace(/[^a-zA-Z0-9_]/g, '_');
                vars[key] = existing.value;
              }
            }
            // Common helpers
            const helpers: Record<string, any> = {
              sum: (...nums: number[]) => nums.reduce((a, b) => a + b, 0),
              abs: Math.abs,
              max: Math.max,
              min: Math.min,
              round: Math.round,
            };
            const expr = parser.parse(item.formula);
            value = Number(expr.evaluate({ ...helpers, ...vars })) || 0;
          } catch (_e) {
            value = 0;
          }
        }
        break;
      }
      case 'text':
        value = item.name;
        break;
      case 'chart':
        value = 'chart_data';
        break;
      case 'pivot': {
        const cfg = (item as any).configuration || { groupBy: 'type' };
        if (Array.isArray(details) && details.length > 0) {
          const groups: Record<string, number> = {};
          for (const d of details) {
            const key = String(d[cfg.groupBy] ?? 'Other');
            const amt = Number(d.balance || 0);
            groups[key] = (groups[key] || 0) + amt;
          }
          value = groups;
        } else {
          value = {};
        }
        break;
      }
    }

    result.items.push({
      id: item.id || '',
      name: item.name,
      type: item.type,
      order: item.order ?? 0,
      value,
      details,
      configuration: item.configuration ?? null
    });
  }

  if (spec.type === 'balance_sheet') {
    result.summary.totalAssets = result.items
      .filter((it: any) => it.type === 'account' && it.details.some((d: any) => d.type === 'Asset'))
      .reduce((sum: number, it: any) => sum + Math.abs(it.value), 0);
    result.summary.totalLiabilities = result.items
      .filter((it: any) => it.type === 'account' && it.details.some((d: any) => d.type === 'Liability'))
      .reduce((sum: number, it: any) => sum + Math.abs(it.value), 0);
    result.summary.totalEquity = result.items
      .filter((it: any) => it.type === 'account' && it.details.some((d: any) => d.type === 'Equity'))
      .reduce((sum: number, it: any) => sum + Math.abs(it.value), 0);
  } else if (spec.type === 'income_statement') {
    result.summary.totalRevenue = result.items
      .filter((it: any) => it.type === 'account' && it.details.some((d: any) => d.type === 'Revenue'))
      .reduce((sum: number, it: any) => sum + Math.abs(it.value), 0);
    result.summary.totalExpenses = result.items
      .filter((it: any) => it.type === 'account' && it.details.some((d: any) => d.type === 'Expense'))
      .reduce((sum: number, it: any) => sum + Math.abs(it.value), 0);
    result.summary.netIncome = result.summary.totalRevenue - result.summary.totalExpenses;
  }

  return result;
}

// Helper: generate binary/text output
async function generateReportOutput(format: 'pdf' | 'excel' | 'csv' | 'json', data: any): Promise<{ contentType: string; buffer: Buffer }> {
  switch (format) {
    case 'json': {
      const buf = Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
      return { contentType: 'application/json', buffer: buf };
    }
    case 'csv': {
      const headers = ['id','name','type','order','value'];
      const rows = Array.isArray(data?.items) ? data.items : [];
      const lines = [headers.join(',')].concat(
        rows.map((r: any) => headers.map(h => JSON.stringify(r?.[h] ?? '')).join(','))
      );
      const buf = Buffer.from(lines.join('\n'), 'utf-8');
      return { contentType: 'text/csv', buffer: buf };
    }
    case 'excel': {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Report');
      ws.columns = [
        { header: 'ID', key: 'id', width: 32 },
        { header: 'Name', key: 'name', width: 40 },
        { header: 'Type', key: 'type', width: 16 },
        { header: 'Order', key: 'order', width: 10 },
        { header: 'Value', key: 'value', width: 20 }
      ];
      (data?.items || []).forEach((it: any) => ws.addRow({ id: it.id, name: it.name, type: it.type, order: it.order, value: it.value }));
      const buf = await wb.xlsx.writeBuffer();
      return { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(buf) };
    }
    case 'pdf': {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      return await new Promise(async (resolve, reject) => {
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve({ contentType: 'application/pdf', buffer: Buffer.concat(chunks) }));
        doc.on('error', reject);
        
        // Add company logo if companyId is available
        if (data?.companyId) {
          const company = await getCompanyForPDF('tenant_demo', data.companyId); // Using default tenant for now
          if (company?.logoUrl) {
            await addCompanyLogoToPDF(doc, company, 40, 40, 50, 50);
          }
        }
        
        // Adjust Y position based on whether logo was added
        const titleY = data?.companyId ? 100 : 40;
        
        doc.fontSize(18).text(String(data?.report?.name || 'Report'), { underline: true });
        doc.moveDown();
        doc.fontSize(12).text(`Type: ${String(data?.report?.type || '')}`);
        doc.moveDown();
        doc.text('Items:');
        (data?.items || []).forEach((it: any, idx: number) => {
          doc.text(`${idx + 1}. ${it.name} [${it.type}] = ${String(it.value)}`);
        });
        doc.end();
      });
    }
  }
}

// POST /reports/:id/deliver - execute and deliver via channels
router.post('/:id/deliver', async (req: TenantRequest, res) => {
  try {
    const { companyId, tenantId, userId } = req;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

    const { format = 'pdf', channels = {}, parameters } = req.body || {};
    // Compute data
    const data = await calculateReportData(id, companyId, parameters);
    const { contentType, buffer } = await generateReportOutput(format, data);

    const filenameBase = (data?.report?.name || 'report').toString().replace(/[^a-z0-9_-]+/ig, '_');
    const filename = `${filenameBase}.${format === 'excel' ? 'xlsx' : (format === 'json' ? 'json' : (format === 'csv' ? 'csv' : 'pdf'))}`;

    const deliveries: any = {};

    // Email delivery
    if (channels.email && Array.isArray(channels.email.recipients) && channels.email.recipients.length) {
      const transporter = nodemailer.createTransport(process.env.SMTP_URL || { jsonTransport: true });
      const mail = await transporter.sendMail({
        from: process.env.REPORTS_FROM_EMAIL || 'reports@urutiIQ.local',
        to: channels.email.recipients.join(','),
        subject: channels.email.subject || `Report: ${data?.report?.name}`,
        text: channels.email.body || 'Attached report',
        attachments: [{ filename, content: buffer, contentType }]
      });
      deliveries.email = { ok: true, id: (mail as any).messageId || true };
    }

    // Slack delivery
    if (channels.slack && channels.slack.webhookUrl) {
      try {
        const webhook = new IncomingWebhook(channels.slack.webhookUrl);
        const text = `Report ${data?.report?.name} (${format}) generated at ${new Date().toISOString()}`;
        await webhook.send({ text });
        deliveries.slack = { ok: true };
      } catch (e) {
        deliveries.slack = { ok: false, error: (e as Error).message };
      }
    }

    // Generic webhook delivery
    if (channels.webhook && channels.webhook.url) {
      try {
        const resp = await fetch(channels.webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(channels.webhook.headers || {})
          },
          body: JSON.stringify({
            filename,
            contentType,
            data: format === 'json' ? JSON.parse(buffer.toString('utf-8')) : undefined,
            contentBase64: format !== 'json' ? buffer.toString('base64') : undefined,
            meta: { reportId: id, generatedAt: new Date().toISOString() }
          })
        });
        deliveries.webhook = { ok: resp.ok, status: resp.status };
      } catch (e) {
        deliveries.webhook = { ok: false, error: (e as Error).message };
      }
    }

    await audit(tenantId, userId, 'report_deliver', { reportId: id, format, channels: Object.keys(channels) });

    const noChannels = !channels.email && !channels.slack && !channels.webhook;
    if (noChannels) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }

    res.json({ status: 'delivered', deliveries, filename, contentType });
  } catch (error) {
    console.error('Error delivering report:', error);
    res.status(500).json({ error: 'Failed to deliver report' });
  }
});

// Drill-down lineage endpoints
router.get('/:id/items/:itemId/lineage', async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id, itemId } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

    const item = await prisma.reportItem.findFirst({ where: { id: itemId, reportId: id }, include: { report: true } });
    if (!item) return res.status(404).json({ error: 'Report item not found' });

    if (item.type !== 'account' || !item.accountIds) {
      return res.json({ itemId, type: item.type, lineage: [] });
    }

    const accountIds = item.accountIds.split(',').map(s => s.trim()).filter(Boolean);
    const lines = await prisma.journalLine.findMany({
      where: { accountId: { in: accountIds }, tenantId: (req as any).tenantId },
      include: { entry: true, account: true },
      orderBy: { entry: { date: 'desc' } },
      take: 200
    });
    const lineage = lines.map(l => ({
      accountId: l.accountId,
      accountCode: (l as any).account?.code,
      accountName: (l as any).account?.name,
      date: (l as any).entry?.date,
      memo: (l as any).entry?.memo,
      debit: Number(l.debit),
      credit: Number(l.credit)
    }));

    res.json({ itemId, type: item.type, lineage });
  } catch (e) {
    console.error('Error fetching lineage:', e);
    res.status(500).json({ error: 'Failed to fetch lineage' });
  }
});

router.get('/:id/items/:itemId/audit', async (req: TenantRequest, res) => {
  try {
    const { id, itemId } = req.params;
    // Placeholder: return recent executions referencing this report/item
    const executions = await prisma.reportExecution.findMany({
      where: { reportId: id },
      orderBy: { executedAt: 'desc' },
      take: 20
    });
    res.json({ itemId, executions });
  } catch (e) {
    console.error('Error fetching audit:', e);
    res.status(500).json({ error: 'Failed to fetch audit' });
  }
});

// GET /reports - List financial reports
router.get('/', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req: TenantRequest, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const query = reportQuery.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const where: any = {
      companyId: companyId
    };

    if (query.type) where.type = query.type;
    if (query.isTemplate !== undefined) where.isTemplate = query.isTemplate;
    if (query.isPublic !== undefined) where.isPublic = query.isPublic;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } }
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.financialReport.findMany({
        where,
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          reportItems: {
            orderBy: { order: 'asc' }
          },
          _count: {
            select: {
              reportItems: true,
              reportSchedules: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.limit
      }),
      prisma.financialReport.count({ where })
    ]);

    // If no reports exist, simply return the empty list without creating defaults

    res.json({
      reports,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// POST /reports - Create financial report
router.post('/', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req: TenantRequest, res) => {
  try {
    const { companyId } = req.query;
    const userId = req.user?.sub;
    
    if (!companyId || !userId) {
      return res.status(400).json({ error: 'Company ID and User ID are required' });
    }

    const data = financialReportCreate.parse(req.body);
    
    const report = await prisma.financialReport.create({
      data: {
        ...data,
        companyId: companyId as string,
        createdBy: userId,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create report items if provided
    if (data.items && data.items.length > 0) {
      const items = data.items.map((item, index) => ({
        ...item,
        reportId: report.id,
        order: item.order ?? index,
        configuration: item.configuration ? JSON.stringify(item.configuration) : null
      }));

      await prisma.reportItem.createMany({
        data: items
      });
    }

    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// GET /reports/:id - Get financial report
router.get('/:id', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const report = await prisma.financialReport.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reportItems: {
          orderBy: { order: 'asc' }
        },
        reportSchedules: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// PUT /reports/:id - Update financial report
router.put('/:id', async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const data = financialReportUpdate.parse(req.body);

    const report = await prisma.financialReport.updateMany({
      where: {
        id,
        companyId
      },
      data: {
        ...data,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined
      }
    });

    if (report.count === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: 'Report updated successfully' });
  } catch (error) {
    console.error('Error updating report:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// DELETE /reports/:id - Delete financial report
router.delete('/:id', async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const report = await prisma.financialReport.deleteMany({
      where: {
        id,
        companyId
      }
    });

    if (report.count === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// Test route to verify router is working
// Removed test/debug utility routes

// POST /reports/:id/execute - Execute financial report
router.post('/:id/execute', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req: TenantRequest, res) => {
  try {
    const { companyId } = req.query;
    const { id } = req.params;
    const userId = req.user?.sub;

    if (!companyId || !userId) {
      return res.status(400).json({ error: 'Company ID and User ID are required' });
    }

    const data = reportExecutionCreate.parse(req.body);

    // Verify the report exists
    const report = await prisma.financialReport.findFirst({
      where: { id, companyId: companyId as string }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Get the actual user from database
    const user = await prisma.appUser.findUnique({ 
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please ensure you are properly authenticated.' });
    }

    // Create execution record
    const execution = await prisma.reportExecution.create({
      data: {
        reportId: id,
        executedBy: user.id,
        parameters: data.parameters ? JSON.stringify(data.parameters) : null,
        status: 'processing'
      }
    });

    try {
      // Calculate report data
      const result = await calculateReportData(id, companyId as string, data.parameters);

      // Update execution record with result
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          result: JSON.stringify(result),
          status: 'success'
        }
      });

      res.json({
        executionId: execution.id,
        status: 'success',
        data: result
      });
    } catch (error) {
      // Update execution record with error
      await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  } catch (error) {
    console.error('Error executing report:', error);
    res.status(500).json({ error: 'Failed to execute report' });
  }
});

// GET /reports/executions - Get all report executions for a company
router.get('/executions', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req: TenantRequest, res) => {
  try {
    const { companyId } = req.query;
    const { page = 1, limit = 50, status } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      report: {
        companyId: companyId as string
      }
    };

    if (status) {
      where.status = status as string;
    }

    const [executions, total] = await Promise.all([
      prisma.reportExecution.findMany({
        where,
        include: {
          executedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          report: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: { executedAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.reportExecution.count({ where })
    ]);

    // No sample data creation in production cleanup

    res.json({
      data: executions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

// GET /reports/:id/executions - Get report executions
router.get('/:id/executions', async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Verify report exists and belongs to company
    const report = await prisma.financialReport.findFirst({
      where: { id, companyId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const [executions, total] = await Promise.all([
      prisma.reportExecution.findMany({
        where: { reportId: id },
        include: {
          executedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { executedAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.reportExecution.count({
        where: { reportId: id }
      })
    ]);

    res.json({
      executions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

// Schedules: list
router.get('/:id/schedules', async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

    const report = await prisma.financialReport.findFirst({ where: { id, companyId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const schedules = await prisma.reportSchedule.findMany({
      where: { reportId: id },
      orderBy: { nextRun: 'asc' }
    });
    res.json({ data: schedules });
  } catch (error) {
    console.error('Error listing schedules:', error);
    res.status(500).json({ error: 'Failed to list schedules' });
  }
});

// Schedules: create
router.post('/:id/schedules', async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

    const report = await prisma.financialReport.findFirst({ where: { id, companyId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const body = reportScheduleCreate.parse(req.body);
    const created = await prisma.reportSchedule.create({
      data: {
        reportId: id,
        name: body.name,
        frequency: body.frequency,
        nextRun: new Date(body.nextRun),
        recipients: body.recipients ?? null,
        format: body.format,
        isActive: body.isActive
      }
    });
    res.status(201).json({ data: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Schedules: update
router.put('/:id/schedules/:scheduleId', async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id, scheduleId } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

    const report = await prisma.financialReport.findFirst({ where: { id, companyId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const body = reportScheduleUpdate.parse(req.body);
    const updated = await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        name: body.name ?? undefined,
        frequency: body.frequency ?? undefined,
        nextRun: body.nextRun ? new Date(body.nextRun) : undefined,
        recipients: body.recipients ?? undefined,
        format: body.format ?? undefined,
        isActive: body.isActive ?? undefined
      }
    });
    res.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Schedules: delete
router.delete('/:id/schedules/:scheduleId', async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id, scheduleId } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

    const report = await prisma.financialReport.findFirst({ where: { id, companyId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    await prisma.reportSchedule.delete({ where: { id: scheduleId } });
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// POST /reports/:id/items - Add report item
router.post('/:id/items', async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const data = reportItemCreate.parse(req.body);

    // Verify report exists and belongs to company
    const report = await prisma.financialReport.findFirst({
      where: { id, companyId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const item = await prisma.reportItem.create({
      data: {
        ...data,
        reportId: id,
        configuration: data.configuration ? JSON.stringify(data.configuration) : null
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating report item:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create report item' });
  }
});

// PUT /reports/:id/items/:itemId - Update report item
router.put('/:id/items/:itemId', async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id, itemId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const data = reportItemUpdate.parse(req.body);

    // Verify report exists and belongs to company
    const report = await prisma.financialReport.findFirst({
      where: { id, companyId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const item = await prisma.reportItem.updateMany({
      where: {
        id: itemId,
        reportId: id
      },
      data: {
        ...data,
        configuration: data.configuration ? JSON.stringify(data.configuration) : undefined
      }
    });

    if (item.count === 0) {
      return res.status(404).json({ error: 'Report item not found' });
    }

    res.json({ message: 'Report item updated successfully' });
  } catch (error) {
    console.error('Error updating report item:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update report item' });
  }
});

// DELETE /reports/:id/items/:itemId - Delete report item
router.delete('/:id/items/:itemId', async (req: TenantRequest, res) => {
  try {
    const { companyId } = req;
    const { id, itemId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Verify report exists and belongs to company
    const report = await prisma.financialReport.findFirst({
      where: { id, companyId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const item = await prisma.reportItem.deleteMany({
      where: {
        id: itemId,
        reportId: id
      }
    });

    if (item.count === 0) {
      return res.status(404).json({ error: 'Report item not found' });
    }

    res.json({ message: 'Report item deleted successfully' });
  } catch (error) {
    console.error('Error deleting report item:', error);
    res.status(500).json({ error: 'Failed to delete report item' });
  }
});

// GET /reports/templates - List report templates
router.get('/templates', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req: TenantRequest, res) => {
  try {
    const { type, category, page = 1, limit = 20 } = req.query;

    const where: any = {
      OR: [
        { isPublic: true },
        { createdBy: req.user?.sub }
      ]
    };

    if (type) where.type = type;
    if (category) where.category = category;

    const skip = (Number(page) - 1) * Number(limit);

    const [templates, total] = await Promise.all([
      prisma.reportTemplate.findMany({
        where,
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.reportTemplate.count({ where })
    ]);

    // If no templates exist, create some default ones
    if (templates.length === 0 && req.user?.sub) {
      const defaultTemplates = [
        {
          name: 'Standard Balance Sheet',
          type: 'balance_sheet',
          category: 'Standard',
          description: 'Standard balance sheet template with assets, liabilities, and equity',
          configuration: JSON.stringify({
            sections: [
              { name: 'Current Assets', type: 'asset', accounts: ['cash', 'accounts_receivable', 'inventory'] },
              { name: 'Fixed Assets', type: 'asset', accounts: ['equipment', 'buildings'] },
              { name: 'Current Liabilities', type: 'liability', accounts: ['accounts_payable', 'accrued_expenses'] },
              { name: 'Long-term Liabilities', type: 'liability', accounts: ['long_term_debt'] },
              { name: 'Equity', type: 'equity', accounts: ['common_stock', 'retained_earnings'] }
            ]
          }),
          isPublic: true,
          createdBy: req.user?.sub
        },
        {
          name: 'Standard Income Statement',
          type: 'income_statement',
          category: 'Standard',
          description: 'Standard income statement template with revenue, expenses, and net income',
          configuration: JSON.stringify({
            sections: [
              { name: 'Revenue', type: 'revenue', accounts: ['sales_revenue', 'service_revenue'] },
              { name: 'Cost of Goods Sold', type: 'expense', accounts: ['direct_materials', 'direct_labor'] },
              { name: 'Operating Expenses', type: 'expense', accounts: ['salaries', 'rent', 'utilities'] },
              { name: 'Other Income/Expenses', type: 'other', accounts: ['interest_income', 'interest_expense'] }
            ]
          }),
          isPublic: true,
          createdBy: req.user?.sub
        },
        {
          name: 'Cash Flow Statement',
          type: 'cash_flow',
          category: 'Standard',
          description: 'Standard cash flow statement template',
          configuration: JSON.stringify({
            sections: [
              { name: 'Operating Activities', type: 'operating', accounts: ['net_income', 'depreciation'] },
              { name: 'Investing Activities', type: 'investing', accounts: ['equipment_purchases', 'investments'] },
              { name: 'Financing Activities', type: 'financing', accounts: ['debt_issuance', 'dividends'] }
            ]
          }),
          isPublic: true,
          createdBy: req.user?.sub
        }
      ];

      // Create default templates
      for (const template of defaultTemplates) {
        await prisma.reportTemplate.create({
          data: template
        });
      }

      // Re-fetch templates after creating defaults
      const [newTemplates, newTotal] = await Promise.all([
        prisma.reportTemplate.findMany({
          where,
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.reportTemplate.count({ where })
      ]);

      return res.json({
        templates: newTemplates,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: newTotal,
          pages: Math.ceil(newTotal / Number(limit))
        }
      });
    }

    res.json({
      templates,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /reports/templates - Create report template
router.post('/templates', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), async (req: TenantRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const data = reportTemplateCreate.parse(req.body);

    const template = await prisma.reportTemplate.create({
      data: {
        ...data,
        createdBy: userId,
        configuration: JSON.stringify(data.configuration)
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// POST /reports/builder/preview - Preview report from builder spec without persisting
router.post('/builder/preview', async (req: TenantRequest, res) => {
  try {
    const parsed = reportBuilderPreviewRequest.parse(req.body);
    const { companyId } = parsed;
    const result = await calculateReportDataFromSpec(parsed.spec, companyId);
    res.json({ status: 'ok', data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error in builder preview:', error);
    res.status(500).json({ error: 'Failed to preview report' });
  }
});

// POST /reports/builder/templates - Save builder spec as a template
router.post('/builder/templates', async (req: TenantRequest, res) => {
  try {
    const { userId } = req;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const parsed = reportBuilderTemplateSave.parse(req.body);

    const configuration = JSON.stringify(parsed.spec);

    const template = await prisma.reportTemplate.create({
      data: {
        name: parsed.name,
        type: parsed.type,
        category: parsed.category,
        description: parsed.description,
        configuration,
        isPublic: parsed.isPublic,
        createdBy: userId
      }
    });

    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error saving builder template:', error);
    res.status(500).json({ error: 'Failed to save builder template' });
  }
});


export default router;
