# 14 — Usage report script (`pnpm usage`)

`scripts/usage/report.ts` answers "who used git-viewer, what did they build, did anyone pay" in one read-only command.

## Motivation
- On 2026-11-07 a manual review found that the owner and automated test runs were 21 of 25 git-viewer sessions in three weeks.
- Answering "who used it, what did they build, did anyone pay" took an hour of hand forensics.
- The script makes it one command. The decision on the paid tier needs those numbers.

## Sources
All bilko.run calls go to `BILKO_BASE_URL` (default `https://bilko.run`) with `Authorization: Bearer <admin key>`, a 20 s timeout per request.
The admin key comes from `BILKO_ADMIN_KEY`, else the file at `BILKO_ADMIN_KEY_FILE` (default `~/.config/bilko-host/admin-key`). With no key the script exits 1.

| source | call | gives |
| --- | --- | --- |
| Portfolios | `GET /api/admin/git-viewer/profiles` | totals by tier / claimed / builtBy, subscription counts, profile rows |
| Sessions | `GET /api/admin/sessions?app=git-viewer&days=N&limit=200&mine=include&bots=include` | sessions, classified `mine` / `bot` / `real` |
| Timelines | `GET /api/admin/sessions/<id>` | event timeline for the first 50 real sessions, 5 at a time |
| Flows | `GET /api/admin/flows?app=git-viewer&days=N&…` (`mine=exclude&bots=exclude`, then `mine=include&bots=include`) | real vs all session counts, telemetry-only real sessions |
| Traffic | `GET /api/admin/traffic?slug=git-viewer&days=N` | human visitors, single-hit visitors, hits by UTC day |
| Errors | `GET /api/admin/observability/errors?app=git-viewer&days=N&env=prod` | prod error total |
| Health | `GET /api/health` (no auth) | `gitViewer.ok` |
| Stripe | `stripe subscriptions list --live` per git-viewer price (yearly, monthly); `stripe checkout sessions list --live` since the window start | subscriptions by status, git-viewer checkouts with plan and `?u=` |
| Pages | `gh run list --workflow pages.yml --limit 7` | last 7 GH Pages run conclusions |
| burrow | SQLite at `BURROW_X_DB` (default `~/Projects/burrow/downloads/x-tracker.db`), opened read-only | Bilko's X replies that mention git-viewer, used to attribute real visits |

## Output
- Markdown report to stdout: headline numbers, a by-day table (Pacific days), real visitors with their portfolio URL and burrow attribution, portfolios, unmatched builds, Stripe, traffic, health.
- Full JSON report to `.cache/usage/<YYYY-MM-DD>.json` (Pacific date), or the path given by `--out`. The written path is logged to stderr.

## Rules
- Read-only. Every call is a GET or a list; the burrow DB opens `readOnly`.
- Never calls `/api/git-viewer/u/` — that endpoint builds a portfolio, so a report would create pages. `report.test.ts` asserts the path is absent.
- Emails are stripped: `stripEmails` drops any `/email/i` key and masks addresses in strings, on sessions, timelines and the whole report.
- The JSON output lives under `.cache/usage/`, which is gitignored (`.cache/`).
- A failing source renders as `_unavailable: <error>_` instead of failing the report. Each source is settled on its own; health failures are listed under problems.

## Run
- `pnpm usage` — last 30 days.
- `pnpm usage --days N` — N is clamped to 1..30; non-numeric falls back to 30.
- `pnpm usage --out path.json` — write the JSON elsewhere.
- The Session Manager "Usage" macro runs it.

## Acceptance
- `pnpm test` covers argument parsing, the no-portfolio-build guard (`scripts/usage/report.test.ts`), Pacific-day bucketing, session classification, build/burrow attribution, email stripping (`aggregate.test.ts`) and the Markdown render, including unavailable sections (`render.test.ts`).
- `pnpm usage --days 7` with an admin key prints the report and writes `.cache/usage/<date>.json`.
