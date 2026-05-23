import { contextBridge, ipcRenderer, webUtils } from 'electron';

export interface AppSettings {
  composerShortcut: string;
}

export interface AppSettingsResult {
  ok: boolean;
  settings: AppSettings | null;
  error?: string;
}

export interface ChatStatus {
  ready: boolean;
  workspacePath: string;
  modelLabel?: string;
  selectedModelKey?: string;
  sessionId?: string;
  thinkingLevel?: EffortLevel;
  error?: string;
}

export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh';

export interface ModelOption {
  key: string;
  id: string;
  name: string;
  provider: string;
  reasoning: boolean;
  effortLevels: EffortLevel[];
  input: ('text' | 'image')[];
  contextWindow: number;
}

export type ProviderAuthKind = 'api_key' | 'none' | 'subscription' | 'unknown';

export interface ProviderAuthStatus {
  key: string;
  name: string;
  connected: boolean;
  kind: ProviderAuthKind;
  label: string;
}

export interface ProviderLoginResult {
  ok: boolean;
  providers: ProviderAuthStatus[];
  error?: string;
}

export interface SubscriptionAuthUpdate {
  provider: string;
  message?: string;
  placeholder?: string;
  progress?: string;
  instructions?: string;
  url?: string;
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
  queued?: boolean;
  sessionId?: string;
  error?: string;
}

export interface CommandResult {
  ok: boolean;
  output?: string;
  sessionId?: string;
  exitCode?: number;
  error?: string;
}

export type QueuedMessageKind = 'followUp' | 'steer';

export interface QueuedMessage {
  id: string;
  kind: QueuedMessageKind;
  text: string;
}

export interface QueuedTurnStart {
  id: string;
  text: string;
}

export type TurnDetailKind = 'error' | 'metadata' | 'tool';
export type TurnDetailState = 'active' | 'done' | 'error' | 'queued';

export interface ChatEvent {
  key: string;
  kind: TurnDetailKind;
  title: string;
  state: TurnDetailState;
  body?: string;
  detail?: string;
  metric?: string;
}

export interface HistoryTurnDetail extends ChatEvent {
  id: string;
  count: number;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryTurn {
  id: string;
  role: 'user' | 'assistant' | 'terminal' | 'event';
  text: string;
  createdAt: number;
  details?: HistoryTurnDetail[];
  thinking?: string;
}

export interface RecentSession {
  id: string;
  title: string;
  path: string;
  modified: number;
  turnCount: number;
}

export interface RecentSessionsChanged {
  workspacePath?: string;
}

export interface GitChangeSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export type GitPatchSectionKind = 'staged' | 'unstaged' | 'untracked';

export interface GitPatchSection extends GitChangeSummary {
  kind: GitPatchSectionKind;
  limited: boolean;
  patch: string;
}

export interface GitPatch {
  sections: GitPatchSection[];
}

export interface WorkspaceFolder {
  name: string;
  path: string;
  modified: number;
  sessionCount: number;
}

export interface SwitchWorkspaceResult {
  ok: boolean;
  cancelled?: boolean;
  status?: ChatStatus;
  workspace?: WorkspaceInfo;
  error?: string;
}

export interface OpenSessionResult {
  ok: boolean;
  id?: string;
  turns?: HistoryTurn[];
  error?: string;
}

export interface RootItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  description?: string;
}

export interface SkillItem {
  command: string;
  description: string;
  name: string;
  path: string;
}

export interface WorkspaceInfo {
  branchName?: string;
  folderName: string;
  git?: GitChangeSummary;
  iconDataUrl: string;
  path: string;
}

export interface AppFocusState {
  focused: boolean;
}

type IpcDisposer = () => void;

const onIpc = <Payload extends unknown[]>(channel: string, listener: (...payload: Payload) => void): IpcDisposer => {
  const handler = (_event: Electron.IpcRendererEvent, ...payload: Payload) => listener(...payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

const api = {
  app: {
    focusState: (): Promise<AppFocusState> => ipcRenderer.invoke('app:focus-state'),
    listRootItems: (path: string, scope: 'root' | 'workspace'): Promise<RootItem[]> =>
      ipcRenderer.invoke('app:list-root-items', path, scope),
    listSkills: (): Promise<SkillItem[]> => ipcRenderer.invoke('app:list-skills'),
    gitChanges: (path?: string): Promise<GitChangeSummary | undefined> => ipcRenderer.invoke('app:git-changes', path),
    gitPatch: (path?: string): Promise<GitPatch | undefined> => ipcRenderer.invoke('app:git-patch', path),
    workspace: (path?: string): Promise<WorkspaceInfo> => ipcRenderer.invoke('app:workspace', path),
    onWorkspaceChanged: (listener: (workspace: WorkspaceInfo) => void): IpcDisposer =>
      onIpc<[WorkspaceInfo]>('app:workspace-changed', listener),
    settings: (): Promise<AppSettings> => ipcRenderer.invoke('app:settings'),
    filePath: (file: Parameters<typeof webUtils.getPathForFile>[0]): string => webUtils.getPathForFile(file),
    openPath: (path: string): Promise<string> => ipcRenderer.invoke('app:open-path', path),
    setComposerShortcut: (shortcut: string): Promise<AppSettingsResult> =>
      ipcRenderer.invoke('app:set-composer-shortcut', shortcut),
    hideComposer: (): Promise<void> => ipcRenderer.invoke('app:hide-composer'),
    showMain: (): Promise<void> => ipcRenderer.invoke('app:show-main'),
    openSettings: (): Promise<void> => ipcRenderer.invoke('app:open-settings'),
    submitComposer: (prompt: string, attachments: ImageAttachment[] = []): Promise<void> =>
      ipcRenderer.invoke('app:submit-composer', prompt, attachments),
    onShowComposer: (listener: () => void): IpcDisposer => onIpc<[]>('app:show-composer', listener),
    onDiscardComposer: (listener: () => void): IpcDisposer => onIpc<[]>('app:discard-composer', listener),
    onHideComposerRequest: (listener: () => void): IpcDisposer => onIpc<[]>('app:hide-composer-request', listener),
    onFocusStateChanged: (listener: (state: AppFocusState) => void): IpcDisposer =>
      onIpc<[AppFocusState]>('app:focus-state-changed', listener),
    onShowSettings: (listener: () => void): IpcDisposer => onIpc<[]>('app:show-settings', listener),
    onSubmitComposer: (listener: (prompt: string, attachments: ImageAttachment[]) => void): IpcDisposer =>
      onIpc<[string, ImageAttachment[] | undefined]>('app:submit-composer', (prompt, attachments = []) =>
        listener(prompt, attachments)
      )
  },
  chat: {
    status: (): Promise<ChatStatus> => ipcRenderer.invoke('chat:status'),
    models: (): Promise<{ error?: string; models: ModelOption[]; selectedModelKey?: string }> =>
      ipcRenderer.invoke('chat:models'),
    recentSessions: (workspacePath?: string): Promise<RecentSession[]> =>
      ipcRenderer.invoke('chat:recent-sessions', workspacePath),
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
    setRuntimeApiKey: (provider: string, apiKey: string): Promise<ProviderAuthStatus[]> =>
      ipcRenderer.invoke('chat:set-runtime-api-key', provider, apiKey),
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
    onSubscriptionAuthUpdate: (listener: (update: SubscriptionAuthUpdate) => void): IpcDisposer =>
      onIpc<[SubscriptionAuthUpdate]>('chat:subscription-auth-update', listener)
  }
};

contextBridge.exposeInMainWorld('pi', api);

export type PiApi = typeof api;
