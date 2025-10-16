import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateGovernancePolicyRequest {
  tenantId: string;
  companyId: string;
  policyName: string;
  policyType: 'bias_detection' | 'fairness' | 'transparency' | 'privacy' | 'security';
  description?: string;
  rules: Record<string, any>;
  thresholds?: Record<string, any>;
  monitoring?: Record<string, any>;
  alerts?: Record<string, any>;
  compliance?: Record<string, any>;
  createdBy: string;
}

export interface UpdateGovernancePolicyRequest {
  status?: 'active' | 'inactive' | 'draft';
  description?: string;
  rules?: Record<string, any>;
  thresholds?: Record<string, any>;
  monitoring?: Record<string, any>;
  alerts?: Record<string, any>;
  compliance?: Record<string, any>;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
}

export interface CreateViolationRequest {
  tenantId: string;
  companyId: string;
  policyId: string;
  modelId?: string;
  violationType: 'bias' | 'fairness' | 'privacy' | 'security' | 'transparency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details?: Record<string, any>;
  detectedAt?: Date;
}

export interface UpdateViolationRequest {
  status?: 'open' | 'investigating' | 'resolved' | 'false_positive';
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  actionTaken?: Record<string, any>;
}

export interface CreateExperimentRequest {
  tenantId: string;
  companyId: string;
  experimentName: string;
  description?: string;
  objective: string;
  hypothesis?: string;
  methodology?: Record<string, any>;
  successMetrics?: Record<string, any>;
}

export interface UpdateExperimentRequest {
  status?: 'active' | 'completed' | 'archived';
  description?: string;
  hypothesis?: string;
  methodology?: Record<string, any>;
  baselineModel?: string;
  currentModel?: string;
  successMetrics?: Record<string, any>;
  results?: Record<string, any>;
  conclusions?: string;
  nextSteps?: Record<string, any>;
  endDate?: Date;
}

