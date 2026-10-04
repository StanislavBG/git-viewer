# PRD-09 — Maintenance autopilot (cron keepalive, dead-code removal)

## Motivation

The daily `pages.yml` cron went `disabled_inactivity` on 2026-08-07 — GitHub
auto-disables a scheduled workflow after 60 days with no commits to the repo,
and a pure cron-triggered sync never commits anything on its own. The site
silently stopped refreshing until it was noticed and re-enabled on
2026-10-04. Nothing in the workflow or docs explained why, so a future
maintainer (human or agent) would have rediscovered the same failure mode
from scratch.

## Change

- `pages.yml`: the sync step commits `public/data.json` back to `main` as
  `github-actions[bot]` whenever it changes (`[skip ci]`). A commit resets
  GitHub's 60-day inactivity timer, so the cron can never go dormant again as
  long as data actually changes often enough — and even an unchanged sync
  still counts as a workflow *run*, which is what the timer tracks.
- `pnpm sync` runs with `continue-on-error: true` so a transient GitHub API
  failure doesn't block `pnpm build` + deploy — the site redeploys with
  whatever `data.json` was last committed instead of going fully dark.
- Added a `pnpm typecheck` gate before sync/build so a broken `src/` or
  `pipeline/` change fails CI loudly instead of shipping silently.
- Pinned `runs-on: ubuntu-24.04` and Node `22` so the workflow doesn't drift
  when GitHub rotates its `ubuntu-latest` image.
- Removed `pipeline/server.ts`, a dead local-refresh HTTP server that was no
  longer wired into any script and only added upkeep surface.

## Acceptance criteria

- [x] `pages.yml` commits `public/data.json` as `github-actions[bot]` after a
      successful sync, only when the file actually changed.
- [x] `pnpm sync` failure does not block `pnpm build` / deploy.
- [x] `pnpm typecheck` runs as part of the workflow before sync/build.
- [x] Workflow pins `ubuntu-24.04` and Node `22`.
- [x] `pipeline/server.ts` is deleted and no script references it.
- [x] `CLAUDE.md` documents the recovery steps for a future
      `disabled_inactivity` workflow (see `## Maintenance`).
