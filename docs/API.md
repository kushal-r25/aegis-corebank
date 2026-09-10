# Aegis CoreBank REST API Specification

This document provides complete, production-grade REST API documentation for all 4 microservices comprising the Aegis CoreBank ecosystem.

---

## 1. Global Specifications & Headers

### Service Port Map
| Microservice | Port | Database | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **`auth-service`** | `8081` | `auth_db` | Authentication, 2FA OTP issuance/verification, JWT tokens, RBAC |
| **`account-service`** | `8082` | `account_db` + Redis | Account lifecycle, sub-ledger journals, beneficiaries, balance caching |
| **`transaction-service`** | `8083` | `transaction_db` | Transfer saga orchestration, scheduled wires, fraud queue, audit traces |
| **`notification-service`** | `8084` | In-Memory / Consumer | Real-time multi-channel notification dispatch consumed from Kafka |

### Standard Request & Response Headers
| Header | Type | Description | Required |
| :--- | :--- | :--- | :--- |
| `Authorization` | `String` | Bearer JWT token (`Bearer eyJhbG...`) | Yes (except `/auth/*` and `/actuator/*`) |
| `X-Correlation-Id` | `UUID / String` | Distributed tracing correlation ID propagated across all microservices | Recommended |
| `Idempotency-Key` | `UUID / String` | Unique transaction execution token preventing duplicate charges | Required for financial mutations |
| `Content-Type` | `String` | `application/json` | Required for POST/PUT |

### Standard Error Response Body
```json
{
  "timestamp": "2026-09-09T12:00:00.000Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Insufficient funds in source account",
  "path": "/transfers",
  "correlationId": "f7b1d9c2-48a3-4c91-b1e7-88d4924c1301"
}
```

---

## 2. Auth Service (`:8081`)

Base URL: `http://localhost:8081/auth`

### 2.1 Register New User
- **Endpoint**: `POST /auth/register`
- **Access**: Public
- **Request Body**:
```json
{
  "username": "eleanor.vance",
  "password": "SecurePassword123!",
  "phone": "+1-555-0199",
  "role": "CUSTOMER"
}
```
- **Responses**:
  - `201 Created`: User successfully registered.
  - `400 Bad Request`: Validation failure (e.g. weak password, missing fields).
  - `409 Conflict`: Username already exists.

---

### 2.2 Initiate 2FA Login (Step 1)
- **Endpoint**: `POST /auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "username": "eleanor.vance",
  "password": "SecurePassword123!"
}
```
- **Responses**:
  - `200 OK`:
```json
{
  "otpSessionId": "e5c4a7e8-8b9a-4f32-bb91-c119e7a9e221",
  "maskedPhone": "+1-***-***-0199",
  "expiresInSeconds": 300
}
```
  - `401 Unauthorized`: Invalid credentials.

---

### 2.3 Verify 2FA OTP & Obtain JWT (Step 2)
- **Endpoint**: `POST /auth/verify-otp`
- **Access**: Public
- **Request Body**:
```json
{
  "otpSessionId": "e5c4a7e8-8b9a-4f32-bb91-c119e7a9e221",
  "code": "123456"
}
```
- **Responses**:
  - `200 OK`:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmOGUxZTFmMi1hYmNkLTQzMjEtOGFiYy0xMjM0NTY3ODkwYWIiLCJyb2xlcyI6WyJDVVNUT01FUiJdLCJpYXQiOjE3MjU4ODAwMDAsImV4cCI6MTcyNTg4MzYwMH0.signature",
  "userId": "f8e1e1f2-abcd-4321-8abc-1234567890ab",
  "username": "eleanor.vance",
  "role": "CUSTOMER",
  "expiresAt": "2026-09-09T13:00:00Z"
}
```
  - `401 Unauthorized`: Invalid or expired OTP code.

---

## 3. Account Service (`:8082`)

Base URL: `http://localhost:8082/accounts`

