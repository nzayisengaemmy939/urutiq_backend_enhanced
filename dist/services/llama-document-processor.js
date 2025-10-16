import { Ollama } from 'ollama';
import { HfInference } from '@huggingface/inference';
import { llamaEnhancedConversationalAI } from './llama-enhanced-conversational-ai';
export class LlamaDocumentProcessor {
    ollama;
    hfInference;
    llamaAI;
    visionModel = 'llava:7b'; // Vision model for image processing
    constructor() {
        this.ollama = new Ollama({
            host: process.env.OLLAMA_HOST || 'http://localhost:11434'
        });
        this.hfInference = new HfInference(process.env.HUGGINGFACE_API_KEY);
        // Initialize llamaAI lazily to avoid circular dependency issues
        this.llamaAI = null;
    }
    getLlamaAI() {
        if (!this.llamaAI) {
            this.llamaAI = llamaEnhancedConversationalAI;
        }
        return this.llamaAI;
    }
    async processReceiptImage(imageUrl, context) {
        try {
            console.log('Processing receipt image with Llama vision model...');
            // First, extract text from image using OCR
            const extractedText = await this.extractTextFromImage(imageUrl);
            if (!extractedText) {
                throw new Error('Failed to extract text from image');
            }
            // Use Llama to analyze and structure the extracted text
            const analysisPrompt = this.buildReceiptAnalysisPrompt(extractedText, context);
            const analysis = await this.getLlamaAI().processNaturalLanguageInput(analysisPrompt, context, { mode: 'accurate', maxTokens: 1200 });
            // Parse the structured data
            const extractedData = this.parseReceiptData(analysis.message, context, extractedText);
            // Generate insights
            const insights = await this.generateDocumentInsights(extractedData, context);
            return {
                success: true,
                extractedData,
                confidence: analysis.confidence,
                insights,
                suggestions: analysis.suggestions,
                rawText: extractedText
            };
        }
        catch (error) {
            console.error('Error processing receipt image:', error);
            return {
                success: false,
                extractedData: this.getDefaultExtractedData(),
                confidence: 0,
                insights: [],
                suggestions: ['Please try uploading a clearer image', 'Ensure the receipt is well-lit'],
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async processInvoiceDocument(documentContent, context) {
        try {
            console.log('Processing invoice document with Llama...');
            const analysisPrompt = this.buildInvoiceAnalysisPrompt(documentContent, context);
            const analysis = await this.getLlamaAI().processNaturalLanguageInput(analysisPrompt, context);
            const extractedData = this.parseInvoiceData(analysis.message, context);
            const insights = await this.generateDocumentInsights(extractedData, context);
            return {
                success: true,
                extractedData,
                confidence: analysis.confidence,
                insights,
                suggestions: analysis.suggestions
            };
        }
        catch (error) {
            console.error('Error processing invoice document:', error);
            return {
                success: false,
                extractedData: this.getDefaultExtractedData(),
                confidence: 0,
                insights: [],
                suggestions: ['Please check the document format', 'Ensure all required fields are visible'],
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async processContractDocument(documentContent, context) {
        try {
            console.log('Processing contract document with Llama...');
            const analysisPrompt = this.buildContractAnalysisPrompt(documentContent, context);
            const analysis = await this.getLlamaAI().processNaturalLanguageInput(analysisPrompt, context);
            const extractedData = this.parseContractData(analysis.message, context);
            const insights = await this.generateContractInsights(extractedData, context);
            return {
                success: true,
                extractedData,
                confidence: analysis.confidence,
                insights,
                suggestions: analysis.suggestions
            };
        }
        catch (error) {
            console.error('Error processing contract document:', error);
            return {
                success: false,
                extractedData: this.getDefaultExtractedData(),
                confidence: 0,
                insights: [],
                suggestions: ['Please ensure the contract is complete', 'Check for any missing pages'],
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }
    async extractTextFromImage(imageUrl) {
        try {
            // Prepare image payload (support data URLs)
            let imageForOllama = imageUrl;
            let bufferForHF = imageUrl;
            if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
                const base64 = this.dataUrlToBase64(imageUrl);
                imageForOllama = base64; // Ollama expects base64 string for images array
                bufferForHF = Buffer.from(base64, 'base64');
            }
            // Try using Llama vision model first
            const response = await this.ollama.generate({
                model: this.visionModel,
                prompt: 'Read all visible text from this document image precisely. Return plain text only with lines preserved. Do not add commentary.',
                images: [imageForOllama],
                stream: false
            });
            return response.response;
        }
        catch (error) {
            console.log('Llama vision model failed, trying local Tesseract OCR...');
            try {
                // Dynamic import so it is optional
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const Tesseract = require('tesseract.js');
                const data = (typeof imageUrl === 'string' && imageUrl.startsWith('data:'))
                    ? Buffer.from(this.dataUrlToBase64(imageUrl), 'base64')
                    : imageUrl;
                const { data: ocr } = await Tesseract.recognize(data, 'eng', { logger: () => { } });
                return (ocr && ocr.text) ? String(ocr.text) : '';
            }
            catch (tessErr) {
                console.error('Tesseract OCR failed:', tessErr);
                throw new Error('Failed to extract text from image');
            }
        }
    }
    dataUrlToUint8Array(dataUrl) {
        const commaIdx = dataUrl.indexOf(',');
        const base64 = dataUrl.slice(commaIdx + 1);
        const binary = Buffer.from(base64, 'base64');
        return new Uint8Array(binary);
    }
    dataUrlToBase64(dataUrl) {
        const commaIdx = dataUrl.indexOf(',');
        return dataUrl.slice(commaIdx + 1);
    }
    buildReceiptAnalysisPrompt(extractedText, context) {
        return `Analyze this receipt text and extract structured financial data:

RECEIPT TEXT:
${extractedText}

COMPANY CONTEXT:
- Company: ${context.companyId}
- Currency: ${context.financialContext.currency}
- Business Type: ${context.financialContext.businessType}

Extract the following with maximum precision:
1. vendor (string)
2. amount (number, in ${context.financialContext.currency})
3. date (ISO 8601)
4. taxAmount (number), taxRate (number 0-1)
5. lineItems: [{ description, quantity, unitPrice, totalPrice, category? }]
6. paymentTerms or payment method
7. referenceNumber

Return ONLY a JSON object with exactly these fields. Example:
{
  "vendor": "Acme Supplies",
  "amount": 123.45,
  "date": "2025-09-11T00:00:00.000Z",
  "category": "Office",
  "description": "Office supplies",
  "taxAmount": 12.34,
  "taxRate": 0.1,
  "lineItems": [
    { "description": "Pens", "quantity": 2, "unitPrice": 5.00, "totalPrice": 10.00 }
  ],
  "paymentTerms": "Paid",
  "referenceNumber": "INV-1234",
  "currency": "${context.financialContext.currency}"
}`;
    }
    buildInvoiceAnalysisPrompt(documentContent, context) {
        return `Analyze this invoice document and extract comprehensive financial data:

INVOICE CONTENT:
${documentContent}

COMPANY CONTEXT:
- Company: ${context.companyId}
- Currency: ${context.financialContext.currency}
- Business Type: ${context.financialContext.businessType}

Extract the following information:
1. Invoice number and date
2. Vendor/supplier details
3. Customer/buyer details
4. Line items with descriptions, quantities, and prices
5. Subtotal, tax, and total amounts
6. Payment terms and due date
7. Currency and exchange rate (if applicable)
8. Any special terms or conditions

Provide a detailed analysis with structured data extraction.`;
    }
    buildContractAnalysisPrompt(documentContent, context) {
        return `Analyze this contract document for financial and compliance implications:

CONTRACT CONTENT:
${documentContent}

COMPANY CONTEXT:
- Company: ${context.companyId}
- Jurisdiction: ${context.regulatoryContext.jurisdiction}
- Business Type: ${context.financialContext.businessType}

Extract and analyze:
1. Contract parties and their roles
2. Financial terms and obligations
3. Payment schedules and amounts
4. Contract duration and renewal terms
5. Compliance requirements
6. Risk factors and liabilities
7. Termination clauses
8. Any regulatory implications

Provide a comprehensive analysis focusing on financial and compliance aspects.`;
    }
    parseReceiptData(analysisText, context, fallbackText) {
        try {
            // Try to parse JSON response
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    vendor: parsed.vendor || 'Unknown Vendor',
                    amount: parsed.amount || 0,
                    date: parsed.date ? new Date(parsed.date) : new Date(),
                    category: parsed.category || 'General',
                    description: parsed.description || 'Receipt transaction',
                    taxAmount: parsed.taxAmount,
                    taxRate: parsed.taxRate,
                    lineItems: parsed.lineItems || [],
                    currency: parsed.currency || context.financialContext.currency
                };
            }
            // Fallback parsing for text response
            return this.parseTextReceiptData(fallbackText || analysisText, context);
        }
        catch (error) {
            console.error('Error parsing receipt data:', error);
            return this.getDefaultExtractedData();
        }
    }
    parseInvoiceData(analysisText, context) {
        // Similar parsing logic for invoices
        return this.parseTextReceiptData(analysisText, context);
    }
    parseContractData(analysisText, context) {
        // Similar parsing logic for contracts
        return this.parseTextReceiptData(analysisText, context);
    }
    parseTextReceiptData(text, context) {
        const safe = (text || '').replace(/\r/g, '');
        const lines = safe.split('\n').map(l => l.trim()).filter(Boolean);
        // Vendor:
        // 1) From email domain
        let vendor = 'Unknown Vendor';
        const email = safe.match(/[A-Z0-9._%+-]+@([A-Z0-9.-]+)\.[A-Z]{2,}/i);
        if (email && email[1]) {
            const domain = email[1].split('.')?.[0] || '';
            if (domain.length >= 3)
                vendor = domain.charAt(0).toUpperCase() + domain.slice(1);
        }
        // 2) Company suffix line (Inc|LLC|Ltd|PBC|Corp)
        if (vendor === 'Unknown Vendor') {
            const companyLine = lines.find(l => /(inc\.|inc\b|llc\b|ltd\b|pbc\b|corp\b|company\b)/i.test(l));
            if (companyLine)
                vendor = companyLine.replace(/\s{2,}/g, ' ').trim();
        }
        // 3) Title-cased first block before Bill to/Ship to
        if (vendor === 'Unknown Vendor') {
            const stopIdx = lines.findIndex(l => /bill to|ship to/i.test(l));
            const searchBlock = lines.slice(0, stopIdx > 0 ? stopIdx : 8);
            for (const line of searchBlock) {
                const digitRatio = (line.replace(/\D/g, '').length) / Math.max(1, line.length);
                if (digitRatio < 0.25 && /[A-Za-z]/.test(line) && !/invoice number|date of issue|date due|invoice\b/i.test(line)) {
                    vendor = line;
                    break;
                }
            }
        }
        // Amount: match common invoice totals
        let amount = 0;
        const amountDueLine = lines.find(l => /amount\s*due/i.test(l));
        if (amountDueLine) {
            const m = amountDueLine.match(/\$?\s*([\d,.]+)(?:\s*USD)?\b/i);
            if (m)
                amount = parseFloat(m[1].replace(/[,]/g, ''));
        }
        if (!amount) {
            const totalLine = lines.find(l => /^(subtotal|total)(?!\s*excluding)/i.test(l) || /\btotal\s+excluding\s+tax\b/i.test(l));
            if (totalLine) {
                const m = totalLine.match(/\$?\s*([\d,.]+)\b/);
                if (m)
                    amount = parseFloat(m[1].replace(/[,]/g, ''));
            }
        }
        if (!amount) {
            const m = safe.match(/amount\s*due\s*\$?\s*([\d,.]+)(?:\s*USD)?/i) || safe.match(/\$\s*([\d,.]+)\s*USD/i);
            if (m)
                amount = parseFloat(m[1].replace(/[,]/g, ''));
        }
        // Date: capture formats like "June 22, 2025" or 2025-06-22
        const months = '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
        let dateStr = '';
        const issueLine = lines.find(l => /date\s+of\s+issue|date\s+issued/i.test(l));
        const dueLine = lines.find(l => /date\s+due/i.test(l));
        const dateRxes = [
            new RegExp(`${months}\\s+\\d{1,2},\\s+\\d{4}`, 'i'),
            /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
            /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
        ];
        for (const src of [issueLine, dueLine, safe]) {
            if (!src)
                continue;
            for (const rx of dateRxes) {
                const m = (typeof rx === 'object' ? src.match(rx) : null);
                if (m) {
                    dateStr = Array.isArray(m) ? m[0] : m[0];
                    break;
                }
            }
            if (dateStr)
                break;
        }
        const date = dateStr ? new Date(dateStr) : new Date();
        // Tax
        let taxAmount;
        let taxRate;
        const taxLine = lines.find(l => /tax\b/i.test(l));
        if (taxLine) {
            const rate = taxLine.match(/(\d{1,2}(?:\.\d+)?)\s*%/);
            if (rate)
                taxRate = parseFloat(rate[1]) / 100;
            const ta = taxLine.match(/\$\s*([\d,.]+)/) || taxLine.match(/\b([\d,.]+)\b/);
            if (ta)
                taxAmount = parseFloat(ta[1].replace(/[,]/g, ''));
        }
        const looksInvoice = /\binvoice\b/i.test(safe);
        return {
            vendor,
            amount: isFinite(amount) ? amount : 0,
            date,
            category: looksInvoice ? 'Invoice' : 'General',
            description: looksInvoice ? 'Invoice document' : 'Document transaction',
            taxAmount,
            taxRate,
            lineItems: [],
            currency: context.financialContext.currency
        };
    }
    async generateDocumentInsights(extractedData, context) {
        const insights = [];
        // Amount analysis
        if (extractedData.amount > context.financialContext.keyMetrics.averageTransactionAmount * 2) {
            insights.push({
                type: 'anomaly',
                description: `High-value transaction detected: $${extractedData.amount}`,
                confidence: 0.9,
                impact: 'high',
                recommendation: 'Review this transaction for accuracy and approval requirements'
            });
        }
        // Vendor analysis
        if (extractedData.vendor === 'Unknown Vendor') {
            insights.push({
                type: 'pattern',
                description: 'Vendor information could not be extracted clearly',
                confidence: 0.8,
                impact: 'medium',
                recommendation: 'Manually verify vendor details'
            });
        }
        // Tax analysis
        if (extractedData.taxAmount && extractedData.taxRate) {
            const expectedTaxRate = this.getExpectedTaxRate(context);
            if (Math.abs(extractedData.taxRate - expectedTaxRate) > 0.01) {
                insights.push({
                    type: 'compliance',
                    description: `Tax rate ${extractedData.taxRate}% differs from expected ${expectedTaxRate}%`,
                    confidence: 0.9,
                    impact: 'high',
                    recommendation: 'Verify tax calculation and compliance requirements'
                });
            }
        }
        return insights;
    }
    async generateContractInsights(extractedData, context) {
        const insights = [];
        // Contract value analysis
        if (extractedData.amount > context.financialContext.revenueRange.includes('million') ? 1000000 : 100000) {
            insights.push({
                type: 'compliance',
                description: 'High-value contract requires additional review',
                confidence: 0.9,
                impact: 'high',
                recommendation: 'Ensure proper approval and compliance procedures are followed'
            });
        }
        return insights;
    }
    getExpectedTaxRate(context) {
        // Return expected tax rate based on jurisdiction and business type
        const jurisdiction = context.regulatoryContext.jurisdiction.toLowerCase();
        if (jurisdiction.includes('us') || jurisdiction.includes('usa')) {
            return 0.08; // 8% average US sales tax
        }
        else if (jurisdiction.includes('uk')) {
            return 0.20; // 20% UK VAT
        }
        else if (jurisdiction.includes('ca')) {
            return 0.13; // 13% Canadian GST/HST
        }
        return 0.10; // Default 10%
    }
    getDefaultExtractedData() {
        return {
            vendor: 'Unknown Vendor',
            amount: 0,
            date: new Date(),
            category: 'General',
            description: 'Document transaction',
            lineItems: [],
            currency: 'USD'
        };
    }
}
export const llamaDocumentProcessor = new LlamaDocumentProcessor();
