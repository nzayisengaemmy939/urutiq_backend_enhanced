/**
 * OpenAPI Documentation Update Script
 * 
 * This script updates the main OpenAPI document (openapi.ts) by adding
 * new endpoints documented in openapi-extensions.ts
 * 
 * Usage: ts-node src/update-openapi.ts
 */

import { newPaths, newSchemas } from './openapi-extensions';
import { buildOpenApi } from './openapi';
import * as fs from 'fs';
import * as path from 'path';

async function updateOpenApiDoc() {
  console.log('🔄 Updating OpenAPI documentation...\n');

  try {
    // Build the current OpenAPI document
    const baseUrl = process.env.API_URL || 'http://localhost:4000';
    const currentDoc = buildOpenApi(baseUrl);

    // Merge new paths
    let pathsAdded = 0;
    for (const [pathKey, pathValue] of Object.entries(newPaths)) {
      if (!currentDoc.paths[pathKey]) {
        currentDoc.paths[pathKey] = pathValue;
        pathsAdded++;
        console.log(`✅ Added path: ${pathKey}`);
      } else {
        // Merge methods for existing paths
        const existing = currentDoc.paths[pathKey] as any;
        const newPath = pathValue as any;
        
        let methodsAdded = 0;
        for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
          if (newPath[method] && !existing[method]) {
            existing[method] = newPath[method];
            methodsAdded++;
          }
        }
        
        if (methodsAdded > 0) {
          console.log(`✅ Added ${methodsAdded} method(s) to existing path: ${pathKey}`);
          pathsAdded++;
        }
      }
    }

    // Merge new schemas
    let schemasAdded = 0;
    if (!currentDoc.components) {
      currentDoc.components = {};
    }
    if (!currentDoc.components.schemas) {
      currentDoc.components.schemas = {};
    }

    for (const [schemaKey, schemaValue] of Object.entries(newSchemas)) {
      if (!currentDoc.components.schemas[schemaKey]) {
        currentDoc.components.schemas[schemaKey] = schemaValue;
        schemasAdded++;
        console.log(`✅ Added schema: ${schemaKey}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Paths added/updated: ${pathsAdded}`);
    console.log(`   - Schemas added: ${schemasAdded}`);
    console.log(`   - Total paths: ${Object.keys(currentDoc.paths).length}`);
    console.log(`   - Total schemas: ${Object.keys(currentDoc.components.schemas || {}).length}`);

    // Generate the updated OpenAPI JSON
    const outputPath = path.join(__dirname, '..', 'openapi-spec.json');
    fs.writeFileSync(outputPath, JSON.stringify(currentDoc, null, 2), 'utf-8');
    
    console.log(`\n✅ OpenAPI specification written to: ${outputPath}`);
    console.log(`\n📝 You can now use this file with Swagger UI or other OpenAPI tools.`);

    // Generate a summary report
    const reportPath = path.join(__dirname, '..', 'OPENAPI_UPDATE_REPORT.md');
    const report = generateReport(pathsAdded, schemasAdded, currentDoc);
    fs.writeFileSync(reportPath, report, 'utf-8');
    
    console.log(`📄 Update report written to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error updating OpenAPI documentation:', error);
    throw error;
  }
}

function generateReport(pathsAdded: number, schemasAdded: number, doc: any): string {
  const now = new Date().toISOString();
  
  return `# OpenAPI Documentation Update Report

**Date**: ${now}  
**Status**: ✅ Successful

---

## 📊 Summary

- **Paths Added/Updated**: ${pathsAdded}
- **Schemas Added**: ${schemasAdded}
- **Total API Endpoints**: ${Object.keys(doc.paths).length}
- **Total Data Schemas**: ${Object.keys(doc.components?.schemas || {}).length}

---

## 🆕 New Endpoints Added

### Purchase Orders
- \`POST /api/purchase-orders/{id}/deliver\` - Mark purchase order as received
- \`GET /api/purchase-orders/{id}/delivery-status\` - Get delivery status
- \`GET /api/purchase-orders/{id}/pdf\` - Download purchase order PDF
- \`GET /api/purchase-orders/pdf/template\` - Preview PDF template
- \`POST /api/purchase-orders/{id}/send-to-vendor\` - Send PO to vendor via email

### Good Receipts
- \`GET /api/good-receipts/purchase-orders/{id}/good-receipt/pdf\` - Download good receipt PDF
- \`GET /api/good-receipts/pdf/template\` - Preview good receipt template

### Expense Journal Integration
- \`GET /api/expenses/{id}/journal-entries\` - Get journal entries for expense
- \`POST /api/expenses/{id}/submit\` - Submit expense (auto-generates journal entries)
- \`POST /api/expenses/{id}/approve\` - Approve expense
- \`POST /api/expenses/{id}/reject\` - Reject expense

### Journal Hub
- \`GET /api/journal-hub/entries\` - List all journal entries
- \`POST /api/journal-hub/entries\` - Create journal entry
- \`GET /api/journal-hub/entries/{id}\` - Get journal entry by ID
- \`PUT /api/journal-hub/entries/{id}\` - Update journal entry
- \`DELETE /api/journal-hub/entries/{id}\` - Delete journal entry
- \`POST /api/journal-hub/entries/{id}/post\` - Post journal entry
- \`POST /api/journal-hub/entries/{id}/void\` - Void journal entry
- \`GET /api/journal-hub/entries/{id}/pdf\` - Download journal entry PDF
- \`GET /api/journal-hub/entry-types\` - List entry types

### Chart of Accounts
- \`GET /api/accounts\` - Get chart of accounts
- \`POST /api/accounts\` - Create account
- \`GET /api/accounts/{id}\` - Get account by ID
- \`PUT /api/accounts/{id}\` - Update account
- \`DELETE /api/accounts/{id}\` - Delete account
- \`GET /api/account-types\` - List account types

---

## 📋 New Data Schemas

- \`PurchaseOrder\` - Purchase order data model
- \`InventoryMovement\` - Inventory movement tracking
- \`JournalEntry\` - Journal entry data model
- \`JournalLine\` - Journal entry line item
- \`JournalEntryType\` - Journal entry type classification
- \`Account\` - Chart of accounts account
- \`AccountType\` - Account type (Asset, Liability, etc.)
- \`Expense\` - Expense data model
- \`Error\` - Standard error response

---

## 🎯 Features Documented

### 1. Purchase Order Management
- Complete lifecycle from draft to received
- PDF generation and email delivery
- Delivery/receipt tracking
- Inventory integration

### 2. Good Receipt Notes
- Professional GRN PDF generation
- Template preview functionality
- Linked to purchase orders

### 3. Expense-Journal Integration
- Automatic journal entry generation
- Expense approval workflow
- Journal entry reversal for rejections

### 4. Journal Hub
- Complete journal entry CRUD operations
- Post/void functionality
- PDF export
- Entry type management

### 5. Chart of Accounts
- Account hierarchy management
- Account type classification
- CRUD operations with validation

---

## 📖 Usage

### View Documentation
1. Use the generated \`openapi-spec.json\` file
2. Import into Swagger UI, Postman, or any OpenAPI tool
3. Available at: \`/api-docs\` endpoint (if configured)

### Access API
- **Base URL**: \`${doc.servers?.[0]?.url || 'http://localhost:4000'}\`
- **Authentication**: Bearer token (JWT)
- **Required Headers**: 
  - \`x-tenant-id\`: Tenant identifier
  - \`x-company-id\`: Company identifier (optional)

---

## 🔒 Security

All endpoints require:
- **Bearer Authentication**: JWT token in Authorization header
- **Tenant Isolation**: x-tenant-id header for multi-tenancy
- **Role-Based Access**: Some endpoints require specific roles (admin, accountant, etc.)

---

## ✅ Next Steps

1. **Deploy Documentation**: Serve the OpenAPI spec via Swagger UI
2. **SDK Generation**: Generate client SDKs from the spec
3. **API Testing**: Use the spec for automated API testing
4. **Developer Portal**: Create a developer documentation portal

---

*Generated by OpenAPI Update Script v1.0*  
*For issues or updates, see: \`apps/api/src/update-openapi.ts\`*
`;
}

// Run the update
updateOpenApiDoc()
  .then(() => {
    console.log('\n✅ OpenAPI documentation update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to update OpenAPI documentation:', error);
    process.exit(1);
  });

