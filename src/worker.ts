import { Worker } from 'bullmq';
import { prisma } from './prisma';
import { localFilePath } from './storage';
import fs from 'node:fs';
import path from 'node:path';

// AI Worker for Document Processing
export async function startAiWorker() {
  console.log('🤖 Starting AI Worker...');
  
  try {
    const { aiQueue } = await import('./queue');
    
    // Document Analysis Worker
    const documentAnalysisWorker = new Worker('document-analysis', async (job) => {
      const { documentId, tenantId, companyId, analysisType, userId } = job.data;
      
      console.log(`🔍 Processing document analysis: ${documentId} (${analysisType})`);
      
      try {
        // Get document
        const document = await prisma.fileAsset.findFirst({
          where: { id: documentId, tenantId }
        });
        
        if (!document) {
          throw new Error('Document not found');
        }
        
        // Log analysis start
        await (prisma as any).documentActivity.create({
          data: {
            tenantId,
            companyId,
            documentId,
            userId,
            action: 'ai_analysis_processing',
            details: `AI analysis processing: ${analysisType}`
          }
        });
        
        // Simulate AI processing (in production, integrate with actual AI services)
        const analysisResult = await processDocumentAnalysis(document, analysisType);
        
        // Log analysis completion
        await (prisma as any).documentActivity.create({
          data: {
            tenantId,
            companyId,
            documentId,
            userId,
            action: 'ai_analysis_completed',
            details: JSON.stringify(analysisResult)
          }
        });
        
        console.log(`✅ Document analysis completed: ${documentId}`);
        return analysisResult;
        
      } catch (error) {
        console.error(`❌ Document analysis failed: ${documentId}`, error);
        
        // Log analysis failure
        await (prisma as any).documentActivity.create({
          data: {
            tenantId,
            companyId: job.data.companyId,
            documentId,
            userId,
            action: 'ai_analysis_failed',
            details: `AI analysis failed: ${error instanceof Error ? error.message : String(error)}`
          }
        });
        
        throw error;
      }
    }, {
      connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379)
      },
      concurrency: 2
    });
    
    // Document Automation Worker
    const documentAutomationWorker = new Worker('document-automation', async (job) => {
      const { automationType, rules, documents, tenantId, userId } = job.data;
      
      console.log(`⚡ Processing automation: ${automationType} for ${documents.length} documents`);
      
      try {
        // Log automation start
        await (prisma as any).documentActivity.create({
          data: {
            tenantId,
            companyId: null,
            documentId: documents[0]?.id,
            userId,
            action: 'automation_processing',
            details: `Automation processing: ${automationType} for ${documents.length} documents`
          }
        });
        
        // Process automation based on type
        const result = await processDocumentAutomation(automationType, rules, documents, tenantId);
        
        // Log automation completion
        await (prisma as any).documentActivity.create({
          data: {
            tenantId,
            companyId: null,
            documentId: documents[0]?.id,
            userId,
            action: 'automation_completed',
            details: `Automation completed: ${automationType} - ${JSON.stringify(result)}`
          }
        });
        
        console.log(`✅ Automation completed: ${automationType}`);
        return result;
        
      } catch (error) {
        console.error(`❌ Automation failed: ${automationType}`, error);
        
        // Log automation failure
        await (prisma as any).documentActivity.create({
          data: {
            tenantId,
            companyId: null,
            documentId: documents[0]?.id,
            userId,
            action: 'automation_failed',
            details: `Automation failed: ${error instanceof Error ? error.message : String(error)}`
          }
        });
        
        throw error;
      }
    }, {
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379)
      },
      concurrency: 1
    });
    
    // Error handling
    documentAnalysisWorker.on('error', (error) => {
      console.error('❌ Document Analysis Worker error:', error);
    });
    
    documentAutomationWorker.on('error', (error) => {
      console.error('❌ Document Automation Worker error:', error);
    });
    
    console.log('✅ AI Worker started successfully');
    
    return { documentAnalysisWorker, documentAutomationWorker };
    
  } catch (error) {
    console.error('❌ Failed to start AI Worker:', error);
    throw error;
  }
}

