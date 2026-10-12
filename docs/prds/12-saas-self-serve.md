# 12 — Self-serve SaaS: landing, repo picker, billing return, résumé CTA

Anyone can use git-viewer from the web alone: land on bilko.run, enter a GitHub login, get a
hosted portfolio and a résumé PDF, and upgrade if they want more.

## Motivation
- PRD 10/11 gave hosted portfolios (`?u=<login>`) and a claim + upgrade flow, but the mirror root still rendered the owner's portfolio. A visitor had no pitch and no way in.
- Plans:
  - **Free $0** — 3 projects, public data only, regenerated at most once per 24h, résumé PDF included.
  - **Paid $5/mo** (Stripe `priceType: git_viewer`) — up to 12 chosen projects, daily refresh, Writing tab from the `<login>/<login>` repo `writing/` folder.
  - bilko.run pro/business/team subscribers get Paid included.

## Landing
- Pitch headline: **"Your Git, your Résumé."**
- Shown when `isLandingMode(hostname, search)` from `src/data/landing.ts` is true: no `?u=` on a non-canonical host, or `?landing=1` (forces it locally).
- `src/components/Landing.tsx` takes a GitHub login (`normalizeLoginInput`), offers `exampleLogins`, and navigates to `?u=<login>`.
- The owner's portfolio on the mirror moves to `?u=StanislavBG`. The canonical host and `data.json` path are untouched.

## Repo picker
- Paid owners choose up to 12 public repos, listed from `api.github.com/users/<login>/repos`.
- Saved through `POST /api/git-viewer/claim` as `{login, allowlist}` (see PRD 11). Free owners get the default 3.

## Checkout return + billing
- `create-checkout-session` sets `successUrl` / `cancelUrl` back to `?u=<login>&checkout=success|cancel`; the page shows the matching notice (success keeps the "within ~5 minutes" entitlement note).
- "Manage billing" calls `POST /api/stripe/billing-portal` and redirects to the returned `url`.

## Résumé CTA
- Hosted portfolios show a **Résumé PDF** button that opens `?print=1` (the print mode from PRD 08).

## Acceptance
- `isLandingMode` is true for a non-canonical host without `?u=`, and for `?landing=1`; false on the canonical host and for any `?u=`.
- Landing shows the headline and routes a valid login to `?u=<login>`.
- Picker caps the selection at 12 and sends it as `allowlist`.
- Checkout return and billing-portal links behave as above; the Résumé PDF button opens `?print=1`.
- `pnpm test`, `pnpm typecheck` and `pnpm build` pass; `build:bilko` stays within the 200 KB gz budget.
