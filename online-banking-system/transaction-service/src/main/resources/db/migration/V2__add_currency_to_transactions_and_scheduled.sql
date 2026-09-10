-- V2: Add multi-currency support (USD, INR) with database-level constraints
ALTER TABLE transactions ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD';
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_currency CHECK (currency IN ('USD', 'INR'));

ALTER TABLE scheduled_transfers ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD';
ALTER TABLE scheduled_transfers ADD CONSTRAINT chk_scheduled_currency CHECK (currency IN ('USD', 'INR'));
