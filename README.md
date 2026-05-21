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

SafariCharge now uses Supabase magic links exclusively—no passwords or NextAuth flows. To sign in, go to `/login`, enter your email, and click "Send Login Link." Supabase sends a magic link that redirects to `/auth/callback`, where the session is exchanged and a profile row is ensured.

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

- `AUTH_VALIDATION_WINDOW_MS` — Controls how often middleware performs remote Supabase token validation. Default: `60000` (60 seconds).
- `AUTH_TIMING_DEBUG` — Set to `1` to print per-request auth timing logs.

SafariCharge is a **Next.js 16 + TypeScript** energy simulation and optimization dashboard for solar, battery storage, grid interaction, and EV charging.

## Core Features

- **Real-time simulation dashboard** with solar, battery, grid, and load flows.
- **Kenya-focused energy modeling** including KPLC tariff logic and location-aware solar assumptions.
- **AI assistant endpoint** for actionable optimization recommendations from system data.
- **Report generation** via CSV exports and formal report rendering.
- **Operational readiness endpoint** (`/api/health`) with readiness + uptime metadata.
- **Security controls** for API routes: bearer token auth, request signature verification, RBAC, rate limiting.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** React 19, Tailwind CSS, shadcn/ui + Radix primitives
- **State / Data:** Zustand, TanStack Query/Table
- **Validation:** Zod
- **Database:** Prisma with SQLite by default (Postgres recommended for production)

## Getting Started

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

Open: `http://localhost:3000`

## Production Notes

- Use **PostgreSQL** instead of default SQLite.
- Configure `API_SERVICE_TOKEN` and `API_ALLOWED_ORIGINS` before deployment.
- Keep secrets in secure env management (not in source control).

<!-- deploy: trigger -->
