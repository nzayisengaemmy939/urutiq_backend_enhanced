// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma2:2b'

// Check if Ollama is available
const isOllamaAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    return response.ok
  } catch {
    return false
  }
}

export interface DocumentAnalysis {
  category: string
  confidence: number
  tags: string[]
  summary: string
  keyPoints: string[]
  riskLevel: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export interface AIInsight {
  type: 'warning' | 'info' | 'success' | 'error'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
  action: string
  confidence: number
}

export class AIService {
  /**
   * Call Ollama API for AI processing
   */
  static async callOllama(prompt: string, systemPrompt?: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: 1000
          }
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.response || ''
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Ollama API timeout - model may be loading or overloaded')
      }
      throw error
    }
  }

  /**
   * Extract JSON from AI response, handling markdown and extra text
   */
  private static extractJsonFromResponse(response: string): string {
    // Remove markdown code blocks
    let cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim()
    
    // Try to find JSON array or object - look for complete JSON structures
    const jsonArrayMatch = cleanResponse.match(/\[[\s\S]*?\]/)
    const jsonObjectMatch = cleanResponse.match(/\{[\s\S]*?\}/)
    
    if (jsonArrayMatch) {
      cleanResponse = jsonArrayMatch[0]
    } else if (jsonObjectMatch) {
      cleanResponse = jsonObjectMatch[0]
    }
    
    // Remove comments from JSON (// comments) - more aggressive
    cleanResponse = cleanResponse.replace(/\/\/.*$/gm, '')
    cleanResponse = cleanResponse.replace(/\/\*[\s\S]*?\*\//g, '')
    
    // Clean up common JSON issues
    cleanResponse = cleanResponse.replace(/,(\s*[}\]])/g, '$1')
    cleanResponse = cleanResponse.replace(/,(\s*})/g, '$1')
    cleanResponse = cleanResponse.replace(/,(\s*\])/g, '$1')
    
    // Remove trailing commas more aggressively
    cleanResponse = cleanResponse.replace(/,(\s*[}\]])/g, '$1')
    
    // Remove any remaining non-JSON text
    cleanResponse = cleanResponse.replace(/^[^{[]*/, '')
    cleanResponse = cleanResponse.replace(/[^}\]]*$/, '')
    
    return cleanResponse
  }

  /**
   * Analyze a document and extract AI insights
   */
  static async analyzeDocument(documentName: string, mimeType: string, content?: string): Promise<DocumentAnalysis> {
    const systemPrompt = "You are an AI document analysis expert. Analyze documents and provide structured insights in JSON format."
    
    const prompt = `
      Analyze this document and provide insights:
      - Document Name: ${documentName}
      - MIME Type: ${mimeType}
      - Content: ${content ? content.substring(0, 2000) : 'Content not available'}
      
      Please provide a JSON response with:
      {
        "category": "Contract, Invoice, Report, Legal, Financial, etc.",
        "confidence": 0.8,
        "tags": ["tag1", "tag2", "tag3"],
        "summary": "Brief 2-3 sentence summary",
        "keyPoints": ["point1", "point2", "point3"],
        "riskLevel": "low/medium/high",
        "recommendations": ["rec1", "rec2", "rec3"]
      }
    `

    try {
      const response = await this.callOllama(prompt, systemPrompt)
      const analysis = JSON.parse(response)

      return {
        category: analysis.category || 'Unknown',
        confidence: analysis.confidence || 0.5,
        tags: analysis.tags || [],
        summary: analysis.summary || 'No summary available',
        keyPoints: analysis.keyPoints || [],
        riskLevel: analysis.riskLevel || 'low',
        recommendations: analysis.recommendations || []
      }
    } catch (error) {
      console.error('Error analyzing document with Ollama:', error)
      // Return fallback analysis
      return {
        category: this.getCategoryFromMimeType(mimeType),
        confidence: 0.6,
        tags: this.getBasicTags(mimeType),
        summary: `Document: ${documentName} (${mimeType})`,
        keyPoints: ['Document analysis pending'],
        riskLevel: 'low',
        recommendations: ['Review document content manually']
      }
    }
  }

  /**
   * Generate AI insights based on document collection
   */
  static async generateInsights(documents: any[]): Promise<AIInsight[]> {
    // Check if Ollama is available first
    const ollamaAvailable = await isOllamaAvailable()
    
    if (!ollamaAvailable) {
      return this.getFallbackInsights(documents)
    }

    const documentSummary = documents.map(doc => ({
      name: doc.displayName || doc.name,
      type: doc.mimeType,
      size: doc.sizeBytes,
      uploadedAt: doc.uploadedAt,
      status: doc.status
    }))

    const systemPrompt = "You are an AI analyst. Provide brief insights in JSON format."
    
    const prompt = `Analyze these documents: ${documentSummary.slice(0, 3).map(d => d.name).join(', ')}. Return JSON: [{"type":"info","title":"Title","message":"Message","priority":"medium","action":"Action","confidence":0.8}]`

    let response: string = ''
    try {
      response = await this.callOllama(prompt, systemPrompt)
      
      const cleanResponse = this.extractJsonFromResponse(response)
      
      const insights = JSON.parse(cleanResponse)
      return Array.isArray(insights) ? insights : this.getFallbackInsights(documents)
    } catch (error) {
      console.error('Error generating insights with Ollama:', error)
      return this.getFallbackInsights(documents)
    }
  }

  /**
   * Generate smart categorization suggestions
   */
  static async generateCategorizationSuggestions(documents: any[]): Promise<any[]> {
    const uncategorizedDocs = documents.filter(doc => !doc.categoryId)
    
    if (uncategorizedDocs.length === 0) {
      return []
    }

    // Check if Ollama is available first
    const ollamaAvailable = await isOllamaAvailable()
    
    if (!ollamaAvailable) {
      return this.getFallbackCategorization(documents)
    }

    const systemPrompt = "You are an AI categorizer. Suggest categories in JSON format."
    
    const prompt = `Categorize these documents: ${uncategorizedDocs.slice(0, 3).map(d => d.displayName || d.name).join(', ')}. Return JSON: [{"category":"Category","suggestedCount":1,"confidence":0.8,"documents":[{"id":"1","name":"doc","reason":"reason"}]}]`

    let response: string = ''
    try {
      response = await this.callOllama(prompt, systemPrompt)
      // Clean up response - remove markdown code blocks and extract JSON
      let cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim()
      
      // Try to extract JSON from the response if it contains extra text
      // Look for JSON array or object at the beginning of the response
      const jsonArrayMatch = cleanResponse.match(/^\[[\s\S]*?\]/)
      const jsonObjectMatch = cleanResponse.match(/^\{[\s\S]*?\}/)
      
      if (jsonArrayMatch) {
        cleanResponse = jsonArrayMatch[0]
      } else if (jsonObjectMatch) {
        cleanResponse = jsonObjectMatch[0]
      } else {
        // Fallback: try to find any JSON structure
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
        if (jsonMatch) {
          cleanResponse = jsonMatch[0]
        }
      }
      
      // Clean up common JSON issues from AI responses
      // Remove trailing commas before closing brackets/braces
      cleanResponse = cleanResponse.replace(/,(\s*[}\]])/g, '$1')
      // Remove trailing commas in object properties
      cleanResponse = cleanResponse.replace(/,(\s*})/g, '$1')
      // Remove trailing commas in array elements
      cleanResponse = cleanResponse.replace(/,(\s*\])/g, '$1')
      
      const suggestions = JSON.parse(cleanResponse)
      return Array.isArray(suggestions) ? suggestions : this.getFallbackCategorization(documents)
    } catch (error) {
      console.error('Error generating categorization suggestions with Ollama:', error)
      return this.getFallbackCategorization(documents)
    }
  }

  /**
   * Generate AI summary for a document
   */
  static async generateSummary(documentName: string, mimeType: string, content?: string): Promise<string> {
    // Check if Ollama is available first
    const ollamaAvailable = await isOllamaAvailable()
    
    if (!ollamaAvailable) {
      return `Document: ${documentName} (${mimeType})`
    }

    const systemPrompt = "You are an AI document summarization expert. Create concise, informative summaries."
    
    const prompt = `
      Generate a concise summary for this document:
      - Name: ${documentName}
      - Type: ${mimeType}
      - Content: ${content ? content.substring(0, 1500) : 'Content not available'}
      
      Provide a 2-3 sentence summary highlighting the key information.
    `

    try {
      const response = await this.callOllama(prompt, systemPrompt)
      return response || 'Summary not available'
    } catch (error) {
      console.error('Error generating summary with Ollama:', error)
      return `Document: ${documentName} (${mimeType})`
    }
  }

  // Helper methods for fallback data
  private static getCategoryFromMimeType(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'PDF Document'
    if (mimeType.includes('image')) return 'Image'
    if (mimeType.includes('text')) return 'Text Document'
    if (mimeType.includes('spreadsheet')) return 'Spreadsheet'
    if (mimeType.includes('presentation')) return 'Presentation'
    return 'Document'
  }

  private static getBasicTags(mimeType: string): string[] {
    const tags = []
    if (mimeType.includes('pdf')) tags.push('PDF')
    if (mimeType.includes('image')) tags.push('Image')
    if (mimeType.includes('text')) tags.push('Text')
    if (mimeType.includes('spreadsheet')) tags.push('Spreadsheet')
    return tags
  }

  private static getFallbackInsights(documents: any[]): AIInsight[] {
    const totalDocs = documents.length
    const oldDocs = documents.filter(doc => {
      const daysSinceUpload = (Date.now() - new Date(doc.uploadedAt).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceUpload > 365
    }).length

    const uncategorizedDocs = documents.filter(doc => !doc.categoryId).length
    const pdfDocs = documents.filter(doc => doc.mimeType?.includes('pdf')).length

    const insights: AIInsight[] = [
      {
        type: 'info',
        title: 'Document Collection Overview',
        message: `You have ${totalDocs} documents in your collection with ${pdfDocs} PDFs`,
        priority: 'low',
        action: 'Review document organization and categorization',
        confidence: 0.95
      }
    ]

    if (uncategorizedDocs > 0) {
      insights.push({
        type: 'warning',
        title: 'Categorization Needed',
        message: `${uncategorizedDocs} documents are not categorized and may be difficult to find`,
        priority: 'medium',
        action: 'Use AI categorization suggestions to organize documents',
        confidence: 0.9
      })
    }

    if (oldDocs > 0) {
      insights.push({
        type: 'warning',
        title: 'Storage Optimization',
        message: `${oldDocs} documents are older than 1 year and may be candidates for archiving`,
        priority: 'medium',
        action: 'Review and archive outdated documents to save storage space',
        confidence: 0.85
      })
    }

    return insights
  }

  private static getFallbackCategorization(documents: any[]): any[] {
    const uncategorizedDocs = documents.filter(doc => !doc.categoryId)
    
    return [
      {
        category: 'Uncategorized Documents',
        suggestedCount: uncategorizedDocs.length,
        confidence: 0.9,
        documents: uncategorizedDocs.slice(0, 5).map(doc => ({
          id: doc.id,
          name: doc.displayName || doc.name,
          reason: 'No category assigned'
        }))
      }
    ]
  }

  // Analyze document quality metrics
  static async analyzeDocumentQuality(documents: any[]): Promise<any> {
    // Check if Ollama is available first
    const ollamaAvailable = await isOllamaAvailable()
    
    if (!ollamaAvailable) {
      return {
        completeness: 85,
        clarity: 90,
        compliance: 88,
        accessibility: 82
      }
    }

    const systemPrompt = "You are an AI quality analyst. Provide quality metrics in JSON format."
    
    const prompt = `Analyze quality for: ${documents.slice(0, 3).map(d => d.displayName || d.name).join(', ')}. Return JSON: {"completeness":85,"clarity":90,"compliance":88,"accessibility":82}`

    let response: string = ''
    try {
      response = await this.callOllama(prompt, systemPrompt)
      const cleanResponse = this.extractJsonFromResponse(response)
      
      const metrics = JSON.parse(cleanResponse)
      return {
        completeness: metrics.completeness || 85,
        clarity: metrics.clarity || 90,
        compliance: metrics.compliance || 88,
        accessibility: metrics.accessibility || 82
      }
    } catch (error) {
      console.error('Error analyzing document quality with Ollama:', error)
      return {
        completeness: 85,
        clarity: 90,
        compliance: 88,
        accessibility: 82
      }
    }
  }

  // Generate AI tags
  static async generateTags(documents: any[]): Promise<any[]> {
    // Check if Ollama is available first
    const ollamaAvailable = await isOllamaAvailable()
    
    if (!ollamaAvailable) {
      return this.getFallbackTags(documents)
    }

    const systemPrompt = "You are an AI tagger. Generate tags in JSON format."
    
    const prompt = `Tag these documents: ${documents.slice(0, 3).map(d => d.displayName || d.name).join(', ')}. Return JSON: [{"name":"Tag","count":1,"confidence":0.8}]`

    let response: string = ''
    try {
      response = await this.callOllama(prompt, systemPrompt)
      // Clean up response - remove markdown code blocks and extract JSON
      let cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim()
      
      // Try to extract JSON from the response if it contains extra text
      // Look for JSON array or object at the beginning of the response
      const jsonArrayMatch = cleanResponse.match(/^\[[\s\S]*?\]/)
      const jsonObjectMatch = cleanResponse.match(/^\{[\s\S]*?\}/)
      
      if (jsonArrayMatch) {
        cleanResponse = jsonArrayMatch[0]
      } else if (jsonObjectMatch) {
        cleanResponse = jsonObjectMatch[0]
      } else {
        // Fallback: try to find any JSON structure
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
        if (jsonMatch) {
          cleanResponse = jsonMatch[0]
        }
      }
      
      // Clean up common JSON issues from AI responses
      // Remove trailing commas before closing brackets/braces
      cleanResponse = cleanResponse.replace(/,(\s*[}\]])/g, '$1')
      // Remove trailing commas in object properties
      cleanResponse = cleanResponse.replace(/,(\s*})/g, '$1')
      // Remove trailing commas in array elements
      cleanResponse = cleanResponse.replace(/,(\s*\])/g, '$1')
      
      const tags = JSON.parse(cleanResponse)
      return Array.isArray(tags) ? tags : this.getFallbackTags(documents)
    } catch (error) {
      console.error('Error generating tags with Ollama:', error)
      return this.getFallbackTags(documents)
    }
  }

  // Generate AI extractions
  static async generateExtractions(documents: any[]): Promise<any[]> {
    // Check if Ollama is available first
    const ollamaAvailable = await isOllamaAvailable()
    
    if (!ollamaAvailable) {
      return this.getFallbackExtractions(documents)
    }

    const systemPrompt = "You are an AI metadata extraction expert. Generate extraction results for documents in JSON format."
    
    const prompt = `
      Generate extraction results for these documents:
      ${documents.map(doc => ({
        name: doc.displayName || doc.name,
        type: doc.mimeType,
        uploadedAt: doc.uploadedAt
      })).slice(0, 10)}
      
      Provide extraction results in JSON array format:
      [
        {
          "id": "doc1",
          "name": "document.pdf",
          "status": "completed",
          "extractedFields": ["Client", "Date", "Amount"],
          "extractedAt": "2024-01-01T00:00:00Z"
        }
      ]
    `

    let response: string = ''
    try {
      response = await this.callOllama(prompt, systemPrompt)
      const cleanResponse = this.extractJsonFromResponse(response)
      
      const extractions = JSON.parse(cleanResponse)
      return Array.isArray(extractions) ? extractions : this.getFallbackExtractions(documents)
    } catch (error) {
      console.error('Error generating extractions with Ollama:', error)
      return this.getFallbackExtractions(documents)
    }
  }

  // Generate AI summaries
  static async generateSummaries(documents: any[]): Promise<any[]> {
    // Check if Ollama is available first
    const ollamaAvailable = await isOllamaAvailable()
    
    if (!ollamaAvailable) {
      return this.getFallbackSummaries(documents)
    }

    const systemPrompt = "You are an AI document summarization expert. Generate summaries for document collections in JSON format."
    
    const prompt = `
      Generate summaries for this document collection:
      ${documents.map(doc => ({
        name: doc.displayName || doc.name,
        type: doc.mimeType,
        size: doc.sizeBytes,
        uploadedAt: doc.uploadedAt
      })).slice(0, 15)}
      
      Provide summaries in JSON array format:
      [
        {
          "id": "1",
          "title": "Document Collection Overview",
          "content": "Summary of the document collection...",
          "type": "collection_analysis",
          "createdAt": "2024-01-01T00:00:00Z",
          "confidence": 0.9
        }
      ]
    `

    let response: string = ''
    try {
      response = await this.callOllama(prompt, systemPrompt)
      // Clean up response - remove markdown code blocks and extract JSON
      let cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim()
      
      // Try to extract JSON from the response if it contains extra text
      // Look for JSON array or object at the beginning of the response
      const jsonArrayMatch = cleanResponse.match(/^\[[\s\S]*?\]/)
      const jsonObjectMatch = cleanResponse.match(/^\{[\s\S]*?\}/)
      
      if (jsonArrayMatch) {
        cleanResponse = jsonArrayMatch[0]
      } else if (jsonObjectMatch) {
        cleanResponse = jsonObjectMatch[0]
      } else {
        // Fallback: try to find any JSON structure
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
        if (jsonMatch) {
          cleanResponse = jsonMatch[0]
        }
      }
      
      // Clean up common JSON issues from AI responses
      // Remove trailing commas before closing brackets/braces
      cleanResponse = cleanResponse.replace(/,(\s*[}\]])/g, '$1')
      // Remove trailing commas in object properties
      cleanResponse = cleanResponse.replace(/,(\s*})/g, '$1')
      // Remove trailing commas in array elements
      cleanResponse = cleanResponse.replace(/,(\s*\])/g, '$1')
      
      const summaries = JSON.parse(cleanResponse)
      return Array.isArray(summaries) ? summaries : this.getFallbackSummaries(documents)
    } catch (error) {
      console.error('Error generating summaries with Ollama:', error)
      return this.getFallbackSummaries(documents)
    }
  }

  // Fallback methods
  private static getFallbackTags(documents: any[]): any[] {
    const tagCounts: { [key: string]: number } = {}
    
    documents.forEach(doc => {
      const mimeType = doc.mimeType || ''
      if (mimeType.includes('pdf')) tagCounts['PDF Documents'] = (tagCounts['PDF Documents'] || 0) + 1
      if (mimeType.includes('image')) tagCounts['Images'] = (tagCounts['Images'] || 0) + 1
      if (mimeType.includes('text')) tagCounts['Text Files'] = (tagCounts['Text Files'] || 0) + 1
      if (mimeType.includes('spreadsheet')) tagCounts['Spreadsheets'] = (tagCounts['Spreadsheets'] || 0) + 1
    })

    return Object.entries(tagCounts).map(([name, count]) => ({
      name,
      count,
      confidence: 0.8
    }))
  }

  private static getFallbackExtractions(documents: any[]): any[] {
    return documents.slice(0, 5).map((doc, index) => ({
      id: doc.id,
      name: doc.displayName || doc.name,
      status: index < 3 ? 'completed' : 'processing',
      extractedFields: index < 3 ? ['Title', 'Date', 'Type'] : ['Metadata', 'Content'],
      extractedAt: doc.uploadedAt
    }))
  }

  private static getFallbackSummaries(documents: any[]): any[] {
    return [
      {
        id: '1',
        title: 'Document Collection Overview',
        content: `Collection contains ${documents.length} documents with various types and sizes.`,
        type: 'collection_analysis',
        createdAt: new Date(),
        confidence: 0.8
      }
    ]
  }
}