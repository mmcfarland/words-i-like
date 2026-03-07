#!/usr/bin/env bash
#
# Words I Like — Azure Deployment Script
#
# Single command to go from zero → running in Azure.
# Handles: resource creation (Bicep), container build, DB migration, deploy.
#
# Usage:
#   ./scripts/deploy.sh staging          # First deploy creates everything
#   ./scripts/deploy.sh staging          # Subsequent runs update the app
#   ./scripts/deploy.sh production       # Deploy to production
#   ./scripts/deploy.sh staging --skip-infra   # Skip infra, just redeploy app
#   ./scripts/deploy.sh staging --teardown     # Destroy all resources
#
# Prerequisites:
#   - Azure CLI: az login (already authenticated)
#   - Docker: running locally
#   - .env.local: contains local/deploy secrets (GOOGLE_*, JWT_SECRET, optional AZURE_OPENAI_*)
#
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV="${1:-staging}"
FLAG="${2:-}"

# Azure defaults
LOCATION="eastus2"
RG="words-${ENV}"
ACR_NAME="wordsacr${ENV}"
APP_NAME="words-${ENV}-api"
SWA_NAME="words-${ENV}-web"
PG_SERVER="words-${ENV}-pg"

# Derived
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
IMAGE="${ACR_LOGIN_SERVER}/words-api"
TAG="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'latest')"
PG_HOST="${PG_SERVER}.postgres.database.azure.com"

TEMP_FIREWALL_RULE=""
cleanup_temp_firewall_rule() {
  if [[ -z "${TEMP_FIREWALL_RULE:-}" ]]; then
    return
  fi
  az postgres flexible-server firewall-rule delete \
    --resource-group "$RG" \
    --name "$PG_SERVER" \
    --rule-name "$TEMP_FIREWALL_RULE" \
    --yes \
    --output none 2>/dev/null || warn "Could not remove temporary firewall rule ${TEMP_FIREWALL_RULE}"
  TEMP_FIREWALL_RULE=""
}
trap cleanup_temp_firewall_rule EXIT

# ─── Helpers ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

