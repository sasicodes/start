import { contextBridge, ipcRenderer, webUtils } from 'electron';

export type AppSettings = {
  composerShortcut: string;
};

export type AppSettingsResult = {
  ok: boolean;
  settings: AppSettings | null;
  error?: string;
};

export type ChatStatus = {
  ready: boolean;
  workspacePath: string;
  modelLabel?: string;
  selectedModelKey?: string;
  sessionId?: string;
  thinkingLevel?: EffortLevel;
  error?: string;
};

export type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh';

export type ModelOption = {
  key: string;
  id: string;
  name: string;
  provider: string;
  reasoning: boolean;
  effortLevels: EffortLevel[];
  input: ('text' | 'image')[];
  contextWindow: number;
};

export type ProviderAuthKind = 'api_key' | 'none' | 'subscription' | 'unknown';

export type ProviderAuthStatus = {
  key: string;
  name: string;
  connected: boolean;
  kind: ProviderAuthKind;
  label: string;
};

export type ProviderLoginResult = {
  ok: boolean;
  providers: ProviderAuthStatus[];
  error?: string;
};

export type SubscriptionAuthUpdate = {
  provider: string;
  message?: string;
  placeholder?: string;
  progress?: string;
  instructions?: string;
  url?: string;
};

export type ImageAttachment = {
  id: string;
  name: string;
  path: string;
  type: 'image';
  mimeType: string;
  previewUrl: string;
};

export type PreparedDropFiles = {
  pathTokens: string[];
  attachments: ImageAttachment[];
};

export type SendResult = {
  ok: boolean;
  text?: string;
  sessionId?: string;
  error?: string;
};

export type CommandResult = {
  ok: boolean;
  output?: string;
  sessionId?: string;
  exitCode?: number;
  error?: string;
};

export type TurnDetailKind = 'error' | 'metadata' | 'tool';
export type TurnDetailState = 'active' | 'done' | 'error' | 'queued';

export type ChatEvent = {
  key: string;
  kind: TurnDetailKind;
  title: string;
  state: TurnDetailState;
  body?: string;
  detail?: string;
  metric?: string;
};

export type HistoryTurnDetail = ChatEvent & {
  id: string;
  count: number;
  createdAt: number;
  updatedAt: number;
};

export type HistoryTurn = {
  id: string;
  role: 'user' | 'assistant' | 'terminal' | 'event';
  text: string;
  createdAt: number;
  details?: HistoryTurnDetail[];
  thinking?: string;
};

export type RecentSession = {
  id: string;
  title: string;
  path: string;
  modified: number;
  turnCount: number;
};

export type RecentSessionsChanged = {
  workspacePath?: string;
};

export type WorkspaceFolder = {
  name: string;
  path: string;
  modified: number;
  sessionCount: number;
};

export type SwitchWorkspaceResult = {
  ok: boolean;
  cancelled?: boolean;
  status?: ChatStatus;
  workspace?: WorkspaceInfo;
  error?: string;
};

export type OpenSessionResult = {
  ok: boolean;
  id?: string;
  turns?: HistoryTurn[];
  error?: string;
};

export type RootItem = {
  name: string;
  path: string;
  type: 'directory' | 'file';
};

export type WorkspaceInfo = {
  branchName?: string;
  folderName: string;
  iconDataUrl: string;
  path: string;
};

export type DebugProcessMetric = {
  pid: number;
  name: string;
  type: string;
  memoryMb: number;
  cpuPercent: number;
  children?: DebugProcessMetric[];
};

export type DebugMetrics = {
  appMemoryMb: number;
  cpuPercent: number;
  processCount: number;
  processes: DebugProcessMetric[];
};

export type AppRuntime = {
  debugToolbar: boolean;
};

export type AppFocusState = {
  focused: boolean;
};

