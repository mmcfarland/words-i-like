# Deployment Guide

## Quick Start

```bash
# First time — creates all Azure resources + deploys
./scripts/deploy.sh staging

# Update app only (skip infra provisioning)
./scripts/deploy.sh staging --skip-infra

# Deploy production
./scripts/deploy.sh production

# Tear down everything
./scripts/deploy.sh staging --teardown
```

> The script auto-generates `DB_ADMIN_PASSWORD` and `JWT_SECRET` when missing and saves them to `.env.local` for repeatable redeploys.
> For Google OAuth, the script prints the exact callback/origin values; add them in Google Cloud Console after the first deploy.

## What the Script Does

The deploy script (`scripts/deploy.sh`) handles everything in one command:

1. **Preflight** — validates az CLI, Docker, loads `.env.local`
2. **Infrastructure** — registers providers + deploys Bicep templates
3. **Container Registry** — creates/ensures ACR, logs in
4. **Build & Push** — multi-stage Docker build, pushes to ACR
5. **Migrations** — runs `prisma migrate deploy` against Azure PostgreSQL (with retries), temporarily allowlisting the deployer public IP when needed
6. **Deploy API** — updates/creates Container App with image + secrets
7. **Deploy Frontend** — builds Vite app, deploys to Static Web App
8. **Runtime URL Sync** — sets `API_URL` and `CORS_ORIGIN` from actual deployed hostnames

## Prerequisites

- **Azure CLI**: `az login` (authenticated)
- **Docker**: running locally
- **`.env.local`**:
  - required for auth-enabled deploys: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`
  - optional for AI: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`

If your network blocks public IP discovery, set `DEPLOYER_PUBLIC_IP` before deploy so the migration step can create a temporary PostgreSQL firewall rule:

```bash
DEPLOYER_PUBLIC_IP=203.0.113.10 ./scripts/deploy.sh staging
```

## Azure Infrastructure

Infrastructure is defined as Bicep templates in `infra/`.

### Resources

- **Azure Container Apps** — Fastify API (scales to zero, 0.25 vCPU / 0.5Gi)
- **Azure PostgreSQL Flexible Server** — Burstable B1ms, 32GB storage
- **Azure Static Web Apps** — React PWA (free tier, global CDN)
- **Azure Container Registry** — Basic SKU (stores API images)

### Architecture

```
┌──────────────────┐     ┌─────────────────────┐
│  Static Web App  │────▶│  Container App (API) │
│  (React PWA)     │     │  Fastify + Prisma    │
└──────────────────┘     └──────────┬────────────┘
                                    │
                         ┌──────────▼────────────┐
                         │  PostgreSQL Flexible   │
                         │  Server                │
                         └────────────────────────┘
```

### CI/CD

GitHub Actions workflows:
- **CI** (`ci.yml`) — runs on PRs and pushes to main: lint, typecheck, test, build
- **Deploy Staging** (`deploy-staging.yml`) — runs on push to main
- **Deploy Production** (`deploy-production.yml`) — manual trigger

### Required Secrets (GitHub Actions)

Configure in GitHub repository settings → Secrets and variables → Actions:
- `AZURE_CREDENTIALS` — Azure service principal JSON
- `DB_ADMIN_PASSWORD` — PostgreSQL admin password
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth (optional)
- `JWT_SECRET` — Token signing key
- `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY` — AI features (optional)

### Manual Operations

```bash
# View API logs
az containerapp logs show -n words-staging-api -g words-staging --follow

# Scale up (prevent cold starts)
az containerapp update -n words-staging-api -g words-staging --min-replicas 1

# Check resource costs
az cost management query ...
```
