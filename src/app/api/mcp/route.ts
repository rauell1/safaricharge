import { NextRequest, NextResponse } from 'next/server';
import { handleMcpJsonRpc } from '@/lib/mcp/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await handleMcpJsonRpc(body);
    return NextResponse.json(response, { status: response.error ? 400 : 200 });
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    );
  }
}
