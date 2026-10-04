# Validation — improve-this-project-for-easy-maintance-going-fo-213c9846

Base: `2491ea4` (`chore(a11y,build): WCAG-AA muted ink, golden test, manifest emitter`)
HEAD validated: `93dcb4d`

Per-PRD commits (`git log --oneline 2491ea4..HEAD -- <files>`):
- ci-cron-keepalive → `9da4b22 fix(ci): keep the daily cron alive with a keepalive commit and typecheck gate` (+ merge commit `302c820`)
- remove-refresh-server → `4cdd833 chore(pipeline): remove dead localhost refresh server`
- doc-maintenance-model → `93dcb4d docs(maintenance): record cron keepalive model and recovery steps`

Combined diff: `git diff 2491ea4..HEAD --stat` → 8 files changed, 68 insertions(+), 134 deletions(-) (`.github/workflows/pages.yml`, `CLAUDE.md`, `README.md`, `docs/prds/09-maintenance-autopilot.md`, `docs/prds/README.md`, `package.json`, `pipeline/server.ts` deleted, `src/components/PipelineStrip.tsx`).

## PRD: ci-cron-keepalive — VERIFIED

Evidence (`.github/workflows/pages.yml` as landed):
- `permissions.contents: write` kept alongside `pages: write`, `id-token: write` — line 13.
- `runs-on: ubuntu-24.04` (build job, line 23); `actions/setup-node@v4` with `node-version: '22'` — lines 29-31.
- `Typecheck` step (`pnpm typecheck`) runs after `Install` and before `Sync portfolio data` — lines 34-38.
- `Sync portfolio data` step has `id: sync`, `continue-on-error: true` — lines 40-42.
- `Commit refreshed data.json` step (lines 53-61): `if: steps.sync.outcome == 'success' && github.event_name != 'pull_request'`; configures `github-actions[bot]` / `41898282+github-actions[bot]@users.noreply.github.com`; `git add public/data.json`; guards on `git diff --cached --quiet`; commit message `chore(data): daily sync [skip ci]`; then `git push`.
- Only `.github/workflows/pages.yml` touched (`git show --stat 9da4b22`, not reproduced here — single-file diff confirmed via `git diff 2491ea4..HEAD --stat`, one `.github/workflows/pages.yml` entry attributable to this PRD).

