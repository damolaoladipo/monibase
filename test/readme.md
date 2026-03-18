# Monibase test suite

Jest-based unit and e2e tests aligned with [task.md](../monibase/task.md) and the improvement plan.

## Layout

- `test/setup.ts` – Env vars and Bull mock (no Redis in tests).
- `test/unit/` – Unit tests (mocked deps): auth.service, wallet.service, fx-rates.service, token.service.
- `test/e2e/` – HTTP e2e (real DB): auth (register, verify, login, logout), wallet (fund, idempotency).
- `test/mocks/` – Email, Bull, FX mocks.
- `test/factories/` – User, wallet, KYC data builders.
- `test/utils/test-helpers.ts` – expectSuccessResponse, expectErrorResponse, generateTestData.

## Prerequisites

- Unit tests: none (mocks only).
- E2E tests: PostgreSQL test database. Create `monibase_test` and set `DB_DATABASE=monibase_test` (or rely on default in setup.ts). No Redis required (Bull is mocked).

## Commands

```bash
npm run test          # All tests
npm run test:unit    # Unit only
npm run test:e2e     # E2E only (requires DB)
npm run test:ci      # CI with coverage
```

## Env in tests

`test/setup.ts` sets `NODE_ENV=test` and required env (JWT_SECRET, DB_*, MAIL_*, FX_*, etc.). Override with env vars when running (e.g. `DB_DATABASE=my_test npm run test:e2e`).
