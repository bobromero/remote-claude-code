import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildFileTree, readFileContent } from '@/lib/files/tree';

describe('buildFileTree', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'tree-test-'));
    // Create test structure
    await mkdir(join(tempDir, 'src'));
    await mkdir(join(tempDir, 'src/utils'));
    await writeFile(join(tempDir, 'package.json'), '{}');
    await writeFile(join(tempDir, 'src/index.ts'), 'export {}');
    await writeFile(join(tempDir, 'src/utils/helper.ts'), 'export function help() {}');
    await writeFile(join(tempDir, '.gitignore'), 'build/\n*.log\n');
    await mkdir(join(tempDir, 'build'));
    await writeFile(join(tempDir, 'build/output.js'), 'compiled');
    await writeFile(join(tempDir, 'debug.log'), 'log contents');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('builds a file tree from a directory', async () => {
    const tree = await buildFileTree(tempDir, 5);
    expect(tree.type).toBe('directory');
    expect(tree.path).toBe('.');

    const childNames = tree.children!.map((c) => c.name);
    expect(childNames).toContain('src');
    expect(childNames).toContain('package.json');
  });

  it('respects .gitignore', async () => {
    const tree = await buildFileTree(tempDir, 5);
    const allPaths = flattenPaths(tree);

    // build/ and *.log should be excluded
    expect(allPaths).not.toContain('build');
    expect(allPaths).not.toContain('debug.log');
    expect(allPaths).not.toContain('build/output.js');
  });

  it('sorts directories before files', async () => {
    const tree = await buildFileTree(tempDir, 5);
    const types = tree.children!.map((c) => c.type);
    const firstFileIndex = types.indexOf('file');
    const lastDirIndex = types.lastIndexOf('directory');
    if (firstFileIndex >= 0 && lastDirIndex >= 0) {
      expect(lastDirIndex).toBeLessThan(firstFileIndex);
    }
  });

  it('respects depth limit', async () => {
    const tree = await buildFileTree(tempDir, 2);
    const src = tree.children!.find((c) => c.name === 'src');
    expect(src).toBeDefined();
    // At depth 2, src/utils should be listed but its children should be empty
    const utils = src!.children!.find((c) => c.name === 'utils');
    expect(utils).toBeDefined();
    expect(utils!.children).toEqual([]);
  });

  it('includes file sizes', async () => {
    const tree = await buildFileTree(tempDir, 5);
    const pkgJson = tree.children!.find((c) => c.name === 'package.json');
    expect(pkgJson).toBeDefined();
    expect(pkgJson!.size).toBe(2); // '{}'
  });
});

describe('readFileContent', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'read-test-'));
    await writeFile(join(tempDir, 'test.ts'), 'const x = 1;');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('reads file content with language detection', async () => {
    const result = await readFileContent(tempDir, 'test.ts');
    expect(result.content).toBe('const x = 1;');
    expect(result.language).toBe('typescript');
    expect(result.size).toBeGreaterThan(0);
  });

  it('rejects path traversal', async () => {
    await expect(readFileContent(tempDir, '../../../etc/passwd')).rejects.toThrow('traversal');
  });
});

function flattenPaths(node: { path: string; children?: { path: string; children?: any[] }[] }): string[] {
  const paths = [node.path];
  if (node.children) {
    for (const child of node.children) {
      paths.push(...flattenPaths(child));
    }
  }
  return paths;
}
