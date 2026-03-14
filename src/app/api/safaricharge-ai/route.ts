import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Comprehensive solar / energy knowledge injected into every conversation
// ---------------------------------------------------------------------------
const SOLAR_KNOWLEDGE = `
=== SOLAR ENERGY FUNDAMENTALS ===
• Photovoltaic (PV) effect: Photons knock electrons loose in silicon cells, creating DC current.
• Monocrystalline panels: ~20-22% efficiency, best for limited roof space, performs well in diffuse light.
• Polycrystalline panels: ~15-17% efficiency, lower cost, slightly worse in heat.
• Thin-film (CdTe/CIGS): ~10-13% efficiency, flexible, good in high temperatures.
• Standard Test Conditions (STC): 1000 W/m², 25°C, AM1.5 spectrum.
• Performance ratio (PR): Actual yield / theoretical yield — good systems hit 75-85%.
• Temperature coefficient: Typical mono panel loses ~0.35-0.45%/°C above 25°C. Kenya's heat matters!
• Soiling losses: Dust on panels costs 2-8% in Nairobi's dry seasons; clean every 2-4 weeks.
• Panel degradation: ~0.5% per year; LID (Light-Induced Degradation) in first year ~1-2%.
• Tilt angle for Nairobi (1.3°S): Near-horizontal (5-10°) maximises year-round yield.
• Azimuth: Face north in Southern Hemisphere. Nairobi is near equator — slight north bias optimal.
• Inter-row shading: Keep row spacing 2-3× panel height to avoid morning/evening shading.
• MPPT (Maximum Power Point Tracking): Inverter algorithm that maximises power harvest despite shade/temperature changes.
• String vs micro-inverters: String inverters are cheaper; micro-inverters optimise each panel, better in partial shade.
• AC vs DC coupling for batteries: AC coupling (grid-tie + separate battery inverter) flexible; DC coupling more efficient.

=== SOLAR IRRADIANCE — NAIROBI, KENYA ===
• Peak Sun Hours (PSH): Nairobi averages 5.5-6.5 PSH/day — excellent for solar.
• Jan-Mar: Very high irradiance (long days, dry, 6-7 PSH), some afternoon clouds.
• Apr-May: Long rains — significant cloud cover, 3-5 PSH, generation drops 30-50%.
• Jun-Aug: Cool, partly cloudy (short rains influence), ~5 PSH.
• Sep-Oct: Short dry season, very good (6 PSH).
• Nov-Dec: Short rains, ~4 PSH on average.
• Global Horizontal Irradiance (GHI): Nairobi ~2,000-2,100 kWh/m²/year.
• Dust: Red laterite dust from unpaved roads significantly soils panels — clean weekly in dry seasons.
• Altitude effect: At 1,661m above sea level, thinner atmosphere means slightly higher UV and irradiance.

=== BATTERY STORAGE TECHNOLOGY ===
• LiFePO4 (Lithium Iron Phosphate): Safest Li-ion chemistry. Cycle life 3,000-6,000 cycles, 80% DoD safe, temperature tolerant.
• NMC (Nickel Manganese Cobalt): Higher energy density but less thermally stable. Common in EVs.
• Lead-acid: Cheap, proven, but only 50% DoD safe, ~500 cycles, heavy.
• State of Charge (SoC): % of remaining capacity. Best to stay between 20-90% for longevity.
• Depth of Discharge (DoD): % discharged per cycle. Shallower DoD dramatically extends life.
• C-rate: 1C charges a battery in 1 hour. SafariCharge uses ~0.15C charge / 0.25C discharge — gentle.
• Round-trip efficiency (RTE): LiFePO4 ~95-97%, lead-acid ~80-85%.
• Thermal management: Lithium batteries degrade faster above 45°C. Nairobi's moderate temps are ideal.
• Battery health degradation: Caused by high SoC storage, high temperatures, fast charging, and deep cycling.
• Calendar aging: Batteries lose ~2-4% capacity/year even if not used.
• BMS (Battery Management System): Protects against overcharge, overdischarge, overcurrent, thermal runaway.
• Second-life batteries: EV batteries at 70-80% health can be repurposed for stationary storage.

=== GRID INTERACTION & TARIFFS ===
• KPLC (Kenya Power & Lighting Co) tariff structure:
  - Off-peak: ~KES 16/kWh (23:00-06:00, residential)
  - Standard: ~KES 21/kWh (day hours)
  - Peak: ~KES 26/kWh (07:00-22:00 in commercial)
  - VAT: 16% on electricity
  - Fuel Cost Charge (FCC): ~KES 4-7/kWh extra (volatile, linked to fuel costs)
  - Foreign Exchange Fluctuation Adjustment (FOREX): Adds further cost
  - REP Levy, ERC Levy, Rural Electrification also apply
• Net metering: Kenya allows limited feed-in but regulatory framework still developing.
• Time-of-Use (ToU) optimization: Charge battery during off-peak, discharge during peak — core savings strategy.
• Power factor: KPLC charges commercial customers for poor power factor (<0.9).
• Demand charges: Large commercial customers pay KES 800-1,200/kW of peak monthly demand.
• Load shedding: Kenya still experiences load shedding in certain areas; batteries provide backup.
• Transformer capacity: Most Nairobi residential transformers are 200-500 kVA — important for large EV fleets.

=== EV CHARGING & V2G ===
• SAE J1772 (Type 1): 7.4 kW AC — common in older EVs.
• IEC 62196 (Type 2): 22 kW AC — European standard, used in newer EVs.
• CCS (Combined Charging System): DC fast charging, 50-350 kW.
• CHAdeMO: DC fast charging (older standard), 50-100 kW.
• V2G (Vehicle-to-Grid): EV exports power back to grid or building during peak demand. Requires bidirectional charger.
• V2B (Vehicle-to-Building): EV powers building loads — what SafariCharge implements.
• V2H (Vehicle-to-Home): EV powers home specifically.
• Smart charging: Delay EV charging to off-peak hours (23:00-06:00) for maximum savings.
• EV battery degradation from V2G: Extra cycling reduces pack life; best to use V2G sparingly when battery > 60% SoC.
• Charging efficiency: AC Level 2 charger is ~90-93% efficient (wall-to-battery).
• Range anxiety mitigation: Always leave EV at ≥20% SoC for departure.
• Fleet electrification economics in Kenya: Fuel savings ~KES 15-20/km (petrol) vs ~KES 3-5/km (electric).

=== ENERGY MANAGEMENT SYSTEMS (EMS) ===
• Priority modes: Load-first (grid stability), Solar-first (self-consumption), Battery-first (emergency backup).
• Self-consumption rate: Solar energy used on-site / total solar generated. Target >80% for good economics.
• Self-sufficiency rate: Energy met by solar+battery / total consumption. Target >70% in Nairobi.
• Levelized Cost of Energy (LCOE): For a 50kW Nairobi system, LCOE ~KES 8-12/kWh after 25 years.
• Payback period: Typically 5-7 years for commercial Nairobi installations.
• Carbon offset: 1 kWh solar = ~0.42 kg CO₂ avoided (Kenya grid emission factor ~0.42 kgCO₂/kWh).
• System sizing rule of thumb: Battery should cover 4-8 hours of base load for overnight backup.
• PV system sizing: Size to generate 100-120% of annual consumption to account for losses.
• Inverter sizing: Typically 1:1.2 ratio (PV array / inverter) — allows some DC oversizing.
• Monitoring: Real-time kW, kWh, SoC monitoring essential for optimization. Use modbus/RS485 or cloud APIs.
• Reactive power: Grid-tied inverters can provide reactive power support (volt-var control) — helps KPLC.

=== KENYA SOLAR MARKET & REGULATIONS ===
• EPRA (Energy and Petroleum Regulatory Authority): Licenses energy systems in Kenya.
• Net metering regulations: KPLC and EPRA are developing frameworks; currently limited.
• Import duties on solar equipment: PV panels and batteries are largely VAT-exempt in Kenya.
• Green Climate Fund: Kenya has access to concessional climate finance for clean energy.
• Kenya's renewable energy target: 100% clean electricity by 2030 (mostly achieved via geothermal, ~75% already).
• Geothermal dominance: Kenya generates ~75% of electricity from geothermal — already low-carbon grid.
• Off-grid solar: 4+ million Kenyan households use solar home systems — thriving market.
• SGR (Standard Gauge Railway): Runs on KPLC power — large infrastructure demand.
• KPLC challenges: Aging infrastructure, high technical losses (~20%), high tariffs vs African peers.
• Solar + storage business case: In Nairobi, commercial customers can cut bills 40-70% with well-sized systems.

=== SYSTEM OPTIMIZATION STRATEGIES ===
• Peak shaving: Use battery to cap peak demand and reduce demand charges — often the biggest commercial saving.
• Load shifting: Move flexible loads (EV charging, water heating) to solar hours or off-peak.
• Predictive charging: Charge EV and battery before forecasted cloudy days.
• Thermal storage: Hot water tanks as cheap "batteries" — preheat with solar during the day.
• Cascaded battery dispatch: Discharge least-healthy battery first to equalize aging across pack.
• Demand response: Curtail non-critical loads during grid stress events.
• Self-healing microgrids: Automatic islanding during KPLC outages — requires proper transfer switches.
• Harmonic distortion: EV chargers can introduce harmonics — use filters if THD > 5%.
• Power quality: Solar inverters must comply with Kenya Standard KS IEC 62116 (anti-islanding).
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const genAI = new GoogleGenerativeAI(apiKey);

    const systemInstruction = `You are SafariCharge AI — a highly intelligent, expert energy management assistant for the SafariCharge solar+EV charging facility in Nairobi, Kenya. You are embedded in a live simulation dashboard.

