import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
const prisma = new PrismaClient();
export class AIModelService {
    /**
     * Create a new AI model
     */
    async createModel(data) {
        try {
            const model = await prisma.aIModel.create({
                data: {
                    tenantId: data.tenantId,
                    companyId: data.companyId,
                    modelName: data.modelName,
                    modelVersion: data.modelVersion,
                    modelType: data.modelType,
                    algorithm: data.algorithm,
                    hyperparameters: data.hyperparameters ? JSON.stringify(data.hyperparameters) : null,
                    featureColumns: data.featureColumns ? JSON.stringify(data.featureColumns) : null,
                    targetColumn: data.targetColumn,
                    experimentId: data.experimentId,
                    status: 'training'
                }
            });
            return {
                success: true,
                data: model,
                message: 'AI model created successfully'
            };
        }
        catch (error) {
            console.error('Error creating AI model:', error);
            return {
                success: false,
                error: 'Failed to create AI model',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get all models for a company
     */
    async getModels(tenantId, companyId, filters) {
        try {
            const where = {
                tenantId,
                companyId
            };
            if (filters?.status)
                where.status = filters.status;
            if (filters?.modelType)
                where.modelType = filters.modelType;
            if (filters?.algorithm)
                where.algorithm = filters.algorithm;
            const models = await prisma.aIModel.findMany({
                where,
                include: {
                    experiment: true,
                    trainingRuns: {
                        orderBy: { startTime: 'desc' },
                        take: 1
                    },
                    featureImportances: {
                        orderBy: { importance: 'desc' },
                        take: 10
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return {
                success: true,
                data: models,
                count: models.length
            };
        }
        catch (error) {
            console.error('Error fetching AI models:', error);
            return {
                success: false,
                error: 'Failed to fetch AI models',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get a specific model by ID
     */
    async getModelById(modelId, tenantId, companyId) {
        try {
            const model = await prisma.aIModel.findFirst({
                where: {
                    id: modelId,
                    tenantId,
                    companyId
                },
                include: {
                    experiment: true,
                    trainingRuns: {
                        orderBy: { startTime: 'desc' }
                    },
                    featureImportances: {
                        orderBy: { importance: 'desc' }
                    },
                    predictions: {
                        orderBy: { timestamp: 'desc' },
                        take: 100
                    },
                    performanceMetrics: {
                        orderBy: { metricDate: 'desc' },
                        take: 30
                    }
                }
            });
            if (!model) {
                return {
                    success: false,
                    error: 'Model not found'
                };
            }
            return {
                success: true,
                data: model
            };
        }
        catch (error) {
            console.error('Error fetching AI model:', error);
            return {
                success: false,
                error: 'Failed to fetch AI model',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Update a model
     */
    async updateModel(modelId, data, tenantId, companyId) {
        try {
            const model = await prisma.aIModel.update({
                where: {
                    id: modelId,
                    tenantId,
                    companyId
                },
                data: {
                    ...(data.accuracy !== undefined && { accuracy: new Decimal(data.accuracy) }),
                    ...(data.precision !== undefined && { precision: new Decimal(data.precision) }),
                    ...(data.recall !== undefined && { recall: new Decimal(data.recall) }),
                    ...(data.f1Score !== undefined && { f1Score: new Decimal(data.f1Score) }),
                    ...(data.modelPath && { modelPath: data.modelPath }),
                    ...(data.status && { status: data.status }),
                    ...(data.lastUsedAt && { lastUsedAt: data.lastUsedAt })
                }
            });
            return {
                success: true,
                data: model,
                message: 'AI model updated successfully'
            };
        }
        catch (error) {
            console.error('Error updating AI model:', error);
            return {
                success: false,
                error: 'Failed to update AI model',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Create a training run
     */
    async createTrainingRun(data) {
        try {
            const trainingRun = await prisma.aIModelTrainingRun.create({
                data: {
                    tenantId: data.tenantId,
                    companyId: data.companyId,
                    modelId: data.modelId,
                    runName: data.runName,
                    status: 'running',
                    startTime: new Date(),
                    epochs: data.epochs,
                    batchSize: data.batchSize,
                    learningRate: data.learningRate ? new Decimal(data.learningRate) : null,
                    hyperparameters: data.hyperparameters ? JSON.stringify(data.hyperparameters) : null
                }
            });
            return {
                success: true,
                data: trainingRun,
                message: 'Training run created successfully'
            };
        }
        catch (error) {
            console.error('Error creating training run:', error);
            return {
                success: false,
                error: 'Failed to create training run',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Update training run status and metrics
     */
    async updateTrainingRun(runId, data) {
        try {
            const trainingRun = await prisma.aIModelTrainingRun.update({
                where: { id: runId },
                data: {
                    ...(data.status && { status: data.status }),
                    ...(data.endTime && { endTime: data.endTime }),
                    ...(data.duration && { duration: data.duration }),
                    ...(data.loss !== undefined && { loss: new Decimal(data.loss) }),
                    ...(data.validationLoss !== undefined && { validationLoss: new Decimal(data.validationLoss) }),
                    ...(data.accuracy !== undefined && { accuracy: new Decimal(data.accuracy) }),
                    ...(data.validationAccuracy !== undefined && { validationAccuracy: new Decimal(data.validationAccuracy) }),
                    ...(data.trainingMetrics && { trainingMetrics: JSON.stringify(data.trainingMetrics) }),
                    ...(data.validationMetrics && { validationMetrics: JSON.stringify(data.validationMetrics) }),
                    ...(data.logs && { logs: data.logs }),
                    ...(data.errorMessage && { errorMessage: data.errorMessage })
                }
            });
            return {
                success: true,
                data: trainingRun,
                message: 'Training run updated successfully'
            };
        }
        catch (error) {
            console.error('Error updating training run:', error);
            return {
                success: false,
                error: 'Failed to update training run',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Create a prediction
     */
    async createPrediction(data) {
        try {
            const prediction = await prisma.aIModelPrediction.create({
                data: {
                    tenantId: data.tenantId,
                    companyId: data.companyId,
                    modelId: data.modelId,
                    predictionType: data.predictionType,
                    inputData: JSON.stringify(data.inputData),
                    prediction: JSON.stringify(data.prediction),
                    confidence: data.confidence ? new Decimal(data.confidence) : null,
                    probability: data.probability ? new Decimal(data.probability) : null,
                    actualValue: data.actualValue,
                    timestamp: new Date()
                }
            });
            // Update model's lastUsedAt
            await prisma.aIModel.update({
                where: { id: data.modelId },
                data: { lastUsedAt: new Date() }
            });
            return {
                success: true,
                data: prediction,
                message: 'Prediction created successfully'
            };
        }
        catch (error) {
            console.error('Error creating prediction:', error);
            return {
                success: false,
                error: 'Failed to create prediction',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get predictions for a model
     */
    async getPredictions(modelId, tenantId, companyId, limit = 100) {
        try {
            const predictions = await prisma.aIModelPrediction.findMany({
                where: {
                    modelId,
                    tenantId,
                    companyId
                },
                orderBy: { timestamp: 'desc' },
                take: limit
            });
            return {
                success: true,
                data: predictions,
                count: predictions.length
            };
        }
        catch (error) {
            console.error('Error fetching predictions:', error);
            return {
                success: false,
                error: 'Failed to fetch predictions',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Create performance metrics
     */
    async createPerformanceMetrics(data) {
        try {
            const metrics = await prisma.aIPerformanceMetrics.create({
                data: {
                    tenantId: data.tenantId,
                    companyId: data.companyId,
                    modelId: data.modelId,
                    metricType: data.metricType,
                    metricValue: new Decimal(data.metricValue),
                    metricDate: new Date(),
                    timeWindow: data.timeWindow,
                    trend: data.trend
                }
            });
            return {
                success: true,
                data: metrics,
                message: 'Performance metrics created successfully'
            };
        }
        catch (error) {
            console.error('Error creating performance metrics:', error);
            return {
                success: false,
                error: 'Failed to create performance metrics',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get performance metrics for a model
     */
    async getPerformanceMetrics(modelId, tenantId, companyId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const metrics = await prisma.aIPerformanceMetrics.findMany({
                where: {
                    modelId,
                    tenantId,
                    companyId,
                    metricDate: {
                        gte: startDate
                    }
                },
                orderBy: { metricDate: 'asc' }
            });
            return {
                success: true,
                data: metrics,
                count: metrics.length
            };
        }
        catch (error) {
            console.error('Error fetching performance metrics:', error);
            return {
                success: false,
                error: 'Failed to fetch performance metrics',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get model statistics
     */
    async getModelStatistics(tenantId, companyId) {
        try {
            const [totalModels, activeModels, trainingModels, totalPredictions, totalTrainingRuns] = await Promise.all([
                prisma.aIModel.count({ where: { tenantId, companyId } }),
                prisma.aIModel.count({ where: { tenantId, companyId, status: 'active' } }),
                prisma.aIModel.count({ where: { tenantId, companyId, status: 'training' } }),
                prisma.aIModelPrediction.count({ where: { tenantId, companyId } }),
                prisma.aIModelTrainingRun.count({ where: { tenantId, companyId } })
            ]);
            return {
                success: true,
                data: {
                    totalModels,
                    activeModels,
                    trainingModels,
                    totalPredictions,
                    totalTrainingRuns,
                    successRate: totalModels > 0 ? (activeModels / totalModels) * 100 : 0
                }
            };
        }
        catch (error) {
            console.error('Error fetching model statistics:', error);
            return {
                success: false,
                error: 'Failed to fetch model statistics',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Delete a model and all related data
     */
    async deleteModel(modelId, tenantId, companyId) {
        try {
            // Delete related data first
            await Promise.all([
                prisma.aIModelPrediction.deleteMany({
                    where: { modelId, tenantId, companyId }
                }),
                prisma.aIModelTrainingRun.deleteMany({
                    where: { modelId, tenantId, companyId }
                }),
                prisma.aIModelFeatureImportance.deleteMany({
                    where: { modelId, tenantId, companyId }
                }),
                prisma.aIPerformanceMetrics.deleteMany({
                    where: { modelId, tenantId, companyId }
                })
            ]);
            // Delete the model
            await prisma.aIModel.delete({
                where: { id: modelId, tenantId, companyId }
            });
            return {
                success: true,
                message: 'Model and all related data deleted successfully'
            };
        }
        catch (error) {
            console.error('Error deleting model:', error);
            return {
                success: false,
                error: 'Failed to delete model',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
export const aiModelService = new AIModelService();
