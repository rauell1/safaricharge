# SafariCharge Solar Dashboard

Production-grade Next.js dashboard for simulating and monitoring solar PV, battery storage, and EV charging performance for commercial sites in Kenya.

## ✨ Key Features

### 🎨 Modern Dashboard UI
- **Dark energy-tech theme** with animated power flow visualization
- **Real-time metrics** with animated counters and live status indicators
- **Interactive components**: StatCards, PowerFlowVisualization, PanelStatusTable, AlertsList
- **Responsive design** optimized for mobile, tablet, and desktop
- **Demo page** at `/demo` with mock data for exploration

### ⚡ Solar Simulation Engine
- Real-time simulation of PV + battery + dual EV chargers with tariff-aware optimization
- Physics-based solar modeling with location-specific irradiance and temperature
- 25-year financial projections with battery replacements and tariff escalation
- Hardware recommendations sized for Kenya market (2026 pricing)

### 📊 Reports & AI
- CSV/HTML report generation with sanitized exports (prevents formula injection)
- AI advisor endpoint with Gemini-first, Z.AI fallback and strict payload validation
- Formal PDF reports with hardware specifications and financial analysis

### 🔒 Production Security
- In-memory rate limiting, CORS allowlist, bearer-token auth, optional RBAC
- Webhook signature verification (HMAC-SHA256)
- Input validation with Zod schemas and 8MB request caps
- Environment validation at startup and health endpoint for liveness probes

## Prerequisites
- Node.js 20+ (dev/build) and npm.
- Bun available in production if you use `npm run start`.
- SQLite works by default for local dev; set `DATABASE_URL` to Postgres in production.

## Tech Stack
| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS 4 + shadcn/ui + Recharts |
| State/Data | Zustand + TanStack Query |
| Backend | Next server routes + Prisma (SQLite dev / Postgres prod) |
| Auth/Security | Bearer token + optional RBAC header + rate limiting + HMAC |
| AI | Google Gemini API (primary) + Z.AI SDK (fallback) |

## 📁 Project Structure
```
src/
├── app/
│   ├── api/                    # API routes (health, reports, AI)
│   ├── demo/                   # Demo dashboard page
│   └── page.tsx                # Main simulation interface
├── components/
│   ├── dashboard/              # Dashboard UI components
│   │   ├── DashboardLayout.tsx
│   │   ├── StatCards.tsx
│   │   ├── PowerFlowVisualization.tsx
│   │   ├── PanelStatusTable.tsx
│   │   └── AlertsList.tsx
│   └── ui/                     # shadcn/ui primitives
├── hooks/                      # React hooks (simulation, state)
├── lib/                        # Core logic
│   ├── recommendation-engine.ts  # Solar sizing & financials
│   ├── physics-engine.ts         # PV simulation
│   ├── security.ts               # Auth, CORS, RBAC
│   └── meteonorm-api.ts          # Weather data APIs
├── types/                      # TypeScript definitions
└── middleware.ts               # Rate limiting
```

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL, GEMINI_API_KEY (optional), and security vars

# 3. Initialize database
npm run db:push

# 4. Run development server
npm run dev
# Open http://localhost:3000

