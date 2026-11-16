# Card clip publish — 2026-11-15

**Status: PUBLISHED.** https://bilko.run/projects/git-viewer/

The owner asked for the new git-viewer video to be the video on https://bilko.run/projects. This publish ships `share/tile.mp4` as `dist/tile.mp4`, declared as `listing.video` (`/projects/git-viewer/tile.mp4`) in `bilko.listing.json`. The git-viewer card now plays that clip, muted and looping.

- Built sha: `00aae8b` (HEAD at build, `00aae8bbaf1ba05d7967bc36adbdb3d6bf2143f8`)
- Previous live sha: `6a25a83` (live manifest read at 5:31:23 PM PST, just before publish; builtAt 2026-11-13T07:03:43Z, 152910 B gz, 4 files)
- Preconditions:
  - `/home/bilko/Projects/git-viewer/bilko.listing.json` has `listing.video` = `/projects/git-viewer/tile.mp4`. The main checkout was at `00aae8b`, the same as HEAD.
  - `share/tile.mp4` exists (4997397 bytes).

## Push

- Identity check: `git log --format='%h %ae %ce' origin/main..HEAD` listed 6 commits (`00aae8b 56a62c7 829a358 f59ede9 c241283 c3814ce`). Every author and committer email was `BilkoBibitkov2000@gmail.com`, so the check passed.
- Before the push, origin `main` was at `6a96bf9`, an ancestor of HEAD. The run used no fetch or merge.
- `git push origin HEAD:main` at 5:31:13 PM PST printed `6a96bf9..00aae8b  HEAD -> main`. It was a fast-forward with no `--force`. GitHub Pages redeploys from this push, which drops the placeholder essay.

## Build

- `pnpm build:bilko` passed. `dist/tile.mp4` (4997397 B, byte-identical to `share/tile.mp4`) and `dist/og.png` (75570 B) exist. `dist/manifest.json` gitSha is `00aae8b`.
- emit-manifest line: `git-viewer 0.1.1 (00aae8b, kit 0.0.0, 75.8 KB gz, 3 files; share assets not counted: og.png 73.6 KB gz, tile.mp4 4843.9 KB gz)`

## Size vs budget

| Figure | Value | Budget | Headroom |
| --- | --- | --- | --- |
| manifest (sizeBytesGz 77591) | 75.8 KB gz | 200 KB gz (CLAUDE.md mirror budget) | 124.2 KB |
| gate-measured (6 files, excl. 2 share assets: og.png, tile.mp4) | 76.0 KB gz | 200 KB gz (CLAUDE.md mirror budget) | 124.0 KB |

The host's budget gate reported `no size budget, only GitHub's 100 MiB per-file limit` for git-viewer. The largest file is tile.mp4 at 4.8 MiB. The bundle is still under the 200 KB gz figure in CLAUDE.md.

## Gates (no bypass)

| Gate | Result |
| --- | --- |
| manifest | pass (v0.1.1 / sha 00aae8b) |
| budget | pass (measured 76.0 KB gz over 6 files, excluding 2 share assets; manifest reported 75.8 KB) |
| golden | pass (golden.spec.ts green) |
| a11y | pass (0 serious, 3 minor) |
| audit | pass (no high/critical CVEs) |
| share-assets | pass (valid: shareImage, video) |

Published once, finishing at 5:31:51 PM PST, through a nested `claude -p --model claude-sonnet-5-5 --mcp-config <tmp> --strict-mcp-config` call.
- The temp MCP config held only bilko-host. It was `/tmp/bilko-host-mcp.6BXIbZ.json`, outside the repo, mode 600, and deleted on exit (`ls` afterwards: no such file).
- Arguments: slug `git-viewer`, distPath `<worktree>/dist`, sourceRepoPath `/home/bilko/Projects/git-viewer`.
- No bypass or bypassReason was passed. The output ended `PUBLISH_RESULT: OK`.

- Listing: `synced from bilko.listing.json`
- Pushed host commit: `9bb6a735843f5aec0ef5afa23ff1512fec66a0ae`
- The tool result also printed `local main: synced — [sync-local-main] local main is now 2100dabc: 6 unshipped commit(s) ahead of origin/main, 0 behind (old tip: backup/main-pre-sync)`. That line is about the host's own Bilko checkout. This run edited nothing under `/home/bilko/Projects/Bilko`.

## Live checks

- Live manifest gitSha: `00aae8b`, which matches the built sha. It matched on try 10 of 20, 15 s apart, at 5:34:13 PM PST.
- `curl -r 0-11 -b bilko_internal=1 https://bilko.run/projects/git-viewer/tile.mp4` returned 206, `video/mp4`, `content-range: bytes 0-11/4997397`. Bytes 4-7 are `ftyp` (`000000206674797069736f6d`, `ftypisom`).
- Card check: a throwaway Playwright script ran outside the repo with cookie `bilko_internal=1` on `https://bilko.run/projects?p=git-viewer`.
  - Browser: `channel: 'chrome'` failed to launch, so the script fell back to bundled Chromium 148.0.7778.96.
  - Request: the page fetched `/projects/git-viewer/tile.mp4?v=aa835798` and got 206.
  - The `.pr-shot video` element had src `/projects/git-viewer/tile.mp4?v=aa835798`, `muted: true` and `loop: true`, with no media error. The card showed no poster `<img>` fallback.
  - Playback: `canPlayType('video/mp4; codecs="avc1.640028"')` returned `"probably"`, so this Chromium decodes H.264. `currentTime` went from 0 to 2.94 over 3 s and the video was not paused, so the clip plays.
- Checked at 2026-11-15 5:34:27 PM PST

Rollback (record only, not done): republish the tree of the previous live sha `6a25a83` through the same gated publish.

card clip confirmed live
