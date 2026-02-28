# Words I Like — Implementation Plan

## Overview

Build a mobile-first PWA for collecting, defining, and organizing words with a dreamy literary aesthetic. The implementation follows a harness-first approach: development infrastructure is established before any feature code, creating mechanical guardrails that AI coding agents work within. The app is local-first (IndexedDB), with optional cloud sync (PostgreSQL) when authenticated via Google OAuth. AI usage examples are generated through Azure OpenAI, proxied through the backend for cost control.

## Current State Analysis

**Greenfield.** The repository contains only `readme.md` and PAW workflow artifacts. No application code, configuration, or infrastructure exists.

**Key findings from code research:**
- Free Dictionary API returns a JSON array, handles multi-word phrases via URL encoding, returns 404 for unknown words. Rate limit ~300 req/5min per IP.
- PostgreSQL 18 Docker image has a **breaking PGDATA volume mount change** — must mount at `/var/lib/postgresql` (not `/var/lib/postgresql/data`).
- All target packages confirmed available and compatible (React 19.2, Vite 6, Fastify 5, Prisma 7, Dexie 4, Framer Motion 12, @antfu/eslint-config 7, Turborepo 2, Playwright 1.x, Vitest 3).
- @antfu/eslint-config requires ESLint ≥9.5 flat config. eslint-plugin-boundaries compatibility with flat config must be verified or an alternative found.
- Three-state definition status modeling needed: `found`, `not_found`, `pending`.

## Desired End State

A fully functional PWA deployed to Azure with:
- Instant word capture with dictionary lookup and smooth animations
- Offline-first local storage with cloud sync on Google sign-in
- AI usage example generation with rate limiting
- List organization with feed filtering
- Read-only list sharing via public URLs
- CI/CD pipeline with staging and production environments
- All quality gates passing (`pnpm check:all`), including visual regression baselines

**Verification**: `pnpm check:all` passes; `pnpm dev:up` starts the full stack; all 12 success criteria from Spec.md are met.

## What We're NOT Doing

- Dark mode (light theme first — SC explicitly deferred)
- Multiple OAuth providers (Google only)
- In-app import feature (scripting for data migration)
- Copy/import from shared lists (read-only view only)
- Random word / word of the day
- Audio pronunciation playback
- Social features (comments, likes, following)
- Multi-language UI localization
- Native mobile apps (PWA only)
- Export as in-app feature (deferred)
- Complex abuse prevention (small user base < 50)

## Phase Status

- [ ] **Phase 1: Dev Harness** — Monorepo scaffold, quality gates, Docker environment, copilot-instructions.md
- [ ] **Phase 2: Design System & Core UI Shell** — Typography, color tokens, input component, app shell with sticky header
- [ ] **Phase 3: Word Entry & Dictionary Integration** — Word input, Free Dictionary API lookup, word card display with animations
- [ ] **Phase 4: Local Persistence & Offline** — IndexedDB via Dexie.js, offline word saving, definition retry queue, PWA manifest
- [ ] **Phase 5: Backend Foundation** — Fastify server, PostgreSQL schema, Prisma models, basic CRUD API
- [ ] **Phase 6: Auth & Sync** — Google OAuth, JWT sessions, sync engine, smart merge on first sign-in
- [ ] **Phase 7: Lists & Organization** — List CRUD, word tagging, feed filtering, bottom half-sheet UI
- [ ] **Phase 8: AI Usage Examples** — Azure OpenAI integration, example generation endpoint, rate limiting, MSW stubs
- [ ] **Phase 9: Sharing** — Public share links, read-only list view, share URL generation
- [ ] **Phase 10: Azure Infrastructure & CI/CD** — Bicep templates, GitHub Actions, staging + production environments
- [ ] **Phase 11: PWA Polish & Visual Regression** — Service worker, offline indicators, performance optimization, visual regression baselines
- [ ] **Phase 12: Documentation** — Docs.md, project documentation, copilot-instructions.md finalization

## Phase Candidates

<!-- Potential future phases that may be promoted after core implementation -->
- [ ] Dark mode theme with system preference detection
- [ ] Export word lists to CSV/JSON
- [ ] Import words from shared lists into own collection
- [ ] Swipe gestures as power-user shortcuts on word cards

---

## Phase 1: Dev Harness

