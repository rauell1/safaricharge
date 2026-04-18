/**
 * Environment variable validation
 *
 * Called at server startup (instrumentation.ts) to catch misconfiguration
 * early and surface clear error messages instead of cryptic runtime failures.
 *
 * Required variables cause the process to exit with a non-zero status.
 * Optional variables emit a warning so developers know features are disabled.
 */

interface EnvSpec {
  /** The name of the environment variable. */
  name: string;
  /** When true, absence causes a hard failure; when false, a warning is logged. */
  required: boolean;
  /** Human-readable description shown in error / warning messages. */
  description: string;
}

const isProduction = process.env.NODE_ENV === 'production';

const ENV_SPECS: EnvSpec[] = [
  {
    name: 'DATABASE_URL',
    required: isProduction,
    description:
      'Prisma database connection string (e.g. file:./dev.db or a PostgreSQL URL). Defaults to SQLite dev db when absent.',
  },
  // ─── Supabase ──────────────────────────────────────────────────────────────
  // Both vars are required for the /api/profile upsert (and any other route
  // that builds a server-side Supabase admin client).
  // NEXT_PUBLIC_SUPABASE_URL must also be present in every environment scope
  // (Production + Preview) in the Vercel dashboard.
  // SUPABASE_SERVICE_ROLE_KEY is a server-only secret — never expose it to
  // the client. It must be set in *all* Vercel environment scopes (Production,
  // Preview, Development) or the profile POST route will return 500.
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: isProduction,
    description:
      'Supabase project URL (e.g. https://<ref>.supabase.co). Required for the admin client in server-side routes.',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true, // required in every environment — server-side admin client
    description:
      'Supabase service-role key for server-side admin operations (bypasses RLS). Set this in ALL Vercel environment scopes (Production, Preview, Development).',
  },
  // ─── Other optional vars ───────────────────────────────────────────────────
  {
    name: 'GEMINI_API_KEY',
    required: false,
    description: 'Google Gemini API key – SafariCharge AI will fall back to Z.AI SDK when absent',
  },
  {
    name: 'API_SERVICE_TOKEN',
    required: false,
    description: 'Shared bearer token for protected API routes (recommended for server-to-server calls)',
  },
  {
    name: 'WEBHOOK_SECRET',
    required: false,
    description: 'HMAC secret for validating incoming webhook-style requests',
  },
  {
    name: 'API_ALLOWED_ORIGINS',
    required: false,
    description: 'Comma-separated list of origins permitted to call API routes',
  },
  {
    name: 'ENABLE_RBAC',
    required: false,
    description: 'Set to true to enforce role-based access control via the x-sc-role header',
  },
  {
    name: 'RATE_LIMIT_WINDOW_MS',
    required: false,
    description: 'Rate-limit window length in milliseconds (default 60000)',
  },
  {
    name: 'RATE_LIMIT_API_PER_WINDOW',
    required: false,
    description: 'Catch-all API limit per window (default 60)',
  },
  {
    name: 'RATE_LIMIT_AI_PER_WINDOW',
    required: false,
    description: 'AI route limit per window (default 10)',
  },
  {
    name: 'RATE_LIMIT_REPORT_PER_WINDOW',
    required: false,
    description: 'Formal/export report limit per window (default 5)',
  },
];

export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Provide a safe default for local/dev so the server does not crash when
  // DATABASE_URL is unset. Prisma will connect to a local SQLite file.
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
    process.env.DATABASE_URL = 'file:./dev.db';
    warnings.push(
      '  ⚠ DATABASE_URL is not set – defaulting to local SQLite (file:./dev.db). Set a Postgres URL in production.'
    );
  }

  for (const spec of ENV_SPECS) {
    const value = process.env[spec.name];
    if (!value || value.trim() === '') {
      if (spec.required) {
        missing.push(`  ✗ ${spec.name}: ${spec.description}`);
      } else {
        warnings.push(`  ⚠ ${spec.name} is not set – ${spec.description}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('[SafariCharge] Optional environment variables are missing:');
    warnings.forEach(w => console.warn(w));
  }

  if (missing.length > 0) {
    console.error('[SafariCharge] Required environment variables are missing:');
    missing.forEach(m => console.error(m));
    console.error(
      '[SafariCharge] Copy .env.example to .env and provide the missing values, then restart.'
    );
    // In serverless runtimes (e.g. Vercel), hard exits cause opaque 500 errors
    // for API routes. Keep the process alive and surface errors in route logs.
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}
