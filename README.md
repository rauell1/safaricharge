# SafariCharge

![CI](https://github.com/rauell1/safaricharge/actions/workflows/ci.yml/badge.svg)

SafariCharge is a **Next.js 15 + TypeScript** energy simulation and optimisation dashboard for solar PV, battery storage, grid interaction, and EV charging — built specifically for the Kenyan energy market.

It combines:
- real-time power-flow simulation driven by a TypeScript physics engine,
- AI-assisted optimisation insights and recommendations,
- quantile-band solar forecasting (P10/P50/P90) via a Python FastAPI micro-service,
- EV charging controls wired to the simulation store,
- report generation and CSV export,
- and full operational API protections (auth, CORS, RBAC, rate limits).

---

## Core Features

- **Real-time simulation dashboard** — solar, battery, grid, load, and EV charging flows rendered as animated power-flow diagrams.
- **Kenya-focused energy modelling** — KPLC tariff logic, location-aware irradiance from NASA POWER API, IEC 61724-1 KPIs (Specific Yield, PR, CF, Battery Cycles).
- **EV charging controls** — charge rate sliders and start/stop toggles wired directly to the simulation store (added in PR #174).
- **Quantile forecasting** — `POST /api/forecast` proxies to a Python FastAPI GBR model returning P10/P50/P90 daily energy bands.
- **AI assistant** — `POST /api/safaricharge-ai` for actionable optimisation recommendations from live system data.
- **Report generation** via CSV export (`/api/export-report`) and formal engineering report (`/api/formal-report`).
- **Scenario management** — save, compare, and replay simulation configurations at `/scenarios`.
- **Operational readiness** — `GET /api/health` with liveness, readiness, uptime, and version metadata.
- **Security controls** — bearer token auth, request signature verification, role-based access controls, configurable rate limiting.

---

## Tech Stack

| Category | Libraries |
|---|---|
| **Framework** | Next.js 15 (App Router), React 19 |
| **Language** | TypeScript 5 |
| **UI** | shadcn/ui, Tailwind CSS v4, Radix primitives, Lucide icons |
| **Charts** | Recharts |
| **State** | Zustand + Immer |
| **Data fetching** | TanStack Query / TanStack Table |
| **Validation** | Zod |
| **Database** | Prisma + SQLite (dev) · PostgreSQL recommended for production |
| **AI / LLM** | OpenAI-compatible client · Gemini / Z.AI integration paths |
| **Forecasting** | FastAPI, scikit-learn (GBR), pandas |
| **Observability** | OpenTelemetry, Pino |
| **Tooling** | Bun, ESLint (flat config), TypeScript 5, Node 24 |

---

## Project Structure

```text
safaricharge/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Root — renders full modular dashboard
│   │   ├── layout.tsx                # Fonts, global providers
│   │   ├── globals.css               # Tailwind base + CSS tokens + dark mode
│   │   ├── demo/                     # /demo — simulated data dashboard
│   │   ├── scenarios/                # /scenarios — compare system configs
│   │   ├── simulation/               # /simulation — manual sim runner
│   │   └── api/                      # Next.js Route Handlers
│   │       ├── forecast/             # → Python forecasting service
│   │       ├── scenarios/            # Scenario CRUD
│   │       ├── safaricharge-ai/      # AI insight generation
│   │       ├── export-report/        # CSV export
│   │       ├── formal-report/        # Engineering report
│   │       ├── health/               # Liveness + readiness check
│   │       ├── engine-output/        # Raw simulation output
│   │       ├── component-library/    # Solar component catalog
│   │       └── dvshave-harness/      # pvlib delta-validation
│   ├── components/
│   │   ├── dashboard/                # 19 dashboard card components
│   │   └── ui/                       # shadcn/ui primitives
│   ├── lib/                          # 26 business logic modules
│   ├── stores/                       # Zustand stores (energySystem, forecast)
│   ├── simulation/                   # Pure TS simulation engine
│   ├── hooks/                        # Custom React hooks
│   ├── types/                        # Shared TypeScript types
│   └── proxy.ts                      # Python bridge proxy
├── forecasting/
│   └── pv_load_service/              # FastAPI GBR forecasting micro-service
├── iot-bridge/                       # IoT device bridge (standalone)
├── prisma/                           # DB schema (SQLite dev)
├── Dockerfile
├── docker-compose.yml
└── eslint.config.mjs                 # Flat ESLint config
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
# or
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Key variables to set:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path (dev) or PostgreSQL URL (prod) |
| `API_SERVICE_TOKEN` | Bearer token for protected API routes |
| `API_ALLOWED_ORIGINS` | CORS allowlist |
| `GEMINI_API_KEY` | (optional) Gemini AI integration |
| `ZAI_API_KEY` | (optional) Z.AI integration |

### 3. Database setup

```bash
npm run db:generate
npm run db:push
```

### 4. Start development server

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

### 5. (Optional) Start forecasting service

```bash
cd forecasting/pv_load_service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Run production standalone server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to DB |
| `npm run db:migrate` | Create/run Prisma migrations (dev) |
| `npm run db:reset` | Reset database (destructive) |

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Liveness/readiness — `status`, `readiness`, `uptimeSeconds`, `version` |
| `/api/safaricharge-ai` | POST | AI analysis from dashboard/system data |
| `/api/forecast` | POST | Solar forecast P10/P50/P90 via Python GBR model |
| `/api/scenarios` | GET/POST | Save and retrieve simulation scenarios |
| `/api/export-report` | POST | CSV export |
| `/api/formal-report` | POST | Formal engineering report |
| `/api/engine-output` | POST | Raw physics engine output |
| `/api/dvshave-harness` | POST | pvlib delta-validation pass/fail + KPI summary |
| `/api/component-library` | GET | Solar component catalog (panels, inverters, batteries) |

---

## CI Pipeline

Three sequential jobs run on every push to `main`:

```
typecheck (tsc --noEmit)
        ↓
lint (eslint . --max-warnings=9999)
        ↓
build (next build)
```

The pipeline uses **Node 24** to avoid the Node 20 deprecation warnings from June 2026.

---

## Changelog — Major Changes

### 2026-04-12
- **Reverted PR #170** — removed PostgreSQL migration, IoT ingest API, and `/dashboard` redirect page. Dashboard is back at `/`. Schema is SQLite.
- **EV charging controls (PR #174)** — charge rate sliders and start/stop toggles wired to the simulation store.
- **CI fixed** — flat ESLint config repaired (global ignores ordering, dead imports removed, `src/stores/` and `src/simulation/` added to ignores). Node version bumped to 24.
- **`middleware.ts` replaced by `proxy.ts`** — Next.js 15 proxy pattern.
- **`immer` added** as an explicit dependency for Zustand middleware.
- **`CODEBASE_MAP.md`** is now auto-regenerated on every push to `main` via GitHub Actions.

---

## Production Notes

- Use **PostgreSQL** instead of SQLite for production — set `DATABASE_URL` accordingly and update `prisma/schema.prisma` provider.
- Configure `API_SERVICE_TOKEN` and `API_ALLOWED_ORIGINS` before deployment.
- The forecasting micro-service (`forecasting/pv_load_service/`) must be deployed separately and `FORECAST_SERVICE_URL` pointed at it.
- Tune rate limits via environment variables for expected traffic.
- Keep all secrets in secure env management — never commit `.env`.

---

## Additional Docs

| File | Contents |
|---|---|
| `CODEBASE_MAP.md` | Auto-generated file/module map (updated on every push) |
| `USER_GUIDE.md` | End-user workflow and feature walkthrough |
| `INTEGRATION.md` | Integration details |
| `IMPLEMENTATION.md` / `IMPLEMENTATION_SUMMARY.md` | Architecture and implementation notes |
| `ROLLBACK.md` | Rollback guidance |
| `SCIENTIFIC_TECHNICAL_AUDIT_2026-04-10.md` | Scientific/technical model audit and roadmap |
| `ENGINEERING_ISSUES_V2_2026-04-10.md` | Issue-ready implementation backlog (v2.0) |
| `SECURITY_PERFORMANCE_RELIABILITY_AUDIT_2026-04-02.md` | Security and performance audit |
