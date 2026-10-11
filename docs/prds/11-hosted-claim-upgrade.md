# 11 — Hosted claim + upgrade flow

On hosted portfolios (`?u=<login>` on bilko.run) the owner signs in with Clerk, claims the
portfolio (optionally choosing up to 12 repos on paid), and upgrades to the $5/mo `git_viewer` tier.

## Contract (Bilko host)
- `POST /api/git-viewer/claim` — `Authorization: Bearer <Clerk token>`, JSON `{login, allowlist?}` (allowlist capped at 12).
  200 `{ok, login, tier, allowlist}` → claimed · 401 → sign in · 403 → Clerk-linked GitHub login does not match · else error.
- `POST /api/stripe/create-checkout-session` — JSON `{email: <Clerk primary email>, priceType: 'git_viewer'}`; response `url` is the redirect.
- Entitlement is looked up by primary email; the host caches the subscription lookup ~5 min, so the UI shows a "within ~5 minutes" note instead of polling.

## Implementation
- `src/data/claim.ts` — pure request builders + response mappers (tested in `claim.test.ts`).
- `src/components/HostedActions.tsx` — lazy `import('@clerk/clerk-js')`, only when a tenant (`?u=`) is loaded; key from `VITE_CLERK_PUBLISHABLE_KEY`.
- Canonical page and `data.json` path are untouched.

## Acceptance
Helpers and tests pass under `pnpm test`; `pnpm typecheck` and `pnpm build` pass.
