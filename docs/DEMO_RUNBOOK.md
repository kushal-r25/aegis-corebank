# Aegis CoreBank: End-to-End Live Demonstration Runbook

This runbook outlines the exact 20-step verification and live demonstration script for the **Aegis CoreBank Enterprise Banking Platform**, spanning both the React Stitch UI and backend REST / Kafka / PostgreSQL infrastructure.

---

## 0. Prerequisites & Startup Sequence

### Step 0.1: Start Infrastructure (PostgreSQL, Redis, Kafka, Zookeeper)
```bash
cd online-banking-system
docker compose up -d
docker compose ps
```

### Step 0.2: Run Backend Microservices
```bash
# In terminal 1 (or run via IDE / mvn spring-boot:run in each service directory):
cd auth-service && mvn spring-boot:run
cd account-service && mvn spring-boot:run
cd transaction-service && mvn spring-boot:run
cd notification-service && mvn spring-boot:run
```

### Step 0.3: Start Frontend SPA Client
```bash
cd online-banking-frontend
npm run dev
```
Open **`http://localhost:5173`** in Chrome/Firefox.

---

## 1. Step-by-Step 20-Stage Demonstration Script

### Stage 1: Customer Registration
- **UI Action**: Click "Register" on the authentication modal or trigger registration.
- **API Call**: `POST http://localhost:8081/auth/register`
- **Request Body**:
```json
{
  "username": "eleanor.vance",
  "password": "BankPassword2026!",
  "phone": "+1-555-0199",
  "role": "CUSTOMER"
}
```
- **Expected Result**: HTTP `201 Created`. User record saved to PostgreSQL `auth_db.users` with BCrypt password hash.

---

### Stage 2: 2FA Login Challenge (Step 1)
- **UI Action**: Submit login credentials.
- **API Call**: `POST http://localhost:8081/auth/login`
- **Request Body**: `{ "username": "eleanor.vance", "password": "BankPassword2026!" }`
- **Expected Result**: HTTP `200 OK` with `otpSessionId` and `maskedPhone: "+1-***-***-0199"`.

---

### Stage 3: OTP Verification & JWT Issuance (Step 2)
- **UI Action**: Enter 6-digit OTP code (`123456`) in the keypad.
- **API Call**: `POST http://localhost:8081/auth/verify-otp`
- **Request Body**: `{ "otpSessionId": "...", "code": "123456" }`
- **Expected Result**: HTTP `200 OK` returning signed JWT token (`Bearer eyJhbG...`) with role claims.

---

### Stage 4: Executive Dashboard & Liquidity Matrix
- **UI Action**: Navigate to `/dashboard`.
- **Observation**:
  - Net available liquidity computed across active non-frozen vaults.
  - SLA trust badge ("99.999% SLA • Merkle Certified").
  - Express execution toolbar with 1-click actions.

---

### Stage 5: Vault / Account Creation
- **UI Action**: Navigate to `/accounts` -> "Open Account".
- **API Call**: `POST http://localhost:8082/accounts`
- **Request Body**: `{ "userId": "...", "accountType": "CHECKING" }`
- **Expected Result**: HTTP `201 Created` with unique account number `ACC-...` and balance `$0.0000`.

---

### Stage 6: Cash Deposit (Liquidity Inbound)
- **UI Action**: Click "Deposit Funds" modal on Primary Checking -> Enter `$50,000.00`.
- **API Call**: `POST http://localhost:8082/accounts/{id}/deposit`
- **Expected Result**:
  - Balance updates instantly to `$50,000.00`.
  - Sub-ledger entry written: `entry_type: "DEPOSIT"`, `amount: +50000.0000`.
  - Redis cache evicted.

---

### Stage 7: Cash Withdrawal & Overdraft Protection
- **UI Action**: Click "Withdraw" modal -> Enter `$75,000.00` (exceeding balance).
- **Expected Result**:
  - Server returns HTTP `422 Unprocessable Entity`: "Insufficient funds in source account".
  - Database check constraint `chk_balance_nonneg` and Java assertion prevent overdraft.
- **Valid Withdrawal**: Enter `$10,000.00` -> Settles with new balance `$40,000.00`.

---

### Stage 8: Add Verified Counterparty Beneficiary
- **UI Action**: Navigate to `/beneficiaries` -> "Add Beneficiary".
- **API Call**: `POST http://localhost:8082/accounts/{id}/beneficiaries`
- **Request Body**:
```json
{
  "beneficiaryAccountNumber": "ACC-94827104",
  "beneficiaryName": "Apex Global Technologies Ltd",
  "bankName": "JPMorgan Chase Treasury",
  "routingNumber": "021000021",
  "nickname": "Apex Main Operations"
}
```
- **Expected Result**: HTTP `201 Created`. Payee listed with "CORPORATE VERIFIED" badge.

