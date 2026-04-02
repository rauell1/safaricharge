# SafariCharge Full-Stack Security, Performance & Reliability Audit

Date: 2026-04-02
Scope: Frontend, API routes, middleware, environment validation, Prisma schema/config, operational docs in repository.

## Findings Summary

1. Client-side API calls to protected routes do not attach service auth, role, or signature headers.
2. Service authentication and request-signature verification are optional-by-env and silently bypassed when unset.
3. CORS allowlist uses `endsWith` origin matching, which is over-permissive and vulnerable to crafted domains.
4. In-memory rate limiting is not distributed and is bypassable across instances/serverless cold starts.
5. Formal report generation is CPU-heavy and synchronous in request/response path.
6. No dedicated session-based authentication system is implemented (no secure cookie/session rotation flow).
7. Logging is structured but lacks request/trace correlation and explicit audit events for authz/authn failures.
8. No backup/restore automation or migration rollback tests are present in repository automation.
9. Type safety gaps exist in critical UI logic (`any` usage in main simulation page).
10. Health endpoint is liveness-oriented and only reports degraded readiness by env presence (not dependency checks).

## Immediate Priority Recommendations

- Enforce strict auth in production-only deploy gate (fail startup when auth secrets are missing).
- Replace permissive CORS matching with exact origin allow-list matching.
- Introduce user/session authentication with HttpOnly secure cookies; avoid service-token auth for browser flows.
- Move expensive report generation to async jobs (queue + worker) and return `202 Accepted`.

## Short-Term Recommendations

- Add distributed rate limiting (Redis/KV) for multi-instance deployments.
- Add request IDs and structured request lifecycle logging.
- Add startup/runtime checks for backup configuration and restore playbook verification.
- Eliminate `any` in financially/operationally critical flows.

## Long-Term Recommendations

- Adopt production DB with managed backups + PITR; keep SQLite dev-only.
- Implement centralized authN/authZ (Auth.js/OIDC) with RBAC from signed claims.
- Add SLO dashboards (latency, error rate, queue depth) and alerting policy.
