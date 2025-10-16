import { Request, Response, Router } from 'express';
import { asyncHandler } from './errors';
import { prisma } from './prisma';

const router = Router();

// Tax Jurisdictions Management
router.post('/jurisdictions', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    
    const { name, country, state, city, taxType, description } = req.body;
    
    if (!name || !country || !taxType) {
      return res.status(400).json({ error: 'name, country, and taxType are required' });
    }
    
    console.log('Creating jurisdiction with Prisma:', { tenantId, companyId, name, country, taxType });
    
    // Create jurisdiction in database
    const jurisdiction = await prisma.taxJurisdiction.create({
      data: {
        tenantId,
        companyId,
        name,
        code: `${country.toUpperCase()}-${name.replace(/\s+/g, '-').toUpperCase()}`,
        country,
        region: state || null,
        locality: city || null,
        level: state ? (city ? 'local' : 'state') : 'federal',
        isActive: true
      }
    });
    
    console.log('Jurisdiction created successfully:', jurisdiction);
    res.status(201).json(jurisdiction);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Jurisdiction creation error:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}));

router.get('/jurisdictions', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    
    console.log('Fetching jurisdictions from database for:', { tenantId, companyId });
    
    // Get jurisdictions from database
    const jurisdictions = await prisma.taxJurisdiction.findMany({
      where: {
        tenantId,
        companyId,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('Found jurisdictions in database:', jurisdictions.length);
    
    // Convert database format to frontend format
    const formattedJurisdictions = jurisdictions.map(j => ({
      id: j.id,
      name: j.name,
      country: j.country,
      state: j.region,
      city: j.locality,
      taxType: j.level.toUpperCase(), // Convert level to taxType for compatibility
      description: `${j.level} jurisdiction in ${j.country}`,
      isActive: j.isActive,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString()
    }));
    
    console.log('Returning formatted jurisdictions:', formattedJurisdictions);
    res.json({ jurisdictions: formattedJurisdictions });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Jurisdictions fetch error:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}));

// Tax Rates - Simple creation for frontend
router.post('/rates', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    
    // Handle simple tax rate creation from frontend
    const { taxName, rate, appliesTo } = req.body;
    
    if (!taxName || rate === undefined) {
      return res.status(400).json({ error: 'taxName and rate are required' });
    }
    
    console.log('Creating tax rate with Prisma:', { tenantId, companyId, taxName, rate, appliesTo });
    
    // First, find or create a default jurisdiction for this company
    let jurisdiction = await prisma.taxJurisdiction.findFirst({
      where: {
        tenantId,
        companyId,
        isActive: true
      }
    });
    
    if (!jurisdiction) {
      // Create a default jurisdiction
      jurisdiction = await prisma.taxJurisdiction.create({
        data: {
          tenantId,
          companyId,
          name: 'Default Jurisdiction',
          code: 'DEFAULT',
          country: 'Default',
          level: 'federal',
          isActive: true
        }
      });
    }
    
    // Create tax rate in database
    const taxRate = await prisma.taxRate.create({
      data: {
        tenantId,
        companyId,
        jurisdictionId: jurisdiction.id,
        taxName,
        taxType: 'sales', // Default type for simple rates
        rate: parseFloat(rate),
        appliesTo: appliesTo || 'all',
        isActive: true,
        effectiveFrom: new Date()
      }
    });
    
    console.log('Tax rate created successfully:', taxRate);
    res.status(201).json(taxRate);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tax rate creation error:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}));

