# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## EngineVault Application

**Artifact:** `artifacts/enginevault` (frontend) + `artifacts/api-server` (backend, port 8080)

### Routes
- `/` — Home
- `/specs`, `/specs/:slug`, `/specs/:slug/:id` — Engine specs database
- `/calculators/*` — 8 calculators
- `/cam-guide` — Camshaft selection guide
- `/torque-specs` — Torque specs quick lookup
- `/build-sheets` — Build Sheets index
- `/build-sheets/planner` — Build Planner (new)
- `/build-sheets/record` — Engine Record Sheet

### Design System
- Charcoal `#1a1a1a` — nav, page header banners, dark section backgrounds
- Orange `#E85D04` — accent, CTAs, eyebrow text (`text-primary`)
- White — content area backgrounds
- `PageHeader` component: `artifacts/enginevault/src/components/layout/PageHeader.tsx`

### Key Data Files
- `artifacts/enginevault/src/data/buildParts.ts` — Build Planner parts catalog (LS1, LS3, SBC350, Ford 302)
- `lib/db/src/seed.ts` — Database seed
- `lib/db/src/seed-ls-sbc.ts` — LS/SBC supplemental seed

### Build Command (after frontend changes)
```
cd artifacts/enginevault && PORT=8099 BASE_PATH=/ pnpm run build
```

## EngineVault Build Sheet

### Engine Record Sheet (`/build-sheets/record`)
File: `artifacts/enginevault/src/pages/shop-tools/build-sheet.tsx`
- Engine selector (LS1, SBC 350, Coyote 5.0) via `GET /api/engines/:slug`
- Color-coded clearance fields, plan-tier gating, save/load builds
- API routes: `GET /api/engines/:slug`, `POST /api/builds`, `GET /api/builds/:id`, `POST /api/builds/:buildId/fields`
- DB tables: `builds`, `field_entries`; `engines.slug` column populated for ls1/sbc350/coyote50
