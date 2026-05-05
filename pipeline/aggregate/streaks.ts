import type { HeatmapDay, Streaks } from '../../src/types.js';

// PRD-02. Single linear scan across the 53-week heatmap.
// `current` = consecutive days with count > 0 ending at today (or today-1 if
// today has 0 commits — a dry today doesn't break the streak).
export function buildStreaks(heatmap: HeatmapDay[]): Streaks {
  const past = heatmap.filter((d) => d.count >= 0);
  let longest = 0;
  let longestStart = '';
  let longestEnd = '';
  let cur = 0;
  let curStart = '';
  for (const d of past) {
    if (d.count > 0) {
      if (cur === 0) curStart = d.date;
      cur += 1;
      if (cur > longest) {
        longest = cur;
        longestStart = curStart;
        longestEnd = d.date;
      }
    } else {
      cur = 0;
    }
  }

  // Trailing-zero relaxation: if the very last day has count 0 but the day
  // before continued the streak, treat current as the run that ended yesterday.
  let current = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    const d = past[i];
    if (d.count > 0) {
      current += 1;
    } else if (i === past.length - 1) {
      continue; // dry today
    } else {
      break;
    }
  }

  const totalActiveDays = past.filter((d) => d.count > 0).length;

  return {
    current,
    longest,
    longestRange: longest > 0 ? [longestStart, longestEnd] : null,
    totalActiveDays,
  };
}
