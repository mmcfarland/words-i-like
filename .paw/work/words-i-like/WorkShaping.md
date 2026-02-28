# WorkShaping: Words I Like

## Problem Statement

**Who benefits**: The creator (Matt) and a small circle of friends/family (< 50 users) who enjoy collecting interesting words.

**What problem is solved**: There's no simple, beautiful, mobile-first tool for quickly capturing words you encounter throughout the day along with their definitions. Existing note-taking apps are generic and the experience of looking up and saving a word is clunky. This app makes the act of collecting words feel *delightful* — open, type, done.

**Motivation**: A personal tool built to be used daily. Engineering quality matters but is in service of a great user experience, not as a showcase.

## Core Concept

A progressive web app where users can instantly capture words, automatically look up definitions, optionally generate AI-powered usage examples, and organize words into lists. Local-first by design — works fully offline, syncs when signed in.

## Work Breakdown

### Core Functionality

1. **Word entry with dictionary lookup** — Open app, type a word, hit enter. Definition appears from Free Dictionary API (client-direct). Word is saved locally.
2. **Word collection feed** — Scrollable feed of collected words with definitions. Recently added words at top.
3. **List organization** — Words tagged into named lists. Default "all words" collection. Filter the main feed by list.
4. **Local persistence** — IndexedDB (via Dexie.js) for offline storage. Full PWA with service worker.
5. **User authentication** — Google OAuth only. Ghost avatar when not logged in, filled avatar when signed in.
6. **Cloud sync** — Per-device local collection until login. Smart merge on first auth (deduplicate by word text, combine list assignments, keep richer definition). After login, changes sync across devices.
7. **AI usage examples** — Generate usage examples via Azure OpenAI Service, proxied through backend. Per-user daily limit (20 requests/day).
8. **Sharing** — Read-only public links to lists. No account needed to view shared lists. Copy/import from shared lists deferred.

### Supporting Features

- **Search** — Real-time search across word text and definition content
- **Export** — App feature, deferred to later phase
- **Import** — Out-of-band scripting for data migration (not an app feature)
- **Dark mode** — Deferred; get light theme perfect first

### Explicitly Out of Scope (Initial)

- Multiple OAuth providers (GitHub, Apple, Microsoft)
- Import as an in-app feature
- Copy/import from shared lists
- Random word / "word of the day"
- Dark mode
- Complex abuse prevention (small user base)

## UI/UX Vision

### Aesthetic Direction

**Dreamy, cloudy, light** — the app should feel ethereal and literary. No hard borders, no heavy chrome. Words float in space with generous whitespace and subtle shadows.

- **Color palette**: Soft pastels — near-white backgrounds with hints of lavender and sky blue. Tinted shadows (soft purple-gray, never pure black).
- **Typography**: Mixed — distinctive modern serif for words themselves (**Fraunces** or **Newsreader**), clean sans-serif for UI elements (**Inter** or **DM Sans**). Strong information hierarchy through font size and weight.
- **Spacing**: Generous. Airy. Content breathes.
- **Cards/separation**: No hard-bordered cards. Subtle separation through spacing, soft tinted shadows, and gentle background shifts. Content blocks floating in space.

### App Structure

**Single-page feed** with minimal top bar:
- **Left**: Avatar (ghost outline when not logged in, profile photo when signed in)
- **Right**: Search icon + List filter icon

### The Input Experience

- **Initial load**: Large, borderless input dominates the viewport. Serif typeface matching the word display. Placeholder text inviting input. No visible box — just a bottom rule or faint background contrast.
- **On scroll**: Input smoothly transitions to a compact sticky header — still accessible, but out of the way. Font size reduces.
- **Submit button**: Animated feather/quill icon that morphs to a checkmark on submit, then resets. Smooth, satisfying animation.
- **Submit trigger**: Enter key or tap the icon.

### Word Entry Flow

