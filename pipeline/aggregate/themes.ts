import type { CommitTheme } from '../../src/types.js';
import type { CommitSummary } from '../sources/github.js';

const THEME_PATTERNS: { label: string; hint: string; re: RegExp }[] = [
  { label: 'feat',     hint: 'new capability',     re: /^feat(\([^)]*\))?:/i },
  { label: 'fix',      hint: 'bug or regression',  re: /^fix(\([^)]*\))?:/i },
  { label: 'refactor', hint: 'no behavior change', re: /^refactor(\([^)]*\))?:/i },
  { label: 'perf',     hint: 'speed / memory',     re: /^perf(\([^)]*\))?:/i },
  { label: 'docs',     hint: 'writing',            re: /^docs(\([^)]*\))?:/i },
  { label: 'test',     hint: 'coverage',           re: /^test(\([^)]*\))?:/i },
  { label: 'chore',    hint: 'deps, infra',        re: /^chore(\([^)]*\))?:/i },
];

export function buildThemes(commits: CommitSummary[]): CommitTheme[] {
  const counts = new Map<string, number>();
  for (const c of commits) {
    const firstLine = c.message.split('\n', 1)[0] ?? '';
    for (const t of THEME_PATTERNS) {
      if (t.re.test(firstLine)) {
        counts.set(t.label, (counts.get(t.label) ?? 0) + 1);
        break;
      }
    }
  }
  return THEME_PATTERNS.map((t) => ({
    label: t.label,
    hint: t.hint,
    count: counts.get(t.label) ?? 0,
  }));
}
