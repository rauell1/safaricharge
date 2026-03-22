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

const ENV_SPECS: EnvSpec[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'Prisma database connection string (e.g. file:./dev.db or a PostgreSQL URL)',
  },
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
];

export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

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
    // Exit immediately so the problem is obvious rather than causing confusing
    // runtime errors deep inside request handlers.
    process.exit(1);
  }
}
