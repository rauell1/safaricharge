# SafariCharge

![CI](https://github.com/rauell1/safaricharge/actions/workflows/ci.yml/badge.svg)

<!-- AUTO-UPDATED: do not edit this block manually -->
| | |
|---|---|
| **Last commit** | [`d1e901b`](https://github.com/rauell1/safaricharge/commit/d1e901b89fd7ae66c0848b032fbfce43a5ca79ae) by Roy Otieno | Energy & Mobility Systems |
| **Date** | 2026-04-12 |
| **Message** | refactor: delete dashboard/ shim subfolders — dashboard/ is now empty |
| **Total commits** | 770 |
| **TypeScript files** | 147 |
<!-- END AUTO-UPDATED -->












































































































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