---

### Stage 9: Execute Double-Entry Wire Transfer
- **UI Action**: Navigate to `/transfers` -> Complete 4-step wizard for `$15,000.00`.
- **Security Confirmation**: Enter 2FA OTP in `TwoFactorModal`.
- **API Call**: `POST http://localhost:8083/transfers`
- **Header**: `Idempotency-Key: idem-wire-2026-001`
- **Expected Result**:
  - Source debited `$15,000.00` under pessimistic lock.
  - Sub-ledger entries created: `TRANSFER_OUT` (-$15,000.00) on source, `TRANSFER_IN` (+$15,000.00) on destination.

---

### Stage 10: Observe AML Fraud Heuristic Evaluation
- **UI / DB Observation**: Transfers $\ge \$10,000.00$ trigger rule `RULE_HIGH_VALUE_DEPOSIT_DRAIN`.
- **Expected Result**: Transaction flag set to `REVIEW`, record created in `fraud_records` table with status `PENDING`.

---

### Stage 11: Observe Transactional Outbox Event Enqueue
- **DB Inspection**:
```sql
SELECT id, aggregate_id, event_type, topic, published, created_at FROM outbox_events ORDER BY created_at DESC LIMIT 5;
```
- **Expected Result**: `TRANSFER_INITIATED` event inserted with `published = false` in the same transaction as the debit.

---

### Stage 12: Observe Kafka Message Stream
- **Kafka UI**: Open `http://localhost:8090` -> Inspect topic `core.banking.transfer.initiated`.
- **Expected Result**: Message payload confirmed with correlation ID, transaction ID, source, target, and amount.

---

### Stage 13: Observe Real-Time Notification Dispatch
- **UI Action**: Open top navigation bell icon (`NotificationDrawer`).
- **Expected Result**: Alert present: "Wire Settlement Confirmation: $15,000.00 settled successfully to Apex Global Technologies Ltd".

---

### Stage 14: Inspect Settled Transaction Receipt
- **UI Action**: View `TransferSuccessModal` -> Copy transaction hash and correlation ID.
- **Expected Result**: Displays correlation hash `corr-xxx`, timestamp, and cleared status.

---

### Stage 15: Execute Compensating Transaction Reversal
- **UI Action**: Navigate to `/transactions` -> Locate debit transaction -> Click "Reverse".
- **API Call**: `POST http://localhost:8083/transfers/{txnId}/reverse?reason=Counterparty+refund+request`
- **Expected Result**: Status transitions to `REVERSED`.

---

### Stage 16: Verify Paired Reversal Sub-Ledger Entries
- **DB Inspection**:
```sql
SELECT id, account_id, amount, entry_type, balance_after, description FROM ledger_entries ORDER BY created_at DESC LIMIT 4;
```
- **Expected Result**:
  - `REVERSAL_DEBIT` (-$15,000.00) on destination account.
  - `REVERSAL_CREDIT` (+$15,000.00) on source account.
  - Sum of all reversal entries = `$0.0000`.

---

### Stage 17: Admin AML Fraud Queue Review
- **UI Action**: Switch role to **`ADMIN`** (top right dropdown) -> Navigate to `/admin`.
- **Observation**: Inspect flagged transfer cases with risk scores (e.g. 88/100).
- **Action**: Click "Review Case" -> Choose "Authorize Settlement" with reviewer note -> Status updates to `APPROVED`.

---

### Stage 18: Auditor Forensic Trace & Merkle DAG Inspection
- **UI Action**: Switch role to **`AUDITOR`** -> Navigate to `/auditor`.
- **Observation**:
  - Interactive DAG showing saga lifecycle (`INITIATED -> RESERVED -> COMPLETED`).
  - Merkle inclusion proof validator: click "Re-compute Root" -> Green verified status.
  - Live Kafka event stream inspector.

---

### Stage 19: End-to-End Correlation ID Tracing
- **Observation**: Check `X-Correlation-Id` across frontend requests, Spring Boot MDC logs, Kafka event headers, and `audit_log` records. All correlate to a single distributed trace.

---

### Stage 20: Scheduled Standing Wire Execution
- **UI Action**: Navigate to `/scheduled-transfers` -> "New Scheduled Transfer".
- **Frequency**: Select `MONTHLY` -> Amount `$2,500.00`.
- **Expected Result**: Standing order saved. Background poller triggers on `next_execution_time` using deterministic idempotency key `SCHEDULE-<id>-<nextExecutionTime>`.

---

## 2. Portfolio vs Production Disclaimer

> [!NOTE]
> This system is an institutional **portfolio and reference architecture implementation**. For deployment in a regulated banking environment, external production integrations (Hardware Security Modules / PKCS#11, formal SWIFT/Fedwire settlement gateway adapters, and SOC-2 Type II audit controls) would be attached to the existing domain core.
