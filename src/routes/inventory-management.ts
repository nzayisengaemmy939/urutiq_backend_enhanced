import express from 'express'
import { z } from 'zod'
import { inventoryManagementService } from '../services/inventory-management.service'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenant'

const router = express.Router()

// Validation schemas
const locationSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  postalCode: z.string().min(1),
  isActive: z.boolean().default(true)
})

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true)
})

const productSchema = z.object({
  // Core Product Information
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE', 'DIGITAL', 'BUNDLE']).default('PRODUCT'),
  
  // Pricing Information
  unitPrice: z.number().min(0).default(0),
  costPrice: z.number().min(0).default(0),
  
  // Classification & Organization
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  tags: z.string().optional(),
  unit: z.string().optional().default('EACH'),
  
  // Stock & Inventory Management
  stockQuantity: z.number().min(0).default(0),
  reservedQuantity: z.number().min(0).default(0),
  availableQuantity: z.number().min(0).default(0),
  minStockLevel: z.number().min(0).optional(),
  maxStockLevel: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).optional(),
  reorderQuantity: z.number().min(0).optional(),
  
  // Physical Properties
  weight: z.number().min(0).optional(),
  dimensionsLength: z.number().min(0).optional(),
  dimensionsWidth: z.number().min(0).optional(),
  dimensionsHeight: z.number().min(0).optional(),
  dimensionsString: z.string().optional(),
  
  // Identification & Tracking
  barcode: z.string().optional(),
  qrCode: z.string().optional(),
  trackSerialNumbers: z.boolean().default(false),
  trackBatches: z.boolean().default(false),
  costingMethod: z.enum(['FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'SPECIFIC_IDENTIFICATION']).optional(),
  
  // Tax Information
  taxRate: z.number().min(0).max(100).optional(),
  taxInclusive: z.boolean().default(false),
  taxCode: z.string().optional(),
  taxExempt: z.boolean().default(false),
  
  // Product Type Flags
  isDigital: z.boolean().default(false),
  isService: z.boolean().default(false),
  isPhysical: z.boolean().default(true),
  trackInventory: z.boolean().default(true),
  
  // Business Rules & Options
  allowBackorder: z.boolean().default(false),
  allowPreorder: z.boolean().default(false),
  preorderDate: z.string().optional(),
  
  // Product Features & Marketing
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  
  // Warranty & Returns
  warrantyPeriod: z.number().min(0).optional(),
  warrantyUnit: z.enum(['DAYS', 'WEEKS', 'MONTHS', 'YEARS']).optional(),
  returnPolicy: z.string().optional(),
  
  // Shipping & Fulfillment
  shippingClass: z.string().optional(),
  
  // SEO & Marketing
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  
  // Media & Variants (JSON strings)
  images: z.string().optional(), // JSON array
  variants: z.string().optional(), // JSON array
  
  // Related Products & Cross-selling (JSON strings)
  relatedProducts: z.string().optional(), // JSON array
  upsellProducts: z.string().optional(), // JSON array
  crossSellProducts: z.string().optional(), // JSON array
  
  // Custom Fields & Extensions
  customFields: z.string().optional(), // JSON object
  
  // System Fields
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'DRAFT']).default('ACTIVE'),
  isActive: z.boolean().default(true) // Legacy compatibility
})

const serialNumberSchema = z.object({
  productId: z.string().min(1),
  locationId: z.string().min(1),
  serialNumber: z.string().min(1),
  status: z.enum(['AVAILABLE', 'SOLD', 'RESERVED', 'DEFECTIVE', 'RETURNED']).default('AVAILABLE'),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  notes: z.string().optional()
})

