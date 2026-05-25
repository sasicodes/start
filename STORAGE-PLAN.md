# start storage plan

Decoupling Start from Pi's default directories and moving owned state into `~/.start/`. We keep the Pi SDK as our agent harness — only the storage layers change.

---

## scope

**Keep using the Pi SDK** as our harness. Specifically: `createAgentSession`, tools, OAuth providers + local callback server, model registry, `SessionManager`, `SettingsManager`, `AuthStorage`, `ExtensionRunner` (categories 1–4: tools, prompt templates, slash commands, hooks). Their internals are stable and battle-tested; we don't reinvent them.

**Replace the storage backends** that those SDK objects use, via the SDK's own `fromStorage` / constructor-injection points. No patches to the SDK source.

**Replace Pi's default system prompt** (mentions Pi by name, points the LLM at internal Pi docs about TUI/themes/keybindings). See the system-prompt section below.

**Drop everything Pi-CLI-specific** that has no meaning in an Electron app: TUI mode, interactive mode, RPC mode, Pi's themes, TUI keybindings, project-local `.pi/` lookups, packages (npm/git) installer.

---

## final on-disk layout

`<baseDir>` is `~/.start` for packaged builds and `~/.start-dev` for dev builds (see the dev/prod isolation section below). All paths shown use `<baseDir>` so the layout is identical in both modes.

```
<baseDir>/
  state.db              SQLite (WAL) — app state, settings, encrypted auth,
                        + session pointer index (one row per session, path → JSONL)
  agent/
    sessions/           JSONL files — Pi's SessionManager writes here unchanged
      --<encoded-cwd>--/
        <session-id>.jsonl
  prompts/              .md slash-command templates (frontmatter + body)
  cache/                existing
  logs/app.log          existing

OS keychain
  "<appName> Safe Storage"   16-byte AES key. appName is "Start" in prod, "Start-Dev" in dev,
                              so the two builds have separate keychain entries and never share creds.

<cwd>/.agents/skills/   project-local skills (cross-harness standard, loaded by Pi)
<cwd>/AGENTS.md         project context (loaded by Pi)
<cwd>/CLAUDE.md         project context (loaded by Pi)
```

Nothing under `~/.pi/` is read or written. Nothing under `<cwd>/.pi/` is read or written.

---

## dev vs prod isolation

A dev build crashing, schema-migrating wrong, or writing corrupt data must never affect prod data on the same machine. Two changes accomplish this:

**1. Base directory switches on `app.isPackaged`.** Compute once in `main/environment.ts` before anything else loads:

```ts
import { app } from 'electron';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const baseDir = join(homedir(), app.isPackaged ? '.start' : '.start-dev');
```

Every other path in the codebase derives from `baseDir`. The `state.db`, `agent/`, `prompts/`, `cache/`, `logs/` subtrees are fully duplicated between `~/.start/` and `~/.start-dev/`. They never see each other.

**2. App name switches in dev** so the keychain entry name differs:

```ts
if (!app.isPackaged) app.setName('Start-Dev');   // before app.whenReady() and before any safeStorage call
```

This makes Electron register the keychain entry as `"Start-Dev Safe Storage"` in dev, `"Start Safe Storage"` in prod. Two separate ciphertext keys → a dev build literally cannot decrypt prod credentials (or vice versa). It also means devs don't trigger keychain prompts on prod's entry when running an unsigned dev binary.

The SQLite WAL sidecars (`state.db-wal`, `state.db-shm`) follow the `.db` file location automatically — no extra config. JSONL files, models.json, and prompts/ all naturally land in the right tree because we always resolve from `baseDir`.

For test runs we use `tmpdir()`, not either of these, so tests don't pollute either tree.

---

## sessions: hybrid (JSONL files + SQLite pointer index)

This is the Codex pattern. Messages live in append-only JSONL files; SQLite holds one row per session with the file path and metadata for fast queries. Best of both worlds:

- **Per-session JSONL file** = the source of truth for message history. Append-only, OS-buffered, no DB lock contention per-session, crash-safe at the line level. Pi's `SessionManager` writes these unchanged — we don't replace it.
- **`sessions` table in `state.db`** = pointer index. One row per session: `id`, `cwd`, `file_path`, `name`, `created_at`, `modified_at`, `message_count`, `first_message`. Updated transactionally on lifecycle events.

