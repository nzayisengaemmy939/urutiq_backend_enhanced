// Jest setup file for backend tests

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-key'
process.env.DATABASE_URL = 'file:./test.db'

// Mock external services
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  })),
}))

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => ({
    add: jest.fn(),
    process: jest.fn(),
    close: jest.fn(),
  })),
  Worker: jest.fn(() => ({
    close: jest.fn(),
  })),
}))

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
    verify: jest.fn(),
  })),
}))

jest.mock('stripe', () => ({
  Stripe: jest.fn(() => ({
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  })),
}))

// Global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'test-company-id',
  }),
  
  createMockCompany: () => ({
    id: 'test-company-id',
    name: 'Test Company',
    settings: {},
  }),
  
  createMockAccount: () => ({
    id: 'test-account-id',
    name: 'Test Account',
    code: '1000',
    type: 'ASSET',
    companyId: 'test-company-id',
  }),
  
  createMockTransaction: () => ({
    id: 'test-transaction-id',
    amount: 100.00,
    description: 'Test Transaction',
    date: new Date().toISOString(),
    accountId: 'test-account-id',
    companyId: 'test-company-id',
  }),
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})
