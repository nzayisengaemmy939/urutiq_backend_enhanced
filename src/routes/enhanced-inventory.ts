import type { Router } from 'express';
import { prisma } from '../prisma.js';
import { TenantRequest } from '../tenant.js';
import { validateBody } from '../validate.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Enhanced validation schemas
const productCreateSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE', 'BUNDLE']).default('PRODUCT'),
  unitPrice: z.number().min(0).default(0),
  costPrice: z.number().min(0).default(0),
  category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  barcode: z.string().optional(),
  trackSerialNumbers: z.boolean().default(false),
  trackBatches: z.boolean().default(false),
  costingMethod: z.enum(['FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'SPECIFIC_IDENTIFICATION']).default('FIFO'),
  reorderPoint: z.number().optional(),
  reorderQuantity: z.number().optional(),
  maxStockLevel: z.number().optional(),
  taxCode: z.string().optional(),
  taxExempt: z.boolean().default(false),
});

const locationCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  type: z.enum(['WAREHOUSE', 'STORE', 'OFFICE', 'VEHICLE', 'CUSTOMER_LOCATION']).default('WAREHOUSE'),
  address: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  isDefault: z.boolean().default(false),
});

const inventoryMovementSchema = z.object({
  productId: z.string(),
  locationId: z.string().optional(),
  movementType: z.enum(['INBOUND', 'OUTBOUND', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_IN', 'RETURN_OUT', 'DAMAGE', 'THEFT', 'CYCLE_COUNT']),
  quantity: z.number(),
  unitCost: z.number().optional(),
  reference: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  batchNumber: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  movementDate: z.string().transform(str => new Date(str)),
});

const transferCreateSchema = z.object({
  fromLocationId: z.string(),
  toLocationId: z.string(),
  transferDate: z.string().transform(str => new Date(str)),
  reason: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    productId: z.string(),
    quantity: z.number(),
    unitCost: z.number().optional(),
    serialNumbers: z.array(z.string()).optional(),
    batchNumber: z.string().optional(),
  })),
});

