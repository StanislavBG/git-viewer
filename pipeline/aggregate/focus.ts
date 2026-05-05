import type { FocusItem } from '../../src/types.js';

interface Input {
  id: string;
  description: string | null;
  topics: string[];
  recent30: number;
}

// Focus = top 5 repos by 30-day commit volume; weight = % share.
// Label prefers description, falls back to project id; falls back further to "untitled".
export function buildFocus(repos: Input[]): FocusItem[] {
  const active = repos.filter((r) => r.recent30 > 0).sort((a, b) => b.recent30 - a.recent30);
  const total = active.reduce((s, r) => s + r.recent30, 0) || 1;
  return active.slice(0, 5).map((r) => ({
    label: (r.description ?? r.id).trim() || r.id,
    weight: Math.round((r.recent30 / total) * 100),
    projects: [r.id],
  }));
}
