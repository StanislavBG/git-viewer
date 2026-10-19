# Validation: claim-before-checkout + link-github-prompt

Base: 1e7ee1b (given). Commits: a53b981 (claim-before-checkout), 99dc998 (link-github-prompt), both touching HostedActions.tsx / claim.ts / claim.test.ts.
Gate (both PRDs, same): `pnpm test` exit 0 (60 + 1 tests, 0 fail), `pnpm typecheck` exit 0, `pnpm build:bilko` exit 0, emit-manifest: 148.0 KB gz (<= 200 KB).

## claim-before-checkout — VERIFIED
- `upgradeStep` exported, signature + branches: src/data/claim.ts:67-76 (not signed in → sign-in; claimed → checkout; not_owner → not-owner; sign_in_required → sign-in; else error).
- `upgrade` calls `claim()` with no allowlist and returns before create-checkout-session on false: src/components/HostedActions.tsx:191-195. claim() sets its own message/prompt, left visible.
- Telemetry `trackFlow('checkout','fail',{...props, reason:'claim-failed'})`: HostedActions.tsx:193.
- Tests for every branch (incl. null claim, signed-out): src/data/claim.test.ts:18-27.
- Gate green (see above).

## link-github-prompt — VERIFIED
- ClerkLike has `openUserProfile` and `user.externalAccounts`: HostedActions.tsx:22,26-29.
- `githubLinkState`: src/data/claim.ts:57-65; provider oauth_github/github, case-insensitive; tests cover linked, other-account, none, [], undefined, null: claim.test.ts:144-155.
- Prompt shown pre-claim when not linked (HostedActions.tsx:136-141) and on not_owner (:165-167); message names login, 'other-account' names linked username, "Connect GitHub" button → linkGithub → openUserProfile: HostedActions.tsx:127-130, 308-315.
- Telemetry `claim fail github-not-linked` at :139 and :166; `claim link-github` at :128.
- Gate green.

## Findings
### Critical
- none
### Important
- none
### Minor
- HostedActions.tsx:164-166 — on not_owner, two `claim fail` events fire (`not-owner` and `github-not-linked`); double-counts one failure in funnels.
- HostedActions.tsx:136 — when `clerk.user.externalAccounts` is undefined the pre-check is skipped (treated 'linked'); acceptable fallback, server still enforces ownership.
- `upgradeStep` is exported and tested but not called by `upgrade()` (inline `claim()` boolean used instead); the helper is effectively dead code in the UI.
- Combined base..HEAD diff also includes unrelated doc/SaaS-removal commits and public/data.json sync; not part of these PRDs. No secrets, injection or path-traversal issues seen in the reviewed src changes (Clerk script loaded at runtime, token only sent as Bearer to same-origin claim endpoint). /code-review and /security-review were done as self-review of the diff.
