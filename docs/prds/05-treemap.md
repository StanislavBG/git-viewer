# PRD-05 — Per-project file treemap (spec only — tier 2)

## Motivation

`githubocto/repo-visualizer` (1.7k ⭐) is the only popular tool offering
per-repo internal structure. Their version requires a heavy AST step. We can
get 80% of the visual impact from `GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1`
plus the `/languages` endpoint — no AST. Lands as a treemap on the project
detail page, replacing or augmenting the synthetic README block.

## Data-shape change

`src/types.ts` — extend `ProjectDetail`:

```ts
export interface FileNode {
  name: string;
  path: string;
  loc?: number;     // line count (approx via blob size / 40)
  size: number;     // bytes
  lang?: string;    // by extension
  children?: FileNode[];
}

interface ProjectDetail { /* … */ tree?: FileNode; }
```

## Pipeline work

`pipeline/aggregate/treemap.ts`:
- `repos.getContent` recursively or `git.getTree({ recursive: 'true' })` for the default branch.
- Filter: skip `node_modules/`, `dist/`, `vendor/`, `.git/`, files > 1MB, lockfiles.
- Bin by extension → language (reuse the existing `colorFor()` table).
- Cap depth at 4; group leftover tail into `"other"`.

Skinny mode: skip — adds an API call per repo we can't afford without a PAT.

## UI work

New component `src/components/Treemap.tsx` on `ProjectDetail`:
- Squarified treemap (D3-free; ~40 LOC pure TS).
- Tile color: language (via `colorFor()`); tile size: LOC; on-hover: dim siblings, show file path.
- 320×240 SVG, snapped into the right column of `.detail-grid`.

## Acceptance criteria

1. Treemap absent → falls back to synthetic README (current behavior).
2. Treemap present → tree nests at most 4 deep visually.
3. Total area is proportional to total LOC of the repo.
4. Colors match the language donut on the home page.
