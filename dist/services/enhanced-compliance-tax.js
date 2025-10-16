import { prisma } from '../prisma';
import { EnhancedConversationalAIService } from './enhanced-conversational-ai';
// Enhanced Compliance & Tax Service
export class EnhancedComplianceTaxService {
    conversationalAI;
    constructor() {
        this.conversationalAI = new EnhancedConversationalAIService();
    }
    // Tax Calculation Engine
    async calculateTax(request) {
        try {
            // Get jurisdiction configuration
            const jurisdictionConfig = await this.getJurisdictionConfig(request.companyId, request.jurisdiction);
            // Process transactions and calculate tax
            const processedTransactions = await this.processTaxableTransactions(request.transactions, jurisdictionConfig);
            // Calculate summary
            const summary = this.calculateTaxSummary(processedTransactions);
            // Generate breakdowns
            const breakdown = this.generateTaxBreakdown(processedTransactions);
            // Check compliance
            const compliance = await this.checkTaxCompliance(request, summary, breakdown);
            // Create tax calculation record
            const taxCalculation = await prisma.taxCalculation.create({
                data: {
                    tenantId: 'demo-tenant-id',
                    companyId: request.companyId,
                    taxAmount: summary.netTaxLiability,
                    baseAmount: summary.totalSales + summary.totalPurchases,
                    taxRateId: 'demo-tax-rate-id',
                    calculationType: request.taxType,
                    effectiveRate: summary.netTaxLiability / (summary.totalSales + summary.totalPurchases) * 100,
                    transactionId: null,
                    exemptions: null,
                    metadata: JSON.stringify({
                        jurisdiction: request.jurisdiction,
                        periodStart: request.period.start,
                        periodEnd: request.period.end,
                        currency: request.currency,
                        totalSales: summary.totalSales,
                        totalPurchases: summary.totalPurchases,
                        inputTax: summary.inputTax,
                        outputTax: summary.outputTax,
                        taxPayable: summary.taxPayable,
                        taxRefundable: summary.taxRefundable,
                        status: 'calculated'
                    })
                }
            });
            return {
                id: taxCalculation.id,
                companyId: request.companyId,
                jurisdiction: request.jurisdiction,
                period: request.period,
                taxType: request.taxType,
                currency: request.currency,
                summary,
                breakdown,
                compliance,
                metadata: request.metadata
            };
        }
        catch (error) {
            console.error('Tax calculation failed:', error);
            throw new Error('Failed to calculate tax');
        }
    }
    // Process taxable transactions
    async processTaxableTransactions(transactions, jurisdictionConfig) {
        const processed = [];
        for (const transaction of transactions) {
            // Apply jurisdiction-specific rules
            const taxRate = this.determineTaxRate(transaction, jurisdictionConfig);
            const taxAmount = transaction.amount * (taxRate / 100);
            processed.push({
                ...transaction,
                taxRate,
                taxAmount
            });
        }
        return processed;
    }
    // Determine applicable tax rate
    determineTaxRate(transaction, jurisdictionConfig) {
        const taxType = this.getTaxTypeFromCategory(transaction.category);
        const taxConfig = jurisdictionConfig.taxTypes.find(t => t.type === taxType);
        if (!taxConfig) {
            return 0; // No tax applicable
        }
        // Find applicable rate based on date and conditions
        const applicableRate = taxConfig.rates.find(rate => {
            const isEffective = transaction.date >= rate.effectiveDate;
            const isNotExpired = !rate.endDate || transaction.date <= rate.endDate;
            return isEffective && isNotExpired;
        });
        return applicableRate?.rate || 0;
    }
    // Get tax type from category
    getTaxTypeFromCategory(category) {
        const categoryMap = {
            'sales': 'VAT',
            'purchases': 'VAT',
            'services': 'VAT',
            'goods': 'VAT',
            'imports': 'CustomDuty',
            'exports': 'CustomDuty',
            'payroll': 'PayrollTax',
            'corporate': 'CorporateTax'
        };
        const lowerCategory = category.toLowerCase();
        for (const [key, value] of Object.entries(categoryMap)) {
            if (lowerCategory.includes(key)) {
                return value;
            }
        }
        return 'VAT'; // Default
    }
    // Calculate tax summary
    calculateTaxSummary(transactions) {
        const summary = {
            totalSales: 0,
            totalPurchases: 0,
            netTaxLiability: 0,
            inputTax: 0,
            outputTax: 0,
            taxPayable: 0,
            taxRefundable: 0
        };
        for (const transaction of transactions) {
            if (transaction.isInput) {
                summary.totalPurchases += transaction.amount;
                summary.inputTax += transaction.taxAmount;
            }
            else {
                summary.totalSales += transaction.amount;
                summary.outputTax += transaction.taxAmount;
            }
        }
        summary.netTaxLiability = summary.outputTax - summary.inputTax;
        if (summary.netTaxLiability > 0) {
            summary.taxPayable = summary.netTaxLiability;
        }
        else {
            summary.taxRefundable = Math.abs(summary.netTaxLiability);
        }
        return summary;
    }
    // Generate tax breakdown
    generateTaxBreakdown(transactions) {
        const breakdown = {
            byCategory: {},
            byVendor: {},
            byCustomer: {}
        };
        // Group by category
        for (const transaction of transactions) {
            if (!breakdown.byCategory[transaction.category]) {
                breakdown.byCategory[transaction.category] = {
                    category: transaction.category,
                    totalAmount: 0,
                    taxAmount: 0,
                    transactionCount: 0,
                    averageRate: 0
                };
            }
            const category = breakdown.byCategory[transaction.category];
            category.totalAmount += transaction.amount;
            category.taxAmount += transaction.taxAmount;
            category.transactionCount += 1;
            category.averageRate = category.taxAmount / category.totalAmount * 100;
        }
        // Group by vendor (for input transactions)
        for (const transaction of transactions) {
            if (transaction.isInput && transaction.vendorId) {
                if (!breakdown.byVendor[transaction.vendorId]) {
                    breakdown.byVendor[transaction.vendorId] = {
                        vendorId: transaction.vendorId,
                        vendorName: 'Unknown Vendor', // Would fetch from database
                        totalAmount: 0,
                        taxAmount: 0,
                        transactionCount: 0,
                        taxRate: 0
                    };
                }
                const vendor = breakdown.byVendor[transaction.vendorId];
                vendor.totalAmount += transaction.amount;
                vendor.taxAmount += transaction.taxAmount;
                vendor.transactionCount += 1;
                vendor.taxRate = vendor.taxAmount / vendor.totalAmount * 100;
            }
        }
        // Group by customer (for output transactions)
        for (const transaction of transactions) {
            if (!transaction.isInput && transaction.customerId) {
                if (!breakdown.byCustomer[transaction.customerId]) {
                    breakdown.byCustomer[transaction.customerId] = {
                        customerId: transaction.customerId,
                        customerName: 'Unknown Customer', // Would fetch from database
                        totalAmount: 0,
                        taxAmount: 0,
                        transactionCount: 0,
                        taxRate: 0
                    };
                }
                const customer = breakdown.byCustomer[transaction.customerId];
                customer.totalAmount += transaction.amount;
                customer.taxAmount += transaction.taxAmount;
                customer.transactionCount += 1;
                customer.taxRate = customer.taxAmount / customer.totalAmount * 100;
            }
        }
        return breakdown;
    }
    // Check tax compliance
    async checkTaxCompliance(request, summary, breakdown) {
        const compliance = {
            isCompliant: true,
            warnings: [],
            errors: [],
            recommendations: []
        };
        // Check for large transactions
        if (summary.totalSales > 1000000) {
            compliance.warnings.push('Large sales volume detected - consider audit trail');
        }
        if (summary.totalPurchases > 1000000) {
            compliance.warnings.push('Large purchase volume detected - consider audit trail');
        }
        // Check for unusual tax rates
        for (const [category, catBreakdown] of Object.entries(breakdown.byCategory)) {
            const categoryBreakdown = catBreakdown;
            if (categoryBreakdown.averageRate > 25) {
                compliance.warnings.push(`Unusually high tax rate for category: ${category}`);
            }
        }
        // Check for negative tax liability
        if (summary.netTaxLiability < 0) {
            compliance.warnings.push('Negative tax liability - may indicate refund scenario');
        }
        // Check for missing vendor/customer information
        const inputTransactions = request.transactions.filter(t => t.isInput);
        const outputTransactions = request.transactions.filter(t => !t.isInput);
        const missingVendorInfo = inputTransactions.filter(t => !t.vendorId).length;
        const missingCustomerInfo = outputTransactions.filter(t => !t.customerId).length;
        if (missingVendorInfo > 0) {
            compliance.warnings.push(`${missingVendorInfo} input transactions missing vendor information`);
        }
        if (missingCustomerInfo > 0) {
            compliance.warnings.push(`${missingCustomerInfo} output transactions missing customer information`);
        }
        // Generate recommendations
        if (summary.taxPayable > 0) {
            compliance.recommendations.push('Ensure timely payment of tax liability to avoid penalties');
        }
        if (summary.taxRefundable > 0) {
            compliance.recommendations.push('Consider filing for tax refund to improve cash flow');
        }
        if (compliance.warnings.length > 0 || compliance.errors.length > 0) {
            compliance.isCompliant = false;
        }
        return compliance;
    }
    // Get jurisdiction configuration
    async getJurisdictionConfig(companyId, jurisdiction) {
        // In real implementation, this would fetch from database
        // For now, return mock configuration
        return {
            code: jurisdiction,
            name: jurisdiction === 'US' ? 'United States' : jurisdiction === 'UK' ? 'United Kingdom' : jurisdiction,
            taxTypes: [
                {
                    type: 'VAT',
                    name: 'Value Added Tax',
                    rates: [
                        { rate: 20, effectiveDate: new Date('2020-01-01'), description: 'Standard Rate' },
                        { rate: 5, effectiveDate: new Date('2020-01-01'), description: 'Reduced Rate' },
                        { rate: 0, effectiveDate: new Date('2020-01-01'), description: 'Zero Rate' }
                    ],
                    thresholds: [
                        { amount: 85000, effectiveDate: new Date('2020-01-01'), description: 'VAT Registration Threshold' }
                    ],
                    exemptions: [
                        { code: 'EXEMPT', description: 'Exempt supplies', conditions: 'Financial services, insurance', isActive: true }
                    ],
                    isActive: true,
                    metadata: {}
                }
            ],
            complianceRules: ['VAT_RULE_001', 'VAT_RULE_002'],
            filingRequirements: [
                {
                    taxType: 'VAT',
                    frequency: 'quarterly',
                    dueDay: 7,
                    extensions: 30,
                    penalties: [
                        { daysLate: 1, penaltyType: 'percentage', penaltyAmount: 5, description: '5% penalty for late filing' },
                        { daysLate: 30, penaltyType: 'percentage', penaltyAmount: 10, description: '10% penalty for very late filing' }
                    ],
                    isActive: true
                }
            ],
            currency: 'USD',
            isActive: true,
            metadata: {}
        };
    }
    // Compliance Monitoring
    async checkCompliance(companyId, period) {
        try {
            const checks = [];
            // Get active compliance rules
            const rules = await this.getActiveComplianceRules(companyId);
            for (const rule of rules) {
                const check = await this.evaluateComplianceRule(companyId, rule, period);
                checks.push(check);
            }
            // Save compliance checks (temporary implementation - Prisma model not available)
            for (const check of checks) {
                // TODO: Implement actual compliance check storage when model is available
                console.log('Compliance check result:', {
                    ruleId: check.ruleId,
                    checkId: check.id,
                    checkDate: check.checkDate,
                    details: check.details,
                    recommendations: check.recommendations,
                    status: check.status
                });
            }
            return checks;
        }
        catch (error) {
            console.error('Compliance check failed:', error);
            throw new Error('Failed to check compliance');
        }
    }
    // Get active compliance rules
    async getActiveComplianceRules(companyId) {
        // In real implementation, this would fetch from database
        // For now, return mock rules
        return [
            {
                id: 'rule-001',
                name: 'VAT Registration Threshold',
                description: 'Check if company exceeds VAT registration threshold',
                ruleType: 'validation',
                jurisdiction: 'UK',
                standard: 'Local',
                severity: 'high',
                condition: 'total_sales > 85000',
                action: 'register_for_vat',
                isActive: true,
                metadata: {}
            },
            {
                id: 'rule-002',
                name: 'Tax Calculation Accuracy',
                description: 'Verify tax calculations are accurate',
                ruleType: 'calculation',
                jurisdiction: 'UK',
                standard: 'Local',
                severity: 'critical',
                condition: 'tax_calculation_error_rate < 0.01',
                action: 'review_calculations',
                isActive: true,
                metadata: {}
            }
        ];
    }
    // Evaluate compliance rule
    async evaluateComplianceRule(companyId, rule, period) {
        const check = {
            id: `check-${Date.now()}`,
            companyId,
            ruleId: rule.id,
            checkDate: new Date(),
            status: 'passed',
            details: '',
            recommendations: [],
            metadata: {}
        };
        try {
            // Evaluate rule condition
            const isCompliant = await this.evaluateRuleCondition(companyId, rule.condition, period);
            if (isCompliant) {
                check.status = 'passed';
                check.details = `Rule "${rule.name}" passed successfully`;
            }
            else {
                check.status = rule.severity === 'critical' ? 'failed' : 'warning';
                check.details = `Rule "${rule.name}" failed - ${rule.action} required`;
                check.recommendations.push(rule.action);
            }
        }
        catch (error) {
            check.status = 'failed';
            check.details = `Error evaluating rule: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
        return check;
    }
    // Evaluate rule condition
    async evaluateRuleCondition(companyId, condition, period) {
        // Simple condition evaluation - in real implementation, this would be more sophisticated
        if (condition.includes('total_sales > 85000')) {
            const totalSales = await this.getTotalSales(companyId, period);
            return totalSales > 85000;
        }
        if (condition.includes('tax_calculation_error_rate < 0.01')) {
            const errorRate = await this.getTaxCalculationErrorRate(companyId, period);
            return errorRate < 0.01;
        }
        return true; // Default to compliant
    }
    // Get total sales for period
    async getTotalSales(companyId, period) {
        const transactions = await prisma.transaction.findMany({
            where: {
                companyId,
                transactionDate: {
                    gte: period.start,
                    lte: period.end
                },
                transactionType: 'sale'
            }
        });
        return transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    }
    // Get tax calculation error rate
    async getTaxCalculationErrorRate(companyId, period) {
        // Mock implementation - would calculate actual error rate
        return 0.005; // 0.5% error rate
    }
    // Tax Filing Assistant
    async prepareTaxFiling(request) {
        try {
            // Get tax calculation for the period
            const taxCalculation = await this.getTaxCalculationForPeriod(request.companyId, request.jurisdiction, request.period);
            if (!taxCalculation) {
                throw new Error('No tax calculation found for the specified period');
            }
            // Generate filing documents
            const documents = await this.generateFilingDocuments(taxCalculation, request);
            // Create filing record (temporary implementation - Prisma model not available)
            const filing = {
                id: `filing-${Date.now()}`,
                tenantId: 'demo-tenant-id',
                companyId: request.companyId,
                filedDate: new Date(),
                amount: taxCalculation.netTaxLiability || 0,
                reference: `TAX-${request.jurisdiction}-${request.period.start.getFullYear()}-${request.period.start.getMonth() + 1}`
            };
            return {
                id: filing.id,
                companyId: request.companyId,
                jurisdiction: request.jurisdiction,
                period: request.period,
                taxType: request.taxType,
                filingType: request.filingType,
                dueDate: request.dueDate,
                filedDate: filing.filedDate,
                status: 'draft',
                amount: filing.amount,
                reference: filing.reference,
                documents,
                metadata: request.metadata
            };
        }
        catch (error) {
            console.error('Tax filing preparation failed:', error);
            throw new Error('Failed to prepare tax filing');
        }
    }
    // Get tax calculation for period
    async getTaxCalculationForPeriod(companyId, jurisdiction, period) {
        const calculation = await prisma.taxCalculation.findFirst({
            where: {
                companyId,
                metadata: {
                    contains: jurisdiction
                }
            }
        });
        // Parse metadata to get the actual calculation data
        if (calculation && calculation.metadata) {
            const metadata = JSON.parse(calculation.metadata);
            return {
                ...calculation,
                jurisdiction: metadata.jurisdiction,
                periodStart: metadata.periodStart,
                periodEnd: metadata.periodEnd,
                totalSales: metadata.totalSales,
                totalPurchases: metadata.totalPurchases,
                netTaxLiability: metadata.netTaxLiability,
                inputTax: metadata.inputTax,
                outputTax: metadata.outputTax,
                taxPayable: metadata.taxPayable,
                taxRefundable: metadata.taxRefundable
            };
        }
        return calculation;
    }
    // Generate filing documents
    async generateFilingDocuments(taxCalculation, request) {
        const documents = [];
        // Generate tax return
        const taxReturn = this.generateTaxReturn(taxCalculation, request);
        documents.push({
            id: `doc-${Date.now()}-1`,
            name: 'Tax Return',
            type: 'return',
            content: taxReturn,
            format: 'json',
            metadata: {}
        });
        // Generate supporting schedules
        const schedules = this.generateSupportingSchedules(taxCalculation);
        documents.push(...schedules);
        return documents;
    }
    // Generate tax return
    generateTaxReturn(taxCalculation, request) {
        return JSON.stringify({
            filingType: request.filingType,
            period: request.period,
            jurisdiction: request.jurisdiction,
            taxType: request.taxType,
            summary: {
                totalSales: taxCalculation.totalSales,
                totalPurchases: taxCalculation.totalPurchases,
                netTaxLiability: taxCalculation.netTaxLiability,
                inputTax: taxCalculation.inputTax,
                outputTax: taxCalculation.outputTax,
                taxPayable: taxCalculation.taxPayable,
                taxRefundable: taxCalculation.taxRefundable
            },
            filingDate: new Date().toISOString(),
            dueDate: request.dueDate.toISOString()
        }, null, 2);
    }
    // Generate supporting schedules
    generateSupportingSchedules(taxCalculation) {
        const schedules = [];
        // Sales schedule
        schedules.push({
            id: `schedule-${Date.now()}-1`,
            name: 'Sales Schedule',
            type: 'schedule',
            content: JSON.stringify({ type: 'sales', total: taxCalculation.totalSales }),
            format: 'json',
            metadata: {}
        });
        // Purchase schedule
        schedules.push({
            id: `schedule-${Date.now()}-2`,
            name: 'Purchase Schedule',
            type: 'schedule',
            content: JSON.stringify({ type: 'purchases', total: taxCalculation.totalPurchases }),
            format: 'json',
            metadata: {}
        });
        return schedules;
    }
    // Multi-Jurisdiction Support
    async getMultiJurisdictionConfig(companyId) {
        try {
            // In real implementation, this would fetch from database
            // For now, return mock configuration
            return {
                id: `config-${companyId}`,
                companyId,
                jurisdictions: [
                    {
                        code: 'UK',
                        name: 'United Kingdom',
                        taxTypes: [
                            {
                                type: 'VAT',
                                name: 'Value Added Tax',
                                rates: [
                                    { rate: 20, effectiveDate: new Date('2020-01-01'), description: 'Standard Rate' }
                                ],
                                thresholds: [
                                    { amount: 85000, effectiveDate: new Date('2020-01-01'), description: 'Registration Threshold' }
                                ],
                                exemptions: [],
                                isActive: true,
                                metadata: {}
                            }
                        ],
                        complianceRules: ['VAT_RULE_001'],
                        filingRequirements: [
                            {
                                taxType: 'VAT',
                                frequency: 'quarterly',
                                dueDay: 7,
                                extensions: 30,
                                penalties: [],
                                isActive: true
                            }
                        ],
                        currency: 'GBP',
                        isActive: true,
                        metadata: {}
                    },
                    {
                        code: 'US',
                        name: 'United States',
                        taxTypes: [
                            {
                                type: 'SalesTax',
                                name: 'Sales Tax',
                                rates: [
                                    { rate: 8.5, effectiveDate: new Date('2020-01-01'), description: 'Standard Rate' }
                                ],
                                thresholds: [],
                                exemptions: [],
                                isActive: true,
                                metadata: {}
                            }
                        ],
                        complianceRules: ['SALES_TAX_RULE_001'],
                        filingRequirements: [
                            {
                                taxType: 'SalesTax',
                                frequency: 'monthly',
                                dueDay: 20,
                                extensions: 15,
                                penalties: [],
                                isActive: true
                            }
                        ],
                        currency: 'USD',
                        isActive: true,
                        metadata: {}
                    }
                ],
                defaultCurrency: 'USD',
                exchangeRates: [
                    {
                        fromCurrency: 'USD',
                        toCurrency: 'GBP',
                        rate: 0.75,
                        effectiveDate: new Date(),
                        source: 'ECB',
                        metadata: {}
                    }
                ],
                metadata: {}
            };
        }
        catch (error) {
            console.error('Failed to get multi-jurisdiction config:', error);
            throw new Error('Failed to get jurisdiction configuration');
        }
    }
    // Currency Conversion
    async convertCurrency(amount, fromCurrency, toCurrency, date) {
        try {
            if (fromCurrency === toCurrency) {
                return amount;
            }
            // Get exchange rate
            const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency, date);
            return amount * exchangeRate;
        }
        catch (error) {
            console.error('Currency conversion failed:', error);
            throw new Error('Failed to convert currency');
        }
    }
    // Get exchange rate
    async getExchangeRate(fromCurrency, toCurrency, date) {
        // In real implementation, this would fetch from external API or database
        // For now, return mock rates
        const rates = {
            'USD_GBP': 0.75,
            'GBP_USD': 1.33,
            'USD_EUR': 0.85,
            'EUR_USD': 1.18
        };
        const key = `${fromCurrency}_${toCurrency}`;
        return rates[key] || 1.0; // Default to 1:1 if rate not found
    }
    // Get tax optimization recommendations
    async getTaxOptimizationRecommendations(companyId, period) {
        try {
            const recommendations = [];
            // Get tax calculations for the period
            const calculations = await prisma.taxCalculation.findMany({
                where: {
                    companyId,
                    calculatedAt: {
                        gte: period.start,
                        lte: period.end
                    }
                }
            });
            // Analyze for optimization opportunities
            for (const calculation of calculations) {
                // Parse metadata to get calculation details
                let calculationData = {};
                if (calculation.metadata) {
                    try {
                        calculationData = JSON.parse(calculation.metadata);
                    }
                    catch (e) {
                        console.warn('Failed to parse calculation metadata:', e);
                    }
                }
                const netTaxLiability = calculationData.netTaxLiability || Number(calculation.taxAmount);
                const inputTax = calculationData.inputTax || 0;
                const outputTax = calculationData.outputTax || 0;
                const totalSales = calculationData.totalSales || 0;
                const jurisdiction = calculationData.jurisdiction || '';
                if (netTaxLiability > 0) {
                    recommendations.push('Consider timing purchases to reduce tax liability');
                }
                if (inputTax > outputTax * 0.8) {
                    recommendations.push('High input tax - review VAT recovery opportunities');
                }
                if (totalSales > 85000 && jurisdiction === 'UK') {
                    recommendations.push('Approaching VAT threshold - consider registration timing');
                }
            }
            return recommendations;
        }
        catch (error) {
            console.error('Failed to get tax optimization recommendations:', error);
            return [];
        }
    }
}
export const enhancedComplianceTaxService = new EnhancedComplianceTaxService();
