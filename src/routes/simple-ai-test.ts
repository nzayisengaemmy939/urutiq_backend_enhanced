import { Router, Request, Response } from 'express'

const router = Router()

// Very simple test endpoint
router.get('/test', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'AI Test Endpoint Working',
      timestamp: new Date().toISOString(),
      openaiKey: process.env.OPENAI_API_KEY ? 'Set' : 'Not Set',
      nodeEnv: process.env.NODE_ENV
    })
  } catch (error: any) {
    console.error('Simple AI Test Error:', error)
    res.status(500).json({
      success: false,
      error: 'Simple AI Test Failed',
      message: error.message
    })
  }
})

export default router
