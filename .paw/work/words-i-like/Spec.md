# Feature Specification: Words I Like

**Branch**: feature/words-i-like  |  **Created**: 2026-02-28  |  **Status**: Draft
**Input Brief**: A mobile-first PWA for collecting, defining, and organizing interesting words with a dreamy, literary aesthetic.

## Overview

Words I Like is a progressive web app that lets users instantly capture interesting words they encounter throughout their day. The moment a user opens the app, they're greeted with a clean, inviting input ready for a new word. Upon entry, the word's definition is automatically looked up and displayed with a smooth, satisfying animation — creating a small moment of delight in what would otherwise be a mundane note-taking action.

The app is built around a local-first philosophy: words are stored on the device immediately, no account required. Users can browse their growing collection as a scrollable feed, tap to expand any word for its full definition and actions, and organize words into named lists. When ready, users sign in with Google to sync their collection across devices, with an intelligent merge that preserves everything they've collected.

For users who want more depth, the app can generate AI-powered usage examples for any word, showing how it's used in context. Lists can be shared via public read-only links, letting users show off their curated collections. Throughout, the aesthetic is dreamy and literary — soft pastels, elegant serif typography for the words themselves, generous whitespace, and subtle animations that make the experience feel like leafing through a beautiful book rather than using a utility app.

The development approach prioritizes a harness-first engineering model, where the dev environment, quality gates, and tooling are established before any feature code, creating an environment optimized for AI coding agents to build reliably within strict mechanical guardrails.

## Objectives

- Enable instant word capture with zero friction — open, type, done
- Automatically provide word definitions without manual lookup
- Create a visually distinctive, dreamy reading experience for browsing collected words
- Support offline-first usage with seamless cloud sync when signed in
- Provide AI-generated usage examples to deepen word understanding
- Allow flexible word organization through a tagging/list model
- Enable sharing curated word lists via public links
- Establish a harness-first dev environment with mechanical guardrails, structured feedback, and visual regression testing optimized for AI coding agents

## User Scenarios & Testing

### User Story P1 – Capture a Word Instantly

Narrative: A user encounters an interesting word while reading on their phone. They open Words I Like and immediately start typing the word. They hit submit, and the word slides down into their feed with its definition fading in below. The whole interaction takes under 5 seconds.

Independent Test: Enter a word and verify it appears in the feed with its definition.

Acceptance Scenarios:
1. Given the app is open on initial load, When the user types "ephemeral" and presses enter, Then the word slides into the feed and a definition appears with a fade-in animation
2. Given the user has entered a word, When the dictionary API returns successfully, Then the collapsed card shows the word in serif font and a truncated definition excerpt
3. Given the user enters a word the dictionary API does not recognize, When the submit completes, Then the word is saved with a subtle "no definition found" indicator, and the user can keep it
4. Given the user enters a multi-word phrase (up to 3 words) like "ad hoc", When submitted, Then the phrase is treated as a valid entry and a definition lookup is attempted
5. Given the user enters text longer than 3 words, When they attempt to submit, Then input is rejected with a gentle validation message

### User Story P1 – Browse and Explore Words

Narrative: A user opens the app to revisit words they've collected. They scroll through their feed, seeing each word with a short definition excerpt. They tap a word to expand it, revealing the full definition with part-of-speech labels, and tap again to collapse it.

Independent Test: Tap a word card to expand it showing full definition, then tap again to collapse.

Acceptance Scenarios:
1. Given the user has collected multiple words, When they scroll the feed, Then words appear as collapsed cards showing word text and definition excerpt
2. Given a collapsed word card, When the user taps it, Then it expands to show all definitions with part-of-speech labels (noun, verb, etc.) and action buttons
3. Given an expanded word card, When the user taps it again, Then it collapses back to the excerpt view
4. Given the user scrolls down, When the input area leaves the viewport, Then it transitions to a compact sticky header at the top

### User Story P1 – Offline Word Collection

Narrative: A user is on the subway with no internet. They open Words I Like and add a word. The word is saved locally. When connectivity returns, the definition is fetched and displayed.