Gate (PRD's own, re-run verbatim):
```
$ rg -n 'contents: write' .github/workflows/pages.yml           → 13:  contents: write
$ rg -n 'continue-on-error: true' .github/workflows/pages.yml   → 42:        continue-on-error: true
$ rg -n 'pnpm typecheck' .github/workflows/pages.yml             → 38:        run: pnpm typecheck
$ rg -n 'ubuntu-24.04' .github/workflows/pages.yml                → 23:    runs-on: ubuntu-24.04
$ rg -n 'chore.data.: daily sync' .github/workflows/pages.yml    → 60:          git commit -m 'chore(data): daily sync [skip ci]'
```
All five `rg` hits found; exit 0. (Second gate line is a no-op placeholder that only prints a string — see Findings.)

Additional acceptance-criteria checks requested beyond the PRD text:
- **Commit step cannot loop**: the push uses the default `actions/checkout@v4`-persisted `GITHUB_TOKEN` credential (no PAT configured for this step); GitHub does not re-trigger `on: push` workflow runs for pushes made with the auto-issued `GITHUB_TOKEN` (documented GitHub Actions behavior), and the commit message additionally carries `[skip ci]`. Confirmed no `secrets.PORTFOLIO_TOKEN` or PAT is used for the push itself (only the pre-existing sync step's env block references `PORTFOLIO_TOKEN`, line 48, unrelated to the git push auth path).
- **`pages.yml` is valid YAML**: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pages.yml'))"` → `VALID YAML`, exit 0.

## PRD: remove-refresh-server — VERIFIED

Evidence:
- `pipeline/server.ts` deleted — confirmed absent (`ls pipeline/`), and `git show --stat 4cdd833` shows `pipeline/server.ts | 126 ---` (full deletion).
- `package.json` `scripts` no longer has `serve`; `git show --stat 4cdd833` shows exactly 1 line removed from `package.json`.
- `src/components/PipelineStrip.tsx`: full file read — no `local → /dashboard/update` span; `<a className="cli">$ pnpm sync</a>` still present.
- `README.md`: `/dashboard/update` bullet removed (`git show --stat` shows 2 lines removed); `pnpm sync` references remain in Quick Start and Scripts sections.

Gate (PRD's own, re-run verbatim):
```
$ pnpm install --frozen-lockfile   → ok (node_modules was missing in this worktree; installed first)
$ pnpm typecheck                   → tsc --noEmit, exit 0
$ pnpm build                       → vite build + emit-manifest, exit 0
$ rg -c 'dashboard/update|pnpm serve' README.md src/components/PipelineStrip.tsx package.json --count-matches -q --invert-match → exit 0
```

Additional requested check — repo-wide absence of `pipeline/server`, `pnpm serve`, `dashboard/update` outside `node_modules/` and `session-manager-operations/`:
```
$ rg -n 'pipeline/server|pnpm serve|dashboard/update' --glob '!node_modules' --glob '!session-manager-operations' .
docs/prds/09-maintenance-autopilot.md:27: ...Removed `pipeline/server.ts`, a dead local-refresh HTTP server...
docs/prds/09-maintenance-autopilot.md:37: - [x] `pipeline/server.ts` is deleted and no script references it.
```
This is a real hit against the literal AC wording (see Findings — Minor). It is historical/past-tense documentation added later by `doc-maintenance-model`, not a residual live reference to the deleted file, and it does not touch any file the PRD's own `# Files`/`# Gate` sections scoped (`README.md`, `src/components/PipelineStrip.tsx`, `package.json`). The PRD's own gate command (scoped to those three files) passes cleanly. Verdict stands at VERIFIED; flagged below for the architect's awareness since the AC text as written ("no file in the repo ... references pipeline/server") is no longer literally true once docs/ is included.

## PRD: doc-maintenance-model — VERIFIED

Evidence:
- `docs/prds/09-maintenance-autopilot.md` exists with `## Motivation` (disabled_inactivity 2026-08-07, re-enabled 2026-10-04), `## Change` (keepalive commit, continue-on-error, typecheck gate, ubuntu-24.04/Node 22 pin, `pipeline/server.ts` removal), `## Acceptance criteria` sections — full file read, lines 1-39.
- `docs/prds/README.md:18` → `| 09  | Maintenance autopilot (cron keepalive, dead-code removal) | — | implemented |`.
- `CLAUDE.md` `## Maintenance` section (lines 29-34) present after `## Deploy`, with the exact four behaviors requested: cron commits as `github-actions[bot]` / `git pull` first; `gh workflow list --all` + `disabled_inactivity` check; `gh workflow enable pages.yml && gh workflow run pages.yml` fix; failed sync still deploys last committed data.
- `CLAUDE.md` Commands section (lines 19-23) has no `pnpm serve` entry; Layout's `pipeline/` line (line 7) matches the tree (no `server.ts` mentioned).
- `git show --stat 93dcb4d` → exactly `CLAUDE.md`, `docs/prds/09-maintenance-autopilot.md`, `docs/prds/README.md` touched — matches `# Files`.

Gate (PRD's own, re-run verbatim):
```
$ rg -n 'disabled_inactivity' CLAUDE.md docs/prds/09-maintenance-autopilot.md
CLAUDE.md:31, CLAUDE.md:32, docs/prds/09-maintenance-autopilot.md:5, docs/prds/09-maintenance-autopilot.md:39
$ rg -n '^. 09' docs/prds/README.md
18:| 09  | Maintenance autopilot (cron keepalive, dead-code removal) | — | implemented |
```
Both hit; exit 0.

## Code review / security review

`/code-review` (forked execution against `git diff 2491ea4..HEAD`) returned 4 findings, all in `.github/workflows/pages.yml`, reproduced under Findings below. None invalidate an acceptance criterion — each is either an explicit, PRD-specified design choice (the executor implemented exactly what PRD `ci-cron-keepalive` specified) or a pre-existing scope boundary (`deploy` job pinning was never in the AC, only `build`).

`/security-review` could not run in this worktree: its diff-base discovery shells out to `git diff --name-only origin/HEAD...`, and this worktree's `origin/HEAD` is unset (`fatal: ref refs/remotes/origin/HEAD is not a symbolic ref`) — a worktree/environment limitation, not a code issue. Self-review of the 8-file diff instead: no secrets introduced or touched; the new CI step's only credential is the ambient `actions/checkout@v4`-persisted `GITHUB_TOKEN`, scoped by the job's own `permissions:` block, never printed or echoed; no new dependency; no user-controlled input reaches a shell command (workflow triggers are `push`/`schedule`/`workflow_dispatch`, not `pull_request_target` or similar); the rest of the diff is markdown/docs and a static-file deletion. No security findings.

## Findings

**Important**
- `.github/workflows/pages.yml:54` — The keepalive commit only fires when `steps.sync.outcome == 'success'`, and `continue-on-error: true` on the sync step makes the job report green even when sync fails repeatedly. If `pnpm sync` fails on every scheduled run (e.g. sustained GitHub API trouble), no commit ever lands, the 60-day timer is never reset, and the workflow shows all-green runs right up until GitHub re-disables it with `disabled_inactivity` — the same failure mode this PRD exists to prevent, now silent. This is exactly what PRD `ci-cron-keepalive`'s `# Implementation notes` step 5 specified verbatim; the executor matched the spec. Worth a follow-up PRD (e.g. alert on N consecutive sync failures, or commit a heartbeat file independent of sync success) but out of scope for this validation.
- `.github/workflows/pages.yml:61` — `git push` after the keepalive commit has no retry, rebase, or `continue-on-error`. A push rejected (e.g. branch protection, or a human pushing to `main` mid-run) fails the step and the job stops before `Build`/`Upload Pages artifact` run, so that day's deploy is skipped — the opposite of the PRD's "transient failure still deploys" goal, just via a different step. Also PRD-specified verbatim (step 5 of the implementation notes); not a deviation.

**Minor**
- `.github/workflows/pages.yml:54` — `github.event_name != 'pull_request'` is dead code: this workflow's `on:` block (`push`, `schedule`, `workflow_dispatch`) can never produce a `pull_request` event, so the clause is always true. PRD-specified verbatim (belt-and-braces per its own note); harmless but misleads a future reader into thinking the workflow runs on PRs.
- `.github/workflows/pages.yml:73` — `deploy` job still runs on `ubuntu-latest` while `build` was pinned to `ubuntu-24.04`. The PRD's AC only required pinning "the build job," so this is not a violated criterion, but it leaves half the drift risk the pin was meant to close.
- `docs/prds/09-maintenance-autopilot.md:27,37` — Falls inside the repo-wide `pipeline/server|pnpm serve|dashboard/update` grep the acceptance criteria asked be clean outside `node_modules/` and `session-manager-operations/`. It's accurate past-tense documentation of the completed removal (not a live reference), and PRD `remove-refresh-server`'s own scoped gate (README.md/PipelineStrip.tsx/package.json only) passes, but the AC's literal wording ("no file in the repo ... references pipeline/server") is no longer true once `docs/` is in scope. No action needed unless a future doc sweep wants this phrased to avoid grep noise.

# Verdict

VALIDATION: ci-cron-keepalive VERIFIED
VALIDATION: remove-refresh-server VERIFIED
VALIDATION: doc-maintenance-model VERIFIED
SCHEDULER_VERDICT: PASS
