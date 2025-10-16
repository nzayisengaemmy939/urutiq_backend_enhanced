import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Tax Model Interfaces
interface TaxJurisdiction {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  country: string;
  region: string | null;
  locality: string | null;
  level: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TaxRate {
  id: string;
  tenantId: string;
  companyId: string;
  jurisdictionId: string;
  taxName: string;
  taxType: string;
  rate: number;
  appliesTo: string;
  brackets: string | null;
  thresholds: string | null;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TaxForm {
  id: string;
  tenantId: string;
  companyId: string;
  jurisdictionId: string;
  formCode: string;
  formName: string;
  formType: string;
  taxYear: number;
  dueDate: Date;
  extendedDueDate: Date | null;
  status: string;
  filingMethod: string;
  submittedAt: Date | null;
  acceptedAt: Date | null;
  formData: string;
  attachments: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TaxConfiguration {
  id: string;
  tenantId: string;
  companyId: string;
  fiscalYearEnd: string;
  taxIdNumber: string | null;
  businessType: string;
  taxElections: string | null;
  defaultTaxTreatment: string;
  roundingMethod: string;
  roundingPrecision: number;
  enableEstimatedTax: boolean;
  enableAutoCalculation: boolean;
  enableAutoFiling: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TaxCalculation {
  id: string;
  tenantId: string;
  companyId: string;
  taxRateId: string;
  transactionId: string | null;
  calculationType: string;
  baseAmount: number;
  taxAmount: number;
  effectiveRate: number;
  exemptions: string | null;
  metadata: string | null;
  calculatedAt: Date;
}

// Validation schemas
export const CreateTaxJurisdictionSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  country: z.string().length(2), // ISO 3166-1 alpha-2
  region: z.string().optional(),
  locality: z.string().optional(),
  level: z.enum(['federal', 'state', 'local']),
});

export const CreateTaxRateSchema = z.object({
  jurisdictionId: z.string(),
  taxName: z.string().min(1),
  taxType: z.enum(['sales', 'income', 'payroll', 'property', 'vat', 'gst']),
  rate: z.number().min(0).max(1), // 0 to 100% as decimal
  appliesTo: z.enum(['products', 'services', 'all', 'income_brackets']),
  brackets: z.array(z.object({
    min: z.number(),
    max: z.number().optional(),
    rate: z.number().min(0).max(1),
  })).optional(),
  thresholds: z.object({
    exemption: z.number().optional(),
    minimum: z.number().optional(),
  }).optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
});

export const TaxCalculationSchema = z.object({
  baseAmount: z.number().min(0),
  taxRateIds: z.array(z.string()),
  transactionDate: z.string().datetime().optional(),
  exemptions: z.array(z.string()).optional(),
});

// Tax Jurisdiction Management
export class TaxJurisdictionService {
  static async create(tenantId: string, companyId: string, data: z.infer<typeof CreateTaxJurisdictionSchema>) {
    const validatedData = CreateTaxJurisdictionSchema.parse(data);
    
    const result = await prisma.$queryRaw<TaxJurisdiction[]>`
      INSERT INTO TaxJurisdiction (id, tenantId, companyId, name, code, country, region, locality, level, isActive, createdAt, updatedAt)
      VALUES (${generateId()}, ${tenantId}, ${companyId}, ${validatedData.name}, ${validatedData.code}, ${validatedData.country}, 
              ${validatedData.region || null}, ${validatedData.locality || null}, ${validatedData.level}, true, 
              ${new Date()}, ${new Date()})
      RETURNING *
    `;
    
    return result[0];
  }

  static async getAll(tenantId: string, companyId: string) {
    return await prisma.$queryRaw<(TaxJurisdiction & { taxRates: TaxRate[]; taxForms: TaxForm[] })[]>`
      SELECT tj.*, 
             COALESCE(json_group_array(
               CASE WHEN tr.id IS NOT NULL THEN 
                 json_object('id', tr.id, 'taxName', tr.taxName, 'rate', tr.rate, 'taxType', tr.taxType) 
               END
             ) FILTER (WHERE tr.id IS NOT NULL), '[]') as taxRates,
             COALESCE(json_group_array(
               CASE WHEN tf.id IS NOT NULL THEN 
                 json_object('id', tf.id, 'formCode', tf.formCode, 'dueDate', tf.dueDate, 'status', tf.status) 
               END
             ) FILTER (WHERE tf.id IS NOT NULL), '[]') as taxForms
      FROM TaxJurisdiction tj
      LEFT JOIN TaxRate tr ON tj.id = tr.jurisdictionId AND tr.isActive = true
      LEFT JOIN TaxForm tf ON tj.id = tf.jurisdictionId
      WHERE tj.tenantId = ${tenantId} AND tj.companyId = ${companyId} AND tj.isActive = true
      GROUP BY tj.id
      ORDER BY tj.level ASC
    `;
  }

  static async getByCountry(tenantId: string, companyId: string, country: string) {
    return await prisma.$queryRaw<TaxJurisdiction[]>`
      SELECT * FROM TaxJurisdiction
      WHERE tenantId = ${tenantId} AND companyId = ${companyId} AND country = ${country} AND isActive = true
    `;
  }

  static async update(id: string, tenantId: string, companyId: string, data: Partial<z.infer<typeof CreateTaxJurisdictionSchema>>) {
    let query = 'UPDATE TaxJurisdiction SET updatedAt = ? ';
    const values: any[] = [new Date()];
    
    if (data.name) {
      query += ', name = ? ';
      values.push(data.name);
    }
    if (data.code) {
      query += ', code = ? ';
      values.push(data.code);
    }
    if (data.country) {
      query += ', country = ? ';
      values.push(data.country);
    }
    if (data.region !== undefined) {
      query += ', region = ? ';
      values.push(data.region);
    }
    if (data.locality !== undefined) {
      query += ', locality = ? ';
      values.push(data.locality);
    }
    if (data.level) {
      query += ', level = ? ';
      values.push(data.level);
    }
    
    query += ' WHERE id = ? AND tenantId = ? AND companyId = ? ';
    values.push(id, tenantId, companyId);
    
    await prisma.$executeRawUnsafe(query, ...values);
    
    const result = await prisma.$queryRaw<TaxJurisdiction[]>`
      SELECT * FROM TaxJurisdiction WHERE id = ${id} AND tenantId = ${tenantId} AND companyId = ${companyId}
    `;
    
    return result[0];
  }

  static async delete(id: string, tenantId: string, companyId: string) {
    await prisma.$executeRaw`
      UPDATE TaxJurisdiction 
      SET isActive = false, updatedAt = ${new Date()}
      WHERE id = ${id} AND tenantId = ${tenantId} AND companyId = ${companyId}
    `;
    
    const result = await prisma.$queryRaw<TaxJurisdiction[]>`
      SELECT * FROM TaxJurisdiction WHERE id = ${id} AND tenantId = ${tenantId} AND companyId = ${companyId}
    `;
    
    return result[0];
  }
}

// Helper function to generate IDs
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Tax Rate Management
export class TaxRateService {
  static async create(tenantId: string, companyId: string, data: z.infer<typeof CreateTaxRateSchema>) {
    const validatedData = CreateTaxRateSchema.parse(data);
    
    // Validate jurisdiction exists
    const jurisdiction = await prisma.$queryRaw<TaxJurisdiction[]>`
      SELECT * FROM TaxJurisdiction 
      WHERE id = ${validatedData.jurisdictionId} AND tenantId = ${tenantId} AND companyId = ${companyId}
    `;

    if (!jurisdiction || jurisdiction.length === 0) {
      throw new Error('Tax jurisdiction not found');
    }

    const result = await prisma.$queryRaw<TaxRate[]>`
      INSERT INTO TaxRate (
        id, tenantId, companyId, jurisdictionId, taxName, taxType, rate, appliesTo, 
        brackets, thresholds, isActive, effectiveFrom, effectiveTo, createdAt, updatedAt
      )
      VALUES (
        ${generateId()}, ${tenantId}, ${companyId}, ${validatedData.jurisdictionId}, 
        ${validatedData.taxName}, ${validatedData.taxType}, ${validatedData.rate}, 
        ${validatedData.appliesTo}, ${JSON.stringify(validatedData.brackets || null)}, 
        ${JSON.stringify(validatedData.thresholds || null)}, true, 
        ${new Date(validatedData.effectiveFrom)}, 
        ${validatedData.effectiveTo ? new Date(validatedData.effectiveTo) : null}, 
        ${new Date()}, ${new Date()}
      )
      RETURNING *
    `;
    
    return result[0];
  }

  static async getActive(tenantId: string, companyId: string, date?: Date) {
    const currentDate = date || new Date();
    
    return await prisma.$queryRaw<(TaxRate & { jurisdiction: TaxJurisdiction })[]>`
      SELECT tr.*, tj.name as jurisdiction_name, tj.level as jurisdiction_level, tj.country as jurisdiction_country
      FROM TaxRate tr
      JOIN TaxJurisdiction tj ON tr.jurisdictionId = tj.id
      WHERE tr.tenantId = ${tenantId} AND tr.companyId = ${companyId} 
        AND tr.isActive = true
        AND tr.effectiveFrom <= ${currentDate}
        AND (tr.effectiveTo IS NULL OR tr.effectiveTo >= ${currentDate})
      ORDER BY tj.level ASC, tr.taxName ASC
    `;
  }

  static async getByJurisdiction(tenantId: string, companyId: string, jurisdictionId: string) {
    return await prisma.$queryRaw<TaxRate[]>`
      SELECT * FROM TaxRate
      WHERE tenantId = ${tenantId} AND companyId = ${companyId} 
        AND jurisdictionId = ${jurisdictionId} AND isActive = true
      ORDER BY taxName ASC
    `;
  }

  static async update(id: string, tenantId: string, companyId: string, data: Partial<z.infer<typeof CreateTaxRateSchema>>) {
    let query = 'UPDATE TaxRate SET updatedAt = ? ';
    const values: any[] = [new Date()];
    
    if (data.taxName) {
      query += ', taxName = ? ';
      values.push(data.taxName);
    }
    if (data.taxType) {
      query += ', taxType = ? ';
      values.push(data.taxType);
    }
    if (data.rate !== undefined) {
      query += ', rate = ? ';
      values.push(data.rate);
    }
    if (data.appliesTo) {
      query += ', appliesTo = ? ';
      values.push(data.appliesTo);
    }
    if (data.brackets !== undefined) {
      query += ', brackets = ? ';
      values.push(JSON.stringify(data.brackets));
    }
    if (data.thresholds !== undefined) {
      query += ', thresholds = ? ';
      values.push(JSON.stringify(data.thresholds));
    }
    if (data.effectiveFrom) {
      query += ', effectiveFrom = ? ';
      values.push(new Date(data.effectiveFrom));
    }
    if (data.effectiveTo !== undefined) {
      query += ', effectiveTo = ? ';
      values.push(data.effectiveTo ? new Date(data.effectiveTo) : null);
    }
    
    query += ' WHERE id = ? AND tenantId = ? AND companyId = ? ';
    values.push(id, tenantId, companyId);
    
    await prisma.$executeRawUnsafe(query, ...values);
    
    const result = await prisma.$queryRaw<TaxRate[]>`
      SELECT * FROM TaxRate WHERE id = ${id} AND tenantId = ${tenantId} AND companyId = ${companyId}
    `;
    
    return result[0];
  }
}

// Tax Calculation Engine
export class TaxCalculationService {
  static async calculateTax(
    tenantId: string, 
    companyId: string, 
    data: z.infer<typeof TaxCalculationSchema>
  ) {
    const validatedData = TaxCalculationSchema.parse(data);
    const { baseAmount, taxRateIds, transactionDate, exemptions } = validatedData;
    
    const calculationDate = transactionDate ? new Date(transactionDate) : new Date();
    
    // Get applicable tax rates
    const taxRates = [];
    for (const taxRateId of taxRateIds) {
      const rate = await prisma.$queryRaw<any[]>`
        SELECT tr.*, tj.name as jurisdiction_name, tj.level as jurisdiction_level, tj.country as jurisdiction_country
        FROM TaxRate tr
        JOIN TaxJurisdiction tj ON tr.jurisdictionId = tj.id
        WHERE tr.id = ${taxRateId}
          AND tr.tenantId = ${tenantId} AND tr.companyId = ${companyId}
          AND tr.isActive = true
          AND tr.effectiveFrom <= ${calculationDate}
          AND (tr.effectiveTo IS NULL OR tr.effectiveTo >= ${calculationDate})
      `;
      if (rate.length > 0) {
        taxRates.push(rate[0]);
      }
    }

    const calculations = [];
    let totalTaxAmount = 0;
    let cumulativeBase = baseAmount;

    for (const taxRate of taxRates) {
      const calculation = await this.calculateSingleTax(
        tenantId,
        companyId,
        taxRate,
        cumulativeBase,
        exemptions || []
      );
      
      calculations.push(calculation);
      totalTaxAmount += calculation.taxAmount;
      
      // For compound taxes (tax on tax + base)
      if (taxRate.taxType === 'sales' && taxRate.jurisdiction_level !== 'federal') {
        cumulativeBase += calculation.taxAmount;
      }
    }

    return {
      baseAmount,
      totalTaxAmount,
      totalAmount: baseAmount + totalTaxAmount,
      calculations,
      effectiveRate: baseAmount > 0 ? totalTaxAmount / baseAmount : 0,
    };
  }

  private static async calculateSingleTax(
    tenantId: string,
    companyId: string,
    taxRate: any,
    baseAmount: number,
    exemptions: string[]
  ) {
    let taxableAmount = baseAmount;
    let taxAmount = 0;
    let effectiveRate = Number(taxRate.rate);

    // Parse thresholds if they exist
    const thresholds = taxRate.thresholds ? JSON.parse(taxRate.thresholds) : null;
    const brackets = taxRate.brackets ? JSON.parse(taxRate.brackets) : null;

    // Apply exemptions
    if (thresholds?.exemption && exemptions.includes('standard_exemption')) {
      taxableAmount = Math.max(0, baseAmount - thresholds.exemption);
    }

    // Apply minimum thresholds
    if (thresholds?.minimum && taxableAmount < thresholds.minimum) {
      taxableAmount = 0;
    }

    // Calculate tax based on type
    if (taxRate.appliesTo === 'income_brackets' && brackets) {
      // Progressive tax calculation
      let remainingAmount = taxableAmount;
      
      for (const bracket of brackets) {
        const bracketMax = bracket.max || Infinity;
        const bracketAmount = Math.min(remainingAmount, bracketMax - bracket.min);
        
        if (bracketAmount > 0) {
          taxAmount += bracketAmount * bracket.rate;
          remainingAmount -= bracketAmount;
        }
        
        if (remainingAmount <= 0) break;
      }
      
      effectiveRate = taxableAmount > 0 ? taxAmount / taxableAmount : 0;
    } else {
      // Flat rate calculation
      taxAmount = taxableAmount * effectiveRate;
    }

    // Get rounding configuration
    const config = await prisma.$queryRaw<TaxConfiguration[]>`
      SELECT * FROM TaxConfiguration WHERE tenantId = ${tenantId} AND companyId = ${companyId} LIMIT 1
    `;
    
    const precision = config[0]?.roundingPrecision || 2;
    const roundingMethod = config[0]?.roundingMethod || 'round';
    
    switch (roundingMethod) {
      case 'floor':
        taxAmount = Math.floor(taxAmount * Math.pow(10, precision)) / Math.pow(10, precision);
        break;
      case 'ceil':
        taxAmount = Math.ceil(taxAmount * Math.pow(10, precision)) / Math.pow(10, precision);
        break;
      default:
        taxAmount = Math.round(taxAmount * Math.pow(10, precision)) / Math.pow(10, precision);
    }

    // Save calculation record
    const calculationId = generateId();
    await prisma.$executeRaw`
      INSERT INTO TaxCalculation (
        id, tenantId, companyId, taxRateId, calculationType, baseAmount, taxAmount, 
        effectiveRate, exemptions, metadata, calculatedAt
      )
      VALUES (
        ${calculationId}, ${tenantId}, ${companyId}, ${taxRate.id}, 'real_time', 
        ${taxableAmount}, ${taxAmount}, ${effectiveRate}, 
        ${exemptions.length > 0 ? JSON.stringify(exemptions) : null},
        ${JSON.stringify({
          originalBaseAmount: baseAmount,
          appliedThresholds: thresholds,
          brackets: brackets,
        })}, ${new Date()}
      )
    `;

    return {
      id: calculationId,
      taxRateId: taxRate.id,
      taxName: taxRate.taxName,
      jurisdiction: taxRate.jurisdiction_name,
      baseAmount: taxableAmount,
      taxAmount,
      effectiveRate,
      exemptions,
    };
  }

  static async getCalculationHistory(
    tenantId: string,
    companyId: string,
    filters: {
      fromDate?: string;
      toDate?: string;
      taxRateId?: string;
      calculationType?: string;
    } = {}
  ) {
    let query = `
      SELECT tc.*, tr.taxName, tr.taxType, tj.name as jurisdiction_name
      FROM TaxCalculation tc
      JOIN TaxRate tr ON tc.taxRateId = tr.id
      JOIN TaxJurisdiction tj ON tr.jurisdictionId = tj.id
      WHERE tc.tenantId = ? AND tc.companyId = ?
    `;
    const values: any[] = [tenantId, companyId];
    
    if (filters.fromDate) {
      query += ' AND tc.calculatedAt >= ? ';
      values.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      query += ' AND tc.calculatedAt <= ? ';
      values.push(filters.toDate);
    }
    
    if (filters.taxRateId) {
      query += ' AND tc.taxRateId = ? ';
      values.push(filters.taxRateId);
    }
    
    if (filters.calculationType) {
      query += ' AND tc.calculationType = ? ';
      values.push(filters.calculationType);
    }

    query += ' ORDER BY tc.calculatedAt DESC ';

    return await prisma.$queryRawUnsafe<any[]>(query, ...values);
  }

  static async getTaxSummary(
    tenantId: string,
    companyId: string,
    fromDate: string,
    toDate: string
  ) {
    const calculations = await prisma.$queryRaw<(TaxCalculation & { taxRate: TaxRate & { jurisdiction: TaxJurisdiction } })[]>`
      SELECT tc.*, tr.taxName, tr.taxType, tj.name as jurisdiction_name
      FROM TaxCalculation tc
      JOIN TaxRate tr ON tc.taxRateId = tr.id
      JOIN TaxJurisdiction tj ON tr.jurisdictionId = tj.id
      WHERE tc.tenantId = ${tenantId} AND tc.companyId = ${companyId}
        AND tc.calculatedAt >= ${new Date(fromDate)}
        AND tc.calculatedAt <= ${new Date(toDate)}
    `;

    const summary = calculations.reduce((acc: Record<string, any>, calc: any) => {
      const key = `${calc.jurisdiction_name}-${calc.taxName}`;
      
      if (!acc[key]) {
        acc[key] = {
          jurisdiction: calc.jurisdiction_name,
          taxName: calc.taxName,
          taxType: calc.taxType,
          totalBaseAmount: 0,
          totalTaxAmount: 0,
          calculationCount: 0,
        };
      }
      
      acc[key].totalBaseAmount += Number(calc.baseAmount);
      acc[key].totalTaxAmount += Number(calc.taxAmount);
      acc[key].calculationCount += 1;
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(summary);
  }
}

// Tax Configuration Service
export class TaxConfigurationService {
  static async getOrCreate(tenantId: string, companyId: string) {
    let config = await prisma.$queryRaw<TaxConfiguration[]>`
      SELECT * FROM TaxConfiguration WHERE tenantId = ${tenantId} AND companyId = ${companyId} LIMIT 1
    `;

    if (!config || config.length === 0) {
      const configId = generateId();
      await prisma.$executeRaw`
        INSERT INTO TaxConfiguration (
          id, tenantId, companyId, fiscalYearEnd, businessType, defaultTaxTreatment,
          roundingMethod, roundingPrecision, enableEstimatedTax, enableAutoCalculation,
          enableAutoFiling, createdAt, updatedAt
        )
        VALUES (
          ${configId}, ${tenantId}, ${companyId}, '12-31', 'corporation', 'exclusive',
          'round', 2, false, true, false, ${new Date()}, ${new Date()}
        )
      `;
      
      config = await prisma.$queryRaw<TaxConfiguration[]>`
        SELECT * FROM TaxConfiguration WHERE id = ${configId}
      `;
    }

    return config[0];
  }

  static async update(
    tenantId: string,
    companyId: string,
    data: {
      fiscalYearEnd?: string;
      taxIdNumber?: string;
      businessType?: string;
      taxElections?: any;
      defaultTaxTreatment?: string;
      roundingMethod?: string;
      roundingPrecision?: number;
      enableEstimatedTax?: boolean;
      enableAutoCalculation?: boolean;
      enableAutoFiling?: boolean;
    }
  ) {
    // Check if configuration exists
    const existing = await prisma.$queryRaw<TaxConfiguration[]>`
      SELECT * FROM TaxConfiguration WHERE tenantId = ${tenantId} AND companyId = ${companyId} LIMIT 1
    `;

    if (existing && existing.length > 0) {
      // Update existing configuration
      let query = 'UPDATE TaxConfiguration SET updatedAt = ? ';
      const values: any[] = [new Date()];
      
      if (data.fiscalYearEnd) {
        query += ', fiscalYearEnd = ? ';
        values.push(data.fiscalYearEnd);
      }
      if (data.taxIdNumber !== undefined) {
        query += ', taxIdNumber = ? ';
        values.push(data.taxIdNumber);
      }
      if (data.businessType) {
        query += ', businessType = ? ';
        values.push(data.businessType);
      }
      if (data.taxElections !== undefined) {
        query += ', taxElections = ? ';
        values.push(JSON.stringify(data.taxElections));
      }
      if (data.defaultTaxTreatment) {
        query += ', defaultTaxTreatment = ? ';
        values.push(data.defaultTaxTreatment);
      }
      if (data.roundingMethod) {
        query += ', roundingMethod = ? ';
        values.push(data.roundingMethod);
      }
      if (data.roundingPrecision !== undefined) {
        query += ', roundingPrecision = ? ';
        values.push(data.roundingPrecision);
      }
      if (data.enableEstimatedTax !== undefined) {
        query += ', enableEstimatedTax = ? ';
        values.push(data.enableEstimatedTax);
      }
      if (data.enableAutoCalculation !== undefined) {
        query += ', enableAutoCalculation = ? ';
        values.push(data.enableAutoCalculation);
      }
      if (data.enableAutoFiling !== undefined) {
        query += ', enableAutoFiling = ? ';
        values.push(data.enableAutoFiling);
      }
      
      query += ' WHERE id = ? ';
      values.push(existing[0].id);
      
      await prisma.$executeRawUnsafe(query, ...values);
      
      const result = await prisma.$queryRaw<TaxConfiguration[]>`
        SELECT * FROM TaxConfiguration WHERE id = ${existing[0].id}
      `;
      
      return result[0];
    } else {
      // Create new configuration
      const configId = generateId();
      await prisma.$executeRaw`
        INSERT INTO TaxConfiguration (
          id, tenantId, companyId, fiscalYearEnd, taxIdNumber, businessType, taxElections,
          defaultTaxTreatment, roundingMethod, roundingPrecision, enableEstimatedTax,
          enableAutoCalculation, enableAutoFiling, createdAt, updatedAt
        )
        VALUES (
          ${configId}, ${tenantId}, ${companyId}, 
          ${data.fiscalYearEnd || '12-31'}, ${data.taxIdNumber || null}, 
          ${data.businessType || 'corporation'}, ${data.taxElections ? JSON.stringify(data.taxElections) : null},
          ${data.defaultTaxTreatment || 'exclusive'}, ${data.roundingMethod || 'round'}, 
          ${data.roundingPrecision || 2}, ${data.enableEstimatedTax || false},
          ${data.enableAutoCalculation || true}, ${data.enableAutoFiling || false},
          ${new Date()}, ${new Date()}
        )
      `;
      
      return await prisma.$queryRaw<TaxConfiguration[]>`
        SELECT * FROM TaxConfiguration WHERE id = ${configId}
      `;
    }
  }
}
