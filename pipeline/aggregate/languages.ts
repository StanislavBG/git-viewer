import type { Language } from '../../src/types.js';

// GitHub's official language colors are in their linguist repo. We hardcode
// the ones likely to dominate a personal portfolio; falls back to a hash hue.
const KNOWN_COLORS: Record<string, string> = {
  TypeScript: 'oklch(0.72 0.12 60)',
  JavaScript: 'oklch(0.82 0.14 95)',
  Python:     'oklch(0.75 0.10 140)',
  Rust:       'oklch(0.65 0.14 30)',
  Go:         'oklch(0.70 0.10 220)',
  Swift:      'oklch(0.70 0.13 28)',
  Kotlin:     'oklch(0.66 0.14 320)',
  Java:       'oklch(0.62 0.13 40)',
  C:          'oklch(0.68 0.06 240)',
  'C++':      'oklch(0.66 0.10 280)',
  'C#':       'oklch(0.62 0.12 290)',
  Ruby:       'oklch(0.58 0.18 25)',
  Elixir:     'oklch(0.66 0.13 305)',
  Haskell:    'oklch(0.62 0.15 280)',
  Shell:      'oklch(0.68 0.08 130)',
  HTML:       'oklch(0.70 0.14 35)',
  CSS:        'oklch(0.70 0.14 270)',
  Vue:        'oklch(0.74 0.10 160)',
  Lua:        'oklch(0.55 0.20 270)',
  Scala:      'oklch(0.62 0.15 25)',
  Other:      'oklch(0.55 0.02 80)',
};

function hashHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export function colorFor(language: string): string {
  return KNOWN_COLORS[language] ?? `oklch(0.70 0.10 ${hashHue(language)})`;
}

export function aggregateLanguages(repoBytes: Map<string, Map<string, number>>): Language[] {
  // Sum bytes per language across all repos.
  const totals = new Map<string, number>();
  for (const langs of repoBytes.values()) {
    for (const [lang, bytes] of langs.entries()) {
      totals.set(lang, (totals.get(lang) ?? 0) + bytes);
    }
  }
  const total = [...totals.values()].reduce((s, v) => s + v, 0);
  if (total === 0) return [];

  const sorted = [...totals.entries()]
    .map(([name, bytes]) => ({ name, pct: (bytes / total) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  const top = sorted.slice(0, 4);
  const rest = sorted.slice(4);
  const restPct = rest.reduce((s, l) => s + l.pct, 0);

  const result: Language[] = top.map((l) => ({
    name: l.name,
    pct: Math.round(l.pct),
    color: colorFor(l.name),
  }));
  if (restPct >= 1) {
    result.push({ name: 'Other', pct: Math.round(restPct), color: colorFor('Other') });
  }
  // Re-balance to 100 (rounding drift).
  const sum = result.reduce((s, l) => s + l.pct, 0);
  if (sum !== 100 && result.length > 0) {
    result[0].pct += 100 - sum;
  }
  return result;
}
