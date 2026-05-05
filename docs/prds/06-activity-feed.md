# PRD-06 — Cross-repo public activity feed (spec only — tier 2)

## Motivation

Our existing "Recent commits" is just commits. 3 of the surveyed tools
(metrics, masterPortfolio, gitprofile) include richer activity: PRs opened/merged,
issues, releases, stars given. The feature turns the dashboard from "snapshot"
into "alive." Public Events API is unauthenticated-friendly (60/h), 90-day
retention.

## Data-shape change

`src/types.ts`:

```ts
export type ActivityType =
  | 'pr_opened' | 'pr_merged' | 'issue_opened' | 'issue_closed'
  | 'release' | 'starred' | 'forked' | 'created_repo';

export interface ActivityEvent {
  type: ActivityType;
  repo: string;            // "owner/name"
  title: string;
  url?: string;
  ts: string;              // ISO
}
interface GitData { /* … */ activity: ActivityEvent[]; }
```

## Pipeline work

`pipeline/aggregate/activity.ts`:
- `GET /users/{user}/events/public?per_page=100`.
- Map event types: `PullRequestEvent.action='opened'` → pr_opened; `…='closed' && payload.pull_request.merged` → pr_merged; `IssuesEvent` → issue_opened/closed; `ReleaseEvent` → release; `WatchEvent` → starred; `ForkEvent` → forked; `CreateEvent.ref_type='repository'` → created_repo.
- Cap to last 25 events.

## UI work

Augment `RecentFeed` to render mixed types — the leftmost slot becomes a typed
glyph rather than a SHA:

```
[PR↗ ] gitoverview    feat: incremental rev-walk      2h ago   +184 −22
[★  ] hashicorp/vault you starred this repo            6h ago
[🏷 ] anvil-notes     released v2.1.0                  1d ago
```

Or, keep `RecentFeed` for commits and add a sibling `ActivityFeed` component
under it as a separate section.

## Acceptance criteria

1. 5+ event types render with distinct glyphs.
2. Each row links to the GitHub URL when `url` is present.
3. Skinny mode (no PAT): events endpoint still works (it's public); no degradation.
4. Visually consistent with `.feed-row` chrome — no new CSS class beyond a glyph swatch.
