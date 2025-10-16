import { PrismaClient } from '@prisma/client';
import { expenseJournalIntegration } from './expense-journal-integration';

const prisma = new PrismaClient();

export interface PurchaseOrderDeliveryData {
  purchaseOrderId: string;
  deliveredDate: Date;
  deliveredBy?: string;
  notes?: string;
  journalEntryData?: {
    memo?: string;
    reference?: string;
  };
  userId?: string; // Add user ID
}

export class PurchaseOrderDeliveryService {
  /**
   * Processes a purchase order delivery
   * - Updates PO status to 'delivered'
   * - Creates inventory movements for all delivered items
   * - Generates journal entries for inventory delivered
   * - Updates product stock levels
   */
  async processDelivery(data: PurchaseOrderDeliveryData): Promise<{
    purchaseOrder: any;
    inventoryMovements: any[];
    journalEntry?: any;
  }> {
    return await prisma.$transaction(async (tx) => {
      // 1. Get the purchase order with all related data
      const purchaseOrder = await tx.purchaseOrder.findFirst({
        where: {
          id: data.purchaseOrderId,
          status: { in: ['approved'] } // Only allow delivery from approved status
        },
        include: {
          lines: {
            include: {
              product: true
            }
          },
          vendor: true,
          company: true
        }
      });

      if (!purchaseOrder) {
        throw new Error('Purchase order not found or not in deliverable status');
      }

      // 2. Update purchase order status to delivered
      const updatedPO = await tx.purchaseOrder.update({
        where: { id: data.purchaseOrderId },
        data: {
          status: 'delivered',
          expectedDelivery: data.deliveredDate, // Update expected delivery to actual delivery date
          notes: data.notes ? `${purchaseOrder.notes || ''}\n\nDelivered on ${data.deliveredDate.toISOString().split('T')[0]} by ${data.deliveredBy || 'System'}` : purchaseOrder.notes
        }
      });

      // 3. Process inventory movements and stock updates
      const inventoryMovements = [];
      let totalInventoryValue = 0;
      let totalTaxAmount = 0;

      for (const line of purchaseOrder.lines) {
        if (line.productId && line.product) {
          // Skip services - they don't have inventory
          if (line.product.type === 'SERVICE') {
            console.log(`Skipping service product: ${line.product.name} - services don't have inventory`);
            continue;
          }
          
          const quantityToDeliver = Number(line.quantity) - Number(line.receivedQuantity || 0);
          
          if (quantityToDeliver > 0) {
            // Update product stock
            // Convert Decimal to number for arithmetic operations
            const currentStock = typeof line.product.stockQuantity === 'object' ? Number(line.product.stockQuantity) : Number(line.product.stockQuantity || 0);
            const newStockQuantity = currentStock + quantityToDeliver;
            const unitCost = Number(line.unitPrice);
            const taxRate = Number(line.taxRate || 0);
            
            // Calculate line values with tax
            const baseLineValue = quantityToDeliver * unitCost;
            const taxAmount = baseLineValue * (taxRate / 100);
            const totalLineValue = baseLineValue + taxAmount;

            await tx.product.update({
              where: { id: line.productId },
              data: {
                stockQuantity: newStockQuantity,
                availableQuantity: newStockQuantity - (typeof line.product.reservedQuantity === 'object' ? Number(line.product.reservedQuantity) : Number(line.product.reservedQuantity || 0)),
                costPrice: unitCost // Update cost price to latest purchase price
              }
            });

            // Create inventory movement
            const movement = await tx.inventoryMovement.create({
              data: {
                tenantId: purchaseOrder.tenantId,
                productId: line.productId,
                movementType: 'purchase_delivery',
                quantity: quantityToDeliver,
                unitCost: unitCost,
                movementDate: data.deliveredDate,
                reference: `PO-${purchaseOrder.poNumber}`,
                reason: `Delivered from PO ${purchaseOrder.poNumber}`
              }
            });

            inventoryMovements.push(movement);
            totalInventoryValue += baseLineValue; // Base value for inventory
            totalTaxAmount += taxAmount; // Track tax separately

            // Update PO line received quantity
            await tx.purchaseOrderLine.update({
              where: { id: line.id },
              data: {
                receivedQuantity: {
                  increment: quantityToDeliver
                }
              }
            });
          }
        }
      }

      // 4. Create journal entry for inventory delivered
      let journalEntry = null;
      if (totalInventoryValue > 0) {
        try {
          journalEntry = await this.createInventoryJournalEntry(
            tx, // Pass transaction context
            purchaseOrder,
            totalInventoryValue,
            totalTaxAmount,
            data.deliveredDate,
            data.journalEntryData,
            data.userId // Pass user ID
          );
        } catch (error) {
          console.error('Error creating journal entry for purchase order delivery:', error);
          // Don't fail the delivery if journal entry creation fails
        }
      }

      return {
        purchaseOrder: updatedPO,
        inventoryMovements,
        journalEntry
      };
    }, {
      timeout: 15000 // 15 seconds timeout
    });
  }

