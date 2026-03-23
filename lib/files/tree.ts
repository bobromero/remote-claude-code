import { readdir, stat, readFile } from 'fs/promises';
import { join, relative, resolve } from 'path';
import ignore from 'ignore';

export type FileNode = {
  name: string;
  path: string; // relative to cwd
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
};

const ALWAYS_IGNORE = ['node_modules', '.git', '.next', 'dist', '.DS_Store', '__pycache__'];
const MAX_FILE_SIZE = 1_048_576; // 1MB

export async function buildFileTree(
  cwd: string,
  maxDepth = 3,
): Promise<FileNode> {
  const ig = ignore();

  // Load .gitignore if it exists
  try {
    const gitignoreContent = await readFile(join(cwd, '.gitignore'), 'utf-8');
    ig.add(gitignoreContent);
  } catch {
    // no .gitignore
  }

  ig.add(ALWAYS_IGNORE);

  return buildNode(cwd, cwd, ig, 0, maxDepth);
}

async function buildNode(
  basePath: string,
  currentPath: string,
  ig: ReturnType<typeof ignore>,
  depth: number,
  maxDepth: number,
): Promise<FileNode> {
  const name = currentPath === basePath ? '.' : currentPath.split('/').pop() ?? '';
  const relPath = relative(basePath, currentPath) || '.';

  const stats = await stat(currentPath);

  if (stats.isFile()) {
    return {
      name,
      path: relPath,
      type: 'file',
      size: stats.size,
    };
  }

  // Directory
  const node: FileNode = {
    name,
    path: relPath,
    type: 'directory',
    children: [],
  };

  if (depth >= maxDepth) return node;

  try {
    const entries = await readdir(currentPath);

    for (const entry of entries) {
      const entryRelPath = relPath === '.' ? entry : `${relPath}/${entry}`;

      // Check gitignore
      if (ig.ignores(entryRelPath) || ig.ignores(entryRelPath + '/')) {
        continue;
      }

      try {
        const entryPath = join(currentPath, entry);
        const entryStats = await stat(entryPath);

        if (entryStats.isDirectory()) {
          const child = await buildNode(basePath, entryPath, ig, depth + 1, maxDepth);
          node.children!.push(child);
        } else if (entryStats.isFile()) {
          node.children!.push({
            name: entry,
            path: entryRelPath,
            type: 'file',
            size: entryStats.size,
          });
        }
      } catch {
        // Skip entries we can't stat
      }
    }

    // Sort: directories first, then files, alphabetically
    node.children!.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch {
    // Can't read directory
  }

  return node;
}

export async function readFileContent(
  cwd: string,
  filePath: string,
): Promise<{ content: string; language: string; size: number }> {
  // Security: ensure path is within cwd
  const fullPath = join(cwd, filePath);
  const resolved = resolve(fullPath);
  const resolvedCwd = resolve(cwd);
  if (!resolved.startsWith(resolvedCwd)) {
    throw new Error('Path traversal detected');
  }

  const stats = await stat(fullPath);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error('File too large (>1MB)');
  }

  const content = await readFile(fullPath, 'utf-8');
  const ext = filePath.split('.').pop() ?? '';
  const language = extToLanguage(ext);

  return { content, language, size: stats.size };
}

function extToLanguage(ext: string): string {
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    css: 'css', scss: 'scss', less: 'less',
    html: 'html', xml: 'xml', svg: 'xml',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    md: 'markdown', mdx: 'markdown',
    sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'fish',
    sql: 'sql', graphql: 'graphql',
    dockerfile: 'dockerfile',
  };
  return map[ext.toLowerCase()] ?? 'plaintext';
}
