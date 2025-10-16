# Backend Testing Suite

This directory contains comprehensive tests for the UrutiIQ backend API, organized by component and functionality.

## 🧪 Test Structure

```
__tests__/
├── services/           # Service layer tests
│   ├── auth-service.test.ts
│   ├── accounting-service.test.ts
│   └── ai-service.test.ts
├── routes/             # API route tests
│   └── banking-routes.test.ts
├── api/                # API endpoint tests
│   ├── auth.test.ts
│   └── accounting.test.ts
├── backend-test-runner.ts  # Component-by-component test runner
└── README.md           # This file
```

## 🚀 Running Tests

### Component-by-Component Testing

```bash
# Run all tests component by component with detailed reporting
npm run test:component

# Run specific test suites
npm run test:services    # Service layer tests only
npm run test:routes      # Route tests only
npm run test:api         # API endpoint tests only
```

### Standard Jest Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run all tests with comprehensive reporting
npm run test:all
```

## 📋 Test Components

### 🔐 Authentication Service (`auth-service.test.ts`)

Tests the core authentication functionality:

- **Password Management**: Hashing, comparison, validation
- **Token Operations**: Generation, verification, expiration handling
- **Email Validation**: Format validation and edge cases
- **Password Security**: Strength requirements and validation
- **Authentication Flow**: Complete login/registration process

**Key Test Scenarios:**
- ✅ Valid password hashing and comparison
- ✅ JWT token generation and verification
- ✅ Email format validation
- ✅ Password strength validation
- ✅ Error handling for invalid credentials
- ✅ Token expiration handling

### 💰 Accounting Service (`accounting-service.test.ts`)

Tests the core accounting functionality:

- **Account Management**: CRUD operations for chart of accounts
- **Journal Entries**: Creation, validation, and retrieval
- **Financial Reports**: Trial balance, general ledger generation
- **Balance Calculations**: Account balance computations
- **Data Validation**: Account types, entry balancing

**Key Test Scenarios:**
- ✅ Account creation and management
- ✅ Journal entry creation with validation
- ✅ Balanced vs unbalanced entries
- ✅ Trial balance generation
- ✅ General ledger reporting
- ✅ Account balance calculations

### 🤖 AI Service (`ai-service.test.ts`)

Tests AI-powered features:

- **Transaction Categorization**: Automatic categorization with confidence scoring
- **Financial Insights**: Spending analysis and trend detection
- **Cash Flow Prediction**: Future cash flow forecasting
- **Expense Analysis**: Pattern recognition and anomaly detection
- **Natural Language Processing**: Query processing and intent recognition
- **Model Management**: Training, validation, and accuracy tracking

**Key Test Scenarios:**
- ✅ Transaction categorization with confidence scores
- ✅ Financial insights generation
- ✅ Cash flow predictions
- ✅ Expense pattern analysis
- ✅ Natural language query processing
- ✅ AI model training and validation

### 🏦 Banking Routes (`banking-routes.test.ts`)

Tests banking integration API endpoints:

- **Bank Connections**: Connect, disconnect, and manage bank accounts
- **Transaction Sync**: Synchronize transactions from banks
- **Transaction Management**: Retrieve, filter, and categorize transactions
- **Reconciliation**: Match bank transactions with book records
- **Error Handling**: Connection failures and sync errors

**Key Test Scenarios:**
- ✅ Bank account connection and disconnection
- ✅ Transaction synchronization
- ✅ Transaction filtering and pagination
- ✅ Transaction categorization
- ✅ Bank reconciliation
- ✅ Error handling and validation

### 🔑 Auth API (`auth.test.ts`)

Tests authentication API endpoints:

- **Login**: User authentication with credentials
- **Registration**: New user account creation
- **User Profile**: Retrieve authenticated user information
- **Validation**: Input validation and error handling

**Key Test Scenarios:**
- ✅ Successful login with valid credentials
- ✅ Login rejection with invalid credentials
- ✅ User registration with validation
- ✅ Duplicate email handling
- ✅ Password strength requirements
- ✅ Protected route access

### 📊 Accounting API (`accounting.test.ts`)

Tests accounting API endpoints:

- **Chart of Accounts**: Account management endpoints
- **Journal Entries**: Entry creation and retrieval
- **Financial Reports**: Trial balance and general ledger
- **Pagination**: Large dataset handling
- **Authentication**: Protected endpoint access

**Key Test Scenarios:**
- ✅ Chart of accounts CRUD operations
- ✅ Journal entry creation and validation
- ✅ Financial report generation
- ✅ Pagination and filtering
- ✅ Authentication requirements

## 🎯 Testing Strategy

### Component-by-Component Approach

The `backend-test-runner.ts` provides a systematic approach to testing:

1. **Priority-Based Testing**: High-priority components tested first
2. **Detailed Reporting**: Component-specific results and coverage
3. **Error Isolation**: Clear identification of failing components
4. **Coverage Tracking**: Individual component coverage metrics
5. **Recommendations**: Actionable insights for improvement

### Test Categories

- **Unit Tests**: Individual service functions
- **Integration Tests**: Service interactions
- **API Tests**: Endpoint functionality
- **Error Handling**: Exception scenarios
- **Edge Cases**: Boundary conditions

### Coverage Goals

- **Services**: 90%+ coverage for core business logic
- **Routes**: 85%+ coverage for API endpoints
- **Error Handling**: 100% coverage for error scenarios
- **Critical Paths**: 95%+ coverage for authentication and accounting

## 🔧 Configuration

### Jest Configuration (`jest.config.js`)

- **TypeScript Support**: Full TS integration with ts-jest
- **Coverage Thresholds**: 80% minimum coverage requirement
- **Test Environment**: Node.js environment for backend testing
- **Module Mapping**: Path aliasing for clean imports
- **Setup Files**: Global test configuration and mocks

### Test Setup (`jest.setup.js`)

- **Environment Variables**: Test-specific configuration
- **Service Mocks**: External service mocking (Redis, BullMQ, etc.)
- **Test Utilities**: Helper functions and mock data
- **Global Cleanup**: Test isolation and cleanup

## 📊 Reporting

### Test Results

The test runner generates comprehensive reports including:

- **Summary Statistics**: Total tests, pass/fail rates, duration
- **Component Breakdown**: Individual component results
- **Coverage Metrics**: Line, branch, and function coverage
- **Error Details**: Specific failure information
- **Recommendations**: Priority-based improvement suggestions

### Output Formats

- **Console Output**: Real-time test progress and results
- **JSON Report**: Machine-readable detailed report (`test-report.json`)
- **Coverage Reports**: HTML and LCOV coverage reports
- **CI Integration**: Exit codes for continuous integration

## 🚨 Troubleshooting

### Common Issues

1. **Test Dependencies**: Ensure all testing packages are installed
2. **Database Setup**: Configure test database for integration tests
3. **Environment Variables**: Set required test environment variables
4. **Mock Services**: Verify external service mocks are working

### Debug Mode

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- auth-service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create account"
```

## 📈 Continuous Improvement

### Test Maintenance

- **Regular Updates**: Keep tests in sync with code changes
- **Coverage Monitoring**: Track coverage trends over time
- **Performance Testing**: Monitor test execution times
- **Flaky Test Detection**: Identify and fix unreliable tests

### Best Practices

- **Test Isolation**: Each test should be independent
- **Mock External Dependencies**: Avoid real external service calls
- **Clear Test Names**: Descriptive test descriptions
- **Assertion Quality**: Meaningful assertions with clear error messages
- **Test Data Management**: Consistent test data setup and cleanup

## 🎉 Success Metrics

A healthy backend test suite should achieve:

- ✅ **95%+ Test Pass Rate**: Reliable test execution
- ✅ **85%+ Code Coverage**: Comprehensive code testing
- ✅ **< 5s Test Execution**: Fast feedback loop
- ✅ **Zero Flaky Tests**: Consistent test results
- ✅ **Clear Error Messages**: Actionable failure information

---

**Happy Testing! 🧪✨**
