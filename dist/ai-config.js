import { prisma } from './prisma.js';
// Default Industry Configurations
export const DEFAULT_INDUSTRY_CONFIGS = [
    {
        name: 'Technology',
        code: 'TECH',
        description: 'Software, IT services, and technology companies',
        defaultCategories: [
            { name: 'Software Licenses', description: 'Software and SaaS subscriptions', keywords: ['software', 'license', 'saas', 'subscription', 'microsoft', 'adobe'], confidence: 85, color: '#3B82F6', isActive: true },
            { name: 'Cloud Services', description: 'Cloud infrastructure and hosting', keywords: ['aws', 'azure', 'google cloud', 'hosting', 'server', 'cloud'], confidence: 90, color: '#10B981', isActive: true },
            { name: 'Hardware', description: 'Computers, servers, and IT equipment', keywords: ['computer', 'server', 'laptop', 'hardware', 'equipment'], confidence: 80, color: '#F59E0B', isActive: true },
            { name: 'Professional Services', description: 'Consulting and professional services', keywords: ['consulting', 'professional', 'service', 'expert'], confidence: 75, color: '#8B5CF6', isActive: true }
        ],
        aiPrompts: {
            transactionCategorization: {
                systemPrompt: 'You are an expert AI assistant specializing in technology company accounting. You understand software licenses, cloud services, hardware purchases, and professional services.',
                userPromptTemplate: 'Categorize this transaction for a technology company:\n\nDescription: "{description}"\nAmount: {amount}\nTransaction Type: {transactionType}\n\nConsider technology-specific categories like Software Licenses, Cloud Services, Hardware, and Professional Services.',
                responseFormat: 'Category: [category] | Confidence: [number] | Reasoning: [brief explanation]'
            }
        },
        behaviorSettings: {
            confidenceThresholds: {
                categorization: 70,
                anomalyDetection: 75,
                fraudDetection: 85,
                insights: 80
            }
        }
    },
    {
        name: 'Retail',
        code: 'RETAIL',
        description: 'Retail stores and e-commerce businesses',
        defaultCategories: [
            { name: 'Inventory', description: 'Product purchases and inventory costs', keywords: ['inventory', 'product', 'stock', 'goods', 'merchandise'], confidence: 90, color: '#EF4444', isActive: true },
            { name: 'Shipping & Logistics', description: 'Shipping, delivery, and logistics costs', keywords: ['shipping', 'delivery', 'logistics', 'freight', 'transport'], confidence: 85, color: '#06B6D4', isActive: true },
            { name: 'Marketing & Advertising', description: 'Marketing campaigns and advertising', keywords: ['marketing', 'advertising', 'campaign', 'promotion', 'ads'], confidence: 80, color: '#EC4899', isActive: true },
            { name: 'Store Operations', description: 'Store rent, utilities, and operations', keywords: ['rent', 'utilities', 'store', 'operations', 'maintenance'], confidence: 75, color: '#84CC16', isActive: true }
        ],
        aiPrompts: {
            transactionCategorization: {
                systemPrompt: 'You are an expert AI assistant specializing in retail business accounting. You understand inventory management, shipping costs, marketing expenses, and store operations.',
                userPromptTemplate: 'Categorize this transaction for a retail business:\n\nDescription: "{description}"\nAmount: {amount}\nTransaction Type: {transactionType}\n\nConsider retail-specific categories like Inventory, Shipping & Logistics, Marketing & Advertising, and Store Operations.',
                responseFormat: 'Category: [category] | Confidence: [number] | Reasoning: [brief explanation]'
            }
        },
        behaviorSettings: {
            confidenceThresholds: {
                categorization: 75,
                anomalyDetection: 80,
                fraudDetection: 90,
                insights: 85
            }
        }
    },
    {
        name: 'Manufacturing',
        code: 'MANUFACTURING',
        description: 'Manufacturing and production companies',
        defaultCategories: [
            { name: 'Raw Materials', description: 'Raw materials and components', keywords: ['raw', 'material', 'component', 'supply', 'ingredient'], confidence: 90, color: '#7C3AED', isActive: true },
            { name: 'Equipment & Machinery', description: 'Manufacturing equipment and machinery', keywords: ['equipment', 'machinery', 'machine', 'tool', 'manufacturing'], confidence: 85, color: '#DC2626', isActive: true },
            { name: 'Labor Costs', description: 'Direct labor and production wages', keywords: ['labor', 'wage', 'salary', 'production', 'worker'], confidence: 80, color: '#EA580C', isActive: true },
            { name: 'Quality Control', description: 'Quality assurance and testing costs', keywords: ['quality', 'testing', 'inspection', 'assurance', 'control'], confidence: 75, color: '#059669', isActive: true }
        ],
        aiPrompts: {
            transactionCategorization: {
                systemPrompt: 'You are an expert AI assistant specializing in manufacturing accounting. You understand raw materials, equipment costs, labor expenses, and quality control.',
                userPromptTemplate: 'Categorize this transaction for a manufacturing company:\n\nDescription: "{description}"\nAmount: {amount}\nTransaction Type: {transactionType}\n\nConsider manufacturing-specific categories like Raw Materials, Equipment & Machinery, Labor Costs, and Quality Control.',
                responseFormat: 'Category: [category] | Confidence: [number] | Reasoning: [brief explanation]'
            }
        },
        behaviorSettings: {
            confidenceThresholds: {
                categorization: 80,
                anomalyDetection: 85,
                fraudDetection: 90,
                insights: 85
            }
        }
    },
    {
        name: 'Healthcare',
        code: 'HEALTHCARE',
        description: 'Healthcare providers and medical services',
        defaultCategories: [
            { name: 'Medical Supplies', description: 'Medical equipment and supplies', keywords: ['medical', 'supply', 'equipment', 'device', 'instrument'], confidence: 90, color: '#DC2626', isActive: true },
            { name: 'Professional Services', description: 'Medical professional services', keywords: ['doctor', 'nurse', 'professional', 'medical', 'service'], confidence: 85, color: '#2563EB', isActive: true },
            { name: 'Insurance & Compliance', description: 'Insurance and regulatory compliance', keywords: ['insurance', 'compliance', 'regulatory', 'license', 'certification'], confidence: 80, color: '#7C2D12', isActive: true },
            { name: 'Facility Operations', description: 'Facility maintenance and operations', keywords: ['facility', 'maintenance', 'operation', 'building', 'clinic'], confidence: 75, color: '#059669', isActive: true }
        ],
        aiPrompts: {
            transactionCategorization: {
                systemPrompt: 'You are an expert AI assistant specializing in healthcare accounting. You understand medical supplies, professional services, insurance, and facility operations.',
                userPromptTemplate: 'Categorize this transaction for a healthcare provider:\n\nDescription: "{description}"\nAmount: {amount}\nTransaction Type: {transactionType}\n\nConsider healthcare-specific categories like Medical Supplies, Professional Services, Insurance & Compliance, and Facility Operations.',
                responseFormat: 'Category: [category] | Confidence: [number] | Reasoning: [brief explanation]'
            }
        },
        behaviorSettings: {
            confidenceThresholds: {
                categorization: 85,
                anomalyDetection: 90,
                fraudDetection: 95,
                insights: 90
            }
        }
    }
];
// Default AI Configuration
export const DEFAULT_AI_CONFIG = {
    transactionCategorization: {
        systemPrompt: 'You are an expert accounting AI assistant. Provide accurate, helpful responses for financial analysis and categorization.',
        userPromptTemplate: 'Categorize this transaction for accounting purposes:\n\nDescription: "{description}"\nAmount: {amount}\nTransaction Type: {transactionType}\n\nPlease categorize this into one of these standard accounting categories:\n- Revenue: Sales, Service Income, Interest Income\n- Expenses: Office Supplies, Travel, Utilities, Rent, Insurance, Marketing, Software, Equipment\n- Assets: Cash, Accounts Receivable, Inventory, Equipment\n- Liabilities: Accounts Payable, Loans, Credit Cards\n\nRespond with only the category name and confidence level (0-100). Format: "Category: [category] | Confidence: [number] | Reasoning: [brief explanation]"',
        responseFormat: 'Category: [category] | Confidence: [number] | Reasoning: [brief explanation]'
    },
    anomalyDetection: {
        systemPrompt: 'You are an expert fraud detection AI assistant. Analyze transactions for potential anomalies, duplicates, and suspicious activity.',
        duplicateAnalysisPrompt: 'Analyze these transactions for potential duplicates:\n\n{transactions}\n\nAre these likely duplicates? Consider:\n1. Same amount and date\n2. Similar descriptions\n3. Same vendor/customer\n4. Timing patterns\n\nRespond with: "Duplicate: [yes/no] | Confidence: [0-100] | Type: [duplicate/unusual_amount/fraud_suspicious] | Severity: [low/medium/high/critical] | Description: [explanation]"',
        fraudAnalysisPrompt: 'Analyze this transaction for potential fraud or errors:\n\nTransaction: {transaction}\nAverage transaction amount: {average}\nStandard deviation: {stdDev}\nZ-score: {zScore}\n\nIs this transaction suspicious? Consider:\n1. Amount significantly different from normal\n2. Description patterns\n3. Timing and frequency\n4. Vendor/customer history\n\nRespond with: "Suspicious: [yes/no] | Confidence: [0-100] | Type: [duplicate/unusual_amount/fraud_suspicious] | Severity: [low/medium/high/critical] | Description: [explanation]"',
        responseFormat: 'Duplicate: [yes/no] | Confidence: [0-100] | Type: [type] | Severity: [severity] | Description: [explanation]'
    },
    naturalLanguageReports: {
        systemPrompt: 'You are an expert SQL and financial reporting AI assistant. Generate accurate SQL queries for financial data analysis.',
        sqlGenerationPrompt: 'Generate a SQL query for this natural language request:\n\n"{query}"\n\nAvailable tables and their key fields:\n- transactions: id, amount, description, transactionDate, transactionType, category\n- invoices: id, totalAmount, dueDate, status, customerId\n- bills: id, totalAmount, dueDate, status, vendorId\n- customers: id, name, email\n- vendors: id, name, email\n\nGenerate a SQL query that answers this question. Consider:\n1. Date filtering if mentioned\n2. Aggregations (SUM, COUNT, AVG) as needed\n3. Joins if multiple tables are needed\n4. WHERE clauses for filtering\n\nRespond with only the SQL query.',
        summaryPrompt: 'Summarize these financial results in natural language:\n\nQuery: "{query}"\nResults: {results}\n\nProvide a clear, professional summary that answers the original question.'
    },
    smartInsights: {
        systemPrompt: 'You are an expert financial analysis AI assistant. Provide insights on cash flow, trends, and business recommendations.',
        cashFlowAnalysisPrompt: 'Analyze this cash flow data and provide insights:\n\n{data}\n\nIdentify:\n1. Cash flow trends\n2. Seasonal patterns\n3. Potential cash shortages\n4. Optimization opportunities\n\nProvide insights in this format:\n"Insight: [title] | Type: [cash_flow/revenue/expense/compliance/opportunity] | Priority: [low/medium/high/critical] | Confidence: [0-100] | Description: [detailed explanation] | Actionable: [yes/no] | Impact: [business impact] | Actions: [suggested actions]"',
        predictionPrompt: 'Based on this historical cash flow data, predict the next 3 months:\n\n{data}\n\nProvide predictions in this format:\n"Month: [month] | Predicted: [amount] | Confidence: [0-100] | Risk: [low/medium/high] | Factors: [key factors affecting prediction]"',
        responseFormat: 'Insight: [title] | Type: [type] | Priority: [priority] | Confidence: [number] | Description: [description] | Actionable: [yes/no] | Impact: [impact] | Actions: [actions]'
    },
    aiAssistant: {
        systemPrompt: 'You are an expert accounting AI assistant for a business. You have access to financial data and can help with:\n\n1. Transaction categorization and bookkeeping\n2. Financial analysis and reporting\n3. Anomaly detection and fraud prevention\n4. Cash flow forecasting and insights\n5. Compliance and tax optimization\n6. Business recommendations\n\nProvide helpful, accurate responses. If you need to perform actions, specify them clearly.',
        responseFormat: 'Response: [your helpful response] | Actions: [comma-separated list of actions] | Confidence: [0-100] | Data: [any specific data or parameters]'
    }
};
export const DEFAULT_BEHAVIOR_CONFIG = {
    confidenceThresholds: {
        categorization: 70,
        anomalyDetection: 75,
        fraudDetection: 85,
        insights: 80
    },
    autoActions: {
        autoCategorize: true,
        autoFlagAnomalies: true,
        autoGenerateInsights: false,
        requireApproval: false
    },
    learningSettings: {
        enableFeedbackLearning: true,
        minFeedbackCount: 5,
        confidenceAdjustment: 0.1
    },
    modelSettings: {
        temperature: 0.3,
        topP: 0.9,
        maxTokens: 2048,
        modelName: 'llama3.1:8b'
    }
};
// AI Configuration Service
export class AIConfigurationService {
    async getConfiguration(tenantId, companyId, configType) {
        const result = await prisma.aIConfig.findFirst({
            where: {
                tenantId,
                companyId,
                configType: configType,
                isActive: true
            }
        });
        if (result) {
            return {
                ...result,
                configType: result.configType
            };
        }
        return null;
    }
    async saveConfiguration(tenantId, companyId, configType, configData) {
        const result = await prisma.aIConfig.upsert({
            where: {
                tenantId_companyId_configType: {
                    tenantId,
                    companyId,
                    configType: configType
                }
            },
            update: {
                configData,
                updatedAt: new Date()
            },
            create: {
                tenantId,
                companyId,
                configType: configType,
                configData,
                isActive: true
            }
        });
        return {
            ...result,
            configType: result.configType
        };
    }
    async getIndustryConfig(industryCode) {
        return DEFAULT_INDUSTRY_CONFIGS.find(config => config.code === industryCode) || null;
    }
    async getCustomizedPrompts(tenantId, companyId) {
        const config = await this.getConfiguration(tenantId, companyId, 'prompts');
        if (config) {
            return { ...DEFAULT_AI_CONFIG, ...config.configData };
        }
        return DEFAULT_AI_CONFIG;
    }
    async getCustomizedBehavior(tenantId, companyId) {
        const config = await this.getConfiguration(tenantId, companyId, 'behavior');
        if (config) {
            return { ...DEFAULT_BEHAVIOR_CONFIG, ...config.configData };
        }
        return DEFAULT_BEHAVIOR_CONFIG;
    }
    async getCustomizedCategories(tenantId, companyId) {
        const config = await this.getConfiguration(tenantId, companyId, 'categories');
        if (config) {
            return config.configData;
        }
        // Return default categories based on company industry
        const company = await prisma.company.findFirst({
            where: { tenantId, id: companyId }
        });
        if (company?.industry) {
            const industryConfig = await this.getIndustryConfig(company.industry);
            if (industryConfig) {
                return {
                    expenseCategories: industryConfig.defaultCategories,
                    revenueCategories: [],
                    assetCategories: [],
                    liabilityCategories: [],
                    industrySpecific: [{
                            industry: company.industry,
                            categories: industryConfig.defaultCategories,
                            priority: 1
                        }]
                };
            }
        }
        return {
            expenseCategories: [],
            revenueCategories: [],
            assetCategories: [],
            liabilityCategories: [],
            industrySpecific: []
        };
    }
    async updatePromptConfiguration(tenantId, companyId, prompts) {
        const currentConfig = await this.getCustomizedPrompts(tenantId, companyId);
        const updatedConfig = { ...currentConfig, ...prompts };
        await this.saveConfiguration(tenantId, companyId, 'prompts', updatedConfig);
    }
    async updateBehaviorConfiguration(tenantId, companyId, behavior) {
        const currentConfig = await this.getCustomizedBehavior(tenantId, companyId);
        const updatedConfig = { ...currentConfig, ...behavior };
        await this.saveConfiguration(tenantId, companyId, 'behavior', updatedConfig);
    }
    async updateCategoryConfiguration(tenantId, companyId, categories) {
        const currentConfig = await this.getCustomizedCategories(tenantId, companyId);
        const updatedConfig = { ...currentConfig, ...categories };
        await this.saveConfiguration(tenantId, companyId, 'categories', updatedConfig);
    }
    async applyIndustryConfiguration(tenantId, companyId, industryCode) {
        const industryConfig = await this.getIndustryConfig(industryCode);
        if (!industryConfig) {
            throw new Error(`Industry configuration not found for code: ${industryCode}`);
        }
        // Apply industry-specific prompts
        if (industryConfig.aiPrompts) {
            await this.updatePromptConfiguration(tenantId, companyId, industryConfig.aiPrompts);
        }
        // Apply industry-specific behavior settings
        if (industryConfig.behaviorSettings) {
            await this.updateBehaviorConfiguration(tenantId, companyId, industryConfig.behaviorSettings);
        }
        // Apply industry-specific categories
        await this.updateCategoryConfiguration(tenantId, companyId, {
            industrySpecific: [{
                    industry: industryCode,
                    categories: industryConfig.defaultCategories,
                    priority: 1
                }]
        });
    }
}
export const aiConfigurationService = new AIConfigurationService();
