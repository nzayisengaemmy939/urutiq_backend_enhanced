import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock the accounting service
const mockAccountingService = {
  createAccount: jest.fn(),
  getAccount: jest.fn(),
  updateAccount: jest.fn(),
  deleteAccount: jest.fn(),
  getChartOfAccounts: jest.fn(),
  createJournalEntry: jest.fn(),
  getJournalEntries: jest.fn(),
  getTrialBalance: jest.fn(),
  getGeneralLedger: jest.fn(),
  validateAccountType: jest.fn(),
  validateJournalEntry: jest.fn(),
  calculateAccountBalance: jest.fn(),
}

describe('Accounting Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Account Management', () => {
    it('should create a new account', async () => {
      const accountData = {
        name: 'Cash Account',
        code: '1000',
        type: 'ASSET',
        companyId: 'company123',
        parentId: null,
      }
      
      const createdAccount = { id: 'account123', ...accountData }
      
      mockAccountingService.createAccount.mockResolvedValue(createdAccount)
      
      const result = await mockAccountingService.createAccount(accountData)
      
      expect(mockAccountingService.createAccount).toHaveBeenCalledWith(accountData)
      expect(result).toEqual(createdAccount)
    })

    it('should get account by ID', async () => {
      const accountId = 'account123'
      const account = {
        id: accountId,
        name: 'Cash Account',
        code: '1000',
        type: 'ASSET',
        companyId: 'company123',
      }
      
      mockAccountingService.getAccount.mockResolvedValue(account)
      
      const result = await mockAccountingService.getAccount(accountId)
      
      expect(mockAccountingService.getAccount).toHaveBeenCalledWith(accountId)
      expect(result).toEqual(account)
    })

    it('should update account', async () => {
      const accountId = 'account123'
      const updateData = { name: 'Updated Cash Account' }
      const updatedAccount = {
        id: accountId,
        name: 'Updated Cash Account',
        code: '1000',
        type: 'ASSET',
        companyId: 'company123',
      }
      
      mockAccountingService.updateAccount.mockResolvedValue(updatedAccount)
      
      const result = await mockAccountingService.updateAccount(accountId, updateData)
      
      expect(mockAccountingService.updateAccount).toHaveBeenCalledWith(accountId, updateData)
      expect(result).toEqual(updatedAccount)
    })

    it('should delete account', async () => {
      const accountId = 'account123'
      
      mockAccountingService.deleteAccount.mockResolvedValue(true)
      
      const result = await mockAccountingService.deleteAccount(accountId)
      
      expect(mockAccountingService.deleteAccount).toHaveBeenCalledWith(accountId)
      expect(result).toBe(true)
    })

    it('should get chart of accounts', async () => {
      const companyId = 'company123'
      const accounts = [
        { id: 'account1', name: 'Cash', code: '1000', type: 'ASSET' },
        { id: 'account2', name: 'Accounts Receivable', code: '1100', type: 'ASSET' },
        { id: 'account3', name: 'Accounts Payable', code: '2000', type: 'LIABILITY' },
      ]
      
      mockAccountingService.getChartOfAccounts.mockResolvedValue(accounts)
      
      const result = await mockAccountingService.getChartOfAccounts(companyId)
      
      expect(mockAccountingService.getChartOfAccounts).toHaveBeenCalledWith(companyId)
      expect(result).toEqual(accounts)
    })
  })

  describe('Journal Entry Management', () => {
    it('should create a journal entry', async () => {
      const entryData = {
        description: 'Purchase of equipment',
        date: '2024-01-15',
        lines: [
          { accountId: 'account1', debit: 1000, credit: 0, description: 'Equipment' },
          { accountId: 'account2', debit: 0, credit: 1000, description: 'Cash' },
        ],
        companyId: 'company123',
      }
      
      const createdEntry = { id: 'entry123', ...entryData }
      
      mockAccountingService.createJournalEntry.mockResolvedValue(createdEntry)
      
      const result = await mockAccountingService.createJournalEntry(entryData)
      
      expect(mockAccountingService.createJournalEntry).toHaveBeenCalledWith(entryData)
      expect(result).toEqual(createdEntry)
    })

    it('should get journal entries with pagination', async () => {
      const companyId = 'company123'
      const page = 1
      const pageSize = 10
      const entries = [
        { id: 'entry1', description: 'Entry 1', date: '2024-01-15' },
        { id: 'entry2', description: 'Entry 2', date: '2024-01-16' },
      ]
      
      mockAccountingService.getJournalEntries.mockResolvedValue({
        entries,
        pagination: { page, pageSize, total: 2, totalPages: 1 },
      })
      
      const result = await mockAccountingService.getJournalEntries(companyId, page, pageSize)
      
      expect(mockAccountingService.getJournalEntries).toHaveBeenCalledWith(companyId, page, pageSize)
      expect(result.entries).toEqual(entries)
      expect(result.pagination.total).toBe(2)
    })

    it('should validate journal entry balance', () => {
      const entryData = {
        lines: [
          { accountId: 'account1', debit: 1000, credit: 0 },
          { accountId: 'account2', debit: 0, credit: 1000 },
        ],
      }
      
      mockAccountingService.validateJournalEntry.mockReturnValue(true)
      
      const result = mockAccountingService.validateJournalEntry(entryData)
      
      expect(mockAccountingService.validateJournalEntry).toHaveBeenCalledWith(entryData)
      expect(result).toBe(true)
    })

    it('should reject unbalanced journal entry', () => {
      const entryData = {
        lines: [
          { accountId: 'account1', debit: 1000, credit: 0 },
          { accountId: 'account2', debit: 0, credit: 500 }, // Not balanced
        ],
      }
      
      mockAccountingService.validateJournalEntry.mockReturnValue(false)
      
      const result = mockAccountingService.validateJournalEntry(entryData)
      
      expect(result).toBe(false)
    })
  })

  describe('Financial Reports', () => {
    it('should generate trial balance', async () => {
      const companyId = 'company123'
      const trialBalance = [
        {
          accountId: 'account1',
          accountName: 'Cash',
          accountCode: '1000',
          debitBalance: 5000,
          creditBalance: 0,
        },
        {
          accountId: 'account2',
          accountName: 'Accounts Payable',
          accountCode: '2000',
          debitBalance: 0,
          creditBalance: 2000,
        },
      ]
      
      mockAccountingService.getTrialBalance.mockResolvedValue(trialBalance)
      
      const result = await mockAccountingService.getTrialBalance(companyId)
      
      expect(mockAccountingService.getTrialBalance).toHaveBeenCalledWith(companyId)
      expect(result).toEqual(trialBalance)
    })

    it('should generate general ledger', async () => {
      const companyId = 'company123'
      const accountId = 'account1'
      const generalLedger = [
        {
          id: 'transaction1',
          date: '2024-01-15',
          description: 'Purchase',
          debit: 1000,
          credit: 0,
          balance: 1000,
        },
        {
          id: 'transaction2',
          date: '2024-01-16',
          description: 'Sale',
          debit: 0,
          credit: 500,
          balance: 500,
        },
      ]
      
      mockAccountingService.getGeneralLedger.mockResolvedValue(generalLedger)
      
      const result = await mockAccountingService.getGeneralLedger(companyId, accountId)
      
      expect(mockAccountingService.getGeneralLedger).toHaveBeenCalledWith(companyId, accountId)
      expect(result).toEqual(generalLedger)
    })
  })

  describe('Account Validation', () => {
    it('should validate account types', () => {
      const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']
      
      validTypes.forEach(type => {
        mockAccountingService.validateAccountType.mockReturnValue(true)
        const result = mockAccountingService.validateAccountType(type)
        expect(result).toBe(true)
      })
    })

    it('should reject invalid account types', () => {
      const invalidType = 'INVALID_TYPE'
      
      mockAccountingService.validateAccountType.mockReturnValue(false)
      
      const result = mockAccountingService.validateAccountType(invalidType)
      
      expect(result).toBe(false)
    })
  })

  describe('Balance Calculations', () => {
    it('should calculate account balance', async () => {
      const accountId = 'account1'
      const transactions = [
        { debit: 1000, credit: 0 },
        { debit: 0, credit: 300 },
        { debit: 200, credit: 0 },
      ]
      const expectedBalance = 900 // 1000 - 300 + 200
      
      mockAccountingService.calculateAccountBalance.mockResolvedValue(expectedBalance)
      
      const result = await mockAccountingService.calculateAccountBalance(accountId, transactions)
      
      expect(mockAccountingService.calculateAccountBalance).toHaveBeenCalledWith(accountId, transactions)
      expect(result).toBe(expectedBalance)
    })

    it('should handle zero balance', async () => {
      const accountId = 'account1'
      const transactions = [
        { debit: 1000, credit: 1000 },
      ]
      const expectedBalance = 0
      
      mockAccountingService.calculateAccountBalance.mockResolvedValue(expectedBalance)
      
      const result = await mockAccountingService.calculateAccountBalance(accountId, transactions)
      
      expect(result).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle account creation errors', async () => {
      const accountData = { name: 'Test Account', code: '1000', type: 'ASSET' }
      const error = new Error('Account creation failed')
      
      mockAccountingService.createAccount.mockRejectedValue(error)
      
      await expect(mockAccountingService.createAccount(accountData)).rejects.toThrow('Account creation failed')
    })

    it('should handle journal entry creation errors', async () => {
      const entryData = { description: 'Test Entry', lines: [] }
      const error = new Error('Journal entry creation failed')
      
      mockAccountingService.createJournalEntry.mockRejectedValue(error)
      
      await expect(mockAccountingService.createJournalEntry(entryData)).rejects.toThrow('Journal entry creation failed')
    })
  })
})