What this buys us vs full-SQLite-for-sessions:

- **Streaming writes never hit SQLite.** Pi's `appendMessage` writes one JSONL line per logical entry; the only SQLite write per turn is one `UPDATE sessions SET modified_at = ?, message_count = ? WHERE id = ?`.
- **Listing is one indexed query.** `SELECT … FROM sessions WHERE cwd = ? ORDER BY modified_at DESC LIMIT ?` — no JSONL scan, no fs.readdir.
- **Loading a session is one file read** when the user opens it — exactly what Pi already does.
- **No `StartSessionManager` to write.** Pi's `SessionManager` keeps doing what it does well; we just shadow it with the pointer index.

What this loses vs full-SQLite-for-sessions:

- Full-text search across all session messages requires walking JSONL files (or pre-indexing into an FTS table later if we want it)
- Backup is two things, not one (`state.db` + `sessions/` dir) — but they live in the same `~/.start/` folder so `cp -r ~/.start` covers both

**The bloat trap we still avoid:** Codex's 338 MB `logs_2.sqlite` was telemetry, not sessions. We never add a telemetry log DB. The `sessions` pointer table grows by ~200 bytes per session — 10,000 sessions = ~2 MB.

---

## what goes in `state.db`

One SQLite file. `better-sqlite3` (synchronous, fastest Node binding, perfect for the Electron main process).

### schema

```sql
-- schema versioning
CREATE TABLE schema_version (version INTEGER PRIMARY KEY);

-- generic kv for app state (replaces ~/.start/state.json)
CREATE TABLE app_state (
  key        TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
-- keys: composer_shortcut, last_workspace, selected_model, selected_thinking_level,
--       workspace_bookmarks, session_notices

-- encrypted credentials (replaces auth.json)
CREATE TABLE auth (
  provider   TEXT PRIMARY KEY,
  ciphertext BLOB NOT NULL,         -- safeStorage.encryptString(JSON.stringify(credential))
  updated_at INTEGER NOT NULL
);

-- Note: there is no settings table. Pi's settings (compaction, retry, defaults,
-- transport, TUI knobs) are not user-facing in Start; we use Pi's hardcoded
-- defaults via SettingsManager.fromStorage(new InMemorySettingsStorage()).
-- Every user-facing preference (composer shortcut, selected model, thinking
-- level, workspace bookmarks) already lives in app_state.

-- Note: there is no models table and no models.json file. The supported
-- model list is a hardcoded TS constant at packages/desktop/src/main/models.ts.
-- When a new model ships (Claude N+1, GPT N+1, etc.) we add a line to the
-- array and release. No runtime config, no file I/O, no custom registry.


-- session pointer index — one row per session, `path` points at the JSONL.
-- Columns are intentionally minimal and precise; add more later when needed.
CREATE TABLE sessions (
  id                   TEXT    PRIMARY KEY,
  path                 TEXT    NOT NULL,                                      -- absolute path to the .jsonl file
  cwd                  TEXT    NOT NULL,
  title                TEXT,                                                  -- SessionInfoEntry name, else first user message (truncated)
  model_provider       TEXT,                                                  -- e.g. 'anthropic'
  model_id             TEXT,                                                  -- e.g. 'claude-opus-4-7'
  thinking_level       TEXT,                                                  -- 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
  total_input_tokens   INTEGER NOT NULL DEFAULT 0,
  total_output_tokens  INTEGER NOT NULL DEFAULT 0,
  archived             INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  archived_at          INTEGER,                                               -- NULL unless archived = 1
  app_version          TEXT,                                                  -- from app.getVersion() at session_start
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL
);

-- Partial indexes — most queries are over the non-archived set.
CREATE INDEX idx_sessions_cwd      ON sessions(cwd, updated_at DESC) WHERE archived = 0;
CREATE INDEX idx_sessions_updated  ON sessions(updated_at DESC)      WHERE archived = 0;
CREATE INDEX idx_sessions_archived ON sessions(archived, updated_at DESC);
```

Column reference:

