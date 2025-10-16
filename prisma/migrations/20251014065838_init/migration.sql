-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "taxId" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "fiscalYearStart" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "entityType" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#009688',
    "secondaryColor" TEXT DEFAULT '#1565c0',
    "fontFamily" TEXT DEFAULT 'Inter',
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "invoiceTemplate" TEXT DEFAULT 'modern',
    "invoiceFooter" TEXT,
    "invoiceTerms" TEXT,
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "showWebsite" BOOLEAN NOT NULL DEFAULT true,
    "showAddress" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AiAnomalyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "transactionId" TEXT,
    "anomalyType" TEXT NOT NULL,
    "confidenceScore" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'flagged',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiAnomalyLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AiAnomalyLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "insightText" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    CONSTRAINT "AiInsight_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "predictedValue" DECIMAL NOT NULL,
    "predictionDate" DATETIME NOT NULL,
    "confidenceLow" DECIMAL,
    "confidenceHigh" DECIMAL,
    CONSTRAINT "AiPrediction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "recommendationText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiRecommendation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiAuditTrail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "aiValidationResult" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiAuditTrail_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MfaMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "secret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MfaCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VoiceSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "voice" TEXT NOT NULL DEFAULT 'default',
    "speed" REAL NOT NULL DEFAULT 1.0,
    "volume" REAL NOT NULL DEFAULT 1.0,
    "wakeWord" TEXT NOT NULL DEFAULT 'hey urutiq',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VoiceSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "metadata" TEXT
);

