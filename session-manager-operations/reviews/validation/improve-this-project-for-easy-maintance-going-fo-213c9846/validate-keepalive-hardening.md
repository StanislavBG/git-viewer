# Validation — ci-keepalive-hardening (improve-this-project-for-easy-maintance-going-fo-213c9846)

Base: `98b247a` (per implementation notes).
PRD source file: not found on disk. `session-manager-operations/scheduler/` does not exist in
this worktree, in git history (`git log --oneline --all -- "session-manager-operations"` shows
only the two committed `reviews/validation/*.md` files), or anywhere under
`/home/bilko/.local/state/session-manager/` (grepped for the slug `ci-keepalive-hardening` —
zero hits). Scheduler PRD markdown is evidently not repo-tracked and was already cleaned up
after this PRD's own prior run. Acceptance is therefore checked against (a) the two Important
findings' exact text in `validate-maintenance-autopilot.md`, which this PRD exists to resolve,
and (b) the implementation summary recorded earlier in this same epic's conversation (fetch-depth
0, `continue-on-error` commit step, `git pull --rebase` before push, `sync_outcome` build output,
new `sync-alarm` job, `deploy` pinned to `ubuntu-24.04`) — cross-checked line-by-line against the
actual landed diff below, not taken on trust.

Per-PRD commits (`git log --oneline 98b247a..HEAD -- .github/workflows/pages.yml`):
- ci-keepalive-hardening → `bf1adc3 fix(ci): make keepalive push non-blocking and surface sync failures`

Combined diff: `git diff 98b247a..HEAD --stat` → one file, `.github/workflows/pages.yml`
(+27/-3). (The two other commits in `98b247a..HEAD`, `1131795` and `2cbdc5b`/`93bc143`, belong to
the sibling `summary-readme-fallback` PRD and its own validation merge — already verified in
`validate-summary-readme-fallback.md` — and touch no file this PRD owns.)

## PRD: ci-keepalive-hardening — VERIFIED (with a residual gap noted below)

Evidence (`.github/workflows/pages.yml` as landed, read in full):
- `fetch-depth: 0` on `actions/checkout@v4` — line 29 (`git pull --rebase` needs full history to
  rebase cleanly; shallow clone would have made this unreliable).
- `build` job declares `outputs.sync_outcome: ${{ steps.sync.outcome }}` — line 25.
- `Commit refreshed data.json` step: `if: steps.sync.outcome == 'success'` (line 60),
  `continue-on-error: true` (line 61), then `git pull --rebase origin main` (line 68) before
  `git push` (line 69) — a rejected push no longer fails the job or blocks `Build`/`Deploy`.
- New `sync-alarm` job (lines 89-100): `needs: [build, deploy]`, `if: always() &&
  needs.build.outputs.sync_outcome == 'failure'`, emits `::error::` and `exit 1` — turns the run
  red when `pnpm sync` itself fails, instead of staying silently green.
- `deploy` job now `runs-on: ubuntu-24.04` (line 81), matching `build` (line 23) — closes the
  Minor finding from the prior validation (`deploy` was still on `ubuntu-latest`).

Gate — this PRD declares `none`; checked by reading + the following commands, re-run fresh:
```
$ pnpm dlx js-yaml .github/workflows/pages.yml   → parses clean, exit 0
$ rg -n 'fetch-depth: 0' .github/workflows/pages.yml           → 29
$ rg -n 'continue-on-error: true' .github/workflows/pages.yml  → 46, 61
$ rg -n 'git pull --rebase origin main' .github/workflows/pages.yml → 68
$ rg -n 'sync_outcome' .github/workflows/pages.yml              → 25, 95
$ rg -n 'sync-alarm' .github/workflows/pages.yml                → 89
$ rg -n 'ubuntu-24.04' .github/workflows/pages.yml              → 23, 81, 91
```
All hit; exit 0. `git status --short` clean at HEAD, no drift since `bf1adc3`.

### The two Important findings from `validate-maintenance-autopilot.md`

