// WebSocket protocol message types between frontend and backend

// ── Client → Server ──

export type ClientMessage =
  | ChatMessage
  | PermissionResponseMessage
  | AbortMessage
  | WatchFilesMessage;

export type ChatMessage = {
  type: 'chat';
  text: string;
  sessionId?: string;
  forkSession?: boolean;
  options?: QueryOptionsOverride;
};

export type PermissionResponseMessage = {
  type: 'permission_response';
  requestId: string;
  decision: 'allow' | 'deny';
  message?: string;
};

export type AbortMessage = {
  type: 'abort';
};

export type WatchFilesMessage = {
  type: 'watch_files';
  cwd: string;
};

export type QueryOptionsOverride = {
  cwd?: string;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
  systemPrompt?: string;
  maxTurns?: number;
  allowedTools?: string[];
  disallowedTools?: string[];
  mcpServers?: Record<string, McpServerDef>;
};

export type McpServerDef =
  | { type?: 'stdio'; command: string; args?: string[]; env?: Record<string, string> }
  | { type: 'sse'; url: string; headers?: Record<string, string> }
  | { type: 'http'; url: string; headers?: Record<string, string> };

// ── Server → Client ──

export type ServerMessage =
  | TextDeltaMessage
  | ToolStartMessage
  | ToolResultMessage
  | PermissionRequestMessage
  | ResultMessage
  | ErrorMessage
  | ApiRetryMessage
  | FileChangedMessage
  | SessionInfoMessage
  | StatusMessage;

export type TextDeltaMessage = {
  type: 'text_delta';
  text: string;
};

export type ToolStartMessage = {
  type: 'tool_start';
  id: string;
  tool: string;
  args: Record<string, unknown>;
};

export type ToolResultMessage = {
  type: 'tool_result';
  id: string;
  tool: string;
  result: string;
  isError?: boolean;
};

export type PermissionRequestMessage = {
  type: 'permission_request';
  requestId: string;
  tool: string;
  args: Record<string, unknown>;
  title?: string;
  description?: string;
};

export type ResultMessage = {
  type: 'result';
  sessionId: string;
  text: string;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    totalCostUsd: number;
  };
};

export type ErrorMessage = {
  type: 'error';
  message: string;
  code?: string;
};

export type ApiRetryMessage = {
  type: 'api_retry';
  error: string;
  attempt: number;
  maxRetries: number;
  retryDelayMs: number;
  errorStatus: number | null;
};

export type FileChangedMessage = {
  type: 'file_changed';
  path: string;
  action: 'add' | 'change' | 'unlink';
};

export type SessionInfoMessage = {
  type: 'session_info';
  sessionId: string;
  cwd: string;
};

export type StatusMessage = {
  type: 'status';
  status: 'thinking' | 'tool_running' | 'idle';
};

// ── Helpers ──

export function serializeMessage(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

export function parseClientMessage(data: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.type === 'string') {
      return parsed as ClientMessage;
    }
    return null;
  } catch {
    return null;
  }
}
