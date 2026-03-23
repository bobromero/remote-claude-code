import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getConfig, updateConfig } from '@/lib/config';

export async function GET() {
  const config = getConfig();
  return NextResponse.json({
    defaultCwd: config.defaultCwd,
    permissionMode: config.permissionMode,
    allowedTools: config.allowedTools,
    disallowedTools: config.disallowedTools,
    mcpServers: config.mcpServers,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  updateConfig(body);
  const config = getConfig();
  return NextResponse.json({
    defaultCwd: config.defaultCwd,
    permissionMode: config.permissionMode,
    allowedTools: config.allowedTools,
    disallowedTools: config.disallowedTools,
    mcpServers: config.mcpServers,
  });
}
