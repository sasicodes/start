Start, your coding assistant.

Start is a desktop and mobile coding assistant.

```text
.
├── packages/
│   ├── desktop/
│   └── mobile/
├── patches/
└── scripts/
```

Use pnpm.

- install: `pnpm install`
- desktop: `pnpm dev` or `pnpm desktop`
- mobile: `pnpm mobile`
- check: `pnpm check`
- build: `pnpm build`
- package desktop: `pnpm package`
- desktop distributables: `pnpm dist`

Keep direct dependency versions pinned exactly. If `pnpm-lock.yaml` changes intentionally, commit with `ALLOW_LOCKFILE_CHANGE=1`.

Do not commit secrets, local paths, certificates, or personal email addresses.
