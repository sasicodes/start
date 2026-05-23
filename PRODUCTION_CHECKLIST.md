# Production checklist

- Enable GitHub Actions.
- Set repository Actions permissions to read/write.
- Add these GitHub Actions secrets:
  - `APPLE_CERTIFICATE`
  - `APPLE_CERTIFICATE_PASSWORD`
  - `APPLE_ID`
  - `APPLE_PASSWORD`
  - `APPLE_TEAM_ID`
- Keep Apple Developer Program and signing setup aligned with `one.intelligence.start`.
- Verify notarization succeeds with test builds.
- Run:
  - `node scripts/release-desktop.js patch --dry-run`
  - `node scripts/release-desktop.js patch --push`
- Wait for `release-desktop` workflow to create the release.
- Confirm artifacts are attached (`.dmg`, `.zip`, `.blockmap`, `latest*.yml`).
- Test release app build on Apple Silicon and Intel.
- Confirm app launches without dev-only env vars and without local-only runtime files.
- Confirm no secret values appear in logs.