# 5. Try the demo dashboard
# Visit http://localhost:3000/demo to see all components with mock data
```

### Development Commands
```bash
npm run lint          # Check code quality
npm run build         # Production build
npm run start         # Run production server (requires Bun)
```

## Environment Variables
| Name | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma connection string (`file:./dev.db` for SQLite dev; PostgreSQL for prod). |
| `GEMINI_API_KEY` | Recommended | Google Gemini key for the AI endpoint. |
| `API_SERVICE_TOKEN` | Recommended | Bearer token required by API routes (`Authorization: Bearer <token>`). |
| `WEBHOOK_SECRET` | Optional | HMAC secret for verifying `X-SC-Signature` on POST bodies. |
| `API_ALLOWED_ORIGINS` | Optional | Comma-separated origins allowed for CORS (default: prod + localhost). |
| `ENABLE_RBAC` | Optional | `true` to enforce `x-sc-role` header roles (`viewer|operator|analyst|admin`). |
| `API_ROLE_HEADER` | Optional | Override role header name (default `x-sc-role`). |
| `NEXT_TELEMETRY_DISABLED` | Optional | Set `1` to disable Next telemetry. |

## Scripts
| Command | Description |
| --- | --- |
| `npm run dev` | Start development server on port 3000. |
| `npm run build` | Production build (standalone output). |
| `npm run start` | Run standalone server (uses Bun). |
| `npm run lint` | ESLint with Next rules. |
| `npm run db:push` | Apply Prisma schema to database. |
| `npm run db:migrate` | Create a migration in dev. |

## 🎨 Dashboard Demo

The project includes a fully-functional demo dashboard at `/demo` showcasing:

- **StatCards**: Real-time metrics with animated counters (Generation, Power, Consumption, Savings)
- **PowerFlowVisualization**: Animated energy flow between Solar → Battery → Home → Grid
- **PanelStatusTable**: System diagnostics with color-coded status indicators
- **AlertsList**: System notifications with type-based filtering
- **TimeRangeSwitcher**: Filter data by day/week/month/year

The demo uses mock data from `useDemoEnergySystem` hook and demonstrates the dark energy-tech theme with:
- Amber/yellow for solar energy
- Green for savings/positive metrics
- Purple for grid interactions
- Red for alerts/warnings
- Smooth animations and hover effects

See `src/components/dashboard/README.md` for full component documentation.

## API Routes
| Method | Path | Description | Auth / Limits |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Liveness probe returning JSON. | None. |
| `POST` | `/api/export-report` | Accepts minute-level simulation data and returns a sanitised CSV export. 8 MB body cap. | `Authorization: Bearer <token>` when `API_SERVICE_TOKEN` is set; optional HMAC via `WEBHOOK_SECRET`. Rate limit: 5/min. |
| `POST` | `/api/formal-report` | Accepts aggregated simulation totals/breakdowns and returns HTML for PDF printing. 8 MB body cap. | Same auth/signature rules as export. Rate limit: 5/min. |
| `POST` | `/api/safaricharge-ai` | AI assistant (Gemini primary, Z.AI fallback) with Zod-validated prompts/responses. | Bearer token if configured. Rate limit: 10/min. |

## Security Hardening
- **Rate limiting**: in-memory sliding window on all API routes (`src/middleware.ts`).
- **CORS**: allowlist with per-origin echo + OPTIONS handling in `src/lib/security.ts`.
- **Authentication**: Bearer token enforcement when `API_SERVICE_TOKEN` is set.
- **RBAC**: Optional `x-sc-role` header check when `ENABLE_RBAC=true`.
- **Webhook signatures**: HMAC-SHA256 validation using `WEBHOOK_SECRET`.
- **Input validation**: Zod schemas on AI, export, and formal-report endpoints; request size caps.
- **Env validation**: `src/instrumentation.ts` calls `validateEnv` at startup.
- **Error boundaries**: `src/app/error.tsx` catches client render failures.
- **Sanitised exports**: CSV generation neutralises formula injection.
- **Content security**: CSP and header hardening live in `next.config.ts`; CORS and body-size enforcement are per-route.
- **Rate limits by endpoint**: AI (10/min), formal report (5/min), export report (5/min), other API routes (60/min).

## 🚀 Deployment

### Vercel (Recommended)
1. Connect repo to Vercel
2. Set environment variables: `DATABASE_URL`, `GEMINI_API_KEY`, `API_SERVICE_TOKEN`, `WEBHOOK_SECRET`, `API_ALLOWED_ORIGINS`
3. Deploy – Next standalone output is built automatically

### Self-hosted
```bash
npm run build
npm run start  # Requires Bun and environment variables
```

**Reverse Proxy**: Use `Caddyfile.txt` as a template for Caddy (TLS + compression)

**Scaling Tips**:
- Use Redis for shared rate-limit store across multiple instances
- Configure Postgres with connection pooling for production
- Keep `API_ALLOWED_ORIGINS` narrow and enforce bearer tokens
- Use background jobs/queues for heavy tasks (reports, notifications)

## 📊 Operations

- **Health check**: `GET /api/health` returns JSON status
- **Logs**: Production server logs to `server.log` via Bun
- **Monitoring**: Health endpoint suitable for Kubernetes liveness probes
- **Database**: SQLite for dev, Postgres recommended for production

## 📚 Additional Documentation

- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** - Central reference for all calculations, formulas, and architectural decisions
- **[USER_GUIDE.md](USER_GUIDE.md)** - End-user guide for the simulation interface
- **[INTEGRATION.md](INTEGRATION.md)** - API integration guide for external systems
- **[src/components/dashboard/README.md](src/components/dashboard/README.md)** - Dashboard component documentation

## 🤝 Contributing

This project uses:
- **TypeScript** for type safety
- **ESLint** for code quality (`npm run lint`)
- **Prettier** formatting via ESLint config
- **Prisma** for database schema management

Before submitting changes:
1. Run `npm run lint` to check for issues
2. Run `npm run build` to ensure the project builds
3. Test your changes locally with `npm run dev`

## 📄 License

See repository for license information.
