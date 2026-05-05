# PRD-04 — Achievements / trophies row (spec only — tier 2)

## Motivation

`ryo-ma/github-profile-trophy` (~11k stars) and the GitHub-native achievements
system (Pull Shark, Starstruck, YOLO, Galaxy Brain, Public Sponsor, Quickdraw,
Pair Extraordinaire) prove that gamified milestones are a popular trust
signal. We can derive the same tiers from the data we already touch and
render them as a row of editorial-dark badges — no third-party SVG dependency.

## Data-shape change

`src/types.ts`:

```ts
export type AchievementId =
  | 'pull-shark' | 'starstruck' | 'yolo'
  | 'galaxy-brain' | 'quickdraw' | 'pair-extraordinaire' | 'public-sponsor';

export interface Achievement {
  id: AchievementId;
  label: string;
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  value: number;
  next?: number;
  unlockedAt?: string;
}
interface GitData { /* … */ achievements: Achievement[]; }
```

## Tier table (mirrors GitHub native + extended)

| Achievement | Trigger | Tiers (value thresholds) |
|---|---|---|
| pull-shark         | merged PRs                | 2, 16, 128, 1024, 4096 |
| starstruck         | max stars on a single repo | 16, 128, 512, 4096, 16384 |
| yolo               | merged PR without review  | 1 |
| galaxy-brain       | accepted answers in Discussions | 2, 8, 16, 32, 64 |
| quickdraw          | issue/PR closed within 5 min of open | 1 |
| pair-extraordinaire| co-authored commits       | 1, 10, 24, 48 |
| public-sponsor     | sponsored an OSS account  | 1 |

## Pipeline work

`pipeline/aggregate/achievements.ts`:
- pull-shark: GraphQL `viewer.pullRequests(states: MERGED).totalCount`.
- starstruck: `Math.max(...repos.map(r => r.stars))`.
- yolo: scan repo's PR history for any `mergedBy.login === viewer.login && reviewDecision === null` (limit to last 100 merged PRs).
- galaxy-brain: GraphQL search `type:DISCUSSION involves:<user> is:answered`.
- quickdraw: requires per-issue timing — defer or sample.
- pair-extraordinaire: scan recent commits for `Co-authored-by:` trailer.
- public-sponsor: GraphQL `viewer.sponsoring.totalCount > 0`.

## UI work

New component `src/components/Achievements.tsx`, placed under the headline
strip. Horizontal row of pill badges:

```
[🦈 Pull Shark · IV] [⭐ Starstruck · III] [🧠 Galaxy Brain · II] [🤝 Pair · II]
```

Use serif letterforms for the level numerals; tier color uses the heat-N CSS
vars so the row matches the heatmap's accent.

## Acceptance criteria

1. Achievements with `tier === 0` are not rendered.
2. Tooltip on hover: name + value + "next tier at: N".
3. Skinny mode: skip the GraphQL-only achievements, render the rest.
4. Order: descending by tier, ties broken by `value`.
