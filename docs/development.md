# Development Guide

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for full-stack local development)

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd words-i-like
pnpm install

# Run quality gates
pnpm check:quick    # Lint + typecheck (~10s)
pnpm check:all      # Full gate including tests

# Start development
pnpm dev            # Frontend only (http://localhost:5173)
pnpm dev:api        # Backend only (http://localhost:3001)
pnpm dev:up         # Full stack via Docker (PG + API + Web)
pnpm dev:down       # Stop Docker
```

## Project Structure

```
words-i-like/
├── apps/
│   ├── web/              # React 19 PWA (Vite)
│   └── api/              # Fastify backend
├── packages/
│   ├── shared/           # Shared types & Zod schemas
│   ├── db/               # Prisma schema & client
│   └── eslint-config/    # Shared ESLint config
├── tests/
│   ├── e2e/              # Playwright E2E tests
│   └── visual/           # Playwright visual regression
├── docker/               # Docker Compose & Dockerfiles
├── infra/                # Azure Bicep templates
└── .github/workflows/    # CI/CD pipelines
```

## Database

```bash
pnpm db:migrate    # Run Prisma migrations
pnpm db:generate   # Generate Prisma client
pnpm db:seed       # Seed with sample data
pnpm db:reset      # Reset and reseed
```

PostgreSQL 18 runs in Docker. The volume mounts at `/var/lib/postgresql` (PG 18 convention).

## Testing

```bash
pnpm test          # Unit tests (Vitest)
pnpm test:e2e      # E2E tests (Playwright)
pnpm test:visual   # Visual regression (Playwright screenshots)
```

### Visual Regression

Baseline screenshots are committed. After intentional UI changes:
```bash
cd tests/visual && pnpm exec playwright test --update-snapshots
```

### Animations in Tests

Animations are disabled during visual tests via `data-reduce-motion` attribute and `prefers-reduced-motion` media query.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | For backend | PostgreSQL connection string |
| AZURE_OPENAI_ENDPOINT | No | Omit for stub mode |
| AZURE_OPENAI_API_KEY | With endpoint | Azure OpenAI key |
| GOOGLE_CLIENT_ID | For auth | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | For auth | Google OAuth secret |
| JWT_SECRET | For auth | JWT signing secret |
| PORT | No | API port (default: 3001) |
| VITE_API_URL | No | Frontend → backend URL |

## Package Boundaries

ESLint enforces import restrictions:
- `apps/web` → `packages/shared` only
- `apps/api` → `packages/shared` + `packages/db`
- `packages/shared` → no app imports
- `packages/db` → no app imports
