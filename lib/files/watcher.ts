import { watch } from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { relative } from 'path';

export type FileChangeEvent = {
  path: string; // relative to cwd
  action: 'add' | 'change' | 'unlink';
};

export type FileChangeHandler = (event: FileChangeEvent) => void;

export function createFileWatcher(
  cwd: string,
  onChange: FileChangeHandler,
): FSWatcher {
  const watcher = watch(cwd, {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.next/**',
      '**/dist/**',
    ],
    persistent: true,
    ignoreInitial: true,
    depth: 5,
  });

  const handle = (action: FileChangeEvent['action']) => (filePath: string) => {
    const relPath = relative(cwd, filePath);
    if (relPath && !relPath.startsWith('..')) {
      onChange({ path: relPath, action });
    }
  };

  watcher.on('add', handle('add'));
  watcher.on('change', handle('change'));
  watcher.on('unlink', handle('unlink'));

  return watcher;
}
