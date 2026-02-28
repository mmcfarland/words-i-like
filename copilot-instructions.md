# Words I Like — Agent Project Map

> Complete project — all 12 phases implemented. This document is the authoritative reference for AI agents working on this codebase.

## Architecture

Monorepo powered by **Turborepo + pnpm workspaces**. TypeScript strict mode everywhere.

### Package Structure

| Package | Path | Purpose | May Import |
|---------|------|---------|------------|
| `@words/web` | `apps/web/` | React 19 PWA (Vite, Framer Motion, Dexie.js) | `@words/shared` |
| `@words/api` | `apps/api/` | Fastify 5 backend (Node.js) | `@words/shared`, `@words/db` |
| `@words/shared` | `packages/shared/` | Shared types, constants, Zod schemas | _(none — leaf package)_ |
| `@words/db` | `packages/db/` | Prisma 7 schema, migrations, client | `@words/shared` |
| `@words/eslint-config` | `packages/eslint-config/` | Shared ESLint flat config (@antfu) | _(tooling only)_ |
| `@words/e2e` | `tests/e2e/` | Playwright E2E tests | — |
| `@words/visual` | `tests/visual/` | Playwright visual regression tests | — |

**Import boundaries are mechanically enforced by ESLint** — forbidden imports cause lint failures.

### External Services

- **Free Dictionary API** — client-direct from web app, no key needed
- **Azure OpenAI Service** — proxied through API backend (stub mode when endpoint not configured)
- **Google OAuth** — via backend auth routes
- **PostgreSQL 18** — via Prisma ORM

### Key Features

- **Word capture** — instant add with automatic definition lookup
- **Offline-first** — IndexedDB (Dexie.js) with background sync when signed in
- **Lists** — organize words into named lists, default list always present
- **Search** — full-text search across words and definitions
- **AI examples** — Azure OpenAI usage example generation (stub fallback)
- **Sharing** — public read-only links for word lists
- **Animations** — Framer Motion transitions, disabled via `data-reduce-motion` in tests

## Quality Gates

```bash
pnpm check:quick     # Lint + typecheck (~10s) — run after every change
pnpm check:all       # Full gate: lint → typecheck → test → e2e → visual
pnpm lint            # ESLint check only
pnpm lint:fix        # ESLint auto-fix
pnpm typecheck       # tsc --noEmit (all packages)
pnpm test            # Vitest unit tests
pnpm test:e2e        # Playwright functional E2E
pnpm test:visual     # Playwright visual regression
pnpm build           # Production build (all packages)
```

**Always run `pnpm check:quick` after making changes.** Run `pnpm check:all` before completing a phase.

## Development

```bash
pnpm dev             # Vite dev server (frontend only, http://localhost:5173)
pnpm dev:api         # Fastify dev server (backend only, http://localhost:3001)
pnpm dev:up          # Docker Compose: PG 18 + API + web (full stack)
pnpm dev:down        # Stop Docker Compose
pnpm db:migrate      # Run Prisma migrations
pnpm db:generate     # Generate Prisma client
pnpm db:seed         # Seed database with sample data
pnpm db:reset        # Reset database + reseed
```

## Coding Conventions

### TypeScript
- `strict: true` — no exceptions
- No `any` — use `unknown` and narrow, or define proper types
- Shared types go in `packages/shared/src/types/`
- Zod schemas for runtime validation (shared between frontend and backend)

### React (apps/web)
- Small components — one component per file
- Named exports (not default exports)
- Components in `src/components/{Feature}/{Component}.tsx`
- Hooks in `src/hooks/use{Name}.ts`
- Services in `src/services/{name}.ts`
- Co-located unit tests: `{Component}.test.tsx`
- Framer Motion for animations (`AnimatePresence`, `motion` components)
- Dexie.js for IndexedDB persistence (offline-first)

### Fastify (apps/api)
- Route handlers are thin — business logic in services
- Routes in `src/routes/{resource}.ts`
- Services in `src/services/{name}.ts`
- Plugins in `src/plugins/{name}.ts`
- Co-located unit tests: `{name}.test.ts`

### CSS & Styling
- No hard borders anywhere — dreamy, soft aesthetic
- CSS custom properties for design tokens (colors, typography, spacing)
- Tinted shadows (soft purple-gray, never pure black)
- Fraunces (serif) for words, Inter/DM Sans for UI text
- Mobile-first responsive design

### Testing
- Unit tests: Vitest, co-located with source files
- E2E tests: Playwright, in `tests/e2e/`
- Visual regression: Playwright screenshots, in `tests/visual/`
- Animations disabled during visual tests (use `data-reduce-motion` attribute + `prefers-reduced-motion` media query)

## Database

- PostgreSQL 18 via Docker (dev) / Azure Flexible Server (prod)
- Prisma ORM — schema at `packages/db/prisma/schema.prisma`
- JSONB columns for semi-structured data (definitions, examples)
- Docker volume mounts at `/var/lib/postgresql` (PG 18 convention)

## Infrastructure & Deployment

- **Azure Container Apps** — Fastify API (scales to zero)
- **Azure PostgreSQL Flexible Server** — Burstable B1ms
- **Azure Static Web Apps** — React PWA (free tier, global CDN)
- **Bicep templates** in `infra/` with staging/production parameter files
- **GitHub Actions CI/CD** — `ci.yml`, `deploy-staging.yml`, `deploy-production.yml`

## Environment Variables

See `.env.example` for the complete list. Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `AZURE_OPENAI_ENDPOINT` — omit for stub mode
- `AZURE_OPENAI_API_KEY` — required when endpoint is set
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for OAuth
- `JWT_SECRET` — for session tokens
- `PORT` — API server port (default 3001)
- `VITE_API_URL` — frontend → backend URL

## Documentation

- [Development Guide](docs/development.md) — setup, testing, project structure
- [Deployment Guide](docs/deployment.md) — Azure infrastructure, CI/CD