1. User types a word and submits
2. Word **slides down** from input area into the feed with smooth animation
3. Definition **fades in** with a slight delay (creates anticipation; if dictionary lookup is very fast, add a brief artificial delay for feel)
4. Word card settles into collapsed state

### Word Cards

- **Collapsed**: Word (large serif) + short definition excerpt (sans-serif, smaller). Clean, scannable.
- **Tap to expand**: Full definition, action buttons (assign to list, generate AI examples, delete). Any existing usage examples shown.
- **Tap again**: Collapses back.
- No persistent action buttons in collapsed state — keeps the feed airy and uncluttered.

### Actions

- **Assign to list**: Opens bottom half-sheet with existing lists + "create new list" option. Familiar mobile pattern, light and dismissible.
- **Generate AI examples**: Triggers backend call. Examples fade in when ready.
- **Delete**: Available in expanded view.

### Navigation & Browsing

- **List filter**: Tap list icon in top bar → bottom half-sheet with list names. Select a list to filter the feed. "All Words" option resets filter. Selected list name shown as subtle label.
- **Search**: Tap search icon → full-width search field slides down, overlaying the input area. Real-time filtering of word feed by word text and definition content. Dismiss to return to input mode.

### Auth State

- **Not logged in**: Ghost/outline avatar. One-time soft tooltip on first visit: "Your words are saved on this device. Sign in to sync across devices." Dismissible, never intrusive.
- **Logged in**: Filled avatar with profile photo. Tapping opens profile/settings (sign out, account info).

## Data Model

### Tags-Based Organization

Words belong to a default collection. Users tag/assign words to named lists. A word can appear in multiple lists. Under the hood this is a many-to-many relationship, but the UI presents it as "lists" for simplicity.

### Key Entities

- **Word**: text, definition (from API), pronunciation, part of speech, usage examples (AI-generated), created_at, source_device
- **List**: name, created_at, is_default, share_token (for public links)
- **WordList**: word_id, list_id (join table)
- **User**: google_id, display_name, avatar_url, daily_ai_usage_count, daily_ai_usage_reset_at

### Local Storage

IndexedDB via Dexie.js. Schema mirrors the server-side PostgreSQL schema for clean sync. Each record has a `synced_at` timestamp and `dirty` flag.

### Sync Strategy

- **Pull-based** with timestamps (not CRDTs — overkill for this scale)
- **Last-write-wins** for updates after initial sync
- **Smart merge on first login**: Deduplicate by word text, combine list assignments, keep the richer definition (more fields populated)
- **Conflict handling**: Minimal — at < 50 users with primarily single-device usage, conflicts are rare. Simple timestamp-based resolution.

## Architecture

### Frontend

- **React 19** + **Vite** (fast dev experience, modern tooling)
- **No component library** — hand-crafted components for the custom aesthetic
- **CSS approach**: TBD during implementation (CSS Modules or Tailwind — both viable)
- **PWA**: Service worker for offline access, app manifest for installability
- **State management**: React context + local state (simple app, no need for Redux/Zustand)
- **Animation**: CSS transitions + Framer Motion for the signature interactions (word slide-down, definition fade, feather→checkmark morph)

### Backend

- **Fastify** (Node.js/TypeScript) — fast, lightweight, good plugin ecosystem
- **Azure Container Apps** — scales to zero, handles WebSockets, no cold-start issues
- **PostgreSQL** (Azure Flexible Server, Burstable B1ms) — JSONB columns for semi-structured word metadata
- **ORM**: Prisma (TypeScript-native, great migration story)

### Hosting

Two viable options (decide during infrastructure phase):
1. **Azure Static Web Apps** (free tier, CDN) + **Container Apps** (backend) — cheaper, faster frontend
2. **Single Container App** serving both — simpler ops, one deploy

### External Services

- **Free Dictionary API** — client-direct, no key needed
- **Azure OpenAI Service** — proxied through backend for cost control
- **Google OAuth** — via Passport.js, JWT tokens

### Infrastructure