| Column | Source | Updated on |
|---|---|---|
| `id` | Pi session id | session_start (INSERT) |
| `path` | `SessionManager.getSessionFile()` | session_start |
| `cwd` | Pi session header | session_start |
| `title` | `SessionInfoEntry.name` else first user message, truncated to ~120 chars, else `"Untitled session"` | session_info change, first user message |
| `model_provider`, `model_id` | latest `ModelChangeEntry` | session_start, model change |
| `thinking_level` | latest `ThinkingLevelChangeEntry` | session_start, thinking change |
| `total_input_tokens`, `total_output_tokens` | accumulated from `getLastAssistantUsage()` / turn-end usage event | turn_end |
| `archived`, `archived_at` | user action in UI | archive/unarchive (UI-driven) |
| `app_version` | `app.getVersion()` | session_start |
| `created_at` | wall clock | session_start |
| `updated_at` | wall clock | every UPDATE |

Authoritative data lives in the JSONL. These columns are derived; if `state.db` is wiped, a rebuild script walks `~/.start/agent/sessions/`, parses each file's header + last `ModelChangeEntry` / `ThinkingLevelChangeEntry` / message-with-usage, and repopulates the row. The reverse is never needed — every SQL update follows a successful JSONL write.

Adding columns later is cheap: SQLite `ALTER TABLE ADD COLUMN` is O(1). Likely future additions when we need them: `parent_session`, `last_context_window`, `last_context_used`, `message_count`, `total_cost_cents`, FTS5 virtual table over message bodies. No need to add them speculatively.

---

## env vars (set once, before any SDK call)

Pi reads several `process.env.PI_*` variables at static module init — passing options to `createAgentSession` does NOT propagate to those static reads (e.g. `SessionManager.listAll()` resolves the sessions dir via `getAgentDir()` → `process.env.PI_CODING_AGENT_DIR`). Set these at the very top of `main/environment.ts` (runs before any other main-process module):

```ts
process.env.PI_CODING_AGENT_DIR = join(baseDir, 'agent');   // baseDir is .start or .start-dev
process.env.PI_OFFLINE = '1';                               // no package installs, no network probes
process.env.PI_SKIP_VERSION_CHECK = '1';                    // no Pi self-update lookups
process.env.PI_TELEMETRY = '0';                             // no install telemetry
```

Effect of `PI_CODING_AGENT_DIR`: every static path resolution inside the SDK (`getAgentDir`, `getSessionsDir`, `getAuthPath`, `getModelsPath`, `getSettingsPath`, `getPromptsDir`, `getToolsDir`, `getBinDir`, `getCustomThemesDir`, `getDebugLogPath`) returns `<baseDir>/agent/...`. We don't need to pass `agentDir` or `sessionDir` to most SDK calls afterward — they all pick up the env.

`PI_CODING_AGENT_SESSION_DIR` is *not* consumed by the SDK code path (CLI-only). Skip it.

Don't set `PI_CODING_AGENT` — that's the CLI-mode marker.

---

## SDK wiring (one place)

Initialize once in `main/chat.ts`:

```ts
const db = openStartDb();                                 // PRAGMAs applied
const authStorage = AuthStorage.fromStorage(new KeychainAuthBackend(db));
const settingsManager = SettingsManager.fromStorage(new InMemorySettingsStorage());   // Pi defaults; nothing persisted
const modelRegistry = ModelRegistry.create(authStorage);   // built-in models only; no models.json on disk
// UI picker is filtered against the hardcoded `models` constant in main/models.ts

const startAgentDir = join(baseDir, 'agent');
const startPromptsDir = join(baseDir, 'prompts');
const projectSkillsDir = join(cwd, '.agents', 'skills');

const loader = new DefaultResourceLoader({
  cwd,
  agentDir: startAgentDir,
  noExtensions: false,            // keep cats 1-4: tools, prompts, slash commands, hooks
  noPromptTemplates: false,
  noThemes: true,
  noSkills: false,
  noContextFiles: false,          // keep AGENTS.md/CLAUDE.md walk
  systemPrompt: buildStartSystemPrompt({ toolSnippets, selectedTools }),
  appendSystemPrompt: [],         // explicitly empty — suppresses <cwd>/.pi/APPEND_SYSTEM.md reads
  additionalSkillPaths: [projectSkillsDir],
  additionalPromptTemplatePaths: [startPromptsDir],
  skillsOverride: (base) => ({
    ...base,
    skills: base.skills.filter(s => s.sourceInfo.path.startsWith(projectSkillsDir))
  }),
  promptsOverride: (base) => ({
    ...base,
    prompts: base.prompts.filter(p => p.sourceInfo.path.startsWith(startPromptsDir))
  }),
  extensionsOverride: (base) => ({
    ...base,
    extensions: base.extensions.filter(e => !e.sourceInfo?.path.includes(`${sep}.pi${sep}`))
  }),
});
await loader.reload();

await createAgentSession({
  cwd,
  agentDir: startAgentDir,
  authStorage,
  settingsManager,
  modelRegistry,
  resourceLoader: loader,
  sessionManager: SessionManager.create(cwd),     // Pi's SessionManager unchanged; sessionDir resolves via PI_CODING_AGENT_DIR env var
});
```

