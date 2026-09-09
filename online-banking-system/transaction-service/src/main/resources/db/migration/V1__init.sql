CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key     VARCHAR(64) UNIQUE NOT NULL,
    from_account_id     UUID NOT NULL,
    to_account_id       UUID NOT NULL,
    amount              NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    status              VARCHAR(20) NOT NULL,
    failure_reason      VARCHAR(255),
    risk_flag           VARCHAR(20),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    transaction_id  UUID NOT NULL REFERENCES transactions(id),
    event_type      VARCHAR(50) NOT NULL,
    event_payload   JSONB,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id    UUID NOT NULL,
    event_type      VARCHAR(50) NOT NULL,
    topic           VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,
    published       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scheduled_transfers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL,
    from_account_id     UUID NOT NULL,
    to_account_id       UUID NOT NULL,
    amount              NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    frequency           VARCHAR(20) NOT NULL,
    description         VARCHAR(255),
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    next_execution_time TIMESTAMPTZ NOT NULL,
    last_execution_time TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE processed_events (
    event_id            VARCHAR(100) PRIMARY KEY,
    consumer_group      VARCHAR(100) NOT NULL,
    processed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fraud_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id      UUID NOT NULL REFERENCES transactions(id),
    from_account_id     UUID NOT NULL,
    amount              NUMERIC(19,4) NOT NULL,
    risk_level          VARCHAR(20) NOT NULL,
    risk_reason         VARCHAR(255) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by         VARCHAR(50),
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_txn_from_account ON transactions(from_account_id);
CREATE INDEX idx_txn_to_account ON transactions(to_account_id);
CREATE INDEX idx_txn_status ON transactions(status);
CREATE INDEX idx_outbox_unpublished ON outbox_events(published) WHERE published = false;
CREATE INDEX idx_scheduled_next ON scheduled_transfers(next_execution_time, status);
CREATE INDEX idx_fraud_status ON fraud_records(status);

