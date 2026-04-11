# SafariCharge — Codebase Map

> **Auto-generated** · Last updated: 2026-04-11 · Branch: `main`  
> Do not edit manually — updated automatically on every push to `main` via `.github/workflows/update-codebase-map.yml`

---

## Repository Root

```
safaricharge/
├── .agents/                          # Copilot agent skill definitions
├── .github/
│   └── workflows/
│       └── update-codebase-map.yml  # AUTO-UPDATE: regenerates this file on push
├── .githooks/                        # Git hooks (pre-commit lint, etc.)
├── docs/                             # Extended documentation
├── examples/                         # Example configs / payloads
├── forecasting/                      # Python forecasting micro-service
│   └── pv_load_service/              # GBR models, quantile bands, seasonal fallback
├── prisma/                           # Prisma ORM schema + migrations
├── public/                           # Static assets served by Next.js
├── python/                           # Python utilities / validation scripts
├── scripts/                          # Dev/CI helper scripts
├── src/                              # Main Next.js application source
├── validation/                       # pvlib/SAM validation harness outputs
├── .env.example                      # Env-var reference (never commit .env)
├── Caddyfile.txt                     # Caddy reverse-proxy config (production)
├── CODEBASE_MAP.md                   # ← this file
├── ENGINEERING_ISSUES_V2_2026-04-10.md
├── IMPLEMENTATION.md
├── IMPLEMENTATION_SUMMARY.md
├── INTEGRATION.md
├── README.md
├── ROLLBACK.md
├── SCIENTIFIC_TECHNICAL_AUDIT_2026-04-10.md
├── SECURITY_PERFORMANCE_RELIABILITY_AUDIT_2026-04-02.md
├── USER_GUIDE.md
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## `src/` — Application Source

### `src/app/` — Next.js App Router

| Path | Purpose |
|---|---|
| `src/app/layout.tsx` | Root layout — fonts, global providers |
| `src/app/page.tsx` | Root redirect (→ `/demo`) |
| `src/app/error.tsx` | Global error boundary |
| `src/app/globals.css` | CSS custom properties, Tailwind base, dark-mode tokens |
| `src/app/api/` | Next.js Route Handlers (server-side API) |
| `src/app/demo/` | Demo page — full dashboard with simulated data |
| `src/app/scenarios/` | Scenario management & comparison UI (Issue D) |
| `src/app/simulation/` | Simulation runner page |
| `src/app/component-knowledge-base/` | Internal component reference / Storybook-lite |

#### `src/app/api/` — API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/forecast` | `POST` | Proxy → Python `pv_load_service`; returns P10/P50/P90 bands |
| *(others)* | — | Auth, telemetry, system-config endpoints |

---

### `src/components/` — React Components

#### `src/components/dashboard/` — Dashboard Cards & Layout

| File | Purpose |
|---|---|
| `AlertsList.tsx` | Active alerts list with severity badges |
| `BatteryHealthCard.tsx` | Battery SoH, temperature, degradation timeline |
| `BatteryPredictionCard.tsx` | AI-powered remaining-life prediction |
| `BatteryStatusCard.tsx` | Real-time SoC gauge + power flow |
| `DashboardHeader.tsx` | Top nav bar — logo, time, dark-mode toggle, alerts bell |
| `DashboardLayout.tsx` | Sidebar + main-content shell |
| `DashboardSidebar.tsx` | Navigation tree — dashboard, scenarios, simulation, settings |
| `EnergyDetailShell.tsx` | Shared card shell for energy detail views |
| `EngineeringKpisCard.tsx` | **Issue E** — Specific Yield, PR, Capacity Factor, Battery Cycles + sparkline |
| `InsightsBanner.tsx` | AI insights ribbon |
| `PanelStatusTable.tsx` | Per-string/panel telemetry table |
| `PowerFlowVisualization.tsx` | Animated Sankey-style power-flow diagram |
| `Sparkline.tsx` | Reusable 48px area sparkline (Recharts) |
| `StatCards.tsx` | Top KPI stat cards (solar, load, grid, battery) |
| `SystemVisualization.tsx` | Full system diagram SVG |
| `TimeRangeSwitcher.tsx` | 1h / 6h / 24h / 7d time-range toggle |
| `WeatherCard.tsx` | Weather conditions + irradiance |
| `AIAssistant/` | Conversational AI assistant panel |
| `index.ts` | Barrel export |
| `README.md` | Component-level documentation |

#### `src/components/ui/` — shadcn/ui Primitives

Card, Tooltip, Button, Badge, Dialog, Select, Tabs, Input, etc.

---

### `src/lib/` — Business Logic & Utilities

