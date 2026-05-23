# Production Release Checklist

Remaining setup before publishing Start from this open-source repository.

## GitHub repository setup

- [ ] Enable GitHub Actions.
- [ ] Set Actions workflow permissions to `Read and write permissions` so tagged releases can publish artifacts.
- [ ] Enable branch protection for `main` if desired.
- [ ] Enable Dependabot alerts, secret scanning, and push protection.
- [ ] Confirm GitHub account email privacy is enabled and command line pushes that expose a private email are blocked.

## GitHub Actions secrets

Add these in GitHub → Repository Settings → Secrets and variables → Actions.

### macOS signing and notarization

- [ ] `APPLE_CERTIFICATE`: base64-encoded `.p12` Developer ID Application certificate.
- [ ] `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the `.p12` certificate.
- [ ] `APPLE_ID`: Apple ID email used for notarization.
- [ ] `APPLE_PASSWORD`: Apple app-specific password, not the normal Apple ID password.
- [ ] `APPLE_TEAM_ID`: Apple Developer Team ID.

### Optional future signing

- [ ] Add Windows signing secrets only after Windows code signing is configured.
- [ ] Add update-hosting secrets only after an auto-update host is configured.

## Apple Developer setup

- [ ] Enroll in the Apple Developer Program.
- [ ] Create or verify a `Developer ID Application` certificate.
- [ ] Export the certificate as a `.p12` file with a strong password.
- [ ] Base64-encode the `.p12` file and save it as `APPLE_CERTIFICATE`.
- [ ] Generate an Apple app-specific password and save it as `APPLE_PASSWORD`.
- [ ] Save the Apple Developer Team ID as `APPLE_TEAM_ID`.
- [ ] Confirm the app bundle ID `one.intelligence.start` is registered or allowed.
- [ ] Verify notarization succeeds in GitHub Actions before announcing a release.

## Release flow

- [ ] Run a clean install with `pnpm install --frozen-lockfile`.
- [ ] Run `pnpm check`.
- [ ] Run `pnpm build`.
- [ ] Update the root, desktop, and mobile versions when cutting a release.
- [ ] Create and push a release tag such as `v0.1.0`.
- [ ] Run the `Release` GitHub Action from the tag.
- [ ] Confirm generated artifacts are attached to the GitHub Release.

## Final QA

- [ ] Test the macOS Apple Silicon build.
- [ ] Test the macOS Intel build if Intel is supported.
- [ ] Test the Windows installer on a clean Windows machine.
- [ ] Test the Linux AppImage on a clean Linux environment.
- [ ] Confirm the app launches without development environment variables.
- [ ] Confirm API key and subscription login flows work in packaged builds.
- [ ] Confirm no local-only files are required at runtime.
- [ ] Confirm secrets are never written to logs.
- [ ] Add `SECURITY.md` with vulnerability reporting instructions if desired.
