Releases ship through a pull request because `main` is protected. The desktop release workflow runs on tag pushes that start with `v`, so the tag must be created on the merged commit, not the pre-merge one.

Preview the bump:

`node scripts/release-desktop.js v0.1.0-alpha.4 --dry-run`

Open the bump PR from a release branch:

```
git checkout -b chore/bump-alpha-4
node scripts/release-desktop.js v0.1.0-alpha.4
git push -u origin chore/bump-alpha-4
gh pr create --title "chore: bump desktop version to 0.1.0-alpha.4"
```

The script updates `packages/desktop/package.json`, commits `chore: bump desktop version to <version>`, and creates the annotated tag `v<version>` locally. Do not pass `--push` — it would push the tag to the pre-merge commit, which will be replaced when the PR merges.

After the PR merges, retag the merged commit and push the tag:

```
git checkout main && git pull
git tag -d v0.1.0-alpha.4
git tag -a v0.1.0-alpha.4 -m v0.1.0-alpha.4
git push origin v0.1.0-alpha.4
```

The `Release Desktop` workflow runs on the tag push and publishes the macOS build.

Version options:
- `patch`: `0.1.0-alpha.1 -> 0.1.1`
- `minor`: `0.1.0-alpha.1 -> 0.2.0`
- `major`: `0.1.0-alpha.1 -> 1.0.0`
- explicit version: `node scripts/release-desktop.js v0.1.0-beta.1`
- stable explicit: `node scripts/release-desktop.js 1.0.0`
