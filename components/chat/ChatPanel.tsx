'use client';

import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { PermissionDialog } from './PermissionDialog';
import { useChat } from '@/hooks/useChat';
import { Badge } from '@/components/ui/Badge';
import { Wifi, WifiOff } from 'lucide-react';

export function ChatPanel() {
  const {
    messages,
    status,
    sessionId,
    cwd,
    wsStatus,
    permissionRequest,
    sendMessage,
    respondToPermission,
    abort,
  } = useChat();

  const isRunning = status !== 'idle';
  const isThinking = status === 'thinking';

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-2">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Claude Code</h1>
          {sessionId && (
            <Badge variant="default">
              {sessionId.slice(0, 8)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {cwd && (
            <span className="font-mono truncate max-w-[200px]" title={cwd}>
              {cwd}
            </span>
          )}
          {wsStatus === 'connected' ? (
            <Wifi className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-500" />
          )}
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} isThinking={isThinking} />

      {/* Permission dialog */}
      <PermissionDialog request={permissionRequest} onRespond={respondToPermission} />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onAbort={abort}
        disabled={wsStatus !== 'connected'}
        isRunning={isRunning}
      />
    </div>
  );
}
