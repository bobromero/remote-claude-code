'use client';

import { useState, useCallback } from 'react';
import { Group as PanelGroup, Panel, Separator } from 'react-resizable-panels';
import { Sidebar } from './Sidebar';
import { FileExplorer } from '@/components/files/FileExplorer';
import { useChat } from '@/hooks/useChat';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { PermissionDialog } from '@/components/chat/PermissionDialog';
import { Badge } from '@/components/ui/Badge';
import { Wifi, WifiOff, GripVertical } from 'lucide-react';

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [changedFiles, setChangedFiles] = useState<Set<string>>(new Set());
  const chat = useChat();

  const handleNewChat = useCallback(() => {
    chat.clearMessages();
  }, [chat]);

  const handleSelectSession = useCallback(
    (_sessionId: string) => {
      chat.clearMessages();
      chat.sendMessage('/history');
    },
    [chat],
  );

  const handleForkSession = useCallback(
    (_sessionId: string) => {
      chat.clearMessages();
      chat.sendMessage('Continue from where we left off.', { forkSession: true });
    },
    [chat],
  );

  void setChangedFiles; // Will be connected to file_changed WS events

  const isRunning = chat.status !== 'idle';

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-900">
      <Sidebar
        cwd={chat.cwd}
        activeSessionId={chat.sessionId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onForkSession={handleForkSession}
        onOpenSettings={() => {}}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-2">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Claude Code
            </h1>
            {chat.sessionId && (
              <Badge variant="default">{chat.sessionId.slice(0, 8)}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            {chat.cwd && (
              <span className="font-mono truncate max-w-[300px]" title={chat.cwd}>
                {chat.cwd}
              </span>
            )}
            {chat.wsStatus === 'connected' ? (
              <Wifi className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
            )}
          </div>
        </div>

        {/* Split pane: file explorer + chat */}
        <PanelGroup orientation="horizontal" className="flex-1 min-h-0">
          <Panel defaultSize={35} minSize={20} maxSize={50}>
            <FileExplorer cwd={chat.cwd} changedFiles={changedFiles} />
          </Panel>

          <Separator className="w-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center justify-center cursor-col-resize">
            <GripVertical className="h-4 w-4 text-zinc-400" />
          </Separator>

          <Panel defaultSize={70} minSize={30}>
            <div className="flex h-full flex-col overflow-hidden">
              <MessageList messages={chat.messages} isThinking={chat.status === 'thinking'} />
              <PermissionDialog
                request={chat.permissionRequest}
                onRespond={chat.respondToPermission}
              />
              <ChatInput
                onSend={chat.sendMessage}
                onAbort={chat.abort}
                disabled={chat.wsStatus !== 'connected'}
                isRunning={isRunning}
              />
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
