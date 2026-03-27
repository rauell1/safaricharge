# SafariCharge Solar Dashboard

Production-grade Next.js dashboard for simulating and monitoring solar PV, battery storage, and EV charging performance for a Nairobi commercial site.

## Overview
- Real-time simulation of PV + battery + dual EV chargers with tariff-aware optimisation.
- CSV/HTML report generation with sanitised exports to avoid spreadsheet injection.
- AI advisor endpoint with Gemini-first, Z.AI fallback and strict payload validation.
- In-memory rate limiting, CORS allowlist, bearer-token auth, optional RBAC, and webhook signature checks on all API routes.
- Environment validation at startup and health endpoint for liveness probes.

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

## Folder Structure
Current (selected)
```
src/
├── app/               # Routes, layouts, API handlers
├── components/        # UI primitives + charts
├── hooks/             # Reusable client hooks
├── lib/               # Config, db client, env validation, security helpers
└── middleware.ts      # Rate limiting
```

Proposed feature-based layout (before → after)
```
src/
├── app/                          # Routing shell only
├── features/
│   ├── simulation/
│   │   ├── components/           # Graphs, controls
│   │   ├── services/             # Physics engine, tariff logic
│   │   ├── hooks/                # Simulation state
│   │   ├── utils/                # Math helpers, constants
│   │   └── types/
│   ├── ai/
│   │   ├── services/             # Gemini/Z.AI clients
│   │   ├── utils/                # Prompt builders, validation
│   │   └── types/
│   ├── reports/
│   │   ├── services/             # CSV/HTML rendering, aggregation
│   │   ├── utils/                # Sanitizers, formatters
│   │   └── types/
│   └── security/
│       ├── services/             # CORS, auth, RBAC, signatures
│       └── types/
└── lib/                          # Cross-cutting helpers (db, env, config)
```

## Getting Started
1) Install dependencies  
```bash
npm install
```

2) Configure environment  
```bash
cp .env.example .env
# set DATABASE_URL, GEMINI_API_KEY (optional), and security envs below
```

3) Initialise database  
```bash
npm run db:push
```

4) Run locally  
```bash
npm run dev
# http://localhost:3000
```

5) Lint / build checks  
```bash
npm run lint
npm run build
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
| `npm run dev` | Start development server. |
| `npm run build` | Production build (standalone output). |
| `npm run start` | Run standalone server (uses Bun). |
| `npm run lint` | ESLint with Next rules. |
| `npm run db:push` | Apply Prisma schema. |
| `npm run db:migrate` | Create a migration in dev. |

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

## Deployment
### Vercel
1. Connect repo to Vercel.  
2. Set env vars (`DATABASE_URL`, `GEMINI_API_KEY`, `API_SERVICE_TOKEN`, `WEBHOOK_SECRET`, `API_ALLOWED_ORIGINS`).  
3. Deploy – Next standalone output is produced by the build script.

### Self-hosted
```bash
npm run build
npm run start  # requires Bun and env vars above
```
Use `Caddyfile.txt` as a reverse-proxy template (TLS + compression).

## Operations
- Health check: `GET /api/health`.
- Logs: `npm run start` pipes to `server.log` via Bun.
- Scaling tips:
  - Enable a shared rate-limit store (Redis) for multi-instance deployments.
  - Use Postgres in production with connection pooling.
  - Keep `API_ALLOWED_ORIGINS` narrow and enforce bearer tokens for server-to-server calls.
  - Prefer background jobs/queues for heavy tasks (report generation, notifications).
