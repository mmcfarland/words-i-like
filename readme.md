# Words I Like

A mobile-first progressive web app for collecting, defining, and organizing interesting words with a dreamy, literary aesthetic.

## Features

- **Instant word capture** — open, type, done. Definitions fetched automatically.
- **Offline-first** — words saved locally via IndexedDB, sync when signed in.
- **Beautiful design** — soft pastels, Fraunces serif typography, smooth animations.
- **Lists & search** — organize words into lists, search across words and definitions.
- **AI examples** — generate usage examples via Azure OpenAI.
- **Sharing** — public read-only links for curated word lists.

## Quick Start

```bash
pnpm install
pnpm dev          # Start frontend at http://localhost:5173
```

For full-stack development with PostgreSQL:
```bash
pnpm dev:up       # Docker Compose: PG + API + Web
```

## Documentation

- [Development Guide](docs/development.md) — setup, testing, project structure
- [Deployment Guide](docs/deployment.md) — Azure infrastructure, CI/CD

## Tech Stack

- **Frontend**: React 19, Vite, Framer Motion, Dexie.js (IndexedDB)
- **Backend**: Fastify 5, Prisma 7, PostgreSQL 18
- **Infrastructure**: Azure Container Apps, Static Web Apps, Bicep
- **Testing**: Vitest, Playwright (E2E + visual regression)
- **Tooling**: Turborepo, pnpm, ESLint (@antfu/eslint-config)

## Architecture

Monorepo with enforced package boundaries:

| Package | Purpose |
|---------|---------|
| `apps/web` | React PWA |
| `apps/api` | Fastify API |
| `packages/shared` | Types & schemas |
| `packages/db` | Prisma schema |

## License

Private project.