  /**
   * Creates a journal entry for inventory received
   */
  private async createInventoryJournalEntry(
    tx: any, // Transaction context
    purchaseOrder: any,
    totalInventoryValue: number,
    totalTaxAmount: number,
    deliveryDate: Date,
    journalData?: { memo?: string; reference?: string },
    userId?: string // Add user ID parameter
  ) {
    // Get or create inventory account
    const inventoryAccount = await this.getOrCreateInventoryAccount(tx, purchaseOrder.tenantId, purchaseOrder.companyId);
    
    // Get or create accounts payable account
    const accountsPayableAccount = await this.getOrCreateAccountsPayableAccount(tx, purchaseOrder.tenantId, purchaseOrder.companyId);

    // Get or create tax payable account (if there's tax)
    let taxPayableAccount = null;
    if (totalTaxAmount > 0) {
      taxPayableAccount = await this.getOrCreateTaxPayableAccount(tx, purchaseOrder.tenantId, purchaseOrder.companyId);
    }

    // Get or create journal entry type
    const entryType = await this.getOrCreateJournalEntryType(tx, purchaseOrder.tenantId, purchaseOrder.companyId, 'INVENTORY');

    // Calculate total amount (inventory + tax)
    const totalAmount = totalInventoryValue + totalTaxAmount;

    // Create journal entry lines
    const journalLines = [
      // Debit: Inventory Asset
      {
        tenantId: purchaseOrder.tenantId,
        accountId: inventoryAccount.id,
        debit: totalInventoryValue,
        credit: 0,
        memo: `Inventory received from PO ${purchaseOrder.poNumber}`
      }
    ];

    // Add tax debit if applicable
    if (totalTaxAmount > 0 && taxPayableAccount) {
      journalLines.push({
        tenantId: purchaseOrder.tenantId,
        accountId: taxPayableAccount.id,
        debit: totalTaxAmount,
        credit: 0,
        memo: `Tax on PO ${purchaseOrder.poNumber}`
      });
    }

    // Credit: Accounts Payable (total amount including tax)
    journalLines.push({
      tenantId: purchaseOrder.tenantId,
      accountId: accountsPayableAccount.id,
      debit: 0,
      credit: totalAmount,
      memo: `Liability for PO ${purchaseOrder.poNumber}`
    });

    // Create journal entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        tenantId: purchaseOrder.tenantId,
        companyId: purchaseOrder.companyId,
        date: deliveryDate,
        memo: journalData?.memo || `Inventory received from PO ${purchaseOrder.poNumber}`,
        reference: journalData?.reference || `PO-${purchaseOrder.poNumber}-RECEIVED`,
        status: 'POSTED',
        entryTypeId: entryType.id,
        createdById: userId || null, // Use actual user ID or null if not available
        lines: {
          create: journalLines
        }
      },
      include: {
        lines: {
          include: {
            account: true
          }
        },
        entryType: true
      }
    });

    return journalEntry;
  }

  /**
   * Gets or creates an inventory asset account
   */
  private async getOrCreateInventoryAccount(tx: any, tenantId: string, companyId: string) {
    // Try to find existing inventory account
    let account = await tx.account.findFirst({
      where: {
        tenantId,
        companyId,
        code: '1200', // Standard inventory account code
        type: {
          code: 'ASSET'
        }
      }
    });

    if (!account) {
      // Create inventory account
      const assetType = await tx.accountType.findFirst({
        where: { tenantId, code: 'ASSET' }
      });

      if (!assetType) {
        throw new Error('Asset account type not found');
      }

      account = await tx.account.create({
        data: {
          tenantId,
          companyId,
          code: '1200',
          name: 'Inventory',
          typeId: assetType.id
        }
      });
    }

    return account;
  }

  /**
   * Gets or creates an accounts payable account
   */
  private async getOrCreateAccountsPayableAccount(tx: any, tenantId: string, companyId: string) {
    // Try to find existing accounts payable account
    let account = await tx.account.findFirst({
      where: {
        tenantId,
        companyId,
        code: '2000', // Standard accounts payable code
        type: {
          code: 'LIABILITY'
        }
      }
    });

    if (!account) {
      // Create accounts payable account
      const liabilityType = await tx.accountType.findFirst({
        where: { tenantId, code: 'LIABILITY' }
      });

      if (!liabilityType) {
        throw new Error('Liability account type not found');
      }

      account = await tx.account.create({
        data: {
          tenantId,
          companyId,
          code: '2000',
          name: 'Accounts Payable',
          typeId: liabilityType.id
        }
      });
    }

    return account;
  }

  /**
   * Gets or creates a journal entry type
   */
  private async getOrCreateJournalEntryType(tx: any, tenantId: string, companyId: string, category: string) {
    let entryType = await tx.journalEntryType.findFirst({
      where: {
        tenantId,
        category
      }
    });

    if (!entryType) {
      entryType = await tx.journalEntryType.create({
        data: {
          tenantId,
          companyId,
          name: `${category} Entry`,
          category,
          description: `Journal entries for ${category.toLowerCase()} transactions`
        }
      });
    }

    return entryType;
  }

  /**
   * Gets or creates a tax payable account
   */
  private async getOrCreateTaxPayableAccount(tx: any, tenantId: string, companyId: string) {
    // Try to find existing tax payable account
    let account = await tx.account.findFirst({
      where: {
        tenantId,
        companyId,
        name: { contains: 'Tax Payable' }
      }
    });

    if (!account) {
      // Get liability account type
      const liabilityType = await tx.accountType.findFirst({
        where: {
          tenantId,
          name: 'Liability'
        }
      });

      if (!liabilityType) {
        throw new Error('Liability account type not found');
      }

      account = await tx.account.create({
        data: {
          tenantId,
          companyId,
          code: '2100',
          name: 'Tax Payable',
          typeId: liabilityType.id
        }
      });
    }

    return account;
  }

  /**
   * Gets delivery status for a purchase order
   */
  async getDeliveryStatus(purchaseOrderId: string, tenantId: string) {
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: purchaseOrderId,
        tenantId
      },
      include: {
        lines: {
          include: {
            product: true
          }
        },
        receipts: {
          include: {
            items: true
          }
        }
      }
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    const totalOrdered = purchaseOrder.lines.reduce((sum, line) => sum + Number(line.quantity), 0);
    const totalReceived = purchaseOrder.lines.reduce((sum, line) => sum + Number(line.receivedQuantity || 0), 0);
    const totalDelivered = purchaseOrder.receipts.reduce((sum, receipt) => 
      sum + receipt.items.reduce((itemSum, item) => itemSum + Number(item.quantityAccepted), 0), 0
    );

    return {
      purchaseOrderId,
      status: purchaseOrder.status,
      totalOrdered,
      totalReceived,
      totalDelivered,
      deliveryProgress: totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0,
      canDeliver: purchaseOrder.status === 'approved' || purchaseOrder.status === 'delivered',
      isFullyDelivered: totalDelivered >= totalOrdered,
      isPartiallyDelivered: totalDelivered > 0 && totalDelivered < totalOrdered
    };
  }
}

export const purchaseOrderDeliveryService = new PurchaseOrderDeliveryService();
