# Validation: no-SaaS-code plan (PRDs 64-70)

Base: 1062ee0583fc88dfc9c1cf398865c05bdc52c64b (on branch `front-page-only`).
Validated tree: job HEAD `5aa210b` (branched from `main` 538a5d9-equivalent). `git merge-base --is-ancestor 1062ee0 HEAD` -> 1: **the base is not an ancestor of HEAD**, so `git log <base>..HEAD` is meaningless here; per-PRD commit lists were located by branch instead.

## Root cause (applies to most verdicts)
- PRDs 64-68 (and a copy fix) landed as commits `f25fb24`, `b1fa591`, `9b982c1`, `1e17acd`, `003f687`, `84def24` on branch **`front-page-only`** only (`git branch -a --contains` shows nothing else). None is an ancestor of this job's HEAD, `main`, or `sm-epic/...-05f162ab`.
- PRD 69 (npm library) landed nowhere: `b2c3560` did it, then `ca01ab1` reverted it on main; `front-page-only` (84def24) still has pipeline/index.ts, lib-export.test.ts, tsconfig.lib.json, release.yml, CHANGELOG.md, `@bilkobibitkov/git-viewer`, `build:lib`.
- PRD 70 (docs) landed on main as `5aa210b`/`538a5d9`.
- Gates were not re-run on HEAD: the code they check is absent here, so a green/red result would not be about the PRDs. Evidence below is file reads and `git grep`/`rg`.

## remove-repo-page-engine - REFUTED (not in tree under validation)
- pipeline/repo-page.ts, repo-page.test.ts: absent at HEAD (main never had them) - criterion 1 holds trivially.
- `grep fetchRepo|fetchContributorCount|... pipeline/sources/github.ts` at HEAD: only `fetchRepos`/`fetchMarkdownDir` (unrelated); `fetchCommitActivity` etc. absent. repo-route.ts absent.
- pipeline/index.ts:3 still exports `selectRepos, PLAN_LIMITS` (PRD 68 scope); buildRepoPage not exported. package.json test list has no repo-page test.
- Effectively satisfied on main by absence; real removal commit `f25fb24` is only on `front-page-only`. Marked REFUTED for the plan: its deliverable commit has not landed on the integration line.

## remove-tenant-client - REFUTED
- src/data/tenant.ts present at HEAD (also on epic branch); `useTenant` at src/data/loader.tsx:136, used by PrintShell.tsx:2,16 and HostedActions.tsx:2,86. Removal exists only in `b1fa591` on `front-page-only`.

## remove-saas-telemetry - REFUTED
- src/data/telemetry.ts:93 `checkoutProps`, :99 `markBuildPending`, :107 `takeBuildPending` still present at HEAD. Removal is `9b982c1` on `front-page-only` only.

## remove-hosted-chrome-config - REFUTED
- HEAD still has Landing.tsx, HostedActions.tsx, RepoPicker.tsx; src/vite-env.d.ts:4 `VITE_CLERK_PUBLISHABLE_KEY`; `1e17acd` only on `front-page-only`.

## remove-plan-tiers - REFUTED
- pipeline/aggregate/select-repos.ts (+test) present at HEAD; pipeline/portfolio.ts:54,124,166-168,439 still has `allowlist`/`lockedCount`; pipeline/index.ts:3 exports `PLAN_LIMITS`. `003f687` only on `front-page-only`.

## remove-npm-library - REFUTED (nothing landed anywhere)
- HEAD package.json:2 `@bilkobibitkov/git-viewer`, :26 `main`, :28 `exports`, :40 `publishConfig`, :50 `build:lib`, :51 test script runs `build:lib` + lib-export test; not `private`.
- pipeline/index.ts, lib-export.test.ts, tsconfig.lib.json, .github/workflows/release.yml, CHANGELOG.md all present; .gitignore `dist-lib/`; tsconfig.json:24 excludes lib-export/dist-lib.
- Same on `front-page-only` (84def24). The only removal attempt (b2c3560) was reverted by ca01ab1.

## remove-saas-docs - VERIFIED on HEAD (with caveat)
- docs/prds/10, 11, 12, 14 absent at HEAD; `git diff` shows docs/prds/README.md, 13-observability-tagging.md, README.md, CLAUDE.md edited.
- `rg -i 'saas|freemium|stripe|clerk|checkout|lockedCount|PLAN_LIMITS|bilkobibitkov|\?u=|hosted portfolio' README.md CLAUDE.md docs` at HEAD: no hits (all whole-tree hits are in code/package/CHANGELOG, below). CLAUDE.md carries "git-viewer is a front page only; nothing is sold."
- Caveat: docs now describe a tree whose code removal (64-69) has not landed on this line, so docs and code disagree on main.

## Whole-tree check (HEAD) - FAILS
Command from the PRD at HEAD returns hits (exit 0 = found). By file: pipeline/portfolio.test.ts:55-57, pipeline/index.ts:3, pipeline/portfolio.ts:54,124,166,168,439, package.json:2,51, scripts/emit-manifest.mjs:26 (`@bilkobibitkov/host-kit` - a dependency of the host, see Minor), CHANGELOG.md:5, pipeline/lib-export.test.ts:9, src/vite-env.d.ts:4, pipeline/aggregate/select-repos{,.test}.ts, src/data/tenant{,.test}.ts, claim{,.test}.ts, telemetry.ts:93, telemetry.test.ts, src/data/loader.tsx, src/components/{HostedActions,Landing,RepoPicker,ProjectsTab,PrintShell}.tsx, .github/workflows/pages.yml:28 and release.yml (`actions/checkout` - false positive).
On `front-page-only` (84def24) the same check still hits: CHANGELOG.md, CLAUDE.md (2), docs/prds/10-14 (stale), docs/prds/README.md, package.json, README.md (6), release.yml, scripts/emit-manifest.mjs, pages.yml (checkout).

## Findings
### Critical
- Plan work is split across branches and not integrated: PRDs 64-68 live only on `front-page-only` (84def24); this job's HEAD/main still contains the full SaaS client, tenant, plan-tier and Clerk/Stripe code (see whole-tree list). Merge/rebase `front-page-only` into main, then re-validate.
- PRD 69 never landed (reverted at ca01ab1; absent from `front-page-only`): package.json:2,26,28,40,50,51; pipeline/index.ts; tsconfig.lib.json; release.yml; CHANGELOG.md.
### Important
- `front-page-only` also left docs/prds/10-14 and README/CLAUDE.md SaaS text; main fixed docs (5aa210b) independently - merging both will conflict on docs.
- docs (PRD 70) landed before the code (violates its own "needs 69, 66, 67 landed" ordering): main docs claim a front-page-only product while code still ships hosted flows.
### Minor
- scripts/emit-manifest.mjs:26 references `@bilkobibitkov/host-kit` (a dependency name, not git-viewer's own package); decide if it should be exempt or renamed.
- `actions/checkout` in .github/workflows/*.yml matches the `checkout` term (false positive; consider narrowing the regex).
- PRD files were found in `prds-archived/` for all seven slugs (no missing-file findings).
