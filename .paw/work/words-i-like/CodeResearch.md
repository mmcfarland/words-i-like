# Code Research: Words I Like

**Work ID**: words-i-like  |  **Branch**: feature/words-i-like  |  **Date**: 2026-02-28

## Baseline

**Greenfield project.** The repository contains only `readme.md` and `.paw/work/` artifacts. There is no existing application code, configuration, or infrastructure — everything will be built from scratch.

Target architecture (from Spec/WorkShaping):
- Turborepo + pnpm monorepo with `apps/web`, `apps/api`, `packages/shared`, `packages/db`, `packages/eslint-config`
- React 19 PWA (Vite) frontend, Fastify + TypeScript backend
- PostgreSQL 18 (Docker), Prisma ORM, Dexie.js (IndexedDB)
- Playwright testing (E2E + visual regression), Vitest unit tests

## External API Research

### Free Dictionary API (`https://dictionaryapi.dev/`)

**Endpoint**: `GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}`

**Verified behaviors** (live-tested):

1. **Successful lookup** — returns a JSON array (not object) with one or more entries:
```json
[{
  "word": "ephemeral",
  "phonetic": "/əˈfɛ.mə.ɹəl/",
  "phonetics": [{ "text": "...", "audio": "...mp3", "sourceUrl": "...", "license": {...} }],
  "meanings": [{
    "partOfSpeech": "adjective",
    "definitions": [{ "definition": "...", "synonyms": [...], "antonyms": [...] }],
    "synonyms": [...],
    "antonyms": [...]
  }],
  "license": { "name": "CC BY-SA 3.0", "url": "..." },
  "sourceUrls": ["..."]
}]
```

2. **Multi-word phrases** — `ad hoc` works via URL encoding (`ad%20hoc`). Returns same schema. Confirms FR-004 multi-word support is viable.

3. **Unknown words** — returns HTTP 404. The fetch fails with a 404 status code. The client must handle this as "no definition found" (FR-009).

4. **No API key required** — completely open, no authentication.

**Rate limits**:
- ~300 requests per 5 minutes per IP (~60/min)
- No daily limit; IP-based throttling only
- 429 status returned when exceeded
- No SLA or uptime guarantee

**Response schema notes for implementation**:
- Response is an **array** — always index `[0]` for the primary entry
- `phonetics` is an array; some entries have empty `audio` strings — filter for non-empty
- `meanings` groups definitions by `partOfSpeech` — maps directly to spec's "part-of-speech labels" requirement
- Each definition has `synonyms`/`antonyms` arrays (often empty)
- `license` field present on each response — data is CC BY-SA 3.0

**Planning implications**:
- Client-direct calls (no backend proxy needed for dictionary) — confirmed in WorkShaping
- Must handle 404 gracefully → save word without definition, queue for retry (FR-009, FR-020)
- Rate limit is generous for < 50 users but implement client-side caching to avoid redundant lookups
- Consider a brief debounce or cache-first strategy when checking for duplicate words

## Package Compatibility

### Confirmed Available & Compatible

| Package | Version | Notes |
|---------|---------|-------|
| **React** | 19.2.x (stable) | Latest stable; React Compiler available for build-time optimization |
| **react-dom** | 19.2.x | Must match React version |
| **Vite** | 6.x | Mature, fast dev server; excellent React 19 support via `@vitejs/plugin-react` |
| **Fastify** | 5.x | TypeScript-native, lightweight; stable ecosystem |
| **Prisma** | 7.x | Explicitly supports PostgreSQL 18; migration tooling works normally |
| **Dexie.js** | 4.x | Actively maintained; strong TypeScript support; ES module + CJS |
| **Framer Motion** | 12.x | Active; React animation library; supports React 19 |
| **@antfu/eslint-config** | 7.x | Requires ESLint ≥9.5.0; opinionated, TypeScript/React-ready |
| **Turborepo** | 2.x | pnpm workspace-native; task caching and dependency-aware builds |
| **Playwright** | 1.x | E2E + visual regression (screenshot comparison); cross-browser |
| **Vitest** | 3.x | Vite-native test runner; co-located test files |
| **pnpm** | 10.x | Strict, fast; native workspaces for monorepo |

