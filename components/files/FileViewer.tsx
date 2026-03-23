'use client';

import { FileCode, X } from 'lucide-react';
import hljs from 'highlight.js';
import { useEffect, useRef } from 'react';

type FileViewerProps = {
  path: string;
  content: string;
  language: string;
  onClose: () => void;
};

export function FileViewer({ path, content, language, onClose }: FileViewerProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      // Reset and re-highlight
      codeRef.current.removeAttribute('data-highlighted');
      try {
        hljs.highlightElement(codeRef.current);
      } catch {
        // language not supported, show as plain text
      }
    }
  }, [content, language]);

  return (
    <div className="flex flex-col h-full">
      {/* File header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 min-w-0">
          <FileCode className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-mono text-xs">{path}</span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <pre className="p-3 text-sm leading-relaxed">
          <code ref={codeRef} className={`language-${language}`}>
            {content}
          </code>
        </pre>
      </div>
    </div>
  );
}
