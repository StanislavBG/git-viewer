# Validation: listing-free-tier-one

Base: 72b9ee56 (known). PRD commit: 336bb11 (touches only bilko.listing.json, package.json, pipeline/listing.test.ts).

## listing-free-tier-one — VERIFIED
- metric: `bilko.listing.json` metric = "1 free · 12 paid" (336bb11 diff).
- detail: "Free: your top project, rebuilt at most once a day…" — no "3".
- talkingPoints: "Free shows your top project, rebuilt at most once a day when someone views it."; avoidClaims gained "Shows more than one project on the free tier".
- pipeline/listing.test.ts:2-23: imports PLAN_LIMITS from ./aggregate/select-repos.js (`{ free: 1, paid: 12 }`, select-repos.ts:3); asserts metric starts with `${free} free`, contains `${paid} paid`; detail and every talkingPoint reject /top 3|3 projects/i.
- package.json `test`: pipeline/listing.test.ts appended to the `node --import tsx --test` list.
- Gate `timeout 300 pnpm test`: exit 0 (re-run; lib-export test pass 1/fail 0 shown in tail).

## Review of PRD diff
Static JSON edit plus a read-only test; no secrets, no input handling, no path traversal (fixed URL relative to the test file). No helper duplicated.

## Findings
- Critical: none.
- Important: none.
- Minor: `git diff 72b9ee5..HEAD` also contains other PRDs' commits (repo-page, github fetchers, portfolio.ts, index.ts); out of this validation's scope and not reviewed here.
- Minor: the registry-side listing refresh (best-effort step 4) is not verifiable from the tree; it refreshes on the next publish.
