# Releasing

## Releasing a new desktop version

Release is done by this single command:

```bash
node scripts/release-desktop.js patch --push
```

You can preview first with:

```bash
node scripts/release-desktop.js patch --dry-run
```

The command:
- updates `packages/desktop/package.json` version
- creates the Git tag `v<version>`
- pushes commit + tag with `--push`

## Versioning examples

- `patch` → increments the patch number (`0.1.0-alpha.1` -> `0.1.1`)
- `minor` → increments minor (`0.1.0-alpha.1` -> `0.2.0`)
- `major` → increments major (`0.1.0-alpha.1` -> `1.0.0`)
- `v0.1.0-beta.1` or `0.1.0-beta.1` → sets an explicit version
- `v0.1.0` → stable release tag

## Taging rule

The release workflow runs on any tag that starts with `v`, so use this helper command to keep the git tag aligned with `packages/desktop/package.json`.