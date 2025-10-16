import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
const prisma = new PrismaClient();
export class AIPipelineService {
    /**
     * Create a new data pipeline
     */
    async createPipeline(data) {
        try {
            const pipeline = await prisma.aIDataPipeline.create({
                data: {
                    tenantId: data.tenantId,
                    companyId: data.companyId,
                    pipelineName: data.pipelineName,
                    pipelineType: data.pipelineType,
                    status: 'active',
                    schedule: data.schedule,
                    config: JSON.stringify(data.config),
                    sourceTables: data.sourceTables ? JSON.stringify(data.sourceTables) : null,
                    targetTables: data.targetTables ? JSON.stringify(data.targetTables) : null,
                    transformations: data.transformations ? JSON.stringify(data.transformations) : null,
                    validationRules: data.validationRules ? JSON.stringify(data.validationRules) : null,
                    errorHandling: data.errorHandling ? JSON.stringify(data.errorHandling) : null
                }
            });
            return {
                success: true,
                data: pipeline,
                message: 'Data pipeline created successfully'
            };
        }
        catch (error) {
            console.error('Error creating data pipeline:', error);
            return {
                success: false,
                error: 'Failed to create data pipeline',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get all pipelines for a company
     */
    async getPipelines(tenantId, companyId, filters) {
        try {
            const where = {
                tenantId,
                companyId
            };
            if (filters?.status)
                where.status = filters.status;
            if (filters?.pipelineType)
                where.pipelineType = filters.pipelineType;
            const pipelines = await prisma.aIDataPipeline.findMany({
                where,
                include: {
                    runs: {
                        orderBy: { startTime: 'desc' },
                        take: 5
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return {
                success: true,
                data: pipelines,
                count: pipelines.length
            };
        }
        catch (error) {
            console.error('Error fetching data pipelines:', error);
            return {
                success: false,
                error: 'Failed to fetch data pipelines',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get a specific pipeline by ID
     */
    async getPipelineById(pipelineId, tenantId, companyId) {
        try {
            const pipeline = await prisma.aIDataPipeline.findFirst({
                where: {
                    id: pipelineId,
                    tenantId,
                    companyId
                },
                include: {
                    runs: {
                        orderBy: { startTime: 'desc' }
                    }
                }
            });
            if (!pipeline) {
                return {
                    success: false,
                    error: 'Pipeline not found'
                };
            }
            return {
                success: true,
                data: pipeline
            };
        }
        catch (error) {
            console.error('Error fetching data pipeline:', error);
            return {
                success: false,
                error: 'Failed to fetch data pipeline',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Update pipeline status
     */
    async updatePipeline(pipelineId, data, tenantId, companyId) {
        try {
            const pipeline = await prisma.aIDataPipeline.update({
                where: {
                    id: pipelineId,
                    tenantId,
                    companyId
                },
                data: {
                    ...(data.status && { status: data.status }),
                    ...(data.lastRunAt && { lastRunAt: data.lastRunAt }),
                    ...(data.nextRunAt && { nextRunAt: data.nextRunAt })
                }
            });
            return {
                success: true,
                data: pipeline,
                message: 'Pipeline updated successfully'
            };
        }
        catch (error) {
            console.error('Error updating pipeline:', error);
            return {
                success: false,
                error: 'Failed to update pipeline',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Create a pipeline run
     */
    async createPipelineRun(data) {
        try {
            const pipelineRun = await prisma.aIDataPipelineRun.create({
                data: {
                    tenantId: data.tenantId,
                    companyId: data.companyId,
                    pipelineId: data.pipelineId,
                    runId: data.runId,
                    status: data.status || 'running',
                    startTime: new Date()
                }
            });
            return {
                success: true,
                data: pipelineRun,
                message: 'Pipeline run created successfully'
            };
        }
        catch (error) {
            console.error('Error creating pipeline run:', error);
            return {
                success: false,
                error: 'Failed to create pipeline run',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Update pipeline run
     */
    async updatePipelineRun(runId, data) {
        try {
            const pipelineRun = await prisma.aIDataPipelineRun.update({
                where: { id: runId },
                data: {
                    ...(data.status && { status: data.status }),
                    ...(data.endTime && { endTime: data.endTime }),
                    ...(data.duration && { duration: data.duration }),
                    ...(data.recordsProcessed && { recordsProcessed: data.recordsProcessed }),
                    ...(data.recordsFailed && { recordsFailed: data.recordsFailed }),
                    ...(data.recordsSkipped && { recordsSkipped: data.recordsSkipped }),
                    ...(data.inputSize && { inputSize: data.inputSize }),
                    ...(data.outputSize && { outputSize: data.outputSize }),
                    ...(data.errorMessage && { errorMessage: data.errorMessage }),
                    ...(data.logs && { logs: data.logs }),
                    ...(data.metrics && { metrics: JSON.stringify(data.metrics) })
                }
            });
            return {
                success: true,
                data: pipelineRun,
                message: 'Pipeline run updated successfully'
            };
        }
        catch (error) {
            console.error('Error updating pipeline run:', error);
            return {
                success: false,
                error: 'Failed to update pipeline run',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get pipeline runs
     */
    async getPipelineRuns(pipelineId, tenantId, companyId, limit = 50) {
        try {
            const runs = await prisma.aIDataPipelineRun.findMany({
                where: {
                    pipelineId,
                    tenantId,
                    companyId
                },
                orderBy: { startTime: 'desc' },
                take: limit
            });
            return {
                success: true,
                data: runs,
                count: runs.length
            };
        }
        catch (error) {
            console.error('Error fetching pipeline runs:', error);
            return {
                success: false,
                error: 'Failed to fetch pipeline runs',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Create data quality record
     */
    async createDataQuality(data) {
        try {
            const dataQuality = await prisma.aIDataQuality.create({
                data: {
                    tenantId: data.tenantId,
                    companyId: data.companyId,
                    tableName: data.tableName,
                    columnName: data.columnName,
                    qualityMetric: data.qualityMetric,
                    metricValue: new Decimal(data.metricValue),
                    threshold: data.threshold ? new Decimal(data.threshold) : null,
                    status: data.threshold && data.metricValue >= data.threshold ? 'pass' : 'fail',
                    checkDate: new Date(),
                    dataSample: data.dataSample ? JSON.stringify(data.dataSample) : null,
                    issues: data.issues ? JSON.stringify(data.issues) : null,
                    recommendations: data.recommendations ? JSON.stringify(data.recommendations) : null
                }
            });
            return {
                success: true,
                data: dataQuality,
                message: 'Data quality record created successfully'
            };
        }
        catch (error) {
            console.error('Error creating data quality record:', error);
            return {
                success: false,
                error: 'Failed to create data quality record',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get data quality records
     */
    async getDataQuality(tenantId, companyId, filters) {
        try {
            const where = {
                tenantId,
                companyId
            };
            if (filters?.tableName)
                where.tableName = filters.tableName;
            if (filters?.qualityMetric)
                where.qualityMetric = filters.qualityMetric;
            if (filters?.status)
                where.status = filters.status;
            if (filters?.days) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - filters.days);
                where.checkDate = { gte: startDate };
            }
            const dataQuality = await prisma.aIDataQuality.findMany({
                where,
                orderBy: { checkDate: 'desc' }
            });
            return {
                success: true,
                data: dataQuality,
                count: dataQuality.length
            };
        }
        catch (error) {
            console.error('Error fetching data quality records:', error);
            return {
                success: false,
                error: 'Failed to fetch data quality records',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Create drift detection record
     */
    async createDriftDetection(data) {
        try {
            const driftDetection = await prisma.aIDriftDetection.create({
                data: {
                    tenantId: data.tenantId,
                    companyId: data.companyId,
                    modelId: data.modelId,
                    driftType: data.driftType,
                    featureName: data.featureName,
                    baselineValue: new Decimal(data.baselineValue),
                    currentValue: new Decimal(data.currentValue),
                    driftScore: new Decimal(data.driftScore),
                    threshold: data.threshold ? new Decimal(data.threshold) : null,
                    status: data.threshold && data.driftScore >= data.threshold ? 'detected' : 'normal',
                    detectionDate: new Date(),
                    sampleData: data.sampleData ? JSON.stringify(data.sampleData) : null,
                    analysis: data.analysis ? JSON.stringify(data.analysis) : null,
                    recommendations: data.recommendations ? JSON.stringify(data.recommendations) : null
                }
            });
            return {
                success: true,
                data: driftDetection,
                message: 'Drift detection record created successfully'
            };
        }
        catch (error) {
            console.error('Error creating drift detection record:', error);
            return {
                success: false,
                error: 'Failed to create drift detection record',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get drift detection records
     */
    async getDriftDetection(tenantId, companyId, filters) {
        try {
            const where = {
                tenantId,
                companyId
            };
            if (filters?.modelId)
                where.modelId = filters.modelId;
            if (filters?.driftType)
                where.driftType = filters.driftType;
            if (filters?.status)
                where.status = filters.status;
            if (filters?.days) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - filters.days);
                where.detectionDate = { gte: startDate };
            }
            const driftDetection = await prisma.aIDriftDetection.findMany({
                where,
                orderBy: { detectionDate: 'desc' }
            });
            return {
                success: true,
                data: driftDetection,
                count: driftDetection.length
            };
        }
        catch (error) {
            console.error('Error fetching drift detection records:', error);
            return {
                success: false,
                error: 'Failed to fetch drift detection records',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get pipeline statistics
     */
    async getPipelineStatistics(tenantId, companyId) {
        try {
            const [totalPipelines, activePipelines, totalRuns, successfulRuns, failedRuns, totalRecordsProcessed] = await Promise.all([
                prisma.aIDataPipeline.count({ where: { tenantId, companyId } }),
                prisma.aIDataPipeline.count({ where: { tenantId, companyId, status: 'active' } }),
                prisma.aIDataPipelineRun.count({ where: { tenantId, companyId } }),
                prisma.aIDataPipelineRun.count({ where: { tenantId, companyId, status: 'completed' } }),
                prisma.aIDataPipelineRun.count({ where: { tenantId, companyId, status: 'failed' } }),
                prisma.aIDataPipelineRun.aggregate({
                    where: { tenantId, companyId },
                    _sum: { recordsProcessed: true }
                })
            ]);
            return {
                success: true,
                data: {
                    totalPipelines,
                    activePipelines,
                    totalRuns,
                    successfulRuns,
                    failedRuns,
                    successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0,
                    totalRecordsProcessed: totalRecordsProcessed._sum.recordsProcessed || 0
                }
            };
        }
        catch (error) {
            console.error('Error fetching pipeline statistics:', error);
            return {
                success: false,
                error: 'Failed to fetch pipeline statistics',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Delete a pipeline and all related data
     */
    async deletePipeline(pipelineId, tenantId, companyId) {
        try {
            // Delete related runs first
            await prisma.aIDataPipelineRun.deleteMany({
                where: { pipelineId, tenantId, companyId }
            });
            // Delete the pipeline
            await prisma.aIDataPipeline.delete({
                where: { id: pipelineId, tenantId, companyId }
            });
            return {
                success: true,
                message: 'Pipeline and all related data deleted successfully'
            };
        }
        catch (error) {
            console.error('Error deleting pipeline:', error);
            return {
                success: false,
                error: 'Failed to delete pipeline',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
export const aiPipelineService = new AIPipelineService();
