// Purchase Order Types
export interface PurchaseOrder {
  id: string;
  tenantId: string;
  companyId: string;
  vendorId: string;
  poNumber: string;
  orderDate: Date;
  expectedDelivery?: Date;
  status: 'draft' | 'sent' | 'approved' | 'received' | 'closed' | 'cancelled';
  totalAmount: number;
  currency: string;
  notes?: string;
  terms?: string;
  approvalWorkflow?: string;
  receivingStatus: 'pending' | 'partial' | 'complete';
  relatedBillId?: string;
  // Import/Export fields
  purchaseType: 'local' | 'import';
  vendorCurrency?: string;
  exchangeRate?: number;
  freightCost: number;
  customsDuty: number;
  otherImportCosts: number;
  landedCostAllocated: boolean;
  incoterms?: string;
  shippingMethod?: string;
  originCountry?: string;
  destinationCountry?: string;
  portOfEntry?: string;
  importLicense?: string;
  customsDeclaration?: string;
  billOfLading?: string;
  commercialInvoice?: string;
  packingList?: string;
  createdAt: Date;
  updatedAt: Date;
  company: Company;
  vendor: Vendor;
  lines: PurchaseOrderLine[];
  receipts: Receipt[];
  importShipments: ImportShipment[];
  relatedBill?: Bill;
}

export interface PurchaseOrderLine {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
  receivedQuantity: number;
  product?: Product;
}

export interface Receipt {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  receiptNumber: string;
  receivedDate: Date;
  receivedBy?: string;
  notes?: string;
  qualityCheck?: string;
  partialReceipt: boolean;
  createdAt: Date;
  updatedAt: Date;
  items: ReceiptItem[];
}

export interface ReceiptItem {
  id: string;
  tenantId: string;
  receiptId: string;
  purchaseOrderLineId?: string;
  productId?: string;
  description: string;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  rejectionReason?: string;
}

// Import Shipment Types
export interface ImportShipment {
  id: string;
  tenantId: string;
  companyId: string;
  purchaseOrderId: string;
  shipmentNumber: string;
  shipmentDate: Date;
  expectedArrival?: Date;
  actualArrival?: Date;
  status: 'pending' | 'in_transit' | 'arrived' | 'cleared' | 'delivered';
  carrier?: string;
  trackingNumber?: string;
  containerNumber?: string;
  vesselFlight?: string;
  customsBroker?: string;
  customsEntryDate?: Date;
  customsReleaseDate?: Date;
  dutiesPaid: number;
  taxesPaid: number;
  billOfLading?: string;
  commercialInvoice?: string;
  packingList?: string;
  certificateOfOrigin?: string;
  insuranceCertificate?: string;
  freightCost: number;
  insuranceCost: number;
  customsFees: number;
  storageCost: number;
  otherCosts: number;
  totalLandedCost: number;
  notes?: string;
  issues?: string;
  createdAt: Date;
  updatedAt: Date;
  company: Company;
  purchaseOrder: PurchaseOrder;
  customsEvents: CustomsEvent[];
}

export interface CustomsEvent {
  id: string;
  tenantId: string;
  importShipmentId: string;
  eventType: 'shipment_created' | 'customs_entry' | 'customs_hold' | 'customs_release' | 'delivery';
  eventDate: Date;
  description: string;
  location?: string;
  documents?: string;
  status: 'pending' | 'completed' | 'failed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  importShipment: ImportShipment;
}

// Expense Category Types
export interface ExpenseCategory {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  taxTreatment?: 'deductible' | 'non-deductible' | 'partially_deductible';
  approvalThreshold?: number;
  createdAt: Date;
  updatedAt: Date;
  company: Company;
  parent?: ExpenseCategory;
  children: ExpenseCategory[];
  budgets: Budget[];
  expenseRules: ExpenseRule[];
}

export interface Budget {
  id: string;
  tenantId: string;
  companyId: string;
  categoryId: string;
  name: string;
  description?: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  amount: number;
  spentAmount: number;
  isActive: boolean;
  alertThreshold?: number;
  createdAt: Date;
  updatedAt: Date;
  company: Company;
  category: ExpenseCategory;
}

export interface ExpenseRule {
  id: string;
  tenantId: string;
  companyId: string;
  categoryId: string;
  name: string;
  description?: string;
  ruleType: 'amount_limit' | 'vendor_restriction' | 'approval_required';
  conditions: string; // JSON string
  actions: string; // JSON string
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  company: Company;
  category: ExpenseCategory;
}

// Approval Workflow Types
export interface ApprovalWorkflow {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  description?: string;
  entityType: 'purchase_order' | 'expense' | 'bill' | 'invoice';
  steps: string; // JSON string
  conditions?: string; // JSON string
  autoApproval: boolean;
  escalationRules?: string; // JSON string
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  company: Company;
  approvals: Approval[];
}

