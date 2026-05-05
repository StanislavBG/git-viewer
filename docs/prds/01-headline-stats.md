# PRD-01 — Headline stats strip

## Motivation

The most-copied feature across the surveyed tools (8 of 14, including
`anuraghazra/github-readme-stats`) is a single row of high-density numbers
that answers "what is this person's GitHub footprint?" at a glance: total
commits, total stars, PRs, issues, followers, repos contributed to. Our
existing hero shows 4 stats; this PRD adds the universally-expected 6th and
adds a denser secondary row above the heatmap so the headline is the first
thing a visitor sees.

## Data-shape change

`src/types.ts`:

```ts
export interface Headline {
  totalCommits: number;       // 12-month, from contributionsCollection or REST sum
  totalStars: number;         // sum across owned repos
  totalPRs: number;           // opened (lifetime); GraphQL viewer.pullRequests.totalCount
  totalIssues: number;        // opened (lifetime); GraphQL viewer.issues.totalCount
  followers: number;
  following: number;
  contributedTo: number;      // repos with ≥1 commit in last year not owned by user
  publicRepos: number;
  privateRepos?: number;      // only if PAT can see
}

interface GitData { /* … */ headline: Headline; }
```

## Pipeline work

`pipeline/aggregate/headline.ts`:
- One GraphQL request: `viewer { followers, following, pullRequests, issues, repositories(privacy: PUBLIC), repositoriesContributedTo }` (requires PAT; gracefully degrade without).
- Without PAT: derive `followers/following/publicRepos` from `users.getByUsername`; PRs/issues/contributedTo show `—`.

## UI work

New component `src/components/HeadlineStrip.tsx`. Renders directly under the
hero's `.hero-meta`, full-width, 6-cell flex grid:

```
┌─ COMMITS · 12MO ─┬─ STARS ─┬─ PRS ─┬─ ISSUES ─┬─ FOLLOWERS ─┬─ CONTRIB TO ─┐
│       4,231     │   812   │  318  │   142    │     256     │      47      │
└──────────────────┴─────────┴───────┴──────────┴─────────────┴──────────────┘
```

Reuses `.stat .label / .value` from `styles.css`.

## Acceptance criteria

1. With PAT: all 6 cells populated; matches GitHub profile page sums to within ±1%.
2. Without PAT: 4 cells populated, 2 show `—`; no thrown error.
3. Renders above the heatmap on `home` view; hidden on `project` view.
4. Mobile: collapses to 3×2 grid via existing `@media (max-width: 1100px)` rule.
