# Monibase FX Trading App

Backend for an FX Trading App: users can register, verify email, fund wallets, and trade Naira (NGN) against USD, EUR, GBP using real-time FX rates.

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

- **PostgreSQL** only (no MySQL).
- **Modular structure**: Auth, User, Wallet, Fx, KYC, Email as feature modules; common filters, guards, interceptors shared.
- **Queue for email**: OTP is enqueued (BullMQ) after register; processor sends via nodemailer. Response is not blocked on email delivery.
- **Cache for FX**: In-memory cache with TTL; optional Redis for FX cache (Redis is used for the email queue).

## API overview

All API routes are under the global prefix `/api/v1`.

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register, triggers OTP email |
| POST | /auth/verify | Verify OTP, activate account |
| POST | /auth/login | Login, returns JWT |
| POST | /auth/logout | Invalidate token |
| GET | /wallet | Balances (email-verified); ensures initial NGN 0 if empty |
| POST | /wallet/fund | Fund wallet |
| POST | /wallet/convert | Convert currencies (KYC or admin) |
| POST | /wallet/trade | Trade NGN with others (KYC or admin) |
| POST | /wallet/transfer | Transfer: same-user (fromCurrency/toCurrency) or P2P (toUserId, same currency); idempotent |
| GET | /fx/rates | Current FX rates (public) |
| GET | /transactions | Transaction history (paginated) |
| POST | /kyc/submit | Submit KYC |
| GET | /kyc/status | KYC status |
| POST | /kyc/documents | Upload KYC document (multipart: file, documentType=id or proof_of_address) |

See Swagger UI at `/api` for full request/response shapes.