// Document Analysis Processing
async function processDocumentAnalysis(document: any, analysisType: string) {
  const filePath = localFilePath(document.storageKey);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found on disk');
  }
  
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
  
  const analysisResult: any = {
    documentId: document.id,
    analysisType,
    timestamp: new Date().toISOString(),
    fileInfo: {
      name: document.name,
      size: document.sizeBytes,
      mimeType: document.mimeType,
      uploadedAt: document.uploadedAt
    }
  };
  
  // Process based on analysis type
  switch (analysisType) {
    case 'full':
      analysisResult.ocr = await simulateOCR(filePath, document.mimeType);
      analysisResult.classification = await simulateClassification(document);
      analysisResult.sentiment = await simulateSentimentAnalysis(document);
      analysisResult.keywords = await simulateKeywordExtraction(document);
      break;
      
    case 'ocr':
      analysisResult.ocr = await simulateOCR(filePath, document.mimeType);
      break;
      
    case 'classification':
      analysisResult.classification = await simulateClassification(document);
      break;
      
    case 'sentiment':
      analysisResult.sentiment = await simulateSentimentAnalysis(document);
      break;
      
    default:
      throw new Error(`Unsupported analysis type: ${analysisType}`);
  }
  
  return analysisResult;
}

// Document Automation Processing
async function processDocumentAutomation(automationType: string, rules: any, documents: any[], tenantId: string) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const results = [];
  
  for (const doc of documents) {
    const result = await processSingleDocumentAutomation(automationType, rules, doc, tenantId);
    results.push(result);
  }
  
  return {
    automationType,
    processedDocuments: results.length,
    results
  };
}

// Single Document Automation
async function processSingleDocumentAutomation(automationType: string, rules: any, document: any, tenantId: string) {
  switch (automationType) {
    case 'auto_categorize':
      return await autoCategorizeDocument(document, rules, tenantId);
      
    case 'auto_tag':
      return await autoTagDocument(document, rules, tenantId);
      
    case 'auto_organize':
      return await autoOrganizeDocument(document, rules, tenantId);
      
    case 'compliance_check':
      return await complianceCheckDocument(document, rules, tenantId);
      
    default:
      throw new Error(`Unsupported automation type: ${automationType}`);
  }
}

// Automation Functions
async function autoCategorizeDocument(document: any, rules: any, tenantId: string) {
  // Simulate AI categorization
  const suggestedCategory = await simulateCategorySuggestion(document, rules);
  
  if (suggestedCategory) {
    await (prisma as any).fileAsset.update({
      where: { id: document.id },
      data: ({ categoryId: suggestedCategory } as any)
    });
  }
  
  return {
    documentId: document.id,
    action: 'auto_categorize',
    suggestedCategory,
    applied: !!suggestedCategory
  };
}

async function autoTagDocument(document: any, rules: any, tenantId: string) {
  // Simulate AI tagging
  const tags = await simulateTagGeneration(document, rules);
  
  // Update document description with tags
  const currentDesc = document.description || '';
  const newDesc = currentDesc + (currentDesc ? '\n\n' : '') + `AI Tags: ${tags.join(', ')}`;
  
  await prisma.fileAsset.update({
    where: { id: document.id },
    data: ( { description: newDesc } as any )
  });
  
  
  return {
    documentId: document.id,
    action: 'auto_tag',
    tags,
    applied: true
  };
}

async function autoOrganizeDocument(document: any, rules: any, tenantId: string) {
  // Simulate AI organization
  const suggestions = await simulateOrganizationSuggestions(document, rules);
  
  const updates: any = {};
  if (suggestions.workspaceId) updates.workspaceId = suggestions.workspaceId;
  if (suggestions.categoryId) updates.categoryId = suggestions.categoryId;
  
  if (Object.keys(updates).length > 0) {
    await prisma.fileAsset.update({
      where: { id: document.id },
      data: updates
    });
  }
  
  return {
    documentId: document.id,
    action: 'auto_organize',
    suggestions,
    applied: Object.keys(updates).length > 0
  };
}