export class AIGovernanceService {
  /**
   * Create a new governance policy
   */
  async createPolicy(data: CreateGovernancePolicyRequest) {
    try {
      const policy = await prisma.aIGovernance.create({
        data: {
          tenantId: data.tenantId,
          companyId: data.companyId,
          policyName: data.policyName,
          policyType: data.policyType,
          status: 'active',
          description: data.description,
          rules: JSON.stringify(data.rules),
          thresholds: data.thresholds ? JSON.stringify(data.thresholds) : null,
          monitoring: data.monitoring ? JSON.stringify(data.monitoring) : null,
          alerts: data.alerts ? JSON.stringify(data.alerts) : null,
          compliance: data.compliance ? JSON.stringify(data.compliance) : null,
          createdBy: data.createdBy
        }
      });

      return {
        success: true,
        data: policy,
        message: 'Governance policy created successfully'
      };
    } catch (error) {
      console.error('Error creating governance policy:', error);
      return {
        success: false,
        error: 'Failed to create governance policy',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all governance policies for a company
   */
  async getPolicies(tenantId: string, companyId: string, filters?: {
    status?: string;
    policyType?: string;
  }) {
    try {
      const where: any = {
        tenantId,
        companyId
      };

      if (filters?.status) where.status = filters.status;
      if (filters?.policyType) where.policyType = filters.policyType;

      const policies = await prisma.aIGovernance.findMany({
        where,
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true }
          },
          violations: {
            orderBy: { detectedAt: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return {
        success: true,
        data: policies,
        count: policies.length
      };
    } catch (error) {
      console.error('Error fetching governance policies:', error);
      return {
        success: false,
        error: 'Failed to fetch governance policies',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a specific policy by ID
   */
  async getPolicyById(policyId: string, tenantId: string, companyId: string) {
    try {
      const policy = await prisma.aIGovernance.findFirst({
        where: {
          id: policyId,
          tenantId,
          companyId
        },
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true }
          },
          violations: {
            orderBy: { detectedAt: 'desc' }
          }
        }
      });

      if (!policy) {
        return {
          success: false,
          error: 'Policy not found'
        };
      }

      return {
        success: true,
        data: policy
      };
    } catch (error) {
      console.error('Error fetching governance policy:', error);
      return {
        success: false,
        error: 'Failed to fetch governance policy',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update a governance policy
   */
  async updatePolicy(policyId: string, data: UpdateGovernancePolicyRequest, tenantId: string, companyId: string) {
    try {
      const policy = await prisma.aIGovernance.update({
        where: {
          id: policyId,
          tenantId,
          companyId
        },
        data: {
          ...(data.status && { status: data.status }),
          ...(data.description && { description: data.description }),
          ...(data.rules && { rules: JSON.stringify(data.rules) }),
          ...(data.thresholds && { thresholds: JSON.stringify(data.thresholds) }),
          ...(data.monitoring && { monitoring: JSON.stringify(data.monitoring) }),
          ...(data.alerts && { alerts: JSON.stringify(data.alerts) }),
          ...(data.compliance && { compliance: JSON.stringify(data.compliance) }),
          ...(data.lastReviewDate && { lastReviewDate: data.lastReviewDate }),
          ...(data.nextReviewDate && { nextReviewDate: data.nextReviewDate })
        }
      });

      return {
        success: true,
        data: policy,
        message: 'Governance policy updated successfully'
      };
    } catch (error) {
      console.error('Error updating governance policy:', error);
      return {
        success: false,
        error: 'Failed to update governance policy',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a violation record
   */
  async createViolation(data: CreateViolationRequest) {
    try {
      const violation = await prisma.aIGovernanceViolation.create({
        data: {
          tenantId: data.tenantId,
          companyId: data.companyId,
          policyId: data.policyId,
          modelId: data.modelId,
          violationType: data.violationType,
          severity: data.severity,
          description: data.description,
          details: data.details ? JSON.stringify(data.details) : null,
          detectedAt: data.detectedAt || new Date(),
          status: 'open'
        }
      });

      return {
        success: true,
        data: violation,
        message: 'Violation record created successfully'
      };
    } catch (error) {
      console.error('Error creating violation record:', error);
      return {
        success: false,
        error: 'Failed to create violation record',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update a violation record
   */
  async updateViolation(violationId: string, data: UpdateViolationRequest, tenantId: string, companyId: string) {
    try {
      const violation = await prisma.aIGovernanceViolation.update({
        where: {
          id: violationId,
          tenantId,
          companyId
        },
        data: {
          ...(data.status && { status: data.status }),
          ...(data.resolution && { resolution: data.resolution }),
          ...(data.resolvedAt && { resolvedAt: data.resolvedAt }),
          ...(data.resolvedBy && { resolvedBy: data.resolvedBy }),
          ...(data.actionTaken && { actionTaken: JSON.stringify(data.actionTaken) })
        }
      });

      return {
        success: true,
        data: violation,
        message: 'Violation record updated successfully'
      };
    } catch (error) {
      console.error('Error updating violation record:', error);
      return {
        success: false,
        error: 'Failed to update violation record',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get violations for a company
   */
  async getViolations(tenantId: string, companyId: string, filters?: {
    status?: string;
    severity?: string;
    violationType?: string;
    modelId?: string;
    days?: number;
  }) {
    try {
      const where: any = {
        tenantId,
        companyId
      };

      if (filters?.status) where.status = filters.status;
      if (filters?.severity) where.severity = filters.severity;
      if (filters?.violationType) where.violationType = filters.violationType;
      if (filters?.modelId) where.modelId = filters.modelId;

      if (filters?.days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - filters.days);
        where.detectedAt = { gte: startDate };
      }

      const violations = await prisma.aIGovernanceViolation.findMany({
        where,
        include: {
          policy: true,
          model: {
            select: { id: true, modelName: true, modelVersion: true }
          },
          resolvedByUser: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { detectedAt: 'desc' }
      });

      return {
        success: true,
        data: violations,
        count: violations.length
      };
    } catch (error) {
      console.error('Error fetching violations:', error);
      return {
        success: false,
        error: 'Failed to fetch violations',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create an experiment
   */
  async createExperiment(data: CreateExperimentRequest) {
    try {
      const experiment = await prisma.aIExperiment.create({
        data: {
          tenantId: data.tenantId,
          companyId: data.companyId,
          experimentName: data.experimentName,
          description: data.description,
          objective: data.objective,
          status: 'active',
          startDate: new Date(),
          hypothesis: data.hypothesis,
          methodology: data.methodology ? JSON.stringify(data.methodology) : null,
          successMetrics: data.successMetrics ? JSON.stringify(data.successMetrics) : null
        }
      });

      return {
        success: true,
        data: experiment,
        message: 'Experiment created successfully'
      };
    } catch (error) {
      console.error('Error creating experiment:', error);
      return {
        success: false,
        error: 'Failed to create experiment',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all experiments for a company
   */
  async getExperiments(tenantId: string, companyId: string, filters?: {
    status?: string;
    objective?: string;
  }) {
    try {
      const where: any = {
        tenantId,
        companyId
      };

      if (filters?.status) where.status = filters.status;
      if (filters?.objective) where.objective = filters.objective;

      const experiments = await prisma.aIExperiment.findMany({
        where,
        include: {
          models: {
            select: { id: true, modelName: true, modelVersion: true, status: true }
          }
        },
        orderBy: { startDate: 'desc' }
      });

      return {
        success: true,
        data: experiments,
        count: experiments.length
      };
    } catch (error) {
      console.error('Error fetching experiments:', error);
      return {
        success: false,
        error: 'Failed to fetch experiments',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a specific experiment by ID
   */
  async getExperimentById(experimentId: string, tenantId: string, companyId: string) {
    try {
      const experiment = await prisma.aIExperiment.findFirst({
        where: {
          id: experimentId,
          tenantId,
          companyId
        },
        include: {
          models: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!experiment) {
        return {
          success: false,
          error: 'Experiment not found'
        };
      }

      return {
        success: true,
        data: experiment
      };
    } catch (error) {
      console.error('Error fetching experiment:', error);
      return {
        success: false,
        error: 'Failed to fetch experiment',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an experiment
   */
  async updateExperiment(experimentId: string, data: UpdateExperimentRequest, tenantId: string, companyId: string) {
    try {
      const experiment = await prisma.aIExperiment.update({
        where: {
          id: experimentId,
          tenantId,
          companyId
        },
        data: {
          ...(data.status && { status: data.status }),
          ...(data.description && { description: data.description }),
          ...(data.hypothesis && { hypothesis: data.hypothesis }),
          ...(data.methodology && { methodology: JSON.stringify(data.methodology) }),
          ...(data.baselineModel && { baselineModel: data.baselineModel }),
          ...(data.currentModel && { currentModel: data.currentModel }),
          ...(data.successMetrics && { successMetrics: JSON.stringify(data.successMetrics) }),
          ...(data.results && { results: JSON.stringify(data.results) }),
          ...(data.conclusions && { conclusions: data.conclusions }),
          ...(data.nextSteps && { nextSteps: JSON.stringify(data.nextSteps) }),
          ...(data.endDate && { endDate: data.endDate })
        }
      });

      return {
        success: true,
        data: experiment,
        message: 'Experiment updated successfully'
      };
    } catch (error) {
      console.error('Error updating experiment:', error);
      return {
        success: false,
        error: 'Failed to update experiment',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get governance statistics
   */
  async getGovernanceStatistics(tenantId: string, companyId: string) {
    try {
      const [
        totalPolicies,
        activePolicies,
        totalViolations,
        openViolations,
        criticalViolations,
        totalExperiments,
        activeExperiments
      ] = await Promise.all([
        prisma.aIGovernance.count({ where: { tenantId, companyId } }),
        prisma.aIGovernance.count({ where: { tenantId, companyId, status: 'active' } }),
        prisma.aIGovernanceViolation.count({ where: { tenantId, companyId } }),
        prisma.aIGovernanceViolation.count({ where: { tenantId, companyId, status: 'open' } }),
        prisma.aIGovernanceViolation.count({ where: { tenantId, companyId, severity: 'critical' } }),
        prisma.aIExperiment.count({ where: { tenantId, companyId } }),
        prisma.aIExperiment.count({ where: { tenantId, companyId, status: 'active' } })
      ]);

      return {
        success: true,
        data: {
          totalPolicies,
          activePolicies,
          totalViolations,
          openViolations,
          criticalViolations,
          totalExperiments,
          activeExperiments,
          complianceRate: totalPolicies > 0 ? ((totalPolicies - openViolations) / totalPolicies) * 100 : 100
        }
      };
    } catch (error) {
      console.error('Error fetching governance statistics:', error);
      return {
        success: false,
        error: 'Failed to fetch governance statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a policy and all related violations
   */
  async deletePolicy(policyId: string, tenantId: string, companyId: string) {
    try {
      // Delete related violations first
      await prisma.aIGovernanceViolation.deleteMany({
        where: { policyId, tenantId, companyId }
      });

      // Delete the policy
      await prisma.aIGovernance.delete({
        where: { id: policyId, tenantId, companyId }
      });

      return {
        success: true,
        message: 'Policy and all related violations deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting policy:', error);
      return {
        success: false,
        error: 'Failed to delete policy',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete an experiment and all related models
   */
  async deleteExperiment(experimentId: string, tenantId: string, companyId: string) {
    try {
      // Update models to remove experiment reference
      await prisma.aIModel.updateMany({
        where: { experimentId, tenantId, companyId },
        data: { experimentId: null }
      });

      // Delete the experiment
      await prisma.aIExperiment.delete({
        where: { id: experimentId, tenantId, companyId }
      });

      return {
        success: true,
        message: 'Experiment deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting experiment:', error);
      return {
        success: false,
        error: 'Failed to delete experiment',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const aiGovernanceService = new AIGovernanceService();