Independent Test: Add a word while offline and verify it persists after app restart.

Acceptance Scenarios:
1. Given the device is offline, When the user enters a word, Then the word is saved to local storage (IndexedDB) immediately
2. Given a word was saved offline without a definition, When connectivity is restored, Then the definition is fetched and populated automatically
3. Given the user restarts the app, When it loads, Then all previously saved words are present in the feed

### User Story P2 – Organize Words into Lists

Narrative: A user wants to group related words together. They tap a word to expand it, tap the "assign to list" action, and a half-sheet slides up showing their existing lists plus an option to create a new one. They assign the word to "Architecture Terms."

Independent Test: Assign a word to a named list, then filter the feed by that list.

Acceptance Scenarios:
1. Given an expanded word card, When the user taps the list assignment action, Then a bottom half-sheet appears with existing lists and a "create new list" option
2. Given the list picker is open, When the user selects a list, Then the word is tagged with that list and the half-sheet dismisses
3. Given the list picker is open, When the user taps "create new list" and enters a name, Then a new list is created and the word is assigned to it
4. Given words are tagged with lists, When the user taps the list filter icon and selects a list, Then the feed shows only words in that list
5. Given the feed is filtered by a list, When the user selects "All Words", Then the filter clears and all words are shown
6. Given a word is assigned to multiple lists, When the user filters by any of those lists, Then the word appears in each filtered view

### User Story P2 – Sign In and Sync

Narrative: A user has been collecting words on their phone without an account. They decide to sign in with Google. Their local collection is merged into their new account. Later, they open the app on their laptop and see all their words.

Independent Test: Sign in on a device with local words, then verify the same words appear on a second signed-in device.

Acceptance Scenarios:
1. Given the user is not signed in, When the avatar shows a ghost/outline state, Then tapping it initiates Google OAuth sign-in
2. Given the user signs in for the first time with a local collection, When authentication completes, Then all local words are merged into the cloud account
3. Given words exist both locally and in the cloud account, When smart merge runs, Then duplicates are deduplicated by word text, list assignments are combined, and the richer definition is kept
4. Given the user is signed in on device A, When they add a word, Then the word appears on device B after sync
5. Given the user is signed in, When the avatar displays, Then it shows the user's Google profile photo

### User Story P2 – Search Words

Narrative: A user remembers a word they saved but can't recall it exactly. They tap the search icon, and a search field slides down. They type part of the word or a keyword from its definition, and the feed filters in real time.

Independent Test: Search for a keyword that appears in a word's definition and verify the word appears in filtered results.

Acceptance Scenarios:
1. Given the user taps the search icon, When the search field appears, Then it slides down overlaying the input area
2. Given the search field is active, When the user types a query, Then the feed filters in real time matching word text and definition content
3. Given the search field is active, When the user dismisses it, Then the input area reappears and the feed returns to unfiltered state

### User Story P3 – Generate AI Usage Examples

Narrative: A user wants to see how "ineffable" is used in context. They expand the word card and tap the "generate examples" action. After a moment, three usage examples appear, showing the word in different contexts.

Independent Test: Generate usage examples for a word and verify they appear in the expanded card.

Acceptance Scenarios:
1. Given an expanded word card, When the user taps "generate examples", Then a loading indicator appears and usage examples fade in when ready
2. Given the user is not signed in, When they attempt to generate examples, Then they are prompted to sign in (AI features require authentication for rate limiting)
3. Given the user has generated 20 examples today, When they attempt another, Then a friendly message indicates the daily limit has been reached
4. Given the device is offline, When the user taps "generate examples", Then a message indicates this feature requires an internet connection
5. Given examples have been previously generated for a word, When the user expands that word, Then the cached examples are shown without re-generating

### User Story P3 – Share a Word List

Narrative: A user has curated a list called "Beautiful Words" and wants to share it. They open the list and tap a share action, which generates a public link. Anyone with the link can view the words and definitions without needing an account.

Independent Test: Generate a share link for a list and verify the link loads a read-only view of the words.

