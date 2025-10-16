import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedBankingTest({ tenantId, companyId }: { tenantId: string, companyId: string }) {
  console.log('🌱 Seeding banking test data...')

  // Create additional bank accounts for testing
  const testBankAccounts = await Promise.all([
    prisma.bankAccount.create({
      data: {
        tenantId,
        companyId,
        bankName: 'Bank of America',
        accountNumber: '**** 9999',
        accountType: 'business_checking',
        currency: 'USD',
        balance: 25000.00,
        status: 'active',
        routingNumber: '026009593',
        accountHolder: 'Uruti Hub Limited',
        branchCode: '001',
        branchName: 'Downtown Branch',
        notes: 'Primary operating account for daily transactions'
      }
    }),
    prisma.bankAccount.create({
      data: {
        tenantId,
        companyId,
        bankName: 'Capital One',
        accountNumber: '**** 8888',
        accountType: 'business_savings',
        currency: 'USD',
        balance: 150000.00,
        status: 'active',
        routingNumber: '031176110',
        accountHolder: 'Uruti Hub Limited',
        branchCode: '002',
        branchName: 'Business Center',
        notes: 'High-yield savings for business reserves'
      }
    })
  ])

  console.log(`✅ Created ${testBankAccounts.length} additional bank accounts`)

  // Create diverse bank transactions for cash flow analysis
  const bankTransactions = []
  const bankAccount = testBankAccounts[0] // Use Bank of America account
  
  // Create transactions over the last 30 days with various patterns
  const transactionTypes = ['credit', 'debit']
  const descriptions = [
    'Customer Payment - ABC Corp',
    'Office Rent Payment',
    'Supplier Payment - XYZ Ltd',
    'Client Deposit - Tech Solutions',
    'Utility Bill Payment',
    'Service Revenue - Consulting',
    'Equipment Purchase',
    'Marketing Expense',
    'Subscription Payment',
    'Freelance Payment'
  ]
  
  const merchants = [
    'ABC Corporation',
    'Office Building LLC',
    'XYZ Suppliers',
    'Tech Solutions Inc',
    'City Utilities',
    'Consulting Client',
    'Office Depot',
    'Google Ads',
    'Adobe Creative',
    'Freelancer Platform'
  ]

  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30)
    const transactionDate = new Date()
    transactionDate.setDate(transactionDate.getDate() - daysAgo)
    
    const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)]
    const amount = Math.random() * 5000 + 100 // $100 to $5100
    const description = descriptions[Math.floor(Math.random() * descriptions.length)]
    const merchant = merchants[Math.floor(Math.random() * merchants.length)]
    
    // Create some recurring patterns (same amount, same day of week)
    const isRecurring = Math.random() < 0.3
    let recurringAmount = amount
    let recurringDay = transactionDate.getDay()
    
    if (isRecurring) {
      recurringAmount = Math.floor(amount / 100) * 100 // Round to nearest $100
      recurringDay = Math.floor(Math.random() * 7) // Random day of week
      transactionDate.setDate(transactionDate.getDate() - transactionDate.getDay() + recurringDay)
    }

    const bankTransaction = await prisma.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId: bankAccount.id,
        transactionDate,
        amount: transactionType === 'credit' ? recurringAmount : -recurringAmount,
        currency: 'USD',
        description,
        merchantName: merchant,
        merchantCategory: transactionType === 'credit' ? 'Revenue' : 'Expense',
        transactionType,
        reference: `TXN-${i.toString().padStart(3, '0')}`,
        status: 'unreconciled',
        location: 'Online',
        authorizationCode: `AUTH${Math.random().toString(36).substr(2, 8).toUpperCase()}`
      }
    })
    
    bankTransactions.push(bankTransaction)
  }

  console.log(`✅ Created ${bankTransactions.length} diverse bank transactions`)

  // Create some reconciled transactions for testing (without reconciledBy)
  const reconciledTransactions = await Promise.all([
    prisma.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId: testBankAccounts[0].id,
        transactionDate: new Date('2025-09-04'),
        amount: 1200.00,
        currency: 'USD',
        description: 'Customer Payment - Reconciled',
        transactionType: 'credit',
        reference: 'RECON-001',
        status: 'reconciled',
        reconciledAt: new Date('2025-09-04')
      }
    }),
    prisma.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId: testBankAccounts[1].id,
        transactionDate: new Date('2025-09-03'),
        amount: -850.00,
        currency: 'USD',
        description: 'Office Supplies - Reconciled',
        transactionType: 'debit',
        reference: 'RECON-002',
        status: 'reconciled',
        reconciledAt: new Date('2025-09-03')
      }
    })
  ])

  console.log(`✅ Created ${reconciledTransactions.length} reconciled transactions`)

  // Create some pending transactions for reconciliation testing
  const pendingTransactions = await Promise.all([
    prisma.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId: testBankAccounts[0].id,
        transactionDate: new Date('2025-09-07'),
        amount: 750.00,
        currency: 'USD',
        description: 'Pending Customer Payment',
        transactionType: 'credit',
        reference: 'PENDING-001',
        status: 'pending'
      }
    }),
    prisma.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId: testBankAccounts[1].id,
        transactionDate: new Date('2025-09-08'),
        amount: -1200.00,
        currency: 'USD',
        description: 'Pending Vendor Payment',
        transactionType: 'debit',
        reference: 'PENDING-002',
        status: 'pending'
      }
    })
  ])

  console.log(`✅ Created ${pendingTransactions.length} pending transactions`)

  // Create test payments with bank account integration (using existing transactions)
  const existingTransactions = await prisma.transaction.findMany({
    where: { tenantId, companyId },
    take: 4
  })

  if (existingTransactions.length >= 2) {
    const payments = []
    
    // Payment 1: Invoice payment with bank account
    const payment1 = await prisma.payment.create({
      data: {
        tenantId,
        companyId,
        transactionId: existingTransactions[0].id,
        method: 'bank_transfer',
        reference: 'PAY-TEST-001',
        amount: 1000.00,
        paymentDate: new Date('2025-09-05'),
        bankAccountId: testBankAccounts[0].id
      }
    })

    // Create corresponding bank transaction
    const bankTxn1 = await prisma.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId: testBankAccounts[0].id,
        transactionDate: new Date('2025-09-05'),
        amount: 1000.00,
        currency: 'USD',
        description: 'Payment for transaction',
        transactionType: 'credit',
        reference: 'PAY-TEST-001',
        status: 'reconciled'
      }
    })

    // Link payment to bank transaction
    await prisma.payment.update({
      where: { id: payment1.id },
      data: { bankTransactionId: bankTxn1.id }
    })

    // Update bank account balance
    await prisma.bankAccount.update({
      where: { id: testBankAccounts[0].id },
      data: { 
        balance: 25000.00 + 1000.00,
        lastSyncAt: new Date()
      }
    })

    payments.push(payment1)

    // Payment 2: Bill payment with different bank account
    const payment2 = await prisma.payment.create({
      data: {
        tenantId,
        companyId,
        transactionId: existingTransactions[1].id,
        method: 'check',
        reference: 'CHECK-TEST-001',
        amount: 500.00,
        paymentDate: new Date('2025-09-06'),
        bankAccountId: testBankAccounts[1].id
      }
    })

    // Create corresponding bank transaction
    const bankTxn2 = await prisma.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId: testBankAccounts[1].id,
        transactionDate: new Date('2025-09-06'),
        amount: -500.00,
        currency: 'USD',
        description: 'Payment for transaction',
        transactionType: 'debit',
        reference: 'CHECK-TEST-001',
        status: 'reconciled'
      }
    })

    // Link payment to bank transaction
    await prisma.payment.update({
      where: { id: payment2.id },
      data: { bankTransactionId: bankTxn2.id }
    })

    // Update bank account balance
    await prisma.bankAccount.update({
      where: { id: testBankAccounts[1].id },
      data: { 
        balance: 150000.00 - 500.00,
        lastSyncAt: new Date()
      }
    })

    payments.push(payment2)

    console.log(`✅ Created ${payments.length} integrated payments with bank transactions`)
  }

  console.log('🎉 Banking test seed data completed!')
  console.log(`📊 Summary:`)
  console.log(`   - Additional Bank Accounts: ${testBankAccounts.length}`)
  console.log(`   - Bank Transactions: ${bankTransactions.length}`)
  console.log(`   - Reconciled Transactions: ${reconciledTransactions.length}`)
  console.log(`   - Pending Transactions: ${pendingTransactions.length}`)

  return {
    bankAccounts: testBankAccounts,
    bankTransactions: bankTransactions,
    reconciledTransactions,
    pendingTransactions
  }
}
