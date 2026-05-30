import electron from 'electron';

const { contextBridge, ipcRenderer, webUtils } = electron;

export interface AppSettings {
  composerShortcut: string;
}

export interface AppSettingsResult {
  ok: boolean;
  error?: string;
  settings: AppSettings | null;
}

export interface ChatStatus {
  ready: boolean;
  error?: string;
  sessionId?: string;
  modelLabel?: string;
  workspacePath: string;
  isGenerating?: boolean;
  contextPercent?: number;
  selectedModelKey?: string;
  thinkingLevel?: EffortLevel;
}

export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh';

export interface ModelOption {
  id: string;
  key: string;
  name: string;
  provider: string;
  isCustom?: boolean;
  reasoning: boolean;
  contextWindow: number;
  effortLevels: EffortLevel[];
  input: ('text' | 'image')[];
}

export type ProviderAuthKind = 'api_key' | 'none' | 'subscription' | 'unknown';

export interface ProviderAuthStatus {
  key: string;
  name: string;
  label: string;
  kind: ProviderAuthKind;
  connected: boolean;
  hasCredentials: boolean;
}

export interface ProviderLoginResult {
  ok: boolean;
  error?: string;
  providers: ProviderAuthStatus[];
}

export interface CustomProviderModel {
  id: string;
  name?: string;
}

export interface CustomProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: CustomProviderModel[];
  thinkingLabels?: string[];
}

export interface SubscriptionAuthUpdate {
  url?: string;
  message?: string;
  provider: string;
  progress?: string;
  placeholder?: string;
  instructions?: string;
}

export interface ImageAttachment {
  id: string;
  name: string;
  path: string;
  type: 'image';
  mimeType: string;
  previewUrl: string;
}

export interface PreparedDropFiles {
  pathTokens: string[];
  attachments: ImageAttachment[];
}

export interface SendResult {
  ok: boolean;
  text?: string;
  error?: string;
  queued?: boolean;
  sessionId?: string;
}

export interface CommandResult {
  ok: boolean;
  error?: string;
  output?: string;
  exitCode?: number;
  sessionId?: string;
}

export type QueuedMessageKind = 'followUp' | 'steer';

export interface QueuedMessage {
  id: string;
  text: string;
  kind: QueuedMessageKind;
}

export interface QueuedTurnStart {
  id: string;
  text: string;
}

export type TurnDetailKind = 'error' | 'metadata' | 'tool';
export type TurnDetailState = 'active' | 'done' | 'error' | 'queued';

export interface ChatEvent {
  key: string;
  body?: string;
  title: string;
  detail?: string;
  metric?: string;
  kind: TurnDetailKind;
  state: TurnDetailState;
}