Acceptance Scenarios:
1. Given the user has a named list, When they initiate sharing, Then a unique public URL is generated
2. Given a public share URL, When anyone visits it, Then they see the list name and all words with definitions in a read-only view
3. Given a shared list, When the owner adds or removes words, Then the public view reflects the changes

### User Story P1 – Dev Harness Setup

Narrative: A developer (or AI coding agent) clones the repo and runs a single command to get the full development environment running. All quality gates are accessible via scripts. The agent can verify its changes haven't broken anything by running `check:all`.

Independent Test: Clone the repo, run `pnpm install && pnpm dev:up`, and verify the full stack starts. Run `pnpm check:all` and verify all gates pass.

Acceptance Scenarios:
1. Given a fresh clone, When `pnpm install` is run, Then all dependencies install successfully across the monorepo
2. Given dependencies are installed, When `pnpm check:quick` is run, Then lint and typecheck complete with exit code 0
3. Given dependencies are installed, When `pnpm check:all` is run, Then lint, typecheck, unit tests, E2E tests, and visual tests all pass sequentially
4. Given Docker is available, When `pnpm dev:up` is run, Then PostgreSQL 18, Fastify API, and Vite dev server all start and are accessible
5. Given the dev environment is running, When an agent modifies a source file, Then the relevant dev server hot-reloads the change
6. Given `AZURE_OPENAI_ENDPOINT` is not set, When AI example generation is triggered, Then a local stub returns canned responses

### Edge Cases

- **Empty feed**: First-time user sees only the input area with an inviting placeholder — no empty state messaging cluttering the aesthetic
- **Rapid word entry**: User submits multiple words quickly — each animates into the feed sequentially, not simultaneously
- **Very long definitions**: Definitions that exceed reasonable card height are truncated in collapsed view; full text available on expand
- **Dictionary API downtime**: Words are saved locally without definitions; definitions are retried when API recovers
- **Network transition**: User goes offline mid-sync — pending changes queue locally and sync when connectivity returns
- **Duplicate word entry**: If a user enters a word they already have, the existing entry is surfaced/highlighted rather than creating a duplicate
- **Special characters**: Words with diacritics (café, naïveté) are handled correctly in storage, display, and search
- **Browser storage limits**: IndexedDB usage is monitored; warning shown if approaching limits (unlikely for word collections)

## Requirements

### Functional Requirements

- FR-001: Accept word/phrase input (1-3 words) and save to local storage immediately on submit (Stories: P1-Capture)
- FR-002: Look up word definitions from Free Dictionary API on submit, displaying all definitions with part-of-speech labels and pronunciation where available (Stories: P1-Capture, P1-Browse)
- FR-003: Display word feed as a reverse-chronological scrollable list of collapsed cards showing word text and definition excerpt (Stories: P1-Browse)
- FR-004: Support tap-to-expand/collapse on word cards, revealing full definitions, part-of-speech labels, and action buttons (Stories: P1-Browse)
- FR-005: Persist all word data in IndexedDB for offline access and PWA functionality (Stories: P1-Offline)
- FR-006: Transition input area to compact sticky header on scroll, restoring full size when scrolled to top (Stories: P1-Browse)
- FR-007: Animate word entry with slide-down transition and delayed definition fade-in (Stories: P1-Capture)
- FR-008: Animate submit button as feather/quill icon morphing to checkmark on submit (Stories: P1-Capture)
- FR-009: Save words without definitions when dictionary API returns no results, displaying a subtle "no definition found" indicator (Stories: P1-Capture)
- FR-010: Tag words with named lists via bottom half-sheet picker with "create new list" option (Stories: P2-Lists)
- FR-011: Filter the main feed by selected list, with an "All Words" option to reset (Stories: P2-Lists)
- FR-012: Authenticate users via Google OAuth, displaying ghost avatar when signed out and profile photo when signed in (Stories: P2-Sync)
- FR-013: Show one-time dismissible tooltip for unsigned-in users explaining device-only storage (Stories: P2-Sync)
- FR-014: Sync word collections to cloud on sign-in, with smart merge deduplicating by word text, combining list assignments, and keeping the richer definition (Stories: P2-Sync)
- FR-015: Search words in real time across word text and definition content via sliding search overlay (Stories: P2-Search)
- FR-016: Generate AI usage examples via Azure OpenAI proxied through backend, with 20 requests/day per-user limit (Stories: P3-AI)
- FR-017: Cache AI-generated usage examples locally and in cloud, displaying them on subsequent card expansions without re-generation (Stories: P3-AI)
- FR-018: Generate shareable public read-only links for named lists, viewable without authentication (Stories: P3-Share)
- FR-019: Detect and surface duplicate word entries, highlighting the existing entry rather than creating a new one (Stories: P1-Capture)
- FR-020: Retry definition lookup for words saved without definitions when connectivity is restored (Stories: P1-Offline)
- FR-021: Establish monorepo dev environment with Turborepo, pnpm, ESLint boundary enforcement, TypeScript strict mode, and full script taxonomy (Stories: P1-Harness)
- FR-022: Provide Docker Compose local environment running PostgreSQL 18, Fastify, and Vite with hot-reload (Stories: P1-Harness)
- FR-023: Implement Playwright visual regression testing with baseline screenshots for key UI states (Stories: P1-Harness)
- FR-024: Provide Azure OpenAI stub for local development and testing when endpoint is not configured (Stories: P1-Harness)

