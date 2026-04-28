# SafariCharge

![CI](https://github.com/rauell1/safaricharge/actions/workflows/ci.yml/badge.svg)

<!-- AUTO-UPDATED: do not edit this block manually -->
| | |
|---|---|
| **Last commit** | [`unknown`](https://github.com/rauell1/safaricharge/commit/) by unknown |
| **Date** | unknown |
| **Message** |  |
| **Total commits** | ? |
| **TypeScript files** | ? |
<!-- END AUTO-UPDATED -->

































































## Local Workflow Fallbacks

When GitHub Actions is unavailable (for example billing/spending limits), run workflow equivalents locally:

- `npm run workflow:local:readme` - mirrors `update-readme.yml`
- `npm run workflow:local:codebase-map` - mirrors `update-codebase-map.yml`
- `npm run workflow:local:rollback` - mirrors `update-rollback.yml`
- `npm run workflow:local:ci` - mirrors `ci.yml` (`typecheck` + `build`)
- `npm run workflow:local:all` - runs all of the above in sequence

## Authentication

SafariCharge now uses Supabase magic links exclusively—no passwords or NextAuth flows. To sign in, go to `/login`, enter your email, and click “Send Login Link.” Supabase sends a magic link that redirects to `/auth/callback`, where the session is exchanged and a profile row is ensured.

### Profiles table

Create this table in Supabase to track subscription state:

```sql
create table profiles (
  id uuid references auth.users on delete cascade,
  email text,
  subscription_status text default 'inactive',
  plan text default 'free',
  created_at timestamp default now(),
  primary key (id)
);
```

Dashboard access requires an authenticated session and an `active` `subscription_status`; otherwise users are redirected to `/pricing`.

## Auth Performance Tuning

SafariCharge includes auth-path timing instrumentation and a tunable server-side validation cadence to improve sign-in speed while preserving session safety.

### Environment variables

- `AUTH_VALIDATION_WINDOW_MS`
  - Controls how often middleware performs remote Supabase token validation (`getUser`) after a successful session check.
  - Default: `60000` (60 seconds).
  - Recommended range: `30000` to `120000`.
  - Lower values increase security strictness and network calls; higher values reduce auth-check overhead and improve navigation responsiveness.

- `AUTH_TIMING_DEBUG`
  - Set to `1` to print per-request auth timing logs in server output.
  - Leave unset (or `0`) in normal operation.

### Runtime timing headers

When authentication paths execute, responses include timing headers:

- `Server-Timing`
  - Middleware metrics: `ttl_check`, `supabase_get_session`, optional `supabase_get_user`, `total`
  - Callback metrics: `exchange_code_for_session`, `profile_upsert`, optional `onboarding_check`, `total`

- `x-auth-middleware-ms`
  - Total middleware auth-gate time in milliseconds.

- `x-auth-callback-ms`
  - Total `/auth/callback` handler time in milliseconds.

### How to verify improvements

1. Open browser DevTools, then Network.
2. Sign in using your normal flow.
3. Open requests for `/auth/callback` and the first protected route load.
4. Compare `Server-Timing`, `x-auth-callback-ms`, and `x-auth-middleware-ms` before and after tuning `AUTH_VALIDATION_WINDOW_MS`.






























































































































































































































































SafariCharge is a **Next.js 16 + TypeScript** energy simulation and optimization dashboard for solar, battery storage, grid interaction, and EV charging.

It combines:
- interactive power-flow simulation,
- AI-assisted optimization insights,
- report generation/export,
- and operational API protections (auth, CORS, RBAC, rate limits).

## Core Features

- **Real-time simulation dashboard** with solar, battery, grid, and load flows.
- **Kenya-focused energy modeling** including KPLC tariff logic and location-aware solar assumptions.
- **AI assistant endpoint** for actionable optimization recommendations from system data.
- **Report generation** via:
  - CSV exports (`/api/export-report`),
  - formal report rendering (`/api/formal-report`).
- **Operational readiness endpoint** (`/api/health`) with readiness + uptime metadata.
- **Security controls** for API routes:
  - bearer token service auth,
  - request signature verification,
  - role-based access controls,
  - configurable rate limiting.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS, shadcn/ui + Radix primitives
- **State / Data:** Zustand, TanStack Query/Table
- **Validation:** Zod
- **Database:** Prisma (`@prisma/client`) with SQLite by default (Postgres recommended for production)
- **AI Provider SDK:** OpenAI-compatible client + Gemini/Z.AI integration paths

## Project Structure

```text
src/
  app/
    api/                # Route handlers (AI, export, formal report, health)
    demo/               # Demo dashboard routes
    simulation/         # Simulation page
  components/           # Reusable UI + dashboard feature components
  hooks/                # Simulation/data hooks
  lib/                  # Security, config, physics, finance, recommendation utilities
  simulation/           # Simulation engines (time, solar, runner)
  stores/               # Zustand store
  types/                # Shared TS types
```

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Set values relevant to your environment (especially for production):
- `DATABASE_URL`
- `API_SERVICE_TOKEN`
- `API_ALLOWED_ORIGINS`
- optional AI keys (`GEMINI_API_KEY`, `ZAI_API_KEY`)
- optional rate-limit tuning variables

### 3) Run database setup (Prisma)

```bash
npm run db:generate
npm run db:push
```

### 4) Start gitnexus server

```bash
npm run gitnexus
```

### 5) Start development server

```bash
npm run dev
```

Open: `http://localhost:3000`

## Authentication & magic-link setup (Resend)

1. Verify a sending domain in **Resend** and create an API key with "Sending" scope.
2. Add the following to your `.env` (adjust domains/addresses to your org):
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=generate-a-strong-secret
   RESEND_API_KEY=your_resend_api_key
   EMAIL_FROM="SafariCharge <you@yourdomain.com>"
   ADMIN_EMAIL=you@yourdomain.com
   ```
3. Ensure the database is available (`npm run db:push` for local SQLite) so NextAuth can store users.
4. Start the app with `npm run dev` and visit `/login`. Magic links are sent via Resend and expire after 10 minutes.
5. To temporarily pause sign-in without code changes, set `NEXT_PUBLIC_SIGN_IN_ENABLED=false` in your environment.

## Available Scripts

- `npm run dev` — run Next.js in development mode on port 3000
- `npm run build` — build production output (including standalone artifact copy steps)
- `npm run start` — run production standalone server
- `npm run lint` — run ESLint
- `npm run gitnexus` — run gitnexus server
- `npm run db:generate` — generate Prisma client
- `npm run db:push` — push Prisma schema to DB
- `npm run db:migrate` — create/run Prisma migrations (dev)
- `npm run db:reset` — reset database (destructive)

## API Routes

- `GET /api/health`
  - Liveness/readiness metadata (`status`, `readiness`, `timestamp`, `version`, `uptimeSeconds`)
- `POST /api/safaricharge-ai`
  - AI analysis for dashboard/system data
- `POST /api/export-report`
  - CSV export workflow
- `POST /api/formal-report`
  - Formal report payload processing/render support
- `POST /api/dvshave-harness`
  - Runs DVShave validation scenarios (custom or default matrix) and returns pass/fail + KPI summary

## Production Notes

- Use **PostgreSQL** (or another production-grade DB) instead of default SQLite.
- Configure `API_SERVICE_TOKEN` and `API_ALLOWED_ORIGINS` before deployment.
- Tune rate limits via environment variables for expected traffic.
- Keep secrets in secure env management (not in source control).

## Additional Docs

- `USER_GUIDE.md` — end-user workflow and feature walkthrough
- `INTEGRATION.md` — integration details
- `IMPLEMENTATION.md` / `IMPLEMENTATION_SUMMARY.md` — architecture and implementation notes
- `SECURITY_PERFORMANCE_RELIABILITY_AUDIT_2026-04-02.md` — audit report details
- `SCIENTIFIC_TECHNICAL_AUDIT_2026-04-10.md` — scientific/technical model audit and roadmap
- `ENGINEERING_ISSUES_V2_2026-04-10.md` — issue-ready implementation backlog (v2.0)
- `ROLLBACK.md` — rollback guidance
