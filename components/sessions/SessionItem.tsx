'use client';

import { MessageSquare, GitBranch } from 'lucide-react';
import { clsx } from 'clsx';
import type { SessionMeta } from '@/lib/sessions';

type SessionItemProps = {
  session: SessionMeta;
  isActive: boolean;
  onSelect: (sessionId: string) => void;
  onFork: (sessionId: string) => void;
};

export function SessionItem({ session, isActive, onSelect, onFork }: SessionItemProps) {
  const timeAgo = formatTimeAgo(new Date(session.updatedAt));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(session.sessionId)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(session.sessionId); }}
      className={clsx(
        'w-full text-left px-3 py-2 rounded-md transition-colors group cursor-pointer',
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
          {session.title}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFork(session.sessionId);
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity cursor-pointer"
          title="Fork session"
        >
          <GitBranch className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        <MessageSquare className="h-3 w-3" />
        <span>{session.messageCount}</span>
        <span>·</span>
        <span>{timeAgo}</span>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
