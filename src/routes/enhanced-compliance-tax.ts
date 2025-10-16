import * as express from 'express';
import { asyncHandler } from '../errors';
import type { TenantRequest } from '../tenant';
import { enhancedComplianceTaxService } from '../services/enhanced-compliance-tax';
import { prisma } from '../prisma';

const router = express.Router();

// Tax Calculation Engine
router.post('/tax/calculate', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId, jurisdiction, period, transactions, taxType, currency } = req.body;
  const { tenantId } = req;

  if (!companyId || !jurisdiction || !period || !transactions || !taxType || !currency) {
    return res.status(400).json({ 
      error: 'Company ID, jurisdiction, period, transactions, tax type, and currency are required' 
    });
  }

  try {
    const result = await enhancedComplianceTaxService.calculateTax({
      companyId,
      jurisdiction,
      period: {
        start: new Date(period.start),
        end: new Date(period.end)
      },
      transactions,
      taxType,
      currency,
      metadata: req.body.metadata
    });

    res.json({
      success: true,
      message: 'Tax calculation completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error calculating tax:', error);
    res.status(500).json({ error: 'Failed to calculate tax' });
  }
}));

// Get tax calculations for company
router.get('/tax/calculations/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { jurisdiction, startDate, endDate, taxType } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const where: any = { companyId };
    
    if (jurisdiction) {
      where.jurisdiction = jurisdiction;
    }
    
    if (startDate && endDate) {
      where.periodStart = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    if (taxType) {
      where.taxType = taxType;
    }

    const calculations = await prisma.taxCalculation.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    res.json({
      success: true,
      data: calculations,
      count: calculations.length
    });
  } catch (error) {
    console.error('Error getting tax calculations:', error);
    res.status(500).json({ error: 'Failed to get tax calculations' });
  }
}));

// Get specific tax calculation
router.get('/tax/calculations/:companyId/:calculationId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId, calculationId } = req.params;

  if (!companyId || !calculationId) {
    return res.status(400).json({ error: 'Company ID and calculation ID are required' });
  }

  try {
    const calculation = await prisma.taxCalculation.findFirst({
      where: {
        id: calculationId,
        companyId
      }
    });

    if (!calculation) {
      return res.status(404).json({ error: 'Tax calculation not found' });
    }

    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    console.error('Error getting tax calculation:', error);
    res.status(500).json({ error: 'Failed to get tax calculation' });
  }
}));

// Compliance Monitoring
router.post('/compliance/check', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId, period } = req.body;
  const { tenantId } = req;

  if (!companyId || !period) {
    return res.status(400).json({ error: 'Company ID and period are required' });
  }

  try {
    const checks = await enhancedComplianceTaxService.checkCompliance(companyId, {
      start: new Date(period.start),
      end: new Date(period.end)
    });

    res.json({
      success: true,
      message: 'Compliance check completed successfully',
      data: checks,
      count: checks.length
    });
  } catch (error) {
    console.error('Error checking compliance:', error);
    res.status(500).json({ error: 'Failed to check compliance' });
  }
}));

// Get compliance checks for company
router.get('/compliance/checks/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { startDate, endDate, status } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const where: any = { companyId };
    
    if (startDate && endDate) {
      where.checkDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    if (status) {
      where.status = status;
    }

    const checks = await prisma.complianceCheck.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    res.json({
      success: true,
      data: checks.map(check => ({
        ...check,
        // recommendations: JSON.parse(check.recommendations || '[]') // TODO: Add when field is available
      })),
      count: checks.length
    });
  } catch (error) {
    console.error('Error getting compliance checks:', error);
    res.status(500).json({ error: 'Failed to get compliance checks' });
  }
}));

// Get compliance summary
router.get('/compliance/summary/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { period } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const where: any = { companyId };
    
    if (period) {
      const [startDate, endDate] = (period as string).split('_');
      where.checkDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const checks = await prisma.complianceCheck.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    const summary = {
      totalChecks: checks.length,
      passed: checks.filter(c => c.status === 'passed').length,
      failed: checks.filter(c => c.status === 'failed').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      complianceRate: checks.length > 0 ? 
        (checks.filter(c => c.status === 'passed').length / checks.length) * 100 : 100,
      recentIssues: checks
        .filter(c => c.status !== 'passed')
        .slice(0, 5)
        .map(c => ({
          ruleId: c.ruleId,
          status: c.status,
          // details: c.details, // TODO: Add when field is available
          // checkDate: c.checkDate // TODO: Add when field is available
        }))
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting compliance summary:', error);
    res.status(500).json({ error: 'Failed to get compliance summary' });
  }
}));

