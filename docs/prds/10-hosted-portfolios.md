# PRD-10 — Hosted multi-user portfolios (bilko.run)

## Motivation

Today git-viewer renders one portfolio: the owner's (`StanislavBG`). Anyone with a
GitHub account who thinks "I want to see my projects like this" has to fork the repo,
create a token, run `pnpm sync` and set up Pages. This PRD turns git-viewer into a
hosted service: visiting `bilko.run/projects/git-viewer/?u=<github-login>` yields that
user's own portfolio, with no setup.

The dashboard (this repo) and the Bilko host server (`~/Projects/Bilko`, separate repo)
build against this single written spec. This PRD pins the tiers and the exact HTTP
contract between them.

## Tiers

| | Free | Paid |
|---|---|---|
| Price | $0 | $5/month subscription |
| Projects shown | 1 | up to 12, user-chosen |
| Data | public data only | public data only |
| Refresh | regenerated at most once per 24h | daily refresh |
| Branding | Bilko branding | Bilko branding |
| Writing tab | none | sourced from the user's `<login>/<login>` repo `writing/` folder |
| Locked projects | shown as upgrade cards | n/a (up to the 12-project cap) |

- **Free**: 1 project, public data only, regenerated at most once per 24h, Bilko
  branding. Projects beyond the 1 are not rendered; they are represented as upgrade
  cards (`lockedCount` in the API response says how many).
- **Paid**: $5/month Stripe subscription. Stripe product key `git_viewer`; price ID in
  env `STRIPE_PRICE_GITVIEWER`. Up to 12 user-chosen projects, daily refresh, Writing
  tab sourced from the user's `<login>/<login>` profile repo `writing/` folder.
- **Included**: existing bilko.run `pro`, `business` and `team` subscribers get Paid
  included at no extra charge.
- **Ownership**: a user may manage a portfolio (choose projects, subscribe) only if the
  GitHub account linked to their Clerk sign-in matches `<login>`. Viewing any portfolio
  is public and needs no sign-in.

## URL scheme

- No `?u=`: today's behaviour is unchanged. The owner's canonical portfolio loads from
  the bundled / canonical `data.json` (see CLAUDE.md "Canonical-data convention").
- `?u=<login>`: the dashboard loads from same-origin `/api/git-viewer/u/<login>`.
- Local dev: Vite proxies `/api` to `https://bilko.run`, so `?u=<login>` works on
  `localhost:5173`.
- `<login>` must match the login regex below; an invalid value is treated as `not_found`
  client-side without a request.

## API contract

`GET /api/git-viewer/u/:login`

Login validation regex (server and client):

```
^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$
```

Responses (exact bodies):

**200** — portfolio ready

```json
{
  "status": "ready",
  "login": "octocat",
  "tier": "free",
  "lockedCount": 12,
  "updatedAt": "2026-10-10T16:00:00.000Z",
  "data": { "...": "GitData" }
}
```

Types: `status: 'ready'`, `login: string`, `tier: 'free' | 'paid'`,
`lockedCount: number`, `updatedAt: string` (ISO-8601), `data: GitData` (from
`src/types.ts`).

**202** — generation in progress; client polls again after `retryAfterSec`

```json
{ "status": "generating", "retryAfterSec": 5 }
```

**404** — login invalid or no such GitHub user

```json
{ "status": "not_found" }
```

**429** — per-IP or per-user limit hit

```json
{ "status": "rate_limited", "retryAfterSec": 60 }
```

`retryAfterSec` is a number in seconds in both the 202 and 429 bodies.

## Data-shape change

`GitData` itself is unchanged; the 200 body wraps it. `data.projects` contains only the
projects the tier allows (1 free / up to 12 paid); `lockedCount` is the number of the
user's eligible projects withheld. Dashboard-side, a new `HostedMeta`
(`{ login, tier, lockedCount, updatedAt }`) is exposed from the loader next to
`useGitData()`. `data.developer` is populated from the GitHub profile (`displayName`,
`displayRole`).

## Pipeline work

`pipeline/` gains a library entry in `pipeline/portfolio.ts`:

```ts
buildPortfolio(opts: {
  user: string;
  token: string;
  displayName?: string;
  displayRole?: string;
  maxProjects: number;
  allowlist?: string[];            // repo names the user chose (paid)
  writing: 'none' | 'profile-repo' | WritingOutput;
}): Promise<GitData>
```

- `writing: 'none'` skips the Writing tab; `'profile-repo'` reads the `writing/` folder of
  `<user>/<user>`; a `WritingOutput` value is used as-is.
- The repo cap (`maxProjects`, after applying `allowlist`) is applied BEFORE per-repo
  fetches (commits, READMEs, treemap), so GitHub API cost per user is bounded by the cap.
- `pipeline/sync.ts` (owner CLI) is refactored to call `buildPortfolio` so there is one
  code path.
- Public data only; skinny-mode rules continue to apply.

## UI work

- `src/data/loader.tsx`: read `?u=`; when present fetch `/api/git-viewer/u/<login>`,
  poll on 202 honouring `retryAfterSec`, and map 404 / 429 to dedicated states. Absent
  `?u=` keeps the existing canonical-host logic.
- Loading ("generating your portfolio") and error states (not found, rate limited with a
  countdown).
- Upgrade cards in the Projects grid, rendered `lockedCount` times, linking to the
  subscribe flow; hidden on paid tier.
- Bilko branding footer on hosted portfolios.
- A landing state when no `?u=` is given on a non-canonical host is out of scope here.
- `vite.config.ts`: dev proxy `/api` → `https://bilko.run`.

## Bilko host work

Informational — implemented in `~/Projects/Bilko`, not in this repo.

- Route `server/routes/tools/git-viewer.ts` using the existing gateway pattern.
- Cache results in the libsql control DB like `server/routes/project-data.ts`
  (`project_snapshots`).
- On cache miss, generate with the server's `GITHUB_TOKEN`, at most 2 concurrent
  generations; further requests get 202 `generating` while a job is queued or running.
- Per-IP limits via `checkRateLimit` in `server/routes/tools/_shared.ts`; exceeded →
  429 body above.
- Paid entitlement via existing `server/routes/stripe.ts` checkout + webhook (product key
  `git_viewer`, `STRIPE_PRICE_GITVIEWER`) and `getActiveSubscriptionLive`; pro / business
  / team plans count as Paid. Ownership check via the Clerk-linked GitHub account.
- Free: regenerate at most once per 24h; Paid: daily refresh job for paid profiles.
- Registry entry in `src/data/standalone-projects.json`.

## Acceptance criteria

1. This document exists with all sections above and matches the tier, URL and API facts.
2. `GET /api/git-viewer/u/:login` returns exactly the four JSON bodies above; logins
   failing the regex return 404 `not_found`.
3. `?u=<login>` loads from `/api/git-viewer/u/<login>`; no `?u=` behaves as today.
4. Free tier renders 1 project plus `lockedCount` upgrade cards; paid renders up to 12.
5. `buildPortfolio` caps repos before any per-repo fetch; API calls per user are bounded
   by `maxProjects`.
6. Pro / business / team subscribers receive Paid without a separate purchase.
