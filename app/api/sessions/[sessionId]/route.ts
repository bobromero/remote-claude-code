import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionConversation } from '@/lib/sessions';
import { getConfig } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const cwd = request.nextUrl.searchParams.get('cwd') ?? getConfig().defaultCwd;
  const messages = await getSessionConversation(sessionId, cwd);

  return NextResponse.json({
    sessionId,
    messages,
    metadata: { cwd },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  // Session deletion is handled by SDK's file system
  // For now, return success — we can add file deletion later
  void sessionId;
  return new NextResponse(null, { status: 204 });
}