// Tax Filing Assistant
router.post('/tax/filing/prepare', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId, jurisdiction, period, taxType, filingType, dueDate } = req.body;
  const { tenantId } = req;

  if (!companyId || !jurisdiction || !period || !taxType || !filingType || !dueDate) {
    return res.status(400).json({ 
      error: 'Company ID, jurisdiction, period, tax type, filing type, and due date are required' 
    });
  }

  try {
    const result = await enhancedComplianceTaxService.prepareTaxFiling({
      companyId,
      jurisdiction,
      period: {
        start: new Date(period.start),
        end: new Date(period.end)
      },
      taxType,
      filingType,
      dueDate: new Date(dueDate),
      metadata: req.body.metadata
    });

    res.json({
      success: true,
      message: 'Tax filing prepared successfully',
      data: result
    });
  } catch (error) {
    console.error('Error preparing tax filing:', error);
    res.status(500).json({ error: 'Failed to prepare tax filing' });
  }
}));

// Get tax filings for company
router.get('/tax/filings/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { jurisdiction, startDate, endDate, status } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const where: any = { companyId };
    
    if (jurisdiction) {
      where.jurisdiction = jurisdiction;
    }
    
    if (startDate && endDate) {
      where.periodStart = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    if (status) {
      where.status = status;
    }

    const filings = await prisma.taxFiling.findMany({
      where,
      orderBy: { id: 'desc' }
    });

    res.json({
      success: true,
      data: filings,
      count: filings.length
    });
  } catch (error) {
    console.error('Error getting tax filings:', error);
    res.status(500).json({ error: 'Failed to get tax filings' });
  }
}));

// Submit tax filing
router.post('/tax/filings/:filingId/submit', asyncHandler(async (req: TenantRequest, res: any) => {
  const { filingId } = req.params;
  const { submitDate } = req.body;

  if (!filingId) {
    return res.status(400).json({ error: 'Filing ID is required' });
  }

  try {
    const filing = await prisma.taxFiling.update({
      where: { id: filingId },
      data: {
        status: 'filed',
        // filedDate: submitDate ? new Date(submitDate) : new Date() // TODO: Add when field is available
      }
    });

    res.json({
      success: true,
      message: 'Tax filing submitted successfully',
      data: filing
    });
  } catch (error) {
    console.error('Error submitting tax filing:', error);
    res.status(500).json({ error: 'Failed to submit tax filing' });
  }
}));

// Multi-Jurisdiction Support
router.get('/jurisdictions/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const config = await enhancedComplianceTaxService.getMultiJurisdictionConfig(companyId);

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting jurisdiction config:', error);
    res.status(500).json({ error: 'Failed to get jurisdiction configuration' });
  }
}));

// Currency Conversion
router.post('/currency/convert', asyncHandler(async (req: TenantRequest, res: any) => {
  const { amount, fromCurrency, toCurrency, date } = req.body;
  const { tenantId } = req;

  if (!amount || !fromCurrency || !toCurrency) {
    return res.status(400).json({ error: 'Amount, from currency, and to currency are required' });
  }

  try {
    const convertedAmount = await enhancedComplianceTaxService.convertCurrency(
      amount,
      fromCurrency,
      toCurrency,
      date ? new Date(date) : new Date()
    );

    res.json({
      success: true,
      data: {
        originalAmount: amount,
        fromCurrency,
        toCurrency,
        convertedAmount,
        exchangeRate: convertedAmount / amount,
        date: date || new Date()
      }
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
}));

// Tax Optimization Recommendations
router.get('/tax/optimization/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { startDate, endDate } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const period = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate as string) : new Date()
    };

    const recommendations = await enhancedComplianceTaxService.getTaxOptimizationRecommendations(
      companyId,
      period
    );

    res.json({
      success: true,
      data: {
        period,
        recommendations,
        count: recommendations.length
      }
    });
  } catch (error) {
    console.error('Error getting tax optimization recommendations:', error);
    res.status(500).json({ error: 'Failed to get tax optimization recommendations' });
  }
}));