Establish the monorepo scaffold, quality gates, Docker environment, and agent project map. No feature code — just the skeleton that passes `check:all` with zero tests.

### Changes Required

- **Root config files**:
  - `package.json` — pnpm workspace root with script taxonomy (`check:quick`, `check:all`, `lint`, `lint:fix`, `typecheck`, `test`, `test:e2e`, `test:visual`, `dev`, `dev:api`, `dev:up`, `dev:down`, `build`, `db:migrate`, `db:generate`, `db:seed`, `db:reset`)
  - `pnpm-workspace.yaml` — define `apps/*` and `packages/*` workspace globs
  - `turbo.json` — Turborepo pipeline config with task dependencies and caching
  - `.gitignore` — Node.js, build outputs, env files, Docker volumes, Playwright results
  - `.env.example` — documented environment variable template

- **`packages/eslint-config/`**:
  - Shared ESLint flat config based on @antfu/eslint-config
  - React and TypeScript rule customizations
  - Architectural boundary rules (enforce package import restrictions: `apps/web` → `packages/shared` only, `apps/api` → `packages/shared` + `packages/db`, `packages/shared` → no app imports)
  - Verify eslint-plugin-boundaries flat config compatibility; if incompatible, use ESLint `no-restricted-imports` rules as an alternative

- **`packages/shared/`**:
  - `package.json`, `tsconfig.json` (composite: true)
  - Placeholder `src/index.ts` exporting a type (validates build pipeline)

- **`packages/db/`**:
  - `package.json`, `tsconfig.json` (composite: true)
  - Prisma schema placeholder (`prisma/schema.prisma` with PostgreSQL datasource)
  - Placeholder `src/index.ts`

- **`apps/web/`**:
  - Vite + React 19 scaffold (minimal — single `App.tsx` rendering "Words I Like")
  - `tsconfig.json` referencing `packages/shared`
  - Vitest config for unit tests
  - Placeholder test (`App.test.tsx`)

- **`apps/api/`**:
  - Fastify scaffold (minimal — health check endpoint at `GET /health`)
  - `tsconfig.json` referencing `packages/shared`, `packages/db`
  - Vitest config for unit tests
  - Placeholder test (`health.test.ts`)

- **`docker/`**:
  - `docker-compose.yml` — PostgreSQL 18 (mount at `/var/lib/postgresql` per PG 18 change), Fastify API (volume mount for hot-reload), Vite dev server (volume mount for hot-reload)
  - `Dockerfile.api` — Node.js dev image for API
  - `Dockerfile.web` — Node.js dev image for web

- **`tests/`**:
  - `tests/e2e/playwright.config.ts` — Playwright config for functional E2E
  - `tests/visual/playwright.config.ts` — Playwright config for visual regression (0.1% pixel diff threshold)
  - Placeholder E2E test (verify app loads)
  - Placeholder visual test (capture initial page screenshot)

- **`copilot-instructions.md`**:
  - Architecture overview and project map
  - Package boundaries with import rules
  - Quality gate commands
  - Coding conventions (TypeScript strict, Zod schemas, small components, thin route handlers)
  - File patterns (where components, routes, services, types live)

### Success Criteria

#### Automated Verification:
- [ ] `pnpm install` completes without errors
- [ ] `pnpm check:quick` passes (lint + typecheck across all packages)
- [ ] `pnpm check:all` passes (lint + typecheck + unit tests + e2e + visual)
- [ ] `pnpm build` produces production builds for web and API
- [ ] ESLint boundary rules reject a forbidden import (e.g., `apps/web` importing from `packages/db`) — verified by a test case in the ESLint config

#### Manual Verification:
- [ ] `pnpm dev` starts Vite dev server, app renders "Words I Like"
- [ ] `pnpm dev:up` starts Docker Compose stack (PG 18, API, web) and all services are reachable
- [ ] `copilot-instructions.md` accurately reflects the repo structure and conventions

---

## Phase 2: Design System & Core UI Shell

Establish the visual foundation: typography, color tokens, spacing scale, and the app shell with the signature input area and sticky header transition.

### Changes Required

