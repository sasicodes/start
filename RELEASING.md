# Releasing

```text
.
├── .github/workflows/
│   ├── release-desktop.yml
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

- Desktop release workflow: `.github/workflows/release-desktop.yml`
  - runs on tag push where tag starts with `v`
  - builds mac artifacts and publishes a GitHub release

## Releasing a new desktop version

1. Make sure your branch work is already merged to `main`.
2. Run this from repo root:

```bash
node scripts/release-desktop.js patch --push
```

3. The command:

- updates `packages/desktop/package.json` version
- creates the Git tag `v<version>`
- pushes commit + tag with `--push`

You can preview first with:

```bash
node scripts/release-desktop.js patch --dry-run
```

## Version and tag examples

Current desktop `package.json` version is currently `0.1.0-alpha.1`, so your tags can be:

- `v0.1.0-alpha.1` (or `v0.1.0-alpha.2`) for alpha
- `v0.1.0-beta.1` for beta
- `v0.1.0` for first stable

To let the script compute numbers:

- `patch` -> `0.1.1`
- `minor` -> `0.2.0`
- `major` -> `1.0.0`

You can also pass a full version:

```bash
node scripts/release-desktop.js v0.1.0-beta.1 --push
# or
node scripts/release-desktop.js 1.0.0 --push
```

## Note on tag matching

Any tag that starts with `v` (for example `vrandom`) will trigger the workflow.

Use the release helper so the tag and `packages/desktop/package.json` stay aligned.