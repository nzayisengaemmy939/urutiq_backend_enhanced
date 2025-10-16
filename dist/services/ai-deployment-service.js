import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class AIDeploymentService {
    /**
     * Create a new deployment
     */
    async createDeployment(data) {
        try {
            const deployment = await prisma.aIDeployment.create({
                data: {
                    tenantId: data.tenantId,
                    companyId: data.companyId,
                    modelId: data.modelId,
                    deploymentName: data.deploymentName,
                    version: '1.0.0',
                    environment: data.environment,
                    status: 'deploying',
                    config: data.config ? JSON.stringify(data.config) : null
                }
            });
            return {
                success: true,
                data: deployment,
                message: 'Deployment created successfully'
            };
        }
        catch (error) {
            console.error('Error creating deployment:', error);
            return {
                success: false,
                error: 'Failed to create deployment',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get all deployments for a company
     */
    async getDeployments(tenantId, companyId, filters) {
        try {
            const where = {
                tenantId,
                companyId
            };
            if (filters?.status)
                where.status = filters.status;
            if (filters?.environment)
                where.environment = filters.environment;
            if (filters?.deploymentType)
                where.deploymentType = filters.deploymentType;
            if (filters?.modelId)
                where.modelId = filters.modelId;
            const deployments = await prisma.aIDeployment.findMany({
                where,
                include: {
                    model: {
                        select: { id: true, modelName: true, modelVersion: true, status: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return {
                success: true,
                data: deployments,
                count: deployments.length
            };
        }
        catch (error) {
            console.error('Error fetching deployments:', error);
            return {
                success: false,
                error: 'Failed to fetch deployments',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get a specific deployment by ID
     */
    async getDeploymentById(deploymentId, tenantId, companyId) {
        try {
            const deployment = await prisma.aIDeployment.findFirst({
                where: {
                    id: deploymentId,
                    tenantId,
                    companyId
                },
                include: {
                    model: {
                        select: { id: true, modelName: true, modelVersion: true, status: true }
                    }
                }
            });
            if (!deployment) {
                return {
                    success: false,
                    error: 'Deployment not found'
                };
            }
            return {
                success: true,
                data: deployment
            };
        }
        catch (error) {
            console.error('Error fetching deployment:', error);
            return {
                success: false,
                error: 'Failed to fetch deployment',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Update a deployment
     */
    async updateDeployment(deploymentId, data, tenantId, companyId) {
        try {
            const deployment = await prisma.aIDeployment.update({
                where: {
                    id: deploymentId,
                    tenantId,
                    companyId
                },
                data: {
                    ...(data.status && { status: data.status }),
                    ...(data.config && { config: JSON.stringify(data.config) }),
                    ...(data.endpoints && { endpoints: JSON.stringify(data.endpoints) }),
                    ...(data.scaling && { scaling: JSON.stringify(data.scaling) }),
                    ...(data.monitoring && { monitoring: JSON.stringify(data.monitoring) }),
                    ...(data.healthCheck && { healthCheck: JSON.stringify(data.healthCheck) }),
                    ...(data.performanceMetrics && { performanceMetrics: JSON.stringify(data.performanceMetrics) }),
                    ...(data.lastDeployedAt && { lastDeployedAt: data.lastDeployedAt }),
                    ...(data.deployedBy && { deployedBy: data.deployedBy })
                }
            });
            return {
                success: true,
                data: deployment,
                message: 'Deployment updated successfully'
            };
        }
        catch (error) {
            console.error('Error updating deployment:', error);
            return {
                success: false,
                error: 'Failed to update deployment',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Deploy a model (update status to active)
     */
    async deployModel(deploymentId, deployedBy, tenantId, companyId) {
        try {
            const deployment = await prisma.aIDeployment.update({
                where: {
                    id: deploymentId,
                    tenantId,
                    companyId
                },
                data: {
                    status: 'active'
                }
            });
            return {
                success: true,
                data: deployment,
                message: 'Model deployed successfully'
            };
        }
        catch (error) {
            console.error('Error deploying model:', error);
            return {
                success: false,
                error: 'Failed to deploy model',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Scale down a deployment
     */
    async scaleDownDeployment(deploymentId, tenantId, companyId) {
        try {
            const deployment = await prisma.aIDeployment.update({
                where: {
                    id: deploymentId,
                    tenantId,
                    companyId
                },
                data: {
                    status: 'scaled_down'
                }
            });
            return {
                success: true,
                data: deployment,
                message: 'Deployment scaled down successfully'
            };
        }
        catch (error) {
            console.error('Error scaling down deployment:', error);
            return {
                success: false,
                error: 'Failed to scale down deployment',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Create learning feedback
     */
    async createLearningFeedback(data) {
        try {
            const feedback = await prisma.aILearningFeedback.create({
                data: {
                    tenantId: data.tenantId,
                    companyId: data.companyId,
                    modelId: data.modelId,
                    predictionId: data.predictionId,
                    feedbackType: data.feedbackType,
                    feedbackData: JSON.stringify({ rating: data.rating, comment: data.comment }),
                    status: 'pending'
                }
            });
            return {
                success: true,
                data: feedback,
                message: 'Learning feedback created successfully'
            };
        }
        catch (error) {
            console.error('Error creating learning feedback:', error);
            return {
                success: false,
                error: 'Failed to create learning feedback',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Update learning feedback
     */
    async updateLearningFeedback(feedbackId, data, tenantId, companyId) {
        try {
            const feedback = await prisma.aILearningFeedback.update({
                where: {
                    id: feedbackId,
                    tenantId,
                    companyId
                },
                data: {
                    ...(data.rating && { rating: data.rating }),
                    ...(data.comment && { comment: data.comment }),
                    ...(data.metadata && { metadata: JSON.stringify(data.metadata) }),
                    ...(data.status && { status: data.status }),
                    ...(data.reviewedBy && { reviewedBy: data.reviewedBy }),
                    ...(data.reviewedAt && { reviewedAt: data.reviewedAt }),
                    ...(data.actionTaken && { actionTaken: JSON.stringify(data.actionTaken) })
                }
            });
            return {
                success: true,
                data: feedback,
                message: 'Learning feedback updated successfully'
            };
        }
        catch (error) {
            console.error('Error updating learning feedback:', error);
            return {
                success: false,
                error: 'Failed to update learning feedback',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get learning feedback for a company
     */
    async getLearningFeedback(tenantId, companyId, filters) {
        try {
            const where = {
                tenantId,
                companyId
            };
            if (filters?.status)
                where.status = filters.status;
            if (filters?.feedbackType)
                where.feedbackType = filters.feedbackType;
            if (filters?.modelId)
                where.modelId = filters.modelId;
            if (filters?.rating)
                where.rating = filters.rating;
            if (filters?.days) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - filters.days);
                where.createdAt = { gte: startDate };
            }
            const feedback = await prisma.aILearningFeedback.findMany({
                where,
                include: {
                    model: {
                        select: { id: true, modelName: true, modelVersion: true }
                    },
                    prediction: {
                        select: { id: true, inputData: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return {
                success: true,
                data: feedback,
                count: feedback.length
            };
        }
        catch (error) {
            console.error('Error fetching learning feedback:', error);
            return {
                success: false,
                error: 'Failed to fetch learning feedback',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get deployment statistics
     */
    async getDeploymentStatistics(tenantId, companyId) {
        try {
            const [totalDeployments, activeDeployments, failedDeployments, totalFeedback, pendingFeedback, averageRating] = await Promise.all([
                prisma.aIDeployment.count({ where: { tenantId, companyId } }),
                prisma.aIDeployment.count({ where: { tenantId, companyId, status: 'active' } }),
                prisma.aIDeployment.count({ where: { tenantId, companyId, status: 'failed' } }),
                prisma.aILearningFeedback.count({ where: { tenantId, companyId } }),
                prisma.aILearningFeedback.count({ where: { tenantId, companyId, status: 'pending' } }),
                prisma.aILearningFeedback.aggregate({
                    where: { tenantId, companyId },
                    _avg: { confidence: true }
                })
            ]);
            return {
                success: true,
                data: {
                    totalDeployments,
                    activeDeployments,
                    failedDeployments,
                    totalFeedback,
                    pendingFeedback,
                    averageRating: averageRating._avg?.confidence || 0,
                    successRate: totalDeployments > 0 ? ((totalDeployments - failedDeployments) / totalDeployments) * 100 : 100
                }
            };
        }
        catch (error) {
            console.error('Error fetching deployment statistics:', error);
            return {
                success: false,
                error: 'Failed to fetch deployment statistics',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get deployment health check
     */
    async getDeploymentHealth(deploymentId, tenantId, companyId) {
        try {
            const deployment = await prisma.aIDeployment.findFirst({
                where: {
                    id: deploymentId,
                    tenantId,
                    companyId
                },
                select: {
                    id: true,
                    status: true,
                    healthCheck: true,
                    model: {
                        select: { id: true, modelName: true, status: true }
                    }
                }
            });
            if (!deployment) {
                return {
                    success: false,
                    error: 'Deployment not found'
                };
            }
            // Calculate health status based on various factors
            const healthStatus = this.calculateHealthStatus(deployment);
            return {
                success: true,
                data: {
                    ...deployment,
                    healthStatus
                }
            };
        }
        catch (error) {
            console.error('Error fetching deployment health:', error);
            return {
                success: false,
                error: 'Failed to fetch deployment health',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Delete a deployment
     */
    async deleteDeployment(deploymentId, tenantId, companyId) {
        try {
            await prisma.aIDeployment.delete({
                where: {
                    id: deploymentId,
                    tenantId,
                    companyId
                }
            });
            return {
                success: true,
                message: 'Deployment deleted successfully'
            };
        }
        catch (error) {
            console.error('Error deleting deployment:', error);
            return {
                success: false,
                error: 'Failed to delete deployment',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Delete learning feedback
     */
    async deleteLearningFeedback(feedbackId, tenantId, companyId) {
        try {
            await prisma.aILearningFeedback.delete({
                where: {
                    id: feedbackId,
                    tenantId,
                    companyId
                }
            });
            return {
                success: true,
                message: 'Learning feedback deleted successfully'
            };
        }
        catch (error) {
            console.error('Error deleting learning feedback:', error);
            return {
                success: false,
                error: 'Failed to delete learning feedback',
                details: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Calculate deployment health status
     */
    calculateHealthStatus(deployment) {
        const status = deployment.status;
        const lastDeployed = deployment.lastDeployedAt || null;
        const healthCheck = deployment.healthCheck ? JSON.parse(deployment.healthCheck) : null;
        const performanceMetrics = null; // Property not available in schema
        let healthScore = 100;
        let issues = [];
        // Check deployment status
        if (status === 'failed') {
            healthScore -= 50;
            issues.push('Deployment failed');
        }
        else if (status === 'scaled_down') {
            healthScore -= 30;
            issues.push('Deployment scaled down');
        }
        // Check if deployment is stale (older than 30 days)
        if (lastDeployed) {
            const daysSinceDeployment = (Date.now() - new Date(lastDeployed).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDeployment > 30) {
                healthScore -= 10;
                issues.push('Deployment is stale');
            }
        }
        // Check health check data
        if (healthCheck) {
            if (healthCheck.responseTime > 5000) {
                healthScore -= 15;
                issues.push('High response time');
            }
            if (healthCheck.errorRate > 0.05) {
                healthScore -= 20;
                issues.push('High error rate');
            }
        }
        // Check performance metrics (not available in current schema)
        // if (performanceMetrics) {
        //   if (performanceMetrics.accuracy < 0.8) {
        //     healthScore -= 15;
        //     issues.push('Low accuracy');
        //   }
        //   if (performanceMetrics.latency > 1000) {
        //     healthScore -= 10;
        //     issues.push('High latency');
        //   }
        // }
        // Determine health status
        let healthStatus = 'healthy';
        if (healthScore < 50) {
            healthStatus = 'critical';
        }
        else if (healthScore < 80) {
            healthStatus = 'warning';
        }
        return {
            healthScore: Math.max(0, healthScore),
            healthStatus,
            issues
        };
    }
}
export const aiDeploymentService = new AIDeploymentService();
