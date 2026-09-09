# Aegis CoreBank — Institutional Frontend Client

Production-style Single Page Application (SPA) for **Aegis CoreBank**, built with React 19, TypeScript, and Vite. Designed to provide institutional treasury and banking clients with real-time multi-vault liquidity management, dual-sign transfer authorization, double-entry audit journals, fraud review queues, and forensic Merkle trace inspection.

---

## Key Features

- **Institutional Design System**: Stitch-inspired enterprise design tokens with high-contrast surfaces, monospaced numeric formatting, and Material Symbols.
- **Dual Execution Engine**:
  - **LIVE API Mode (Default)**: Communicates directly via Axios with backend microservices on ports `8081`–`8084` with real JWT authentication and dynamic MFA challenges.
  - **DEMO SIMULATION Mode**: Explicit offline simulation toggle for disconnected presentations.
- **Full Screen Coverage**:
  - **Authentication & MFA**: 2-step login with phone-masked OTP verification.
  - **Customer Dashboard** (`/dashboard`): Net available liquidity, running book balance, and express execution actions.
  - **Account Management** (`/accounts`): Checking and savings vaults, account creation modal, cash deposit and withdrawal modals.
  - **Wire Transfers** (`/transfers`): Multi-step transfer wizard with 2FA confirmation and client-generated `Idempotency-Key`.
  - **Transaction History** (`/transactions`): Filterable double-entry ledger journal, transaction detail slide-out, and compensating reversal modal.
  - **Counterparty Directory** (`/beneficiaries`): Add verified counterparties, nickname editing, block/unblock controls.
  - **Standing Orders** (`/scheduled-transfers`): Automated recurring sweeps with pause, resume, and cancel capabilities.
  - **Admin Risk Queue** (`/admin`): Real-time AML fraud scoring, risk case approval/rejection, and global circuit breaker control.
  - **Auditor Forensics** (`/auditor`): 2PC-free Saga step tracing, Kafka partition event lineage, Merkle root verification, and SOC-2 JSON export.
  - **Security Settings** (`/security`): Cryptographic policy inspection and session revocation.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle & typecheck
npm run build
```

Application runs at: **`http://localhost:5173`**

---

## Architecture Rule

The frontend is strictly a presentation and interaction layer for the Spring Boot microservices. PostgreSQL remains the sole authoritative source of truth. All balance mutations, idempotency checks, and validation rules are enforced at the backend and database level.
