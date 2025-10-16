import request from 'supertest'
import { app } from '../../src/app'

describe('Accounting API', () => {
  let authToken: string
  let companyId: string

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'demo@urutiq.com',
        password: 'demo123'
      })
    
    authToken = loginResponse.body.token
    companyId = loginResponse.body.user.companyId
  })

  describe('GET /api/accounting/chart-of-accounts', () => {
    it('should return chart of accounts', async () => {
      const response = await request(app)
        .get('/api/accounting/chart-of-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ companyId })
        .expect(200)

      expect(response.body).toHaveProperty('accounts')
      expect(Array.isArray(response.body.accounts)).toBe(true)
    })

    it('should require authentication', async () => {
      await request(app)
        .get('/api/accounting/chart-of-accounts')
        .query({ companyId })
        .expect(401)
    })

    it('should require companyId parameter', async () => {
      await request(app)
        .get('/api/accounting/chart-of-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)
    })
  })

  describe('POST /api/accounting/chart-of-accounts', () => {
    it('should create a new account', async () => {
      const accountData = {
        name: 'Test Account',
        code: '1000',
        type: 'ASSET',
        parentId: null,
        companyId
      }

      const response = await request(app)
        .post('/api/accounting/chart-of-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toBe(accountData.name)
      expect(response.body.code).toBe(accountData.code)
      expect(response.body.type).toBe(accountData.type)
    })

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/accounting/chart-of-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400)
    })

    it('should validate account type', async () => {
      const accountData = {
        name: 'Test Account',
        code: '1000',
        type: 'INVALID_TYPE',
        companyId
      }

      await request(app)
        .post('/api/accounting/chart-of-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData)
        .expect(400)
    })
  })

  describe('GET /api/accounting/journal-entries', () => {
    it('should return journal entries', async () => {
      const response = await request(app)
        .get('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ companyId })
        .expect(200)

      expect(response.body).toHaveProperty('entries')
      expect(Array.isArray(response.body.entries)).toBe(true)
    })

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          companyId,
          page: 1,
          pageSize: 10
        })
        .expect(200)

      expect(response.body).toHaveProperty('entries')
      expect(response.body).toHaveProperty('pagination')
      expect(response.body.pagination).toHaveProperty('page')
      expect(response.body.pagination).toHaveProperty('pageSize')
      expect(response.body.pagination).toHaveProperty('total')
    })
  })

  describe('POST /api/accounting/journal-entries', () => {
    it('should create a new journal entry', async () => {
      const entryData = {
        description: 'Test Journal Entry',
        date: '2024-01-15',
        lines: [
          {
            accountId: '1',
            debit: 100,
            credit: 0,
            description: 'Debit line'
          },
          {
            accountId: '2',
            debit: 0,
            credit: 100,
            description: 'Credit line'
          }
        ],
        companyId
      }

      const response = await request(app)
        .post('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(entryData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.description).toBe(entryData.description)
      expect(response.body.lines).toHaveLength(2)
    })

    it('should validate balanced entries', async () => {
      const entryData = {
        description: 'Unbalanced Entry',
        date: '2024-01-15',
        lines: [
          {
            accountId: '1',
            debit: 100,
            credit: 0,
            description: 'Debit line'
          },
          {
            accountId: '2',
            debit: 0,
            credit: 50, // Not balanced
            description: 'Credit line'
          }
        ],
        companyId
      }

      await request(app)
        .post('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(entryData)
        .expect(400)
    })

    it('should require at least two lines', async () => {
      const entryData = {
        description: 'Single Line Entry',
        date: '2024-01-15',
        lines: [
          {
            accountId: '1',
            debit: 100,
            credit: 0,
            description: 'Single line'
          }
        ],
        companyId
      }

      await request(app)
        .post('/api/accounting/journal-entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(entryData)
        .expect(400)
    })
  })

  describe('GET /api/accounting/trial-balance', () => {
    it('should return trial balance', async () => {
      const response = await request(app)
        .get('/api/accounting/trial-balance')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ companyId })
        .expect(200)

      expect(response.body).toHaveProperty('accounts')
      expect(Array.isArray(response.body.accounts)).toBe(true)
      
      // Each account should have debit and credit balances
      if (response.body.accounts.length > 0) {
        const account = response.body.accounts[0]
        expect(account).toHaveProperty('debitBalance')
        expect(account).toHaveProperty('creditBalance')
      }
    })

    it('should support date range filtering', async () => {
      const response = await request(app)
        .get('/api/accounting/trial-balance')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          companyId,
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .expect(200)

      expect(response.body).toHaveProperty('accounts')
    })
  })

  describe('GET /api/accounting/general-ledger', () => {
    it('should return general ledger', async () => {
      const response = await request(app)
        .get('/api/accounting/general-ledger')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ companyId })
        .expect(200)

      expect(response.body).toHaveProperty('transactions')
      expect(Array.isArray(response.body.transactions)).toBe(true)
    })

    it('should support account filtering', async () => {
      const response = await request(app)
        .get('/api/accounting/general-ledger')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          companyId,
          accountId: '1'
        })
        .expect(200)

      expect(response.body).toHaveProperty('transactions')
    })
  })
})
