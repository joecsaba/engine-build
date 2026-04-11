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

## EngineVault Build Sheet

The interactive build sheet at `/shop-tools/build-sheet` (`artifacts/enginevault/src/pages/shop-tools/build-sheet.tsx`) provides:
- Engine selector (LS1, SBC 350, Coyote 5.0) with specs loaded from `GET /api/engines/:slug`
- Color-coded clearance fields (green=OK, yellow=WARN, red=LOW/HIGH)
- Per-cylinder grids for ring gap and piston-to-wall
- Camshaft, Parts List, Torque Specs, and Notes tabs
- Plan-tier gating (Free/Builder/Shop/Enterprise)
- Enterprise spec-override modal
- Save Build (`POST /api/builds`) with build ID returned, Load Build (`GET /api/builds/:id`)
- Per-field writes (`POST /api/builds/:buildId/fields`) for Shop/Enterprise tiers
- Export PDF via `window.print()` with print stylesheet hiding nav/controls

### DB Tables Added
- `builds` — id, name, engine_slug, user_id, plan_tier, state_json, created_at, updated_at
- `field_entries` — id, build_id, field_key, value, user_id, updated_at

### Engine Slug Column
- `engines.slug` column added (nullable); populated for LS1 (`ls1`), SBC 350 4-bolt (`sbc350`), Coyote 5.0 (`coyote50`)

### New API Routes (in `artifacts/api-server/src/routes/builds.ts`)
- `GET /api/engines/:slug`
- `POST /api/builds`
- `GET /api/builds/:id`
- `POST /api/builds/:buildId/fields`
