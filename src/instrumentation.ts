/**
 * Next.js Instrumentation Hook
 *
 * Next.js calls `register()` once when the server process starts,
 * before handling any requests.  This is the recommended place to:
 *  - Validate environment variables
 *  - Initialise telemetry / tracing agents
 *  - Open persistent connections (e.g. Redis, message queues)
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Environment database checks are disabled since Prisma has been fully removed.
}
