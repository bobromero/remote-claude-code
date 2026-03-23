'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SessionMeta } from '@/lib/sessions';

export function useSessions(cwd: string) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!cwd) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/sessions?cwd=${encodeURIComponent(cwd)}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [cwd]);

  useEffect(() => {
    fetchSessions();
    // Refresh every 30s
    const interval = setInterval(fetchSessions, 30_000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  return { sessions, loading, refresh: fetchSessions };
}
