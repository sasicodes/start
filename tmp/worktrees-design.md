# Git worktrees for parallel sessions — design spec

Status: draft for discussion. Throwaway location (`tmp/`); delete at implementation time.

## 1. Motivation

The architecture **already runs multiple agent sessions concurrently**. This is
not a feature to be added — it exists today:

- A foreground `this.session` plus a `backgroundSessions` map hold many live
  `AgentSession`s at once (`chat.ts:239`).
- Each `send` call closes over its own `session` + `runtimeState` and runs
  `await session.prompt(...)` in its own async context (`chat.ts:1072-1133`).
  Switching workspace or tab parks the current session in `backgroundSessions`;
  it is **not** cancelled and keeps generating.
- `anyGenerating()` polls every background session (`chat.ts:1350`) and
  `getTabs()` reports backgrounded sessions as `'generating'` (`chat.ts:610`).
- Per-session output is already multiplexed: every event emits a `chat:scoped-*`
  keyed by `sessionId + workspacePath` regardless of focus (`chat.ts:1110/1116/1121`),
  while the foreground-only `chat:delta`/`done` stream is gated by
  `isActiveSession` (`chat.ts:1090`). A backgrounded session that finishes drops a
  **notice** instead (`setNotice(... 'completed')`, `chat.ts:1145/1177`).

The gap is **isolation**, not concurrency. Every session derives its `cwd` from
the single shared `workspaceCwd` (`chat.ts:1788`). Two agents generating at once
edit the **same working tree**, so concurrent file writes, staging, and branch
state collide. Worktrees give each parallel session its own branch + filesystem,
making the parallelism the arch already has **safe to use**.

## 2. Goals / non-goals

**Goals**

- Bind a session to an isolated git worktree (own branch, own working directory).
- Reuse the existing concurrency, tab, scoped-event, and notice plumbing as-is.
- Bounded, faithful git layer consistent with `git.ts` conventions.
- Lifecycle: create, reuse, list, reconcile orphans, clean up on dispose.

**Non-goals**

- Adding or changing the concurrency / event-multiplexing model.
- A general git UI (commit, push, rebase, conflict resolution).
- Cross-repo worktrees or non-git workspaces (degrade to plain `cwd`).
- Merge/PR orchestration — out of scope for this spec.

## 3. Current architecture (reference)

| Concern | Where | Notes |
| --- | --- | --- |
| Shared cwd | `chat.ts:228` `workspaceCwd` | single source for new session `cwd` |
| Session cwd | `chat.ts:1788`, `sessions.ts` registry (`getSession(id)?.cwd`) | per-session, currently equals `workspaceCwd` |
| Live sessions | `chat.ts:239` `backgroundSessions`, `chat.ts:240` `activeSessionByWorkspace` | many concurrent |
| Foreground stream | `chat:delta` / `done` / `error`, gated by `isActiveSession` | one at a time |
| Background stream | `chat:scoped-*` keyed `sessionId+workspacePath` + `setNotice` | always emitted |
| New session | `getSession()` `chat.ts:1779`, `createTab()` `chat.ts:624` | use `cwd = workspaceCwd` |
| Workspace switch | `switchWorkspace(cwd)` `chat.ts:836` | parks/restores per workspace |
| Git helpers | `main/git.ts` | `git(cwd,args,timeout)`, bounded by timeout + `maxBuffer` |

## 4. Design

### 4.1 Git layer (`main/git.ts`)

Add worktree primitives in the existing style: thin wrappers over the private
`git(cwd, args, timeout)` helper, bounded by timeout and `maxBuffer`, returning
typed values, swallowing errors to safe defaults (matching `getGitBranch`).

```ts
export interface GitWorktree {
  path: string;        // absolute working directory
  branch: string;      // refs/heads/... short name, or '' when detached
  head: string;        // short commit sha
  isMain: boolean;     // the primary worktree
  locked: boolean;
}

// `git worktree list --porcelain -z`, parsed into GitWorktree[].
export const listWorktrees = (cwd: string): Promise<GitWorktree[]>;

// `git worktree add --quiet [-b <branch>] <path> [<commitish>]`.
// Creates branch when `branch` is absent on the base ref; returns the new worktree.
export const addWorktree = (
  cwd: string,
  worktreePath: string,
  options?: { branch?: string; base?: string }
): Promise<GitWorktree | undefined>;

// `git worktree remove [--force] <path>` then `git worktree prune`.
export const removeWorktree = (
  cwd: string,
  worktreePath: string,
  options?: { force?: boolean }
): Promise<boolean>;
```

Notes:
- Parse `--porcelain -z` records (`worktree`/`HEAD`/`branch`/`bare`/`detached`/`locked`)
  rather than scraping human output.
- New timeout constant `gitWorktreeTimeoutMs` (worktree add does checkout I/O;
  give it ~10s, separate from the 1.2s default).
- `removeWorktree` refuses (returns `false`) when the tree is dirty unless
  `force`; never silently discard user work.
- All functions resolve the repo root via the main worktree's `cwd`; callers pass
  the session/workspace cwd.

