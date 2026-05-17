# Production Release Checklist

Use this checklist before publishing a production release of Start from this open-source repository.

## Repository readiness

- [ ] Confirm `package.json` has the intended public metadata:
  - [ ] `name`: `start`
  - [ ] `productName`: `Start`
  - [ ] `appId`: `one.intelligence.start`
  - [ ] `description`: `your coding agent`
  - [ ] `homepage`: `https://start.intelligence.one`
- [ ] Confirm the license is intentional for an open-source repository.
  - Current value: `UNLICENSED`
  - Change this before public release if the repo should be open-source licensed.
- [ ] Confirm no private credentials, internal URLs, local paths, developer account names, or company-only identifiers are committed.
- [ ] Confirm `README.md` explains installation, development, release channels, supported platforms, and security expectations.
- [ ] Confirm issue templates, contribution guide, code of conduct, and security policy are present if desired.
- [ ] Pin or intentionally manage production dependency versions instead of relying on broad `latest` ranges.
- [ ] Run a clean install before release:
  - [ ] `pnpm install --frozen-lockfile`
  - [ ] `pnpm check`
  - [ ] `pnpm build`

## GitHub repository settings

- [ ] Enable GitHub Actions for the repository.
- [ ] Set workflow permissions to allow release publishing:
  - [ ] Repository Settings → Actions → General → Workflow permissions → `Read and write permissions`
- [ ] Protect the main branch if desired.
- [ ] Decide whether releases are created only from tags such as `v0.1.0`.
- [ ] Confirm `.github/workflows/release.yml` is present and reviewed.

## Required GitHub Actions secrets

Add these in GitHub → Repository Settings → Secrets and variables → Actions.

### macOS signing and notarization

- [ ] `APPLE_CERTIFICATE`
  - Base64-encoded `.p12` Developer ID Application certificate.
- [ ] `APPLE_CERTIFICATE_PASSWORD`
  - Password used when exporting the `.p12` certificate.
- [ ] `APPLE_ID`
  - Apple ID email used for notarization.
- [ ] `APPLE_PASSWORD`
  - Apple app-specific password, not the normal Apple ID password.
- [ ] `APPLE_TEAM_ID`
  - Apple Developer Team ID.

### Optional release hosting

Only needed if publishing update metadata or artifacts to object storage/CDN.

- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_ENDPOINT`

### Not needed for Electron

These are Tauri-specific and are not required by this Electron release workflow.

- [ ] `TAURI_SIGNING_PRIVATE_KEY`
- [ ] `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## Apple Developer setup

- [ ] Enroll in the Apple Developer Program.
- [ ] Create or verify a `Developer ID Application` certificate.
- [ ] Export the certificate as a `.p12` file with a strong password.
- [ ] Base64-encode the `.p12` file and save it as `APPLE_CERTIFICATE`.
- [ ] Save the `.p12` export password as `APPLE_CERTIFICATE_PASSWORD`.
- [ ] Generate an Apple app-specific password:
  - Apple Account → Sign-In and Security → App-Specific Passwords
  - Save it as `APPLE_PASSWORD`.
- [ ] Save the Apple Developer Team ID as `APPLE_TEAM_ID`.
- [ ] Confirm the Electron app bundle ID is registered/allowed:
  - `one.intelligence.start`
- [ ] Verify local or CI notarization succeeds at least once before announcing the release.

## Windows release readiness

- [ ] Decide whether Windows builds will be code-signed.
- [ ] If code signing is required, obtain a Windows code signing certificate.
- [ ] Add Windows signing configuration to `electron-builder`.
- [ ] Add required Windows certificate secrets to GitHub Actions.
- [ ] Test installing the generated `.exe` on a clean Windows machine.
- [ ] Verify SmartScreen behavior and publisher identity.
- [ ] Confirm NSIS installer behavior:
  - [ ] Install
  - [ ] Launch after install
  - [ ] Uninstall
  - [ ] Upgrade over an older version

