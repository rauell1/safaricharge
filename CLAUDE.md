# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start dev server on port 3000 (Turbopack)
npm run build         # Production build (standalone output)
npm run typecheck     # tsc --noEmit (filter out .next/ cache noise with grep -v '\.next')
npm run lint          # ESLint
npm run test          # Vitest unit tests (run once)
npm run test:watch    # Vitest in watch mode
npx vitest run src/lib/physics-engine.test.ts   # Run a single test file
npm run seed          # Seed Supabase with demo data
```

**TypeScript note:** `next.config.ts` sets `ignoreBuildErrors: true`, so `tsc --noEmit` is the only TS gate. The `.next/dev/types/` folder generates spurious errors — always filter with `| grep -v '\.next'`.

## Architecture Overview

### Auth & Routing

- Root `/` is a **server component** that checks Supabase session and redirects:
  - Admin users → `/admin`
  - Authenticated users → `/dashboard`
  - Everyone else → `/landing`
- Middleware (not shown as a file here but referenced in code) protects routes not in a `PUBLIC_EXACT` list. `/sizing` requires auth.
- Two Supabase client factories:
  - `src/lib/supabase.ts` — `createClient()` for **browser** components (`@supabase/ssr` `createBrowserClient`)
  - `src/lib/supabase-server.ts` — `createServerSupabaseClient()` for **server** components and API routes (`@supabase/ssr` `createServerClient` + `cookies()`)
- Do **not** use Prisma — this repo uses Supabase JS SDK directly.

### Zustand Store — Single Source of Truth

`src/stores/energySystemStore.ts` (`useEnergySystemStore`) is the central state for the entire simulation:

- `systemConfig` — UI-level config: `solarCapacityKW`, `batteryCapacityKWh`, `inverterKW`, `systemMode`, `batteryDodPct`, `gridOutageEnabled`, `gridTariff`, `loadProfile?`
- `fullSystemConfig: SystemConfiguration` — detailed physics config driving the tick loop
- `activeLocation: LocationOption` — current city (`name`, `displayName`, `annualAvgSunHours`, `lat`, `lng`, …)
- `minuteData: MinuteDataPoint[]` — rolling buffer (max 420×30 points) of per-tick simulation data
- `accumulators` — running totals: `solar`, `savings`, `gridImport`, `carbonOffset`, `batDischargeKwh`, `feedInEarnings`
- `scenarios: SavedScenario[]` — persisted to Supabase via optimistic updates with rollback on error

Key actions: `updateSystemConfig()`, `setActiveLocation()`, `applySimulationTick()`, `resetSystem()`, `saveScenario()`, `loadScenario()`.

### Simulation Tick Loop

`src/hooks/useDemoEnergySystem.ts` drives the real-time sim:
- 420 ticks/day at `BASE_INTERVAL_MS = 100ms` (≈42s wall-clock per simulated day at 1×)
- Speed multiplier: interval = `BASE_INTERVAL_MS / simSpeed`
- Calls `usePhysicsSimulation` → `src/lib/physics-engine.ts` (`calculateInstantPhysics`)
- Each tick writes a `MinuteDataPoint` to the store via `applySimulationTick()`

**Do not import from `src/simulation/`** — that directory is legacy and replaced by `src/lib/physics-engine.ts` + `src/lib/physics-engine-bridge.ts`.

### Parametric Sizing Engine

`src/lib/sizing/` contains the offline sizing engine:
- `mockData.ts` — `INVERTER_CATALOG`, `PANEL_CATALOG`, `BATTERY_CATALOG`, `SOLAR_LOCATIONS`, `LOAD_PROFILES`, `PROJECT_PRESETS`, `KSH_PER_USD = 127.5`
- `solarCalculator.ts` — `runSimulation(inputs: SimulationInputs): SimulationResults`
  - 24-hour hourly dispatch, IEC 60364-5-52 cable sizing (Method C, ampacity + voltage drop, 1–4 parallel runs)
  - Financial: NPV, IRR (secant method), LCOE, 25-year cash flows
  - Battery tiers: LV48 (≤51.2 kWh), Stack100 (≤200 kWh), Stack280 (otherwise)

`/sizing` page: two-column layout — `ParametricInputs` (sticky, 420px) + `SimulationResults`. 300ms debounce on `runSimulation()`.

`SizingDispatchPanel` in `src/components/simulation/SizingDispatchPanel.tsx` bridges the real-time Zustand store to the sizing engine via `buildInputs(systemConfig, locationName)`.

### Simple vs Advanced Simulation UI

`/demo` page (`src/app/demo/page.tsx`) toggles between two modes via `useUserPreference<'simple' | 'advanced'>('sc_sim_view_mode', 'simple')`:
- **Simple** → `SimpleDashboard` component: rolling 60-point SVG chart, KPI cards, `LoadProfilePicker`, speed controls
- **Advanced** → Accordion with SLD (`SimulationNodes`), `ValidationPanel`, `SizingDispatchPanel`

`useUserPreference<T>(key, defaultValue)` (`src/hooks/useUserPreference.ts`) initialises from localStorage synchronously, hydrates from Supabase on mount, writes both on change.

## Key Conventions

### Client vs Server Components
All interactive/store-using components need `'use client'` at the top. Server components fetch from Supabase directly.

### CSS Design Tokens
All colours are CSS variables — never hardcode hex/rgba outside `:root`/`.dark` in `src/app/globals.css`. Key semantic tokens:
- `--solar`, `--battery`, `--grid`, `--ev` — energy type colours
- `--solar-soft`, `--battery-soft`, etc. — 10% alpha backgrounds for cards
- `--text-primary/secondary/tertiary/muted`, `--border`, `--bg-card`
- `--bg-card-muted = rgba(7,18,14,0.04)` — subtle muted card background

Use `cn()` from `@/lib/utils` for conditional Tailwind class merging.

### Import Aliases
- `@/lib/sizing/` — parametric sizing engine
- `@/stores/` — Zustand stores
- `@/hooks/` — React hooks
- `@/components/ui/` — shadcn/Radix primitives
- `@/lib/africa-locations-data` — `AFRICA_CITIES`, `AfricaCity` type

### Supabase Table Naming
All **new** tables from the sizing engine use the `sizing_` prefix:
- `sizing_projects`, `sizing_project_inputs`, `sizing_project_results`, `sizing_simulation_logs`

Existing simulation tables (no prefix): `scenarios`, `simulation_runs`, `simulation_data_points`, `user_preferences`, `profiles`.

### Location Data
`AFRICA_CITIES` from `@/lib/africa-locations-data` is the canonical city list. `AfricaCity` has `{ name, country, lat, lon, avgDailyPsh, annualGHI, avgTempC, elevation, region }`. To construct a `LocationOption` from a city name, look it up in `AFRICA_CITIES` and map the fields.

### Modal Portals
All Radix dialogs/sheets must use the `#modal-root` div (last child of `<body>`) as their container via the `useModalRoot` hook. This prevents fixed-position dialogs from being mis-positioned inside the sidebar layout.

