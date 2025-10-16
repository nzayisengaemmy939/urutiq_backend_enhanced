import express from 'express';
import { z } from 'zod';
import { customReportBuilderService } from '../services/custom-report-builder.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
const router = express.Router();
// Validation schemas
const reportTemplateSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    category: z.enum(['FINANCIAL', 'OPERATIONAL', 'COMPLIANCE', 'CUSTOM']),
    isPublic: z.boolean().default(false),
    config: z.object({
        dataSource: z.string().min(1),
        filters: z.array(z.any()).default([]),
        columns: z.array(z.any()).default([]),
        grouping: z.array(z.any()).default([]),
        sorting: z.array(z.any()).default([]),
        formatting: z.any(),
        charts: z.array(z.any()).default([]),
        layout: z.any()
    })
});
const customReportSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    templateId: z.string().optional(),
    config: z.any(),
    isPublic: z.boolean().default(false),
    isScheduled: z.boolean().default(false),
    scheduleConfig: z.any().optional(),
    createdBy: z.string().min(1)
});
// Template Management
router.get('/custom-report-builder/:companyId/templates', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { category, isPublic } = req.query;
        const templates = await customReportBuilderService.getTemplates(companyId);
        res.json({
            success: true,
            data: templates
        });
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch templates',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/custom-report-builder/:companyId/templates', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const templateData = reportTemplateSchema.parse(req.body);
        const template = await customReportBuilderService.createTemplate({
            ...templateData,
            createdBy: req.user?.sub || 'demo-user-id'
        });
        res.status(201).json({
            success: true,
            data: template
        });
    }
    catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create template',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Data Sources
router.get('/custom-report-builder/:companyId/data-sources', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const dataSources = await customReportBuilderService.getDataSources(companyId);
        res.json({
            success: true,
            data: dataSources
        });
    }
    catch (error) {
        console.error('Error fetching data sources:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch data sources',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Custom Reports
router.get('/custom-report-builder/:companyId/reports', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { isPublic } = req.query;
        const reports = await customReportBuilderService.getReports(companyId);
        res.json({
            success: true,
            data: reports
        });
    }
    catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch reports',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/custom-report-builder/:companyId/reports', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { companyId } = req.params;
        const reportData = customReportSchema.parse(req.body);
        const report = await customReportBuilderService.createReport(companyId, {
            ...reportData,
            companyId
        });
        res.status(201).json({
            success: true,
            data: report
        });
    }
    catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create report',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Report Generation
router.post('/custom-report-builder/:companyId/reports/:reportId/generate', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { reportId } = req.params;
        const { parameters } = req.body;
        const reportData = await customReportBuilderService.generateReport(reportId, parameters);
        res.json({
            success: true,
            data: reportData
        });
    }
    catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate report',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Report Export
router.post('/custom-report-builder/:companyId/reports/:reportId/export', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { reportId } = req.params;
        const { format } = req.body;
        const exportData = await customReportBuilderService.exportReport(reportId, format);
        res.json({
            success: true,
            data: exportData
        });
    }
    catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export report',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Report Validation
router.post('/custom-report-builder/:companyId/validate', authMiddleware, tenantMiddleware, async (req, res) => {
    try {
        const { config } = req.body;
        const validation = await customReportBuilderService.validateReportConfig(config);
        res.json({
            success: true,
            data: validation
        });
    }
    catch (error) {
        console.error('Error validating report config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate report config',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
export default router;
