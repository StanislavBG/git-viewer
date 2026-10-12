# Validation: git-viewer self-serve SaaS

Base: 5d8eee7ebd934a6fa7a8293a823c1cd6241cc080, HEAD c8344ac. PRD files were all found in `prds-archived/`.
The worktree had no `node_modules`, so I ran `pnpm install --frozen-lockfile` first.

Gates re-run in the foreground:
- `pnpm typecheck`: exit 0.
- `pnpm test`: 41 tests, 41 pass, plus the `dist-lib` import check (1/1).
- `pnpm build`: exit 0.
- `pnpm exec playwright test tests/landing.spec.ts tests/golden.spec.ts`: 4/4 pass.
- `pnpm build:bilko`: exit 0.

**Plan-level size check: PASS.**
- Manifest line: `72.5 KB gz, 3 files`.
- My own `gzip -9` total over `dist/`: about 73–74 KB, so about 74 KB of the 200 KB budget.
- `dist/` holds `index.html`, one JS file (66.6 KB gz) and one CSS file (7.1 KB gz).
- The plain `pnpm build` manifest says 343.7 KB, but that includes `data.json`, which `build:bilko` drops.

## landing-helpers: VERIFIED
- `src/data/landing.ts:6-13`: `isLandingMode` returns false for a non-empty `u`, true for `landing=1`, false for the three canonical hosts, true otherwise.
- `src/data/landing.ts:15-22`: `normalizeLoginInput` strips the scheme, `www.` and `github.com/`, strips `@`, takes the first path segment, and checks it against `LOGIN_RE`. `https://gitlab.com/x` returns null.
- `src/data/landing.ts:5`: `exampleLogins` is `['StanislavBG','torvalds','gaearon']`.
- `src/data/landing.test.ts` exists and passes. I did not read each case against its AC line.
- `package.json` `test` script lists `landing.test.ts` after `claim.test.ts`.

## checkout-portal-helpers: VERIFIED
- `src/data/claim.ts`: `checkoutReturnUrls` keeps the path and params, drops the hash, and replaces `checkout`.
- `parseCheckoutFlag` returns `'success'`, `'cancel'` or null.
- `buildCheckoutRequest` adds `successUrl`/`cancelUrl` only when given. The default body is still `{email, priceType}`.
- `buildPortalRequest` posts to `/api/stripe/billing-portal`.
- `parsePortalResponse` maps 200 with a url to redirect, 404 to `no_customer`, and anything else to the error `Billing portal failed (HTTP n)`.
- New tests pass in `claim.test.ts`.

## saas-docs: VERIFIED
- `docs/prds/12-saas-self-serve.md` has every required section (Motivation, Landing, Repo picker, Checkout return + billing, Résumé CTA, Acceptance) and is 35 lines.
- `docs/prds/README.md`: row 12 added and row 10 is now `implemented`.
- `CLAUDE.md` Canonical-data section has the added sentence about landing mode and `?u=StanislavBG`.

## landing-component: VERIFIED
- `src/components/Landing.tsx` uses no `useGitData` or `useTenant`.
- The h1 reads `Your Git, your Résumé.` (line 67). The deck has the required no-install, no-token copy (68-71).
- The form has `aria-label="Build my portfolio"`, the right placeholder and the submit button (72-86).
- Submit goes through `normalizeLoginInput`. A valid login sets `location.search` to `?u=…` (58). An invalid one shows a `role=alert` with the exact message (87-91).
- Sections present: See an example, How it works (3 steps), Pricing (Free $0 / Pro $5/mo), FAQ (4 Q&As).
- `src/styles.css` adds `.landing` rules with a `max-width: 720px` single-column media query and an `overflow-x: hidden` root.
- I did not measure a 375px viewport in a browser. The evidence is CSS only.

## repo-list-helpers: VERIFIED
- `src/data/repos.ts`: `publicReposUrl` matches the required URL exactly.
- `PickerRepo` type is exported.
- `parsePublicRepos` drops archived and private entries, keeps forks, and sorts non-forks first then by `pushedAt` descending.
- It maps 403/429 to `rate_limited`. Other statuses and non-array bodies give `error`.
- Null description becomes `''` and missing stars become 0.
- `repos.test.ts` is in the `test` script and passes.