### AI Assistant
`GEMINI_API_KEY` → Google Gemini (primary). Falls back to Z.AI (`ZAI_API_KEY`) with `glm-5-turbo`. Both are server-side only in `src/app/api/safaricharge-ai/route.ts`.

## Route Structure

| Route | Purpose | Auth |
|---|---|---|
| `/` | Redirect dispatcher (server) | — |
| `/landing` | Marketing landing page | Public |
| `/login`, `/signup` | Auth pages | Public |
| `/demo` | Main simulation dashboard | Public (but features gated) |
| `/sizing` | Parametric sizing engine | Auth required |
| `/dashboard` | Full authenticated dashboard | Auth required |
| `/admin` | Admin panel (admin users only) | Admin cookie |
| `/energy-intelligence` | AI insights | Auth |
| `/export` | Report export | Auth |
| `/onboarding` | First-run setup | Auth |

## Deployment

- Hosted on **Vercel** (project `sc-solardashboard`, org `team_dexcJME1NOvfDttJI51sZGYV`)
- `next.config.ts` uses `output: 'standalone'` and wraps with `withWorkflow()`
- Auto-doc bots (README, codebase map, rollback log) commit on push — always `git pull --rebase` before pushing if CI has committed since your last pull

## Environment Variables

Required:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Optional:
```
SUPABASE_SERVICE_ROLE_KEY   # Server-side admin ops
GEMINI_API_KEY              # AI assistant (Gemini primary)
ZAI_API_KEY                 # AI assistant (fallback)
ADMIN_EMAIL / ADMIN_EMAILS  # Comma-separated admin emails
ADMIN_PASSWORD              # Auto-seeded admin password
ADMIN_SESSION_SECRET        # HMAC secret for admin cookie
```
