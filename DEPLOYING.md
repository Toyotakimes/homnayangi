Website version comes from `src/deploy-version.json`. Build outputs also contain
`deploy-version.json` with the exact source commit SHA. Commit/tag verification
prevents the footer number from drifting from Git history.

Each new request is a new Deploy. First inspect GitHub tags/Releases and run
`node scripts/prepare-deploy.mjs`. Finish changes, then run `npm.cmd test`,
`npm.cmd run build` and `node scripts/browser-check.mjs` against the local server.

Commit as `Deploy N - <description>`, create annotated `deploy-N` at HEAD, and run
`node scripts/check-deploy-version.mjs --release`. Push main and that tag in one
atomic push. Never force push, move tags or rewrite an old release.

Publish the exact source through Sites, retaining the saved version and build
archive. Write the release description to `releases/deploy-N.md`, create Release
`Deploy N` with `node scripts/github-release.mjs create`, and upload the archive
with `node scripts/github-release.mjs upload <absolute-archive-path>`. The helper
uses Git Credential Manager in memory; tokens are never printed or written.

GitHub Pages publishes the latest version at its usual URL and keeps numbered
snapshots under `/homnayangi/versions/deploy-N/`. Older snapshots are extracted
from their original Release archives, then checked against their tag SHA. If an
archive is missing, the workflow fails rather than publishing a site that loses
old versions. Each Sites saved version also retains its original source/build.

To review or roll back, inspect the tag/Release or select the saved Sites version.
Publishing an old saved version is a rollback; it does not move its Git tag.
The next new change still uses the greatest existing Deploy number plus one.
