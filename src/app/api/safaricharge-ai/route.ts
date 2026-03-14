import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest, NextResponse } from 'next/server';

const SOLAR_KNOWLEDGE = `
=== SOLAR ENERGY FUNDAMENTALS ===
• Photovoltaic (PV) effect: Photons knock electrons loose in silicon cells, creating DC current.
• Monocrystalline panels: ~20-22% efficiency.
• Polycrystalline panels: ~15-17% efficiency.
• Thin-film panels: ~10-13% efficiency.

=== NAIROBI SOLAR CONDITIONS ===
• Peak Sun Hours: 5.5–6.5 hours/day
• Global Horizontal Irradiance: ~2,000 kWh/m²/year
• Dust can reduce output 2–8% if panels aren't cleaned.

=== BATTERY STORAGE ===
• LiFePO4 batteries: 3000–6000 cycles
• Optimal SoC range: 20–90%
• Round trip efficiency: ~95%

=== GRID & TARIFFS ===
• KPLC peak tariff ≈ KES 26/kWh
• Off-peak ≈ KES 16/kWh
• Solar + storage can reduce bills by 40-70% in Nairobi.

=== EV CHARGING ===
• Level 2 AC charging ≈ 7–22 kW
• DC fast charging ≈ 50–350 kW
• EV charging efficiency ≈ 90–93%
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

      const models = [
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest"
      ];

      for (const model of models) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ??
            "I couldn't generate a response.";
          return NextResponse.json({ response: text });
        }

        const errText = await res.text();
        console.error(`Gemini ${model} error:`, errText);
      }
    }

    // --- Fall back to Z.AI SDK ---
    try {
      const zai = await ZAI.create();
      // Build messages including conversation history for context continuity.
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

    return NextResponse.json(
      { error: "AI service unavailable." },
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