'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FileNode } from '@/lib/files/tree';

export function useFileTree(cwd: string) {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<{ content: string; language: string } | null>(null);
  const [changedFiles, setChangedFiles] = useState<Set<string>>(new Set());

  const fetchTree = useCallback(async () => {
    if (!cwd) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/files?cwd=${encodeURIComponent(cwd)}`);
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [cwd]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const selectFile = useCallback(
    async (path: string) => {
      setSelectedFile(path);
      try {
        const res = await fetch(
          `/api/files/${encodeURIComponent(path)}?cwd=${encodeURIComponent(cwd)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setFileContent({ content: data.content, language: data.language });
        }
      } catch {
        setFileContent(null);
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
    selectedFile,
    fileContent,
    changedFiles,
    fetchTree,
    selectFile,
    markFileChanged,
  };
}