async function complianceCheckDocument(document: any, rules: any, tenantId: string) {
  // Simulate compliance checking
  const complianceResult = await simulateComplianceCheck(document, rules);
  
  return {
    documentId: document.id,
    action: 'compliance_check',
    compliant: complianceResult.compliant,
    issues: complianceResult.issues,
    recommendations: complianceResult.recommendations
  };
}

// Simulation Functions (replace with actual AI service calls)
async function simulateOCR(filePath: string, mimeType: string) {
  if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
    return { text: null, confidence: 0, error: 'File type not supported for OCR' };
  }
  
  // Simulate OCR processing
  const sampleTexts = [
    'This is a sample invoice for services rendered.',
    'Contract agreement between parties for project delivery.',
    'Financial statement showing quarterly results.',
    'Meeting minutes from board of directors session.',
    'Technical specification document for software development.'
  ];
  
  return {
    text: sampleTexts[Math.floor(Math.random() * sampleTexts.length)],
    confidence: 0.85 + Math.random() * 0.1,
    language: 'en',
    pages: mimeType === 'application/pdf' ? Math.floor(Math.random() * 5) + 1 : 1
  };
}

async function simulateClassification(document: any) {
  const categories = ['invoice', 'contract', 'report', 'receipt', 'proposal', 'manual'];
  const suggestedCategory = categories[Math.floor(Math.random() * categories.length)];
  
  return {
    suggestedCategory,
    confidence: 0.7 + Math.random() * 0.25,
    alternatives: categories.filter(c => c !== suggestedCategory).slice(0, 3)
  };
}

async function simulateSentimentAnalysis(document: any) {
  const sentiments = ['positive', 'neutral', 'negative'];
  const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
  
  return {
    sentiment,
    confidence: 0.6 + Math.random() * 0.3,
    score: sentiment === 'positive' ? 0.6 + Math.random() * 0.4 : 
           sentiment === 'negative' ? Math.random() * 0.4 : 0.4 + Math.random() * 0.2
  };
}

async function simulateKeywordExtraction(document: any) {
  const keywords = ['business', 'financial', 'legal', 'technical', 'operational', 'strategic'];
  const extractedKeywords = keywords.slice(0, Math.floor(Math.random() * 4) + 2);
  
  return {
    keywords: extractedKeywords,
    confidence: 0.75 + Math.random() * 0.2,
    relevance: extractedKeywords.map(k => ({ keyword: k, score: 0.5 + Math.random() * 0.5 }))
  };
}

async function simulateCategorySuggestion(document: any, rules: any) {
  // Simulate AI category suggestion based on rules
  const categories = await (prisma as any).documentCategory.findMany({
    where: { tenantId: document.tenantId },
    take: 5
  });
  
  if (categories.length === 0) return null;
  
  // Random selection for demo (replace with actual AI logic)
  return categories[Math.floor(Math.random() * categories.length)].id;
}

async function simulateTagGeneration(document: any, rules: any) {
  const baseTags = ['important', 'review', 'archive', 'urgent', 'confidential'];
  const numTags = Math.floor(Math.random() * 3) + 1;
  
  return baseTags.slice(0, numTags);
}

async function simulateOrganizationSuggestions(document: any, rules: any) {
  const workspaces = await (prisma as any).workspace.findMany({
    where: { tenantId: document.tenantId },
    take: 3
  });
  
  return {
    workspaceId: workspaces.length > 0 ? workspaces[Math.floor(Math.random() * workspaces.length)].id : null,
    categoryId: null, // Already handled by auto_categorize
    confidence: 0.6 + Math.random() * 0.3
  };
}

async function simulateComplianceCheck(document: any, rules: any) {
  const isCompliant = Math.random() > 0.3; // 70% compliant
  
  return {
    compliant: isCompliant,
    issues: isCompliant ? [] : ['Document may contain sensitive information', 'Review required for data classification'],
    recommendations: isCompliant ? ['Document is compliant'] : ['Review document content', 'Apply appropriate security labels']
  };
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down AI Worker...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down AI Worker...');
  process.exit(0);
});

// Start worker if run directly
if (require.main === module) {
  startAiWorker().catch(console.error);
}
