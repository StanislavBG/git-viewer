# Validation: git-viewer card clip plan

Base `6a96bf97` (known). HEAD at validation `2661f85`. Combined diff: 17 files, +646/-52. All commits authored and committed as Bilko Bibitkov <BilkoBibitkov2000@gmail.com>.
Gates re-run at HEAD: `CI=1 pnpm test` exit 0 (all suites pass, lib import check ok); `pnpm typecheck` exit 0; `pnpm build:bilko` exit 0 (`emit-manifest: git-viewer 0.1.1 (2661f85, kit 0.0.0, 75.8 KB gz, 3 files; share assets not counted: og.png 73.6 KB gz, tile.mp4 4843.9 KB gz)`); 106 node gate exit 0; 111 gate exit 0.

## remove-placeholder-writing — VERIFIED
- Commit c3814ce deletes content/writing/_now.md and the-quiet-pipeline.md; `git ls-files content` = 0 files, so nothing else was added.
- pipeline/aggregate/writing.test.ts:102-116: empty-dir deep-equal `{essays:[],essaysFeatured:null,now:null}` and repo-root guard (no 'the-quiet-pipeline', now null). Passes in `pnpm test`.
- package.json "test" lists writing.test.ts right after pipeline/listing.test.ts. public/data.json and src/ not in diff.
- Note: the file already existed with other tests (the PRD said "New"); c241283 kept them and made the existing root test tolerate a missing dir. Acceptable.

## reword-pipeline-intro — VERIFIED
- README.md:3-5 and CLAUDE.md:3 say the pipeline pulls the account's public repos from the GitHub API. "scans your repos" / "walks your repos" gone (gate exit 0).
- CLAUDE.md content/writing bullet says empty by default, "no essays yet", essays + optional `_now.md` read at sync time.
- Diff touches only those lines (README -2/+2, CLAUDE intro + bullet; the third CLAUDE.md change is from PRD 110).

## card-clip-script — VERIFIED
- scripts/make-card-clip.mjs (206 lines), scripts/make-card-clip.test.ts, scripts/fixtures/demo-video-fixture.html exist; package.json has `card:clip` and the test in "test". Test suite passes (exit 0, includes the --fps abc error case).
- Produced clip checked by ffprobe: h264 1200x630 yuv420p + aac, 60.000 s.

## manifest-share-assets — VERIFIED
- scripts/share-assets.mjs exports the check; emit-manifest.mjs excludes valid declared assets; build line matches the required format with `; share assets not counted: og.png ..., tile.mp4 ...`. emit-manifest.test.ts passes; listed in "test".

## project-demo-video — VERIFIED
- meta.json: kind `project-demo`, lengthS 60, character null, every report check ok (captions, language, closing, voiceFit, speechCoverage, blankFrames, htmlLimits, audio-speech, keystones, avoidClaims, closingUrl, determinism). 0 sources reference content/writing. index.html (1.47 MB) mtime Nov 15 17:24, after the gate floor.
- index.html has `<audio src="data:audio/mpeg;base64,...">`.
- All 16 captions checked against bilko.listing.json and src/: hook/audience (listing.audience); "type a GitHub username, no install, no sign-up" (talkingPoints[0]); "public projects, ranked by recency and activity" (talkingPoints[1]); heatmap/streaks/tabs (Landing.tsx FREE list, Topbar); share/print-ready PDF (Landing.tsx); "Private projects never read", "doesn't need access to your GitHub account" (talkingPoints[2]); free = top project, rebuilt at most once a day when viewed (talkingPoints[3], Landing.tsx:23); $5/yr up to 12, refreshed daily (talkingPoints[4], Landing.tsx:28). None matches an avoidClaims entry (instant updates, >1 free project, private repos, token/account access, fully free). Pro example page is tagged "Example · Pro plan". Closing card/caption names bilko.run/projects/git-viewer/.
- Nothing in the video cites content/writing/. (Not committed, as the PRD required: the folder is gitignored.)

## card-clip-render-declare — VERIFIED
- share/tile.mp4 4,997,397 B (<8,388,608); ffprobe: h264 1200x630 yuv420p, aac, both 60.0 s. scripts/tile-clip.test.ts passes in `pnpm test`.
- package.json build:bilko: `... rm -f ... && cp share/tile.mp4 dist/tile.mp4 && node scripts/emit-manifest.mjs`; `build` unchanged.
- bilko.listing.json adds only `"video": "/projects/git-viewer/tile.mp4"` after shareImage; listing.test.ts asserts it. Build prints `share assets not counted: ... tile.mp4`; counted 75.8 KB gz < 200.
- CLAUDE.md Deploy lane 2 has the card:clip sentence.

## publish-card-clip — VERIFIED
- Live now: `curl --max-time 15 -r 0-11 https://bilko.run/projects/git-viewer/tile.mp4` → HTTP 206, bytes `0000 0020 6674 7970 6973 6f6d` = `... ftypisom` (ftyp at bytes 4-7).
- Live manifest.json gitSha `00aae8b` = the sha built and recorded in docs/publish/card-clip-publish.md (HEAD 2661f85 only adds that record).
- docs/publish/card-clip-publish.md records built/previous sha, push (fast-forward 6a96bf9..00aae8b, no force), identity check, and ends with `card clip confirmed live` (gate exit 0).
- Not re-run: the nested publish_static_project call, the Playwright check of /projects?p=git-viewer, and push history. These are checked from the record only.

## Findings
### Critical
- none
### Important
- none
### Minor
- docs/publish/card-clip-publish.md: the "Status: PUBLISHED" line and gitBranch `sm-job/111-publish-card-clip` in the live manifest show the live build came from a job branch; harmless, the sha is in main.
- `public/data.json` still carries the placeholder essay until the next CI sync (the PRD said not to edit it); the live GitHub Pages Writing tab is fixed only after that sync. Not re-checked live.
- tile.mp4 is 4.8 MB gz in dist/, which depends on the host excluding declared share assets; the gate-measured result is in the publish record.
- Self-review of the diff (no /code-review available as a separate pass): no secrets, no path traversal in the make-card-clip file arguments (local CLI, user-supplied paths), no duplicated helper noticed.
