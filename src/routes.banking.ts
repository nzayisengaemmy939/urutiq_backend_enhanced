import type { Router } from 'express';
import { prisma } from './prisma';
import { TenantRequest } from './tenant';
import { bankingSchemas, validateBody } from './validate';
import { getAccountByPurpose } from './accounts';
import { enqueueAiJob } from './queue';
import { BankIntegrationService } from './services/bank-integration-service';
import { AICategorizationService } from './services/ai-categorization-service';
import { SmartReconciliationService } from './services/smart-reconciliation-service';
import { CurrencyService } from './services/currency-service';
import { PaymentProcessorService } from './services/payment-processor-service';
import { AdvancedAnalyticsService } from './services/advanced-analytics-service';
import { BankConnectionService } from './services/bank-connection-service';
import { MobileBankingService } from './services/mobile-banking-service';
import { MobileMoneyService } from './services/mobile-money-service';

export function mountBankingRoutes(router: Router) {
  // Bank accounts
  router.get('/bank-accounts', async (req: TenantRequest, res) => {
    try {
      console.log('=== GET BANK ACCOUNTS DEBUG ===')
      console.log('Request query:', req.query)
      console.log('Request headers:', req.headers)
      
      const queryCompanyId = String(req.query.companyId || '');
      const headerCompanyId = req.headers['x-company-id'] as string;
      
      // Use query companyId if it's valid, otherwise fall back to header
      const companyId = (queryCompanyId && queryCompanyId !== 'personal') ? queryCompanyId : headerCompanyId;
      
      console.log('Query companyId:', queryCompanyId)
      console.log('Header companyId:', headerCompanyId)
      console.log('Final companyId:', companyId)
      
      const rows = await prisma.bankAccount.findMany({ 
        where: { tenantId: req.tenantId, companyId },
        include: {
          _count: {
            select: { transactions: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('Found bank accounts:', rows.length)
      console.log('Bank accounts data:', rows.map(a => ({ id: a.id, bankName: a.bankName, status: a.status })))
      
      res.json(rows);
    } catch (error) {
      console.error('Error getting bank accounts:', error);
      res.status(500).json({ error: 'failed_to_get_bank_accounts', message: error.message });
    }
  });

  // Bank transactions
  router.get('/bank-transactions', async (req: TenantRequest, res) => {
    try {
      const bankAccountId = String(req.query.bankAccountId || '');
      const companyId = String(req.query.companyId || '');
      const status = String(req.query.status || '');
      const page = parseInt(String(req.query.page || '1'));
      const pageSize = parseInt(String(req.query.pageSize || '50'));
      
      const where: any = { tenantId: req.tenantId };
      
      if (bankAccountId) {
        where.bankAccountId = bankAccountId;
      }
      
      if (status) {
        where.status = status;
      }
      
      // If companyId is provided, we need to find bank accounts for that company first
      let bankAccountIds: string[] = [];
      if (companyId) {
        const bankAccounts = await prisma.bankAccount.findMany({
          where: { tenantId: req.tenantId, companyId },
          select: { id: true }
        });
        bankAccountIds = bankAccounts.map(ba => ba.id);
        
        if (bankAccountIds.length === 0) {
          // No bank accounts found for this company
          return res.json({
            items: [],
            page,
            pageSize,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          });
        }
        
        where.bankAccountId = { in: bankAccountIds };
      }
      
      const [rows, total] = await Promise.all([
        prisma.bankTransaction.findMany({ 
          where,
          include: {
            bankAccount: {
              select: { id: true, bankName: true, accountNumber: true, accountType: true }
            },
            reconciledByUser: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { transactionDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.bankTransaction.count({ where })
      ]);
      
      res.json({
        items: rows,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrev: page > 1
      });
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
      res.status(500).json({ error: 'internal_server_error', message: 'Failed to fetch bank transactions' });
    }
  });
  router.post('/bank-accounts', validateBody(bankingSchemas.bankAccountCreate), async (req: TenantRequest, res) => {
    const { 
      companyId, 
      bankName, 
      accountNumber, 
      accountType = 'checking',
      currency = 'USD',
      routingNumber,
      swiftCode,
      iban,
      accountHolder,
      branchCode,
      branchName,
      notes
    } = req.body as any;
    
    const created = await prisma.bankAccount.create({ 
      data: { 
        tenantId: req.tenantId!, 
        companyId, 
        bankName, 
        accountNumber,
        accountType,
        currency,
        routingNumber,
        swiftCode,
        iban,
        accountHolder,
        branchCode,
        branchName,
        notes
      } 
    });
    res.status(201).json(created);
  });

  // Payments: list payments for reconciliation
  router.get('/payments', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      const page = parseInt(String(req.query.page || '1'));
      const pageSize = parseInt(String(req.query.pageSize || '50'));
      
      // For now, return empty payments array since Payment model has complex dependencies
      // TODO: Implement proper payment seeding and querying
      res.json({
        items: [],
        page,
        pageSize,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: 'internal_server_error', message: 'Failed to fetch payments' });
    }
  });

  // Payments: link to transaction (invoice/bill), update balances, post journal
  router.post('/payments', validateBody(bankingSchemas.paymentCreate), async (req: TenantRequest, res) => {
    const { companyId, transactionId, bankAccountId, method, reference, amount, paymentDate, applications, fxGainLoss } = req.body as any;
    const txn = await prisma.transaction.findFirst({ where: { id: transactionId, tenantId: req.tenantId } });
    if (!txn) return res.status(404).json({ error: 'transaction_not_found' });

    const company = await prisma.company.findFirst({ where: { id: companyId, tenantId: req.tenantId } });
    if (!company) return res.status(404).json({ error: 'company_not_found' });

    // resolve cash/bank account and AR/AP based on transaction type
    const cash = await getAccountByPurpose(req.tenantId!, companyId, 'CASH');
    const ar = await getAccountByPurpose(req.tenantId!, companyId, 'AR');
    const ap = await getAccountByPurpose(req.tenantId!, companyId, 'AP');
    if (!cash || !ar || !ap) return res.status(400).json({ error: 'missing_accounts', message: 'Require mappings for CASH, AR, and AP' });

    const result = await prisma.$transaction(async (tx) => {
      // create bank transaction first (credit for invoice payment receipt, debit for bill payment)
      const bankTxnType = txn.transactionType === 'invoice' ? 'credit' : 'debit';
      const bankTransaction = await tx.bankTransaction.create({ 
        data: { 
          tenantId: req.tenantId!, 
          bankAccountId, 
          transactionDate: new Date(paymentDate), 
          amount, 
          transactionType: bankTxnType, 
          description: reference || `Payment for ${txn.transactionType} ${txn.reference || transactionId}`, 
          status: 'reconciled' // Auto-reconciled since it's created from payment
        } 
      });
      
      // create payment with bank transaction link
      const payment = await tx.payment.create({ 
        data: { 
          tenantId: req.tenantId!, 
          companyId, 
          transactionId, 
          bankAccountId,
          bankTransactionId: bankTransaction.id,
          method, 
          reference, 
          amount, 
          paymentDate: new Date(paymentDate) 
        } 
      });

      // apply to specified invoices/bills if provided; else naive oldest-first
      if (Array.isArray(applications) && applications.length > 0) {
        for (const app of applications) {
          if (app.invoiceId) {
            const inv = await tx.invoice.findFirst({ where: { id: app.invoiceId, tenantId: req.tenantId!, companyId } });
            if (inv) {
              const applied = Math.min(Number(inv.balanceDue), Number(app.amount));
              await tx.paymentApplication.create({ data: { tenantId: req.tenantId!, paymentId: payment.id, invoiceId: inv.id, amount: applied } });
              await tx.invoice.update({ where: { id: inv.id }, data: { balanceDue: Number(inv.balanceDue) - applied } });
            }
          } else if (app.billId) {
            const bill = await tx.bill.findFirst({ where: { id: app.billId, tenantId: req.tenantId!, companyId } });
            if (bill) {
              const applied = Math.min(Number(bill.balanceDue), Number(app.amount));
              await tx.paymentApplication.create({ data: { tenantId: req.tenantId!, paymentId: payment.id, billId: bill.id, amount: applied } });
              await tx.bill.update({ where: { id: bill.id }, data: { balanceDue: Number(bill.balanceDue) - applied } });
            }
          }
        }
      } else {
        if (txn.transactionType === 'invoice') {
          const inv = await tx.invoice.findFirst({ where: { tenantId: req.tenantId!, companyId, status: 'posted', balanceDue: { gt: 0 } }, orderBy: { issueDate: 'asc' } });
          if (inv) {
            const applied = Math.min(Number(inv.balanceDue), Number(amount));
            await tx.paymentApplication.create({ data: { tenantId: req.tenantId!, paymentId: payment.id, invoiceId: inv.id, amount: applied } });
            await tx.invoice.update({ where: { id: inv.id }, data: { balanceDue: Number(inv.balanceDue) - applied } });
          }
        } else if (txn.transactionType === 'bill') {
          const bill = await tx.bill.findFirst({ where: { tenantId: req.tenantId!, companyId, status: 'posted', balanceDue: { gt: 0 } }, orderBy: { billDate: 'asc' } });
          if (bill) {
            const applied = Math.min(Number(bill.balanceDue), Number(amount));
            await tx.paymentApplication.create({ data: { tenantId: req.tenantId!, paymentId: payment.id, billId: bill.id, amount: applied } });
            await tx.bill.update({ where: { id: bill.id }, data: { balanceDue: Number(bill.balanceDue) - applied } });
          }
        }
      }

      // update bank account balance
      if (bankAccountId) {
        const bankAccount = await tx.bankAccount.findFirst({ where: { id: bankAccountId, tenantId: req.tenantId! } });
        if (bankAccount) {
          const balanceChange = bankTxnType === 'credit' ? Number(amount) : -Number(amount);
          const newBalance = Number(bankAccount.balance) + balanceChange;
          await tx.bankAccount.update({ 
            where: { id: bankAccountId }, 
            data: { balance: newBalance, lastSyncAt: new Date() } 
          });
        }
      }

      // post journal for payment
      const entry = await tx.journalEntry.create({ data: { tenantId: req.tenantId!, companyId, date: new Date(paymentDate), memo: `Payment ${txn.transactionType}`, reference, status: 'DRAFT' } });
      if (txn.transactionType === 'invoice') {
        await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: cash.id, debit: amount, credit: 0, memo: 'Cash/Bank' } });
        await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: ar.id, debit: 0, credit: amount, memo: 'AR' } });
      } else {
        await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: ap.id, debit: amount, credit: 0, memo: 'AP' } });
        await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: cash.id, debit: 0, credit: amount, memo: 'Cash/Bank' } });
      }
      // FX gain/loss if provided (positive -> gain, negative -> loss)
      if (typeof fxGainLoss === 'number' && fxGainLoss !== 0) {
        const gainLossPurpose = fxGainLoss > 0 ? 'FX_GAIN' : 'FX_LOSS';
        const glAccount = await getAccountByPurpose(req.tenantId!, companyId, gainLossPurpose);
        if (glAccount) {
          const abs = Math.abs(fxGainLoss);
          if (fxGainLoss > 0) {
            await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: glAccount.id, debit: 0, credit: abs, memo: 'FX Gain' } });
          } else {
            await tx.journalLine.create({ data: { tenantId: req.tenantId!, entryId: entry.id, accountId: glAccount.id, debit: abs, credit: 0, memo: 'FX Loss' } });
          }
        }
      }
      const posted = await tx.journalEntry.update({ where: { id: entry.id }, data: { status: 'POSTED' } });
      return { payment, journal: posted };
    });

    res.status(201).json(result);
  });

  // Create bank transaction
  router.post('/bank-transactions', async (req: TenantRequest, res) => {
    const {
      bankAccountId,
      transactionDate,
      amount,
      currency = 'USD',
      description,
      merchantName,
      merchantCategory,
      transactionType,
      reference,
      checkNumber,
      memo,
      category,
      tags,
      fees = 0,
      exchangeRate,
      originalAmount,
      originalCurrency,
      location,
      authorizationCode
    } = req.body as any;

    const created = await prisma.bankTransaction.create({
      data: {
        tenantId: req.tenantId!,
        bankAccountId,
        transactionDate: new Date(transactionDate),
        amount,
        currency,
        description,
        merchantName,
        merchantCategory,
        transactionType,
        reference,
        checkNumber,
        memo,
        category,
        tags,
        fees,
        exchangeRate,
        originalAmount,
        originalCurrency,
        location,
        authorizationCode
      }
    });
    res.status(201).json(created);
  });

  // Reconcile a bank transaction with a payment
  router.post('/bank-transactions/:id/reconcile', validateBody(bankingSchemas.reconcileBankTxn), async (req: TenantRequest, res) => {
    const { id } = req.params;
    const { paymentId, reconciledBy } = req.body as any;
    const bt = await prisma.bankTransaction.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!bt) return res.status(404).json({ error: 'not_found' });
    
    const updateData: any = { 
      status: 'reconciled', 
      isReconciled: true,
      reconciledAt: new Date()
    };
    
    if (paymentId) {
      const payment = await prisma.payment.findFirst({ where: { id: paymentId, tenantId: req.tenantId } });
      if (!payment) return res.status(404).json({ error: 'payment_not_found' });
      updateData.matchedTransactionId = payment.transactionId;
      updateData.description = bt.description || `Payment ${payment.reference || payment.id}`;
    }
    
    if (reconciledBy) {
      updateData.reconciledBy = reconciledBy;
    }
    
    const updated = await prisma.bankTransaction.update({ where: { id }, data: updateData });
    res.json(updated);
  });

  // Accept raw bank feed (array of transactions) and enqueue processing
  router.post('/bank-feed', async (req: TenantRequest, res) => {
    const feed = req.body as any[];
    if (!Array.isArray(feed) || feed.length === 0) return res.status(400).json({ error: 'invalid_feed' });
    try {
      await enqueueAiJob('process-bank-feed', { tenantId: req.tenantId, companyId: req.query.companyId, feed }, { removeOnComplete: true });
      res.status(202).json({ accepted: true, count: feed.length });
    } catch (e) {
      console.error('enqueue process-bank-feed failed', e);
      res.status(500).json({ error: 'enqueue_failed' });
    }
  });

  // Bank feed integration with accounting entries
  router.post('/bank-transactions/:id/create-journal', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const companyId = String(req.query.companyId || '');
      
      const journalEntry = await BankIntegrationService.createJournalEntriesForBankTransaction(
        req.tenantId!,
        companyId,
        id
      );
      
      res.json({ success: true, journalEntry });
    } catch (error) {
      console.error('Error creating journal entries:', error);
      res.status(500).json({ error: 'failed_to_create_journal', message: error.message });
    }
  });

  // Process bank feed data
  router.post('/bank-feeds/process', async (req: TenantRequest, res) => {
    try {
      const { bankAccountId, feedData } = req.body;
      const companyId = String(req.query.companyId || '');
      
      const results = await BankIntegrationService.processBankFeedData(
        req.tenantId!,
        companyId,
        bankAccountId,
        feedData
      );
      
      res.json({ success: true, results });
    } catch (error) {
      console.error('Error processing bank feed:', error);
      res.status(500).json({ error: 'failed_to_process_feed', message: error.message });
    }
  });

  // Cash flow forecasting
  router.get('/cash-flow-forecast', async (req: TenantRequest, res) => {
    try {
      const bankAccountId = String(req.query.bankAccountId || '');
      const companyId = String(req.query.companyId || '');
      const days = parseInt(String(req.query.days || '30'));
      
      if (!bankAccountId) {
        return res.status(400).json({ error: 'bank_account_id_required' });
      }
      
      const forecast = await BankIntegrationService.generateCashFlowForecast(
        req.tenantId!,
        companyId,
        bankAccountId,
        days
      );
      
      res.json(forecast);
    } catch (error) {
      console.error('Error generating cash flow forecast:', error);
      res.status(500).json({ error: 'failed_to_generate_forecast', message: error.message });
    }
  });

  // AI-powered transaction categorization
  router.post('/bank-transactions/categorize', async (req: TenantRequest, res) => {
    try {
      const { transactionIds } = req.body;
      const companyId = String(req.query.companyId || '');
      
      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ error: 'transaction_ids_required' });
      }
      
      const result = await AICategorizationService.autoCategorizeTransactions(
        req.tenantId!,
        companyId,
        transactionIds
      );
      
      res.json({
        success: true,
        categorized: result.success,
        failed: result.failed,
        results: result.results
      });
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      res.status(500).json({ error: 'failed_to_categorize', message: error.message });
    }
  });

  // Categorize a single transaction
  router.post('/bank-transactions/:id/categorize', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const companyId = String(req.query.companyId || '');
      
      const transaction = await prisma.bankTransaction.findFirst({
        where: { id, tenantId: req.tenantId! }
      });
      
      if (!transaction) {
        return res.status(404).json({ error: 'transaction_not_found' });
      }
      
      const categorization = await AICategorizationService.categorizeTransaction(
        req.tenantId!,
        companyId,
        {
          description: transaction.description || '',
          merchantName: transaction.merchantName || '',
          amount: Number(transaction.amount),
          transactionType: transaction.transactionType as 'credit' | 'debit'
        }
      );
      
      // Update the transaction with categorization
      const updatedTransaction = await prisma.bankTransaction.update({
        where: { id },
        data: {
          category: categorization.category,
          tags: categorization.tags.join(','),
          confidence: categorization.confidence
        }
      });
      
      res.json({
        success: true,
        categorization,
        transaction: updatedTransaction
      });
    } catch (error) {
      console.error('Error categorizing transaction:', error);
      res.status(500).json({ error: 'failed_to_categorize', message: error.message });
    }
  });

  // Learn from user correction
  router.post('/bank-transactions/:id/correct-category', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const { category, subcategory } = req.body;
      const companyId = String(req.query.companyId || '');
      
      if (!category) {
        return res.status(400).json({ error: 'category_required' });
      }
      
      await AICategorizationService.learnFromCorrection(
        req.tenantId!,
        companyId,
        id,
        category,
        subcategory
      );
      
      res.json({ success: true, message: 'Category correction learned' });
    } catch (error) {
      console.error('Error learning from correction:', error);
      res.status(500).json({ error: 'failed_to_learn', message: error.message });
    }
  });

  // Get categorization statistics
  router.get('/categorization-stats', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      
      const stats = await AICategorizationService.getCategorizationStats(
        req.tenantId!,
        companyId
      );
      
      res.json(stats);
    } catch (error) {
      console.error('Error getting categorization stats:', error);
      res.status(500).json({ error: 'failed_to_get_stats', message: error.message });
    }
  });

  // Smart reconciliation endpoints
  router.post('/bank-transactions/:id/find-matches', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const companyId = String(req.query.companyId || '');
      
      const matches = await SmartReconciliationService.findMatches(
        req.tenantId!,
        companyId,
        id
      );
      
      res.json({ success: true, matches });
    } catch (error) {
      console.error('Error finding matches:', error);
      res.status(500).json({ error: 'failed_to_find_matches', message: error.message });
    }
  });

  router.post('/bank-transactions/:id/auto-reconcile', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const companyId = String(req.query.companyId || '');
      
      const result = await SmartReconciliationService.autoReconcile(
        req.tenantId!,
        companyId,
        id
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error auto-reconciling:', error);
      res.status(500).json({ error: 'failed_to_auto_reconcile', message: error.message });
    }
  });

  router.post('/bank-transactions/auto-reconcile-all', async (req: TenantRequest, res) => {
    try {
      const { bankAccountId } = req.body;
      const companyId = String(req.query.companyId || '');
      
      const result = await SmartReconciliationService.runAutoReconciliation(
        req.tenantId!,
        companyId,
        bankAccountId
      );
      
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error running auto-reconciliation:', error);
      res.status(500).json({ error: 'failed_to_auto_reconcile_all', message: error.message });
    }
  });

  router.get('/reconciliation-stats', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      
      const stats = await SmartReconciliationService.getReconciliationStats(
        req.tenantId!,
        companyId
      );
      
      res.json(stats);
    } catch (error) {
      console.error('Error getting reconciliation stats:', error);
      res.status(500).json({ error: 'failed_to_get_reconciliation_stats', message: error.message });
    }
  });

  // Currency endpoints
  router.get('/currencies', async (req: TenantRequest, res) => {
    try {
      const currencies = CurrencyService.getSupportedCurrencies();
      res.json({ success: true, currencies });
    } catch (error) {
      console.error('Error getting currencies:', error);
      res.status(500).json({ error: 'failed_to_get_currencies', message: error.message });
    }
  });

  router.get('/exchange-rates/:fromCurrency/:toCurrency', async (req: TenantRequest, res) => {
    try {
      const { fromCurrency, toCurrency } = req.params;
      const { date } = req.query;
      
      const rate = await CurrencyService.getExchangeRate(
        fromCurrency.toUpperCase(),
        toCurrency.toUpperCase(),
        date ? new Date(date as string) : undefined
      );
      
      res.json({ success: true, rate });
    } catch (error) {
      console.error('Error getting exchange rate:', error);
      res.status(500).json({ error: 'failed_to_get_exchange_rate', message: error.message });
    }
  });

  router.post('/convert-currency', async (req: TenantRequest, res) => {
    try {
      const { amount, fromCurrency, toCurrency, date } = req.body;
      
      if (!amount || !fromCurrency || !toCurrency) {
        return res.status(400).json({ 
          error: 'missing_parameters', 
          message: 'amount, fromCurrency, and toCurrency are required' 
        });
      }
      
      const conversion = await CurrencyService.convertCurrency(
        Number(amount),
        fromCurrency.toUpperCase(),
        toCurrency.toUpperCase(),
        date ? new Date(date) : undefined
      );
      
      res.json({ success: true, conversion });
    } catch (error) {
      console.error('Error converting currency:', error);
      res.status(500).json({ error: 'failed_to_convert_currency', message: error.message });
    }
  });

  router.get('/historical-rates/:fromCurrency/:toCurrency', async (req: TenantRequest, res) => {
    try {
      const { fromCurrency, toCurrency } = req.params;
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ 
          error: 'missing_parameters', 
          message: 'startDate and endDate are required' 
        });
      }
      
      const rates = await CurrencyService.getHistoricalRatesForChart(
        fromCurrency.toUpperCase(),
        toCurrency.toUpperCase(),
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json({ success: true, rates });
    } catch (error) {
      console.error('Error getting historical rates:', error);
      res.status(500).json({ error: 'failed_to_get_historical_rates', message: error.message });
    }
  });

  router.post('/update-exchange-rates', async (req: TenantRequest, res) => {
    try {
      const result = await CurrencyService.updateExchangeRates();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error updating exchange rates:', error);
      res.status(500).json({ error: 'failed_to_update_exchange_rates', message: error.message });
    }
  });

  router.post('/clear-rate-cache', async (req: TenantRequest, res) => {
    try {
      CurrencyService.clearRateCache();
      res.json({ success: true, message: 'Rate cache cleared successfully' });
    } catch (error) {
      console.error('Error clearing rate cache:', error);
      res.status(500).json({ error: 'failed_to_clear_cache', message: error.message });
    }
  });

  router.post('/clear-database-rates/:fromCurrency/:toCurrency', async (req: TenantRequest, res) => {
    try {
      const { fromCurrency, toCurrency } = req.params;
      await CurrencyService.clearDatabaseRates(fromCurrency.toUpperCase(), toCurrency.toUpperCase());
      res.json({ success: true, message: `Database rates cleared for ${fromCurrency}/${toCurrency}` });
    } catch (error) {
      console.error('Error clearing database rates:', error);
      res.status(500).json({ error: 'failed_to_clear_database_rates', message: error.message });
    }
  });

  router.post('/force-refresh-rate/:fromCurrency/:toCurrency', async (req: TenantRequest, res) => {
    try {
      const { fromCurrency, toCurrency } = req.params;
      
      const rate = await CurrencyService.forceRefreshRate(
        fromCurrency.toUpperCase(),
        toCurrency.toUpperCase()
      );
      
      res.json({ success: true, rate });
    } catch (error) {
      console.error('Error force refreshing rate:', error);
      res.status(500).json({ error: 'failed_to_refresh_rate', message: error.message });
    }
  });

  router.post('/format-currency', async (req: TenantRequest, res) => {
    try {
      const { amount, currency } = req.body;
      
      if (!amount || !currency) {
        return res.status(400).json({ 
          error: 'missing_parameters', 
          message: 'amount and currency are required' 
        });
      }
      
      const formatted = CurrencyService.formatCurrency(Number(amount), currency.toUpperCase());
      res.json({ success: true, formatted });
    } catch (error) {
      console.error('Error formatting currency:', error);
      res.status(500).json({ error: 'failed_to_format_currency', message: error.message });
    }
  });

  router.get('/test-exchange-api/:baseCurrency?', async (req: TenantRequest, res) => {
    try {
      const { baseCurrency = 'USD' } = req.params;
      const data = await CurrencyService.testExchangeRateAPI(baseCurrency.toUpperCase());
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error testing exchange API:', error);
      res.status(500).json({ error: 'failed_to_test_api', message: error.message });
    }
  });

  router.post('/force-refresh-historical/:fromCurrency/:toCurrency', async (req: TenantRequest, res) => {
    try {
      const { fromCurrency, toCurrency } = req.params;
      const { startDate, endDate } = req.body;
      
      const rates = await CurrencyService.forceRefreshHistoricalData(
        fromCurrency.toUpperCase(),
        toCurrency.toUpperCase(),
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate || new Date().toISOString().split('T')[0]
      );
      
      res.json({ success: true, rates });
    } catch (error) {
      console.error('Error force refreshing historical data:', error);
      res.status(500).json({ error: 'failed_to_refresh_historical', message: error.message });
    }
  });

  // Payment processor endpoints
  router.post('/payment-processors/initialize', async (req: TenantRequest, res) => {
    try {
      const { processorType, config } = req.body;
      const companyId = String(req.query.companyId || '');
      
      if (!processorType || !config) {
        return res.status(400).json({ 
          error: 'missing_parameters', 
          message: 'processorType and config are required' 
        });
      }
      
      const processorConfig = await PaymentProcessorService.initializeProcessor(
        req.tenantId!,
        companyId,
        processorType,
        config
      );
      
      res.json({ success: true, config: processorConfig });
    } catch (error) {
      console.error('Error initializing payment processor:', error);
      res.status(500).json({ error: 'failed_to_initialize_processor', message: error.message });
    }
  });

  router.post('/payment-intents', async (req: TenantRequest, res) => {
    try {
      const { amount, currency, customerId, paymentMethodId, description, metadata, invoiceId } = req.body;
      const companyId = String(req.query.companyId || '');
      
      if (!amount || !currency) {
        return res.status(400).json({ 
          error: 'missing_parameters', 
          message: 'amount and currency are required' 
        });
      }
      
      const paymentIntent = await PaymentProcessorService.createPaymentIntent(
        req.tenantId!,
        companyId,
        Number(amount),
        currency,
        { customerId, paymentMethodId, description, metadata, invoiceId }
      );
      
      res.json({ success: true, paymentIntent });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: 'failed_to_create_payment_intent', message: error.message });
    }
  });

  router.post('/payment-intents/:id/confirm', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const { paymentMethodId } = req.body;
      const companyId = String(req.query.companyId || '');
      
      const paymentIntent = await PaymentProcessorService.confirmPaymentIntent(
        req.tenantId!,
        companyId,
        id,
        paymentMethodId
      );
      
      res.json({ success: true, paymentIntent });
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      res.status(500).json({ error: 'failed_to_confirm_payment_intent', message: error.message });
    }
  });

  router.post('/payment-customers', async (req: TenantRequest, res) => {
    try {
      console.log('=== BACKEND DEBUG ===')
      console.log('Request body:', req.body)
      console.log('Request headers:', req.headers)
      const { email, name, phone, address, metadata, companyId: bodyCompanyId } = req.body;
      
      // Use header companyId if body companyId is 'personal' or invalid
      const headerCompanyId = req.headers['x-company-id'] as string;
      const companyId = (bodyCompanyId === 'personal' || !bodyCompanyId) ? headerCompanyId : bodyCompanyId;
      
      console.log('Body companyId:', bodyCompanyId)
      console.log('Header companyId:', headerCompanyId)
      console.log('Final companyId:', companyId)
      
      if (!email) {
        return res.status(400).json({ 
          error: 'missing_parameters', 
          message: 'email is required' 
        });
      }
      
      if (!companyId) {
        return res.status(400).json({ 
          error: 'missing_parameters', 
          message: 'companyId is required' 
        });
      }
      
      const customer = await PaymentProcessorService.createCustomer(
        req.tenantId!,
        companyId,
        { email, name, phone, address, metadata }
      );
      
      res.json({ success: true, customer });
    } catch (error) {
      console.error('Error creating customer:', error);
      
      let errorMessage = 'Failed to create customer';
      let statusCode = 500;
      
      if (error.code === 'P2003') {
        errorMessage = 'Invalid company ID. Please check your company selection.';
        statusCode = 400;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(statusCode).json({ 
        error: 'failed_to_create_customer', 
        message: errorMessage 
      });
    }
  });

  router.post('/payment-methods', async (req: TenantRequest, res) => {
    try {
      console.log('=== ADD PAYMENT METHOD DEBUG ===')
      console.log('Request body:', req.body)
      console.log('Request headers:', req.headers)
      
      const { customerId, type, card, bankAccount, isDefault, companyId: bodyCompanyId } = req.body;
      const queryCompanyId = String(req.query.companyId || '');
      const headerCompanyId = req.headers['x-company-id'] as string;
      
      // Use body companyId if valid, then query, then header
      const companyId = (bodyCompanyId && bodyCompanyId !== 'personal') ? bodyCompanyId : 
                       (queryCompanyId && queryCompanyId !== 'personal') ? queryCompanyId : 
                       headerCompanyId;
      
      console.log('Body companyId:', bodyCompanyId)
      console.log('Query companyId:', queryCompanyId)
      console.log('Header companyId:', headerCompanyId)
      console.log('Final companyId:', companyId)
      
      if (!customerId || !type) {
        return res.status(400).json({ 
          error: 'missing_parameters', 
          message: 'customerId and type are required' 
        });
      }
      
      const paymentMethod = await PaymentProcessorService.addPaymentMethod(
        req.tenantId!,
        companyId,
        customerId,
        { type, card, bankAccount, isDefault }
      );
      
      console.log('Payment method created:', paymentMethod.id)
      
      res.json({ success: true, paymentMethod });
    } catch (error) {
      console.error('Error adding payment method:', error);
      res.status(500).json({ error: 'failed_to_add_payment_method', message: error.message });
    }
  });

  router.get('/payment-processors/stats', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      
      const stats = await PaymentProcessorService.getProcessorStats(
        req.tenantId!,
        companyId
      );
      
      res.json({ success: true, ...stats });
    } catch (error) {
      console.error('Error getting processor stats:', error);
      res.status(500).json({ error: 'failed_to_get_processor_stats', message: error.message });
    }
  });

  // Get payment intents
  router.get('/payment-intents', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      const { limit = 20, status, processor } = req.query;
      
      const paymentIntents = await PaymentProcessorService.getPaymentIntents(
        req.tenantId!,
        companyId,
        {
          limit: Number(limit),
          status: status as string,
          processor: processor as string
        }
      );
      
      res.json({ success: true, paymentIntents });
    } catch (error) {
      console.error('Error getting payment intents:', error);
      res.status(500).json({ error: 'failed_to_get_payment_intents', message: error.message });
    }
  });

  // Get payment customers
  router.get('/payment-customers', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      const { limit = 20, search } = req.query;
      
      const customers = await PaymentProcessorService.getCustomers(
        req.tenantId!,
        companyId,
        {
          limit: Number(limit),
          search: search as string
        }
      );
      
      res.json({ success: true, customers });
    } catch (error) {
      console.error('Error getting payment customers:', error);
      res.status(500).json({ error: 'failed_to_get_customers', message: error.message });
    }
  });

  // Get payment methods
  router.get('/payment-methods', async (req: TenantRequest, res) => {
    try {
      console.log('=== GET PAYMENT METHODS DEBUG ===')
      console.log('Request query:', req.query)
      console.log('Request headers:', req.headers)
      
      const queryCompanyId = String(req.query.companyId || '');
      const headerCompanyId = req.headers['x-company-id'] as string;
      
      // Use query companyId if it's valid, otherwise fall back to header
      const companyId = (queryCompanyId && queryCompanyId !== 'personal') ? queryCompanyId : headerCompanyId;
      
      const { customerId, limit = 20 } = req.query;
      
      console.log('Extracted companyId:', companyId)
      console.log('Extracted customerId:', customerId)
      console.log('Extracted limit:', limit)
      
      const paymentMethods = await PaymentProcessorService.getPaymentMethods(
        req.tenantId!,
        companyId,
        {
          customerId: customerId as string,
          limit: Number(limit)
        }
      );
      
      console.log('Found payment methods:', paymentMethods.length)
      console.log('Payment methods data:', paymentMethods)
      
      res.json({ success: true, paymentMethods });
    } catch (error) {
      console.error('Error getting payment methods:', error);
      res.status(500).json({ error: 'failed_to_get_payment_methods', message: error.message });
    }
  });

  // Advanced analytics endpoints
  router.get('/analytics/insights', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      const { industry } = req.query;
      
      const insights = await AdvancedAnalyticsService.generateFinancialInsights(
        req.tenantId!,
        companyId,
        industry as string
      );
      
      res.json({ success: true, insights });
    } catch (error) {
      console.error('Error generating financial insights:', error);
      res.status(500).json({ error: 'failed_to_generate_insights', message: error.message });
    }
  });

  router.get('/analytics/benchmarks/:industry', async (req: TenantRequest, res) => {
    try {
      const { industry } = req.params;
      
      const benchmarks = await AdvancedAnalyticsService.getIndustryBenchmarks(industry);
      
      res.json({ success: true, benchmarks });
    } catch (error) {
      console.error('Error getting industry benchmarks:', error);
      res.status(500).json({ error: 'failed_to_get_benchmarks', message: error.message });
    }
  });

  router.get('/analytics/cash-flow-forecast', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      const { months } = req.query;
      
      const forecast = await AdvancedAnalyticsService.generateCashFlowForecast(
        req.tenantId!,
        companyId,
        months ? Number(months) : 6
      );
      
      res.json({ success: true, forecast });
    } catch (error) {
      console.error('Error generating cash flow forecast:', error);
      res.status(500).json({ error: 'failed_to_generate_forecast', message: error.message });
    }
  });

  // Bank connection endpoints
  router.get('/institutions', async (req: TenantRequest, res) => {
    try {
      const { provider, country, search } = req.query;
      
      const institutions = await BankConnectionService.getInstitutions(
        (provider as 'plaid' | 'yodlee') || 'plaid',
        (country as string) || 'US',
        search as string
      );
      
      res.json({ success: true, institutions });
    } catch (error) {
      console.error('Error getting institutions:', error);
      res.status(500).json({ error: 'failed_to_get_institutions', message: error.message });
    }
  });

  router.post('/connections', async (req: TenantRequest, res) => {
    try {
      console.log('=== CREATE BANK CONNECTION DEBUG ===')
      console.log('Request body:', req.body)
      console.log('Request query:', req.query)
      console.log('Request headers:', req.headers)
      
      const { provider, institutionId, credentials, companyId: bodyCompanyId } = req.body;
      const queryCompanyId = String(req.query.companyId || '');
      const headerCompanyId = req.headers['x-company-id'] as string;
      
      // Use body companyId if valid, then query, then header
      const companyId = (bodyCompanyId && bodyCompanyId !== 'personal') ? bodyCompanyId : 
                       (queryCompanyId && queryCompanyId !== 'personal') ? queryCompanyId : 
                       headerCompanyId;
      
      console.log('Body companyId:', bodyCompanyId)
      console.log('Query companyId:', queryCompanyId)
      console.log('Header companyId:', headerCompanyId)
      console.log('Final companyId:', companyId)
      
      if (!provider || !institutionId || !credentials) {
        return res.status(400).json({ 
          error: 'missing_parameters', 
          message: 'provider, institutionId, and credentials are required' 
        });
      }
      
      if (!companyId) {
        return res.status(400).json({ 
          error: 'missing_company_id', 
          message: 'companyId is required' 
        });
      }
      
      const connection = await BankConnectionService.createConnection(
        req.tenantId!,
        companyId,
        provider,
        institutionId,
        credentials
      );
      
      console.log('Bank connection created successfully:', connection.id)
      res.json({ success: true, connection });
    } catch (error) {
      console.error('Error creating connection:', error);
      res.status(500).json({ error: 'failed_to_create_connection', message: error.message });
    }
  });

  router.get('/connections', async (req: TenantRequest, res) => {
    try {
      console.log('=== GET CONNECTIONS DEBUG ===')
      console.log('Request query:', req.query)
      console.log('Request headers:', req.headers)
      
      const queryCompanyId = String(req.query.companyId || '');
      const headerCompanyId = req.headers['x-company-id'] as string;
      
      // Use query companyId if it's valid, otherwise fall back to header
      const companyId = (queryCompanyId && queryCompanyId !== 'personal') ? queryCompanyId : headerCompanyId;
      
      console.log('Query companyId:', queryCompanyId)
      console.log('Header companyId:', headerCompanyId)
      console.log('Final companyId:', companyId)
      
      const connections = await BankConnectionService.getCompanyConnections(
        req.tenantId!,
        companyId
      );
      
      console.log('Found connections:', connections.length)
      console.log('Connections data:', connections.map(c => ({ id: c.id, bankName: c.bankName, status: c.status })))
      
      res.json({ success: true, connections });
    } catch (error) {
      console.error('Error getting connections:', error);
      res.status(500).json({ error: 'failed_to_get_connections', message: error.message });
    }
  });

  router.get('/connections/:id/status', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      
      const status = await BankConnectionService.getConnectionStatus(id);
      
      res.json({ success: true, ...status });
    } catch (error) {
      console.error('Error getting connection status:', error);
      res.status(500).json({ error: 'failed_to_get_connection_status', message: error.message });
    }
  });

  router.post('/connections/:id/sync', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      
      const result = await BankConnectionService.syncConnection(id);
      
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error syncing connection:', error);
      res.status(500).json({ error: 'failed_to_sync_connection', message: error.message });
    }
  });

  router.post('/connections/:id/disconnect', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      
      await BankConnectionService.disconnectConnection(id);
      
      res.json({ success: true, message: 'Connection disconnected successfully' });
    } catch (error) {
      console.error('Error disconnecting connection:', error);
      res.status(500).json({ error: 'failed_to_disconnect_connection', message: error.message });
    }
  });

  router.post('/connections/:id/reconnect', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      
      await BankConnectionService.reconnectConnection(id);
      
      res.json({ success: true, message: 'Connection reconnected successfully' });
    } catch (error) {
      console.error('Error reconnecting connection:', error);
      res.status(500).json({ error: 'failed_to_reconnect_connection', message: error.message });
    }
  });

  router.get('/connections/stats', async (req: TenantRequest, res) => {
    try {
      console.log('=== GET CONNECTION STATS DEBUG ===')
      console.log('Request query:', req.query)
      console.log('Request headers:', req.headers)
      
      const queryCompanyId = String(req.query.companyId || '');
      const headerCompanyId = req.headers['x-company-id'] as string;
      
      // Use query companyId if it's valid, otherwise fall back to header
      const companyId = (queryCompanyId && queryCompanyId !== 'personal') ? queryCompanyId : headerCompanyId;
      
      console.log('Query companyId:', queryCompanyId)
      console.log('Header companyId:', headerCompanyId)
      console.log('Final companyId:', companyId)
      
      const stats = await BankConnectionService.getConnectionStats(
        req.tenantId!,
        companyId
      );
      
      console.log('Connection stats:', stats)
      
      res.json({ success: true, ...stats });
    } catch (error) {
      console.error('Error getting connection stats:', error);
      res.status(500).json({ error: 'failed_to_get_connection_stats', message: error.message });
    }
  });

  // Mobile banking endpoints
  router.get('/mobile/stats', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      
      const stats = await MobileBankingService.getMobileStats(
        req.tenantId!,
        companyId
      );
      
      res.json({ success: true, ...stats });
    } catch (error) {
      console.error('Error getting mobile stats:', error);
      res.status(500).json({ error: 'failed_to_get_mobile_stats', message: error.message });
    }
  });

  router.get('/mobile/transactions', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      const limit = parseInt(String(req.query.limit || '20'));
      
      const transactions = await MobileBankingService.getMobileTransactions(
        req.tenantId!,
        companyId,
        limit
      );
      
      res.json({ success: true, transactions });
    } catch (error) {
      console.error('Error getting mobile transactions:', error);
      res.status(500).json({ error: 'failed_to_get_mobile_transactions', message: error.message });
    }
  });

  router.get('/mobile/accounts', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      
      const accounts = await MobileBankingService.getMobileAccounts(
        req.tenantId!,
        companyId
      );
      
      res.json({ success: true, accounts });
    } catch (error) {
      console.error('Error getting mobile accounts:', error);
      res.status(500).json({ error: 'failed_to_get_mobile_accounts', message: error.message });
    }
  });

  router.get('/mobile/insights', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      
      const insights = await MobileBankingService.getMobileInsights(
        req.tenantId!,
        companyId
      );
      
      res.json({ success: true, insights });
    } catch (error) {
      console.error('Error getting mobile insights:', error);
      res.status(500).json({ error: 'failed_to_get_mobile_insights', message: error.message });
    }
  });

  router.get('/mobile/notifications', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      
      const notifications = await MobileBankingService.getMobileNotifications(
        req.tenantId!,
        companyId
      );
      
      res.json({ success: true, notifications });
    } catch (error) {
      console.error('Error getting mobile notifications:', error);
      res.status(500).json({ error: 'failed_to_get_mobile_notifications', message: error.message });
    }
  });

  router.get('/mobile/quick-actions', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      
      const quickActions = await MobileBankingService.getQuickActions(
        req.tenantId!,
        companyId
      );
      
      res.json({ success: true, quickActions });
    } catch (error) {
      console.error('Error getting quick actions:', error);
      res.status(500).json({ error: 'failed_to_get_quick_actions', message: error.message });
    }
  });

  router.post('/mobile/quick-actions/:actionId', async (req: TenantRequest, res) => {
    try {
      const { actionId } = req.params;
      const companyId = String(req.query.companyId || '');
      const params = req.body;
      
      const result = await MobileBankingService.executeQuickAction(
        req.tenantId!,
        companyId,
        actionId,
        params
      );
      
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error executing quick action:', error);
      res.status(500).json({ error: 'failed_to_execute_quick_action', message: error.message });
    }
  });

  // Mobile money endpoints
  router.get('/mobile-money/providers', async (req: TenantRequest, res) => {
    try {
      const { country } = req.query;
      
      const providers = await MobileMoneyService.getProviders(country as string);
      
      res.json({ success: true, providers });
    } catch (error) {
      console.error('Error getting mobile money providers:', error);
      res.status(500).json({ error: 'failed_to_get_providers', message: error.message });
    }
  });

  router.get('/mobile-money/providers/:id', async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      
      const provider = await MobileMoneyService.getProvider(id);
      
      if (!provider) {
        return res.status(404).json({ error: 'provider_not_found', message: 'Mobile money provider not found' });
      }
      
      res.json({ success: true, provider });
    } catch (error) {
      console.error('Error getting mobile money provider:', error);
      res.status(500).json({ error: 'failed_to_get_provider', message: error.message });
    }
  });

  router.post('/mobile-money/accounts', async (req: TenantRequest, res) => {
    try {
      console.log('=== CREATE MOBILE MONEY ACCOUNT DEBUG ===')
      console.log('Request body:', req.body)
      console.log('Request query:', req.query)
      console.log('Request headers:', req.headers)
      
      const { provider, accountNumber, accountName, phoneNumber, currency } = req.body;
      const queryCompanyId = String(req.query.companyId || '');
      const headerCompanyId = req.headers['x-company-id'] as string;
      
      // Use query companyId if it's valid, otherwise fall back to header
      const companyId = (queryCompanyId && queryCompanyId !== 'personal') ? queryCompanyId : headerCompanyId;
      
      console.log('Query companyId:', queryCompanyId)
      console.log('Header companyId:', headerCompanyId)
      console.log('Final companyId:', companyId)
      
      if (!provider || !accountNumber || !accountName || !phoneNumber || !currency) {
        return res.status(400).json({ 
          error: 'missing_parameters', 
          message: 'provider, accountNumber, accountName, phoneNumber, and currency are required' 
        });
      }
      
      const account = await MobileMoneyService.createAccount(
        req.tenantId!,
        companyId,
        provider,
        accountNumber,
        accountName,
        phoneNumber,
        currency
      );
      
      console.log('Created mobile money account:', account.id)
      
      res.json({ success: true, account });
    } catch (error) {
      console.error('Error creating mobile money account:', error);
      res.status(500).json({ error: 'failed_to_create_account', message: error.message });
    }
  });

  router.get('/mobile-money/accounts', async (req: TenantRequest, res) => {
    try {
      console.log('=== GET MOBILE MONEY ACCOUNTS DEBUG ===')
      console.log('Request query:', req.query)
      console.log('Request headers:', req.headers)
      
      const queryCompanyId = String(req.query.companyId || '');
      const headerCompanyId = req.headers['x-company-id'] as string;
      
      // Use query companyId if it's valid, otherwise fall back to header
      const companyId = (queryCompanyId && queryCompanyId !== 'personal') ? queryCompanyId : headerCompanyId;
      
      console.log('Query companyId:', queryCompanyId)
      console.log('Header companyId:', headerCompanyId)
      console.log('Final companyId:', companyId)
      
      const accounts = await MobileMoneyService.getCompanyAccounts(
        req.tenantId!,
        companyId
      );
      
      console.log('Found mobile money accounts:', accounts.length)
      console.log('Accounts data:', accounts.map(a => ({ id: a.id, provider: a.provider, phoneNumber: a.phoneNumber })))
      
      res.json({ success: true, accounts });
    } catch (error) {
      console.error('Error getting mobile money accounts:', error);
      res.status(500).json({ error: 'failed_to_get_accounts', message: error.message });
    }
  });

  router.post('/mobile-money/payments', async (req: TenantRequest, res) => {
    try {
      console.log('=== CREATE MOBILE MONEY PAYMENT DEBUG ===')
      console.log('Request body:', req.body)
      console.log('Request query:', req.query)
      console.log('Request headers:', req.headers)
      
      const paymentRequest = req.body;
      const queryCompanyId = String(req.query.companyId || '');
      const headerCompanyId = req.headers['x-company-id'] as string;
      
      // Use query companyId if it's valid, otherwise fall back to header
      const companyId = (queryCompanyId && queryCompanyId !== 'personal') ? queryCompanyId : headerCompanyId;
      
      console.log('Query companyId:', queryCompanyId)
      console.log('Header companyId:', headerCompanyId)
      console.log('Final companyId:', companyId)
      
      const result = await MobileMoneyService.initiatePayment(
        req.tenantId!,
        companyId,
        paymentRequest
      );
      
      console.log('Payment result:', result)
      
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error initiating mobile money payment:', error);
      res.status(500).json({ error: 'failed_to_initiate_payment', message: error.message });
    }
  });

  router.post('/mobile-money/callback/:provider', async (req: TenantRequest, res) => {
    try {
      const { provider } = req.params;
      const { externalReference, status, metadata } = req.body;
      
      await MobileMoneyService.processCallback(provider, externalReference, status, metadata);
      
      res.json({ success: true, message: 'Callback processed successfully' });
    } catch (error) {
      console.error('Error processing mobile money callback:', error);
      res.status(500).json({ error: 'failed_to_process_callback', message: error.message });
    }
  });

  router.get('/mobile-money/transactions', async (req: TenantRequest, res) => {
    try {
      console.log('=== GET MOBILE MONEY TRANSACTIONS DEBUG ===')
      console.log('Request query:', req.query)
      console.log('Request headers:', req.headers)
      
      const queryCompanyId = String(req.query.companyId || '');
      const headerCompanyId = req.headers['x-company-id'] as string;
      
      // Use query companyId if it's valid, otherwise fall back to header
      const companyId = (queryCompanyId && queryCompanyId !== 'personal') ? queryCompanyId : headerCompanyId;
      
      console.log('Query companyId:', queryCompanyId)
      console.log('Header companyId:', headerCompanyId)
      console.log('Final companyId:', companyId)
      
      const provider = req.query.provider as string;
      const limit = parseInt(String(req.query.limit || '50'));
      
      const transactions = await MobileMoneyService.getTransactionHistory(
        req.tenantId!,
        companyId,
        provider,
        limit
      );
      
      console.log('Found mobile money transactions:', transactions.length)
      console.log('Transactions data:', transactions.map(t => ({ id: t.id, description: t.description, amount: t.amount, status: t.status })))
      
      res.json({ success: true, transactions });
    } catch (error) {
      console.error('Error getting mobile money transactions:', error);
      res.status(500).json({ error: 'failed_to_get_transactions', message: error.message });
    }
  });

  router.get('/mobile-money/balance', async (req: TenantRequest, res) => {
    try {
      const companyId = String(req.query.companyId || '');
      const { provider, phoneNumber } = req.query;
      
      if (!provider || !phoneNumber) {
        return res.status(400).json({ 
          error: 'missing_parameters', 
          message: 'provider and phoneNumber are required' 
        });
      }
      
      const balance = await MobileMoneyService.getAccountBalance(
        req.tenantId!,
        companyId,
        provider as string,
        phoneNumber as string
      );
      
      res.json({ success: true, ...balance });
    } catch (error) {
      console.error('Error getting mobile money balance:', error);
      res.status(500).json({ error: 'failed_to_get_balance', message: error.message });
    }
  });

  router.get('/mobile-money/stats', async (req: TenantRequest, res) => {
    try {
      console.log('=== GET MOBILE MONEY STATS DEBUG ===')
      console.log('Request query:', req.query)
      console.log('Request headers:', req.headers)
      
      const queryCompanyId = String(req.query.companyId || '');
      const headerCompanyId = req.headers['x-company-id'] as string;
      
      // Use query companyId if it's valid, otherwise fall back to header
      const companyId = (queryCompanyId && queryCompanyId !== 'personal') ? queryCompanyId : headerCompanyId;
      
      console.log('Query companyId:', queryCompanyId)
      console.log('Header companyId:', headerCompanyId)
      console.log('Final companyId:', companyId)
      
      const stats = await MobileMoneyService.getStats(
        req.tenantId!,
        companyId
      );
      
      console.log('Mobile money stats:', stats)
      
      res.json({ success: true, ...stats });
    } catch (error) {
      console.error('Error getting mobile money stats:', error);
      res.status(500).json({ error: 'failed_to_get_stats', message: error.message });
    }
  });
}

