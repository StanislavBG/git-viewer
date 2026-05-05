import type { ProductiveTime } from '../../src/types.js';
import type { CommitSummary } from '../sources/github.js';

// PRD-07. 7-row × 24-col matrix in the runner's local TZ.
export function buildProductiveTime(commits: CommitSummary[]): ProductiveTime {
  const matrix: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const c of commits) {
    if (!c.date) continue;
    const d = new Date(c.date);
    const dow = d.getDay();
    const hr = d.getHours();
    if (dow >= 0 && dow <= 6 && hr >= 0 && hr <= 23) matrix[dow][hr] += 1;
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return { matrix, tz };
}
