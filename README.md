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






































































































































































SafariCharge is a **Next.js 15 + TypeScript** energy simulation and optimisation dashboard for solar PV, battery storage, grid interaction, and EV charging — built for the Kenyan and East African market.


---

## Core Features

### Simulation Dashboard
- **Single-line diagram (SLD)** visualising real-time solar → battery → inverter → load → grid flows
- **Physics engine** using manufacturer datasheet constants (Jinko Tiger Neo N-type TOPCon, Deye SG05LP3 / SG04LP1)
- **Time-of-use simulation** with configurable 24-hour demand profiles
- **EV charging simulation** with AC/DC charger presets up to 350 kW

### System Configuration
- **Inverter presets** — Deye SG04LP1-EU-SM2 (1Ø, 3.6–6 kW) and SG05LP3-EU-SM2 (3Ø, 3–20 kW) with full datasheet specs
- **EV charger presets** — Type 2 AC (7.4–22 kW) through Hypercharger DC (350 kW)
- **PV Sizing Calculator** — compute required panel count, battery capacity, LCOE, and payback period from daily load + location
  - Jinko Tiger Neo panel range: 400 W generic through 630 W bifacial TOPCon
  - Kenya county solar presets from measured irradiance data

### Financial Engine
- 25-year NPV / IRR / LCOE / ROI modelling
- Grid tariff escalation, self-consumption ratio, and export feed-in tariff
- Degradation model: 0.40 %/yr (Jinko 30-year linear warranty) — more accurate than the 0.50 %/yr generic assumption
- One-click **PDF / print report** and in-app **report generator** (6-page HTML report with SVG charts)

### Kenya-Specific Modelling
- KPLC tariff logic (off-peak / peak / super-peak blocks)
- 47-county solar irradiance presets (avg daily sun-hours + annual yield)
- Africa-focused inverter catalog (Deye, Growatt, Solis, Sunsynk, Victron, Goodwe, SMA, Must)

### Infrastructure
- **AI assistant endpoint** (`/api/ai-assistant`) for actionable optimisation recommendations
- **Health endpoint** (`/api/health`) — readiness + uptime metadata
- **Supabase magic-link auth** — no passwords; session exchange at `/auth/callback`
- **Security controls** — bearer token auth, request-signature verification, RBAC, rate limiting

---

## Hardware Specs Wired Into the Engine

| Component | Key datasheet values |
|---|---|
| Jinko Tiger Neo 66HL4M-BDV (605–630 W) | 23.14 % eff @ 625 W · Vmp 40.88 V · −0.29 %/°C · 0.40 %/yr · BNPI 690 Wp |
| Jinko Tiger Neo 72HL4-BDV (575–600 W) | 22.84 % eff @ 590 W · Vmp 44.17 V · −0.29 %/°C · 0.40 %/yr · BNPI 649 Wp |
| Deye SUN-xK-SG05LP3-EU-SM2 (3–20 kW, 3Ø) | 97.6 % max · 97.0 % Euro · >99 % MPPT · 800 V PV · 10-unit parallel |
| Deye SUN-xK-SG04LP1-EU-SM2 (3.6–6 kW, 1Ø) | 97.6 % max · 96.5 % Euro · >99 % MPPT · 500 V PV · 16-unit parallel |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | React 19 · Tailwind CSS · shadcn/ui + Radix |
| State / Data | Zustand · TanStack Query/Table |
| Validation | Zod |
| Database | Prisma + SQLite (Postgres recommended for production) |
| Auth | Supabase magic links |

---

## Getting Started

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

Open: `http://localhost:3000`

---

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | — |
| `API_SERVICE_TOKEN` | Bearer token for internal API routes | — |
| `API_ALLOWED_ORIGINS` | CORS allowlist | — |
| `AUTH_VALIDATION_WINDOW_MS` | Middleware remote token validation cadence | `60000` |
| `AUTH_TIMING_DEBUG` | Print per-request auth timing logs | `0` |

---

## Authentication

Magic-link only — no passwords. Go to `/login`, enter your email, and click **Send Login Link**. Supabase sends a link that redirects to `/auth/callback` where the session is exchanged.

Dashboard access requires an authenticated session with `subscription_status = 'active'`; otherwise redirects to `/pricing`.

### Profiles table (Supabase)

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

---

## Local Workflow Fallbacks

When GitHub Actions is unavailable (e.g. billing limits), run workflow equivalents locally:

```bash
npm run workflow:local:readme          # mirrors update-readme.yml
npm run workflow:local:codebase-map    # mirrors update-codebase-map.yml
npm run workflow:local:rollback        # mirrors update-rollback.yml
npm run workflow:local:ci              # typecheck + build
npm run workflow:local:all             # all of the above in sequence
```

---

## Production Notes

- Use **PostgreSQL** instead of the default SQLite.
- Set `API_SERVICE_TOKEN` and `API_ALLOWED_ORIGINS` before deployment.
- Keep all secrets in secure env management — never commit them to source control.

<!-- deploy: trigger -->