router.get('/rates', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    
    console.log('Fetching tax rates from database for:', { tenantId, companyId });
    
    // Get tax rates from database
    const taxRates = await prisma.taxRate.findMany({
      where: {
        tenantId,
        companyId,
        isActive: true
      },
      include: {
        jurisdiction: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('Found tax rates in database:', taxRates.length);
    
    // Convert database format to frontend format
    const formattedRates = taxRates.map(r => ({
      id: r.id,
      taxName: r.taxName,
      rate: parseFloat(r.rate.toString()),
      appliesTo: r.appliesTo,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }));
    
    console.log('Returning formatted tax rates:', formattedRates);
    res.json({ rates: formattedRates });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tax rates fetch error:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}));

// Tax Calculations - Simple calculation for frontend
router.post('/calculate', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    
    const { currency, lines } = req.body;
    
    console.log('Calculating tax for:', { tenantId, companyId, currency, lines });
    
    if (!lines || !Array.isArray(lines)) {
      return res.status(400).json({ error: 'lines array is required' });
    }
    
    // Get tax rates from database
    const storedRates = await prisma.taxRate.findMany({
      where: {
        tenantId,
        companyId,
        isActive: true
      }
    });
    
    // Simple tax calculation logic
    let totalTax = 0;
    let totalAmount = 0;
    const calculatedLines = [];
    
    for (const line of lines) {
      const { description, type, amount, taxExclusive, manualRate, selectedRateId } = line;
      const lineAmount = Number(amount) || 0;
      
      let taxRate = 0.15; // Default fallback rate
      
      if (manualRate !== undefined && selectedRateId === 'manual') {
        // Use manual rate if explicitly selected
        taxRate = Number(manualRate);
        console.log(`Using manual rate: ${taxRate * 100}% for ${line.type}`);
      } else if (selectedRateId && selectedRateId !== 'auto' && selectedRateId !== 'manual') {
        // Use specifically selected rate by ID - ignore type matching
        const selectedRate = storedRates.find(rate => rate.id === selectedRateId);
        if (selectedRate) {
          taxRate = parseFloat(selectedRate.rate.toString());
          console.log(`Using specifically selected tax rate: ${selectedRate.taxName} (${taxRate * 100}%) - ignoring item type ${line.type}`);
        } else {
          console.log(`Selected rate ID ${selectedRateId} not found, using default 15%`);
        }
      } else {
        // Auto mode: Find applicable tax rate from stored rates
        const applicableRate = storedRates.find(rate => 
          rate.isActive && (
            rate.appliesTo === 'all' || 
            rate.appliesTo === line.type || 
            (rate.appliesTo === 'products' && line.type === 'product') ||
            (rate.appliesTo === 'services' && line.type === 'service')
          )
        );
        
        if (applicableRate) {
          taxRate = parseFloat(applicableRate.rate.toString());
          console.log(`Auto-matched tax rate: ${applicableRate.taxName} (${taxRate * 100}%) for ${line.type}`);
        } else {
          console.log(`No applicable stored rate found for ${line.type}, using default 15%`);
        }
      }
      
      let taxAmount = 0;
      let finalAmount = 0;
      
      if (taxExclusive) {
        // Tax exclusive: add tax to amount
        taxAmount = lineAmount * taxRate;
        finalAmount = lineAmount + taxAmount;
      } else {
        // Tax inclusive: extract tax from amount
        finalAmount = lineAmount;
        taxAmount = lineAmount * (taxRate / (1 + taxRate));
      }
      
      totalTax += taxAmount;
      totalAmount += finalAmount;
      
      // Find the rate name for display
      let rateName = 'Default Rate (15%)';
      if (manualRate !== undefined && selectedRateId === 'manual') {
        rateName = 'Manual Rate';
      } else if (selectedRateId && selectedRateId !== 'auto' && selectedRateId !== 'manual') {
        const selectedRate = storedRates.find(rate => rate.id === selectedRateId);
        rateName = selectedRate ? selectedRate.taxName : 'Unknown Rate';
      } else {
        // Auto mode
        const applicableRate = storedRates.find(rate => 
          rate.isActive && (
            rate.appliesTo === 'all' || 
            rate.appliesTo === line.type || 
            (rate.appliesTo === 'products' && line.type === 'product') ||
            (rate.appliesTo === 'services' && line.type === 'service')
          )
        );
        rateName = applicableRate ? `${applicableRate.taxName} (Auto)` : 'Default Rate (15%)';
      }
      
      calculatedLines.push({
        description: description || 'Item',
        type: type || 'product',
        amount: lineAmount,
        taxRate,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmount: Math.round(finalAmount * 100) / 100,
        appliedRateName: rateName
      });
    }
    
    const result = {
      currency: currency || 'USD',
      totalTax: Math.round(totalTax * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      lines: calculatedLines
    };
    
    console.log('Tax calculation result:', result);
    res.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tax calculation error:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}));

