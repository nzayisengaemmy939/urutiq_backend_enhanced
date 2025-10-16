import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedBankingData({ tenantId, companyId }: { tenantId: string; companyId: string }) {
  console.log(`Seeding banking data for company ${companyId}...`);

  // Create bank accounts
  const bankAccounts = await createBankAccounts(tenantId, companyId);
  
  // Create bank transactions for each account
  for (const account of bankAccounts) {
    await createBankTransactions(tenantId, account.id, account.accountType);
  }

  // Create some payments
  await createPayments(tenantId, companyId);

  console.log(`Banking data seeded for company ${companyId}`);
}

async function createBankAccounts(tenantId: string, companyId: string) {
  const bankAccounts = [
    {
      id: `bank-account-${companyId}-1`,
      bankName: "Chase Bank",
      accountNumber: "**** 1234",
      accountType: "business_checking",
      currency: "USD",
      balance: 45230.50,
      routingNumber: "021000021",
      accountHolder: "Uruti Hub Limited",
      branchName: "Main Street Branch",
      branchCode: "001",
      notes: "Primary business checking account"
    },
    {
      id: `bank-account-${companyId}-2`,
      bankName: "Chase Bank",
      accountNumber: "**** 5678",
      accountType: "business_savings",
      currency: "USD",
      balance: 128450.75,
      routingNumber: "021000021",
      accountHolder: "Uruti Hub Limited",
      branchName: "Main Street Branch",
      branchCode: "001",
      notes: "Business savings account for reserves"
    },
    {
      id: `bank-account-${companyId}-3`,
      bankName: "American Express",
      accountNumber: "**** 9012",
      accountType: "credit",
      currency: "USD",
      balance: -3240.25,
      accountHolder: "Uruti Hub Limited",
      notes: "Business credit card for expenses"
    },
    {
      id: `bank-account-${companyId}-4`,
      bankName: "Wells Fargo",
      accountNumber: "**** 3456",
      accountType: "money_market",
      currency: "USD",
      balance: 75000.00,
      routingNumber: "121000248",
      accountHolder: "Uruti Hub Limited",
      branchName: "Financial District Branch",
      branchCode: "002",
      notes: "Money market account for investments"
    }
  ];

  const createdAccounts = [];
  for (const account of bankAccounts) {
    const created = await prisma.bankAccount.upsert({
      where: { id: account.id },
      update: {
        balance: account.balance,
        lastSyncAt: new Date()
      },
      create: {
        id: account.id,
        tenantId,
        companyId,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        currency: account.currency,
        balance: account.balance,
        routingNumber: account.routingNumber,
        accountHolder: account.accountHolder,
        branchName: account.branchName,
        branchCode: account.branchCode,
        notes: account.notes,
        lastSyncAt: new Date()
      }
    });
    createdAccounts.push(created);
  }

  return createdAccounts;
}

async function createBankTransactions(tenantId: string, bankAccountId: string, accountType: string) {
  const transactions = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3); // Last 3 months

  // Generate different types of transactions based on account type
  if (accountType === "business_checking") {
    transactions.push(...generateCheckingTransactions(startDate));
  } else if (accountType === "business_savings") {
    transactions.push(...generateSavingsTransactions(startDate));
  } else if (accountType === "credit") {
    transactions.push(...generateCreditTransactions(startDate));
  } else if (accountType === "money_market") {
    transactions.push(...generateMoneyMarketTransactions(startDate));
  }

  for (const transaction of transactions) {
    await prisma.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId,
        transactionDate: transaction.transactionDate,
        postedDate: transaction.postedDate,
        amount: transaction.amount,
        currency: "USD",
        description: transaction.description,
        merchantName: transaction.merchantName,
        merchantCategory: transaction.merchantCategory,
        transactionType: transaction.transactionType,
        reference: transaction.reference,
        category: transaction.category,
        status: transaction.status,
        fees: transaction.fees || 0,
        location: transaction.location
      }
    });
  }

  console.log(`Created ${transactions.length} transactions for account ${bankAccountId}`);
}