### 3.1 Create Account
- **Endpoint**: `POST /accounts`
- **Access**: `CUSTOMER`, `ADMIN`
- **Request Body**:
```json
{
  "userId": "f8e1e1f2-abcd-4321-8abc-1234567890ab",
  "accountType": "CHECKING",
  "currency": "INR"
}
```
- **Responses**:
  - `201 Created`:
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "f8e1e1f2-abcd-4321-8abc-1234567890ab",
  "accountNumber": "ACC-94827104",
  "accountType": "CHECKING",
  "currency": "INR",
  "balance": 0.0000,
  "status": "ACTIVE",
  "createdAt": "2026-09-09T12:00:00Z"
}
```

---

### 3.2 List Accounts
- **Endpoint**: `GET /accounts`
- **Query Params**: `userId` (optional)
- **Responses**:
  - `200 OK`: Array of `AccountResponse` objects.

---

### 3.3 Get Account By ID
- **Endpoint**: `GET /accounts/{accountId}`
- **Responses**:
  - `200 OK`: `AccountResponse` object.
  - `404 Not Found`: Account does not exist.

---

### 3.4 Query Balance (Redis Cache-Aside)
- **Endpoint**: `GET /accounts/{accountId}/balance`
- **Responses**:
  - `200 OK`: `1450200.5000` (Decimal balance)

---

### 3.5 Deposit Funds
- **Endpoint**: `POST /accounts/{accountId}/deposit`
- **Request Body**:
```json
{
  "amount": 50000.00,
  "description": "Liquidity replenishment",
  "idempotencyKey": "dep-99882211-3344"
}
```
- **Responses**:
  - `200 OK`: Updated `AccountResponse` with updated balance and sub-ledger entry written.

---

### 3.6 Withdraw Funds
- **Endpoint**: `POST /accounts/{accountId}/withdraw`
- **Request Body**:
```json
{
  "amount": 12500.00,
  "description": "Branch cash settlement",
  "idempotencyKey": "wth-44332211-8899"
}
```
- **Responses**:
  - `200 OK`: Updated `AccountResponse`.
  - `422 Unprocessable Entity`: Insufficient funds or account frozen.

---

### 3.7 Freeze Account (Compliance Lock)
- **Endpoint**: `POST /accounts/{accountId}/freeze?reason=Suspicious+activity+detected`
- **Access**: `ADMIN`
- **Responses**:
  - `200 OK`: `AccountResponse` with `status: "FROZEN"`.

---

### 3.8 Unfreeze Account
- **Endpoint**: `POST /accounts/{accountId}/unfreeze`
- **Access**: `ADMIN`
- **Responses**:
  - `200 OK`: `AccountResponse` with `status: "ACTIVE"`.

---

### 3.9 Get Sub-Ledger Audit Trail
- **Endpoint**: `GET /accounts/{accountId}/ledger`
- **Responses**:
  - `200 OK`:
```json
[
  {
    "id": "0191a2b3-c4d5-7890-abcd-1234567890ef",
    "accountId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "amount": -5000.0000,
    "entryType": "DEBIT",
    "balanceAfter": 1445200.5000,
    "referenceId": "TXN-88492019",
    "description": "Outbound Wire Transfer to Apex Corp",
    "createdAt": "2026-09-09T11:45:00Z"
  }
]
```

---

### 3.10 Beneficiary Management
- `POST /accounts/{accountId}/beneficiaries` (Add verified counterparty payee)
- `GET /accounts/{accountId}/beneficiaries` (List payees)
- `PUT /accounts/{accountId}/beneficiaries/{beneficiaryId}?nickname=Apex+Main` (Update nickname)
- `POST /accounts/{accountId}/beneficiaries/{beneficiaryId}/block` (Block counterparty)
- `POST /accounts/{accountId}/beneficiaries/{beneficiaryId}/unblock` (Unblock counterparty)
- `DELETE /accounts/{accountId}/beneficiaries/{beneficiaryId}` (Delete payee)

---

### 3.11 Internal S2S Account Endpoints (Cluster Restricted)
- `POST /internal/accounts/{accountId}/debit`: Body `{ "amount": 1000.00 }`
- `POST /internal/accounts/{accountId}/credit`: Body `{ "amount": 1000.00 }`
- `POST /internal/accounts/reverse-transfer`: Body `{ "debitedAccountId": "...", "creditedAccountId": "...", "amount": 1000.00, "referenceId": "TXN-REV-..." }`

---

## 4. Transaction Service (`:8083`)

Base URL: `http://localhost:8083`

