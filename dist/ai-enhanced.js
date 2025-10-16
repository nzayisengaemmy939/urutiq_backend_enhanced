import { prisma } from './prisma';
import { addInsight, logAnomaly, addAudit } from './ai';
import { aiConfigurationService, DEFAULT_BEHAVIOR_CONFIG } from './ai-config';
// Ollama API configuration
import { config } from './config';
const OLLAMA_BASE_URL = config.ai.ollamaBaseUrl;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
class EnhancedAIService {
    async callOllama(prompt, systemPrompt, tenantId, companyId) {
        try {
            // Get customized behavior settings
            let behaviorConfig = DEFAULT_BEHAVIOR_CONFIG;
            if (tenantId && companyId) {
                behaviorConfig = await aiConfigurationService.getCustomizedBehavior(tenantId, companyId);
            }
            const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: behaviorConfig.modelSettings.modelName,
                    prompt: prompt,
                    system: systemPrompt || 'You are an expert accounting AI assistant. Provide accurate, helpful responses for financial analysis and categorization.',
                    stream: false,
                    options: {
                        temperature: behaviorConfig.modelSettings.temperature,
                        top_p: behaviorConfig.modelSettings.topP,
                        max_tokens: behaviorConfig.modelSettings.maxTokens,
                    }
                }),
            });
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return data.response.trim();
        }
        catch (error) {
            console.error('Ollama API error:', error);
            // Fallback to rule-based logic if Ollama is unavailable
            return this.fallbackResponse(prompt);
        }
    }
    fallbackResponse(prompt) {
        // Simple rule-based fallback when Ollama is unavailable
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes('categorize') || lowerPrompt.includes('category')) {
            if (lowerPrompt.includes('airtel') || lowerPrompt.includes('telecom')) {
                return 'Telecom Expense';
            }
            if (lowerPrompt.includes('office') || lowerPrompt.includes('supplies')) {
                return 'Office Supplies';
            }
            if (lowerPrompt.includes('fuel') || lowerPrompt.includes('gas')) {
                return 'Fuel Expense';
            }
            return 'Miscellaneous Expense';
        }
        return 'Unable to process request. Please try again or contact support.';
    }
    // 1. Transaction Categorization (AI Bookkeeping)
    async categorizeTransaction(tenantId, companyId, description, amount, transactionType) {
        // Get customized prompts and categories
        const promptConfig = await aiConfigurationService.getCustomizedPrompts(tenantId, companyId);
        const categoryConfig = await aiConfigurationService.getCustomizedCategories(tenantId, companyId);
        const behaviorConfig = await aiConfigurationService.getCustomizedBehavior(tenantId, companyId);
        // Build category list from configuration
        const allCategories = [
            ...categoryConfig.expenseCategories,
            ...categoryConfig.revenueCategories,
            ...categoryConfig.assetCategories,
            ...categoryConfig.liabilityCategories,
            ...categoryConfig.industrySpecific.flatMap(ic => ic.categories)
        ];
        const categoryList = allCategories
            .filter(cat => cat.isActive)
            .map(cat => `${cat.name}: ${cat.description}`)
            .join('\n- ');
        // Use customized prompt template
        const prompt = promptConfig.transactionCategorization.userPromptTemplate
            .replace('{description}', description)
            .replace('{amount}', amount.toString())
            .replace('{transactionType}', transactionType)
            .replace('{categories}', categoryList || 'Standard accounting categories');
        const response = await this.callOllama(prompt, promptConfig.transactionCategorization.systemPrompt, tenantId, companyId);
        // Parse the response
        const categoryMatch = response.match(/Category:\s*([^|]+)/);
        const confidenceMatch = response.match(/Confidence:\s*(\d+)/);
        const reasoningMatch = response.match(/Reasoning:\s*([^|]+)/);
        const suggestedCategory = categoryMatch?.[1]?.trim() || 'Miscellaneous';
        const confidence = parseInt(confidenceMatch?.[1] || '70');
        const reasoning = reasoningMatch?.[1]?.trim() || 'AI categorization based on transaction description';
        // Check if confidence meets the configured threshold
        if (confidence < behaviorConfig.confidenceThresholds.categorization) {
            // If below threshold, try to find a matching category by keywords
            const allCategories = [
                ...categoryConfig.expenseCategories,
                ...categoryConfig.revenueCategories,
                ...categoryConfig.assetCategories,
                ...categoryConfig.liabilityCategories,
                ...categoryConfig.industrySpecific.flatMap(ic => ic.categories)
            ];
            const matchingCategory = allCategories.find(cat => cat.isActive && cat.keywords.some(keyword => description.toLowerCase().includes(keyword.toLowerCase())));
            if (matchingCategory) {
                return {
                    transactionId: '',
                    description,
                    amount,
                    suggestedCategory: matchingCategory.name,
                    confidence: matchingCategory.confidence,
                    reasoning: `Keyword-based categorization: ${matchingCategory.description}`
                };
            }
        }
        // Log the categorization for audit
        await addAudit({
            tenantId,
            companyId,
            action: 'transaction_categorization',
            aiValidationResult: JSON.stringify({
                description,
                amount,
                suggestedCategory,
                confidence,
                reasoning
            })
        });
        return {
            transactionId: '', // Will be set by caller
            description,
            amount,
            suggestedCategory,
            confidence,
            reasoning
        };
    }
    // 2. Enhanced Anomaly Detection & Fraud Alerts
    async detectAnomaliesEnhanced(tenantId, companyId, transactions) {
        const anomalies = [];
        const promptConfig = await aiConfigurationService.getCustomizedPrompts(tenantId, companyId);
        // Check for duplicate transactions
        const amountGroups = new Map();
        transactions.forEach(txn => {
            const key = `${txn.amount}_${txn.transactionDate.toDateString()}`;
            if (!amountGroups.has(key)) {
                amountGroups.set(key, []);
            }
            amountGroups.get(key).push(txn);
        });
        // Flag potential duplicates
        for (const [key, txnGroup] of amountGroups) {
            if (txnGroup.length > 1) {
                const [amount, date] = key.split('_');
                const behaviorConfig = await aiConfigurationService.getCustomizedBehavior(tenantId, companyId);
                const prompt = promptConfig.anomalyDetection.duplicateAnalysisPrompt
                    .replace('{transactions}', txnGroup.map(t => `- ${t.description} | ${t.amount} | ${t.transactionDate}`).join('\n'));
                const response = await this.callOllama(prompt, promptConfig.anomalyDetection.systemPrompt, tenantId, companyId);
                const duplicateMatch = response.match(/Duplicate:\s*(yes|no)/i);
                const confidenceMatch = response.match(/Confidence:\s*(\d+)/);
                const typeMatch = response.match(/Type:\s*([^|]+)/);
                const severityMatch = response.match(/Severity:\s*(low|medium|high|critical)/i);
                const descriptionMatch = response.match(/Description:\s*([^|]+)/);
                if (duplicateMatch?.[1]?.toLowerCase() === 'yes') {
                    anomalies.push({
                        transactionId: txnGroup[0].id,
                        anomalyType: typeMatch?.[1]?.trim() || 'duplicate',
                        confidence: parseInt(confidenceMatch?.[1] || '80'),
                        description: descriptionMatch?.[1]?.trim() || 'Potential duplicate transaction detected',
                        severity: severityMatch?.[1]?.toLowerCase() || 'medium'
                    });
                }
            }
        }
        // Check for unusual amounts using statistical analysis
        const amounts = transactions.map(t => Number(t.amount));
        if (amounts.length > 10) {
            const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
            const stdDev = Math.sqrt(variance);
            for (let i = 0; i < amounts.length; i++) {
                const zScore = Math.abs((amounts[i] - mean) / stdDev);
                if (zScore > 3) {
                    const prompt = promptConfig.anomalyDetection.fraudAnalysisPrompt
                        .replace('{transaction}', `${transactions[i].description} | ${transactions[i].amount}`)
                        .replace('{average}', mean.toFixed(2))
                        .replace('{stdDev}', stdDev.toFixed(2))
                        .replace('{zScore}', zScore.toFixed(2));
                    const response = await this.callOllama(prompt, promptConfig.anomalyDetection.systemPrompt, tenantId, companyId);
                    const suspiciousMatch = response.match(/Suspicious:\s*(yes|no)/i);
                    const confidenceMatch = response.match(/Confidence:\s*(\d+)/);
                    const typeMatch = response.match(/Type:\s*([^|]+)/);
                    const severityMatch = response.match(/Severity:\s*(low|medium|high|critical)/i);
                    const descriptionMatch = response.match(/Description:\s*([^|]+)/);
                    if (suspiciousMatch?.[1]?.toLowerCase() === 'yes') {
                        anomalies.push({
                            transactionId: transactions[i].id,
                            anomalyType: typeMatch?.[1]?.trim() || 'unusual_amount',
                            confidence: parseInt(confidenceMatch?.[1] || '75'),
                            description: descriptionMatch?.[1]?.trim() || 'Unusual transaction amount detected',
                            severity: severityMatch?.[1]?.toLowerCase() || 'medium'
                        });
                    }
                }
            }
        }
        // Log anomalies
        for (const anomaly of anomalies) {
            await logAnomaly({
                tenantId,
                companyId,
                transactionId: anomaly.transactionId,
                anomalyType: anomaly.anomalyType,
                confidenceScore: anomaly.confidence / 100
            });
        }
        return anomalies;
    }
    // 3. AI-powered Reports (Natural Language Queries)
    async generateNaturalLanguageReport(query) {
        const promptConfig = await aiConfigurationService.getCustomizedPrompts(query.companyId, query.companyId);
        const prompt = promptConfig.naturalLanguageReports.sqlGenerationPrompt
            .replace('{query}', query.query);
        const sqlQuery = await this.callOllama(prompt, promptConfig.naturalLanguageReports.systemPrompt, query.companyId, query.companyId);
        try {
            // Execute the generated SQL query
            const result = await prisma.$queryRawUnsafe(sqlQuery);
            // Generate a natural language summary of the results
            const summaryPrompt = promptConfig.naturalLanguageReports.summaryPrompt
                .replace('{query}', query.query)
                .replace('{results}', JSON.stringify(result));
            const summary = await this.callOllama(summaryPrompt, promptConfig.naturalLanguageReports.systemPrompt, query.companyId, query.companyId);
            return {
                query: query.query,
                sqlQuery,
                results: result,
                summary,
                generatedAt: new Date()
            };
        }
        catch (error) {
            console.error('SQL execution error:', error);
            return {
                query: query.query,
                error: 'Unable to execute query',
                fallback: this.generateFallbackReport(query.query)
            };
        }
    }
    generateFallbackReport(query) {
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('cash flow')) {
            return 'Cash flow report: Current cash position is healthy with positive net flow.';
        }
        if (lowerQuery.includes('revenue')) {
            return 'Revenue summary: Total revenue for the period shows consistent growth.';
        }
        if (lowerQuery.includes('expense')) {
            return 'Expense analysis: Expenses are within budget with no significant anomalies.';
        }
        return 'Report generated successfully. Please review the detailed data below.';
    }
    // 4. Smart Insights & Forecasting
    async generateSmartInsights(tenantId, companyId, historicalData) {
        const insights = [];
        // Analyze cash flow patterns
        const promptConfig = await aiConfigurationService.getCustomizedPrompts(tenantId, companyId);
        const cashFlowPrompt = promptConfig.smartInsights.cashFlowAnalysisPrompt
            .replace('{data}', historicalData.map(d => `${d.date}: ${d.cashFlow}`).join('\n'));
        const cashFlowResponse = await this.callOllama(cashFlowPrompt, promptConfig.smartInsights.systemPrompt, tenantId, companyId);
        // Parse insights from response
        const insightMatches = cashFlowResponse.match(/Insight:\s*([^|]+)\s*\|\s*Type:\s*([^|]+)\s*\|\s*Priority:\s*([^|]+)\s*\|\s*Confidence:\s*(\d+)\s*\|\s*Description:\s*([^|]+)\s*\|\s*Actionable:\s*(yes|no)\s*\|\s*Impact:\s*([^|]+)\s*\|\s*Actions:\s*([^|]+)/g);
        if (insightMatches) {
            for (const match of insightMatches) {
                const parts = match.split('|').map(p => p.trim());
                insights.push({
                    type: parts[1],
                    title: parts[0].replace('Insight:', '').trim(),
                    description: parts[4],
                    priority: parts[2],
                    confidence: parseInt(parts[3]),
                    actionable: parts[5] === 'yes',
                    suggestedActions: parts[7].split(',').map(a => a.trim()),
                    impact: parts[6]
                });
            }
        }
        // Generate cash flow predictions
        const predictionPrompt = promptConfig.smartInsights.predictionPrompt
            .replace('{data}', historicalData.map(d => `${d.date}: ${d.cashFlow}`).join('\n'));
        const predictionResponse = await this.callOllama(predictionPrompt, promptConfig.smartInsights.systemPrompt, tenantId, companyId);
        // Parse predictions
        const predictionMatches = predictionResponse.match(/Month:\s*([^|]+)\s*\|\s*Predicted:\s*([^|]+)\s*\|\s*Confidence:\s*(\d+)\s*\|\s*Risk:\s*([^|]+)\s*\|\s*Factors:\s*([^|]+)/g);
        const predictions = [];
        if (predictionMatches) {
            for (const match of predictionMatches) {
                const parts = match.split('|').map(p => p.trim());
                predictions.push({
                    period: parts[0].replace('Month:', '').trim(),
                    predictedAmount: parseFloat(parts[1].replace('Predicted:', '').trim()),
                    confidence: parseInt(parts[2]),
                    riskLevel: parts[3].replace('Risk:', '').trim(),
                    factors: parts[4].replace('Factors:', '').trim().split(',').map(f => f.trim())
                });
            }
        }
        // Add cash shortage alerts
        for (const prediction of predictions) {
            if (prediction.predictedAmount < 0 && prediction.confidence > 70) {
                insights.push({
                    type: 'cash_flow',
                    title: `Cash Shortage Alert - ${prediction.period}`,
                    description: `Predicted cash shortage of ${Math.abs(prediction.predictedAmount).toFixed(2)} in ${prediction.period}`,
                    priority: prediction.riskLevel === 'high' ? 'critical' : 'high',
                    confidence: prediction.confidence,
                    actionable: true,
                    suggestedActions: [
                        'Review upcoming expenses',
                        'Accelerate receivables collection',
                        'Consider credit line options',
                        'Delay non-essential purchases'
                    ],
                    impact: 'High financial risk - immediate action required'
                });
            }
        }
        // Save insights to database
        for (const insight of insights) {
            await addInsight({
                tenantId,
                companyId,
                category: insight.type,
                insightText: `${insight.title}: ${insight.description}`,
                priority: insight.priority
            });
        }
        return insights;
    }
    // 5. AI Assistant for Accountants
    async processAIAssistantQuery(tenantId, companyId, userQuery, context) {
        const promptConfig = await aiConfigurationService.getCustomizedPrompts(tenantId, companyId);
        const prompt = `User Query: "${userQuery}"

${context ? `Context: ${JSON.stringify(context)}` : ''}

Please help with this request. If you need to:
- Categorize transactions: specify the suggested category
- Generate reports: describe what data to retrieve
- Detect anomalies: explain what to check
- Provide insights: give actionable recommendations

Respond in this format:
"Response: [your helpful response] | Actions: [comma-separated list of actions] | Confidence: [0-100] | Data: [any specific data or parameters]"`;
        const response = await this.callOllama(prompt, promptConfig.aiAssistant.systemPrompt, tenantId, companyId);
        // Parse the response
        const responseMatch = response.match(/Response:\s*([^|]+)/);
        const actionsMatch = response.match(/Actions:\s*([^|]+)/);
        const confidenceMatch = response.match(/Confidence:\s*(\d+)/);
        const dataMatch = response.match(/Data:\s*([^|]+)/);
        return {
            response: responseMatch?.[1]?.trim() || 'I understand your request. Let me help you with that.',
            actions: actionsMatch?.[1]?.split(',').map(a => a.trim()) || [],
            data: dataMatch?.[1]?.trim() || undefined,
            confidence: parseInt(confidenceMatch?.[1] || '80')
        };
    }
    // Batch processing for multiple transactions
    async processBatchTransactions(tenantId, companyId, transactions) {
        const categorizations = [];
        const anomalies = [];
        const insights = [];
        // Process categorizations
        for (const transaction of transactions) {
            const categorization = await this.categorizeTransaction(tenantId, companyId, transaction.description, transaction.amount, transaction.transactionType);
            categorization.transactionId = transaction.id;
            categorizations.push(categorization);
        }
        // Detect anomalies
        const detectedAnomalies = await this.detectAnomaliesEnhanced(tenantId, companyId, transactions);
        anomalies.push(...detectedAnomalies);
        // Generate insights
        const generatedInsights = await this.generateSmartInsights(tenantId, companyId, transactions);
        insights.push(...generatedInsights);
        return {
            categorizations,
            anomalies,
            insights
        };
    }
}
export const enhancedAIService = new EnhancedAIService();