- **`apps/web/src/styles/`**:
  - CSS custom properties for the design system: color palette (soft pastels, lavender/sky blue tints), typography scale (Fraunces for words, Inter/DM Sans for UI), spacing scale, tinted shadow definitions
  - Global reset and base styles (no hard borders anywhere)
  - Animation utility classes and `prefers-reduced-motion` support
  - Font loading strategy (Google Fonts or self-hosted)

- **`apps/web/src/components/AppShell/`**:
  - `AppShell.tsx` — root layout: top bar + content area
  - `TopBar.tsx` — minimal bar with avatar placeholder (ghost state), search icon, list filter icon
  - Scroll-aware behavior: detect scroll position, emit state for input area transition

- **`apps/web/src/components/WordInput/`**:
  - `WordInput.tsx` — the signature borderless input with serif typeface
  - Large/prominent state (initial load, scrolled to top) and compact/sticky state (scrolled down)
  - Smooth CSS transition between states
  - `SubmitIcon.tsx` — animated feather/quill → checkmark SVG morph (Framer Motion)
  - Input validation: 1-3 words, no empty submit

- **`apps/web/src/components/WordInput/WordInput.test.tsx`** — unit tests for input validation, state transitions
- **`apps/web/src/components/AppShell/AppShell.test.tsx`** — unit tests for scroll state management

### Success Criteria

#### Automated Verification:
- [ ] `pnpm check:all` passes
- [ ] Unit tests verify input validation (empty reject, 1-3 words accept, 4+ words reject)
- [ ] Unit tests verify scroll-state transitions

#### Manual Verification:
- [ ] Input renders with serif typeface, no visible border, soft background contrast
- [ ] Typing in the input feels immediate and responsive
- [ ] Submit icon animates from feather to checkmark smoothly
- [ ] Scrolling transitions input from large to compact sticky header
- [ ] Color palette matches spec: soft pastels, lavender/sky blue, tinted shadows
- [ ] No hard borders visible anywhere in the UI

---

## Phase 3: Word Entry & Dictionary Integration

Connect word input to the Free Dictionary API, display word cards with definitions, and implement the signature entry animation.

### Changes Required

- **`packages/shared/src/types/`**:
  - `word.ts` — `Word`, `Definition`, `DictionaryEntry` types aligned with Free Dictionary API response schema (array root, `meanings[].partOfSpeech`, `definitions[]`)
  - `definitionStatus` enum: `found | not_found | pending`

- **`apps/web/src/services/`**:
  - `dictionary.ts` — Free Dictionary API client. Handles JSON array response, 404 → `not_found` status, network errors → `pending` status. Client-direct (no backend proxy).

- **`apps/web/src/components/WordCard/`**:
  - `WordCard.tsx` — collapsed state (word in serif + definition excerpt) and expanded state (all definitions with part-of-speech labels, pronunciation, action button placeholders)
  - Tap to expand/collapse with smooth animation
  - Subtle separation between cards (spacing, soft tinted shadow, gentle background shift — no hard borders)
  - "No definition found" indicator for `not_found` status

- **`apps/web/src/components/WordFeed/`**:
  - `WordFeed.tsx` — reverse-chronological scrollable list of `WordCard` components
  - New word entry animation: slide-down from input area, definition fade-in with slight delay
  - Duplicate detection: if word text already exists, surface existing entry instead of creating new

- **`apps/web/src/hooks/`**:
  - `useWordCollection.ts` — React hook managing in-memory word state (add, expand, collapse, duplicate check). Persistence hook comes in Phase 4.

- **Unit tests**: Dictionary client (mock fetch for success, 404, network error), WordCard states, duplicate detection logic
- **E2E test**: Enter a word → verify card appears with definition text

### Success Criteria

#### Automated Verification:
- [ ] `pnpm check:all` passes
- [ ] Dictionary client tests cover: successful lookup (JSON array unwrap), 404 handling, network error handling, multi-word phrase URL encoding
- [ ] WordCard tests verify collapsed/expanded states and tap toggle
- [ ] E2E test: submit "ephemeral" → card appears with definition text

#### Manual Verification:
- [ ] Word slides down from input with smooth animation
- [ ] Definition fades in with slight delay after word settles
- [ ] Collapsed card shows word (serif) + definition excerpt (sans-serif)
- [ ] Expanded card shows all definitions with part-of-speech labels and pronunciation
- [ ] Cards have dreamy, airy separation (no hard borders)
- [ ] Entering a duplicate word surfaces the existing entry

