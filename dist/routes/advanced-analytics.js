import express from 'express';
import { AdvancedAnalyticsService } from '../services/advanced-analytics';
const router = express.Router();
const analyticsService = new AdvancedAnalyticsService();
// Predictive Analytics
router.post('/predictive-models/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const modelData = req.body;
        const model = await analyticsService.createPredictiveModel({
            ...modelData,
            companyId
        });
        res.json({ success: true, data: model });
    }
    catch (error) {
        console.error('Error creating predictive model:', error);
        res.status(500).json({ success: false, error: 'Failed to create predictive model' });
    }
});
router.get('/predictive-models/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const models = await analyticsService.getPredictiveModels(companyId);
        res.json({ success: true, data: models });
    }
    catch (error) {
        console.error('Error getting predictive models:', error);
        res.status(500).json({ success: false, error: 'Failed to get predictive models' });
    }
});
router.post('/predictive-models/:modelId/train', async (req, res) => {
    try {
        const { modelId } = req.params;
        const model = await analyticsService.trainModel(modelId);
        res.json({ success: true, data: model });
    }
    catch (error) {
        console.error('Error training model:', error);
        res.status(500).json({ success: false, error: 'Failed to train model' });
    }
});
router.post('/predictions/:modelId', async (req, res) => {
    try {
        const { modelId } = req.params;
        const { targetDate } = req.body;
        const prediction = await analyticsService.generatePrediction(modelId, new Date(targetDate));
        res.json({ success: true, data: prediction });
    }
    catch (error) {
        console.error('Error generating prediction:', error);
        res.status(500).json({ success: false, error: 'Failed to generate prediction' });
    }
});
router.get('/predictions/:modelId', async (req, res) => {
    try {
        const { modelId } = req.params;
        const predictions = await analyticsService.getPredictions(modelId);
        res.json({ success: true, data: predictions });
    }
    catch (error) {
        console.error('Error getting predictions:', error);
        res.status(500).json({ success: false, error: 'Failed to get predictions' });
    }
});
// Dashboard Management
router.post('/dashboards/:companyId/:userId', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const dashboardData = req.body;
        const dashboard = await analyticsService.createDashboard({
            ...dashboardData,
            companyId,
            userId
        });
        res.json({ success: true, data: dashboard });
    }
    catch (error) {
        console.error('Error creating dashboard:', error);
        res.status(500).json({ success: false, error: 'Failed to create dashboard' });
    }
});
router.get('/dashboards/:companyId/:userId', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const dashboards = await analyticsService.getUserDashboards(companyId, userId);
        res.json({ success: true, data: dashboards });
    }
    catch (error) {
        console.error('Error getting dashboards:', error);
        res.status(500).json({ success: false, error: 'Failed to get dashboards' });
    }
});
router.put('/dashboards/:dashboardId', async (req, res) => {
    try {
        const { dashboardId } = req.params;
        const updates = req.body;
        const dashboard = await analyticsService.updateDashboard(dashboardId, updates);
        res.json({ success: true, data: dashboard });
    }
    catch (error) {
        console.error('Error updating dashboard:', error);
        res.status(500).json({ success: false, error: 'Failed to update dashboard' });
    }
});
router.post('/dashboards/:dashboardId/widgets', async (req, res) => {
    try {
        const { dashboardId } = req.params;
        const widget = req.body;
        const dashboard = await analyticsService.addWidgetToDashboard(dashboardId, widget);
        res.json({ success: true, data: dashboard });
    }
    catch (error) {
        console.error('Error adding widget to dashboard:', error);
        res.status(500).json({ success: false, error: 'Failed to add widget to dashboard' });
    }
});
// Business Intelligence
router.post('/business-intelligence/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const biData = req.body;
        const bi = await analyticsService.createBusinessIntelligence({
            ...biData,
            companyId
        });
        res.json({ success: true, data: bi });
    }
    catch (error) {
        console.error('Error creating business intelligence:', error);
        res.status(500).json({ success: false, error: 'Failed to create business intelligence' });
    }
});
router.get('/business-intelligence/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const bi = await analyticsService.getBusinessIntelligence(companyId);
        res.json({ success: true, data: bi });
    }
    catch (error) {
        console.error('Error getting business intelligence:', error);
        res.status(500).json({ success: false, error: 'Failed to get business intelligence' });
    }
});
router.post('/business-intelligence/:biId/evaluate', async (req, res) => {
    try {
        const { biId } = req.params;
        const result = await analyticsService.evaluateBI(biId);
        res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('Error evaluating business intelligence:', error);
        res.status(500).json({ success: false, error: 'Failed to evaluate business intelligence' });
    }
});
// Benchmarking
router.post('/benchmarks/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const benchmarkData = req.body;
        const benchmark = await analyticsService.createBenchmark({
            ...benchmarkData,
            companyId
        });
        res.json({ success: true, data: benchmark });
    }
    catch (error) {
        console.error('Error creating benchmark:', error);
        res.status(500).json({ success: false, error: 'Failed to create benchmark' });
    }
});
router.get('/benchmarks/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const benchmarks = await analyticsService.getBenchmarks(companyId);
        res.json({ success: true, data: benchmarks });
    }
    catch (error) {
        console.error('Error getting benchmarks:', error);
        res.status(500).json({ success: false, error: 'Failed to get benchmarks' });
    }
});
router.put('/benchmarks/:benchmarkId/value', async (req, res) => {
    try {
        const { benchmarkId } = req.params;
        const { value } = req.body;
        const benchmark = await analyticsService.updateBenchmarkValue(benchmarkId, value);
        res.json({ success: true, data: benchmark });
    }
    catch (error) {
        console.error('Error updating benchmark value:', error);
        res.status(500).json({ success: false, error: 'Failed to update benchmark value' });
    }
});
// Real-time Monitoring
router.get('/real-time-metrics/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const metrics = await analyticsService.getRealTimeMetrics(companyId);
        res.json({ success: true, data: metrics });
    }
    catch (error) {
        console.error('Error getting real-time metrics:', error);
        res.status(500).json({ success: false, error: 'Failed to get real-time metrics' });
    }
});
// Analytics Insights
router.get('/insights/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { limit } = req.query;
        const insights = await analyticsService.getRecentInsights(companyId, limit ? parseInt(limit) : 10);
        res.json({ success: true, data: insights });
    }
    catch (error) {
        console.error('Error getting insights:', error);
        res.status(500).json({ success: false, error: 'Failed to get insights' });
    }
});
router.post('/insights/:companyId/generate', async (req, res) => {
    try {
        const { companyId } = req.params;
        const insights = await analyticsService.generateInsights(companyId);
        res.json({ success: true, data: insights });
    }
    catch (error) {
        console.error('Error generating insights:', error);
        res.status(500).json({ success: false, error: 'Failed to generate insights' });
    }
});
// Analytics Reports
router.post('/reports/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const reportData = req.body;
        const report = await analyticsService.createAnalyticsReport({
            ...reportData,
            companyId
        });
        res.json({ success: true, data: report });
    }
    catch (error) {
        console.error('Error creating analytics report:', error);
        res.status(500).json({ success: false, error: 'Failed to create analytics report' });
    }
});
router.post('/reports/:reportId/generate', async (req, res) => {
    try {
        const { reportId } = req.params;
        const report = await analyticsService.generateReport(reportId);
        res.json({ success: true, data: report });
    }
    catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ success: false, error: 'Failed to generate report' });
    }
});
router.get('/reports/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const reports = await analyticsService.getAnalyticsReports(companyId);
        res.json({ success: true, data: reports });
    }
    catch (error) {
        console.error('Error getting analytics reports:', error);
        res.status(500).json({ success: false, error: 'Failed to get analytics reports' });
    }
});
// Analytics Stats
router.get('/stats/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const stats = await analyticsService.getAnalyticsStats(companyId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        console.error('Error getting analytics stats:', error);
        res.status(500).json({ success: false, error: 'Failed to get analytics stats' });
    }
});
// Dashboard Templates
router.get('/dashboard-templates', async (req, res) => {
    try {
        const templates = [
            {
                id: 'executive_dashboard',
                name: 'Executive Dashboard',
                description: 'High-level overview of key business metrics',
                layout: {
                    type: 'grid',
                    columns: 3,
                    rows: 3,
                    positions: [
                        { widgetId: 'revenue_metric', x: 0, y: 0, width: 1, height: 1 },
                        { widgetId: 'profit_chart', x: 1, y: 0, width: 2, height: 2 },
                        { widgetId: 'cash_flow_gauge', x: 0, y: 1, width: 1, height: 1 },
                        { widgetId: 'kpi_table', x: 1, y: 2, width: 2, height: 1 }
                    ]
                },
                widgets: [
                    {
                        id: 'revenue_metric',
                        type: 'metric',
                        title: 'Total Revenue',
                        dataSource: 'financial_data',
                        configuration: { format: 'currency' },
                        refreshInterval: 300
                    },
                    {
                        id: 'profit_chart',
                        type: 'chart',
                        title: 'Profit Trend',
                        dataSource: 'financial_data',
                        configuration: { chartType: 'line', timeRange: '3M' },
                        refreshInterval: 600
                    },
                    {
                        id: 'cash_flow_gauge',
                        type: 'gauge',
                        title: 'Cash Flow',
                        dataSource: 'financial_data',
                        configuration: { min: 0, max: 100000, thresholds: [30000, 60000] },
                        refreshInterval: 300
                    },
                    {
                        id: 'kpi_table',
                        type: 'table',
                        title: 'Key Performance Indicators',
                        dataSource: 'kpi_data',
                        configuration: { columns: ['Metric', 'Value', 'Target', 'Status'] },
                        refreshInterval: 900
                    }
                ]
            },
            {
                id: 'operational_dashboard',
                name: 'Operational Dashboard',
                description: 'Detailed operational metrics and performance indicators',
                layout: {
                    type: 'grid',
                    columns: 4,
                    rows: 4,
                    positions: [
                        { widgetId: 'transaction_volume', x: 0, y: 0, width: 2, height: 1 },
                        { widgetId: 'processing_time', x: 2, y: 0, width: 2, height: 1 },
                        { widgetId: 'error_rate', x: 0, y: 1, width: 1, height: 1 },
                        { widgetId: 'uptime_metric', x: 1, y: 1, width: 1, height: 1 },
                        { widgetId: 'performance_chart', x: 2, y: 1, width: 2, height: 2 },
                        { widgetId: 'alerts_panel', x: 0, y: 2, width: 2, height: 2 }
                    ]
                },
                widgets: [
                    {
                        id: 'transaction_volume',
                        type: 'metric',
                        title: 'Transaction Volume',
                        dataSource: 'transaction_data',
                        configuration: { format: 'number' },
                        refreshInterval: 60
                    },
                    {
                        id: 'processing_time',
                        type: 'metric',
                        title: 'Avg Processing Time',
                        dataSource: 'performance_data',
                        configuration: { format: 'duration' },
                        refreshInterval: 60
                    },
                    {
                        id: 'error_rate',
                        type: 'gauge',
                        title: 'Error Rate',
                        dataSource: 'error_data',
                        configuration: { min: 0, max: 100, thresholds: [5, 10] },
                        refreshInterval: 60
                    },
                    {
                        id: 'uptime_metric',
                        type: 'metric',
                        title: 'System Uptime',
                        dataSource: 'system_data',
                        configuration: { format: 'percentage' },
                        refreshInterval: 300
                    },
                    {
                        id: 'performance_chart',
                        type: 'chart',
                        title: 'Performance Trends',
                        dataSource: 'performance_data',
                        configuration: { chartType: 'area', timeRange: '24H' },
                        refreshInterval: 300
                    },
                    {
                        id: 'alerts_panel',
                        type: 'table',
                        title: 'Active Alerts',
                        dataSource: 'alert_data',
                        configuration: { columns: ['Time', 'Severity', 'Message', 'Status'] },
                        refreshInterval: 30
                    }
                ]
            },
            {
                id: 'financial_dashboard',
                name: 'Financial Dashboard',
                description: 'Comprehensive financial analysis and reporting',
                layout: {
                    type: 'grid',
                    columns: 3,
                    rows: 4,
                    positions: [
                        { widgetId: 'revenue_chart', x: 0, y: 0, width: 2, height: 2 },
                        { widgetId: 'expense_breakdown', x: 2, y: 0, width: 1, height: 2 },
                        { widgetId: 'profit_margin', x: 0, y: 2, width: 1, height: 1 },
                        { widgetId: 'cash_flow_forecast', x: 1, y: 2, width: 2, height: 2 }
                    ]
                },
                widgets: [
                    {
                        id: 'revenue_chart',
                        type: 'chart',
                        title: 'Revenue Trends',
                        dataSource: 'financial_data',
                        configuration: { chartType: 'line', timeRange: '12M' },
                        refreshInterval: 3600
                    },
                    {
                        id: 'expense_breakdown',
                        type: 'chart',
                        title: 'Expense Breakdown',
                        dataSource: 'financial_data',
                        configuration: { chartType: 'pie', categories: ['Salaries', 'Rent', 'Utilities', 'Supplies'] },
                        refreshInterval: 3600
                    },
                    {
                        id: 'profit_margin',
                        type: 'metric',
                        title: 'Profit Margin',
                        dataSource: 'financial_data',
                        configuration: { format: 'percentage' },
                        refreshInterval: 3600
                    },
                    {
                        id: 'cash_flow_forecast',
                        type: 'chart',
                        title: 'Cash Flow Forecast',
                        dataSource: 'forecast_data',
                        configuration: { chartType: 'bar', timeRange: '6M' },
                        refreshInterval: 7200
                    }
                ]
            }
        ];
        res.json({ success: true, data: templates });
    }
    catch (error) {
        console.error('Error getting dashboard templates:', error);
        res.status(500).json({ success: false, error: 'Failed to get dashboard templates' });
    }
});
// Widget Templates
router.get('/widget-templates', async (req, res) => {
    try {
        const templates = [
            {
                id: 'revenue_metric',
                type: 'metric',
                title: 'Revenue Metric',
                dataSource: 'financial_data',
                configuration: {
                    format: 'currency',
                    color: 'green',
                    icon: 'trending-up'
                }
            },
            {
                id: 'profit_chart',
                type: 'chart',
                title: 'Profit Chart',
                dataSource: 'financial_data',
                configuration: {
                    chartType: 'line',
                    timeRange: '3M',
                    colors: ['#10B981']
                }
            },
            {
                id: 'cash_flow_gauge',
                type: 'gauge',
                title: 'Cash Flow Gauge',
                dataSource: 'financial_data',
                configuration: {
                    min: 0,
                    max: 100000,
                    thresholds: [30000, 60000],
                    colors: ['#EF4444', '#F59E0B', '#10B981']
                }
            },
            {
                id: 'kpi_table',
                type: 'table',
                title: 'KPI Table',
                dataSource: 'kpi_data',
                configuration: {
                    columns: ['Metric', 'Value', 'Target', 'Status'],
                    sortable: true,
                    pagination: true
                }
            },
            {
                id: 'alert_panel',
                type: 'custom',
                title: 'Alert Panel',
                dataSource: 'alert_data',
                configuration: {
                    refreshInterval: 30,
                    maxAlerts: 10,
                    severityColors: {
                        low: '#10B981',
                        medium: '#F59E0B',
                        high: '#EF4444',
                        critical: '#DC2626'
                    }
                }
            }
        ];
        res.json({ success: true, data: templates });
    }
    catch (error) {
        console.error('Error getting widget templates:', error);
        res.status(500).json({ success: false, error: 'Failed to get widget templates' });
    }
});
// Report Templates
router.get('/report-templates', async (req, res) => {
    try {
        const templates = [
            {
                id: 'executive_summary',
                name: 'Executive Summary Report',
                description: 'Monthly executive summary with key metrics and insights',
                type: 'executive',
                sections: [
                    {
                        id: 'summary_metrics',
                        title: 'Key Metrics Summary',
                        type: 'metric',
                        order: 1
                    },
                    {
                        id: 'revenue_analysis',
                        title: 'Revenue Analysis',
                        type: 'chart',
                        order: 2
                    },
                    {
                        id: 'expense_breakdown',
                        title: 'Expense Breakdown',
                        type: 'chart',
                        order: 3
                    },
                    {
                        id: 'insights_summary',
                        title: 'Key Insights',
                        type: 'text',
                        order: 4
                    }
                ],
                schedule: 'monthly',
                recipients: ['executives@company.com']
            },
            {
                id: 'operational_report',
                name: 'Operational Performance Report',
                description: 'Weekly operational metrics and performance indicators',
                type: 'operational',
                sections: [
                    {
                        id: 'performance_metrics',
                        title: 'Performance Metrics',
                        type: 'table',
                        order: 1
                    },
                    {
                        id: 'trend_analysis',
                        title: 'Trend Analysis',
                        type: 'chart',
                        order: 2
                    },
                    {
                        id: 'alerts_summary',
                        title: 'Alerts Summary',
                        type: 'table',
                        order: 3
                    }
                ],
                schedule: 'weekly',
                recipients: ['operations@company.com']
            },
            {
                id: 'financial_statement',
                name: 'Financial Statement Report',
                description: 'Comprehensive financial analysis and statements',
                type: 'financial',
                sections: [
                    {
                        id: 'income_statement',
                        title: 'Income Statement',
                        type: 'table',
                        order: 1
                    },
                    {
                        id: 'balance_sheet',
                        title: 'Balance Sheet',
                        type: 'table',
                        order: 2
                    },
                    {
                        id: 'cash_flow_statement',
                        title: 'Cash Flow Statement',
                        type: 'table',
                        order: 3
                    },
                    {
                        id: 'financial_ratios',
                        title: 'Financial Ratios',
                        type: 'table',
                        order: 4
                    }
                ],
                schedule: 'monthly',
                recipients: ['finance@company.com']
            }
        ];
        res.json({ success: true, data: templates });
    }
    catch (error) {
        console.error('Error getting report templates:', error);
        res.status(500).json({ success: false, error: 'Failed to get report templates' });
    }
});
// Quick Actions
router.post('/quick-actions/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const { action, data } = req.body;
        let result;
        switch (action) {
            case 'generate_insights':
                result = await analyticsService.generateInsights(companyId);
                break;
            case 'get_real_time_metrics':
                result = await analyticsService.getRealTimeMetrics(companyId);
                break;
            case 'get_analytics_stats':
                result = await analyticsService.getAnalyticsStats(companyId);
                break;
            case 'create_default_dashboard':
                const dashboard = await analyticsService.createDashboard({
                    companyId,
                    userId: data.userId,
                    name: 'Default Dashboard',
                    description: 'Default analytics dashboard',
                    layout: {
                        type: 'grid',
                        columns: 3,
                        rows: 3,
                        positions: []
                    },
                    widgets: [],
                    isDefault: true
                });
                result = dashboard;
                break;
            default:
                return res.status(400).json({ success: false, error: 'Invalid action' });
        }
        res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('Error executing quick action:', error);
        res.status(500).json({ success: false, error: 'Failed to execute quick action' });
    }
});
// Data Export
router.get('/export/:companyId/:type', async (req, res) => {
    try {
        const { companyId, type } = req.params;
        const { format = 'json' } = req.query;
        let data;
        switch (type) {
            case 'predictions':
                const models = await analyticsService.getPredictiveModels(companyId);
                data = await Promise.all(models.map(async (model) => ({
                    model,
                    predictions: await analyticsService.getPredictions(model.id)
                })));
                break;
            case 'insights':
                data = await analyticsService.generateInsights(companyId);
                break;
            case 'metrics':
                data = await analyticsService.getRealTimeMetrics(companyId);
                break;
            case 'benchmarks':
                data = await analyticsService.getBenchmarks(companyId);
                break;
            default:
                return res.status(400).json({ success: false, error: 'Invalid export type' });
        }
        if (format === 'csv') {
            // TODO: Implement CSV export
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${type}_${companyId}.csv"`);
            res.send('CSV export not yet implemented');
        }
        else {
            res.json({ success: true, data });
        }
    }
    catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ success: false, error: 'Failed to export data' });
    }
});
export default router;
