# Threat Model

## Project Overview

Wareef (وريف) is a Saudi gardening marketplace, currently a mobile-first,
Arabic-default (RTL) **visual prototype**. The repo is a pnpm workspace:

- `artifacts/api-server` — Express 5 API (the only production backend), authenticated with Clerk (`@clerk/express`), PostgreSQL via Drizzle ORM, Zod validation from an OpenAPI-generated spec.
- `artifacts/wareef-app` — React (Vite) SPA using Clerk for auth and TanStack Query.
- `artifacts/mockup-sandbox` — design/component preview surface (`/__mockup`), development/design only.
- `lib/*` — shared packages: `db` (Drizzle schema), `api-zod` (generated Zod schemas), `api-client-react` (generated client + custom fetch), `api-spec` (OpenAPI + Orval codegen).

## Assets

- **User profile records** (`users` table) — id (Clerk user id), role, displayName, phone, city, preferredLanguage. Contains PII (phone, city).
- **User role** — `customer | provider_owner | admin`. Governs future privilege boundaries; must be server-assigned only.
- **Application secrets** — `CLERK_SECRET_KEY`, `DATABASE_URL`. Server-side only.
- **Clerk session** — cookie-based session for the web app; the trust anchor for all authenticated requests.

## Trust Boundaries

- **Browser ↔ API** — all `/api/*` requests. The API must authenticate (Clerk) and scope every data access to the caller. The client is untrusted.
- **API ↔ PostgreSQL** — Drizzle queries; all current queries are parameterized and scoped by `eq(usersTable.id, req.userId)`.
- **API ↔ Clerk Frontend API** — `clerkProxyMiddleware` proxies `/api/__clerk/*` to a fixed upstream (`https://frontend-api.clerk.dev`); production-only, target is not user-controlled.
- **Public vs authenticated** — `/api/healthz` is public; `/api/me`, `/api/me` (PATCH), `/api/me/security-summary` require a valid Clerk session.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/me.ts`, `artifacts/api-server/src/routes/health.ts`.
- Auth enforcement: `artifacts/api-server/src/middleware/requireAuth.ts` (Clerk `getAuth`, 401 when no userId). All `/me*` routes are gated and query by the authenticated `req.userId` only — no request-supplied object ids.
- Mass-assignment guard: `UpdateCurrentUserBody` (`lib/api-zod/src/generated/api.ts`) is a default (non-passthrough) Zod object; unknown keys (e.g. `role`) are stripped before the Drizzle update. Role is never client-writable.
- Clerk proxy: `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` — fixed upstream, no SSRF, production-only.
- Dev/design-only (ignore unless proven production-reachable): `artifacts/mockup-sandbox/**`, `backups/**`, `attached_assets/**`.

## Threat Categories

### Spoofing / Improper Authentication

Authentication is delegated to Clerk. `requireAuth` rejects requests without a
resolved `userId`. The web app uses cookie-based Clerk sessions; the publishable
key (`VITE_CLERK_PUBLISHABLE_KEY`) is public by design. No custom token parsing
or homegrown session logic exists. No spoofing weakness identified.

### Elevation of Privilege

`role` defaults to `customer` server-side and is never accepted from client
input (Zod strip + no code path writes role from the request body). The
`/me/security-summary` endpoint only reports the caller's own role. No
privilege-escalation path identified.

### Information Disclosure (access control / IDOR)

All data access is keyed on `req.userId` from the verified Clerk session; there
are no request-supplied object identifiers (`userId`, etc.) and no list/export
endpoints. Cross-user/cross-tenant access is not reachable in the current API.

### Tampering / Injection

All DB access uses Drizzle parameterized queries with typed equality on the
primary key. Request bodies are validated by generated Zod schemas. No string
concatenation into SQL, shell, or HTML. The only `dangerouslySetInnerHTML`
usage (`components/ui/chart.tsx`) injects theme CSS from static config, not user
input.

### Security Misconfiguration

CORS is enabled globally with default options (`app.use(cors())`), which
reflects a permissive `Access-Control-Allow-Origin: *` without
`Access-Control-Allow-Credentials`. Because credentials are not allowed, browsers
block cross-origin reads of authenticated (cookie-based) responses, so this is a
defense-in-depth gap rather than an exploitable data-exposure path today. See
`.local/new_vulnerabilities/`.
