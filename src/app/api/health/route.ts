import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Lightweight liveness probe used by load balancers, orchestrators (k8s,
 * ECS, Fly.io), and uptime monitors to verify the application process is
 * running and reachable.
 *
 * Intentionally minimal – it does NOT hit the database or external services
 * so it remains fast (< 5 ms) even under heavy load and does not generate
 * false negatives when downstream dependencies are degraded.
 */
export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());

  return NextResponse.json(
    {
      status: 'ok',
      readiness: hasDatabaseUrl ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
      uptimeSeconds: Math.round(process.uptime()),
    },
    {
      status: 200,
      headers: {
        // Prevent stale health-check responses from being served by caches.
        'Cache-Control': 'no-store',
      },
    }
  );
}
