import type { HeatmapDay } from '../../src/types.js';
import type { CommitSummary } from '../sources/github.js';

export interface RepoCommitBatch {
  repoId: string;
  repoName: string;
  hue: number;
  commits: CommitSummary[];
}

// 53 weeks = 371 days, aligned so the first column is a Sunday.
export function buildHeatmap(
  batches: RepoCommitBatch[],
  today: Date = new Date(),
): HeatmapDay[] {
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const start = new Date(todayUTC);
  start.setUTCDate(start.getUTCDate() - 371);
  while (start.getUTCDay() !== 0) start.setUTCDate(start.getUTCDate() + 1);

  // Bucket commits by date and project.
  type DayBucket = Map<string, { name: string; hue: number; count: number }>;
  const buckets = new Map<string, DayBucket>();
  for (const batch of batches) {
    for (const c of batch.commits) {
      if (!c.date) continue;
      const key = c.date.slice(0, 10);
      const day = buckets.get(key) ?? new Map();
      const slot = day.get(batch.repoId) ?? { name: batch.repoName, hue: batch.hue, count: 0 };
      slot.count += 1;
      day.set(batch.repoId, slot);
      buckets.set(key, day);
    }
  }

  const days: HeatmapDay[] = [];
  for (let i = 0; i < 371; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    if (d > todayUTC) {
      days.push({ date: key, count: -1, projects: [] });
      continue;
    }
    const dayBucket = buckets.get(key);
    if (!dayBucket) {
      days.push({ date: key, count: 0, projects: [] });
      continue;
    }
    const projects = [...dayBucket.entries()]
      .map(([id, v]) => ({ id, name: v.name, hue: v.hue, count: v.count }))
      .sort((a, b) => b.count - a.count);
    const total = projects.reduce((s, p) => s + p.count, 0);
    days.push({ date: key, count: total, projects });
  }
  return days;
}