export interface HistoryTurnDetail extends ChatEvent {
  id: string;
  count: number;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryTurn {
  id: string;
  text: string;
  thinking?: string;
  streaming?: boolean;
  createdAt: number;
  details?: HistoryTurnDetail[];
  role: 'user' | 'assistant' | 'terminal' | 'event';
}

export type SessionNoticeKind = 'completed' | 'failed';

export interface RecentSession {
  id: string;
  path: string;
  title: string;
  modified: number;
  status?: AgentTabStatus;
  noticeKind?: SessionNoticeKind;
}

export interface RecentSessionsOptions {
  limit?: number;
  offset?: number;
  workspacePath?: string;
}

export interface RecentSessionsPage {
  hasMore: boolean;
  sessions: RecentSession[];
}

export interface RecentSessionsChanged {
  workspacePath?: string;
}

export interface GitChangeSummary {
  deletions: number;
  insertions: number;
  filesChanged: number;
}

export type GitPatchSectionKind = 'staged' | 'unstaged' | 'untracked';

export interface GitPatchSection extends GitChangeSummary {
  patch: string;
  limited: boolean;
  kind: GitPatchSectionKind;
}

export interface GitPatch {
  sections: GitPatchSection[];
}

export type GitFileRef = 'head' | 'working';

export interface GitFileBlob {
  data: string;
  mime: string;
  sizeBytes: number;
}

export interface WorkspaceFolder {
  name: string;
  path: string;
  modified: number;
  sessionCount: number;
  status?: AgentTabStatus;
  noticeKind?: SessionNoticeKind;
}

export type AgentTabStatus = 'idle' | 'generating' | 'completed' | 'failed';

export interface AgentTab {
  id: string;
  sessionId?: string;
  workspacePath: string;
  status: AgentTabStatus;
}

export interface SessionNotice {
  seenAt?: number;
  createdAt: number;
  sessionId: string;
  workspacePath: string;
  kind: SessionNoticeKind;
}

export interface ScopedChatEvent<T> {
  payload: T;
  tabId: string;
  workspacePath: string;
}

export interface SwitchWorkspaceResult {
  ok: boolean;
  error?: string;
  status?: ChatStatus;
  cancelled?: boolean;
  workspace?: WorkspaceInfo;
}

export interface OpenSessionResult {
  ok: boolean;
  id?: string;
  error?: string;
  turns?: HistoryTurn[];
}

export interface RootItem {
  name: string;
  path: string;
  description?: string;
  type: 'directory' | 'file';
}

export interface SlashCommandItem {
  key: string;
  name: string;
  description: string;
  source: 'extension' | 'prompt' | 'skill';
}

export interface WorkspaceInfo {
  path: string;
  folderName: string;
  branchName?: string;
  iconDataUrl: string;
  git?: GitChangeSummary;
}

export interface AppFocusState {
  focused: boolean;
}

export interface BrowserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrowserStatus {
  url: string;
  open: boolean;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface BrowserActionResult {
  ok: boolean;
  error?: string;
  status?: BrowserStatus;
}

export type UpdateState =
  | { status: 'downloaded' }
  | { error: string; status: 'error' }
  | { status: 'checking' }
  | { status: 'idle' };

export interface InstallUpdateResult {
  ok: boolean;
}

type IpcDisposer = () => void;

const onIpc = <Payload extends unknown[]>(channel: string, listener: (...payload: Payload) => void): IpcDisposer => {
  const handler = (_event: Electron.IpcRendererEvent, ...payload: Payload) => listener(...payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

const api = {
  app: {
    platform: process.platform,
    focusState: (): Promise<AppFocusState> => ipcRenderer.invoke('app:focus-state'),
    listRootItems: (path: string, scope: 'root' | 'workspace'): Promise<RootItem[]> =>
      ipcRenderer.invoke('app:list-root-items', path, scope),
    gitChanges: (path?: string): Promise<GitChangeSummary | undefined> => ipcRenderer.invoke('app:git-changes', path),
    gitPatch: (path?: string): Promise<GitPatch | undefined> => ipcRenderer.invoke('app:git-patch', path),
    gitFileBlob: (workspacePath: string, filePath: string, ref: GitFileRef): Promise<GitFileBlob | undefined> =>
      ipcRenderer.invoke('app:git-file-blob', workspacePath, filePath, ref),
    workspace: (path?: string): Promise<WorkspaceInfo> => ipcRenderer.invoke('app:workspace', path),
    onWorkspaceChanged: (listener: (workspace: WorkspaceInfo) => void): IpcDisposer =>
      onIpc<[WorkspaceInfo]>('app:workspace-changed', listener),
    settings: (): Promise<AppSettings> => ipcRenderer.invoke('app:settings'),
    updateState: (): Promise<UpdateState> => ipcRenderer.invoke('app:update-state'),
    browserBack: (): Promise<BrowserActionResult> => ipcRenderer.invoke('app:browser-back'),
    browserForward: (): Promise<BrowserActionResult> => ipcRenderer.invoke('app:browser-forward'),
    browserReload: (): Promise<BrowserActionResult> => ipcRenderer.invoke('app:browser-reload'),
    browserStop: (): Promise<BrowserActionResult> => ipcRenderer.invoke('app:browser-stop'),
    browserStatus: (): Promise<BrowserStatus> => ipcRenderer.invoke('app:browser-status'),
    browserScreenshot: (): Promise<BrowserActionResult> => ipcRenderer.invoke('app:browser-screenshot'),
    browserOpen: (url: string): Promise<BrowserActionResult> => ipcRenderer.invoke('app:browser-open', url),
    browserBounds: (bounds: BrowserBounds | null): Promise<BrowserActionResult> =>
      ipcRenderer.invoke('app:browser-bounds', bounds),
    browserInspectStart: (): Promise<BrowserActionResult> => ipcRenderer.invoke('app:browser-inspect-start'),
    browserInspectStop: (): Promise<BrowserActionResult> => ipcRenderer.invoke('app:browser-inspect-stop'),
    filePath: (file: Parameters<typeof webUtils.getPathForFile>[0]): string => webUtils.getPathForFile(file),
    openPath: (path: string): Promise<string> => ipcRenderer.invoke('app:open-path', path),
    revealPath: (workspacePath: string, filePath: string): Promise<void> =>
      ipcRenderer.invoke('app:reveal-path', workspacePath, filePath),
    installUpdate: (): Promise<InstallUpdateResult> => ipcRenderer.invoke('app:install-update'),
    setComposerShortcut: (shortcut: string): Promise<AppSettingsResult> =>
      ipcRenderer.invoke('app:set-composer-shortcut', shortcut),
    hideComposer: (): Promise<void> => ipcRenderer.invoke('app:hide-composer'),
    showMain: (): Promise<void> => ipcRenderer.invoke('app:show-main'),
    openSettings: (): Promise<void> => ipcRenderer.invoke('app:open-settings'),
    openShortcuts: (): Promise<void> => ipcRenderer.invoke('app:open-shortcuts'),
    submitComposer: (prompt: string, attachments: ImageAttachment[] = []): Promise<void> =>
      ipcRenderer.invoke('app:submit-composer', prompt, attachments),
    onShowComposer: (listener: () => void): IpcDisposer => onIpc<[]>('app:show-composer', listener),
    onDiscardComposer: (listener: () => void): IpcDisposer => onIpc<[]>('app:discard-composer', listener),
    onHideComposerRequest: (listener: () => void): IpcDisposer => onIpc<[]>('app:hide-composer-request', listener),
    onBrowserOpenRequest: (listener: (url: string) => void): IpcDisposer =>
      onIpc<[string]>('app:browser-open-request', listener),
    onBrowserStatus: (listener: (status: BrowserStatus) => void): IpcDisposer =>
      onIpc<[BrowserStatus]>('app:browser-status', listener),
    onBrowserInspectSent: (listener: (text: string) => void): IpcDisposer =>
      onIpc<[string]>('app:browser-inspect-sent', listener),
    onBrowserInspectState: (listener: (active: boolean) => void): IpcDisposer =>
      onIpc<[boolean]>('app:browser-inspect-state', listener),
    onFocusStateChanged: (listener: (state: AppFocusState) => void): IpcDisposer =>
      onIpc<[AppFocusState]>('app:focus-state-changed', listener),
    onUpdateStateChanged: (listener: (state: UpdateState) => void): IpcDisposer =>
      onIpc<[UpdateState]>('app:update-state-changed', listener),
    onShowSettings: (listener: () => void): IpcDisposer => onIpc<[]>('app:show-settings', listener),
    onShowShortcuts: (listener: () => void): IpcDisposer => onIpc<[]>('app:show-shortcuts', listener),
    onSubmitComposer: (listener: (prompt: string, attachments: ImageAttachment[]) => void): IpcDisposer =>
      onIpc<[string, ImageAttachment[] | undefined]>('app:submit-composer', (prompt, attachments = []) =>
        listener(prompt, attachments)
      )
  },
  chat: {
    status: (): Promise<ChatStatus> => ipcRenderer.invoke('chat:status'),
    tabs: (): Promise<AgentTab[]> => ipcRenderer.invoke('chat:tabs'),
    listTabs: (): Promise<AgentTab[]> => ipcRenderer.invoke('chat:tabs:list'),
    createTab: (workspacePath?: string): Promise<AgentTab> => ipcRenderer.invoke('chat:tabs:create', workspacePath),
    tabStatus: (): Promise<ChatStatus> => ipcRenderer.invoke('chat:tabs:status'),
    activateTab: (id: string): Promise<OpenSessionResult> => ipcRenderer.invoke('chat:tabs:activate', id),
    openTabSession: (id: string): Promise<OpenSessionResult> => ipcRenderer.invoke('chat:tabs:open-session', id),
    closeTab: (id: string): Promise<void> => ipcRenderer.invoke('chat:tabs:close', id),
    sendToTab: (id: string, prompt: string, attachments: ImageAttachment[] = []): Promise<SendResult> =>
      ipcRenderer.invoke('chat:tabs:send', id, prompt, attachments),
    abortTab: (id: string): Promise<void> => ipcRenderer.invoke('chat:tabs:abort', id),
    notices: (): Promise<SessionNotice[]> => ipcRenderer.invoke('chat:notices:list'),
    markNoticeSeen: (sessionId: string): Promise<void> => ipcRenderer.invoke('chat:notices:mark-seen', sessionId),
    models: (): Promise<{ error?: string; models: ModelOption[]; selectedModelKey?: string }> =>
      ipcRenderer.invoke('chat:models'),
    slashCommands: (): Promise<SlashCommandItem[]> => ipcRenderer.invoke('chat:slash-commands'),
    recentSessionsPage: (options: RecentSessionsOptions = {}): Promise<RecentSessionsPage> =>
      ipcRenderer.invoke('chat:sessions:page', options),
    archiveSession: (sessionId: string): Promise<void> => ipcRenderer.invoke('chat:sessions:archive', sessionId),
    unarchiveSession: (sessionId: string): Promise<void> => ipcRenderer.invoke('chat:sessions:unarchive', sessionId),
    onRecentSessionsChanged: (listener: (event: RecentSessionsChanged) => void): IpcDisposer =>
      onIpc<[RecentSessionsChanged]>('chat:recent-sessions-changed', listener),
    onStatusChanged: (listener: () => void): IpcDisposer => onIpc<[]>('chat:status-changed', listener),
    workspaceFolders: (): Promise<WorkspaceFolder[]> => ipcRenderer.invoke('chat:workspace-folders'),
    prepareDroppedFiles: (paths: string[]): Promise<PreparedDropFiles> =>
      ipcRenderer.invoke('chat:prepare-dropped-files', paths),
    prepareClipboardImage: (): Promise<ImageAttachment | null> => ipcRenderer.invoke('chat:prepare-clipboard-image'),
    releaseAttachments: (ids: string[]): Promise<void> => ipcRenderer.invoke('chat:release-attachments', ids),
    switchWorkspace: (path: string): Promise<SwitchWorkspaceResult> =>
      ipcRenderer.invoke('chat:switch-workspace', path),
    chooseWorkspaceDirectory: (): Promise<SwitchWorkspaceResult> =>
      ipcRenderer.invoke('chat:choose-workspace-directory'),
    openSession: (path: string): Promise<OpenSessionResult> => ipcRenderer.invoke('chat:open-session', path),
    openSessionId: (sessionId: string): Promise<OpenSessionResult> =>
      ipcRenderer.invoke('chat:open-session-id', sessionId),
    authProviders: (): Promise<ProviderAuthStatus[]> => ipcRenderer.invoke('chat:auth-providers'),
    setApiKey: (provider: string, apiKey: string): Promise<ProviderAuthStatus[]> =>
      ipcRenderer.invoke('chat:set-api-key', provider, apiKey),
    disconnectProvider: (provider: string): Promise<ProviderAuthStatus[]> =>
      ipcRenderer.invoke('chat:disconnect-provider', provider),
    listCustomProviders: (): Promise<CustomProviderConfig[]> => ipcRenderer.invoke('chat:custom-providers:list'),
    saveCustomProvider: (config: CustomProviderConfig): Promise<CustomProviderConfig[]> =>
      ipcRenderer.invoke('chat:custom-providers:save', config),
    removeCustomProvider: (name: string): Promise<CustomProviderConfig[]> =>
      ipcRenderer.invoke('chat:custom-providers:remove', name),
    loginSubscription: (provider: string): Promise<ProviderLoginResult> =>
      ipcRenderer.invoke('chat:login-subscription', provider),
    cancelSubscriptionLogin: (): Promise<void> => ipcRenderer.invoke('chat:cancel-subscription-login'),
    submitSubscriptionAuthInput: (value: string): Promise<void> =>
      ipcRenderer.invoke('chat:submit-subscription-auth-input', value),
    steerQueuedMessage: (id: string): Promise<QueuedMessage[]> => ipcRenderer.invoke('chat:steer-queued-message', id),
    deleteQueuedMessage: (id: string): Promise<QueuedMessage[]> => ipcRenderer.invoke('chat:delete-queued-message', id),
    selectModel: (modelKey: string): Promise<ChatStatus> => ipcRenderer.invoke('chat:select-model', modelKey),
    selectThinkingLevel: (level: EffortLevel): Promise<ChatStatus> =>
      ipcRenderer.invoke('chat:select-thinking-level', level),
    send: (prompt: string, attachments: ImageAttachment[] = []): Promise<SendResult> =>
      ipcRenderer.invoke('chat:send', prompt, attachments),
    command: (command: string, excludeFromContext: boolean): Promise<CommandResult> =>
      ipcRenderer.invoke('chat:command', command, excludeFromContext),
    abort: (): Promise<void> => ipcRenderer.invoke('chat:abort'),
    newSession: (): Promise<void> => ipcRenderer.invoke('chat:new-session'),
    onNewSession: (listener: () => void): IpcDisposer => onIpc<[]>('chat:new-session', listener),
    onDelta: (listener: (delta: string) => void): IpcDisposer => onIpc<[string]>('chat:delta', listener),
    onThinkingDelta: (listener: (delta: string) => void): IpcDisposer =>
      onIpc<[string]>('chat:thinking-delta', listener),
    onDone: (listener: (text: string) => void): IpcDisposer => onIpc<[string]>('chat:done', listener),
    onCommandDelta: (listener: (delta: string) => void): IpcDisposer => onIpc<[string]>('chat:command-delta', listener),
    onCommandDone: (listener: (output: string) => void): IpcDisposer => onIpc<[string]>('chat:command-done', listener),
    onError: (listener: (message: string) => void): IpcDisposer => onIpc<[string]>('chat:error', listener),
    onQueueUpdate: (listener: (messages: QueuedMessage[]) => void): IpcDisposer =>
      onIpc<[QueuedMessage[]]>('chat:queue-update', listener),
    onQueuedTurnStart: (listener: (turn: QueuedTurnStart) => void): IpcDisposer =>
      onIpc<[QueuedTurnStart]>('chat:queued-turn-start', listener),
    onEvent: (listener: (event: ChatEvent) => void): IpcDisposer => onIpc<[ChatEvent]>('chat:event', listener),
    onScopedEvent: (listener: (event: ScopedChatEvent<ChatEvent>) => void): IpcDisposer =>
      onIpc<[ScopedChatEvent<ChatEvent>]>('chat:scoped-event', listener),
    onScopedDelta: (listener: (event: ScopedChatEvent<string>) => void): IpcDisposer =>
      onIpc<[ScopedChatEvent<string>]>('chat:scoped-delta', listener),
    onScopedThinkingDelta: (listener: (event: ScopedChatEvent<string>) => void): IpcDisposer =>
      onIpc<[ScopedChatEvent<string>]>('chat:scoped-thinking-delta', listener),
    onScopedDone: (listener: (event: ScopedChatEvent<string>) => void): IpcDisposer =>
      onIpc<[ScopedChatEvent<string>]>('chat:scoped-done', listener),
    onScopedError: (listener: (event: ScopedChatEvent<string>) => void): IpcDisposer =>
      onIpc<[ScopedChatEvent<string>]>('chat:scoped-error', listener),
    onNotice: (listener: (event: ScopedChatEvent<SessionNotice | undefined>) => void): IpcDisposer =>
      onIpc<[ScopedChatEvent<SessionNotice | undefined>]>('chat:notice', listener),
    onSubscriptionAuthUpdate: (listener: (update: SubscriptionAuthUpdate) => void): IpcDisposer =>
      onIpc<[SubscriptionAuthUpdate]>('chat:subscription-auth-update', listener)
  }
};

contextBridge.exposeInMainWorld('pi', api);

export type PiApi = typeof api;