-- CreateTable
CREATE TABLE "VoiceCommand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "intent" TEXT,
    "entities" TEXT,
    "confidence" REAL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RevenueRecognitionSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" DECIMAL NOT NULL,
    "recognizedAmount" DECIMAL NOT NULL DEFAULT 0,
    "recognitionDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CloseChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedBy" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RecurringJournalTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GoodsReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "poId" TEXT,
    "receiptNumber" TEXT NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'received',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CashFlowForecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "forecast" TEXT NOT NULL,
    "actual" TEXT,
    "accuracy" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxFiling" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "filedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JournalEntryLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL NOT NULL DEFAULT 0,
    "credit" DECIMAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProfitAndLoss" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totals" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CashFlowStatement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totals" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxJurisdiction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "locality" TEXT,
    "level" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxJurisdiction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "taxName" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "brackets" TEXT,
    "thresholds" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxRate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaxRate_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "formCode" TEXT NOT NULL,
    "formName" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "formId" TEXT,
    "taxYear" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "extendedDueDate" DATETIME,
    "status" TEXT NOT NULL,
    "filingMethod" TEXT NOT NULL,
    "submittedAt" DATETIME,
    "acceptedAt" DATETIME,
    "filedAt" DATETIME,
    "rejectionReason" TEXT,
    "formData" TEXT NOT NULL,
    "attachments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxForm_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaxForm_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "submissionId" TEXT,
    "status" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL,
    "acknowledgment" TEXT,
    "errors" TEXT,
    "response" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "TaxForm" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxCalendar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME NOT NULL,
    "formCodes" TEXT NOT NULL,
    "amount" DECIMAL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "reminderDays" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxCalendar_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaxCalendar_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "reminderDate" DATETIME NOT NULL,
    "reminderType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaxReminder_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "TaxCalendar" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxCalculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "taxRateId" TEXT NOT NULL,
    "transactionId" TEXT,
    "calculationType" TEXT NOT NULL,
    "baseAmount" DECIMAL NOT NULL,
    "taxAmount" DECIMAL NOT NULL,
    "effectiveRate" DECIMAL NOT NULL,
    "exemptions" TEXT,
    "metadata" TEXT,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jurisdiction" TEXT,
    "periodStart" DATETIME,
    "netTaxLiability" DECIMAL,
    "inputTax" DECIMAL,
    "outputTax" DECIMAL,
    "totalSales" DECIMAL,
    CONSTRAINT "TaxCalculation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TaxCalculation_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYearEnd" TEXT NOT NULL,
    "taxIdNumber" TEXT,
    "businessType" TEXT NOT NULL,
    "taxElections" TEXT,
    "defaultTaxTreatment" TEXT NOT NULL,
    "roundingMethod" TEXT NOT NULL,
    "roundingPrecision" INTEGER NOT NULL DEFAULT 2,
    "enableEstimatedTax" BOOLEAN NOT NULL DEFAULT false,
    "enableAutoCalculation" BOOLEAN NOT NULL DEFAULT true,
    "enableAutoFiling" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxConfiguration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "parameters" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "createdBy" TEXT,
    CONSTRAINT "Report_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountMapping_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccountMapping_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompanySetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompanySetting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'checking',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "routingNumber" TEXT,
    "swiftCode" TEXT,
    "iban" TEXT,
    "accountHolder" TEXT,
    "branchCode" TEXT,
    "branchName" TEXT,
    "lastSyncAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "connectionId" TEXT,
    "externalId" TEXT,
    "transactionDate" DATETIME NOT NULL,
    "postedDate" DATETIME,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "merchantName" TEXT,
    "merchantCategory" TEXT,
    "transactionType" TEXT NOT NULL,
    "reference" TEXT,
    "checkNumber" TEXT,
    "memo" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unreconciled',
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" DATETIME,
    "reconciledBy" TEXT,
    "matchedTransactionId" TEXT,
    "confidence" DECIMAL NOT NULL DEFAULT 0,
    "fees" DECIMAL NOT NULL DEFAULT 0,
    "bankConnectionId" TEXT,
    "date" DATETIME,
    "exchangeRate" DECIMAL,
    "originalAmount" DECIMAL,
    "originalCurrency" TEXT,
    "location" TEXT,
    "authorizationCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BankTransaction_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "bank_connections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BankTransaction_reconciledBy_fkey" FOREIGN KEY ("reconciledBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BankTransaction_matchedTransactionId_fkey" FOREIGN KEY ("matchedTransactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "transactionsFound" INTEGER NOT NULL DEFAULT 0,
    "transactionsImported" INTEGER NOT NULL DEFAULT 0,
    "transactionsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" TEXT,
    CONSTRAINT "BankSyncLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "bank_connections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankReconciliationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "conditions" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankReconciliationRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BankReconciliationRule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankReconciliationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "connectionId" TEXT,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "transactionsProcessed" INTEGER NOT NULL DEFAULT 0,
    "transactionsMatched" INTEGER NOT NULL DEFAULT 0,
    "transactionsUnmatched" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" TEXT,
    CONSTRAINT "BankReconciliationJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BankReconciliationJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "bank_connections" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DECIMAL NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "bankAccountId" TEXT,
    "bankTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "billId" TEXT,
    "amount" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentApplication_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentApplication_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentApplication_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT,
    "passwordSalt" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaBackupCodes" TEXT,
    "mfaEnabledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "accountType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "AccountType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntryType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "maxAmount" DECIMAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JournalEntryType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntryTypeAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "entryTypeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalEntryTypeAccount_entryTypeId_fkey" FOREIGN KEY ("entryTypeId") REFERENCES "JournalEntryType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalEntryTypeAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntryTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entryTypeId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT,
    "nextRunDate" DATETIME,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JournalEntryTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JournalEntryTemplate_entryTypeId_fkey" FOREIGN KEY ("entryTypeId") REFERENCES "JournalEntryType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntryTemplateLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debitFormula" TEXT,
    "creditFormula" TEXT,
    "memo" TEXT,
    "department" TEXT,
    "project" TEXT,
    "location" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalEntryTemplateLine_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "JournalEntryTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalEntryTemplateLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "entryTypeId" TEXT,
    "date" DATETIME NOT NULL,
    "memo" TEXT,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "JournalEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JournalEntry_entryTypeId_fkey" FOREIGN KEY ("entryTypeId") REFERENCES "JournalEntryType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL NOT NULL DEFAULT 0,
    "credit" DECIMAL NOT NULL DEFAULT 0,
    "memo" TEXT,
    "department" TEXT,
    "project" TEXT,
    "location" TEXT,
    CONSTRAINT "JournalLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntryApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JournalEntryApproval_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalEntryApproval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JournalEntryApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntryAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "comments" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalEntryAudit_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalEntryAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "journal_searches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "journal_searches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "transactionType" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "transactionDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "linkedJournalEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_linkedJournalEntryId_fkey" FOREIGN KEY ("linkedJournalEntryId") REFERENCES "JournalEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "taxNumber" TEXT,
    "address" TEXT,
    "customerCode" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'individual',
    "primaryContact" TEXT,
    "billingEmail" TEXT,
    "billingPhone" TEXT,
    "billingAddress" TEXT,
    "shippingAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "businessName" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "registrationNumber" TEXT,
    "creditLimit" DECIMAL,
    "paymentTerms" TEXT,
    "currency" TEXT,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "taxExemptionReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "customerTier" TEXT,
    "source" TEXT,
    "assignedTo" TEXT,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "preferredContactMethod" TEXT,
    "notes" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastContactAt" DATETIME,
    CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Customer_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "businessName" TEXT,
    "contactPerson" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "currency" TEXT DEFAULT 'USD',
    "paymentTerms" TEXT,
    "creditLimit" DECIMAL,
    "taxNumber" TEXT,
    "hasPortalAccess" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "preferredLanguage" TEXT DEFAULT 'en',
    "notes" TEXT,
    "tags" TEXT,
    "source" TEXT,
    "assignedTo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Client_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "department" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "addressType" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "activityDate" DATETIME NOT NULL,
    "performedBy" TEXT,
    "duration" INTEGER,
    "outcome" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerActivity_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "taxNumber" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vendor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL,
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL NOT NULL DEFAULT 0,
    "shippingAmount" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms" TEXT,
    "footer" TEXT,
    "paymentTerms" TEXT,
    "lateFeeRate" DECIMAL,
    "lateFeeAmount" DECIMAL NOT NULL DEFAULT 0,
    "collectionStatus" TEXT,
    "deliveryMethod" TEXT,
    "sentAt" DATETIME,
    "viewedAt" DATETIME,
    "lastViewedAt" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'none',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "estimateId" TEXT,
    "recurringInvoiceId" TEXT,
    "creditNoteId" TEXT,
    "refundAmount" DECIMAL NOT NULL DEFAULT 0,
    "refundStatus" TEXT,
    "customerCurrency" TEXT,
    "customerExchangeRate" DECIMAL,
    "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "taxExemptionReason" TEXT,
    "pdfGenerated" BOOLEAN NOT NULL DEFAULT false,
    "pdfGeneratedAt" DATETIME,
    "pdfUrl" TEXT,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_recurringInvoiceId_fkey" FOREIGN KEY ("recurringInvoiceId") REFERENCES "RecurringInvoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_lastModifiedBy_fkey" FOREIGN KEY ("lastModifiedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    "taxRate" DECIMAL NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL NOT NULL DEFAULT 0,
    "lineNumber" INTEGER,
    "productCode" TEXT,
    "unitOfMeasure" TEXT,
    "discountRate" DECIMAL NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL NOT NULL DEFAULT 0,
    "netAmount" DECIMAL NOT NULL DEFAULT 0,
    "taxCode" TEXT,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "taxExemptionReason" TEXT,
    "notes" TEXT,
    "deliveryDate" DATETIME,
    "warranty" TEXT,
    "costPrice" DECIMAL,
    "margin" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvoiceLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT,
    "performedBy" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceActivity_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvoiceActivity_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvoiceAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL,
    "sentBy" TEXT,
    "templateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "response" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvoiceReminder_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "estimateNumber" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "expiryDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "terms" TEXT,
    "validUntil" DATETIME,
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL NOT NULL DEFAULT 0,
    "exchangeRate" DECIMAL,
    "sentAt" DATETIME,
    "viewedAt" DATETIME,
    "lastViewedAt" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "convertedToInvoiceId" TEXT,
    "convertedAt" DATETIME,
    "conversionNotes" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'none',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "customerResponse" TEXT,
    "responseDate" DATETIME,
    "pdfGenerated" BOOLEAN NOT NULL DEFAULT false,
    "pdfGeneratedAt" DATETIME,
    "pdfUrl" TEXT,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Estimate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Estimate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Estimate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Estimate_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Estimate_lastModifiedBy_fkey" FOREIGN KEY ("lastModifiedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstimateLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    "taxRate" DECIMAL NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL NOT NULL DEFAULT 0,
    "lineNumber" INTEGER,
    "productCode" TEXT,
    "unitOfMeasure" TEXT,
    "discountRate" DECIMAL NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL NOT NULL DEFAULT 0,
    "netAmount" DECIMAL NOT NULL DEFAULT 0,
    "taxCode" TEXT,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "taxExemptionReason" TEXT,
    "notes" TEXT,
    "deliveryDate" DATETIME,
    "warranty" TEXT,
    "costPrice" DECIMAL,
    "margin" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimateLine_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EstimateLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstimateActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT,
    "performedBy" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimateActivity_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EstimateActivity_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstimateAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimateAttachment_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EstimateAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstimateReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL,
    "sentBy" TEXT,
    "templateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "response" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimateReminder_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EstimateReminder_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "nextRunDate" DATETIME NOT NULL,
    "lastRunDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "terms" TEXT,
    "dueDateOffset" INTEGER NOT NULL DEFAULT 30,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "emailTemplate" TEXT,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "businessDaysOnly" BOOLEAN NOT NULL DEFAULT false,
    "skipHolidays" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "skipIfOutstandingBalance" BOOLEAN NOT NULL DEFAULT false,
    "maxOutstandingAmount" DECIMAL,
    "skipIfCustomerInactive" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalWorkflowId" TEXT,
    "ccEmails" TEXT,
    "bccEmails" TEXT,
    "reminderDays" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringInvoiceLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "recurringInvoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    "taxRate" DECIMAL NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "RecurringInvoiceLine_recurringInvoiceId_fkey" FOREIGN KEY ("recurringInvoiceId") REFERENCES "RecurringInvoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "redirectUris" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OAuthClient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OAuthAuthorizationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT,
    "redirectUri" TEXT,
    "scopes" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OAuthAuthorizationCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient" ("clientId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OAuthAuthorizationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OAuthAccessToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME,
    CONSTRAINT "OAuthAccessToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient" ("clientId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OAuthAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OAuthRefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME,
    CONSTRAINT "OAuthRefreshToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient" ("clientId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OAuthRefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "lastUsedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "ApiKey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "apiKeyId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "requestSize" INTEGER,
    "responseSize" INTEGER,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiUsageLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApiUsageLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerformanceMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DECIMAL NOT NULL,
    "metricUnit" TEXT NOT NULL,
    "tags" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "billDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL NOT NULL DEFAULT 0,
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "attachments" TEXT,
    "purchaseType" TEXT NOT NULL DEFAULT 'local',
    "vendorCurrency" TEXT,
    "exchangeRate" DECIMAL,
    "freightCost" DECIMAL NOT NULL DEFAULT 0,
    "customsDuty" DECIMAL NOT NULL DEFAULT 0,
    "otherImportCosts" DECIMAL NOT NULL DEFAULT 0,
    "landedCostAllocated" BOOLEAN NOT NULL DEFAULT false,
    "journalEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "purchaseOrderId" TEXT,
    "invoiceCaptureId" TEXT,
    CONSTRAINT "Bill_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bill_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bill_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bill_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bill_invoiceCaptureId_fkey" FOREIGN KEY ("invoiceCaptureId") REFERENCES "InvoiceCapture" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceCapture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'captured',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "rawData" TEXT,
    "attachments" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processedAt" DATETIME,
    "approvedAt" DATETIME,
    "paidAt" DATETIME,
    CONSTRAINT "InvoiceCapture_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvoiceCapture_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceMatching" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "goodsReceivedNoteId" TEXT,
    "matchingType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "matchScore" DECIMAL,
    "discrepancies" TEXT,
    "matchedBy" TEXT,
    "matchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceMatching_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvoiceMatching_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "InvoiceCapture" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvoiceMatching_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InvoiceMatching_goodsReceivedNoteId_fkey" FOREIGN KEY ("goodsReceivedNoteId") REFERENCES "GoodsReceivedNote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoodsReceivedNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receivedDate" DATETIME NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "notes" TEXT,
    "attachments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoodsReceivedNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GoodsReceivedNote_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approvalLevel" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "comments" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceApproval_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvoiceApproval_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "InvoiceCapture" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "amount" DECIMAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "earlyPaymentDiscount" DECIMAL NOT NULL DEFAULT 0,
    "latePaymentPenalty" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentSchedule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentSchedule_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentSchedule_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "APReconciliation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reconciliationDate" DATETIME NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalOutstanding" DECIMAL NOT NULL DEFAULT 0,
    "totalReconciled" DECIMAL NOT NULL DEFAULT 0,
    "discrepancies" TEXT,
    "reconciledBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "APReconciliation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "APReconciliationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "expectedAmount" DECIMAL NOT NULL,
    "actualAmount" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "discrepancy" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "APReconciliationItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "APReconciliationItem_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "APReconciliation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "APReconciliationItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "APWorkflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "workflowSteps" TEXT NOT NULL,
    "approvalThresholds" TEXT,
    "autoApprovalRules" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "APWorkflow_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "APWorkflowInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "APWorkflowInstance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "APWorkflowInstance_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "APWorkflow" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "APWorkflowInstance_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "InvoiceCapture" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "APWorkflowStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepType" TEXT NOT NULL,
    "assignedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "APWorkflowStep_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "APWorkflowStep_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "APWorkflowInstance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "orderDate" DATETIME NOT NULL,
    "expectedDelivery" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "terms" TEXT,
    "approvalWorkflow" TEXT,
    "receivingStatus" TEXT NOT NULL DEFAULT 'pending',
    "purchaseType" TEXT NOT NULL DEFAULT 'local',
    "vendorCurrency" TEXT,
    "exchangeRate" DECIMAL,
    "freightCost" DECIMAL NOT NULL DEFAULT 0,
    "customsDuty" DECIMAL NOT NULL DEFAULT 0,
    "otherImportCosts" DECIMAL NOT NULL DEFAULT 0,
    "landedCostAllocated" BOOLEAN NOT NULL DEFAULT false,
    "incoterms" TEXT,
    "shippingMethod" TEXT,
    "originCountry" TEXT,
    "destinationCountry" TEXT,
    "portOfEntry" TEXT,
    "importLicense" TEXT,
    "customsDeclaration" TEXT,
    "billOfLading" TEXT,
    "commercialInvoice" TEXT,
    "packingList" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "relatedBillId" TEXT,
    CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_relatedBillId_fkey" FOREIGN KEY ("relatedBillId") REFERENCES "Bill" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    "taxRate" DECIMAL NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL NOT NULL DEFAULT 0,
    "receivedQuantity" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "receivedDate" DATETIME NOT NULL,
    "receivedBy" TEXT,
    "notes" TEXT,
    "qualityCheck" TEXT,
    "partialReceipt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Receipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "purchaseOrderLineId" TEXT,
    "productId" TEXT,
    "description" TEXT,
    "quantityReceived" DECIMAL NOT NULL DEFAULT 0,
    "quantityAccepted" DECIMAL NOT NULL DEFAULT 0,
    "quantityRejected" DECIMAL NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    CONSTRAINT "ReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportShipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "shipmentDate" DATETIME NOT NULL,
    "expectedArrival" DATETIME,
    "actualArrival" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "containerNumber" TEXT,
    "vesselFlight" TEXT,
    "customsBroker" TEXT,
    "customsEntryDate" DATETIME,
    "customsReleaseDate" DATETIME,
    "dutiesPaid" DECIMAL NOT NULL DEFAULT 0,
    "taxesPaid" DECIMAL NOT NULL DEFAULT 0,
    "billOfLading" TEXT,
    "commercialInvoice" TEXT,
    "packingList" TEXT,
    "certificateOfOrigin" TEXT,
    "insuranceCertificate" TEXT,
    "freightCost" DECIMAL NOT NULL DEFAULT 0,
    "insuranceCost" DECIMAL NOT NULL DEFAULT 0,
    "customsFees" DECIMAL NOT NULL DEFAULT 0,
    "storageCost" DECIMAL NOT NULL DEFAULT 0,
    "otherCosts" DECIMAL NOT NULL DEFAULT 0,
    "totalLandedCost" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "issues" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportShipment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImportShipment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "importShipmentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "documents" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomsEvent_importShipmentId_fkey" FOREIGN KEY ("importShipmentId") REFERENCES "ImportShipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "taxTreatment" TEXT,
    "approvalThreshold" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpenseCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ExpenseCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "period" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "spentAmount" DECIMAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "alertThreshold" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Budget_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpenseRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "conditions" TEXT,
    "autoApproval" BOOLEAN NOT NULL DEFAULT false,
    "escalationRules" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApprovalWorkflow_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "comments" TEXT,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "escalationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Approval_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Approval_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    "taxRate" DECIMAL NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "BillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "accountId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "BillLineItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BillLineItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "amount" DECIMAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "journalEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BillPayment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BillPayment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PRODUCT',
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    "costPrice" DECIMAL NOT NULL DEFAULT 0,
    "sellingPrice" DECIMAL,
    "stockQuantity" DECIMAL NOT NULL DEFAULT 0,
    "reservedQuantity" DECIMAL NOT NULL DEFAULT 0,
    "availableQuantity" DECIMAL NOT NULL DEFAULT 0,
    "minStockLevel" DECIMAL,
    "maxStockLevel" DECIMAL,
    "reorderPoint" DECIMAL,
    "reorderQuantity" DECIMAL,
    "reorderLevel" DECIMAL,
    "unit" TEXT,
    "lastPurchaseDate" DATETIME,
    "categoryId" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "tags" TEXT,
    "weight" DECIMAL,
    "dimensionsLength" DECIMAL,
    "dimensionsWidth" DECIMAL,
    "dimensionsHeight" DECIMAL,
    "dimensionsString" TEXT,
    "barcode" TEXT,
    "qrCode" TEXT,
    "trackSerialNumbers" BOOLEAN NOT NULL DEFAULT false,
    "trackBatches" BOOLEAN NOT NULL DEFAULT false,
    "costingMethod" TEXT DEFAULT 'FIFO',
    "taxRate" DECIMAL,
    "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "taxCode" TEXT,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "isDigital" BOOLEAN NOT NULL DEFAULT false,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "isPhysical" BOOLEAN NOT NULL DEFAULT true,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "allowBackorder" BOOLEAN NOT NULL DEFAULT false,
    "allowPreorder" BOOLEAN NOT NULL DEFAULT false,
    "preorderDate" DATETIME,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "warrantyPeriod" DECIMAL,
    "warrantyUnit" TEXT,
    "returnPolicy" TEXT,
    "shippingClass" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "metaKeywords" TEXT,
    "images" TEXT,
    "variants" TEXT,
    "relatedProducts" TEXT,
    "upsellProducts" TEXT,
    "crossSellProducts" TEXT,
    "customFields" TEXT,
    "visibility" TEXT DEFAULT 'public',
    "customField1" TEXT,
    "customField2" TEXT,
    "customField3" TEXT,
    "customField4" TEXT,
    "requiresLicense" BOOLEAN NOT NULL DEFAULT false,
    "hasExpiryDate" BOOLEAN NOT NULL DEFAULT false,
    "isBundle" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT,
    "movementType" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unitCost" DECIMAL,
    "movementDate" DATETIME NOT NULL,
    "reference" TEXT,
    "reason" TEXT,
    CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'warehouse',
    "locationType" TEXT DEFAULT 'WAREHOUSE',
    "address" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "timezone" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "managerName" TEXT,
    "managerEmail" TEXT,
    "managerPhone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "capacity" TEXT,
    "operatingHours" TEXT,
    "specialInstructions" TEXT,
    "warehouseZone" TEXT,
    "temperatureControlled" BOOLEAN NOT NULL DEFAULT false,
    "securityLevel" TEXT DEFAULT 'STANDARD',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Location_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 0,
    "reservedQuantity" DECIMAL NOT NULL DEFAULT 0,
    "reorderPoint" DECIMAL,
    "maxQuantity" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductLocation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReorderAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT,
    "alertType" TEXT NOT NULL,
    "threshold" DECIMAL NOT NULL,
    "currentStock" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReorderAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReorderAlert_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlertSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "overstockThreshold" INTEGER NOT NULL DEFAULT 100,
    "criticalStockThreshold" INTEGER NOT NULL DEFAULT 1,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "dashboardAlerts" BOOLEAN NOT NULL DEFAULT true,
    "autoAcknowledgeDays" INTEGER NOT NULL DEFAULT 7,
    "dailyDigestTime" TEXT NOT NULL DEFAULT '09:00',
    "weeklySummaryDay" TEXT NOT NULL DEFAULT 'MONDAY',
    "weeklySummaryTime" TEXT NOT NULL DEFAULT '08:00',
    "immediateAlerts" BOOLEAN NOT NULL DEFAULT true,
    "immediateAlertsCriticalOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "transferDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "notes" TEXT,
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "completedBy" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryTransfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InventoryTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientPortalAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "permissions" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAccess" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientPortalAccess_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientPortalAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClientPortalAccess_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Workspace_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "folderId" TEXT,
    "categoryId" TEXT,
    "displayName" TEXT,
    "description" TEXT,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME,
    CONSTRAINT "FileAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FileAsset_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FileAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FileAsset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Message_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "documentId" TEXT NOT NULL,
    "sharedWith" TEXT,
    "clientId" TEXT,
    "sharedBy" TEXT,
    "permissions" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "message" TEXT,
    "sharedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "viewedAt" DATETIME,
    "downloadedAt" DATETIME,
    CONSTRAINT "DocumentShare_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentShare_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FileAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocumentShare_sharedWith_fkey" FOREIGN KEY ("sharedWith") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentShare_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentShare_sharedBy_fkey" FOREIGN KEY ("sharedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentWorkflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "documentId" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedTo" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "comments" TEXT,
    "metadata" TEXT,
    CONSTRAINT "DocumentWorkflow_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentWorkflow_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FileAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocumentWorkflow_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentActivity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentActivity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FileAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocumentActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentAccessControl" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "documentId" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "userGroups" TEXT NOT NULL,
    "timeRestrictions" TEXT,
    "ipRestrictions" TEXT NOT NULL,
    "mfaRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentAccessControl_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentAccessControl_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FileAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocumentAccessControl_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentWebhook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "documentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "headers" TEXT,
    "retryPolicy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "DocumentWebhook_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentWebhook_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FileAsset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocumentWebhook_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "webhookId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "DocumentWebhook" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "documentIds" TEXT NOT NULL,
    "complianceRules" TEXT NOT NULL,
    "ruleId" TEXT,
    "schedule" TEXT NOT NULL,
    "notifications" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "ComplianceCheck_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ComplianceCheck_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceCheckResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "complianceCheckId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceCheckResult_complianceCheckId_fkey" FOREIGN KEY ("complianceCheckId") REFERENCES "ComplianceCheck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomatedReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "reportType" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'pdf',
    "filters" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" DATETIME,
    "nextRun" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "AutomatedReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AutomatedReport_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportGeneration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "automatedReportId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "filePath" TEXT,
    "fileSize" INTEGER,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportGeneration_automatedReportId_fkey" FOREIGN KEY ("automatedReportId") REFERENCES "AutomatedReport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    CONSTRAINT "FinancialReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinancialReport_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "configuration" TEXT,
    "formula" TEXT,
    "accountIds" TEXT,
    CONSTRAINT "ReportItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FinancialReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "nextRun" DATETIME NOT NULL,
    "recipients" TEXT,
    "format" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportSchedule_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FinancialReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "configuration" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "executedBy" TEXT NOT NULL,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parameters" TEXT,
    "result" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    CONSTRAINT "ReportExecution_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FinancialReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportExecution_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "filters" TEXT NOT NULL,
    "columns" TEXT NOT NULL,
    "grouping" TEXT,
    "sorting" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomReport_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "configType" TEXT NOT NULL,
    "configData" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'training',
    "accuracy" DECIMAL,
    "precision" DECIMAL,
    "recall" DECIMAL,
    "f1Score" DECIMAL,
    "modelPath" TEXT,
    "hyperparameters" TEXT,
    "featureColumns" TEXT,
    "targetColumn" TEXT,
    "trainingDataSize" INTEGER,
    "validationDataSize" INTEGER,
    "trainingStartTime" DATETIME,
    "trainingEndTime" DATETIME,
    "lastUsedAt" DATETIME,
    "experimentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIModel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIModel_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "AIExperiment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIModelTrainingRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "runName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "epochs" INTEGER,
    "batchSize" INTEGER,
    "learningRate" DECIMAL,
    "loss" DECIMAL,
    "validationLoss" DECIMAL,
    "accuracy" DECIMAL,
    "validationAccuracy" DECIMAL,
    "hyperparameters" TEXT,
    "trainingMetrics" TEXT,
    "validationMetrics" TEXT,
    "errorMessage" TEXT,
    "logs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIModelTrainingRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIModelTrainingRun_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIModelPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "inputData" TEXT NOT NULL,
    "prediction" TEXT NOT NULL,
    "confidence" DECIMAL,
    "probability" DECIMAL,
    "actualValue" TEXT,
    "isCorrect" BOOLEAN,
    "error" DECIMAL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    CONSTRAINT "AIModelPrediction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIModelPrediction_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIModelFeatureImportance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "importance" DECIMAL NOT NULL,
    "rank" INTEGER,
    "method" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIModelFeatureImportance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIModelFeatureImportance_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIDataPipeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "pipelineName" TEXT NOT NULL,
    "pipelineType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "schedule" TEXT,
    "lastRunAt" DATETIME,
    "nextRunAt" DATETIME,
    "config" TEXT NOT NULL,
    "sourceTables" TEXT,
    "targetTables" TEXT,
    "transformations" TEXT,
    "validationRules" TEXT,
    "errorHandling" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIDataPipeline_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIDataPipelineRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "recordsProcessed" INTEGER,
    "recordsFailed" INTEGER,
    "recordsSkipped" INTEGER,
    "inputSize" INTEGER,
    "outputSize" INTEGER,
    "errorMessage" TEXT,
    "logs" TEXT,
    "metrics" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIDataPipelineRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIDataPipelineRun_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "AIDataPipeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIDataQuality" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "columnName" TEXT,
    "qualityMetric" TEXT NOT NULL,
    "metricValue" DECIMAL NOT NULL,
    "threshold" DECIMAL,
    "status" TEXT NOT NULL,
    "checkDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataSample" TEXT,
    "issues" TEXT,
    "recommendations" TEXT,
    CONSTRAINT "AIDataQuality_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIPerformanceMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "modelId" TEXT,
    "metricType" TEXT NOT NULL,
    "metricValue" DECIMAL NOT NULL,
    "metricDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeWindow" TEXT,
    "comparisonValue" DECIMAL,
    "trend" TEXT,
    "context" TEXT,
    CONSTRAINT "AIPerformanceMetrics_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIPerformanceMetrics_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AILearningFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "modelId" TEXT,
    "predictionId" TEXT,
    "feedbackType" TEXT NOT NULL,
    "feedbackData" TEXT NOT NULL,
    "isPositive" BOOLEAN,
    "confidence" DECIMAL,
    "impact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AILearningFeedback_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AILearningFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AILearningFeedback_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AILearningFeedback_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "AIModelPrediction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIDriftDetection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "modelId" TEXT,
    "driftType" TEXT NOT NULL,
    "featureName" TEXT,
    "baselineValue" DECIMAL NOT NULL,
    "currentValue" DECIMAL NOT NULL,
    "driftScore" DECIMAL NOT NULL,
    "threshold" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "detectionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampleData" TEXT,
    "analysis" TEXT,
    "recommendations" TEXT,
    CONSTRAINT "AIDriftDetection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIDriftDetection_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIExperiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "experimentName" TEXT NOT NULL,
    "description" TEXT,
    "objective" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "hypothesis" TEXT,
    "methodology" TEXT,
    "baselineModel" TEXT,
    "currentModel" TEXT,
    "successMetrics" TEXT,
    "results" TEXT,
    "conclusions" TEXT,
    "nextSteps" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIExperiment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIDeployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "deploymentName" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'deploying',
    "deploymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activationDate" DATETIME,
    "deactivationDate" DATETIME,
    "endpoint" TEXT,
    "version" TEXT NOT NULL,
    "config" TEXT,
    "healthCheck" TEXT,
    "performance" TEXT,
    "rollbackReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIDeployment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIDeployment_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIGovernance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "policyName" TEXT NOT NULL,
    "policyType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "rules" TEXT NOT NULL,
    "thresholds" TEXT,
    "monitoring" TEXT,
    "alerts" TEXT,
    "compliance" TEXT,
    "lastReviewDate" DATETIME,
    "nextReviewDate" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIGovernance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIGovernance_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIGovernanceViolation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "modelId" TEXT,
    "violationType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedAt" DATETIME,
    "resolvedBy" TEXT,
    "actionTaken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIGovernanceViolation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIGovernanceViolation_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "AIGovernance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIGovernanceViolation_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIGovernanceViolation_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "currency_rates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'external_api'
);

-- CreateTable
CREATE TABLE "payment_processor_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "clientSecret" TEXT,
    "paymentMethodId" TEXT,
    "customerId" TEXT,
    "description" TEXT,
    "metadata" TEXT NOT NULL,
    "processor" TEXT NOT NULL,
    "processorTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "last4" TEXT,
    "brand" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "bankName" TEXT,
    "accountType" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT,
    "processor" TEXT NOT NULL,
    "processorPaymentMethodId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payment_customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "processor" TEXT NOT NULL,
    "processorCustomerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "bank_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerConnectionId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "routingNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextSyncAt" DATETIME,
    "syncFrequency" TEXT NOT NULL DEFAULT 'daily',
    "credentials" TEXT,
    "bankId" TEXT,
    "currency" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bank_connections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mobile_money_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mobile_money_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "externalReference" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "recipientPhoneNumber" TEXT,
    "recipientName" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fees" REAL NOT NULL DEFAULT 0,
    "netAmount" REAL NOT NULL,
    "metadata" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "card_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unmatched',
    "matchedExpenseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "card_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "card_exceptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "card_exceptions_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "card_transactions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "card_exceptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "expenseDate" DATETIME NOT NULL,
    "categoryId" TEXT,
    "vendorId" TEXT,
    "vendorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "receiptUrl" TEXT,
    "notes" TEXT,
    "department" TEXT,
    "project" TEXT,
    "accountId" TEXT,
    "referenceNumber" TEXT,
    "paymentMethod" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" REAL NOT NULL DEFAULT 1.0,
    "taxRate" REAL,
    "taxAmount" REAL,
    "isBillable" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPeriod" TEXT,
    "nextRecurringDate" DATETIME,
    "mileage" REAL,
    "mileageRate" REAL,
    "submittedBy" TEXT,
    "approvedBy" TEXT,
    "paidBy" TEXT,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "paidAt" DATETIME,
    "splitAccountId" TEXT,
    "attachments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "expenses_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "expenses_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fixed_asset_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "usefulLifeMonths" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "salvageRate" REAL NOT NULL DEFAULT 0,
    "assetAccountId" TEXT,
    "depreciationExpenseId" TEXT,
    "accumulatedDepreciationId" TEXT,
    "disposalGainId" TEXT,
    "disposalLossId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fixed_asset_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "acquisitionDate" TEXT NOT NULL,
    "startDepreciation" TEXT NOT NULL,
    "salvageValue" REAL,
    "notes" TEXT,
    "disposedAt" TEXT,
    "disposalProceeds" REAL,
    "disposalAccountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fixed_assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixed_assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fixed_asset_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fixed_asset_depreciations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "accumulated" REAL NOT NULL,
    "postedAt" DATETIME,
    "journalEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fixed_asset_depreciations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixed_asset_depreciations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fixed_assets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fixed_asset_depreciations_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "invoiceId" TEXT,
    "customerId" TEXT,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "reason" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL NOT NULL DEFAULT 0,
    "exchangeRate" DECIMAL,
    "sentAt" DATETIME,
    "viewedAt" DATETIME,
    "lastViewedAt" DATETIME,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "rejectedAt" DATETIME,
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "appliedAt" DATETIME,
    "appliedBy" TEXT,
    "appliedToInvoiceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "credit_notes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "credit_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "credit_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "credit_notes_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "credit_notes_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "credit_notes_appliedBy_fkey" FOREIGN KEY ("appliedBy") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "credit_note_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "taxRate" DECIMAL NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL NOT NULL DEFAULT 0,
    "discountRate" DECIMAL NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL NOT NULL DEFAULT 0,
    "productId" TEXT,
    "serviceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "credit_note_lines_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "credit_notes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ocr_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "vendor" TEXT,
    "amount" DECIMAL,
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ocr_receipts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "currency_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "targetRate" REAL NOT NULL,
    "condition" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "budget_dimensions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "budget_scenarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "budget_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "periodType" TEXT NOT NULL,
    "frequency" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "budget_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "knowledge_articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "helpful" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "authorId" TEXT,
    "authorName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "assignedTo" TEXT,
    "assignedToName" TEXT,
    "resolution" TEXT,
    "attachments" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tutorials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "rating" REAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "thumbnail" TEXT,
    "videoUrl" TEXT,
    "content" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "community_discussions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "budget_line_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "budgetId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "plannedAmount" DECIMAL NOT NULL,
    "actualAmount" DECIMAL NOT NULL DEFAULT 0,
    "variance" DECIMAL NOT NULL DEFAULT 0,
    "variancePercent" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "rolling_forecasts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePeriod" TEXT NOT NULL,
    "forecastPeriods" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "file_storage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "mongoFileId" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedBy" TEXT NOT NULL,
    "uploadedByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "file_access" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME
);