step()  { echo -e "\n${CYAN}━━━ ${BOLD}$1${NC}"; }
ok()    { echo -e "  ${GREEN}✔${NC} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "  ${RED}✘${NC} $1"; exit 1; }
info()  { echo -e "  $1"; }

require_cmd() {
  command -v "$1" &>/dev/null || fail "$1 is required but not installed"
}

# ─── Preflight ────────────────────────────────────────────────
step "Preflight checks"
require_cmd az
require_cmd docker
require_cmd pnpm

az account show &>/dev/null || fail "Not logged in. Run: az login"
ok "Azure CLI authenticated as $(az account show --query user.name -o tsv)"
az config set extension.use_dynamic_install=yes_without_prompt >/dev/null 2>&1 || true

SUBSCRIPTION="$(az account show --query id -o tsv)"
ok "Subscription: $(az account show --query name -o tsv) ($SUBSCRIPTION)"

# Load secrets — .env.local is canonical; .env is legacy fallback.
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
  set -a; source "$PROJECT_ROOT/.env.local"; set +a
  ok "Loaded .env.local"
elif [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a; source "$PROJECT_ROOT/.env"; set +a
  warn "Loaded legacy .env (prefer .env.local)"
else
  warn "No .env.local or .env found — some features may not work"
fi

info "Environment: ${BOLD}${ENV}${NC}"
info "Resource group: ${BOLD}${RG}${NC}"
info "Image: ${BOLD}${IMAGE}:${TAG}${NC}"

# ─── Teardown ─────────────────────────────────────────────────
if [[ "$FLAG" == "--teardown" ]]; then
  step "Tearing down ${ENV} environment"
  echo -e "  ${RED}This will delete ALL resources in ${RG}${NC}"
  read -rp "  Type '${ENV}' to confirm: " confirm
  if [[ "$confirm" != "$ENV" ]]; then
    fail "Aborted"
  fi
  az group delete --name "$RG" --yes --no-wait
  ok "Resource group ${RG} deletion initiated"
  exit 0
fi

# ─── 1. Infrastructure (Bicep) ────────────────────────────────
if [[ "$FLAG" != "--skip-infra" ]]; then
  step "1/6  Provisioning infrastructure (Bicep)"

  # Ensure resource group
  if az group show --name "$RG" &>/dev/null; then
    ok "Resource group ${RG} exists"
  else
    az group create --name "$RG" --location "$LOCATION" --output none
    ok "Created resource group ${RG}"
  fi

  # Generate a DB password if not set
  if [[ -z "${DB_ADMIN_PASSWORD:-}" ]]; then
    DB_ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)"
    warn "Generated DB password (save this!): ${DB_ADMIN_PASSWORD}"
    echo "DB_ADMIN_PASSWORD=${DB_ADMIN_PASSWORD}" >> "$PROJECT_ROOT/.env.local"
    ok "Appended DB_ADMIN_PASSWORD to .env.local"
  fi

  # Generate a JWT secret if not set
  if [[ -z "${JWT_SECRET:-}" ]]; then
    JWT_SECRET="$(openssl rand -hex 32)"
    warn "Generated JWT secret"
    echo "JWT_SECRET=${JWT_SECRET}" >> "$PROJECT_ROOT/.env.local"
    ok "Appended JWT_SECRET to .env.local"
  fi

  # Register required providers (idempotent)
  for ns in Microsoft.App Microsoft.DBforPostgreSQL Microsoft.Web Microsoft.ContainerRegistry Microsoft.CognitiveServices; do
    state="$(az provider show --namespace "$ns" --query registrationState -o tsv 2>/dev/null || echo "NotRegistered")"
    if [[ "$state" != "Registered" ]]; then
      info "Registering provider ${ns}..."
      az provider register --namespace "$ns" --wait --output none
    fi
  done
  ok "Resource providers registered"

  # Deploy Bicep
  info "Deploying Bicep templates (this takes 3-5 minutes)..."
  DEPLOY_OUTPUT=$(az deployment group create \
    --resource-group "$RG" \
    --template-file "$PROJECT_ROOT/infra/main.bicep" \
    --parameters environment="$ENV" \
    --parameters location="$LOCATION" \
    --parameters dbAdminPassword="$DB_ADMIN_PASSWORD" \
    --parameters jwtSecret="${JWT_SECRET}" \
    --parameters googleClientId="${GOOGLE_CLIENT_ID:-}" \
    --parameters googleClientSecret="${GOOGLE_CLIENT_SECRET:-}" \
    --query "properties.outputs" \
    --output json 2>&1) || {
    echo "$DEPLOY_OUTPUT"
    fail "Bicep deployment failed"
  }

  ok "Infrastructure deployed"
else
  step "1/6  Skipping infrastructure (--skip-infra)"
  ok "Using existing resources in ${RG}"
fi

# ─── 2. Container Registry ───────────────────────────────────
step "2/6  Container Registry"

if az acr show --name "$ACR_NAME" --resource-group "$RG" &>/dev/null 2>&1; then
  ok "ACR ${ACR_NAME} exists"
else
  info "Creating ACR ${ACR_NAME}..."
  az acr create \
    --resource-group "$RG" \
    --name "$ACR_NAME" \
    --sku Basic \
    --admin-enabled true \
    --output none
  ok "Created ACR ${ACR_NAME}"
fi

az acr login --name "$ACR_NAME" --output none 2>/dev/null || true
ok "Logged into ACR"

# ─── 3. Build & Push ─────────────────────────────────────────
step "3/6  Building production container"

# Create a production Dockerfile if using the dev one
PROD_DOCKERFILE="$PROJECT_ROOT/docker/Dockerfile.api.prod"
if [[ ! -f "$PROD_DOCKERFILE" ]]; then
  warn "No production Dockerfile found — creating one"
  cat > "$PROD_DOCKERFILE" << 'DOCKERFILE'
# ── Stage 1: Install ──
FROM node:22-slim AS deps
RUN corepack enable && corepack prepare pnpm@10.6.2 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: Build ──
FROM deps AS build
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm --filter @words/db exec prisma generate
RUN pnpm --filter @words/api build

# ── Stage 3: Run ──
FROM node:22-slim AS runtime
RUN corepack enable && corepack prepare pnpm@10.6.2 --activate
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/turbo.json ./
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/dist/ ./apps/api/dist/
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/ ./packages/shared/
COPY --from=build /app/packages/db/package.json ./packages/db/
COPY --from=build /app/packages/db/ ./packages/db/
COPY --from=build /app/packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
RUN pnpm --filter @words/db exec prisma generate

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>{if(!r.ok)throw r.status}).catch(()=>process.exit(1))"