## checkout-return-billing: VERIFIED
- `src/components/HostedActions.tsx:147-148`: `upgrade` passes `successUrl`/`cancelUrl` from `checkoutReturnUrls`.
- Lines 93-101: the `success` and `cancel` messages match the AC text exactly.
- Lines 160-183: `manageBilling` strips `checkout` from the return URL, redirects on success, and shows `No subscription found for <email>.` on `no_customer`.
- Lines 211-219: Upgrade shows only on the free tier. Manage billing shows only when signed in and the tier is `paid`.

## landing-wire: VERIFIED
- `src/App.tsx:365`: `App()` returns `<Landing/>` before the provider mounts, so there is no `data.json` or API request. The e2e test asserts this.
- `Landing.tsx:46-48` sets `document.title` to `Your Git, your Résumé · git-viewer by Bilko`.
- `index.html`: the `<title>` is kept, the description is replaced, and `og:title`, `og:description`, `og:type` and `twitter:card` are added.
- `tests/landing.spec.ts` covers the h1, `?u=octocat` navigation and the alert. All 3 tests pass.
- `golden.spec.ts` passes, so `/` on localhost still shows the owner portfolio.

## repo-picker: VERIFIED
- `src/components/RepoPicker.tsx` has the required props signature.
- It fetches `publicReposUrl(login)` once and parses with `parsePublicRepos`. Forks sit under a `Forks` heading.
- The cap is `MAX_ALLOWLIST` (12): unchecked boxes are disabled once full (line 62) and the toggle ignores extra adds (46). The counter reads `n / 12 selected`. The rate-limit text is exact.
- `HostedActions.tsx`: `claim(allowlist?)` passes it to `buildClaimRequest`. `Choose projects` shows only for `paid`, and `initial` is `projects.map(p => p.name)`.
- `Project.name` is the GitHub repo name (`pipeline/aggregate/top-repos.ts:11`).
- `.repo-picker` CSS is at the end of `styles.css`, with `width: min(560px, 100vw - 24px)` and `overflow-x: hidden`.

## resume-cta: VERIFIED
- `HostedActions.tsx:198-204`: an always-rendered `<a className="resume-link">` labelled `Résumé PDF`, first in the bar. Its href keeps all params, sets `print=1` and drops `checkout`.
- `src/components/PrintShell.tsx`: when a tenant is present it renders `Portfolio: bilko.run/projects/git-viewer/?u=<login> · made with git-viewer by Bilko`. It reuses `.print-footer`, which has no print-hiding rule. Without a tenant the output is unchanged.
- `PrintShell.tsx`: the tenant print effect is guarded by a ref and fires `window.print()` after 300ms.

## Findings

### Critical
- None.

### Important
- None.

### Minor
- `src/components/PrintShell.tsx` (print effect): the `setTimeout` is not cleared on unmount. The impact is negligible.
- `src/components/HostedActions.tsx:93-101`: the checkout-flag effect only sets `msg` once per tenant login, and the other effect's `setMsg` on a Clerk load error can overwrite it. This is an unlikely race.
- `src/components/HostedActions.tsx:201`: the `resume-link` styling is inline. The PRD allowed this, but it will drift from the `.claim-bar button` look.
- `src/components/RepoPicker.tsx:94`: Save is disabled when nothing is selected, so a paid owner cannot save an empty allowlist. This is probably intended.
- `src/components/RepoPicker.tsx:22`: `initial` is sliced to 12, but `initial` holds the current projects, not the saved allowlist. A free-to-paid user starts with the 3 defaults preselected, which is acceptable.
- 375px no-horizontal-scroll for the landing page and picker was verified from CSS only, not in a browser.
- `/code-review` and `/security-review` were not run here. I self-reviewed the diff instead:
  - No secrets in the diff. The Clerk publishable key was already public.
  - No `dangerouslySetInnerHTML`.
  - `login` goes through `encodeURIComponent` or `LOGIN_RE` before it reaches a URL.
  - Checkout and portal URLs are built from `window.location` and rely on the host's origin check.
  - The unauthenticated api.github.com fetch is subject to rate limits, which the picker handles.