### Key Entities

- **Word**: A collected word or short phrase with its associated definitions, pronunciation, usage examples, and metadata
- **Definition**: A meaning of a word including part of speech, definition text, and optional example from the dictionary
- **List**: A named, user-created grouping of words (many-to-many via tags)
- **User**: An authenticated account with Google identity, sync state, and AI usage tracking

### Cross-Cutting / Non-Functional

- The app must function fully offline for word entry, browsing, searching, and list management
- All UI interactions must feel responsive — input-to-display under 100ms for local operations
- The visual aesthetic must be consistent: soft pastels, serif word typography, generous spacing, no hard borders
- The app must be installable as a PWA on mobile and desktop browsers
- All quality gates (lint, typecheck, test, e2e, visual) must be runnable via single commands with clear exit codes
- Architectural boundaries between monorepo packages must be mechanically enforced via ESLint rules

## Success Criteria

- SC-001: A user can open the app and submit a word in under 5 seconds from first interaction, with the word persisting across app restarts (FR-001, FR-005)
- SC-002: Submitted words display definitions with part-of-speech labels, with collapsed cards showing excerpts and expanded cards showing all definitions (FR-002, FR-003, FR-004)
- SC-003: All word operations (entry, browse, search, list management) function without network connectivity (FR-005, FR-015, FR-011)
- SC-004: Word entry produces a smooth slide-down animation followed by a delayed definition fade-in; the submit icon animates from feather to checkmark (FR-007, FR-008)
- SC-005: Words can be organized into named lists via a bottom half-sheet, and the feed can be filtered by any list (FR-010, FR-011)
- SC-006: Signing in with Google merges the local collection into the cloud account, deduplicating words and combining list assignments; subsequent changes sync across devices (FR-012, FR-014)
- SC-007: AI usage examples can be generated for any word (when signed in), cached for reuse, and rate-limited to 20 per user per day (FR-016, FR-017)
- SC-008: Named lists can be shared via public URLs that display words and definitions without requiring viewer authentication (FR-018)
- SC-009: `pnpm check:all` passes on a fresh clone after `pnpm install`, validating lint, typecheck, unit tests, E2E tests, and visual regression (FR-021, FR-023)
- SC-010: `pnpm dev:up` starts the full local stack (database, API, frontend) with hot-reload, and AI features work via stub when Azure OpenAI is not configured (FR-022, FR-024)
- SC-011: Visual regression tests cover at least 6 key UI states and detect unintended visual changes above a 0.1% pixel difference threshold (FR-023)
- SC-012: ESLint boundary rules prevent forbidden cross-package imports, failing the lint gate on violation (FR-021)