## Linux release readiness

- [ ] Confirm AppImage output works on common Linux distributions.
- [ ] Decide whether to publish additional Linux formats such as `.deb` or `.rpm`.
- [ ] If publishing `.deb` or `.rpm`, add them to `electron-builder` config and the workflow artifact paths.
- [ ] Test the AppImage on a clean Linux environment.
- [ ] Confirm desktop entry, icon, app category, and executable name are correct.
- [ ] Decide whether Linux artifacts need GPG signing.

## Cross-platform QA

- [ ] macOS Apple Silicon install test.
- [ ] macOS Intel install test, if supporting Intel.
- [ ] Windows x64 install test.
- [ ] Linux x64 AppImage test.
- [ ] Confirm the app launches without development environment variables.
- [ ] Confirm renderer devtools are disabled in packaged builds.
- [ ] Confirm app icons appear correctly in dock/taskbar/app launcher.
- [ ] Confirm transparent window backgrounds render correctly on all supported platforms.
- [ ] Confirm global shortcut registration works.
- [ ] Confirm changing the global shortcut works.
- [ ] Confirm tray/status item appears and menu actions work.
- [ ] Confirm app quit behavior works on each platform.
- [ ] Confirm external links open in the default browser and not inside the app.
- [ ] Confirm API key/subscription login flows work in packaged builds.
- [ ] Confirm no local-only files are required at runtime.

## Release versioning

- [ ] Decide the version number.
- [ ] Update `package.json` version.
- [ ] Commit the version change.
- [ ] Create an annotated or lightweight tag:

```sh
git tag v0.1.0
git push origin v0.1.0
```

- [ ] Run the `Release` GitHub Action from the tag, or push the tag and allow the workflow to publish from tags.
- [ ] Confirm generated artifacts are attached to the GitHub Release.

## Artifact checks

- [ ] macOS `.dmg` is present.
- [ ] Windows `.exe` installer is present.
- [ ] Linux `.AppImage` is present.
- [ ] macOS artifact is signed.
- [ ] macOS artifact is notarized.
- [ ] Artifact names are clear and versioned.
- [ ] Checksums are generated or GitHub release artifact hashes are documented if desired.

## macOS verification commands

After downloading the release artifact on macOS:

```sh
spctl -a -vvv -t install path/to/Start.dmg
```

After installing the app:

```sh
spctl -a -vvv -t exec /Applications/Start.app
codesign --verify --deep --strict --verbose=2 /Applications/Start.app
```

## Update strategy

- [ ] Decide whether the app supports auto-update.
- [ ] If using GitHub Releases for updates, configure Electron auto-updater and `electron-builder` publish settings.
- [ ] If using R2/CDN for updates, configure upload steps and update metadata.
- [ ] If no auto-update is planned, document manual update instructions in the README.
- [ ] Keep the disabled `Check for Updates` menu item disabled until update support exists.

## Security and privacy

- [ ] Confirm preload exposes only the intended API surface.
- [ ] Confirm renderer cannot access Node.js APIs directly.
- [ ] Confirm all IPC handlers validate or constrain sensitive inputs.
- [ ] Confirm command execution behavior is intentional and documented.
- [ ] Confirm secrets are never written to logs.
- [ ] Confirm user credentials/API keys are stored intentionally and securely.
- [ ] Add a `SECURITY.md` with vulnerability reporting instructions.

## Final pre-release gate

- [ ] Fresh clone builds successfully.
- [ ] `pnpm install --frozen-lockfile` succeeds.
- [ ] `pnpm check` succeeds.
- [ ] GitHub Actions release workflow succeeds on macOS, Windows, and Linux.
- [ ] All produced artifacts have been manually smoke-tested.
- [ ] Release notes are reviewed.
- [ ] Download links are verified.
- [ ] Public documentation is updated.
