import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface InventoryLocation {
  id: string
  name: string
  address: string
  city: string
  state: string
  country: string
  postalCode: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductCategory {
  id: string
  name: string
  description?: string
  parentId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Product {
  // Core Product Information
  id: string
  sku: string
  name: string
  description?: string
  shortDescription?: string
  type: 'PRODUCT' | 'SERVICE' | 'DIGITAL' | 'BUNDLE'
  
  // Pricing Information
  unitPrice: number
  costPrice: number
  
  // Classification & Organization
  categoryId: string
  category?: string
  brand?: string
  model?: string
  tags?: string
  unit?: string
  
  // Stock & Inventory Management
  stockQuantity?: number
  reservedQuantity?: number
  availableQuantity?: number
  minStockLevel?: number
  maxStockLevel?: number
  reorderPoint?: number
  reorderQuantity?: number
  
  // Physical Properties
  weight?: number
  dimensions?: string | {
    length: number
    width: number
    height: number
  }
  
  // Identification & Tracking
  barcode?: string
  qrCode?: string
  trackSerialNumbers?: boolean
  trackBatches?: boolean
  costMethod?: 'FIFO' | 'LIFO' | 'AVERAGE' | 'SPECIFIC_IDENTIFICATION'
  
  // Tax Information
  taxRate?: number
  taxInclusive?: boolean
  taxCode?: string
  taxExempt?: boolean
  
  // Product Type Flags
  isDigital?: boolean
  isService?: boolean
  isPhysical?: boolean
  trackInventory?: boolean
  
  // Business Rules & Options
  allowBackorder?: boolean
  allowPreorder?: boolean
  preorderDate?: string
  
  // Product Features & Marketing
  isFeatured?: boolean
  isBestSeller?: boolean
  isNewArrival?: boolean
  
  // Warranty & Returns
  warrantyPeriod?: number
  warrantyUnit?: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'
  returnPolicy?: string
  
  // Shipping & Fulfillment
  shippingClass?: string
  
  // SEO & Marketing
  seoTitle?: string
  seoDescription?: string
  metaKeywords?: string
  
  // Media & Variants
  images?: string[]
  variants?: ProductVariant[]
  
  // Related Products & Cross-selling
  relatedProducts?: string[]
  upsellProducts?: string[]
  crossSellProducts?: string[]
  
  // Custom Fields & Extensions
  customFields?: Record<string, any>
  
  // System Fields
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'DRAFT'
  isActive?: boolean // Legacy compatibility
  companyId?: string
  tenantId?: string
  createdAt: string
  updatedAt: string
}

export interface ProductVariant {
  id?: string
  productId?: string
  name: string
  sku?: string
  unitPrice?: number
  costPrice?: number
  stockQuantity?: number
  weight?: number
  dimensions?: string
  barcode?: string
  attributes: Record<string, string>
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface InventoryItem {
  id: string
  productId: string
  locationId: string
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  averageCost: number
  lastCost: number
  totalValue: number
  lastUpdated: string
}

export interface SerialNumber {
  id: string
  productId: string
  locationId: string
  serialNumber: string
  status: 'AVAILABLE' | 'SOLD' | 'RESERVED' | 'DEFECTIVE' | 'RETURNED'
  purchaseDate?: string
  saleDate?: string
  warrantyExpiry?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface InventoryTransaction {
  id: string
  productId: string
  locationId: string
  transactionType: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN' | 'CYCLE_COUNT'
  quantity: number
  unitCost: number
  totalCost: number
  reference: string
  referenceId?: string
  notes?: string
  serialNumbers?: string[]
  createdAt: string
  createdBy: string
}

export interface InventoryValuation {
  productId: string
  productName: string
  sku: string
  totalQuantity: number
  averageCost: number
  totalValue: number
  locations: Array<{
    locationId: string
    locationName: string
    quantity: number
    value: number
  }>
}

export interface CycleCount {
  id: string
  locationId: string
  productId: string
  expectedQuantity: number
  countedQuantity: number
  variance: number
  varianceValue: number
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED'
  countedBy?: string
  countedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  notes?: string
  createdAt: string
}

export class InventoryManagementService {
  // Location Management
  async createLocation(companyId: string, locationData: Omit<InventoryLocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryLocation> {
    try {
      // In a real implementation, this would save to database
      const location: InventoryLocation = {
        id: `loc-${Date.now()}`,
        ...locationData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return location
    } catch (error) {
      console.error('Error creating location:', error)
      throw new Error('Failed to create location')
    }
  }

  async getLocations(companyId: string): Promise<InventoryLocation[]> {
    try {
      // In a real implementation, this would fetch from database
      return [
      {
        id: 'loc-1',
        name: 'Main Warehouse',
        address: '123 Business St',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        postalCode: '94105',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'loc-2',
        name: 'Secondary Warehouse',
        address: '456 Commerce Ave',
        city: 'Los Angeles',
        state: 'CA',
        country: 'US',
        postalCode: '90210',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
    } catch (error) {
      console.error('Error fetching locations:', error)
      throw new Error('Failed to fetch locations')
    }
  }

  // Product Category Management
  async createCategory(companyId: string, categoryData: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductCategory> {
    try {
      const category: ProductCategory = {
        id: `cat-${Date.now()}`,
        ...categoryData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return category
    } catch (error) {
      console.error('Error creating category:', error)
      throw new Error('Failed to create category')
    }
  }

  async getCategories(companyId: string): Promise<ProductCategory[]> {
    try {
      return [
      {
        id: 'cat-1',
        name: 'Electronics',
        description: 'Electronic devices and components',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'cat-2',
        name: 'Office Supplies',
        description: 'Office equipment and supplies',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
    } catch (error) {
      console.error('Error fetching categories:', error)
      throw new Error('Failed to fetch categories')
    }
  }

  // Product Management
  async createProduct(companyId: string, productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    try {
      const product: Product = {
        id: `prod-${Date.now()}`,
        ...productData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return product
    } catch (error) {
      console.error('Error creating product:', error)
      throw new Error('Failed to create product')
    }
  }

  async getProducts(companyId: string, categoryId?: string): Promise<Product[]> {
    try {
      // In a real implementation, this would fetch from database
      return [
      {
        id: 'prod-1',
        sku: 'LAPTOP-001',
        name: 'Business Laptop',
        description: 'High-performance business laptop',
        type: 'PRODUCT',
        unitPrice: 1500.00,
        costPrice: 1200.00,
        categoryId: 'cat-1',
        unit: 'each',
        costMethod: 'FIFO',
        reorderPoint: 10,
        reorderQuantity: 50,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-2',
        sku: 'MOUSE-001',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        type: 'PRODUCT',
        unitPrice: 50.00,
        costPrice: 30.00,
        categoryId: 'cat-1',
        unit: 'each',
        costMethod: 'AVERAGE',
        reorderPoint: 25,
        reorderQuantity: 100,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
    } catch (error) {
      console.error('Error fetching products:', error)
      throw new Error('Failed to fetch products')
    }
  }

  // Inventory Item Management
  async getInventoryItems(companyId: string, locationId?: string, productId?: string): Promise<InventoryItem[]> {
    // In a real implementation, this would fetch from database
    return [
      {
        id: 'inv-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantityOnHand: 25,
        quantityReserved: 5,
        quantityAvailable: 20,
        averageCost: 1200.00,
        lastCost: 1250.00,
        totalValue: 30000.00,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'inv-2',
        productId: 'prod-1',
        locationId: 'loc-2',
        quantityOnHand: 15,
        quantityReserved: 2,
        quantityAvailable: 13,
        averageCost: 1200.00,
        lastCost: 1250.00,
        totalValue: 18000.00,
        lastUpdated: new Date().toISOString()
      }
    ]
  }

  // Serial Number Management
  async createSerialNumber(
    companyId: string,
    productId: string,
    locationId: string,
    serialNumber: string,
    status: SerialNumber['status'] = 'AVAILABLE'
  ): Promise<SerialNumber> {
    const serial: SerialNumber = {
      id: `sn-${Date.now()}`,
      productId,
      locationId,
      serialNumber,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    return serial
  }

  async getSerialNumbers(companyId: string, productId?: string, locationId?: string, status?: string): Promise<SerialNumber[]> {
    // In a real implementation, this would fetch from database
    return [
      {
        id: 'sn-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        serialNumber: 'LAP001-2024-001',
        status: 'AVAILABLE',
        purchaseDate: '2024-01-15',
        warrantyExpiry: '2027-01-15',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'sn-2',
        productId: 'prod-1',
        locationId: 'loc-1',
        serialNumber: 'LAP001-2024-002',
        status: 'SOLD',
        purchaseDate: '2024-01-15',
        saleDate: '2024-02-01',
        warrantyExpiry: '2027-01-15',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }

  // Inventory Transactions
  async createTransaction(
    companyId: string,
    transactionData: Omit<InventoryTransaction, 'id' | 'createdAt'>
  ): Promise<InventoryTransaction> {
    const transaction: InventoryTransaction = {
      id: `txn-${Date.now()}`,
      ...transactionData,
      createdAt: new Date().toISOString()
    }

    // Update inventory quantities
    await this.updateInventoryQuantities(companyId, transaction)

    return transaction
  }

  private async updateInventoryQuantities(companyId: string, transaction: InventoryTransaction) {
    // In a real implementation, this would update the database
    // This is a simplified version that would handle:
    // - Updating quantity on hand
    // - Updating average cost based on cost method
    // - Updating total value
    // - Handling serial number assignments
  }

  async getTransactions(
    companyId: string,
    productId?: string,
    locationId?: string,
    transactionType?: string,
    limit: number = 100
  ): Promise<InventoryTransaction[]> {
    // In a real implementation, this would fetch from database
    return [
      {
        id: 'txn-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        transactionType: 'PURCHASE',
        quantity: 50,
        unitCost: 1200.00,
        totalCost: 60000.00,
        reference: 'PO-2024-001',
        referenceId: 'po-123',
        notes: 'Initial stock purchase',
        createdAt: new Date().toISOString(),
        createdBy: 'user-1'
      },
      {
        id: 'txn-2',
        productId: 'prod-1',
        locationId: 'loc-1',
        transactionType: 'SALE',
        quantity: -5,
        unitCost: 1200.00,
        totalCost: -6000.00,
        reference: 'SO-2024-001',
        referenceId: 'so-456',
        notes: 'Customer sale',
        serialNumbers: ['LAP001-2024-002'],
        createdAt: new Date().toISOString(),
        createdBy: 'user-1'
      }
    ]
  }

  // Inventory Valuation
  async getInventoryValuation(companyId: string, locationId?: string): Promise<InventoryValuation[]> {
    const products = await this.getProducts(companyId)
    const inventoryItems = await this.getInventoryItems(companyId, locationId)
    const locations = await this.getLocations(companyId)

    const valuationMap = new Map<string, InventoryValuation>()

    for (const product of products) {
      const productItems = inventoryItems.filter(item => item.productId === product.id)
      
      if (productItems.length === 0) continue

      const totalQuantity = productItems.reduce((sum, item) => sum + item.quantityOnHand, 0)
      const totalValue = productItems.reduce((sum, item) => sum + item.totalValue, 0)
      const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0

      const locationBreakdown = productItems.map(item => {
        const location = locations.find(loc => loc.id === item.locationId)
        return {
          locationId: item.locationId,
          locationName: location?.name || 'Unknown',
          quantity: item.quantityOnHand,
          value: item.totalValue
        }
      })

      valuationMap.set(product.id, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        totalQuantity,
        averageCost,
        totalValue,
        locations: locationBreakdown
      })
    }

    return Array.from(valuationMap.values())
  }

  // Cost Method Calculations
  async calculateFIFOCost(productId: string, quantity: number): Promise<number> {
    // In a real implementation, this would calculate FIFO cost
    // by finding the oldest inventory layers first
    return 1200.00 // Simplified for demo
  }

  async calculateLIFOCost(productId: string, quantity: number): Promise<number> {
    // In a real implementation, this would calculate LIFO cost
    // by finding the newest inventory layers first
    return 1250.00 // Simplified for demo
  }

  async calculateAverageCost(productId: string): Promise<number> {
    // In a real implementation, this would calculate weighted average cost
    const inventoryItems = await this.getInventoryItems('', '', productId)
    const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantityOnHand, 0)
    const totalValue = inventoryItems.reduce((sum, item) => sum + item.totalValue, 0)
    return totalQuantity > 0 ? totalValue / totalQuantity : 0
  }

  // Cycle Counting
  async createCycleCount(
    companyId: string,
    locationId: string,
    productId: string,
    expectedQuantity: number
  ): Promise<CycleCount> {
    const cycleCount: CycleCount = {
      id: `cc-${Date.now()}`,
      locationId,
      productId,
      expectedQuantity,
      countedQuantity: 0,
      variance: 0,
      varianceValue: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }
    return cycleCount
  }

  async getCycleCounts(companyId: string, locationId?: string, status?: string): Promise<CycleCount[]> {
    // In a real implementation, this would fetch from database
    return [
      {
        id: 'cc-1',
        locationId: 'loc-1',
        productId: 'prod-1',
        expectedQuantity: 25,
        countedQuantity: 24,
        variance: -1,
        varianceValue: -1200.00,
        status: 'COMPLETED',
        countedBy: 'user-1',
        countedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ]
  }

  async updateCycleCount(
    id: string,
    countedQuantity: number,
    countedBy: string,
    notes?: string
  ): Promise<CycleCount> {
    // In a real implementation, this would update the database
    const cycleCount = await this.getCycleCounts('').then(counts => counts.find(cc => cc.id === id))
    if (!cycleCount) throw new Error('Cycle count not found')

    const variance = countedQuantity - cycleCount.expectedQuantity
    const averageCost = await this.calculateAverageCost(cycleCount.productId)
    const varianceValue = variance * averageCost

    return {
      ...cycleCount,
      countedQuantity,
      variance,
      varianceValue,
      status: 'COMPLETED',
      countedBy,
      countedAt: new Date().toISOString(),
      notes
    }
  }

  // Reorder Point Management
  async getReorderAlerts(companyId: string): Promise<Array<{
    productId: string
    productName: string
    sku: string
    locationId: string
    locationName: string
    currentQuantity: number
    reorderPoint: number
    reorderQuantity: number
    daysUntilStockout: number
  }>> {
    const products = await this.getProducts(companyId)
    const inventoryItems = await this.getInventoryItems(companyId)
    const locations = await this.getLocations(companyId)

    const alerts = []

    for (const product of products) {
      const productItems = inventoryItems.filter(item => item.productId === product.id)
      
      for (const item of productItems) {
        if (item.quantityOnHand <= (product.reorderPoint || 0)) {
          const location = locations.find(loc => loc.id === item.locationId)
          const dailyUsage = 1 // Simplified - would calculate based on historical data
          const daysUntilStockout = item.quantityOnHand / dailyUsage

          alerts.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            locationId: item.locationId,
            locationName: location?.name || 'Unknown',
            currentQuantity: item.quantityOnHand,
            reorderPoint: product.reorderPoint || 0,
            reorderQuantity: product.reorderQuantity || 0,
            daysUntilStockout: Math.max(0, daysUntilStockout)
          })
        }
      }
    }

    return alerts
  }

  // Inventory Reports
  async getInventoryReport(
    companyId: string,
    reportType: 'SUMMARY' | 'DETAILED' | 'VALUATION' | 'MOVEMENT',
    locationId?: string,
    categoryId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    // In a real implementation, this would generate comprehensive reports
    switch (reportType) {
      case 'SUMMARY':
        return {
          totalProducts: 2,
          totalValue: 48000.00,
          totalQuantity: 40,
          locations: 2,
          lowStockItems: 1
        }
      case 'VALUATION':
        return await this.getInventoryValuation(companyId, locationId)
      case 'MOVEMENT':
        return await this.getTransactions(companyId, undefined, locationId)
      default:
        return {}
    }
  }
}

export const inventoryManagementService = new InventoryManagementService()