export function mountEnhancedInventoryRoutes(router: Router) {
  
  // ===== PRODUCT MANAGEMENT =====
  
  // Get products with enhanced filtering and pagination
  router.get('/products', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      const page = parseInt(String(req.query.page || '1'));
      const pageSize = parseInt(String(req.query.pageSize || '50'));
      const q = req.query.q as string;
      const category = req.query.category as string;
      const status = req.query.status as string;
      const locationId = req.query.locationId as string;
      
      const where: any = { 
        tenantId: req.tenantId,
        companyId: companyId || undefined,
      };
      
      if (q) {
        where.OR = [
          { name: { contains: q } },
          { sku: { contains: q } },
          { description: { contains: q } },
        ];
      }
      
      if (category) where.category = category;
      if (status) where.status = status;
      
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            locations: locationId ? {
              where: { locationId }
            } : true,
            movements: {
              take: 5,
              orderBy: { movementDate: 'desc' }
            },
            _count: {
              select: {
                movements: true,
                // serialNumbers: true, // TODO: Add when field is available
                // batches: true, // TODO: Add when field is available,
              }
            }
          },
          orderBy: { name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.product.count({ where })
      ]);
      
      res.json({
        items: products,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrev: page > 1,
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // Create product with enhanced features
  router.post('/products', validateBody(productCreateSchema), async (req: TenantRequest, res) => {
    try {
      const data = req.body;
      const companyId = String(req.query.companyId || '');
      
      const product = await prisma.product.create({
        data: {
          tenantId: req.tenantId!,
          companyId,
          ...data,
        },
        include: {
          locations: true,
          _count: {
            select: {
              movements: true,
                // serialNumbers: true, // TODO: Add when field is available,
              // batches: true, // TODO: Add when field is available
            }
          }
        }
      });
      
      res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  // Update product
  router.put('/products/:id', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const product = await prisma.product.update({
        where: { id, tenantId: req.tenantId! },
        data,
        include: {
          locations: true,
          _count: {
            select: {
              movements: true,
                // serialNumbers: true, // TODO: Add when field is available,
              // batches: true, // TODO: Add when field is available
            }
          }
        }
      });
      
      res.json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  // ===== LOCATION MANAGEMENT =====
  
  // Get locations
  router.get('/locations', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      
      const locations = await prisma.location.findMany({
        where: { tenantId: req.tenantId, companyId },
        include: {
          _count: {
            select: {
              products: true,
              movements: true,
            }
          }
        },
        orderBy: { name: 'asc' }
      });
      
      res.json(locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ error: 'Failed to fetch locations' });
    }
  });

  // Create location
  router.post('/locations', validateBody(locationCreateSchema), async (req: TenantRequest, res) => {
    try {
      const data = req.body;
      const companyId = String(req.query.companyId || '');
      
      // If this is set as default, unset other defaults
      if (data.isDefault) {
        await prisma.location.updateMany({
          where: { tenantId: req.tenantId!, companyId, isDefault: true },
          data: { isDefault: false }
        });
      }
      
      const location = await prisma.location.create({
        data: {
          tenantId: req.tenantId!,
          companyId,
          ...data,
        }
      });
      
      res.status(201).json(location);
    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({ error: 'Failed to create location' });
    }
  });

  // ===== INVENTORY MOVEMENTS =====
  
  // Get inventory movements with filtering
  router.get('/movements', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      const productId = req.query.productId as string;
      const locationId = req.query.locationId as string;
      const movementType = req.query.movementType as string;
      const page = parseInt(String(req.query.page || '1'));
      const pageSize = parseInt(String(req.query.pageSize || '50'));
      
      const where: any = { tenantId: req.tenantId };
      
      if (productId) where.productId = productId;
      if (locationId) where.locationId = locationId;
      if (movementType) where.movementType = movementType;
      
      const [movements, total] = await Promise.all([
        prisma.inventoryMovement.findMany({
          where,
          include: {
            product: {
              select: { id: true, name: true, sku: true }
            },
            location: {
              select: { id: true, name: true, code: true }
            },
            // user: { // TODO: Add when relation is available
            //   select: { id: true, name: true, email: true }
            // }
          },
          orderBy: { movementDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.inventoryMovement.count({ where })
      ]);
      
      res.json({
        items: movements,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrev: page > 1,
      });
    } catch (error) {
      console.error('Error fetching movements:', error);
      res.status(500).json({ error: 'Failed to fetch movements' });
    }
  });

  // Create inventory movement
  router.post('/movements', validateBody(inventoryMovementSchema), async (req: TenantRequest, res) => {
    try {
      const data = req.body;
      
      const result = await prisma.$transaction(async (tx) => {
        // Create the movement
        const movement = await tx.inventoryMovement.create({
          data: {
            tenantId: req.tenantId!,
            ...data,
          },
          include: {
            product: true,
            location: true,
          }
        });
        
        // Update product stock quantity
        const product = await tx.product.findUnique({
          where: { id: data.productId }
        });
        
        if (!product) {
          throw new Error('Product not found');
        }
        
        const quantityChange = data.movementType.includes('IN') || data.movementType.includes('ADJUSTMENT_IN') 
          ? data.quantity 
          : -data.quantity;
        
        const newStockQuantity = (typeof product.stockQuantity === 'object' ? Number(product.stockQuantity) : Number(product.stockQuantity)) + quantityChange;
        
        await tx.product.update({
          where: { id: data.productId },
          data: { stockQuantity: newStockQuantity }
        });
        
        // Update location-specific stock if location is specified
        if (data.locationId) {
          const productLocation = await tx.productLocation.findUnique({
            where: {
              tenantId_productId_locationId: {
                tenantId: req.tenantId!,
                productId: data.productId,
                locationId: data.locationId,
              }
            }
          });
          
          if (productLocation) {
            const newLocationStock = (typeof productLocation.quantity === 'object' ? Number(productLocation.quantity) : Number(productLocation.quantity)) + quantityChange;
            await tx.productLocation.update({
              where: {
                tenantId_productId_locationId: {
                  tenantId: req.tenantId!,
                  productId: data.productId,
                  locationId: data.locationId,
                }
              },
              data: { quantity: newLocationStock }
            });
          }
        }
        
        return { movement, newStockQuantity };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating movement:', error);
      res.status(500).json({ error: 'Failed to create movement' });
    }
  });

  // ===== INVENTORY TRANSFERS =====
  
  // Get transfers
  router.get('/transfers', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      const status = req.query.status as string;
      const page = parseInt(String(req.query.page || '1'));
      const pageSize = parseInt(String(req.query.pageSize || '50'));
      
      const where: any = { tenantId: req.tenantId, companyId };
      if (status) where.status = status;
      
      const [transfers, total] = await Promise.all([
        prisma.inventoryTransfer.findMany({
          where,
          include: {
            fromLocation: { select: { id: true, name: true, code: true } },
            toLocation: { select: { id: true, name: true, code: true } },
            // lines: { // TODO: Add when relation is available
            //   include: {
            //     product: { select: { id: true, name: true, sku: true } }
            //   }
            // },
            // requestedByUser: { select: { id: true, name: true } }, // TODO: Add when relation is available
            // approvedByUser: { select: { id: true, name: true } }, // TODO: Add when relation is available
            // completedByUser: { select: { id: true, name: true } }, // TODO: Add when relation is available
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.inventoryTransfer.count({ where })
      ]);
      
      res.json({
        items: transfers,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrev: page > 1,
      });
    } catch (error) {
      console.error('Error fetching transfers:', error);
      res.status(500).json({ error: 'Failed to fetch transfers' });
    }
  });

  // Create transfer
  router.post('/transfers', validateBody(transferCreateSchema), async (req: TenantRequest, res) => {
    try {
      const data = req.body;
      const companyId = String(req.query.companyId || '');
      
      const result = await prisma.$transaction(async (tx) => {
        // Generate transfer number
        const transferCount = await tx.inventoryTransfer.count({
          where: { tenantId: req.tenantId! } // companyId field not available
        });
        const transferNumber = `TRF-${String(transferCount + 1).padStart(6, '0')}`;
        
        // Create transfer
        const transfer = await tx.inventoryTransfer.create({
          data: {
            tenantId: req.tenantId!,
            companyId,
            transferNumber,
            ...data,
            lines: undefined, // Will be created separately
          }
        });
        
        // Create transfer lines
        const lines = await Promise.all(
          data.lines.map((line: any) =>
            tx.inventoryTransfer.create({ // TODO: Use correct model when available
              data: {
                tenantId: req.tenantId!,
                transferId: transfer.id,
                ...line,
              }
            })
          )
        );
        
        return { transfer, lines };
      });
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Error creating transfer:', error);
      res.status(500).json({ error: 'Failed to create transfer' });
    }
  });

  // ===== REORDER ALERTS =====
  
  // Get reorder alerts
  router.get('/alerts', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      const status = req.query.status as string;
      
      const where: any = { tenantId: req.tenantId, companyId };
      if (status) where.status = status;
      
      const alerts = await prisma.reorderAlert.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, stockQuantity: true } },
          location: { select: { id: true, name: true, code: true } },
          // supplier: { select: { id: true, name: true } }, // TODO: Add when relation is available
          // acknowledgedByUser: { select: { id: true, name: true } }, // TODO: Add when relation is available
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  // ===== ANALYTICS & REPORTING =====
  
  // Get inventory analytics
  router.get('/analytics', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      
      const [
        totalProducts,
        totalValue,
        lowStockCount,
        outOfStockCount,
        recentMovements,
        topProducts,
        categoryBreakdown,
      ] = await Promise.all([
        // Total products (only PRODUCT types)
        prisma.product.count({
          where: { tenantId: req.tenantId, companyId, status: 'ACTIVE', type: 'PRODUCT' }
        }),
        
        // Total inventory value (only PRODUCT types)
        prisma.product.aggregate({
          where: { tenantId: req.tenantId, companyId, status: 'ACTIVE', type: 'PRODUCT' },
          _sum: { stockQuantity: true },
          _avg: { costPrice: true }
        }),
        
        // Low stock count (only PRODUCT types)
        prisma.product.count({
          where: {
            tenantId: req.tenantId,
            companyId,
            status: 'ACTIVE',
            type: 'PRODUCT',
            reorderPoint: { not: null },
            stockQuantity: { lte: prisma.product.fields.reorderPoint }
          }
        }),
        
        // Out of stock count (only PRODUCT types)
        prisma.product.count({
          where: {
            tenantId: req.tenantId,
            companyId,
            status: 'ACTIVE',
            type: 'PRODUCT',
            stockQuantity: { lte: 0 }
          }
        }),
        
        // Recent movements (last 30 days)
        prisma.inventoryMovement.count({
          where: {
            tenantId: req.tenantId,
            movementDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }),
        
        // Top products by value (only PRODUCT types)
        prisma.product.findMany({
          where: { tenantId: req.tenantId, companyId, status: 'ACTIVE', type: 'PRODUCT' },
          select: {
            id: true,
            name: true,
            sku: true,
            stockQuantity: true,
            costPrice: true,
          },
          orderBy: { stockQuantity: 'desc' },
          take: 10
        }),
        
        // Category breakdown
        prisma.product.groupBy({
          by: ['categoryId'],
          where: { tenantId: req.tenantId, companyId, status: 'ACTIVE' },
          _count: { categoryId: true },
          _sum: { stockQuantity: true }
        }),
      ]);
      
      // Fetch categories to enrich the breakdown with names
      const categories = await prisma.category.findMany({
        where: { tenantId: req.tenantId, companyId },
        select: { id: true, name: true }
      });
      
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      
      // Debug logging
      console.log('Category Breakdown Raw:', JSON.stringify(categoryBreakdown, null, 2));
      console.log('Categories Found:', categories.length);
      console.log('Total Products:', totalProducts);
      
      // Enrich category breakdown with names
      const enrichedCategoryBreakdown = categoryBreakdown.map(item => ({
        categoryId: item.categoryId,
        category: item.categoryId ? categoryMap.get(item.categoryId) || 'Unknown' : 'Uncategorized',
        _count: item._count,
        _sum: item._sum
      }));
      
      // If no category breakdown but we have products, check for uncategorized products
      if (enrichedCategoryBreakdown.length === 0 && totalProducts > 0) {
        const uncategorizedCount = await prisma.product.count({
          where: { 
            tenantId: req.tenantId, 
            companyId, 
            status: 'ACTIVE',
            categoryId: null 
          }
        });
        
        const uncategorizedSum = await prisma.product.aggregate({
          where: { 
            tenantId: req.tenantId, 
            companyId, 
            status: 'ACTIVE',
            categoryId: null 
          },
          _sum: { stockQuantity: true }
        });
        
        if (uncategorizedCount > 0) {
          enrichedCategoryBreakdown.push({
            categoryId: null,
            category: 'Uncategorized',
            _count: { categoryId: uncategorizedCount },
            _sum: { stockQuantity: new Prisma.Decimal(uncategorizedSum._sum.stockQuantity || 0) }
          });
        }
      }
      
      console.log('Enriched Category Breakdown:', JSON.stringify(enrichedCategoryBreakdown, null, 2));
      
      res.json({
        totalProducts,
        totalValue: totalValue._sum.stockQuantity || 0,
        lowStockItems: lowStockCount,
        outOfStockItems: outOfStockCount,
        topProducts,
        categoryBreakdown: enrichedCategoryBreakdown,
        monthlyTrends: [], // TODO: Implement monthly trends
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // ===== SERIAL NUMBER MANAGEMENT =====
  
  // Get serial numbers for a product
  router.get('/products/:id/serial-numbers', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const status = req.query.status as string;
      
      const where: any = { tenantId: req.tenantId, productId: id };
      if (status) where.status = status;
      
      const serialNumbers = await prisma.product.findMany({ // TODO: Use correct model when available
        where,
        include: {
          // customer: { select: { id: true, name: true } } // TODO: Add when relation is available
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json(serialNumbers);
    } catch (error) {
      console.error('Error fetching serial numbers:', error);
      res.status(500).json({ error: 'Failed to fetch serial numbers' });
    }
  });

  // ===== BATCH MANAGEMENT =====
  
  // Get batches for a product
  router.get('/products/:id/batches', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const status = req.query.status as string;
      
      const where: any = { tenantId: req.tenantId, productId: id };
      if (status) where.status = status;
      
      const batches = await prisma.product.findMany({ // TODO: Use correct model when available
        where,
        include: {
          // location: { select: { id: true, name: true, code: true } } // TODO: Add when relation is available
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json(batches);
    } catch (error) {
      console.error('Error fetching batches:', error);
      res.status(500).json({ error: 'Failed to fetch batches' });
    }
  });
}
