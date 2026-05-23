Release a desktop version by running the release helper:

`node scripts/release-desktop.js patch --push`

Preview first:
`node scripts/release-desktop.js patch --dry-run`

The command does:
- updates `packages/desktop/package.json` version
- creates tag `v<version>`
- pushes commit + tag when `--push` is included

Version options:
- `patch`: `0.1.0-alpha.1 -> 0.1.1`
- `minor`: `0.1.0-alpha.1 -> 0.2.0`
- `major`: `0.1.0-alpha.1 -> 1.0.0`
- explicit version: `node scripts/release-desktop.js v0.1.0-beta.1 --push`
- stable explicit: `node scripts/release-desktop.js 1.0.0 --push`

Release tags are picked up by workflow when they start with `v`, so use the helper to keep the tag and package version aligned.