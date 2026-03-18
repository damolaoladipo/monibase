# Monibase FX Trading App

Backend for an FX Trading App: users can register, verify email, fund wallets, and trade Naira (NGN) against USD, EUR, GBP using real-time FX rates.

---

## API Documentation

Monibase APIs enable FX trading on your platform: user registration and verification, wallet funding, currency conversion, and trading NGN against USD, EUR, and GBP. The API gives you access to auth, wallet, FX rates, transactions, and KYC features for use in your product or application.

**Interactive docs:** Open [Swagger UI at /api](http://localhost:3000/api) for full request/response shapes and try-it-out.

### Get started

- All API routes use the global prefix **`/api/v1`**.
- For testing, run the app locally and use the seeded super-admin or register a new user; see Setup below.
- See **Authentication** for how to send the JWT on protected routes.

### Authentication

Protected endpoints require a Bearer JWT in the `Authorization` header. Obtain a token via `POST /auth/login` (after `POST /auth/register` and `POST /auth/verify`).

**Required headers (protected routes):**

| Header | Value | Description |
|--------|--------|-------------|
| Content-Type | application/json | Request body type (multipart/form-data for document uploads) |
| Authorization | Bearer \<your_jwt\> | JWT returned from login |

Invalid or missing tokens result in `401 Unauthorized`. Example error body:

```json
{
  "error": true,
  "message": "Unauthorized",
  "errors": [],
  "data": {},
  "status": 401
}
```

### Status and responses

Responses use a consistent envelope. Success example:

```json
{
  "error": false,
  "message": "successful",
  "errors": [],
  "data": { ... },
  "status": 200
}
```

Error example:

```json
{
  "error": true,
  "message": "Validation failed",
  "errors": ["field must be a string"],
  "data": {},
  "status": 400
}
```

List endpoints (e.g. `GET /transactions`) support pagination via query params (`page`, `limit`, `sort`, `order`, `filter`) and return paginated data with metadata; see Swagger for the exact response shape.

### API rate limits

| Scope | Limit | Window |
|-------|--------|--------|
| Auth routes (`/api/v1/auth`) | 20 requests | 15 min per IP |
| High-value wallet (fund, trade, convert, transfer) | 30 requests | 1 hour per IP |
| Global | 1000 requests | 30 min per IP |

When a limit is exceeded, the API returns **429 Too Many Requests**. Implement retries with backoff when you receive 429.

### API endpoints

**Auth**

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register; triggers OTP email |
| POST | /auth/verify | Verify OTP, activate account |
| POST | /auth/login | Login, returns JWT |
| POST | /auth/logout | Invalidate token |

**Wallet**

| Method | Path | Description |
|--------|------|-------------|
| GET | /wallet | Balances (email-verified); ensures initial NGN 0 if empty |
| POST | /wallet/fund | Fund wallet |
| POST | /wallet/convert | Convert currencies (KYC or admin) |
| POST | /wallet/trade | Trade NGN with others (KYC or admin) |
| POST | /wallet/transfer | Same-user or P2P transfer; idempotent |

**FX**

| Method | Path | Description |
|--------|------|-------------|
| GET | /fx/rates | Current FX rates (public) |
| GET | /fx/quotes | Comparison quotes: rate, fee, instant delivery (public; Wise-style list, single provider today) |

**Admin (JWT + admin or super-admin role)**

| Method | Path | Description |
|--------|------|-------------|
| GET | /admin/fx/quote-debug | Same as /fx/quotes plus stale flag, rate base, mid-market reference, source metadata |

**Transactions**

| Method | Path | Description |
|--------|------|-------------|
| GET | /transactions | Transaction history (paginated) |

**KYC**

| Method | Path | Description |
|--------|------|-------------|
| POST | /kyc/submit | Submit KYC |
| GET | /kyc/status | KYC status |
| POST | /kyc/documents | Upload document (multipart: file, documentType) |

See Swagger UI at `/api` for full request/response schemas.

**FX comparison (Wise-style):** `GET /api/v1/fx/quotes?sourceCurrency=NGN&targetCurrency=USD&amount=1000` returns a `quotes` array. Each item includes `provider` (e.g. monibase), `route`, `rate`, `fee`, optional `sendAmount` / `receivedAmount`, and `delivery` (`min` / `max` as ISO 8601 durations; in-wallet is instant, both `PT0S`). Quotes are **public**; **execution** (convert/trade) still requires email-verified user + KYC (admins exempt). `POST /wallet/convert`, `POST /wallet/trade`, and `POST /wallet/transfer` responses include the same `delivery` shape for in-wallet settlement.

---

## Tech stack

- **NestJS** – API framework
- **TypeORM** – ORM
- **PostgreSQL** – database
- **BullMQ + Redis** – email queue (OTP)
- **OpenAPI (Swagger)** – API docs

## Setup

1. **Requirements**: Node 18+, PostgreSQL, Redis.

2. **Install**:
   ```bash
   npm install
   ```

3. **Environment**: Copy `.env.example` to `.env` and set values (DB, JWT, mail, FX API, Redis). See `.env.example` for required variables.

4. **Database**: With `synchronize: true` in development, the app creates tables on startup. For production, use migrations (see TypeORM docs).

5. **Superadmin seeding**: On startup, if `RUN_SEED` is not `false` and no admin/super-admin user exists, a super-admin is created using `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, and optionally `SUPERADMIN_FIRST_NAME`, `SUPERADMIN_LAST_NAME`. Set these in `.env` when you want the first admin; set `RUN_SEED=false` to disable.

6. **Run**:
   ```bash
   npm run start:dev
   ```

7. **API docs**: Open [http://localhost:3000/api](http://localhost:3000/api) for Swagger UI.

**Config**: DB, app, and Redis are configured via `src/config` (db.config, app.config, redis.config); env validation is in `env.validation.ts`.

## Key assumptions

- **Wallet**: One wallet per user; balances per currency (NGN, USD, EUR, GBP). Each user has a wallet with at least NGN 0 after first GET /wallet (initial balance created on first balance request). Additional balances (e.g. USD) are created on first fund or convert/trade.
- **FX**: Rates from external API (e.g. exchangerate-api.com), cached in-memory with TTL (configurable). On API failure, stale cache is used if available; otherwise request fails (503).
- **Idempotency**: Fund, convert, trade, and transfer accept an optional idempotency key (body). Duplicate keys return the stored response.
- **Gating**: Only email-verified users can access wallet and transactions. Only KYC-verified users (or **admin**) can use convert/trade; **admin does not need KYC**.
- **KYC**: Manual review; status pending | verified | rejected. Document upload (ID, proof of address) is stored in local/S3; storage key is saved on the KYC record. Retention and review process are manual; document retention policy should be defined per compliance requirements.
- **Transfer**: POST /wallet/transfer supports (1) same-user: fromCurrency and toCurrency (uses FX rate if different); (2) P2P: toUserId and fromCurrency (same currency only). Idempotency applies.

## Security

- **HTTPS**: Use TLS in production. Do not send tokens or sensitive data over plain HTTP.
- **Rate limiting**: Stricter limits apply to sensitive paths; global limit applies to all. Auth routes (/api/v1/auth): 20 requests per 15 min per IP. High-value wallet routes (fund, trade, convert, transfer): 30 requests per hour per IP. Global: 1000 per 30 min per IP (see app.config).
- **Audit logging**: Register, verify OTP, login, logout; KYC submit and review (verified/rejected); wallet fund, convert, trade, transfer. Logged fields: userId, action, resource, outcome. No passwords, full tokens, amounts, or PII in logs.

## Architectural decisions

- **FX comparison API:** Quote list shape is influenced by the [Wise Comparison API](https://docs.wise.com/api-reference/comparison) (denormalized quotes, delivery min/max semantics). Today there is one provider (monibase); multiple providers or stored quotes can be added without breaking the response shape.
- **PostgreSQL** only (no MySQL).
- **Modular structure**: Auth, User, Wallet, Fx, KYC, Email as feature modules; common filters, guards, interceptors shared.
- **Queue for email**: OTP is enqueued (BullMQ) after register; processor sends via nodemailer. Response is not blocked on email delivery.
- **Cache for FX**: In-memory cache with TTL; optional Redis for FX cache (Redis is used for the email queue).

