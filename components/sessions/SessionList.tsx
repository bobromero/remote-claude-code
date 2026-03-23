'use client';

import { SessionItem } from './SessionItem';
import { Spinner } from '@/components/ui/Spinner';
import type { SessionMeta } from '@/lib/sessions';

type SessionListProps = {
  sessions: SessionMeta[];
  loading: boolean;
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onFork: (sessionId: string) => void;
};

export function SessionList({ sessions, loading, activeSessionId, onSelect, onFork }: SessionListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-zinc-500 dark:text-zinc-400 text-center">
        No sessions yet
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {sessions.map((session) => (
        <SessionItem
          key={session.sessionId}
          session={session}
          isActive={session.sessionId === activeSessionId}
          onSelect={onSelect}
          onFork={onFork}
        />
      ))}
    </div>
  );
}
