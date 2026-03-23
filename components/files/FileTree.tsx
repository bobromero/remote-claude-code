'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { clsx } from 'clsx';
import type { FileNode } from '@/lib/files/tree';

type FileTreeProps = {
  node: FileNode;
  selectedFile: string | null;
  changedFiles: Set<string>;
  onSelectFile: (path: string) => void;
  depth?: number;
};

export function FileTree({ node, selectedFile, changedFiles, onSelectFile, depth = 0 }: FileTreeProps) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (node.type === 'file') {
    const isSelected = selectedFile === node.path;
    const isChanged = changedFiles.has(node.path);

    return (
      <button
        onClick={() => onSelectFile(node.path)}
        className={clsx(
          'flex items-center gap-1.5 w-full px-2 py-0.5 text-left text-sm rounded transition-colors cursor-pointer',
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <File className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        <span className="truncate">{node.name}</span>
        {isChanged && (
          <span className="ml-auto h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Modified by Claude" />
        )}
      </button>
    );
  }

  // Directory
  if (node.path === '.') {
    // Root node — just render children
    return (
      <div className="space-y-0.5">
        {node.children?.map((child) => (
          <FileTree
            key={child.path}
            node={child}
            selectedFile={selectedFile}
            changedFiles={changedFiles}
            onSelectFile={onSelectFile}
            depth={depth}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full px-2 py-0.5 text-left text-sm text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-zinc-400" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-zinc-400" />
        )}
        {expanded ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-blue-500" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-blue-500" />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTree
              key={child.path}
              node={child}
              selectedFile={selectedFile}
              changedFiles={changedFiles}
              onSelectFile={onSelectFile}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
