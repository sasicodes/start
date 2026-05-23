# Releasing

```text
.
├── .github/workflows/
│   ├── desktop.yml
│   └── quality-and-security.yml
├── scripts/
│   └── release-desktop.js
└── packages/
    └── desktop/package.json
```

Release is split into two paths:

- PR workflow: `.github/workflows/quality-and-security.yml`
  - runs on pull requests
  - only checks quality + security

- Desktop release workflow: `.github/workflows/desktop.yml`
  - runs on tag push where tag starts with `v`
  - builds mac artifacts and publishes a GitHub release

## Releasing a new desktop version

1. Make sure your branch work is already merged to `main`.
2. Run this from repo root:

```bash
node scripts/release-desktop.js patch --push
```

3. Then push the tag:

- `patch` makes `x.y.z -> x.y.(z+1)`
- `minor` makes `x.y.z -> x.(y+1).0`
- `major` makes `x.y.z -> (x+1).0.0`
- `v1.2.3` (or `1.2.3`) creates a specific version

The command:

- updates `packages/desktop/package.json` version
- creates the Git tag `v<version>`
- optionally pushes commit + tag with `--push`

After push, the tag workflow runs automatically and publishes the desktop release.

You can preview first with:

```bash
node scripts/release-desktop.js patch --dry-run
```

## Version tagging behavior

A tag like `v1.2.3` always triggers the desktop workflow because of the `v*` tag filter.

But for a clean release, use the release helper so the tag and desktop package version stay aligned.

If you push a random tag manually (for example `vrandom`), the workflow runs, but it may not match the desktop app version inside `packages/desktop/package.json`.