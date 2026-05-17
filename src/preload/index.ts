import { contextBridge, ipcRenderer } from 'electron';

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

export type SendResult = {
  ok: boolean;
  text?: string;
  sessionId?: string | undefined;
  error?: string;
};

export type CommandResult = {
  ok: boolean;
  output?: string;
  sessionId?: string | undefined;
  exitCode?: number | undefined;
  error?: string;
};

export type HistoryMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
};

export type RecentSession = {
  id: string;
  title: string;
  path: string;
  modified: number;
  messageCount: number;
};

export type OpenSessionResult = {
  ok: boolean;
  id?: string;
  messages?: HistoryMessage[];
  error?: string;
};

export type RootItem = {
  name: string;
  path: string;
  type: 'directory' | 'file';
};

export type ChatEvent = {
  name: string;
};

const api = {
  app: {
    listRootItems: (path: string, scope: 'root' | 'workspace'): Promise<RootItem[]> =>
      ipcRenderer.invoke('app:list-root-items', path, scope),
    settings: (): Promise<AppSettings> => ipcRenderer.invoke('app:settings'),
    setComposerShortcut: (shortcut: string): Promise<AppSettingsResult> =>
      ipcRenderer.invoke('app:set-composer-shortcut', shortcut),
    hideComposer: (): Promise<void> => ipcRenderer.invoke('app:hide-composer'),
    openSettings: (): Promise<void> => ipcRenderer.invoke('app:open-settings'),
    submitComposer: (prompt: string): Promise<void> => ipcRenderer.invoke('app:submit-composer', prompt),
    onShowComposer: (listener: () => void): (() => void) => {
      const handler = () => listener();
      ipcRenderer.on('app:show-composer', handler);
      return () => ipcRenderer.removeListener('app:show-composer', handler);
    },
    onShowSettings: (listener: () => void): (() => void) => {
      const handler = () => listener();
      ipcRenderer.on('app:show-settings', handler);
      return () => ipcRenderer.removeListener('app:show-settings', handler);
    },
    onSubmitComposer: (listener: (prompt: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, prompt: string) => listener(prompt);
      ipcRenderer.on('app:submit-composer', handler);
      return () => ipcRenderer.removeListener('app:submit-composer', handler);
    }
  },
  chat: {
    status: (): Promise<ChatStatus> => ipcRenderer.invoke('chat:status'),
    models: (): Promise<{ models: ModelOption[]; selectedModelKey: string | undefined; error: string | undefined }> =>
      ipcRenderer.invoke('chat:models'),
    recentSessions: (): Promise<RecentSession[]> => ipcRenderer.invoke('chat:recent-sessions'),
    openSession: (path: string): Promise<OpenSessionResult> => ipcRenderer.invoke('chat:open-session', path),
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
    send: (prompt: string): Promise<SendResult> => ipcRenderer.invoke('chat:send', prompt),
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
