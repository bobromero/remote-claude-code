'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  const [filesPanelWidth, setFilesPanelWidth] = useState(360);
  const chat = useChat();

  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Drag-to-resize for the file panel
  const onMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(200, Math.min(e.clientX - rect.left, rect.width - 300));
      setFilesPanelWidth(newWidth);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

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

      <div ref={containerRef} className="flex-1 flex flex-col min-w-0">
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
            <span className="font-mono truncate max-w-[400px]" title={chat.cwd || 'Connecting...'}>
              {chat.cwd || 'Connecting...'}
            </span>
            {chat.wsStatus === 'connected' ? (
              <Wifi className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
            )}
          </div>
        </div>

        {/* Main content: file explorer + chat, side by side */}
        <div className="flex-1 flex min-h-0">
          {/* File explorer */}
          <div
            className="h-full overflow-hidden border-r border-zinc-200 dark:border-zinc-700"
            style={{ width: filesPanelWidth, minWidth: 200, flexShrink: 0 }}
          >
            <FileExplorer cwd={chat.cwd} changedFiles={changedFiles} />
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={onMouseDown}
            className="w-1.5 h-full flex-shrink-0 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-300 dark:hover:bg-blue-700 transition-colors flex items-center justify-center cursor-col-resize"
          >
            <GripVertical className="h-4 w-4 text-zinc-400" />
          </div>

          {/* Chat panel */}
          <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}