const api = {
  app: {
    debugMetrics: (): Promise<DebugMetrics> => ipcRenderer.invoke('app:debug-metrics'),
    focusState: (): Promise<AppFocusState> => ipcRenderer.invoke('app:focus-state'),
    listRootItems: (path: string, scope: 'root' | 'workspace'): Promise<RootItem[]> =>
      ipcRenderer.invoke('app:list-root-items', path, scope),
    workspace: (path?: string): Promise<WorkspaceInfo> => ipcRenderer.invoke('app:workspace', path),
    onWorkspaceChanged: (listener: (workspace: WorkspaceInfo) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, workspace: WorkspaceInfo) => listener(workspace);
      ipcRenderer.on('app:workspace-changed', handler);
      return () => ipcRenderer.removeListener('app:workspace-changed', handler);
    },
    runtime: (): Promise<AppRuntime> => ipcRenderer.invoke('app:runtime'),
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
    onShowComposer: (listener: () => void): (() => void) => {
      const handler = () => listener();
      ipcRenderer.on('app:show-composer', handler);
      return () => ipcRenderer.removeListener('app:show-composer', handler);
    },
    onDiscardComposer: (listener: () => void): (() => void) => {
      const handler = () => listener();
      ipcRenderer.on('app:discard-composer', handler);
      return () => ipcRenderer.removeListener('app:discard-composer', handler);
    },
    onFocusStateChanged: (listener: (state: AppFocusState) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, state: AppFocusState) => listener(state);
      ipcRenderer.on('app:focus-state-changed', handler);
      return () => ipcRenderer.removeListener('app:focus-state-changed', handler);
    },
    onShowSettings: (listener: () => void): (() => void) => {
      const handler = () => listener();
      ipcRenderer.on('app:show-settings', handler);
      return () => ipcRenderer.removeListener('app:show-settings', handler);
    },
    onSubmitComposer: (listener: (prompt: string, attachments: ImageAttachment[]) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, prompt: string, attachments: ImageAttachment[] = []) =>
        listener(prompt, attachments);
      ipcRenderer.on('app:submit-composer', handler);
      return () => ipcRenderer.removeListener('app:submit-composer', handler);
    }
  },
  chat: {
    status: (): Promise<ChatStatus> => ipcRenderer.invoke('chat:status'),
    models: (): Promise<{ models: ModelOption[]; selectedModelKey: string | undefined; error: string | undefined }> =>
      ipcRenderer.invoke('chat:models'),
    recentSessions: (workspacePath?: string): Promise<RecentSession[]> =>
      ipcRenderer.invoke('chat:recent-sessions', workspacePath),
    onRecentSessionsChanged: (listener: (event: RecentSessionsChanged) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: RecentSessionsChanged) => listener(payload);
      ipcRenderer.on('chat:recent-sessions-changed', handler);
      return () => ipcRenderer.removeListener('chat:recent-sessions-changed', handler);
    },
    onStatusChanged: (listener: () => void): (() => void) => {
      const handler = () => listener();
      ipcRenderer.on('chat:status-changed', handler);
      return () => ipcRenderer.removeListener('chat:status-changed', handler);
    },
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
    selectModel: (modelKey: string): Promise<ChatStatus> => ipcRenderer.invoke('chat:select-model', modelKey),
    selectThinkingLevel: (level: EffortLevel): Promise<ChatStatus> =>
      ipcRenderer.invoke('chat:select-thinking-level', level),
    send: (prompt: string, attachments: ImageAttachment[] = []): Promise<SendResult> =>
      ipcRenderer.invoke('chat:send', prompt, attachments),
    command: (command: string, excludeFromContext: boolean): Promise<CommandResult> =>
      ipcRenderer.invoke('chat:command', command, excludeFromContext),
    abort: (): Promise<void> => ipcRenderer.invoke('chat:abort'),
    newSession: (): Promise<void> => ipcRenderer.invoke('chat:new-session'),
    onNewSession: (listener: () => void): (() => void) => {
      const handler = () => listener();
      ipcRenderer.on('chat:new-session', handler);
      return () => ipcRenderer.removeListener('chat:new-session', handler);
    },
    onDelta: (listener: (delta: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, delta: string) => listener(delta);
      ipcRenderer.on('chat:delta', handler);
      return () => ipcRenderer.removeListener('chat:delta', handler);
    },
    onThinkingDelta: (listener: (delta: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, delta: string) => listener(delta);
      ipcRenderer.on('chat:thinking-delta', handler);
      return () => ipcRenderer.removeListener('chat:thinking-delta', handler);
    },
    onDone: (listener: (text: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, text: string) => listener(text);
      ipcRenderer.on('chat:done', handler);
      return () => ipcRenderer.removeListener('chat:done', handler);
    },
    onCommandDelta: (listener: (delta: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, delta: string) => listener(delta);
      ipcRenderer.on('chat:command-delta', handler);
      return () => ipcRenderer.removeListener('chat:command-delta', handler);
    },
    onCommandDone: (listener: (output: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, output: string) => listener(output);
      ipcRenderer.on('chat:command-done', handler);
      return () => ipcRenderer.removeListener('chat:command-done', handler);
    },
    onError: (listener: (message: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, message: string) => listener(message);
      ipcRenderer.on('chat:error', handler);
      return () => ipcRenderer.removeListener('chat:error', handler);
    },
    onEvent: (listener: (event: ChatEvent) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, event: ChatEvent) => listener(event);
      ipcRenderer.on('chat:event', handler);
      return () => ipcRenderer.removeListener('chat:event', handler);
    },
    onSubscriptionAuthUpdate: (listener: (update: SubscriptionAuthUpdate) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, update: SubscriptionAuthUpdate) => listener(update);
      ipcRenderer.on('chat:subscription-auth-update', handler);
      return () => ipcRenderer.removeListener('chat:subscription-auth-update', handler);
    }
  }
};

contextBridge.exposeInMainWorld('pi', api);

export type PiApi = typeof api;
