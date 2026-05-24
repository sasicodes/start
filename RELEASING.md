Releases ship through a pull request because main is protected. The desktop release workflow runs on tag pushes that start with v, so the tag must point at the merged commit on main, not the pre-merge commit on the release branch.

To cut a release with version X (for example v0.1.0-alpha.4):

1. Preview the version bump.

   node scripts/release-desktop.js X --dry-run

2. Create a release branch, run the bump, push the branch, open a PR. Do not pass --push to the bump script. --push would push the local tag to a commit that gets replaced when the PR merges.

   git checkout main
   git pull
   git checkout -b chore/bump-X
   node scripts/release-desktop.js X
   git push -u origin chore/bump-X
   gh pr create --title "chore: bump desktop version to X"

   The bump script updates packages/desktop/package.json, commits chore: bump desktop version to X, and creates the local annotated tag vX.

3. Wait for the PR to merge to main.

4. Retag the merged commit and push the tag. The Release Desktop workflow runs on the tag push and publishes the macOS build.

   git checkout main
   git pull
   git tag -d vX
   git tag -s vX -m vX
   git push origin vX

Version argument forms accepted by scripts/release-desktop.js:
- patch bumps 0.1.0-alpha.1 to 0.1.1
- minor bumps 0.1.0-alpha.1 to 0.2.0
- major bumps 0.1.0-alpha.1 to 1.0.0
- explicit prerelease: v0.1.0-beta.1
- explicit stable: 1.0.0
