# Deploy/version rules for homnayangi

For every new user-requested change group, prepare exactly one new numbered Deploy.
Read local and GitHub deploy tags/releases before selecting the next number. Never
reset numbering. Resume the same pending Deploy after an interrupted attempt.

- Keep existing application features and data. Merge newer remote work without
  resetting, rebasing published commits, force pushing, deleting tags or editing
  old Releases/assets.
- Run `node scripts/prepare-deploy.mjs` once per new change group after checking
  GitHub state. It writes the single website version source,
  `src/deploy-version.json`. Do not increment it on every build or retry.
- Run tests, build and appropriate local browser checks before committing.
- Make one commit named `Deploy N - <description>`. Create annotated tag
  `deploy-N` at that exact commit. Validate with
  `node scripts/check-deploy-version.mjs --release`.
- Push the commit and tag together without force. Create GitHub Release
  `Deploy N` for `deploy-N` with changes, files, new features, fixed bugs,
  test/build results, remaining limitations and website links.
- Upload the exact build archive as `deploy-N.tar.gz` to that Release. Keep
  earlier assets and Sites versions. GitHub Pages keeps historical websites at
  `/homnayangi/versions/deploy-N/` from the old Release archives.
- Use the project's existing Sites identity when publishing there; follow Sites
  hosting instructions. Do not create replacement Sites. Preserve site access.
- Report Deploy number, full commit SHA/message, tag, Release status/links,
  website link, changed files, build status and tested console errors. If an
  external step fails, report it accurately and retain the pending Deploy.

Explicit user instructions for a particular turn override these default publishing
rules, including requests to keep changes local or skip production deployment.