You have deep expertise in:
- Solar PV systems, battery storage (LiFePO4), and grid interaction
- KPLC tariffs, Kenya power market, and Nairobi climate
- EV charging, V2G/V2B, and fleet electrification
- Energy management algorithms and optimization strategies
- Financial analysis: payback periods, LCOE, savings calculations

${SOLAR_KNOWLEDGE}

=== CURRENT LIVE SYSTEM STATE ===
- Date/Time: ${systemContext.date} at ${systemContext.time}
- Weather: ${systemContext.weather}
- Solar Output: ${systemContext.solar} (Total today: ${systemContext.solarTotal} kWh)
- Battery: ${systemContext.battery} | Health: ${systemContext.batteryHealth} | Cycles: ${systemContext.batteryCycles}
- Grid: ${systemContext.grid} | ${systemContext.peakTime ? '⚠️ PEAK TARIFF active' : 'Off-peak tariff'} @ ${systemContext.tariffRate} KES/kWh
- EV1 (Roam Alto, 80 kWh): ${systemContext.ev1}
- EV2 (Roam Rapid, 118 kWh): ${systemContext.ev2}
- V2G Mode: ${systemContext.v2gActive ? 'ACTIVE — EVs supplying power to building' : 'Inactive'}
- Total Savings: ${systemContext.savings} KES | Feed-in Earnings: ${systemContext.feedInEarnings} KES
- Carbon Offset: ${systemContext.carbonOffset} kg CO₂
- Monthly Peak Demand: ${systemContext.monthlyPeakDemand}
- Priority Mode: ${systemContext.priorityMode}
- Simulation: ${systemContext.simRunning ? 'Running (auto mode)' : 'Paused (manual mode)'}

=== YOUR BEHAVIOUR ===
- Be specific, smart, and actionable. Reference the live numbers above.
- Give concrete recommendations when relevant (e.g., "shift EV charging to 23:00 to save ~KES 320 tonight").
- Explain *why*, not just what.
- When asked about costs, use KPLC tariff rates and KES currency.
- Proactively flag issues (low battery, high grid import during peak, V2G opportunity, soiling risk).
- Keep responses concise but substantive — 2-4 short paragraphs or a short list.
- Use emojis sparingly but helpfully (☀️ for solar, 🔋 for battery, ⚡ for grid, 🚗 for EV).
- Never say "I don't know" — reason from first principles using your solar knowledge if needed.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
    });

    // Build Gemini chat history (must alternate user/model, no system role)
    const geminiHistory = conversationHistory.slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(userPrompt);
    const responseText = result.response.text() ||
      "I'm having trouble processing that. Please try rephrasing your question.";

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error('SafariCharge AI error:', error);
    return NextResponse.json(
      { error: 'AI service temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}
