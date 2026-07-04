# Releasing the desktop app

`main` is protected, so the version bump lands via PR. The desktop release workflow (`.github/workflows/desktop-release.yml`) triggers on tags starting with `v` and publishes the macOS build. The release script also updates `packages/web/package.json` so the web deployment sees a `packages/web` change and rebuilds download links from the desktop version. Sign the tag (`git tag -s`) so GitHub shows Verified.

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

The bump script also creates a local tag at the current (pre-merge) commit. Leave it; step 4 deletes and recreates it on the merged commit. Do not pass `--push` — the pushed tag would point at the pre-merge commit, which changes when the PR squash-merges.

If a batch of feature PRs is going out together, the bump can ride along in the last PR instead of a standalone `chore/bump-*` branch. Rebase that PR on the merged `main` first, then run the bump script on it so the version change is the final commit.

## 3. Merge the PR

## 4. Sign and push the tag on the merged commit

```sh
git checkout main && git pull
git tag -d v0.1.0-alpha.4
git tag -s v0.1.0-alpha.4 -m v0.1.0-alpha.4
git push origin v0.1.0-alpha.4
```

The release workflow runs on the tag push and publishes the macOS artifacts.

`git tag -v` may fail locally with `gpg.ssh.allowedSignersFile needs to be configured` — that is a local verification config, not a signing failure. The pushed tag is still signed, and GitHub shows it as Verified.

## Script version arguments

- `patch` — `0.1.0-alpha.1` → `0.1.1`
- `minor` — `0.1.0-alpha.1` → `0.2.0`
- `major` — `0.1.0-alpha.1` → `1.0.0`
- explicit: `v0.1.0-beta.1`, `1.0.0`
