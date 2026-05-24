Cut a desktop release.

Context for the agent:

The repository's main branch is protected. Direct pushes to main are rejected. Every change including a version bump must land through a pull request.

The desktop release workflow lives at .github/workflows/release-desktop.yml. It triggers on git tags whose name starts with v. When triggered, it checks out the tag, builds the macOS distributable, signs and notarizes it with the repository secrets, and publishes a GitHub release with the artifacts attached.

The tag must point at the commit that is actually on main after the bump PR merges, not at the local commit the bump script creates. The merge strategy used on GitHub may produce a different SHA (squash merge does, rebase merge usually preserves SHA, merge commit creates a new merge SHA). If the tag points at the pre-merge SHA, the release artifact's provenance is wrong because that commit may not be reachable from main.

Tags must be signed so GitHub displays the Verified badge on the release. The repository convention is to use git tag -s, which signs with the local signing key configured in git (user.signingkey + gpg.format). Lightweight tags (git tag X without -a or -s) inherit verification from the underlying commit's signature. Annotated unsigned tags (git tag -a X) carry no signature of their own and show Unverified on GitHub even when the target commit is signed.

The bump helper script is scripts/release-desktop.js. It updates packages/desktop/package.json, creates a chore: bump desktop version commit, and creates an annotated tag locally. Its --push flag pushes the commit and the tag immediately; do not use --push for this flow because main is protected and because the tag would point at the pre-merge commit.

Steps to release version X (for example v0.1.0-alpha.4):

1. Preview the bump.

   node scripts/release-desktop.js X --dry-run

2. Create a release branch from the latest main, run the bump, push the branch, open a pull request.

   git checkout main
   git pull
   git checkout -b chore/bump-X
   node scripts/release-desktop.js X
   git push -u origin chore/bump-X
   gh pr create --title "chore: bump desktop version to X"

3. Wait for the pull request to be merged to main.

4. Update main locally, replace the local tag with one created on the merged commit, sign it, push the tag. The Release Desktop workflow runs on the tag push.

   git checkout main
   git pull
   git tag -d X
   git tag -s X -m X
   git push origin X

5. Confirm the workflow run succeeds at https://github.com/sasicodes/start/actions and that the release at https://github.com/sasicodes/start/releases shows the macOS artifacts and a Verified badge on the tag.

Version argument forms accepted by scripts/release-desktop.js:
- patch bumps 0.1.0-alpha.1 to 0.1.1
- minor bumps 0.1.0-alpha.1 to 0.2.0
- major bumps 0.1.0-alpha.1 to 1.0.0
- explicit prerelease: v0.1.0-beta.1
- explicit stable: 1.0.0
