# SafariCharge

SafariCharge is a Next.js + TypeScript platform for simulating and optimizing solar generation, battery storage, grid interaction, and EV charging.

## 1) Full Audit Summary (April 2, 2026)

### Critical issues found
- Monolithic files (`src/app/page.tsx` ~4400 lines, `src/app/api/formal-report/route.ts` ~1400 lines) create high change risk and poor testability.
- Orphaned backup source file present in production tree (`src/app/api/formal-report/route.ts.backup`).
- In-memory rate limiting does not scale across multi-instance deployments.
- Health endpoint lacked readiness signal and operational metadata.
- Several security controls existed but were not fully configurable via environment-based tuning.

### Implemented in this update
- Removed orphaned backup API file from source control.
- Added structured JSON logger (`src/lib/logger.ts`) for better observability.
- Refactored middleware rate limiting to use environment-driven limits and return explicit rate-limit headers.
- Improved `/api/health` response with readiness + uptime fields.
- Hardened startup environment validation for production deployment expectations.
- Extended `.env.example` with rate-limit configuration variables.

---

## 2) Dead Code / Structural Cleanup

### Removed
- `src/app/api/formal-report/route.ts.backup` (orphan file, not used by Next.js routing).

### Candidates to evaluate for deletion (not auto-deleted due potential future use)
- `src/components/LoadConfigComponents.tsx`
- `src/components/dashboard/index.ts`
- Multiple shadcn UI primitives under `src/components/ui/*` appear currently unreferenced in app routes.
- `src/lib/services/reportService.ts` appears unreferenced.

> Recommendation: enforce dead-code checks in CI with `ts-prune` and custom import graph checks.

---

## 3) Folder Restructure (Feature-Based)

### Current structure (high-level)
- `src/app/*` (routes/pages)
- `src/components/*` (shared + feature mixed)
- `src/lib/*` (domain logic + config + security mixed)
- `src/hooks/*`
- `src/stores/*`
- `src/types/*`

### Proposed structure (feature-first)

```text
src/
  app/
    (dashboard)/
    api/
  features/
    simulation/
      components/
      hooks/
      services/
      utils/
      types/
    reports/
      components/
      hooks/
      services/
      utils/
      types/
    ai-assistant/
      components/
      hooks/
      services/
      utils/
      types/
    auth/
      components/
      hooks/
      services/
      utils/
      types/
  shared/
    ui/
    config/
    security/
    logging/
    db/
    types/
```

---

## 4) Hardcoded Value Extraction

### Extracted / centralized now
- Rate-limit values moved to env-configurable server config exports:
  - `RATE_LIMIT_WINDOW_MS`
  - `RATE_LIMIT_API_PER_WINDOW`
  - `RATE_LIMIT_AI_PER_WINDOW`
  - `RATE_LIMIT_REPORT_PER_WINDOW`

### Remaining high-priority extractions
- Color hex constants embedded in report SVG/HTML builder.
- Report template dimensions and chart dimensions should move to `report.constants.ts`.
- API-specific size limits should be consolidated into one shared limits module.

---

## 5) Naming Standardization

### Standards enforced
- Use domain terms over vague labels:
  - Prefer `simulationSnapshot` over `data`
  - Prefer `rateLimitRule` over `rule`
  - Prefer `clientIpAddress` over `ip`
- File naming:
  - Route helpers in `*.service.ts`
  - Validation schemas in `*.schema.ts`
  - Shared constants in `*.constants.ts`

### Remaining hotspots
- `src/app/page.tsx` has many generic variable names due size/legacy growth.
- API route files mix transport, business logic, and template rendering names.

---

## 6) Top 5 Scalability Risks (10,000+ users)

1. **In-memory middleware rate limit (single-process only)**
   - Failure mode: limits bypassed across replicas; abusive traffic leaks through.
   - Fix: move counters to Redis/Upstash + distributed sliding window.

2. **Monolithic report generation on request thread**
   - Failure mode: CPU spikes, long tail latency, request timeouts.
   - Fix: enqueue report generation (BullMQ/SQS), return job ID, poll status.

3. **Large JSON payload export/report endpoints**
   - Failure mode: high memory pressure and GC churn.
   - Fix: chunked uploads, server-side pagination/streaming, enforce tighter caps by plan.

