// Re-export the SDK types we use throughout the app
export type {
  SDKMessage,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKSystemMessage,
  SDKPartialAssistantMessage,
  SDKUserMessage,
  Query,
  CanUseTool,
  PermissionResult,
} from '@anthropic-ai/claude-agent-sdk';

export type ActiveSession = {
  connectionId: string;
  sessionId: string | null;
  query: import('@anthropic-ai/claude-agent-sdk').Query | null;
  cwd: string;
  abortController: AbortController;
};