-- CreateTable
CREATE TABLE "tutorial_videos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "thumbnailUrl" TEXT,
    "videoFileId" TEXT NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tutorial_video_views" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER
);

-- CreateTable
CREATE TABLE "tutorial_video_ratings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "ratedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "unified_approval_workflows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "entitySubType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "steps" TEXT NOT NULL,
    "conditions" TEXT,
    "autoApproval" BOOLEAN NOT NULL DEFAULT false,
    "escalationRules" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "unified_approval_workflows_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "unified_approval_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entitySubType" TEXT,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL,
    "completedSteps" INTEGER NOT NULL DEFAULT 0,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "cancelledAt" DATETIME,
    "comments" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "unified_approval_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "unified_approval_requests_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "unified_approval_workflows" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "unified_approval_assignees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "comments" TEXT,
    "escalatedTo" TEXT,
    "escalationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "unified_approval_assignees_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "unified_approval_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "unified_approval_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "unified_approval_audits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "stepId" TEXT,
    "stepName" TEXT,
    "comments" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unified_approval_audits_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "unified_approval_requests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "unified_approval_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "entitySubType" TEXT,
    "templateData" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "unified_approval_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "unified_approval_notification_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationChannels" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "teamsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "unified_approval_notification_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "unified_approval_notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetAmount" DECIMAL NOT NULL,
    "currentAmount" DECIMAL NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" DECIMAL NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialGoal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "achievedAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialMilestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "FinancialGoal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialAdvice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "actionable" BOOLEAN NOT NULL DEFAULT true,
    "estimatedImpact" TEXT NOT NULL,
    "confidence" DECIMAL NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialAdvice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EducationalContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "estimatedTime" INTEGER NOT NULL,
    "tags" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LearningProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" DECIMAL NOT NULL DEFAULT 0,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "quizScore" DECIMAL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningProgress_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LearningProgress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "EducationalContent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "assumptions" TEXT NOT NULL,
    "projections" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialScenario_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "topics" TEXT NOT NULL,
    "advice" TEXT NOT NULL,
    "goals" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutoBookkeeperConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoCategorization" BOOLEAN NOT NULL DEFAULT true,
    "autoReconciliation" BOOLEAN NOT NULL DEFAULT true,
    "autoJournalEntry" BOOLEAN NOT NULL DEFAULT false,
    "confidenceThreshold" DECIMAL NOT NULL DEFAULT 0.8,
    "rules" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutoBookkeeperConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionCategorization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "confidence" DECIMAL NOT NULL DEFAULT 0,
    "aiSuggestions" TEXT,
    "userConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransactionCategorization_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutoReconciliation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "internalTransactionId" TEXT,
    "matchType" TEXT NOT NULL,
    "confidence" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutoReconciliation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Company_tenantId_idx" ON "Company"("tenantId");

