'use client';

import { clsx } from 'clsx';
import { User, Bot } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ToolCard } from './ToolCard';
import type { ChatMessage } from '@/hooks/useChat';
import { Spinner } from '@/components/ui/Spinner';

type MessageBubbleProps = {
  message: ChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={clsx('flex gap-3 px-4 py-3', isUser ? 'bg-transparent' : 'bg-zinc-50 dark:bg-zinc-800/30')}>
      <div
        className={clsx(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-purple-600 text-white',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {isUser ? 'You' : 'Claude'}
        </div>
        <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none break-words">
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {message.content}
          </Markdown>
          {message.isStreaming && !message.content && (
            <Spinner size="sm" />
          )}
        </div>
        {message.toolCalls?.map((tc) => (
          <ToolCard key={tc.id} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}
