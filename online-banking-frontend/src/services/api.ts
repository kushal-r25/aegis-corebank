import axios from 'axios';
import type {
  Account,
  Beneficiary,
  FraudRecord,
  LedgerEntry,
  ScheduledTransfer,
  SystemHealthMetrics,
  TransactionTrace,
  TransferRequest,
  User,
  UserRole,
} from '../types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_BENEFICIARIES,
  INITIAL_FRAUD_RECORDS,
  INITIAL_LEDGER_ENTRIES,
  INITIAL_SCHEDULED_TRANSFERS,
  INITIAL_SYSTEM_METRICS,
  INITIAL_TRANSACTION_TRACE,
  INITIAL_USERS,
} from './mockData';

const STORAGE_KEYS = {
  CURRENT_USER: 'aegis_current_user',
  ACCOUNTS: 'aegis_accounts',
  BENEFICIARIES: 'aegis_beneficiaries',
  LEDGER_ENTRIES: 'aegis_ledger_entries',
  SCHEDULED_TRANSFERS: 'aegis_scheduled_transfers',
  FRAUD_RECORDS: 'aegis_fraud_records',
  METRICS: 'aegis_metrics',
  TRACE: 'aegis_transaction_trace',
};

function loadStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage error', err);
  }
}

export const isDemoMode = (): boolean => {
  const stored = localStorage.getItem('aegis_mode');
  if (stored) return stored === 'demo';
  return import.meta.env.VITE_DEMO_MODE === 'true';
};

export const setDemoMode = (enabled: boolean): void => {
  localStorage.setItem('aegis_mode', enabled ? 'demo' : 'live');
};

const isProd = import.meta.env.PROD;

export const SERVICE_URLS = {
  AUTH: import.meta.env.VITE_AUTH_API_URL || (isProd ? '/api/auth' : 'http://localhost:8081'),
  ACCOUNT: import.meta.env.VITE_ACCOUNT_API_URL || (isProd ? '/api' : 'http://localhost:8082'),
  TRANSACTION: import.meta.env.VITE_TRANSACTION_API_URL || (isProd ? '/api' : 'http://localhost:8083'),
  NOTIFICATION: import.meta.env.VITE_NOTIFICATION_API_URL || (isProd ? '/api/notifications' : 'http://localhost:8084'),
};

export const httpClient = axios.create({
  timeout: 5000,
});

