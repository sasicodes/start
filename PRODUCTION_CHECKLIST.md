# Production checklist

- Enable GitHub Actions.
- Set repository Actions permissions to read/write.
- Add these GitHub Actions secrets:
  - `APPLE_CERTIFICATE`: base64-encoded `.p12` Developer ID Application certificate, including its private key.
  - `APPLE_CERTIFICATE_PASSWORD`: password for the `.p12` certificate export.
  - `APPLE_ID`: Apple Developer account email address.
  - `APPLE_APP_SPECIFIC_PASSWORD`: Apple app-specific password for `APPLE_ID`; this is not the normal Apple ID password.
  - `APPLE_TEAM_ID`: Apple Developer Team ID.
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