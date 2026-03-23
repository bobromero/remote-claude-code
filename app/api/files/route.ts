import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildFileTree } from '@/lib/files/tree';
import { getConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  const cwd = request.nextUrl.searchParams.get('cwd') ?? getConfig().defaultCwd;
  const depth = Number(request.nextUrl.searchParams.get('depth')) || 3;

  try {
    const tree = await buildFileTree(cwd, depth);
    return NextResponse.json({ tree });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read directory';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
