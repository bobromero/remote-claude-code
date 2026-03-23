'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, Check, X, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { ToolCall } from '@/hooks/useChat';
import { Badge } from '@/components/ui/Badge';

type ToolCardProps = {
  toolCall: ToolCall;
};

export function ToolCard({ toolCall }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = toolCall.isRunning ? (
    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
  ) : toolCall.isError ? (
    <X className="h-3.5 w-3.5 text-red-500" />
  ) : (
    <Check className="h-3.5 w-3.5 text-green-500" />
  );

  return (
    <div className="my-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        )}
        <Wrench className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{toolCall.tool}</span>
        {toolCall.tool === 'Bash' && typeof toolCall.args?.command === 'string' && (
          <code className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {toolCall.args.command.slice(0, 60)}
          </code>
        )}
        <span className="ml-auto shrink-0">{statusIcon}</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-200 dark:border-zinc-700 px-3 py-2 space-y-2">
          <div>
            <Badge variant="info">Arguments</Badge>
            <pre className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 rounded p-2 overflow-x-auto">
              {JSON.stringify(toolCall.args, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <div>
              <Badge variant={toolCall.isError ? 'error' : 'success'}>
                {toolCall.isError ? 'Error' : 'Result'}
              </Badge>
              <pre
                className={clsx(
                  'mt-1 text-xs rounded p-2 overflow-x-auto max-h-60 overflow-y-auto',
                  toolCall.isError
                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                    : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900',
                )}
              >
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
