# PRD-03 — Top repos panel

## Motivation

Our project grid is a flat list — visitors don't know what to click first.
4 of the surveyed tools (gitprofile, masterPortfolio, metrics, readme-stats
repo card) dedicate a section to the "best of" sub-cut: most-starred,
most-active, most-forked. Acts as a guided tour into the project grid.

## Data-shape change

`src/types.ts`:

```ts
export interface TopRepoEntry { id: string; name: string; value: number; lang: string; desc: string; }

export interface TopRepos {
  starred: TopRepoEntry[];      // top 3 by stars
  active30: TopRepoEntry[];     // top 3 by 30-day commits
  forked: TopRepoEntry[];       // top 3 by forks_count
}
interface GitData { /* … */ topRepos: TopRepos; }
```

## Pipeline work

`pipeline/aggregate/top-repos.ts`:
- Input: `RepoSummary[]` (with forks count added — needs to extend `RepoSummary` and the Octokit `listForUser` mapper) + the `recent30Counts` map.
- Three sorts × `slice(0, 3)`. `value` is whatever metric the column ranks on (stars, commits30, forks).

## UI work

New component `src/components/TopRepos.tsx`, placed between the
`Recent commits` and `Projects` sections. Three vertical cards in a flex row
(reuse `.card` chrome). Each card has a stacked podium:

```
┌─ MOST STARRED ──────────┐ ┌─ ACTIVE LAST 30D ───────┐ ┌─ MOST FORKED ──────────┐
│ 1. gitoverview     412★ │ │ 1. gitoverview     184  │ │ 1. carrier-pigeon   58 │
│ 2. anvil-notes  1.1K★   │ │ 2. carrier-pigeon   96  │ │ 2. polder           33 │
│ 3. carrier-pigeon 1.8k★ │ │ 3. lichen           71  │ │ 3. drift            21 │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
```

Each entry is clickable → drills into the project detail page (reuses `onProject`).

## Acceptance criteria

1. Three columns; each shows up to 3 entries; "—" if fewer than 3 repos qualify.
2. Click → `setView(repoId)` → drill-in works.
3. Numbers match what `ProjectGrid` shows for the same repo.
4. With the fixture: top-starred is `carrier-pigeon` (1820), top-active is `gitoverview` (184), top-forked depends on synthetic data.