---

## Phase 4: Local Persistence & Offline

Add IndexedDB persistence via Dexie.js so words survive app restarts and work offline. Add definition retry queue for words saved without definitions.

### Changes Required

- **`apps/web/src/db/`**:
  - `schema.ts` — Dexie database schema: `words` table (id, text, definitions, pronunciation, definitionStatus, createdAt, updatedAt), indexes on text and createdAt
  - `wordStore.ts` — CRUD operations wrapping Dexie: add, getAll (reverse-chronological), update, delete, findByText (for duplicate detection)

- **`apps/web/src/hooks/`**:
  - Refactor `useWordCollection.ts` to use Dexie store as source of truth instead of in-memory state
  - `useDefinitionRetry.ts` — background hook that periodically checks for words with `definitionStatus: 'pending'` and retries dictionary lookup when online. Uses `navigator.onLine` and `online`/`offline` events.

- **`apps/web/src/` (PWA setup)**:
  - `manifest.json` — PWA manifest (app name, icons, theme color matching pastel palette, display: standalone)
  - Register in `index.html` — manifest link tag

- **Unit tests**: Dexie store operations (using fake-indexeddb for test environment), definition retry logic, online/offline state handling
- **E2E test**: Add a word → reload the page → verify word persists

### Success Criteria

#### Automated Verification:
- [ ] `pnpm check:all` passes
- [ ] Unit tests verify: word persistence across Dexie operations, duplicate detection via `findByText`, definition retry triggers on `pending` status, retry skips `not_found` words
- [ ] E2E test: add word → reload → word visible in feed

#### Manual Verification:
- [ ] Words survive full app restart (close tab, reopen)
- [ ] Entering a word offline saves it locally with `pending` definition status
- [ ] When connectivity returns, pending definitions are fetched automatically
- [ ] App is installable as PWA (manifest recognized by browser)

---

## Phase 5: Backend Foundation

Set up the Fastify server, PostgreSQL schema via Prisma, and basic CRUD API endpoints for words, mirroring the local data model.

### Changes Required

- **`packages/db/prisma/schema.prisma`**:
  - `User` model: id (UUID), googleId, displayName, avatarUrl, dailyAiUsageCount, dailyAiUsageResetAt, createdAt, updatedAt
  - `Word` model: id (UUID), text, definitions (JSONB), pronunciation, definitionStatus, userId, createdAt, updatedAt, syncedAt
  - `List` model: id (UUID), name, isDefault, shareToken (nullable, unique), userId, createdAt, updatedAt
  - `WordList` model: wordId, listId (composite PK, join table)
  - Indexes on Word.text + Word.userId (unique composite), List.shareToken

- **`packages/db/src/`**:
  - `client.ts` — Prisma client singleton
  - `seed.ts` — seed script with sample data for development

- **`packages/shared/src/types/`**:
  - API request/response types, Zod validation schemas for word CRUD operations

- **`apps/api/src/`**:
  - `server.ts` — Fastify app setup with CORS, JSON body parsing, error handling
  - `routes/words.ts` — CRUD endpoints: POST /words, GET /words, GET /words/:id, PUT /words/:id, DELETE /words/:id
  - `routes/health.ts` — refactor existing health check
  - `services/word.ts` — business logic layer (thin routes, service handles validation and DB operations)

- **`docker/docker-compose.yml`** — wire API service to use Prisma with PG 18 container

- **Unit tests**: Word service CRUD operations (using test database), Zod validation schemas
- **E2E test**: API health check returns 200, POST /words creates a word

### Success Criteria

#### Automated Verification:
- [ ] `pnpm check:all` passes
- [ ] `pnpm db:migrate` applies schema without errors
- [ ] `pnpm db:seed` populates sample data
- [ ] Unit tests verify word CRUD operations against test database
- [ ] API E2E: POST /words → 201, GET /words → returns created word

#### Manual Verification:
- [ ] `pnpm dev:up` starts full stack with PG 18 and API connected
- [ ] API responds at localhost with correct health check
- [ ] Prisma Studio shows database tables and seed data

---

## Phase 6: Auth & Sync

Add Google OAuth authentication, JWT session management, and the sync engine with smart merge for first-time sign-in.

