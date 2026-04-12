/**
 * GET    /api/scenarios/:id    — get a single scenario (with results)
 * PATCH  /api/scenarios/:id    — update config / name
 * DELETE /api/scenarios/:id    — soft-delete
 */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  const row = await prisma.scenario.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ scenario: row });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = await req.json();
  const { name, config, results, status } = body;
  const updated = await prisma.scenario.update({
    where: { id: params.id },
    data: {
      ...(name    !== undefined && { name }),
      ...(config  !== undefined && { config }),
      ...(results !== undefined && { results }),
      ...(status  !== undefined && { status }),
    },
  });
  return NextResponse.json({ scenario: updated });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  await prisma.scenario.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
