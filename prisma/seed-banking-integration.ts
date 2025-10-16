import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedBankingIntegrationData({ tenantId, companyId }: { tenantId: string, companyId: string }) {
  console.log('🌱 Seeding banking integration data...')

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

  // Create test invoices for payment testing
  const testInvoices = await Promise.all([
    prisma.invoice.create({
      data: {
        tenantId,
        companyId,
        invoiceNumber: 'INV-TEST-001',
        customerId: 'seed-customer-1',
        issueDate: new Date('2025-09-01'),
        dueDate: new Date('2025-09-15'),
        status: 'posted',
        subtotal: 5000.00,
        taxAmount: 500.00,
        totalAmount: 5500.00,
        balanceDue: 5500.00,
        currency: 'USD',
        notes: 'Test invoice for payment integration'
      }
    }),
    prisma.invoice.create({
      data: {
        tenantId,
        companyId,
        invoiceNumber: 'INV-TEST-002',
        customerId: 'seed-customer-2',
        issueDate: new Date('2025-09-02'),
        dueDate: new Date('2025-09-16'),
        status: 'posted',
        subtotal: 3000.00,
        taxAmount: 300.00,
        totalAmount: 3300.00,
        balanceDue: 3300.00,
        currency: 'USD',
        notes: 'Another test invoice for payment testing'
      }
    })
  ])

  console.log(`✅ Created ${testInvoices.length} test invoices`)

  // Create test bills for payment testing
  const testBills = await Promise.all([
    prisma.bill.create({
      data: {
        tenantId,
        companyId,
        billNumber: 'BILL-TEST-001',
        vendorId: 'seed-vendor-1',
        billDate: new Date('2025-09-01'),
        dueDate: new Date('2025-09-15'),
        status: 'posted',
        subtotal: 2000.00,
        taxAmount: 200.00,
        totalAmount: 2200.00,
        balanceDue: 2200.00,
        currency: 'USD',
        notes: 'Test bill for payment integration'
      }
    }),
    prisma.bill.create({
      data: {
        tenantId,
        companyId,
        billNumber: 'BILL-TEST-002',
        vendorId: 'seed-vendor-2',
        billDate: new Date('2025-09-02'),
        dueDate: new Date('2025-09-16'),
        status: 'posted',
        subtotal: 1500.00,
        taxAmount: 150.00,
        totalAmount: 1650.00,
        balanceDue: 1650.00,
        currency: 'USD',
        notes: 'Another test bill for payment testing'
      }
    })
  ])

  console.log(`✅ Created ${testBills.length} test bills`)

  // Create test transactions (parent records for payments)
  const testTransactions = await Promise.all([
    prisma.transaction.create({
      data: {
        tenantId,
        companyId,
        transactionType: 'invoice',
        reference: 'INV-TEST-001',
        amount: 5500.00,
        currency: 'USD',
        status: 'posted',
        description: 'Test invoice transaction'
      }
    }),
    prisma.transaction.create({
      data: {
        tenantId,
        companyId,
        transactionType: 'invoice',
        reference: 'INV-TEST-002',
        amount: 3300.00,
        currency: 'USD',
        status: 'posted',
        description: 'Another test invoice transaction'
      }
    }),
    prisma.transaction.create({
      data: {
        tenantId,
        companyId,
        transactionType: 'bill',
        reference: 'BILL-TEST-001',
        amount: 2200.00,
        currency: 'USD',
        status: 'posted',
        description: 'Test bill transaction'
      }
    }),
    prisma.transaction.create({
      data: {
        tenantId,
        companyId,
        transactionType: 'bill',
        reference: 'BILL-TEST-002',
        amount: 1650.00,
        currency: 'USD',
        status: 'posted',
        description: 'Another test bill transaction'
      }
    })
  ])

  console.log(`✅ Created ${testTransactions.length} test transactions`)

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

  // Create some payments with bank account integration
  const payments = []
  
  // Payment 1: Invoice payment with bank account
  const payment1 = await prisma.payment.create({
    data: {
      tenantId,
      companyId,
      transactionId: testTransactions[0].id,
      method: 'bank_transfer',
      reference: 'PAY-001',
      amount: 5500.00,
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
      amount: 5500.00,
      currency: 'USD',
      description: 'Payment for INV-TEST-001',
      transactionType: 'credit',
      reference: 'PAY-001',
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
      balance: 25000.00 + 5500.00,
      lastSyncAt: new Date()
    }
  })

  payments.push(payment1)

  // Payment 2: Bill payment with different bank account
  const payment2 = await prisma.payment.create({
    data: {
      tenantId,
      companyId,
      transactionId: testTransactions[2].id,
      method: 'check',
      reference: 'CHECK-001',
      amount: 2200.00,
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
      amount: -2200.00,
      currency: 'USD',
      description: 'Payment for BILL-TEST-001',
      transactionType: 'debit',
      reference: 'CHECK-001',
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
      balance: 150000.00 - 2200.00,
      lastSyncAt: new Date()
    }
  })

  payments.push(payment2)

  console.log(`✅ Created ${payments.length} integrated payments with bank transactions`)

  // Create payment applications
  await prisma.paymentApplication.create({
    data: {
      tenantId,
      paymentId: payment1.id,
      invoiceId: testInvoices[0].id,
      amount: 5500.00
    }
  })

  await prisma.paymentApplication.create({
    data: {
      tenantId,
      paymentId: payment2.id,
      billId: testBills[0].id,
      amount: 2200.00
    }
  })

  // Update invoice and bill balances
  await prisma.invoice.update({
    where: { id: testInvoices[0].id },
    data: { balanceDue: 0.00 }
  })

  await prisma.bill.update({
    where: { id: testBills[0].id },
    data: { balanceDue: 0.00 }
  })

  console.log(`✅ Created payment applications and updated balances`)

  // Create some reconciled transactions for testing
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
        reconciledAt: new Date('2025-09-04'),
        reconciledBy: 'seed-user-1'
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
        reconciledAt: new Date('2025-09-03'),
        reconciledBy: 'seed-user-1'
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

  console.log('🎉 Banking integration seed data completed!')
  console.log(`📊 Summary:`)
  console.log(`   - Bank Accounts: ${testBankAccounts.length + 4} total (4 existing + ${testBankAccounts.length} new)`)
  console.log(`   - Test Invoices: ${testInvoices.length}`)
  console.log(`   - Test Bills: ${testBills.length}`)
  console.log(`   - Test Transactions: ${testTransactions.length}`)
  console.log(`   - Bank Transactions: ${bankTransactions.length + 4} total`)
  console.log(`   - Integrated Payments: ${payments.length}`)
  console.log(`   - Reconciled Transactions: ${reconciledTransactions.length}`)
  console.log(`   - Pending Transactions: ${pendingTransactions.length}`)

  return {
    bankAccounts: testBankAccounts,
    invoices: testInvoices,
    bills: testBills,
    transactions: testTransactions,
    bankTransactions: bankTransactions,
    payments,
    reconciledTransactions,
    pendingTransactions
  }
}
