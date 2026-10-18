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
The host pageview beacon records the pathname only. Hash tabs, `?u=` and `?print=1` all look like the same page to it, so every screen emits `screen_view`:
`landing`, `overview`, `projects`, `activity`, `writing`, `project-detail`, `resume`, `repo-picker`, `generating`, `not-found`, `error`.

## Flows
| flow | steps | props |
| --- | --- | --- |
| `checkout` | view-offer, click-buy, checkout-redirect, success, cancel, fail | product `git-viewer`, plan `pro`, source (`landing`, `claim-bar`, `projects-tab`, `stripe-return`), reason |
| `claim` | start, success, fail | mode (`claim`, `choose-projects`), tier, projects, reason |
| `billing-portal` | start, success (portal redirect), fail | reason |
| `build-portfolio` | start (landing / not-found submit), success, fail | source, reason. Success and fail are emitted after the navigation, using a sessionStorage marker |
| `portfolio-load` | start, generating, success, fail | source (`hosted`, `bundled`), reason |
| `download` | click-download, download-started, download-failed | artifact `resume-pdf`, version, platform `web`, source |

## data-track
Every primary button and link has a kebab-case `data-track`. Monetization buttons use `subscribe-*` and résumé/print uses `download-*`.
Text that names a person (the claim bar label, the claim message, the login forms) is wrapped in `data-track-redact`.

## Acceptance
- `pnpm test` covers the event shape, name validation and PII scrubbing (`src/data/telemetry.test.ts`).
- A production build served under a simulated `https://bilko.run/projects/git-viewer/` POSTs the events above to `/api/telemetry/event` with app `git-viewer`.
