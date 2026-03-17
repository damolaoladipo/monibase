# 12-Step Implementation Plan (monibase FX Trading App)

This plan implements **task.md** using **monibase/.cursor/rules**. Follow steps in order; each step builds on the previous.

**After each step, commit your changes** using the project commit rule: **monibase/.cursor/commands/commit.md**. Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `chore:`, `docs:`); title 50 characters or less; optional body for details. Example: `feat(auth): add register and OTP verify endpoints`.

---

## Step 1: Project bootstrap and config

- Create NestJS app (CLI or manual). Use **project-structure.mdc** layout: `src/`, `config/`, `common/`, `modules/`.
- Add **ConfigModule** (@nestjs/config). Load `.env`; validate required vars (DB, JWT, mail, FX API) with Joi or class-validator. See **email-config-and-logging.mdc**.
- Configure **TypeORM** for **PostgreSQL**: DataSource, entities path, migrations path. Do not create entities yet. After adding entities (Step 3, 5, 9), generate and run migrations; document in README.
- Add **common** module with: exception filter (single response shape: success `{ data }`, error `{ error: true, message, code, errors? }`), ValidationPipe global (whitelist, forbidNonWhitelisted, transform). Optionally: response interceptor to wrap success in `{ data }`. See **errors-and-validation.mdc**, **api-and-controllers.mdc**.
- Add shared types in `common/types/` (e.g. `Result<T>`, pagination). See **services-and-helpers.mdc**, **repositories-and-data.mdc**.
- Add **helmet** middleware for security headers. See **libraries-and-deps.mdc**.
- **CORS**: Configure CORS in `main.ts` (NestJS default or custom origins). Required for browser clients.
- **Request ID**: Add **RequestIdMiddleware** or **RequestIdInterceptor**: generate UUID per request, attach to request, include in all logs, set response header (e.g. X-Request-Id). See **email-config-and-logging.mdc**.
- **Response transform interceptor** (optional): Wrap successful handler return in `{ data: result }` so all responses share one shape. See **api-and-controllers.mdc**.
- **Logging interceptor** (optional): Log request method, path, status, duration; do not log request/response bodies (may contain passwords or tokens). See **api-and-controllers.mdc**, **errors-and-validation.mdc**.

**Rules:** project-structure.mdc, email-config-and-logging.mdc, errors-and-validation.mdc.

**Commit:** e.g. `chore(bootstrap): add NestJS app, config, common filter, ValidationPipe, helmet, request id`

---

## Step 2: Common guards, decorators, and pipes

- Implement **@Public()** decorator (set metadata to skip auth).
- Implement **@CurrentUser()** parameter decorator (return `request.user` from JWT payload).
- Add **JWT strategy** skeleton (PassportStrategy, extract Bearer token); leave validate() for Step 4.
- Register **JwtAuthGuard** and apply it globally; in the guard, skip when route has @Public(). See **auth-and-user.mdc**, **api-and-controllers.mdc**.
- **EmailVerifiedGuard** (or **ActivatedUserGuard**): Guard that loads user and checks `isActivated`; use on wallet and transactions routes so only email-verified users can access. Reuse in Step 5. See **task.md** ("Only verified users can access wallet").
- **RolesGuard** (optional, for admin): Check `request.user.role` against route metadata (e.g. `@Roles('admin')`); return 403 if not allowed. Needed for KYC admin endpoints and task bonus. See **auth-and-user.mdc**, **api-and-controllers.mdc**.
- Ensure **ValidationPipe** is global and all DTOs use class-validator. See **repositories-and-data.mdc**.

**Rules:** auth-and-user.mdc, api-and-controllers.mdc.

**Commit:** e.g. `feat(auth): add JWT and email-verified guards, Public and CurrentUser decorators`

---

## Step 3: User and Auth – entities, repositories, register and OTP

