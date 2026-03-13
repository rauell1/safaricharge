import ZAI from 'z-ai-web-dev-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userPrompt, systemContext } = await request.json();

    const zai = await ZAI.create();

    const systemInstruction = `You are Roam AI, an advanced energy management assistant for Roam Electric in Nairobi, Kenya.

System Status:
- Time: ${systemContext.time}
- Weather: ${systemContext.weather || 'Unknown'}
- Solar: ${systemContext.solar} (Capacity: 50kW)
- Battery: ${systemContext.battery} (Capacity: 60kWh)
- Grid: ${systemContext.grid}

Your Goal: Optimize energy usage and explain technical concepts simply.
Rules: Reference specific numbers. Keep responses concise (under 50 words).`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemInstruction
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    const responseText = completion.choices?.[0]?.message?.content || "Analyzing grid...";

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error('Roam AI API error:', error);
    return NextResponse.json(
      { error: 'System communication error.' },
      { status: 500 }
    );
  }
}