## Assumptions

- The Free Dictionary API (https://dictionaryapi.dev/) will remain free and available; if it becomes unavailable, definitions degrade gracefully (words saved without definitions)
- PostgreSQL 18 is available as a Docker image; if not yet released at implementation time, PostgreSQL 17 is an acceptable substitute
- Azure OpenAI Service is available in the user's Azure subscription; configuration details provided at implementation time
- Google OAuth client credentials are provided at implementation time; the app uses standard OAuth 2.0 authorization code flow
- The app targets modern evergreen browsers (Chrome, Safari, Firefox, Edge — latest 2 versions); no IE support
- IndexedDB storage is sufficient for word collections (typically < 10MB even for large collections)
- English is the primary language; the app passes non-English words to the dictionary API without special handling
- The user base remains small (< 50 users); infrastructure and rate limiting are designed for this scale
- The feather/quill submit icon animation is implemented via SVG path morphing or Lottie; exact technique chosen during implementation

## Scope

In Scope:
- Word/phrase entry with dictionary definition lookup (Free Dictionary API)
- Local-first persistence (IndexedDB) with full offline support
- Scrollable word feed with collapsed/expanded card states
- Dreamy, literary visual aesthetic (soft pastels, serif typography, smooth animations)
- List creation, word tagging, and feed filtering by list
- Google OAuth authentication with ghost/filled avatar state
- Cross-device sync with smart merge on first sign-in
- AI usage example generation via Azure OpenAI (backend-proxied, rate-limited)
- Read-only public sharing of named lists
- Monorepo dev environment (Turborepo, pnpm, ESLint, TypeScript strict)
- Docker Compose local environment (PG 18, Fastify, Vite)
- Playwright visual regression and E2E testing
- Azure OpenAI stub for local dev/testing
- Copilot instructions file as agent project map
- Bicep templates for Azure infrastructure
- GitHub Actions CI/CD with staging and production

Out of Scope:
- Dark mode (deferred — light theme first)
- Multiple OAuth providers (Google only)
- In-app word import (scripting-based for data migration)
- Copy/import words from shared lists (sharing is read-only view only)
- Random word / "word of the day" feature
- Complex abuse prevention (small user base)
- Word pronunciation audio playback
- Social features (comments, likes, following)
- Multi-language UI localization
- Native mobile apps (PWA only)
- Export as in-app feature (deferred)

## Dependencies

- Free Dictionary API (https://dictionaryapi.dev/) for word definitions
- Azure OpenAI Service for AI usage example generation
- Google Cloud Console for OAuth client credentials
- Azure subscription for hosting (Container Apps, PostgreSQL Flexible Server, Static Web Apps)
- Docker for local development environment
- GitHub for repository hosting and Actions CI/CD

## Risks & Mitigations

- **Free Dictionary API reliability**: No SLA, could become unavailable. Mitigation: Cache all fetched definitions locally; queue retry for missed lookups; design for graceful degradation.
- **Sync complexity**: Even simple sync has edge cases with concurrent edits. Mitigation: Start with basic timestamp-based sync; the small user base (mostly single-device) minimizes real conflicts.
- **Azure OpenAI cost**: Per-request costs could accumulate. Mitigation: 20/day per-user hard limit; Azure budget alerts; cache generated examples to avoid re-generation.
- **Visual regression flakiness**: Screenshot tests can be fragile across environments. Mitigation: Disable animations in test mode; use mock data; set explicit viewports; allow 0.1% pixel tolerance.
- **PWA storage limits**: Browser-imposed IndexedDB quotas could be hit. Mitigation: Word data is small (< 10MB for thousands of words); monitor usage and warn if approaching limits.
- **Scope creep**: The vision spans 9 phases. Mitigation: Strict phase boundaries; each phase delivers a usable increment; features not in the current phase are out of scope.

## References

- WorkShaping: .paw/work/words-i-like/WorkShaping.md
- Free Dictionary API: https://dictionaryapi.dev/
- OpenAI Harness Engineering: https://openai.com/index/harness-engineering/
