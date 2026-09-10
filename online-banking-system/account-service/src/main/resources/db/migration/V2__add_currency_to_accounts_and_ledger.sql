-- V2: Add multi-currency support (USD, INR) with database-level constraints
ALTER TABLE accounts ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD';
ALTER TABLE accounts ADD CONSTRAINT chk_accounts_currency CHECK (currency IN ('USD', 'INR'));

ALTER TABLE ledger_entries ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD';
ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_currency CHECK (currency IN ('USD', 'INR'));
