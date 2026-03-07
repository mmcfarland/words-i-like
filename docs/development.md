# Development Guide

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for full-stack local development)
- Azure CLI (`az`) — for deployment only

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd words-i-like
pnpm install

# Copy environment config
cp .env.example .env.local
# Edit .env.local with your values (see "Environment Variables" below)

# Run quality gates
pnpm check:quick    # Lint + typecheck (~10s)
pnpm check:all      # Full gate including tests

# Start development
pnpm dev            # Frontend only (http://localhost:5173)
pnpm dev:api        # Backend only (http://localhost:3001)
pnpm dev:up         # Full stack via Docker (PG + API + Web)
pnpm dev:down       # Stop Docker
```

`pnpm dev:api` and `pnpm dev:up` automatically read `.env.local` when present.

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
├── scripts/              # Deployment scripts
│   └── deploy.sh         # One-command Azure deploy
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
If port `5432` is already in use on your machine, run `POSTGRES_PORT=5433 pnpm dev:up` and update `DATABASE_URL` to match that host port.

## Testing

```bash
pnpm test               # Unit tests (Vitest)
pnpm test:integration   # API integration tests (requires Postgres via docker-compose)
pnpm test:e2e           # E2E tests (Playwright — requires full stack running)
pnpm test:visual        # Visual regression (Playwright screenshots)
pnpm check:all          # Full gate: lint + typecheck + unit + integration + e2e + visual
```

### Integration Tests

API-level tests that run against a real Postgres database (`words_test`). They validate auth, sync merge, sharing, and word CRUD with real Prisma queries.

```bash
# Start Postgres (if not already running)
pnpm dev:up

# Run integration tests
pnpm test:integration
```

See `tests/integration/README.md` for architecture details.

### E2E Auth & Sync Tests

The `tests/e2e/` directory includes auth flow, sync, and share tests alongside the basic app tests. These require the full docker-compose stack (API + DB + web):

```bash
pnpm dev:up                # Start all services
pnpm test:e2e              # Run all E2E tests
```


### Visual Regression

Baseline screenshots are committed. After intentional UI changes:
```bash
cd tests/visual && pnpm exec playwright test --update-snapshots
```

### Animations in Tests

Animations are disabled during visual tests via `data-reduce-motion` attribute and `prefers-reduced-motion` media query.

## Environment Variables

Copy `.env.example` to `.env.local` and configure. Here's what each variable does:

### Required for Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (backend) | PostgreSQL connection string. Default `postgresql://words:words@localhost:5432/words` works with Docker Compose |
| `PORT` | No | API port (default: 3001) |
| `VITE_API_URL` | No | Frontend → backend URL (default: `http://localhost:3001`) |
| `POSTGRES_PORT` | No (Docker Compose) | Host port for local PostgreSQL mapping (default: `5432`) |

### Authentication (Google OAuth)

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | For sign-in | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | With client ID | Google OAuth 2.0 Client Secret |
| `JWT_SECRET` | For auth | JWT signing secret. Generate: `node -e "console.log(crypto.randomUUID())"` |

### AI Features (Azure OpenAI)

| Variable | Required | Description |
|----------|----------|-------------|
| `AZURE_OPENAI_ENDPOINT` | No | Azure OpenAI endpoint. Omit for stub mode (canned examples) |
| `AZURE_OPENAI_API_KEY` | With endpoint | Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT` | With endpoint | Model deployment name (default: `gpt-4o-mini`) |

### Deployment Only (not needed for local dev)

These are used by `scripts/deploy.sh` and loaded from `.env.local` (gitignored):

| Variable | Description |
|----------|-------------|
| `DB_ADMIN_PASSWORD` | Azure PostgreSQL admin password (auto-generated on first deploy) |
| `AZURE_RESOURCE_GROUP` | Target resource group |
| `AZURE_LOCATION` | Azure region |

## What Works Without Configuration

The frontend works fully out of the box — no credentials, no backend, no Docker needed:
- Word entry with dictionary lookup (Free Dictionary API — no key)
- Local persistence (IndexedDB via Dexie.js)
- Spell suggestions (Datamuse API — no key)
- Pronunciation audio playback
- Lists, search, feed filtering
- All offline-capable once loaded

## Setting Up Google OAuth

Required for: sign-in, cross-device sync, AI usage examples.

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a project (or select an existing one)
3. Click **Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
6. Copy the Client ID and Client Secret
7. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   JWT_SECRET=any-random-string-for-signing-tokens
   ```
