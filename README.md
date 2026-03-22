# SafariCharge Solar Dashboard

A production-grade web dashboard for monitoring, managing, and simulating solar energy systems, battery storage, and EV charging at a commercial facility in Nairobi, Kenya.

**Live demo:** https://sc-solar-dashboard.vercel.app/

---

## Features

- **Real-time solar simulation** – physics-based PV generation model with seasonal variation, temperature derating, soiling losses, and weather effects
- **Battery storage management** – LiFePO4 charge/discharge optimisation, health tracking, and cycle counting
- **EV charging optimisation** – two-vehicle support with time-of-use tariff awareness and V2G capability
- **Kenya Power (KPLC) tariff engine** – full Commercial E-Mobility tariff including fuel, forex, inflation levies, and VAT
- **AI energy advisor** – SafariCharge AI powered by Google Gemini (falls back to Z.AI)
- **Report generation** – HTML/SVG formal reports and multi-period CSV exports
- **Rate limiting** – per-IP sliding-window protection on all API endpoints

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui + Recharts |
| State | Zustand + TanStack React Query |
| Database | Prisma + SQLite (dev) / PostgreSQL (prod) |
| AI | Google Gemini API + Z.AI SDK fallback |
| Auth | next-auth |
| Deployment | Vercel / standalone Node.js + Caddy |

---

## Folder structure

```
src/
├── app/
│   ├── api/
│   │   ├── health/          # GET  – liveness probe
│   │   ├── safaricharge-ai/ # POST – AI energy advisor
│   │   ├── formal-report/   # POST – HTML/SVG report generation
│   │   └── export-report/   # POST – CSV data export
│   ├── layout.tsx
│   ├── page.tsx             # Main dashboard + simulation engine
│   └── globals.css
├── components/
│   ├── DailyEnergyGraph.tsx
│   └── ui/                  # shadcn/ui primitives
├── hooks/
│   ├── use-mobile.ts
│   └── use-toast.ts
├── lib/
│   ├── config.ts            # System constants & tariff parameters
│   ├── db.ts                # Prisma client singleton
│   ├── utils.ts
│   └── validateEnv.ts       # Startup environment validation
├── instrumentation.ts       # Next.js startup hook
└── middleware.ts            # Rate limiting
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Prisma connection string. Use `file:./dev.db` for SQLite (development) or a PostgreSQL URL for production. |
| `GEMINI_API_KEY` | Optional | Google Gemini API key. Get one at https://aistudio.google.com/apikey. SafariCharge AI falls back to the Z.AI SDK if this is absent. |
| `NEXT_TELEMETRY_DISABLED` | Optional | Set to `1` to disable Next.js anonymous telemetry. |

The server validates required variables at startup via `src/instrumentation.ts` and exits with a clear error message if any are missing.

---

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL (and optionally GEMINI_API_KEY)

# 3. Set up the database
npm run db:push

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000

---

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js development server on port 3000 |
| `npm run build` | Production build (standalone output) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Apply Prisma schema to the database |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run database migrations |

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness probe – returns `{ status: "ok" }` |
| POST | `/api/safaricharge-ai` | AI energy advisor (rate-limited: 10 req/min) |
| POST | `/api/formal-report` | HTML/SVG formal report (rate-limited: 5 req/min) |
| POST | `/api/export-report` | CSV data export (rate-limited: 5 req/min) |

---

## Deployment

### Vercel (recommended)

1. Connect the repository to a Vercel project
2. Set environment variables in the Vercel dashboard (`DATABASE_URL`, `GEMINI_API_KEY`)
3. Deploy – Vercel handles builds automatically on every push

### Self-hosted (standalone + Caddy)

```bash
# Build
npm run build

# Start (uses bun; requires DATABASE_URL in environment)
npm run start
```

Use `Caddyfile.txt` as a starting point for the Caddy reverse-proxy configuration.

---

## Security

- Rate limiting on all API routes (in-memory; replace with Upstash Redis for multi-instance deployments)
- Security headers on every response (CSP, X-Frame-Options, etc.)
- API keys are server-side only – never exposed to the browser
- CSV export sanitises cell values to prevent spreadsheet formula injection
- Environment variable validation prevents silent misconfiguration

---

## License

Intended for research, development, and renewable energy monitoring applications.
