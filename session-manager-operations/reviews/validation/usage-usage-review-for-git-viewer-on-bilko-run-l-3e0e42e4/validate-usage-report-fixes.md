# Validation: usage report fixes

Base: 07654f0 (known). Commits: eeb20ed (traffic), 59ea8eb (opened example). Both PRD files found under prds-archived/.

## usage-traffic-human-totals — VERIFIED
- `fetchTraffic` exported, path `...&mine=exclude`: scripts/usage/report.ts:195-197.
- `humanVisitors` from `body.totals?.visitors`, `humanSingleHit` from `body.quality?.singleHitVisitors` via `num()`; byDay mapping unchanged: report.ts:198-202.
- Returns exactly 3 keys; no copy of `visitors`/`recent`: report.ts:197-201; test asserts no IP and no `@`: report.test.ts (fetchTraffic tests).
- Three tests (a) deepStrictEqual, (b) path contains slug/days/mine, (c) zeros: report.test.ts:37-63.
- Gate: node --test aggregate/render/report → 40 pass, 0 fail; `pnpm typecheck` exit 0.

## usage-opened-example — VERIFIED
- `TimelineItem.label/trackName` aggregate.ts:60-61; `toTimelineItem` sets `str(t.label)`, `str(t.track_name)`: report.ts:142-143.
- `OpenedExample` + `openedExample()` implement rules 1-6 (regex, start ≥ click.ts-1000, greatest ts, LOGIN_RE only for example-open-): aggregate.ts:262-287.
- `RealVisitor.openedExample` required, set in `buildRealVisitors`; login/url unchanged: aggregate.ts:299, 332.
- Render lines "opened example: <url>" / "opened <slot> (login not recorded)": render.ts:85-86.
- Tests (a)-(e), boundary, latest-pick, updated deepEqual expectations: aggregate.test.ts; render assertions of both lines: render.test.ts:83-94.
- Gate: same commands, all green.

## Combined diff
6 files, +142/-7, all within the PRDs' Files lists. /code-review and /security-review were not run as skills here; self-reviewed: no secrets, no per-visitor PII copied, no path/URL built from untrusted input beyond a LOGIN_RE-validated login.

## Findings
### Critical
none
### Important
none
### Minor
- aggregate.ts:268-270: `openedExample` is not scoped to the same session click→start order beyond the 1000 ms window; a start from an earlier unrelated load can validate a later click only if its ts ≥ click-1000, so false positives are unlikely but possible with multiple loads.
