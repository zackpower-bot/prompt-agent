# Prompt Agent

Agent-driven prompt asset management built with Next.js, Prisma, and OpenAI-compatible providers.

## Current State

- MVP is implemented locally and includes generation, analysis, prompt library management, module suggestions, semantic memory, observability, and alerts.
- The app now builds successfully with Next.js 16.
- Deployment is still unverified.

## Implemented Features

### Agent runtime

- ReAct-style agent loop in `src/agent/core.ts`
- Streaming generation over SSE via `src/app/api/agent/stream/route.ts`
- Multi-provider LLM routing via `src/lib/providers.ts`
- Dynamic prompt assembly via `src/agent/prompt-builder.ts`
- Tavily-backed web search tool integration

### Prompt assets

- Prompt CRUD, detail pages, version history, cleanup workflow
- Module library with relational tags
- Quality checks and duplicate detection on agent flows
- Import from `prompt-ide` via `scripts/import-from-prompt-ide.ts`

### Personalization memory

- Deterministic profile layer: `AgentProfile`
- Event pipeline: `MemoryEvent`
- Semantic memory store: `SemanticMemory`
- AUDN materializer and type-aware retrieval

### Product surface

- Top bar + responsive sidebar layout
- Favorites and recent prompts in sidebar
- Settings page for agent profiles
- Stats page backed by `/api/usage`
- Alerts bell backed by `/api/alerts`
- Dark mode and zh/en i18n

### Observability

- `UsageLog` table for LLM and Tavily usage
- Tavily quota tracking and alert generation
- Alert acknowledgement API
- Smoke scripts:
  - `npm run smoke:alerts`
  - `tsx scripts/smoke-usage-quota.ts`

## Stack

- Next.js 16.2.3
- React 19.2.4
- Prisma 7.7 with SQLite via `@prisma/adapter-libsql`
- OpenAI SDK for all provider calls
- next-intl
- shadcn/ui primitives + custom layout components

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Known Issues

- Deployment files exist (`Dockerfile`, `compose.yaml`, `deploy/`) but have not been verified end-to-end.
- Runtime behavior on the live VPS has not been revalidated after the latest agent/memory/alerting changes.

## Project Layout

```text
src/
  agent/          Agent loop, prompts, tools, prompt builder
  app/            App Router pages, server actions, API routes
  components/     UI and layout components
  lib/            Providers, memory, usage, alerts, status transitions
  types/          Shared literal types and enums
prisma/           Schema and migrations
scripts/          Import and smoke scripts
```