### 4.2 Worktree root + naming

- Managed worktrees live under a single app-owned directory **outside** the repo
  working tree to avoid self-nesting and `.gitignore` churn:
  `<userData>/worktrees/<repoKey>/<slug>` where `repoKey` is a stable hash of the
  repo top-level path and `slug` is derived from the branch.
- Branch naming default: `start/<slug>` (kebab-case), `slug` from a short id or
  user-provided name. Persisted-key style per CLAUDE.md (`start:`-prefixed for any
  browser storage; this is filesystem/main, so just `start/` branch prefix).

### 4.3 Session ↔ worktree binding

A worktree is just a `cwd`. The binding rides on existing per-session cwd
tracking rather than a new parallel concept:

- New optional input on session creation paths (`createTab`, the `getSession`
  bootstrap) to launch a session in a managed worktree instead of `workspaceCwd`.
- When a session is bound to a worktree, its `cwd` is the worktree path; the
  registry already exposes this via `getSession(id)?.cwd` (`chat.ts:314`), and all
  scoped events already key on `workspacePath` — so a worktree session is just a
  session whose `workspacePath` is its worktree dir. **No event-layer change.**
- `activeSessionByWorkspace` continues to map each workspace path (now possibly a
  worktree path) to its active session, so park/restore works unchanged.

### 4.4 Lifecycle

1. **Create**: caller requests a worktree session → `addWorktree(repoCwd, path, {branch})`
   → create session with `cwd = worktree.path` (mirrors `createTab` at `chat.ts:624`,
   substituting the cwd). Reuse all downstream wiring
   (`subagentToolsOptions`, `activateWorkspaceAccess`, notices, tabs).
2. **Reuse**: if a session already exists for that worktree path, `activateTab`
   instead of creating a second (mirrors `backgroundSessionForWorkspace`,
   `chat.ts:1698`).
3. **Switch**: existing `switchWorkspace(worktreePath)` parks/restores; nothing new.
4. **Dispose / cleanup**: on session close, if its cwd is a managed worktree and
   the tree is clean, `removeWorktree`. If dirty, keep it and surface via list so
   work is never destroyed.
5. **Reconcile**: on startup, `listWorktrees` ∪ managed-root scan → drop registry
   entries whose worktree vanished; offer to prune managed worktrees with no
   session and a clean tree.

### 4.5 Persistence

- Track managed worktrees in app state keyed by `repoKey` → `{ path, branch,
  sessionId? }`. Reuse the existing app-state persistence used for workspace
  history (`persistWorkspace`, `chat.ts:855`). No new storage subsystem.

## 5. Phases

- **P1 — git layer**: `listWorktrees` / `addWorktree` / `removeWorktree` + porcelain
  parser + bounds. Unit-tested in isolation (no chat wiring). Ships independently.
- **P2 — session binding (core)**: launch a session with `cwd = worktree.path`;
  reuse-or-activate by path; park/restore via `switchWorkspace`. The only
  ChatService change of substance.
- **P3 — surface**: minimal renderer affordance to spawn a worktree session and
  switch to it; reuse tabs + `scoped-*` + notices. No new event channel.
- **P4 — cleanup & reconcile**: dispose-time removal (clean only), startup
  reconciliation, dirty-tree retention + listing.

## 6. Edge cases

- Non-git or bare workspace → no worktree; fall back to plain `workspaceCwd`.
- Branch already checked out in another worktree → git refuses; surface the error,
  offer to activate the existing worktree session.
- Dirty worktree on remove → refuse without `force`; never auto-discard.
- Repo top-level moves / worktree deleted on disk → reconciliation prunes stale
  registry entries.
- Nested/relative paths → always resolve absolute; keep managed root outside the
  repo tree.
- Concurrent `addWorktree` for the same slug → serialize per `repoKey`.

## 7. Testing

- Pure parser for `git worktree list --porcelain -z` → `GitWorktree[]`, covering
  detached, locked, bare, and branch records.
- `addWorktree` / `removeWorktree` against a temp git repo fixture (real git),
  asserting branch creation, reuse refusal, dirty-tree refusal, force removal.
- Binding-level: a session created in a worktree reports its worktree `cwd` and a
  second request for the same path activates rather than duplicates.
- Keep mocks faithful per CLAUDE.md (`util.promisify.custom` shape for any mocked
  `promisify(execFile)`).

## 8. Risks / trade-offs

- Disk usage: each worktree is a full checkout. Mitigate with cleanup + listing.
- Hooks/build artifacts per worktree may need per-tree install (e.g. node_modules)
  — out of scope; document as a known limitation.
- Orphaned worktrees if the app crashes mid-create — reconciliation covers this.

## 9. Open questions (need your call)

1. **Worktree root**: app `userData/worktrees/` (proposed) vs a sibling dir next to
   the repo vs inside `.git/`?
2. **Granularity**: one worktree per session, or per branch shared across sessions?
3. **Branch naming**: auto `start/<slug>` vs prompt the user each time?
4. **Cleanup default**: auto-remove clean worktrees on session close, or keep until
   explicit prune?
