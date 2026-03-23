import { listSessions, getSessionMessages } from '@anthropic-ai/claude-agent-sdk';

export type SessionMeta = {
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  cwd: string;
};

export type SessionMsg = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: {
    tool: string;
    args: Record<string, unknown>;
    result?: string;
  }[];
};

export async function getSessions(cwd: string): Promise<SessionMeta[]> {
  try {
    const sessions = await listSessions({ dir: cwd });

    return sessions
      .map((s) => ({
        sessionId: s.sessionId,
        title: s.customTitle || s.summary || s.firstPrompt?.slice(0, 80) || 'Untitled Session',
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: new Date(s.lastModified).toISOString(),
        messageCount: 0, // Not provided by SDK — acceptable to omit
        cwd,
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

export async function getSessionConversation(
  sessionId: string,
  cwd: string,
): Promise<SessionMsg[]> {
  try {
    const messages = await getSessionMessages(sessionId, { dir: cwd });

    return messages
      .filter((m) => m.type === 'user' || m.type === 'assistant')
      .map((m) => {
        const msg = m.message as Record<string, unknown> | undefined;
        const rawContent = msg?.content;

        let content = '';
        let toolCalls: SessionMsg['toolCalls'];

        if (typeof rawContent === 'string') {
          content = rawContent;
        } else if (Array.isArray(rawContent)) {
          content = rawContent
            .filter((b: Record<string, unknown>) => b.type === 'text')
            .map((b: Record<string, unknown>) => String(b.text ?? ''))
            .join('');

          const tools = rawContent
            .filter((b: Record<string, unknown>) => b.type === 'tool_use')
            .map((b: Record<string, unknown>) => ({
              tool: String(b.name ?? ''),
              args: (b.input as Record<string, unknown>) ?? {},
            }));

          if (tools.length) toolCalls = tools;
        }

        return {
          role: m.type as 'user' | 'assistant',
          content,
          toolCalls,
        };
      });
  } catch {
    return [];
  }
}
