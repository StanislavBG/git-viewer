import type { CommitSummary } from '../sources/github.js';

// 24-bucket histogram of commit hour-of-day, in the runner's local timezone.
export function buildHoursHistogram(commits: CommitSummary[]): number[] {
  const buckets = new Array<number>(24).fill(0);
  for (const c of commits) {
    if (!c.date) continue;
    const h = new Date(c.date).getHours();
    if (Number.isFinite(h)) buckets[h] += 1;
  }
  return buckets;
}
