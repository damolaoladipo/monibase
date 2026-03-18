# Monibase FX Trading API

Backend for an FX trading app: register and verify users, fund multi-currency wallets, convert and trade NGN against USD, EUR, and GBP using live FX rates, with KYC and admin flows.

---

## Project overview

**Monibase** is the backend API for an FX wallet and trading experience, built with **NestJS**, **TypeORM**, **PostgreSQL**, **Redis** (BullMQ), and **TypeScript**. This document is both the project README and a lightweight **software requirements / use-case** outline for what the API delivers.

### Purpose

The system exists to support a **signed-in, server-backed** FX workflow: real money-style wallet state, compliance gates, and auditable money movement. The **core loop** end users (and operators) move through is:

1. **Onboard** – Register with email, receive OTP, verify, then log in and receive a JWT.
2. **Fund** – Add balance to the wallet (per currency); initial NGN row is ensured on first balance read.
3. **Discover** – See live FX rates and public comparison-style **quotes** (rate, fee placeholder, delivery estimate) before committing to a trade.
4. **Comply** – Submit KYC (and optional ID / proof-of-address documents); wait for **admin review** while trading stays blocked for non-admin users.
5. **Trade** – Once KYC is verified (or as **admin**), **convert** or **trade** between NGN and USD/EUR/GBP using cached live rates; **transfer** within own currencies or P2P in the same currency, with optional idempotency keys.
6. **Review** – Inspect **transaction history**; operators rely on **audit logs** and admin APIs (user list, KYC queue, FX quote debug).

The API focuses on **correct balances**, **rate freshness with graceful degradation**, **clear access rules** (email verified, KYC for trading), and **safe retries** (idempotency on sensitive wallet writes).

### Product summary

The current implementation includes:

- Email **registration**, **OTP verification**, **JWT login/logout**, and global **rate limiting** on auth and high-value routes.
- **Multi-currency wallet** (NGN, USD, EUR, GBP), **fund**, **convert**, **trade** (NGN-pair rules), and **transfer** (same-user cross-currency or P2P same-currency).
- **FX rates** from an external provider with in-memory cache, TTL, and stale fallback; public **`GET /fx/quotes`** (Wise-style quote list) and admin **`GET /admin/fx/quote-debug`**.
- **KYC** submit, status, document upload (local storage path), and **admin** review (pending list, approve/reject).
- **Transaction history** with pagination/filtering; **audit** events for auth, KYC, and wallet actions (no secrets or PII in logs).
- **OpenAPI (Swagger)** at `/api` and consistent JSON **error/success** envelopes.

### Scope

**In scope**

- Server-side auth, wallet ledger behaviour, FX integration, KYC workflow and admin review, transaction recording, idempotency on fund/convert/trade/transfer, rate limits, audit trail.
- Public FX endpoints for pre-login **quote discovery**; protected wallet and trading APIs for verified + KYC-gated users.
- Admin and super-admin roles for KYC, user listing, and operational FX insight.

**Out of scope** (not implemented as part of this API)

- Mobile or web **client UI** (this repo is API-only).
- **Bank rails**, card processing, or fiat **payout** to external accounts.
- Automated **third-party KYC** vendors or identity verification APIs.
- **Multi-tenant** or white-label tenant isolation beyond role-based admin.
- **Real-time** push notifications or WebSocket price feeds.
- **Cross-server** wallet sync (single logical backend and database).

---

## Contents

