# multi-agent workspaces plan

## goal

Support multitasking across workspaces and agents without stopping existing work. A user should be able to start an agent in one workspace, switch to another workspace, create another agent, and let both continue independently. A workspace can have many agents, and the app can have active agents across many workspaces.

## current state

`packages/desktop/src/main/chat.ts` currently models chat as one global active session:

- one `AgentSession | null`
- one `isGenerating` flag
- one queue
- one attachment store
- one active session id
- one current workspace cwd

That means the current behavior is intentionally single-lane:

- sending while generating queues onto the same session
- `newSession()` aborts and disposes the current session
- `switchWorkspace()` is blocked while generating
- changing model/auth can dispose the current session

This keeps the current UI stable, but it does not satisfy multi-agent multitasking.

## target model

The app should treat an agent tab as the main runtime unit. Completion awareness is a first-class part of this model: background work should leave a lightweight indicator until the user opens that session.

```txt
ChatService
  workspaces: Map<WorkspacePath, WorkspaceState>
  tabs: Map<TabId, AgentTab>
  activeTabId: TabId

WorkspaceState
  cwd: string
  tabIds: TabId[]

AgentTab
  id: TabId
  cwd: string
  session: AgentSession | null
  sessionManager: SessionManager
  status: idle | generating | aborting | completed | failed | disposed
  selectedModelKey: string
  thinkingLevel: EffortLevel
  queuedMessages: QueuedMessage[] for the visible active run
  queueDeliveryCandidates: QueuedMessage[] for the visible active run
  attachments: Map<AttachmentId, AttachmentRecord> for pending composer attachments
  webContentsIds: Set<number>

SessionNotice
  sessionId: string
  workspacePath: string
  kind: completed | failed
  createdAt: number
  seenAt?: number
```

A tab owns its own `AgentSession`, abort state, and streaming lifecycle. The compatibility UI keeps queue and attachment controls scoped to the visible active run while background runs continue isolated. Switching workspaces changes the visible workspace context only; it must not abort running tabs in other workspaces.

## SDK choice

Use `AgentSession` as the per-tab primitive. Do not use one global `AgentSessionRuntime`.

Reasoning:

- `AgentSessionRuntime` owns one active `runtime.session` and replaces it for new, resume, and import flows.
- The app needs many concurrent active sessions, often in different workspaces.
- A global runtime would fight the multitasking model.

## compatibility rule

Do not disrupt existing single-session behavior while migrating. The public IPC routes can continue to operate against the active tab until the renderer has a full tab UI.

Current IPC behavior should map as follows:

- `chat:send` sends to the active tab
- `chat:abort` aborts the active tab only
- `chat:new-session` creates a new tab in the active workspace and makes it active
- `chat:switch-workspace` changes the active workspace but does not abort existing tabs
- `chat:status` returns active tab/workspace status
- recent sessions remain workspace-scoped
- recent sessions can be loaded incrementally until every session is available

## migration phases

### phase 1: internal tab state with legacy IPC

Introduce an internal `AgentTab` controller while preserving all current IPC signatures.

- Model single-session fields as tab state and expose orchestration types.
- Keep one active tab by default.
- Make existing methods delegate to the active tab.
- Ensure `newSession()` creates a new tab instead of disposing unrelated tabs.
- Keep old single-window renderer behavior unchanged.

Acceptance criteria:

- existing UI still works
- `pnpm check` passes
- starting a new session no longer requires global state assumptions internally

### phase 2: workspace-aware tabs

Add workspace grouping and active workspace state.

- `switchWorkspace(cwd)` should activate or create a workspace bucket.
- if that workspace already has tabs, activate its most recent tab
- if it has no tabs, create an empty tab lazily
- do not abort generating tabs in other workspaces
- recent session watchers should be able to watch multiple active workspaces or update per workspace

Acceptance criteria:

- running tab in workspace A continues while user switches to workspace B
- workspace B can start its own session
- abort in workspace B does not abort workspace A

### phase 3: renderer tab API

Add explicit tab IPC without removing legacy IPC immediately.

Potential routes:

- `chat:tabs:list`
- `chat:tabs:create`
- `chat:tabs:activate`
- `chat:tabs:close`
- `chat:tabs:send`
- `chat:tabs:abort`
- `chat:tabs:open-session`
- `chat:tabs:status`
- `chat:sessions:page`
- `chat:notices:list`
- `chat:notices:mark-seen`

Events should include `tabId` and `workspacePath` so the renderer can route streaming updates correctly.

Acceptance criteria:

