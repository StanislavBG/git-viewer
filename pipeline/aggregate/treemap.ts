import type { FileNode } from '../../src/types.js';
import type { TreeEntry } from '../sources/github.js';

const SKIP_DIR = /(^|\/)(node_modules|dist|build|vendor|\.git|\.cache|coverage|target|\.next|\.turbo|\.venv|venv|__pycache__)(\/|$)/i;
const SKIP_FILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|poetry\.lock|Gemfile\.lock|composer\.lock|\.DS_Store)$/i;
const MAX_BLOB = 1_000_000;
const MAX_DEPTH = 4;

const EXT_TO_LANG: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java', kt: 'Kotlin', swift: 'Swift',
  c: 'C', h: 'C', cc: 'C++', cpp: 'C++', hpp: 'C++', cs: 'C#', php: 'PHP', sh: 'Shell', bash: 'Shell',
  html: 'HTML', css: 'CSS', scss: 'CSS', md: 'Markdown', json: 'JSON', yml: 'YAML', yaml: 'YAML',
  sql: 'SQL', toml: 'TOML', xml: 'XML',
};

function langOf(name: string): string | undefined {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return undefined;
  return EXT_TO_LANG[name.slice(dot + 1).toLowerCase()];
}

interface Walker {
  name: string;
  path: string;
  size: number;
  loc?: number;
  lang?: string;
  childByName?: Map<string, Walker>;
}

function ensure(parent: Walker, segment: string, fullPath: string): Walker {
  if (!parent.childByName) parent.childByName = new Map();
  let n = parent.childByName.get(segment);
  if (!n) {
    n = { name: segment, path: fullPath, size: 0 };
    parent.childByName.set(segment, n);
  }
  return n;
}

function freeze(w: Walker, depth: number): FileNode {
  const node: FileNode = {
    name: w.name,
    path: w.path,
    size: w.size,
    ...(w.loc != null ? { loc: w.loc } : {}),
    ...(w.lang ? { lang: w.lang } : {}),
  };
  if (w.childByName && depth < MAX_DEPTH) {
    const kids = [...w.childByName.values()]
      .map((c) => freeze(c, depth + 1))
      .sort((a, b) => b.size - a.size);
    if (kids.length) node.children = kids;
  } else if (w.childByName) {
    // Past depth cap: collapse descendants into an "other" pseudo-leaf.
    let size = 0;
    for (const c of w.childByName.values()) size += c.size;
    if (size > 0) {
      node.children = [
        { name: 'other', path: `${w.path}/other`, size, loc: Math.round(size / 40) },
      ];
    }
  }
  return node;
}

export function buildTreemap(rootName: string, entries: TreeEntry[]): FileNode | undefined {
  if (!entries.length) return undefined;
  const root: Walker = { name: rootName, path: '', size: 0 };
  for (const e of entries) {
    if (e.type !== 'blob') continue;
    if (e.size <= 0 || e.size > MAX_BLOB) continue;
    if (SKIP_DIR.test(e.path) || SKIP_FILE.test(e.path)) continue;

    const parts = e.path.split('/');
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i]!;
      cur = ensure(cur, seg, parts.slice(0, i + 1).join('/'));
    }
    const fname = parts[parts.length - 1]!;
    const leaf = ensure(cur, fname, e.path);
    leaf.size = e.size;
    leaf.loc = Math.round(e.size / 40);
    leaf.lang = langOf(fname);
    // Bubble size up to ancestors.
    let walk: Walker | undefined = root;
    for (let i = 0; i < parts.length - 1; i++) {
      walk!.size += e.size;
      walk = walk!.childByName!.get(parts[i]!);
    }
    walk!.size += e.size;
  }
  if (root.size === 0) return undefined;
  return freeze(root, 0);
}