0. [Project overview](#project-overview) – purpose, core loop, product summary, scope  
1. [Quick start](#quick-start)
2. [New developer setup](#new-developer-setup)
3. [Environment variables](#environment-variables)
4. [Project structure](#project-structure)
5. [NPM scripts](#npm-scripts)
6. [Verifying your setup](#verifying-your-setup)
7. [API documentation](#api-documentation)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Key product assumptions](#key-product-assumptions)
11. [Security](#security)
12. [Architectural decisions](#architectural-decisions)  
13. [System architecture (diagrams)](./ARCHITECTURE.md) – modules, data model, flows

---

## Quick start

If you already have PostgreSQL and Redis running locally:

```bash
cp .env.example .env
# Edit .env: JWT_SECRET (32+ chars), DB_*, MAIL_*, ENABLE_SEEDING, SUPERADMIN_*, optional FX_API_KEY
npm install
npm run start:dev
```

- API base: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api`

---

## New developer setup

### Prerequisites

| Tool | Notes |
|------|--------|
| **Node.js** | v18 or newer (`node -v`) |
| **npm** | Comes with Node |
| **PostgreSQL** | 14+ recommended; empty database for the app |
| **Redis** | For BullMQ (email OTP queue); must be reachable before OTP emails are processed |

Optional: **Git**, **Docker** (if you prefer containerized Postgres/Redis).

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd monibase
npm install
```

### 2. PostgreSQL

Create a database and user the app can use. Example (adjust names/passwords):

```bash
# macOS (Homebrew) – ensure postgresql@14 is running
createdb monibase
# Or using psql:
psql -U postgres -c "CREATE DATABASE monibase;"
psql -U postgres -c "CREATE USER monibase WITH PASSWORD 'yourpassword';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE monibase TO monibase;"
```

Docker one-liner (alternative):

```bash
docker run --name monibase-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=monibase -p 5432:5432 -d postgres:16
```

Match `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` in `.env` to your instance.

**Development:** With `NODE_ENV=development`, TypeORM `synchronize: true` creates and updates tables on startup. **Production:** turn off synchronize and use migrations (see [NPM scripts](#npm-scripts)).

### 3. Redis

```bash
# macOS (Homebrew)
brew services start redis

# Docker
docker run --name monibase-redis -p 6379:6379 -d redis:7-alpine
```

Set `REDIS_HOST` and `REDIS_PORT` in `.env` (defaults: `localhost`, `6379`).

### 4. Environment file

```bash
cp .env.example .env
```

Fill every **required** value (see [Environment variables](#environment-variables)). The app validates env at startup via Joi (`src/configs/env.validation.ts`); missing or invalid values cause a clear startup error.

**Minimum checklist for first boot:**

- `JWT_SECRET` – at least 32 characters.
- `DB_*` – match your Postgres instance.
- `MAIL_HOST`, `MAIL_FROM` – SMTP for OTP emails (see below).
- `FX_API_URL` – e.g. `https://v6.exchangerate-api.com/v6` (see [FX API key](#fx-rates-api)).

### 5. Email (OTP) in development

Registration sends an OTP by email. You need a working SMTP configuration:

- Use a real mailbox (Gmail app password, SendGrid, etc.), or
- Run a local SMTP catcher (e.g. [Mailpit](https://github.com/axllent/mailpit), MailHog) and point `MAIL_HOST` / `MAIL_PORT` at it.

`MAIL_USER` and `MAIL_PASSWORD` can be empty for some local catchers; production should use authenticated SMTP.

### 6. FX rates API

Rates are fetched from an HTTP API compatible with exchangerate-api.com style URLs.

1. Sign up at [exchangerate-api.com](https://www.exchangerate-api.com/) (free tier available).
2. Set `FX_API_URL` to your plan’s base URL (see their docs).
3. Set `FX_API_KEY` if your plan requires it in the path; leave empty only if your URL works without a key.

Without a valid FX setup, rate-dependent endpoints return `503` when the upstream fails and there is no stale cache yet.

### 7. Super-admin seed (optional)

Seeding runs only when **`ENABLE_SEEDING=true`** in `.env`. It loads roles/permissions and, if **no** user with role `admin` or `super-admin` exists yet, creates a super-admin from:

- `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` (min 8 chars), optional name fields.

Use that account for admin routes (KYC review, `GET /admin/fx/quote-debug`, `GET /users`). For local shared databases, set **`ENABLE_SEEDING=false`** after the first successful seed so roles are not re-applied unnecessarily on every restart (superadmin skip is idempotent if an admin already exists).

### 8. Start the application

```bash
npm run start:dev
```

Watch the console for `Nest application successfully started` (or similar) and the listening port (default **3000**).

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NODE_ENV` | | `development` \| `production` \| `test` |
| `PORT` | | HTTP port (default 3000) |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Yes | PostgreSQL |
| `JWT_SECRET` | Yes (min 32 chars) | JWT signing |
| `JWT_EXPIRY` | | e.g. `7d` |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM` | Yes | Outbound email |
| `MAIL_USER`, `MAIL_PASSWORD` | Often | SMTP auth |
| `FX_API_URL` | Yes | FX provider base URL |
| `FX_API_KEY` | If provider needs it | API key |
| `FX_CACHE_TTL_SECONDS` | | In-memory rate cache TTL |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` | | BullMQ / queue |
| `APP_URL` | | Links in emails |
| `STORAGE_LOCAL_PATH` | | KYC document uploads (default `./uploads`) |
| `ENABLE_SEEDING` | `true` to run seeds on startup | Roles, permissions, optional superadmin |
| `SUPERADMIN_*` | If seeding and no admin yet | First super-admin account |

Copy `.env.example` for the full list and comments.

---

## Project structure

```
src/
  server.ts              # Application bootstrap (listen, Swagger, global middleware)
  app.module.ts          # Root Nest module
  app.controller.ts      # Root routes if any
  common/                # Guards, decorators, filters, interceptors, pipes, shared utils
  configs/               # db, app, redis, env validation, seeds, permissions
  modules/
    auth/                # Register, verify OTP, login, logout, JWT
    user/                # Profile, admin user listing
    wallet/              # Balances, fund, convert, trade, transfer, transactions
    fx/                  # Rates, public quotes, admin quote-debug
    kyc/                 # Submit, status, documents, admin review
    email/               # Queue + templates (Bull)
    bull/, cache/, storage/
  tasks/                 # Scheduled / worker tasks if enabled
test/
  unit/                  # Fast tests, mocked DB
  e2e/                   # HTTP tests; require real Postgres (and Redis for full flows)
```

Feature code pattern: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `entities/`, `dto/` per domain.

---

## NPM scripts

| Command | Use |
|---------|-----|
| `npm run start:dev` | Development with hot reload |
| `npm run start:debug` | Attach Node debugger |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled app (`node dist/src/server.js`) |
| `npm run test:unit` | Unit tests only (no DB) |
| `npm run test:e2e` | E2E tests (needs Postgres; see [Testing](#testing)) |
| `npm run test` | All Jest suites |
| `npm run migration:generate` / `migration:run` | TypeORM migrations (after `build`) |

---

## Verifying your setup

1. **Swagger:** Open `http://localhost:3000/api` – spec should load.
2. **Public FX:** `GET http://localhost:3000/api/v1/fx/rates` – returns JSON with `base`, `rates`, `updatedAt`.
3. **Quotes:** `GET http://localhost:3000/api/v1/fx/quotes?sourceCurrency=NGN&targetCurrency=USD&amount=1000` – returns `quotes` array.
4. **Auth flow:** Register via Swagger `POST /auth/register`, read OTP from email (or mail catcher), `POST /auth/verify`, then `POST /auth/login` for JWT. Use **Authorize** in Swagger for protected routes.

---

## API documentation

Monibase exposes REST JSON under **`/api/v1`**. Responses use a common envelope where applicable (`error`, `message`, `errors`, `data`, `status`).

**Interactive docs:** [Swagger UI at `/api`](http://localhost:3000/api) (try-it-out, schemas).

### Authentication

Protected routes need:

| Header | Value |
|--------|--------|
| `Content-Type` | `application/json` (or `multipart/form-data` for KYC document upload) |
| `Authorization` | `Bearer <jwt>` from `POST /auth/login` |

Invalid or missing token example:

```json
{
  "error": true,
  "message": "Unauthorized",
  "errors": [],
  "data": {},
  "status": 401
}
```

### Success / error envelope

```json
{
  "error": false,
  "message": "successful",
  "errors": [],
  "data": { },
  "status": 200
}
```

List endpoints (e.g. `GET /transactions`, `GET /users`) support `page`, `limit`, `sort`, `order`, `filter` – see Swagger.

### Rate limits

| Scope | Limit | Window |
|-------|--------|--------|
| `/api/v1/auth/*` | 20 | 15 min / IP |
| Wallet fund, convert, trade, transfer | 30 | 1 hour / IP |
| Global | 1000 | 30 min / IP |

**429** when exceeded; clients should retry with backoff.

### Endpoint overview

**Auth**

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register; enqueues OTP email |
| POST | /auth/verify | Verify OTP |
| POST | /auth/login | JWT |
| POST | /auth/logout | Invalidate token |

**Wallet** (email-verified; convert/trade need KYC or admin role)

| Method | Path | Description |
|--------|------|-------------|
| GET | /wallet | Balances; seeds NGN 0 on first access |
| POST | /wallet/fund | Fund |
| POST | /wallet/convert | Convert |
| POST | /wallet/trade | Trade (NGN pairs validated) |
| POST | /wallet/transfer | Same-user FX path or P2P same currency; idempotent |

**FX** (public)

| Method | Path | Description |
|--------|------|-------------|
| GET | /fx/rates | Live rates |
| GET | /fx/quotes | Comparison-style quotes (rate, fee, `delivery` min/max ISO durations; in-wallet instant = `PT0S`) |

**Admin** (JWT + `admin` or `super-admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/fx/quote-debug | Quotes + stale, rate base, mid-market ref |
| GET | /users | Paginated user list |
| GET/POST | /kyc/admin/* | Pending KYC, review |

**Transactions**

| GET | /transactions | History (paginated) |

**KYC**

| POST | /kyc/submit | Submit |
| GET | /kyc/status | Status |
| POST | /kyc/documents | Multipart: `file`, `documentType` |

**FX quotes note:** `GET /fx/quotes` is public; **executing** convert/trade still requires verified email + KYC (admins exempt). Convert/trade/transfer responses may include `delivery: { min, max }` for instant in-wallet settlement.

---

## Testing

- **Unit:** `npm run test:unit` – no database; safe in CI.
- **E2E:** `npm run test:e2e` – spins up the app against a real Postgres (and Redis for queue-heavy paths). Ensure `.env` or test env points at a disposable DB and that the `postgres` role (or your `DB_USERNAME`) exists and can connect.

---

## Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| App exits on startup | Joi validation message – fix the listed env var |
| `role "postgres" does not exist` | Create the DB user or set `DB_USERNAME` to your local Postgres user |
| ECONNREFUSED Redis | Start Redis; match `REDIS_HOST` / `REDIS_PORT` |
| OTP never arrives | SMTP settings, spam folder, mail catcher logs, Bull worker running |
| FX `503` / rates unavailable | `FX_API_URL` / `FX_API_KEY`, network; first request needs upstream success or stale cache |
| Tables missing in prod | Do not rely on `synchronize` in production; run migrations |
| 403 on convert/trade | Complete KYC or use admin account |
| `DeprecationWarning: client.query() when already executing` (pg) | Addressed by `patches/typeorm+0.3.28.patch` (applied on `npm install` via `patch-package`). TypeORM’s Postgres driver now loads table metadata with sequential `await` instead of parallel queries on one client. |

---

## Key product assumptions

- **Wallet:** One wallet per user; currencies include NGN, USD, EUR, GBP. First `GET /wallet` ensures NGN balance row; other currencies appear on fund/convert/trade.
- **FX:** External API + in-memory cache + TTL; stale cache used on upstream failure when available.
- **Idempotency:** Optional body key on fund, convert, trade, transfer – duplicates return the stored response.
- **Gating:** Email-verified for wallet/transactions; KYC (or admin) for convert/trade.
- **KYC:** Manual review; documents stored locally (path configurable) or extendable to S3; compliance retention is your policy.
- **Transfer:** Same-user cross-currency uses FX; P2P is same-currency only.

---

## Security

- Use **HTTPS** in production.
- Rate limits as in [Rate limits](#rate-limits).
- **Audit logging** on auth, KYC events, wallet mutations – no passwords, full tokens, amounts, or PII in logs.

---

## Architectural decisions

- **System architecture:** See [ARCHITECTURE.md](./ARCHITECTURE.md) for module diagram, domain model, and sequence flows (registration, wallet idempotency, KYC gating, FX cache).
- **Modular NestJS:** Auth, User, Wallet, Fx, KYC, Email, shared common layer.
- **PostgreSQL** only.
- **Bull + Redis** for async OTP email.
- **FX comparison** response shape aligned with [Wise Comparison API](https://docs.wise.com/api-reference/comparison) (multi-provider ready).
- **API docs** influenced by clear structure (auth, responses, limits, grouped endpoints) similar to provider docs such as [Terraswitch](https://docs.terraswitching.com/).