- **Bicep templates** for all Azure resources
- **GitHub Actions** CI/CD with staging + production environments
- **Environments**: dev (local) → staging → production

### Testing

- **Vitest** for unit tests
- **Playwright** for E2E tests

## Phasing Strategy (High-Level)

The project should be built in phases, each delivering a usable increment:

**Phase 1 — Local Word Collector**: Word entry + dictionary lookup + local persistence (IndexedDB). The core UX loop works on a single device with no backend. Focus on nailing the aesthetic and animations.

**Phase 2 — Project Infrastructure**: Dev environment setup (linting, formatting, type checking, build scripts). Copilot instructions. Testing infrastructure.

**Phase 3 — Backend Foundation**: Fastify server, PostgreSQL schema, Prisma setup. Docker-based local dev. Basic API endpoints.

**Phase 4 — Auth & Sync**: Google OAuth, user accounts, sync engine, smart merge on first login.

**Phase 5 — AI Examples**: Azure OpenAI integration, usage example generation, daily rate limiting.

**Phase 6 — Lists & Organization**: List creation, word tagging, list filtering, bottom half-sheet UI.

**Phase 7 — Sharing**: Public read-only links, share flow.

**Phase 8 — Azure Infrastructure**: Bicep templates, Container Apps / Static Web Apps, GitHub Actions CI/CD, staging + production.

**Phase 9 — PWA & Polish**: Service worker, app manifest, offline indicators, performance optimization, E2E tests.

> Note: Phase ordering may be adjusted during detailed planning. Infrastructure (Phase 2) could move earlier. Auth (Phase 4) could precede or follow list organization.

## Risk Assessment

- **Free Dictionary API reliability**: No SLA, could go down. Mitigation: cache definitions locally once fetched; consider fallback API.
- **Sync complexity**: Even "simple" sync has edge cases. Mitigation: start with a very basic sync model; the small user base means we can iterate.
- **Azure OpenAI cost**: Even with rate limiting, costs could surprise. Mitigation: set Azure budget alerts; the 20/day limit per user with < 50 users caps exposure.
- **PWA limitations**: Some browsers have IndexedDB storage limits. Mitigation: word collections are small data; unlikely to hit limits.
- **Scope creep**: The vision is large. Mitigation: strict phasing; each phase is independently useful.

## Open Questions for Downstream Stages

1. **CSS approach**: CSS Modules vs. Tailwind — evaluate during UI implementation
2. **Hosting split**: Static Web Apps + Container Apps vs. single container — evaluate during infra phase
3. **Specific serif typeface**: Fraunces vs. Newsreader — evaluate with actual rendered text during UI development
4. **Sync protocol details**: Exact API contract for sync (polling interval, batch size, conflict resolution edge cases)
5. **PWA caching strategy**: Which assets to precache vs. cache-on-demand

## Session Notes

### Key Decisions
- **Tags over folders**: Words can appear in multiple lists (many-to-many), but UI presents as "lists" for simplicity
- **No component library**: The dreamy, custom aesthetic requires hand-crafted components
- **Client-direct dictionary, backend-proxied AI**: Optimizes for speed (dictionary) and cost control (AI)
- **Google OAuth only**: Simplest path for small user base
- **Planning-only review**: Deep attention to shape, spec, and plan; auto-proceed through implementation
- **Dark mode deferred**: Get the light theme aesthetic right first
- **Import via scripting**: Not an app feature; keeps UI scope clean
- **Tap-to-expand over swipe**: More discoverable, cleaner interaction model

### Design Principles (Emerged from Discussion)
1. **Words are the stars** — everything else is chrome that disappears
2. **Dreamy over utilitarian** — soft pastels, tinted shadows, generous space
3. **Immediate value** — open app, type word, done. No friction.
4. **Progressive disclosure** — collapsed cards, expand on tap, actions only when needed
5. **Literary feel** — serif for words, the app feels like a beautiful book, not a database
