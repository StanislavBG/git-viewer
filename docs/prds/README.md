# PRDs

Roadmap for v3 — features distilled from a survey of the most popular GitHub-portfolio
projects (github-readme-stats, github-profile-trophy, snk, lowlighter/metrics,
github-profile-summary-cards, repo-visualizer, gitprofile, masterPortfolio, bchiang7/v4,
rahuldkjain/github-profile-readme-generator, GitHub native achievements).

| #   | Feature | Tier | Status |
|-----|---------|------|--------|
| 01  | Headline stats strip                       | 1 | implemented |
| 02  | Streaks (current / longest / total)        | 1 | implemented |
| 03  | Top repos panel (starred/active/forked)    | 1 | implemented |
| 04  | Achievements / trophies row                | 2 | implemented |
| 05  | Per-project file treemap                   | 2 | implemented |
| 06  | Cross-repo activity feed (PRs/issues/releases) | 2 | implemented |
| 07  | Productive-time 7×24 heatmap               | 1 | implemented |
| 08  | Resume / print mode                        | 1 | implemented |

All v3.0 + v3.1 PRDs landed.

## v3.2 — Tabs

Four-tab top-level nav: **Overview · Projects · Activity · Writing**.

- Overview: existing single-page experience
- Projects: magazine-grid with heuristic per-repo AI summaries (TLDR · vibe · 5-axis grades · use-cases · strengths/risks)
- Activity: curiosities grid · hour×DOW heatmap · commit-msg word cloud · file-ext treemap · 52-week velocity · honors
- Writing: featured essay (drop-cap) · pull quotes · year-grouped archive · "now reading/writing/thinking" trio. Content authored as `content/writing/*.md` with YAML frontmatter; `_now.md` drives the "now" panel.

Routing via URL hash (`#/projects`, `#/activity`, `#/writing`); back/forward preserved.

Each PRD is a self-contained spec with: motivation, data-shape change, pipeline
work, UI work, acceptance criteria. Read in numerical order.
