# Releasing the desktop app

`main` is protected, so the version bump lands via PR. The desktop release workflow (`.github/workflows/release-desktop.yml`) triggers on tags starting with `v` and publishes the macOS build. Sign the tag (`git tag -s`) so GitHub shows Verified.

Examples below use `v0.1.0-alpha.4` — substitute the actual release tag.

## 1. Preview the bump

```sh
node scripts/release-desktop.js v0.1.0-alpha.4 --dry-run
```

## 2. Bump on a release branch and open a PR

```sh
git checkout main && git pull
git checkout -b chore/bump-alpha-4
node scripts/release-desktop.js v0.1.0-alpha.4
git push -u origin chore/bump-alpha-4
gh pr create --title "chore: bump desktop version to 0.1.0-alpha.4"
```

Do not pass `--push` to the bump script — the tag would point at the pre-merge commit, which may be rewritten when the PR merges.

## 3. Merge the PR

## 4. Sign and push the tag on the merged commit

```sh
git checkout main && git pull
git tag -d v0.1.0-alpha.4
git tag -s v0.1.0-alpha.4 -m v0.1.0-alpha.4
git push origin v0.1.0-alpha.4
```

The release workflow runs on the tag push and publishes the macOS artifacts.

## Script version arguments

- `patch` — `0.1.0-alpha.1` → `0.1.1`
- `minor` — `0.1.0-alpha.1` → `0.2.0`
- `major` — `0.1.0-alpha.1` → `1.0.0`
- explicit: `v0.1.0-beta.1`, `1.0.0`
