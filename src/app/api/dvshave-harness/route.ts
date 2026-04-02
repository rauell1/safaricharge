import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  buildCorsHeaders,
  enforceBodySize,
  enforceRbac,
  enforceServiceAuth,
  jsonResponse,
  readJsonWithRaw,
  verifyRequestSignature,
} from '@/lib/security';
import {
  buildDefaultDvShaveMatrix,
  runDvShaveHarness,
} from '@/lib/dvshave-harness';

const HARNESS_MAX_BODY_BYTES = 512 * 1024;
const DISTURBANCE_TYPES = ['none', 'sag', 'swell', 'unbalance', 'harmonic'] as const;
const TARIFF_WINDOWS = ['off_peak', 'shoulder', 'on_peak'] as const;

const scenarioSchema = z.object({
  id: z.string().min(1),
  disturbanceType: z.enum(DISTURBANCE_TYPES),
  severityPct: z.number().min(0).max(100),
  socInitPct: z.number().min(0).max(100),
  loadPct: z.number().min(0).max(150),
  tariffWindow: z.enum(TARIFF_WINDOWS),
  occupancyPct: z.number().min(0).max(100),
  sitePowerKw: z.number().positive(),
  thresholdKw: z.number().positive(),
  essPowerKw: z.number().positive(),
  chargerCount: z.number().int().positive(),
});

const harnessRequestSchema = z.object({
  useDefaultMatrix: z.boolean().optional().default(false),
  scenarios: z.array(scenarioSchema).max(500).optional(),
});

export async function POST(request: NextRequest) {
  const { preflight, headers } = buildCorsHeaders(request, { methods: ['POST', 'OPTIONS'] });
  if (preflight) return preflight;

  const sizeError = enforceBodySize(request, HARNESS_MAX_BODY_BYTES, headers);
  if (sizeError) return sizeError;

  const authError = enforceServiceAuth(request, headers);
  if (authError) return authError;

  const rbacError = enforceRbac(request, headers, ['analyst', 'admin']);
  if (rbacError) return rbacError;

  let parsed: { raw: Buffer; data: unknown };
  try {
    parsed = await readJsonWithRaw<unknown>(request);
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, { status: 400, headers });
  }

  const signatureError = verifyRequestSignature(request, parsed.raw, headers);
  if (signatureError) return signatureError;

  const validation = harnessRequestSchema.safeParse(parsed.data);
  if (!validation.success) {
    return jsonResponse(
      { error: 'Invalid payload.', details: validation.error.flatten() },
      { status: 400, headers }
    );
  }

  const { useDefaultMatrix, scenarios } = validation.data;
  if (!useDefaultMatrix && (!scenarios || scenarios.length === 0)) {
    return jsonResponse(
      {
        error: 'Provide scenarios or set useDefaultMatrix=true.',
      },
      { status: 400, headers }
    );
  }

  const scenarioSet = useDefaultMatrix ? buildDefaultDvShaveMatrix() : scenarios!;
  const report = runDvShaveHarness(scenarioSet);

  return jsonResponse(
    {
      mode: useDefaultMatrix ? 'default-matrix' : 'custom-scenarios',
      report,
    },
    { status: 200, headers }
  );
}

export function OPTIONS(request: NextRequest) {
  const { preflight } = buildCorsHeaders(request, { methods: ['POST', 'OPTIONS'] });
  return preflight!;
}
