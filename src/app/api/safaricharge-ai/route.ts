import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  AI_MAX_BODY_BYTES,
  AI_MAX_HISTORY_TURNS,
  AI_MAX_PROMPT_CHARS,
  GEMINI_TIMEOUT_MS,
  ZAI_TIMEOUT_MS,
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

const SOLAR_KNOWLEDGE = `
=== SOLAR ENERGY FUNDAMENTALS ===
• Photovoltaic (PV) effect: Photons knock electrons loose in silicon cells, creating DC current.
• Monocrystalline panels: ~20-22% efficiency.
• Polycrystalline panels: ~15-17% efficiency.
• Thin-film panels: ~10-13% efficiency.

=== NAIROBI SOLAR CONDITIONS ===
• Peak Sun Hours: 5.5-6.5 hours/day
• Global Horizontal Irradiance: ~2,000 kWh/m²/year
• Dust can reduce output 2-8% if panels aren't cleaned.

=== BATTERY STORAGE ===
• LiFePO4 batteries: 3000-6000 cycles
• Optimal SoC range: 20-90%
• Round trip efficiency: ~95%

=== GRID & TARIFFS ===
• KPLC peak tariff ≈ KES 26/kWh
• Off-peak ≈ KES 16/kWh
• Solar + storage can reduce bills by 40-70% in Nairobi.

=== EV CHARGING ===
• Level 2 AC charging ≈ 7-22 kW
• DC fast charging ≈ 50-350 kW
• EV charging efficiency ≈ 90-93%
`;

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(AI_MAX_PROMPT_CHARS),
});

const systemContextSchema = z.object({
  time: z.string(),
  date: z.string(),
  weather: z.string(),
  solar: z.string(),
  solarTotal: z.string(),
  battery: z.string(),
  batteryHealth: z.string(),
  batteryCycles: z.number(),
  grid: z.string(),
  savings: z.string(),
  feedInEarnings: z.string(),
  carbonOffset: z.string(),
  peakTime: z.boolean(),
  tariffRate: z.string(),
  ev1: z.string(),
  ev2: z.string(),
  v2gActive: z.boolean(),
  monthlyPeakDemand: z.string(),
  priorityMode: z.string(),
  simRunning: z.boolean(),
});

const aiRequestSchema = z.object({
  userPrompt: z.string().min(1).max(AI_MAX_PROMPT_CHARS),
  conversationHistory: z.array(messageSchema).max(AI_MAX_HISTORY_TURNS * 2).default([]),
  systemContext: systemContextSchema,
});

type AiRequest = z.infer<typeof aiRequestSchema>;

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

function buildSystemInstruction(context: AiRequest['systemContext']) {
  return `
You are SafariCharge AI, an intelligent solar and EV energy advisor for a charging facility in Nairobi.

You specialise in:
• Solar PV systems
• Battery storage
• EV charging
• Energy optimisation
• Kenya electricity tariffs

${SOLAR_KNOWLEDGE}

CURRENT SYSTEM STATE
Time: ${context.time}
Date: ${context.date}
Weather: ${context.weather}

Solar Output: ${context.solar}
Solar Generated Today: ${context.solarTotal}

Battery: ${context.battery}
Battery Health: ${context.batteryHealth}
Battery Cycles: ${context.batteryCycles}

Grid Status: ${context.grid}
Tariff Rate: ${context.tariffRate} KES/kWh
Peak Tariff: ${context.peakTime}

EV1: ${context.ev1}
EV2: ${context.ev2}

V2G Active: ${context.v2gActive}

Savings: ${context.savings} KES
Feed-in Earnings: ${context.feedInEarnings} KES
Carbon Offset: ${context.carbonOffset}

Priority Mode: ${context.priorityMode}
Monthly Peak Demand: ${context.monthlyPeakDemand}
Simulation Running: ${context.simRunning}

Respond clearly with actionable insights.`;
}

function buildGeminiBody(payload: AiRequest, systemInstruction: string) {
  const history = payload.conversationHistory
    .slice(-AI_MAX_HISTORY_TURNS)
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

  return {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [
      ...history,
      {
        role: 'user',
        parts: [{ text: payload.userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };
}

async function callGemini(payload: AiRequest, systemInstruction: string): Promise<ProviderResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return { text: null, error: 'GEMINI_API_KEY missing', provider: 'gemini', success: false };
  }

  const requestBody = buildGeminiBody(payload, systemInstruction);
  let lastError = 'Gemini unavailable';

  for (const model of GEMINI_MODELS) {
    const startTime = Date.now();
    try {
      const res = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        ),
        GEMINI_TIMEOUT_MS
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
  systemInstruction: string
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
      const completion = await client.chat.completions.create({
        model: 'glm-5-turbo',
        messages: [
          { role: 'system', content: systemInstruction },
          ...zaiHistory,
          { role: 'user', content: payload.userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        // @ts-expect-error - OpenAI SDK accepts signal for abort
        signal: controller.signal,
      });

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
  systemInstruction: string
): Promise<ProviderResult> {
  switch (provider) {
    case 'gemini':
      return callGemini(payload, systemInstruction);
    case 'zai':
      return callZaiFallback(payload, systemInstruction);
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
  const systemInstruction = buildSystemInstruction(payload.systemContext);

  // Try Gemini first, then fallback to Z.AI
  const geminiResult = await callAI('gemini', payload, systemInstruction);
  if (geminiResult.text) {
    return jsonResponse({ response: geminiResult.text }, { status: 200, headers });
  }

  console.log('[AI] Gemini unavailable, falling back to Z.AI');

  const zaiResult = await callAI('zai', payload, systemInstruction);
  if (zaiResult.text) {
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