4. **No shared cache layer for AI/report outputs**
   - Failure mode: repeated expensive recomputation/API calls.
   - Fix: Redis cache with key versioning and short TTL.

5. **SQLite default path left enabled in production**
   - Failure mode: write contention and poor concurrency.
   - Fix: Postgres + PgBouncer + Prisma connection tuning.

---

## 7) Messiest File Rewrite Plan

### Identified worst file
- `src/app/page.tsx` (very large, mixed concerns, hard to test).

### Rewrite approach (recommended phased rollout)
1. Split into feature slices:
   - `features/simulation/components/*`
   - `features/ai-assistant/components/*`
   - `features/reports/components/*`
2. Move simulation and derived-metrics logic into pure services with unit tests.
3. Keep page as composition layer only.

> In this iteration, middleware and operational layers were rewritten for production controls while preserving user-facing behavior.

---

## 8) Security Hardening Checklist

### Implemented
- Endpoint rate limiting with configurable thresholds.
- Input validation (Zod) already present on heavy API routes.
- CORS allowlist controls already present and retained.
- RBAC enforcement support retained.
- Webhook signature verification retained.
- Startup env validation strengthened for production.
- Frontend hardcoded secrets: none found in source.

### Required next steps
- Replace bearer token auth with session/JWT auth backed by HttpOnly secure cookies.
- Add CSRF protection for browser-authenticated mutation endpoints.
- Add audit trail logs for privileged report/export usage.

---

## 9) Performance & Database

### Implemented now
- Added stronger production validation around env + rate limiting.

### Required next steps
- Migrate production to Postgres.
- Add query-specific indexes as usage patterns are introduced.
- Add pagination for historical datasets in API response contract.
- Add connection pooling (PgBouncer / Prisma Data Proxy).

---

## 10) Infrastructure & File Handling

### Required production architecture
- Store generated reports/artifacts in S3-compatible object storage.
- Serve downloads through CDN signed URLs.
- Avoid large in-memory report buffering in route handlers.

---

## 11) Reliability & Observability

### Implemented now
- Structured logging utility (`src/lib/logger.ts`).
- Health endpoint now includes readiness + uptime metadata.
- Existing frontend error boundary retained.
- Existing env validation at startup retained and strengthened.

### Next steps
- Add request correlation IDs and propagate through logs.
- Add OpenTelemetry traces for AI/report routes.
- Add synthetic uptime checks and SLO dashboards.

---

## 12) Background Processing

Move heavy report and notification workloads to workers:
- Queue: BullMQ (Redis) or cloud queue service.
- API route: enqueue and return `202 Accepted` with `jobId`.
- Worker: process report generation, persist artifact URL.

---

## 13) Session & Auth Management

Recommended production design:
- NextAuth/Auth.js with secure HttpOnly cookies (no localStorage tokens).
- Short access-token TTL + rotating refresh tokens.
- Password reset tokens hashed at rest and expiring (15–30 minutes).
- Device/session revocation support.

---

## 14) Data Safety

- Automated daily backups (database + object storage metadata).
- Point-in-time restore for production DB.
- Migration safety:
  - use expand/contract migrations,
  - run pre-deploy migration validation,
  - include rollback playbooks.

---

## 15) Code Quality Gates

Enable in CI:
- `tsc --noEmit` with strict TypeScript mode.
- ESLint + import/no-unused-modules.
- Unit tests for simulation + report services.
- Basic load tests for API routes.
- SAST + dependency scanning (CodeQL, npm audit, osv-scanner).

---

## Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

## Environment Variables

See `.env.example` for complete descriptions.

Core variables:
- `DATABASE_URL`
- `GEMINI_API_KEY`
- `ZAI_API_KEY`
- `API_SERVICE_TOKEN`
- `WEBHOOK_SECRET`
- `API_ALLOWED_ORIGINS`
- `ENABLE_RBAC`
- `API_ROLE_HEADER`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_API_PER_WINDOW`
- `RATE_LIMIT_AI_PER_WINDOW`
- `RATE_LIMIT_REPORT_PER_WINDOW`

## Deployment

1. Use Postgres (not SQLite) in production.
2. Configure secrets via deployment platform secret manager.
3. Build and deploy Next.js standalone server.
4. Put reverse proxy / CDN in front.
5. Run workers for report jobs separately.
6. Monitor `/api/health` and alert on readiness degradation.