The three filters collectively guarantee nothing under `<cwd>/.pi/` is admitted: skills must start with `<cwd>/.agents/skills/`, prompts must start with `~/.start/prompts/`, extensions cannot contain `/.pi/` in their source path. Combined with `systemPrompt` and `appendSystemPrompt: []` (which short-circuit `<cwd>/.pi/SYSTEM.md` and `<cwd>/.pi/APPEND_SYSTEM.md` reads), and `noThemes: true` (which skips the themes scan entirely), `<cwd>/.pi/` is fully ignored even if it exists on disk because the user also runs Pi CLI.

OAuth: keep Pi's built-in providers (`anthropic`, `github-copilot`, `openai-codex`). Pi spins up `http://localhost:<port>/callback` — fine in Electron. The UI callbacks (`onAuth`, `onPrompt`, `onProgress`, `onManualCodeInput`) are already implemented in `chat.ts`; nothing changes there.

---

## system prompt

The default Pi system prompt opens with `"You are an expert coding assistant operating inside pi, a coding agent harness."` and includes a large block telling the LLM to read Pi-internal docs about TUI components, themes, keybindings, packages, and extensions. None of that is relevant in Start.

We replace the prompt with our own builder at `packages/desktop/src/main/system-prompt.ts` (`buildStartSystemPrompt`). It produces:

```
You are an expert coding assistant. You help users by reading files, executing
commands, editing code, and writing new files.

Available tools:
- read: ...           (dynamic from toolSnippets)
- bash: ...
- edit: ...
- write: ...

In addition to the tools above, you may have access to other custom tools
depending on the project.

Guidelines:
- Prefer grep/find/ls tools over bash for file exploration ...
- Be concise in your responses
- Show file paths clearly when working with files

Documentation:
- Skills are custom expertise the user can teach the agent. When the user asks
  to create a skill, place it at <cwd>/.agents/skills/<skill-name>/SKILL.md ...
- Prompts are reusable slash commands invoked as /name. When the user asks to
  create a prompt, place it at ~/.start/prompts/<name>.md ...
- Project context: AGENTS.md and CLAUDE.md files in or above the current
  working directory are auto-loaded into context ...
```

The SDK still auto-appends `<project_context>` (AGENTS.md/CLAUDE.md), the skills section, current date, and cwd — those don't live in our string.

Pi's reference at [`pi/packages/coding-agent/src/core/system-prompt.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/system-prompt.ts).

---

## extensions (categories 1–4)

Pi extensions ship as JS modules registering one or more of: tools, prompt templates, slash commands, hooks, system-prompt mutations, TUI widgets, themes, keybindings. Categories 5 (TUI) and 6 (themes/keybindings) don't exist in Electron and are dropped silently. Categories 1–4 are pure logic and work as-is once we keep `noExtensions: false`.

Hooks (`BeforeAgentStartEvent`, `BeforeProviderRequestEvent`, `TurnStartEvent`, `TurnEndEvent`, `SessionBeforeCompactEvent`, etc.) fire regardless of UI; mutations to system prompt or request body apply transparently. If a hook wants to surface a message to the user it calls `session.sessionManager.appendCustomMessageEntry(...)`, which already renders in our chat panel like any other message.

Extensions load from Pi's default discovery paths under `agentDir` — fine because we point `agentDir` at `~/.start/agent/`. No project-level `.pi/extensions/` is read.

