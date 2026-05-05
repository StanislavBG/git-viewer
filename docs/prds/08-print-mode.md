# PRD-08 — Resume / print mode

## Motivation

4 of the surveyed portfolio tools (gitprofile, masterPortfolio, soumyajit,
bchiang7) include a print/PDF/resume mode. For an editorial-dark dashboard
specifically, having a `?print=1` route that linearizes the page into a
clean A4 layout turns it into a sharable artifact (PDF for jobs, printable
"page" to hand someone). No data-shape change required.

## Data-shape change

None.

## UI work

1. `App.tsx`: detect `new URLSearchParams(location.search).get('print') === '1'` →
   render `<PrintShell />` instead of the regular `Shell`.
2. `src/components/PrintShell.tsx`: single-column re-layout of:
   - Hero (smaller portrait, same name/role/bio)
   - Headline strip (tier-1 PRD-01)
   - Heatmap (force `classic` variant)
   - Top repos panel
   - Languages list (no donut)
   - Recent commits feed
   - Project list (small cards, no spark)
   - Footer with handle + "generated <date>"
3. CSS: a small `@media print` block in `styles.css` to:
   - Force light background (`bg: oklch(0.99 0)`, `ink: oklch(0.15 0)`).
   - Hide tweaks panel (`.twk-toggle-fab, .twk-panel { display: none !important }`).
   - Hide topbar.
   - `page-break-inside: avoid` for cards.
4. Add a small "↗ Print" link in the footer (only outside print mode).

## Acceptance criteria

1. `?print=1` renders the linearized layout.
2. `Cmd-P` produces a 2-3 page PDF; first page = hero + heatmap; second page = projects.
3. Tweaks panel is hidden in print.
4. Black ink on white background; numbers and headlines remain serif.
5. The regular dashboard at `/` is unchanged.
