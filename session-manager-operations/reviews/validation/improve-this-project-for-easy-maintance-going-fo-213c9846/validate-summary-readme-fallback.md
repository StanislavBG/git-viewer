# Validation: summary-readme-fallback

Base: `98b247a`. Commit range `98b247a..HEAD` touching the PRD's files (`pipeline/aggregate/ai-summaries.ts`, `pipeline/aggregate/ai-summaries.test.ts`, `pipeline/sync.ts`) contains exactly one commit:

```
1131795 feat(pipeline): fall back to README lead paragraph for empty summaries
```

`git show --stat 1131795` touches only those three files (96 insertions, 3 deletions) — matches the PRD's `# Files` list and `# Out of scope` (no changes to `.github/workflows/pages.yml`, `src/`, `package.json`).

## PRD: 6-summary-readme-fallback

**Verdict: VERIFIED**

| Acceptance criterion | Evidence |
|---|---|
| `readmeLead(readme: string): string` exported, skips headings/badges/HTML/quotes/code-fences, reduces `[text](url)` → `text`, collapses whitespace, truncates ≤200 chars at a word boundary with `…`, returns `''` with no prose | `pipeline/aggregate/ai-summaries.ts:48-66` (exported `readmeLead`); fence strip at :49, block split at :50, skip-first-line checks against `HEADING_RE`/`BADGE_RE`/`HTML_OR_QUOTE_RE` at :36-38/:54, link/HTML/bold/code stripping at :58-61, `truncateAtWord` at :41-46 cuts at last space ≤199 chars then appends `…`. Manually exercised beyond the shipped test file (`pnpm exec tsx -e …`, this session): blockquote line skipped → prose returned; prose with no leading heading returned as-is; a block <20 chars (`"short"`) returns `''`. |
| `Inputs` gains `readmeByRepo: Map<string, string>`; `buildTLDR` keeps description-present behavior unchanged, else `readmeLead(readme)`, else existing fallbacks | `pipeline/aggregate/ai-summaries.ts:10` (`readmeByRepo` field); `buildTLDR` at :70-79 — `diff 98b247a:pipeline/aggregate/ai-summaries.ts` vs HEAD shows the `desc.length>=80` / `desc && topics` / `desc` branches are byte-identical to the pre-change function; the new `readmeLead` branch is inserted only between `if (desc) return desc;` and the topics/empty fallback, which are themselves unchanged. Single caller confirmed (`grep -n buildTLDR pipeline/ src/` → :70 def, :236 call only). |
| `pipeline/sync.ts` passes `readmeByRepo` built from `projectDetails` into `buildAISummaries`; skinny mode still works | `pipeline/sync.ts:96` (`readmeByRepo = new Map(Object.entries(projectDetails).map(([k, v]) => [k, v.readme]))`) and `:103` (passed into `buildAISummaries({...})`). Skinny mode sets `readme = skinny ? '' : …` (`pipeline/sync.ts:37`) and stores it unchanged into `projectDetails[name].readme` (`:53`), so skinny runs feed `readmeLead('')`, which returns `''` per the test above — `buildTLDR` falls through to the pre-existing topic/empty fallback exactly as before this change. |
| New `pipeline/aggregate/ai-summaries.test.ts` (node:test + node:assert via tsx) covers: heading+badge+paragraph → paragraph; link reduction; long-text truncation ≤200 chars; HTML-only/empty → `''` | File exists with exactly these 5 cases (`pipeline/aggregate/ai-summaries.test.ts:1-54`). Re-run this session: `pnpm exec tsx --test pipeline/aggregate/ai-summaries.test.ts` → `# tests 5 / # pass 5 / # fail 0`. |
| `pnpm typecheck` passes and the test file passes | Both re-run this session (worktree had no `node_modules`; ran `pnpm install` first — lockfile unchanged, no `package.json` diff). `pnpm typecheck` → exit 0, no output. Test run → 5/5 pass (see above). |

### Gate re-run (verbatim from PRD)

```
timeout 180 pnpm typecheck && timeout 120 pnpm exec tsx --test pipeline/aggregate/ai-summaries.test.ts
```

- `pnpm typecheck`: exit 0.
- `pnpm exec tsx --test pipeline/aggregate/ai-summaries.test.ts`: `1..5`, `# pass 5`, `# fail 0`, `# cancelled 0`.

Gate: **PASS**.

### Diff review

`git diff 98b247a..HEAD -- pipeline/aggregate/ai-summaries.ts pipeline/aggregate/ai-summaries.test.ts pipeline/sync.ts` reviewed in full (reproduced above under "evidence"). `/code-review` and `/security-review` slash commands are not available to this headless validator persona (Read/Grep/Glob/Bash only); self-reviewed instead:

- **Correctness**: regexes are all non-catastrophic (no nested quantifiers prone to ReDoS); the code-fence strip (`/```[\s\S]*?```/g`) is non-greedy; block-skip logic only inspects the first non-empty line of each paragraph block, matching the PRD's spec and the sample READMEs in the repo (checked `README.md`-style badge/heading patterns manually).
- **Reuse**: `grep -rn "truncate\|slice(0," pipeline/` turned up no pre-existing word-boundary truncation helper elsewhere in `pipeline/aggregate/*` — `truncateAtWord` is new, not a duplicate.
- **Security**: no network/user input is parsed here beyond each repo's own README content already fetched elsewhere in the pipeline (`src.fetchReadme`, unchanged by this PRD); no shell/SQL/path construction; no secrets touched.
- **Scope**: no changes outside the PRD's three files; `.github/workflows/pages.yml`, `src/`, `package.json` untouched (confirmed via `git show --stat`).

No findings.

## Findings

None — Critical / Important / Minor all empty.

---

VALIDATION: summary-readme-fallback VERIFIED
SCHEDULER_VERDICT: PASS
