import { Router, Request, Response } from 'express'
import { AIService } from '../services/ai-service'

const router = Router()

// Simple test endpoint for AI functionality
router.get('/test', async (req: Request, res: Response) => {
  try {
    // Test with mock documents
    const mockDocuments = [
      {
        id: '1',
        displayName: 'Sample Contract.pdf',
        name: 'contract.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024000,
        uploadedAt: new Date('2024-01-15'),
        status: 'active',
        categoryId: null
      },
      {
        id: '2',
        displayName: 'Invoice_2024_001.pdf',
        name: 'invoice.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512000,
        uploadedAt: new Date('2024-02-01'),
        status: 'active',
        categoryId: null
      },
      {
        id: '3',
        displayName: 'Financial Report Q1.xlsx',
        name: 'report.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sizeBytes: 256000,
        uploadedAt: new Date('2024-03-15'),
        status: 'active',
        categoryId: 'financial'
      }
    ]

    // Test AI insights generation
    const insights = await AIService.generateInsights(mockDocuments)
    
    // Test categorization suggestions
    const categorization = await AIService.generateCategorizationSuggestions(mockDocuments)
    
    // Test document analysis
    const analysis = await AIService.analyzeDocument('Test Document.pdf', 'application/pdf', 'This is a test document content')

    res.json({
      success: true,
      message: 'AI Integration Test Successful',
      data: {
        insights,
        categorization,
        analysis,
        openaiAvailable: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here' && process.env.OPENAI_API_KEY !== 'sk-test-key-for-development'
      }
    })
  } catch (error: any) {
    console.error('AI Test Error:', error)
    res.status(500).json({
      success: false,
      error: 'AI Test Failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Test OpenAI API key
router.get('/test-key', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const isValid = apiKey && apiKey !== 'your-openai-api-key-here' && apiKey !== 'sk-test-key-for-development'
    
    res.json({
      success: true,
      hasKey: !!apiKey,
      isValid,
      keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'No key',
      message: isValid ? 'OpenAI API key is valid' : 'OpenAI API key is missing or invalid'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Key test failed',
      message: error.message
    })
  }
})

export default router
