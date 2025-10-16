import { Router } from 'express';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { asyncHandler } from '../errors';
import { prisma } from '../prisma';
import { OCRService } from '../services/ocr-service';
const router = Router();
// Receipt Processing Routes
router.post('/receipts/process', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { imageUrl, companyId } = req.body;
    if (!imageUrl || !companyId) {
        return res.status(400).json({
            success: false,
            error: 'Image URL and company ID are required'
        });
    }
    try {
        // Process receipt with real OCR service
        const { ocrResult, receiptData } = await OCRService.processReceipt(imageUrl);
        // Store in database
        const receipt = await prisma.oCRReceipt.create({
            data: {
                tenantId: req.tenantId,
                companyId,
                imageUrl,
                extractedText: ocrResult.text,
                vendor: receiptData.vendor,
                amount: receiptData.total || receiptData.amount,
                confidence: receiptData.confidence,
                metadata: JSON.stringify({
                    ...ocrResult.metadata,
                    items: receiptData.items,
                    taxAmount: receiptData.taxAmount,
                    subtotal: receiptData.subtotal,
                    rawText: receiptData.rawText
                })
            }
        });
        res.json({
            success: true,
            data: {
                id: receipt.id,
                imageUrl: receipt.imageUrl,
                extractedText: receipt.extractedText,
                vendor: receipt.vendor,
                amount: receipt.amount,
                date: receipt.createdAt,
                items: receiptData.items,
                confidence: receipt.confidence,
                metadata: JSON.parse(receipt.metadata || '{}')
            }
        });
    }
    catch (error) {
        console.error('Error processing receipt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process receipt'
        });
    }
}));
router.get('/receipts/:companyId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { startDate, endDate } = req.query;
    try {
        const where = {
            tenantId: req.tenantId,
            companyId
        };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
        const receipts = await prisma.oCRReceipt.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        // Parse metadata and format response
        const formattedReceipts = receipts.map(receipt => {
            const metadata = receipt.metadata ? JSON.parse(receipt.metadata) : {};
            return {
                id: receipt.id,
                imageUrl: receipt.imageUrl,
                extractedText: receipt.extractedText,
                vendor: receipt.vendor,
                amount: receipt.amount,
                date: receipt.createdAt,
                items: metadata.items || [],
                confidence: receipt.confidence,
                metadata: metadata
            };
        });
        res.json({
            success: true,
            data: formattedReceipts
        });
    }
    catch (error) {
        console.error('Error fetching receipts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch receipts'
        });
    }
}));
router.post('/receipts/batch-process', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { imageUrls, companyId } = req.body;
    if (!imageUrls || !Array.isArray(imageUrls) || !companyId) {
        return res.status(400).json({
            success: false,
            error: 'Image URLs array and company ID are required'
        });
    }
    try {
        // Process all receipts using OCR service
        const batchResult = await OCRService.batchProcessReceipts(imageUrls);
        const processedReceipts = [];
        const errors = [];
        // Store successful receipts in database
        for (const result of batchResult.results) {
            if (result.success) {
                try {
                    const receipt = await prisma.oCRReceipt.create({
                        data: {
                            tenantId: req.tenantId,
                            companyId,
                            imageUrl: result.imageUrl,
                            extractedText: result.ocrResult.text,
                            vendor: result.receiptData.vendor,
                            amount: result.receiptData.total || result.receiptData.amount,
                            confidence: result.receiptData.confidence,
                            metadata: JSON.stringify({
                                ...result.ocrResult.metadata,
                                items: result.receiptData.items,
                                taxAmount: result.receiptData.taxAmount,
                                subtotal: result.receiptData.subtotal,
                                rawText: result.receiptData.rawText
                            })
                        }
                    });
                    processedReceipts.push({
                        id: receipt.id,
                        imageUrl: receipt.imageUrl,
                        extractedText: receipt.extractedText,
                        vendor: receipt.vendor,
                        amount: receipt.amount,
                        date: receipt.createdAt,
                        items: result.receiptData.items,
                        confidence: receipt.confidence,
                        metadata: JSON.parse(receipt.metadata || '{}')
                    });
                }
                catch (dbError) {
                    errors.push({
                        imageUrl: result.imageUrl,
                        error: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
                    });
                }
            }
            else {
                errors.push({
                    imageUrl: result.imageUrl,
                    error: result.error || 'OCR processing failed'
                });
            }
        }
        res.json({
            success: true,
            data: {
                processed: processedReceipts,
                errors,
                totalProcessed: processedReceipts.length,
                totalErrors: errors.length,
                summary: batchResult.summary
            }
        });
    }
    catch (error) {
        console.error('Error batch processing receipts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to batch process receipts'
        });
    }
}));
// Get single receipt details
router.get('/receipts/:companyId/:receiptId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, receiptId } = req.params;
    try {
        const receipt = await prisma.oCRReceipt.findFirst({
            where: {
                id: receiptId,
                tenantId: req.tenantId,
                companyId
            }
        });
        if (!receipt) {
            return res.status(404).json({
                success: false,
                error: 'Receipt not found'
            });
        }
        const metadata = receipt.metadata ? JSON.parse(receipt.metadata) : {};
        res.json({
            success: true,
            data: {
                id: receipt.id,
                imageUrl: receipt.imageUrl,
                extractedText: receipt.extractedText,
                vendor: receipt.vendor,
                amount: receipt.amount,
                date: receipt.createdAt,
                items: metadata.items || [],
                confidence: receipt.confidence,
                metadata: metadata
            }
        });
    }
    catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch receipt'
        });
    }
}));
// Update receipt data
router.put('/receipts/:companyId/:receiptId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, receiptId } = req.params;
    const { vendor, amount, items } = req.body;
    try {
        const existingReceipt = await prisma.oCRReceipt.findFirst({
            where: {
                id: receiptId,
                tenantId: req.tenantId,
                companyId
            }
        });
        if (!existingReceipt) {
            return res.status(404).json({
                success: false,
                error: 'Receipt not found'
            });
        }
        const metadata = existingReceipt.metadata ? JSON.parse(existingReceipt.metadata) : {};
        // Update metadata with new data
        if (items)
            metadata.items = items;
        if (vendor !== undefined)
            metadata.vendor = vendor;
        if (amount !== undefined)
            metadata.amount = amount;
        const updatedReceipt = await prisma.oCRReceipt.update({
            where: { id: receiptId },
            data: {
                vendor: vendor || existingReceipt.vendor,
                amount: amount || existingReceipt.amount,
                metadata: JSON.stringify(metadata)
            }
        });
        res.json({
            success: true,
            data: {
                id: updatedReceipt.id,
                imageUrl: updatedReceipt.imageUrl,
                extractedText: updatedReceipt.extractedText,
                vendor: updatedReceipt.vendor,
                amount: updatedReceipt.amount,
                date: updatedReceipt.createdAt,
                items: metadata.items || [],
                confidence: updatedReceipt.confidence,
                metadata: metadata
            }
        });
    }
    catch (error) {
        console.error('Error updating receipt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update receipt'
        });
    }
}));
// Delete receipt
router.delete('/receipts/:companyId/:receiptId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, receiptId } = req.params;
    try {
        const receipt = await prisma.oCRReceipt.findFirst({
            where: {
                id: receiptId,
                tenantId: req.tenantId,
                companyId
            }
        });
        if (!receipt) {
            return res.status(404).json({
                success: false,
                error: 'Receipt not found'
            });
        }
        await prisma.oCRReceipt.delete({
            where: { id: receiptId }
        });
        res.json({
            success: true,
            message: 'Receipt deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting receipt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete receipt'
        });
    }
}));
// Invoice Generation Routes
router.post('/invoices/generate', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { customerId, items, templateId } = req.body;
    // DEBUG: Log all incoming data
    console.log('=== INVOICE CREATION DEBUG ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Query params:', req.query);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Headers x-company-id:', req.headers['x-company-id']);
    console.log('Headers x-tenant-id:', req.headers['x-tenant-id']);
    // Get companyId from query params (like other APIs) or body as fallback
    const companyId = req.query.companyId || req.body.companyId;
    console.log('Resolved companyId:', companyId);
    console.log('Resolved tenantId:', req.tenantId);
    if (!customerId || !items || !companyId) {
        console.log('Missing required fields:', { customerId: !!customerId, items: !!items, companyId: !!companyId });
        return res.status(400).json({
            success: false,
            error: 'Customer ID, items, and company ID are required'
        });
    }
    try {
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const taxRate = 0.1; // 10% tax
        const taxAmount = subtotal * taxRate;
        const total = subtotal + taxAmount;
        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}`;
        // Create invoice
        console.log('Creating invoice with data:', {
            tenantId: req.tenantId || 'tenant_demo',
            companyId,
            customerId,
            invoiceNumber,
            status: 'draft',
            totalAmount: total
        });
        const invoice = await prisma.invoice.create({
            data: {
                tenantId: req.tenantId || 'tenant_demo',
                companyId,
                customerId,
                invoiceNumber,
                issueDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                status: 'draft',
                totalAmount: total,
                balanceDue: total,
                currency: 'USD',
                subtotal,
                taxAmount,
                discountAmount: 0,
                taxInclusive: false,
                pdfGenerated: false
            }
        });
        console.log('Invoice created successfully:', {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            companyId: invoice.companyId,
            tenantId: invoice.tenantId,
            status: invoice.status,
            totalAmount: invoice.totalAmount
        });
        // Create invoice lines
        const invoiceLines = await Promise.all(items.map((item, index) => prisma.invoiceLine.create({
            data: {
                tenantId: req.tenantId || 'tenant_demo',
                invoiceId: invoice.id,
                lineNumber: index + 1,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.quantity * item.unitPrice,
                taxRate: taxRate * 100,
                discountRate: 0,
                discountAmount: 0,
                taxAmount: (item.quantity * item.unitPrice) * taxRate,
                netAmount: item.quantity * item.unitPrice,
                taxExempt: false
            }
        })));
        res.json({
            success: true,
            data: {
                ...invoice,
                lines: invoiceLines
            }
        });
    }
    catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate invoice'
        });
    }
}));
router.get('/invoices/:companyId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { limit = 10 } = req.query;
    try {
        const invoices = await prisma.invoice.findMany({
            where: {
                tenantId: req.tenantId,
                companyId
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                lines: {
                    select: {
                        id: true,
                        description: true,
                        quantity: true,
                        unitPrice: true,
                        lineTotal: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: invoices
        });
    }
    catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch invoices'
        });
    }
}));
router.post('/invoices/ai-create', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { description, companyId, context } = req.body;
    if (!description || !companyId) {
        return res.status(400).json({
            success: false,
            error: 'Description and company ID are required'
        });
    }
    try {
        // Use AI to generate invoice from description
        const { AIService } = await import('../services/ai-service');
        const prompt = `Create an invoice based on this description: "${description}"
      
      Context: ${context ? JSON.stringify(context) : 'No additional context'}
      
      IMPORTANT: Extract the EXACT amounts mentioned in the description. Support all currencies (USD, RWF, EUR, GBP, etc.). If the description says "RWF 150,000" total, make sure the items add up to 150,000. If it says "20 hours at $75/hour", calculate 20 × 75 = $1,500.
      
      Please generate:
      1. Invoice items with descriptions, quantities, and prices (use EXACT amounts from description)
      2. Appropriate tax rate (10% is standard)
      3. Payment terms
      4. Due date (30 days from now)
      
      Examples:
      1. "$2,500 web development services": Create items totaling $2,500
      2. "RWF 150,000 legal consultation": Create items totaling 150,000 (no currency symbol in unitPrice, just the number)
      3. "20 hours at $75/hour": 20 × 75 = $1,500
      
      Return as JSON with this structure:
      {
        "items": [
          {"description": "Item description", "quantity": 1, "unitPrice": 100, "category": "Service"}
        ],
        "taxRate": 0.1,
        "paymentTerms": "Net 30",
        "notes": "Additional notes"
      }`;
        const aiResponse = await AIService.callOllama(prompt, 'You are an AI assistant that creates professional invoices from natural language descriptions. Return only valid JSON.');
        let invoiceData;
        try {
            invoiceData = JSON.parse(aiResponse);
        }
        catch (parseError) {
            // Fallback if AI doesn't return valid JSON - try to parse amounts from description
            let fallbackItems = [];
            let fallbackTotal = 0;
            // Try to extract amounts from the description (support multiple currencies)
            const amountMatch = description.match(/(?:\$|USD|RWF|EUR|GBP)\s*([0-9,]+)|([0-9,]+)\s*(?:\$|USD|RWF|EUR|GBP)/i);
            if (amountMatch) {
                const totalAmount = parseInt((amountMatch[1] || amountMatch[2]).replace(/,/g, ''));
                fallbackTotal = totalAmount;
                // Try to parse specific items
                const hourMatches = description.match(/(\d+)\s+hours?\s+(?:of\s+)?([^at]+?)\s+at\s+(?:\$|USD|RWF|EUR|GBP)\s*(\d+)/gi);
                if (hourMatches && hourMatches.length > 0) {
                    hourMatches.forEach((match) => {
                        const parts = match.match(/(\d+)\s+hours?\s+(?:of\s+)?([^at]+?)\s+at\s+(?:\$|USD|RWF|EUR|GBP)\s*(\d+)/i);
                        if (parts) {
                            const hours = parseInt(parts[1]);
                            const service = parts[2].trim();
                            const rate = parseInt(parts[3]);
                            fallbackItems.push({
                                description: service,
                                quantity: hours,
                                unitPrice: rate,
                                category: "Service"
                            });
                        }
                    });
                }
                // If no specific items found, create a general item
                if (fallbackItems.length === 0) {
                    fallbackItems.push({
                        description: "Web Development Services",
                        quantity: 1,
                        unitPrice: totalAmount,
                        category: "Service"
                    });
                }
            }
            else {
                // Default fallback
                fallbackItems = [
                    { description: description, quantity: 1, unitPrice: 100, category: "Service" }
                ];
            }
            invoiceData = {
                items: fallbackItems,
                taxRate: 0.1,
                paymentTerms: "Net 30",
                notes: "Generated from AI description"
            };
        }
        res.json({
            success: true,
            data: invoiceData
        });
    }
    catch (error) {
        console.error('Error creating AI invoice:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create AI invoice'
        });
    }
}));
router.get('/invoices/templates/:companyId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    try {
        // Mock invoice templates
        const templates = [
            {
                id: 'template_1',
                name: 'Standard Invoice',
                description: 'Basic invoice template with company header and line items',
                isActive: true,
                createdAt: new Date()
            },
            {
                id: 'template_2',
                name: 'Professional Invoice',
                description: 'Enhanced template with branding and detailed formatting',
                isActive: true,
                createdAt: new Date()
            },
            {
                id: 'template_3',
                name: 'Service Invoice',
                description: 'Template optimized for service-based businesses',
                isActive: false,
                createdAt: new Date()
            }
        ];
        res.json({
            success: true,
            data: templates
        });
    }
    catch (error) {
        console.error('Error fetching invoice templates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch invoice templates'
        });
    }
}));
// Vendor/Customer Matching Routes
router.post('/vendors/match', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { vendorName, companyId, context } = req.body;
    if (!vendorName || !companyId) {
        return res.status(400).json({
            success: false,
            error: 'Vendor name and company ID are required'
        });
    }
    try {
        // Search for existing vendors
        const existingVendors = await prisma.vendor.findMany({
            where: {
                tenantId: req.tenantId,
                companyId,
                name: {
                    contains: vendorName
                }
            },
            take: 5
        });
        // Generate match suggestions
        const matches = existingVendors.map(vendor => ({
            vendorId: vendor.id,
            vendorName: vendor.name,
            confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
            reasoning: `Name similarity with existing vendor`,
            suggestedCategory: 'General',
            paymentTerms: 'Net 30'
        }));
        // Add a "create new" option
        matches.push({
            vendorId: 'new',
            vendorName: `Create "${vendorName}"`,
            confidence: 0.5,
            reasoning: 'No existing vendor found with similar name',
            suggestedCategory: 'General',
            paymentTerms: 'Net 30'
        });
        res.json({
            success: true,
            data: matches
        });
    }
    catch (error) {
        console.error('Error matching vendors:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to match vendors'
        });
    }
}));
router.get('/customers/:companyId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { search, limit = 100 } = req.query;
    try {
        const where = {
            tenantId: req.tenantId,
            companyId
        };
        if (search) {
            where.name = {
                contains: search
            };
        }
        const customers = await prisma.customer.findMany({
            where,
            take: Number(limit),
            orderBy: { name: 'asc' }
        });
        // Add insights for each customer
        const customersWithInsights = await Promise.all(customers.map(async (customer) => {
            // Get invoice count and amounts for this customer
            const invoices = await prisma.invoice.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    customerId: customer.id
                },
                take: 100
            });
            const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
            const paidInvoices = invoices.filter(inv => inv.status === 'paid');
            const paymentRate = invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;
            return {
                ...customer,
                insights: {
                    invoiceCount: invoices.length,
                    totalAmount,
                    paymentRate,
                    status: paymentRate > 80 ? 'good' :
                        paymentRate > 60 ? 'fair' : 'poor'
                }
            };
        }));
        res.json({
            success: true,
            data: customersWithInsights
        });
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customers'
        });
    }
}));
// Transaction Intelligence Routes
router.get('/intelligence/stats/:companyId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { periodDays = 30 } = req.query;
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(periodDays || 30));
        // Get transactions for the period
        const transactions = await prisma.transaction.findMany({
            where: {
                tenantId: req.tenantId,
                companyId,
                transactionDate: {
                    gte: startDate
                }
            }
        });
        const totalTransactions = transactions.length;
        const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
        // Group by type
        const byType = {};
        transactions.forEach(transaction => {
            const type = transaction.transactionType;
            if (!byType[type]) {
                byType[type] = { count: 0, total: 0 };
            }
            byType[type].count++;
            byType[type].total += Number(transaction.amount);
        });
        res.json({
            success: true,
            data: {
                period: {
                    start: startDate,
                    end: new Date()
                },
                totalTransactions,
                totalAmount,
                averageAmount,
                byType
            }
        });
    }
    catch (error) {
        console.error('Error fetching transaction stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction statistics'
        });
    }
}));
router.get('/intelligence/patterns/:companyId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { periodDays = 30 } = req.query;
    try {
        // Mock pattern analysis
        const patterns = [
            {
                patternType: 'vendor',
                confidence: 0.85,
                description: 'Frequent transactions with Office Supply Co.',
                recommendations: [
                    'Consider negotiating bulk discount rates',
                    'Set up automated reordering for common items'
                ],
                riskScore: 0.1,
                metadata: {
                    vendor: 'Office Supply Co.',
                    frequency: 'weekly',
                    averageAmount: 250.00
                }
            },
            {
                patternType: 'amount',
                confidence: 0.72,
                description: 'Unusual spike in transaction amounts this month',
                recommendations: [
                    'Review recent large transactions for accuracy',
                    'Consider implementing approval workflow for amounts over $1000'
                ],
                riskScore: 0.3,
                metadata: {
                    threshold: 1000,
                    currentAverage: 1250,
                    previousAverage: 450
                }
            },
            {
                patternType: 'timing',
                confidence: 0.68,
                description: 'Most transactions occur on Fridays',
                recommendations: [
                    'Consider batch processing for efficiency',
                    'Plan cash flow accordingly'
                ],
                riskScore: 0.05,
                metadata: {
                    peakDay: 'Friday',
                    percentage: 45
                }
            }
        ];
        res.json({
            success: true,
            data: patterns
        });
    }
    catch (error) {
        console.error('Error fetching transaction patterns:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch transaction patterns'
        });
    }
}));
router.get('/recommendations/:companyId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { type } = req.query;
    try {
        // Mock AI recommendations
        const recommendations = [
            {
                title: 'Optimize Vendor Relationships',
                description: 'Based on transaction patterns, consider consolidating purchases with top 3 vendors for better pricing.',
                confidence: 0.88,
                riskScore: 0.15,
                recommendations: [
                    'Negotiate volume discounts with Office Supply Co.',
                    'Set up automated reordering for frequently purchased items',
                    'Consider annual contracts for predictable expenses'
                ]
            },
            {
                title: 'Improve Cash Flow Management',
                description: 'Transaction timing analysis suggests opportunities for better cash flow planning.',
                confidence: 0.75,
                riskScore: 0.25,
                recommendations: [
                    'Implement weekly cash flow forecasting',
                    'Set up automated payment reminders',
                    'Consider early payment discounts where beneficial'
                ]
            },
            {
                title: 'Enhance Transaction Categorization',
                description: 'Many transactions lack proper categorization, affecting reporting accuracy.',
                confidence: 0.82,
                riskScore: 0.1,
                recommendations: [
                    'Implement automated categorization rules',
                    'Train staff on proper expense coding',
                    'Set up validation checks for uncategorized transactions'
                ]
            }
        ];
        // Filter by type if specified
        const filteredRecommendations = type
            ? recommendations.filter(rec => rec.title.toLowerCase().includes(type))
            : recommendations;
        res.json({
            success: true,
            data: filteredRecommendations
        });
    }
    catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recommendations'
        });
    }
}));
// Vendor Management Routes
router.get('/vendors/:companyId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId } = req.params;
    const { search, limit = 100 } = req.query;
    try {
        const where = {
            tenantId: req.tenantId,
            companyId
        };
        if (search) {
            where.name = {
                contains: search,
                mode: 'insensitive'
            };
        }
        const vendors = await prisma.vendor.findMany({
            where,
            take: Number(limit),
            orderBy: { name: 'asc' }
        });
        // Add insights for each vendor
        const vendorsWithInsights = await Promise.all(vendors.map(async (vendor) => {
            // Get expense count and amounts for this vendor
            const expenses = await prisma.expense.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    vendorId: vendor.id
                },
                take: 100
            });
            const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
            const transactionCount = expenses.length;
            const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;
            // Determine frequency based on transaction count
            let frequency = 'inactive';
            if (transactionCount > 10)
                frequency = 'frequent';
            else if (transactionCount > 3)
                frequency = 'occasional';
            else if (transactionCount > 0)
                frequency = 'rare';
            // Get last activity
            const lastActivity = expenses.length > 0
                ? expenses.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())[0].expenseDate
                : null;
            return {
                ...vendor,
                insights: {
                    transactionCount,
                    totalAmount,
                    averageAmount,
                    frequency,
                    lastActivity,
                    receiptCount: 0,
                    invoiceCount: 0
                }
            };
        }));
        res.json({
            success: true,
            data: vendorsWithInsights
        });
    }
    catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vendors'
        });
    }
}));
// Create vendor
router.post('/vendors', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { companyId, name, email, phone, address, city, state, zipCode, country, taxId, paymentTerms, notes } = req.body;
    if (!companyId || !name) {
        return res.status(400).json({
            success: false,
            error: 'Company ID and vendor name are required'
        });
    }
    try {
        const vendor = await prisma.vendor.create({
            data: {
                tenantId: req.tenantId,
                companyId,
                name,
                email: email || null,
                phone: phone || null,
                taxNumber: taxId || null,
                address: address || null
            }
        });
        res.json({
            success: true,
            data: vendor,
            message: 'Vendor created successfully'
        });
    }
    catch (error) {
        console.error('Error creating vendor:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create vendor'
        });
    }
}));
// Update vendor
router.put('/vendors/:vendorId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { companyId, name, email, phone, address, city, state, zipCode, country, taxId, paymentTerms, notes } = req.body;
    try {
        // Verify vendor exists and belongs to tenant
        const existingVendor = await prisma.vendor.findFirst({
            where: {
                id: vendorId,
                tenantId: req.tenantId,
                companyId
            }
        });
        if (!existingVendor) {
            return res.status(404).json({
                success: false,
                error: 'Vendor not found'
            });
        }
        const vendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: {
                name: name || existingVendor.name,
                email: email !== undefined ? email : existingVendor.email,
                phone: phone !== undefined ? phone : existingVendor.phone,
                taxNumber: taxId !== undefined ? taxId : existingVendor.taxNumber,
                address: address !== undefined ? address : existingVendor.address
            }
        });
        res.json({
            success: true,
            data: vendor,
            message: 'Vendor updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating vendor:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update vendor'
        });
    }
}));
// Delete vendor
router.delete('/vendors/:vendorId', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const companyId = req.headers['x-company-id'];
    try {
        // Verify vendor exists and belongs to tenant
        const existingVendor = await prisma.vendor.findFirst({
            where: {
                id: vendorId,
                tenantId: req.tenantId,
                companyId
            }
        });
        if (!existingVendor) {
            return res.status(404).json({
                success: false,
                error: 'Vendor not found'
            });
        }
        // Check if vendor has associated expenses
        const expenseCount = await prisma.expense.count({
            where: {
                vendorId,
                tenantId: req.tenantId
            }
        });
        if (expenseCount > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete vendor with ${expenseCount} associated expenses. Please reassign or delete expenses first.`
            });
        }
        await prisma.vendor.delete({
            where: { id: vendorId }
        });
        res.json({
            success: true,
            message: 'Vendor deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting vendor:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete vendor'
        });
    }
}));
// Toggle vendor active status
router.patch('/vendors/:vendorId/toggle-active', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const companyId = req.headers['x-company-id'];
    try {
        const existingVendor = await prisma.vendor.findFirst({
            where: {
                id: vendorId,
                tenantId: req.tenantId,
                companyId
            }
        });
        if (!existingVendor) {
            return res.status(404).json({
                success: false,
                error: 'Vendor not found'
            });
        }
        const updatedVendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: {
                isActive: !(existingVendor.isActive ?? true)
            }
        });
        res.json({
            success: true,
            data: updatedVendor,
            message: `Vendor ${updatedVendor.isActive ? 'activated' : 'deactivated'} successfully`
        });
    }
    catch (error) {
        console.error('Error toggling vendor status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle vendor status'
        });
    }
}));
// Get single vendor details
router.get('/vendors/:vendorId/details', authMiddleware(process.env.JWT_SECRET || 'dev-secret'), requireRoles(['admin', 'accountant']), asyncHandler(async (req, res) => {
    const { vendorId } = req.params;
    const { companyId } = req.query;
    try {
        const vendor = await prisma.vendor.findFirst({
            where: {
                id: vendorId,
                tenantId: req.tenantId,
                companyId
            }
        });
        if (!vendor) {
            return res.status(404).json({
                success: false,
                error: 'Vendor not found'
            });
        }
        // Get vendor expenses for insights
        const expenses = await prisma.expense.findMany({
            where: {
                vendorId: vendor.id,
                tenantId: req.tenantId
            },
            orderBy: { expenseDate: 'desc' },
            take: 10
        });
        const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
        res.json({
            success: true,
            data: {
                ...vendor,
                recentExpenses: expenses,
                totalSpent: totalAmount
            }
        });
    }
    catch (error) {
        console.error('Error fetching vendor details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vendor details'
        });
    }
}));
export default router;