- Create **User** entity (TypeORM, PostgreSQL): id, email, password (select: false), firstName, lastName, **role** (or roleId), tokenVersion, isActive, isActivated, isLocked, lockedUntil, loginLimit, otp, otpExpiry, otpType, createdAt, updatedAt. See **repositories-and-data.mdc**, **auth-and-user.mdc**.
- **Password hashing**: Hash password with bcrypt (or argon2) before saving user. Use a small util or injectable (e.g. PasswordService) so hashing is consistent. See **auth-and-user.mdc**, **libraries-and-deps.mdc**.
- Create **UserRepository** (findById, findByEmail, create, update). Inject Repository&lt;User&gt;. See **repositories-and-data.mdc**.
- Create **AuthModule**, **AuthService**, **UserService**: register (validate DTO, create user, **hash password**, generate OTP, store OTP on user). Do not send email yet; just persist OTP. Return a clear message (e.g. "Check email for OTP"). See **auth-and-user.mdc**.
- Add **TokenService**: sign JWT (id, email, role, tokenVersion), verify, decode. Use config for secret and expiry. See **auth-and-user.mdc**.
- Add **AuthController**: POST /auth/register (public), POST /auth/verify (public). Verify: validate email + OTP + type; clear OTP; set isActivated, isActive. See **task.md** endpoints.

**Rules:** auth-and-user.mdc, repositories-and-data.mdc.

**Commit:** e.g. `feat(auth): add User entity, register, verify OTP, TokenService`

---

## Step 4: Login and JWT protection

- Implement **Local strategy**: validate email/password (call AuthService/UserService), return user or throw Unauthorized. Implement **JWT strategy** validate(): load user by id, check tokenVersion, return user for request.user. See **auth-and-user.mdc**.
- **AuthController**: POST /auth/login (public, LocalGuard). On success: update lastLogin, call TokenService.sign(), return token and user payload. Optionally: lockout after N failed attempts (task.md, auth-and-user.mdc).
- Ensure all routes except register, verify, login are protected by JWT. Apply **@CurrentUser()** where handler needs the user. See **api-and-controllers.mdc**.
- **AuthController**: POST /auth/logout (authenticated). Invalidate token (e.g. bump user tokenVersion or clear stored token). See **auth-and-user.mdc**.

**Rules:** auth-and-user.mdc, api-and-controllers.mdc.

**Commit:** e.g. `feat(auth): add login, logout, Local and JWT strategies`

---

## Step 5: Wallet and transactions – model and fund

- **Supported currencies**: Define an allowlist (e.g. NGN, USD, EUR, GBP) in config or constants. Validate currency in all wallet DTOs against this list. See **wallet-and-trading.mdc**, **fx-rates-integration.mdc**.
- Create **WalletBalance** (or equivalent) entity: userId, currencyCode, amount, updatedAt. Unique (userId, currencyCode). See **wallet-and-trading.mdc**.
- Create **Transaction** entity: userId, type (fund | conversion | trade), amount, currency/sourceCurrency/targetCurrency, rate (optional), status (e.g. success | failed | pending), idempotencyKey (optional), createdAt. See **wallet-and-trading.mdc**.
- Create **WalletRepository** / **TransactionRepository** (or service using TypeORM repository). See **repositories-and-data.mdc**.
- **WalletService**: getBalances(userId), fund(userId, currency, amount, idempotencyKey?). Use **DB transaction**; create or update WalletBalance; insert Transaction. Idempotency: if key exists, return stored response (store in table with unique constraint or cache with TTL; document in README). See **wallet-and-trading.mdc**, **fintech-security-and-testing.mdc**.
- **WalletController**: GET /wallet (current user balances), POST /wallet/fund (body: currency, amount; header/body: idempotency key). See **task.md**, **api-and-controllers.mdc**.
- **Gate wallet by email-verified**: Apply **EmailVerifiedGuard** (Step 2) to GET /wallet and POST /wallet/fund so only activated users can access; reject with 403 if not verified. See **task.md** ("Only verified users can access wallet").
- **Initial balance**: Decide and document: create wallet balance rows (e.g. 0 for each supported currency) when user is verified, or create rows on first fund. See **wallet-and-trading.mdc** ("Initial balance").

**Rules:** wallet-and-trading.mdc, repositories-and-data.mdc, fintech-security-and-testing.mdc.

**Commit:** e.g. `feat(wallet): add WalletBalance, Transaction, fund and getBalances with idempotency`

---

## Step 6: FX rates integration

