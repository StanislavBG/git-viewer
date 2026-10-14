# Validation: free tier is 1 project

Base: be9ce054 (found). Commits: 3e32dd9 (code), 0b96857 (docs), 8fe82f5 (listing note).
Combined diff: 9 files, +14/-13; only the files the PRDs name, plus the listing note. Self-review (no secrets, no input handling, no new helpers): clean.

## free-tier-one-project — VERIFIED
- `pipeline/aggregate/select-repos.ts:3` `export const PLAN_LIMITS = { free: 1, paid: 12 } as const;`
- `select-repos.test.ts:27` asserts `{ free: 1, paid: 12 }`; passes in `pnpm test`.
- `package.json` test script lists `pipeline/portfolio.test.ts pipeline/aggregate/select-repos.test.ts` in the same `node --import tsx --test` command.
- `src/components/Landing.tsx:12` `'1 featured project'`; absence check for `3 featured projects` in `src/`: clean.
- Gate: `pnpm typecheck` exit 0; `pnpm test` 49/49 pass + lib-export 1/1 pass. (The job worktree has no node_modules; I temporarily symlinked the main checkout's and removed it afterwards. A first run without it failed on `tsc: not found`, an environment issue, not a code one.)

## free-tier-one-project-docs — VERIFIED
- `docs/prds/10-hosted-portfolios.md:27` "**Free**: 1 project"; `:167` "Free tier renders 1 project … paid renders up to 12". The diff touches 5 lines in this file, covering the tier-table row and the data-shape line. Grep finds no remaining "3 free" or "top 3".
- `docs/prds/12-saas-self-serve.md:9` "1 project"; the "default 3" sentence now says 1 (diff shows 2 lines changed).
- `docs/prds/README.md:21` row 12 status `implemented`.
- `README.md:123` `maxProjects: 1`.

## listing-free-one-project — VERIFIED
Source: live `curl https://bilko.run/api/projects` (git-viewer entry) and Bilko `origin/main:src/data/standalone-projects.json`. The two agree.
- `detail`: "… Free: your top project, rebuilt at most once a day when viewed. $5/mo: pick up to 12 repos, refreshed daily." with the preceding sentence unchanged.
- Talking point 4 is "Free shows your top project, rebuilt at most once a day when someone views it."; the other four are unchanged.
- `metric` "1 free · 12 paid", `metricLabel` "repos per portfolio" unchanged; no "3 projects" / "top 3" / "3 free" in any listing field.
- `avoidClaims` has 5 entries, the last being "Shows more than one project on the free tier".
- Note file `session-manager-operations/reviews/listing-free-one-project.md` present (commit 8fe82f5).
- Note: the bilko-host `get_project` reads an unsynced local Bilko checkout and was not used.

## Findings
### Critical
- none
### Important
- none
### Minor
- Out of scope per the brief, noted only: Bilko's `server/routes/tools/git-viewer.ts:34` in the local checkout still has `PLAN_LIMITS = { free: 3, paid: 12 }`. The hosted server therefore may still serve 3 projects until the Bilko repo changes it, which would contradict the listing copy. Not used for any verdict.
- `docs/prds/10-hosted-portfolios.md` was checked by grep and the diff stat, not line by line against every named location.
