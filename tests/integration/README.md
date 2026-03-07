# Integration Tests

API integration tests that validate auth, AI examples, sync, share, and word CRUD against a **real Postgres database**.

## Prerequisites

- Docker Postgres running: `pnpm dev:up` (or at minimum the `db` service)
- Default port: `5433` (override with `POSTGRES_PORT`)

## Running

```bash
# From repo root
pnpm test:integration

# With custom port
POSTGRES_PORT=5432 pnpm test:integration

# Watch mode
pnpm --filter @words/integration test:watch
```

## How It Works

1. **`globalSetup.ts`** creates a `words_test` database, pushes the Prisma schema, and drops it after all tests
2. **`testSetup.ts`** sets `DATABASE_URL` and env defaults for each test process
3. **`helpers.ts`** provides `createTestApp()`, `createTestUser()`, `authHeaders()`, `resetDb()`
4. Each test file creates an isolated Fastify app via `buildApp()` and uses `.inject()` for HTTP-level testing
5. `resetDb()` truncates all tables between tests for isolation

## Test Suites

| File | What it validates |
|------|-------------------|
| `auth.integration.ts` | Dev-login, JWT verification, `/auth/me`, OAuth redirect construction, callback error paths |
| `ai.integration.ts` | AI examples success, provider failure fallback, usage/rate-limit behavior |
| `sync.integration.ts` | Push new words, merge conflicts (status & definition richness), pull with timestamps, multi-user isolation |
| `share.integration.ts` | Create share snapshots, retrieve by token, 404 for invalid, idempotent sharing |
| `words.integration.ts` | CRUD operations, user isolation, unique constraint on `text+userId` |

## Adding Tests

- Name files `*.integration.ts`
- Use `createTestApp()` for an isolated Fastify instance
- Call `resetDb()` in `beforeEach` for clean state
- Use `createTestUser(app)` for authenticated test scenarios