CMD ["node", "apps/api/dist/server.js"]
DOCKERFILE
  ok "Created ${PROD_DOCKERFILE}"
fi

info "Building image ${IMAGE}:${TAG}..."
docker build \
  -t "${IMAGE}:${TAG}" \
  -t "${IMAGE}:latest" \
  -f "$PROD_DOCKERFILE" \
  "$PROJECT_ROOT"
ok "Image built"

info "Pushing to ACR..."
docker push "${IMAGE}:${TAG}"
docker push "${IMAGE}:latest"
ok "Image pushed"

# Build the database URL from cloud config first, fallback to provided DATABASE_URL
if [[ -n "${DB_ADMIN_PASSWORD:-}" ]]; then
  PROD_DATABASE_URL="postgresql://wordsadmin:${DB_ADMIN_PASSWORD}@${PG_HOST}:5432/words?sslmode=require"
elif [[ -n "${DATABASE_URL:-}" ]]; then
  PROD_DATABASE_URL="${DATABASE_URL}"
  warn "Using DATABASE_URL from environment (ensure this points at Azure for deploy)"
else
  fail "No database credentials found. Set DB_ADMIN_PASSWORD or DATABASE_URL."
fi

# ─── 4. Apply Database Migrations ────────────────────────────
step "4/6  Applying database migrations"

# Ensure deployer IP can reach PostgreSQL (for local/CI migrations).
if az postgres flexible-server show --resource-group "$RG" --name "$PG_SERVER" --query id -o tsv >/dev/null 2>&1; then
  CLIENT_PUBLIC_IP="${DEPLOYER_PUBLIC_IP:-}"
  if [[ -z "$CLIENT_PUBLIC_IP" ]] && command -v curl >/dev/null 2>&1; then
    CLIENT_PUBLIC_IP="$(curl -fsS https://api.ipify.org 2>/dev/null || true)"
  fi

  if [[ -n "$CLIENT_PUBLIC_IP" ]]; then
    TEMP_FIREWALL_RULE="deployer-$(date +%s)"
    if az postgres flexible-server firewall-rule create \
      --resource-group "$RG" \
      --name "$PG_SERVER" \
      --rule-name "$TEMP_FIREWALL_RULE" \
      --start-ip-address "$CLIENT_PUBLIC_IP" \
      --end-ip-address "$CLIENT_PUBLIC_IP" \
      --output none >/dev/null 2>&1; then
      ok "Temporarily allowlisted deployer IP ${CLIENT_PUBLIC_IP} for migrations"
    else
      TEMP_FIREWALL_RULE=""
      warn "Could not add temporary PostgreSQL firewall rule (set DEPLOYER_PUBLIC_IP if needed)"
    fi
  else
    warn "Could not determine deployer public IP; migrations may fail if firewall blocks this host"
  fi
fi

MIGRATION_OK=0
MIGRATION_OUTPUT=""
for attempt in {1..12}; do
  if MIGRATION_OUTPUT=$(cd "$PROJECT_ROOT" && DATABASE_URL="$PROD_DATABASE_URL" pnpm --filter @words/db exec prisma db push --accept-data-loss 2>&1); then
    MIGRATION_OK=1
    break
  fi
  info "Migration attempt ${attempt}/12 failed; retrying in 10s..."
  sleep 10
done

if [[ "$MIGRATION_OK" -ne 1 ]]; then
  echo "$MIGRATION_OUTPUT"
  fail "Database migrations failed"
fi
ok "Database migrations applied"
cleanup_temp_firewall_rule

# ─── 5. Deploy Container App ─────────────────────────────────
step "5/6  Deploying to Container App"

# Get the managed environment name
CA_ENV="words-${ENV}-env"