### Changes Required

- **`apps/api/src/`**:
  - `plugins/auth.ts` — Fastify plugin: Google OAuth flow (authorization code → token exchange → user upsert), JWT token issuance, token validation middleware
  - `routes/auth.ts` — `GET /auth/google` (redirect to Google), `GET /auth/google/callback` (handle callback, issue JWT), `POST /auth/logout`, `GET /auth/me` (current user)
  - `services/sync.ts` — sync service: accept batch of local words from client, smart merge logic (deduplicate by text, combine list assignments, keep richer definition), return merged state
  - `routes/sync.ts` — `POST /sync` (receive local words, return merged state), `GET /sync` (pull latest server state since timestamp)

- **`packages/shared/src/types/`**:
  - Auth types (user profile, token payload), sync request/response types, merge result types

- **`apps/web/src/`**:
  - `services/auth.ts` — auth client: initiate OAuth flow, store JWT, attach to API requests
  - `services/sync.ts` — sync client: push local changes, pull remote changes, handle merge results
  - `hooks/useAuth.ts` — auth state hook: signed-in/out status, user profile, sign-in/out actions
  - `hooks/useSync.ts` — sync hook: trigger sync after auth, periodic sync when online and signed in
  - `components/TopBar/` — update avatar: ghost outline when signed out → Google profile photo when signed in. One-time tooltip for unsigned-in users.
  - Update Dexie schema to include `syncedAt` and `dirty` flag on words

- **Unit tests**: Smart merge logic (duplicate dedup, list combining, richer definition selection), auth token handling, sync state management
- **E2E test**: Sign-in flow (mocked OAuth), verify sync pushes local words to server

### Success Criteria

#### Automated Verification:
- [ ] `pnpm check:all` passes
- [ ] Smart merge unit tests cover: identical words → deduplicate, different lists → combine, one has definition + one doesn't → keep the one with definition
- [ ] Auth flow unit tests verify JWT issuance and validation
- [ ] E2E: mock OAuth → sign in → local words appear on server

#### Manual Verification:
- [ ] Avatar changes from ghost to profile photo on sign-in
- [ ] First-time tooltip appears and is dismissible
- [ ] Words created before sign-in are merged into cloud account
- [ ] Words sync across two browser sessions after sign-in

---

## Phase 7: Lists & Organization

Add list creation, word tagging, feed filtering, and the bottom half-sheet list picker UI.

### Changes Required

- **`apps/api/src/`**:
  - `routes/lists.ts` — CRUD endpoints: POST /lists, GET /lists, PUT /lists/:id, DELETE /lists/:id
  - `routes/word-lists.ts` — tagging endpoints: POST /words/:id/lists, DELETE /words/:id/lists/:listId
  - `services/list.ts` — list business logic, default list creation on user signup

- **`apps/web/src/components/`**:
  - `ListPicker/ListPicker.tsx` — bottom half-sheet component (Framer Motion slide-up animation). Shows existing lists + "create new list" input. Dismissible by tap outside or swipe down.
  - `ListFilter/ListFilter.tsx` — list filter in top bar. Tapping opens half-sheet with list names. Selected list name shown as subtle label below top bar.
  - Update `WordCard.tsx` — add "assign to list" action button in expanded state, triggers ListPicker
  - Update `WordFeed.tsx` — accept filter prop, show only words matching selected list (or all)

- **`apps/web/src/db/`**:
  - Add `lists` and `wordLists` tables to Dexie schema
  - List CRUD and word-list tagging operations in local store

- **`apps/web/src/hooks/`**:
  - `useLists.ts` — list state management, CRUD, sync with backend when signed in
  - Update `useWordCollection.ts` — add list filter support

- **`packages/shared/src/types/`**:
  - List types and Zod schemas for list operations

- **Unit tests**: List CRUD, word-list tagging (add to multiple lists, remove), feed filtering by list
- **E2E test**: Create list → assign word → filter feed by list → verify only tagged words shown

### Success Criteria

#### Automated Verification:
- [ ] `pnpm check:all` passes
- [ ] Unit tests verify: list CRUD, word-list many-to-many operations, feed filtering logic
- [ ] E2E: create list → assign word → filter → correct words shown

