# start — your coding assistant

This repo is meant to be easy for agents to inspect and run.

Use `package.json` scripts first. Do not invent one-off commands unless a script is missing.

Install dependencies with `pnpm install`.

Run the desktop app with `pnpm dev` or `pnpm desktop`.

Run the mobile app with `pnpm mobile`.

Before finishing changes, run `pnpm check`.

Build everything with `pnpm build`.

Package the desktop app with `pnpm package`.

Create desktop distributables with `pnpm dist`.

Desktop code lives in `packages/desktop`.

Mobile code lives in `packages/mobile`.

Keep dependency versions pinned exactly. If a lockfile change is intentional, review it and commit with `ALLOW_LOCKFILE_CHANGE=1`.

Do not commit secrets, local machine paths, certificates, or personal email addresses. Release credentials belong in GitHub Actions secrets.

Runtime sign-in and API keys are configured inside the app, not in committed files.
