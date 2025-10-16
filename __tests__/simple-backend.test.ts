import { describe, it, expect } from '@jest/globals'

describe('Backend Test Setup', () => {
  it('should run basic backend tests', () => {
    expect(true).toBe(true)
  })

  it('should have access to test utilities', () => {
    // Test that our global test utilities are available
    expect(global.testUtils).toBeDefined()
    expect(global.testUtils.createMockUser).toBeDefined()
    expect(global.testUtils.createMockCompany).toBeDefined()
    expect(global.testUtils.createMockAccount).toBeDefined()
    expect(global.testUtils.createMockTransaction).toBeDefined()
  })

  it('should create mock user data', () => {
    const mockUser = global.testUtils.createMockUser()
    expect(mockUser).toHaveProperty('id')
    expect(mockUser).toHaveProperty('email')
    expect(mockUser).toHaveProperty('name')
    expect(mockUser).toHaveProperty('companyId')
    expect(mockUser.email).toBe('test@example.com')
  })

  it('should create mock company data', () => {
    const mockCompany = global.testUtils.createMockCompany()
    expect(mockCompany).toHaveProperty('id')
    expect(mockCompany).toHaveProperty('name')
    expect(mockCompany).toHaveProperty('settings')
    expect(mockCompany.name).toBe('Test Company')
  })

  it('should create mock account data', () => {
    const mockAccount = global.testUtils.createMockAccount()
    expect(mockAccount).toHaveProperty('id')
    expect(mockAccount).toHaveProperty('name')
    expect(mockAccount).toHaveProperty('code')
    expect(mockAccount).toHaveProperty('type')
    expect(mockAccount).toHaveProperty('companyId')
    expect(mockAccount.type).toBe('ASSET')
  })

  it('should create mock transaction data', () => {
    const mockTransaction = global.testUtils.createMockTransaction()
    expect(mockTransaction).toHaveProperty('id')
    expect(mockTransaction).toHaveProperty('amount')
    expect(mockTransaction).toHaveProperty('description')
    expect(mockTransaction).toHaveProperty('date')
    expect(mockTransaction).toHaveProperty('accountId')
    expect(mockTransaction).toHaveProperty('companyId')
    expect(mockTransaction.amount).toBe(100.00)
  })
})
