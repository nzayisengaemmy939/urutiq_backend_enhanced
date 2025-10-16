import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAILearning() {
  console.log('🌱 Seeding AI Learning data...');

  // Get the first company and user for seeding
  const company = await prisma.company.findFirst();
  const user = await prisma.appUser.findFirst();

  if (!company || !user) {
    console.log('❌ No company or user found. Please run the main seed script first.');
    return;
  }

  const tenantId = company.tenantId;
  const companyId = company.id;
  const userId = user.id;

  try {
    // Create AI Configuration
    console.log('📝 Creating AI configurations...');
    await prisma.aIConfig.createMany({
      data: [
        {
          tenantId,
          companyId,
          configType: 'prompts',
          configData: JSON.stringify({
            expenseClassification: {
              system: 'You are an AI assistant that classifies business expenses into appropriate categories.',
              user: 'Please classify this expense: {description} with amount {amount}',
              examples: [
                { input: 'Office supplies $50', output: 'Office Supplies' },
                { input: 'Client dinner $200', output: 'Meals & Entertainment' },
                { input: 'Software subscription $99', output: 'Technology' }
              ]
            },
            anomalyDetection: {
              system: 'You are an AI assistant that detects unusual financial transactions.',
              user: 'Analyze this transaction for anomalies: {transaction_data}',
              examples: [
                { input: 'Transaction amount $5000', output: 'High amount - review required' },
                { input: 'Unusual vendor payment', output: 'New vendor - verification needed' }
              ]
            }
          }),
          isActive: true
        },
        {
          tenantId,
          companyId,
          configType: 'categories',
          configData: JSON.stringify({
            expenseCategories: [
              'Office Supplies', 'Meals & Entertainment', 'Technology', 'Travel',
              'Marketing', 'Professional Services', 'Utilities', 'Insurance',
              'Rent', 'Equipment', 'Training', 'Legal Fees'
            ],
            anomalyTypes: [
              'High Amount', 'Unusual Vendor', 'Duplicate Transaction', 'Missing Documentation',
              'Unusual Timing', 'Geographic Anomaly', 'Category Mismatch'
            ]
          }),
          isActive: true
        }
      ]
    });

    // Create AI Experiment
    console.log('🧪 Creating AI experiment...');
    const experiment = await prisma.aIExperiment.create({
      data: {
        tenantId,
        companyId,
        experimentName: 'expense_classification_v1',
        description: 'Initial experiment for expense classification using machine learning',
        objective: 'classification',
        status: 'active',
        hypothesis: 'Machine learning can accurately classify business expenses with >90% accuracy',
        methodology: JSON.stringify({
          approach: 'Supervised Learning',
          algorithm: 'Random Forest',
          features: ['amount', 'description', 'vendor', 'date', 'category'],
          validation: 'Cross-validation with 5 folds',
          metrics: ['accuracy', 'precision', 'recall', 'f1_score']
        }),
        successMetrics: JSON.stringify({
          minAccuracy: 0.90,
          minPrecision: 0.85,
          minRecall: 0.85,
          maxTrainingTime: 3600 // 1 hour
        })
      }
    });

    // Create AI Model
    console.log('🤖 Creating AI model...');
    const model = await prisma.aIModel.create({
      data: {
        tenantId,
        companyId,
        modelName: 'expense_classifier',
        modelVersion: 'v1.0',
        modelType: 'classification',
        algorithm: 'random_forest',
        status: 'active',
        accuracy: 0.92,
        precision: 0.89,
        recall: 0.91,
        f1Score: 0.90,
        hyperparameters: JSON.stringify({
          n_estimators: 100,
          max_depth: 10,
          min_samples_split: 2,
          min_samples_leaf: 1,
          random_state: 42
        }),
        featureColumns: JSON.stringify([
          'amount', 'description_length', 'vendor_category', 'day_of_week',
          'month', 'is_weekend', 'amount_category'
        ]),
        targetColumn: 'expense_category',
        trainingDataSize: 5000,
        validationDataSize: 1000,
        trainingStartTime: new Date('2024-01-01T10:00:00Z'),
        trainingEndTime: new Date('2024-01-01T11:30:00Z'),
        lastUsedAt: new Date(),
        experimentId: experiment.id
      }
    });

    // Create AI Model Training Run
    console.log('🏃 Creating training run...');
    await prisma.aIModelTrainingRun.create({
      data: {
        tenantId,
        companyId,
        modelId: model.id,
        runName: 'expense_classifier_v1_training',
        status: 'completed',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:30:00Z'),
        duration: 5400, // 90 minutes
        epochs: 100,
        batchSize: 32,
        learningRate: 0.001,
        loss: 0.08,
        validationLoss: 0.12,
        accuracy: 0.92,
        validationAccuracy: 0.91,
        hyperparameters: JSON.stringify({
          n_estimators: 100,
          max_depth: 10,
          min_samples_split: 2,
          min_samples_leaf: 1
        }),
        trainingMetrics: JSON.stringify([
          { epoch: 1, loss: 0.45, accuracy: 0.65 },
          { epoch: 25, loss: 0.20, accuracy: 0.82 },
          { epoch: 50, loss: 0.12, accuracy: 0.88 },
          { epoch: 75, loss: 0.09, accuracy: 0.90 },
          { epoch: 100, loss: 0.08, accuracy: 0.92 }
        ]),
        validationMetrics: JSON.stringify([
          { epoch: 1, loss: 0.48, accuracy: 0.62 },
          { epoch: 25, loss: 0.22, accuracy: 0.80 },
          { epoch: 50, loss: 0.14, accuracy: 0.86 },
          { epoch: 75, loss: 0.11, accuracy: 0.89 },
          { epoch: 100, loss: 0.12, accuracy: 0.91 }
        ]),
        logs: 'Training completed successfully. Model converged after 100 epochs.'
      }
    });

    // Create AI Model Feature Importance
    console.log('📊 Creating feature importance data...');
    await prisma.aIModelFeatureImportance.createMany({
      data: [
        {
          tenantId,
          companyId,
          modelId: model.id,
          featureName: 'amount',
          importance: 0.35,
          rank: 1,
          method: 'built_in'
        },
        {
          tenantId,
          companyId,
          modelId: model.id,
          featureName: 'description_length',
          importance: 0.28,
          rank: 2,
          method: 'built_in'
        },
        {
          tenantId,
          companyId,
          modelId: model.id,
          featureName: 'vendor_category',
          importance: 0.22,
          rank: 3,
          method: 'built_in'
        },
        {
          tenantId,
          companyId,
          modelId: model.id,
          featureName: 'day_of_week',
          importance: 0.08,
          rank: 4,
          method: 'built_in'
        },
        {
          tenantId,
          companyId,
          modelId: model.id,
          featureName: 'month',
          importance: 0.07,
          rank: 5,
          method: 'built_in'
        }
      ]
    });

    // Create AI Model Predictions
    console.log('🔮 Creating sample predictions...');
    await prisma.aIModelPrediction.createMany({
      data: [
        {
          tenantId,
          companyId,
          modelId: model.id,
          predictionType: 'classification',
          inputData: JSON.stringify({
            amount: 150.00,
            description: 'Office supplies from Staples',
            vendor: 'Staples',
            amount_category: 'medium'
          }),
          prediction: JSON.stringify({
            predicted_category: 'Office Supplies',
            confidence: 0.95,
            probabilities: {
              'Office Supplies': 0.95,
              'Technology': 0.03,
              'Marketing': 0.02
            }
          }),
          confidence: 0.95,
          probability: 0.95,
          actualValue: 'Office Supplies',
          isCorrect: true,
          error: 0.0,
          timestamp: new Date()
        },
        {
          tenantId,
          companyId,
          modelId: model.id,
          predictionType: 'classification',
          inputData: JSON.stringify({
            amount: 250.00,
            description: 'Client dinner at restaurant',
            vendor: 'Restaurant XYZ',
            amount_category: 'medium'
          }),
          prediction: JSON.stringify({
            predicted_category: 'Meals & Entertainment',
            confidence: 0.88,
            probabilities: {
              'Meals & Entertainment': 0.88,
              'Office Supplies': 0.08,
              'Travel': 0.04
            }
          }),
          confidence: 0.88,
          probability: 0.88,
          actualValue: 'Meals & Entertainment',
          isCorrect: true,
          error: 0.0,
          timestamp: new Date()
        }
      ]
    });

    // Create AI Performance Metrics
    console.log('📈 Creating performance metrics...');
    await prisma.aIPerformanceMetrics.createMany({
      data: [
        {
          tenantId,
          companyId,
          modelId: model.id,
          metricType: 'accuracy',
          metricValue: 0.92,
          metricDate: new Date(),
          timeWindow: 'daily',
          trend: 'stable'
        },
        {
          tenantId,
          companyId,
          modelId: model.id,
          metricType: 'precision',
          metricValue: 0.89,
          metricDate: new Date(),
          timeWindow: 'daily',
          trend: 'improving'
        },
        {
          tenantId,
          companyId,
          modelId: model.id,
          metricType: 'recall',
          metricValue: 0.91,
          metricDate: new Date(),
          timeWindow: 'daily',
          trend: 'stable'
        },
        {
          tenantId,
          companyId,
          modelId: model.id,
          metricType: 'f1',
          metricValue: 0.90,
          metricDate: new Date(),
          timeWindow: 'daily',
          trend: 'improving'
        }
      ]
    });

    // Create AI Data Pipeline
    console.log('🔧 Creating data pipeline...');
    const pipeline = await prisma.aIDataPipeline.create({
      data: {
        tenantId,
        companyId,
        pipelineName: 'expense_data_preprocessing',
        pipelineType: 'preprocessing',
        status: 'active',
        schedule: '0 2 * * *', // Daily at 2 AM
        lastRunAt: new Date(),
        nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        config: JSON.stringify({
          inputFormat: 'CSV',
          outputFormat: 'JSON',
          validationRules: ['required_fields', 'amount_range', 'date_format'],
          transformations: ['normalize_amounts', 'extract_features', 'encode_categories']
        }),
        sourceTables: JSON.stringify(['Transaction', 'Vendor', 'Account']),
        targetTables: JSON.stringify(['AIModelPrediction', 'AIDataQuality']),
        transformations: JSON.stringify([
          { type: 'normalize', field: 'amount', method: 'min_max' },
          { type: 'extract', field: 'description', features: ['length', 'keywords'] },
          { type: 'encode', field: 'vendor', method: 'label_encoding' }
        ]),
        validationRules: JSON.stringify([
          { field: 'amount', rule: 'range', min: 0, max: 100000 },
          { field: 'description', rule: 'required' },
          { field: 'date', rule: 'format', format: 'YYYY-MM-DD' }
        ]),
        errorHandling: JSON.stringify({
          onError: 'continue',
          maxErrors: 100,
          errorLogging: true,
          retryAttempts: 3
        })
      }
    });

    // Create AI Data Pipeline Run
    console.log('🏃 Creating pipeline run...');
    await prisma.aIDataPipelineRun.create({
      data: {
        tenantId,
        companyId,
        pipelineId: pipeline.id,
        runId: 'expense_pipeline_20240101_001',
        status: 'completed',
        startTime: new Date('2024-01-01T02:00:00Z'),
        endTime: new Date('2024-01-01T02:15:00Z'),
        duration: 900, // 15 minutes
        recordsProcessed: 5000,
        recordsFailed: 12,
        recordsSkipped: 8,
        inputSize: 1024000, // 1MB
        outputSize: 2048000, // 2MB
        logs: 'Pipeline completed successfully. 12 records failed validation, 8 records skipped due to missing data.',
        metrics: JSON.stringify({
          processingTime: 900,
          recordsPerSecond: 5.56,
          successRate: 0.996,
          errorRate: 0.004
        })
      }
    });

    // Create AI Data Quality
    console.log('✅ Creating data quality metrics...');
    await prisma.aIDataQuality.createMany({
      data: [
        {
          tenantId,
          companyId,
          tableName: 'Transaction',
          qualityMetric: 'completeness',
          metricValue: 0.98,
          threshold: 0.95,
          status: 'pass',
          checkDate: new Date(),
          dataSample: JSON.stringify(['Sample transaction 1', 'Sample transaction 2']),
          issues: JSON.stringify([
            { field: 'description', issue: 'Missing description in 2% of records' }
          ]),
          recommendations: JSON.stringify([
            'Implement required field validation',
            'Add data entry training for users'
          ])
        },
        {
          tenantId,
          companyId,
          tableName: 'Transaction',
          columnName: 'amount',
          qualityMetric: 'accuracy',
          metricValue: 0.99,
          threshold: 0.95,
          status: 'pass',
          checkDate: new Date(),
          dataSample: JSON.stringify([100.50, 250.75, 500.00]),
          issues: JSON.stringify([]),
          recommendations: JSON.stringify(['Continue current validation practices'])
        }
      ]
    });

    // Create AI Learning Feedback
    console.log('💬 Creating learning feedback...');
    await prisma.aILearningFeedback.createMany({
      data: [
        {
          tenantId,
          companyId,
          userId: userId,
          modelId: model.id,
          predictionId: (await prisma.aIModelPrediction.findFirst())?.id,
          feedbackType: 'correction',
          feedbackData: JSON.stringify({
            originalPrediction: 'Office Supplies',
            correctCategory: 'Technology',
            reason: 'Software license should be classified as Technology'
          }),
          isPositive: false,
          confidence: 0.9,
          impact: 'high',
          status: 'processed',
          processedAt: new Date()
        }
      ]
    });

    // Create AI Governance
    console.log('🛡️ Creating governance policies...');
    const governance = await prisma.aIGovernance.create({
      data: {
        tenantId,
        companyId,
        policyName: 'bias_detection_policy',
        policyType: 'bias_detection',
        status: 'active',
        description: 'Policy to detect and prevent bias in AI models',
        rules: JSON.stringify({
          maxBiasScore: 0.1,
          protectedAttributes: ['vendor_category', 'amount_category'],
          biasMetrics: ['statistical_parity', 'equalized_odds', 'demographic_parity']
        }),
        thresholds: JSON.stringify({
          statisticalParityThreshold: 0.1,
          equalizedOddsThreshold: 0.05,
          demographicParityThreshold: 0.1
        }),
        monitoring: JSON.stringify({
          frequency: 'daily',
          metrics: ['bias_score', 'fairness_metrics'],
          alerts: ['bias_threshold_exceeded', 'fairness_violation']
        }),
        alerts: JSON.stringify({
          emailRecipients: ['ai-team@company.com'],
          slackChannel: '#ai-alerts',
          severityLevels: ['low', 'medium', 'high', 'critical']
        }),
        compliance: JSON.stringify({
          regulations: ['GDPR', 'CCPA', 'AI Act'],
          requirements: ['transparency', 'accountability', 'fairness'],
          reporting: ['monthly', 'quarterly', 'annual']
        }),
        createdBy: userId
      }
    });

    // Create AI Governance Violation
    console.log('⚠️ Creating governance violation...');
    await prisma.aIGovernanceViolation.create({
      data: {
        tenantId,
        companyId,
        policyId: governance.id,
        modelId: model.id,
        violationType: 'bias',
        severity: 'medium',
        description: 'Model shows slight bias towards certain vendor categories',
        details: JSON.stringify({
          biasScore: 0.08,
          affectedGroups: ['small_vendors', 'international_vendors'],
          impact: 'Minor impact on classification accuracy for certain vendor types'
        }),
        detectedAt: new Date(),
        status: 'investigating',
        resolution: 'Under investigation by AI team'
      }
    });

    // Create AI Deployment
    console.log('🚀 Creating deployment...');
    await prisma.aIDeployment.create({
      data: {
        tenantId,
        companyId,
        modelId: model.id,
        deploymentName: 'expense_classifier_prod',
        environment: 'production',
        status: 'active',
        deploymentDate: new Date('2024-01-01T12:00:00Z'),
        activationDate: new Date('2024-01-01T12:30:00Z'),
        endpoint: 'https://api.urutiq.com/ai/expense-classifier',
        version: 'v1.0',
        config: JSON.stringify({
          maxConcurrentRequests: 100,
          timeout: 30,
          retryAttempts: 3,
          logging: true
        }),
        healthCheck: JSON.stringify({
          status: 'healthy',
          lastCheck: new Date(),
          responseTime: 0.15,
          errorRate: 0.001
        }),
        performance: JSON.stringify({
          requestsPerSecond: 10,
          averageResponseTime: 0.15,
          errorRate: 0.001,
          uptime: 0.999
        })
      }
    });

    console.log('✅ AI Learning data seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`   - 2 AI Configurations`);
    console.log(`   - 1 AI Experiment`);
    console.log(`   - 1 AI Model`);
    console.log(`   - 1 Training Run`);
    console.log(`   - 5 Feature Importance records`);
    console.log(`   - 2 Predictions`);
    console.log(`   - 4 Performance Metrics`);
    console.log(`   - 1 Data Pipeline`);
    console.log(`   - 1 Pipeline Run`);
    console.log(`   - 2 Data Quality records`);
    console.log(`   - 1 Learning Feedback`);
    console.log(`   - 1 Governance Policy`);
    console.log(`   - 1 Governance Violation`);
    console.log(`   - 1 Deployment`);

  } catch (error) {
    console.error('❌ Error seeding AI Learning data:', error);
    throw error;
  }
}

// Run the seed function
seedAILearning()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
