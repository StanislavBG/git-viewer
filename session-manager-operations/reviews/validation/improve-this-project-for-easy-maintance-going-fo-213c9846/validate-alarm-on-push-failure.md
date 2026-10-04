# Validation: ci-alarm-on-push-failure

Base: 98b247a. PRD found in `prds-archived/9-ci-alarm-on-push-failure.md`.
Commit: `9c73641 fix(ci): alarm on keepalive push failure as well as sync failure`
(`git log 98b247a..HEAD -- .github/workflows/pages.yml`); it touches only `.github/workflows/pages.yml`.

## ci-alarm-on-push-failure — VERIFIED

- `id: keepalive` on `Commit refreshed data.json`: `pages.yml:61`; `continue-on-error: true` and `if: steps.sync.outcome == 'success'` unchanged (lines 62-63).
- Build output: `pages.yml:26` `keepalive_outcome: ${{ steps.keepalive.outcome }}` beside `sync_outcome` (line 25).
- `sync-alarm` `if` (`pages.yml:97`): `always() && (…sync_outcome == 'failure' || …keepalive_outcome == 'failure')`, exactly as specified.
- Alarm step (`pages.yml:99-105`): `SYNC`/`KEEPALIVE` passed via `env:`, echoes `::error::sync=$SYNC keepalive=$KEEPALIVE — …`, then `exit 1`. Job comment mentions both causes.
- YAML parse and gate re-run: `rg 'id: keepalive'` + `rg keepalive_outcome` + `pnpm dlx js-yaml` → exit 0.
- No other file modified by this PRD: `git show --stat 9c73641` → 1 file.
- Deviation (benign): alarm step renamed "Report sync or keepalive failure"; PRD said "rename nothing" (about the job).

## Important finding from validate-keepalive-hardening.md — RESOLVED

That finding (`sync-alarm` ignores push-step outcome, so repeated `git push` failure stays green) is closed: a failed keepalive step yields `outcome == 'failure'` (continue-on-error preserves `outcome`, unlike `conclusion`), which now trips the alarm. A skipped step (sync failed) has outcome `skipped`, so no false keepalive alarm; sync failure alarms via the sync clause.

## Combined diff review

`git diff 98b247a..HEAD --stat` also includes earlier-PRD files (ai-summaries, sync.ts, data.json, prior validation records), out of this PRD's scope. Self-review of the pages.yml change: outputs are passed through `env:` (no expression injection into the shell), no secrets exposed, no path handling.

## Findings

**Critical:** none.
**Important:** none.
**Minor:**
- `.github/workflows/pages.yml:97` — alarm is only effective if the repo owner receives failed-run emails; not verifiable from the tree.
