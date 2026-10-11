# Validation: repair-typecheck-clean-checkout

Base: b9b23b9. Commits for the PRD's paths: fa98cbb (`tsconfig.json`, +2/-1). The PRD file was found in `prds-archived/`.
Re-run in a worktree with no `dist-lib/` (confirmed absent, `node_modules` installed with `pnpm install --frozen-lockfile`).

## 22-repair-typecheck-clean-checkout — VERIFIED

- AC1 exclude present: `tsconfig.json:24` has `"exclude": ["pipeline/lib-export.test.ts", "dist-lib"]`.
- AC2 clean typecheck: after `git clean -fdX -- dist-lib`, `pnpm typecheck` exited 0.
- AC3 lib config unchanged: `tsconfig.lib.json` has its own `include: ["pipeline/index.ts"]` and `exclude: ["**/*.test.ts"]`. `pnpm build:lib` exited 0, then `tsx --test pipeline/lib-export.test.ts` gave pass 1 / fail 0.
- AC4 `pnpm build` exited 0 (`✓ built in 614ms`, emit-manifest ok).
- Gate: all five commands passed in order.

## Findings

- Critical: none.
- Important: none.
- Minor: the PRD listed `tsconfig.lib.json` under Files, but it was left untouched. This is correct, since its own include/exclude already override the inherited ones.
- Review: the combined diff is 2 lines of config. A self-review found no security, secrets, path-traversal or duplication concerns.
