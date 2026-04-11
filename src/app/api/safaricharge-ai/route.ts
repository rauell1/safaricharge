import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  AI_MAX_BODY_BYTES,
  AI_MAX_HISTORY_TURNS,
  AI_MAX_PROMPT_CHARS,
  GEMINI_TIMEOUT_MS,
  ZAI_TIMEOUT_MS,
  AI_MAX_RETRIES,
  AI_CACHE_TTL_MS,
} from '@/lib/config';
import {
  buildCorsHeaders,
  enforceBodySize,
  enforceRbac,
  enforceServiceAuth,
  jsonResponse,
  readJsonWithRaw,
  verifyRequestSignature,
  withTimeout,
} from '@/lib/security';
import { logger } from '@/lib/logger';

const SYSTEM_PROMPT = `
You are SafariCharge AI, an expert assistant for solar, battery, EV charging, and energy-cost optimization.

Primary objective:
- Give accurate, actionable, quantified guidance with clear uncertainty handling.

Mode selection:
1) Dashboard mode (default when system data is relevant): diagnose performance and optimize results.
2) General research mode (when user asks outside current dashboard data): provide direct, research-backed guidance.

Global response rules:
- Be specific, practical, and thorough by default (avoid over-summarizing).
- Ground every non-trivial claim in provided data or clearly labeled assumptions.
- If data is missing, ask 1 clarifying question OR proceed with explicit assumptions.
- Never fabricate metrics, sources, or certainty.
- Prefer the highest-impact actions first (cost savings, self-consumption, reliability, battery longevity).
- When trade-offs exist, state them briefly.
- Show key calculations explicitly (formula + substituted values + result) when recommending an action.
- Use clear section headings and bullet points. Keep writing compact only if the user explicitly asks for a short answer.

Dashboard mode requirements:
- Use real numbers from the payload and compare against relevant benchmarks when helpful.
- Identify inefficiencies and root causes (not just symptoms).
- Prioritize 3-5 actions by impact and feasibility.
- Quantify expected benefit for each action using kWh, %, cost, or battery life impact where possible.
- If battery efficiency drop exceeds 0.10, explicitly flag severity, likely causes, and corrective plan.
- Include a "Detailed rationale" subsection that explains why each action ranks where it does.

General research mode requirements:
- Answer directly first, then explain implications for solar/battery/EV operations where relevant.
- Cite 2-3 credible sources (title + URL).

Output format:
- For dashboard mode: Executive summary -> Detailed findings -> Prioritized actions -> Expected benefits -> Risks/trade-offs -> Sources.
- For general mode: Answer -> Why it matters -> Sources.
`;

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(AI_MAX_PROMPT_CHARS),
});

