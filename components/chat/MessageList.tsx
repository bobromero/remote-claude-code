'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Spinner } from '@/components/ui/Spinner';
import type { ChatMessage } from '@/hooks/useChat';

type MessageListProps = {
  messages: ChatMessage[];
  isThinking?: boolean;
};

export function MessageList({ messages, isThinking }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="text-4xl">🤖</div>
          <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
            Start a conversation
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
            Send a message to Claude Code. It can read, edit, and create files in your project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isThinking && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
          <Spinner size="sm" />
          <span>Claude is thinking...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
