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

## Engine-Build Application

**Artifact:** `artifacts/engine-build` (frontend) + `artifacts/api-server` (backend, port 8080)

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
- `PageHeader` component: `artifacts/engine-build/src/components/layout/PageHeader.tsx`

### Authentication
- Clerk auth integrated (provisioned via `setupClerkWhitelabelAuth`)
- Server: `@clerk/express` clerkMiddleware in `app.ts`, proxy at `/__clerk`
- Client: `ClerkProvider` in `App.tsx` wrapping `WouterRouter` content
- Sign-in page: `/sign-in`, Sign-up page: `/sign-up`
- Navbar shows "Sign In" / "Create Account" when logged out; user name + "Sign Out" when logged in

### Cross-Tool State
- `BuildContext` (`artifacts/engine-build/src/context/BuildContext.tsx`) — persists cam recommendation across pages via `localStorage` key `enginevault_build_v1` (key name retained for user data continuity)
- Cam Guide Section 3 "Recommender" → "Save to Build Planner" button saves structured cam spec
- Build Planner shows cam recommendation banner when one is saved (gas platforms only)

### Key Data Files
- `artifacts/engine-build/src/data/buildParts.ts` — Build Planner parts catalog (imports diesel from dieselParts.ts)
- `artifacts/engine-build/src/data/dieselParts.ts` — Diesel platforms: Cummins 12V, Cummins 6.7L, Ford PS 7.3L, Ford PS 6.0L, Ford PS 6.7L, Duramax 6.6L
- `lib/db/src/seed.ts` — Database seed
- `lib/db/src/seed-ls-sbc.ts` — LS/SBC supplemental seed

### Build Command (after frontend changes)
```
cd artifacts/engine-build && PORT=8099 BASE_PATH=/ pnpm run build
```

## Engine-Build Build Sheet

### Engine Record Sheet (`/build-sheets/record`)
File: `artifacts/engine-build/src/pages/shop-tools/build-sheet.tsx`
- Engine selector (LS1, SBC 350, Coyote 5.0) via `GET /api/engines/:slug`
- Color-coded clearance fields, plan-tier gating, save/load builds
- API routes: `GET /api/engines/:slug`, `POST /api/builds`, `GET /api/builds/:id`, `POST /api/builds/:buildId/fields`
- DB tables: `builds`, `field_entries`; `engines.slug` column populated for ls1/sbc350/coyote50
