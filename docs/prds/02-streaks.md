# PRD-02 — Streaks (current, longest, total active days)

## Motivation

`DenverCoder1/github-readme-streak-stats` is the second-most-copied widget
after the stats card (~9k stars). Streaks are the single highest-engagement
metric on a personal dashboard — they're a story, not a number. We already
compute the daily contribution series for the heatmap, so this is a one-pass
reduce.

## Data-shape change

`src/types.ts`:

```ts
export interface Streaks {
  current: number;                       // consecutive days ending today/yesterday
  longest: number;
  longestRange: [string, string] | null; // ISO dates
  totalActiveDays: number;               // distinct days with ≥1 contribution in the year
}
interface GitData { /* … */ streaks: Streaks; }
```

## Pipeline work

`pipeline/aggregate/streaks.ts`:
- Input: `HeatmapDay[]` (already computed).
- Single linear scan: track `cur` length and best span. `current` resets if a
  past day has count 0 (one missed day breaks the streak); the trailing zero
  for "today not yet" doesn't break (last day with count 0 ≤ 1 is allowed).

## UI work

New component `src/components/Streaks.tsx`. Three serif numerals with mono
labels, placed in the `Last 30 days` section's grid (becomes 4 cards instead
of 3, or sits above the existing 3 as a streak banner).

```
─── STREAKS ────────────────────────────────────────────────
   23                      91                   287
   CURRENT                 LONGEST              ACTIVE DAYS
   day streak              Aug 4 → Nov 2        of last 365
```

## Acceptance criteria

1. `current === N` if user committed every day for the last N days (today
   counted as a contributing day if any contributions exist; today with 0
   contribs does not break the streak).
2. `longest >= current`; `longestRange` brackets the streak inclusive.
3. `totalActiveDays === heatmap.filter(d => d.count > 0).length`.
4. With the design fixture (deterministic seed): `longest >= 5` (the fixture
   has visible runs).
