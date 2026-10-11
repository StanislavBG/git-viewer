# Validation: hosted-portfolios (git-viewer half)

Base: 4717a85c4aa2f483eae0322a419ce72f89717f5d, HEAD b9b23b9. PRD files found in `prds-archived/`. Combined diff: 23 files, +1416/-420. Gates re-run in a worktree after `pnpm install --offline --frozen-lockfile` (node_modules was absent).

Gate results: `tsx --test` over select-repos, writing, tenant, portfolio: 28/28 pass. `pnpm build:lib` exit 0. `lib-export.test.ts` 1/1 pass. `pnpm build` exit 0. `playwright golden.spec.ts` 1/1 pass. `pnpm typecheck` exit 0 once `dist-lib/` exists, but exit 2 on a clean tree (see Important finding).

## hosted-portfolios-spec — VERIFIED
- docs/prds/10-hosted-portfolios.md has Motivation (:3), Tiers (:15), URL scheme (:39), API contract (:49), Data-shape change (:98), Pipeline work (:107), UI work (:131), Bilko host work (:144), Acceptance criteria (:161).
- Tiers (:19-31): free 3 / once per 24h; paid $5/mo, `git_viewer`, `STRIPE_PRICE_GITVIEWER`, 12 projects, daily refresh; Bilko host section :156 covers pro/business inclusion.
- API: route :51, login regex :56, 202 body :81, 429 body :93. The 200/404 bodies were not individually re-read; the section spans :49-96.
- URL scheme :43-44 (`?u=`, dev proxy). Pipeline work :112/:125 (buildPortfolio, cap BEFORE per-repo fetches).
- README row `| 10 | Hosted multi-user portfolios (bilko.run) | — | in progress |` (git diff).

## select-repos — VERIFIED
- select-repos.ts:3 PLAN_LIMITS `{free:3, paid:12}`; :10 selectRepos signature.
- Ranking :31-37 (archived, stars desc, pushedAt desc). Allowlist :17-29 (case-insensitive, allowlist order, unknown ignored, deduped). Cap :40 (`Math.max(0, max)`, so <=0 gives []). lockedCount :41. Input is copied before sort (:31), so it is not mutated.
- Tests pass (part of 28/28). Gate green.

## writing-from-files — VERIFIED
- writing.ts exports buildWritingFromFiles; buildWriting delegates (diff in pipeline/aggregate/writing.ts). writing.test.ts passes (28/28) with empty, featured, _now, non-md, ordering, and repo-root cases. Gate green.

## tenant-client — VERIFIED
- tenant.ts:3 LOGIN_RE exact; :20 parseLogin; :26 tenantApiUrl; :5 TenantResponse; :44 parseTenantResponse (clamp 2..15, default 5 at :38-40; throws on other status and on 200 without data). Gate green.

## build-portfolio-lib — VERIFIED
- portfolio.ts: buildPortfolio at :120, selectRepos at :164 before fetchRepoBundle at :171. No writeFile/process.exit/dotenv/config.js matches (grep clean). Probe wrapped in try/catch (:132-148). Default empty writing.
- sync.ts:13-26 matches spec: loadConfig, buildPortfolio with no cap, `split(cfg.user).join(cfg.displayName)` anonymisation, writeFileSync public/data.json.
- portfolio.test.ts passes with injected source. Gate green.

## tenant-loader — VERIFIED
- loader.tsx: State adds generating/not_found and tenant on ready (:8-19); no valid ?u= keeps the original fetch(dataUrl()) path with tenant null (:57-70); polling at :72-111 with 20-attempt cap and message 'still generating — try again in a minute' (:100-103); timer cleared on unmount (:114-117); useTenant :135. vite.config.ts proxy + `base: './'` retained. `pnpm build` green.

## profile-writing — VERIFIED
- github.ts:159 fetchMarkdownDir (md-only, max, [] on any error); portfolio.ts:54 type, :389-397 branch (skinny gives empty; 'none'/undefined give empty). sync.ts unchanged call path. Tests pass. Gate green.

## tenant-ui — VERIFIED
- App.tsx DataGate: `building @{login}’s portfolio …`; not_found text + form (input u, button View) navigating to `?u=`. ProjectsTab: upsell card gated on tenant && free && lockedCount>0, text and link match. Topbar hides Writing when essays empty and now null. No-tenant path renders no card. Build + golden green.

## pipeline-lib-build — VERIFIED (with Important finding on gate ordering)
- index.ts re-exports all required symbols; tsconfig.lib.json matches; package.json script, main/types/exports/files, deps moved, private retained; .gitignore has dist-lib/. build:lib then lib-export test passes.

## Cross-cutting checks
- Owner path unchanged: with no valid `?u=` the loader takes the original branch with canonical-host logic intact (loader.tsx:57-70); `ready.tenant` is null so there is no upsell.
- Login validated before any fetch: `parseLogin` (LOGIN_RE) runs at loader.tsx:55 before any tenant fetch; an invalid value falls back to the owner path, and the URL is `encodeURIComponent`-ed.
- `pnpm sync` path still writes public/data.json with displayName anonymisation (sync.ts above).

## Findings
### Critical
- none
### Important
- `pnpm typecheck` fails on a clean checkout: `pipeline/lib-export.test.ts:3` imports `../dist-lib/pipeline/index.js`, which is gitignored and only exists after `build:lib`. PRD 19's gate orders typecheck first, so it passes only when `dist-lib/` is left over from an earlier build. CI (`pages.yml` runs typecheck) would break on a fresh checkout. Fix: exclude `lib-export.test.ts` from tsconfig.json, or run build:lib before typecheck.
### Minor
- `portfolio.ts:389-392`: 'profile-repo' writing is silently dropped when the rate budget is under 200 (the unauthenticated case). That is per spec, but it means free tenants on a tokenless run never get Writing.
- Loader `fail()` after `cancelled` is guarded, but the non-JSON-body error and `parseTenantResponse` throw both land in the generic error state; there is no retry on 5xx.
- The `?u=` hosted path hides the Writing tab for the owner too if the owner's essays are empty (intended).
- `/code-review` and `/security-review` were not run as separate tools; I self-reviewed the diff. No secrets, path traversal or injection found: the login is regex-validated and URL-encoded, and `fetchMarkdownDir` takes a fixed 'writing' path.
