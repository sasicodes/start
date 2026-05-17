# Pi.dev Desktop

Minimal Electron desktop foundation for Pi.dev-powered developer workflows.

## Stack

- Electron latest: desktop runtime
- electron-vite latest: fast dev/build pipeline
- TypeScript latest: strict main, preload, renderer typing
- Preact latest: React-compatible UI with a much smaller renderer bundle
- electron-builder latest: packaging with ASAR and tight file includes

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm package   # unpacked local app
pnpm dist      # distributables
```

## Bundle-size choices

- Preact instead of React for a smaller renderer baseline.
- No UI framework yet; design tokens and CSS are local.
- Electron security defaults: context isolation, sandbox, no Node in renderer.
- `electron-builder.files` includes only `out/**` and `package.json`.
- Source maps and compressed-size reporting are disabled for production builds.

## Bun / Node / Electron

Electron embeds Chromium and Node.js. The main and preload processes run on Electron's Node runtime, not Bun. Bun can still be used as a package manager or script runner, but production Electron apps should not assume Bun APIs exist at runtime unless a separate Bun sidecar binary is shipped.

Recommended default here: `pnpm` + Electron Node runtime. If startup and installed size become the top priority, evaluate Tauri as a separate track; it will usually ship smaller apps than Electron.
