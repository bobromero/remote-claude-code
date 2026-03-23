'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type ChatInputProps = {
  onSend: (text: string) => void;
  onAbort: () => void;
  disabled?: boolean;
  isRunning?: boolean;
};

export function ChatInput({ onSend, onAbort, disabled, isRunning }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isRunning) {
        handleSend();
      }
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        {isRunning ? (
          <Button variant="danger" size="md" onClick={onAbort} title="Stop">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            title="Send (Enter)"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
        Enter to send, Shift+Enter for newline
      </div>
    </div>
  );
}
