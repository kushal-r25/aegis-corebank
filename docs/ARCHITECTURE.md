# Aegis CoreBank Enterprise Architecture Specification

## 1. Executive Summary & Design Principles

Aegis CoreBank is an production-grade, high-concurrency Indian digital banking platform built with Java 21, Spring Boot 3.5+, Apache Kafka, Redis 7, and PostgreSQL 17. The system is engineered to guarantee strict **ACID transactional integrity**, **deterministic concurrency control**, **immutable double-entry ledger journals**, and **zero-loss event-driven integration**.

### Core Tenets
1. **PostgreSQL as Sole Authoritative State**: Every balance mutation, ledger entry, outbox record, and saga execution is atomically committed to PostgreSQL.
2. **Immutable Double-Entry Accounting**: Financial records are never updated or deleted. Reversals and adjustments produce paired offsetting debit/credit entries with complete correlation lineage.
3. **Deadlock-Free Deterministic Row Locking**: All multi-account transfer operations sort account UUIDs before acquiring `SELECT ... FOR UPDATE` row locks, mathematically preventing circular wait conditions.
4. **Transactional Outbox Pattern**: Dual-writes to databases and message brokers are strictly prohibited. Microservices commit business entities and outbox events in a single database transaction.
5. **Idempotent Kafka Consumers**: All downstream consumers maintain deduplication tables (`processed_events`) with unique message IDs.
6. **Defense-in-Depth Security**: Stateless JWTs with HMAC-SHA256 signatures, correlation tracking via `X-Correlation-Id`, and role-based access control (`CUSTOMER`, `ADMIN`, `AUDITOR`).

---

## 2. Microservice Topology

```mermaid
graph TD
    Client[React TypeScript Frontend] -->|HTTPS / REST + JWT| Gateway[Reverse Proxy / Ingress]
    Gateway --> AuthSvc[Auth Service :8081]
    Gateway --> AccSvc[Account Service :8082]
    Gateway --> TxnSvc[Transaction Service :8083]
    Gateway --> NotifSvc[Notification Service :8084]

    AuthSvc --> AuthDB[(PostgreSQL: auth_db)]
    AccSvc --> AccDB[(PostgreSQL: account_db)]
    AccSvc --> RedisCache[(Redis 7 Cache-Aside)]
    TxnSvc --> TxnDB[(PostgreSQL: transaction_db)]

    AccSvc -->|Transactional Outbox| Kafka[Apache Kafka Cluster]
    TxnSvc -->|Transactional Outbox| Kafka
    Kafka --> NotifSvc
    Kafka --> TxnSvc
```

---

## 3. Concurrency Control & Deadlock Elimination

### Deterministic UUID Ordering
When executing transfers between Account A and Account B:
```java
UUID firstId = sourceId.compareTo(targetId) < 0 ? sourceId : targetId;
UUID secondId = sourceId.compareTo(targetId) < 0 ? targetId : sourceId;

Account firstAcc = accountRepository.findByIdForUpdate(firstId);
Account secondAcc = accountRepository.findByIdForUpdate(secondId);
```
This guarantees that concurrent transfers in opposite directions ($A \rightarrow B$ and $B \rightarrow A$) acquire locks in the exact same sequence, eliminating PostgreSQL transaction deadlocks.

---

## 4. Distributed Saga Orchestration & Paired Reversals

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Eleanor Vance
    participant Txn as Transaction Service
    participant Acc as Account Service
    participant Kafka as Kafka Broker
    participant Notif as Notification Service

    Customer->>Txn: POST /transfers (Idempotency-Key, Amount, OTP)
    Txn->>Txn: Check Idempotency Cache / DB
    Txn->>Acc: POST /internal/accounts/transfer/double-entry
    Note over Acc: Lock UUIDs in Order -> Validate Balance -> Debit Source -> Credit Target -> Write Ledger Entries
    Acc-->>Txn: 200 OK (Settled)
    Txn->>Txn: Append Transaction Record + Outbox Event
    Txn-->>Customer: 200 OK (Transaction Receipt)
    Txn->>Kafka: Publish TransferCompletedEvent (core.banking.transactions)
    Kafka->>Notif: Consume & Send Multi-Channel Alert
```

### Compensating Double-Entry Reversal
When an admin or auditor initiates a reversal:
1. The original transaction is verified and marked `REVERSED`.
2. A compensating transaction is executed with inverted double entries (`CREDIT` to source account).
3. A `TRANSFER_REVERSED` event is emitted onto `core.banking.transfer.reversed` for audit trail tracking.

---

## 5. Security Architecture & RBAC Matrix

| Role | Scope & Permissions | Permitted Routes |
| :--- | :--- | :--- |
| **CUSTOMER** | View own vaults, execute transfers, manage beneficiaries, schedule recurring payments. | `/dashboard`, `/accounts`, `/transfers`, `/beneficiaries`, `/scheduled-transfers`, `/transactions` |
| **ADMIN** | Real-time fraud queue review, risk scoring, trip circuit breaker, override account locks. | `/admin`, `/accounts`, `/transactions`, `/beneficiaries`, `/security` |
| **AUDITOR** | Cryptographic Merkle trace inspection, Kafka event stream examination, SOC-2 proof export. | `/auditor`, `/transactions`, `/accounts`, `/security` |

---

## 7. Multi-Currency Architecture & Invariants

Aegis CoreBank enforces rigorous domain-level multi-currency isolation supporting **USD (US Dollar)** and **INR (Indian Rupee)**.

```mermaid
graph TD
    subgraph Multi-Currency Transfer Validation
        ClientReq[Initiate Transfer Request] --> SagaOrch[TransferSagaOrchestrator]
        SagaOrch --> FetchSrc[Fetch Source Account Currency]
        SagaOrch --> FetchDst[Fetch Target Account Currency]
        FetchSrc --> CheckCurr{Source Currency == Target Currency?}
        FetchDst --> CheckCurr
        CheckCurr -- Yes --> AcquireLocks[Acquire Lexicographical Row Locks]
        CheckCurr -- No (e.g. USD -> INR) --> RejectSaga[Reject with HTTP 422 CurrencyMismatchException]
        RejectSaga --> AuditFail[Log TRANSFER_FAILED Audit Event]
        AcquireLocks --> ExecuteDebit[Execute Atomic Ledger Debit & Credit]
    end
```

### Core Invariants
1. **Strong Typing & Zero Approximation**: Currencies are represented via `CurrencyCode` enum (`USD`, `INR`) and PostgreSQL `VARCHAR(10)` columns with check constraints (`CHECK (currency IN ('USD', 'INR'))`).
2. **No Fictitious FX Synthesis**: Cross-currency transfers without dedicated external FX clearing rails are rejected at both API and orchestrator layers.
3. **Segregated Liquidity Reporting**: Institutional reporting presents distinct ledger totals per currency (e.g., USD liquidity vs INR liquidity).
