# AI Learning Database Schema Documentation

## Overview

This document describes the comprehensive AI learning database schema implemented for the UrutiIQ accounting platform. The schema supports machine learning model management, training, deployment, monitoring, and governance.

## Core AI Learning Models

### 1. AIModel
**Purpose**: Central model registry for all AI/ML models

**Key Fields**:
- `modelName`: Unique identifier (e.g., "anomaly_detection", "cashflow_prediction")
- `modelVersion`: Version tracking (e.g., "v1.0", "v1.1")
- `modelType`: Classification, regression, clustering, anomaly_detection
- `algorithm`: Random forest, neural network, XGBoost, etc.
- `status`: training, active, deprecated, failed
- `accuracy`, `precision`, `recall`, `f1Score`: Performance metrics
- `hyperparameters`: JSON string of model configuration
- `featureColumns`: JSON array of input features
- `targetColumn`: Target variable name
- `experimentId`: Links to AIExperiment for experiment tracking

**Use Cases**:
- Store trained model metadata
- Track model versions and performance
- Link models to experiments
- Monitor model lifecycle

### 2. AIModelTrainingRun
**Purpose**: Track individual training sessions for models

**Key Fields**:
- `runName`: Descriptive name for the training run
- `status`: running, completed, failed, cancelled
- `startTime`, `endTime`, `duration`: Timing information
- `epochs`, `batchSize`, `learningRate`: Training parameters
- `loss`, `validationLoss`: Training metrics
- `accuracy`, `validationAccuracy`: Performance metrics
- `trainingMetrics`, `validationMetrics`: JSON arrays of metrics over time
- `logs`: Training logs and output

**Use Cases**:
- Track training progress
- Compare different training runs
- Debug training issues
- Monitor model convergence

### 3. AIModelPrediction
**Purpose**: Store individual predictions made by models

**Key Fields**:
- `predictionType`: anomaly, classification, regression, forecast
- `inputData`: JSON string of input features
- `prediction`: JSON string of prediction result
- `confidence`, `probability`: Prediction confidence scores
- `actualValue`: Ground truth (for supervised learning)
- `isCorrect`: Whether prediction was correct
- `error`: Prediction error magnitude

**Use Cases**:
- Store prediction history
- Calculate model accuracy over time
- Track prediction confidence
- Enable feedback loops

### 4. AIModelFeatureImportance
**Purpose**: Track feature importance for model interpretability

**Key Fields**:
- `featureName`: Name of the feature
- `importance`: Feature importance score
- `rank`: Feature rank by importance
- `method`: permutation, shap, built_in

**Use Cases**:
- Model interpretability
- Feature selection
- Business insights
- Model debugging

## Data Pipeline Management

### 5. AIDataPipeline
**Purpose**: Manage data processing pipelines

**Key Fields**:
- `pipelineName`: Unique pipeline identifier
- `pipelineType`: data_collection, preprocessing, feature_engineering, validation
- `status`: active, paused, error
- `schedule`: Cron expression for scheduling
- `config`: JSON configuration
- `sourceTables`, `targetTables`: JSON arrays of table names
- `transformations`: JSON string of data transformations
- `validationRules`: JSON string of validation rules

**Use Cases**:
- Automate data preprocessing
- Schedule data pipeline runs
- Monitor pipeline health
- Configure data transformations

### 6. AIDataPipelineRun
**Purpose**: Track individual pipeline executions

**Key Fields**:
- `runId`: Unique run identifier
- `status`: running, completed, failed, cancelled
- `recordsProcessed`, `recordsFailed`, `recordsSkipped`: Processing statistics
- `inputSize`, `outputSize`: Data size metrics
- `logs`: Pipeline execution logs
- `metrics`: JSON string of execution metrics

**Use Cases**:
- Monitor pipeline performance
- Debug pipeline issues
- Track data processing statistics
- Audit pipeline executions

### 7. AIDataQuality
**Purpose**: Monitor data quality metrics

**Key Fields**:
- `tableName`, `columnName`: Data location
- `qualityMetric`: completeness, accuracy, consistency, timeliness, validity
- `metricValue`: Quality score
- `threshold`: Quality threshold
- `status`: pass, fail, warning
- `issues`, `recommendations`: JSON strings of problems and solutions

**Use Cases**:
- Monitor data quality
- Set quality thresholds
- Generate quality reports
- Alert on quality issues

## Performance Monitoring

### 8. AIPerformanceMetrics
**Purpose**: Track model performance over time

**Key Fields**:
- `modelId`: Optional link to specific model
- `metricType`: accuracy, precision, recall, f1, mae, rmse, latency
- `metricValue`: Performance value
- `timeWindow`: daily, weekly, monthly
- `comparisonValue`: Previous period value
- `trend`: improving, declining, stable

**Use Cases**:
- Monitor model performance trends
- Compare performance across time periods
- Detect performance degradation
- Generate performance reports

### 9. AIDriftDetection
**Purpose**: Detect data and concept drift

**Key Fields**:
- `driftType`: data_drift, concept_drift, label_drift
- `featureName`: Specific feature (optional)
- `baselineValue`, `currentValue`: Statistical values
- `driftScore`: Drift magnitude
- `threshold`: Drift threshold
- `status`: detected, warning, normal
- `analysis`, `recommendations`: JSON strings of analysis

**Use Cases**:
- Detect model drift
- Monitor data distribution changes
- Alert on drift detection
- Generate drift reports

## Learning and Feedback

### 10. AILearningFeedback
**Purpose**: Collect and process user feedback on predictions

