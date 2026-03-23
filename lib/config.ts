import type { QueryOptionsOverride, McpServerDef } from './ws/protocol';

export type AppConfig = {
  apiKey: string;
  defaultCwd: string;
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
  allowedTools: string[];
  disallowedTools: string[];
  mcpServers: Record<string, McpServerDef>;
  port: number;
};

let runtimeConfig: Partial<AppConfig> = {};

export function getConfig(): AppConfig {
  return {
    apiKey: runtimeConfig.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
    defaultCwd: runtimeConfig.defaultCwd ?? process.env.DEFAULT_CWD ?? process.cwd(),
    permissionMode:
      (runtimeConfig.permissionMode as AppConfig['permissionMode']) ??
      (process.env.PERMISSION_MODE as AppConfig['permissionMode']) ??
      'default',
    allowedTools: runtimeConfig.allowedTools ?? parseList(process.env.ALLOWED_TOOLS),
    disallowedTools: runtimeConfig.disallowedTools ?? parseList(process.env.DISALLOWED_TOOLS),
    mcpServers: runtimeConfig.mcpServers ?? {},
    port: Number(process.env.PORT) || 3000,
  };
}

export function updateConfig(updates: Partial<AppConfig>) {
  runtimeConfig = { ...runtimeConfig, ...updates };
}

export function mergeQueryOptions(overrides?: QueryOptionsOverride) {
  const config = getConfig();
  return {
    cwd: overrides?.cwd ?? config.defaultCwd,
    permissionMode: overrides?.permissionMode ?? config.permissionMode,
    allowedTools: overrides?.allowedTools ?? config.allowedTools,
    disallowedTools: overrides?.disallowedTools ?? config.disallowedTools,
    mcpServers: overrides?.mcpServers ?? config.mcpServers,
    systemPrompt: overrides?.systemPrompt,
    maxTurns: overrides?.maxTurns,
  };
}

function parseList(val: string | undefined): string[] {
  if (!val) return [];
  return val.split(',').map((s) => s.trim()).filter(Boolean);
}