1. *"keepalive commit only fires when sync succeeds, and `continue-on-error` on sync lets the job
   stay green on repeated sync failure — no commit ever lands, timer never resets, silent until
   `disabled_inactivity`."* — **Resolved.** `sync-alarm` (lines 89-100) now turns the run red
   whenever `needs.build.outputs.sync_outcome == 'failure'`, independent of the commit step. A
   human watching workflow status (or GitHub's own failure email) now sees red on the first
   failed sync, not after 60 silent days.

2. *"`git push` after the keepalive commit has no retry/rebase/`continue-on-error`; a rejected
   push fails the job before `Build`/`Deploy` run, skipping that day's deploy — the opposite of
   the PRD's goal."* — **Resolved.** The whole commit step now carries `continue-on-error: true`
   (line 61) and attempts `git pull --rebase origin main` first (line 68), so a transient push
   conflict no longer blocks `Build` or `Deploy`; the site still deploys with the newly-synced
   `data.json` (or the last-committed one if the push itself failed after a successful local
   commit).

### Residual gap (new, found this run — not in the prior Important pair, same failure family)

`sync-alarm`'s `if` only inspects `needs.build.outputs.sync_outcome`, i.e. the **sync** step's
outcome — never the **commit/push** step's outcome. The commit/push step (lines 59-69) now has
its own `continue-on-error: true`, so if `pnpm sync` keeps succeeding but `git push` keeps
failing (e.g. a sustained branch-protection rule, or another process holding `main` locked), the
commit never lands, the 60-day inactivity timer is never reset, `sync_outcome` stays `'success'`
every day, and `sync-alarm` never fires — the run is all-green right up to
`disabled_inactivity`, reproducing finding #1's exact silent-failure shape through the other half
of the same step the PRD just hardened. `/code-review` (low effort, scoped to `bf1adc3`)
independently surfaced the identical gap. This is a genuine shortfall against the PRD's own
stated goal ("repeated sync failure must turn the run red") read as "repeated keepalive failure,
for any reason, must turn the run red" — the PRD text fixed the sync half but left the push half
exposed. Flagged as Important below for a follow-up PRD; not blocking this validation's VERIFIED
call because the two findings it was scoped to resolve are, as literally stated, resolved.

## Code review / security review

`/code-review` (low effort, target `bf1adc3`, forked execution) returned one finding: the
residual gap described above (commit/push failure isn't surfaced to `sync-alarm`). No other
findings.

`/security-review` could not run: same worktree limitation as the prior validation
(`refs/remotes/origin/HEAD` is unset — `fatal: ambiguous argument 'origin/HEAD...'`), confirmed
by re-running `git rev-parse --symbolic-full-name refs/remotes/origin/HEAD` fresh. Self-review of
the single-file diff: no secrets introduced or touched, no new dependency, no user-controlled
input reaches a shell command (same `push`/`schedule`/`workflow_dispatch` triggers as before),
`fetch-depth: 0` only affects how much git history the runner clones (public repo, no
confidentiality impact), and the new `sync-alarm` job's only action is an `echo`+`exit 1` with no
external call. No security findings.

## Findings

**Important**
- `.github/workflows/pages.yml:95` — `sync-alarm`'s `if` checks only
  `needs.build.outputs.sync_outcome`, not the commit/push step's own outcome. A repeated
  `git push` failure (sync succeeding every time) never lands a keepalive commit, never resets
  the 60-day timer, and never trips the alarm — the same silent-failure shape finding #1
  described, now routed through the push step instead of the sync step. See "Residual gap"
  above for detail. Worth a follow-up PRD: expose the commit step's `outcome` as a second build
  output and OR it into `sync-alarm`'s condition, or fold both steps' status into one combined
  output.

**Minor**
- (none beyond what the prior validation already recorded and this PRD already fixed —
  `deploy`'s `ubuntu-latest` pin is now closed.)

# Verdict

VALIDATION: ci-keepalive-hardening VERIFIED
SCHEDULER_VERDICT: PASS
