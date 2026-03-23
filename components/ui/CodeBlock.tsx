'use client';

import { clsx } from 'clsx';

type CodeBlockProps = {
  children: string;
  language?: string;
  className?: string;
};

export function CodeBlock({ children, language, className }: CodeBlockProps) {
  return (
    <div className={clsx('relative group', className)}>
      {language && (
        <div className="absolute top-0 right-0 px-2 py-0.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase">
          {language}
        </div>
      )}
      <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 text-sm text-zinc-200">
        <code>{children}</code>
      </pre>
    </div>
  );
}
