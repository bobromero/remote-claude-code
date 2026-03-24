import { existsSync } from 'fs';
import { resolve } from 'path';
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

// Capture the project root at startup (where the server was launched from)
const PROJECT_ROOT = process.cwd();

let runtimeConfig: Partial<AppConfig> = {};

/**
 * Resolve a directory path, handling WSL path conversion.
 * Returns the path if it exists, or null if it doesn't.
 */
function resolveDir(dir: string | undefined): string | null {
  if (!dir) return null;

  let resolved = dir;

  // Convert Windows UNC WSL paths (\\wsl.localhost\Ubuntu\...) to native WSL paths
  const wslMatch = dir.match(/^\\\\wsl\.localhost\\[^\\]+\\?(.*)/i)
    ?? dir.match(/^\\\\wsl\$\\[^\\]+\\?(.*)/i);
  if (wslMatch) {
    resolved = '/' + wslMatch[1].replace(/\\/g, '/');
  }

  // Convert Windows drive paths (C:\Users\...) to WSL mount paths
  const driveMatch = dir.match(/^([A-Za-z]):\\(.*)/);
  if (driveMatch) {
    resolved = `/mnt/${driveMatch[1].toLowerCase()}/${driveMatch[2].replace(/\\/g, '/')}`;
  }

  resolved = resolve(resolved);

  if (existsSync(resolved)) {
    return resolved;
  }
  return null;
}

export function getConfig(): AppConfig {
  const envCwd = resolveDir(runtimeConfig.defaultCwd) ?? resolveDir(process.env.DEFAULT_CWD);

  return {
    apiKey: runtimeConfig.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
    defaultCwd: envCwd ?? PROJECT_ROOT,
    permissionMode:
      (runtimeConfig.permissionMode as AppConfig['permissionMode']) ??
      (process.env.PERMISSION_MODE as AppConfig['permissionMode']) ??
      'acceptEdits',
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
