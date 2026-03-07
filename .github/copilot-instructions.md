# Copilot Instructions — Words App

## Project Overview

Monorepo (pnpm workspaces + turborepo) for a vocabulary-building PWA.

| Package | Tech | Purpose |
|---------|------|---------|
| `apps/web` | React 19 + Vite | PWA frontend with IndexedDB-first storage |
| `apps/api` | Fastify + TypeScript | REST API with JWT auth |
| `packages/db` | Prisma + PostgreSQL | Database schema, migrations, seed |
| `packages/shared` | TypeScript | Shared types, Zod schemas, constants |

**Architecture:** Local-first — words and lists are stored in IndexedDB, synced to server via `POST /api/sync` when authenticated. The web app works offline.

**Auth:** Google OAuth → JWT tokens. In development, use the `POST /api/auth/dev-login` endpoint (no Google credentials needed).

## Running Tests

### Unit Tests (no external dependencies)

```bash
pnpm test                                    # All unit tests via turbo
pnpm --filter @words/web test -- --run       # Web unit tests only
pnpm --filter @words/api test -- --run       # API unit tests only
```

### Integration Tests (requires Postgres via docker-compose)

```bash
pnpm dev:up                                  # Start docker services
pnpm test:integration                        # API integration tests against real DB
```

Integration tests automatically create and drop a `words_test` database — they never touch the dev database. The default Postgres port is `5433` (override with `POSTGRES_PORT` env var).

### E2E Tests (requires full stack running)

```bash
pnpm dev:up                                  # Start all services (db + api + web)
pnpm test:e2e                                # Playwright browser tests
```

### Full Validation Gate

```bash
pnpm check:all    # lint + typecheck + unit + integration + e2e + visual
```

### Before Every Commit

Always run at minimum:

```bash
pnpm --filter @words/web test -- --run && pnpm --filter @words/api test -- --run
```

Also run based on what changed:

- **API routes or DB changes →** `pnpm test:integration`
- **UI components →** `pnpm test:e2e` (requires `pnpm dev:up` first)

## Writing Tests

### Unit Tests (Vitest)

Colocate with source: `WordCard.test.tsx` next to `WordCard.tsx`.

```typescript
// apps/web example
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// apps/api example — use buildApp() + app.inject()
import { buildApp } from './server.js'
const app = await buildApp()
const res = await app.inject({ method: 'GET', url: '/health' })
```

### Integration Tests

Located in `tests/integration/src/*.integration.ts`. Use helpers from `tests/integration/src/helpers.ts`:

```typescript
import { createTestApp, createTestUser, authHeaders, resetDb } from './helpers.js'

let app: FastifyInstance
let token: string

beforeAll(async () => { app = await createTestApp() })
beforeEach(async () => {
  await resetDb()
  const user = await createTestUser(app)
  token = user.token
})

it('should require auth', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/words' })
  expect(res.statusCode).toBe(401)
})

it('should return words for authenticated user', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/api/words',
    headers: authHeaders(token),
  })
  expect(res.statusCode).toBe(200)
})
```

### E2E Tests (Playwright)

Located in `tests/e2e/*.spec.ts`. Use `page.request` for API calls, test real browser behavior.

### Key Testing Rules

- **All API routes require auth** — the `app.authenticate` preHandler rejects requests without a valid JWT. Always use `authHeaders(token)` in tests.
- **Never hardcode user IDs** — routes use `request.user.userId` from the JWT payload.
- **Integration tests are isolated** — `resetDb()` truncates all tables between tests.

## Code Conventions

### Imports

API uses `.js` extensions for ESM compatibility:

```typescript
// ✅ Correct
import authPlugin from './plugins/auth.js'
import { wordRoutes } from './routes/words.js'

// ❌ Wrong — will fail at runtime
import authPlugin from './plugins/auth'
```

### Styling

CSS Modules only — no global CSS. Files are `*.module.css` and use CSS custom properties (`--space-*`, `--color-*`, `--font-*`, `--radius-*`).

### Schema & Types

- Prisma schema: `packages/db/prisma/schema.prisma`
- Shared types and Zod schemas: `packages/shared/src/` (re-exported from `packages/shared/src/index.ts`)
- Import shared types: `import { CreateWordSchema, type Word } from '@words/shared'`

### API Route Pattern

```typescript
// All routes get auth via preHandler
app.get('/api/words', { preHandler: [app.authenticate] }, async (request) => {
  const userId = request.user.userId  // From JWT — never hardcode
  return prisma.word.findMany({ where: { userId } })
})
```

## Environment Setup

1. Copy `.env.example` → `.env.local` for local OAuth/API keys
2. Docker Postgres runs on port 5433 locally (configurable via `POSTGRES_PORT` in `.env.local`)
3. `pnpm dev:up` starts all services (db + api + web); `pnpm dev:down` stops them
4. `pnpm db:migrate` runs Prisma migrations; `pnpm db:generate` regenerates the client

## Common Pitfalls

| Problem | Fix |
|---------|-----|
| Web changes not reflected in docker | `docker compose -f docker/docker-compose.yml restart web` |
| Integration tests fail to connect | Ensure `pnpm dev:up` is running and Postgres is healthy |
| Port 5432 conflict with system Postgres | Use `POSTGRES_PORT=5433` (default in `.env.local`) |
| `Cannot find module './foo'` in API | Add `.js` extension to the import |
| E2E tests fail immediately | Ensure full stack is running via `pnpm dev:up` |
| Prisma client out of date | Run `pnpm db:generate` after schema changes |
| Type errors after changing shared package | Run `pnpm build --filter @words/shared` to rebuild |
