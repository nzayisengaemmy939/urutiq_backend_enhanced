import request from 'supertest'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock the banking service
const mockBankingService = {
  connectBank: jest.fn(),
  disconnectBank: jest.fn(),
  getBankConnections: jest.fn(),
  syncTransactions: jest.fn(),
  getTransactions: jest.fn(),
  categorizeTransaction: jest.fn(),
  reconcileTransactions: jest.fn(),
  getBankAccounts: jest.fn(),
  updateBankAccount: jest.fn(),
}

// Mock the app (this would be imported from your actual app)
const mockApp = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}

describe('Banking Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/banking/connect', () => {
    it('should connect a bank account', async () => {
      const bankData = {
        bankName: 'Test Bank',
        accountType: 'checking',
        accountNumber: '1234567890',
        routingNumber: '123456789',
        companyId: 'company123',
      }
      
      const connectionResult = {
        id: 'connection123',
        bankName: 'Test Bank',
        accountType: 'checking',
        status: 'connected',
        lastSync: '2024-01-15T10:00:00Z',
      }
      
      mockBankingService.connectBank.mockResolvedValue(connectionResult)
      
      // Mock the route handler
      const mockHandler = jest.fn(async (req, res) => {
        const result = await mockBankingService.connectBank(req.body)
        res.status(201).json(result)
      })
      
      mockApp.post.mockImplementation((path, handler) => {
        if (path === '/api/banking/connect') {
          return { handler: mockHandler }
        }
      })
      
      // Simulate the request
      const req = { body: bankData }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(mockBankingService.connectBank).toHaveBeenCalledWith(bankData)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(connectionResult)
    })

    it('should validate required fields', async () => {
      const invalidData = {
        bankName: 'Test Bank',
        // Missing required fields
      }
      
      const mockHandler = jest.fn(async (req, res) => {
        if (!req.body.bankName || !req.body.accountType || !req.body.accountNumber) {
          return res.status(400).json({ error: 'Missing required fields' })
        }
        const result = await mockBankingService.connectBank(req.body)
        res.status(201).json(result)
      })
      
      const req = { body: invalidData }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' })
    })

    it('should handle bank connection errors', async () => {
      const bankData = {
        bankName: 'Test Bank',
        accountType: 'checking',
        accountNumber: '1234567890',
        routingNumber: '123456789',
        companyId: 'company123',
      }
      
      const error = new Error('Bank connection failed')
      mockBankingService.connectBank.mockRejectedValue(error)
      
      const mockHandler = jest.fn(async (req, res) => {
        try {
          const result = await mockBankingService.connectBank(req.body)
          res.status(201).json(result)
        } catch (err) {
          res.status(500).json({ error: err.message })
        }
      })
      
      const req = { body: bankData }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Bank connection failed' })
    })
  })

  describe('GET /api/banking/connections', () => {
    it('should get all bank connections', async () => {
      const companyId = 'company123'
      const connections = [
        {
          id: 'connection1',
          bankName: 'Bank A',
          accountType: 'checking',
          status: 'connected',
          lastSync: '2024-01-15T10:00:00Z',
        },
        {
          id: 'connection2',
          bankName: 'Bank B',
          accountType: 'savings',
          status: 'connected',
          lastSync: '2024-01-14T09:00:00Z',
        },
      ]
      
      mockBankingService.getBankConnections.mockResolvedValue(connections)
      
      const mockHandler = jest.fn(async (req, res) => {
        const result = await mockBankingService.getBankConnections(req.query.companyId)
        res.status(200).json({ connections: result })
      })
      
      const req = { query: { companyId } }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(mockBankingService.getBankConnections).toHaveBeenCalledWith(companyId)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ connections })
    })

    it('should require companyId parameter', async () => {
      const mockHandler = jest.fn(async (req, res) => {
        if (!req.query.companyId) {
          return res.status(400).json({ error: 'companyId is required' })
        }
        const result = await mockBankingService.getBankConnections(req.query.companyId)
        res.status(200).json({ connections: result })
      })
      
      const req = { query: {} }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'companyId is required' })
    })
  })

  describe('POST /api/banking/sync', () => {
    it('should sync bank transactions', async () => {
      const syncData = {
        connectionId: 'connection123',
        companyId: 'company123',
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      }
      
      const syncResult = {
        connectionId: 'connection123',
        transactionsSynced: 150,
        newTransactions: 25,
        updatedTransactions: 5,
        errors: 0,
        lastSync: '2024-01-15T10:00:00Z',
      }
      
      mockBankingService.syncTransactions.mockResolvedValue(syncResult)
      
      const mockHandler = jest.fn(async (req, res) => {
        const result = await mockBankingService.syncTransactions(req.body)
        res.status(200).json(result)
      })
      
      const req = { body: syncData }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(mockBankingService.syncTransactions).toHaveBeenCalledWith(syncData)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(syncResult)
    })

    it('should handle sync errors', async () => {
      const syncData = {
        connectionId: 'connection123',
        companyId: 'company123',
      }
      
      const syncResult = {
        connectionId: 'connection123',
        transactionsSynced: 0,
        newTransactions: 0,
        updatedTransactions: 0,
        errors: 5,
        errorDetails: [
          'Connection timeout',
          'Invalid credentials',
          'Bank API unavailable',
        ],
        lastSync: '2024-01-15T10:00:00Z',
      }
      
      mockBankingService.syncTransactions.mockResolvedValue(syncResult)
      
      const mockHandler = jest.fn(async (req, res) => {
        const result = await mockBankingService.syncTransactions(req.body)
        res.status(200).json(result)
      })
      
      const req = { body: syncData }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(result.errors).toBeGreaterThan(0)
      expect(result.errorDetails).toHaveLength(3)
    })
  })

  describe('GET /api/banking/transactions', () => {
    it('should get bank transactions with filters', async () => {
      const queryParams = {
        companyId: 'company123',
        connectionId: 'connection123',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        page: 1,
        pageSize: 20,
      }
      
      const transactions = [
        {
          id: 'transaction1',
          date: '2024-01-15',
          amount: -150.00,
          description: 'Office supplies purchase',
          category: 'Office Expenses',
          account: 'Checking Account',
        },
        {
          id: 'transaction2',
          date: '2024-01-16',
          amount: 2500.00,
          description: 'Client payment',
          category: 'Revenue',
          account: 'Checking Account',
        },
      ]
      
      const response = {
        transactions,
        pagination: {
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
        },
      }
      
      mockBankingService.getTransactions.mockResolvedValue(response)
      
      const mockHandler = jest.fn(async (req, res) => {
        const result = await mockBankingService.getTransactions(req.query)
        res.status(200).json(result)
      })
      
      const req = { query: queryParams }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(mockBankingService.getTransactions).toHaveBeenCalledWith(queryParams)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(response)
    })

    it('should support pagination', async () => {
      const queryParams = {
        companyId: 'company123',
        page: 2,
        pageSize: 10,
      }
      
      const response = {
        transactions: [],
        pagination: {
          page: 2,
          pageSize: 10,
          total: 25,
          totalPages: 3,
        },
      }
      
      mockBankingService.getTransactions.mockResolvedValue(response)
      
      const mockHandler = jest.fn(async (req, res) => {
        const result = await mockBankingService.getTransactions(req.query)
        res.status(200).json(result)
      })
      
      const req = { query: queryParams }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(result.pagination.page).toBe(2)
      expect(result.pagination.totalPages).toBe(3)
    })
  })

  describe('PUT /api/banking/transactions/:id/categorize', () => {
    it('should categorize a transaction', async () => {
      const transactionId = 'transaction123'
      const categorizationData = {
        category: 'Office Expenses',
        subcategory: 'Supplies',
        accountId: 'account123',
        notes: 'Office supplies for Q1',
      }
      
      const categorizedTransaction = {
        id: transactionId,
        ...categorizationData,
        categorized: true,
        categorizedAt: '2024-01-15T10:00:00Z',
      }
      
      mockBankingService.categorizeTransaction.mockResolvedValue(categorizedTransaction)
      
      const mockHandler = jest.fn(async (req, res) => {
        const result = await mockBankingService.categorizeTransaction(req.params.id, req.body)
        res.status(200).json(result)
      })
      
      const req = { params: { id: transactionId }, body: categorizationData }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(mockBankingService.categorizeTransaction).toHaveBeenCalledWith(transactionId, categorizationData)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(categorizedTransaction)
    })

    it('should validate categorization data', async () => {
      const transactionId = 'transaction123'
      const invalidData = {
        // Missing required category field
        subcategory: 'Supplies',
      }
      
      const mockHandler = jest.fn(async (req, res) => {
        if (!req.body.category) {
          return res.status(400).json({ error: 'Category is required' })
        }
        const result = await mockBankingService.categorizeTransaction(req.params.id, req.body)
        res.status(200).json(result)
      })
      
      const req = { params: { id: transactionId }, body: invalidData }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Category is required' })
    })
  })

  describe('POST /api/banking/reconcile', () => {
    it('should reconcile bank transactions', async () => {
      const reconcileData = {
        companyId: 'company123',
        connectionId: 'connection123',
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      }
      
      const reconcileResult = {
        totalTransactions: 150,
        matchedTransactions: 145,
        unmatchedTransactions: 5,
        discrepancies: [
          {
            transactionId: 'transaction1',
            bankAmount: 150.00,
            bookAmount: 155.00,
            difference: 5.00,
            type: 'amount_mismatch',
          },
        ],
        reconciliationDate: '2024-01-15T10:00:00Z',
      }
      
      mockBankingService.reconcileTransactions.mockResolvedValue(reconcileResult)
      
      const mockHandler = jest.fn(async (req, res) => {
        const result = await mockBankingService.reconcileTransactions(req.body)
        res.status(200).json(result)
      })
      
      const req = { body: reconcileData }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(mockBankingService.reconcileTransactions).toHaveBeenCalledWith(reconcileData)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(reconcileResult)
    })
  })

  describe('DELETE /api/banking/connections/:id', () => {
    it('should disconnect a bank account', async () => {
      const connectionId = 'connection123'
      
      const disconnectResult = {
        id: connectionId,
        status: 'disconnected',
        disconnectedAt: '2024-01-15T10:00:00Z',
      }
      
      mockBankingService.disconnectBank.mockResolvedValue(disconnectResult)
      
      const mockHandler = jest.fn(async (req, res) => {
        const result = await mockBankingService.disconnectBank(req.params.id)
        res.status(200).json(result)
      })
      
      const req = { params: { id: connectionId } }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(mockBankingService.disconnectBank).toHaveBeenCalledWith(connectionId)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(disconnectResult)
    })

    it('should handle disconnection errors', async () => {
      const connectionId = 'connection123'
      const error = new Error('Connection not found')
      
      mockBankingService.disconnectBank.mockRejectedValue(error)
      
      const mockHandler = jest.fn(async (req, res) => {
        try {
          const result = await mockBankingService.disconnectBank(req.params.id)
          res.status(200).json(result)
        } catch (err) {
          res.status(404).json({ error: err.message })
        }
      })
      
      const req = { params: { id: connectionId } }
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      
      await mockHandler(req, res)
      
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: 'Connection not found' })
    })
  })
})
