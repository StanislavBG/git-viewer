# git-viewer

A personal GitHub portfolio dashboard. Editorial-dark, heatmap-centric, with a
local data pipeline that scans your repos and rebuilds the page from a single
JSON file.

Live: <https://stanislavbg.github.io/git-viewer/> · <https://bilko.run/projects/git-viewer/>

## Architecture

Two halves that ship together:

- **`src/`** — the dashboard. React 18 + TypeScript + Vite. Reads
  `public/data.json` once at boot and renders a portfolio with a 53-week
  heatmap (three variants), 30-day breakdowns (focus, languages, hours,
  themes), recent commits, and per-project drill-in pages.
- **`pipeline/`** — the workhorse. Node CLI (`pnpm sync`) that hits the GitHub
  REST API via Octokit, walks your repos, aggregates everything the dashboard
  needs, and writes `public/data.json`. The dashboard's "pipeline strip"
  reflects the last sync's stats.

One `dist/` ships unchanged to GitHub Pages **and** to bilko.run as a
sibling-repo static-path app — Vite is configured with `base: './'` so the
build is portable.

## Run it

```bash
pnpm install
cp .env.example .env      # set GITHUB_USER and (optionally) GITHUB_TOKEN
pnpm sync                 # writes public/data.json from the GitHub API
pnpm dev                  # http://localhost:5173
```

Without an env, the dashboard renders a fixture (Bilko Bibitkov's invented
portfolio) so you can see the design before wiring your data in.

## Make it your own (forking)

```bash
gh repo fork StanislavBG/git-viewer --clone --remote
cd git-viewer && pnpm install
cp .env.example .env
# Edit .env: GITHUB_USER=<your-handle>
#           GITHUB_TOKEN=<optional PAT — without one you have 60 req/h>

pnpm sync                 # rebuild data.json from your real repos
pnpm dev                  # preview locally
git add public/data.json && git commit -m 'sync portfolio'
git push                  # CI builds + deploys to GitHub Pages
```

Then enable Pages in your fork's settings (`Settings → Pages → Source: GitHub
Actions`). The included workflow builds on push and runs nightly to keep the
heatmap fresh.

### Customizing

| Want to change | Edit |
|---|---|
| Color, type, spacing | `src/styles.css` |
| Bio / hero copy | `src/components/Hero.tsx` |
| Headline stats | `src/components/Hero.tsx` |
| Recent-commits length | `RECENT_FEED_SIZE` in `pipeline/sync.ts` |
| Heatmap window | `SCAN_DAYS` in `pipeline/sync.ts` |
| Project status thresholds | `classifyStatus()` in `pipeline/sync.ts` |
| Language colors | `KNOWN_COLORS` in `pipeline/aggregate/languages.ts` |
| Avatar | drop `public/portrait.jpg` and remove the `::after` placeholder in `.hero .portrait` |

The Tweaks panel (gear icon, bottom-right) is for live UI tuning — heatmap
variant, accent hue, density, pipeline-strip visibility. Settings persist per
browser via `localStorage`.

## GitHub PAT

A read-only PAT raises the API rate limit from 60 → 5000 req/h, which matters
once your fork has more than ~30 repos. Create one at
<https://github.com/settings/tokens?type=beta> with **only** the
`public_repo` scope (or no scopes if all your work is public — public-data
endpoints don't require any). Set it as `GITHUB_TOKEN` in `.env` for local
runs, or as a repo secret named `PORTFOLIO_TOKEN` for CI.

## Deploying to two places

### GitHub Pages

The included `.github/workflows/pages.yml` does it on every push to `main`,
plus a daily cron at 09:00 UTC. First-time setup: `Settings → Pages → Source:
GitHub Actions`. The site lives at `https://<your-handle>.github.io/<repo>/`.

### bilko.run (sibling-repo static-path)

If you're working inside the Bilko ecosystem, this repo's
`bilko.run/projects/git-viewer/` deployment uses the
[`bilko-host` MCP](https://github.com/StanislavBG/bilko-run) from a Claude
session in this repo:

```
bilko-host__get_host_contract                 # one-time sanity read
bilko-host__list_projects                     # confirm slug is free
pnpm build                                    # → dist/
bilko-host__register_static_project { slug: 'git-viewer', name: 'gitoverview', ... }
bilko-host__publish_static_project { slug: 'git-viewer', distPath: '<absolute path>/dist' }
```

The MCP commits the bytes into `Bilko/public/projects/git-viewer/` and pushes
both host remotes; Render auto-deploys within ~minute.

## Development

```bash
pnpm dev          # vite dev server with HMR
pnpm typecheck    # tsc --noEmit
pnpm build        # production build → dist/
pnpm preview      # preview built dist/
pnpm sync         # regenerate public/data.json from the GitHub API
```

## What's not here (yet)

- A live "/dashboard/update" endpoint — `pnpm sync` is the workhorse; the
  workflow's daily cron stands in for a hosted refresh.
- GraphQL contributions (`contributionsCollection`) — REST `/commits` is
  enough and works without a PAT for forkers.
- Auth, comments, write actions — read-only portfolio.

See `docs/prds/` for the active roadmap (badges, streaks, repo health, etc.).

## License

MIT — see [`LICENSE`](LICENSE).

## Credits

Design: an Anthropic Claude Design handoff bundle (`gitoverview/`).
Implementation, pipeline, and porting: this repo.