- multiple visible tabs can stream independently
- events from background tabs do not overwrite the active tab transcript
- tab close aborts/disposes only that tab
- background completion creates a session notice
- opening a noticed session clears only that session notice
- opening the Recents bubble does not clear row notices

### phase 4: orchestration features

Build user-facing multitasking features on top of tab sessions.

- run many agents in one workspace
- run many agents across workspaces
- background status indicators
- workspace-level activity summary
- complete infinite session history in Recents
- optional agent labels
- reusable commands to spawn agents from another agent when explicitly requested

## session list loading

The session list must be complete, even if it renders in chunks. It should not cap the available sessions at a fixed number such as 15 or 40.

Rules:

- The data source should be able to return every session for the selected workspace.
- The UI may render an initial slice for performance, for example 15 rows.
- Scrolling near the end should append the next slice automatically.
- Indicators must be computed against the available session records and remain stable as more rows are appended.
- Do not show placeholder rows, spinners, or hidden status text while loading more sessions.
- Opening the Recents bubble should show the first slice immediately from cached data when available, then refresh in the background.

Preferred IPC shape once the tab-aware API lands:

```ts
interface RecentSessionsPage {
  hasMore: boolean;
  sessions: RecentSession[];
}

interface RecentSessionsOptions {
  cursor?: string;
  limit?: number;
  workspacePath?: string;
}
```

Cursor should be based on stable sort position, not row count alone. A simple first version can use `modified` plus `id` as the cursor because recent sessions are sorted by newest modified time.

## completion indicators

Use a session-scoped notice store owned by the orchestrator. Name it by what the UI needs, not by implementation detail: `SessionNotice` for each unseen completion or failure.

Rules:

- When a tab finishes and it is not the active tab, create or update a `SessionNotice` keyed by `sessionId`.
- When the user opens that session, mark the notice seen and hide the dot for that row.
- Opening the Recents bubble does not clear session notices.
- The Recents bubble shows one dot when any visible recent session in the active workspace has an unseen notice.
- The workspace title shows one dot when any session in that workspace has an unseen notice.
- A workspace list item can also show the same dot when that workspace has unseen notices.
- If the completed tab is active when it finishes, do not create an unseen completion notice.
- If the user is viewing a session while it completes, it is already seen.

Preferred data shape:

```ts
interface SessionNotice {
  createdAt: number;
  kind: 'completed' | 'failed';
  sessionId: string;
  workspacePath: string;
  seenAt?: number;
}
```

Preferred derived state:

```ts
const hasSessionNotice = noticesBySessionId.has(session.id);
const hasWorkspaceNotice = noticesByWorkspacePath.has(workspacePath);
const hasRecentNotice = sessions.some((session) => noticesBySessionId.has(session.id));
```

Renderer placement:

- Session row: green dot at the right end of the row, aligned with the title/time block.
- Recents trigger: green dot near the top-right edge of the circular button.
- Workspace title: green dot next to the title, not inside the text.

Use the same semantic state for all three surfaces. Do not maintain separate booleans like `showRecentDot`, `showWorkspaceDot`, and `showSessionDot`; derive them from `SessionNotice`.

Initial implementation can keep the notice store in memory. Once the tab architecture is stable, persist it under a namespaced storage key so indicators survive app restart. The persisted key should use the app namespace, for example `start:session-notices`.

## event routing

Current events are emitted as global `chat:*` messages. Multi-agent mode needs scoped events.

Preferred payload shape:

```ts
interface ScopedChatEvent<T> {
  payload: T;
  tabId: string;
  workspacePath: string;
}
```

During compatibility mode, emit both if needed:

- old global event for active tab only
- scoped event for all tabs

This prevents background agents from corrupting the visible transcript.

## safety rules

- Never call `dispose()` on a session because the user switches workspace.
- Never use one global `isGenerating` to block work in another tab.
- Every running tab must clean up its own subscription.
- Every tab close must abort bash, abort model streaming, dispose the session, clear queue, and release attachments for the visible active tab when applicable.
- Auth/model changes should not silently destroy running sessions. If a model change applies globally, new tabs use it while existing running tabs finish with their current model.
- Workspace access should be activated for each workspace that has a live tab.
- Completion notices are session-scoped. Do not clear a workspace's notices as a side effect of opening Recents.
- A notice should be marked seen only when the user opens or activates the specific session it belongs to.

## first implementation target

The implementation keeps legacy chat behavior compatible while adding tab-shaped orchestration APIs, scoped events, persisted notices, incremental Recents loading, and a renderer tab strip.
