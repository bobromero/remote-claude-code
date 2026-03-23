'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FileNode } from '@/lib/files/tree';

export function useFileTree(cwd: string) {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<{ content: string; language: string } | null>(null);
  const [changedFiles, setChangedFiles] = useState<Set<string>>(new Set());

  const fetchTree = useCallback(async () => {
    if (!cwd) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/files?cwd=${encodeURIComponent(cwd)}`);
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Failed to load files (${res.status})`);
        setTree(null);
      }
    } catch {
      setError('Failed to connect to server');
      setTree(null);
    } finally {
      setLoading(false);
    }
  }, [cwd]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const selectFile = useCallback(
    async (path: string) => {
      if (!path) {
        setSelectedFile(null);
        setFileContent(null);
        return;
      }
      setSelectedFile(path);
      try {
        const res = await fetch(
          `/api/files/${encodeURIComponent(path)}?cwd=${encodeURIComponent(cwd)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setFileContent({ content: data.content, language: data.language });
        } else {
          const data = await res.json().catch(() => null);
          setFileContent({ content: data?.error ?? 'Failed to load file', language: 'plaintext' });
        }
      } catch {
        setFileContent({ content: 'Failed to connect to server', language: 'plaintext' });
      }
    },
    [cwd],
  );

  const markFileChanged = useCallback((path: string) => {
    setChangedFiles((prev) => new Set(prev).add(path));
  }, []);

  return {
    tree,
    loading,
    error,
    selectedFile,
    fileContent,
    changedFiles,
    fetchTree,
    selectFile,
    markFileChanged,
  };
}
