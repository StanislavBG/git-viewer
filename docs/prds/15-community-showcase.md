# 15 — Community showcase on the landing page

The landing page's **See an example** section lists portfolios real users built, ahead of the famous examples.

## Motivation
- On 2026-11-07 the first person outside the project (GitHub `bidyut10`) built a portfolio.
- The landing now celebrates real users ahead of the famous examples, as thanks and as real social proof.

## Data
- `src/data/landing.ts` exports `interface CommunityPortfolio { login: string; name?: string; builtOn: string }`. `builtOn` is the Pacific date (`YYYY-MM-DD`) the portfolio was first built.
- `communityPortfolios: readonly CommunityPortfolio[]` is a hand-curated list, newest first. Today it holds one entry: `{ login: 'bidyut10', name: 'Bidyut Kundu', builtOn: '2026-11-07' }`.
- Helpers: `avatarUrl(login, size = 96)` returns `https://avatars.githubusercontent.com/<login>?s=96`; `portfolioHref(login)` returns `?u=<login>`; `formatBuiltOn(isoDate)` renders `Nov 7, 2026` and passes through anything that is not a real date.

## UI
- `src/components/Landing.tsx`, inside `<section aria-labelledby="landing-example">`. Rendered only when `communityPortfolios` is non-empty.
- An h3 'Built by our users' heads a `ul.landing-community`. Each card links to `portfolioHref(login)` with `data-track="community-open-N"` (N is 1-based) and shows the avatar, the name (or login) and `@<login> · Built <formatBuiltOn(builtOn)>`.
- The wrapper `div.landing-community-group` carries `data-track-redact`. The famous examples follow under an h3 'More examples' (`example-open-N`).

## Rules
- Curated by hand, because any visitor can build any login's page via `?u=`. A built page is no proof that its owner built it.
- Never call `GET /api/git-viewer/u/<login>` to check a login: that endpoint builds a portfolio.
- No runtime fetch. bilko.run's CSP `connect-src` allows only same-origin plus Clerk and Stripe, so the list is bundled in the code.
- Avatars load from `https://avatars.githubusercontent.com/<login>?s=96`, which bilko.run's `img-src` allows.
- Names stay out of click telemetry via `data-track-redact` on the group.
- Every hosted portfolio is already public by design (`docs/prds/10-hosted-portfolios.md`: viewing any portfolio needs no sign-in), so the landing only links to pages that are public anyway.
- Who qualifies: a person confirmed to have built their own page; the Usage report's real visitors are the evidence. Never an example, agent-test or organization login. Never the persona alias or the owner's real login; the persona guard test enforces that.
- Anyone listed who asks to be removed is taken off at once. The removal reaches bilko.run only at the next mirror publish.
- Clicks on a featured page cause daily refreshes. `pnpm usage` does not count those as new builds: a row with no `created_at` and an `updated_at` after `CREATED_AT_STAMPED_MS` (`scripts/usage/aggregate.ts`) is a refresh.

## How to add a user
1. Add `{ login, name?, builtOn }` at the top of `communityPortfolios` in `src/data/landing.ts` (newest first).
2. Run `pnpm test` and `pnpm exec playwright test tests/landing.spec.ts`.
3. Republish the bilko.run mirror: `pnpm build:bilko`, then the bilko-host publish step described in CLAUDE.md. The landing ships inside the bundle; GitHub Pages shows it only with `?landing=1`.

## Acceptance
- `src/data/landing.test.ts`: 'avatarUrl points at avatars.githubusercontent.com with a size', 'portfolioHref links to the ?u= page', 'formatBuiltOn formats real dates and passes through anything else', 'communityPortfolios entries are valid, unique, and not example logins', 'communityPortfolios is ordered newest builtOn first', 'communityPortfolios includes bidyut10', 'communityPortfolios never lists a persona alias or its masked login' (the persona guard).
- `tests/landing.spec.ts`: 'user-built portfolios are celebrated with links' checks the headings, each `community-open-N` href, `@login` text, the `data-track-redact` wrapper, the avatar `src`, no horizontal scroll at 390 px, and no `data.json` or `/api/git-viewer` request.
