'use client';

import { useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import type { ServerMessage } from '@/lib/ws/protocol';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
  isStreaming?: boolean;
};

export type ToolCall = {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  result?: string;
  isError?: boolean;
  isRunning?: boolean;
};

export type PermissionRequest = {
  requestId: string;
  tool: string;
  args: Record<string, unknown>;
  title?: string;
  description?: string;
};

type ChatStatus = 'idle' | 'thinking' | 'streaming' | 'tool_running';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [cwd, setCwd] = useState<string>('');
  const currentAssistantIdRef = useRef<string | null>(null);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'text_delta': {
        const id = currentAssistantIdRef.current;
        if (!id) {
          // Create new assistant message
          const newId = crypto.randomUUID();
          currentAssistantIdRef.current = newId;
          setMessages((prev) => [
            ...prev,
            {
              id: newId,
              role: 'assistant',
              content: msg.text,
              toolCalls: [],
              timestamp: new Date(),
              isStreaming: true,
            },
          ]);
          setStatus('streaming');
        } else {
          // Append to existing assistant message
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, content: m.content + msg.text } : m,
            ),
          );
        }
        break;
      }

      case 'tool_start': {
        const id = currentAssistantIdRef.current;
        if (id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id
                ? {
                    ...m,
                    toolCalls: [
                      ...(m.toolCalls ?? []),
                      { id: msg.id, tool: msg.tool, args: msg.args, isRunning: true },
                    ],
                  }
                : m,
            ),
          );
        }
        setStatus('tool_running');
        break;
      }

      case 'tool_result': {
        const id = currentAssistantIdRef.current;
        if (id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id
                ? {
                    ...m,
                    toolCalls: (m.toolCalls ?? []).map((tc) =>
                      tc.id === msg.id
                        ? { ...tc, result: msg.result, isError: msg.isError, isRunning: false }
                        : tc,
                    ),
                  }
                : m,
            ),
          );
        }
        break;
      }

      case 'permission_request': {
        setPermissionRequest({
          requestId: msg.requestId,
          tool: msg.tool,
          args: msg.args,
          title: msg.title,
          description: msg.description,
        });
        break;
      }

      case 'result': {
        if (msg.sessionId) setSessionId(msg.sessionId);
        // Finalize the current assistant message
        const id = currentAssistantIdRef.current;
        if (id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, isStreaming: false } : m,
            ),
          );
        }
        currentAssistantIdRef.current = null;
        setStatus('idle');
        break;
      }

      case 'error': {
        const id = currentAssistantIdRef.current;
        if (id) {
          // Append error to current assistant message
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id
                ? { ...m, content: m.content + `\n\n**Error:** ${msg.message}`, isStreaming: false }
                : m,
            ),
          );
          currentAssistantIdRef.current = null;
        } else {
          // No active assistant message — show error as a standalone message
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `**Error:** ${msg.message}`,
              timestamp: new Date(),
              isStreaming: false,
            },
          ]);
        }
        setStatus('idle');
        break;
      }

      case 'session_info': {
        if (msg.sessionId) setSessionId(msg.sessionId);
        if (msg.cwd) setCwd(msg.cwd);
        break;
      }

      case 'status': {
        if (msg.status === 'idle') {
          setStatus('idle');
        } else if (msg.status === 'thinking') {
          setStatus('thinking');
        } else if (msg.status === 'tool_running') {
          setStatus('tool_running');
        }
        break;
      }
    }
  }, []);

  const { send, status: wsStatus } = useWebSocket({ onMessage: handleMessage });

  const sendMessage = useCallback(
    (text: string, options?: { forkSession?: boolean }) => {
      // Add user message to the list
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'user',
          content: text,
          timestamp: new Date(),
        },
      ]);

      currentAssistantIdRef.current = null;
      setStatus('thinking');

      send({
        type: 'chat',
        text,
        sessionId: sessionId ?? undefined,
        forkSession: options?.forkSession,
      });
    },
    [send, sessionId],
  );

  const respondToPermission = useCallback(
    (requestId: string, decision: 'allow' | 'deny') => {
      send({
        type: 'permission_response',
        requestId,
        decision,
      });
      setPermissionRequest(null);
    },
    [send],
  );

  const abort = useCallback(() => {
    send({ type: 'abort' });
    setStatus('idle');
    const id = currentAssistantIdRef.current;
    if (id) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, isStreaming: false } : m,
        ),
      );
      currentAssistantIdRef.current = null;
    }
  }, [send]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    currentAssistantIdRef.current = null;
  }, []);

  return {
    messages,
    status,
    sessionId,
    cwd,
    wsStatus,
    permissionRequest,
    sendMessage,
    respondToPermission,
    abort,
    clearMessages,
  };
}
