import type { WebSocket } from 'ws';
import type { FSWatcher } from 'chokidar';
import { parseClientMessage, serializeMessage } from './protocol';
import type { ServerMessage } from './protocol';
import { PermissionBridge } from './permission-bridge';
import { runAgent } from '../sdk/agent';
import { getConfig } from '../config';
import { createFileWatcher } from '../files/watcher';

type ConnectionState = {
  abortController: AbortController | null;
  permissionBridge: PermissionBridge;
  isRunning: boolean;
  fileWatcher: FSWatcher | null;
};

const connections = new Map<WebSocket, ConnectionState>();

export function handleConnection(ws: WebSocket): void {
  const state: ConnectionState = {
    abortController: null,
    permissionBridge: new PermissionBridge((msg) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(serializeMessage(msg));
      }
    }),
    isRunning: false,
    fileWatcher: null,
  };

  connections.set(ws, state);

  ws.on('message', async (data) => {
    const raw = typeof data === 'string' ? data : data.toString();
    const msg = parseClientMessage(raw);
    if (!msg) return;

    switch (msg.type) {
      case 'chat': {
        if (state.isRunning) {
          send(ws, { type: 'error', message: 'A query is already running. Abort it first.', code: 'BUSY' });
          return;
        }

        state.isRunning = true;
        state.abortController = new AbortController();
        send(ws, { type: 'status', status: 'thinking' });

        try {
          const { sessionId } = await runAgent(
            ws,
            {
              prompt: msg.text,
              sessionId: msg.sessionId,
              forkSession: msg.forkSession,
              overrides: msg.options,
            },
            state.permissionBridge,
            state.abortController,
          );

          // Session ID is sent by the agent via result message
          void sessionId;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          send(ws, { type: 'error', message: errMsg, code: 'HANDLER_ERROR' });
        } finally {
          state.isRunning = false;
          state.abortController = null;
          send(ws, { type: 'status', status: 'idle' });
        }
        break;
      }

      case 'permission_response': {
        state.permissionBridge.handleResponse(msg);
        break;
      }

      case 'abort': {
        if (state.abortController) {
          state.abortController.abort();
        }
        break;
      }

      case 'watch_files': {
        // Clean up existing watcher
        if (state.fileWatcher) {
          state.fileWatcher.close();
          state.fileWatcher = null;
        }
        // Start new file watcher
        state.fileWatcher = createFileWatcher(msg.cwd, (event) => {
          send(ws, {
            type: 'file_changed',
            path: event.path,
            action: event.action,
          });
        });
        break;
      }
    }
  });

  const cleanup = () => {
    state.permissionBridge.denyAll();
    if (state.abortController) {
      state.abortController.abort();
    }
    if (state.fileWatcher) {
      state.fileWatcher.close();
      state.fileWatcher = null;
    }
    connections.delete(ws);
  };

  ws.on('close', cleanup);
  ws.on('error', cleanup);

  // Send initial config info
  const config = getConfig();
  send(ws, {
    type: 'session_info',
    sessionId: '',
    cwd: config.defaultCwd,
  });

  // Warn if API key is not configured
  if (!config.apiKey) {
    send(ws, {
      type: 'error',
      message: 'ANTHROPIC_API_KEY is not set. Add it to your .env file and restart the server.',
      code: 'NO_API_KEY',
    });
  }
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(serializeMessage(msg));
  }
}
