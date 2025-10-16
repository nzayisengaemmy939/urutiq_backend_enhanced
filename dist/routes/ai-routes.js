import { Router } from 'express';
import { AIService } from '../services/ai-service';
import { aiModelService } from '../services/ai-model-service';
import { aiPipelineService } from '../services/ai-pipeline-service';
import { aiGovernanceService } from '../services/ai-governance-service';
import { aiDeploymentService } from '../services/ai-deployment-service';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = Router();
// TODO: Add authentication middleware when available
// router.use(authenticateToken);
// AI Dashboard
router.get('/dashboard/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const dashboardData = await AIService.getDashboardData(tenantId, companyId);
        if (dashboardData.success) {
            res.json(dashboardData);
        }
        else {
            res.status(400).json(dashboardData);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI Insights
router.post('/insights', async (req, res) => {
    try {
        const { insightType, data, modelId } = req.body;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const userId = 'demo-user-id';
        const insight = await AIService.generateInsights({
            tenantId,
            companyId,
            insightType,
            data,
            modelId,
            userId
        });
        if (insight.success) {
            res.status(201).json(insight);
        }
        else {
            res.status(400).json(insight);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/insights/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const { type, status, limit = 10 } = req.query;
        const insights = await prisma.aiInsight.findMany({
            where: {
                tenantId,
                companyId,
                ...(type && { insightType: type }),
                ...(status && { status: status })
            },
            orderBy: { id: 'desc' },
            take: parseInt(limit)
        });
        res.json({
            success: true,
            data: insights,
            count: insights.length
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI Predictions
router.post('/predictions', async (req, res) => {
    try {
        const { modelId, inputData, context } = req.body;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const userId = 'demo-user-id';
        const prediction = await AIService.makePrediction({
            tenantId,
            companyId,
            modelId,
            inputData,
            userId,
            context
        });
        if (prediction.success) {
            res.status(201).json(prediction);
        }
        else {
            res.status(400).json(prediction);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/predictions/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const { modelId, limit = 10 } = req.query;
        const predictions = await prisma.aIModelPrediction.findMany({
            where: {
                tenantId,
                companyId,
                ...(modelId && { modelId: modelId })
            },
            include: {
                model: {
                    select: { id: true, modelName: true, modelVersion: true }
                }
            },
            orderBy: { id: 'desc' },
            take: parseInt(limit)
        });
        res.json({
            success: true,
            data: predictions,
            count: predictions.length
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI Recommendations
router.post('/recommendations', async (req, res) => {
    try {
        const { recommendationType, data } = req.body;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const userId = 'demo-user-id';
        const recommendation = await AIService.generateRecommendations({
            tenantId,
            companyId,
            recommendationType,
            data,
            userId
        });
        if (recommendation.success) {
            res.status(201).json(recommendation);
        }
        else {
            res.status(400).json(recommendation);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI Audits
router.post('/audits', async (req, res) => {
    try {
        const { auditType, modelId, deploymentId } = req.body;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const userId = 'demo-user-id';
        const audit = await AIService.performAudit({
            tenantId,
            companyId,
            auditType,
            modelId,
            deploymentId,
            userId
        });
        if (audit.success) {
            res.status(201).json(audit);
        }
        else {
            res.status(400).json(audit);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI Models
router.post('/models', async (req, res) => {
    try {
        const modelData = req.body;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const userId = 'demo-user-id';
        const model = await aiModelService.createModel({
            tenantId,
            companyId,
            modelName: modelData.modelName,
            modelVersion: modelData.modelVersion,
            modelType: modelData.modelType,
            algorithm: modelData.algorithm,
            hyperparameters: modelData.hyperparameters,
            featureColumns: modelData.featureColumns,
            targetColumn: modelData.targetColumn,
            experimentId: modelData.experimentId
        });
        if (model.success) {
            res.status(201).json(model);
        }
        else {
            res.status(400).json(model);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/models/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const { status, modelType } = req.query;
        const models = await aiModelService.getModels(tenantId, companyId, {
            status: status,
            modelType: modelType
        });
        if (models.success) {
            res.json(models);
        }
        else {
            res.status(400).json(models);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/models/:companyId/:modelId', async (req, res) => {
    try {
        const { companyId, modelId } = req.params;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const model = await aiModelService.getModelById(modelId, tenantId, companyId);
        if (model.success) {
            res.json(model);
        }
        else {
            res.status(404).json(model);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Model Training
router.post('/models/:modelId/train', async (req, res) => {
    try {
        const { modelId } = req.params;
        const trainingData = req.body;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const userId = 'demo-user-id';
        const trainingRun = await aiModelService.createTrainingRun({
            tenantId,
            companyId,
            modelId,
            // trainingDataSize: trainingData.trainingDataSize, // TODO: Add when field is available
            // validationDataSize: trainingData.validationDataSize, // TODO: Add when field is available
            hyperparameters: trainingData.hyperparameters,
            status: 'running',
            startedBy: userId
        });
        if (trainingRun.success) {
            res.status(201).json(trainingRun);
        }
        else {
            res.status(400).json(trainingRun);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI Pipelines
router.post('/pipelines', async (req, res) => {
    try {
        const pipelineData = req.body;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const pipeline = await aiPipelineService.createPipeline({
            tenantId,
            companyId,
            pipelineName: pipelineData.pipelineName,
            pipelineType: pipelineData.pipelineType,
            schedule: pipelineData.schedule,
            config: pipelineData.config,
            sourceTables: pipelineData.sourceTables,
            targetTables: pipelineData.targetTables,
            transformations: pipelineData.transformations,
            validationRules: pipelineData.validationRules,
            errorHandling: pipelineData.errorHandling
        });
        if (pipeline.success) {
            res.status(201).json(pipeline);
        }
        else {
            res.status(400).json(pipeline);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/pipelines/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const { status, pipelineType } = req.query;
        const pipelines = await aiPipelineService.getPipelines(tenantId, companyId, {
            status: status,
            pipelineType: pipelineType
        });
        if (pipelines.success) {
            res.json(pipelines);
        }
        else {
            res.status(400).json(pipelines);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI Governance
router.post('/governance/policies', async (req, res) => {
    try {
        const policyData = req.body;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const userId = 'demo-user-id';
        const policy = await aiGovernanceService.createPolicy({
            tenantId,
            companyId,
            policyName: policyData.policyName,
            policyType: policyData.policyType,
            description: policyData.description,
            rules: policyData.rules,
            thresholds: policyData.thresholds,
            monitoring: policyData.monitoring,
            alerts: policyData.alerts,
            compliance: policyData.compliance,
            createdBy: userId
        });
        if (policy.success) {
            res.status(201).json(policy);
        }
        else {
            res.status(400).json(policy);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/governance/policies/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const { status, policyType } = req.query;
        const policies = await aiGovernanceService.getPolicies(tenantId, companyId, {
            status: status,
            policyType: policyType
        });
        if (policies.success) {
            res.json(policies);
        }
        else {
            res.status(400).json(policies);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI Deployments
router.post('/deployments', async (req, res) => {
    try {
        const deploymentData = req.body;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const userId = 'demo-user-id';
        const deployment = await aiDeploymentService.createDeployment({
            tenantId,
            companyId,
            modelId: deploymentData.modelId,
            deploymentName: deploymentData.deploymentName,
            environment: deploymentData.environment,
            deploymentType: deploymentData.deploymentType,
            config: deploymentData.config,
            endpoints: deploymentData.endpoints,
            scaling: deploymentData.scaling,
            monitoring: deploymentData.monitoring,
            createdBy: userId
        });
        if (deployment.success) {
            res.status(201).json(deployment);
        }
        else {
            res.status(400).json(deployment);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/deployments/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const { status, environment, deploymentType } = req.query;
        const deployments = await aiDeploymentService.getDeployments(tenantId, companyId, {
            status: status,
            environment: environment,
            deploymentType: deploymentType
        });
        if (deployments.success) {
            res.json(deployments);
        }
        else {
            res.status(400).json(deployments);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Deploy Model
router.post('/deployments/:deploymentId/deploy', async (req, res) => {
    try {
        const { deploymentId } = req.params;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const userId = 'demo-user-id';
        const deployment = await aiDeploymentService.deployModel(deploymentId, userId, tenantId, companyId);
        if (deployment.success) {
            res.json(deployment);
        }
        else {
            res.status(400).json(deployment);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Learning Feedback
router.post('/feedback', async (req, res) => {
    try {
        const feedbackData = req.body;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const userId = 'demo-user-id';
        const feedback = await aiDeploymentService.createLearningFeedback({
            tenantId,
            companyId,
            modelId: feedbackData.modelId,
            predictionId: feedbackData.predictionId,
            feedbackType: feedbackData.feedbackType,
            rating: feedbackData.rating,
            comment: feedbackData.comment,
            metadata: feedbackData.metadata,
            providedBy: userId
        });
        if (feedback.success) {
            res.status(201).json(feedback);
        }
        else {
            res.status(400).json(feedback);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/feedback/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const { status, feedbackType, modelId } = req.query;
        const feedback = await aiDeploymentService.getLearningFeedback(tenantId, companyId, {
            status: status,
            feedbackType: feedbackType,
            modelId: modelId
        });
        if (feedback.success) {
            res.json(feedback);
        }
        else {
            res.status(400).json(feedback);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AI Experiments
router.post('/experiments', async (req, res) => {
    try {
        const experimentData = req.body;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const companyId = 'demo-company-id';
        const experiment = await aiGovernanceService.createExperiment({
            tenantId,
            companyId,
            experimentName: experimentData.experimentName,
            description: experimentData.description,
            objective: experimentData.objective,
            hypothesis: experimentData.hypothesis,
            methodology: experimentData.methodology,
            successMetrics: experimentData.successMetrics
        });
        if (experiment.success) {
            res.status(201).json(experiment);
        }
        else {
            res.status(400).json(experiment);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/experiments/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        // TODO: Get from authenticated user when auth is implemented
        const tenantId = 'demo-tenant-id';
        const { status, objective } = req.query;
        const experiments = await aiGovernanceService.getExperiments(tenantId, companyId, {
            status: status,
            objective: objective
        });
        if (experiments.success) {
            res.json(experiments);
        }
        else {
            res.status(400).json(experiments);
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
export default router;
