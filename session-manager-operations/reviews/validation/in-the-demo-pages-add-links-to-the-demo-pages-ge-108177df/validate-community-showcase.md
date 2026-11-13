# Validation: community showcase plan

Base: eeee1dfed35bc1477a6fcf0d09f368989a6b0640 (commits 75d8cc1, 8d2b89d, ba51e90, 22c53f7, e1e05f7).
Gates re-run in the foreground: `pnpm typecheck` exit 0; `pnpm test` 106/106 pass; `pnpm exec playwright test tests/landing.spec.ts` 4/4 pass; doc gate (file exists, greps) OK.

## community-portfolios-data — VERIFIED
- `CommunityPortfolio` and `communityPortfolios` (single bidyut10 entry): src/data/landing.ts:7-19.
- `avatarUrl`, `portfolioHref`: landing.ts:21-27. Output asserted in landing.test.ts ('avatarUrl…', 'portfolioHref…').
- `formatBuiltOn` (UTC round-trip check, passthrough for '2026-02-30' / 'soon'): landing.ts:36-45; tested.
- `exampleLogins` unchanged (landing.ts:5); no `window`/`document` in the added code.
- Invariant tests (LOGIN_RE, unique, not example, real date, newest first, bidyut10 present): landing.test.ts:80-103.

## landing-community-showcase — VERIFIED
- h3 'Built by our users', `ul.landing-community`, cards with `community-open-N`, 48px avatar span, img attributes, name and meta: Landing.tsx:109-137.
- `data-track-redact` is on the group div (Landing.tsx:111), not the section. 'More examples' h3 renders only with community entries. Example links and the form submit use `portfolioHref` (Landing.tsx:71, 139).
- CSS after `.landing-examples a`, plus the 720px one-column rule: styles.css:1890-1897, 1919. Only existing variables are used.
- tests/landing.spec.ts: `beforeEach` aborts `**/api/git-viewer/**`; new e2e test passed. Original three test bodies are unchanged in the diff.
- Screenshots (viewed): landing-community-desktop.png and landing-community-mobile.png show the Bidyut Kundu card with name, @bidyut10 · Built Nov 7, 2026 and avatar placeholder (the avatar request is stubbed to a 1px gif). The text is readable and nothing overflows. The mobile card is a single full-width column. The e2e test asserts scrollWidth <= clientWidth and passed.

## community-list-persona-guard — VERIFIED
- Test 'communityPortfolios never lists a persona alias or its masked login': landing.test.ts:105-109, using `resolvePersona`.
- Bite check not re-run, since I may not edit product files. By reading, `resolvePersona` matches `githubLogin` case-insensitively (persona.ts:7-12), so adding 'StanislavBG' would fail the test.
- Only landing.test.ts changed for this PRD; gates green.

## usage-refresh-not-build — VERIFIED
- `CREATED_AT_STAMPED_MS = Date.parse('2026-11-08T08:07:00Z')` and the new `builtAtMs`: scripts/usage/aggregate.ts:181-192. It returns createdAt if set; with null createdAt it returns updatedAt only if before the cutoff, else null.
- The new test in aggregate.test.ts:410-426 covers refreshed, at-cutoff, legacy and fresh rows. Existing tests in the file are unchanged, and the full suite passes.

## community-showcase-doc — VERIFIED
- docs/prds/15-community-showcase.md has Motivation, Data, UI, Rules, How to add a user and Acceptance. All required Rules points are present (curated, no GET /api/git-viewer/u, CSP connect-src, avatar host, redact, qualification, removal, CREATED_AT_STAMPED_MS).
- Every quoted identifier matches the code: CommunityPortfolio, communityPortfolios, avatarUrl, portfolioHref, formatBuiltOn, 'Built by our users', community-open-N, data-track-redact, and the seven unit test names plus 'user-built portfolios are celebrated with links'.
- README.md: row 15 is exact and row 13 reads `implemented`.

## Findings
### Critical
- none
### Important
- none
### Minor
- docs/prds/15-community-showcase.md "How to add a user" step 3 says `pnpm build:bilko`. That matches CLAUDE.md, but the doc does not mention that the Playwright run needs a built preview. Not blocking.
- tests/landing.spec.ts:35: the community card's avatar `img` is stubbed, so the screenshots never show a real avatar. The placeholder background is the only thing visible, which is by design.
- Review: self-review of the diff, with no unsafe input handling, secrets or path traversal found. `encodeURIComponent` is used for the login in both helpers. `referrerPolicy="no-referrer"` is set on the avatar. No runtime fetch was added. `/code-review` and `/security-review` were not run as separate commands; I reviewed the diff directly.
