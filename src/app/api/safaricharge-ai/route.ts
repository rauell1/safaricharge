import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest, NextResponse } from 'next/server';

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

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SystemContext {
  time: string;
  date: string;
  weather: string;
  solar: string;
  solarTotal: string;
  battery: string;
  batteryHealth: string;
  batteryCycles: number;
  grid: string;
  savings: string;
  feedInEarnings: string;
  carbonOffset: string;
  peakTime: boolean;
  tariffRate: string;
  ev1: string;
  ev2: string;
  v2gActive: boolean;
  monthlyPeakDemand: string;
  priorityMode: string;
  simRunning: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { userPrompt, conversationHistory, systemContext } = await request.json() as {
      userPrompt: string;
      conversationHistory: Message[];
      systemContext: SystemContext;
    };

    const systemInstruction = `
You are SafariCharge AI, an intelligent solar and EV energy advisor for a charging facility in Nairobi.

You specialize in:
• Solar PV systems
• Battery storage
• EV charging
• Energy optimization
• Kenya electricity tariffs

${SOLAR_KNOWLEDGE}

CURRENT SYSTEM STATE
Time: ${systemContext.time}
Date: ${systemContext.date}
Weather: ${systemContext.weather}

Solar Output: ${systemContext.solar}
Solar Generated Today: ${systemContext.solarTotal}

Battery: ${systemContext.battery}
Battery Health: ${systemContext.batteryHealth}
Battery Cycles: ${systemContext.batteryCycles}

Grid Status: ${systemContext.grid}
Tariff Rate: ${systemContext.tariffRate} KES/kWh
Peak Tariff: ${systemContext.peakTime}

EV1: ${systemContext.ev1}
EV2: ${systemContext.ev2}

V2G Active: ${systemContext.v2gActive}

Savings: ${systemContext.savings} KES
Feed-in Earnings: ${systemContext.feedInEarnings} KES
Carbon Offset: ${systemContext.carbonOffset}

Priority Mode: ${systemContext.priorityMode}
Simulation Running: ${systemContext.simRunning}

Respond clearly with actionable insights.
`;

    // --- Try Gemini API first ---
    const geminiKey = process.env.GEMINI_API_KEY;
    const history = conversationHistory.slice(-12).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    if (geminiKey) {
      const body = {
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          ...history,
          {
            role: 'user',
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      };

      // Prefer current stable models; fall back to older IDs if the key has limited access
      const models = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash"
      ];

      let lastGeminiError: string | null = null;

      for (const model of models) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
              signal: controller.signal,
            }
          );

          if (res.ok) {
            clearTimeout(timeoutId);
            const data = await res.json();
            const text =
              data?.candidates?.[0]?.content?.parts?.[0]?.text ??
              "I couldn't generate a response.";
            return NextResponse.json({ response: text });
          }

          const errText = await res.text();
          console.error(`Gemini ${model} error (${res.status}):`, errText);

          try {
            const errJson = JSON.parse(errText) as { error?: { message?: string; status?: string } };
            const msg = errJson?.error?.message ?? errText.slice(0, 120);
            if (msg.includes("API key") || msg.includes("invalid") || msg.includes("403")) lastGeminiError = "API key invalid or not enabled. Check https://aistudio.google.com/apikey";
            else if (msg.includes("429") || msg.includes("quota") || msg.includes("Resource has been exhausted")) lastGeminiError = "Quota exceeded. Try again later or check your Google Cloud quota.";
            else if (msg.includes("404") || msg.includes("not found")) lastGeminiError = "Model unavailable. Try again later.";
            else lastGeminiError = msg;
          } catch {
            lastGeminiError = res.status === 403 ? "API key invalid or not enabled." : res.status === 429 ? "Quota exceeded." : `Gemini returned ${res.status}.`;
          }
        } catch (fetchErr: unknown) {
          const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError';
          console.error(`Gemini ${model} ${isAbort ? 'timed out' : 'fetch error'}:`, fetchErr);
          lastGeminiError = isAbort ? "Request timed out. Try again." : "Network or server error. Try again.";
        } finally {
          clearTimeout(timeoutId);
        }
      }

      if (lastGeminiError) {
        return NextResponse.json(
          { error: `AI service unavailable. ${lastGeminiError} See https://aistudio.google.com/apikey` },
          { status: 502 }
        );
      }
    }

    // --- Fall back to Z.AI SDK (typically works in browser; may fail in server context) ---
    try {
      const zai = await ZAI.create();
      const zaiHistory = conversationHistory.slice(-12).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemInstruction },
          ...zaiHistory,
          { role: 'user', content: userPrompt }
        ]
      });
      const responseText = completion.choices?.[0]?.message?.content || "I couldn't generate a response.";
      return NextResponse.json({ response: responseText });
    } catch (zaiError) {
      console.error("Z.AI fallback error:", zaiError);
    }

    // No provider succeeded: return a clear message so the user can fix config
    const hint = !geminiKey
      ? " Add GEMINI_API_KEY to your .env file (see .env.example) to enable SafariCharge AI."
      : " Check that GEMINI_API_KEY is valid and has quota at https://aistudio.google.com/apikey.";
    return NextResponse.json(
      { error: `AI service unavailable.${hint}` },
      { status: 502 }
    );

  } catch (error) {

    console.error("SafariCharge AI error:", error);

    return NextResponse.json(
      { error: "Internal AI error" },
      { status: 500 }
    );
  }
}