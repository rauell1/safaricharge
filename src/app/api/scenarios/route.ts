/**
 * GET  /api/scenarios          — list all scenarios for a site
 * POST /api/scenarios          — create a new scenario
 */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId') ?? 'default';
  const rows = await prisma.scenario.findMany({
    where:   { siteId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ scenarios: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { siteId = 'default', name, config } = body;
  if (!name || !config) {
    return NextResponse.json({ error: 'name and config required' }, { status: 422 });
  }
  const scenario = await prisma.scenario.create({
    data: { siteId, name, config, status: 'pending' },
  });
  return NextResponse.json({ scenario }, { status: 201 });
}