function generateCheckingTransactions(startDate: Date) {
  const transactions = [];
  const currentDate = new Date();

  // Income transactions (credits)
  const incomeTransactions = [
    { description: "Customer Payment - Invoice #INV-001", merchantName: "Customer A", amount: 5000, category: "income" },
    { description: "Customer Payment - Invoice #INV-002", merchantName: "Customer B", amount: 7500, category: "income" },
    { description: "Customer Payment - Invoice #INV-003", merchantName: "Customer C", amount: 3200, category: "income" },
    { description: "Service Revenue Payment", merchantName: "Client XYZ", amount: 4500, category: "income" },
    { description: "Refund Received", merchantName: "Vendor ABC", amount: 1200, category: "income" },
    { description: "Interest Earned", merchantName: "Chase Bank", amount: 45.50, category: "interest" },
    { description: "Customer Payment - Invoice #INV-004", merchantName: "Customer D", amount: 6800, category: "income" },
    { description: "Consulting Fee Payment", merchantName: "Client DEF", amount: 2500, category: "income" }
  ];

  // Expense transactions (debits)
  const expenseTransactions = [
    { description: "Office Rent Payment", merchantName: "Property Management Co", amount: -5000, category: "rent" },
    { description: "Utility Bill Payment", merchantName: "Electric Company", amount: -450, category: "utilities" },
    { description: "Internet Service", merchantName: "ISP Provider", amount: -120, category: "utilities" },
    { description: "Office Supplies", merchantName: "Office Depot", amount: -350, category: "office_supplies" },
    { description: "Software License", merchantName: "Software Corp", amount: -800, category: "software" },
    { description: "Marketing Campaign", merchantName: "Marketing Agency", amount: -2000, category: "marketing" },
    { description: "Employee Salary", merchantName: "Payroll Service", amount: -15000, category: "payroll" },
    { description: "Insurance Premium", merchantName: "Insurance Co", amount: -600, category: "insurance" },
    { description: "Bank Service Fee", merchantName: "Chase Bank", amount: -25, category: "bank_fees" },
    { description: "Equipment Purchase", merchantName: "Tech Store", amount: -1200, category: "equipment" },
    { description: "Travel Expense", merchantName: "Airline Co", amount: -800, category: "travel" },
    { description: "Professional Services", merchantName: "Law Firm", amount: -1500, category: "professional" }
  ];

  // Generate income transactions (spread over 3 months)
  incomeTransactions.forEach((txn, index) => {
    const transactionDate = new Date(startDate);
    transactionDate.setDate(startDate.getDate() + (index * 10));
    
    transactions.push({
      transactionDate,
      postedDate: new Date(transactionDate.getTime() + 24 * 60 * 60 * 1000), // Next day
      amount: txn.amount,
      description: txn.description,
      merchantName: txn.merchantName,
      merchantCategory: txn.category,
      transactionType: "credit",
      reference: `REF-${String(index + 1).padStart(3, '0')}`,
      category: txn.category,
      status: Math.random() > 0.2 ? "reconciled" : "unreconciled",
      fees: 0,
      location: "Online"
    });
  });

  // Generate expense transactions (spread over 3 months)
  expenseTransactions.forEach((txn, index) => {
    const transactionDate = new Date(startDate);
    transactionDate.setDate(startDate.getDate() + (index * 8));
    
    transactions.push({
      transactionDate,
      postedDate: new Date(transactionDate.getTime() + 24 * 60 * 60 * 1000), // Next day
      amount: txn.amount,
      description: txn.description,
      merchantName: txn.merchantName,
      merchantCategory: txn.category,
      transactionType: "debit",
      reference: `EXP-${String(index + 1).padStart(3, '0')}`,
      category: txn.category,
      status: Math.random() > 0.3 ? "reconciled" : "unreconciled",
      fees: Math.random() > 0.8 ? 2.50 : 0,
      location: "Online"
    });
  });

  return transactions;
}

function generateSavingsTransactions(startDate: Date) {
  const transactions = [];
  
  // Savings account typically has fewer, larger transactions
  const savingsTransactions = [
    { description: "Transfer from Checking", merchantName: "Internal Transfer", amount: 10000, category: "transfer" },
    { description: "Interest Earned", merchantName: "Chase Bank", amount: 125.75, category: "interest" },
    { description: "Transfer from Checking", merchantName: "Internal Transfer", amount: 5000, category: "transfer" },
    { description: "Interest Earned", merchantName: "Chase Bank", amount: 98.50, category: "interest" },
    { description: "Emergency Fund Deposit", merchantName: "Internal Transfer", amount: 15000, category: "transfer" },
    { description: "Interest Earned", merchantName: "Chase Bank", amount: 156.25, category: "interest" }
  ];

  savingsTransactions.forEach((txn, index) => {
    const transactionDate = new Date(startDate);
    transactionDate.setDate(startDate.getDate() + (index * 15));
    
    transactions.push({
      transactionDate,
      postedDate: new Date(transactionDate.getTime() + 24 * 60 * 60 * 1000),
      amount: txn.amount,
      description: txn.description,
      merchantName: txn.merchantName,
      merchantCategory: txn.category,
      transactionType: "credit",
      reference: `SAV-${String(index + 1).padStart(3, '0')}`,
      category: txn.category,
      status: "reconciled",
      fees: 0,
      location: "Online"
    });
  });

  return transactions;
}

