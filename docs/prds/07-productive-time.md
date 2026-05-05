# PRD-07 — Productive-time 7×24 heatmap

## Motivation

`github-profile-summary-cards` and `lowlighter/metrics` both ship a
"productive time" 7×24 heat-grid that distills "when do you actually work."
Our existing `HoursChart` collapses across days; adding the day-of-week
dimension is one extra `groupBy` on the same commits. Visually rhymes with
the 53-week heatmap (same renderer, smaller matrix).

## Data-shape change

`src/types.ts`:

```ts
export interface ProductiveTime {
  matrix: number[][];   // 7 rows (Sun..Sat) × 24 cols (00..23)
  tz: string;           // e.g. "America/Los_Angeles"
}
interface GitData { /* … */ productiveTime: ProductiveTime; }
```

## Pipeline work

`pipeline/aggregate/productive-time.ts`:
- Input: 12-month commit timestamps.
- Bucket: `matrix[date.getDay()][date.getHours()] += 1` in the runner's local TZ.
- Emit `tz` from `Intl.DateTimeFormat().resolvedOptions().timeZone`.

## UI work

New component `src/components/ProductiveTime.tsx`. Mini-heatmap, identical
visual language to the main heatmap (`var(--heat-N)` cells), placed in the
`Last 30 days` triptych alongside `HoursChart` (or replacing it):

```
        00 03 06 09 12 15 18 21
   Sun  · · · · ▪ ▪ · ·
   Mon  · · · ▪ ▪ ▪ ▪ ·
   Tue  · · · ▪ ▪ ▪ ▪ ▪
   Wed  · · · ▪ ▪ ▪ ▪ ▪
   Thu  · · · ▪ ▪ ▪ ▪ ▪
   Fri  · · · ▪ ▪ ▪ · ·
   Sat  · · · · · ▪ · ·
```

Cell color via existing `levelOf()` thresholds (rescale: max in matrix → l4).

## Acceptance criteria

1. 7×24 grid; row labels Sun..Sat; column labels 00, 06, 12, 18.
2. Cell color uses `--heat-N` vars — switches with the accent-hue tweak.
3. Hover tooltip: "Wednesday · 14:00 — 23 commits".
4. `tz` displayed in caption.
