export type UserRole = 'CUSTOMER' | 'ADMIN' | 'AUDITOR';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  token: string;
  customerId: string;
  ipAddress: string;
  lastLogin: string;
}

export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'TREASURY' | 'RESERVE';
  balance: string;
  currency: string;
  status: 'ACTIVE' | 'FROZEN' | 'DORMANT' | 'CLOSED';
  createdAt: string;
  iban: string;
  routingNumber: string;
  availableLiquidity: string;
  bookBalance: string;
  dailyLimit: string;
  dailyLimitUsed: string;
  apy?: string;
  nickname?: string;
}

export interface Beneficiary {
  id: string;
  userId: string;
  name: string;
  accountNumber: string;
  bankName: string;
  routingCode: string;
  nickname?: string;
  status: 'ACTIVE' | 'BLOCKED';
  createdAt: string;
  verifiedCorporate?: boolean;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  accountName?: string;
  accountNumber?: string;
  amount: string;
  type: 'DEBIT' | 'CREDIT';
  status: 'SETTLED' | 'PENDING' | 'REVERSED' | 'FAILED';
  description: string;
  timestamp: string;
  correlationId: string;
  balanceAfter: string;
  counterparty?: string;
  category?: string;
}

export interface TransferRequest {
  sourceAccountId: string;
  targetAccountId?: string;
  beneficiaryName?: string;
  beneficiaryAccount?: string;
  routingCode?: string;
  amount: string;
  currency?: string;
  note?: string;
  idempotencyKey: string;
  twoFactorOtp?: string;
}

export interface ScheduledTransfer {
  id: string;
  userId: string;
  sourceAccountId: string;
  sourceAccountName?: string;
  targetAccountId?: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  amount: string;
  currency: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  nextExecutionDate: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  note?: string;
  lastExecutedAt?: string;
}

export interface FraudRecord {
  id: string;
  transactionId: string;
  sourceAccountId: string;
  sourceAccountName?: string;
  targetAccountId?: string;
  beneficiaryName: string;
  amount: string;
  riskScore: number;
  reason: string;
  status: 'FLAGGED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewerNotes?: string;
  flaggedRules?: string[];
  operator?: string;
  reviewedAt?: string;
}

export interface SagaStep {
  name: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | 'COMPENSATED';
  timestamp: string;
  latencyMs: number;
  details: string;
  node: string;
}

export interface KafkaLogEvent {
  topic: string;
  partition: number;
  offset: number;
  eventType: string;
  timestamp: string;
  payload: string;
}

export interface TransactionTrace {
  transactionId: string;
  correlationId: string;
  initiator: string;
  initiatorId: string;
  sourceAccount: string;
  targetAccount: string;
  amount: string;
  currency: string;
  status: 'SETTLED' | 'REVERSED' | 'FAILED' | 'PENDING';
  merkleRoot: string;
  blockNumber: number;
  sagaSteps: SagaStep[];
  kafkaEvents: KafkaLogEvent[];
}

export interface SystemHealthMetrics {
  totalCapital: string;
  activeCustomers: number;
  clearedCustomers: number;
  suspendedCustomers: number;
  transactionThroughput: number;
  kafkaOutboxLagMs: number;
  fraudQueueCount: number;
  postgresPoolUsed: number;
  postgresPoolMax: number;
  redisHitRate: string;
  circuitBreakerArmed: boolean;
}