const transactionSchema = z.object({
  productId: z.string().min(1),
  locationId: z.string().min(1),
  transactionType: z.enum(['PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'CYCLE_COUNT']),
  quantity: z.number(),
  unitCost: z.number().min(0),
  totalCost: z.number(),
  reference: z.string().min(1),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  createdBy: z.string().min(1)
})

const cycleCountSchema = z.object({
  locationId: z.string().min(1),
  productId: z.string().min(1),
  expectedQuantity: z.number().min(0)
})

const cycleCountUpdateSchema = z.object({
  countedQuantity: z.number(),
  countedBy: z.string().min(1),
  notes: z.string().optional()
})

// Location Management
router.get('/inventory-management/:companyId/locations', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const locations = await inventoryManagementService.getLocations(companyId)

    res.json({
      success: true,
      data: locations
    })
  } catch (error) {
    console.error('Error fetching locations:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch locations',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.post('/inventory-management/:companyId/locations', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const locationData = locationSchema.parse(req.body)

    const location = await inventoryManagementService.createLocation(companyId, locationData)

    res.status(201).json({
      success: true,
      data: location
    })
  } catch (error) {
    console.error('Error creating location:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create location',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Category Management
router.get('/inventory-management/:companyId/categories', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const categories = await inventoryManagementService.getCategories(companyId)

    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.post('/inventory-management/:companyId/categories', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const categoryData = categorySchema.parse(req.body)

    const category = await inventoryManagementService.createCategory(companyId, categoryData)

    res.status(201).json({
      success: true,
      data: category
    })
  } catch (error) {
    console.error('Error creating category:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Product Management
router.get('/inventory-management/:companyId/products', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const { categoryId } = req.query

    const products = await inventoryManagementService.getProducts(
      companyId,
      categoryId as string
    )

    res.json({
      success: true,
      data: products
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.post('/inventory-management/:companyId/products', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const productData = productSchema.parse(req.body)

    const product = await inventoryManagementService.createProduct(companyId, {
      ...productData,
      categoryId: productData.categoryId || 'default-category-id'
    })

    res.status(201).json({
      success: true,
      data: product
    })
  } catch (error) {
    console.error('Error creating product:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Inventory Items
router.get('/inventory-management/:companyId/inventory', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const { locationId, productId } = req.query

    const inventoryItems = await inventoryManagementService.getInventoryItems(
      companyId,
      locationId as string,
      productId as string
    )

    res.json({
      success: true,
      data: inventoryItems
    })
  } catch (error) {
    console.error('Error fetching inventory items:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory items',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Serial Numbers
router.get('/inventory-management/:companyId/serial-numbers', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const { productId, locationId, status } = req.query

    const serialNumbers = await inventoryManagementService.getSerialNumbers(
      companyId,
      productId as string,
      locationId as string,
      status as string
    )

    res.json({
      success: true,
      data: serialNumbers
    })
  } catch (error) {
    console.error('Error fetching serial numbers:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch serial numbers',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.post('/inventory-management/:companyId/serial-numbers', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const { productId, locationId, serialNumber, status } = serialNumberSchema.parse(req.body)

    const serial = await inventoryManagementService.createSerialNumber(
      companyId,
      productId,
      locationId,
      serialNumber,
      status
    )

    res.status(201).json({
      success: true,
      data: serial
    })
  } catch (error) {
    console.error('Error creating serial number:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create serial number',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Inventory Transactions
router.get('/inventory-management/:companyId/transactions', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const { productId, locationId, transactionType, limit } = req.query

    const transactions = await inventoryManagementService.getTransactions(
      companyId,
      productId as string,
      locationId as string,
      transactionType as string,
      limit ? parseInt(limit as string) : 100
    )

    res.json({
      success: true,
      data: transactions
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.post('/inventory-management/:companyId/transactions', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const transactionData = transactionSchema.parse(req.body)

    const transaction = await inventoryManagementService.createTransaction(companyId, transactionData)

    res.status(201).json({
      success: true,
      data: transaction
    })
  } catch (error) {
    console.error('Error creating transaction:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Inventory Valuation
router.get('/inventory-management/:companyId/valuation', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const { locationId } = req.query

    const valuation = await inventoryManagementService.getInventoryValuation(
      companyId,
      locationId as string
    )

    res.json({
      success: true,
      data: valuation
    })
  } catch (error) {
    console.error('Error fetching inventory valuation:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory valuation',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Cost Method Calculations
router.get('/inventory-management/:companyId/cost/:productId/:method', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId, productId, method } = req.params
    const { quantity } = req.query

    let cost: number
    switch (method) {
      case 'FIFO':
        cost = await inventoryManagementService.calculateFIFOCost(productId, parseInt(quantity as string) || 1)
        break
      case 'LIFO':
        cost = await inventoryManagementService.calculateLIFOCost(productId, parseInt(quantity as string) || 1)
        break
      case 'AVERAGE':
        cost = await inventoryManagementService.calculateAverageCost(productId)
        break
      default:
        throw new Error(`Unsupported cost method: ${method}`)
    }

    res.json({
      success: true,
      data: { cost, method, productId }
    })
  } catch (error) {
    console.error('Error calculating cost:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to calculate cost',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Cycle Counting
router.get('/inventory-management/:companyId/cycle-counts', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const { locationId, status } = req.query

    const cycleCounts = await inventoryManagementService.getCycleCounts(
      companyId,
      locationId as string,
      status as string
    )

    res.json({
      success: true,
      data: cycleCounts
    })
  } catch (error) {
    console.error('Error fetching cycle counts:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cycle counts',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.post('/inventory-management/:companyId/cycle-counts', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const { locationId, productId, expectedQuantity } = cycleCountSchema.parse(req.body)

    const cycleCount = await inventoryManagementService.createCycleCount(
      companyId,
      locationId,
      productId,
      expectedQuantity
    )

    res.status(201).json({
      success: true,
      data: cycleCount
    })
  } catch (error) {
    console.error('Error creating cycle count:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create cycle count',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.put('/inventory-management/:companyId/cycle-counts/:id', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const updateData = cycleCountUpdateSchema.parse(req.body)

    const cycleCount = await inventoryManagementService.updateCycleCount(
      id,
      updateData.countedQuantity,
      updateData.countedBy,
      updateData.notes
    )

    res.json({
      success: true,
      data: cycleCount
    })
  } catch (error) {
    console.error('Error updating cycle count:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update cycle count',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Reorder Alerts
router.get('/inventory-management/:companyId/reorder-alerts', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const alerts = await inventoryManagementService.getReorderAlerts(companyId)

    res.json({
      success: true,
      data: alerts
    })
  } catch (error) {
    console.error('Error fetching reorder alerts:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reorder alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Inventory Reports
router.get('/inventory-management/:companyId/reports', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), tenantMiddleware, async (req, res) => {
  try {
    const { companyId } = req.params
    const { reportType, locationId, categoryId, startDate, endDate } = req.query

    const report = await inventoryManagementService.getInventoryReport(
      companyId,
      reportType as any,
      locationId as string,
      categoryId as string,
      startDate as string,
      endDate as string
    )

    res.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Error generating inventory report:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate inventory report',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