**Key Fields**:
- `userId`: User providing feedback
- `modelId`, `predictionId`: Links to model and prediction
- `feedbackType`: correction, rating, comment, flag
- `feedbackData`: JSON string of feedback
- `isPositive`: Whether feedback is positive
- `confidence`: User confidence in feedback
- `impact`: high, medium, low
- `status`: pending, processed, ignored

**Use Cases**:
- Collect user feedback
- Improve model accuracy
- Track feedback processing
- Enable continuous learning

## Experiment Management

### 11. AIExperiment
**Purpose**: Manage machine learning experiments

**Key Fields**:
- `experimentName`: Unique experiment identifier
- `objective`: Model objective/use case
- `status`: active, completed, archived
- `hypothesis`: Experiment hypothesis
- `methodology`: JSON string of experiment methodology
- `baselineModel`, `currentModel`: Model IDs
- `successMetrics`: JSON string of success criteria
- `results`, `conclusions`: Experiment outcomes

**Use Cases**:
- Track experiment progress
- Compare experiment results
- Document experiment methodology
- Manage experiment lifecycle

## Deployment Management

### 12. AIDeployment
**Purpose**: Manage model deployments across environments

**Key Fields**:
- `deploymentName`: Unique deployment identifier
- `environment`: development, staging, production
- `status`: deploying, active, failed, rolled_back
- `endpoint`: API endpoint URL
- `version`: Deployment version
- `config`: JSON deployment configuration
- `healthCheck`: JSON health check results
- `performance`: JSON performance metrics

**Use Cases**:
- Manage model deployments
- Monitor deployment health
- Track deployment versions
- Handle rollbacks

## Governance and Compliance

### 13. AIGovernance
**Purpose**: Define AI governance policies

**Key Fields**:
- `policyName`: Unique policy identifier
- `policyType`: bias_detection, fairness, transparency, privacy, security
- `status`: active, inactive, draft
- `rules`: JSON string of governance rules
- `thresholds`: JSON string of thresholds
- `monitoring`: JSON monitoring configuration
- `alerts`: JSON alert configuration
- `compliance`: JSON compliance requirements

**Use Cases**:
- Define governance policies
- Set compliance thresholds
- Configure monitoring rules
- Manage policy lifecycle

### 14. AIGovernanceViolation
**Purpose**: Track governance policy violations

**Key Fields**:
- `policyId`: Link to governance policy
- `modelId`: Link to specific model (optional)
- `violationType`: bias, fairness, privacy, security, transparency
- `severity`: low, medium, high, critical
- `description`: Violation description
- `details`: JSON string of violation details
- `status`: open, investigating, resolved, false_positive
- `resolution`: Resolution description
- `resolvedBy`: User who resolved the violation

**Use Cases**:
- Track policy violations
- Monitor compliance
- Manage violation resolution
- Generate compliance reports

## Configuration Management

### 15. AIConfig
**Purpose**: Store AI system configuration

**Key Fields**:
- `configType`: prompts, categories, behavior, industry
- `configData`: JSON string of configuration data
- `isActive`: Whether configuration is active

**Use Cases**:
- Store AI prompts
- Configure AI behavior
- Manage industry-specific settings
- Version AI configurations

## Relationships and Indexes

### Key Relationships
- All AI models are linked to companies via `companyId`
- Models can be linked to experiments via `experimentId`
- Training runs are linked to models via `modelId`
- Predictions are linked to models via `modelId`
- Feedback can be linked to users, models, and predictions
- Governance violations are linked to policies and models

### Performance Indexes
- Tenant and company-based queries are optimized
- Time-based queries (training dates, prediction timestamps) are indexed
- Status-based queries are indexed for filtering
- Model type and algorithm queries are indexed

## Usage Examples

### Creating a New Model
```sql
INSERT INTO AIModel (
  tenantId, companyId, modelName, modelVersion, modelType, algorithm, status
) VALUES (
  'tenant1', 'company1', 'expense_classifier', 'v1.0', 'classification', 'random_forest', 'training'
);
```

### Tracking Training Run
```sql
INSERT INTO AIModelTrainingRun (
  tenantId, companyId, modelId, runName, status, startTime, epochs, batchSize
) VALUES (
  'tenant1', 'company1', 'model1', 'training_run_001', 'running', NOW(), 100, 32
);
```

### Storing Prediction
```sql
INSERT INTO AIModelPrediction (
  tenantId, companyId, modelId, predictionType, inputData, prediction, confidence
) VALUES (
  'tenant1', 'company1', 'model1', 'classification', '{"amount": 1000, "category": "office"}', '{"prediction": "expense", "confidence": 0.95}', 0.95
);
```

### Monitoring Performance
```sql
INSERT INTO AIPerformanceMetrics (
  tenantId, companyId, modelId, metricType, metricValue, metricDate, trend
) VALUES (
  'tenant1', 'company1', 'model1', 'accuracy', 0.92, NOW(), 'improving'
);
```

## Best Practices

1. **Model Versioning**: Always use semantic versioning for model versions
2. **Training Tracking**: Log all training parameters and metrics
3. **Performance Monitoring**: Set up regular performance monitoring
4. **Drift Detection**: Implement automated drift detection
5. **Governance**: Define clear governance policies
6. **Feedback Loops**: Collect and process user feedback
7. **Documentation**: Document all experiments and configurations
8. **Security**: Implement proper access controls and data protection

## Migration Notes

The schema was created with migration `20250904174458_add_ai_learning_tables` and includes:
- 15 new AI-related tables
- Comprehensive indexing for performance
- Proper foreign key relationships
- Support for JSON data storage
- Multi-tenant architecture support

## Future Enhancements

Potential future additions:
- Model ensemble tracking
- A/B testing framework
- Advanced drift detection algorithms
- Automated model retraining
- Model explainability tracking
- Advanced governance workflows
- Integration with external ML platforms