- Create **integrations/** or **FxModule** with **FxRatesService** (or client): call external FX API (e.g. exchangerate-api.com), parse response, return typed rates. Use **axios** and config (base URL, API key). Add retries and timeout. See **fx-rates-integration.mdc**, **libraries-and-deps.mdc**.
- Add **caching**: in-memory or Redis. Key e.g. fx:rates:{base}; TTL (e.g. 5 min). On cache miss, call API then set cache. See **fx-rates-integration.mdc**.
- **Fallback**: if API fails after retries, use stale cache if available; else fail request (do not commit wallet changes). Return 503 or structured error. See **fx-trading-app-context.mdc**, **fx-rates-integration.mdc**.
- **FxController**: GET /fx/rates (public or authenticated; document choice). Return current rates from cache/API. See **task.md**.

**Rules:** fx-rates-integration.mdc, fx-trading-app-context.mdc.

**Commit:** e.g. `feat(fx): add FxRatesService with external API, cache, fallback, GET /fx/rates`

---

## Step 7: Convert and trade (atomic, with KYC gate)

- **WalletService**: convert(userId, sourceCurrency, targetCurrency, amount, idempotencyKey?). Get rate from FxRatesService; in **one DB transaction**: lock balance rows (FOR UPDATE), validate sufficient balance, debit source, credit target, insert Transaction. Rollback on any failure. See **wallet-and-trading.mdc**.
- **WalletService**: trade(userId, ...) – same pattern; ensure one leg is NGN. See **task.md**, **wallet-and-trading.mdc**.
- Create **KycVerifiedGuard** (or equivalent): resolve user's KYC status; if user is **admin** (e.g. role), allow without KYC; otherwise if not KYC-verified, throw ForbiddenException. **Admin does not need KYC.** Apply to POST /wallet/convert and POST /wallet/trade. See **kyc-domain.mdc**, **wallet-and-trading.mdc**.
- **WalletController**: POST /wallet/convert, POST /wallet/trade (with DTOs and optional idempotency key). See **task.md**.

**Rules:** wallet-and-trading.mdc, kyc-domain.mdc, fintech-security-and-testing.mdc.

**Commit:** e.g. `feat(wallet): add convert and trade with KycVerifiedGuard (admin bypass)`

---

## Step 8: Transaction history

- **TransactionRepository** or **WalletService**: list by userId with pagination (page, limit), optional filter by type, date range. Order by createdAt desc. See **wallet-and-trading.mdc**, **repositories-and-data.mdc**.
- **TransactionsController** (or WalletController): GET /transactions?page=&limit=&type=. Return list + total. See **task.md**, **api-and-controllers.mdc**.

**Rules:** wallet-and-trading.mdc, repositories-and-data.mdc.

**Commit:** e.g. `feat(wallet): add GET /transactions with pagination and filters`

---

## Step 9: KYC module

- Create **Kyc** entity: userId, status (pending | verified | rejected), submittedAt, reviewedAt, rejectionReason, and optional fields (fullName, dateOfBirth, address, idType, idNumber). See **kyc-domain.mdc**.
- **KycService**, **KycRepository**: submit(data), getStatus(userId). Submit: create or update Kyc with status pending. See **kyc-domain.mdc**.
- **KycController**: POST /kyc/submit (authenticated), GET /kyc/status (authenticated). See **task.md**.
- Optional: POST /kyc/documents (file upload); store reference; document in README. See **kyc-domain.mdc**.
- **KYC admin (optional)**: If manual review: admin-only endpoint to list pending KYC and update status to verified/rejected with reason. Gate with **RolesGuard** and @Roles('admin'). Log status changes with reviewerId. See **kyc-domain.mdc**, **auth-and-user.mdc**.
- **README**: Document KYC assumptions (manual vs automated review; which ID types; data retention and handling). Do not log full KYC payloads; do not expose PII beyond status. See **kyc-domain.mdc**, **readme-and-deliverables.mdc**.
- Log KYC submit and status changes for audit. See **fintech-security-and-testing.mdc**, **email-config-and-logging.mdc**.

**Rules:** kyc-domain.mdc, fx-trading-app-context.mdc.

**Commit:** e.g. `feat(kyc): add Kyc entity, submit, status, optional admin review`

---

## Step 10: Email (OTP) and background jobs

- Add **BullMQ** (or Bull): @nestjs/bullmq, **Redis** connection (required for queue). Register queue (e.g. `email`). See **background-jobs.mdc**, **libraries-and-deps.mdc**. (FX cache in Step 6 can stay in-memory if Redis is only used for queues.)
- **EmailJobService** (or **OtpJobService**): Small service that wraps `queue.add('send-otp', payload, options)` with consistent job name and default options. AuthService injects this instead of the queue directly. See **background-jobs.mdc**.
- **EmailService** (in integrations or shared): send mail (to, subject, body or template). Use nodemailer or SendGrid; config from env. See **email-config-and-logging.mdc**.
- **SendOtpProcessor**: job handler that receives { email, otp, type } and calls EmailService. See **background-jobs.mdc**.
- In **AuthService** after generating OTP on register (and optionally resend): call **EmailJobService** to enqueue send-otp job. Do not block response on email. See **auth-and-user.mdc**, **email-config-and-logging.mdc**.

**Rules:** background-jobs.mdc, email-config-and-logging.mdc, auth-and-user.mdc.

**Commit:** e.g. `feat(auth): add BullMQ email queue, EmailJobService, SendOtpProcessor, OTP email on register`

---

## Step 11: Security and compliance

- **Rate limiting**: @nestjs/throttler. Register **ThrottlerGuard** (or use default); apply stricter limits to POST /auth/register, POST /auth/verify, POST /auth/login, POST /wallet/fund, POST /wallet/convert, POST /wallet/trade. See **task.md** section 8, **fintech-security-and-testing.mdc**, **libraries-and-deps.mdc**.
- **Audit logging**: log (userId, action, resource, outcome, timestamp) for register, verify, login, KYC submit/status, fund, convert, trade. Do not log passwords or full tokens. See **fintech-security-and-testing.mdc**, **email-config-and-logging.mdc**.
- Ensure **HTTPS** in production; document in README. See **fintech-security-and-testing.mdc**.

**Rules:** fintech-security-and-testing.mdc, email-config-and-logging.mdc, task.md.

**Commit:** e.g. `feat(security): add throttler, audit logging, HTTPS note in README`

---

## Step 12: OpenAPI (Swagger) and README

- Add **@nestjs/swagger**. Document all controllers and DTOs with @ApiTags, @ApiOperation, @ApiResponse, @ApiBody, @ApiProperty(). Expose Swagger UI at /api or /docs. See **api-and-controllers.mdc**, **fx-trading-app-context.mdc**, **readme-and-deliverables.mdc**.
- **README.md**: setup (install, env, migrations, run, test; Node version if relevant), **key assumptions** (wallet model, FX TTL/fallback, KYC review and retention, idempotency, gating: email-verified for wallet, KYC-verified or admin for trading; admin does not need KYC), link to Swagger UI, **architectural decisions** (PostgreSQL, modular structure, queue for email, cache for FX). Optional: **flow diagrams** or links for trading, wallet, or FX flow (task.md bonus). See **readme-and-deliverables.mdc**, **task.md**.
- **.env.example**: List all env vars (DB_*, JWT_*, MAIL_*, FX_*, REDIS_*, etc.) with placeholder values and short comments. See **readme-and-deliverables.mdc**, **email-config-and-logging.mdc**.
- Optional: unit tests for WalletService (balance, convert, fund), AuthService (OTP verify), FxRatesService (cache/fallback); e2e for auth, wallet, fx, transactions, KYC (e.g. supertest). See **jest-testing.mdc**, **supertest-http-testing.mdc**, **fintech-security-and-testing.mdc**, **task.md**.

**Rules:** api-and-controllers.mdc, readme-and-deliverables.mdc, fx-trading-app-context.mdc, task.md.

**Commit:** e.g. `docs: add OpenAPI Swagger, README with setup and assumptions, .env.example`

---

## Checklist (task.md endpoints)

| Method | Path | Step |
|--------|------|------|
| POST | /auth/register | 3, 10 |
| POST | /auth/verify | 3 |
| POST | /auth/login | 4 |
| GET | /wallet | 5 |
| POST | /wallet/fund | 5 |
| POST | /wallet/convert | 7 |
| POST | /wallet/trade | 7 |
| GET | /fx/rates | 6 |
| GET | /transactions | 8 |
| POST | /kyc/submit | 9 |
| GET | /kyc/status | 9 |
| (optional) | POST /kyc/documents | 9 |
| POST | /auth/logout | 4 |

All steps reference **monibase/.cursor/rules** and **monibase/task.md**.

---

## Missing or optional (not in main 12 steps)

- **POST /auth/logout**: Added in Step 4 checklist above; implement when adding login.
- **Email-verified gate for wallet**: Only activated users can use GET /wallet and POST /wallet/fund; added in Step 5.
- **Initial wallet/balance creation**: Decide on verification vs first-fund; added in Step 5.
- **Resend OTP**: Optional endpoint (e.g. POST /auth/resend-otp); enqueue same job as register; add in Step 3/10 if needed.
- **Optional POST /wallet/transfer**: task.md allows optional transfers; implement after Step 7 if required (same atomic pattern as fund).
- **.env.example**: Added in Step 12; create file with all required and optional env vars.
- **Helmet**: Added in Step 1 for security headers.
- **Migrations**: Generate and run after entities; noted in Step 1.
- **API version prefix**: Optional `/v1`; document in README and Swagger if used.
- **Task.md bonus (optional)**: Role-based access (Admin vs user); Redis for FX cache (in addition to queue); analytics (trade logs, FX trends); flow diagrams. See task.md Bonus and Evaluation.
- **Rules not yet named in steps**: supertest-http-testing.mdc (e2e); api-docs-comparison-providers.mdc (when integrating external APIs or designing response shapes).

---

## What was missing (now added to steps or listed above)

| Gap | Source | Where added |
|-----|--------|-------------|
| Password hashing (bcrypt/argon2) before save | auth-and-user.mdc | Step 3 |
| User entity `role` (for JWT and permissions) | auth-and-user.mdc | Step 3 |
| Supported currencies allowlist (NGN, USD, EUR, GBP) | wallet-and-trading.mdc, fx-rates-integration.mdc | Step 5 |
| Request ID (X-Request-Id) in middleware and logs | email-config-and-logging.mdc | Step 1 |
| Transaction status values (success, failed, pending) | task.md "status" | Step 5 |
| Idempotency key storage (table vs cache) | wallet-and-trading.mdc | Step 5 (document in README) |
| KYC admin endpoints (manual review) | kyc-domain.mdc | Step 9 (optional) |
| KYC README: retention, PII, review type | kyc-domain.mdc, task.md | Step 9, 12 |
| README: flow diagrams (task.md bonus) | task.md Deliverables | Step 12 |
| supertest-http-testing.mdc for e2e | rules | Step 12 |
| Task bonus: roles, Redis FX cache, analytics | task.md Bonus | "Missing or optional" |
| Node version in README setup | readme-and-deliverables.mdc | Step 12 |

---

## Middleware and services checklist (from rules)

| Type | Name | Step | Notes |
|------|------|------|--------|
| **Middleware** | Helmet | 1 | Security headers |
| | CORS | 1 | Configure in main.ts |
| | RequestIdMiddleware / RequestIdInterceptor | 1 | UUID per request; logs + X-Request-Id header |
| **Interceptor** | Response transform (wrap `{ data }`) | 1 | Optional |
| | Logging (method, path, status, duration; no bodies) | 1 | Optional |
| **Guard** | JwtAuthGuard | 2 | Global; skip when @Public() |
| | EmailVerifiedGuard / ActivatedUserGuard | 2, 5 | Wallet/transactions: only isActivated users |
| | KycVerifiedGuard | 7 | Convert/trade: KYC-verified or admin (admin does not need KYC) |
| | RolesGuard | 2, 9 | Optional; admin routes (e.g. KYC review) |
| | ThrottlerGuard | 11 | Rate limiting |
| **Service** | AuthService, UserService, TokenService, PasswordService (or util) | 3, 4 | Auth and user |
| | WalletService, WalletRepository, TransactionRepository | 5, 7, 8 | Wallet and transactions |
| | FxRatesService | 6 | FX API + cache |
| | KycService, KycRepository | 9 | KYC |
| | EmailService | 10 | Send mail |
| | EmailJobService / OtpJobService | 10 | Wraps queue.add for OTP job |
| | SendOtpProcessor (job processor) | 10 | Processes send-otp job |
| **Filter** | Global exception filter | 1 | Single error shape |
| **Pipe** | ValidationPipe (global) | 1 | class-validator on DTOs |
| **Optional** | Timeout interceptor (long routes) | - | api-and-controllers.mdc |
| | PermissionService + PermissionsGuard | - | auth-and-user.mdc (optional) |
| | AuditService or structured audit logger | 11 | Audit trail; can be logger only |