### 4.1 Initiate Transfer Saga
- **Endpoint**: `POST /transfers`
- **Access**: `CUSTOMER`, `ADMIN`
- **Request Body**:
```json
{
  "idempotencyKey": "idem-wire-8921-9932",
  "fromAccountId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "toAccountId": "b2c3d4e5-f6a7-8901-bcde-fa2345678901",
  "amount": 250000.00
}
```
- **Responses**:
  - `202 Accepted` / `200 OK`:
```json
{
  "id": "99887766-5544-3322-1100-aabbccddeeff",
  "fromAccountId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "toAccountId": "b2c3d4e5-f6a7-8901-bcde-fa2345678901",
  "amount": 250000.0000,
  "status": "COMPLETED",
  "failureReason": null,
  "riskFlag": "LOW",
  "createdAt": "2026-09-09T12:00:00Z"
}
```
  - `422 Unprocessable Entity`: Transfer rejected (e.g. insufficient funds, high fraud risk).

---

### 4.2 Reversal of Transaction (Compensating Double-Entry)
- **Endpoint**: `POST /transfers/{transactionId}/reverse?reason=Unauthorized+transaction`
- **Access**: `ADMIN`, `AUDITOR`
- **Responses**:
  - `200 OK`: Returns updated `TransactionResponse` with `status: "REVERSED"`.

---

### 4.3 Transaction History & Details
- `GET /transactions?page=0&size=20&status=COMPLETED` (List all transactions with pagination and status filter)
- `GET /transactions/account/{accountId}?page=0&size=20` (Account transaction history)
- `GET /transactions/{transactionId}` (Single transaction record)

---

### 4.4 Scheduled / Recurring Transfers
- `POST /scheduled-transfers`: Body `{ "userId": "...", "fromAccountId": "...", "toAccountId": "...", "amount": 15000.00, "frequency": "MONTHLY", "description": "Escrow retainer" }`
- `GET /scheduled-transfers`: List active and scheduled standing orders.
- `POST /scheduled-transfers/{id}/pause`: Pause recurring execution.
- `POST /scheduled-transfers/{id}/resume`: Resume paused wire.
- `POST /scheduled-transfers/{id}/cancel`: Cancel recurring wire standing order.

---

### 4.5 Fraud Risk Queue
- `GET /fraud/records?status=PENDING` (Fetch unreviewed high-risk transaction cases)
- `POST /fraud/records/{id}/approve` (Mark fraud record `APPROVED`)
- `POST /fraud/records/{id}/reject` (Mark fraud record `REJECTED` and trigger account freeze)

---

### 4.6 Forensic Audit & Merkle Trace
- `GET /audit/trace/{transactionId}`:
```json
{
  "transaction": { ... },
  "auditLogs": [
    { "id": 1, "eventType": "SAGA_INITIATED", "occurredAt": "2026-09-09T12:00:00.100Z" },
    { "id": 2, "eventType": "DETERMINISTIC_LOCK_ACQUIRED", "occurredAt": "2026-09-09T12:00:00.120Z" },
    { "id": 3, "eventType": "DOUBLE_ENTRY_POSTED", "occurredAt": "2026-09-09T12:00:00.140Z" },
    { "id": 4, "eventType": "SAGA_COMPLETED", "occurredAt": "2026-09-09T12:00:00.160Z" }
  ],
  "outboxEvents": [
    { "id": "...", "topic": "core.banking.transactions", "eventType": "TransferCompletedEvent", "published": true }
  ]
}
```
- `GET /audit/logs?transactionId=...`: List raw audit events.

---

## 5. Notification Service (`:8084`)

Base URL: `http://localhost:8084`

### 5.1 Real-Time Alert Log Inspection
- **Endpoint**: `GET /notifications`
- **Access**: `CUSTOMER`, `ADMIN`, `AUDITOR`
- **Responses**:
  - `200 OK`:
```json
[
  {
    "id": "notif-001",
    "userId": "f8e1e1f2-abcd-4321-8abc-1234567890ab",
    "channel": "SMS_AND_EMAIL",
    "title": "Wire Settlement Confirmation",
    "message": "Outbound transfer of $250,000.00 settled successfully to Apex Corp.",
    "deliveredAt": "2026-09-09T12:00:01Z"
  }
]
```
