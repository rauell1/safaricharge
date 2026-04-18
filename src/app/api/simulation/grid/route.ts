import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  defaultGridConfig,
  simulatePowerFlow,
  type GridConfig,
  type GridNode,
} from '@/simulation/gridEngine';

const nodeSchema = z.object({
  id: z.string().min(1),
  loadKw: z.number(),
  generationKw: z.number(),
  voltageKv: z.number().positive(),
  cableLengthM: z.number().min(0),
  cableMm2: z.number().min(0),
}) satisfies z.ZodType<GridNode>;

const configSchema = z.object({
  nominalVoltageKv: z.number().positive(),
  powerFactor: z.number().positive(),
  inertiaConstantS: z.number().positive().default(5),
  prevFrequencyHz: z.number().default(50),
  dtSeconds: z.number().positive(),
  batteryCapacityKwh: z.number().nonnegative().optional(),
  initialBatteryKwh: z.number().nonnegative().optional(),
  maxBatteryChargeKw: z.number().nonnegative().optional(),
  maxBatteryDischargeKw: z.number().nonnegative().optional(),
}) satisfies z.ZodType<GridConfig>;

const bodySchema = z.object({
  nodes: z.array(nodeSchema).min(1),
  config: configSchema.default(defaultGridConfig()),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = simulatePowerFlow(parsed.data.nodes, parsed.data.config);
  return NextResponse.json(result);
}
