import { NextRequest } from 'next/server';
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

const SYSTEM_PROMPT = `
You are an advanced solar energy optimization assistant.

Your job is to analyze solar, battery, grid, and load data and provide:

1. Clear insights about system performance
2. Specific inefficiencies or missed opportunities
3. Actionable recommendations to improve energy usage

Rules:
- Be concise and practical
- Use real numbers from the data
- Focus on optimization (cost, efficiency, solar usage)
- Do NOT give generic advice
- Prioritize high-impact actions

Output format:
- Insight (what is happening)
- Recommendation (what to do)
- Expected benefit (why it matters)
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

  console.log(`[AI] Cache hit (age: ${Math.round(age / 1000)}s)`);
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
        console.log(`[AI] Retry attempt ${attempt} after transient error`);
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
  const status = metrics.success ? '✓' : '✗';
  const modelInfo = metrics.model ? ` [${metrics.model}]` : '';
  console.log(
    `[AI] ${status} ${metrics.provider}${modelInfo} - ${metrics.latency}ms${
      metrics.error ? ` - ${metrics.error}` : ''
    }`
  );
}

type DerivedMetrics = {
  solar_utilization: number;
  grid_dependency: number;
};

function computeDerivedMetrics(systemData: AiRequest['systemData']): DerivedMetrics {
  const consumption = systemData.load.consumption_kwh;
  const safeConsumption = consumption > 0 ? consumption : 0;
  const solarUtilization =
    safeConsumption > 0 ? Number((systemData.solar.daily_kwh / safeConsumption).toFixed(2)) : 0;
  const gridDependency =
    safeConsumption > 0 ? Number((systemData.grid.import_kwh / safeConsumption).toFixed(2)) : 0;

  return {
    solar_utilization: Number.isFinite(solarUtilization) ? solarUtilization : 0,
    grid_dependency: Number.isFinite(gridDependency) ? gridDependency : 0,
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
- Grid dependency: ${derived.grid_dependency.toFixed(2)}`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `
User request: ${userQuery}

System data:
${JSON.stringify(systemData, null, 2)}

${derivedSection}

Analyze this system and provide optimization insights.
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
      temperature: 0.7,
      maxOutputTokens: 1024,
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
          temperature: 0.7,
          max_tokens: 1024,
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

export async function POST(request: NextRequest) {
  const { preflight, headers } = buildCorsHeaders(request, {
    methods: ['POST', 'OPTIONS'],
  });
  if (preflight) return preflight;

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

  console.log('[AI] Gemini unavailable, falling back to Z.AI');

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
}