const systemDataSchema = z.object({
  solar: z.object({
    production_kw: z.number(),
    peak_hours: z.string(),
    daily_kwh: z.number(),
  }),
  battery: z.object({
    capacity_kwh: z.number(),
    current_charge: z.number(),
    charge_cycles_today: z.number(),
    discharge_pattern: z.string(),
  }),
  grid: z.object({
    import_kwh: z.number(),
    export_kwh: z.number(),
  }),
  load: z.object({
    consumption_kwh: z.number(),
    peak_usage_hours: z.string(),
  }),
  timestamp: z.string(),
  derived: z
    .object({
      battery_efficiency: z.number().optional(),
      previous_battery_efficiency: z.number().optional(),
      battery_efficiency_drop: z.number().optional(),
      likely_cause: z.string().optional(),
      cause_confidence: z.number().optional(),
      confidence_factors: z.array(z.string()).optional(),
      battery_health_score: z.number().optional(),
      battery_health_breakdown: z
        .object({
          efficiency: z.number().optional(),
          cycles: z.number().optional(),
          confidence: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  learningContext: z
    .object({
      peakLoadHour: z.number().optional(),
      peakSolarHour: z.number().optional(),
      avgDailySolarKwh: z.number().optional(),
      avgDailyLoadKwh: z.number().optional(),
      avgDailySavingsKes: z.number().optional(),
      selfSufficiencyPct: z.number().optional(),
      gridDependencyPct: z.number().optional(),
      avgBatterySocAtMidnight: z.number().optional(),
      avgBatterySocAtNoon: z.number().optional(),
      batteryUsagePattern: z.string().optional(),
      ev1AvgChargingHour: z.number().optional(),
      ev2AvgChargingHour: z.number().optional(),
      evTotalDailyKwh: z.number().optional(),
      peakTimeGridImportPct: z.number().optional(),
      offPeakSolarExportPct: z.number().optional(),
      totalSimDays: z.number().optional(),
      dataConfidence: z.string().optional(),
    })
    .optional(),
});

const aiRequestSchema = z
  .object({
    userQuery: z.string().min(1).max(AI_MAX_PROMPT_CHARS).optional(),
    userPrompt: z.string().min(1).max(AI_MAX_PROMPT_CHARS).optional(),
    conversationHistory: z.array(messageSchema).max(AI_MAX_HISTORY_TURNS * 2).default([]),
    systemData: systemDataSchema,
  })
  .refine((value) => Boolean(value.userQuery || value.userPrompt), {
    path: ['userQuery'],
    message: 'userQuery is required',
  })
  .transform((value) => ({
    userQuery: (value.userQuery ?? value.userPrompt) as string,
    conversationHistory: value.conversationHistory ?? [],
    systemData: value.systemData,
  }));

type AiRequest = z.infer<typeof aiRequestSchema>;
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type ProviderResult = {
  text: string | null;
  error: string | null;
  provider?: 'gemini' | 'zai';
  latency?: number;
  success?: boolean;
};

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
];

// Simple in-memory cache for AI responses
type CacheEntry = {
  response: string;
  timestamp: number;
};

const responseCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from messages for deduplication
 */
function getCacheKey(payload: AiRequest): string {
  return JSON.stringify({
    prompt: payload.userQuery,
    history: payload.conversationHistory.slice(-3), // Only last 3 turns for key
    systemData: payload.systemData,
  });
}

/**
 * Get cached response if available and not expired
 */
function getCachedResponse(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > AI_CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }

  logger.info('[AI] Cache hit', { ageSeconds: Math.round(age / 1000) });
  return entry.response;
}

/**
 * Store response in cache
 */
function setCachedResponse(key: string, response: string): void {
  responseCache.set(key, {
    response,
    timestamp: Date.now(),
  });

  // Simple cleanup: remove expired entries when cache grows large
  if (responseCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of responseCache.entries()) {
      if (now - v.timestamp > AI_CACHE_TTL_MS) {
        responseCache.delete(k);
      }
    }
  }
}

/**
 * Retry helper for transient failures
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = AI_MAX_RETRIES,
  attempt: number = 1
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      const isRetryable =
        err instanceof Error &&
        (err.message.includes('network') ||
          err.message.includes('timeout') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('429')); // Rate limit

      if (isRetryable) {
        logger.warn('[AI] Retry after transient error', { attempt });
        // Exponential backoff: 500ms, 1000ms, 2000ms...
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        return withRetry(fn, retries - 1, attempt + 1);
      }
    }
    throw err;
  }
}

/**
 * Normalize AI response to consistent format across providers
 */
function normalizeResponse(response: unknown): string {
  // Handle OpenAI-compatible response format
  if (
    response &&
    typeof response === 'object' &&
    'choices' in response &&
    Array.isArray(response.choices)
  ) {
    const content = response.choices[0]?.message?.content;
    if (typeof content === 'string') return content;
  }

  // Handle Gemini response format
  if (
    response &&
    typeof response === 'object' &&
    'candidates' in response &&
    Array.isArray(response.candidates)
  ) {
    const text = response.candidates[0]?.content?.parts?.[0]?.text;
    if (typeof text === 'string') return text;
  }

  return "I couldn't generate a response.";
}

/**
 * Log provider call metrics for debugging and monitoring
 */
function logProviderMetrics(metrics: {
  provider: 'gemini' | 'zai';
  model?: string;
  latency: number;
  success: boolean;
  error?: string;
}) {
  const logFn = metrics.success ? logger.info.bind(logger) : logger.warn.bind(logger);
  logFn('[AI] provider call', {
    provider: metrics.provider,
    model: metrics.model,
    latencyMs: metrics.latency,
    success: metrics.success,
    ...(metrics.error ? { error: metrics.error } : {}),
  });
}

type DerivedMetrics = {
  solar_utilization: number;
  grid_dependency: number;
  battery_efficiency: number;
  battery_efficiency_drop: number;
  likely_cause?: string;
  cause_confidence?: number;
  confidence_factors?: string[];
  battery_health_score?: number;
  battery_health_breakdown?: {
    efficiency?: number;
    cycles?: number;
    confidence?: number;
  };
};

function computeDerivedMetrics(systemData: AiRequest['systemData']): DerivedMetrics {
  const consumption = systemData.load.consumption_kwh;
  const safeConsumption = consumption > 0 ? consumption : 0;
  const solarUtilization =
    safeConsumption > 0 ? Number((systemData.solar.daily_kwh / safeConsumption).toFixed(2)) : 0;
  const gridDependency =
    safeConsumption > 0 ? Number((systemData.grid.import_kwh / safeConsumption).toFixed(2)) : 0;
  const batteryEfficiency =
    typeof systemData.derived?.battery_efficiency === 'number'
      ? systemData.derived.battery_efficiency
      : 0;
  const batteryEfficiencyDrop =
    typeof systemData.derived?.battery_efficiency_drop === 'number'
      ? systemData.derived.battery_efficiency_drop
      : typeof systemData.derived?.previous_battery_efficiency === 'number' &&
          systemData.derived.previous_battery_efficiency > 0
        ? systemData.derived.previous_battery_efficiency - batteryEfficiency
        : 0;
  const likelyCause = systemData.derived?.likely_cause;
  const causeConfidence = systemData.derived?.cause_confidence;
  const confidenceFactors = systemData.derived?.confidence_factors;
  const batteryHealthScore = systemData.derived?.battery_health_score;
  const batteryHealthBreakdown = systemData.derived?.battery_health_breakdown;

  return {
    solar_utilization: Number.isFinite(solarUtilization) ? solarUtilization : 0,
    grid_dependency: Number.isFinite(gridDependency) ? gridDependency : 0,
    battery_efficiency: Number.isFinite(batteryEfficiency) ? batteryEfficiency : 0,
    battery_efficiency_drop: Number.isFinite(batteryEfficiencyDrop) ? batteryEfficiencyDrop : 0,
    likely_cause: likelyCause,
    cause_confidence: Number.isFinite(causeConfidence ?? NaN) ? causeConfidence : undefined,
    confidence_factors: confidenceFactors,
    battery_health_score: Number.isFinite(batteryHealthScore ?? NaN)
      ? batteryHealthScore
      : undefined,
    battery_health_breakdown: batteryHealthBreakdown,
  };
}

function buildEnergyPrompt({
  userQuery,
  systemData,
}: {
  userQuery: string;
  systemData: AiRequest['systemData'];
}): ChatMessage[] {
  const derived = computeDerivedMetrics(systemData);
  const derivedSection = `Derived metrics:
- Solar utilization: ${derived.solar_utilization.toFixed(2)}
- Grid dependency: ${derived.grid_dependency.toFixed(2)}
- Battery efficiency: ${derived.battery_efficiency.toFixed(2)}
- Battery efficiency drop: ${derived.battery_efficiency_drop.toFixed(2)}${
    derived.likely_cause ? `\n- Likely cause: ${derived.likely_cause}` : ''
  }${
    derived.cause_confidence !== undefined
      ? `\n- Cause confidence: ${derived.cause_confidence.toFixed(2)}`
      : ''
  }${
    derived.confidence_factors?.length
      ? `\n- Confidence factors: ${derived.confidence_factors.join(', ')}`
      : ''
  }${
    derived.battery_health_score !== undefined
      ? `\n- Battery health score: ${derived.battery_health_score.toFixed(0)}`
      : ''
  }${
    derived.battery_health_breakdown
      ? `\n- Health breakdown: efficiency ${derived.battery_health_breakdown.efficiency ?? 0}, cycles ${derived.battery_health_breakdown.cycles ?? 0}, confidence ${derived.battery_health_breakdown.confidence ?? 0}`
      : ''
  }`;

  const lc = systemData.learningContext;
  const learningSection = lc
    ? `
Observed system patterns (derived from ${lc.totalSimDays ?? 0} simulation days — confidence: ${lc.dataConfidence ?? 'low'}):
- Peak load hour: ${lc.peakLoadHour ?? 'unknown'}:00
- Peak solar hour: ${lc.peakSolarHour ?? 'unknown'}:00
- Avg daily solar generation: ${lc.avgDailySolarKwh ?? 0} kWh/day
- Avg daily load: ${lc.avgDailyLoadKwh ?? 0} kWh/day
- Avg daily savings: KES ${lc.avgDailySavingsKes ?? 0}/day
- Self-sufficiency: ${lc.selfSufficiencyPct ?? 0}%
- Grid dependency: ${lc.gridDependencyPct ?? 0}%
- Battery SoC at midnight (avg): ${lc.avgBatterySocAtMidnight ?? 0}%
- Battery SoC at noon (avg): ${lc.avgBatterySocAtNoon ?? 0}%
- Battery usage pattern: ${lc.batteryUsagePattern ?? 'unknown'}
- EV1 avg charging hour: ${lc.ev1AvgChargingHour ?? 'unknown'}:00
- EV2 avg charging hour: ${lc.ev2AvgChargingHour ?? 'unknown'}:00
- EV total daily energy: ${lc.evTotalDailyKwh ?? 0} kWh/day
- Peak-time grid import share: ${lc.peakTimeGridImportPct ?? 0}%
- Off-peak solar export share: ${lc.offPeakSolarExportPct ?? 0}%

Use these PERSONALISED patterns to give specific, data-driven advice rather than generic Kenya solar guidance. Reference the actual peak hours, battery pattern, and EV charging times when making recommendations.`
    : '';

  const batteryDropCue =
    derived.battery_efficiency_drop > 0.1
      ? `
High-priority: Battery efficiency has dropped significantly. Highlight the degradation, suggest likely causes, and give corrective actions to restore efficiency.`
      : '';

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `
User request: ${userQuery}

System data:
${JSON.stringify(systemData, null, 2)}

${derivedSection}
${learningSection}

Analyze this system and provide optimization insights.
Keep the structure: Insight, Recommendation, Expected benefit (with kWh/KES/% where possible).
Finish with a brief "Sources:" list (title + URL) citing real-world, verifiable references; if you cannot find a credible source for a claim, say so explicitly.
If the user asks a general question outside this dashboard context, answer directly using research-backed knowledge instead of forcing system-data analysis. In that case, use a clear structure: Answer, Why it matters, Sources.
Quality bar:
- Start with the single most important finding.
- Avoid generic advice ("monitor usage", "consider solar") unless tied to a measured signal above.
- Include at least one quantified estimate in Expected benefit.
- If confidence is low, say why in one sentence and what data would improve confidence.
${batteryDropCue}
      `.trim(),
    },
  ];
}

