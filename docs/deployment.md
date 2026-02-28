# Deployment Guide

## Azure Infrastructure

Infrastructure is defined as Bicep templates in `infra/`.

### Resources

- **Azure Container Apps** — Fastify API (scales to zero)
- **Azure PostgreSQL Flexible Server** — Burstable B1ms
- **Azure Static Web Apps** — React PWA (free tier, global CDN)

### Deploy Infrastructure

```bash
# Login to Azure
az login

# Create resource group
az group create -n words-staging -l eastus

# Deploy staging
az deployment group create \
  -g words-staging \
  -f infra/main.bicep \
  --parameters infra/parameters/staging.bicepparam \
  --parameters dbAdminPassword=<password>
```

### CI/CD

GitHub Actions workflows:
- **CI** (`ci.yml`) — runs on PRs and pushes to main: lint, typecheck, test, build
- **Deploy Staging** (`deploy-staging.yml`) — runs on push to main
- **Deploy Production** (`deploy-production.yml`) — manual trigger

### Required Secrets

Configure in GitHub repository settings:
- `AZURE_CREDENTIALS` — Azure service principal
- `DB_ADMIN_PASSWORD` — PostgreSQL admin password
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY`