#### Manual Verification:
- [ ] Half-sheet slides up smoothly from bottom with list options
- [ ] Creating a new list works inline in the half-sheet
- [ ] Filtering the feed by a list shows only tagged words
- [ ] "All Words" option resets the filter
- [ ] A word assigned to multiple lists appears when filtering by any of them

---

## Phase 8: AI Usage Examples

Integrate Azure OpenAI for generating usage examples, with backend proxying, rate limiting, and MSW stubs for testing.

### Changes Required

- **`apps/api/src/`**:
  - `services/ai.ts` — Azure OpenAI client: generate usage examples for a word (system prompt crafted for natural, diverse usage examples). Environment-conditional: real Azure endpoint or canned stub responses.
  - `routes/ai.ts` — `POST /words/:id/examples` — generate examples, enforce daily rate limit (20/user/day), store results
  - `middleware/rateLimit.ts` — per-user daily rate limiting using User.dailyAiUsageCount field, auto-reset logic

- **`apps/web/src/`**:
  - `services/ai.ts` — client for AI example generation API
  - Update `WordCard.tsx` — add "generate examples" action button in expanded state. Loading indicator while generating. Examples fade in when ready. Cached examples shown on subsequent expansions.
  - Update Dexie schema — add `examples` field to word records

- **`tests/`**:
  - MSW handlers for Azure OpenAI API mocking in E2E tests
  - MSW setup for development mode (when `AZURE_OPENAI_ENDPOINT` not set)

- **Unit tests**: Rate limit logic, AI service (with mocked Azure client), example caching
- **E2E test**: Generate examples for a word (MSW mocked) → verify examples appear in card

### Success Criteria

#### Automated Verification:
- [ ] `pnpm check:all` passes
- [ ] Rate limit unit tests verify: count increments, 21st request rejected, reset logic works
- [ ] AI service tests verify prompt structure and response parsing
- [ ] E2E: generate examples → examples appear in expanded card

#### Manual Verification:
- [ ] "Generate examples" button appears in expanded word card (when signed in)
- [ ] Loading state shows while examples generate
- [ ] Examples fade in with smooth animation
- [ ] Rate limit message appears after 20 generations in a day
- [ ] Previously generated examples shown instantly without re-generation
- [ ] Without Azure credentials configured, stub returns canned examples

---

## Phase 9: Sharing

Add public read-only list sharing via unique URLs.

### Changes Required

- **`apps/api/src/`**:
  - `routes/share.ts` — `POST /lists/:id/share` (generate share token, return public URL), `GET /shared/:token` (return list with words, no auth required)
  - Update List model usage — generate and store shareToken (UUID or short hash)

- **`apps/web/src/`**:
  - `pages/SharedList.tsx` — public read-only view: list name, word cards (collapsed, no actions), dreamy aesthetic matching main app
  - Router setup — add `/shared/:token` route (public, no auth gate)
  - Update list management UI — add "share" action for named lists, copy-to-clipboard for share URL

- **Unit tests**: Share token generation, public list endpoint (no auth), shared view renders words
- **E2E test**: Create list → share → visit share URL → verify words displayed

### Success Criteria

#### Automated Verification:
- [ ] `pnpm check:all` passes
- [ ] Unit tests verify: share token generation, public endpoint returns list without auth, 404 for invalid tokens
- [ ] E2E: share list → visit URL → words visible

#### Manual Verification:
- [ ] Share action generates a copyable URL
- [ ] Visiting the URL shows a read-only view with the dreamy aesthetic
- [ ] No sign-in required to view shared lists
- [ ] Adding/removing words from the list updates the shared view

---

## Phase 10: Azure Infrastructure & CI/CD

Create Bicep templates for Azure resources and GitHub Actions pipelines for staging and production deployment.

### Changes Required

- **`infra/`**:
  - `main.bicep` — orchestrates all resources
  - `modules/containerApp.bicep` — Azure Container Apps environment and app (Fastify backend)
  - `modules/postgres.bicep` — Azure PostgreSQL Flexible Server (Burstable B1ms)
  - `modules/staticWebApp.bicep` — Azure Static Web Apps (or Container App for frontend, based on final hosting decision)
  - `modules/openai.bicep` — Azure OpenAI Service resource
  - `parameters/staging.bicepparam`, `parameters/production.bicepparam` — environment-specific parameters