-- CreateIndex
CREATE INDEX "AiAnomalyLog_tenantId_companyId_idx" ON "AiAnomalyLog"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AiInsight_tenantId_companyId_idx" ON "AiInsight"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AiPrediction_tenantId_companyId_predictionDate_idx" ON "AiPrediction"("tenantId", "companyId", "predictionDate");

-- CreateIndex
CREATE INDEX "AiRecommendation_tenantId_companyId_idx" ON "AiRecommendation"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AiAuditTrail_tenantId_companyId_timestamp_idx" ON "AiAuditTrail"("tenantId", "companyId", "timestamp");

-- CreateIndex
CREATE INDEX "BankRule_tenantId_companyId_idx" ON "BankRule"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "MfaMethod_userId_tenantId_idx" ON "MfaMethod"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "MfaCode_userId_tenantId_idx" ON "MfaCode"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "VoiceSettings_userId_tenantId_companyId_idx" ON "VoiceSettings"("userId", "tenantId", "companyId");

-- CreateIndex
CREATE INDEX "VoiceSession_userId_tenantId_companyId_idx" ON "VoiceSession"("userId", "tenantId", "companyId");

-- CreateIndex
CREATE INDEX "VoiceCommand_userId_tenantId_companyId_sessionId_idx" ON "VoiceCommand"("userId", "tenantId", "companyId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_tenantId_companyId_key_key" ON "Setting"("tenantId", "companyId", "key");

-- CreateIndex
CREATE INDEX "RevenueRecognitionSchedule_tenantId_companyId_idx" ON "RevenueRecognitionSchedule"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "CloseChecklistItem_tenantId_companyId_periodId_idx" ON "CloseChecklistItem"("tenantId", "companyId", "periodId");

-- CreateIndex
CREATE INDEX "RecurringJournalTemplate_tenantId_companyId_idx" ON "RecurringJournalTemplate"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "GoodsReceipt_tenantId_companyId_idx" ON "GoodsReceipt"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "CashFlowForecast_tenantId_companyId_period_idx" ON "CashFlowForecast"("tenantId", "companyId", "period");

-- CreateIndex
CREATE INDEX "TaxFiling_tenantId_companyId_idx" ON "TaxFiling"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "JournalEntryLine_tenantId_companyId_journalEntryId_idx" ON "JournalEntryLine"("tenantId", "companyId", "journalEntryId");

-- CreateIndex
CREATE INDEX "ProfitAndLoss_tenantId_companyId_period_idx" ON "ProfitAndLoss"("tenantId", "companyId", "period");

-- CreateIndex
CREATE INDEX "CashFlowStatement_tenantId_companyId_period_idx" ON "CashFlowStatement"("tenantId", "companyId", "period");

-- CreateIndex
CREATE INDEX "TaxJurisdiction_tenantId_companyId_idx" ON "TaxJurisdiction"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxJurisdiction_tenantId_companyId_code_key" ON "TaxJurisdiction"("tenantId", "companyId", "code");

-- CreateIndex
CREATE INDEX "TaxRate_tenantId_companyId_idx" ON "TaxRate"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "TaxRate_effectiveFrom_effectiveTo_idx" ON "TaxRate"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRate_tenantId_companyId_jurisdictionId_taxName_effectiveFrom_key" ON "TaxRate"("tenantId", "companyId", "jurisdictionId", "taxName", "effectiveFrom");

-- CreateIndex
CREATE INDEX "TaxForm_tenantId_companyId_idx" ON "TaxForm"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "TaxForm_dueDate_status_idx" ON "TaxForm"("dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TaxForm_tenantId_companyId_formCode_taxYear_key" ON "TaxForm"("tenantId", "companyId", "formCode", "taxYear");

-- CreateIndex
CREATE INDEX "TaxSubmission_tenantId_companyId_idx" ON "TaxSubmission"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "TaxSubmission_submittedAt_status_idx" ON "TaxSubmission"("submittedAt", "status");

-- CreateIndex
CREATE INDEX "TaxCalendar_tenantId_companyId_idx" ON "TaxCalendar"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "TaxCalendar_dueDate_isCompleted_idx" ON "TaxCalendar"("dueDate", "isCompleted");

-- CreateIndex
CREATE INDEX "TaxReminder_reminderDate_status_idx" ON "TaxReminder"("reminderDate", "status");

-- CreateIndex
CREATE INDEX "TaxCalculation_tenantId_companyId_idx" ON "TaxCalculation"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "TaxCalculation_calculatedAt_idx" ON "TaxCalculation"("calculatedAt");

-- CreateIndex
CREATE INDEX "TaxConfiguration_tenant_company_idx" ON "TaxConfiguration"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Report_tenantId_companyId_reportType_idx" ON "Report"("tenantId", "companyId", "reportType");

-- CreateIndex
CREATE INDEX "Report_tenantId_companyId_generatedAt_idx" ON "Report"("tenantId", "companyId", "generatedAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_userId_timestamp_idx" ON "AuditLog"("tenantId", "userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AccountMapping_tenantId_companyId_idx" ON "AccountMapping"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountMapping_tenantId_companyId_purpose_key" ON "AccountMapping"("tenantId", "companyId", "purpose");

-- CreateIndex
CREATE INDEX "CompanySetting_tenantId_companyId_idx" ON "CompanySetting"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySetting_tenantId_companyId_key_key" ON "CompanySetting"("tenantId", "companyId", "key");

-- CreateIndex
CREATE INDEX "BankAccount_tenantId_companyId_idx" ON "BankAccount"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "BankAccount_tenantId_companyId_status_idx" ON "BankAccount"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "BankAccount_tenantId_companyId_accountType_idx" ON "BankAccount"("tenantId", "companyId", "accountType");

-- CreateIndex
CREATE INDEX "BankTransaction_tenantId_bankAccountId_idx" ON "BankTransaction"("tenantId", "bankAccountId");

-- CreateIndex
CREATE INDEX "BankTransaction_tenantId_connectionId_idx" ON "BankTransaction"("tenantId", "connectionId");

-- CreateIndex
CREATE INDEX "BankTransaction_transactionDate_idx" ON "BankTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "BankTransaction_status_idx" ON "BankTransaction"("status");

-- CreateIndex
CREATE INDEX "BankTransaction_isReconciled_idx" ON "BankTransaction"("isReconciled");

-- CreateIndex
CREATE INDEX "BankTransaction_externalId_idx" ON "BankTransaction"("externalId");

-- CreateIndex
CREATE INDEX "BankTransaction_tenantId_status_idx" ON "BankTransaction"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_connectionId_externalId_key" ON "BankTransaction"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "BankSyncLog_connectionId_idx" ON "BankSyncLog"("connectionId");

-- CreateIndex
CREATE INDEX "BankSyncLog_startedAt_idx" ON "BankSyncLog"("startedAt");

-- CreateIndex
CREATE INDEX "BankSyncLog_status_idx" ON "BankSyncLog"("status");

-- CreateIndex
CREATE INDEX "BankReconciliationRule_companyId_idx" ON "BankReconciliationRule"("companyId");

-- CreateIndex
CREATE INDEX "BankReconciliationRule_isActive_idx" ON "BankReconciliationRule"("isActive");

-- CreateIndex
CREATE INDEX "BankReconciliationRule_priority_idx" ON "BankReconciliationRule"("priority");

-- CreateIndex
CREATE INDEX "BankReconciliationJob_companyId_idx" ON "BankReconciliationJob"("companyId");

-- CreateIndex
CREATE INDEX "BankReconciliationJob_connectionId_idx" ON "BankReconciliationJob"("connectionId");

-- CreateIndex
CREATE INDEX "BankReconciliationJob_startedAt_idx" ON "BankReconciliationJob"("startedAt");

-- CreateIndex
CREATE INDEX "BankReconciliationJob_status_idx" ON "BankReconciliationJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bankTransactionId_key" ON "Payment"("bankTransactionId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_companyId_idx" ON "Payment"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_bankAccountId_idx" ON "Payment"("tenantId", "bankAccountId");

-- CreateIndex
CREATE INDEX "PaymentApplication_tenantId_paymentId_idx" ON "PaymentApplication"("tenantId", "paymentId");

-- CreateIndex
CREATE INDEX "PaymentApplication_tenantId_invoiceId_idx" ON "PaymentApplication"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "PaymentApplication_tenantId_billId_idx" ON "PaymentApplication"("tenantId", "billId");

-- CreateIndex
CREATE INDEX "AppUser_tenantId_idx" ON "AppUser"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_tenantId_email_key" ON "AppUser"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_tenantId_userId_idx" ON "RefreshToken"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "AccountType_tenantId_idx" ON "AccountType"("tenantId");

-- CreateIndex
CREATE INDEX "AccountType_tenantId_companyId_idx" ON "AccountType"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountType_tenantId_companyId_code_key" ON "AccountType"("tenantId", "companyId", "code");

-- CreateIndex
CREATE INDEX "Account_tenantId_idx" ON "Account"("tenantId");

-- CreateIndex
CREATE INDEX "Account_tenantId_companyId_idx" ON "Account"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Account_tenantId_companyId_parentId_idx" ON "Account"("tenantId", "companyId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_tenantId_companyId_code_key" ON "Account"("tenantId", "companyId", "code");

-- CreateIndex
CREATE INDEX "JournalEntryType_tenantId_companyId_idx" ON "JournalEntryType"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "JournalEntryType_tenantId_companyId_category_idx" ON "JournalEntryType"("tenantId", "companyId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntryType_tenantId_companyId_name_key" ON "JournalEntryType"("tenantId", "companyId", "name");

-- CreateIndex
CREATE INDEX "JournalEntryTypeAccount_tenantId_entryTypeId_idx" ON "JournalEntryTypeAccount"("tenantId", "entryTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntryTypeAccount_tenantId_entryTypeId_accountId_key" ON "JournalEntryTypeAccount"("tenantId", "entryTypeId", "accountId");

-- CreateIndex
CREATE INDEX "JournalEntryTemplate_tenantId_companyId_idx" ON "JournalEntryTemplate"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "JournalEntryTemplate_tenantId_companyId_isRecurring_idx" ON "JournalEntryTemplate"("tenantId", "companyId", "isRecurring");

-- CreateIndex
CREATE INDEX "JournalEntryTemplate_tenantId_companyId_nextRunDate_idx" ON "JournalEntryTemplate"("tenantId", "companyId", "nextRunDate");

-- CreateIndex
CREATE INDEX "JournalEntryTemplateLine_tenantId_templateId_idx" ON "JournalEntryTemplateLine"("tenantId", "templateId");

-- CreateIndex
CREATE INDEX "JournalEntryTemplateLine_tenantId_accountId_idx" ON "JournalEntryTemplateLine"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_date_idx" ON "JournalEntry"("tenantId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_companyId_status_idx" ON "JournalEntry"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_companyId_entryTypeId_idx" ON "JournalEntry"("tenantId", "companyId", "entryTypeId");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_createdById_idx" ON "JournalEntry"("tenantId", "createdById");

-- CreateIndex
CREATE INDEX "JournalLine_tenantId_accountId_idx" ON "JournalLine"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "JournalLine_tenantId_department_idx" ON "JournalLine"("tenantId", "department");

-- CreateIndex
CREATE INDEX "JournalLine_tenantId_project_idx" ON "JournalLine"("tenantId", "project");

-- CreateIndex
CREATE INDEX "JournalLine_tenantId_location_idx" ON "JournalLine"("tenantId", "location");

-- CreateIndex
CREATE INDEX "JournalEntryApproval_tenantId_entryId_idx" ON "JournalEntryApproval"("tenantId", "entryId");

-- CreateIndex
CREATE INDEX "JournalEntryApproval_tenantId_status_idx" ON "JournalEntryApproval"("tenantId", "status");

-- CreateIndex
CREATE INDEX "JournalEntryApproval_tenantId_requestedById_idx" ON "JournalEntryApproval"("tenantId", "requestedById");

-- CreateIndex
CREATE INDEX "JournalEntryApproval_tenantId_approvedById_idx" ON "JournalEntryApproval"("tenantId", "approvedById");

-- CreateIndex
CREATE INDEX "JournalEntryAudit_tenantId_entryId_idx" ON "JournalEntryAudit"("tenantId", "entryId");

-- CreateIndex
CREATE INDEX "JournalEntryAudit_tenantId_userId_idx" ON "JournalEntryAudit"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "JournalEntryAudit_tenantId_action_idx" ON "JournalEntryAudit"("tenantId", "action");

-- CreateIndex
CREATE INDEX "JournalEntryAudit_tenantId_createdAt_idx" ON "JournalEntryAudit"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "journal_searches_tenantId_createdById_idx" ON "journal_searches"("tenantId", "createdById");

-- CreateIndex
CREATE UNIQUE INDEX "journal_searches_tenantId_name_createdById_key" ON "journal_searches"("tenantId", "name", "createdById");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_companyId_idx" ON "Transaction"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Transaction_tenantId_transactionDate_idx" ON "Transaction"("tenantId", "transactionDate");

-- CreateIndex
CREATE INDEX "Customer_tenantId_companyId_idx" ON "Customer"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_companyId_status_idx" ON "Customer"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "Customer_tenantId_companyId_customerType_idx" ON "Customer"("tenantId", "companyId", "customerType");

-- CreateIndex
CREATE INDEX "Customer_tenantId_companyId_customerTier_idx" ON "Customer"("tenantId", "companyId", "customerTier");

-- CreateIndex
CREATE INDEX "Customer_tenantId_assignedTo_idx" ON "Customer"("tenantId", "assignedTo");

-- CreateIndex
CREATE INDEX "Customer_tenantId_email_idx" ON "Customer"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Customer_tenantId_customerCode_idx" ON "Customer"("tenantId", "customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_tenantId_companyId_idx" ON "Client"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Client_tenantId_companyId_isActive_idx" ON "Client"("tenantId", "companyId", "isActive");

-- CreateIndex
CREATE INDEX "Client_tenantId_email_idx" ON "Client"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Client_tenantId_assignedTo_idx" ON "Client"("tenantId", "assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_email_key" ON "Client"("tenantId", "email");

-- CreateIndex
CREATE INDEX "CustomerContact_tenantId_customerId_idx" ON "CustomerContact"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "CustomerContact_tenantId_isPrimary_idx" ON "CustomerContact"("tenantId", "isPrimary");

-- CreateIndex
CREATE INDEX "CustomerAddress_tenantId_customerId_idx" ON "CustomerAddress"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "CustomerAddress_tenantId_addressType_idx" ON "CustomerAddress"("tenantId", "addressType");

-- CreateIndex
CREATE INDEX "CustomerAddress_tenantId_isDefault_idx" ON "CustomerAddress"("tenantId", "isDefault");

-- CreateIndex
CREATE INDEX "CustomerActivity_tenantId_customerId_idx" ON "CustomerActivity"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "CustomerActivity_tenantId_activityType_idx" ON "CustomerActivity"("tenantId", "activityType");

-- CreateIndex
CREATE INDEX "CustomerActivity_tenantId_activityDate_idx" ON "CustomerActivity"("tenantId", "activityDate");

-- CreateIndex
CREATE INDEX "CustomerActivity_tenantId_performedBy_idx" ON "CustomerActivity"("tenantId", "performedBy");

-- CreateIndex
CREATE INDEX "Vendor_tenantId_companyId_idx" ON "Vendor"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_estimateId_key" ON "Invoice"("estimateId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_companyId_idx" ON "Invoice"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_companyId_status_idx" ON "Invoice"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_companyId_issueDate_idx" ON "Invoice"("tenantId", "companyId", "issueDate");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_companyId_dueDate_idx" ON "Invoice"("tenantId", "companyId", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_customerId_idx" ON "Invoice"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_estimateId_idx" ON "Invoice"("tenantId", "estimateId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_recurringInvoiceId_idx" ON "Invoice"("tenantId", "recurringInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_createdBy_idx" ON "Invoice"("tenantId", "createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_companyId_invoiceNumber_key" ON "Invoice"("tenantId", "companyId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceLine_tenantId_invoiceId_idx" ON "InvoiceLine"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLine_tenantId_productId_idx" ON "InvoiceLine"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "InvoiceActivity_tenantId_invoiceId_idx" ON "InvoiceActivity"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceActivity_tenantId_activityType_idx" ON "InvoiceActivity"("tenantId", "activityType");

-- CreateIndex
CREATE INDEX "InvoiceActivity_tenantId_createdAt_idx" ON "InvoiceActivity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "InvoiceAttachment_tenantId_invoiceId_idx" ON "InvoiceAttachment"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceAttachment_tenantId_uploadedBy_idx" ON "InvoiceAttachment"("tenantId", "uploadedBy");

-- CreateIndex
CREATE INDEX "InvoicePayment_tenantId_invoiceId_idx" ON "InvoicePayment"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayment_tenantId_paymentDate_idx" ON "InvoicePayment"("tenantId", "paymentDate");

-- CreateIndex
CREATE INDEX "InvoiceReminder_tenantId_invoiceId_idx" ON "InvoiceReminder"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceReminder_tenantId_sentAt_idx" ON "InvoiceReminder"("tenantId", "sentAt");

-- CreateIndex
CREATE INDEX "Estimate_tenantId_companyId_idx" ON "Estimate"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Estimate_tenantId_companyId_status_idx" ON "Estimate"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "Estimate_tenantId_companyId_issueDate_idx" ON "Estimate"("tenantId", "companyId", "issueDate");

-- CreateIndex
CREATE INDEX "Estimate_tenantId_customerId_idx" ON "Estimate"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Estimate_tenantId_createdBy_idx" ON "Estimate"("tenantId", "createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_tenantId_companyId_estimateNumber_key" ON "Estimate"("tenantId", "companyId", "estimateNumber");

-- CreateIndex
CREATE INDEX "EstimateLine_tenantId_estimateId_idx" ON "EstimateLine"("tenantId", "estimateId");

-- CreateIndex
CREATE INDEX "EstimateLine_tenantId_productId_idx" ON "EstimateLine"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "EstimateActivity_tenantId_estimateId_idx" ON "EstimateActivity"("tenantId", "estimateId");

-- CreateIndex
CREATE INDEX "EstimateActivity_tenantId_activityType_idx" ON "EstimateActivity"("tenantId", "activityType");

-- CreateIndex
CREATE INDEX "EstimateActivity_tenantId_createdAt_idx" ON "EstimateActivity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "EstimateAttachment_tenantId_estimateId_idx" ON "EstimateAttachment"("tenantId", "estimateId");

-- CreateIndex
CREATE INDEX "EstimateAttachment_tenantId_uploadedBy_idx" ON "EstimateAttachment"("tenantId", "uploadedBy");

-- CreateIndex
CREATE INDEX "EstimateReminder_tenantId_estimateId_idx" ON "EstimateReminder"("tenantId", "estimateId");

-- CreateIndex
CREATE INDEX "EstimateReminder_tenantId_sentAt_idx" ON "EstimateReminder"("tenantId", "sentAt");

-- CreateIndex
CREATE INDEX "RecurringInvoice_tenantId_companyId_idx" ON "RecurringInvoice"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_tenantId_companyId_status_idx" ON "RecurringInvoice"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "RecurringInvoice_tenantId_companyId_nextRunDate_idx" ON "RecurringInvoice"("tenantId", "companyId", "nextRunDate");

-- CreateIndex
CREATE INDEX "RecurringInvoiceLine_tenantId_recurringInvoiceId_idx" ON "RecurringInvoiceLine"("tenantId", "recurringInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "OAuthClient"("clientId");

-- CreateIndex
CREATE INDEX "OAuthClient_tenantId_idx" ON "OAuthClient"("tenantId");

-- CreateIndex
CREATE INDEX "OAuthClient_companyId_idx" ON "OAuthClient"("companyId");

-- CreateIndex
CREATE INDEX "OAuthClient_clientId_idx" ON "OAuthClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAuthorizationCode_code_key" ON "OAuthAuthorizationCode"("code");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationCode_tenantId_companyId_idx" ON "OAuthAuthorizationCode"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationCode_code_idx" ON "OAuthAuthorizationCode"("code");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationCode_expiresAt_idx" ON "OAuthAuthorizationCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccessToken_token_key" ON "OAuthAccessToken"("token");

-- CreateIndex
CREATE INDEX "OAuthAccessToken_tenantId_companyId_idx" ON "OAuthAccessToken"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "OAuthAccessToken_token_idx" ON "OAuthAccessToken"("token");

-- CreateIndex
CREATE INDEX "OAuthAccessToken_expiresAt_idx" ON "OAuthAccessToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthRefreshToken_token_key" ON "OAuthRefreshToken"("token");

-- CreateIndex
CREATE INDEX "OAuthRefreshToken_tenantId_companyId_idx" ON "OAuthRefreshToken"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "OAuthRefreshToken_token_idx" ON "OAuthRefreshToken"("token");

-- CreateIndex
CREATE INDEX "OAuthRefreshToken_expiresAt_idx" ON "OAuthRefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_companyId_idx" ON "ApiKey"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- CreateIndex
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");

-- CreateIndex
CREATE INDEX "ApiUsageLog_tenantId_timestamp_idx" ON "ApiUsageLog"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "ApiUsageLog_endpoint_method_idx" ON "ApiUsageLog"("endpoint", "method");

-- CreateIndex
CREATE INDEX "ApiUsageLog_statusCode_idx" ON "ApiUsageLog"("statusCode");

-- CreateIndex
CREATE INDEX "ApiUsageLog_responseTime_idx" ON "ApiUsageLog"("responseTime");

-- CreateIndex
CREATE INDEX "PerformanceMetric_tenantId_metricName_timestamp_idx" ON "PerformanceMetric"("tenantId", "metricName", "timestamp");

-- CreateIndex
CREATE INDEX "PerformanceMetric_timestamp_idx" ON "PerformanceMetric"("timestamp");

-- CreateIndex
CREATE INDEX "Bill_tenantId_companyId_idx" ON "Bill"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_tenantId_companyId_billNumber_key" ON "Bill"("tenantId", "companyId", "billNumber");

-- CreateIndex
CREATE INDEX "InvoiceCapture_tenantId_companyId_idx" ON "InvoiceCapture"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "InvoiceCapture_status_idx" ON "InvoiceCapture"("status");

-- CreateIndex
CREATE INDEX "InvoiceCapture_vendorId_idx" ON "InvoiceCapture"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceCapture_tenantId_companyId_invoiceNumber_key" ON "InvoiceCapture"("tenantId", "companyId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceMatching_invoiceId_key" ON "InvoiceMatching"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceMatching_tenantId_companyId_idx" ON "InvoiceMatching"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "InvoiceMatching_invoiceId_idx" ON "InvoiceMatching"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceMatching_status_idx" ON "InvoiceMatching"("status");

-- CreateIndex
CREATE INDEX "GoodsReceivedNote_tenantId_companyId_idx" ON "GoodsReceivedNote"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "GoodsReceivedNote_purchaseOrderId_idx" ON "GoodsReceivedNote"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceivedNote_tenantId_companyId_grnNumber_key" ON "GoodsReceivedNote"("tenantId", "companyId", "grnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceApproval_invoiceId_key" ON "InvoiceApproval"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceApproval_tenantId_companyId_idx" ON "InvoiceApproval"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "InvoiceApproval_invoiceId_idx" ON "InvoiceApproval"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceApproval_approverId_idx" ON "InvoiceApproval"("approverId");

-- CreateIndex
CREATE INDEX "PaymentSchedule_tenantId_companyId_idx" ON "PaymentSchedule"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "PaymentSchedule_billId_idx" ON "PaymentSchedule"("billId");

-- CreateIndex
CREATE INDEX "PaymentSchedule_scheduledDate_idx" ON "PaymentSchedule"("scheduledDate");

-- CreateIndex
CREATE INDEX "APReconciliation_tenantId_companyId_idx" ON "APReconciliation"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "APReconciliation_reconciliationDate_idx" ON "APReconciliation"("reconciliationDate");

-- CreateIndex
CREATE INDEX "APReconciliationItem_tenantId_companyId_idx" ON "APReconciliationItem"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "APReconciliationItem_reconciliationId_idx" ON "APReconciliationItem"("reconciliationId");

-- CreateIndex
CREATE INDEX "APReconciliationItem_billId_idx" ON "APReconciliationItem"("billId");

-- CreateIndex
CREATE INDEX "APWorkflow_tenantId_companyId_idx" ON "APWorkflow"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "APWorkflowInstance_tenantId_companyId_idx" ON "APWorkflowInstance"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "APWorkflowInstance_workflowId_idx" ON "APWorkflowInstance"("workflowId");

-- CreateIndex
CREATE INDEX "APWorkflowInstance_invoiceId_idx" ON "APWorkflowInstance"("invoiceId");

-- CreateIndex
CREATE INDEX "APWorkflowStep_tenantId_companyId_idx" ON "APWorkflowStep"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "APWorkflowStep_workflowInstanceId_idx" ON "APWorkflowStep"("workflowInstanceId");

-- CreateIndex
CREATE INDEX "APWorkflowStep_assignedTo_idx" ON "APWorkflowStep"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_relatedBillId_key" ON "PurchaseOrder"("relatedBillId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_companyId_idx" ON "PurchaseOrder"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_companyId_poNumber_key" ON "PurchaseOrder"("tenantId", "companyId", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_tenantId_purchaseOrderId_idx" ON "PurchaseOrderLine"("tenantId", "purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_productId_idx" ON "PurchaseOrderLine"("productId");

-- CreateIndex
CREATE INDEX "Receipt_tenantId_purchaseOrderId_idx" ON "Receipt"("tenantId", "purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_tenantId_purchaseOrderId_receiptNumber_key" ON "Receipt"("tenantId", "purchaseOrderId", "receiptNumber");

-- CreateIndex
CREATE INDEX "ReceiptItem_tenantId_receiptId_idx" ON "ReceiptItem"("tenantId", "receiptId");

-- CreateIndex
CREATE INDEX "ImportShipment_tenantId_companyId_idx" ON "ImportShipment"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "ImportShipment_tenantId_purchaseOrderId_idx" ON "ImportShipment"("tenantId", "purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportShipment_tenantId_companyId_shipmentNumber_key" ON "ImportShipment"("tenantId", "companyId", "shipmentNumber");

-- CreateIndex
CREATE INDEX "CustomsEvent_tenantId_importShipmentId_idx" ON "CustomsEvent"("tenantId", "importShipmentId");

-- CreateIndex
CREATE INDEX "CustomsEvent_tenantId_importShipmentId_eventDate_idx" ON "CustomsEvent"("tenantId", "importShipmentId", "eventDate");

-- CreateIndex
CREATE INDEX "ExpenseCategory_tenantId_companyId_idx" ON "ExpenseCategory"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "ExpenseCategory_tenantId_companyId_parentId_idx" ON "ExpenseCategory"("tenantId", "companyId", "parentId");

-- CreateIndex
CREATE INDEX "Budget_tenantId_companyId_idx" ON "Budget"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Budget_tenantId_companyId_categoryId_idx" ON "Budget"("tenantId", "companyId", "categoryId");

-- CreateIndex
CREATE INDEX "Budget_tenantId_companyId_startDate_endDate_idx" ON "Budget"("tenantId", "companyId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ExpenseRule_tenantId_companyId_idx" ON "ExpenseRule"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "ExpenseRule_tenantId_companyId_categoryId_idx" ON "ExpenseRule"("tenantId", "companyId", "categoryId");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_tenantId_companyId_idx" ON "ApprovalWorkflow"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_tenantId_companyId_entityType_idx" ON "ApprovalWorkflow"("tenantId", "companyId", "entityType");

-- CreateIndex
CREATE INDEX "Approval_tenantId_companyId_idx" ON "Approval"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Approval_tenantId_companyId_entityType_entityId_idx" ON "Approval"("tenantId", "companyId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Approval_tenantId_companyId_approverId_idx" ON "Approval"("tenantId", "companyId", "approverId");

-- CreateIndex
CREATE INDEX "BillLine_tenantId_billId_idx" ON "BillLine"("tenantId", "billId");

-- CreateIndex
CREATE INDEX "BillLineItem_tenantId_billId_idx" ON "BillLineItem"("tenantId", "billId");

-- CreateIndex
CREATE INDEX "BillPayment_tenantId_billId_idx" ON "BillPayment"("tenantId", "billId");

-- CreateIndex
CREATE INDEX "Category_tenantId_companyId_idx" ON "Category"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tenantId_companyId_name_key" ON "Category"("tenantId", "companyId", "name");

-- CreateIndex
CREATE INDEX "Product_tenantId_companyId_idx" ON "Product"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Product_tenantId_categoryId_idx" ON "Product"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "Product_tenantId_companyId_type_idx" ON "Product"("tenantId", "companyId", "type");

-- CreateIndex
CREATE INDEX "Product_tenantId_companyId_status_idx" ON "Product"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "Product_tenantId_companyId_barcode_idx" ON "Product"("tenantId", "companyId", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_companyId_sku_key" ON "Product"("tenantId", "companyId", "sku");

-- CreateIndex
CREATE INDEX "InventoryMovement_tenantId_productId_idx" ON "InventoryMovement"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "Location_tenantId_companyId_idx" ON "Location"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_tenantId_companyId_code_key" ON "Location"("tenantId", "companyId", "code");

-- CreateIndex
CREATE INDEX "ProductLocation_tenantId_productId_idx" ON "ProductLocation"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "ProductLocation_tenantId_locationId_idx" ON "ProductLocation"("tenantId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLocation_tenantId_productId_locationId_key" ON "ProductLocation"("tenantId", "productId", "locationId");

-- CreateIndex
CREATE INDEX "ReorderAlert_tenantId_productId_idx" ON "ReorderAlert"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "ReorderAlert_tenantId_status_idx" ON "ReorderAlert"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AlertSettings_tenantId_key" ON "AlertSettings"("tenantId");

-- CreateIndex
CREATE INDEX "AlertSettings_tenantId_idx" ON "AlertSettings"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_tenantId_status_idx" ON "InventoryTransfer"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InventoryTransfer_tenantId_productId_idx" ON "InventoryTransfer"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_tenantId_transferDate_idx" ON "InventoryTransfer"("tenantId", "transferDate");

-- CreateIndex
CREATE INDEX "ClientPortalAccess_tenantId_companyId_idx" ON "ClientPortalAccess"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "ClientPortalAccess_tenantId_userId_idx" ON "ClientPortalAccess"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "ClientPortalAccess_tenantId_clientId_idx" ON "ClientPortalAccess"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "Workspace_tenantId_companyId_idx" ON "Workspace"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_tenantId_companyId_name_key" ON "Workspace"("tenantId", "companyId", "name");

-- CreateIndex
CREATE INDEX "WorkspaceMember_tenantId_workspaceId_idx" ON "WorkspaceMember"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_tenantId_userId_idx" ON "WorkspaceMember"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_tenantId_workspaceId_userId_key" ON "WorkspaceMember"("tenantId", "workspaceId", "userId");

-- CreateIndex
CREATE INDEX "FileAsset_tenantId_companyId_idx" ON "FileAsset"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "FileAsset_tenantId_uploaderId_idx" ON "FileAsset"("tenantId", "uploaderId");

-- CreateIndex
CREATE INDEX "FileAsset_tenantId_workspaceId_idx" ON "FileAsset"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "FileAsset_tenantId_categoryId_idx" ON "FileAsset"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "FileAsset_tenantId_status_idx" ON "FileAsset"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Notification_tenantId_userId_idx" ON "Notification"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_companyId_idx" ON "Notification"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_isRead_idx" ON "Notification"("tenantId", "isRead");

-- CreateIndex
CREATE INDEX "Message_tenantId_companyId_idx" ON "Message"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Message_tenantId_senderId_idx" ON "Message"("tenantId", "senderId");

-- CreateIndex
CREATE INDEX "Message_tenantId_receiverId_idx" ON "Message"("tenantId", "receiverId");

-- CreateIndex
CREATE INDEX "Message_tenantId_createdAt_idx" ON "Message"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_tenantId_companyId_idx" ON "Task"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "Task_tenantId_assignedTo_idx" ON "Task"("tenantId", "assignedTo");

-- CreateIndex
CREATE INDEX "Task_tenantId_dueDate_idx" ON "Task"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "Task_tenantId_status_idx" ON "Task"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DocumentCategory_tenantId_companyId_idx" ON "DocumentCategory"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCategory_tenantId_companyId_name_key" ON "DocumentCategory"("tenantId", "companyId", "name");

-- CreateIndex
CREATE INDEX "DocumentShare_tenantId_companyId_idx" ON "DocumentShare"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "DocumentShare_tenantId_documentId_idx" ON "DocumentShare"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentShare_tenantId_sharedWith_idx" ON "DocumentShare"("tenantId", "sharedWith");

-- CreateIndex
CREATE INDEX "DocumentShare_tenantId_clientId_idx" ON "DocumentShare"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "DocumentShare_tenantId_sharedBy_idx" ON "DocumentShare"("tenantId", "sharedBy");

-- CreateIndex
CREATE INDEX "DocumentWorkflow_tenantId_companyId_idx" ON "DocumentWorkflow"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "DocumentWorkflow_tenantId_documentId_idx" ON "DocumentWorkflow"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentWorkflow_tenantId_assignedTo_idx" ON "DocumentWorkflow"("tenantId", "assignedTo");

-- CreateIndex
CREATE INDEX "DocumentWorkflow_tenantId_status_idx" ON "DocumentWorkflow"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DocumentActivity_tenantId_companyId_idx" ON "DocumentActivity"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "DocumentActivity_tenantId_documentId_idx" ON "DocumentActivity"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentActivity_tenantId_userId_idx" ON "DocumentActivity"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "DocumentActivity_tenantId_createdAt_idx" ON "DocumentActivity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAccessControl_tenantId_companyId_idx" ON "DocumentAccessControl"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "DocumentAccessControl_tenantId_documentId_idx" ON "DocumentAccessControl"("tenantId", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAccessControl_tenantId_documentId_key" ON "DocumentAccessControl"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentWebhook_tenantId_companyId_idx" ON "DocumentWebhook"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "DocumentWebhook_tenantId_documentId_idx" ON "DocumentWebhook"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentWebhook_tenantId_isActive_idx" ON "DocumentWebhook"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "WebhookDelivery_tenantId_webhookId_idx" ON "WebhookDelivery"("tenantId", "webhookId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_tenantId_status_idx" ON "WebhookDelivery"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_tenantId_createdAt_idx" ON "WebhookDelivery"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ComplianceCheck_tenantId_companyId_idx" ON "ComplianceCheck"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_tenantId_status_idx" ON "ComplianceCheck"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ComplianceCheck_tenantId_createdAt_idx" ON "ComplianceCheck"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ComplianceCheckResult_complianceCheckId_idx" ON "ComplianceCheckResult"("complianceCheckId");

-- CreateIndex
CREATE INDEX "ComplianceCheckResult_documentId_idx" ON "ComplianceCheckResult"("documentId");

-- CreateIndex
CREATE INDEX "ComplianceCheckResult_status_idx" ON "ComplianceCheckResult"("status");

-- CreateIndex
CREATE INDEX "AutomatedReport_tenantId_companyId_idx" ON "AutomatedReport"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AutomatedReport_tenantId_isActive_idx" ON "AutomatedReport"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "AutomatedReport_tenantId_nextRun_idx" ON "AutomatedReport"("tenantId", "nextRun");

-- CreateIndex
CREATE INDEX "ReportGeneration_tenantId_automatedReportId_idx" ON "ReportGeneration"("tenantId", "automatedReportId");

-- CreateIndex
CREATE INDEX "ReportGeneration_tenantId_status_idx" ON "ReportGeneration"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReportGeneration_tenantId_createdAt_idx" ON "ReportGeneration"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialReport_companyId_idx" ON "FinancialReport"("companyId");

-- CreateIndex
CREATE INDEX "FinancialReport_type_idx" ON "FinancialReport"("type");

-- CreateIndex
CREATE INDEX "FinancialReport_createdBy_idx" ON "FinancialReport"("createdBy");

-- CreateIndex
CREATE INDEX "ReportItem_reportId_idx" ON "ReportItem"("reportId");

-- CreateIndex
CREATE INDEX "ReportItem_order_idx" ON "ReportItem"("order");

-- CreateIndex
CREATE INDEX "ReportSchedule_reportId_idx" ON "ReportSchedule"("reportId");

-- CreateIndex
CREATE INDEX "ReportSchedule_nextRun_idx" ON "ReportSchedule"("nextRun");

-- CreateIndex
CREATE INDEX "ReportSchedule_isActive_idx" ON "ReportSchedule"("isActive");

-- CreateIndex
CREATE INDEX "ReportTemplate_type_idx" ON "ReportTemplate"("type");

-- CreateIndex
CREATE INDEX "ReportTemplate_category_idx" ON "ReportTemplate"("category");

-- CreateIndex
CREATE INDEX "ReportTemplate_createdBy_idx" ON "ReportTemplate"("createdBy");

-- CreateIndex
CREATE INDEX "ReportExecution_reportId_idx" ON "ReportExecution"("reportId");

-- CreateIndex
CREATE INDEX "ReportExecution_executedBy_idx" ON "ReportExecution"("executedBy");

-- CreateIndex
CREATE INDEX "ReportExecution_executedAt_idx" ON "ReportExecution"("executedAt");

-- CreateIndex
CREATE INDEX "ReportExecution_status_idx" ON "ReportExecution"("status");

-- CreateIndex
CREATE INDEX "CustomReport_tenantId_idx" ON "CustomReport"("tenantId");

-- CreateIndex
CREATE INDEX "CustomReport_companyId_idx" ON "CustomReport"("companyId");

-- CreateIndex
CREATE INDEX "CustomReport_createdBy_idx" ON "CustomReport"("createdBy");

-- CreateIndex
CREATE INDEX "CustomReport_isPublic_idx" ON "CustomReport"("isPublic");

-- CreateIndex
CREATE INDEX "AIConfig_tenantId_idx" ON "AIConfig"("tenantId");

-- CreateIndex
CREATE INDEX "AIConfig_tenantId_companyId_idx" ON "AIConfig"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIConfig_configType_idx" ON "AIConfig"("configType");

-- CreateIndex
CREATE INDEX "AIConfig_isActive_idx" ON "AIConfig"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AIConfig_tenantId_companyId_configType_key" ON "AIConfig"("tenantId", "companyId", "configType");

-- CreateIndex
CREATE INDEX "AIModel_tenantId_companyId_idx" ON "AIModel"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIModel_modelType_idx" ON "AIModel"("modelType");

-- CreateIndex
CREATE INDEX "AIModel_status_idx" ON "AIModel"("status");

-- CreateIndex
CREATE INDEX "AIModel_trainingEndTime_idx" ON "AIModel"("trainingEndTime");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_tenantId_companyId_modelName_modelVersion_key" ON "AIModel"("tenantId", "companyId", "modelName", "modelVersion");

-- CreateIndex
CREATE INDEX "AIModelTrainingRun_tenantId_companyId_idx" ON "AIModelTrainingRun"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIModelTrainingRun_modelId_idx" ON "AIModelTrainingRun"("modelId");

-- CreateIndex
CREATE INDEX "AIModelTrainingRun_status_idx" ON "AIModelTrainingRun"("status");

-- CreateIndex
CREATE INDEX "AIModelTrainingRun_startTime_idx" ON "AIModelTrainingRun"("startTime");

-- CreateIndex
CREATE INDEX "AIModelPrediction_tenantId_companyId_idx" ON "AIModelPrediction"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIModelPrediction_modelId_idx" ON "AIModelPrediction"("modelId");

-- CreateIndex
CREATE INDEX "AIModelPrediction_predictionType_idx" ON "AIModelPrediction"("predictionType");

-- CreateIndex
CREATE INDEX "AIModelPrediction_timestamp_idx" ON "AIModelPrediction"("timestamp");

-- CreateIndex
CREATE INDEX "AIModelFeatureImportance_tenantId_companyId_idx" ON "AIModelFeatureImportance"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIModelFeatureImportance_modelId_idx" ON "AIModelFeatureImportance"("modelId");

-- CreateIndex
CREATE INDEX "AIModelFeatureImportance_featureName_idx" ON "AIModelFeatureImportance"("featureName");

-- CreateIndex
CREATE INDEX "AIModelFeatureImportance_importance_idx" ON "AIModelFeatureImportance"("importance");

-- CreateIndex
CREATE INDEX "AIDataPipeline_tenantId_companyId_idx" ON "AIDataPipeline"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIDataPipeline_pipelineType_idx" ON "AIDataPipeline"("pipelineType");

-- CreateIndex
CREATE INDEX "AIDataPipeline_status_idx" ON "AIDataPipeline"("status");

-- CreateIndex
CREATE INDEX "AIDataPipeline_nextRunAt_idx" ON "AIDataPipeline"("nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIDataPipeline_tenantId_companyId_pipelineName_key" ON "AIDataPipeline"("tenantId", "companyId", "pipelineName");

-- CreateIndex
CREATE INDEX "AIDataPipelineRun_tenantId_companyId_idx" ON "AIDataPipelineRun"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIDataPipelineRun_pipelineId_idx" ON "AIDataPipelineRun"("pipelineId");

-- CreateIndex
CREATE INDEX "AIDataPipelineRun_status_idx" ON "AIDataPipelineRun"("status");

-- CreateIndex
CREATE INDEX "AIDataPipelineRun_startTime_idx" ON "AIDataPipelineRun"("startTime");

-- CreateIndex
CREATE INDEX "AIDataQuality_tenantId_companyId_idx" ON "AIDataQuality"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIDataQuality_tableName_idx" ON "AIDataQuality"("tableName");

-- CreateIndex
CREATE INDEX "AIDataQuality_columnName_idx" ON "AIDataQuality"("columnName");

-- CreateIndex
CREATE INDEX "AIDataQuality_qualityMetric_idx" ON "AIDataQuality"("qualityMetric");

-- CreateIndex
CREATE INDEX "AIDataQuality_checkDate_idx" ON "AIDataQuality"("checkDate");

-- CreateIndex
CREATE INDEX "AIPerformanceMetrics_tenantId_companyId_idx" ON "AIPerformanceMetrics"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIPerformanceMetrics_modelId_idx" ON "AIPerformanceMetrics"("modelId");

-- CreateIndex
CREATE INDEX "AIPerformanceMetrics_metricType_idx" ON "AIPerformanceMetrics"("metricType");

-- CreateIndex
CREATE INDEX "AIPerformanceMetrics_metricDate_idx" ON "AIPerformanceMetrics"("metricDate");

-- CreateIndex
CREATE INDEX "AILearningFeedback_tenantId_companyId_idx" ON "AILearningFeedback"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AILearningFeedback_userId_idx" ON "AILearningFeedback"("userId");

-- CreateIndex
CREATE INDEX "AILearningFeedback_modelId_idx" ON "AILearningFeedback"("modelId");

-- CreateIndex
CREATE INDEX "AILearningFeedback_predictionId_idx" ON "AILearningFeedback"("predictionId");

-- CreateIndex
CREATE INDEX "AILearningFeedback_feedbackType_idx" ON "AILearningFeedback"("feedbackType");

-- CreateIndex
CREATE INDEX "AILearningFeedback_status_idx" ON "AILearningFeedback"("status");

-- CreateIndex
CREATE INDEX "AILearningFeedback_createdAt_idx" ON "AILearningFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "AIDriftDetection_tenantId_companyId_idx" ON "AIDriftDetection"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIDriftDetection_modelId_idx" ON "AIDriftDetection"("modelId");

-- CreateIndex
CREATE INDEX "AIDriftDetection_driftType_idx" ON "AIDriftDetection"("driftType");

-- CreateIndex
CREATE INDEX "AIDriftDetection_featureName_idx" ON "AIDriftDetection"("featureName");

-- CreateIndex
CREATE INDEX "AIDriftDetection_detectionDate_idx" ON "AIDriftDetection"("detectionDate");

-- CreateIndex
CREATE INDEX "AIDriftDetection_driftScore_idx" ON "AIDriftDetection"("driftScore");

-- CreateIndex
CREATE INDEX "AIExperiment_tenantId_companyId_idx" ON "AIExperiment"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIExperiment_objective_idx" ON "AIExperiment"("objective");

-- CreateIndex
CREATE INDEX "AIExperiment_status_idx" ON "AIExperiment"("status");

-- CreateIndex
CREATE INDEX "AIExperiment_startDate_idx" ON "AIExperiment"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "AIExperiment_tenantId_companyId_experimentName_key" ON "AIExperiment"("tenantId", "companyId", "experimentName");

-- CreateIndex
CREATE INDEX "AIDeployment_tenantId_companyId_idx" ON "AIDeployment"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIDeployment_modelId_idx" ON "AIDeployment"("modelId");

-- CreateIndex
CREATE INDEX "AIDeployment_environment_idx" ON "AIDeployment"("environment");

-- CreateIndex
CREATE INDEX "AIDeployment_status_idx" ON "AIDeployment"("status");

-- CreateIndex
CREATE INDEX "AIDeployment_deploymentDate_idx" ON "AIDeployment"("deploymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "AIDeployment_tenantId_companyId_deploymentName_environment_key" ON "AIDeployment"("tenantId", "companyId", "deploymentName", "environment");

-- CreateIndex
CREATE INDEX "AIGovernance_tenantId_companyId_idx" ON "AIGovernance"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIGovernance_policyType_idx" ON "AIGovernance"("policyType");

-- CreateIndex
CREATE INDEX "AIGovernance_status_idx" ON "AIGovernance"("status");

-- CreateIndex
CREATE INDEX "AIGovernance_nextReviewDate_idx" ON "AIGovernance"("nextReviewDate");

-- CreateIndex
CREATE UNIQUE INDEX "AIGovernance_tenantId_companyId_policyName_key" ON "AIGovernance"("tenantId", "companyId", "policyName");

-- CreateIndex
CREATE INDEX "AIGovernanceViolation_tenantId_companyId_idx" ON "AIGovernanceViolation"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "AIGovernanceViolation_policyId_idx" ON "AIGovernanceViolation"("policyId");

-- CreateIndex
CREATE INDEX "AIGovernanceViolation_modelId_idx" ON "AIGovernanceViolation"("modelId");

-- CreateIndex
CREATE INDEX "AIGovernanceViolation_violationType_idx" ON "AIGovernanceViolation"("violationType");

-- CreateIndex
CREATE INDEX "AIGovernanceViolation_severity_idx" ON "AIGovernanceViolation"("severity");

-- CreateIndex
CREATE INDEX "AIGovernanceViolation_status_idx" ON "AIGovernanceViolation"("status");

-- CreateIndex
CREATE INDEX "AIGovernanceViolation_detectedAt_idx" ON "AIGovernanceViolation"("detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "currency_rates_fromCurrency_toCurrency_timestamp_key" ON "currency_rates"("fromCurrency", "toCurrency", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "payment_processor_configs_tenantId_companyId_type_key" ON "payment_processor_configs"("tenantId", "companyId", "type");

-- CreateIndex
CREATE INDEX "payment_intents_tenantId_companyId_idx" ON "payment_intents"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "payment_intents_status_idx" ON "payment_intents"("status");

-- CreateIndex
CREATE INDEX "payment_intents_processor_idx" ON "payment_intents"("processor");

-- CreateIndex
CREATE INDEX "payment_methods_tenantId_companyId_idx" ON "payment_methods"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "payment_methods_customerId_idx" ON "payment_methods"("customerId");

-- CreateIndex
CREATE INDEX "payment_methods_processor_idx" ON "payment_methods"("processor");

-- CreateIndex
CREATE INDEX "payment_customers_processor_idx" ON "payment_customers"("processor");

-- CreateIndex
CREATE UNIQUE INDEX "payment_customers_tenantId_companyId_email_key" ON "payment_customers"("tenantId", "companyId", "email");

-- CreateIndex
CREATE INDEX "bank_connections_provider_idx" ON "bank_connections"("provider");

-- CreateIndex
CREATE INDEX "bank_connections_status_idx" ON "bank_connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bank_connections_tenantId_companyId_providerConnectionId_key" ON "bank_connections"("tenantId", "companyId", "providerConnectionId");

-- CreateIndex
CREATE INDEX "mobile_money_accounts_provider_idx" ON "mobile_money_accounts"("provider");

-- CreateIndex
CREATE INDEX "mobile_money_accounts_status_idx" ON "mobile_money_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_money_accounts_tenantId_companyId_provider_phoneNumber_key" ON "mobile_money_accounts"("tenantId", "companyId", "provider", "phoneNumber");

-- CreateIndex
CREATE INDEX "mobile_money_transactions_provider_idx" ON "mobile_money_transactions"("provider");

-- CreateIndex
CREATE INDEX "mobile_money_transactions_status_idx" ON "mobile_money_transactions"("status");

-- CreateIndex
CREATE INDEX "mobile_money_transactions_transactionType_idx" ON "mobile_money_transactions"("transactionType");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_money_transactions_tenantId_companyId_reference_key" ON "mobile_money_transactions"("tenantId", "companyId", "reference");

-- CreateIndex
CREATE INDEX "card_transactions_tenantId_companyId_status_date_idx" ON "card_transactions"("tenantId", "companyId", "status", "date");

-- CreateIndex
CREATE INDEX "card_exceptions_tenantId_companyId_reason_idx" ON "card_exceptions"("tenantId", "companyId", "reason");

-- CreateIndex
CREATE INDEX "expenses_tenantId_companyId_idx" ON "expenses"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "expenses_tenantId_companyId_status_idx" ON "expenses"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "expenses_tenantId_companyId_categoryId_idx" ON "expenses"("tenantId", "companyId", "categoryId");

-- CreateIndex
CREATE INDEX "expenses_tenantId_companyId_expenseDate_idx" ON "expenses"("tenantId", "companyId", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_tenantId_companyId_accountId_idx" ON "expenses"("tenantId", "companyId", "accountId");

-- CreateIndex
CREATE INDEX "expenses_tenantId_companyId_submittedBy_idx" ON "expenses"("tenantId", "companyId", "submittedBy");

-- CreateIndex
CREATE INDEX "expenses_tenantId_companyId_isBillable_idx" ON "expenses"("tenantId", "companyId", "isBillable");

-- CreateIndex
CREATE INDEX "fixed_asset_categories_tenantId_companyId_idx" ON "fixed_asset_categories"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "fixed_assets_tenantId_companyId_idx" ON "fixed_assets"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "fixed_assets_tenantId_companyId_categoryId_idx" ON "fixed_assets"("tenantId", "companyId", "categoryId");

-- CreateIndex
CREATE INDEX "fixed_asset_depreciations_tenantId_companyId_idx" ON "fixed_asset_depreciations"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "fixed_asset_depreciations_tenantId_companyId_assetId_idx" ON "fixed_asset_depreciations"("tenantId", "companyId", "assetId");

-- CreateIndex
CREATE INDEX "fixed_asset_depreciations_tenantId_companyId_period_idx" ON "fixed_asset_depreciations"("tenantId", "companyId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_creditNoteNumber_key" ON "credit_notes"("creditNoteNumber");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_companyId_idx" ON "credit_notes"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_companyId_status_idx" ON "credit_notes"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_companyId_issueDate_idx" ON "credit_notes"("tenantId", "companyId", "issueDate");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_customerId_idx" ON "credit_notes"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "credit_notes_tenantId_invoiceId_idx" ON "credit_notes"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "credit_note_lines_tenantId_creditNoteId_idx" ON "credit_note_lines"("tenantId", "creditNoteId");

-- CreateIndex
CREATE INDEX "ocr_receipts_tenantId_companyId_idx" ON "ocr_receipts"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "ocr_receipts_tenantId_companyId_createdAt_idx" ON "ocr_receipts"("tenantId", "companyId", "createdAt");

-- CreateIndex
CREATE INDEX "currency_alerts_tenantId_companyId_idx" ON "currency_alerts"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "currency_alerts_fromCurrency_toCurrency_idx" ON "currency_alerts"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "unified_approval_workflows_tenantId_companyId_idx" ON "unified_approval_workflows"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "unified_approval_workflows_tenantId_companyId_entityType_idx" ON "unified_approval_workflows"("tenantId", "companyId", "entityType");

-- CreateIndex
CREATE INDEX "unified_approval_workflows_tenantId_companyId_entityType_entitySubType_idx" ON "unified_approval_workflows"("tenantId", "companyId", "entityType", "entitySubType");

-- CreateIndex
CREATE INDEX "unified_approval_workflows_tenantId_companyId_isActive_idx" ON "unified_approval_workflows"("tenantId", "companyId", "isActive");

-- CreateIndex
CREATE INDEX "unified_approval_requests_tenantId_companyId_idx" ON "unified_approval_requests"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "unified_approval_requests_tenantId_companyId_entityType_idx" ON "unified_approval_requests"("tenantId", "companyId", "entityType");

-- CreateIndex
CREATE INDEX "unified_approval_requests_tenantId_companyId_entityType_entityId_idx" ON "unified_approval_requests"("tenantId", "companyId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "unified_approval_requests_tenantId_companyId_status_idx" ON "unified_approval_requests"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "unified_approval_requests_tenantId_companyId_requestedBy_idx" ON "unified_approval_requests"("tenantId", "companyId", "requestedBy");

-- CreateIndex
CREATE INDEX "unified_approval_requests_tenantId_companyId_workflowId_idx" ON "unified_approval_requests"("tenantId", "companyId", "workflowId");

-- CreateIndex
CREATE INDEX "unified_approval_assignees_tenantId_approvalRequestId_idx" ON "unified_approval_assignees"("tenantId", "approvalRequestId");

-- CreateIndex
CREATE INDEX "unified_approval_assignees_tenantId_userId_idx" ON "unified_approval_assignees"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "unified_approval_assignees_tenantId_status_idx" ON "unified_approval_assignees"("tenantId", "status");

-- CreateIndex
CREATE INDEX "unified_approval_assignees_tenantId_stepId_idx" ON "unified_approval_assignees"("tenantId", "stepId");

-- CreateIndex
CREATE INDEX "unified_approval_audits_tenantId_approvalRequestId_idx" ON "unified_approval_audits"("tenantId", "approvalRequestId");

-- CreateIndex
CREATE INDEX "unified_approval_audits_tenantId_userId_idx" ON "unified_approval_audits"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "unified_approval_audits_tenantId_action_idx" ON "unified_approval_audits"("tenantId", "action");

-- CreateIndex
CREATE INDEX "unified_approval_audits_tenantId_createdAt_idx" ON "unified_approval_audits"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "unified_approval_templates_tenantId_companyId_idx" ON "unified_approval_templates"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "unified_approval_templates_tenantId_companyId_entityType_idx" ON "unified_approval_templates"("tenantId", "companyId", "entityType");

-- CreateIndex
CREATE INDEX "unified_approval_templates_tenantId_companyId_entityType_entitySubType_idx" ON "unified_approval_templates"("tenantId", "companyId", "entityType", "entitySubType");

-- CreateIndex
CREATE INDEX "unified_approval_templates_tenantId_companyId_isSystem_idx" ON "unified_approval_templates"("tenantId", "companyId", "isSystem");

-- CreateIndex
CREATE INDEX "unified_approval_notification_settings_tenantId_companyId_idx" ON "unified_approval_notification_settings"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "unified_approval_notification_settings_tenantId_userId_idx" ON "unified_approval_notification_settings"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "FinancialGoal_tenantId_companyId_userId_idx" ON "FinancialGoal"("tenantId", "companyId", "userId");

-- CreateIndex
CREATE INDEX "FinancialMilestone_tenantId_goalId_idx" ON "FinancialMilestone"("tenantId", "goalId");

-- CreateIndex
CREATE INDEX "FinancialAdvice_tenantId_companyId_userId_idx" ON "FinancialAdvice"("tenantId", "companyId", "userId");

-- CreateIndex
CREATE INDEX "EducationalContent_category_topic_difficulty_idx" ON "EducationalContent"("category", "topic", "difficulty");

-- CreateIndex
CREATE INDEX "LearningProgress_tenantId_companyId_userId_idx" ON "LearningProgress"("tenantId", "companyId", "userId");

-- CreateIndex
CREATE INDEX "FinancialScenario_tenantId_companyId_userId_idx" ON "FinancialScenario"("tenantId", "companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachSession_sessionId_key" ON "CoachSession"("sessionId");

-- CreateIndex
CREATE INDEX "CoachSession_tenantId_companyId_userId_idx" ON "CoachSession"("tenantId", "companyId", "userId");

-- CreateIndex
CREATE INDEX "AutoBookkeeperConfig_tenantId_companyId_idx" ON "AutoBookkeeperConfig"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoBookkeeperConfig_tenantId_companyId_key" ON "AutoBookkeeperConfig"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "TransactionCategorization_tenantId_companyId_transactionId_idx" ON "TransactionCategorization"("tenantId", "companyId", "transactionId");

-- CreateIndex
CREATE INDEX "AutoReconciliation_tenantId_companyId_idx" ON "AutoReconciliation"("tenantId", "companyId");