8. Restart `pnpm dev:api` or `pnpm dev:up` so the API picks up the new credentials.

For local development without Google credentials, clicking **Sign in** now auto-falls back to a local dev user. You can also call the dev-login endpoint directly:
```bash
curl -X POST http://localhost:3001/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Matt"}'
```
This returns a JWT token you can use to test sync and authenticated features.

## Setting Up Azure OpenAI

Required for: AI-generated usage examples. Without it, the backend returns canned stub examples.

The deploy script (`scripts/deploy.sh`) provisions an Azure OpenAI resource with **GPT-4o-mini** automatically. For local development, you can either:

**Option A: Use the deployed Azure resource** (recommended)
```bash
# After running ./scripts/deploy.sh staging, grab the endpoint:
az cognitiveservices account show -n words-staging-oai -g words-staging --query properties.endpoint -o tsv
az cognitiveservices account keys list -n words-staging-oai -g words-staging --query key1 -o tsv

# Add to .env.local:
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```

**Option B: Skip it** — the backend returns canned stub example sentences when no endpoint is configured. The full API path (including rate limiting) is still exercised.

## Deployment

One command deploys everything to Azure:

```bash
# First deploy — creates all infrastructure + deploys app
./scripts/deploy.sh staging

# Redeploy app only (skip infra provisioning)
./scripts/deploy.sh staging --skip-infra

# Deploy to production
./scripts/deploy.sh production

# Tear down all Azure resources
./scripts/deploy.sh staging --teardown
```

After first deploy, `scripts/deploy.sh` prints the exact Google OAuth callback URI and JS origin for the deployed app; add those values to your Google OAuth client before using Google sign-in in Azure environments.

### What the Deploy Script Creates

| Resource | SKU | Purpose |
|----------|-----|---------|
| Azure Container Apps | 0.25 vCPU, scales 0→2 | Fastify API |
| Azure PostgreSQL Flexible | B1ms, 32GB | Database |
| Azure Static Web App | Free | React PWA (CDN) |
| Azure Container Registry | Basic | Docker images |
| Azure OpenAI | S0 + GPT-4o-mini | AI examples |

### Manual Operations

```bash
# View API logs
az containerapp logs show -n words-staging-api -g words-staging --follow

# Scale up (prevent cold starts)
az containerapp update -n words-staging-api -g words-staging --min-replicas 1

# Run DB migration against Azure PostgreSQL
DATABASE_URL="postgresql://wordsadmin:PASSWORD@words-staging-pg.postgres.database.azure.com:5432/words?sslmode=require" \
  pnpm db:migrate
```

### CI/CD (GitHub Actions)

Workflows in `.github/workflows/`:
- **CI** (`ci.yml`) — PRs & main: lint, typecheck, test, build, e2e
- **Deploy Staging** (`deploy-staging.yml`) — push to main → auto-deploy
- **Deploy Production** (`deploy-production.yml`) — manual trigger

Required GitHub secrets: `AZURE_CREDENTIALS`, `DB_ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`

See [deployment.md](deployment.md) for full details.

## Package Boundaries

ESLint enforces import restrictions:
- `apps/web` → `packages/shared` only
- `apps/api` → `packages/shared` + `packages/db`
- `packages/shared` → no app imports
- `packages/db` → no app imports

## Analytics (Umami)

Self-hosted [Umami](https://umami.is/) analytics runs as part of the Docker Compose stack.

### Getting Started

1. Start the stack: `pnpm dev:up`
2. Open the Umami dashboard: [http://localhost:3002](http://localhost:3002)
3. Log in with the default credentials: **admin** / **umami** (change the password on first login)
4. Add a website (e.g. `Words I Like` with URL `http://localhost:5173`)
5. Copy the **Website ID** from the website settings
6. Set it in `.env.local`:
   ```
   VITE_UMAMI_WEBSITE_ID=your-website-id-from-umami-dashboard
   ```
7. Restart the web service so the env var takes effect

When both `VITE_UMAMI_URL` and `VITE_UMAMI_WEBSITE_ID` are set, the Umami tracking script is injected automatically. If either is missing, analytics silently no-ops.