export interface Approval {
  id: string;
  tenantId: string;
  companyId: string;
  workflowId: string;
  entityType: 'purchase_order' | 'expense' | 'bill' | 'invoice';
  entityId: string;
  stepNumber: number;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  comments?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  escalationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  company: Company;
  workflow: ApprovalWorkflow;
  approver: AppUser;
}

// Request/Response Types
export interface CreatePurchaseOrderRequest {
  companyId: string;
  vendorId: string;
  poNumber: string;
  orderDate: string;
  expectedDelivery?: string;
  currency?: string;
  notes?: string;
  terms?: string;
  purchaseType?: 'local' | 'import';
  vendorCurrency?: string;
  exchangeRate?: number;
  freightCost?: number;
  customsDuty?: number;
  otherImportCosts?: number;
  incoterms?: string;
  shippingMethod?: string;
  originCountry?: string;
  destinationCountry?: string;
  portOfEntry?: string;
  lines: CreatePurchaseOrderLineRequest[];
}

export interface CreatePurchaseOrderLineRequest {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface CreateImportShipmentRequest {
  companyId: string;
  purchaseOrderId: string;
  shipmentNumber: string;
  shipmentDate: string;
  expectedArrival?: string;
  carrier?: string;
  trackingNumber?: string;
  containerNumber?: string;
  vesselFlight?: string;
  customsBroker?: string;
  billOfLading?: string;
  commercialInvoice?: string;
  packingList?: string;
  certificateOfOrigin?: string;
  insuranceCertificate?: string;
  freightCost?: number;
  insuranceCost?: number;
  customsFees?: number;
  storageCost?: number;
  otherCosts?: number;
  notes?: string;
}

export interface CreateExpenseCategoryRequest {
  companyId: string;
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  taxTreatment?: 'deductible' | 'non-deductible' | 'partially_deductible';
  approvalThreshold?: number;
}

export interface CreateBudgetRequest {
  companyId: string;
  categoryId: string;
  name: string;
  description?: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  amount: number;
  alertThreshold?: number;
}

export interface CreateApprovalWorkflowRequest {
  companyId: string;
  name: string;
  description?: string;
  entityType: 'purchase_order' | 'expense' | 'bill' | 'invoice';
  steps: string; // JSON string
  conditions?: string; // JSON string
  autoApproval?: boolean;
  escalationRules?: string; // JSON string
}

// Analytics Types
export interface PurchaseOrderAnalytics {
  totalOrders: number;
  totalValue: number;
  averageOrderValue: number;
  statusBreakdown: {
    draft: number;
    sent: number;
    approved: number;
    received: number;
    closed: number;
    cancelled: number;
  };
  topVendors: Array<{
    vendorId: string;
    vendorName: string;
    orderCount: number;
    totalValue: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    orderCount: number;
    totalValue: number;
  }>;
}

export interface ImportShipmentAnalytics {
  totalShipments: number;
  totalLandedCost: number;
  averageTransitTime: number;
  statusBreakdown: {
    pending: number;
    in_transit: number;
    arrived: number;
    cleared: number;
    delivered: number;
  };
  topCarriers: Array<{
    carrier: string;
    shipmentCount: number;
    averageCost: number;
  }>;
  costBreakdown: {
    freight: number;
    insurance: number;
    customs: number;
    storage: number;
    other: number;
  };
}

export interface BudgetAnalytics {
  totalBudgets: number;
  totalBudgetedAmount: number;
  totalSpentAmount: number;
  averageUtilization: number;
  overBudgetCategories: Array<{
    categoryId: string;
    categoryName: string;
    budgetedAmount: number;
    spentAmount: number;
    utilizationPercentage: number;
  }>;
  monthlySpending: Array<{
    month: string;
    budgetedAmount: number;
    spentAmount: number;
    variance: number;
  }>;
}

// Utility Types
export interface ThreeWayMatchingResult {
  poTotal: number;
  billTotal: number;
  receiptTotal: number;
  matches: {
    quantities: boolean;
    prices: boolean;
    totals: boolean;
  };
  discrepancies: string[];
}

export interface LandedCostAllocation {
  shipmentId: string;
  totalLandedCost: number;
  allocationMethod: 'weight' | 'volume' | 'value';
  allocations: Array<{
    lineId: string;
    allocatedCost: number;
  }>;
}

// Re-export existing types for convenience
export interface Company {
  id: string;
  name: string;
  // ... other fields
}

export interface Vendor {
  id: string;
  name: string;
  // ... other fields
}

export interface Product {
  id: string;
  name: string;
  // ... other fields
}

export interface Bill {
  id: string;
  billNumber: string;
  // ... other fields
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  // ... other fields
}
