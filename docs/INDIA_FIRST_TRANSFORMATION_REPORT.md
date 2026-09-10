# Aegis CoreBank — India-First Transformation Report

## 1. Executive Summary

This report documents the end-to-end transformation of **Aegis CoreBank** into a simple, intuitive, and modern **India-First Digital Online Banking Application**.

The transformation preserves 100% of the underlying core banking engine (Java 21, Spring Boot 3, PostgreSQL, Apache Kafka, Redis, BigDecimal NUMERIC financial precision, deterministic row locking, transactional outbox, and double-entry sub-ledger invariants) while tailoring the entire user experience, demo dataset, terminology, and defaults for the Indian retail and corporate banking context.

---

## 2. Core Architectural & UX Transformations

### A. Primary Currency: Indian Rupee (INR / ₹)
- **Default Currency**: Default currency set to **`INR` (`₹`)** across the frontend and backend request handlers.
- **Indian Numbering System Formatting**: Monies are rendered using the standard Indian locale (`en-IN`), e.g., `₹1,85,450.00`, `₹10,00,000.00` (Lakhs and Crores notation).
- **Multi-Currency Safety**: USD remains fully supported as a secondary multi-currency capability for international remittance accounts. Cross-currency transfers without real FX conversion are strictly rejected (`HTTP 422 CurrencyMismatchException`).

### B. User-Centric Terminology & Demographics
- **Primary Customer**: Rahul Sharma (`rahul`, `CUST-IND-849201`, Bengaluru / Mumbai).
- **Operations & Compliance Personnel**: Vikram Patel (`admin`, Level 3 Operator) and Ananya Iyer (`auditor`, Forensic Inspector).
- **Simplified Navigation**:
  - `My Accounts` (replacing "Accounts & Vaults / Sub-Ledger Portfolios")
  - `Transfer Money` (replacing "Transfers & Payments / Interbank Route")
  - `Transaction History` (replacing "Ledger Journal Statements")
  - `Beneficiaries`
  - `Standing Instructions / Scheduled Transfers`
  - `Security & Settings`
- **Account Types**:
  - `Primary Savings Account` (`₹1,85,450.00` INR)
  - `Corporate Salary Account` (`₹3,42,800.00` INR)
  - `High-Return Fixed Deposit (12M)` (`₹10,00,000.00` INR @ 7.10% p.a.)
  - `Multi-Currency Global Account` (`$12,500.00` USD)

### C. Realistic Indian Interbank Beneficiaries & Transactions
- **Beneficiary Directory**:
  - `Tata Consultancy Services Ltd` (HDFC Bank, IFSC: `HDFC0000128`)
  - `Infosys Technologies Ltd` (ICICI Bank, IFSC: `ICIC0000002`)
  - `Priya Nair` (State Bank of India, IFSC: `SBIN0001234`)
  - `Bundl Technologies (Swiggy)` (Axis Bank, IFSC: `UTIB0000045`)
  - `Apex Global Tech LLC` (Aegis Treasury US, Routing: `021000021`)
- **Transaction Journal**:
  - Swiggy food & Instamart orders (`-₹1,240.00`)
  - Vendor NEFT retainers (`-₹45,000.00`)
  - Monthly corporate salary credit (`+₹2,50,000.00`)
  - Quarterly Fixed Deposit interest credit (`+₹17,750.00`)
  - IMPS peer settlements (`+₹8,500.00`)

---

## 3. Verification & Compliance Matrix

| Component | Status | Verification Detail |
| :--- | :---:| :--- |
| **Frontend Production Build** | PASS | `npm run build` completed with 0 errors / 0 warnings in 938ms |
| **Backend Reactor Suite** | PASS | `mvn clean test` across all 9 Maven modules completed with 100% test success |
| **Financial Invariants** | PASS | `FinancialInvariantTest` passed: Non-negative balance constraint & exact BigDecimal precision verified |
| **Concurrency Locking** | PASS | `AccountConcurrencyTest` passed: Zero deadlocks under concurrent multi-account transfers |
| **Multi-Currency Validation** | PASS | `CurrencyValidationTest` passed: INR default, balance segregation, and cross-currency rejection verified |
| **Saga Orchestrator** | PASS | `TransferSagaOrchestratorTest` passed: Idempotency deduplication & compensations verified |

---

## 4. Reference Disclaimers

> **Portfolio Implementation Notice**: This application is a technical reference implementation and portfolio demonstration. It models real-world banking engineering patterns (ACID, Sagas, Outbox, Distributed Locking) but does not connect to live NPCI/UPI, RBI, or live payment gateways.
