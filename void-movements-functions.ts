import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// 📝 TYPE DEFINITIONS
interface VoidMovementResult {
  productName: string;
  productId: string;
  originalQuantity: number;
  restoreQuantity: number;
  oldStock: number;
  newStock: number;
  movementId: string;
}

interface VoidOperationResult {
  success: boolean;
  alreadyProcessed?: boolean;
  voidMovements?: any[];
  stockUpdates?: VoidMovementResult[];
  message: string;
}

interface MovementVerification {
  movements: number;
  netMovement: number;
  cancelled: boolean;
}

// 🔒 CONSTANTS
const VOID_MOVEMENT_TYPE = 'VOID' as const;
const VALID_INVOICE_STATUSES = ['VOIDED', 'CANCELLED'] as const;

/**
 * 🔧 IMPROVED VOID MOVEMENTS (STOCK RESTORATION) FUNCTION
 * 
 * Creates reversing inventory movements for voided invoices with:
 * - Idempotency protection
 * - Type safety
 * - Comprehensive error handling
 * - Audit trail
 * - Race condition prevention
 */
async function createVoidMovementsAndRestoreStock(
  invoiceNumber: string,
  voidReference: string,
  tenantId: string,
  userId?: string
): Promise<VoidOperationResult> {
  console.log(`🔧 Starting void process for ${invoiceNumber}...`);
  
  try {
    // ✅ 1. IDEMPOTENCY CHECK (prevents double-processing)
    const existingVoids = await checkVoidMovementsExist(voidReference, tenantId);
    if (existingVoids.exist) {
      console.log(`⚠️  Void movements already exist (${existingVoids.count} found)`);
      return {
        success: true,
        alreadyProcessed: true,
        message: `Void movements already processed (${existingVoids.count} movements found)`
      };
    }

    // ✅ 2. VALIDATE INVOICE EXISTS AND STATUS
    const invoice = await prisma.invoice.findFirst({
      where: { 
        invoiceNumber, 
        tenantId,
        status: { in: [...VALID_INVOICE_STATUSES] }
      },
      include: {
        lines: { 
          include: { 
            product: true 
          } 
        }
      }
    });

    if (!invoice) {
      throw new Error(
        `Invoice ${invoiceNumber} not found or not in voided/cancelled status`
      );
    }

    if (!invoice.lines || invoice.lines.length === 0) {
      console.log('⚠️  Invoice has no line items, nothing to void');
      return {
        success: true,
        message: 'No inventory movements needed - invoice has no line items'
      };
    }

    // ✅ 3. FIND ORIGINAL MOVEMENTS
    const originalMovements = await prisma.inventoryMovement.findMany({
      where: {
        tenantId,
        reference: { in: [invoiceNumber, `INV-${invoiceNumber}`] }
      },
      include: { product: true }
    });

    if (originalMovements.length === 0) {
      console.log('⚠️  No original inventory movements found');
      return {
        success: true,
        message: 'No inventory movements found to reverse'
      };
    }

    console.log(`📦 Found ${originalMovements.length} original movements to reverse`);

    // ✅ 4. PROCESS VOID MOVEMENTS IN TRANSACTION
    const results = await prisma.$transaction(
      async (tx) => {
        const voidMovements = [];
        const stockUpdates: VoidMovementResult[] = [];

        for (const originalMovement of originalMovements) {
          // Validate product exists
          if (!originalMovement.product) {
            throw new Error(
              `Product not found for movement ${originalMovement.id}`
            );
          }

          const product = originalMovement.product;
          
          // Handle Decimal types safely
          const originalQuantity = originalMovement.quantity instanceof Prisma.Decimal
            ? originalMovement.quantity.toNumber()
            : Number(originalMovement.quantity);
          
          const restoreQuantity = -originalQuantity;

          console.log(`\n📦 Processing ${product.name}:`);
          console.log(`   Original movement: ${originalQuantity} units`);
          console.log(`   Restoring: ${restoreQuantity} units`);

          // ✅ CREATE VOID MOVEMENT with audit trail
          const auditReason = userId
            ? `Voided by user ${userId} at ${new Date().toISOString()} - invoice ${invoiceNumber}`
            : `Inventory restoration - voided invoice ${invoiceNumber}`;

          const voidMovement = await tx.inventoryMovement.create({
            data: {
              tenantId,
              productId: product.id,
              movementType: VOID_MOVEMENT_TYPE,
              quantity: restoreQuantity,
              movementDate: new Date(),
              reference: voidReference,
              reason: auditReason,
              unitCost: originalMovement.unitCost || 0
            }
          });

          // ✅ RESTORE STOCK QUANTITY
          const currentStock = product.stockQuantity instanceof Prisma.Decimal
            ? product.stockQuantity.toNumber()
            : Number(product.stockQuantity);
          
          const restoredStock = currentStock + restoreQuantity;

          // Prevent negative stock
          if (restoredStock < 0) {
            console.warn(
              `⚠️  Warning: Restoring ${product.name} would result in negative stock (${restoredStock})`
            );
          }

          const updatedProduct = await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: restoredStock },
            select: { id: true, name: true, stockQuantity: true }
          });

          console.log(`   ✅ Void movement created: ID ${voidMovement.id}`);
          console.log(`   ✅ Stock restored: ${currentStock} → ${restoredStock}`);

          voidMovements.push(voidMovement);
          stockUpdates.push({
            productName: product.name,
            productId: product.id,
            originalQuantity,
            restoreQuantity,
            oldStock: currentStock,
            newStock: restoredStock,
            movementId: voidMovement.id
          });
        }

        return { voidMovements, stockUpdates, originalMovements };
      },
      {
        maxWait: 10000, // Wait up to 10s for transaction to start
        timeout: 30000  // 30s transaction timeout
      }
    );

    // ✅ 5. VERIFICATION & SUMMARY
    console.log('\n🎯 VOID MOVEMENTS SUMMARY:');
    results.stockUpdates.forEach((update, index) => {
      const netEffect = update.originalQuantity + update.restoreQuantity;
      const isBalanced = Math.abs(netEffect) < 0.0001; // Float comparison tolerance
      
      console.log(`${index + 1}. ${update.productName}:`);
      console.log(`   ├─ Original Sale: ${update.originalQuantity} units`);
      console.log(`   ├─ Void Movement: +${update.restoreQuantity} units`);
      console.log(`   ├─ Stock Before: ${update.oldStock}`);
      console.log(`   ├─ Stock After: ${update.newStock}`);
      console.log(`   └─ Net Effect: ${netEffect.toFixed(4)} ${isBalanced ? '✅' : '⚠️'}`);
    });

    return {
      success: true,
      voidMovements: results.voidMovements,
      stockUpdates: results.stockUpdates,
      message: `Created ${results.voidMovements.length} void movements and restored stock for ${results.stockUpdates.length} products`
    };

  } catch (error) {
    // Enhanced error handling
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`❌ Database error (${error.code}):`, error.message);
      throw new Error(`Database error while voiding invoice: ${error.message}`);
    }
    
    if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('❌ Validation error:', error.message);
      throw new Error(`Invalid data while voiding invoice: ${error.message}`);
    }

    console.error('❌ Error creating void movements:', error);
    throw new Error(
      `Failed to void invoice ${invoiceNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 🔍 CHECK IF VOID MOVEMENTS EXIST
 */
async function checkVoidMovementsExist(
  voidReference: string, 
  tenantId: string
): Promise<{ exist: boolean; count: number; movements: any[] }> {
  const existingVoidMovements = await prisma.inventoryMovement.findMany({
    where: {
      tenantId,
      reference: voidReference,
      movementType: VOID_MOVEMENT_TYPE
    },
    include: { product: true }
  });

  return {
    exist: existingVoidMovements.length > 0,
    count: existingVoidMovements.length,
    movements: existingVoidMovements
  };
}

/**
 * 📊 VERIFY NET MOVEMENT IS ZERO
 */
async function verifyMovementCancellation(
  invoiceNumber: string,
  voidReference: string,
  tenantId: string
): Promise<Record<string, MovementVerification>> {
  const allMovements = await prisma.inventoryMovement.findMany({
    where: {
      tenantId,
      OR: [
        { reference: invoiceNumber },
        { reference: `INV-${invoiceNumber}` },
        { reference: voidReference }
      ]
    },
    include: { product: true }
  });

  const movementsByProduct: Record<string, any[]> = {};
  
  allMovements.forEach(movement => {
    if (!movement.product) return;
    
    const productName = movement.product.name;
    if (!movementsByProduct[productName]) {
      movementsByProduct[productName] = [];
    }
    movementsByProduct[productName].push(movement);
  });

  const verification: Record<string, MovementVerification> = {};
  
  for (const [productName, movements] of Object.entries(movementsByProduct)) {
    const totalMovement = movements.reduce((sum, m) => {
      const qty = m.quantity instanceof Prisma.Decimal 
        ? m.quantity.toNumber() 
        : Number(m.quantity);
      return sum + qty;
    }, 0);
    
    verification[productName] = {
      movements: movements.length,
      netMovement: totalMovement,
      cancelled: Math.abs(totalMovement) < 0.0001 // Tolerance for float comparison
    };
  }

  return verification;
}

/**
 * 🧪 SAFE EXECUTION WRAPPER
 */
async function safeVoidInvoice(
  invoiceNumber: string,
  tenantId: string,
  userId?: string
): Promise<VoidOperationResult> {
  const voidReference = `VOID-INV-${invoiceNumber}`;
  
  try {
    const result = await createVoidMovementsAndRestoreStock(
      invoiceNumber,
      voidReference,
      tenantId,
      userId
    );

    // Perform verification if movements were created
    if (result.success && !result.alreadyProcessed) {
      const verification = await verifyMovementCancellation(
        invoiceNumber,
        voidReference,
        tenantId
      );

      console.log('\n🔍 VERIFICATION RESULTS:');
      for (const [product, data] of Object.entries(verification)) {
        const status = data.cancelled ? '✅ BALANCED' : '❌ UNBALANCED';
        console.log(`${product}: Net = ${data.netMovement.toFixed(4)} ${status}`);
      }
    }

    return result;
  } catch (error) {
    console.error('❌ Void operation failed:', error);
    throw error;
  }
}

// 🧪 EXAMPLE USAGE
async function exampleUsage() {
  try {
    const result = await safeVoidInvoice(
      'POS-1759914220248',
      'example-tenant-id',
      'user-123' // Optional: track who performed the void
    );

    console.log('\n✅ FINAL RESULT:', result.message);
  } catch (error) {
    console.error('Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

export { 
  createVoidMovementsAndRestoreStock,
  checkVoidMovementsExist,
  verifyMovementCancellation,
  safeVoidInvoice
};