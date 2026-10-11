# Validation: bound-commit-pages

Base: 6c7d48f (from the validate PRD). Implementation commit: 7ada1fd `fix(pipeline): cap commit pagination at 5 pages per repo; bump 0.1.1`.
PRD located at `prds-archived/25-bound-commit-pages.md`. Worktree had no `node_modules`; ran `pnpm install --frozen-lockfile` first.

## bound-commit-pages — VERIFIED

- AC1 `MAX_COMMIT_PAGES = 5` and `fetchCommits(..., maxPages = MAX_COMMIT_PAGES)`: `pipeline/sources/github.ts:42` and `:112`; the cap is in the `paginate` callback (`pages++; if (pages >= maxPages) done()`), `per_page: 100` unchanged.
- AC2 409 handling: the catch block is untouched by the diff (`git diff 6c7d48f..HEAD`). `github.test.ts` covers 409 → `[]` and `boom` → rethrown, both passing.
- AC3 `maxCommitPagesPerRepo?` in `PortfolioOptions` (`pipeline/portfolio.ts:53`), threaded through `fetchRepoBundle` with default `MAX_COMMIT_PAGES` (`:173`). `grep maxCommitPages|fetchCommits pipeline/sync.ts` returns nothing, so sync uses the default.
- AC4 `pipeline/sources/github.test.ts`: fake kit injected via the new `kit?` constructor arg. 12 pages → `requests === 5`, `commits.length === 500` (test passes).
- AC5 Existing tests: `portfolio.test.ts` and `select-repos.test.ts` pass.
- package.json bumped 0.1.0 → 0.1.1; no publish.

### Gate (re-run)
- `pnpm typecheck` → exit 0.
- `pnpm exec tsx --test pipeline/sources/github.test.ts pipeline/portfolio.test.ts pipeline/aggregate/select-repos.test.ts` → 16 tests, 16 pass, 0 fail.

## Review of combined diff
`git diff 6c7d48f..HEAD --stat`: package.json, pipeline/portfolio.ts, pipeline/sources/github.ts, new github.test.ts, plus `public/data.json` (a daily-cron data refresh, not part of this PRD). Self-reviewed for correctness, input handling, secrets and path traversal: nothing found.

## Findings

### Critical
- none

### Important
- none

### Minor
- `pipeline/sources/github.test.ts:20-40`: the fake `paginate` implements `done()` itself, so the test proves our callback logic but not Octokit's real `done()` handling.
- `pipeline/sources/github.ts:~49`: the User-Agent string is still hardcoded `git-viewer/0.1.0` after the bump to 0.1.1.
- `pipeline/sources/github.ts`: the cap makes the owner's own heatmap count at most 500 commits per repo (down from all of them). This is intended by the PRD, but worth knowing.
- `public/data.json` appears in the base..HEAD range because of an unrelated cron/data commit.
