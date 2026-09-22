# وريف | Wareef

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- The approved prototype is the design specification for the real app. Preserve its original layouts and journeys rather than replacing them with a new interpretation. The separate prototype remains a demonstration.
- Saudi gardening marketplace: mobile-first, Arabic by default with right-to-left layout, plus an English option.
- Chosen visual direction: natural modern gardening identity with forest green #1F5C43 (pressed #174733), sage #EAF3E8, warm white #F8FAF6, white surfaces, text #1F2F26 / #5F7065, and borders #DEE8DD. This replaces the earlier orange direction.
- Display وريف and Wareef legibly together; white wordmark on dark green, forest green on light surfaces. Preserve semantic labeled status colors and shared interaction states.
- Preserve the “Introduce us to your garden” experience. Include optional garden naming and upfront per-service provider pricing.
- The preferred customer design is the original garden-photo homepage with “حديقتك تستحق عناية تُرى”, not the category-first redesign. Add farms as a separate section while preserving that homepage; use a gentle garden-photo slideshow.
- Customers must be able to browse services and products and prepare their selection without signing in. Require authentication only at final order submission and retain the selection through sign-in.
- AI garden designer implementation is deferred until later; it is not a prerequisite for the customer browsing and ordering release. Preserve the approved design reference.
- The requested mock specialist is for testing only: clearly label its listings and requests, exclude it from production, and never use it to bypass real provider/admin permissions. Keep missing prices and ratings unknown rather than inventing them.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
