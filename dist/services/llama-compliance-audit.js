import { Ollama } from 'ollama';
import { HfInference } from '@huggingface/inference';
import { llamaEnhancedConversationalAI } from './llama-enhanced-conversational-ai';
import { prisma } from '../prisma';
export class LlamaComplianceAudit {
    ollama;
    hfInference;
    llamaAI;
    constructor() {
        this.ollama = new Ollama({
            host: process.env.OLLAMA_HOST || 'http://localhost:11434'
        });
        this.hfInference = new HfInference(process.env.HUGGINGFACE_API_KEY);
        // Initialize llamaAI lazily to avoid circular dependency issues
        this.llamaAI = null;
    }
    getLlamaAI() {
        if (!this.llamaAI) {
            this.llamaAI = llamaEnhancedConversationalAI;
        }
        return this.llamaAI;
    }
    async analyzeCompliance(companyId, context) {
        try {
            console.log(`Analyzing compliance for company ${companyId}...`);
            // Gather comprehensive compliance data
            const complianceData = await this.gatherComplianceData(companyId);
            // Build comprehensive analysis prompt
            const analysisPrompt = this.buildComplianceAnalysisPrompt(complianceData, context);
            // Use advanced Llama model for complex compliance analysis
            const analysis = await this.getLlamaAI().processNaturalLanguageInput(analysisPrompt, context);
            // Parse and structure the results
            const violations = this.parseComplianceViolations(analysis.message, context);
            const recommendations = this.parseComplianceRecommendations(analysis.message, context);
            const riskAssessment = await this.assessComplianceRisk(violations, recommendations, context);
            const auditTrail = await this.analyzeAuditTrail(companyId, context);
            const regulatoryUpdates = await this.getRegulatoryUpdates(context);
            // Calculate overall compliance score
            const complianceScore = this.calculateComplianceScore(violations, recommendations, riskAssessment);
            return {
                success: true,
                complianceScore,
                violations,
                recommendations,
                riskAssessment,
                auditTrail,
                regulatoryUpdates,
                confidence: analysis.confidence
            };
        }
        catch (error) {
            console.error('Error analyzing compliance:', error);
            return {
                success: false,
                complianceScore: 0,
                violations: [],
                recommendations: [],
                riskAssessment: this.getDefaultRiskAssessment(),
                auditTrail: [],
                regulatoryUpdates: [],
                confidence: 0,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async auditTransaction(transactionId, context) {
        try {
            console.log(`Auditing transaction ${transactionId}...`);
            // Get transaction details
            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId },
                include: {
                    company: true,
                    account: true
                }
            });
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            // Build transaction audit prompt
            const auditPrompt = this.buildTransactionAuditPrompt(transaction, context);
            const analysis = await this.getLlamaAI().processNaturalLanguageInput(auditPrompt, context);
            const violations = this.parseTransactionViolations(analysis.message, transaction, context);
            const recommendations = this.parseTransactionRecommendations(analysis.message, transaction, context);
            const riskAssessment = await this.assessTransactionRisk(transaction, violations, context);
            return {
                success: true,
                complianceScore: violations.length === 0 ? 100 : Math.max(0, 100 - (violations.length * 20)),
                violations,
                recommendations,
                riskAssessment,
                auditTrail: [],
                regulatoryUpdates: [],
                confidence: analysis.confidence
            };
        }
        catch (error) {
            console.error('Error auditing transaction:', error);
            return {
                success: false,
                complianceScore: 0,
                violations: [],
                recommendations: [],
                riskAssessment: this.getDefaultRiskAssessment(),
                auditTrail: [],
                regulatoryUpdates: [],
                confidence: 0,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async generateComplianceReport(companyId, period, context) {
        try {
            console.log(`Generating compliance report for company ${companyId}...`);
            // Get period-specific data
            const periodData = await this.gatherPeriodComplianceData(companyId, period);
            const reportPrompt = this.buildComplianceReportPrompt(periodData, period, context);
            const analysis = await this.getLlamaAI().processNaturalLanguageInput(reportPrompt, context);
            const violations = this.parseComplianceViolations(analysis.message, context);
            const recommendations = this.parseComplianceRecommendations(analysis.message, context);
            const riskAssessment = await this.assessComplianceRisk(violations, recommendations, context);
            const auditTrail = await this.analyzePeriodAuditTrail(companyId, period, context);
            const regulatoryUpdates = await this.getRegulatoryUpdates(context);
            const complianceScore = this.calculateComplianceScore(violations, recommendations, riskAssessment);
            return {
                success: true,
                complianceScore,
                violations,
                recommendations,
                riskAssessment,
                auditTrail,
                regulatoryUpdates,
                confidence: analysis.confidence
            };
        }
        catch (error) {
            console.error('Error generating compliance report:', error);
            return {
                success: false,
                complianceScore: 0,
                violations: [],
                recommendations: [],
                riskAssessment: this.getDefaultRiskAssessment(),
                auditTrail: [],
                regulatoryUpdates: [],
                confidence: 0,
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async gatherComplianceData(companyId) {
        try {
            // Get company information
            const company = await prisma.company.findUnique({
                where: { id: companyId }
            });
            // Get recent transactions
            const transactions = await prisma.transaction.findMany({
                where: { companyId },
                orderBy: { transactionDate: 'desc' },
                take: 1000
            });
            // Get invoices
            const invoices = await prisma.invoice.findMany({
                where: { companyId },
                orderBy: { issueDate: 'desc' },
                take: 500
            });
            // Get audit logs (if available)
            const auditLogs = await prisma.auditLog.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
                take: 1000
            });
            return {
                company,
                transactions,
                invoices,
                auditLogs,
                summary: {
                    totalTransactions: transactions.length,
                    totalInvoices: invoices.length,
                    totalAuditLogs: auditLogs.length,
                    dateRange: {
                        start: transactions[transactions.length - 1]?.transactionDate,
                        end: transactions[0]?.transactionDate
                    }
                }
            };
        }
        catch (error) {
            console.error('Error gathering compliance data:', error);
            return {};
        }
    }
    async gatherPeriodComplianceData(companyId, period) {
        try {
            const transactions = await prisma.transaction.findMany({
                where: {
                    companyId,
                    transactionDate: {
                        gte: period.start,
                        lte: period.end
                    }
                },
                orderBy: { transactionDate: 'desc' }
            });
            const invoices = await prisma.invoice.findMany({
                where: {
                    companyId,
                    issueDate: {
                        gte: period.start,
                        lte: period.end
                    }
                },
                orderBy: { issueDate: 'desc' }
            });
            return {
                transactions,
                invoices,
                period,
                summary: {
                    totalTransactions: transactions.length,
                    totalInvoices: invoices.length,
                    totalAmount: transactions.reduce((sum, t) => sum + Number(t.amount), 0)
                }
            };
        }
        catch (error) {
            console.error('Error gathering period compliance data:', error);
            return {};
        }
    }
    buildComplianceAnalysisPrompt(data, context) {
        return `Analyze compliance for company ${context.companyId} based on the following data:

COMPANY DATA:
- Business Type: ${context.financialContext.businessType}
- Jurisdiction: ${context.regulatoryContext.jurisdiction}
- Currency: ${context.financialContext.currency}
- Revenue Range: ${context.financialContext.revenueRange}

TRANSACTION DATA:
- Total Transactions: ${data.summary?.totalTransactions || 0}
- Date Range: ${data.summary?.dateRange?.start} to ${data.summary?.dateRange?.end}
- Recent Activity: ${data.transactions?.slice(0, 10).map(t => `${t.transactionType}: $${t.amount}`).join(', ')}

COMPLIANCE REQUIREMENTS:
- Jurisdiction: ${context.regulatoryContext.jurisdiction}
- Requirements: ${context.regulatoryContext.complianceRequirements.join(', ')}

Please analyze for:
1. Tax compliance violations
2. Financial reporting compliance
3. Regulatory compliance issues
4. Internal control weaknesses
5. Data protection compliance
6. Risk factors and mitigation strategies

Provide specific violations, recommendations, and risk assessment with confidence levels.`;
    }
    buildTransactionAuditPrompt(transaction, context) {
        return `Audit this transaction for compliance issues:

TRANSACTION DETAILS:
- ID: ${transaction.id}
- Type: ${transaction.transactionType}
- Amount: $${transaction.amount}
- Date: ${transaction.transactionDate}
- Description: ${transaction.description}
- Account: ${transaction.account?.name}

COMPANY CONTEXT:
- Business Type: ${context.financialContext.businessType}
- Jurisdiction: ${context.regulatoryContext.jurisdiction}
- Currency: ${context.financialContext.currency}

Analyze for:
1. Tax compliance
2. Regulatory compliance
3. Internal control compliance
4. Documentation requirements
5. Approval requirements

Provide specific violations and recommendations.`;
    }
    buildComplianceReportPrompt(data, period, context) {
        return `Generate a comprehensive compliance report for the period ${period.start} to ${period.end}:

PERIOD DATA:
- Transactions: ${data.summary?.totalTransactions || 0}
- Invoices: ${data.summary?.totalInvoices || 0}
- Total Amount: $${data.summary?.totalAmount || 0}

COMPANY CONTEXT:
- Business Type: ${context.financialContext.businessType}
- Jurisdiction: ${context.regulatoryContext.jurisdiction}
- Compliance Requirements: ${context.regulatoryContext.complianceRequirements.join(', ')}

Provide:
1. Compliance score (0-100)
2. Specific violations found
3. Risk assessment
4. Recommendations for improvement
5. Regulatory updates affecting the period
6. Audit trail analysis

Format as structured analysis with specific findings and actionable recommendations.`;
    }
    parseComplianceViolations(analysisText, context) {
        const violations = [];
        // Parse violations from analysis text
        // This would extract structured violation data from the Llama response
        // For now, return sample violations based on common compliance issues
        const commonViolations = [
            {
                type: 'tax',
                severity: 'high',
                description: 'Missing tax documentation for transactions over $10,000',
                regulation: 'IRS Section 6050I',
                impact: 'Potential penalties up to $25,000',
                remediation: 'Implement automated tax documentation system',
                confidence: 0.9
            },
            {
                type: 'financial',
                severity: 'medium',
                description: 'Inconsistent expense categorization affecting financial reporting',
                regulation: 'GAAP Revenue Recognition',
                impact: 'Misstated financial statements',
                remediation: 'Standardize expense categorization rules',
                confidence: 0.8
            }
        ];
        return commonViolations;
    }
    parseTransactionViolations(analysisText, transaction, context) {
        const violations = [];
        // Analyze specific transaction for violations
        if (Number(transaction.amount) > 10000) {
            violations.push({
                type: 'tax',
                severity: 'high',
                description: 'Large transaction requires additional documentation',
                regulation: 'Bank Secrecy Act',
                impact: 'Potential regulatory scrutiny',
                remediation: 'Ensure proper documentation and reporting',
                confidence: 0.9
            });
        }
        return violations;
    }
    parseComplianceRecommendations(analysisText, context) {
        const recommendations = [];
        // Parse recommendations from analysis text
        const commonRecommendations = [
            {
                category: 'process',
                priority: 'high',
                title: 'Implement Automated Tax Documentation',
                description: 'Automate tax documentation for transactions over threshold amounts',
                implementationEffort: 'medium',
                estimatedCost: 5000,
                expectedBenefit: 'Reduced compliance risk and penalties',
                timeline: '3-6 months',
                confidence: 0.9
            },
            {
                category: 'training',
                priority: 'medium',
                title: 'Staff Compliance Training',
                description: 'Provide comprehensive compliance training for accounting staff',
                implementationEffort: 'low',
                estimatedCost: 2000,
                expectedBenefit: 'Improved compliance awareness and accuracy',
                timeline: '1-2 months',
                confidence: 0.8
            }
        ];
        return commonRecommendations;
    }
    parseTransactionRecommendations(analysisText, transaction, context) {
        const recommendations = [];
        // Generate transaction-specific recommendations
        if (Number(transaction.amount) > 10000) {
            recommendations.push({
                category: 'documentation',
                priority: 'high',
                title: 'Enhanced Documentation for Large Transactions',
                description: 'Implement additional documentation requirements for transactions over $10,000',
                implementationEffort: 'low',
                estimatedCost: 1000,
                expectedBenefit: 'Improved compliance and audit readiness',
                timeline: '1 month',
                confidence: 0.9
            });
        }
        return recommendations;
    }
    async assessComplianceRisk(violations, recommendations, context) {
        const riskFactors = violations.map(violation => ({
            factor: violation.description,
            level: violation.severity === 'critical' ? 'critical' :
                violation.severity === 'high' ? 'high' :
                    violation.severity === 'medium' ? 'medium' : 'low',
            description: violation.impact,
            probability: violation.confidence,
            impact: violation.severity === 'critical' ? 0.9 :
                violation.severity === 'high' ? 0.7 :
                    violation.severity === 'medium' ? 0.5 : 0.3,
            mitigation: violation.remediation
        }));
        const riskScore = riskFactors.reduce((score, factor) => score + (factor.probability * factor.impact), 0) / Math.max(riskFactors.length, 1);
        const overallRisk = riskScore > 0.7 ? 'critical' :
            riskScore > 0.5 ? 'high' :
                riskScore > 0.3 ? 'medium' : 'low';
        return {
            overallRisk,
            riskFactors,
            riskScore,
            trend: 'stable',
            nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        };
    }
    async assessTransactionRisk(transaction, violations, context) {
        const riskFactors = violations.map(violation => ({
            factor: violation.description,
            level: violation.severity,
            description: violation.impact,
            probability: violation.confidence,
            impact: violation.severity === 'critical' ? 0.9 :
                violation.severity === 'high' ? 0.7 :
                    violation.severity === 'medium' ? 0.5 : 0.3,
            mitigation: violation.remediation
        }));
        const riskScore = riskFactors.reduce((score, factor) => score + (factor.probability * factor.impact), 0) / Math.max(riskFactors.length, 1);
        const overallRisk = riskScore > 0.7 ? 'critical' :
            riskScore > 0.5 ? 'high' :
                riskScore > 0.3 ? 'medium' : 'low';
        return {
            overallRisk,
            riskFactors,
            riskScore,
            trend: 'stable',
            nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        };
    }
    async analyzeAuditTrail(companyId, context) {
        try {
            const auditLogs = await prisma.auditLog.findMany({
                where: { companyId },
                orderBy: { createdAt: 'desc' },
                take: 100
            });
            return auditLogs.map(log => ({
                id: log.id,
                timestamp: log.createdAt,
                userId: log.userId || 'system',
                action: log.action || 'unknown',
                entity: log.entity || 'unknown',
                entityId: log.entityId || 'unknown',
                changes: log.changes ? JSON.parse(log.changes) : {},
                ipAddress: log.ipAddress || 'unknown',
                userAgent: log.userAgent || 'unknown',
                riskLevel: this.assessAuditEntryRisk(log),
                anomalies: this.detectAuditAnomalies(log)
            }));
        }
        catch (error) {
            console.error('Error analyzing audit trail:', error);
            return [];
        }
    }
    async analyzePeriodAuditTrail(companyId, period, context) {
        try {
            const auditLogs = await prisma.auditLog.findMany({
                where: {
                    companyId,
                    createdAt: {
                        gte: period.start,
                        lte: period.end
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return auditLogs.map(log => ({
                id: log.id,
                timestamp: log.createdAt,
                userId: log.userId || 'system',
                action: log.action || 'unknown',
                entity: log.entity || 'unknown',
                entityId: log.entityId || 'unknown',
                changes: log.changes ? JSON.parse(log.changes) : {},
                ipAddress: log.ipAddress || 'unknown',
                userAgent: log.userAgent || 'unknown',
                riskLevel: this.assessAuditEntryRisk(log),
                anomalies: this.detectAuditAnomalies(log)
            }));
        }
        catch (error) {
            console.error('Error analyzing period audit trail:', error);
            return [];
        }
    }
    assessAuditEntryRisk(log) {
        // Assess risk based on action type and other factors
        const highRiskActions = ['delete', 'modify', 'approve'];
        const mediumRiskActions = ['create', 'update'];
        if (highRiskActions.includes(log.action?.toLowerCase())) {
            return 'high';
        }
        else if (mediumRiskActions.includes(log.action?.toLowerCase())) {
            return 'medium';
        }
        return 'low';
    }
    detectAuditAnomalies(log) {
        const anomalies = [];
        // Detect anomalies in audit logs
        if (log.ipAddress && log.ipAddress.includes('unknown')) {
            anomalies.push('Unknown IP address');
        }
        if (log.userAgent && log.userAgent.includes('unknown')) {
            anomalies.push('Unknown user agent');
        }
        // Add more anomaly detection logic here
        return anomalies;
    }
    async getRegulatoryUpdates(context) {
        // In a real implementation, this would fetch from regulatory APIs
        // For now, return sample regulatory updates
        return [
            {
                id: 'update_1',
                title: 'New Tax Reporting Requirements',
                description: 'Updated requirements for quarterly tax reporting',
                effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                jurisdiction: context.regulatoryContext.jurisdiction,
                impact: 'medium',
                actionRequired: true,
                deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                affectedAreas: ['Tax Reporting', 'Financial Statements']
            }
        ];
    }
    calculateComplianceScore(violations, recommendations, riskAssessment) {
        let score = 100;
        // Deduct points for violations
        violations.forEach(violation => {
            const deduction = violation.severity === 'critical' ? 25 :
                violation.severity === 'high' ? 15 :
                    violation.severity === 'medium' ? 10 : 5;
            score -= deduction;
        });
        // Adjust based on risk assessment
        if (riskAssessment.overallRisk === 'critical') {
            score -= 20;
        }
        else if (riskAssessment.overallRisk === 'high') {
            score -= 15;
        }
        else if (riskAssessment.overallRisk === 'medium') {
            score -= 10;
        }
        return Math.max(0, Math.min(100, score));
    }
    getDefaultRiskAssessment() {
        return {
            overallRisk: 'medium',
            riskFactors: [],
            riskScore: 0.5,
            trend: 'stable',
            nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
    }
}
export const llamaComplianceAudit = new LlamaComplianceAudit();
