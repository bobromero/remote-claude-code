import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readFileContent } from '@/lib/files/tree';
import { getConfig } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  const filePath = pathSegments.join('/');
  const cwd = request.nextUrl.searchParams.get('cwd') ?? getConfig().defaultCwd;

  try {
    const result = await readFileContent(cwd, filePath);
    return NextResponse.json({ path: filePath, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read file';
    const status = message.includes('traversal') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
