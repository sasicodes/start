**Start**, your coding assistant.

```text
.
├── packages/
│   ├── desktop/
│   ├── mobile/
│   └── web/
├── patches/
└── scripts/
```

Use pnpm.

- install: `pnpm install`
- desktop: `pnpm dev` or `pnpm desktop`
- mobile: `pnpm mobile`
- web: `pnpm web`
- check: `pnpm check`
- build: `pnpm build`
- package desktop: `pnpm package`
- desktop distributables: `pnpm dist`

Keep direct dependency versions pinned exactly. If `pnpm-lock.yaml` changes intentionally, commit with `ALLOW_LOCKFILE_CHANGE=1`.

Do not commit secrets, local paths, certificates, or personal email addresses.
