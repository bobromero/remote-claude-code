import { query as sdkQuery } from '@anthropic-ai/claude-agent-sdk';
import type { WebSocket } from 'ws';
import type { SDKMessage, Query } from './types';
import { PermissionBridge } from '../ws/permission-bridge';
import { getConfig, mergeQueryOptions } from '../config';
import type { QueryOptionsOverride, ServerMessage } from '../ws/protocol';
import { serializeMessage } from '../ws/protocol';

export type AgentRunOptions = {
  prompt: string;
  sessionId?: string;
  forkSession?: boolean;
  overrides?: QueryOptionsOverride;
};

export async function runAgent(
  ws: WebSocket,
  options: AgentRunOptions,
  permissionBridge: PermissionBridge,
  abortController: AbortController,
): Promise<{ sessionId: string }> {
  const config = getConfig();
  const merged = mergeQueryOptions(options.overrides);

  if (!config.apiKey) {
    send(ws, { type: 'error', message: 'ANTHROPIC_API_KEY is not set', code: 'NO_API_KEY' });
    return { sessionId: '' };
  }

  const queryOptions: Parameters<typeof sdkQuery>[0]['options'] = {
    cwd: merged.cwd,
    permissionMode: merged.permissionMode as 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan',
    allowedTools: merged.allowedTools.length > 0 ? merged.allowedTools : undefined,
    disallowedTools: merged.disallowedTools.length > 0 ? merged.disallowedTools : undefined,
    mcpServers: Object.keys(merged.mcpServers).length > 0 ? merged.mcpServers : undefined,
    maxTurns: merged.maxTurns,
    includePartialMessages: true,
    abortController,
    canUseTool: async (toolName, input, cbOptions) => {
      const decision = await permissionBridge.requestPermission(toolName, input, {
        title: cbOptions?.title,
        description: cbOptions?.description,
        toolUseID: cbOptions?.toolUseID,
      });
      return decision;
    },
  };

  if (options.sessionId) {
    queryOptions.resume = options.sessionId;
    if (options.forkSession) {
      queryOptions.forkSession = true;
    }
  }

  let sessionId = '';
  let q: Query | null = null;

  try {
    q = sdkQuery({ prompt: options.prompt, options: queryOptions });

    for await (const message of q) {
      if (abortController.signal.aborted) break;
      processMessage(ws, message);

      // Capture session ID from any message that has it
      if ('session_id' in message && message.session_id) {
        sessionId = message.session_id;
      }
    }
  } catch (err: unknown) {
    if (abortController.signal.aborted) {
      send(ws, { type: 'error', message: 'Query aborted', code: 'ABORT' });
    } else {
      const errMsg = err instanceof Error ? err.message : String(err);
      send(ws, { type: 'error', message: errMsg, code: 'SDK_ERROR' });
    }
  } finally {
    q?.close();
  }

  return { sessionId };
}

function processMessage(ws: WebSocket, message: SDKMessage): void {
  switch (message.type) {
    case 'system': {
      if (message.subtype === 'init' && message.session_id) {
        send(ws, {
          type: 'session_info',
          sessionId: message.session_id,
          cwd: message.cwd,
        });
      }
      break;
    }

    case 'assistant': {
      // Full assistant message — extract text and tool_use blocks
      const betaMessage = message.message;
      if (betaMessage && 'content' in betaMessage) {
        for (const block of betaMessage.content) {
          if (block.type === 'text') {
            send(ws, { type: 'text_delta', text: block.text });
          } else if (block.type === 'tool_use') {
            send(ws, {
              type: 'tool_start',
              id: block.id,
              tool: block.name,
              args: block.input as Record<string, unknown>,
            });
          }
        }
      }
      break;
    }

    case 'stream_event': {
      // Partial streaming event from includePartialMessages
      const event = message.event;
      if (!event) break;

      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if (delta.type === 'text_delta') {
          send(ws, { type: 'text_delta', text: delta.text });
        }
      } else if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'tool_use') {
          send(ws, {
            type: 'tool_start',
            id: block.id,
            tool: block.name,
            args: {},
          });
          send(ws, { type: 'status', status: 'tool_running' });
        }
      } else if (event.type === 'content_block_stop') {
        send(ws, { type: 'status', status: 'thinking' });
      }
      break;
    }

    case 'result': {
      const resultMsg: ServerMessage = {
        type: 'result',
        sessionId: message.session_id,
        text: message.subtype === 'success' ? message.result : '',
      };
      if ('usage' in message && message.usage) {
        resultMsg.cost = {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          totalCostUsd: message.total_cost_usd,
        };
      }
      send(ws, resultMsg);
      send(ws, { type: 'status', status: 'idle' });

      // If it was an error result, also send error details
      if (message.subtype !== 'success' && 'errors' in message && message.errors?.length) {
        send(ws, {
          type: 'error',
          message: message.errors.join('\n'),
          code: message.subtype,
        });
      }
      break;
    }

    default: {
      // Handle tool result messages if they exist
      const msg = message as Record<string, unknown>;
      if (msg.type === 'user' && msg.tool_use_result !== undefined) {
        // This is a tool result coming back
        const toolResult = msg.tool_use_result;
        if (msg.parent_tool_use_id) {
          send(ws, {
            type: 'tool_result',
            id: msg.parent_tool_use_id as string,
            tool: '',
            result: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
            isError: false,
          });
        }
      }
      break;
    }
  }
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(serializeMessage(msg));
  }
}
