import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  Essay,
  FeaturedEssay,
  NowReading,
  NowState,
  NowWriting,
} from '../../src/types.js';

interface ParsedFront {
  fm: Record<string, unknown>;
  body: string;
}

// Hand-rolled YAML-frontmatter parser. Handles:
//   key: value
//   key:
//     - item
//     - item
//   key:
//     subkey: value
// Nothing fancier; we control the input.
//
// O(n) over file content.
function parseFrontmatter(src: string): ParsedFront {
  if (!src.startsWith('---')) return { fm: {}, body: src };
  const end = src.indexOf('\n---', 3);
  if (end < 0) return { fm: {}, body: src };
  const head = src.slice(3, end).trim();
  const body = src.slice(end + 4).replace(/^\n/, '');
  const lines = head.split('\n');
  const fm: Record<string, unknown> = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (!line.trim()) { i++; continue; }
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (!m) { i++; continue; }
    const key = m[1]!;
    const inline = m[2]!.trim();
    if (inline) {
      fm[key] = parseInlineValue(inline);
      i++;
      continue;
    }
    // Block: collect indented lines.
    const block: string[] = [];
    let j = i + 1;
    while (j < lines.length && /^\s+/.test(lines[j] ?? '')) {
      block.push(lines[j] ?? '');
      j++;
    }
    fm[key] = parseBlock(block);
    i = j;
  }
  return { fm, body };
}

function parseInlineValue(s: string): unknown {
  // Quoted string
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  // Inline array
  if (s.startsWith('[') && s.endsWith(']')) {
    return s.slice(1, -1).split(',').map((x) => parseInlineValue(x.trim())).filter((x) => x !== '');
  }
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}

function parseBlock(lines: string[]): unknown {
  // Either an array of items or a nested object.
  const trimmed = lines.map((l) => l.replace(/^\s+/, ''));
  const isList = trimmed.every((l) => l === '' || l.startsWith('-'));
  if (isList) {
    const items: unknown[] = [];
    let i = 0;
    while (i < trimmed.length) {
      const cur = trimmed[i] ?? '';
      if (!cur.startsWith('-')) { i++; continue; }
      const after = cur.slice(1).trim();
      if (after.includes(':') && !after.match(/^\d/)) {
        // Object item; collect this line's k:v plus any following indented lines that are deeper than the list item.
        const obj: Record<string, unknown> = {};
        const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(after);
        if (m && m[2]?.trim()) obj[m[1]!] = parseInlineValue(m[2].trim());
        let j = i + 1;
        while (j < trimmed.length && trimmed[j] !== '' && !trimmed[j]!.startsWith('-')) {
          const sub = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(trimmed[j]!);
          if (sub) obj[sub[1]!] = parseInlineValue(sub[2]!.trim());
          j++;
        }
        items.push(obj);
        i = j;
      } else {
        items.push(parseInlineValue(after));
        i++;
      }
    }
    return items;
  }
  // Nested object
  const obj: Record<string, unknown> = {};
  for (const l of trimmed) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(l);
    if (m) obj[m[1]!] = parseInlineValue(m[2]!.trim());
  }
  return obj;
}

function asString(x: unknown, dflt = ''): string { return typeof x === 'string' ? x : dflt; }
function asNumber(x: unknown, dflt = 0): number { return typeof x === 'number' ? x : dflt; }
function asArrayOfStrings(x: unknown): string[] {
  return Array.isArray(x) ? x.filter((v) => typeof v === 'string') as string[] : [];
}
function asArrayOfRecords(x: unknown): Record<string, unknown>[] {
  return Array.isArray(x) ? x.filter((v) => v && typeof v === 'object' && !Array.isArray(v)) as Record<string, unknown>[] : [];
}

function shortDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m!, 10) - 1]} ${parseInt(d!, 10)} ${y}`;
}

function yearOf(iso: string): number {
  const m = /^(\d{4})/.exec(iso);
  return m ? parseInt(m[1]!, 10) : new Date().getFullYear();
}

function paragraphsExcerpt(body: string, n: number): string {
  const paras = body.trim().split(/\n{2,}/).slice(0, n);
  return paras.join('\n\n');
}

export interface WritingOutput {
  essays: Essay[];
  essaysFeatured: FeaturedEssay | null;
  now: NowState | null;
}

export function buildWriting(rootDir: string): WritingOutput {
  const dir = join(rootDir, 'content', 'writing');
  if (!existsSync(dir)) {
    return { essays: [], essaysFeatured: null, now: null };
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_'));

  const essays: Essay[] = [];
  let featured: FeaturedEssay | null = null;

  for (const file of files) {
    const src = readFileSync(join(dir, file), 'utf-8');
    const { fm, body } = parseFrontmatter(src);
    const id = file.replace(/\.md$/, '');
    const date = asString(fm.date);
    const essay: Essay = {
      id,
      title: asString(fm.title, id),
      deck: asString(fm.deck),
      date: shortDate(date),
      read: asNumber(fm.read, 5),
      tag: asString(fm.tag),
      words: asNumber(fm.words, body.trim().split(/\s+/).length),
      year: yearOf(date),
    };
    essays.push(essay);
    if (fm.featured === true && !featured) {
      featured = {
        ...essay,
        publishedAt: shortDate(date),
        tags: asArrayOfStrings(fm.tags),
        excerpt: paragraphsExcerpt(body, 3),
        pulls: asArrayOfStrings(fm.pulls),
        relatedProjects: asArrayOfStrings(fm.relatedProjects),
      };
    }
  }

  // Sort essays newest-first.
  essays.sort((a, b) => (a.date < b.date ? 1 : -1));

  // Now state
  let now: NowState | null = null;
  const nowPath = join(dir, '_now.md');
  if (existsSync(nowPath)) {
    const { fm } = parseFrontmatter(readFileSync(nowPath, 'utf-8'));
    const reading = asArrayOfRecords(fm.reading).map<NowReading>((r) => ({
      title: asString(r.title),
      author: asString(r.author),
      since: asString(r.since),
    }));
    const w = (typeof fm.writing === 'object' && fm.writing && !Array.isArray(fm.writing)) ? fm.writing as Record<string, unknown> : null;
    const writing: NowWriting | null = w
      ? {
          title: asString(w.title),
          words: asNumber(w.words),
          target: asNumber(w.target, 1),
          progress: Math.min(1, asNumber(w.words) / Math.max(1, asNumber(w.target, 1))),
        }
      : null;
    now = {
      reading,
      writing,
      thinking: asArrayOfStrings(fm.thinking),
    };
  }

  return { essays, essaysFeatured: featured, now };
}