# Prefer explicit env values; otherwise resolve from provisioned Azure OpenAI resource.
OPENAI_ACCOUNT_NAME="words-${ENV}-oai"
DEPLOY_OPENAI_ENDPOINT="${AZURE_OPENAI_ENDPOINT:-$(az cognitiveservices account show --name "$OPENAI_ACCOUNT_NAME" --resource-group "$RG" --query properties.endpoint -o tsv 2>/dev/null || true)}"
DEPLOY_OPENAI_KEY="${AZURE_OPENAI_API_KEY:-$(az cognitiveservices account keys list --name "$OPENAI_ACCOUNT_NAME" --resource-group "$RG" --query key1 -o tsv 2>/dev/null || true)}"
DEPLOY_OPENAI_DEPLOYMENT="${AZURE_OPENAI_DEPLOYMENT:-gpt-4o-mini}"

# Construct app secrets (pass as discrete args, not comma-joined string)
CONTAINERAPP_SECRETS=(
  "database-url=${PROD_DATABASE_URL}"
  "azure-openai-key=${DEPLOY_OPENAI_KEY:-not-configured}"
  "jwt-secret=${JWT_SECRET:-$(openssl rand -hex 32)}"
  "google-secret=${GOOGLE_CLIENT_SECRET:-not-configured}"
)

# Update the container app image
info "Updating container app ${APP_NAME}..."

# Get ACR credentials for the container app
ACR_USER=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
ACR_PASS=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RG" \
  --image "${IMAGE}:${TAG}" \
  --set-env-vars \
    "PORT=3001" \
    "NODE_ENV=production" \
    "DATABASE_URL=secretref:database-url" \
    "AZURE_OPENAI_ENDPOINT=${DEPLOY_OPENAI_ENDPOINT:-}" \
    "AZURE_OPENAI_API_KEY=secretref:azure-openai-key" \
    "AZURE_OPENAI_DEPLOYMENT=${DEPLOY_OPENAI_DEPLOYMENT}" \
    "JWT_SECRET=secretref:jwt-secret" \
    "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}" \
    "GOOGLE_CLIENT_SECRET=secretref:google-secret" \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_USER" \
  --registry-password "$ACR_PASS" \
  --secrets "${CONTAINERAPP_SECRETS[@]}" \
  --output none 2>/dev/null || {
  warn "containerapp update failed (may need initial Bicep deploy first)"
  info "Trying az containerapp create instead..."
  az containerapp create \
    --name "$APP_NAME" \
    --resource-group "$RG" \
    --environment "$CA_ENV" \
    --image "${IMAGE}:${TAG}" \
    --target-port 3001 \
    --ingress external \
    --min-replicas 0 \
    --max-replicas 2 \
    --cpu 0.25 \
    --memory 0.5Gi \
    --env-vars \
      "PORT=3001" \
      "NODE_ENV=production" \
      "DATABASE_URL=secretref:database-url" \
      "AZURE_OPENAI_ENDPOINT=${DEPLOY_OPENAI_ENDPOINT:-}" \
      "AZURE_OPENAI_API_KEY=secretref:azure-openai-key" \
      "AZURE_OPENAI_DEPLOYMENT=${DEPLOY_OPENAI_DEPLOYMENT}" \
      "JWT_SECRET=secretref:jwt-secret" \
      "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}" \
      "GOOGLE_CLIENT_SECRET=secretref:google-secret" \
    --registry-server "$ACR_LOGIN_SERVER" \
    --registry-username "$ACR_USER" \
    --registry-password "$ACR_PASS" \
    --secrets "${CONTAINERAPP_SECRETS[@]}" \
    --output none
}
ok "Container app deployed"

# Get the FQDN
API_FQDN=$(az containerapp show --name "$APP_NAME" --resource-group "$RG" --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || echo "pending")
API_URL="https://${API_FQDN}"

# ─── 6. Frontend (Static Web App) ────────────────────────────
step "6/6  Building & deploying frontend"

info "Building frontend with production API URL..."
cd "$PROJECT_ROOT"
VITE_API_URL="$API_URL" \
  VITE_UMAMI_URL="${VITE_UMAMI_URL:-https://cloud.umami.is}" \
  VITE_UMAMI_WEBSITE_ID="${VITE_UMAMI_WEBSITE_ID:-}" \
  pnpm --filter @words/web build
ok "Frontend built"