- **`.github/workflows/`**:
  - `ci.yml` — on PR: `pnpm check:all`, build verification
  - `deploy-staging.yml` — on merge to `main`: build → deploy to staging
  - `deploy-production.yml` — manual trigger or tag-based: deploy to production
  - Secrets configuration documentation in copilot-instructions.md

- **Unit tests**: Bicep template validation (`az bicep build`)
- **E2E test**: CI pipeline dry-run validation

### Success Criteria

#### Automated Verification:
- [ ] `az bicep build` succeeds for all templates
- [ ] GitHub Actions workflows are syntactically valid
- [ ] `pnpm check:all` still passes

#### Manual Verification:
- [ ] Bicep templates deploy a working staging environment (when Azure credentials available)
- [ ] CI pipeline runs on PR and reports status
- [ ] Staging deployment is accessible via URL

---

## Phase 11: PWA Polish & Visual Regression

Finalize PWA capabilities, performance optimization, and establish visual regression baselines for all key UI states.

### Changes Required

- **`apps/web/src/`**:
  - Service worker setup via `vite-plugin-pwa` — precache app shell, cache-on-demand for dictionary API responses
  - Offline indicator — subtle visual cue when offline (consistent with dreamy aesthetic)
  - Performance optimization — code splitting, lazy loading for non-critical routes (shared view), font loading optimization

- **`tests/visual/`**:
  - Capture baseline screenshots for all key states:
    1. Initial load (empty state, input prominent)
    2. Word entered (collapsed card with definition)
    3. Word expanded (full definition + action buttons)
    4. Multiple words in feed (scrolled, sticky header)
    5. List picker open (bottom half-sheet)
    6. Search active (search overlay)
    7. Logged-in state (avatar change)
    8. Mobile viewport (responsive)
  - Anti-flake setup: animations disabled via test flag, mock data via MSW, explicit viewports, font load wait, 0.1% pixel diff tolerance

- **`apps/web/` performance**:
  - Lighthouse audit targeting PWA score ≥ 90
  - Bundle size monitoring

### Success Criteria

#### Automated Verification:
- [ ] `pnpm check:all` passes (including visual regression with baselines)
- [ ] `pnpm test:visual` captures and compares all 8 key state screenshots
- [ ] Service worker registers and caches app shell
- [ ] All visual tests pass with ≤ 0.1% pixel difference

#### Manual Verification:
- [ ] App works fully offline after initial load (word entry, browse, search, list management)
- [ ] Offline indicator appears subtly when connectivity is lost
- [ ] App is installable as PWA on mobile Chrome and Safari
- [ ] Page load performance feels fast (< 2s first contentful paint)

---

## Phase 12: Documentation

Create technical reference documentation and finalize project documentation.

### Changes Required

- **`.paw/work/words-i-like/Docs.md`**:
  - Technical reference: architecture overview, data model, API endpoints, sync protocol, rate limiting logic
  - Load `paw-docs-guidance` skill for template and conventions

- **`docs/development.md`**:
  - Getting started guide (clone, install, dev:up, check:all)
  - Docker environment details
  - Database migrations workflow
  - Testing guide (unit, E2E, visual regression)
  - Azure OpenAI configuration

- **`docs/deployment.md`**:
  - Azure infrastructure setup
  - GitHub Actions pipeline configuration
  - Staging and production deployment procedures
  - Environment variables and secrets

- **`copilot-instructions.md`** — final update reflecting complete architecture, all conventions, comprehensive file patterns

- **`README.md`** — rewrite from informal brief to proper project README with setup instructions, architecture overview, and development workflow

### Success Criteria

#### Automated Verification:
- [ ] `pnpm check:all` passes
- [ ] All documentation links are valid (no broken references)

#### Manual Verification:
- [ ] A new developer/agent can set up the project following docs/development.md alone
- [ ] copilot-instructions.md accurately reflects the complete project
- [ ] README.md is professional and informative

---

## References

- Spec: `.paw/work/words-i-like/Spec.md`
- Research: `.paw/work/words-i-like/CodeResearch.md`
- WorkShaping: `.paw/work/words-i-like/WorkShaping.md`
- Free Dictionary API: https://dictionaryapi.dev/
- OpenAI Harness Engineering: https://openai.com/index/harness-engineering/
