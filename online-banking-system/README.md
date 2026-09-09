# Aegis CoreBank — Distributed Backend Services

Distributed, event-driven institutional banking backend built with Java 21 LTS, Spring Boot 3.5.5, PostgreSQL 17, Redis 7, Apache Kafka, and Docker Compose. Features 4 domain microservices, Saga-orchestrated transfers, deterministic pessimistic row locking, idempotent transactional outbox processing, and immutable double-entry sub-ledger accounting.

## Services

| Service | Port | DB | Responsibility |
|---|---|---|---|
| `auth-service` | 8081 | `auth_db` (5435) | username/password → OTP → JWT |
| `account-service` | 8082 | `account_db` (5433) | accounts, balances, beneficiaries, Redis-cached reads |
| `transaction-service` | 8083 | `transaction_db` (5434) | transfer Saga, idempotency, fraud rules, audit log |
| `notification-service` | 8084 | — | consumes transfer events, "sends" notifications |

`common/` holds shared, dependency-free modules: `common-dto` (request/response/event
records), `common-kafka` (topic names + publisher), `common-exceptions` (exception
types + a shared `@RestControllerAdvice`), `common-security` (JWT validation filter).

## Quick start

```bash
# 1. Bring up infra (Postgres x3, Redis, Kafka, Kafka UI at localhost:8090)
docker compose up -d

# 2. Run each service locally (separate terminals) — do this before trying
#    the commented-out app services in docker-compose.yml, so you can see
#    each service's own logs/errors while wiring things together.
cd auth-service && mvn spring-boot:run
cd account-service && mvn spring-boot:run
cd transaction-service && mvn spring-boot:run
cd notification-service && mvn spring-boot:run
```

Flyway migrates each service's DB on startup — no manual schema setup needed.

## End-to-end flow

```bash
# Register + login (returns an OTP session id; OTP is logged to auth-service console)
curl -X POST "localhost:8081/auth/register?username=alice&password=pass123"
curl -X POST localhost:8081/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"pass123"}'
# -> grab the 6-digit code from auth-service logs, then:
curl -X POST localhost:8081/auth/verify-otp -H 'Content-Type: application/json' \
  -d '{"otpSessionId":"<from above>","code":"<from logs>"}'
# -> returns a JWT. Use it as: -H "Authorization: Bearer <token>"

# Create two accounts, transfer between them
curl -X POST localhost:8082/accounts -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"userId":"<uuid>","accountType":"SAVINGS"}'

curl -X POST localhost:8083/transfers -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fromAccountId":"...","toAccountId":"...","amount":100.00,"idempotencyKey":"txn-001"}'

# Watch it land:
curl localhost:8083/transactions/account/<accountId>
curl localhost:8084/notifications
```

## Key design decisions (see full writeups in chat history / `docs/`)

- **Concurrency**: pessimistic row locks (`SELECT ... FOR UPDATE` via
  `@Lock(PESSIMISTIC_WRITE)`) on the debit/credit path, with accounts always locked in
  a consistent UUID order to prevent deadlocks between opposite-direction transfers.
  Proven by `AccountConcurrencyTest` (10 concurrent threads draining one account to
  exactly zero, never negative).
- **Idempotency**: `idempotency_key` is `UNIQUE`-constrained at the DB level in
  `transactions`, not just checked in application code — closes the race where two
  retries of the same request could both pass an app-level `existsBy` check.
- **Saga**: orchestration style (transaction-service owns the state machine), not
  choreography. Debit (reserve funds) is synchronous so the client gets an immediate
  success/failure. Credit is asynchronous via Kafka; if it fails, the debit is
  compensated (refunded).
- **Outbox pattern**: the event that kicks off the credit step is written to an
  `outbox_events` table in the *same DB transaction* as the `RESERVED` status update,
  so a crash between "debit committed" and "event published" is structurally
  impossible. A separate poller publishes outbox rows to Kafka; a 5-minute
  reconciliation job is a second line of defense for anything that still slips through
  (e.g. a consumer down for hours).
- **Caching**: cache-aside on balance reads only (`@Cacheable`/`@CacheEvict`, 30s TTL).
  The transfer path never trusts the cache — it always locks and reads fresh.
- **Service boundaries**: 4 services, not more. Beneficiaries live inside
  account-service (same aggregate, no independent scaling need) and fraud rules live
  inside transaction-service as a component (a real bank might split it once it's an
  independently-deployed ML model; not worth the extra Kafka topic here).

## What's stubbed / left as an exercise

- `notification-service` logs + stores notifications in memory instead of calling a
  real email/SMS provider — swap `NotificationService`'s two `sendXxx` bodies for a
  real client without touching the Kafka listener.
- No API gateway — each service is called directly on its own port. Add
  Spring Cloud Gateway once all four talk to each other correctly; it's infra
  plumbing that shouldn't block getting the core logic right first.
- `SecurityConfig.requestMatchers("/internal/**").permitAll()` in account-service is
  the local-dev stand-in for "these endpoints sit behind network policy / mTLS
  restricting callers to the internal cluster" — don't ship that permitAll as-is.
