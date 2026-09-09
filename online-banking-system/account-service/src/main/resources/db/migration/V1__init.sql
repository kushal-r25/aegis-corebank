CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    account_number  VARCHAR(20) UNIQUE NOT NULL,
    account_type    VARCHAR(20) NOT NULL,
    balance         NUMERIC(19,4) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_balance_nonneg CHECK (balance >= 0)
);

CREATE TABLE beneficiaries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_account_id    UUID NOT NULL REFERENCES accounts(id),
    beneficiary_account VARCHAR(20) NOT NULL,
    nickname            VARCHAR(100),
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (owner_account_id, beneficiary_account)
);

CREATE TABLE ledger_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id),
    amount          NUMERIC(19,4) NOT NULL,
    entry_type      VARCHAR(30) NOT NULL,
    balance_after   NUMERIC(19,4) NOT NULL,
    reference_id    VARCHAR(100),
    description     VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_ledger_account_id ON ledger_entries(account_id);
CREATE INDEX idx_ledger_created_at ON ledger_entries(created_at);
