'use client';

import { Plus, History, Settings, PanelLeftClose, PanelLeft } from 'lucide-react';
import { SessionList } from '@/components/sessions/SessionList';
import { Button } from '@/components/ui/Button';
import { useSessions } from '@/hooks/useSessions';
import { clsx } from 'clsx';

type SidebarProps = {
  cwd: string;
  activeSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onForkSession: (sessionId: string) => void;
  onOpenSettings: () => void;
};

export function Sidebar({
  cwd,
  activeSessionId,
  isOpen,
  onToggle,
  onNewChat,
  onSelectSession,
  onForkSession,
  onOpenSettings,
}: SidebarProps) {
  const { sessions, loading } = useSessions(cwd);

  return (
    <>
      {/* Collapsed toggle */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="absolute top-2 left-2 z-10 p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'flex flex-col border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 transition-all duration-200',
          isOpen ? 'w-64' : 'w-0 overflow-hidden',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-1.5">
            <History className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Sessions</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewChat}
              className="p-1 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={onToggle}
              className="p-1 rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              title="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2">
          <SessionList
            sessions={sessions}
            loading={loading}
            activeSessionId={activeSessionId}
            onSelect={onSelectSession}
            onFork={onForkSession}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-700 p-2">
          <Button variant="ghost" size="sm" onClick={onOpenSettings} className="w-full justify-start">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Button>
        </div>
      </div>
    </>
  );
}