function generateCreditTransactions(startDate: Date) {
  const transactions = [];
  
  // Credit card transactions (all debits, representing expenses)
  const creditTransactions = [
    { description: "Office Supplies Purchase", merchantName: "Office Depot", amount: -250, category: "office_supplies" },
    { description: "Business Lunch", merchantName: "Restaurant ABC", amount: -85, category: "meals" },
    { description: "Software Subscription", merchantName: "Software Corp", amount: -120, category: "software" },
    { description: "Marketing Materials", merchantName: "Print Shop", amount: -450, category: "marketing" },
    { description: "Travel Expense", merchantName: "Hotel Chain", amount: -320, category: "travel" },
    { description: "Equipment Purchase", merchantName: "Tech Store", amount: -800, category: "equipment" },
    { description: "Business Dinner", merchantName: "Restaurant XYZ", amount: -150, category: "meals" },
    { description: "Office Furniture", merchantName: "Furniture Store", amount: -1200, category: "office_supplies" },
    { description: "Internet Service", merchantName: "ISP Provider", amount: -95, category: "utilities" },
    { description: "Phone Service", merchantName: "Phone Company", amount: -75, category: "utilities" }
  ];

  creditTransactions.forEach((txn, index) => {
    const transactionDate = new Date(startDate);
    transactionDate.setDate(startDate.getDate() + (index * 7));
    
    transactions.push({
      transactionDate,
      postedDate: new Date(transactionDate.getTime() + 24 * 60 * 60 * 1000),
      amount: txn.amount,
      description: txn.description,
      merchantName: txn.merchantName,
      merchantCategory: txn.category,
      transactionType: "debit",
      reference: `CC-${String(index + 1).padStart(3, '0')}`,
      category: txn.category,
      status: Math.random() > 0.4 ? "reconciled" : "unreconciled",
      fees: 0,
      location: "Online"
    });
  });

  return transactions;
}

function generateMoneyMarketTransactions(startDate: Date) {
  const transactions = [];
  
  // Money market account transactions
  const moneyMarketTransactions = [
    { description: "Initial Deposit", merchantName: "Internal Transfer", amount: 50000, category: "deposit" },
    { description: "Interest Earned", merchantName: "Wells Fargo", amount: 125.50, category: "interest" },
    { description: "Additional Deposit", merchantName: "Internal Transfer", amount: 25000, category: "deposit" },
    { description: "Interest Earned", merchantName: "Wells Fargo", amount: 187.75, category: "interest" },
    { description: "Interest Earned", merchantName: "Wells Fargo", amount: 156.25, category: "interest" }
  ];

  moneyMarketTransactions.forEach((txn, index) => {
    const transactionDate = new Date(startDate);
    transactionDate.setDate(startDate.getDate() + (index * 20));
    
    transactions.push({
      transactionDate,
      postedDate: new Date(transactionDate.getTime() + 24 * 60 * 60 * 1000),
      amount: txn.amount,
      description: txn.description,
      merchantName: txn.merchantName,
      merchantCategory: txn.category,
      transactionType: "credit",
      reference: `MM-${String(index + 1).padStart(3, '0')}`,
      category: txn.category,
      status: "reconciled",
      fees: 0,
      location: "Online"
    });
  });

  return transactions;
}

async function createPayments(tenantId: string, companyId: string) {
  // Get some transactions to create payments for
  const transactions = await prisma.transaction.findMany({
    where: { tenantId, companyId },
    take: 5
  });

  if (transactions.length === 0) {
    console.log("No transactions found to create payments for");
    return;
  }

  // Get a bank account
  const bankAccount = await prisma.bankAccount.findFirst({
    where: { tenantId, companyId }
  });

  if (!bankAccount) {
    console.log("No bank account found to create payments for");
    return;
  }

  const payments = [
    {
      transactionId: transactions[0].id,
      method: "ACH",
      reference: "PAY-001",
      amount: 5000,
      paymentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    },
    {
      transactionId: transactions[1]?.id || transactions[0].id,
      method: "Wire Transfer",
      reference: "PAY-002",
      amount: 7500,
      paymentDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) // 25 days ago
    },
    {
      transactionId: transactions[2]?.id || transactions[0].id,
      method: "Check",
      reference: "PAY-003",
      amount: 3200,
      paymentDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
    }
  ];

  for (const payment of payments) {
    await prisma.payment.upsert({
      where: { id: `payment-${companyId}-${payment.reference}` },
      update: {},
      create: {
        id: `payment-${companyId}-${payment.reference}`,
        tenantId,
        companyId,
        transactionId: payment.transactionId,
        method: payment.method,
        reference: payment.reference,
        amount: payment.amount,
        paymentDate: payment.paymentDate
      }
    });
  }

  console.log(`Created ${payments.length} payments for company ${companyId}`);
}
