'use client';

import { FolderTree, RefreshCw, AlertCircle } from 'lucide-react';
import { FileTree } from './FileTree';
import { FileViewer } from './FileViewer';
import { Spinner } from '@/components/ui/Spinner';
import { useFileTree } from '@/hooks/useFileTree';

type FileExplorerProps = {
  cwd: string;
  changedFiles: Set<string>;
};

export function FileExplorer({ cwd, changedFiles }: FileExplorerProps) {
  const { tree, loading, error, selectedFile, fileContent, fetchTree, selectFile } = useFileTree(cwd);

  if (selectedFile && fileContent) {
    return (
      <FileViewer
        path={selectedFile}
        content={fileContent.content}
        language={fileContent.language}
        onClose={() => selectFile('')}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          <FolderTree className="h-3.5 w-3.5" />
          <span className="font-medium">Files</span>
        </div>
        <button
          onClick={fetchTree}
          className="p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-6 px-3 text-center">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{error}</p>
            <button
              onClick={fetchTree}
              className="text-xs text-blue-500 hover:text-blue-600 underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : tree ? (
          <FileTree
            node={tree}
            selectedFile={selectedFile}
            changedFiles={changedFiles}
            onSelectFile={selectFile}
          />
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-4">
            No files found
          </p>
        )}
      </div>
    </div>
  );
}
