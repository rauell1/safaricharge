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
  const envChecks = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
    NEXTAUTH_URL: Boolean(process.env.NEXTAUTH_URL?.trim()),
    NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET?.trim()),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY?.trim()),
    EMAIL_FROM: Boolean(process.env.EMAIL_FROM?.trim()),
  };

  const missingRequiredEnv = Object.entries(envChecks)
    .filter(([, isPresent]) => !isPresent)
    .map(([name]) => name);

  const readiness = missingRequiredEnv.length === 0 ? 'ready' : 'degraded';

  return NextResponse.json(
    {
      status: 'ok',
      readiness,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        env: {
          missingRequired: missingRequiredEnv,
        },
      },
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
