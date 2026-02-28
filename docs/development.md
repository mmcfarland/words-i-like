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
7. Add to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   JWT_SECRET=any-random-string-for-signing-tokens
   ```

For local development without Google credentials, use the dev-login endpoint:
```bash
curl -X POST http://localhost:3001/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Matt"}'
```
This returns a JWT token you can use to test sync and authenticated features.

## Setting Up Azure OpenAI (Optional)

Required for: AI-generated usage examples. Without it, the backend returns canned stub examples.

1. Create an [Azure OpenAI Service](https://portal.azure.com/#create/Microsoft.CognitiveServicesOpenAI) resource
2. Deploy a model (e.g., `gpt-4o`)
3. Add to `.env`:
   ```
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-key
   AZURE_OPENAI_DEPLOYMENT=gpt-4o
   ```

When `AZURE_OPENAI_ENDPOINT` is not set, the backend automatically returns canned example sentences — the full API path (including rate limiting) is still exercised.

## Deployment

See [deployment.md](deployment.md) for Azure infrastructure setup and CI/CD configuration.

**Summary of what's needed to deploy:**
1. Azure subscription + resource group
2. Service principal for GitHub Actions (`AZURE_CREDENTIALS` secret)
3. Run Bicep templates: `az deployment group create -g words-staging -f infra/main.bicep --parameters infra/parameters/staging.bicepparam`
4. GitHub repository secrets: `AZURE_CREDENTIALS`, `DB_ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`
5. Push to `main` → CI runs → staging deploys automatically

The deploy workflows in `.github/workflows/` have placeholder deploy steps that need to be wired to your Azure resources.

## Package Boundaries

ESLint enforces import restrictions:
- `apps/web` → `packages/shared` only
- `apps/api` → `packages/shared` + `packages/db`
- `packages/shared` → no app imports
- `packages/db` → no app imports