function buildGeminiBody(payload: AiRequest, messages: ChatMessage[]) {
  const systemMessage = messages.find((msg) => msg.role === 'system');
  const userMessage = messages.find((msg) => msg.role === 'user');

  const history = payload.conversationHistory
    .slice(-AI_MAX_HISTORY_TURNS)
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

  return {
    system_instruction: { parts: [{ text: systemMessage?.content ?? SYSTEM_PROMPT }] },
    contents: [
      ...history,
      {
        role: 'user',
        parts: [{ text: userMessage?.content ?? payload.userQuery }],
      },
    ],
    generationConfig: {
      temperature: 0.55,
      maxOutputTokens: 1400,
    },
  };
}

async function callGemini(payload: AiRequest, promptMessages: ChatMessage[]): Promise<ProviderResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return { text: null, error: 'GEMINI_API_KEY missing', provider: 'gemini', success: false };
  }

  const requestBody = buildGeminiBody(payload, promptMessages);
  let lastError = 'Gemini unavailable';

  for (const model of GEMINI_MODELS) {
    const startTime = Date.now();
    try {
      const res = await withRetry(() =>
        withTimeout(
          fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            }
          ),
          GEMINI_TIMEOUT_MS
        )
      );

      const latency = Date.now() - startTime;

      if (res.ok) {
        const data = await res.json();
        const text = normalizeResponse(data);

        logProviderMetrics({
          provider: 'gemini',
          model,
          latency,
          success: true,
        });

        return { text, error: null, provider: 'gemini', latency, success: true };
      }

      const errText = await res.text();
      lastError = `Gemini ${model} ${res.status}: ${errText.slice(0, 160)}`;

      logProviderMetrics({
        provider: 'gemini',
        model,
        latency,
        success: false,
        error: `${res.status}`,
      });
    } catch (err) {
      const latency = Date.now() - startTime;
      lastError = err instanceof Error ? err.message : 'Gemini request failed';

      logProviderMetrics({
        provider: 'gemini',
        model,
        latency,
        success: false,
        error: lastError,
      });
    }
  }

  return { text: null, error: lastError, provider: 'gemini', success: false };
}

