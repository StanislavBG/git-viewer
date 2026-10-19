# 13 — bilko.run observability tagging

Every bilko.run app follows one tagging taxonomy, so the host's admin Sessions and Flows views can show
where a visitor landed, which screens they saw, and what they clicked. The taxonomy is defined in the
Bilko host repo (`docs/observability.md`, "Tagging taxonomy").

## Transport
- `src/data/telemetry.ts` uses the same wire format as host-kit `track()`/`trackFlow()`:
  `POST /api/telemetry/event` with `{ batch: [{ app: 'git-viewer', name, ts, props }] }`, sent through `sendBeacon`.
  The server stamps the `bilko_vid`/`bilko_sid` cookie ids onto each record.
- host-kit is not a dependency. Its npm release (0.9.0) lacks `trackFlow`, and a `file:../Bilko` link would break the GH Pages CI install.
- Sends happen only on `bilko.run`/`www.bilko.run`, where the ingest is same-origin. On GH Pages nothing is sent, and in dev events go to `console.debug`.
- `scrubProps` drops keys matching `email|password|token|key|ssn|card|cvv|apikey|login|name` and truncates strings to 80 characters. Props never hold a GitHub login, an email or free text.

## Screens (`screen_view`)
The host pageview beacon records the pathname only. Hash tabs and `?print=1` all look like the same page to it, so every screen emits `screen_view`:
`overview`, `projects`, `activity`, `writing`, `project-detail`, `resume`, `not-found`, `error`.

## Flows
| flow | steps | props |
| --- | --- | --- |
| `download` | click-download, download-started, download-failed | artifact `resume-pdf`, version, platform `web`, source |

## data-track
Every primary button and link has a kebab-case `data-track`. Résumé/print uses `download-*`.

## Acceptance
- `pnpm test` covers the event shape, name validation and PII scrubbing (`src/data/telemetry.test.ts`).
- A production build served under a simulated `https://bilko.run/projects/git-viewer/` POSTs the events above to `/api/telemetry/event` with app `git-viewer`.
