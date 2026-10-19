# Validation: listing-public-repos-only

Base: 1e7ee1b6e72b04bd3b23acb8dd11f301d5a57f69. PRD found at `prds-archived/77-listing-public-repos-only.md`.
Commit for PRD paths (`git log <base>..HEAD -- bilko.listing.json pipeline/listing.test.ts`): `f8cd241`.

## listing-public-repos-only — VERIFIED

- AC1 (listing verbatim): a node script compared every scalar field (detail, metric, metricLabel, lang, audience, offering, pricing, callToAction, shareImage) to the PRD values: all `true`. talkingPoints (5) and avoidClaims (5) read in `bilko.listing.json:10-25` and match the PRD text. Shape is `{ "listing": {...} }`, 2-space indent.
- AC2 (tests): `pipeline/listing.test.ts:33-44` keeps the existing PLAN_LIMITS and stale-count tests. It adds `detail` contains `public repos only` and `Private repos are never read or shown`, a talkingPoints entry starting `Public data only`, avoidClaims containing `Shows, reads or includes private repositories`, at most 5 entries in each array, and metricLabel at most 24 characters. Measured: metricLabel = 24, 5 and 5 entries.
- AC3 / Gate: `timeout 300 pnpm test` ran in the foreground and exited 0 (node:test, then the compiled-lib import check: 1 pass, 0 fail).

## Combined diff
Scope check: the PRD touched only `bilko.listing.json` and `pipeline/listing.test.ts`. `git diff <base>..HEAD --stat` also shows `public/data.json`, `HostedActions.tsx`, `claim.ts` and `claim.test.ts`. These come from other plans' commits in the range, not from this PRD. Self-review of the listing diff found no secrets, no unsafe input handling, no path traversal, and no duplicated helper. The test reads the JSON via `import.meta.url`, a fixed path.

## Findings
- Critical: none.
- Important: none.
- Minor: `metricLabel` sits exactly at the 24-character registry limit, so any edit that lengthens it fails the test. Only the registry's limits are known here; the live registry card was not checked, since it is outside this repo.