### Compatibility Notes
- **@antfu/eslint-config** requires ESLint 9.5+ (flat config format). Ensure `eslint` is pinned to ≥9.5.0.
- **eslint-plugin-boundaries** must be verified for ESLint 9 flat config compatibility — may need `@eslint/compat` shim or a flat-config-native fork.
- **Framer Motion 12** fully supports React 19. The `motion` import path is stable.
- **Prisma 7** uses the `prisma` CLI and `@prisma/client` — greenfield setup is straightforward with `npx prisma init`.

## Infrastructure

### PostgreSQL 18 Docker Image

**Available**: `docker pull postgres:18` — official image on Docker Hub.

**Critical PGDATA change** (new in PG 18):
- Volume mount point changed: mount at `/var/lib/postgresql` (not `/var/lib/postgresql/data`)
- Actual data lives at `/var/lib/postgresql/18/docker`
- This is a **breaking change** from PG ≤17 Docker conventions
- Docker Compose `volumes:` must use the new mount point

**Docker Compose snippet** (corrected for PG 18):
```yaml
services:
  db:
    image: postgres:18
    volumes:
      - pgdata:/var/lib/postgresql  # NOT /var/lib/postgresql/data
    environment:
      POSTGRES_DB: words
      POSTGRES_USER: words
      POSTGRES_PASSWORD: words
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

**Features relevant to project**:
- Native UUIDv7 support — useful for distributed-friendly primary keys
- Async I/O improvements — better read performance
- Alpine variant available (`postgres:18-alpine`) — smaller image (~34% reduction)

## Implementation Notes for Planning

### Dictionary API Integration
1. **Response is an array** — always unwrap `[0]`. TypeScript types should model `DictionaryEntry[]`.
2. **404 = not found** — not an error; handle as "no definition available" and save word anyway.
3. **Cache definitions locally** — once fetched, store in IndexedDB alongside the word. Never re-fetch a successfully looked-up word.
4. **Retry queue** — words saved without definitions (offline or 404-recoverable scenarios) should be retried periodically. Use a simple flag (`definitionStatus: 'found' | 'not_found' | 'pending'`) to distinguish between "API says no" and "haven't tried yet."

### PG 18 Docker Volume
5. **PGDATA mount point is different** — the Docker Compose setup must use `/var/lib/postgresql` as the volume target, not the traditional `/var/lib/postgresql/data`. This will likely trip up anyone using standard PG Docker examples.

### ESLint Configuration
6. **Flat config only** — @antfu/eslint-config 7.x uses ESLint flat config (`eslint.config.js`). No `.eslintrc` files. Verify `eslint-plugin-boundaries` supports flat config or find an alternative boundary enforcement approach.

### Monorepo Structure
7. **pnpm workspace** — `pnpm-workspace.yaml` at root defines `apps/*` and `packages/*`. Turborepo `turbo.json` configures task pipeline and caching.
8. **TypeScript project references** — each package needs its own `tsconfig.json` with `composite: true` for incremental builds and cross-package type checking.

### PWA Considerations
9. **Vite PWA plugin** (`vite-plugin-pwa`) — handles service worker generation, manifest, and offline caching. Should be configured in Phase 9 but the Vite setup in Phase 1 should not preclude it.

### Visual Regression
10. **Animations must be disableable** — Framer Motion respects `prefers-reduced-motion`; additionally, a `data-testid` or env-based flag to disable animations entirely during Playwright visual tests prevents flakiness.

### Definition Status Modeling
11. **Three-state definition status** is important for the local-first model:
    - `found` — definition fetched successfully, stored
    - `not_found` — API returned 404, word exists but no definition available
    - `pending` — not yet attempted (offline save, or retry needed)
    This prevents re-fetching words the API definitively doesn't know about.