---

## custom tool event rendering

Every tool call in Pi emits a typed event over the event bus. Start's existing renderer (`main/tool-details.ts` + `main/details.ts`) handles all of Pi's built-in tools. Custom-tool events (from extensions) flow through the same path; the only thing missing is good fallback rendering when we don't know the shape.

### events we render natively (built-in tools)

| Event | Renderer | Detail body |
|---|---|---|
| `ReadToolCallEvent` | "Explored file `<path>`" / "Could not explore file …" | line range preview |
| `BashToolCallEvent` | "Ran command `<cmd>`" | stdout/stderr collapsed |
| `EditToolCallEvent` | "Modified file `<path>`" + `+N -M` stats | diff in diff panel |
| `WriteToolCallEvent` | "Wrote file `<path>`" + byte count | new file content |
| `GrepToolCallEvent` | "Searched files for `<pattern>`" | hit list |
| `FindToolCallEvent` | "Found files matching `<pattern>`" | path list |
| `LsToolCallEvent` | "Explored folder `<path>`" | tree listing |

### custom-tool events (extensions)

`CustomToolCallEvent` + `ToolResultEvent` + `AgentToolResult` carry an opaque `details` payload (tool's own shape). Rendering strategy for v1:

1. **Title** — `"Used <toolName>"` (or `"<toolName> failed"` on error). Already done by `toolResultTitle`.
2. **Body** — pass `details` through `previewValue` (existing summarizer in `main/details.ts`). It produces a truncated JSON-ish summary that always renders something legible regardless of shape.
3. **Special-case the obvious shapes** (cheap recognition, no schema enforcement):
   - `{ markdown: string }` or `{ kind: 'markdown', content: string }` → markdown render via Streamdown
   - `{ url: string, mime: 'image/*' }` or `{ kind: 'image', url }` → inline image
   - `{ code: string, language: string }` or `{ kind: 'code', content, language }` → syntax-highlighted code block
   - `{ text: string }` or plain string → markdown render
   - anything else → `previewValue` fallback (collapsed JSON)

### other event types that already render

| Event | Path |
|---|---|
| `SessionMessageEntry` (assistant text / thinking) | renderer chat stream |
| `CustomMessageEntry` from extensions | renderer chat stream (uses `display` flag) |
| `ModelChangeEntry`, `ThinkingLevelChangeEntry` | inline status pill |
| `CompactionEntry`, `BranchSummaryEntry` | collapsed summary card |
| `SessionInfoEntry` | session title in tab |
| `LabelEntry` | bookmark marker on the entry |

### lifecycle events (no user-facing render)

`AgentStartEvent`, `AgentEndEvent`, `TurnStartEvent`, `TurnEndEvent`, `BeforeAgentStartEvent`, `BeforeProviderRequestEvent`, `SessionStartEvent`, `SessionShutdownEvent`, `SessionBeforeCompactEvent`, `SessionCompactEvent`, `SessionBeforeForkEvent`, `SessionBeforeSwitchEvent`, `SessionBeforeTreeEvent`, `SessionTreeEvent`, `ContextEvent`, `InputEvent`, `UserBashEvent` — these drive runtime state (generating indicators, queue updates, context usage badges) but are not chat messages. Existing wiring in `main/chat.ts` already handles them.

---

## keychain encryption (the auth blob)

We use Electron's built-in `safeStorage`. **No `keytar`, no native module.**

Model is envelope encryption:
- One AES-128 key per app lives in the OS keychain (`"Start Safe Storage"` in prod, `"Start-Dev Safe Storage"` in dev)
- That key is read **once per process start**, cached in-memory by Electron
- Ciphertext goes into the `auth.ciphertext` BLOB column

Rules to make it silent (no popups):
- All `safeStorage` calls happen **after `app.whenReady()`**, never before
- App must stay signed with a **stable Apple Team ID** across releases; keychain ACL is bound to the code signature
- Linux fallback detection: `safeStorage.getSelectedStorageBackend() === 'basic_text'` means no secret service — refuse to persist, force re-login per session

```ts
// KeychainAuthBackend (sketch)
class KeychainAuthBackend implements AuthStorageBackend {
  constructor(private db: Database) {}

  withLock<T>(fn: (current: string | undefined) => LockResult<T>): T {
    const row = this.db.prepare('SELECT ciphertext FROM auth WHERE provider = ?').get('__all__');
    const current = row ? safeStorage.decryptString(row.ciphertext) : undefined;
    const { result, next } = fn(current);
    if (next !== undefined) {
      const ciphertext = safeStorage.encryptString(next);
      this.db.prepare(
        'INSERT OR REPLACE INTO auth (provider, ciphertext, updated_at) VALUES (?, ?, ?)'
      ).run('__all__', ciphertext, Date.now());
    }
    return result;
  }
  // withLockAsync: same shape with await
}
```

Single-row store (`provider = '__all__'`) mirrors Pi's `auth.json` semantics — the whole credential set is one document. Simpler, matches `AuthStorageBackend`'s lock contract exactly.

---

## performance disciplines

These exist to prevent the Codex-style RAM/CPU bloat. None of them are optional.

### SQLite setup (once, at boot)

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous  = NORMAL;        -- durable enough, ~10× faster than FULL
PRAGMA mmap_size    = 268435456;     -- 256 MB read mmap
PRAGMA cache_size   = -64000;        -- 64 MB page cache
PRAGMA temp_store   = MEMORY;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

### write rules

- **Never write per-token to SQLite.** Streaming text deltas go renderer-direct via IPC. Pi's `SessionManager` appends to JSONL at message boundaries — let that happen.
- SQLite writes only at logical event boundaries: session create, model change, settings change, auth change, message complete, tool-call complete, session rename.
- Multi-row writes always wrapped in `db.transaction()` — one `BEGIN`/`COMMIT` per logical unit.
- Prepared statements cached at module load. Never `db.prepare()` in a hot path.

### read rules

- Recent sessions list reads `session_index`, not JSONL files. Pagination is `LIMIT ? OFFSET ?` on the indexed `modified_at DESC`.
- Active session entries come from `SessionManager` (already in-memory per session).
- Settings/auth/models read once at boot, cached in-memory; invalidate cache on write.

### session pointer sync (hook into Pi's event bus)

Every event handler does Pi's JSONL write first, then our SQL update. All updates use cached prepared statements; one statement per event. Every UPDATE also sets `updated_at = ?`.

| Trigger | SQL effect |
|---|---|
| `session_start` | `INSERT INTO sessions (id, path, cwd, model_provider, model_id, thinking_level, app_version, created_at, updated_at) VALUES (...)` |
| first user message in this session | `UPDATE sessions SET title = COALESCE(NULLIF(title, ''), ?), updated_at = ? WHERE id = ?` (truncated message text) |
| `appendSessionInfo` | `UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?` (user-set title wins over auto-derived) |
| `appendModelChange` | `UPDATE sessions SET model_provider = ?, model_id = ?, updated_at = ? WHERE id = ?` |
| `appendThinkingLevelChange` | `UPDATE sessions SET thinking_level = ?, updated_at = ? WHERE id = ?` |
| `turn_end` | `UPDATE sessions SET total_input_tokens = total_input_tokens + ?, total_output_tokens = total_output_tokens + ?, updated_at = ? WHERE id = ?` (one UPDATE per turn — never per delta) |
| user archives in UI | `UPDATE sessions SET archived = 1, archived_at = ?, updated_at = ? WHERE id = ?` |
| user unarchives in UI | `UPDATE sessions SET archived = 0, archived_at = NULL, updated_at = ? WHERE id = ?` |
| `session_shutdown` | defensive `updated_at` flush (row should already be current) |

If a SQL update fails (e.g. DB temporarily locked), the JSONL is still authoritative and a rebuild recovers the row. Pi never knows about SQL — it just emits events.

Rebuild script (`scripts/rebuild-session-index.ts`): walks `~/.start/agent/sessions/`, parses each JSONL for its header + most recent `ModelChangeEntry` / `ThinkingLevelChangeEntry` / `SessionInfoEntry` / first user message / accumulated token usage, repopulates `sessions` in one transaction. Used for migration, recovery, and tests.

### periodic maintenance

- `PRAGMA optimize` on graceful shutdown
- `PRAGMA wal_checkpoint(TRUNCATE)` weekly (timer in main process; cheap)
- Optional: archive sessions older than N days to `~/.start/sessions/archived/<year>/` (default: never; user-toggleable later)

### memory rules

- Don't load all sessions into memory — `SessionManager` already loads per-session lazily
- For "recents" UI: query `session_index`, render with virtual scrolling (already done)
- Don't hold `Buffer` decrypts of auth in long-lived variables; let the SDK manage credential lifetime

---

## what we drop

| Dropped | Replaced by |
|---|---|
| `~/.pi/agent/auth.json` | `state.db.auth` + `safeStorage` |
| `~/.pi/agent/settings.json` | nothing — `SettingsManager.fromStorage(new InMemorySettingsStorage())` uses Pi defaults (compaction, retry, etc.) in code, never persisted |
| `~/.pi/agent/models.json` | hardcoded `models` constant in `main/models.ts` — bumped manually when new models ship |
| `~/.pi/agent/sessions/*.jsonl` | `~/.start/agent/sessions/*.jsonl` (same JSONL, written by Pi's `SessionManager`; `state.db.sessions` adds a pointer index for fast listing) |
| `~/.pi/agent/skills/` (global) | not loaded |
| `~/.pi/agent/prompts/` (global) | `~/.start/prompts/` |
| `~/.pi/agent/themes/`, `tools/`, `bin/`, `npm/`, `git/` | not loaded |
| Pi default system prompt | `buildStartSystemPrompt` in `main/system-prompt.ts` |
| `~/.pi/agent/SYSTEM.md`, `APPEND_SYSTEM.md` | not loaded |
| `<cwd>/.pi/*` (all) | not loaded |
| Pi CLI / TUI / RPC modes | dead code excluded at build time |
| `~/.start/state.json` | merged into `state.db.app_state` |

---

## migration

App is pre-production. **No migration code.** First launch after PR 1 lands creates a fresh `~/.start/sessions/` directory. After PR 2, `state.db` is created on first launch. Users re-login.

---

## PR sequence

### PR 1 — repoint Pi to our folder, drop `<cwd>/.pi/`, custom system prompt
Smallest, lowest-risk change. Pi keeps using its own JSON files for auth/settings/models AND its own JSONL for sessions, just under `~/.start/agent/` instead of `~/.pi/agent/`.

- Set env vars in `main/environment.ts`: `PI_CODING_AGENT_DIR`, `PI_OFFLINE`, `PI_SKIP_VERSION_CHECK`, `PI_TELEMETRY`
- Pass `agentDir: ~/.start/agent` on `createAgentSession` (belt-and-braces; the env var is the load-bearing one)
- Configure `DefaultResourceLoader`: skills filter, prompts filter, extensions filter, `noThemes`, `systemPrompt`, `appendSystemPrompt: []`
- Pass `systemPrompt: buildStartSystemPrompt(...)` (file already at `main/system-prompt.ts`)
- Verify: nothing under `~/.pi/` is touched and nothing under `<cwd>/.pi/` is read (audit with `fs.watch` on both during smoke test, including a project that has both `.pi/` and `.agents/` directories populated)

### PR 2 — `state.db` + encrypted auth + non-session custom backends
The substantial PR. Adds `better-sqlite3`, schema, three storage backends.

- Add `better-sqlite3` dependency (note: native module — confirm electron-builder rebuild step)
- Schema (`schema_version`, `app_state`, `auth`) + migration runner — three tables only
- `KeychainAuthBackend` using `safeStorage`
- Wire `SettingsManager.fromStorage(new InMemorySettingsStorage())` — Pi defaults for compaction/retry/transport, never persisted
- Add `main/models.ts` — hardcoded `models` array of supported provider/id pairs
- Wire `ModelRegistry.create(authStorage)` (built-ins only; no disk file); UI picker filters by `models.ts`
- Replace `~/.start/state.json` reads/writes with `app_state` table access (existing `storage.ts` becomes a thin wrapper)
- After this PR: no JSON files anywhere under `<baseDir>/agent/` — not auth, not settings, not models

### PR 3 — `sessions` pointer table + fast recents + archive flag
Adds the `sessions` table in `state.db` as a pointer index + denormalized metadata over Pi's JSONL files.

- Add `sessions` table (columns per the schema above: id, path, cwd, title, model_provider, model_id, thinking_level, total_input_tokens, total_output_tokens, archived, archived_at, app_version, created_at, updated_at)
- Hook Pi's event bus per the sync table — one prepared UPDATE statement per event
- Rewrite `chat/recents.ts` to query `sessions WHERE archived = 0` — `ORDER BY updated_at DESC LIMIT ? OFFSET ?` with cwd filter; all UI fields come from the row, no JSONL open
- Add archive/unarchive IPC handlers (sets `archived` + `archived_at`)
- Add a "Show archived" toggle in the recents UI (queries `archived = 1` instead)
- Replace `WorkspaceSessionWatcher`'s `fs.watch` with direct IPC emit after each pointer update
- Add `scripts/rebuild-session-index.ts` for recovery (walks JSONL dir, parses metadata, repopulates `sessions` in one transaction)
- After this PR: messages still live in JSONL (Pi unchanged), listing + session-card metadata is one indexed SQL query, file is opened only when the user enters the conversation

### PR 4 (optional) — Pi package dead-code exclusion
The shipping-size cleanup discussed separately. Patch `pi-coding-agent/dist/index.js` to drop TUI/Interactive/RPC re-exports; add electron-builder `files` exclusions for `dist/cli.*`, `dist/bun/**`, `dist/modes/interactive/components/**`, `dist/modes/rpc/**`. Realistic saving: 3–4 MB packaged size (measured `dist/modes/` is 3.2 MB).

---

## non-goals

- No full sessions in SQLite — messages stay in Pi's JSONL files; SQLite only holds the pointer row + denormalized metadata. We never write message content to a SQL row.
- No telemetry/event log DB (the Codex 338 MB trap). `state.db` only stores app state + the session pointer index
- No per-token DB writes — streaming deltas go renderer-direct via IPC; SQL UPDATEs happen at turn-end / model-change boundaries only
- No `keytar` / native keychain wrapper (Electron `safeStorage` is built-in and sufficient)
- No reading anything under `<cwd>/.pi/` (skills/prompts/extensions/SYSTEM.md/APPEND_SYSTEM.md). Project-level resources come only from `<cwd>/.agents/skills/` and `<cwd>/AGENTS.md`/`CLAUDE.md`
- No project-local `.start/` rename of `.pi/` — Pi hardcodes the constant; not worth a patch
- No data migration from `~/.pi/` — pre-production
- No multi-process DB access — Start is single-process; one `better-sqlite3` instance in the main process is enough

---

## acceptance criteria

After PR 3:

- Fresh-install packaged Start creates `~/.start/state.db` and `~/.start/agent/sessions/`; dev builds touch `~/.start-dev/` only
- Running a dev build never reads, writes, or deletes anything under `~/.start/` (verify by running prod first to populate, then `pnpm dev`, then checking prod tree unchanged)
- `~/.pi/` is never read or written, even when `~/.pi/agent/` exists from a Pi CLI install (verify with `fs.watch` audit)
- `<cwd>/.pi/` is never read, even when both `<cwd>/.pi/` and `<cwd>/.agents/` exist (smoke test with a project containing both)
- Auth credentials are encrypted at rest; opening `state.db` in a hex viewer shows no plaintext tokens
- Keychain entry `"Start Safe Storage"` exists in prod and `"Start-Dev Safe Storage"` in dev — two separate entries, never decrypt each other's blobs
- Recent sessions UI loads in <50ms for 1000+ sessions (single SQL query, zero JSONL opens)
- Session-card shows title, model, thinking level, token totals without opening the JSONL file
- Archive flow: setting `archived = 1` removes the session from default recents list immediately; "Show archived" toggle surfaces it
- Streaming a 10K-token response generates 0 SQL UPDATEs (events bus quiet between user message and turn_end); 1 UPDATE at turn_end
- 1 hour of active coding grows `state.db` by <1 MB; JSONL files grow proportional to actual message content
- No keychain password prompts on second-launch-and-beyond after install
- `scripts/rebuild-session-index.ts` can repopulate `sessions` from JSONL alone in a fresh DB and produce row counts/metadata identical to live-tracked state
