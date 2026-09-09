# Aegis CoreBank — Institutional Online Banking & Treasury Platform

[![Java 21](https://img.shields.io/badge/Java-21%20LTS-orange.svg)](https://openjdk.org/)
[![Spring Boot 3.5](https://img.shields.io/badge/Spring%20Boot-3.5.5-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Spring Security](https://img.shields.io/badge/Spring%20Security-6.1+-green.svg)](https://spring.io/projects/spring-security)
[![React 19](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL-17%20%2F%2016-336791.svg)](https://www.postgresql.org/)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-3.7%20%2F%204.0-black.svg)](https://kafka.apache.org/)
[![Redis 7](https://img.shields.io/badge/Redis-7.0-red.svg)](https://redis.io/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose%20v2-2496ED.svg)](https://www.docker.com/)

Aegis CoreBank is an institutional-grade, high-concurrency distributed online banking and corporate treasury platform. It is engineered with strict ACID financial guarantees, deadlock-free deterministic pessimistic row locking, transactional outbox event delivery, Kafka saga orchestration, and double-entry immutable ledger journaling.

---

## 1. Overview

Aegis CoreBank is designed as a **Production-Style Institutional Banking & Treasury Portfolio / Reference Implementation**. It models the high-throughput settlement, auditability, and safety requirements of institutional treasury engines and core banking platforms.

The system emphasizes mathematical consistency, strict conservation of money, guaranteed idempotent retry semantics, real-time fraud scoring, and complete forensic audit trails without reliance on client-side state assumptions or hidden mocks.

---

## 2. Key Features

- **Full-Spectrum Account Lifecycle**: Real-time checking and treasury savings vault provisioning with automatic account numbering and zero-overdraft protection.
- **Atomic Capitalization & Sweeps**: Deposits, withdrawals, and inter-account fund transfers with instantaneous ledger journaling.
- **Deterministic Pessimistic Concurrency**: Eliminates PostgreSQL transaction deadlocks under heavy concurrent multi-threaded fund movements.
- **Zero-Loss Transactional Outbox**: Atomic entity-and-outbox commits preventing message loss across network partitions.
- **Idempotent Kafka Saga Settlement**: Asynchronous multi-step transfer saga with automatic compensating refunds and consumer deduplication tables.
- **Immutable Double-Entry Ledger Sub-Journal**: Audit-ready append-only entries (`DEPOSIT`, `TRANSFER_OUT`, `TRANSFER_IN`, `REVERSAL_CREDIT`).
- **Institutional Role-Based Access Control**: Strict multi-tenant isolation and granular roles (`CUSTOMER`, `ADMIN`, `AUDITOR`) with explicit 401 Unauthorized and 403 Forbidden enforcement.
- **Real-Time Fraud Scoring & Forensic Merkle Tracing**: Live risk-rule evaluation and transaction lineage inspection.
- **Dual-Mode Institutional Frontend**: Production Stitch-designed React 19 SPA operating in **LIVE API Mode** with an explicit fallback simulation toggle.

---

## 3. Architecture

```
                                  +-----------------------------------------------+
                                  |   React 19 / TypeScript Institutional Client  |
                                  |              (Vite / Port 5173)               |
                                  +-----------------------+-----------------------+
                                                          |
                                           HTTPS / REST (JWT Bearer Token)
                                                          |
             +-----------------------+--------------------+-------------------+-----------------------+
             |                       |                                        |                       |
             v                       v                                        v                       v
    +-----------------+     +-----------------+                      +-----------------+     +-----------------+
    |  auth-service   |     | account-service |                      |transaction-svc  |     |notification-svc |
    |   (Port 8081)   |     |   (Port 8082)   |                      |   (Port 8083)   |     |   (Port 8084)   |
    +--------+--------+     +---+-----------+-+                      +---+-----------+-+     +--------+--------+
             |                  |           |                            |           |                |
             v                  v           v                            v           v                v
      +--------------+   +--------------+ +-----------+           +--------------+ +-----------+      |
      | PostgreSQL   |   | PostgreSQL   | | Redis 7   |           | PostgreSQL   | | Apache    |<-----+ (Consumers)
      |   auth_db    |   |  account_db  | | (Cache)   |           |transaction_db| |   Kafka   |
      | (Port 5435)  |   | (Port 5433)  | |(:6379)    |           | (Port 5434)  | | (:9092)   |
      +--------------+   +--------------+ +-----------+           +--------------+ +-----+-----+
                                |                                                        ^
                                +----------------- Transactional Outbox -----------------+
```

---

## 4. Technology Stack

- **Backend Platform**: Java 21 (LTS), Spring Boot 3.5.5, Spring Security 6.1+, Spring Data JPA, Hibernate 6.5.3, JJWT 0.12.6, Flyway 10.17
- **Data & Caching**: PostgreSQL 17 / 16.15 (multi-database isolation: `auth_db`, `account_db`, `transaction_db`), Redis 7 (Cache-Aside pattern)
- **Messaging & Streaming**: Apache Kafka 3.7+ / 4.0, Confluent Schema/Zookeeper, Transactional Outbox Pattern
- **Frontend Architecture**: React 19, TypeScript 5.5, Vite 8.2, Tailwind CSS, Lucide React, Axios
- **Infrastructure & Testing**: Docker Compose, JUnit 5, Mockito, Testcontainers 1.21.3

---

## 5. Service Architecture

| Service | Port | Database / State | Core Responsibility |
| :--- | :---:| :--- | :--- |
| **`auth-service`** | `8081` | PostgreSQL `auth_db` (`:5435`) | User registration, BCrypt password hashing, 2FA OTP challenge/verification, JWT token issuance |
| **`account-service`** | `8082` | PostgreSQL `account_db` (`:5433`) + Redis (`:6379`) | Account lifecycle, sub-ledger journals, beneficiary counterparties, Redis cache-aside reads |
| **`transaction-service`** | `8083` | PostgreSQL `transaction_db` (`:5434`) | Transfer saga orchestration, scheduled transfers, fraud queue, Merkle audit traces |
| **`notification-service`** | `8084` | Kafka Consumer (`:9092`) | Real-time multi-channel notification dispatch consuming `transfer.completed` events |

---

## 6. Infrastructure

- **PostgreSQL**: 3 isolated database instances ensuring strong domain boundary encapsulation:
  - `postgres-account` on port `5433` (`account_db`)
  - `postgres-transaction` on port `5434` (`transaction_db`)
  - `postgres-auth` on port `5435` (`auth_db`)
- **Redis 7**: Cache-aside caching layer on port `6379` for sub-millisecond balance queries with automatic mutation eviction.
- **Apache Kafka**: High-throughput distributed event broker on port `9092` with consumer groups for sagas and notifications.
- **ZooKeeper**: Coordination service on port `2181` managing Kafka metadata.
- **Kafka UI**: Web management interface on port `8090` (`http://localhost:8090`) for cluster inspection.

---

## 7. Repository Structure

```
.
├── .github/workflows/ci.yml       # Automated GitHub Actions CI/CD pipeline
├── .gitignore                     # Comprehensive ignore file for build outputs & secrets
├── README.md                      # Master repository documentation
├── online-banking-frontend/       # React 19 / TypeScript Institutional UI
│   ├── src/                       # Components, context, pages, services
│   ├── package.json               # Frontend dependencies and scripts
│   └── vite.config.ts             # Vite configuration
└── online-banking-system/         # Maven Multi-Module Java 21 Distributed Backend
    ├── pom.xml                    # Root Maven Reactor configuration
    ├── docker-compose.yml         # Containerized infrastructure definition
    ├── common/
    │   ├── common-dto/            # Immutable record DTOs and event payloads
    │   ├── common-exceptions/     # Domain exceptions and unified GlobalExceptionHandler
    │   ├── common-kafka/          # Kafka event publisher and topic definitions
    │   └── common-security/       # Stateless JWT filter and correlation ID tracking
    ├── auth-service/              # Port 8081: Authentication & 2FA OTP Service
    ├── account-service/           # Port 8082: Account Management & Double-Entry Ledger
    ├── transaction-service/       # Port 8083: Transfer Saga & Fraud Rule Engine
    ├── notification-service/      # Port 8084: Multi-Channel Event Consumer
    └── docs/                      # Architectural & Operational Documentation
        ├── ARCHITECTURE.md        # Concurrency model, sagas, and topology
        ├── API.md                 # Complete OpenAPI REST specification
        ├── DATABASE_SCHEMA.md     # Relational ERD and schema constraints
        ├── DEMO_RUNBOOK.md        # Step-by-step 20-stage demonstration runbook
        ├── INTERVIEW.md           # Technical deep-dive interview Q&A
        ├── PROJECT_COMPLETION_STATUS.md # Verification matrix and sign-off
        └── FINAL_RELEASE_CHECKLIST.md  # Final release readiness checklist
```

---

## 8. Prerequisites

- **Java Development Kit (JDK)**: Java 21 (LTS) or higher
- **Node.js**: Node 20.x or higher & npm 10+
- **Docker & Docker Compose**: Docker Engine 24+ / Compose v2+
- **Apache Maven**: Maven 3.9+ (or use wrapper)

---

## 9. Quick Start

### Starting Infrastructure
```bash
cd online-banking-system
docker compose up -d
```
Verify all containers are healthy:
```bash
docker compose ps
```

### Starting Backend Services
In separate terminal tabs (or run via IDE):
```bash
# Terminal 1: Auth Service (:8081)
cd online-banking-system/auth-service && mvn spring-boot:run

# Terminal 2: Account Service (:8082)
cd online-banking-system/account-service && mvn spring-boot:run

# Terminal 3: Transaction Service (:8083)
cd online-banking-system/transaction-service && mvn spring-boot:run

# Terminal 4: Notification Service (:8084)
cd online-banking-system/notification-service && mvn spring-boot:run
```

### Starting Frontend
```bash
cd online-banking-frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 10. LIVE API Mode vs DEMO SIMULATION Mode

- **LIVE API Mode (Default)**: Directly communicates with backend microservices on ports `8081`–`8084`. All state mutations, JWT validations, outbox events, and PostgreSQL transactions execute in real time.
- **DEMO SIMULATION Mode**: Accessible via the mode toggle switch in the UI header. Provides offline deterministic simulation for quick presentations when infrastructure is not running.

---

## 11. Running Tests

### Backend Test Suite
```bash
cd online-banking-system
mvn clean test
```
*Executes all 25 unit, concurrency, and PostgreSQL integration tests across all 9 Maven modules.*

### Frontend Production Build & Typecheck
```bash
cd online-banking-frontend
npm run build
```

### Automated Live 20-Stage User Journey Test
```bash
node scratch/verify_journey.cjs
```
*Validates the entire 20-stage banking journey end-to-end against live PostgreSQL, Kafka, and Redis.*

---

## 12. Core Financial Design

1. **Precision & Money Math**: All monetary amounts use Java `BigDecimal` and PostgreSQL `NUMERIC(19,4)`. Floating-point calculations (`float`/`double`) are strictly prohibited to prevent IEEE 754 rounding errors.
2. **Deadlock-Free Deterministic Row Locking**: All multi-account transfer operations sort account UUIDs (`UUID.compareTo()`) before acquiring `SELECT ... FOR UPDATE` row locks, mathematically preventing cyclic wait deadlocks.
3. **Database-Enforced Idempotency**: `idempotency_key` is unique-constrained at the PostgreSQL level in `transactions`. Concurrent duplicate requests trigger `DataIntegrityViolationException` in an isolated sub-transaction (`PROPAGATION_REQUIRES_NEW`), safely retrieving the winner record without poisoning the Hibernate session.
4. **Transactional Outbox Pattern**: Microservices commit business entities and outbox events in a single atomic database transaction, guaranteeing zero message loss across Kafka broker failures.
5. **Kafka Consumer Deduplication**: Consumers record processed message IDs in `processed_events` table before applying mutations, providing exactly-once processing semantics over at-least-once transport.
6. **Compensating Saga Reversals**: Reversals execute paired compensating transfers (`REVERSAL_CREDIT` to source) and publish `transfer.reversed` events to Kafka.
7. **Immutable Double-Entry Ledger**: The `ledger_entries` table is append-only, preserving an immutable journal of every financial state transition.

---

## 13. Security & Access Control

- **Stateless JWT Authentication**: HMAC-SHA384 / HMAC-SHA256 signed tokens containing user identity and role claims.
- **Two-Factor Authentication (2FA)**: Login challenges issue temporary `otpSessionId` records; verification yields time-bound JWT tokens.
- **Role-Based Access Control (RBAC)**:
  - `CUSTOMER`: Access to own accounts, transfers, beneficiaries, scheduled sweeps.
  - `ADMIN`: Real-time fraud queue review, risk scoring, account freeze/unfreeze controls.
  - `AUDITOR`: Forensic Merkle trace inspection, outbox event history, SOC-2 audit logs.
- **Resource Ownership Validation**: Controller filters reject cross-customer access attempts with HTTP `403 Forbidden`.
- **Stateless Error Mapping**: `GlobalExceptionHandler` converts security exceptions to standard HTTP `401 Unauthorized` and `403 Forbidden` JSON responses.

---

## 14. Observability & Distributed Tracing

- **Distributed Tracing**: `X-Correlation-Id` header is propagated across all HTTP requests, Kafka event headers, and structured log entries.
- **Spring Boot Actuator**: Health and metric endpoints exposed on `/actuator/health` across all microservices.
- **Kafka UI**: Real-time topic, partition, and consumer lag monitoring on port `8090`.

---

## 15. Architectural Documentation

Complete in-depth technical specifications are available in the [`docs/`](docs/) directory:

- [**System Architecture & Concurrency Model**](docs/ARCHITECTURE.md)
- [**Complete REST API Reference**](docs/API.md)
- [**Relational Database Schema & ERD**](docs/DATABASE_SCHEMA.md)
- [**Live Demonstration Runbook**](docs/DEMO_RUNBOOK.md)
- [**Technical Interview & Design Q&A**](docs/INTERVIEW.md)
- [**Project Completion Status**](docs/PROJECT_COMPLETION_STATUS.md)
- [**Final Release Checklist**](docs/FINAL_RELEASE_CHECKLIST.md)
- [**Master Release Archive Verification (Step 2)**](docs/STEP_2_ARCHIVE_VERIFICATION.md)
- [**Real Machine Verification Report (Step 3)**](docs/STEP_3_REAL_MACHINE_VERIFICATION.md)
- [**Frontend UI Verification Report (Step 4)**](docs/STEP_4_FRONTEND_UI_VERIFICATION.md)

---

## 16. Known Portfolio Limitations

This platform is a **portfolio reference implementation** and differs from regulated enterprise production banking in the following ways:
- **Test OTP Bypass**: A deterministic master code (`123456`) is accepted alongside live dynamic OTP codes to enable automated integration test execution without physical SMS hardware.
- **Notification Sink**: `notification-service` consumes Kafka events and logs multi-channel dispatches in an in-memory queue rather than calling paid third-party SMS/Email gateways.
- **Service Ingress**: Microservices listen directly on allocated local ports (`8081`–`8084`) for developer simplicity; enterprise production setups should front them with Spring Cloud Gateway or Kubernetes Ingress.
- **Internal REST Paths**: `/internal/**` REST endpoints are configured with permitAll for local demonstration, standing in for mTLS or Kubernetes NetworkPolicy isolation in enterprise clusters.

---

APPLICATION IMPLEMENTATION COMPLETE — NO FURTHER FEATURE EXPANSION REQUIRED.