// Tax Forms Management
router.post('/forms', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    
    const { formName, formCode, jurisdiction, taxType, period, dueDate, description } = req.body;
    
    if (!formName || !formCode || !jurisdiction || !taxType) {
      return res.status(400).json({ error: 'formName, formCode, jurisdiction, and taxType are required' });
    }
    
    console.log('Creating tax form with Prisma:', { tenantId, companyId, formName, formCode, jurisdiction, taxType });
    
    // First, ensure the company exists
    let company = await prisma.company.findFirst({
      where: {
        id: companyId,
        tenantId
      }
    });
    
    if (!company) {
      // Create a default company if it doesn't exist
      company = await prisma.company.create({
        data: {
          id: companyId,
          tenantId,
          name: 'Default Company',
          currency: 'USD'
        }
      });
      console.log('Created default company:', company);
    }
    
    // Find or create a jurisdiction for this form
    let jurisdictionRecord = await prisma.taxJurisdiction.findFirst({
      where: {
        tenantId,
        companyId,
        name: jurisdiction,
        isActive: true
      }
    });
    
    if (!jurisdictionRecord) {
      // Create a jurisdiction if it doesn't exist
      jurisdictionRecord = await prisma.taxJurisdiction.create({
        data: {
          tenantId,
          companyId,
          name: jurisdiction,
          code: jurisdiction.replace(/\s+/g, '-').toUpperCase(),
          country: 'Default',
          level: 'federal',
          isActive: true
        }
      });
      console.log('Created jurisdiction:', jurisdictionRecord);
    }
    
    // Create tax form in database
    const taxForm = await prisma.taxForm.create({
      data: {
        tenantId,
        companyId,
        jurisdictionId: jurisdictionRecord.id,
        formCode,
        formName,
        formType: period?.toLowerCase() || 'annual',
        taxYear: new Date().getFullYear(),
        dueDate: dueDate ? new Date(dueDate) : new Date(new Date().getFullYear() + 1, 2, 15), // Default to March 15 next year
        status: 'draft',
        filingMethod: 'electronic',
        formData: JSON.stringify({ description: description || '', taxType })
      }
    });
    
    console.log('Tax form created successfully:', taxForm);
    res.status(201).json(taxForm);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tax form creation error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        res.status(400).json({ error: 'A form with this code already exists for this tax year' });
      } else if (error.message.includes('Foreign key constraint')) {
        res.status(400).json({ error: 'Invalid company or jurisdiction reference' });
      } else {
        res.status(500).json({ error: errorMessage });
      }
    } else {
      res.status(500).json({ error: 'An unexpected error occurred while creating the tax form' });
    }
  }
}));

router.get('/forms', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    
    console.log('Fetching tax forms from database for:', { tenantId, companyId });
    
    // Get tax forms from database
    const taxForms = await prisma.taxForm.findMany({
      where: {
        tenantId,
        companyId
      },
      include: {
        jurisdiction: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('Found tax forms in database:', taxForms.length);
    
    // Convert database format to frontend format
    const formattedForms = taxForms.map(f => ({
      id: f.id,
      formName: f.formName,
      formCode: f.formCode,
      jurisdiction: f.jurisdiction.name,
      taxType: f.jurisdiction.level.toUpperCase(), // Use jurisdiction level as tax type
      period: f.formType.charAt(0).toUpperCase() + f.formType.slice(1), // Capitalize first letter
      dueDate: f.dueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      description: JSON.parse(f.formData || '{}').description || '',
      status: f.status.toUpperCase(),
      fields: [],
      calculatedAmounts: {},
      isActive: true,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString()
    }));
    
    console.log('Returning formatted tax forms:', formattedForms);
    res.json({ forms: formattedForms });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tax forms fetch error:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}));

export default router;