# Check if SWA CLI is available, otherwise install
if ! command -v swa &>/dev/null; then
  info "Installing Azure Static Web Apps CLI..."
  npm install -g @azure/static-web-apps-cli 2>/dev/null || true
fi

# Get SWA deployment token
SWA_TOKEN=$(az staticwebapp secrets list \
  --name "$SWA_NAME" \
  --resource-group "$RG" \
  --query "properties.apiKey" -o tsv 2>/dev/null || echo "")

if [[ -n "$SWA_TOKEN" ]]; then
  # Each environment gets its own SWA resource (words-<env>-web), so publish to production
  # on that resource to update its default hostname content.
  swa deploy "$PROJECT_ROOT/apps/web/dist" \
    --deployment-token "$SWA_TOKEN" \
    --env production 2>/dev/null || warn "SWA deploy failed — deploy manually or via GitHub Actions"
  SWA_URL=$(az staticwebapp show --name "$SWA_NAME" --resource-group "$RG" --query defaultHostname -o tsv 2>/dev/null || echo "pending")
  ok "Frontend deployed to https://${SWA_URL}"
else
  warn "No SWA found — deploy frontend via GitHub Actions or manually"
  SWA_URL="(not deployed)"
fi

# Sync API_URL/CORS_ORIGIN from real deployed endpoints.
# Prefer custom domains over default SWA hostname
CUSTOM_DOMAINS=$(az staticwebapp hostname list --name "$SWA_NAME" --resource-group "$RG" --query "[?domainName!='${SWA_URL}'].domainName" -o tsv 2>/dev/null | tr '\n' ',' | sed 's/,$//')
if [[ -n "$CUSTOM_DOMAINS" ]]; then
  # Build CORS from custom domains (e.g. "wordsilike.com,www.wordsilike.com" → "https://wordsilike.com,https://www.wordsilike.com")
  FINAL_CORS_ORIGIN=$(echo "$CUSTOM_DOMAINS" | tr ',' '\n' | sed 's/^/https:\/\//' | paste -sd ',' -)
elif [[ "$SWA_URL" != "(not deployed)" ]]; then
  FINAL_CORS_ORIGIN="https://${SWA_URL}"
else
  FINAL_CORS_ORIGIN="${CORS_ORIGIN:-http://localhost:5173}"
fi
info "CORS_ORIGIN: ${FINAL_CORS_ORIGIN}"
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RG" \
  --min-replicas 1 \
  --set-env-vars \
    "API_URL=${API_URL}" \
    "CORS_ORIGIN=${FINAL_CORS_ORIGIN}" \
  --output none
ok "Runtime URL env vars synced (min-replicas=1)"

# ─── Summary ──────────────────────────────────────────────────
CALLBACK_URL="${API_URL}/auth/google/callback"

echo ""
echo -e "${GREEN}${BOLD}━━━ Deployment Complete ━━━${NC}"
echo ""
echo -e "  Environment:  ${BOLD}${ENV}${NC}"
echo -e "  API:          ${BOLD}${API_URL}${NC}"
echo -e "  Frontend:     ${BOLD}https://${SWA_URL}${NC}"
echo -e "  ACR:          ${BOLD}${ACR_LOGIN_SERVER}${NC}"
echo -e "  Image:        ${BOLD}${IMAGE}:${TAG}${NC}"
echo ""
echo -e "  ${YELLOW}${BOLD}Google OAuth setup:${NC}"
echo -e "    Go to: https://console.cloud.google.com/apis/credentials"
echo -e "    Add these authorized redirect URIs to your OAuth 2.0 Client:"
echo -e "      ${BOLD}${CALLBACK_URL}${NC}"
echo -e "    Also add authorized JavaScript origin:"
echo -e "      ${BOLD}${FINAL_CORS_ORIGIN}${NC}"
echo ""
echo -e "  ${CYAN}Useful commands:${NC}"
echo -e "    Health check:   curl ${API_URL}/health"
echo -e "    Logs:           az containerapp logs show -n ${APP_NAME} -g ${RG} --follow"
echo -e "    Scale:          az containerapp update -n ${APP_NAME} -g ${RG} --min-replicas 1"
echo -e "    Teardown:       ./scripts/deploy.sh ${ENV} --teardown"
echo ""