// Get tax rates for jurisdiction
router.get('/tax/rates/:jurisdiction', asyncHandler(async (req: TenantRequest, res: any) => {
  const { jurisdiction } = req.params;
  const { taxType, effectiveDate } = req.query;

  if (!jurisdiction) {
    return res.status(400).json({ error: 'Jurisdiction is required' });
  }

  try {
    // Mock tax rates - in real implementation, this would fetch from database
    const taxRates = {
      'UK': {
        VAT: [
          { rate: 20, description: 'Standard Rate', effectiveDate: '2020-01-01' },
          { rate: 5, description: 'Reduced Rate', effectiveDate: '2020-01-01' },
          { rate: 0, description: 'Zero Rate', effectiveDate: '2020-01-01' }
        ],
        'Corporate Tax': [
          { rate: 19, description: 'Main Rate', effectiveDate: '2020-01-01' }
        ]
      },
      'US': {
        'Sales Tax': [
          { rate: 8.5, description: 'Standard Rate', effectiveDate: '2020-01-01' }
        ],
        'Corporate Tax': [
          { rate: 21, description: 'Federal Rate', effectiveDate: '2020-01-01' }
        ]
      }
    };

    const jurisdictionRates = taxRates[jurisdiction as keyof typeof taxRates] || {} as any;
    
    let filteredRates: any = jurisdictionRates;
    if (taxType) {
      filteredRates = { [taxType as string]: jurisdictionRates[taxType as keyof typeof jurisdictionRates] };
    }

    res.json({
      success: true,
      data: {
        jurisdiction,
        taxRates: filteredRates,
        effectiveDate: effectiveDate || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting tax rates:', error);
    res.status(500).json({ error: 'Failed to get tax rates' });
  }
}));

// Get filing deadlines
router.get('/filing/deadlines/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { jurisdiction, taxType } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    // Mock filing deadlines - in real implementation, this would fetch from database
    const deadlines = [
      {
        id: 'deadline-1',
        companyId,
        jurisdiction: jurisdiction || 'UK',
        taxType: taxType || 'VAT',
        period: 'Q1 2024',
        dueDate: '2024-05-07',
        filingType: 'quarterly',
        status: 'upcoming',
        daysRemaining: 30
      },
      {
        id: 'deadline-2',
        companyId,
        jurisdiction: jurisdiction || 'US',
        taxType: taxType || 'Sales Tax',
        period: 'March 2024',
        dueDate: '2024-04-20',
        filingType: 'monthly',
        status: 'overdue',
        daysRemaining: -5
      }
    ];

    res.json({
      success: true,
      data: deadlines,
      count: deadlines.length
    });
  } catch (error) {
    console.error('Error getting filing deadlines:', error);
    res.status(500).json({ error: 'Failed to get filing deadlines' });
  }
}));

// Get audit trail
router.get('/audit/trail/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { startDate, endDate, type } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const where: any = { companyId };
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    // Get tax calculations
    const taxCalculations = await prisma.taxCalculation.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 50
    });

    // Get compliance checks
    const complianceChecks = await prisma.complianceCheck.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 50
    });

    // Get tax filings
    const taxFilings = await prisma.taxFiling.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 50
    });

    // Combine and sort by date
    const auditTrail = [
      ...taxCalculations.map(tc => ({
        id: tc.id,
        type: 'tax_calculation',
        // date: tc.createdAt, // TODO: Add when field is available
        // description: `${tc.taxType} calculation for ${tc.jurisdiction}`, // TODO: Add when fields are available
        // amount: tc.netTaxLiability, // TODO: Add when field is available
        // status: tc.status // TODO: Add when field is available
      })),
      ...complianceChecks.map(cc => ({
        id: cc.id,
        type: 'compliance_check',
        // date: cc.checkDate, // TODO: Add when field is available
        // description: `Compliance check for rule ${cc.ruleId}`, // TODO: Add when fields are available
        // status: cc.status, // TODO: Add when field is available
        // details: cc.details // TODO: Add when field is available
      })),
      ...taxFilings.map(tf => ({
        id: tf.id,
        type: 'tax_filing',
        // date: tf.createdAt, // TODO: Add when field is available
        // description: `${tf.taxType} filing for ${tf.jurisdiction}`, // TODO: Add when fields are available
        // amount: tf.amount, // TODO: Add when field is available
        status: tf.status
      }))
    ].sort((a, b) => new Date((b as any).date || 0).getTime() - new Date((a as any).date || 0).getTime());

    // Filter by type if specified
    const filteredTrail = type ? auditTrail.filter(item => item.type === type) : auditTrail;

    res.json({
      success: true,
      data: filteredTrail,
      count: filteredTrail.length
    });
  } catch (error) {
    console.error('Error getting audit trail:', error);
    res.status(500).json({ error: 'Failed to get audit trail' });
  }
}));

// Get compliance rules
router.get('/compliance/rules/:companyId', asyncHandler(async (req: TenantRequest, res: any) => {
  const { companyId } = req.params;
  const { jurisdiction, standard, severity } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    // Mock compliance rules - in real implementation, this would fetch from database
    const rules = [
      {
        id: 'rule-001',
        name: 'VAT Registration Threshold',
        description: 'Check if company exceeds VAT registration threshold',
        ruleType: 'validation',
        jurisdiction: jurisdiction || 'UK',
        standard: standard || 'Local',
        severity: severity || 'high',
        condition: 'total_sales > 85000',
        action: 'register_for_vat',
        isActive: true
      },
      {
        id: 'rule-002',
        name: 'Tax Calculation Accuracy',
        description: 'Verify tax calculations are accurate',
        ruleType: 'calculation',
        jurisdiction: jurisdiction || 'UK',
        standard: standard || 'Local',
        severity: severity || 'critical',
        condition: 'tax_calculation_error_rate < 0.01',
        action: 'review_calculations',
        isActive: true
      }
    ];

    res.json({
      success: true,
      data: rules,
      count: rules.length
    });
  } catch (error) {
    console.error('Error getting compliance rules:', error);
    res.status(500).json({ error: 'Failed to get compliance rules' });
  }
}));

export default router;
