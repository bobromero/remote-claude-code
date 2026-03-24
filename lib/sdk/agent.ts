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

  // Debug: verify key integrity and check for interfering env vars
  const key = config.apiKey;
  const maskedKey = key.length > 20
    ? `${key.slice(0, 12)}...${key.slice(-4)} (len=${key.length})`
    : `(len=${key.length})`;
  console.log(`[agent] API key: ${maskedKey}`);
  const anthropicEnvVars = Object.keys(process.env)
    .filter((k) => /^(ANTHROPIC_|CLAUDE_)/i.test(k))
    .map((k) => k === 'ANTHROPIC_API_KEY' ? `${k}=(set, len=${process.env[k]?.length})` : `${k}=${process.env[k]}`);
  if (anthropicEnvVars.length > 0) {
    console.log(`[agent] Anthropic/Claude env vars: ${anthropicEnvVars.join(', ')}`);
  }

  const sdkEnv: Record<string, string | undefined> = { ...process.env, ANTHROPIC_API_KEY: config.apiKey };

  const effectiveMode = merged.permissionMode as 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

  // #region agent log
  fetch('http://127.0.0.1:7810/ingest/2e2765a4-321c-48c9-a611-3bbbbd5a96cb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a4ee50'},body:JSON.stringify({sessionId:'a4ee50',location:'lib/sdk/agent.ts:47',message:'runAgent called',data:{effectiveMode,cwd:merged.cwd,isBypassed:permissionBridge.isBypassed,envPermissionMode:process.env.PERMISSION_MODE,runtimePermissionMode:config.permissionMode},timestamp:Date.now(),hypothesisId:'H1,H4'})}).catch(()=>{});
  // #endregion

  const EDIT_TOOL_PATTERNS = [
    'write', 'edit', 'create', 'multiedit', 'notebookedit',
    'strreplace', 'insert', 'patch', 'save', 'delete',
  ];

  function isEditTool(toolName: string): boolean {
    const lower = toolName.toLowerCase();
    return EDIT_TOOL_PATTERNS.some((p) => lower.includes(p));
  }

  const queryOptions: Parameters<typeof sdkQuery>[0]['options'] = {
    cwd: merged.cwd,
    env: sdkEnv,
    permissionMode: effectiveMode,
    allowedTools: merged.allowedTools.length > 0 ? merged.allowedTools : undefined,
    disallowedTools: merged.disallowedTools.length > 0 ? merged.disallowedTools : undefined,
    mcpServers: Object.keys(merged.mcpServers).length > 0 ? merged.mcpServers : undefined,
    maxTurns: merged.maxTurns,
    includePartialMessages: true,
    abortController,
    canUseTool: async (toolName, input, cbOptions) => {
      // #region agent log
      fetch('http://127.0.0.1:7810/ingest/2e2765a4-321c-48c9-a611-3bbbbd5a96cb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ecb1a5'},body:JSON.stringify({sessionId:'ecb1a5',location:'lib/sdk/agent.ts:canUseTool-entry',message:'canUseTool called',data:{toolName,inputKeys:Object.keys(input),isBypassed:permissionBridge.isBypassed,effectiveMode,isEdit:isEditTool(toolName),cbOptionsKeys:cbOptions?Object.keys(cbOptions):null,toolUseID:cbOptions?.toolUseID},timestamp:Date.now(),hypothesisId:'H1,H2,H4'})}).catch(()=>{});
      // #endregion

      if (permissionBridge.isBypassed) {
        // #region agent log
        fetch('http://127.0.0.1:7810/ingest/2e2765a4-321c-48c9-a611-3bbbbd5a96cb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ecb1a5'},body:JSON.stringify({sessionId:'ecb1a5',location:'lib/sdk/agent.ts:canUseTool-bypassed',message:'Returning allow (bypassed)',data:{toolName},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        return { behavior: 'allow' as const };
      }

      switch (effectiveMode) {
        case 'bypassPermissions':
          return { behavior: 'allow' as const };
        case 'plan':
          return { behavior: 'deny' as const, message: 'Plan mode — tool execution disabled' };
        case 'acceptEdits':
          if (isEditTool(toolName)) {
            // #region agent log
            fetch('http://127.0.0.1:7810/ingest/2e2765a4-321c-48c9-a611-3bbbbd5a96cb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ecb1a5'},body:JSON.stringify({sessionId:'ecb1a5',location:'lib/sdk/agent.ts:canUseTool-acceptEdits-allow',message:'acceptEdits auto-allow edit tool',data:{toolName},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
            // #endregion
            return { behavior: 'allow' as const };
          }
          break;
        // 'default' falls through to prompt
      }

      // #region agent log
      fetch('http://127.0.0.1:7810/ingest/2e2765a4-321c-48c9-a611-3bbbbd5a96cb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ecb1a5'},body:JSON.stringify({sessionId:'ecb1a5',location:'lib/sdk/agent.ts:canUseTool-requestPermission',message:'Falling through to permission bridge',data:{toolName,effectiveMode},timestamp:Date.now(),hypothesisId:'H3,H5'})}).catch(()=>{});
      // #endregion

      try {
        const decision = await permissionBridge.requestPermission(toolName, input, {
          title: cbOptions?.title,
          description: cbOptions?.description,
          toolUseID: cbOptions?.toolUseID,
        });
        // #region agent log
        fetch('http://127.0.0.1:7810/ingest/2e2765a4-321c-48c9-a611-3bbbbd5a96cb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ecb1a5'},body:JSON.stringify({sessionId:'ecb1a5',location:'lib/sdk/agent.ts:canUseTool-decision',message:'Permission bridge returned',data:{toolName,decision},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        return decision;
      } catch (err: unknown) {
        // #region agent log
        fetch('http://127.0.0.1:7810/ingest/2e2765a4-321c-48c9-a611-3bbbbd5a96cb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ecb1a5'},body:JSON.stringify({sessionId:'ecb1a5',location:'lib/sdk/agent.ts:canUseTool-error',message:'canUseTool threw error',data:{toolName,error:err instanceof Error ? err.message : String(err),stack:err instanceof Error ? err.stack : undefined},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        throw err;
      }
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
    console.log(`[agent] Starting query in ${merged.cwd} (permissionMode: ${merged.permissionMode})`);
    q = sdkQuery({ prompt: options.prompt, options: queryOptions });

    for await (const message of q) {
      if (abortController.signal.aborted) break;

      // Verbose logging for diagnosing billing/auth/retry issues
      if (message.type === 'system' || message.type === 'result') {
        console.log(`[agent] SDK ${message.type}:`, JSON.stringify(message).slice(0, 800));
      }

      processMessage(ws, message);

      if ('session_id' in message && message.session_id) {
        sessionId = message.session_id;
      }
    }
    console.log(`[agent] Query completed (session: ${sessionId || 'none'})`);
  } catch (err: unknown) {
    if (abortController.signal.aborted) {
      send(ws, { type: 'error', message: 'Query aborted', code: 'ABORT' });
    } else {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errDetails: Record<string, unknown> = { message: errMsg };
      if (err instanceof Error) {
        if (err.name) errDetails.name = err.name;
        if (err.cause) errDetails.cause = err.cause;
        if ('code' in err) errDetails.code = (err as { code: unknown }).code;
        if ('status' in err) errDetails.status = (err as { status: unknown }).status;
        if ('error' in err) errDetails.error = (err as { error: unknown }).error;
      }
      console.error('[agent] SDK error:', JSON.stringify(errDetails, null, 2));
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
      } else if (message.subtype === 'api_retry') {
        const retry = message as {
          error: string;
          attempt: number;
          max_retries: number;
          retry_delay_ms: number;
          error_status: number | null;
        };
        console.warn(
          `[agent] API retry ${retry.attempt}/${retry.max_retries}: ${retry.error}` +
          ` (HTTP ${retry.error_status ?? 'N/A'}, delay ${retry.retry_delay_ms}ms)`,
        );
        send(ws, {
          type: 'api_retry',
          error: retry.error,
          attempt: retry.attempt,
          maxRetries: retry.max_retries,
          retryDelayMs: retry.retry_delay_ms,
          errorStatus: retry.error_status,
        });
      }
      break;
    }

    case 'assistant': {
      if (message.error) {
        console.warn(`[agent] Assistant message has error: ${message.error}`);
        send(ws, {
          type: 'error',
          message: `API error: ${message.error}`,
          code: message.error,
        });
      }

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
      const isError = 'is_error' in message && message.is_error;
      const resultText = message.subtype === 'success' && !isError
        ? message.result
        : '';

      const resultMsg: ServerMessage = {
        type: 'result',
        sessionId: message.session_id,
        text: resultText,
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

      // SDK can return subtype "success" with is_error: true (e.g. billing failures)
      if (isError && message.subtype === 'success' && 'result' in message) {
        const errText = (message as { result: string }).result;
        console.error(`[agent] Result flagged is_error with text: ${errText}`);
        send(ws, {
          type: 'error',
          message: errText,
          code: 'billing_error',
        });
      } else if (message.subtype !== 'success' && 'errors' in message && message.errors?.length) {
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
