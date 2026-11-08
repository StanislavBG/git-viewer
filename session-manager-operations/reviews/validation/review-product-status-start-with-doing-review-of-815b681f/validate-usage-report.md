# Validation: usage report plan

Base: 1373605d (4 commits: 695c2a7, d3cd257, eff6b61, b7261e3). Self-review used (no separate review run); gates re-run in foreground.

## usage-aggregate — VERIFIED
- Exports (23 export lines) in scripts/usage/aggregate.ts; tests scripts/usage/aggregate.test.ts exist and are in package.json test list; tsconfig.json:23 include has `scripts/usage` (build-sample.ts not included).
- Gate: `pnpm test` exit 0 (98 pass / 0 fail, plus lib import check 1/1); `pnpm typecheck` exit 0.

## usage-render — VERIFIED
- scripts/usage/render.ts renderMarkdown; closing impressions note at render.ts:200; render.test.ts in test list. Live stdout shows title, headline bullets, by-day table, Real visitors, Portfolios, Paid sections. Gate green (same run).

## usage-report-cli — VERIFIED
- package.json:50 `"usage": "tsx scripts/usage/report.ts"`; report.test.ts in test list; `grep -c 'api/git-viewer/u/' report.ts` = 0; DatabaseSync readOnly at report.ts:259; execFile with arrays (report.ts:1,23); stripEmails at :170, :176, :326; no-key message names both options (:290).
- Live `pnpm usage --days 30`: exit 0. stdout contains `2026-11-07 10:21 AM PST · IN · mobile · source burrow`, `https://bilko.run/projects/git-viewer/?u=bidyut10`, burrow reply to @BidyutKundu12 (10:06 AM PST), and `Paid subscriptions: 0 active / 0 total`.
- `.cache/usage/2026-11-08.json` written; `git ls-files .cache` empty, `git check-ignore` confirms ignored; `git status --short` clean.

## usage-report-docs — VERIFIED
- docs/prds/14-usage-report.md has Motivation, Sources, Output, Rules, Run, Acceptance; env vars and paths match report.ts; Rules cover read-only, no /api/git-viewer/u/, emails, gitignored .cache/usage/, unavailable sources.
- README.md:23 row `| 14  | Usage report script (pnpm usage) | — | implemented |`; CLAUDE.md:25 pnpm usage line.
- Name grep for owner name / GitHub login in the new doc: no hits.

## Findings
- Critical: none. Important: none.
- Minor: stdout of `pnpm usage` begins with pnpm's own banner lines (`> @bilkobibitkov/git-viewer@… usage`); use `pnpm -s usage` (or `--silent`) for pure Markdown. Not a script defect.
- Minor: the "telemetry-only real: 1" live count equals the real session total, consistent with the single real visitor having no page view; expected per PRD.
