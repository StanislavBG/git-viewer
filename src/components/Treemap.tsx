import { useMemo } from 'react';
import type { FileNode } from '../types';

interface Tile {
  x: number; y: number; w: number; h: number;
  node: FileNode;
}

const W = 320;
const H = 240;
const LANG_HUE: Record<string, number> = {
  TypeScript: 220, JavaScript: 50, Python: 140, Ruby: 0, Go: 195, Rust: 25,
  Java: 25, Kotlin: 280, Swift: 20, 'C': 200, 'C++': 200, 'C#': 280,
  PHP: 250, Shell: 130, HTML: 15, CSS: 195, Markdown: 0, JSON: 60,
  YAML: 60, SQL: 195, TOML: 60, XML: 15,
};
function colorFor(lang?: string): string {
  if (!lang) return 'oklch(0.40 0.02 80)';
  const h = LANG_HUE[lang];
  if (h == null) return 'oklch(0.45 0.04 60)';
  return `oklch(0.55 0.10 ${h})`;
}

// Squarified treemap (Bruls/Huijing/van Wijk, simplified). Recursively lays
// out a node's children into the rectangle (x, y, w, h).
function leaves(node: FileNode): FileNode[] {
  if (!node.children || node.children.length === 0) return [node];
  return node.children.flatMap(leaves);
}

function layoutRow(items: FileNode[], x: number, y: number, w: number, h: number, total: number): { tiles: Tile[]; usedW: number; usedH: number } {
  const sum = items.reduce((s, n) => s + n.size, 0);
  const horizontal = w >= h;
  const fixed = horizontal ? h : w;
  const length = sum / total * (horizontal ? w : h);
  const tiles: Tile[] = [];
  let cursor = 0;
  for (const n of items) {
    const slice = (n.size / sum) * fixed;
    if (horizontal) {
      tiles.push({ x, y: y + cursor, w: length, h: slice, node: n });
    } else {
      tiles.push({ x: x + cursor, y, w: slice, h: length, node: n });
    }
    cursor += slice;
  }
  return horizontal
    ? { tiles, usedW: length, usedH: h }
    : { tiles, usedW: w, usedH: length };
}

function worstAspect(items: FileNode[], length: number, total: number, fixed: number): number {
  const sum = items.reduce((s, n) => s + n.size, 0);
  if (sum === 0 || length === 0) return Infinity;
  const slab = sum / total * length;
  let worst = 0;
  for (const n of items) {
    const area = (n.size / total) * length * fixed;
    const aspect = Math.max(slab / (area / slab), (area / slab) / slab);
    if (aspect > worst) worst = aspect;
  }
  return worst;
}

function squarify(nodes: FileNode[], x: number, y: number, w: number, h: number, total: number): Tile[] {
  if (nodes.length === 0 || w <= 1 || h <= 1) return [];
  const remaining = [...nodes].sort((a, b) => b.size - a.size);
  const out: Tile[] = [];
  let curX = x, curY = y, curW = w, curH = h;

  while (remaining.length > 0) {
    const horizontal = curW >= curH;
    const fixed = horizontal ? curH : curW;
    const length = horizontal ? curW : curH;
    const row: FileNode[] = [];
    let curWorst = Infinity;
    while (remaining.length > 0) {
      const candidate = [...row, remaining[0]!];
      const w2 = worstAspect(candidate, length, total, fixed);
      if (w2 < curWorst) {
        curWorst = w2;
        row.push(remaining.shift()!);
      } else break;
    }
    if (row.length === 0) break;
    const laid = layoutRow(row, curX, curY, curW, curH, total);
    out.push(...laid.tiles);
    if (horizontal) {
      curX += laid.usedW;
      curW -= laid.usedW;
    } else {
      curY += laid.usedH;
      curH -= laid.usedH;
    }
  }
  return out;
}

export function Treemap({ tree }: { tree: FileNode }) {
  const tiles = useMemo(() => {
    const all = leaves(tree).filter((n) => n.size > 0);
    const total = all.reduce((s, n) => s + n.size, 0);
    if (total === 0) return [];
    return squarify(all, 0, 0, W, H, total);
  }, [tree]);

  if (tiles.length === 0) return null;
  return (
    <div className="card" style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>File treemap</h3>
      <div className="sub" style={{ marginBottom: 8 }}>tile size = bytes · color = language</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {tiles.map((t, i) => (
          <g key={i}>
            <title>{`${t.node.path} · ${(t.node.size / 1024).toFixed(1)} KB${t.node.lang ? ' · ' + t.node.lang : ''}`}</title>
            <rect
              x={t.x} y={t.y} width={Math.max(0, t.w - 1)} height={Math.max(0, t.h - 1)}
              fill={colorFor(t.node.lang)}
              opacity={0.9}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