httpClient.interceptors.request.use((config) => {
  const user = api.auth.getCurrentUser();
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  config.headers['X-Correlation-Id'] = `corr-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
  return config;
});

function tryBackendSync(promise: Promise<any>): void {
  if (!isDemoMode()) {
    promise.catch((err) => {
      console.warn('Backend sync notification failed:', err?.message || err);
    });
  }
}

export async function executeApiCall<T>(promise: Promise<T>, fallbackFn: () => T): Promise<T> {
  if (isDemoMode()) {
    return fallbackFn();
  }
  try {
    const res = await promise;
    return res;
  } catch (err: any) {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Backend service communication error';
    console.error('Backend API Error:', msg);
    throw new Error(msg);
  }
}

export const api = {
  auth: {
    getCurrentUser(): User {
      return loadStorage<User>(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS.CUSTOMER);
    },
    switchRole(role: UserRole): User {
      const newUser = INITIAL_USERS[role] || INITIAL_USERS.CUSTOMER;
      saveStorage(STORAGE_KEYS.CURRENT_USER, newUser);
      return newUser;
    },
    login(username: string, _password?: string): User {
      let role: UserRole = 'CUSTOMER';
      if (username.toLowerCase().includes('admin')) role = 'ADMIN';
      if (username.toLowerCase().includes('audit')) role = 'AUDITOR';
      const user = { ...INITIAL_USERS[role], username };
      saveStorage(STORAGE_KEYS.CURRENT_USER, user);
      return user;
    },
  },

  accounts: {
    getAccounts(): Account[] {
      return loadStorage<Account[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    },
    getAccountById(id: string): Account | undefined {
      const accounts = this.getAccounts();
      return accounts.find((a) => a.id === id);
    },
    deposit(accountId: string, amountNum: number, description?: string): { account: Account; entry: LedgerEntry } {
      const accounts = this.getAccounts();
      const accountIndex = accounts.findIndex((a) => a.id === accountId);
      if (accountIndex === -1) throw new Error('Account not found');

      const account = accounts[accountIndex];
      if (account.status === 'FROZEN') throw new Error('Cannot deposit to a FROZEN account');

      const currentBal = parseFloat(account.balance);
      const newBal = (currentBal + amountNum).toFixed(2);

      account.balance = newBal;
      account.availableLiquidity = newBal;
      account.bookBalance = newBal;
      accounts[accountIndex] = account;
      saveStorage(STORAGE_KEYS.ACCOUNTS, accounts);

      const entry: LedgerEntry = {
        id: `led-${Date.now()}`,
        transactionId: `DEP-${Date.now()}`,
        accountId: account.id,
        accountName: account.nickname || account.accountType,
        accountNumber: account.accountNumber.slice(-4),
        amount: amountNum.toFixed(2),
        currency: account.currency || 'USD',
        type: 'CREDIT',
        status: 'SETTLED',
        description: description || 'Immediate Liquidity Inbound Deposit',
        timestamp: new Date().toISOString(),
        correlationId: `corr-dep-${Math.random().toString(36).substring(2, 7)}`,
        balanceAfter: newBal,
        counterparty: 'Direct Liquidity Terminal',
        category: 'Deposit',
      };

      const entries = api.ledger.getEntries();
      entries.unshift(entry);
      saveStorage(STORAGE_KEYS.LEDGER_ENTRIES, entries);

      tryBackendSync(httpClient.post(`${SERVICE_URLS.ACCOUNT}/accounts/${accountId}/deposit`, {
        amount: amountNum,
        description: description || 'Immediate Liquidity Inbound Deposit',
        idempotencyKey: `dep-${Date.now()}`,
      }));

      return { account, entry };
    },
    withdraw(accountId: string, amountNum: number, description?: string): { account: Account; entry: LedgerEntry } {
      const accounts = this.getAccounts();
      const accountIndex = accounts.findIndex((a) => a.id === accountId);
      if (accountIndex === -1) throw new Error('Account not found');

      const account = accounts[accountIndex];
      if (account.status === 'FROZEN') throw new Error('Cannot withdraw from a FROZEN account');

      const currentBal = parseFloat(account.balance);
      if (currentBal < amountNum) throw new Error('Insufficient funds in source ledger');

      const newBal = (currentBal - amountNum).toFixed(2);
      account.balance = newBal;
      account.availableLiquidity = newBal;
      account.bookBalance = newBal;
      accounts[accountIndex] = account;
      saveStorage(STORAGE_KEYS.ACCOUNTS, accounts);

      const entry: LedgerEntry = {
        id: `led-${Date.now()}`,
        transactionId: `WTH-${Date.now()}`,
        accountId: account.id,
        accountName: account.nickname || account.accountType,
        accountNumber: account.accountNumber.slice(-4),
        amount: amountNum.toFixed(2),
        currency: account.currency || 'USD',
        type: 'DEBIT',
        status: 'SETTLED',
        description: description || 'Authorized Vault Cash/Liquidity Withdrawal',
        timestamp: new Date().toISOString(),
        correlationId: `corr-wth-${Math.random().toString(36).substring(2, 7)}`,
        balanceAfter: newBal,
        counterparty: 'Liquidity Disbursement Rail',
        category: 'Withdrawal',
      };

      const entries = api.ledger.getEntries();
      entries.unshift(entry);
      saveStorage(STORAGE_KEYS.LEDGER_ENTRIES, entries);

      tryBackendSync(httpClient.post(`${SERVICE_URLS.ACCOUNT}/accounts/${accountId}/withdraw`, {
        amount: amountNum,
        description: description || 'Authorized Vault Cash/Liquidity Withdrawal',
        idempotencyKey: `wth-${Date.now()}`,
      }));

      return { account, entry };
    },
    freezeAccount(accountId: string, reason?: string): Account {
      const accounts = this.getAccounts();
      const acc = accounts.find((a) => a.id === accountId);
      if (!acc) throw new Error('Account not found');
      acc.status = 'FROZEN';
      saveStorage(STORAGE_KEYS.ACCOUNTS, accounts);

      tryBackendSync(httpClient.post(`${SERVICE_URLS.ACCOUNT}/accounts/${accountId}/freeze?reason=${encodeURIComponent(reason || 'Manual freeze requested')}`));

      return acc;
    },
    unfreezeAccount(accountId: string): Account {
      const accounts = this.getAccounts();
      const acc = accounts.find((a) => a.id === accountId);
      if (!acc) throw new Error('Account not found');
      acc.status = 'ACTIVE';
      saveStorage(STORAGE_KEYS.ACCOUNTS, accounts);

      tryBackendSync(httpClient.post(`${SERVICE_URLS.ACCOUNT}/accounts/${accountId}/unfreeze`));

      return acc;
    },
  },

  transfers: {
    executeTransfer(req: TransferRequest): { transactionId: string; status: string; correlationId: string } {
      const accounts = api.accounts.getAccounts();
      const source = accounts.find((a) => a.id === req.sourceAccountId);
      if (!source) throw new Error('Originating account not found');
      if (source.status === 'FROZEN') throw new Error('Originating account is FROZEN. All outbound transfers blocked.');

      const amountNum = parseFloat(req.amount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error('Invalid monetary transfer amount');

      const srcCurrency = source.currency || 'USD';

      // Cross-currency validation
      if (req.currency && req.currency !== srcCurrency) {
        throw new Error(`Cross-currency transfers are not supported without FX conversion (Source: ${srcCurrency}, Requested: ${req.currency})`);
      }

      if (req.targetAccountId) {
        const targetAcc = accounts.find((a) => a.id === req.targetAccountId);
        if (targetAcc && (targetAcc.currency || 'USD') !== srcCurrency) {
          throw new Error(`Cross-currency transfers are not supported without FX conversion (Source: ${srcCurrency}, Target: ${targetAcc.currency})`);
        }
      }

      const currentBal = parseFloat(source.balance);
      if (currentBal < amountNum) {
        throw new Error(`Insufficient funds: Available ${srcCurrency === 'INR' ? '₹' : '$'}${currentBal.toFixed(2)} ${srcCurrency}, Requested ${srcCurrency === 'INR' ? '₹' : '$'}${amountNum.toFixed(2)} ${srcCurrency}`);
      }

      const dailyLimit = parseFloat(source.dailyLimit || '50000');
      const dailyUsed = parseFloat(source.dailyLimitUsed || '0');
      if (dailyUsed + amountNum > dailyLimit) {
        throw new Error(`Exceeds daily limit of ${srcCurrency === 'INR' ? '₹' : '$'}${dailyLimit.toFixed(2)} ${srcCurrency}`);
      }

      const newBal = (currentBal - amountNum).toFixed(2);
      source.balance = newBal;
      source.availableLiquidity = newBal;
      source.bookBalance = newBal;
      source.dailyLimitUsed = (dailyUsed + amountNum).toFixed(2);
      saveStorage(STORAGE_KEYS.ACCOUNTS, accounts);

      const txnId = `TXN-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const correlationId = `corr-${Math.random().toString(36).substring(2, 7)}-${Date.now().toString(36)}`;

      const entry: LedgerEntry = {
        id: `led-${Date.now()}`,
        transactionId: txnId,
        accountId: source.id,
        accountName: source.nickname || source.accountType,
        accountNumber: source.accountNumber.slice(-4),
        amount: amountNum.toFixed(2),
        currency: srcCurrency,
        type: 'DEBIT',
        status: 'SETTLED',
        description: req.note || `Wire Outbound: ${req.beneficiaryName || 'Beneficiary'}`,
        timestamp: new Date().toISOString(),
        correlationId,
        balanceAfter: newBal,
        counterparty: req.beneficiaryName || 'External Payee',
        category: 'Transfer',
      };

      const entries = api.ledger.getEntries();
      entries.unshift(entry);
      saveStorage(STORAGE_KEYS.LEDGER_ENTRIES, entries);

      if (amountNum >= (srcCurrency === 'INR' ? 500000 : 10000)) {
        const fraudQueue = api.admin.getFraudRecords();
        fraudQueue.unshift({
          id: `frd-${Date.now().toString().slice(-4)}`,
          transactionId: txnId,
          sourceAccountId: source.id,
          sourceAccountName: `Eleanor Vance (${source.nickname || 'Checking'})`,
          beneficiaryName: req.beneficiaryName || 'External Payee',
          amount: amountNum.toFixed(2),
          currency: srcCurrency,
          riskScore: Math.floor(60 + Math.random() * 35),
          reason: `High value outbound transfer exceeding standard threshold (${srcCurrency})`,
          status: 'FLAGGED',
          createdAt: new Date().toISOString(),
          flaggedRules: ['RULE_HIGH_VALUE_DEPOSIT_DRAIN', 'RULE_DUAL_SIGN_REQUIRED'],
        });
        saveStorage(STORAGE_KEYS.FRAUD_RECORDS, fraudQueue);
      }

      tryBackendSync(httpClient.post(`${SERVICE_URLS.TRANSACTION}/transfers`, {
        fromAccountId: req.sourceAccountId,
        toAccountId: req.targetAccountId || 'b2c3d4e5-f6a7-8901-bcde-fa2345678901',
        amount: amountNum,
        idempotencyKey: req.idempotencyKey,
      }));

      return { transactionId: txnId, status: 'SETTLED', correlationId };
    },

    reverseTransfer(transactionId: string, reason: string): { reversalEntry: LedgerEntry } {
      const entries = api.ledger.getEntries();
      const targetEntry = entries.find((e) => e.transactionId === transactionId && e.type === 'DEBIT');
      if (!targetEntry) throw new Error('Original debit transaction not found to reverse');
      if (targetEntry.status === 'REVERSED') throw new Error('Transaction has already been reversed');

      const accounts = api.accounts.getAccounts();
      const acc = accounts.find((a) => a.id === targetEntry.accountId);
      if (!acc) throw new Error('Target account not found');

      const amountNum = parseFloat(targetEntry.amount);
      const currentBal = parseFloat(acc.balance);
      const newBal = (currentBal + amountNum).toFixed(2);

      acc.balance = newBal;
      acc.availableLiquidity = newBal;
      acc.bookBalance = newBal;
      saveStorage(STORAGE_KEYS.ACCOUNTS, accounts);

      targetEntry.status = 'REVERSED';

      const reversalEntry: LedgerEntry = {
        id: `rev-${Date.now()}`,
        transactionId: `REV-${transactionId}`,
        accountId: acc.id,
        accountName: acc.nickname || acc.accountType,
        accountNumber: acc.accountNumber.slice(-4),
        amount: targetEntry.amount,
        currency: targetEntry.currency || acc.currency || 'USD',
        type: 'CREDIT',
        status: 'SETTLED',
        description: `Compensating Paired Reversal: ${targetEntry.description} (Reason: ${reason})`,
        timestamp: new Date().toISOString(),
        correlationId: `corr-rev-${Date.now().toString(36)}`,
        balanceAfter: newBal,
        counterparty: targetEntry.counterparty,
        category: 'Reversal',
      };

      entries.unshift(reversalEntry);
      saveStorage(STORAGE_KEYS.LEDGER_ENTRIES, entries);

      tryBackendSync(httpClient.post(`${SERVICE_URLS.TRANSACTION}/transfers/${transactionId}/reverse?reason=${encodeURIComponent(reason)}`));

      return { reversalEntry };
    },
  },

  ledger: {
    getEntries(): LedgerEntry[] {
      return loadStorage<LedgerEntry[]>(STORAGE_KEYS.LEDGER_ENTRIES, INITIAL_LEDGER_ENTRIES);
    },
  },

  beneficiaries: {
    getBeneficiaries(): Beneficiary[] {
      return loadStorage<Beneficiary[]>(STORAGE_KEYS.BENEFICIARIES, INITIAL_BENEFICIARIES);
    },
    createBeneficiary(data: Omit<Beneficiary, 'id' | 'createdAt' | 'userId'>): Beneficiary {
      const beneficiaries = this.getBeneficiaries();
      const newBen: Beneficiary = {
        ...data,
        id: `ben-${Date.now()}`,
        userId: 'c0a80101-0001-4000-8000-000000000001',
        createdAt: new Date().toISOString(),
        status: 'ACTIVE',
      };
      beneficiaries.unshift(newBen);
      saveStorage(STORAGE_KEYS.BENEFICIARIES, beneficiaries);
      return newBen;
    },
    updateBeneficiary(id: string, updates: Partial<Beneficiary>): Beneficiary {
      const beneficiaries = this.getBeneficiaries();
      const idx = beneficiaries.findIndex((b) => b.id === id);
      if (idx === -1) throw new Error('Beneficiary not found');
      beneficiaries[idx] = { ...beneficiaries[idx], ...updates };
      saveStorage(STORAGE_KEYS.BENEFICIARIES, beneficiaries);
      return beneficiaries[idx];
    },
    blockBeneficiary(id: string): Beneficiary {
      return this.updateBeneficiary(id, { status: 'BLOCKED' });
    },
    unblockBeneficiary(id: string): Beneficiary {
      return this.updateBeneficiary(id, { status: 'ACTIVE' });
    },
    deleteBeneficiary(id: string): void {
      const beneficiaries = this.getBeneficiaries().filter((b) => b.id !== id);
      saveStorage(STORAGE_KEYS.BENEFICIARIES, beneficiaries);
    },
  },

  scheduled: {
    getScheduledTransfers(): ScheduledTransfer[] {
      return loadStorage<ScheduledTransfer[]>(STORAGE_KEYS.SCHEDULED_TRANSFERS, INITIAL_SCHEDULED_TRANSFERS);
    },
    createScheduledTransfer(data: Omit<ScheduledTransfer, 'id' | 'userId'>): ScheduledTransfer {
      const list = this.getScheduledTransfers();
      const item: ScheduledTransfer = {
        ...data,
        id: `sch-${Date.now()}`,
        userId: 'c0a80101-0001-4000-8000-000000000001',
      };
      list.unshift(item);
      saveStorage(STORAGE_KEYS.SCHEDULED_TRANSFERS, list);
      return item;
    },
    pauseScheduledTransfer(id: string): ScheduledTransfer {
      const list = this.getScheduledTransfers();
      const idx = list.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Scheduled transfer not found');
      list[idx].status = 'PAUSED';
      saveStorage(STORAGE_KEYS.SCHEDULED_TRANSFERS, list);
      return list[idx];
    },
    resumeScheduledTransfer(id: string): ScheduledTransfer {
      const list = this.getScheduledTransfers();
      const idx = list.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Scheduled transfer not found');
      list[idx].status = 'ACTIVE';
      saveStorage(STORAGE_KEYS.SCHEDULED_TRANSFERS, list);
      return list[idx];
    },
    cancelScheduledTransfer(id: string): void {
      const list = this.getScheduledTransfers();
      const idx = list.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Scheduled transfer not found');
      list[idx].status = 'CANCELLED';
      saveStorage(STORAGE_KEYS.SCHEDULED_TRANSFERS, list);
    },
  },

  admin: {
    getFraudRecords(): FraudRecord[] {
      return loadStorage<FraudRecord[]>(STORAGE_KEYS.FRAUD_RECORDS, INITIAL_FRAUD_RECORDS);
    },
    approveFraudRecord(id: string, notes?: string): FraudRecord {
      const list = this.getFraudRecords();
      const idx = list.findIndex((f) => f.id === id);
      if (idx === -1) throw new Error('Fraud record not found');
      list[idx].status = 'APPROVED';
      list[idx].reviewerNotes = notes || 'Manual clearance granted by Admin Risk Officer.';
      list[idx].operator = 'admin_ops_lead';
      list[idx].reviewedAt = new Date().toISOString();
      saveStorage(STORAGE_KEYS.FRAUD_RECORDS, list);

      tryBackendSync(httpClient.post(`${SERVICE_URLS.TRANSACTION}/fraud/records/${id}/approve`));

      return list[idx];
    },
    rejectFraudRecord(id: string, notes?: string): FraudRecord {
      const list = this.getFraudRecords();
      const idx = list.findIndex((f) => f.id === id);
      if (idx === -1) throw new Error('Fraud record not found');
      list[idx].status = 'REJECTED';
      list[idx].reviewerNotes = notes || 'Transfer blocked and escalated to AML investigative unit.';
      list[idx].operator = 'admin_ops_lead';
      list[idx].reviewedAt = new Date().toISOString();
      saveStorage(STORAGE_KEYS.FRAUD_RECORDS, list);

      tryBackendSync(httpClient.post(`${SERVICE_URLS.TRANSACTION}/fraud/records/${id}/reject`));

      return list[idx];
    },
    getSystemMetrics(): SystemHealthMetrics {
      return loadStorage<SystemHealthMetrics>(STORAGE_KEYS.METRICS, INITIAL_SYSTEM_METRICS);
    },
    toggleCircuitBreaker(): boolean {
      const metrics = this.getSystemMetrics();
      metrics.circuitBreakerArmed = !metrics.circuitBreakerArmed;
      saveStorage(STORAGE_KEYS.METRICS, metrics);
      return metrics.circuitBreakerArmed;
    },
  },

  audit: {
    getTransactionTrace(id?: string): TransactionTrace {
      const trace = loadStorage<TransactionTrace>(STORAGE_KEYS.TRACE, INITIAL_TRANSACTION_TRACE);
      if (id && id !== trace.transactionId) {
        return {
          ...trace,
          transactionId: id,
          correlationId: `corr-${id.toLowerCase()}-${Date.now().toString(36)}`,
        };
      }
      return trace;
    },
  },
};
