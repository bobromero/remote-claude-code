import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessions } from '@/lib/sessions';
import { getConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  const cwd = request.nextUrl.searchParams.get('cwd') ?? getConfig().defaultCwd;
  const sessions = await getSessions(cwd);
  return NextResponse.json({ sessions });
}
