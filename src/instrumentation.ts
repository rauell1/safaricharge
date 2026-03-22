/**
 * Next.js Instrumentation Hook
 *
 * Next.js calls `register()` once when the server process starts,
 * before handling any requests.  This is the recommended place to:
 *   - Validate environment variables
 *   - Initialise telemetry / tracing agents
 *   - Open persistent connections (e.g. Redis, message queues)
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run validation in the Node.js runtime, not in the Edge runtime or
  // during client-side bundle compilation.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/validateEnv');
    validateEnv();
  }
}