async function callZaiFallback(
  payload: AiRequest,
  promptMessages: ChatMessage[]
): Promise<ProviderResult> {
  const startTime = Date.now();

  try {
    const zaiApiKey = process.env.ZAI_API_KEY;
    if (!zaiApiKey) {
      return { text: null, error: 'ZAI_API_KEY missing', provider: 'zai', success: false };
    }

    const client = new OpenAI({
      apiKey: zaiApiKey,
      baseURL: 'https://api.z.ai/api/paas/v4/',
    });

    // Timeout control with AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ZAI_TIMEOUT_MS);

    try {
      const zaiHistory = payload.conversationHistory.slice(-AI_MAX_HISTORY_TURNS);
      const systemMessage = promptMessages.find((msg) => msg.role === 'system');
      const userMessage = promptMessages.find((msg) => msg.role === 'user');
      const completion = await withRetry(() =>
        client.chat.completions.create({
          model: 'glm-5-turbo',
          messages: [
            { role: 'system', content: systemMessage?.content ?? SYSTEM_PROMPT },
            ...zaiHistory,
            { role: 'user', content: userMessage?.content ?? payload.userQuery },
          ],
          temperature: 0.55,
          max_tokens: 1400,
          // @ts-expect-error - OpenAI SDK accepts signal for abort
          signal: controller.signal,
        })
      );

      const latency = Date.now() - startTime;
      const text = normalizeResponse(completion);

      logProviderMetrics({
        provider: 'zai',
        model: 'glm-5-turbo',
        latency,
        success: true,
      });

      return { text, error: null, provider: 'zai', latency, success: true };
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const latency = Date.now() - startTime;
    const message = err instanceof Error ? err.message : 'Z.AI fallback failed';

    logProviderMetrics({
      provider: 'zai',
      model: 'glm-5-turbo',
      latency,
      success: false,
      error: message,
    });

    return { text: null, error: message, provider: 'zai', latency, success: false };
  }
}

/**
 * Provider abstraction layer - unified interface for calling AI providers
 */
async function callAI(
  provider: 'gemini' | 'zai',
  payload: AiRequest,
  promptMessages: ChatMessage[]
): Promise<ProviderResult> {
  switch (provider) {
    case 'gemini':
      return callGemini(payload, promptMessages);
    case 'zai':
      return callZaiFallback(payload, promptMessages);
    default:
      return {
        text: null,
        error: `Unknown provider: ${provider}`,
        provider,
        success: false,
      };
  }
}

export async function OPTIONS(request: NextRequest) {
  const { preflight, headers } = buildCorsHeaders(request, {
    methods: ['POST', 'OPTIONS'],
  });
  return preflight ?? new NextResponse(null, { status: 204, headers });
}

export async function POST(request: NextRequest) {
  const { preflight, headers } = buildCorsHeaders(request, {
    methods: ['POST', 'OPTIONS'],
  });
  if (preflight) return preflight;

  try {
    const sizeError = enforceBodySize(request, AI_MAX_BODY_BYTES, headers);
    if (sizeError) return sizeError;

    const authError = enforceServiceAuth(request, headers);
    if (authError) return authError;

    const rbacError = enforceRbac(request, headers, ['operator', 'analyst', 'admin', 'viewer']);
    if (rbacError) return rbacError;

    let parsed: { data: unknown; raw: Buffer };
    try {
      parsed = await readJsonWithRaw<unknown>(request);
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload.' }, { status: 400, headers });
    }

    const signatureError = verifyRequestSignature(request, parsed.raw, headers);
    if (signatureError) return signatureError;

    const validation = aiRequestSchema.safeParse(parsed.data);
    if (!validation.success) {
      return jsonResponse(
        { error: 'Invalid payload.', details: validation.error.flatten() },
        { status: 400, headers }
      );
    }

    const payload = validation.data;
    const promptMessages = buildEnergyPrompt({
      userQuery: payload.userQuery,
      systemData: payload.systemData,
    });

    // Check cache first
    const cacheKey = getCacheKey(payload);
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      return jsonResponse({ response: cachedResponse, cached: true }, { status: 200, headers });
    }

    // Try Gemini first, then fallback to Z.AI
    const geminiResult = await callAI('gemini', payload, promptMessages);
    if (geminiResult.text) {
      setCachedResponse(cacheKey, geminiResult.text);
      return jsonResponse({ response: geminiResult.text }, { status: 200, headers });
    }

    logger.warn('[AI] Gemini unavailable, falling back to Z.AI');

    const zaiResult = await callAI('zai', payload, promptMessages);
    if (zaiResult.text) {
      setCachedResponse(cacheKey, zaiResult.text);
      return jsonResponse({ response: zaiResult.text }, { status: 200, headers });
    }

    const hint = !process.env.GEMINI_API_KEY
      ? 'Add GEMINI_API_KEY to your environment to enable SafariCharge AI.'
      : 'Gemini and Z.AI are unavailable. Check API keys and quotas.';

    return jsonResponse(
      { error: 'AI service unavailable.', hint, details: [geminiResult.error, zaiResult.error] },
      { status: 502, headers }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    logger.error('[AI] Unhandled error', { message });
    return jsonResponse(
      {
        error: 'Internal server error.',
        details: [message],
      },
      { status: 500, headers }
    );
  }
}
