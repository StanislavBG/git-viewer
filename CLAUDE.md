# git-viewer

Personal GitHub portfolio dashboard for github.com/StanislavBG. Editorial-dark, heatmap-centric, with a local data pipeline that walks your repos and emits a single `data.json` the page reads at boot.

## Layout
- `src/` — Vite + React 18 + TS dashboard. Reads `public/data.json` once via `data/loader.tsx`, hands it to components through `useGitData()`.
- `pipeline/` — Node CLI (`pnpm sync`) using Octokit. Hits the GitHub REST + GraphQL APIs, writes `public/data.json`.
- `public/` — `data.json` (committed; sync overwrites) + `data.sample.json` (fixture for forkers, never overwritten).
- `docs/prds/` — numbered feature PRDs (`01`..`08`); `README.md` is the index/status.
- `.github/workflows/pages.yml` — runs `sync && build && deploy-pages` on push and on a daily 09:00-UTC cron.

## Key files
- `src/data/loader.tsx` — see **Canonical-data convention** below.
- `src/types.ts` — the data contract between pipeline and dashboard. Both halves import from here; nothing else couples them.
- `pipeline/sync.ts` — the orchestrator; one main(), aggregations imported from `pipeline/aggregate/*`.
- `vite.config.ts` — `base: './'` so the same `dist/` works at GH-Pages root and at the `/projects/git-viewer/` subpath.

## Commands
- `pnpm dev` — dashboard on `http://localhost:5173`, reads bundled `public/data.json`.
- `pnpm sync` — rebuild `public/data.json` from the GitHub API. Reads `.env` (`GITHUB_USER`, optional `GITHUB_TOKEN`).
- `pnpm build` — emit `dist/`.
- `pnpm typecheck` — `tsc --noEmit` across `src/` + `pipeline/`.

## Deploy — two lanes, one `dist/`
1. **GitHub Pages (canonical)** — `StanislavBG/git-viewer`. CI runs sync+build+deploy on push and daily at 09:00 UTC. Uses `secrets.GITHUB_TOKEN` (auto-injected, 1000/h) — no PAT needed for public repos. Set `secrets.PORTFOLIO_TOKEN` if you ever need cross-org reach.
2. **bilko.run/projects/git-viewer/ (mirror)** — copy `dist/` into `~/Projects/Bilko/public/projects/git-viewer/`, register in `Bilko/src/data/standalone-projects.json`, push to both Bilko remotes (`origin` = bilko-run, `content-grade`). Render redeploys ~60–90s. Or use the `bilko-host` MCP via `.mcp.json` (gitignored) — `register_static_project` once, `publish_static_project` each release.

## Canonical-data convention (important)
`src/data/loader.tsx` checks `window.location.hostname`. On the canonical host (`stanislavbg.github.io`) and during local dev (`localhost`/`127.0.0.1`), it reads the bundled `data.json`. On any other host, it fetches `https://stanislavbg.github.io/git-viewer/data.json` at runtime. This makes GH Pages the single source of truth — the daily cron refreshes both lanes without re-publishing the Bilko mirror. GH Pages serves the file with `Access-Control-Allow-Origin: *`. When adding a new mirror host, just extend the canonical-host whitelist (or trust the default fallback path).

## Conventions
- TS strict. No comments unless the *why* is non-obvious.
- Add a PRD before adding a feature: `docs/prds/NN-slug.md`, then update `docs/prds/README.md` status.
- Pipeline aggregations are pure functions in `pipeline/aggregate/*.ts`; the orchestrator (`sync.ts`) does I/O and stitching.
- Skinny mode: when the rate-budget is tight, the pipeline skips per-commit diffs, READMEs, and the per-repo treemap fetch. Anything optional should respect the same flag.
- Don't commit `.env`, `.mcp.json`, or `dist/` (all in `.gitignore`).