| File | Purpose | Size |
|---|---|---|
| `auto-sizing-wizard.ts` | System auto-sizing engine (PV + battery capacity recommendations) | 19 kB |
| `battery-economics.ts` | LCOE, payback, NPV, ROI calculations | 13 kB |
| `config.ts` | App-wide feature flags and runtime config | 6 kB |
| `db.ts` | Prisma client singleton | 0.5 kB |
| `dc-ac-optimizer.ts` | DC:AC ratio optimiser (clipping vs. production trade-off) | 8 kB |
| `demoEnergyState.ts` | Deterministic demo data generator | 8 kB |
| `dvshave-harness.ts` | pvlib/SAM delta-validation harness (Issue B) | 7 kB |
| `engineeringKpis.ts` | IEC 61724-1 KPI calculations — Specific Yield, PR, CF, cycles (Issue E) | 3.5 kB |
| `financial-dashboard.ts` | Financial metrics aggregation for dashboard | 8 kB |
| `intelligence.ts` | AI insight generation orchestrator | 1 kB |
| `load-validator.ts` | Load profile validation and normalisation | 13 kB |
| `logger.ts` | Structured logger (pino wrapper) | 0.8 kB |
| `nasa-power-api.ts` | NASA POWER API client — irradiance, weather | 10 kB |
| `physics-engine-bridge.ts` | TS↔Python physics engine IPC bridge | 8 kB |
| `physics-engine.ts` | Core energy simulation physics (SoC, thermal, degradation) | 16 kB |
| `recommendation-engine.ts` | Recommendation logic for system optimisation | 28 kB |
| `security.ts` | Input sanitisation, rate-limit helpers, CSRF | 6 kB |
| `serverConfig.ts` | Server-side validated env config | 2.3 kB |
| `solar-component-catalog.ts` | PV panel + inverter + battery hardware catalog | 22 kB |
| `system-config.ts` | System configuration schema + defaults | 17 kB |
| `tariff-config.ts` | Kenya electricity tariff configuration | 2 kB |
| `tariff.ts` | Tariff calculation utilities | 2.7 kB |
| `utils.ts` | `cn()` and misc utilities | 0.2 kB |
| `validateEnv.ts` | Env-var validation (zod) | 3.7 kB |
| `services/` | External service integrations (weather, auth, etc.) |

---

### `src/stores/` — Zustand State Stores

| File | Purpose |
|---|---|
| `energySystemStore.ts` | **Primary store** — simulation clock, minuteData ring-buffer, accumulators, systemConfig, solarData |
| `forecastStore.ts` | PV + load forecast state (P10/P50/P90 bands, loading flags) |

---

### `src/simulation/` — Simulation Engine

Runs the real-time energy simulation loop, fed by `physics-engine.ts` and drives `energySystemStore`.

### `src/hooks/` — Custom React Hooks

Use-* hooks for simulation clock, keyboard shortcuts, responsive layout, etc.

### `src/types/` — TypeScript Type Definitions

Shared interfaces: `SystemConfig`, `MinuteDataPoint`, `ScenarioConfig`, `ForecastResult`, etc.

### `src/middleware.ts` — Next.js Middleware

Auth guards, rate limiting, security headers, route matching (4 kB).

### `src/instrumentation.ts` — OpenTelemetry

OTel SDK initialisation for tracing + metrics.

---

## `forecasting/` — Python Forecasting Micro-service

```
forecasting/
└── pv_load_service/
    ├── main.py          # FastAPI app — POST /forecast
    ├── models.py        # Pydantic request/response schemas
    ├── trainer.py       # GBR model training + serialisation
    ├── predictor.py     # Inference — P10/P50/P90 quantile bands
    ├── seasonal.py      # Seasonal fallback (no-model cold-start)
    └── requirements.txt
```

Called from `src/app/api/forecast/route.ts` via HTTP.

---

## `validation/` — pvlib / SAM Harness (Issue B)

Python scripts that run pvlib and SAM against the same inputs as the TypeScript physics engine and produce a delta report (`validation_report.json`).

---

## `prisma/` — Database Schema

Postgres via Prisma. Models include: `User`, `Site`, `SystemConfig`, `SimulationRun`, `Scenario`, `Alert`.

---

## Key Data-Flow

```
[NASA POWER API]
      │ irradiance / weather
      ▼
[physics-engine.ts]  ←──── systemConfig (from DB / store)
      │ minuteDataPoint every sim-tick
      ▼
[energySystemStore]  ─────► [Dashboard Components]
      │                           │
      │                    [EngineeringKpisCard]
      │                    [BatteryStatusCard]
      │                    [PowerFlowVisualization]
      │                    [StatCards] …
      │
      ▼
[forecasting/pv_load_service]  ◄── POST /api/forecast
      │ P10 / P50 / P90
      ▼
[forecastStore]  ──────────► [DailyEnergyGraph overlay]
```

---

## Dependency Overview

| Category | Libraries |
|---|---|
| **Framework** | Next.js 15 (App Router), React 19 |
| **State** | Zustand |
| **UI** | shadcn/ui, Tailwind CSS v4, Lucide icons |
| **Charts** | Recharts |
| **DB** | Prisma + PostgreSQL |
| **Validation** | Zod |
| **Auth** | NextAuth.js |
| **Forecasting** | FastAPI, scikit-learn (GBR), pandas |
| **Observability** | OpenTelemetry, Pino |
| **Tooling** | Bun, ESLint, TypeScript 5 |

---

*This file is regenerated automatically by `.github/workflows/update-codebase-map.yml` on every push to `main`.*
