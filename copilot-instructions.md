# Words I Like — Agent Project Map

## Architecture

Monorepo powered by **Turborepo + pnpm workspaces**. TypeScript strict mode everywhere.

### Package Structure

| Package | Path | Purpose | May Import |
|---------|------|---------|------------|
| `@words/web` | `apps/web/` | React 19 PWA (Vite) | `@words/shared` |
| `@words/api` | `apps/api/` | Fastify backend (Node.js) | `@words/shared`, `@words/db` |
| `@words/shared` | `packages/shared/` | Shared types, constants, Zod schemas | _(none — leaf package)_ |
| `@words/db` | `packages/db/` | Prisma schema, migrations, client | `@words/shared` |
| `@words/eslint-config` | `packages/eslint-config/` | Shared ESLint flat config | _(tooling only)_ |

**Import boundaries are mechanically enforced by ESLint** — forbidden imports cause lint failures.

### External Services

- **Free Dictionary API** — client-direct from web app, no key needed
- **Azure OpenAI Service** — proxied through API backend (stub mode when endpoint not configured)
- **Google OAuth** — via backend auth routes
- **PostgreSQL 18** — via Prisma ORM

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
pnpm dev             # Vite dev server (frontend only)
pnpm dev:api         # Fastify dev server (backend only)
pnpm dev:up          # Docker Compose: PG 18 + API + web (full stack)
pnpm dev:down        # Stop Docker Compose
pnpm db:migrate      # Run Prisma migrations
pnpm db:generate     # Generate Prisma client
pnpm db:seed         # Seed database
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

### Testing
- Unit tests: Vitest, co-located with source files
- E2E tests: Playwright, in `tests/e2e/`
- Visual regression: Playwright screenshots, in `tests/visual/`
- Animations disabled during visual tests (use `data-reduce-motion` flag)

## Database

- PostgreSQL 18 via Docker (dev) / Azure Flexible Server (prod)
- Prisma ORM — schema at `packages/db/prisma/schema.prisma`
- JSONB columns for semi-structured data (definitions, examples)
- Docker volume mounts at `/var/lib/postgresql` (PG 18 change from older versions)

## Environment Variables

See `.env.example` for the complete list. Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `AZURE_OPENAI_ENDPOINT` — omit for stub mode
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for OAuth
- `JWT_SECRET` — for session tokens
- `PORT` — API server port (default 3001)
- `VITE_API_URL` — frontend → backend URL
