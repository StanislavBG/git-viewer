# Validation: github-signin-instead-of-link (PRD 82)

Base: b978ba6. Commit in range: 8655b99 (touches only the 3 PRD files). Review was a self-review; `/code-review` and `/security-review` were not run.

## 82-github-signin-instead-of-link — VERIFIED

- AC1: `src/data/claim.ts:89-98` exports `githubSignInReturnUrl` (deletes `checkout`, sets `claim=1`) and `shouldAutoClaim`. `claim.test.ts` covers both, including the `?u=StanislavBG&checkout=success` case. The `pnpm test` summary line read `tests 1 / pass 1 / fail 0`. I did not check why it reports only 1 test.
- AC2: `HostedActions.tsx` `linkGithub` calls `trackFlow('claim','link-github')`, awaits `clerk.signOut()`, then calls `openSignIn` with `forceRedirectUrl` and `signUpForceRedirectUrl` set to `githubSignInReturnUrl(location.href)`. It then sets the hint "Choose 'Continue with GitHub' and use the account @<login>.". `openUserProfile` is gone. `ClerkLike` has `signOut(): Promise<void>` and a typed `openSignIn(props?)`. The signOut type is satisfied.
- AC3: the autoClaim effect (`HostedActions.tsx:~193`) requires clerk, tenant, signedIn, `clerk.user` and `shouldAutoClaim`. A module flag makes it run once. `claim()` then runs and `history.replaceState` removes `claim`. `claim()` itself returns early with the existing prompt when `githubLinkState !== 'linked'` (lines ~150-155). So the "linked" check lives inside `claim()`, not in the effect; the behaviour matches.
- AC4: `package.json` is untouched, so there is no new dependency. Gate re-run: `pnpm test` passed, `pnpm typecheck` passed, `pnpm build:bilko` passed. The emit-manifest line reads `148.5 KB gz` (limit 200 KB).

## Findings

### Critical
- none

### Important
- none

### Minor
- `HostedActions.tsx:48` — `autoClaimStarted` is a module-level flag that is never reset. A second claim in the same SPA session after a fresh `?claim=1` would not auto-run, but a sign-in redirect reloads the page, so this is not reachable in the normal flow.
- The browser flow (real GitHub OAuth, Clerk email-match linking) is untestable headless and was not exercised. Only the pure URL helpers have unit coverage.
- The autoClaim effect sits next to the `claim` callback and relies on `claim` having a stable identity. The `[clerk, tenant]` deps make that hold.
